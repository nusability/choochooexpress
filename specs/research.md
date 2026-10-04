# Research: Choo Choo Express Delivery 3D

**Date**: 2026-10-03 | **Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

Each entry: Decision · Rationale · Alternatives considered. Numbers measured in this
environment are marked *(measured)*.

## R1. Toolchain and versions

- **Decision**: three 0.186.1, `@dimforge/rapier3d-compat` 0.21.0, Vite 8.3.2, TypeScript
  ~6.0.3, Vitest 5.0.3, ESLint 10 + typescript-eslint 8.71.0, `@playwright/test` 1.56.1, Node 22.
- **Rationale**: Latest stable releases on 2026-10-03. TypeScript 7.0 (native port) is `latest`,
  but typescript-eslint 8.71 declares `typescript >=4.8.4 <6.1.0`, so 6.0 is the newest version
  the linter supports. Vitest 5 accepts Vite 6–8. Playwright is pinned to 1.56.1 because that is
  the version whose Chromium build (chromium-1194) is preinstalled here; CI installs the same.
- **Alternatives**: TypeScript 7 without linting (rejected: the constitution requires lint);
  Playwright 1.63 (rejected locally: would need a browser download).

## R2. Rapier packaging and loading

- **Decision**: Use the compat package (WASM inlined as base64) and load it with a dynamic
  `import()` so Vite emits it as a separate chunk. Start loading during boot; the meta map is
  interactive before it finishes; a level waits for it only if it is not ready yet.
- **Rationale**: 0.21's WASM is 3.0 MB raw / 1.17 MB gzipped; the compat module is 4.3 MB raw /
  1.65 MB gzipped *(measured)*. Compat needs no Vite WASM plugin. Lazy loading keeps the first
  screen within NFR-002 (playable in 5 s on 4G) and the transfer within NFR-003.
- **Alternatives**: `@dimforge/rapier3d` with a separate `.wasm` (≈0.5 MB less transfer, but needs
  `vite-plugin-wasm` + top-level-await plugins — rejected for now, revisit if transfer becomes a
  problem); SIMD build (same size, Safari support varies).

## R3. Presentation-only toy physics

- **Decision**:
  - The engine decides every toy's fate: loaded into wagon *k*, or spilled at funnel *f*.
    `toyPhysics` spawns one rigid body per engine `load`/`spill` event at the funnel mouth
    above the wagon, with the wagon's velocity, so loaded toys land in their wagon. Spilled toys
    get a sideways kick so they land on the track bed under the funnel.
  - Wagons and the engine are kinematic bodies driven from engine poses every tick (floor +
    4 wall cuboids per wagon).
  - Settled toys are frozen. A toy in a wagon becomes an extra cuboid/ball collider on that
    wagon's kinematic body: it moves rigidly with the wagon and still supports later toys. A toy
    on the ground becomes a fixed collider. Rule: settle when speed relative to its wagon is below
    0.15 tiles/s for 8 ticks, or after 1.5 s.
  - Every toy is drawn with one `InstancedMesh` per toy type. Matrices are updated each frame
    only for moving toys and toys in wagons; ground toys keep fixed matrices.
  - Toy explosion (derailment): engine/wagons switch to dynamic bodies with impulses; up to 600
    toys are unfrozen with outward impulses; the rest stay frozen.
  - Physics world in tile units: `lengthUnit = 0.05`, gravity −11 tiles/s², 4 solver
    iterations, timestep 1/60. Zero-G funnels (Space Playroom) use gravity scale 0.35 on toys,
    spawned closer to the wagon rim.
- **Rationale**: *(measured)* 600 simultaneously dynamic 0.05-unit cubes pouring into a moving
  kinematic wagon cost ≈ 6.3 ms per step in Node on this machine; freezing keeps ≤ 150 bodies
  active (≈ 1–1.5 ms), leaving room in the 16.7 ms frame. Attaching colliders to a kinematic body
  at runtime works in 0.21 (verified: 55 colliders on one body). Because results come from the
  engine, physics noise can never change a score (Principle IV).
- **Alternatives**: Full physics for every toy (too slow on phones); purely animated (non-physics)
  pours (rejected: the prompt asks for Rapier and the tumbling look is the spectacle);
  ragdoll joints per toy (too expensive; single rigid bodies tumble convincingly at this size).

## R4. Determinism of the simulation

- **Decision**:
  - Fixed tick of 1/60 s. The render loop runs 0–4 ticks per frame from an accumulator and
    interpolates train poses between ticks (smooth on 120 Hz screens too).
  - Switch taps during a run are queued and applied at the start of the next tick; the
    run records `(tick, switchId)` pairs (replay format, contracts/engine-api.md).
  - Doses are emitted by distance, not time. A wagon passing funnel *f* receives toy *i*
    (i = 1…D) when its center crosses `spanStart + (i − 0.5) · L/D`. Every pass therefore
    yields exactly `D = Q·L/v` toys, independent of tick phase (FR-014).
  - Pile threshold as an integer: with `W_track = 0.4`, `L_funnel = 0.8`, `ρ_toy = 2500` and wheel
    height 0.1, `H_spill ≥ 0.05` ⇔ spilled count ≥ 40 exactly (FR-016/017; data-model §Constants).
  - PCG32 (XSH-RR, 64-bit state) implemented with `BigInt`, verified against the reference test
    vector (seed 42, stream 54 → `0xa15c02b7, 0x7b47f409, …`). Sub-streams via a 32-bit hash
    (`fmix32`) of (seed, label).
