---

description: "Task list for the single game spec"
---

# Tasks: Choo Choo Express Delivery 3D

**Input**: Design documents from `specs/` (the single game spec, plan, and design docs)

**Single-spec mode**: This is the ONE task list for the whole game. When `/speckit-tasks`
re-runs after new features are added, it keeps existing task IDs and their `[x]` state,
and appends new phases/tasks (continuing the T### sequence) for the new user stories.

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Unit tests are required for all `src/engine/` logic (constitution V), and one
Playwright smoke test covers the P1 stories. Presentation code is validated manually per
[quickstart.md](./quickstart.md).

**Organization**: Tasks are grouped by user story. The level generator (US4) comes first among the
P1 stories because every other story needs generated levels to run.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Static three.js web game: `src/`, `tests/` at repository root (no downloaded assets)
- Module layout from plan.md: `src/engine/` (deterministic, no three.js/Rapier/DOM),
  `src/physics/`, `src/graphics/`, `src/input/`, `src/ui/`, `src/audio/`, `src/platform/`, `src/app/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create package.json (name `choo-choo-express-delivery-3d`, `"type": "module"`, scripts `dev`, `build`, `preview`, `typecheck`, `lint`, `test`, `test:e2e`, `check`) with pinned runtime deps `three@0.186.1`, `@dimforge/rapier3d-compat@0.21.0` and dev deps `vite@8.3.2`, `typescript@~6.0.3`, `vitest@5.0.3`, `eslint@^10`, `typescript-eslint@8.71.0`, `@playwright/test@1.56.1`, `@types/three@0.186.0`, `@types/node@^22`; run `npm install` to create package-lock.json
- [x] T002 [P] Create tsconfig.json (strict, ES2022 target/lib + DOM, `moduleResolution: bundler`, `noEmit`, includes `src`, `tests`, config files)
- [x] T003 [P] Create vite.config.ts (`base: './'`, build target `es2022`, raise `chunkSizeWarningLimit` for the lazy Rapier chunk)
- [x] T004 [P] Create eslint.config.js (typescript-eslint recommended; for `src/engine/**`: `no-restricted-imports` of `three`, `three/*`, `@dimforge/*` and `no-restricted-globals` for `window`, `document`, `localStorage`, `performance`)
- [x] T005 [P] Create vitest.config.ts (node environment, `tests/unit/**/*.test.ts`) and playwright.config.ts (`tests/e2e`, Chromium, viewport 393×852, `deviceScaleFactor: 3`, `isMobile`, `hasTouch`, webServer `npm run build && npm run preview -- --port 4173 --strictPort`)
- [x] T006 [P] Create index.html (viewport `width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no`, theme-color, `#app` canvas host + `#hud` root) and base CSS in src/ui/styles.css (`100dvh`, `env(safe-area-inset-*)`, `touch-action: none`, `user-select: none`, `-webkit-touch-callout: none`, `overscroll-behavior: none`)
- [x] T007 [P] Create .gitignore (node_modules, dist, test-results, playwright-report, .vite)
- [x] T008 [P] Create .github/workflows/deploy.yml per research R14 (`actions/checkout@v7`, `actions/setup-node@v7` Node 22, `npm ci`, typecheck, lint, test, build, Playwright Chromium smoke; on `main`: `actions/configure-pages@v6`, `actions/upload-pages-artifact@v5` with `dist/`, deploy job `actions/deploy-pages@v5` in `github-pages` environment with `pages: write`, `id-token: write`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Engine primitives and the app skeleton that every story builds on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T009 [P] Define shared engine types from contracts/level-definition.md and contracts/engine-api.md (`Dir`, `ToyType`, `BiomeId`, `Lane`, `Piece`, `SwitchDef`, `FunnelDef`, `FactoryDef`, `RouteInfo`, `PropDef`, `LevelDefinition`, `LevelRecipe`, `Phase`, `CarPose`, `SimEvent`, `RunResult`) in src/engine/types.ts
- [x] T010 [P] Implement PCG32 XSH-RR with 64-bit BigInt state (`Pcg32(seed, stream=54)`, `nextU32`, `next`, `int(min,max)`, `chance`, `pick`, `shuffle`, `fork(label)`), plus `fmix32` and `hashSeed(a, b)` in src/engine/prng.ts (prompt deliverable 1)
- [x] T011 [P] Unit-test PCG32 in tests/unit/prng.test.ts: seed 42 / stream 54 yields `0xa15c02b7, 0x7b47f409, 0xba1d3330, 0x83d2f293, 0xbfa4784b, 0xcbed606e`; same seed → same sequence; forks differ; `int` stays within bounds
- [x] T012 [P] Implement grid helpers in src/engine/grid.ts: `N=0, E=1, S=2, W=3`, opposite/left/right, tile index ↔ (c, r), neighbour, edge midpoints, lane kind/length (straight 1, curve π/4 with radius 0.5 around the shared corner), `lanePoint(tile, from, to, u)` and heading
- [x] T013 [P] Unit-test grid geometry in tests/unit/grid.test.ts (lane lengths, endpoints on edge midpoints, continuity between neighbouring tiles, headings)
- [x] T014 [P] Implement A1 constants and formulas in src/engine/flow.ts exactly as data-model.md §Constants (`DT = 1/60`, `ENGINE_LEN 0.62`, `WAGON_LEN 0.50`, `COUPLING_GAP 0.08`, `WHEEL_HEIGHT 0.10`, `W_TRACK 0.40`, `L_FUNNEL 0.80`, span `[0.10, 0.90]`, `RHO_TOY 2500`, `DERAIL_PILE 40`, `WAGON_CAPACITY 80`, `SWITCH_DELAY 0.5`) with `trainLength(W)`, `pourRate(dose, v)`, `pileHeight(spilled)`, `isDangerousPile(spilled)`, `switchWindow(C, laneLen, trainLen, v)`
- [x] T015 [P] Unit-test flow formulas in tests/unit/flow.test.ts (`DERAIL_PILE` equals `0.5·WHEEL_HEIGHT·W_TRACK·L_FUNNEL·RHO_TOY` = 40; 39 not dangerous, 40 dangerous; train lengths 1.20/1.78/2.36/2.94; `pourRate(d,v)·L_FUNNEL/v = d`)
- [x] T016 Implement src/engine/trackGraph.ts: index lanes by (tile, entry edge), `nextLane(lane, switchStates)`, per-tile pieces, `pointAt(lane, u)`, reachability-to-store check and shortest-cycle length (for contract invariants 3–4)
- [x] T017 [P] Implement the campaign table in src/engine/campaign.ts (4 biomes; 28 recipes exactly as data-model.md: seed, cols×rows per biome, order lines, wagons, speed per biome, must-loop, dual, distractor kinds; derived switch and factory counts; `recipeFor(level)`)
- [x] T018 [P] Unit-test the campaign in tests/unit/campaign.test.ts (28 levels, exactly 7 per biome in order, derived counts equal the data-model table and stay within FR-036 ranges)
- [x] T019 [P] Implement src/platform/storage.ts: availability probe (write/remove `ccxd3d.probe`), safe get/set with try/catch, in-memory fallback, `available` flag
- [x] T020 [P] Implement the gesture recognizer in src/input/gestures.ts: Pointer Events; tap (< 10 CSS px, < 350 ms, delivered immediately); doubleTap (second tap ≤ 300 ms and ≤ 30 px); one-finger pan; two-finger pinch + pan; wheel; prevent `gesturestart`, `dblclick`, context menu
- [x] T021 [P] Implement src/graphics/renderer.ts: `WebGLRenderer` (antialias, ACES tone mapping, sRGB, PCF soft shadows), `devicePixelRatio` capped at 2, resize/orientation handling, adaptive quality (2 s average frame > 18 ms → shadow map 2048 → 1024 → off, then DPR 1.5 → 1.25)
- [x] T022 [P] Implement procedural canvas textures in src/graphics/textures.ts (wood grain, cardboard, felt, rug pattern, candy stripes, sand, starfield, sign labels)
- [x] T023 Implement the boot skeleton in src/main.ts: renderer, screen state (`boot` / `map` / `level`), fixed-tick accumulator loop (0–4 ticks per frame, `?speed=N` up to 8), `visibilitychange` auto-pause hook, URL params (`speed`, `autoplay`, `level`, `reset`), `window.__ccx` test hook skeleton

**Checkpoint**: Foundation ready — `npm test` runs prng/grid/flow/campaign tests; `npm run dev` shows an empty scene

---

## Phase 3: User Story 4 - Fair, repeatable puzzles (F-004, Priority: P1)

**Goal**: The backward generator builds every non-dual campaign level (1–21) deterministically, with exact recipe counts and no dead ends.

**Independent Test**: `npm test -- levelGenerator` — levels 1–21 regenerate deep-equal, match their recipes and satisfy the level contract invariants.

### Tests for User Story 4

- [x] T024 [P] [US4] Unit-test the router in tests/unit/router.test.ts (respects occupied tiles, start entry edge and goal exit edge, never revisits a tile, same seed → same path)
- [x] T025 [P] [US4] Unit-test loop templates in tests/unit/loops.test.ts (narrow 2-row loop circuit 5.14 and 3-row 7.14; windows 1.53 s / 3.07 s at v = 1.3 with 3 wagons; blocked tiles rejected)
- [x] T026 [P] [US4] Unit-test the generator for levels 1–21 in tests/unit/levelGenerator.test.ts (regeneration is deep-equal; switch/factory/distractor/order-line counts equal the recipe; contract invariants 1–4 and 7; every level ≥ 10 has a standard-route loop window in [3, 6] s; generation succeeds within 400 attempts)

### Implementation for User Story 4

- [x] T027 [US4] Implement the A* track router in src/engine/router.ts (state = tile + entry edge; cost 1 per tile, +0.35 per turn, +0.15 next to existing track, seeded jitter in [0, 0.2); returns tiles with entry/exit edges; rejects tile revisits)
- [x] T028 [US4] Implement loop rectangle templates in src/engine/loops.ts (beside a straight stretch M…W with chord 0–2, extents a, b, h; boundary path from W around to M; per-tile lane kinds; circuit length and window per data-model §Formulas)
- [x] T029 [US4] Implement the generator core in src/engine/levelGenerator.ts (prompt deliverable 2): attempt loop (`MAX_GEN_ATTEMPTS = 400`, `fork(seed, attempt)`), board occupancy and lane/piece assembly, store at the top edge, order types (distinct) and per-wagon doses (`Σ V_i ∈ [60, 71]`, each `V_i ≥ 15`), required factories placed backward N…1 and connected by router legs, depot run of `ceil(L_train + 0.3)` tiles
- [x] T030 [US4] Add must-loop modules to src/engine/levelGenerator.ts for recipes with `mustLoop` (required factory on a loop straight, building outside, window in [3, 6] s)
- [x] T031 [US4] Add distractors to src/engine/levelGenerator.ts: `loopBay` (window ≥ 1.2 s), `decoy` (decoy factory of an unordered type, dose 15–30, merge downstream), `bypass` (merge after ≥ 1 required factory); switches and merges only on plain route tiles
- [x] T032 [US4] Finish src/engine/levelGenerator.ts: standard route lanes and switch plan (walk from the depot), route length and cost, initial switch states with ≥ 1 off-route (FR-034), decorative props on free tiles, `validateLevel()` for the contract invariants, `generateLevel(level)`

**Checkpoint**: Levels 1–21 generate; generator tests pass

---

## Phase 4: User Story 1 - Route the train with switches (F-001, Priority: P1) 🎯 MVP core

**Goal**: A playable board: the train leaves the depot on Go, follows the switches the player taps, and stops at the Toy Store.

**Independent Test**: Open `?level=1`, tap the switch so it points toward the store, tap Go — the train follows it and stops at the Toy Store.

### Tests for User Story 1

- [x] T033 [P] [US1] Unit-test train kinematics in tests/unit/train.test.ts (car offsets per data-model, poses on straights and curves, interpolation between ticks)
- [x] T034 [P] [US1] Unit-test switching in tests/unit/simulation.switches.test.ts (planning flips apply immediately; running flips are queued to the next tick; the lane is chosen when the engine enters the switch tile; flips refused while any car is on the tile and while paused; a train leaves a loop after a flip; train stops at the store; identical replays give identical event streams)

### Implementation for User Story 1

- [x] T035 [US1] Implement src/engine/train.ts (append-only trail with trimming, engine distance, car front/back points by offset, `CarPose` with heading, interpolation alpha)
- [x] T036 [US1] Implement the run state machine in src/engine/simulation.ts (phases planning/running/paused/delivered/derailed; `go`, `pause`, `resume`, `step`, `flip` with queue and lock rules; switch decision on tile entry; stop at the store; events `depart`, `switch`, `switchLocked`, `delivered`; replay record) per contracts/engine-api.md
- [x] T037 [P] [US1] Implement swept track geometry in src/graphics/trackMesh.ts (bed + two rails along every lane, 8 segments per curve, merged; sleepers as one `InstancedMesh`; per-switch arrow chevrons and lever showing the active lane by shape)
- [x] T038 [P] [US1] Implement depot shed and Toy Store meshes in src/graphics/buildings.ts (procedural, merged per building)
- [x] T039 [P] [US1] Implement engine and open-wagon meshes in src/graphics/trainView.ts, posed from `CarPose`
- [x] T040 [US1] Implement src/graphics/boardView.ts (table, diorama base sized cols × rows, lights and shadows, track, switches with flip animation, depot, store; tile → world mapping; projected switch screen positions)
- [x] T041 [US1] Implement src/app/LevelSession.ts (Simulation + BoardView + TrainView; tap picking: nearest switch within 22 px, then the train; Go/Pause/Restart; ticks from the main loop; drains events to the views)
- [x] T042 [US1] Implement the level HUD in src/ui/hud.ts (title, pause, restart, Go; locked-switch wiggle) and pause / "Tap to continue" overlays in src/ui/overlays.ts
- [x] T043 [US1] Wire the level screen in src/main.ts (`?level=N`, default level 1; resize refit; auto-pause when hidden; `__ccx.phase()`, `__ccx.switchScreenPositions()`, `__ccx.result()`)
- [x] T044 [US1] Write the P1 smoke test in tests/e2e/smoke.spec.ts (level 1 with `?speed=8`: tap the switch via `__ccx.switchScreenPositions()`, tap Go, wait for the result overlay)

**Checkpoint**: Level 1 is drivable end to end in the browser

---

## Phase 5: User Story 2 - Fill the wagons without burying the rails (F-002, Priority: P1)

**Goal**: Factories pour toys into passing wagons by the A1 rules; overflow spills into piles; a big pile derails the train into a toy explosion.

**Independent Test**: In a one-factory level, pass once (wagons fill), loop back (spills), loop again (derailment).

### Tests for User Story 2

- [x] T045 [P] [US2] Unit-test loading in tests/unit/simulation.loading.test.ts (exactly `dose` toys per wagon per pass at any tick phase; the engine never loads; toys beyond `WAGON_CAPACITY = 80` spill at that funnel; a 39-toy pile is passed, a 40-toy pile derails at the funnel span start; passes are attributed per wagon visit even when wagons interleave between adjacent funnels; no events after a derailment)

### Implementation for User Story 2

- [x] T046 [US2] Add funnel passes to src/engine/simulation.ts (distance-threshold emission, load/spill decision, per-train pass list, piles per funnel, `pileDanger` and `derail` events, `wagonLoads()`, `loadedByType()`, `piles()`)
- [x] T047 [P] [US2] Implement toy geometries (≤ 80 triangles each: block red cube, duck yellow, car blue, ball green sphere, star purple) and instanced rendering (one `InstancedMesh` per type, capacity 1,500, per-instance colour variation) in src/graphics/toyMeshes.ts
- [x] T048 [P] [US2] Add factory buildings with funnel hoppers over their lane and toy-type signs to src/graphics/buildings.ts
- [x] T049 [US2] Implement src/physics/toyPhysics.ts (prompt deliverable 3): lazy `import('@dimforge/rapier3d-compat')` + `init()`; world with `lengthUnit 0.05`, gravity −11, 1/60 step; ground; kinematic engine and wagons (floor + 4 walls) driven by poses; one body per `load`/`spill` event (spills kicked sideways); freeze settled toys into wagon colliders or fixed ground colliders (speed < 0.15 for 8 ticks or 1.5 s); caps of 150 active and 1,500 alive toys; instance matrix sync; gravity-scale option for zero-G funnels
- [x] T050 [US2] Add the toy explosion to src/physics/toyPhysics.ts (train cars become dynamic with impulses; up to 600 toys unfrozen with outward impulses)
- [x] T051 [US2] Add wagon fill bars (percentage, warning style and ⚠ at ≥ 90%) to src/ui/hud.ts and the derailment overlay ("Toy explosion!" + Retry) to src/ui/overlays.ts
- [x] T052 [US2] Wire loading in src/app/LevelSession.ts (load/spill/derail events → toyPhysics; Go waits for physics readiness; dangerous-pile cue on funnels)

**Checkpoint**: Toys pour, spill and explode; engine loading tests pass

---

## Phase 6: User Story 3 - Deliver the order and earn stars (F-003, Priority: P1)

**Goal**: The Toy Store's order is always visible with live counts; deliveries are scored by A3 and earn stars.

**Independent Test**: Level 1 driven perfectly scores 1000 and 3 stars; an extra loop under the funnel deducts spills and lowers the stars.

### Tests for User Story 3

- [x] T053 [P] [US3] Unit-test scoring in tests/unit/scoring.test.ts with the spec's acceptance examples (60 ducks → 45 blocks delivered perfectly = 1000, 3★; all correct with 12 spills = 940, 1★; reversed sequence counts only the in-sequence part; < 750 is refused; `N_total = max(ordered, delivered)`; score floored at 0; +300 bonus; 3★ at ≥ 1200 or perfect)
- [x] T054 [P] [US3] Unit-test the standard routes in tests/unit/autopilot.test.ts (levels 1–21: the autopilot following `routes.standard.switchPlan` delivers with 0 spills, score 1000, 3★ — SC-004)

### Implementation for User Story 3

- [x] T055 [US3] Implement src/engine/scoring.ts (loaded lines from the pass list: drop empty passes, merge consecutive same type; weighted-LCS `N_correct`; `N_total`; score; stars 750 / 900 & ≤ 10 spills / 1200 or perfect; `passed`)
- [x] T056 [US3] Produce the `RunResult` on delivery in src/engine/simulation.ts (lines, counts, distance, ticks)
- [x] T057 [US3] Implement src/engine/autopilot.ts (flip each switch of a route's switch plan as soon as it is free and before the engine reaches it)
- [x] T058 [P] [US3] Implement SVG toy icons (shape + colour) in src/ui/icons.ts
- [x] T059 [US3] Add the order card to src/ui/hud.ts (lines in sequence with icons, live loaded/ordered counts, check marks, arrows)
- [x] T060 [US3] Add the results overlay to src/ui/overlays.ts (animated stars, correct/total, spills, bonus, score, personal best, Retry / Map / Next; refusal state below 750)

**Checkpoint**: MVP — levels 1–21 playable via `?level=N` with full scoring

---

## Phase 7: User Story 5 - Look around: zoom, pan, follow the train (F-005, Priority: P2)

**Goal**: Overview framing, pinch/pan/wheel camera, and follow-the-train mode.

**Independent Test**: Pinch and drag in a level; tap the train to follow it; double-tap empty space to return to the overview.

- [x] T061 [US5] Implement src/graphics/cameraController.ts (prompt deliverable 4): perspective FOV 30°, pitch 56°, yaw −14°; overview fit of the board's 8 corners inside the viewport minus HUD insets; zoom from overview × 1.15 to wagon-close-up; pinch about the fingers; pan clamped to the board; follow mode with look-ahead; critically damped transitions (≤ 0.6 s); refit on resize
- [x] T062 [US5] Route gestures in src/app/LevelSession.ts (drag/pinch/wheel → camera; tap train → follow; double-tap empty space → overview; drags and pinches never flip switches)
- [x] T063 [US5] Add the overview/follow camera button to src/ui/hud.ts

**Checkpoint**: Camera behaves per FR-038–FR-044 on touch and mouse

---

## Phase 8: User Story 6 - Travel the campaign map (F-006, Priority: P2)

**Goal**: A 3D meta map of four themed biomes with saved progress and unlocks.

**Independent Test**: First launch shows only level 1 unlocked; pass it and level 2 unlocks; after a reload, stars and unlocks are still there.

### Tests for User Story 6

- [x] T064 [P] [US6] Unit-test src/engine/progress.ts in tests/unit/progress.test.ts (default save; corrupt JSON, `version` ≠ 1, wrong types or out-of-range values → fresh save; level 1 always unlocked, level n unlocked when n − 1 has `stars ≥ 1`; best stars and score never decrease; secret flag sticks; total stars)

### Implementation for User Story 6

- [x] T065 [US6] Implement src/engine/progress.ts per contracts/save-format.md (`parseSave`, `serializeSave`, `applyResult`, `isUnlocked`, `totalStars`, `furthestUnlocked`)
- [x] T066 [P] [US6] Implement biome themes in src/graphics/biomes.ts (palettes, background, glow rails for space; instanced procedural props: pillows, letter blocks; lollipops, gumdrops, marshmallow arches, syrup drips; dunes, buckets, spades, turning windmills; planets, rockets, star stickers) — decorative only
- [x] T067 [US6] Apply the biome theme in src/graphics/boardView.ts (base texture, props from `LevelDefinition.props`, background)
- [x] T068 [US6] Implement src/ui/MetaMap.ts (prompt deliverable 5): 3D tabletop with the four biome areas joined by a track, 28 level markers (number, best stars, lock, secret mark), drag to move between biomes, tap marker → level card, opens centred on the furthest unlocked level; `__ccx.levelMarkerScreenPosition()`
- [x] T069 [US6] Add the level card (biome · number, best stars and score, Play, locked hint, "A faster route exists" for 22–28 until found), storage-unavailable notice and biome-unlock celebration to src/ui/overlays.ts
- [x] T070 [US6] Wire screens in src/main.ts (map ↔ level, Next / Map / Retry, save after each delivered run, mute setting, `?reset=1`, `?level=N` only if unlocked)
- [x] T071 [US6] Extend tests/e2e/smoke.spec.ts: pass level 1 with `?autoplay=1`, reload, level 2 is unlocked on the map

**Checkpoint**: Full campaign UI with persistence

---

## Phase 9: User Story 7 - Find the secret route (F-007, Priority: P3)

**Goal**: Levels 22–28 have a standard route and a cheaper secret route through a Dual Factory; taking it exactly earns +300.

**Independent Test**: Level 22 via the standard route scores 1000 (3★); via the secret route 1300 with the celebration.

### Tests for User Story 7

- [x] T072 [P] [US7] Unit-test dual levels in tests/unit/dualRoutes.test.ts (levels 22–28: deterministic; recipe counts; `Cost(P2) ≤ 0.85 · Cost(P1)`; window ratio in [0.425, 0.575] with `Δt(P1) ≥ 3 s`; P2 passes fewer distinct switches than P1; autopilot on P1 → 1000 / 3★, on P2 → 1300 / 3★ with the bonus)

### Implementation for User Story 7

- [x] T073 [US7] Add dual construction to src/engine/levelGenerator.ts (final merge before the store; P1 built backward with spread-out factories and a standard loop; P2 built backward with a tight loop holding the Dual Factory plus a single factory for 3-line orders; split switch after the depot; window pairing; cost check; distractors on P1 only; `routes.secret`)
- [x] T074 [US7] Detect the secret route in src/engine/simulation.ts (traversed lane list equals `routes.secret.lanes`) and apply `B_efficiency = 300` in src/engine/scoring.ts
- [x] T075 [P] [US7] Add the Dual Factory model (two towers joined by an arch, two hoppers) to src/graphics/buildings.ts
- [x] T076 [US7] Add the "Secret route!" celebration to src/ui/overlays.ts and the secret mark to src/ui/MetaMap.ts

**Checkpoint**: All 28 levels playable; all engine tests pass

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T077 [P] Implement WebAudio-synthesized sound effects in src/audio/sfx.ts (switch click, locked clunk, whistle, chuff, pour hiss, spill patter, boing + pop, delivery jingle, star chimes; unlock on first pointer-down; suspend when hidden; mute persisted)
- [x] T078 [P] Implement pooled particle effects in src/graphics/effects.ts (steam puffs, spill dust, confetti, sparkles, windmill puffs)
- [x] T079 Add onboarding hint bubbles (levels 1, 2, 10, 22; shown until the level is passed) to src/ui/hud.ts
- [x] T080 Wire audio and effects into src/app/LevelSession.ts and src/ui/MetaMap.ts
- [x] T081 Add a `?debug=1` overlay (fps, draw calls, triangles, active/alive toys) in src/app/LevelSession.ts and check the plan's budgets in a busy level
- [ ] T082 [P] Update README.md and CLAUDE.md (commands, structure, GitHub Pages setting)
- [ ] T083 Run `npm run check` and `npm run test:e2e`; record device-only checks (NFR-001, NFR-005, SC-002) as unverified notes at the end of specs/tasks.md
- [ ] T084 Check bundle sizes from `npm run build` (initial JS ≤ 300 KB gz, Rapier in its own lazy chunk, total ≤ 2.5 MB gz) and record them in the notes of specs/tasks.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **US4 (Phase 3)**: Depends on Foundational — every other story needs generated levels
- **US1 (Phase 4)**: Depends on US4
- **US2 (Phase 5)**: Depends on US1 (simulation and session)
- **US3 (Phase 6)**: Depends on US2 (loads to score); T054 also completes the SC-004 check for US4
- **US5 (Phase 7)** and **US6 (Phase 8)**: Depend on US1; independent of each other
- **US7 (Phase 9)**: Depends on US4 (generator), US3 (scoring) and US6 (map marks)
- **Polish (Phase 10)**: Depends on all desired user stories being complete

### Within Each User Story

- Tests are written first and fail before implementation
- Engine (deterministic) before presentation; presentation before wiring
- Story complete before moving to next priority

### Parallel Opportunities

- Setup: T002–T008 in parallel after T001
- Foundational: T009–T015, T017–T022 in parallel; T016 after T012; T023 last
- Each story's test tasks marked [P] in parallel; graphics tasks T037–T039, T047–T048 in parallel
- US5 and US6 can proceed in parallel after US1

---

## Parallel Example: User Story 1

```bash
# Tests for User Story 1 together:
Task: "Unit-test train kinematics in tests/unit/train.test.ts"
Task: "Unit-test switching in tests/unit/simulation.switches.test.ts"

# Presentation pieces for User Story 1 together:
Task: "Implement swept track geometry in src/graphics/trackMesh.ts"
Task: "Implement depot shed and Toy Store meshes in src/graphics/buildings.ts"
Task: "Implement engine and open-wagon meshes in src/graphics/trainView.ts"
```

---

## Implementation Strategy

### MVP First (P1 stories)

1. Phase 1: Setup → Phase 2: Foundational
2. Phase 3: US4 (generator) → Phase 4: US1 (drive the train)
3. **STOP and VALIDATE**: level 1 drivable end to end
4. Phase 5: US2 (toys) → Phase 6: US3 (scoring) → MVP: levels 1–21 playable via `?level=N`

### Incremental Delivery

1. Add US5 (camera) and US6 (meta map + saves) → full campaign UI
2. Add US7 (secret routes) → levels 22–28
3. Polish (audio, effects, hints, performance) → release from `main`

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Engine tests use the real generator and simulation (no mocks); presentation is checked per quickstart.md
- Commit after each phase checkpoint; commit messages reference task IDs
