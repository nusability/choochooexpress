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

