# Quickstart & Validation: Choo Choo Express Delivery 3D

**Plan**: [plan.md](./plan.md) | Contracts: [level-definition](./contracts/level-definition.md),
[engine-api](./contracts/engine-api.md), [save-format](./contracts/save-format.md)

## Prerequisites

- Node 22 (≥ 22.12) and npm 10.
- For e2e tests: Playwright's Chromium (`npx playwright install chromium`; preinstalled in the
  Claude Code cloud environment).

## Commands

| Command | What it does |
|---------|--------------|
| `npm ci` | Install exact dependencies |
| `npm run dev` | Vite dev server on http://localhost:5173 (use `--host` to open it on a phone on the same Wi-Fi) |
| `npm run typecheck` | `tsc --noEmit` (strict) |
| `npm run lint` | ESLint, including the "engine imports nothing" rule |
| `npm test` | Vitest unit tests (`tests/unit`) |
| `npm run build` | Production build into `dist/` (relative asset paths) |
| `npm run preview` | Serve `dist/` on http://localhost:4173 |
| `npm run test:e2e` | Playwright smoke tests against `npm run preview` |
| `npm run check` | typecheck + lint + unit tests + build (what CI runs before e2e) |

## Deployment

1. Repository **Settings → Pages → Build and deployment → Source: GitHub Actions** (one-time).
2. Push or merge to `main`. The `Deploy` workflow runs checks, builds, and publishes `dist/` to
   `https://<owner>.github.io/<repo>/` (SC-010: live within ~10 minutes).
3. Pull requests run the same checks without deploying.

## Validation scenarios

Automated checks are listed first; manual checks are done on the reference iPhone 16 in Safari
(portrait unless stated).

### US1 — Route the train with switches (F-001)
- Auto: `tests/unit/simulation.switches.test.ts` — switch decision at entry, locked switch refusal,
  loop exit after flip, delivery stops the train, determinism of replays.
- Auto: `tests/e2e/smoke.spec.ts` — level 1: flip the switch via its screen position, tap Go,
  results appear.
- Manual: tap a switch during planning and while running; try tapping a switch under the train
  (wiggle + clunk, no change).

### US2 / US9 — Catch the batches in the right wagons (F-002, F-009)
- Auto: `tests/unit/batches.test.ts` — the wagon under the hopper catches the batch up to its
  capacity, the engine spills it, nothing under skips it; one batch per pass; 39-toy pile passes,
  40-toy pile derails; slopes and the platform change the speed; the train stops at the buffer
  with each wagon at its chute.
- Manual: watch a factory's clock run out as a wagon passes under it; arrive one wagon late and
  see the batch land in the wrong wagon; drop a batch on the engine to grow a pile.

### US3 — Deliver the order and earn stars (F-003, F-009)
- Auto: `tests/unit/scoring.test.ts` — per-chute counting, extras free, 100% / 85% / 60% stars.
- Manual: results card shows one row per wagon (toy, got / wanted), percentage, score, best.

### US4 / US10 — Fair, endless puzzles (F-004, F-010)
- Auto: `tests/unit/levelGenerator.test.ts` (levels 1–100) — deterministic, valid, intended route
  100%, doing nothing fails, under a second each, tight capacity, timing matters, crossings /
  bridges / tunnels frequency; `tests/unit/campaign.test.ts` — w-i labels, biome cycle, monotone
  ramp, ceiling at 40.
- Auto: e2e `gameplay2.spec.ts` — the map shows "World 5 · Living Room Rug" after 30 passed
  levels and steps to world 6.
- Manual: open the same level twice — identical board; play into world 2.

### US14 — Plan a shunting move and watch it play out (F-014)
- Auto: `tests/unit/yard.test.ts` — movement, facing/trailing switches, buffers reverse, coupling,
  uncoupler pads, alternating/linked/trigger switches, every factory type, exact station train,
  loop / stuck detection; `tests/unit/yardGen.test.ts` — levels 1–60 solvable at par, the
  untouched yard fails, deterministic, ramp, stars.
- Auto: e2e `smoke.spec.ts` (solve level 1 and the first pad level by tapping), `interface3d.spec.ts`
  (nothing changes after Go, scrubber drag rewinds and finishes the run).
- Manual: plan level 3 wrongly, scrub to where it goes wrong, Edit, fix, beat par.

### US5 — Look around (F-005)
- Manual: pinch zoom around fingers, one-finger pan, tap train → follow, double-tap empty space →
  overview, drag starting on a switch does not flip it; rotate to landscape and back; desktop
  mouse drag + wheel.

### US6 — Travel the map (F-006, F-010)
- Auto: `tests/unit/progress.test.ts` — endless unlock rules, v1 migration, best never decreases,
  corrupt/missing save → fresh.
- Auto: e2e — after passing level 1 and reloading, level 2 is unlocked.
- Manual: biome themes visible on map and in levels; locked level shows its unlock hint.

### US12 — Find the sneakier route (F-012)
- Auto: `tests/unit/secretRoute.test.ts` — on every secret level of 1–100 the plain route scores
  85–99% and the detour 100%; the detour is longer, starts switched off and hides in a tunnel or
  on a bridge; at least a quarter of levels 15–100 have one.
- Manual: on a 2-star secret level, find the detour; "Secret route!" celebration, map mark.

### US11 / US13 — Crossings, bridges, tunnels; full-screen boards (F-011, F-013)
- Auto: e2e `gameplay2.spec.ts` — the ground covers every screen corner and the board spans ≥ 90%
  of the width on levels 1, 20 and 40 (SC-018); a switch button's arrow turns when it is flipped.
- Manual: the train slows climbing a bridge and disappears into tunnels; switch arrows are easy
  to read on every biome.

### US8 — Play with a toy-box interface (F-008)
- Auto: `tests/e2e/interface3d.spec.ts` — no visible DOM element besides the canvas on the map, in
  a level, on the results and on the level card (SC-011); every widget from `__ccx.widgets()` is
  ≥ 44 × 44 px and inside the viewport in portrait 393 × 852 and landscape 852 × 393 (SC-012).
- Auto: `tests/e2e/smoke.spec.ts` drives every step through the 3D buttons (widget centers).
- Auto: `tests/unit/font.test.ts` — the font subset covers every character the interface uses.
- Auto: `tests/e2e/interface3d.spec.ts` — the interface moves on its own on the map and in a level,
  and holds still with reduced motion (SC-013).
- Manual: buttons wobble, squash when pressed and jelly back; title and sign letters hop; counters
  pop; cards drop in and twirl away; medallions bob; with Reduce Motion on, nothing moves; rotate
  with a card open.

### Global
- NFR-001/005 (manual, device): Safari Web Inspector → Timelines: ≥ 95% of frames at 60 fps over a
  level; ≥ 30 fps during a toy explosion.
- NFR-002/003: `npm run build` prints chunk sizes; initial JS ≤ 300 KB gz, total ≤ 2.5 MB gz.
- NFR-004: lock the phone mid-run → paused with "Tap to continue".
- NFR-007/008: no page scroll, no zoom, no pull-to-refresh, no text selection while playing.
