# Game Specification: [GAME NAME]

**Created**: [DATE] | **Last Updated**: [DATE] | **Status**: Draft

<!--
  SINGLE-SPEC MODE
  ================
  This is the ONE specification for the whole game. It is never copied per feature.
  `/speckit-specify` adds a new feature as a new `### F-NNN` block under "Features"
  and updates the shared sections (vision, core loop, global requirements, success
  criteria, entities, assumptions) instead of creating a new file.

  ID rules (IDs are global across the whole file and are NEVER reused or renumbered):
  - Features:               F-001, F-002, ...
  - User stories:           US1, US2, ... (numbered across all features)
  - Functional requirements FR-001, FR-002, ...
  - Non-functional reqs:    NFR-001, NFR-002, ...
  - Success criteria:       SC-001, SC-002, ...
  Removed items are struck through (~~FR-007~~ Removed: reason), not deleted, so
  plan.md and tasks.md references stay valid.

  Describe WHAT the player experiences and WHY. Rendering engine, libraries, and
  code structure belong in plan.md, not here.
-->

## Vision *(mandatory)*

[One or two paragraphs: what the game is, who it is for, and the feeling it should create.]

**Elevator pitch**: [One sentence]

**Target player**: [Who plays this, when, and for how long per session]

## Platform & Play Context *(mandatory)*

- **Platform**: Mobile web browser, played in a browser tab with no install. Also playable on desktop browsers.
- **Primary input**: Touch ([taps / swipes / drag / virtual stick — fill in])
- **Secondary input**: [Mouse/keyboard on desktop, or "none"]
- **Orientation**: [Portrait / Landscape / Both]
- **Session length**: [e.g., 2–5 minute runs]
- **Connectivity**: [Online only / playable offline after first load]

## Core Game Loop *(mandatory)*

[Describe the moment-to-moment loop, e.g. "Lay track → dispatch train → deliver cargo → earn coins → unlock routes".]

1. [Step]
2. [Step]
3. [Step]

**Win / lose / end conditions**: [How a run or level ends]

## Features

<!--
  One block per feature, appended by /speckit-specify. Features are listed in the
  order they were added. Priority is per user story (P1 = needed for the first
  playable build). Each user story must be INDEPENDENTLY PLAYABLE/TESTABLE: if it
  is the only one implemented, the player can still do something meaningful.
-->

### F-001: [Feature Name]

**Added**: [DATE] | **Input**: "[original feature description]"

**Summary**: [What this feature adds to the game and why it matters to the player]

#### User Story US1 - [Brief Title] (Priority: P1)

[Describe this player journey in plain language]

**Why this priority**: [The value and why it has this priority level]

**Independent Test**: [How this can be played/tested on its own, e.g. "Open the game on a phone, tap Play, and a train runs a full loop"]

**Acceptance Scenarios**:

1. **Given** [initial state], **When** [player action], **Then** [expected outcome]
2. **Given** [initial state], **When** [player action], **Then** [expected outcome]

#### User Story US2 - [Brief Title] (Priority: P2)

[Describe this player journey in plain language]

**Why this priority**: [The value and why it has this priority level]

**Independent Test**: [How this can be played/tested on its own]

**Acceptance Scenarios**:

1. **Given** [initial state], **When** [player action], **Then** [expected outcome]

#### Functional Requirements (F-001)

- **FR-001**: The game MUST [specific capability]
- **FR-002**: Players MUST be able to [key interaction]
- **FR-003**: The game MUST [behavior] [NEEDS CLARIFICATION: example of an open question]

#### Edge Cases (F-001)

- What happens when [boundary condition, e.g. the player rotates the phone mid-run]?
- What happens when [interruption, e.g. the tab is backgrounded or a call comes in]?

---

## Global Requirements *(mandatory)*

<!--
  Requirements that apply to the whole game, not one feature. Keep these
  player-facing and measurable. Defaults below suit a mobile web game; adjust
  rather than delete.
-->

### Experience & Performance

- **NFR-001**: Gameplay MUST feel smooth on a mid-range phone from the last ~4 years (target: steady 60 frames per second, never below 30 during normal play).
- **NFR-002**: The game MUST become playable within [5] seconds of opening the link on a typical 4G connection.
- **NFR-003**: The first download MUST stay under [5] MB before gameplay can begin; further content may stream in later.
- **NFR-004**: The game MUST pause automatically when the tab is hidden or the phone is locked, and resume cleanly.

### Touch & Layout

- **NFR-005**: All interactive targets MUST be at least 44×44 CSS px and reachable with a thumb in the chosen orientation.
- **NFR-006**: The game MUST fit the visible screen, including notches/safe areas and the browser's collapsing toolbars, without page scrolling or accidental zooming.
- **NFR-007**: Gestures MUST NOT trigger browser actions (pull-to-refresh, back-swipe, text selection, double-tap zoom) during play.

### Audio, Accessibility & Persistence

- **NFR-008**: Sound MUST start only after the first player interaction and MUST have a mute toggle that is remembered.
- **NFR-009**: Core gameplay information MUST NOT rely on color alone.
- **NFR-010**: Progress and settings MUST persist across reloads on the same device.

## Key Entities *(include if the game has meaningful data)*

<!-- Game objects and data, described without implementation details. -->

- **[Entity, e.g. Train]**: [What it represents, key attributes]
- **[Entity, e.g. Station]**: [What it represents, relationships]

## Success Criteria *(mandatory)*

<!-- Measurable, technology-agnostic outcomes. Tag feature-specific ones with (F-NNN). -->

- **SC-001**: [e.g., "A first-time player completes the first level without instructions within 2 minutes"]
- **SC-002**: [e.g., "90% of play sessions run without visible stutter on the reference phone"]
- **SC-003**: [e.g., (F-001) "Players can ..."]

## Assumptions

- [e.g., "Players have a phone with a modern browser released in the last ~4 years"]
- [e.g., "No accounts or online multiplayer in v1"]

## Out of Scope

- [Things deliberately excluded, e.g., "Native app store builds", "Monetization"]

## Clarifications

<!-- Appended by /speckit-clarify, one dated session per run. -->

## Changelog

| Date | Change | IDs affected |
|------|--------|--------------|
| [DATE] | Initial spec | F-001, US1–US2, FR-001–FR-003 |