- **Rationale**: Integer, distance-based rules give identical outcomes on every device and frame
  rate (FR-011, SC-006) and make exact-score tests possible (SC-004/005).
- **Alternatives**: Time-based accumulation (±1 toy jitter per pass from tick phase — rejected);
  Xorshift128 (also acceptable per the prompt; PCG32 chosen for its published test vector).

## R5. Track model and backward level generation

- **Decision**:
  - **Model**: a tile grid (`cols × rows`, 1 tile = 1 unit). Each track tile holds directed
    *lanes* from an entry edge to an exit edge: straight (length 1) or quarter-circle curve
    (radius 0.5, length π/4). A **switch** tile has two lanes from the same entry edge; a
    **merge** tile has two lanes into the same exit edge. Track is one-way; no crossings.
  - **Router**: A* over states (tile, entry edge), moving straight or turning 90°. Cost: 1 per
    tile, +0.35 per turn, +0.15 next to existing track, plus seeded jitter in [0, 0.2) for
    variety. Paths that revisit a tile are rejected.
  - **Loops** come from a template catalog: a rectangle beside a straight stretch `M … W` of
    the route (M = merge, W = switch, chord 0–2 tiles), extending `a` tiles back, `b` tiles
    forward and `h` rows to the side. Its boundary path runs from W around to M. Circuit length
    `C` = W's diverging lane + loop tiles + M's merging lane + chord; switch window
    `Δt = (C − L_switchLane − L_train) / v` (data-model §Formulas).
  - **Backward construction** (FR-031): 1) Toy Store at the top edge (building on row 0, last
    track tile below it heading north). 2) Required factories N…1: each is a straight tile with
    the factory building on a free side tile, connected forward to the current route head by
    the router. The one factory chosen for a must-loop (levels ≥ 10) is placed inside a loop
    module whose window lies in [3, 6] s. 3) The depot: a straight run of
    `ceil(L_train + 0.3)` tiles near the bottom, routed to the head. 4) Distractors, in seeded
    order: *loop bay* (loop template on plain route tiles, window ≥ 1.2 s), *decoy* (switch on the
    route → router path through a decoy factory of an unordered type → merge downstream),
    *bypass* (switch → router path → merge after ≥ 1 required factory). 5) Initial switch states
    from the seed, with at least one set off-route (FR-034). 6) Tuning (doses, capacity).
    7) Props on free tiles.
  - **Retries**: an attempt that cannot place something throws; the next attempt uses
    `fork(seed, attempt)`. Up to 400 attempts; every campaign recipe is tested to succeed.
  - **Validation**: exact recipe counts; all loops `C > L_train + 0.5`; last funnel ≥
    `L_train + 0.3` before the store stop; standard (and secret) route replayed by the autopilot
    scores 1000 (1300) in unit tests.
- **Rationale**: A grid with 90° pieces looks like a toy track set, is easy to keep
  non-overlapping, and gives exact, analysable lengths for windows and costs. Templates make loop
  windows controllable. Routing only between placed waypoints keeps the backward recipe literal.
- **Alternatives**: Free-form spline networks (hard to keep planar and to compute windows);
  hand-made levels (contradicts the procedural requirement); allowing crossings (cluttered on a
  phone screen).

## R6. Scoring interpretation (A3)

- **Decision**: `N_correct` = weighted longest-common-subsequence between order lines and loaded
  lines (DP over lines, match value `min(q_i, n_j)` when types are equal). `N_total =
  max(Σ ordered, Σ delivered)`. `Score = round(1000·N_correct/N_total − 5·N_spilled + B)`, floored
  at 0. Stars: ≥750 → 1; ≥900 and spills ≤10 → 2; ≥1200, or a perfect run (N_correct = N_total =
  Σ ordered, 0 spills) → 3. Loaded lines come from the train's sequence of funnel *passes* (one
  pass = the train passing one funnel, attributed by wagon visit index), not from raw event
  order, so wagons interleaving at a Dual Factory cannot scramble the sequence.
- **Rationale**: Follows A3 literally where it is consistent, and resolves its contradiction
  (spec Clarifications). Max over ordered/delivered punishes both missing and extra toys.
- **Alternatives**: `N_total = Σ ordered` (rejected: extra toys would be free).

## R7. Dual routes, route cost and windows (A2)

- **Decision**:
  - **Cost**: `Cost(P) = Σ lane lengths from depot to store stop + 0.5 · (number of switch
    traversals in the facing direction)`. The switch delay is a cost term only; the train never
    slows down.
  - **Construction** for levels 22–28: the store, then a final merge `M_end` two tiles before the
    store. P1 is built backward from `M_end`'s straight entry: factories placed far apart (spread
    toward the board sides), one inside a standard loop. P2 is built backward from `M_end`'s side
    entry: a tight loop holding a Dual Factory (two funnels on two straight tiles of the loop,
    pouring two consecutive order types), plus a single factory if the order has 3 lines. Then a
    split switch `W0` right after the depot, routed to both route heads. Distractors are added
    afterwards, on P1 only, so P2 always passes fewer switches (FR-054).
  - **Window pairing**: pick P2's loop first with `Δt₂ ∈ [1.3, 2.5] s`, then P1's loop with
    `Δt₁ ≥ 3 s` and `Δt₂/Δt₁ ∈ [0.425, 0.575]` (0.5 ± 15%). Example *(computed)*: three wagons at
    1.3 tiles/s — a 2-row narrow loop (C = 5.14) gives 1.53 s, a 3-row narrow loop (C = 7.14) gives
    3.07 s, ratio 0.50.
  - **Acceptance**: `Cost(P2) ≤ 0.85 · Cost(P1)`, else retry.
  - **Bonus detection**: the engine's traversed lane list equals P2's lane list exactly
    (FR-057).
