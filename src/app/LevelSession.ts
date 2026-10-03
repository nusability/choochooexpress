// One playable level: wires the simulation, board, train, toy physics, camera, HUD, input and
// sounds (tasks T041, T052, T062, T080).
import * as THREE from 'three';
import { levelLabel, LEVEL_COUNT } from '../engine/campaign';
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
  1: { planning: 'Tap the glowing switch to change the track, then tap GO!', running: 'Tap the switch so the train reaches the Toy Store.' },
  2: { planning: 'Pick the branch under the right toy factory. Wrong toys spoil the order!' },
  3: { planning: 'Orders come in sequence: collect the toys in the order shown at the top.' },
  10: { planning: 'This factory sits on a loop: go round once, then flip the switch while the train is inside!' },
  22: { planning: 'Space Playroom: a faster secret route exists — if your timing is sharp…' },
};

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
  private ended = false;
  private time = 0;
  private lastPhase: Phase = 'planning';
  private hintTimer = 0;
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
    this.train = new TrainView(this.def.train.wagons, this.def.cols, this.def.rows);
    this.effects = new Effects();
    this.scene.add(this.board.group, this.train.group, this.effects.group);
    this.attachPhysics();
    this.board.setShadowMapSize(ctx.gfx.quality.shadowMapSize);
    this.disposeQuality = ctx.gfx.onQualityChange((q) => this.board.setShadowMapSize(q.shadowMapSize));

    this.hud = new Hud(
      ctx.hudHost,
      { title: levelLabel(level), order: this.def.order.lines, wagons: this.def.train.wagons, capacity: this.def.train.capacity, muted: ctx.sound.muted },
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
    this.hud.setLoaded({});
    this.showHints = ctx.progress.stars(level) === 0;
    this.hud.showHint(this.showHints ? (HINTS[level]?.planning ?? null) : null);

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
    this.board.update(dt);
    this.effects.update(dt);
    if (phase === 'running') this.trainEffects(dt);
    if (phase === 'running') for (const sw of this.def.switches) this.board.setSwitchBusy(sw.id, this.sim.isSwitchLocked(sw.id));
    if (phase === 'running' && this.hintTimer > 0) {
      this.hintTimer -= dt;
      if (this.hintTimer <= 0) this.hud.showHint(null);
    }
    this.updateFollowPoint();
    this.cam.update(dt);
    this.hud.setLoaded(this.sim.loadedByType());
    this.hud.setWagons(this.sim.wagonLoads(), this.def.train.capacity);
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
    // HUD layout changes with the viewport; measure after the browser has laid it out.
    this.cam.setViewport(width, height, this.hud.insets);
    if (this.time === 0) this.cam.snapToOverview();
    requestAnimationFrame(() => this.cam.setViewport(width, height, this.hud.insets));
  }

  hidden(): void {
    this.ctx.sound.suspend();
    if (this.sim.phase === 'running' && !this.overlay) {
      this.sim.pause();
      this.overlay = showTapToContinue(this.ctx.hudHost, () => {
        this.overlay = null;
        this.sim.resume();
      });
    }
  }

  dispose(): void {
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

  cameraMode(): string {
    return this.cam.mode;
  }

  /** `?debug=1` overlay text (task T081). */
  debugStats(): string {
    const stats = this.physics?.stats();
    return stats ? ` · toys ${stats.active}/${stats.alive}` : ' · physics loading';
  }

  // -------------------------------------------------------------------------------------------
  // Actions

  private go(): void {
    if (this.sim.phase !== 'planning') return;
    if (!this.physics && this.ctx.physics.ready()) this.attachPhysics();
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
    this.overlay = showPause(this.ctx.hudHost, {
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
        if (!this.ended && this.sim.phase === 'planning') this.attachPhysics();
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
        case 'load':
        case 'spill': {
          this.physics?.spawn(e.t, e.wagon, e.funnel, e.type);
          this.pouring = 0.15;
          if (e.t === 'spill') {
            const hopper = this.board.hoppers.get(e.funnel);
            if (hopper && Math.random() < 0.25) this.effects.puff(hopper.x, 0.08, hopper.z, '#e9d8bd', 0.6);
            if (Math.random() < 0.2) this.ctx.sound.play('spill');
          }
          break;
        }
        case 'pileDanger':
          this.board.markDanger(e.funnel);
          this.hud.showToast('Careful! A big toy pile is on the track.');
          break;
        case 'derail': {
          this.ended = true;
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
          this.ended = true;
          this.ctx.sound.play(e.result.passed ? 'jingle' : 'fail');
          if (e.result.secretRoute) {
            showCelebration(this.ctx.hudHost, '🚀 Secret route!');
            this.ctx.sound.play('secret');
          }
          const store = this.def.store.buildingTile;
          const sx = (store % this.def.cols) + 0.5 - this.def.cols / 2;
          const sz = Math.floor(store / this.def.cols) + 0.5 - this.def.rows / 2;
          if (e.result.passed) this.effects.confetti(sx, 1.0, sz);
          this.endTimer = 1.0;
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
      this.overlay = showDerailed(this.ctx.hudHost, {
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
      this.ctx.hudHost,
      {
        level: this.levelNumber,
        result,
        best: this.ctx.progress.best(this.levelNumber),
        newBest,
        hasNext: next <= LEVEL_COUNT,
        nextUnlocked: next <= LEVEL_COUNT && this.ctx.progress.unlocked(next),
      },
      {
        onRetry: () => this.restart(),
        onMap: () => this.ctx.openMap(this.levelNumber),
        onNext: () => this.ctx.openLevel(next),
      },
    );
  }
}
