// One playable level: wires the simulation, board, train, toy physics, camera, HUD, input and
// sounds (tasks T041, T052, T062, T080).
import * as THREE from 'three';
import { levelTitle } from '../engine/campaign';
import { Autopilot } from '../engine/autopilot';
import { generateLevel } from '../engine/levelGenerator';
import { Simulation } from '../engine/simulation';
import type { CarPose, LevelDefinition, Phase, SimEvent } from '../engine/types';
import { THEMES } from '../graphics/biomes';
import { BoardView } from '../graphics/boardView';
import { CameraController } from '../graphics/cameraController';
import { Effects } from '../graphics/effects';
import { TrainView } from '../graphics/trainView';
import { GestureRecognizer } from '../input/gestures';
import { Hud } from '../ui/hud';
import { showDerailed, showCelebration, showPause, showResults, showTapToContinue, type OverlayHandle } from '../ui/overlays';
import type { AppContext, GameScreen, ToyPhysicsService } from './screen';

const SWITCH_PICK_PX = 22;
const TRAIN_PICK_PX = 34;

const HINTS: Record<number, { planning: string; running?: string }> = {
  1: {
    planning: 'Tap the glowing switch so the train passes the toy factory, then tap GO!',
    running: 'When its clock runs out, the factory drops its toys into whatever is under it.',
  },
  2: { planning: 'Each wagon’s flag shows the toy its chute at the Toy Station wants.' },
  4: { planning: 'Two wagons: the clock decides which wagon is under the hopper when the toys drop.' },
};

const HOLD_HINT = 'Arriving too early? Circle the loop once, then flip the switch back.';

export class LevelSession implements GameScreen {
  readonly kind = 'level' as const;
  readonly levelNumber: number;
  readonly def: LevelDefinition;
  private readonly scene = new THREE.Scene();
  private readonly cam = new CameraController();
  private sim: Simulation;
  private board: BoardView;
  private train: TrainView;
  private readonly effects: Effects;
  private physics: ToyPhysicsService | null = null;
  private readonly hud: Hud;
  private readonly gestures: GestureRecognizer;
  private pilot: Autopilot | null = null;
  private poses: CarPose[] = [];
  private overlay: OverlayHandle | null = null;
  private endTimer = 0;
  private time = 0;
  private lastPhase: Phase = 'planning';
  private hintTimer = 0;
  private pendingGo = false;
  private disposed = false;
  /** Onboarding hints show until the level has been passed once (task T079). */
  private showHints = true;
  private pouring = 0;
  private chuff = 0;
  private readonly tmp = new THREE.Vector3();
  private readonly projected = { x: 0, y: 0 };
  private disposeQuality: () => void;