- **Rationale**: Matches the A2 diagram (P1: factory A → switch → factory B; P2: switch → dual
  factory A+B) and the three constraints, while staying checkable in unit tests (SC-005).
- **Alternatives**: Measuring "secret" by distance tolerance (rejected: A3 says "if P2 was taken").

## R8. Camera

- **Decision**: `PerspectiveCamera`, FOV 30°, fixed pitch 56° and yaw −14° (near-isometric
  diorama look). State = target point on the board plane + distance; damped toward goals
  (critically damped smoothing, settles < 0.6 s). Overview distance computed so the board's
  8 corners fit the viewport minus HUD insets. Zoom range: overview × 1.15 → close-up where a
  wagon is ~⅓ of the screen width. Pinch keeps the world point under the fingers fixed. Follow
  mode targets the train's middle with look-ahead. Pan is clamped to the board.
- **Rationale**: Low FOV gives the "orthographic/low-FOV hybrid" look while keeping depth cues;
  a fixed angle keeps tap targets predictable.
- **Alternatives**: `OrthographicCamera` (flatter, less diorama depth); `OrbitControls` (too free,
  fights tap detection).

## R9. Input

- **Decision**: Pointer Events on the canvas with `touch-action: none`. Tap = < 10 CSS px movement
  and < 350 ms; taps are delivered immediately (no double-tap delay), and a second tap within
  300 ms / 30 px also fires `doubleTap`. One pointer drag = pan; two pointers = pinch + pan; wheel =
  zoom. Picking: switches first, in screen space (nearest projected switch within 22 px), then the
  train (projected bounding boxes + 16 px slack), then empty space. iOS: `gesturestart`
  prevented, `dblclick` prevented, `overscroll-behavior: none`, `user-select: none`,
  `-webkit-touch-callout: none`.
- **Rationale**: Immediate taps keep switch flips responsive (critical for 1.5 s windows);
  screen-space picking gives ≥ 44 pt targets without enlarging meshes (FR-044).
- **Alternatives**: Raycasting meshes for switches (small targets in overview).

## R10. Rendering and art pipeline

- **Decision**: Procedural everything. Canvas-generated textures (wood grain, cardboard
  corrugation, felt noise, rug pattern, candy stripes, sand, starfield). Static board geometry is
  merged per material; sleepers, toys and repeated props are instanced. Track = swept profiles
  (bed + two rails) along lane paths, 8 segments per curve. `MeshStandardMaterial` (rough, warm)
  for the scene; `MeshLambertMaterial` for toys (cheapest lit material for thousands of instances).
  Directional light with PCF soft shadows covering the board; hemisphere fill. ACES tone mapping,
  sRGB output. Adaptive quality: if the 2 s average frame time exceeds 18 ms, step down (shadows
  1024 → off, DPR 2 → 1.5 → 1.25); never steps up during a level.
- **Rationale**: Zero asset downloads (NFR-002/003), consistent handmade look (NFR-013), and the
  draw-call budget is met by merging and instancing.
- **Alternatives**: glTF assets (download weight, authoring time).

## R11. UI layer

> **Superseded by R18** (2026-10-03): F-008 / NFR-015 require the whole interface to be 3D, so the
> DOM overlay below was replaced. Kept for the record.

- **Decision**: Plain DOM + CSS overlay (no framework). Layout uses `100dvh`,
  `env(safe-area-inset-*)`, `viewport-fit=cover`; all buttons ≥ 44 × 44 pt. Toy icons are inline
  SVG (shape + color, NFR-011). The HUD updates from engine state at most every frame, writing only
  changed text.
- **Rationale**: Small, fast, and keeps the canvas free for the game (constitution).
- **Alternatives**: React/Preact (unneeded dependency).

## R12. Audio

- **Decision**: WebAudio-synthesized effects (switch click, locked clunk, whistle, chuff, pour
  hiss, spill patter, boing + pop, delivery jingle, star chimes); `AudioContext` created/resumed on
  the first pointer-down; suspended when hidden; mute persisted in the save.
- **Rationale**: No audio files to download; NFR-010.
- **Alternatives**: Audio sprite file (≈ 300 KB).

## R13. Persistence

- **Decision**: `localStorage["ccxd3d.save"]`, JSON v1 (contracts/save-format.md). Pure
  `progress.ts` parses/validates (fresh start on any error) and applies results (best stars and
  score never decrease). `platform/storage.ts` probes availability (write/remove a test key); if
  unavailable, play continues and a notice is shown (FR-050).
- **Rationale**: Simple, synchronous, enough for a few KB.
- **Alternatives**: IndexedDB (async, unnecessary).

## R14. Delivery to GitHub Pages

