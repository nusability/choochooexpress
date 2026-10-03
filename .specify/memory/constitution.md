<!--
Sync Impact Report
- Version change: template → 1.0.0 (initial ratification)
- Principles defined: I. One Spec, II. Mobile-First Play, III. Performance Budget,
  IV. Logic/Render Separation, V. Testable Game Logic, VI. Lean Dependencies & Assets
- Added sections: Technology Constraints, Development Workflow, Governance
- Templates aligned: spec-template.md, plan-template.md, tasks-template.md (single-spec mode)
- Follow-up TODOs: pick the reference device in specs/plan.md
-->

# ChooChoo Express Constitution

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

The primary target is a phone browser held in the hand. Every feature MUST be
playable with touch alone, fit the visible screen including safe areas, survive
orientation changes and tab backgrounding (auto-pause, clean resume), and never
trigger browser gestures (scroll, pull-to-refresh, zoom, text selection) during
play. Desktop support is welcome, but never at the cost of the mobile experience.

*Rationale*: A feature that only works with a mouse is a feature most players will not see.

### III. Performance Budget Is a Requirement

The game MUST hold 60 fps on the reference mid-range phone named in `plan.md` and
never drop below 30 fps in normal play. Budgets for draw calls, triangles, texture
memory, initial download, and time-to-playable are defined in `plan.md` and are
treated like functional requirements: a change that breaks a budget is a bug.
Per-frame allocations in the game loop are avoided; geometries, materials, and
textures are reused and explicitly disposed of when no longer needed.

*Rationale*: Phones throttle, overheat, and drain batteries. Frame drops are the
most visible quality defect in a real-time game.

### IV. Separate Game Logic From Rendering

Game rules and state live in `src/game/` as plain TypeScript with no three.js or
DOM imports. three.js code (`src/engine/`, `src/scenes/`) reads game state and
draws it; input code (`src/input/`) turns gestures into game commands. The
simulation advances on a fixed timestep, independent of frame rate.

*Rationale*: This keeps the rules deterministic and testable without a GPU, and
lets rendering be optimized or replaced without touching gameplay.

### V. Testable Game Logic

All logic in `src/game/` MUST have unit tests (Vitest) covering the acceptance
scenarios of the user stories it implements. Each P1 user story MUST also have
at least one Playwright smoke test that runs under mobile device emulation.
Visual polish may be verified manually, but rules and progression may not.

*Rationale*: Game bugs hide in rule edge cases (collisions, scoring, save data).
Cheap unit tests catch them before they reach a phone.

### VI. Lean Dependencies & Assets

three.js (version pinned) and Vite are the baseline. Any additional runtime
dependency (physics engine, UI framework, state library) MUST be justified in
`research.md` by its size and the problem it solves. Import three.js addons
individually. Models ship as compressed glTF/GLB and large textures as KTX2 or
appropriately sized WebP/PNG. Prefer procedural or low-poly content where it fits
the art style.

*Rationale*: Every kilobyte is paid for on a mobile connection before the player sees anything.

## Technology Constraints

- **Language**: TypeScript in strict mode.
- **Rendering**: three.js `WebGLRenderer` on a single canvas, `devicePixelRatio`
  capped at 2. WebGPU only as an optional enhancement with a WebGL fallback.
- **Build**: Vite, producing a static site that can be hosted on any static host or CDN.
- **UI**: HUD and menus as a lightweight DOM overlay above the canvas, not rendered in WebGL,
  unless the spec requires in-world UI.
- **Persistence**: on-device storage with a versioned save format. Load MUST cope with a
  missing or corrupt save.
- **Audio**: Starts only after the first user gesture, honours a persisted mute setting.
- **Browsers**: iOS Safari 16+ and Chrome for Android from the last two years are tier 1.

## Development Workflow

1. `/speckit-specify` adds or amends a feature in `specs/spec.md`.
2. `/speckit-clarify` (optional) resolves open questions in the spec.
3. `/speckit-plan` updates `specs/plan.md` and the design docs for the new or changed features.
4. `/speckit-tasks` appends tasks to `specs/tasks.md`, keeping existing IDs and progress.
5. `/speckit-analyze` (recommended) checks spec ↔ plan ↔ tasks consistency.
6. `/speckit-implement` builds the tasks. Commits reference task IDs (e.g. `T014`).

Quality gates before a feature is called done: type check and lint pass, unit tests pass,
the P1 smoke tests pass under mobile emulation, and the performance budget is checked on the
reference device (or noted as unverified in `tasks.md`).

## Governance

This constitution overrides other practices in this repo. `/speckit-plan` MUST
check every plan against it in its Constitution Check. Any deviation needs an entry in
the plan's Complexity Tracking table explaining why it is needed and why the simpler
option was rejected.

Amendments are made with `/speckit-constitution`, which bumps the version using
semantic versioning (MAJOR: principle removed or redefined; MINOR: principle or section
added; PATCH: wording) and updates dependent templates.

**Version**: 1.0.0 | **Ratified**: 2026-10-03 | **Last Amended**: 2026-10-03