  constructor(
    private readonly ctx: AppContext,
    level: number,
  ) {
    this.levelNumber = level;
    this.def = generateLevel(level);
    const theme = THEMES[this.def.biome];
    this.scene.background = new THREE.Color(theme.background);
    this.sim = new Simulation(this.def);
    this.board = new BoardView(this.def, theme);
    this.train = new TrainView(this.def.train.wagons, this.def.cols, this.def.rows, this.def.order.lines.map((l) => l.type));
    this.effects = new Effects();
    this.scene.add(this.board.group, this.train.group, this.effects.group);
    this.attachPhysics();
    this.board.setShadowMapSize(ctx.gfx.quality.shadowMapSize);
    this.disposeQuality = ctx.gfx.onQualityChange((q) => this.board.setShadowMapSize(q.shadowMapSize));

    this.hud = new Hud(
      ctx.ui,
      { title: levelTitle(level), order: this.def.order.lines, wagons: this.def.train.wagons, capacity: this.def.train.capacity, muted: ctx.sound.muted },
      {
        onGo: () => this.go(),
        onPause: () => this.pause(),
        onRestart: () => this.restart(),
        onMap: () => ctx.openMap(level),
        onCamera: () => this.toggleCamera(),
        onMute: () => {
          ctx.sound.muted = !ctx.sound.muted;
          ctx.progress.muted = ctx.sound.muted;
          this.hud.setMuted(ctx.sound.muted);
        },
      },
    );
    this.hud.setPhase('planning');
    this.hud.setWagons(this.sim.wagonLoads(), this.def.train.capacity);
    this.hud.setLoaded([]);
    this.showHints = ctx.progress.stars(level) === 0;
    this.hud.showHint(this.showHints ? this.planningHint() : null);

    this.cam.setBounds(this.board.bounds);
    this.gestures = new GestureRecognizer(ctx.gfx.canvas, {
      onPointerDown: () => ctx.sound.unlock(),
      onTap: (x, y) => this.tap(x, y),
      onDoubleTap: (x, y) => this.doubleTap(x, y),
      onPan: (dx, dy, x, y) => {
        this.cam.pan(dx, dy, x, y);
        this.hud.setCameraMode(this.cam.mode);
      },
      onPinch: (scale, cx, cy, dx, dy) => {
        this.cam.zoomAt(scale, cx, cy);
        if (dx || dy) this.cam.pan(dx, dy, cx, cy);
        this.hud.setCameraMode(this.cam.mode);
      },
      onWheel: (deltaY, x, y) => {
        this.cam.zoomAt(Math.exp(-deltaY * 0.0015), x, y);
        this.hud.setCameraMode(this.cam.mode);
      },
    });
    if (ctx.params.autoplay) this.pilot = new Autopilot(this.sim, this.def.routes.standard);
    this.poses = this.sim.carPoses(1, this.poses);
    this.train.update(this.poses);
    this.physics?.syncTrain(this.poses);
    // After a rotation or a safe-area change the HUD moves; refit the board around it.
    this.hud.onLayout = () => this.cam.setViewport(ctx.gfx.width, ctx.gfx.height, this.hud.insets);
  }

  // -------------------------------------------------------------------------------------------
  // GameScreen

  tick(): void {
    if (this.pilot && (this.sim.phase === 'planning' || this.sim.phase === 'running')) this.pilot.update();
    if (this.pilot && this.sim.phase === 'planning' && this.ctx.params.autoplay) this.go();
    this.sim.step();
    if (this.physics) {
      this.physics.syncTrain(this.sim.carPoses(1, this.poses));
      this.physics.step();
    }
    this.handle(this.sim.drainEvents());
  }

  frame(dt: number, alpha: number): void {
    this.time += dt;
    const phase = this.sim.phase;
    const a = phase === 'running' ? alpha : 1;
    if (phase !== 'derailed') {
      this.poses = this.sim.carPoses(a, this.poses);
      this.train.update(this.poses);
      this.physics?.render(this.poses);
    } else if (this.physics) {
      this.physics.render(null);
      this.train.cars.forEach((car, i) => this.physics?.carTransform(i, car.position, car.quaternion));
    }
    this.board.motion = !this.ctx.ui.reducedMotion;
    this.board.update(dt, this.cam.camera);
    this.effects.update(dt);
    if (phase === 'running') this.trainEffects(dt);
    if (phase === 'running') for (const sw of this.def.switches) this.board.setSwitchBusy(sw.id, this.sim.isSwitchLocked(sw.id));
    if (phase === 'running' && this.hintTimer > 0) {
      this.hintTimer -= dt;
      if (this.hintTimer <= 0) this.hud.showHint(null);
    }
    this.updateFollowPoint();
    this.cam.update(dt);
    this.hud.frame(dt);
    const loads = this.sim.wagonLoads();
    this.hud.setLoaded(this.def.order.lines.map((l) => loads[l.wagon - 1]?.byType[l.type] ?? 0));
    this.hud.setWagons(loads, this.def.train.capacity);
    for (const f of this.def.factories) {
      const clock = this.sim.factoryClock(f.id);
      this.board.setClock(f.id, clock.progress, clock.seconds);
    }
    if (phase !== this.lastPhase) {
      this.lastPhase = phase;
      this.hud.setPhase(phase);
    }
    if (this.pouring > 0) this.pouring = Math.max(0, this.pouring - dt);
    this.ctx.sound.pour(this.pouring > 0 && phase === 'running');
    if (this.endTimer > 0) {
      this.endTimer -= dt;
      if (this.endTimer <= 0) this.showEnd();
    }
    this.ctx.gfx.render(this.scene, this.cam.camera);
  }

