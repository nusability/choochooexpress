// Shared engine types (gameplay v2). See specs/contracts/level-definition.md and
// specs/contracts/engine-api.md.

/** Edge / travel direction: N = −y, E = +x, S = +y, W = −x. */
export type Dir = 0 | 1 | 2 | 3;

export type ToyType = 'block' | 'duck' | 'car' | 'ball' | 'star';
export const TOY_TYPES: readonly ToyType[] = ['block', 'duck', 'car', 'ball', 'star'];

export type BiomeId = 'rug' | 'candy' | 'garden' | 'space';

/** `r * cols + c`. */
export type TileIndex = number;

export interface Lane {
  id: number;
  tile: TileIndex;
  from: Dir;
  to: Dir;
  kind: 'straight' | 'curve';
  length: number;
  /** Height at the entry and the exit edge: 0 = ground, 1 = bridge deck (FR-087). */
  z0: number;
  z1: number;
  /** Speed factor on this lane: < 1 uphill and on the station platform, > 1 downhill (FR-077). */
  speed: number;
  /** Hidden under a tunnel hill (FR-088). */
  tunnel: boolean;
}

export type DistractorKind = 'decoy' | 'bypass' | 'hold' | 'loop' | 'secret';

export interface SwitchDef {
  id: number;
  tile: TileIndex;
  /** Both lanes start at the same entry edge. `lanes[0]` is the through (original route) lane. */
  lanes: [number, number];
  /** Index into `lanes`. */
  initial: 0 | 1;
  kind: DistractorKind;
}

export interface FactoryDef {
  id: number;
  /** required: on the intended route; decoy: on a distractor branch; bonus: on the secret detour. */
  kind: 'required' | 'decoy' | 'bonus';
  /** Straight lane under the hopper. */
  lane: number;
  type: ToyType;
  /** Toys per drop (FR-069). */
  batch: number;
  /** Ticks between drops. */
  period: number;
  /** A drop happens on every tick t ≥ 1 with t mod period = phase. */
  phase: number;
  /** Hopper position along the lane (distance from the lane start). */
  hopper: number;
  buildingTile: TileIndex;
  /** Wagon (1-based) the intended route puts under the hopper at its drop, 0 for decoys. */
  target: number;
}

export interface StationDef {
  /** Platform tiles in travel order; the last lane ends at the buffer stop. */
  tiles: TileIndex[];
  lanes: number[];
  /** The last platform lane: the train stops at its end (FR-072). */
  lane: number;
  buildingTiles: TileIndex[];
  /** Travel direction along the platform. */
  dir: Dir;
}

export interface SwitchStep {
  switch: number;
  lane: number;
}

export interface RouteInfo {
  /** Complete lane sequence from the depot start to the station buffer. */
  lanes: number[];
  /** Required lane at each switch encounter, in order. */
  switchPlan: SwitchStep[];
  length: number;
  /** Seconds from Go to the stop at the buffer. */
  seconds: number;
}

export interface PropDef {
  kind: string;
  tile: TileIndex;
  rotation: number;
  scale: number;
  variant: number;
}

/** What chute `wagon` wants (FR-073). */
export interface OrderLine {
  wagon: number;
  type: ToyType;
  quantity: number;
}

export interface LevelRecipe {
  level: number;
  /** Difficulty step: min(level, DIFFICULTY_CEILING). */
  difficulty: number;
  world: number;
  biome: BiomeId;
  seed: number;
  cols: number;
  rows: number;
  wagons: number;
  /** Required factories (≥ wagons). */
  factories: number;
  decoys: number;
  bypasses: number;
  /** An empty holding loop; `holdLap` says whether the intended route laps it once. */
  hold: boolean;
  holdLap: boolean;
  /** A loop back over a required factory (passes something; intended route does not lap it). */
  factoryLoop: boolean;
  crossings: boolean;
  bridges: boolean;
  tunnels: boolean;
  secret: boolean;
  speed: number;
  /** Factory periods in seconds: shortest allowed extra over the train's passing time. */
  periodSlack: [number, number];
  batch: [number, number];
}

export interface BridgeDef {
  /** Deck tile (the crossing). */
  tile: TileIndex;
  deckLane: number;
  lowerLane: number;
  /** Ramp lanes before and after the deck. */
  rampUp: number;
  rampDown: number;
}

export interface TunnelDef {
  tiles: TileIndex[];
  lanes: number[];
}

export interface LevelDefinition {
  level: number;
  world: number;
  label: string;
  biome: BiomeId;
  seed: number;
  attempt: number;
  /** How far the recipe had to be simplified to generate (0 = full recipe). */
  relaxed: number;
  difficulty: number;
  cols: number;
  rows: number;
  lanes: Lane[];
  switches: SwitchDef[];
  factories: FactoryDef[];
  depot: { tiles: TileIndex[]; lanes: number[]; buildingTiles: TileIndex[]; dir: Dir };
  station: StationDef;
  train: { wagons: number; speed: number; capacity: number; length: number };
  order: { lines: OrderLine[] };
  routes: { standard: RouteInfo; secret: RouteInfo | null };
  crossings: TileIndex[];
  bridges: BridgeDef[];
  tunnels: TunnelDef[];
  props: PropDef[];
}

export type Phase = 'planning' | 'running' | 'paused' | 'delivered' | 'derailed';

export type FlipOutcome = 'flipped' | 'queued' | 'locked' | 'refused';

export interface CarPose {
  /** 0 = engine, 1..W = wagons. */
  index: number;
  x: number;
  y: number;
  /** Height in deck units (0 ground … 1 deck). */
  z: number;
  /** Radians; 0 = +x (east), π/2 = +y (south). */
  heading: number;
  /** Radians; positive = nose up. */
  pitch: number;
  /** Hidden inside a tunnel. */
  hidden: boolean;
  frontX: number;
  frontY: number;
  backX: number;
  backY: number;
}

export type SimEvent =
  | { t: 'depart'; tick: number }
  | { t: 'switch'; tick: number; switch: number; state: 0 | 1 }
  | { t: 'switchLocked'; tick: number; switch: number }
  /** A factory's batch dropped: `car` 0 = engine, k = wagon k (FR-070). */
  | { t: 'drop'; tick: number; factory: number; car: number; type: ToyType; caught: number; spilled: number }
  /** A drop with nothing under the hopper. */
  | { t: 'skip'; tick: number; factory: number }
  | { t: 'pileDanger'; tick: number; factory: number }
  | { t: 'derail'; tick: number; factory: number }
  | { t: 'delivered'; tick: number; result: RunResult };

export interface ChuteResult {
  wagon: number;
  type: ToyType;
  wanted: number;
  /** Wanted toys the wagon delivered (≤ wanted). */
  got: number;
  /** Toys in the wagon beyond `got` (extras and other types). */
  extra: number;
}

export interface RunResult {
  chutes: ChuteResult[];
  ratio: number;
  score: number;
  stars: 0 | 1 | 2 | 3;
  passed: boolean;
  nSpilled: number;
  secretRoute: boolean;
  distance: number;
  ticks: number;
}
