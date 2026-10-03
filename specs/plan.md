# Implementation Plan: Choo Choo Express Delivery 3D

**Date**: 2026-10-03 | **Spec**: [spec.md](./spec.md) | **Covers**: F-001 … F-007

**Input**: The single game specification at `specs/spec.md`

**Single-spec mode**: This is the ONE plan for the whole game. When new features are
added to the spec, `/speckit-plan` updates this file in place (new decisions, new
modules, a new row in "Feature Coverage") rather than creating a new plan.

## Summary

A static, single-page mobile web game. A deterministic engine (`src/engine/`) generates each
of the 28 levels from a seeded recipe on a tile grid (backward generation: store → required
factories in reverse → depot → mandatory switches → distractor branches; two independent
routes for levels 22–28), simulates the train on a fixed 60 Hz tick (switch decisions,
distance-exact toy doses per A1, spill piles, derailment) and scores deliveries per A3.
Presentation reads the engine: three.js renders a procedural diorama (no downloaded art),
Rapier3D animates the pouring toys as presentation-only physics (settled toys are frozen into
wagon colliders or the ground so only a few dozen bodies are ever active), a DOM overlay shows
the order and results, and a 3D meta map ties the four biomes together. Vite builds a static
site that GitHub Actions publishes from `main` to GitHub Pages.

## Technical Context

**Language/Version**: TypeScript 6.0 (strict), ES2022 target. Not TypeScript 7: the
lint toolchain (typescript-eslint 8.71) supports TypeScript < 6.1 only (research R1).

**Primary Dependencies**: three 0.186.1 and `@dimforge/rapier3d-compat` 0.21.0 (pinned,
runtime); Vite 8.3 (dev server + build). Dev: Vitest 5.0, Playwright 1.56.1, ESLint 10 +
typescript-eslint 8.71.

**Rendering**: three.js `WebGLRenderer`, single canvas, `devicePixelRatio` capped at 2 with
adaptive reduction; one directional light with shadows, hemisphere fill light.

**Physics**: Rapier3D compat build (WASM inlined), loaded lazily as its own chunk while the meta
map is shown; fixed 60 Hz step; presentation only.

**Assets**: None downloaded — all geometry is procedural and textures are drawn on canvases at
startup (research R10).

**Storage**: `localStorage`, key `ccxd3d.save`, versioned JSON (contracts/save-format.md).

**Testing**: Vitest (Node environment) for everything in `src/engine/`; Playwright with
Chromium mobile emulation (393 × 852, DPR 3, touch) for smoke tests.

**Target Platform**: iOS Safari 17+ and Chrome for Android (last 2 years); desktop
Chrome/Firefox/Safari as secondary.

**Project Type**: Static single-page web game (no backend), published from `main` to GitHub
Pages.

**Performance Goals**: 60 fps (16.7 ms/frame) on the reference device; budgets below.

**Constraints**: Initial download (before the physics chunk) ≤ 300 KB gzipped; total transfer
≤ 2.5 MB; first download ≤ 5 MB; works offline once a level is loaded.

**Scale/Scope**: 28 levels, 4 biomes, 5 toy types, up to 1,500 toys per level.

**Reference Device**: iPhone 16, 60 Hz display, Safari — the phone all performance goals are
measured on.

### Performance budgets (iPhone 16 @ 60 Hz)

| Budget | Target | How it is met |
|--------|--------|---------------|
| Frame time | ≤ 16.7 ms total: engine ≤ 1 ms, physics ≤ 4 ms, render CPU ≤ 6 ms | fixed tick, frozen toys, merged static geometry |
| Draw calls | ≤ 100 in a level, ≤ 80 on the map | merged static meshes, one `InstancedMesh` per toy type / prop kind |
| Triangles on screen | ≤ 200k | toys ≤ 80 tris, low-poly props |
| Active (moving) toy bodies | ≤ 150 normally, ≤ 600 during a toy explosion | freeze settled toys into wagon/ground colliders |
| Toys alive per level | ≤ 1,500 (oldest ground toys recycled beyond) | instanced rendering |
| Pixel ratio | min(dpr, 2), adaptive down to 1.25 | frame-time monitor |
| Shadow map | 2048², adaptive 1024² / off | frame-time monitor |
| Transfer | ≤ 300 KB gz before physics chunk; ~1.7 MB gz physics chunk, lazy | code splitting |

## Feature Coverage

