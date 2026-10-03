// Shared app-level types: screens, parameters and the services screens may use.
import type { RunResult, ToyType, CarPose, LevelDefinition } from '../engine/types';
import type { GameRenderer } from '../graphics/renderer';
import type { UiLayer } from '../ui/kit/uiLayer';
import type * as THREE from 'three';

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
  /** Fixed render quality 0 (best) – 4, or null to adapt to the frame rate. */
  quality: number | null;
}

/** Presentation-only toy physics for one level (implemented in src/physics/toyPhysics.ts). */
export interface ToyPhysicsService {
  readonly group: THREE.Group;
  spawn(kind: 'load' | 'spill', wagon: number, funnel: number, type: ToyType): void;
  syncTrain(poses: readonly CarPose[]): void;
  step(): void;
  /** Update toy instances; frozen wagon toys follow the given (interpolated) car poses. */
  render(poses: readonly CarPose[] | null): void;
  explode(poses: readonly CarPose[]): void;
  /** World transform of car i after a toy explosion (false while the engine drives the train). */
  carTransform(index: number, pos: THREE.Vector3, quat: THREE.Quaternion): boolean;
  stats(): { active: number; alive: number };
  dispose(): void;
}

export interface PhysicsFactory {
  ready(): boolean;
  /** Resolves when the physics engine is loaded. */
  load(): Promise<void>;
  create(level: LevelDefinition): ToyPhysicsService;
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
  /** Records a delivered run; returns whether it set a new best score. */
  record(level: number, result: RunResult): { newBest: boolean };
  muted: boolean;
}

export interface AppContext {
  readonly gfx: GameRenderer;
  /** The 3D interface layer (spec F-008). */
  readonly ui: UiLayer;
  readonly params: AppParams;
  readonly physics: PhysicsFactory;
  readonly sound: SoundService;
  readonly progress: ProgressService;
  openMap(focusLevel?: number): void;
  openLevel(level: number): void;
}
