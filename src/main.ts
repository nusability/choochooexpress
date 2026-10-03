import './ui/styles.css';
import * as THREE from 'three';
import { DT } from './engine/flow';
import { GameRenderer } from './graphics/renderer';

/** A screen owns a scene and reacts to the fixed-tick loop. */
export interface GameScreen {
  readonly kind: 'map' | 'level';
  /** Advance one fixed simulation tick (DT). */
  tick(): void;
  /** Per-frame update and render; `alpha` interpolates between ticks. */
  frame(dt: number, alpha: number): void;
  resize(width: number, height: number): void;
  /** Tab hidden or phone locked (NFR-004). */
  hidden(): void;
  dispose(): void;
}

export interface AppParams {
  speed: number;
  autoplay: boolean;
  level: number | null;
  reset: boolean;
  debug: boolean;
}

function readParams(): AppParams {
  const q = new URLSearchParams(window.location.search);
  const speed = Math.round(Number(q.get('speed') ?? '1'));
  const level = Number(q.get('level'));
  return {
    speed: Number.isFinite(speed) ? Math.min(8, Math.max(1, speed)) : 1,
    autoplay: q.get('autoplay') === '1',
    level: Number.isInteger(level) && level >= 1 && level <= 28 ? level : null,
    reset: q.get('reset') === '1',
    debug: q.get('debug') === '1',
  };
}

const MAX_TICKS_PER_FRAME = 4;

class App {
  readonly params = readParams();
  readonly gfx: GameRenderer;
  private screen: GameScreen | null = null;
  private last = 0;
  private acc = 0;

  constructor(root: HTMLElement) {
    this.gfx = new GameRenderer(root);
    window.addEventListener('resize', () => this.onResize());
    window.visualViewport?.addEventListener('resize', () => this.onResize());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.screen?.hidden();
    });
    window.addEventListener('pagehide', () => this.screen?.hidden());
    requestAnimationFrame((t) => this.loop(t));
  }

  get current(): GameScreen | null {
    return this.screen;
  }

  show(next: GameScreen): void {
    this.screen?.dispose();
    this.screen = next;
    this.acc = 0;
    next.resize(this.gfx.width, this.gfx.height);
    this.gfx.resetFrameTracking();
  }

  private onResize(): void {
    if (this.gfx.resize()) this.screen?.resize(this.gfx.width, this.gfx.height);
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
    screen.frame(dt, this.acc / DT);
  }
}

/** Placeholder screen until the map and level screens exist. */
class BootScreen implements GameScreen {
  readonly kind = 'map' as const;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  constructor(private readonly gfx: GameRenderer) {
    this.scene.background = new THREE.Color('#2b1d14');
    this.camera.position.set(0, 6, 8);
    this.camera.lookAt(0, 0, 0);
  }
  tick(): void {}
  frame(): void {
    this.gfx.render(this.scene, this.camera);
  }
  resize(w: number, h: number): void {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }
  hidden(): void {}
  dispose(): void {}
}

const root = document.getElementById('app');
if (!root) throw new Error('#app missing');
const app = new App(root);
app.show(new BootScreen(app.gfx));

declare global {
  interface Window {
    __ccx: unknown;
  }
}
window.__ccx = {
  screen: () => (app.current ? app.current.kind : 'boot'),
};