  resize(width: number, height: number): void {
    this.effects.setScale(this.ctx.gfx.canvas.height);
    // The interface layer has already laid the HUD out for the new size.
    this.cam.setViewport(width, height, this.hud.insets);
    if (this.time === 0) this.cam.snapToOverview();
  }

  hidden(): void {
    this.ctx.sound.suspend();
    if (this.sim.phase === 'running' && !this.overlay) {
      this.sim.pause();
      this.overlay = showTapToContinue(this.ctx.ui, () => {
        this.overlay = null;
        this.sim.resume();
      });
    }
  }

  dispose(): void {
    this.disposed = true;
    this.overlay?.close();
    this.gestures.dispose();
    this.hud.dispose();
    this.board.dispose();
    this.train.dispose();
    this.effects.dispose();
    this.physics?.dispose();
    this.disposeQuality();
    this.ctx.sound.pour(false);
  }

  // -------------------------------------------------------------------------------------------
  // Test hook helpers

  phase(): Phase {
    return this.sim.phase;
  }

  result() {
    return this.sim.result();
  }

  switchScreenPositions(): { id: number; x: number; y: number }[] {
    return this.def.switches.flatMap((sw) => {
      const a = this.board.switchAnchor(sw.id);
      const p = this.cam.project(a.x, a.y, a.z);
      return p ? [{ id: sw.id, x: p.x, y: p.y }] : [];
    });
  }

  switchLane(id: number): number {
    return this.sim.switchLane(id);
  }

  /** Screen angle of a switch button's arrow (FR-095). */
  switchArrowAngle(id: number): number {
    return this.board.switchArrowAngle(id);
  }

  /**
   * Overview framing (SC-018): the widest screen span of the board's track area, and whether the
   * ground reaches every screen corner.
   */
  viewCoverage(): { boardLeft: number; boardRight: number; groundCovers: boolean } {
    const b = this.board.bounds;
    let left = Infinity;
    let right = -Infinity;
    for (const x of [b.minX, b.maxX]) {
      for (const z of [b.minZ, b.maxZ]) {
        const p = this.cam.project(x, 0, z);
        if (!p) continue;
        left = Math.min(left, p.x);
        right = Math.max(right, p.x);
      }
    }
    const half = (Math.max(this.def.cols, this.def.rows) * 5 + 24) / 2;
    const w = this.ctx.gfx.width;
    const h = this.ctx.gfx.height;
    const covers = [[0, 0], [w, 0], [0, h], [w, h]].every(([x, y]) => {
      const g = this.cam.groundAt(x as number, y as number, this.tmp);
      return !!g && Math.abs(g.x) < half && Math.abs(g.z) < half;
    });
    return { boardLeft: left, boardRight: right, groundCovers: covers };
  }

  cameraMode(): string {
    return this.cam.mode;
  }

  /** `?debug=1` overlay text (task T081). */
  debugStats(): string {
    const stats = this.physics?.stats();
    return stats ? ` · toys ${stats.active}/${stats.alive}` : ' · physics loading';
  }

  /** The first-time hint: per level, or for the first holding loops (FR-083). */
  private planningHint(): string | null {
    const hint = HINTS[this.levelNumber]?.planning;
    if (hint) return hint;
    if (this.levelNumber < 30 && this.def.switches.some((s) => s.kind === 'hold')) return HOLD_HINT;
    return null;
  }

  // -------------------------------------------------------------------------------------------
  // Actions

