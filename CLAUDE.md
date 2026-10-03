# Choo Choo Express Delivery 3D

A mobile web toy-train puzzle game built with three.js + Rapier (TypeScript + Vite), developed with
[Spec Kit](https://github.com/github/spec-kit) in **single-spec mode**.

## Project

- Node 22.12+. `npm ci`, then `npm run dev` (Vite on :5173).
- Before pushing: `npm run check` (typecheck, lint, unit tests, build) and `npm run test:e2e`
  (Playwright smoke tests on the production build, iPhone-sized touch emulation).
- `src/engine/` is deterministic and uses no three.js, Rapier or DOM APIs (`npm run lint`
  enforces it). Fixed 60 Hz tick (`DT`), seeded PCG32 only, no `Math.random` or clocks.
  Every engine change needs a unit test in `tests/unit/`.
- `src/physics/` (Rapier) is presentation only: scores, spills and derailments come from
  `src/engine/simulation.ts`. Rapier loads lazily in its own chunk.
- Level layouts come from `src/engine/campaign.ts` (recipe table + per-level seed salts) and
  `src/engine/levelGenerator.ts`. A generator change can alter every level: run the full unit
  suite, which replays each level's standard route (and the secret route on levels 22–28).
- Budgets (constitution): 60 fps on iPhone 16, ≤ 100 draw calls, initial JS ≤ 300 KB gzip.
  `?debug=1` shows fps, draw calls and toy counts (add `&quality=0` to pin full quality);
  `?level=N&autoplay=1&speed=4` plays a level by itself.
- The whole interface is 3D (spec F-008, constitution v1.2.0): build HUD, cards and markers from
  `src/ui/kit/` (`Button`, `UiItem`, `LiveItem`, `MeshBuilder` lettering and icons), never from
  HTML. The only HTML is the `?debug=1` readout and the no-WebGL message. Widgets need an `id`
  (and buttons a `label`) so `__ccx.widgets()` and the e2e tests can find them. Characters
  outside the font subset need `npm run font` after extending `scripts/build-font.mjs`.
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
