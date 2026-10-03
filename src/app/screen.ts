// Shared app-level types: screens, parameters and the services screens may use.
import type { RunOutcome } from '../engine/progress';
import type { GameRenderer } from '../graphics/renderer';
import type { UiLayer } from '../ui/kit/uiLayer';

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
  debug: boolean;
  /** Fixed render quality 0 (best) – 4, or null to adapt to the frame rate. */
  quality: number | null;
}

export interface SoundService {
  unlock(): void;
  muted: boolean;
  play(name: SoundName): void;
  pour(active: boolean): void;
  suspend(): void;
}

export type SoundName =
  | 'click'
  | 'locked'
  | 'whistle'
  | 'chuff'
  | 'spill'
  | 'boing'
  | 'pop'
  | 'jingle'
  | 'fail'
  | 'star'
  | 'tap'
  | 'secret';

export interface ProgressService {
  readonly available: boolean;
  stars(level: number): number;
  best(level: number): number;
  secret(level: number): boolean;
  unlocked(level: number): boolean;
  totalStars(): number;
  furthestUnlocked(): number;
  furthestWorld(): number;
  /** Records a delivered run; returns whether it set a new best score. */
  record(level: number, result: RunOutcome): { newBest: boolean };
  muted: boolean;
}

export interface AppContext {
  readonly gfx: GameRenderer;
  /** The 3D interface layer (spec F-008). */
  readonly ui: UiLayer;
  readonly params: AppParams;
  readonly sound: SoundService;
  readonly progress: ProgressService;
  openMap(focusLevel?: number): void;
  openLevel(level: number): void;
}
