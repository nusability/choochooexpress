// WebGLRenderer setup, pixel-ratio cap, resizing and adaptive quality (research R10, NFR-001).
import * as THREE from 'three';

export interface QualitySettings {
  /** 0 = no shadows. */
  shadowMapSize: number;
  pixelRatio: number;
}

const FRAME_BUDGET_MS = 18;
const WINDOW_MS = 2000;

export class GameRenderer {
  readonly renderer: THREE.WebGLRenderer;
  readonly canvas: HTMLCanvasElement;
  width = 1;
  height = 1;
  private qualityLevel = 0;
  private pinned = false;
  private readonly maxPixelRatio: number;
  private frameAccum = 0;
  private frameCount = 0;
  private windowStart = 0;
  private listeners: ((q: QualitySettings) => void)[] = [];
  /** Drawn over every frame's scene (the 3D interface layer). */
  overlay: ((renderer: THREE.WebGLRenderer) => void) | null = null;

  constructor(private readonly container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', alpha: false });
    this.canvas = this.renderer.domElement;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    // One frame is several render calls (scene + interface layers); count them together.
    this.renderer.info.autoReset = false;
    this.maxPixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(this.maxPixelRatio);
    container.appendChild(this.canvas);
    this.resize();
  }

  get quality(): QualitySettings {
    const shadowMapSize = this.qualityLevel === 0 ? 2048 : this.qualityLevel === 1 ? 1024 : 0;
    const pixelRatio =
      this.qualityLevel <= 2 ? this.maxPixelRatio : this.qualityLevel === 3 ? Math.min(1.5, this.maxPixelRatio) : Math.min(1.25, this.maxPixelRatio);
    return { shadowMapSize, pixelRatio };
  }

  onQualityChange(fn: (q: QualitySettings) => void): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  /** Re-reads the container size; returns true when it changed. */
  resize(): boolean {
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    if (w === this.width && h === this.height) return false;
    this.width = w;
    this.height = h;
    this.renderer.setSize(w, h, false);
    return true;
  }

  /** Feed the duration of each frame; steps quality down when the 2 s average exceeds the budget. */
  trackFrame(now: number, frameMs: number): void {
    if (this.windowStart === 0) this.windowStart = now;
    this.frameAccum += Math.min(frameMs, 100);
    this.frameCount++;
    if (now - this.windowStart < WINDOW_MS) return;
    const avg = this.frameAccum / Math.max(1, this.frameCount);
    this.frameAccum = 0;
    this.frameCount = 0;
    this.windowStart = now;
    if (avg > FRAME_BUDGET_MS && this.qualityLevel < 4 && !this.pinned) this.setQualityLevel(this.qualityLevel + 1);
  }

  /** Fix the quality level and stop adapting it (`?quality=N`, for measuring on a device). */
  pinQualityLevel(level: number): void {
    this.pinned = true;
    this.setQualityLevel(level);
  }

  /** Restart measuring (e.g. after loading a level), so hitches during setup are ignored. */
  resetFrameTracking(): void {
    this.frameAccum = 0;
    this.frameCount = 0;
    this.windowStart = 0;
  }

  setQualityLevel(level: number): void {
    this.qualityLevel = Math.max(0, Math.min(4, level));
    const q = this.quality;
    this.renderer.shadowMap.enabled = q.shadowMapSize > 0;
    this.renderer.setPixelRatio(q.pixelRatio);
    this.renderer.setSize(this.width, this.height, false);
    for (const fn of this.listeners) fn(q);
  }

  get level(): number {
    return this.qualityLevel;
  }

  render(scene: THREE.Scene, camera: THREE.Camera): void {
    this.renderer.info.reset();
    this.renderer.render(scene, camera);
    this.overlay?.(this.renderer);
  }
}