- **Decision**: `.github/workflows/deploy.yml`, triggered on push to `main`, pull requests and
  manual dispatch. Job **check** (all events): `actions/checkout@v7`, `actions/setup-node@v7`
  (Node 22, npm cache), `npm ci`, typecheck, lint, unit tests, build, Playwright smoke test
  (`npx playwright install --with-deps chromium`). On `main` only: `actions/configure-pages@v6`,
  `actions/upload-pages-artifact@v5` (`dist/`), then job **deploy** with
  `actions/deploy-pages@v5` in the `github-pages` environment (`pages: write`, `id-token: write`).
  Vite `base: './'` so the site works under `/<repo>/`. The owner sets **Settings → Pages →
  Source: GitHub Actions**.
- **Rationale**: Latest action majors on 2026-10-03 *(checked via tags)*; one workflow gives PR
  checks and deployment (constitution: nothing reaches `main` with a failing check).
- **Alternatives**: Deploy from a `gh-pages` branch (needs a committed build).

## R15. Testing approach

- **Decision**: Vitest unit tests for every engine module, including: PCG32 vectors; generator
  determinism and exact recipe counts for all 28 levels; autopilot replays (standard route =
  1000 / 3★, secret route = 1300); window/cost constraints; fill/spill/derail threshold edge cases
  (39 vs 40 toys); scoring acceptance examples; save parsing. Playwright smoke test in Chromium
  with iPhone-16-sized mobile emulation: boot → map → level 1 → flip switch via the test hook's
  screen coordinates → Go → result shown. The page exposes `window.__ccx` (read-only state +
  helpers) and accepts `?speed=N` (N ticks per frame) and `?autoplay=1` for tests.
- **Rationale**: Constitution V; fast, deterministic checks in CI.
- **Alternatives**: WebKit e2e (browser not installed here; Chromium emulation is the smoke
  layer, the real check is on the device).

## R16. Biomes

- **Decision**: Living Room Rug (warm wood table, patterned rug base, pillow mountains, letter
  blocks), Candy Kingdom (pink felt base, lollipop trees, gumdrops, marshmallow arches, syrup
  drips), Garden Sandbox (sand base with dunes, buckets, spades, rotating windmills with puff
  particles), Space Playroom (dark blue felt, emissive "glow" rails, planets, rockets, star
  stickers, zero-G funnel look). Decorative only (FR-049).
- **Rationale**: Distinct silhouettes and palettes per biome with cheap procedural props.

## R17. Onboarding

