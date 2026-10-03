# Data Model: Choo Choo Express Delivery 3D

**Date**: 2026-10-03 (gameplay v2) | **Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

All lengths are in **tiles** (1 tile = 1 world unit), times in seconds unless given in ticks,
counts in toys. Exact TypeScript shapes are in
[contracts/level-definition.md](./contracts/level-definition.md) and
[contracts/engine-api.md](./contracts/engine-api.md).

> **v3 (2026-10-03, F-014)**: levels are shunting yards — see
> [contracts/yard-level.md](./contracts/yard-level.md) and research R31–R35. The v2 entities below
> (timed batches, chutes) describe the superseded rules and are kept for history.
>
> v1 (fixed 28-level campaign, continuous funnels, sequence scoring, A2 secret routes) was
> replaced on 2026-10-03 by F-009 – F-013; see research R24 – R30 for the decisions.

## Constants

| Name | Value | Source / note |
|------|-------|---------------|
| `DT` | 1/60 s | Fixed simulation tick (R4) |
| Curve radius / length | 0.5 / π⁄4 ≈ 0.7854 | Quarter circle in a tile |
| `ENGINE_LEN`, `WAGON_LEN`, `COUPLING_GAP` | 0.62, 0.50, 0.08 | Train geometry |
| `WHEEL_HEIGHT` | 0.10 | → `H_threshold = 0.05` (A1) |
| `W_track`, `L_pile`, `ρ_toy` | 0.40, 0.80, 2500 toys/tile³ | Pile footprint (FR-016) |
| `DERAIL_PILE` | 40 toys | `H_threshold · W_track · L_pile · ρ_toy` |
| Speed factors | uphill 0.6, downhill 1.5, platform 0.6 | FR-077 |
| `DECK_HEIGHT` | 0.42 | Bridge deck height (presentation) |
| Stars | 100% / 85% / 60% | FR-075 |
| `DIFFICULTY_CEILING` | 40 | FR-080 ("6-5") |
| Generator | 12 attempts per relaxation step, 7 steps | FR-081 |

## Formulas

