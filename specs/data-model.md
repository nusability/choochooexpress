# Data Model: Choo Choo Express Delivery 3D

**Date**: 2026-10-03 | **Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

All lengths are in **tiles** (1 tile = 1 world unit), times in seconds, counts in toys.
Exact TypeScript shapes are in [contracts/level-definition.md](./contracts/level-definition.md)
and [contracts/engine-api.md](./contracts/engine-api.md).

## Constants

| Name | Value | Source / note |
|------|-------|---------------|
| `DT` | 1/60 s | Fixed simulation tick (R4) |
| Curve radius / length | 0.5 / π⁄4 ≈ 0.7854 | Quarter circle in a tile |
| `ENGINE_LEN`, `WAGON_LEN`, `COUPLING_GAP` | 0.62, 0.50, 0.08 | Train geometry |
| `WHEEL_HEIGHT` | 0.10 | → `H_threshold = 0.05` (A1) |
| `W_track` | 0.40 | Track width (A1) |
| `L_funnel` | 0.80 | Funnel span `[0.10, 0.90]` along a straight lane (A1) |
| `ρ_toy` | 2500 toys/tile³ | Packing density (A1) |
| `DERAIL_PILE` | 40 toys | `H_threshold · W_track · L_funnel · ρ_toy` = 0.05·0.4·0.8·2500 |
| `WAGON_CAPACITY` (`C_wagon`) | 80 toys | Same for every level |
| `SWITCH_DELAY` | 0.5 tiles | Cost term per facing switch traversal (A2) |
| `MAX_GEN_ATTEMPTS` | 400 | Deterministic retries per level |
| Must-loop window | 3.0 – 6.0 s | FR-035 |
| Loop-bay window | ≥ 1.2 s | Holding loops must be escapable |
| P2 loop window | 1.3 – 2.5 s | FR-056 |
| Window ratio `Δt₂/Δt₁` | 0.425 – 0.575 | 0.5 ± 15% (FR-056) |
| Cost ratio `Cost(P2)/Cost(P1)` | ≤ 0.85 | FR-055 |
| Score | 1000, −5/spill, +300 bonus | A3 (FR-024) |
| Stars | 750 / 900 & ≤10 spills / 1200 or perfect | A3 + clarification (FR-025) |

## Formulas

- Train length: `L_train(W) = ENGINE_LEN + W · (COUPLING_GAP + WAGON_LEN)` → 1.20 / 1.78 / 2.36 /
  2.94 for 1–4 wagons.
- Car offsets behind the engine front: engine 0; wagon k (1-based) front at
  `ENGINE_LEN + COUPLING_GAP + (k − 1)(WAGON_LEN + COUPLING_GAP)`.
- **Fill condition (A1)**: dose per wagon per pass `D_f = Q_f · L_funnel / v`. The generator picks
  integer `D_f`; `Q_f = D_f · v / L_funnel` (shown as "toys/s"). Toy *i* of a pass is emitted when
  the wagon center crosses `spanStart + (i − 0.5) · L_funnel / D_f`.
- **Load or spill**: each emitted toy goes into the wagon if `wagon.total < C_wagon`, else it is
  spilled at that funnel.
- **Pile (A1)**: `H_f = S_f / (W_track · L_funnel · ρ_toy)`; derail when the engine front reaches
  `spanStart` of funnel *f* with `S_f ≥ DERAIL_PILE` (⇔ `H_f ≥ 0.5 · WHEEL_HEIGHT`).
- **Loop circuit**: `C = len(W diverging lane) + Σ loop-tile lanes + len(M merging lane) + chord`.
- **Switch window**: `Δt = (C − len(W diverging lane) − L_train) / v`.
- **Route cost (A2)**: `Cost(P) = Σ lane lengths (depot start → store stop) + SWITCH_DELAY ·
  (facing switch traversals)`.
- **Score (A3)**: `round(1000 · N_correct / N_total − 5 · N_spilled + B)`, floored at 0, with
  `N_correct` = weighted LCS of order lines vs loaded lines, `N_total = max(Σ ordered, Σ loaded)`.

## Entities

### Biome
- `id`: `rug` | `candy` | `garden` | `space`; `name`; `levels`: 7 consecutive numbers.
- Palette + prop set (graphics only).

### LevelRecipe (campaign table, below)
- `level` 1–28, `biome`, `seed` (32-bit), `cols`, `rows`, `orderLength` (1–3), `wagons`
  (1–3), `speed`, `mustLoop` (bool), `dual` (bool), `distractors` (list of `loopBay` |
  `decoy` | `bypass`).
- Derived: `switchCount = distractors + (mustLoop && !dual ? 1 : 0) + (dual ? 3 : 0)`;
  `factoryCount = orderLength + #decoy + (dual ? (orderLength === 3 ? 2 : 1) : 0)`.
- Validation: biome ↔ level range; derived counts within the spec's FR-036 ranges.

### LevelDefinition (generator output)
- Grid size; **lanes** (id, tile, entry/exit edge, kind, length); **pieces** per tile (role:
  plain, switch, merge, depot, store); **switches** (id, tile, the two lane ids, initial state,
  kind: `distractor` | `loop` | `split`); **factories** (id, kind: `required` | `decoy` |
  `dual`, funnel ids, building tiles, route `P1`/`P2`); **funnels** (id, lane, toy type, dose,
  pour rate, span); **depot** (tiles, lanes); **store** (tile, lane, building tile); **train**
  (wagons, speed, capacity); **order** (lines); **routes** (`standard`, optional `secret`: lane
  list, switch plan, length, cost, loop window); **props**.
- Invariants (checked by tests): every switch has two distinct lanes from one entry edge; every
  merge two lanes into one exit edge; following any lane chain always reaches the store
  (no dead ends); no tile holds lanes of two unrelated pieces; recipe counts match exactly.