- **Decision**: Contextual hint bubbles: level 1 ("Tap a switch to change the track", "Tap GO"),
  level 2 (fill bars / don't overfill), level 10 (flip the loop switch while inside the loop),
  level 22 ("A faster route exists…"). Hints never block input and are shown once per level
  until passed.
- **Rationale**: SC-001 (pass level 1 within 2 minutes without help).

## R18. 3D interface layer (F-008)

- **Decision**: The interface is a set of three.js scenes drawn after the game scene on the same
  canvas, each after clearing the depth buffer: `hud` (title bar, order card, gauges, controls),
  `cards` (dim backdrop + modal card) and `top` (toasts, celebrations). One perspective camera
  serves all of them, placed so that **1 world unit = 1 CSS pixel on the plane z = 0** with the
  y axis pointing up (`y = −screenY`); its field of view is chosen so the long screen side spans
  ±0.3 rad, so buttons near the edges show some side depth without distortion. Widgets are
  extruded, bevelled, rounded shapes (an ink-colored base slab under a colored cap, like the old
  CSS buttons' 4 px shadow), lit by a hemisphere + directional light with `toneMapped: false`, so
  the palette stays exact. Every static widget is one merged, vertex-colored geometry with one
  shared material (**one draw call**); parts that change often (counters, gauge fills) are small
  separate meshes rebuilt only when their value changes. Cards animate with scale/rotation
  (no transparency), and a reduced-motion setting freezes idle animation.
- **Rationale**: Owner requirement (F-008); keeps the draw-call budget (≈ 15 calls for the level
  HUD, ≈ 6 on the map); one material means one shader program for the whole interface.
- **Alternatives**: DOM overlay (old R11, rejected by the owner); `CSS3DRenderer` (still DOM);
  canvas-texture planes (flat, blurry when scaled; rejected as "not 3D").

## R19. 3D lettering

- **Decision**: Text is extruded glyph geometry from one bundled font: **Fredoka SemiBold**
  (SIL Open Font License 1.1, from `@fontsource/fredoka`), subset to printable ASCII plus
  `× − … ’ · – —` (102 glyphs). `scripts/build-font.mjs` (dev-only `opentype.js`) converts it into
  `src/ui/fonts/fredoka.json` (≈ 56 KB raw, 22 KB gz, outlines in font units) and copies the
  licence to `src/ui/fonts/OFL.txt`. At runtime each glyph is extruded once at unit size and
  cached; strings are composed by copying scaled glyph vertices with a color, so a counter
  rebuild costs microseconds. Helpers measure, wrap and shrink text to fit. Symbols the font
  lacks (arrows, check, star, warning, lock, rocket, train, sound, pause …) are 3D icon shapes
  defined in code (R20).
- **Rationale**: Crisp at any pixel ratio, truly 3D, no runtime font fetch, one asset.
- **Alternatives**: three's `TextGeometry` with typeface JSON (same idea, larger file, no rounded
  font shipped); SDF text (`troika-three-text`: extra runtime dependency, fetches fonts); system
  fonts on canvas (flat).

## R20. 3D icons, toy symbols and in-world markers

- **Decision**: Interface icons (back, pause, sound on/off, restart, follow, overview, close,
  arrow, check, warning, star, lock, rocket, train, burst, biome chevrons) are `THREE.Shape`s built
  in code and extruded with a small bevel. Toy symbols reuse the toy geometries from
  `graphics/toyMeshes.ts` (FR-062), merged into their card at a 3/4 angle or turning slowly where
  they are separate meshes. In the world, the floating switch buttons become one instanced 3D
  token mesh (turned toward the camera each frame), each factory gets its 3D toy model turning
  above it, building signs are 3D lettering merged into the static buildings batch, and the map's
  level markers and biome signs are merged 3D geometry (FR-060) — fewer draw calls than the
  sprites they replace.
- **Rationale**: One visual language; no textures for interface content.
- **Alternatives**: SVG → `SVGLoader` (the old icons are stroked outlines, which do not extrude
  cleanly).

## R21. Interface input and layout

- **Decision**: `ui/kit/uiInput.ts` listens to pointer events on `window` in the capture phase,
  before the board's `GestureRecognizer`. A pointer that goes down on a widget (top layer first,
  hit-tested against the widget's screen rectangle) or anywhere while a card is open is claimed:
  `stopPropagation()` keeps it from the canvas, the widget shows its pressed state, and it acts on
  release inside its rectangle; leaving the rectangle cancels. Unclaimed pointers reach the board
  untouched, so pinches and pans keep working with a finger resting on the HUD. On desktop the
  canvas cursor turns into a pointer over widgets. Safe-area insets are read from
  `env(safe-area-inset-*)` through an invisible probe element (not interface). Layout is computed
  per screen in CSS pixels: portrait (title bar + order card top, controls bottom) and "side"
  (`orientation: landscape` and height ≤ 540 px: order card left, controls right), as before; the
  board camera gets the same insets.
- **Rationale**: FR-063–FR-065; reuses the proven gesture code untouched.
- **Alternatives**: Raycasting widgets in 3D (more work, same result for flat-faced widgets).

## R22. Testing the 3D interface

- **Decision**: The test hook gains `widgets()`, listing the visible widgets as
  `{ id, label, text, x, y, w, h, enabled, layer }` in CSS pixels. Playwright taps widget centers
  through the touchscreen (the same path a finger takes). A new spec checks SC-011 (no visible
  DOM element other than the canvas on the map, in a level, on the results and on the level card)
  and SC-012 (every widget ≥ 44 × 44 px and inside the viewport, portrait 393 × 852 and landscape
  852 × 393). A unit test checks that the font subset covers every character the interface uses.
- **Rationale**: Constitution V; tests drive the real input path.
- **Alternatives**: Screenshot diffs (brittle under software rendering).

## R23. Whimsical motion (FR-066 – FR-068)

- **Decision**: Two layers. (1) **Shader wiggle**, for lettering and markers: every interface and
  label vertex carries `aWig` (phase, hop height, roll, speed) and `aPivot` (letter or object
  center); a few lines injected after `begin_vertex` (`onBeforeCompile`, shared `uWigTime` /
  `uWigOn` uniforms) make letters hop one after another (`|sin|` hops never dip below the
  baseline) and roll a little around their own center. Costs no draw calls and no CPU per frame,
  and works inside merged meshes (all 28 map medallions bob in one draw call). (2) **Springs** on
  the CPU for whole widgets (`UiItem`): idle breathing and wobble with a per-widget phase, squash
  on press and an under-damped spring on release (jelly bounce), impulse "kicks" for counters,
  toys and gauges, pop-in with optional spin (stars), shake (warnings), and cards that drop in
  with a springy wobble and twirl away (scale, roll, rise) before they are removed. World signs
  are small separate meshes that sway on the CPU while their letters hop in the shader. Touch
  rectangles never move (FR-068). Reduced motion sets `uWigOn = 0` and parks every spring.
- **Rationale**: Lively everywhere at negligible cost; keeps the one-material, one-draw-call
  widgets of R18.
- **Alternatives**: One mesh per letter (hundreds of draw calls); morph targets per animation
  (fixed motions, more memory); animating vertex buffers on the CPU (uploads every frame).


## R24. Gameplay v2 rules: timed batches, wagon chutes, score v2 (F-009)

- **Decision**: Each factory has `period` and `phase` in ticks and a `batch` size. On a tick
  `t ≥ 1` with `t mod period = phase`, the hopper point (the factory lane's midpoint, at a trail
  distance) is tested against the train's car spans (engine `[0, ENGINE_LEN + gap/2]`, wagon `k`
  `[wagonOffset(k) − gap/2, wagonOffset(k) + WAGON_LEN + gap/2]` behind the engine front). A wagon
  catches up to its free capacity and the rest spills; the engine spills the whole batch; no car
  means the batch is skipped. Periods are at least the train's passing time plus 0.6 s.
