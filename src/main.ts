import './ui/styles.css';
import { ProgressStore } from './app/progressStore';
import { LevelSession } from './app/LevelSession';
import type { AppContext, AppParams, GameScreen } from './app/screen';
import { Sfx } from './audio/sfx';
import { LEVEL_COUNT } from './engine/campaign';
import { DT } from './engine/flow';
import { GameRenderer } from './graphics/renderer';
import { physicsFactory } from './physics/toyPhysics';
import { createStorage } from './platform/storage';
import { MetaMap } from './ui/MetaMap';
import { UiInput } from './ui/kit/uiInput';
import { UiLayer } from './ui/kit/uiLayer';

function readParams(): AppParams {
  const q = new URLSearchParams(window.location.search);
  const speed = Math.round(Number(q.get('speed') ?? '1'));
  const level = Number(q.get('level'));
  const quality = q.get('quality') === null ? NaN : Number(q.get('quality'));
  return {
    speed: Number.isFinite(speed) ? Math.min(8, Math.max(1, speed)) : 1,
    autoplay: q.get('autoplay') === '1',
    level: Number.isInteger(level) && level >= 1 && level <= LEVEL_COUNT ? level : null,
    reset: q.get('reset') === '1',
    debug: q.get('debug') === '1',
    quality: Number.isInteger(quality) && quality >= 0 && quality <= 4 ? quality : null,
  };
}

const MAX_TICKS_PER_FRAME = 4;

class App implements AppContext {
  readonly params = readParams();
  readonly ui: UiLayer;
  readonly physics = physicsFactory;
  readonly progress: ProgressStore;
  readonly sound: Sfx;
  private screen: GameScreen | null = null;
  private last = 0;
  private acc = 0;
  private debugEl: HTMLElement | null = null;
  private fpsAccum = 0;
  private fpsFrames = 0;

  constructor(readonly gfx: GameRenderer) {
    if (this.params.quality !== null) this.gfx.pinQualityLevel(this.params.quality);
    // The whole interface is 3D, drawn over each frame's scene (spec F-008).
    this.ui = new UiLayer();
    this.ui.resize(this.gfx.width, this.gfx.height);
    this.gfx.overlay = (renderer) => this.ui.render(renderer);
    new UiInput(this.ui, this.gfx.canvas);
    const storage = createStorage();
    this.progress = new ProgressStore(storage);
    if (this.params.reset) this.progress.reset();
    this.sound = new Sfx(this.progress.muted);
    this.ui.onButton = () => this.sound.play('tap');
    void this.physics.load();
    window.addEventListener('resize', () => this.onResize());
    window.visualViewport?.addEventListener('resize', () => this.onResize());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.screen?.hidden();
    });
    window.addEventListener('pagehide', () => this.screen?.hidden());
    // Unlock audio on the very first gesture anywhere (HUD buttons included).
    const unlock = () => this.sound.unlock();
    window.addEventListener('pointerdown', unlock, { capture: true });
    if (this.params.debug) {
      this.debugEl = document.createElement('div');
      this.debugEl.className = 'debug';
      document.body.append(this.debugEl);
    }
    requestAnimationFrame((t) => this.loop(t));
  }

  get current(): GameScreen | null {
    return this.screen;
  }

  openMap(focusLevel?: number): void {
    this.show(new MetaMap(this, focusLevel ?? this.progress.furthestUnlocked()));
  }

  openLevel(level: number): void {
    if (!this.progress.unlocked(level)) {
      this.openMap(level);
      return;
    }
    this.show(new LevelSession(this, level));
  }

  private show(next: GameScreen): void {
    this.screen?.dispose();
    this.screen = next;
    this.acc = 0;
    next.resize(this.gfx.width, this.gfx.height);
    this.gfx.resetFrameTracking();
  }

  private onResize(): void {
    if (!this.gfx.resize()) return;
    this.ui.resize(this.gfx.width, this.gfx.height);
    this.screen?.resize(this.gfx.width, this.gfx.height);
  }

  private loop(now: number): void {
    requestAnimationFrame((t) => this.loop(t));
    const frameMs = this.last ? now - this.last : 16.7;
    this.last = now;
    const dt = Math.min(frameMs / 1000, 0.25);
    this.gfx.trackFrame(now, frameMs);
    const screen = this.screen;
    if (!screen) return;
    this.acc += dt * this.params.speed;
    let ticks = 0;
    const maxTicks = MAX_TICKS_PER_FRAME * this.params.speed;
    while (this.acc >= DT && ticks < maxTicks) {
      screen.tick();
      this.acc -= DT;
      ticks++;
    }
    if (ticks >= maxTicks) this.acc = Math.min(this.acc, DT);
    this.ui.update(dt);
    screen.frame(dt, this.acc / DT);
    if (this.debugEl) this.updateDebug(frameMs);
  }

  private updateDebug(frameMs: number): void {
    this.fpsAccum += frameMs;
    this.fpsFrames++;
    if (this.fpsAccum < 500 || !this.debugEl) return;
    const info = this.gfx.renderer.info;
    const fps = (1000 * this.fpsFrames) / this.fpsAccum;
    const level = this.screen instanceof LevelSession ? this.screen.debugStats() : '';
    this.debugEl.textContent = `${fps.toFixed(0)} fps · ${info.render.calls} calls · ${(info.render.triangles / 1000).toFixed(0)}k tris · q${this.gfx.level}${level}`;
    this.fpsAccum = 0;
    this.fpsFrames = 0;
  }
}

const root = document.getElementById('app');
if (!root) throw new Error('#app missing');
let gfx: GameRenderer;
try {
  gfx = new GameRenderer(root);
} catch (err) {
  // The one plain-page message the game has (NFR-015): without WebGL there is no 3D interface.
  const note = document.createElement('p');
  note.className = 'no-webgl';
  note.textContent = 'Choo Choo Express Delivery 3D needs 3D graphics (WebGL), which this browser has turned off or does not support.';
  document.body.append(note);
  throw err;
}
const app = new App(gfx);
const start = app.params.level;
if (start && app.progress.unlocked(start)) app.openLevel(start);
else app.openMap(start ?? undefined);

// Read-only test hook for the Playwright smoke test (contracts/engine-api.md §Test hook).
declare global {
  interface Window {
    __ccx: unknown;
  }
}
window.__ccx = {
  screen: () => (app.current ? app.current.kind : 'boot'),
  phase: () => (app.current instanceof LevelSession ? app.current.phase() : null),
  level: () => (app.current instanceof LevelSession ? app.current.levelNumber : null),
  switchScreenPositions: () => (app.current instanceof LevelSession ? app.current.switchScreenPositions() : []),
  switchLane: (id: number) => (app.current instanceof LevelSession ? app.current.switchLane(id) : null),
  standardPlan: () => (app.current instanceof LevelSession ? app.current.def.routes.standard.switchPlan : []),
  levelMarkerScreenPosition: (level: number) => (app.current instanceof MetaMap ? app.current.levelMarkerScreenPosition(level) : null),
  result: () => (app.current instanceof LevelSession ? app.current.result() : null),
  physicsReady: () => app.physics.ready(),
  cameraMode: () => (app.current instanceof LevelSession ? app.current.cameraMode() : null),
  unlocked: (level: number) => app.progress.unlocked(level),
  widgets: () => app.ui.widgets(),
};
