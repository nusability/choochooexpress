# Contract: LevelDefinition (engine → presentation)

Produced by `generateLevel(level)` / `generateFromRecipe(recipe)` in `src/engine/levelGenerator.ts`.
Pure data (JSON-serializable, no class instances). Consumed read-only by the simulation,
graphics, physics and UI. All coordinates are in tile units with the origin at the grid's
top-left corner: tile `(c, r)` covers `x ∈ [c, c+1]`, `y ∈ [r, r+1]`; `y` grows "down"
(south). Graphics maps `(x, y)` → world `(X = x − cols/2, Y = 0, Z = y − rows/2)`.

```ts
type Dir = 0 | 1 | 2 | 3;                 // N, E, S, W (N = −y)
type ToyType = 'block' | 'duck' | 'car' | 'ball' | 'star';
type BiomeId = 'rug' | 'candy' | 'garden' | 'space';
type TileIndex = number;                  // r * cols + c

interface Lane {
  id: number;
  tile: TileIndex;
  from: Dir;                              // entry edge
  to: Dir;                                // exit edge (≠ from)
  kind: 'straight' | 'curve';
  length: number;                         // 1 or π/4
}

interface Piece {
  tile: TileIndex;
  role: 'plain' | 'switch' | 'merge' | 'depot' | 'store';
  lanes: number[];                        // 1 lane, or 2 for switch/merge
}

interface SwitchDef {
  id: number;
  tile: TileIndex;
  lanes: [number, number];                // both start at the same entry edge
  initial: 0 | 1;                         // index into `lanes`
  kind: 'distractor' | 'loop' | 'split';
}

interface FunnelDef {
  id: number;
  factory: number;
  lane: number;                           // always a straight lane
  type: ToyType;
  dose: number;                           // toys per wagon per pass (integer, ≥ 1)
  rate: number;                           // Q_pump = dose · speed / L_funnel (toys/s)
  spanStart: number;                      // 0.10 (local distance along the lane)
  spanEnd: number;                        // 0.90
}

interface FactoryDef {
  id: number;
  kind: 'required' | 'decoy' | 'dual';
  route: 'P1' | 'P2' | 'branch';
  funnels: number[];                      // 1, or 2 for a dual factory (in travel order)
  buildingTiles: TileIndex[];             // where the building(s) stand
}

interface RouteInfo {
  lanes: number[];                        // complete lane sequence, depot start → store
  switchPlan: { switch: number; lane: number }[]; // required lane at each switch encounter, in order
  length: number;                         // Σ lane lengths up to the stop point
  cost: number;                           // length + SWITCH_DELAY · switchPlan.length
  loopWindow: number | null;              // seconds, for the route's must-loop (null if none)
}

interface PropDef { kind: string; tile: TileIndex; rotation: number; scale: number; variant: number }

interface LevelDefinition {
  level: number;
  biome: BiomeId;
  seed: number;
  attempt: number;                        // generation attempt that succeeded
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
  order: { lines: { type: ToyType; quantity: number }[] };
  routes: { standard: RouteInfo; secret: RouteInfo | null };
  distractors: { kind: 'loopBay' | 'decoy' | 'bypass'; switch: number }[];
  props: PropDef[];
}
```

## Invariants (enforced by `validateLevel()` and unit tests)

1. `switches.length`, `factories.length`, `distractors.length` and `order.lines.length` equal the
   recipe's derived counts (FR-033).
2. Every `switch` piece has exactly two lanes with the same `from`; every `merge` piece has
   exactly two lanes with the same `to`; all other pieces have one lane.
3. Every lane's exit leads into a neighbour tile that has a lane entering from the opposite edge,
   except the store lane (end of track). No dead ends (FR-008).
4. Every cycle in the lane graph is longer than `train.length + 0.5` (FR-009).
5. `routes.standard` (and `routes.secret`) replayed with its `switchPlan` delivers exactly the
   order, with zero spills (FR-032, FR-053).
6. In dual levels: `secret.cost ≤ 0.85 · standard.cost`;
   `secret.loopWindow / standard.loopWindow ∈ [0.425, 0.575]`; the secret route passes fewer
   distinct switches than the standard route (FR-054–FR-056).
7. Initial switch states do not already satisfy the standard route's first encounters (FR-034).
8. The same recipe always yields a deep-equal `LevelDefinition` (FR-030).