  private go(): void {
    if (this.sim.phase !== 'planning') return;
    if (!this.physics) {
      // GO waits for the toy physics so every toy is shown (task T052).
      if (this.ctx.physics.ready()) this.attachPhysics();
      else {
        if (!this.pendingGo) this.hud.showToast('Loading toys…', 2000);
        this.pendingGo = true;
        return;
      }
    }
    this.sim.go();
    this.board.setPlanning(false);
    const runningHint = this.showHints ? (HINTS[this.levelNumber]?.running ?? null) : null;
    this.hud.showHint(runningHint);
    this.hintTimer = runningHint ? 6 : 0;
    this.ctx.sound.play('whistle');
  }

  private pause(): void {
    if (this.sim.phase !== 'running' || this.overlay) return;
    this.sim.pause();
    this.overlay = showPause(this.ctx.ui, {
      onResume: () => {
        this.overlay = null;
        this.sim.resume();
      },
      onRestart: () => {
        this.overlay = null;
        this.restart();
      },
      onMap: () => {
        this.overlay = null;
        this.ctx.openMap(this.levelNumber);
      },
    });
  }

  private restart(): void {
    this.ctx.openLevel(this.levelNumber);
  }

  private toggleCamera(): void {
    if (this.cam.mode === 'follow') this.cam.showOverview();
    else this.cam.follow();
    this.hud.setCameraMode(this.cam.mode);
  }

  private attachPhysics(): void {
    if (this.physics) return;
    if (!this.ctx.physics.ready()) {
      void this.ctx.physics.load().then(() => {
        if (this.disposed) return;
        this.attachPhysics();
        if (this.pendingGo) {
          this.pendingGo = false;
          this.go();
        }
      });
      return;
    }
    this.physics = this.ctx.physics.create(this.def);
    this.scene.add(this.physics.group);
    this.physics.syncTrain(this.sim.carPoses(1, this.poses));
  }

  private tap(x: number, y: number): void {
    this.ctx.sound.unlock();
    const sw = this.pickSwitch(x, y);
    if (sw >= 0) {
      const outcome = this.sim.flip(sw);
      if (outcome === 'locked') {
        this.board.shakeSwitch(sw);
        this.hud.showToast('The train is on that switch!');
        this.hud.shakeToast();
        this.ctx.sound.play('locked');
      } else if (outcome === 'queued' || outcome === 'flipped') {
        this.ctx.sound.play('click');
      }
      return;
    }
    if (this.pickTrain(x, y)) {
      this.cam.follow();
      this.hud.setCameraMode(this.cam.mode);
    }
  }

  private doubleTap(x: number, y: number): void {
    if (this.pickSwitch(x, y) >= 0) return;
    if (this.pickTrain(x, y)) return;
    this.cam.showOverview();
    this.hud.setCameraMode(this.cam.mode);
  }

  private pickSwitch(x: number, y: number): number {
    let best = -1;
    let bestDist = SWITCH_PICK_PX;
    for (const sw of this.def.switches) {
      for (const a of this.board.switchAnchors(sw.id)) {
        const p = this.cam.project(a.x, a.y, a.z, this.projected);
        if (!p) continue;
        const d = Math.hypot(p.x - x, p.y - y);
        if (d <= bestDist) {
          bestDist = d;
          best = sw.id;
        }
      }
    }
    return best;
  }

  private pickTrain(x: number, y: number): boolean {
    for (let i = 0; i < this.train.cars.length; i++) {
      const c = this.train.carPosition(i, this.tmp);
      const p = this.cam.project(c.x, 0.2, c.z, this.projected);
      if (p && Math.hypot(p.x - x, p.y - y) <= TRAIN_PICK_PX) return true;
    }
    return false;
  }

  private updateFollowPoint(): void {
    const engine = this.poses[0];
    if (!engine) return;
    let sx = 0;
    let sz = 0;
    for (const p of this.poses) {
      sx += p.x;
      sz += p.y;
    }
    const n = this.poses.length;
    const ahead = 0.6;
    this.cam.setFollowPoint(
      sx / n - this.def.cols / 2 + Math.cos(engine.heading) * ahead,
      sz / n - this.def.rows / 2 + Math.sin(engine.heading) * ahead,
    );
  }

