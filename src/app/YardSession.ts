// One shunting puzzle (spec F-014): plan the yard (switch settings, uncoupler pads), let the train
// go, then watch or scrub the run. Nothing in the yard changes after Go (FR-096); the whole run is
// computed at once and played back from its frames (FR-098).
import * as THREE from 'three';
import { levelTitle, type Lesson } from '../engine/campaign';
import { yardScore } from '../engine/scoring';
import { defaultPlan, flipGroup, padAllowed, initialFrame, runPlan, type Frame, type Plan, type RunResult, type YardEvent, type YardLevel } from '../engine/yard';
import { generateYard } from '../engine/yardGen';
import { THEMES } from '../graphics/biomes';
import { CameraController } from '../graphics/cameraController';
import { Effects } from '../graphics/effects';
import { YardTrainView } from '../graphics/yardTrain';
import { YardView } from '../graphics/yardView';
import { GestureRecognizer } from '../input/gestures';
import { showCelebration, showPause, showYardResults, type OverlayHandle } from '../ui/overlays';
import { YardHud } from '../ui/yardHud';
import type { AppContext, GameScreen } from './screen';

const SWITCH_PICK_PX = 26;
/** How far from a track tile's centre a tap still places an uncoupler there. */
const PAD_PICK_PX = 30;
/** Playback pace (steps per second) at `?speed=1` (FR-097). */
const STEPS_PER_SECOND = 6;

const HINTS: Record<number, string> = {
  1: 'Tap GO! The striped switch flips every time the train passes it.',
  2: 'Each wagon goes through the factory and gets filled. Watch the timeline below.',
};

/** What an introduction level teaches; its goal can only be reached that way (FR-110). */
const LESSON_HINTS: Record<Lesson, string> = {
  pad: 'The station wants fewer wagons than you have. Tap the track under a wagon to place an uncoupler: when the train backs into a dead end, the wagons from the uncoupler to the buffer stay behind.',
  washer: 'WASH empties every wagon that goes through it, so an emptied wagon can be filled with something else.',
  converter: 'The > factory turns the toy on its left into the toy on its right.',
  linked: 'Switches with the = badge are linked: flipping one flips its partner.',
  single: 'The ONE factory fills just one empty wagon each time the train passes.',
  trigger: 'A T switch flips whenever the train rolls over the plate of its color.',
  swap: 'The <> factory swaps two toys: each one turns into the other.',
};

const FAIL_TEXT: Record<string, string> = {
  wrongTrain: 'Wrong train for the station!',
  loop: 'Going round in circles…',
  stuck: 'Stuck: the track ends here.',
  crash: 'Crash! The train ran into a wagon sideways.',
  limit: 'That took far too long.',
};

export type YardPhase = 'planning' | 'running' | 'delivered' | 'failed';

export class YardSession implements GameScreen {
  readonly kind = 'level' as const;
  readonly levelNumber: number;
  readonly def: YardLevel;
  private readonly scene = new THREE.Scene();
  private readonly cam = new CameraController();
  private readonly view: YardView;
  private readonly train: YardTrainView;
  private readonly effects = new Effects();
  private readonly hud: YardHud;
  private readonly gestures: GestureRecognizer;
  private plan: Plan;
  private run: RunResult | null = null;
  private frames: Frame[];
  private t = 0;
  private playing = false;
  private ended = false;
  private overlay: OverlayHandle | null = null;
  private time = 0;
  private smoke = 0;
  private shownSwitches: (0 | 1)[];
  private lastStep = 0;
  private readonly tmp = new THREE.Vector3();
  private readonly disposeQuality: () => void;

