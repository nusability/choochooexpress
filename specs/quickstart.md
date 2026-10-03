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
- Auto: `tests/unit/simulation.test.ts` — switch decision at entry, locked switch refusal, loop
  exit after flip, delivery stops the train, determinism of replays.
- Auto: `tests/e2e/smoke.spec.ts` — level 1: flip the switch via its screen position, tap Go,
  results appear.
- Manual: tap a switch during planning and while running; try tapping a switch under the train
  (wiggle + clunk, no change).

### US2 — Fill the wagons without burying the rails (F-002)
- Auto: `simulation.test.ts` — exact dose per pass, overflow spills, 39-toy pile passes,
  40-toy pile derails; engine never loads.
- Manual: watch toys pour into wagons in follow mode; loop back under a funnel to see spills; a
  third pass derails into a toy explosion; frame rate stays smooth.

### US3 — Deliver the order and earn stars (F-003)
- Auto: `tests/unit/scoring.test.ts` — the spec's acceptance examples (1000/3★; 940/1★ with 12
  spills; wrong sequence; refusal below 750).
- Manual: results screen shows stars, correct/total, spills, bonus, score, best; Retry/Map/Next.

### US4 — Fair, repeatable puzzles (F-004)
- Auto: `tests/unit/levelGenerator.test.ts` — all 28 levels: deterministic (deep-equal twice),
  exact recipe counts, invariants of the level contract, autopilot on the standard route scores
  1000 with 0 spills; FR-034 initial switch rule; windows ≥ 3 s from level 10.
- Manual: open the same level twice — identical board.

### US5 — Look around (F-005)
- Manual: pinch zoom around fingers, one-finger pan, tap train → follow, double-tap empty space →
  overview, drag starting on a switch does not flip it; rotate to landscape and back; desktop
  mouse drag + wheel.

### US6 — Travel the campaign map (F-006)
- Auto: `tests/unit/progress.test.ts` — unlock rules, best never decreases, corrupt/missing save →
  fresh, version mismatch → fresh.
- Auto: e2e — after passing level 1 and reloading, level 2 is unlocked.
- Manual: biome themes visible on map and in levels; locked level shows its unlock hint.

### US7 — Find the secret route (F-007)
- Auto: `levelGenerator.test.ts` — levels 22–28: secret route replay scores 1300 with the bonus;
  `Cost(P2) ≤ 0.85·Cost(P1)`; window ratio 0.5 ± 15%; P2 passes fewer switches.
- Manual: in level 22 take the secret route; "Secret route!" celebration, map mark.

### Global
- NFR-001/005 (manual, device): Safari Web Inspector → Timelines: ≥ 95% of frames at 60 fps over a
  level; ≥ 30 fps during a toy explosion.
- NFR-002/003: `npm run build` prints chunk sizes; initial JS ≤ 300 KB gz, total ≤ 2.5 MB gz.
- NFR-004: lock the phone mid-run → paused with "Tap to continue".
- NFR-007/008: no page scroll, no zoom, no pull-to-refresh, no text selection while playing.
