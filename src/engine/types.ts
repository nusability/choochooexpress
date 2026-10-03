// Shared engine types. See specs/contracts/level-definition.md and specs/contracts/engine-api.md.

/** Edge / travel direction: N = −y, E = +x, S = +y, W = −x. */
export type Dir = 0 | 1 | 2 | 3;

export type ToyType = 'block' | 'duck' | 'car' | 'ball' | 'star';
export const TOY_TYPES: readonly ToyType[] = ['block', 'duck', 'car', 'ball', 'star'];

export type BiomeId = 'rug' | 'candy' | 'garden' | 'space';

/** `r * cols + c`. */
export type TileIndex = number;

export type DistractorKind = 'loopBay' | 'decoy' | 'bypass';

export interface Lane {
  id: number;
  tile: TileIndex;
  from: Dir;
  to: Dir;
  kind: 'straight' | 'curve';
  length: number;
}

export type PieceRole = 'plain' | 'switch' | 'merge' | 'depot' | 'store';

export interface Piece {
  tile: TileIndex;
  role: PieceRole;
  lanes: number[];
}

export interface SwitchDef {
  id: number;
  tile: TileIndex;
  /** Both lanes start at the same entry edge. */
  lanes: [number, number];
  /** Index into `lanes`. */
  initial: 0 | 1;
  kind: 'distractor' | 'loop' | 'split';
}

export interface FunnelDef {
  id: number;
  factory: number;
  lane: number;
  type: ToyType;
  /** Toys per wagon per pass (A1 fill condition: rate · L_funnel / speed). */
  dose: number;
  /** Q_pump in toys per second. */
  rate: number;
  spanStart: number;
  spanEnd: number;
}

export interface FactoryDef {
  id: number;
  kind: 'required' | 'decoy' | 'dual';
  route: 'P1' | 'P2' | 'branch';
  /** One funnel, or two (in travel order) for a dual factory. */
  funnels: number[];
  buildingTiles: TileIndex[];
}

export interface SwitchStep {
  switch: number;
  lane: number;
}

export interface RouteInfo {
  /** Complete lane sequence from the depot start to the store. */
  lanes: number[];
  /** Required lane at each switch encounter, in order. */
  switchPlan: SwitchStep[];
  length: number;
  cost: number;
  /** Switch window (seconds) of the route's must-loop, or null. */
  loopWindow: number | null;
}

export interface PropDef {
  kind: string;
  tile: TileIndex;
  rotation: number;
  scale: number;
  variant: number;
}

export interface OrderLine {
  type: ToyType;
  quantity: number;
}

export interface LevelRecipe {
  level: number;
  biome: BiomeId;
  seed: number;
  cols: number;
  rows: number;
  orderLength: number;
  wagons: number;
  speed: number;
  mustLoop: boolean;
  dual: boolean;
  distractors: DistractorKind[];
}

export interface LevelDefinition {
  level: number;
  biome: BiomeId;
  seed: number;
  attempt: number;
  cols: number;
  rows: number;
  lanes: Lane[];
  pieces: Piece[];
  switches: SwitchDef[];
  factories: FactoryDef[];
  funnels: FunnelDef[];
  depot: { tiles: TileIndex[]; lanes: number[]; buildingTiles: TileIndex[] };
  store: { tile: TileIndex; lane: number; buildingTile: TileIndex };
  train: { wagons: number; speed: number; capacity: number; length: number };
  order: { lines: OrderLine[] };
  routes: { standard: RouteInfo; secret: RouteInfo | null };
  distractors: { kind: DistractorKind; switch: number }[];
  props: PropDef[];
}

export type Phase = 'planning' | 'running' | 'paused' | 'delivered' | 'derailed';

export type FlipOutcome = 'flipped' | 'queued' | 'locked' | 'refused';

export interface CarPose {
  /** 0 = engine, 1..W = wagons. */
  index: number;
  x: number;
  y: number;
  /** Radians; 0 = +x (east), π/2 = +y (south). */
  heading: number;
  frontX: number;
  frontY: number;
  backX: number;
  backY: number;
}

export type SimEvent =
  | { t: 'depart'; tick: number }
  | { t: 'switch'; tick: number; switch: number; state: 0 | 1 }
  | { t: 'switchLocked'; tick: number; switch: number }
  | { t: 'passStart'; tick: number; funnel: number; pass: number }
  | { t: 'load'; tick: number; wagon: number; funnel: number; type: ToyType }
  | { t: 'spill'; tick: number; wagon: number; funnel: number; type: ToyType }
  | { t: 'pileDanger'; tick: number; funnel: number }
  | { t: 'derail'; tick: number; funnel: number }
  | { t: 'delivered'; tick: number; result: RunResult };

export interface RunResult {
  orderLines: OrderLine[];
  loadedLines: OrderLine[];
  nCorrect: number;
  nTotal: number;
  nSpilled: number;
  secretRoute: boolean;
  bonus: 0 | 300;
  score: number;
  stars: 0 | 1 | 2 | 3;
  passed: boolean;
  distance: number;
  ticks: number;
}