  private trainEffects(dt: number): void {
    const engine = this.poses[0];
    if (!engine) return;
    this.chuff -= dt;
    if (this.chuff <= 0) {
      this.chuff = 0.42 / this.def.train.speed;
      const x = engine.x - this.def.cols / 2 + Math.cos(engine.heading) * 0.2;
      const z = engine.y - this.def.rows / 2 + Math.sin(engine.heading) * 0.2;
      this.effects.puff(x, 0.5, z, '#f4efe6', 0.9);
      this.ctx.sound.play('chuff');
    }
  }

  private handle(events: SimEvent[]): void {
    for (const e of events) {
      switch (e.t) {
        case 'switch':
          this.board.setSwitch(e.switch, e.state);
          break;
        case 'switchLocked':
          this.board.shakeSwitch(e.switch);
          break;
        case 'drop': {
          const hopper = this.board.hoppers.get(e.factory);
          if (hopper) this.physics?.drop(e.car, hopper, e.type, e.caught, e.spilled);
          this.pouring = 0.6;
          if (e.spilled > 0) {
            if (hopper) this.effects.puff(hopper.x, 0.08, hopper.z, '#e9d8bd', 0.8);
            this.ctx.sound.play('spill');
          }
          break;
        }
        case 'skip': {
          // Nothing under the hopper: its door just puffs.
          const hopper = this.board.hoppers.get(e.factory);
          if (hopper) this.effects.puff(hopper.x, hopper.y, hopper.z, '#f4efe6', 0.5);
          break;
        }
        case 'pileDanger':
          this.board.markDanger(e.factory);
          this.hud.showToast('Careful! A big toy pile is on the track.');
          break;
        case 'derail': {
          const poses = this.sim.carPoses(1, this.poses);
          this.physics?.explode(poses);
          const engine = poses[0];
          if (engine) this.effects.burst(engine.x - this.def.cols / 2, 0.3, engine.y - this.def.rows / 2);
          this.ctx.sound.play('boing');
          window.setTimeout(() => this.ctx.sound.play('pop'), 180);
          this.endTimer = 1.8;
          break;
        }
        case 'delivered': {
          this.ctx.sound.play(e.result.passed ? 'jingle' : 'fail');
          if (e.result.secretRoute) {
            showCelebration(this.ctx.ui, 'Secret route!', 'rocket');
            this.ctx.sound.play('secret');
          }
          // Every wagon tips its toys into its chute (FR-072).
          const { toward, center } = this.board.station;
          this.physics?.tip(toward.x * 1.6, toward.z * 1.6);
          if (e.result.passed) this.effects.confetti(center.x, 1.0, center.z);
          this.endTimer = 1.4;
          break;
        }
        default:
          break;
      }
    }
  }

  private showEnd(): void {
    if (this.overlay) return;
    this.hud.showHint(null);
    if (this.sim.phase === 'derailed') {
      this.overlay = showDerailed(this.ctx.ui, {
        onRetry: () => this.restart(),
        onMap: () => this.ctx.openMap(this.levelNumber),
      });
      return;
    }
    const result = this.sim.result();
    if (!result) return;
    const { newBest } = this.ctx.progress.record(this.levelNumber, result);
    const next = this.levelNumber + 1;
    for (let i = 0; i < result.stars; i++) window.setTimeout(() => this.ctx.sound.play('star'), 450 + i * 250);
    this.overlay = showResults(
      this.ctx.ui,
      {
        level: this.levelNumber,
        result,
        best: this.ctx.progress.best(this.levelNumber),
        newBest,
        hasNext: true,
        nextUnlocked: this.ctx.progress.unlocked(next),
        secretAvailable: this.def.routes.secret !== null,
      },
      {
        onRetry: () => this.restart(),
        onMap: () => this.ctx.openMap(this.levelNumber),
        onNext: () => this.ctx.openLevel(next),
      },
    );
  }
}
