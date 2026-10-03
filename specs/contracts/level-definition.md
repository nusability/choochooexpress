# Contract: LevelDefinition (engine → presentation), gameplay v2

Produced by `generateLevel(level)` / `generateFromRecipe(recipe)` in `src/engine/levelGenerator.ts`
for any level number (F-010). Pure data (JSON-serializable, no class instances). Consumed
read-only by the simulation, graphics, physics and UI. All coordinates are in tile units with
the origin at the grid's top-left corner: tile `(c, r)` covers `x ∈ [c, c+1]`, `y ∈ [r, r+1]`;
`y` grows "down" (south). Graphics maps `(x, y, z)` → world `(X = x − cols/2, Y = z ·
DECK_HEIGHT, Z = y − rows/2)`. The source of truth is `src/engine/types.ts`.

```ts
type Dir = 0 | 1 | 2 | 3;                 // N, E, S, W (N = −y)
type ToyType = 'block' | 'duck' | 'car' | 'ball' | 'star';
type BiomeId = 'rug' | 'candy' | 'garden' | 'space';
type TileIndex = number;                  // r * cols + c

interface Lane {
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

type DistractorKind = 'decoy' | 'bypass' | 'hold' | 'loop' | 'secret';

interface SwitchDef {
  id: number;
  tile: TileIndex;
  /** Both lanes start at the same entry edge. `lanes[0]` is the through (original route) lane. */
  lanes: [number, number];
  /** Index into `lanes`. */
  initial: 0 | 1;
  kind: DistractorKind;
}

interface FactoryDef {
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

interface StationDef {
  /** Platform tiles in travel order; the last lane ends at the buffer stop. */
  tiles: TileIndex[];
  lanes: number[];
  /** The last platform lane: the train stops at its end (FR-072). */
  lane: number;
  buildingTiles: TileIndex[];
  /** Travel direction along the platform. */
  dir: Dir;
}

interface SwitchStep {
  switch: number;
  lane: number;
}

interface RouteInfo {
  /** Complete lane sequence from the depot start to the station buffer. */
  lanes: number[];
  /** Required lane at each switch encounter, in order. */
  switchPlan: SwitchStep[];
  length: number;
  /** Seconds from Go to the stop at the buffer. */
  seconds: number;
}

interface PropDef {
  kind: string;
  tile: TileIndex;
  rotation: number;
  scale: number;
  variant: number;
}

/** What chute `wagon` wants (FR-073). */
interface OrderLine {
  wagon: number;
  type: ToyType;
  quantity: number;
}

interface LevelRecipe {
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

interface BridgeDef {
  /** Deck tile (the crossing). */
  tile: TileIndex;
  deckLane: number;
  lowerLane: number;
  /** Ramp lanes before and after the deck. */
  rampUp: number;
  rampDown: number;
}

interface TunnelDef {
  tiles: TileIndex[];
  lanes: number[];
}

interface LevelDefinition {
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
```

## Invariants (enforced by `validateLevel()`, generation-time simulation and unit tests)

1. A tile holds at most two lanes: a switch (same entry), a merge (same exit) or a crossing /
   bridge deck (two perpendicular straights). No switch lies on a bridge or in a tunnel.
2. Bridges: ramp-up, deck and ramp-down lanes are straight and in line; heights 0→1, 1, 1→0; the
   lower lane stays at 0. Tunnels cover 2–4 single-lane tiles.
3. Factories sit on straight lanes of their own tile; `0 ≤ phase < period`.
4. Every lane's exit leads into a neighbour lane except the station stop lane; the station is
   reachable from every lane (FR-008); every cycle is longer than `train.length + 0.5` (FR-009).
5. `routes.secret ?? routes.standard` replayed with its `switchPlan` scores 100% with no spills;
   doing nothing scores below 60%; every distractor taken alone scores below 100% (FR-081,
   FR-082). With a secret detour, `routes.standard` scores 85–99% (FR-092).
6. One order line per wagon; `train.capacity = max quantity + 3` (FR-073, FR-078).
7. The same level number always yields a deep-equal `LevelDefinition`.