  constructor(
    private readonly ctx: AppContext,
    level: number,
  ) {
    this.levelNumber = level;
    this.def = generateYard(level);
    this.plan = defaultPlan(this.def);
    const theme = THEMES[this.def.biome];
    this.scene.background = new THREE.Color(theme.background);
    this.view = new YardView(this.def, theme);
    this.train = new YardTrainView(this.def);
    this.scene.add(this.view.group, this.train.group, this.effects.group);
    this.view.setShadowMapSize(ctx.gfx.quality.shadowMapSize);
    this.disposeQuality = ctx.gfx.onQualityChange((q) => this.view.setShadowMapSize(q.shadowMapSize));
    this.frames = [initialFrame(this.def, this.plan.switches)];
    this.shownSwitches = [...this.plan.switches];
    this.hud = new YardHud(
      ctx.ui,
      { title: levelTitle(level), goal: this.def.goal, pads: this.def.pads, par: this.def.par, muted: ctx.sound.muted },
      {
        onGo: () => this.go(),
        onEdit: () => this.edit(),
        onReset: () => this.resetPlan(),
        onPlayPause: () => this.togglePlay(),
        onScrub: (step, phase) => this.scrub(step, phase),
        onMap: () => ctx.openMap(level),
        onCamera: () => this.toggleCamera(),
        onMute: () => {
          ctx.sound.muted = !ctx.sound.muted;
          ctx.progress.muted = ctx.sound.muted;
          this.hud.setMuted(ctx.sound.muted);
        },
      },
    );
    if (ctx.progress.stars(level) === 0) this.hud.showHint(HINTS[level] ?? (this.def.lesson ? LESSON_HINTS[this.def.lesson] : null));
    this.cam.setBounds(this.view.bounds);
    this.gestures = new GestureRecognizer(ctx.gfx.canvas, {
      onPointerDown: () => ctx.sound.unlock(),
      onTap: (x, y) => this.tap(x, y),
      onDoubleTap: () => {
        this.cam.showOverview();
        this.hud.setCameraMode(this.cam.mode);
      },
      onPan: (dx, dy, x, y) => this.cam.pan(dx, dy, x, y),
      onPinch: (scale, cx, cy, dx, dy) => {
        this.cam.zoomAt(scale, cx, cy);
        if (dx || dy) this.cam.pan(dx, dy, cx, cy);
      },
      onWheel: (deltaY, x, y) => this.cam.zoomAt(Math.exp(-deltaY * 0.0015), x, y),
    });
    this.hud.onLayout = () => this.cam.setViewport(ctx.gfx.width, ctx.gfx.height, this.hud.insets);
    this.train.pose(this.frames, 0);
    if (ctx.params.autoplay) {
      this.plan = { switches: [...this.def.solution.switches], pads: [...this.def.solution.pads] };
      this.syncPlanView();
      this.go();
    }
  }

  // -------------------------------------------------------------------------------------------
  // GameScreen

  tick(): void {}

  frame(dt: number): void {
    this.time += dt;
    if (this.run && this.playing && !this.hud.isDragging) {
      this.t = Math.min(this.run.steps, this.t + dt * STEPS_PER_SECOND * this.ctx.params.speed);
      if (this.t >= this.run.steps) this.finish();
    }
    this.showAt(this.t);
    this.view.motion = !this.ctx.ui.reducedMotion;
    this.view.update(dt, this.cam.camera);
    // Chimneys smoke now and then (not under reduced motion).
    this.smoke += dt;
    if (this.view.motion && this.smoke > 0.8) {
      this.smoke = 0;
      for (const c of this.view.chimneys) this.effects.puff(c.x, c.y, c.z, '#efe9e0', 0.75);
    }
    this.effects.update(dt);
    if (this.cam.mode === 'follow') {
      const p = this.train.carPosition(-1, this.tmp);
      this.cam.setFollowPoint(p.x, p.z);
    }
    this.cam.update(dt);
    this.hud.frame(dt);
    this.ctx.gfx.render(this.scene, this.cam.camera);
  }

  resize(width: number, height: number): void {
    this.effects.setScale(this.ctx.gfx.canvas.height);
    this.cam.setViewport(width, height, this.hud.insets);
    if (this.time === 0) this.cam.snapToOverview();
  }

  hidden(): void {
    this.ctx.sound.suspend();
    if (this.playing) this.togglePlay();
  }

  dispose(): void {
    this.overlay?.close();
    this.gestures.dispose();
    this.hud.dispose();
    this.view.dispose();
    this.train.dispose();
    this.effects.dispose();
    this.disposeQuality();
  }

  // -------------------------------------------------------------------------------------------
  // Test hook helpers

  phase(): YardPhase {
    if (!this.run) return 'planning';
    if (!this.ended) return 'running';
    return this.run.success ? 'delivered' : 'failed';
  }

  result(): { stars: number; score: number; passed: boolean; steps: number; par: number; outcome: string } | null {
    if (!this.run || !this.ended) return null;
    const s = yardScore(this.run.success, this.run.steps, this.def.par);
    return { stars: s.stars, score: s.score, passed: this.run.success, steps: this.run.steps, par: this.def.par, outcome: this.run.outcome };
  }

  switchScreenPositions(): { id: number; x: number; y: number }[] {
    return this.def.switches.flatMap((sw) => {
      const a = this.view.switchAnchors(sw.id)[0];
      const p = a ? this.cam.project(a.x, a.y, a.z) : null;
      return p ? [{ id: sw.id, x: p.x, y: p.y }] : [];
    });
  }