- **Score**: `correct_k = min(Q_k, wagon k's X_k toys)`, ratio over `Σ Q_k`, 1000 points × ratio,
  stars at 100% / 85% / 60%. No penalties for extras or spills (owner: "more toys than ordered
  should not punish the player"); spills still build piles and derail (FR-016/FR-017 rule kept).
- **Skipped drops**: The owner chose "spills onto rails" for missed drops; read literally, every
  factory would bury its track within a minute of a train waiting elsewhere. A drop therefore only
  spills when a car is under the hopper and cannot take it (engine or full wagon).
- **Rationale**: Timing becomes a decision (which branch, how many laps) and the wagon order
  becomes meaningful, while every rule stays integer and tick-exact (FR-011).
- **Alternatives considered**: Continuous pouring with timed "open" windows (harder to read, harder
  to tune); per-toy spawning at the drop (same result, more events) — batches are emitted as one
  `drop` event with counts and the presentation spawns the toys.

## R25. Slopes, bridges, crossings and tunnels in the engine (F-011, FR-077)

- **Decision**: `Lane` gains `z0`, `z1` (0 = ground, 1 = bridge deck), `speed` (factor: 0.6 up a
  ramp, 1.5 down, 0.6 on the station platform, 1 elsewhere) and `tunnel`. The simulation moves the
  engine by `baseSpeed × factor(lane under the engine front) × DT` per tick, carrying leftover
  distance across lane ends with the next lane's factor. A crossing is a tile holding two
  perpendicular straight lanes (`TrackGraph`'s entry map is keyed by tile and entry edge, so it
  needs no change); a bridge is a crossing whose one straight lane is lifted, with ramp tiles in
  line before and after. Car poses gain `z` and `pitch` from the lanes' heights.
- **Rationale**: Heights and speed factors are just more lane data, so the graph, the trail and
  replays work unchanged; the ramps make the owner's "slower uphill" detours possible.
- **Alternatives**: Continuous height fields (overkill); separate bridge pieces spanning two tiles
  (more special cases in the router).

## R26. Generator v2: forward construction with simulated timing (F-010, FR-081, FR-082)

- **Decision**: Depot at the bottom, Toy Station along the top row. The route is built forward:
  depot → required factories (each a straight tile with its building beside it, placed in bands
  from bottom to top so the route uses the whole board) → station. The A* router may cross a
  perpendicular straight single-lane tile (a crossing, from level 4) at extra cost. Distractor
  branches leave the route at a plain tile (switch) and rejoin it later (merge): decoy branches
  pass a decoy factory, bypasses skip a required factory or change the timing; a holding loop
  leaves at a switch and rejoins the route *before* it. Crossings are promoted to bridges (level 9+)
  where ramp tiles fit, and runs of 2–4 plain tiles become tunnels (level 12+). A kinematic run of
  the intended route records when each wagon centre passes each hopper; every required factory's
  phase is set so its drop hits its target wagon, batch sizes are drawn, `Q_k` sums the batches
  per wagon, and wagon capacity is `max Q_k` plus a small slack. A full simulation then checks:
  intended route = 100%; doing nothing < 60%; secret detour (if any) = 100% and plain route
  85–99%. A failing attempt retries with the next attempt seed; after many failures the recipe is
  relaxed step by step down to a minimal layout that always succeeds.
- **Rationale**: Forward construction reads naturally (bottom to top, filling the screen), and
  simulating the intended route makes timing exact by construction instead of by formula.
- **Alternatives**: Backward generation (v1) — kept the board compact but could not reason about
  timing; solving for phases analytically — fragile with slopes and loops.

## R27. Endless progression (F-010)

- **Decision**: `recipeFor(n)` derives everything from `d = min(n, 40)` with integer step tables
  and seed `hashSeed(0x5eedc0de, n)`; `worldOf(n)`, `levelLabel(n)` = "w-i". Save v2 keeps levels
  keyed by number with no upper bound; a v1 save is migrated as is (stars, best, secret, muted).
  Unlocks: level 1, and level `n + 1` once level `n` has a star.
- **Map**: The map shows three worlds (focused world ± 1) as plates in a column, rebuilt when the
  player taps the "earlier/later worlds" buttons or opens a level in another world.

## R28. Toy Station (FR-072)

- **Decision**: The station is a straight run of `ceil(trainLength + 0.6)` tiles along row 1,
  heading east or west, with its building row above. Its last lane is the store lane; the train
  stops when the engine front reaches its end (the buffer stop). Chute `k` sits at the stopped
  wagon `k`'s centre, which is a fixed distance behind the buffer, so the presentation places
  chutes from `wagonOffset(k)`.

## R29. Full-screen dioramas (FR-094)

- **Decision**: The table, frame and base box are replaced by one large ground plane (biome
  texture, 6× the board size) and a scattering of props outside the board; the overview camera
  fits the board's width (with a small margin) between the HUD bars and is allowed to crop the
  ground. Boards are portrait (7 × 12 up to 10 × 18).

## R30. Readable switches (FR-095)

- **Decision**: The floating switch button shows a bold arrow (MeshBuilder icon) whose direction
  follows the set branch relative to the travel direction, projected to screen space each frame
  (the button faces the camera, so the arrow rotates in its plane). Track chevrons are 1.6× larger
  with a dark outline layer and sit above the rails; the unset branch's chevron is a small grey one.

## R31. Shunting model (F-014)

- **Decision**: An undirected tile railway. Each track tile is a *piece*: plain (two edges),
  crossing (two straight pairs), switch (stem + two branches), or buffer (one edge, a dead end).
  The train is a list of cells front to back (`tile`, entry edge, exit edge); one car per tile.
  A step moves the front car into the next tile and every other car into the tile of the car in
  front of it (the trail), so switch changes only ever affect the front. Facing moves follow the
  switch; trailing moves always pass. At a buffer the train reverses: the cell list is reversed
  and each cell's edges swapped. Running into a standing wagon couples its whole group (one
  step, no movement). Uncoupler pads cut the train at a reversal: the part on the buffer side of
  the pad nearest the engine stays standing.