- Train length: `L_train(W) = ENGINE_LEN + W · (COUPLING_GAP + WAGON_LEN)` → 1.20 / 1.78 / 2.36 /
  2.94 for 1–4 wagons. Wagon k's centre is `ENGINE_LEN + COUPLING_GAP + (k − 1)(WAGON_LEN +
  COUPLING_GAP) + WAGON_LEN / 2` behind the engine front.
- **Movement**: per tick the engine front advances `v · f(lane) · DT`, where `f` is the speed
  factor of the lane under the engine front; leftover time carries into the next lane.
- **Drop (FR-070)**: on tick `t ≥ 1` with `t mod period = phase`, the hopper point (lane start +
  `hopper`) is located behind the engine front; `carAt(behind)` gives the engine (0), a wagon k,
  or none (each car owns half of its coupling gaps). Wagon: `caught = min(batch, C − total)`,
  `spilled = batch − caught`; engine: everything spills; none: the batch is skipped.
- **Pile**: `H_f = S_f / (W_track · L_pile · ρ_toy)`; derail when the engine front reaches
  `hopper − L_pile / 2` on factory f's lane with `S_f ≥ DERAIL_PILE`.
- **Score v2 (FR-074)**: `correct_k = min(Q_k, wagon k's X_k toys)`, `ratio = Σ correct_k / Σ Q_k`,
  `score = round(1000 · ratio)`; stars from the ratio.
- **Timing (R26)**: for each required (or bonus) factory with target wagon k on the intended
  route, `phase = n* mod period`, where `n*` is the tick whose engine distance is closest to
  `hopper distance + wagonCenter(k)`; `period = passing ticks + 30 + slack`.
- **Capacity**: `C = max_k Q_k + 3` (FR-078).

## Entities

### World / Biome
- World `w = ⌊(n − 1)/7⌋ + 1`; biome `= [rug, candy, garden, space][(w − 1) mod 4]`; label `w-i`.

### LevelRecipe (from the level number, `engine/campaign.ts`)
- `level`, `difficulty = min(level, 40)`, `world`, `biome`, `seed`, `cols` 7–10, `rows` 12–18,
  `wagons` 1–4, `factories` (required, ≥ wagons, ≤ 6), `decoys` 0–3, `bypasses` 1–2, `hold` +
  `holdLap`, `factoryLoop`, `crossings` (d ≥ 4), `bridges` (d ≥ 9), `tunnels` (d ≥ 12), `secret`
  (d ≥ 15, ~40%), `speed` 1.0–1.3, `periodSlack` (s), `batch` range.

### LevelDefinition (generator output)
- Grid; **lanes** (id, tile, entry/exit edge, kind, length, `z0`/`z1` heights, `speed` factor,
  `tunnel`); **switches** (tile, `[through, branch]` lanes, initial, kind `decoy` | `bypass` |
  `hold` | `loop` | `secret`); **factories** (kind `required` | `decoy` | `bonus`, lane, type,
  batch, period, phase, hopper, building tile, target wagon); **depot** (tiles, lanes, dir);
  **station** (platform tiles and lanes, stop lane, building tiles, dir); **train** (wagons,
  speed, capacity, length); **order** (one line per wagon); **routes** (`standard`, optional
  `secret`: lanes, switch plan, length, seconds); **crossings**, **bridges** (deck tile, deck /
  lower / ramp lanes), **tunnels** (tiles, lanes); **props**; `attempt`, `relaxed`.
- Invariants (`validateLevel`, unit tests): ≤ 2 lanes per tile; two-lane tiles are switches (same
  entry), merges (same exit) or crossings (perpendicular straights); no switch on a bridge or in
  a tunnel; ramps in line with the deck; tunnels 2–4 single-lane tiles; factories on straight,
  unshared tiles; no dead ends; every cycle longer than the train + 0.5; routes continuous and
  ending at the station stop; one order line per wagon; capacity ≥ every line.

### Toy Type
- `block`, `duck`, `car`, `ball`, `star` — each a 3D model that doubles as its symbol.

### Order
- `lines`: `{ wagon, type, quantity }` for wagons 1…W; `quantity` = sum of the batches aimed at
  that wagon (+ the bonus batch on secret levels).

### Run (runtime state machine)

```text
planning ──Go──▶ running ──(engine at the buffer)──▶ delivered
   ▲               │  ▲                                  │
   │            pause resume                              ▼
   │               ▼  │                             RunResult
   │             paused
   │               │
   └──restart──────┴──(engine reaches pile ≥ 40)──▶ derailed
```

### RunResult
- `chutes` (wagon, type, wanted, got, extra), `ratio`, `score`, `stars`, `passed`, `nSpilled`,
  `secretRoute`, `distance`, `ticks`.

### Player Progress (save v2)
- Per level number (no upper limit): `stars`, `best`, `secret`. Settings: `muted`. Unlocked:
  level 1 and every level after one with ≥ 1 star. See
  [contracts/save-format.md](./contracts/save-format.md).

## Difficulty ramp (FR-080)

| d (= min(level, 40)) | Wagons | Required factories | Decoys | Features |
|---|---|---|---|---|
| 1 | 1 | 1 | 0 | one bypass switch |
| 2–3 | 1 | 1 | 1 | |
| 4–7 | 2 | 2 | 1 | crossings |
| 8–10 | 2 | 2 | 2 | holding loops (~⅓ of levels), bridges from 9 |
| 11–13 | 3 | 3 | 2 | tunnels from 12 |
| 14–19 | 3 | 4 | 2 | secret detours from 15, factory loops from 16 |
| 20–22 | 3 | 4 | 3 | up to 2 bridges |
| 23–29 | 4 | 5 | 3 | 2 bypasses from 26 |
| 30–40 | 4 | 6 | 3 | ceiling at 40 |

Board size, speed, factory period slack and batch sizes ramp linearly with `d`.
