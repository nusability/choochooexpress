# Choo Choo Express Delivery 3D

A mobile web toy-train shunting puzzle built with three.js (TypeScript + Vite), developed with
[Spec Kit](https://github.com/github/spec-kit) in **single-spec mode**.

## Project

- Node 22.12+. `npm ci`, then `npm run dev` (Vite on :5173).
- Before pushing: `npm run check` (typecheck, lint, unit tests, build) and `npm run test:e2e`
  (Playwright smoke tests on the production build, iPhone-sized touch emulation).
- `src/engine/` is deterministic and uses no three.js, Rapier or DOM APIs (`npm run lint`
  enforces it). Fixed 60 Hz tick (`DT`), seeded PCG32 only, no `Math.random` or clocks.
  Every engine change needs a unit test in `tests/unit/`.
- Gameplay (spec F-014): plan the yard (switches, uncoupler pads), then the whole run is computed
  by `runPlan` in `src/engine/yard.ts` and played back from its frames with a scrubber. Nothing in
  the yard changes after Go.
- Levels are endless: `src/engine/campaign.ts` (`yardRecipe`) derives each recipe from the level
  number (difficulty ceiling at level 40); `src/engine/yardGen.ts` designs each level around its
  solution: bare yard → intended plan → factories and loads that plan needs → decoy track and a
  few decoy factories → the solver verifies it (par = shortest solving plan) and the design closest
  to the recipe's target difficulty wins. Eight biomes cycle by world, each with its own ten toys
  (`src/engine/toys.ts`, models in `src/graphics/toyModels.ts`). A generator or rule change can
  alter every level: run the full unit suite (levels 1–60 solvable at par, the untouched yard
  fails, introduction levels need their lesson, difficulty rises).
- Budgets (constitution): 60 fps on iPhone 16, ≤ 100 draw calls, initial JS ≤ 300 KB gzip.
  `?debug=1` shows fps, draw calls and toy counts (add `&quality=0` to pin full quality);
  `?level=N&autoplay=1&speed=4` plays a level's solution by itself.
- The whole interface is 3D (spec F-008, constitution v1.2.0): build HUD, cards and markers from
  `src/ui/kit/` (`Button`, `UiItem`, `LiveItem`, `MeshBuilder` lettering and icons), never from
  HTML. The only HTML is the `?debug=1` readout and the no-WebGL message. Widgets need an `id`
  (and buttons a `label`) so `__ccx.widgets()` and the e2e tests can find them. Characters
  outside the font subset need `npm run font` after extending `scripts/build-font.mjs`.
- Everything in the interface and every world label animates whimsically (FR-066/FR-067): give
  widgets `idle` motion and `kick()`/`hop()`/`shake()`/`pop()` them on events; hop lettering with
  a `Hop` and wiggle whole parts with `MeshBuilder.wiggle` (shader, `ui/kit/wiggle.ts`). Touch
  rectangles never move, and everything must hold still under reduced motion (the e2e tests
  check both; screenshot comparisons pin `?quality=` so adaptive quality does not change the
  picture).
- `main` deploys to GitHub Pages through `.github/workflows/deploy.yml` (repository setting
  Pages → Source: GitHub Actions). Vite uses `base: './'`, so the build works under any path.

## Spec Kit: single-spec mode

This repo's Spec Kit has been changed to keep ONE spec for the whole game instead of one per feature:

- `specs/spec.md` is the only spec. Features are `### F-NNN` sections inside it.
- `specs/plan.md`, `specs/tasks.md`, `specs/research.md`, `specs/data-model.md`,
  `specs/contracts/`, `specs/quickstart.md`, `specs/checklists/` sit beside it, also one of each.
- Never create `specs/NNN-feature/` directories. `.specify/feature.json` is not used.
- IDs (F, US, FR, NFR, SC, T) are global and stable. Never renumber or reuse them; strike
  through removed items.
- `/speckit-plan` and `/speckit-tasks` update the existing files in place. Existing tasks keep
  their IDs and checkbox state.

Workflow: `/speckit-specify <feature>` → `/speckit-clarify` → `/speckit-plan` →
`/speckit-tasks` → `/speckit-analyze` → `/speckit-implement`.

Project principles (mobile-first, performance budget, logic/render separation, testing) are in
`.specify/memory/constitution.md`. Follow them.

### Local changes to Spec Kit (re-apply after `specify init --force` or an upgrade)

- `.specify/scripts/bash/common.sh` → `get_feature_paths` always resolves to `specs/`
  (unless `SPECIFY_FEATURE_DIRECTORY` is set).
- `.specify/scripts/bash/ensure-spec.sh` replaces `create-new-feature.sh`.
- `.specify/templates/{spec,plan,tasks}-template.md` are game- and single-spec-specific.
- `.claude/skills/speckit-{specify,plan,tasks}/SKILL.md` contain "SINGLE-SPEC MODE" instructions.