| Feature | Plan sections / modules | Status |
|---------|------------------------|--------|
| F-001 Track, train & switches | `engine/grid.ts`, `engine/trackGraph.ts`, `engine/train.ts`, `engine/simulation.ts`, `graphics/boardView.ts`, `graphics/trainView.ts`; research R4, R5 | Planned |
| F-002 Factories, loading & spills | `engine/flow.ts`, `engine/simulation.ts`, `physics/toyPhysics.ts`, `graphics/toyMeshes.ts`; research R3, R4 | Planned |
| F-003 Orders, scoring & stars | `engine/scoring.ts`, `ui/hud.ts`, `ui/overlays.ts`; research R6 | Planned |
| F-004 Procedural levels | `engine/prng.ts`, `engine/levelGenerator.ts`, `engine/router.ts`, `engine/loops.ts`, `engine/campaign.ts`; research R5, R7 | Planned |
| F-005 Camera & viewport | `graphics/cameraController.ts`, `input/gestures.ts`; research R8, R9 | Planned |
| F-006 Meta map & progression | `ui/MetaMap.ts`, `engine/progress.ts`, `platform/storage.ts`, `graphics/biomes.ts`; research R13, R16 | Planned |
| F-007 Dual-solution levels | `engine/levelGenerator.ts` (dual build), `engine/scoring.ts` (bonus); research R7 | Planned |

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Pre-research | Post-design |
|-----------|------|--------------|-------------|
| I. One Spec | Plan, tasks and design docs live beside `specs/spec.md`; IDs referenced, not renumbered | ✅ | ✅ |
| II. Mobile-First Play | Touch-only play, safe areas, auto-pause, no browser gestures, portrait first | ✅ | ✅ gestures.ts + CSS (R9, R11) |
| III. Performance Budget | 16.7 ms on iPhone 16; budgets in this plan; instancing for repeated objects | ✅ | ✅ budgets table, freeze strategy (R3), adaptive quality (R10) |
| IV. Deterministic Logic, Presentation Apart | `src/engine/` free of three.js/Rapier/DOM, fixed tick, physics presentation only | ✅ | ✅ engine-api contract; ESLint `no-restricted-imports` guard |
| V. Testable Game Logic | Unit tests for engine incl. all 28 levels solvable; P1 smoke tests in mobile emulation | ✅ | ✅ quickstart scenarios |
| VI. Lean Dependencies & Assets | Only three + Rapier at runtime; addons imported individually; procedural assets | ✅ | ✅ no other runtime deps |
| Delivery | `main` → GitHub Pages via Actions; PRs run the same checks | ✅ | ✅ R14 |

No violations; Complexity Tracking is empty.

## Project Structure

### Documentation (single spec for the whole game)

```text
specs/
├── spec.md              # The one game spec (/speckit-specify, /speckit-clarify)
├── plan.md              # This file (/speckit-plan command output)
├── checklists/          # Quality checklists (/speckit-specify, /speckit-checklist)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
index.html               # Viewport meta (viewport-fit=cover), canvas + HUD root
src/
├── main.ts              # Boot: renderer, screens (map ↔ level), main loop, visibility pause
├── app/
│   └── LevelSession.ts  # Wires one level: Simulation + ToyPhysics + BoardView + HUD + audio
├── engine/              # Deterministic logic — no three.js / Rapier / DOM imports
│   ├── prng.ts          # PCG32 + seed hashing                         (prompt deliverable 1)
│   ├── levelGenerator.ts# Backward generator, dual routes for 22–28    (prompt deliverable 2)
│   ├── grid.ts          # Directions, tiles, lane geometry
│   ├── router.ts        # A* track router on the tile grid
│   ├── loops.ts         # Loop rectangle templates + circuit/window math
│   ├── trackGraph.ts    # Lanes, next-lane lookup, point sampling
│   ├── train.ts         # Trail + car poses
│   ├── simulation.ts    # Run state machine: switches, loading, spills, derailment, delivery
│   ├── flow.ts          # A1 constants and formulas
│   ├── scoring.ts       # A3 score, N_correct, stars
│   ├── campaign.ts      # 28 recipes, biomes
│   ├── progress.ts      # Save model (pure functions)
│   ├── autopilot.ts     # Drives a route's switch plan (tests, attract mode)
│   └── types.ts
├── physics/
│   └── toyPhysics.ts    # Rapier world, kinematic wagons, toy spawn/freeze, explosion (deliverable 3)
├── graphics/
│   ├── cameraController.ts # Pinch/pan/zoom, overview, follow train          (deliverable 4)
│   ├── renderer.ts      # WebGLRenderer, DPR, resize, adaptive quality
│   ├── boardView.ts     # Table, base, track, switches, buildings, props for one level
│   ├── trackMesh.ts     # Swept bed/rail geometry along lanes
│   ├── trainView.ts     # Engine + wagon meshes
│   ├── toyMeshes.ts     # Toy geometries + instanced rendering
│   ├── buildings.ts     # Depot, factories, dual factory, toy store
│   ├── biomes.ts        # Palettes, props, sky per biome
│   ├── textures.ts      # Procedural canvas textures
│   └── effects.ts       # Steam, dust, confetti, sparkles
├── input/
│   └── gestures.ts      # Tap / double tap / pan / pinch / wheel recognizer
├── ui/
│   ├── MetaMap.ts       # 3D meta map of the 4 biomes × 7 levels         (deliverable 5)
│   ├── hud.ts           # Order card, wagon fill bars, buttons, hints
│   ├── overlays.ts      # Level card, results, pause, derail, notices
│   ├── icons.ts         # SVG toy icons
│   └── styles.css
├── audio/
│   └── sfx.ts           # WebAudio-synthesized sound effects
└── platform/
    └── storage.ts       # localStorage adapter with availability check
tests/
├── unit/                # Vitest, targets src/engine/
└── e2e/                 # Playwright, mobile emulation
.github/workflows/
└── deploy.yml           # Typecheck, lint, test, build; publish main to GitHub Pages
```

**Structure Decision**: Single Vite project at the repository root using the module layout the
prompt asked for (`engine/`, `physics/`, `graphics/`, `ui/`) plus `input/`, `audio/`,
`platform/` and `app/` for the remaining presentation concerns. `src/engine/` is enforced as
dependency-free by an ESLint `no-restricted-imports` rule.

## Phases

- **Phase 0 — Research**: [research.md](./research.md) (R1–R17); no open NEEDS CLARIFICATION.
- **Phase 1 — Design**: [data-model.md](./data-model.md),
  [contracts/level-definition.md](./contracts/level-definition.md),
  [contracts/engine-api.md](./contracts/engine-api.md),
  [contracts/save-format.md](./contracts/save-format.md), [quickstart.md](./quickstart.md).
- **Phase 2 — Tasks**: `/speckit-tasks` → `tasks.md`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations.