### Toy Type
- `block` (red cube), `duck` (yellow duck), `car` (blue car), `ball` (green sphere), `star`
  (purple star). Each has an SVG icon for the HUD.

### Order
- `lines`: 1–3 entries `{ type, quantity }`, distinct types, `quantity = wagons × V_i` where
  `V_i` is the per-wagon dose of the matching required factory. `Σ V_i ∈ [60, 71]` (75–89% of
  capacity, so a valid route never triggers the ≥ 90% wagon warning), each `V_i ≥ 15`.

### Train / Wagon (runtime)
- Engine front distance `s` along the trail; per wagon: `total`, `byType`, list of pass visits
  (funnel id, loaded, spilled).

### Spill Pile (runtime)
- Per funnel: `spilled` count; `height` derived; `dangerous` = `spilled ≥ DERAIL_PILE`.

### Run (runtime state machine)

```text
planning ──Go──▶ running ──(engine at store)──▶ delivered
   ▲               │  ▲                              │
   │            pause resume                          ▼
   │               ▼  │                         RunResult
   │             paused
   │               │
   └──restart──────┴──(engine reaches pile ≥ 40)──▶ derailed
```

- Switch flips: allowed in `planning` (applied immediately) and `running` (queued to the next
  tick); refused in `paused`, `delivered`, `derailed`, or when the switch tile is occupied.
- Every run records `flips: [tick, switchId][]` (replay).

### RunResult
- `orderLines`, `loadedLines`, `nCorrect`, `nTotal`, `nSpilled`, `secretRoute` (bool), `bonus`,
  `score`, `stars` (0–3), `passed` (stars ≥ 1), `distance`, `ticks`.

### Player Progress (save)
- Per level: `stars` (0–3, best), `best` (best score), `secret` (bool, ever found).
- Settings: `muted`. Unlocked levels are derived: level 1, plus every level whose predecessor
  has `stars ≥ 1`. See [contracts/save-format.md](./contracts/save-format.md).

### App screens

```text
boot ──▶ map ──tap level──▶ level card ──Play──▶ level (planning … delivered/derailed)
          ▲                                          │
          └───────────── Map / Next / Retry ─────────┘
```

## Campaign table (FR-036, FR-045)

Speeds: rug 1.0, candy 1.1, garden 1.2, space 1.3 tiles/s. Grids: rug 7×9, candy 8×10,
garden 9×11, space 11×14 (cols × rows; space needs room for two complete routes). Switches and
factories derived as above.

| Lvl | Biome | Lines | Wagons | Must-loop | Dual | Distractors | Switches | Factories |
|-----|-------|-------|--------|-----------|------|-------------|----------|-----------|
| 1 | rug | 1 | 1 | – | – | loopBay | 1 | 1 |
| 2 | rug | 1 | 1 | – | – | decoy | 1 | 2 |
| 3 | rug | 2 | 1 | – | – | bypass | 1 | 2 |
| 4 | rug | 2 | 2 | – | – | decoy, loopBay | 2 | 3 |
| 5 | rug | 2 | 2 | – | – | bypass, decoy | 2 | 3 |
| 6 | rug | 2 | 2 | – | – | decoy, loopBay, bypass | 3 | 3 |
| 7 | rug | 2 | 2 | – | – | bypass, decoy, loopBay | 3 | 3 |
| 8 | candy | 2 | 2 | – | – | decoy, bypass | 2 | 3 |
| 9 | candy | 3 | 2 | – | – | bypass, loopBay | 2 | 3 |
| 10 | candy | 2 | 2 | ✓ | – | decoy | 2 | 3 |
| 11 | candy | 3 | 3 | ✓ | – | bypass | 2 | 3 |
| 12 | candy | 3 | 3 | ✓ | – | decoy, loopBay | 3 | 4 |
| 13 | candy | 3 | 3 | ✓ | – | decoy, bypass | 3 | 4 |
| 14 | candy | 3 | 3 | ✓ | – | decoy, bypass, loopBay | 4 | 4 |
| 15 | garden | 2 | 3 | ✓ | – | decoy, bypass | 3 | 3 |
| 16 | garden | 3 | 3 | ✓ | – | decoy, loopBay | 3 | 4 |
| 17 | garden | 3 | 3 | ✓ | – | decoy, bypass, loopBay | 4 | 4 |
| 18 | garden | 3 | 3 | ✓ | – | decoy, decoy, bypass | 4 | 5 |
| 19 | garden | 3 | 3 | ✓ | – | decoy, decoy, loopBay | 4 | 5 |
| 20 | garden | 3 | 3 | ✓ | – | decoy, decoy, bypass, loopBay | 5 | 5 |
| 21 | garden | 3 | 3 | ✓ | – | decoy, bypass, loopBay, decoy | 5 | 5 |
| 22 | space | 2 | 3 | (P1+P2) | ✓ | decoy | 4 | 4 |
| 23 | space | 2 | 3 | (P1+P2) | ✓ | bypass | 4 | 3 |
| 24 | space | 2 | 3 | (P1+P2) | ✓ | decoy, loopBay | 5 | 4 |
| 25 | space | 3 | 3 | (P1+P2) | ✓ | decoy | 4 | 6 |
| 26 | space | 3 | 3 | (P1+P2) | ✓ | decoy, bypass | 5 | 6 |
| 27 | space | 3 | 3 | (P1+P2) | ✓ | decoy, loopBay | 5 | 6 |
| 28 | space | 3 | 3 | (P1+P2) | ✓ | decoy, decoy, bypass | 6 | 7 |

Seeds are fixed 32-bit constants per level, defined in `src/engine/campaign.ts` (a per-level salt
picks seeds that generate within a few attempts, keeping level loads fast).