- **Rationale**: Discrete, tile-sized cars make sidings' capacity and every outcome exactly
  predictable (the owner's main complaint was unpredictable timing), and the trail rule keeps
  coupled cars consistent through switches in both directions.
- **Alternatives**: Keeping the continuous lane model (car lengths ≠ tiles, unreadable capacity);
  player-driven moves (no "prediction" puzzle; the owner preferred "plan, then let it go").

## R32. Factories and switch kinds (FR-102, FR-108)

- Factories act on every wagon entering their tile (each car enters a new tile every moving
  step). Loader fills empty wagons; single loader at most one per *visit* (a visit ends when no
  car is on the tile); converter A→B; washer empties; swap A⇄B.
- Switch kinds: manual; alternating (flips after each facing pass of the front car); linked
  groups (one setting for all, flipping one flips all); trigger (each trigger plate the front car
  enters flips its switches). "Sprung" was dropped: with trail-following cars it behaves like a
  manual switch.

## R33. Generation by outcome enumeration (FR-107)

- **Decision**: Build a random yard (depot, station, main line, dead-end sidings, run-around
  loops, wagons, factories, special switches), then run *every* plan in a bounded plan space:
  all switch settings (one bit per linked group) × up to `pads` uncouplers on candidate tiles
  (plain tiles within one train length of a buffer). Successful station arrivals are grouped by
  the wagon sequence they deliver. The goal is chosen among sequences that the default plan does
  not deliver, preferring rare ones (few solving plans) with the reversals / uncouplings /
  factory visits the difficulty asks for. Par = fewest steps among the solving plans found.
  A deterministic hash of the full state per step detects endless loops.
- **Rationale**: Solvable by construction, difficulty measured from actual solutions, no
  hand-tuned timing. The search is bounded (cap on plans), so a player may beat par — welcome.
- **Budget**: ≤ ~2,000 plans × ≤ 250 steps per attempt; levels cached; the map pre-generates.

## R34. Playback and scrubber (FR-098)

- The run is computed in full at Go into frames (cells, standing groups, switch states, wagon
  contents, events). Playback interpolates car poses between frames along the piece geometry
  (old tile centre → shared edge → new tile centre). The scrubber is a 3D bar in the HUD with
  event ticks and a locomotive playhead; dragging maps x to a fractional step.

## R35. No toy physics in shunting puzzles (F-014)

- **Decision**: Rapier and `src/physics/` were removed. Wagons show their load as a few toy models
  (instanced per toy type); factories puff when they change a wagon. Nothing pours, so there is
  nothing for physics to animate, and the download shrinks by the 1.7 MB (gzip) Rapier chunk.
- **Constitution**: Rapier stays an *approved* dependency (Principle VI) should a later feature need
  it; Principle IV (logic/render separation) is unchanged.

## R36. Introduction levels need what they teach (FR-110)

- **Problem (owner playtest)**: level 1-3 explained uncouplers but its goal needed none (and
  uncoupling failed it); 2-2 explained the converter, which its solution never used.
- **Decision**: `yardRecipe` marks the level that introduces each mechanic (`LESSONS`: pad 3,
  washer 5, converter 9, linked 11, single 13, trigger 15, swap 17). Such a level always has the
  factory it teaches, keeps the mechanic through the generator's relaxation steps, and picks a
  common goal. `chooseGoal` keeps only goals for which *every* solving plan found needs the
  mechanic (`needsLesson`): pads — the run uncouples; factory kinds and trigger plates — the same
  plan without them delivers a different train; linked — the plan flips the pair and the train
  runs over both. The hint comes from `level.lesson`, so it cannot drift from the generator.
- **Pads on buffers**: a pad cut leaves `cars[0..k]` with k ≥ 1 when only plain track takes pads,
  because the outermost wagon stands on the buffer tile. Leaving exactly one wagon was impossible,
  so 2-wagon yards could never use a pad. Dead-end buffers (not the station's) now take pads too.
  This changes the plan space, so many levels got new goals and pars.
- **Washer lesson**: the taught washer stands on a run-around loop leg and one wagon starts
  loaded, so the player decides whether to wash.

## R37. Generated textures and a wooden toy look (FR-111)

- **Decision**: All surfaces are canvas-generated at load (`graphics/textures.ts`): grayscale detail
  maps (painted wood grain, planks, bricks, shingles) that multiply vertex colors, so one material
  per surface textures every building in one draw call (`GeoBatch` projects UVs per box face);
  a per-biome grooved track texture swept along the lanes (u along the track, v across, grooves at
  the rail gauge); floor textures (parquet, gingham, lawn with flowers, space carpet) and a play
  mat drawn for the yard's exact size (rug medallion and borders, frosted cake with sprinkles,
  sandbox with a wooden frame, glowing space grid).
- **Wheels**: car origins sit on the track top; wheels are at the rail gauge, sunk a little into
  the grooves (before, they stood at the bed's base and outside the rails).
- **Budgets** (`?debug=1&quality=0`, levels 30/40): 66–69 draw calls, ~155k triangles; initial JS
  231 KB gzipped. Floating labels, switch tokens, gears and off-board props cast no shadows.

## R38. Real sizes, looking around and smooth coupling (FR-111, FR-112)

- **Real sizes**: a tile is ~10 cm next to a wooden train, so room things are drawn at 2–8× their
  old size (`PROP_SIZE` in `graphics/yardView.ts`) and placed off the mat, apart, and on the
  camera's side only when low or far enough not to hide the yard. They are outside the shadow map,
  so each gets a soft blob shadow (one transparent mesh). The generator's props on free tiles
  become small things at true size (`INSIDE_PROPS`).
- **Camera**: `CameraController` keeps yaw and pitch (base −8° / 60°); `rotateAt` turns around the
  ground point under the fingers, `tilt` clamps pitch to 28–88°, `resetView` returns to the base
  angles and the overview (overview framing is always computed at the base angles).
  `GestureRecognizer` decides each two-finger gesture once it has moved 12 px: both fingers side by
  side moving the same way vertically without spreading is a tilt; anything else pinches, pans and
  twists at once. Signs carry their anchor as a vertex attribute and turn in the vertex shader by
  the camera's turn, so the merged sign mesh stays one draw call.
- **Coupling**: the engine spends a step coupling without moving any car; playback gives such a
  step 5% of a step's time (`COUPLE_STEP`), so the train does not visibly stop. Step counts and par
  are unchanged.

## R39. Designing levels around their solution (FR-107 amended)

- **Problem (owner playtest)**: random yards with a goal picked afterwards gave uneven difficulty
  and many factories no solution needed.
- **Decision**: `design()` in `yardGen.ts`:
  1. *Skeleton*: station, depot, main line, sidings, loops, wagons, special switches; no factories.
  2. *Intended plan*: among the skeleton's arrivals, one with about the recipe's reversals and
     uncouplings (insisting on uncoupling when the recipe has pads), preferring the recipe's goal
     length.
  3. *Route factories*: added one at a time on tiles the intended run's wagons enter, with the
     starting loads; each kept only if every factory so far changes the delivered train.
  4. *Decoys*: sometimes a decoy siding (its switch set to pass in the intended plan), then
     `recipe.decoys` factories (0 early, at most 2 late) on tiles the intended run never touches.
  5. *Verify*: the goal is what the intended plan delivers; the untouched yard must not deliver
     it; the solver's solving plans (plus the intended one) give par; lessons are checked; the
     shortest solution must use at least half the factories and leave at most `decoys + 1` unused.
  6. *Pick*: up to four successful designs per level; the one whose `difficultyScore` (reversals,
     uncouplings, factories used, switches to set, how rarely plans succeed, steps) is closest to
     the recipe's `target` (ramping 4 → 17), with a penalty for pad levels that need no pad.
- **Solver**: `enumeratePlans` lists every switch setting without pads first, then samples pad
  placements, so big yards still find their pad-free routes.
- **Result**: difficulty scores rise from ~5 (level 1) to ~15 (ceiling); about half the later
  levels need an uncoupler; generation ≤ ~1.9 s per level in Node.

## R40. Toys per biome and four more worlds (FR-113, FR-114)

- 62 toy models (`graphics/toyModels.ts`), built from primitives, ≤ ~700 triangles each; ten per
  biome (`engine/toys.ts`), some shared. Each toy has a hue; a level's palette takes toys of
  different hues. Wagons only build instanced meshes for the toys the level can carry.
- New biomes: Icy Pond (snow floor, frozen-pond mat with skate marks, snowy trees, igloos),
  Model Railway Village (flock grass, patchwork fields, ballast track with metal rails and
  sleepers, half-timbered houses), Toy Shop (checker tiles, display table with felt, shelves),
  Car Play Rug (town mat with roads and a ring road where little cars drive; carpet floor).
  Props can be any toy (`toy:<type>`, ten times a wagon load at scale 1).

## R41. A comic diorama look with scenes (FR-115 – FR-117)

- **Reference**: Railbound (comic-book cel shading with geometry-based contours, compact diorama
  islands, characters) and Train Valley 2 (flat low-poly, terrain slabs, dense clustered
  dressing). Colors stay saturated (owner preference).
- **Toon**: `MeshToonMaterial` with a 4-step ramp replaces the standard materials in the yard and
  the map (`graphics/toon.ts`). Outlines are inverted hulls: the mesh again, back faces only,
  pushed out in clip space along normals averaged per position (so hard edges stay closed) by a
  constant number of screen pixels; instanced meshes get instanced outlines sharing their
  matrices. Outlined: buildings, track beds, diorama, props, train cars, wagon loads, traffic,
  pads. Not outlined: signs (they have rims), markers, gears, spinners.
- **Diorama**: `graphics/diorama.ts` stacks rounded, bevelled layers under the mat per biome and
  adds trimmings (rug fringe, frosting drips and cherries, turf and pebbles, bolts, icicles, table
  legs, jigsaw edges); the floor and room props sit at −depth.
- **Scenes**: `graphics/vignettes.ts` finds open 2 × 2 and 2 × 1 patches (no track, building,
  depot or station), keeps a tile of air around each scene and uses each scene once; up to four
  per level. Scenes per biome are data (items with offsets, facing, scale, height). Outside, three
  to five room scenes stand in slots behind and beside the diorama, never on the camera's side.
- **Budget**: switch buttons and badges became instanced stamps (one mesh per model); busiest
  levels 77–87 draw calls mid-run at `quality=0`, 150–180k triangles; initial JS 251 KB gzipped.
