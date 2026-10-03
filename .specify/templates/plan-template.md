# Implementation Plan: [GAME NAME]

**Date**: [DATE] | **Spec**: [spec.md](./spec.md) | **Covers**: [F-001 … F-NNN]

**Input**: The single game specification at `specs/spec.md`

**Single-spec mode**: This is the ONE plan for the whole game. When new features are
added to the spec, `/speckit-plan` updates this file in place (new decisions, new
modules, a new row in "Feature Coverage") rather than creating a new plan.

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  Defaults for this project (a mobile web game built on three.js) are pre-filled.
  Change them only with a recorded decision in research.md.
-->

**Language/Version**: TypeScript (strict), ES2022 target

**Primary Dependencies**: three.js (pinned version), Vite (dev server + build); [physics/audio/tween libs only if justified]

**Rendering**: three.js `WebGLRenderer`, single canvas, `devicePixelRatio` capped at 2

**Assets**: glTF/GLB (Draco or meshopt compressed), KTX2/Basis textures where useful, loaded via `GLTFLoader`/`KTX2Loader`

**Storage**: `localStorage` for settings and progress (versioned save format)

**Testing**: Vitest for game logic (no WebGL needed); Playwright with mobile device emulation for smoke/e2e

**Target Platform**: Mobile Safari (iOS 16+) and Chrome for Android (last 2 years); desktop Chrome/Firefox/Safari as secondary

**Project Type**: Static single-page web game (no backend unless the spec requires one)

**Performance Goals**: 60 fps on the reference mid-range phone; ≤ [100] draw calls; ≤ [150k] triangles on screen

**Constraints**: Initial JS ≤ [500] KB gzipped; first playable ≤ [5] MB total; GPU memory ≤ [150] MB; touch-first input

**Reference Device**: [e.g., Pixel 6a / iPhone 12 — the phone all performance goals are measured on]

## Feature Coverage

| Feature | Plan sections / modules | Status |
|---------|------------------------|--------|
| F-001 [name] | [e.g., `src/game/track/`, research §2] | Planned |

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

[Gates determined based on constitution file]

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
<!--
  Default layout for this three.js game. Keep it in sync with the real tree and
  expand it as features add modules.
-->

```text
index.html               # Viewport meta, safe-area CSS, canvas mount
public/
└── assets/              # GLB models, KTX2 textures, audio (served as-is)
src/
├── main.ts              # Bootstrap: renderer, resize/DPR handling, visibility pause
├── engine/              # Thin three.js wrappers: renderer, camera rig, loaders, pools
├── game/                # Pure game logic & state (no three.js imports) — unit tested
├── scenes/              # Scene composition: maps game state to three.js objects
├── input/               # Pointer/touch gestures → game commands
├── ui/                  # DOM overlay HUD and menus
└── audio/
tests/
├── unit/                # Vitest, targets src/game/
└── e2e/                 # Playwright, mobile emulation
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