  tileScreenPosition(tile: number): { x: number; y: number } | null {
    const c = this.view.tileCenter(tile);
    return this.cam.project(c.x, 0.05, c.z);
  }

  planState(): Plan {
    return { switches: [...this.plan.switches], pads: [...this.plan.pads] };
  }

  solution(): Plan {
    return this.def.solution;
  }

  switchArrowAngle(id: number): number {
    return this.view.switchArrowAngle(id);
  }

  cameraMode(): string {
    return this.cam.mode;
  }

  progressStep(): number {
    return this.t;
  }

  viewCoverage(): { boardLeft: number; boardRight: number; groundCovers: boolean } {
    const b = this.view.bounds;
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

  debugStats(): string {
    return this.run ? ` · step ${this.t.toFixed(1)}/${this.run.steps}` : ' · planning';
  }

  // -------------------------------------------------------------------------------------------
  // Planning

  private tap(x: number, y: number): void {
    this.ctx.sound.unlock();
    if (this.run || this.overlay) return; // No changes after Go (FR-096).
    const sw = this.pickSwitch(x, y);
    if (sw >= 0) {
      for (const id of flipGroup(this.def, this.plan.switches, sw)) this.view.setSwitch(id, this.plan.switches[id] as 0 | 1);
      this.ctx.sound.play('click');
      return;
    }
    if (this.def.pads === 0) return;
    const tile = this.pickPadTile(x, y);
    if (tile < 0) return;
    const i = this.plan.pads.indexOf(tile);
    if (i >= 0) this.plan.pads.splice(i, 1);
    else if (this.plan.pads.length < this.def.pads) this.plan.pads.push(tile);
    else {
      this.hud.showToast('No uncouplers left: tap one to pick it up.');
      this.hud.shakeToast();
      this.ctx.sound.play('locked');
      return;
    }
    this.ctx.sound.play('tap');
    this.syncPlanView();
  }

  /**
   * The track or buffer tile nearest the finger (FR-101). Tiles are measured at the ground and at
   * wagon height, so tapping on top of a standing wagon picks the track under it.
   */
  private pickPadTile(x: number, y: number): number {
    let best = -1;
    let bestDist = PAD_PICK_PX;
    for (const piece of this.def.pieces) {
      if (!padAllowed(this.def, piece.tile)) continue;
      const c = this.view.tileCenter(piece.tile);
      for (const h of [0.05, 0.25]) {
        const p = this.cam.project(c.x, h, c.z);
        if (!p) continue;
        const d = Math.hypot(p.x - x, p.y - y);
        if (d < bestDist) {
          bestDist = d;
          best = piece.tile;
        }
      }
    }
    return best;
  }

  private pickSwitch(x: number, y: number): number {
    let best = -1;
    let bestDist = SWITCH_PICK_PX;
    for (const sw of this.def.switches) {
      for (const a of this.view.switchAnchors(sw.id)) {
        const p = this.cam.project(a.x, a.y, a.z);
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

  private syncPlanView(): void {
    this.view.setPads(this.plan.pads);
    this.hud.setPadsLeft(this.def.pads - this.plan.pads.length);
    this.def.switches.forEach((sw) => this.view.setSwitch(sw.id, this.plan.switches[sw.id] as 0 | 1, false));
    this.frames = [initialFrame(this.def, this.plan.switches)];
    this.shownSwitches = [...this.plan.switches];
    this.t = 0;
  }

  private resetPlan(): void {
    this.plan = defaultPlan(this.def);
    this.syncPlanView();
    this.ctx.sound.play('click');
  }

  // -------------------------------------------------------------------------------------------
  // Run and playback

  private go(): void {
    if (this.run) return;
    this.run = runPlan(this.def, this.plan, { frames: true });
    this.frames = this.run.frames;
    this.train.setRun(this.frames);
    this.t = 0;
    this.lastStep = 0;
    this.ended = false;
    this.playing = true;
    this.hud.setRun(this.run.steps, this.frames.map((f) => f.events), this.run.success);
    this.hud.setMode('playback');
    this.hud.setPlaying(true);
    this.hud.showHint(null);
    this.ctx.sound.play('whistle');
  }

  private edit(): void {
    this.overlay?.close();
    this.overlay = null;
    this.run = null;
    this.playing = false;
    this.ended = false;
    this.view.markFailure(null);
    this.hud.setMode('planning');
    this.syncPlanView();
  }

  private togglePlay(): void {
    if (!this.run) return;
    if (this.t >= this.run.steps) {
      this.t = 0;
      this.lastStep = 0;
    }
    this.playing = !this.playing;
    this.hud.setPlaying(this.playing);
  }

  private scrub(step: number, phase: 'start' | 'move' | 'end'): void {
    if (!this.run) return;
    if (phase === 'start') this.playing = false;
    this.t = step;
    this.lastStep = Math.floor(step);
    this.hud.setPlaying(false);
    if (phase === 'end' && step >= this.run.steps - 0.01) this.finish();
  }

  /** Poses the yard at fractional step t, with sounds and effects for steps just passed. */
  private showAt(t: number): void {
    this.train.pose(this.frames, t);
    this.hud.setProgress(t);
    const i = Math.min(this.frames.length - 1, Math.round(t));
    const states = (this.frames[i] as Frame).switches;
    states.forEach((s, id) => {
      if (this.shownSwitches[id] !== s) {
        this.shownSwitches[id] = s;
        this.view.setSwitch(id, s);
      }
    });
    if (!this.run || !this.playing) return;
    const step = Math.floor(t);
    for (let s = this.lastStep + 1; s <= step; s++) for (const e of (this.frames[s] as Frame).events) this.eventFx(e);
    this.lastStep = Math.max(this.lastStep, step);
  }

  private eventFx(e: YardEvent): void {
    const engine = this.train.carPosition(-1, this.tmp);
    switch (e.t) {
      case 'couple':
        this.ctx.sound.play('click');
        break;
      case 'uncouple':
        this.ctx.sound.play('pop');
        break;
      case 'reverse':
        this.ctx.sound.play('chuff');
        this.effects.puff(engine.x, 0.5, engine.z, '#f4efe6', 0.9);
        break;
      case 'factory': {
        this.ctx.sound.play('tap');
        const f = this.def.factories[e.factory];
        if (f) {
          const c = this.view.tileCenter(f.tile);
          this.effects.puff(c.x, 0.6, c.z, '#ffffff', 0.7);
        }
        break;
      }
      default:
        break;
    }
  }

  private finish(): void {
    if (!this.run || this.ended) return;
    this.ended = true;
    this.playing = false;
    this.hud.setPlaying(false);
    const run = this.run;
    if (!run.success) {
      this.ctx.sound.play('fail');
      const last = this.frames[this.frames.length - 1] as Frame;
      const fail = last.events.find((e) => e.t === 'fail');
      this.view.markFailure(fail && fail.t === 'fail' ? fail.tile : this.def.station.buffer);
      this.hud.showToast(FAIL_TEXT[run.outcome] ?? 'That did not work.', 3200);
      this.hud.shakeToast();
      return;
    }
    const score = yardScore(true, run.steps, this.def.par);
    const { newBest } = this.ctx.progress.record(this.levelNumber, { stars: score.stars, score: score.score, secretRoute: score.beatPar });
    this.ctx.sound.play('jingle');
    const c = this.view.chutes[0] ?? new THREE.Vector3();
    this.effects.confetti(c.x, 1, c.z);
    if (score.beatPar) showCelebration(this.ctx.ui, 'Shorter than the dispatcher!', 'rocket');
    for (let i = 0; i < score.stars; i++) window.setTimeout(() => this.ctx.sound.play('star'), 450 + i * 250);
    const next = this.levelNumber + 1;
    window.setTimeout(() => {
      if (!this.ended || this.overlay) return;
      this.overlay = showYardResults(
        this.ctx.ui,
        {
          level: this.levelNumber,
          steps: run.steps,
          par: this.def.par,
          stars: score.stars,
          beatPar: score.beatPar,
          best: Math.round((1000 * this.def.par) / Math.max(1, this.ctx.progress.best(this.levelNumber))),
          newBest,
          nextUnlocked: this.ctx.progress.unlocked(next),
        },
        {
          onEdit: () => {
            this.overlay = null;
            this.edit();
          },
          onMap: () => {
            this.overlay = null;
            this.ctx.openMap(this.levelNumber);
          },
          onNext: () => this.ctx.openLevel(next),
        },
      );
    }, 900);
  }

  private toggleCamera(): void {
    if (this.cam.mode === 'follow') this.cam.showOverview();
    else this.cam.follow();
    this.hud.setCameraMode(this.cam.mode);
  }

  /** Pause card (kept for the platform's backgrounding, NFR-004). */
  pause(): void {
    if (!this.playing || this.overlay) return;
    this.togglePlay();
    this.overlay = showPause(this.ctx.ui, {
      onResume: () => {
        this.overlay = null;
        this.togglePlay();
      },
      onRestart: () => {
        this.overlay = null;
        this.edit();
      },
      onMap: () => this.ctx.openMap(this.levelNumber),
    });
  }
}
