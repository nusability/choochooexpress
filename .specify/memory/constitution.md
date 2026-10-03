# Choo Choo Express Delivery 3D Constitution

## Core Principles

### I. One Spec, One Source of Truth

The entire game is described by a single specification, `specs/spec.md`, with one
`plan.md` and one `tasks.md` beside it. New features are added to that spec as
`F-NNN` sections; per-feature spec directories MUST NOT be created. IDs (F, US, FR,
NFR, SC, T) are global, stable, and never reused or renumbered, so every task and
every commit can be traced back to a requirement.

*Rationale*: A game is one cohesive experience. Rules, controls, and performance
budgets interact across features, so contradictions are easiest to see in one document.

### II. Mobile-First Play (NON-NEGOTIABLE)

The primary target is a phone browser held in the hand; the reference device is an
**iPhone 16 (60 Hz display) running Safari**. Every feature MUST be playable with
touch alone, fit the visible screen including safe areas and the Dynamic Island,
survive orientation changes and tab backgrounding (auto-pause, clean resume), and
never trigger browser gestures (scroll, pull-to-refresh, zoom, text selection)
during play. Desktop (mouse drag, wheel zoom) is supported, but never at the cost
of the mobile experience.

*Rationale*: A feature that only works with a mouse is a feature most players will not see.

### III. Performance Budget (iPhone 16 @ 60 Hz)

The game MUST hold 60 fps on the reference device, which means a total frame
budget of **16.7 ms** for simulation, physics, and rendering together; it MUST
never drop below 30 fps in normal play. Budgets for draw calls, triangles, active
physics bodies, texture memory, initial download, and time-to-playable are defined
in `plan.md` and are treated like functional requirements: a change that breaks a
budget is a bug. Per-frame allocations in the game loop are avoided; geometries,
materials, and textures are reused and explicitly disposed of when no longer needed.
Many identical objects (toys, sleepers, props) MUST be drawn with instancing.

*Rationale*: Phones throttle, overheat, and drain batteries. Frame drops are the
most visible quality defect in a real-time game.

### IV. Deterministic Logic, Presentation Apart

The code is split into a deterministic core and a presentation layer:

- `src/engine/` holds the deterministic logic — seeded PRNG, level generator,
  track graph, train movement, game state machine, scoring. It MUST NOT import
  three.js, Rapier, or the DOM, and MUST advance on a fixed timestep so the same
  seed and the same inputs always produce the same result.
- `src/physics/` (Rapier), `src/graphics/` (three.js scenery, camera, effects),
  `src/ui/` (3D interface: HUD, menus, cards, 3D meta map), `src/audio/` and
  `src/input/` read engine state and present it.
- Physics is **presentation only**: toy counts, spills, derailments, scores, and
  stars come from the engine, never from the physics simulation.

*Rationale*: Rules stay deterministic, replayable, and testable without a GPU, and
rendering or physics can be optimized or replaced without touching gameplay.

### V. Testable Game Logic

All logic in `src/engine/` MUST have unit tests (Vitest) covering the acceptance
scenarios of the user stories it implements, including a check that every campaign
level is generated identically from its seed and is solvable. Each P1 user story
MUST also have at least one Playwright smoke test that runs under mobile device
emulation. Visual polish may be verified manually, but rules and progression may not.

*Rationale*: Game bugs hide in rule edge cases (routing, overflow, scoring, save
data). Cheap unit tests catch them before they reach a phone.

### VI. Lean Dependencies & Assets

three.js and Rapier3D (`@dimforge/rapier3d-compat`, WASM) are the approved runtime
dependencies, with versions pinned; Vite and TypeScript are the build tools. Any
other runtime dependency (UI framework, state library, audio library) MUST be
justified in `research.md` by its size and the problem it solves. Import three.js
addons individually. Models and textures are procedural or compressed (glTF/GLB,
KTX2, appropriately sized WebP/PNG); prefer procedural, low-poly content that fits
the diorama art style. Fonts are open-licence, subset to the characters the game
uses, and bundled as glyph outlines (no web-font downloads).

*Rationale*: Every kilobyte is paid for on a mobile connection before the player sees anything.

## Technology Constraints

- **Language**: TypeScript in strict mode.
- **Rendering**: three.js `WebGLRenderer` on a single canvas, `devicePixelRatio`
  capped at 2. WebGPU only as an optional enhancement with a WebGL fallback.
- **Physics**: Rapier3D (WASM) stepped at a fixed 60 Hz, presentation only (Principle IV).
- **Build**: Vite, producing a static site with relative asset paths.
- **UI**: The whole game interface (HUD, buttons, menus, cards, notices, the meta
  map and its controls, in-world markers) is drawn by three.js as 3D objects on the
  same canvas: an interface scene rendered over the game scene, with 3D lettering.
  No HTML interface elements; the only HTML allowed is a developer diagnostics
  readout (`?debug=1`) and a plain message when WebGL is unavailable.
- **Persistence**: on-device storage (`localStorage`) with a versioned save format.
  Load MUST cope with a missing or corrupt save.
- **Audio**: Starts only after the first user gesture, honours a persisted mute setting.
- **Browsers**: iOS Safari 17+ (iPhone 16 ships with iOS 18) and Chrome for Android
  from the last two years are tier 1; desktop Chrome/Safari/Firefox are tier 2.
- **Delivery**: The `main` branch is the released game. A GitHub Actions workflow
  type-checks, tests, builds, and publishes `main` to GitHub Pages; pull requests run
  the same checks without publishing. Nothing reaches `main` with a failing check.

## Development Workflow

1. `/speckit-specify` adds or amends a feature in `specs/spec.md`.
2. `/speckit-clarify` (optional) resolves open questions in the spec.
3. `/speckit-plan` updates `specs/plan.md` and the design docs for the new or changed features.
4. `/speckit-tasks` appends tasks to `specs/tasks.md`, keeping existing IDs and progress.
5. `/speckit-analyze` (recommended) checks spec ↔ plan ↔ tasks consistency.
6. `/speckit-implement` builds the tasks. Commits reference task IDs (e.g. `T014`).

Quality gates before a feature is called done: type check and lint pass, unit tests pass,
the P1 smoke tests pass under mobile emulation, the production build succeeds, and the
performance budget is checked on the reference device (or noted as unverified in `tasks.md`).

## Governance

This constitution overrides other practices in this repo. `/speckit-plan` MUST
check every plan against it in its Constitution Check. Any deviation needs an entry in
the plan's Complexity Tracking table explaining why it is needed and why the simpler
option was rejected.

Amendments are made with `/speckit-constitution`, which bumps the version using
semantic versioning (MAJOR: principle removed or redefined; MINOR: principle or section
added or materially expanded; PATCH: wording) and records the change in a Sync Impact Report.

**Version**: 1.2.0 | **Ratified**: 2026-10-03 | **Last Amended**: 2026-10-03
