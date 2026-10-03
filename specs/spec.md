# Game Specification: Choo Choo Express Delivery 3D

**Created**: 2026-10-03 | **Last Updated**: 2026-10-03 | **Status**: Ready for planning (v2)

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

Choo Choo Express Delivery 3D is a cozy-but-chaotic toy train puzzle game. The player flips
track switches in real time to steer a little toy train through a tabletop diorama, collecting
hundreds of tiny tumbling toys from toy factories and delivering exactly the right toys, in the
right order, to a Toy Store. The world looks like a lovingly handmade diorama of cardboard,
wood, felt and plastic track, warm and playful. Mistakes are funny rather than punishing: an
over-full wagon spills toys onto the rails, and running into a toy pile ends in a harmless,
comical "toy explosion".

**Elevator pitch**: Flip switches, fill wagons with pouring toys, and deliver the perfect order —
without burying your own railway in rubber ducks.

**Target player**: Casual and puzzle players on their phones, in short sessions (a few minutes
on the sofa or in a queue), who enjoy "one more level" puzzles with a tactile, toy-box feel.

## Platform & Play Context *(mandatory)*

- **Platform**: Mobile web browser, played in a browser tab with no install; also playable in
  desktop browsers. The released version is published as a public web page.
- **Reference device**: iPhone 16 (60 Hz display) in Safari. All performance targets are
  measured on it.
- **Primary input**: Touch — tap switches, tap Go, tap the train to follow it, pinch to zoom,
  drag to pan.
- **Secondary input**: Mouse on desktop — click as tap, drag to pan, scroll wheel to zoom.
- **Orientation**: Portrait first; landscape supported.
- **Session length**: 1–3 minutes per level; endless levels in worlds of 7 (F-010).
- **Connectivity**: Needs a connection to load; once a level is loaded it plays without network.

## Core Game Loop *(mandatory)*

1. Pick an unlocked level on the meta map (levels are endless, in worlds of 7).
2. Read the order — one chute per wagon, each wanting a toy type and quantity — and study the board
   in overview: factories with their countdowns and batch sizes, switches, crossings, bridges,
   tunnels; set the switches.
3. Tap **Go** — the train leaves the Depot and the factory clocks start.
4. Flip switches in real time so that each factory drops its batch into the right wagon: choose
   branches, wait in a holding loop, or take a slower climb to arrive at the right moment. Avoid
   dropping batches on the engine or into full wagons (spills, piles, derailment).
5. The train drives into the Toy Station; each wagon tips its toys into its chute; the payload is
   scored (percentage of wanted toys delivered) and earns 0–3 stars.
6. Passing a level unlocks the next one, without end.

**Win / lose / end conditions**: A run ends when the train stops in the Toy Station (scored; the
level is passed with at least 1 star, i.e. 60% of the wanted toys) or when the train derails into
a toy pile (no score, retry). The player can restart at any time.

## Features

### F-001: Track Network, Train & Real-Time Switches

**Added**: 2026-10-03 | **Input**: Prompt §1 "Core Concept", §5.1 "The Train & Wagons", §4
"Inject mandatory switches"

**Summary**: A toy train runs on a one-way track network from a Depot to a Toy Store. The player
steers it by flipping switches before departure and while it runs. This is the heart of the game.

#### User Story US1 - Route the train with switches (Priority: P1)

As a player, I set and flip track switches — before departure and while the train is moving — to
steer the toy train from the Depot to the Toy Store.

**Why this priority**: Without a moving train and working switches there is no game.

**Independent Test**: Open level 1 on a phone, tap the switch so it points toward the Toy Store,
tap Go; the train follows the switch and stops at the Toy Store.

**Acceptance Scenarios**:

1. **Given** a level in the planning phase, **When** the player taps a switch, **Then** it
   changes to its other branch with a visible and audible flip, and the train later follows that
   branch.
2. **Given** the train is running and a switch ahead is free, **When** the player taps it,
   **Then** the engine takes the new branch when it reaches the switch.
3. **Given** any part of the train is on a switch, **When** the player taps that switch,
   **Then** it does not change and shows "locked" feedback.
4. **Given** the train is circling a loop, **When** the player flips the loop's switch after the
   last wagon has cleared it, **Then** the train leaves the loop the next time it arrives there.
5. **Given** the engine reaches the Toy Store, **Then** the train stops and the delivery is
   scored.

#### Functional Requirements (F-001)

- ~~**FR-001**: Each level MUST show a tabletop board with a one-way track network that links one
  Depot to one Toy Store using straight and curved track, switches (one track splitting in two),
  merges (two tracks joining) and loops.~~
  *Superseded (2026-10-03) by FR-094: the board fills the screen; crossings, bridges and tunnels (FR-086–FR-088) join the track pieces.*
- ~~**FR-002**: The train MUST consist of one engine pulling 1–4 open wagons. It moves forward only,
  at a constant speed set by the level, and every wagon follows exactly the path of the engine.~~
  *Superseded (2026-10-03) by FR-077: speed now varies with slopes and the station platform.*
- **FR-003**: Each level MUST start in a planning phase with the train waiting at the Depot; game
  time does not run until the player taps **Go**.
- **FR-004**: When the engine reaches a switch, the train MUST take the branch the switch is set
  to at that moment.
- ~~**FR-005**: The player MUST be able to flip a switch with a single tap during planning and
  while the train runs. A switch MUST NOT change while any part of the train is on it (the tap
  shows "locked" feedback instead), and switches cannot be flipped while the game is paused.~~
  *Superseded (2026-10-03) by FR-096: switches are set during planning only (F-014).*
- **FR-006**: Each switch MUST show which branch is active by shape (an arrow and a raised rail),
  not by color alone; flipping is animated and makes a click sound.
- ~~**FR-007**: When the engine reaches the Toy Store, the train MUST stop and the delivery is
  evaluated (F-003).~~
  *Superseded (2026-10-03) by FR-072: the Toy Store is a station with one chute per wagon.*
- **FR-008**: The network MUST have no dead ends: from any position on the track, some setting of
  the switches leads to the Toy Store. A train may circle a loop indefinitely until rerouted.
- **FR-009**: Every loop the train can enter MUST be longer than the train plus a safety gap, so
  the engine never runs into its own wagons.
- **FR-010**: The player MUST be able to pause, resume and restart at any time; restarting
  restores the exact initial state (board, switch settings, empty wagons, no piles).
- **FR-011**: Given the same level and the same switch flips at the same moments of game time, a
  run MUST always have the same outcome (route, loaded toys, spills, derailment, score),
  independent of device and frame rate.

#### Edge Cases (F-001)

- A tap that lands exactly as the engine reaches a switch: flips made before the engine reaches
  the switch count; once the engine is on it, the switch is locked.
- Two quick taps on the same free switch flip it twice (back to where it was).
- The phone is rotated or the browser resized mid-run: the view refits and the run continues
  unchanged.
- The tab is hidden or the phone locked mid-run: the game pauses automatically and resumes only
  when the player taps to continue.
- The player never routes the train to the Toy Store: the train keeps running loops; the player
  can restart at any time.

---

### F-002: Toy Factories, Wagon Loading & Spills

**Added**: 2026-10-03 | **Input**: Prompt §5.2 "Toy Dispensers", §5.3 "Overflow & Derailment",
Addendum A1 "Deterministic Flow & Capacity Equations"

**Summary**: Factories pour streams of tiny toys into the wagons passing beneath their funnels
like colorful sand. Wagons have limited room; overflow spills onto the rails and builds piles;
driving the engine into a big pile derails the train in a comical toy explosion.

#### User Story US2 - Fill the wagons without burying the rails (Priority: P1)

As a player, I watch toys pour into my wagons as the train passes under factory funnels, and I
avoid overfilling them, because spilled toys pile up on the track and a big pile derails my train.

**Why this priority**: Loading toys is what the deliveries are made of and is the game's main
spectacle; spills and derailments are what make routing mistakes matter.

**Independent Test**: In a level with one factory, run the train under the funnel once (wagons
fill, nothing spills), then loop back under it again (wagons overflow, a pile forms), then loop a
third time (the engine reaches the pile and the train derails).

**Acceptance Scenarios**:

1. **Given** an empty wagon passes under a factory's funnel, **When** it leaves the funnel,
   **Then** it holds exactly that factory's dose of toys, which were shown pouring in.
2. **Given** a wagon with less free room than the dose, **When** it passes under the funnel,
   **Then** the toys that do not fit spill onto the track under the funnel and the spill counter
   rises by that amount.
3. **Given** a pile under a funnel at least half as high as the train's wheels, **When** the
   engine reaches that funnel, **Then** the train derails in a toy explosion and Retry is offered.
4. **Given** a pile lower than half the wheel height, **When** the engine passes it, **Then** the
   train continues normally.
5. **Given** the train follows a level's standard route, **Then** no wagon overflows.

#### Functional Requirements (F-002)

- ~~**FR-012**: Each factory MUST produce one of five toy types — blocks, ducks, cars, balls and
  stars — each with its own shape and color. A Dual Factory (F-007) has two funnels in a row and
  pours two different types one after the other.~~
  *Superseded (2026-10-03) by FR-069: factories drop timed batches; Dual Factories are gone.*
- ~~**FR-013**: A funnel MUST pour only while a wagon is underneath it; the engine never receives
  toys.~~
  *Superseded (2026-10-03) by FR-070: the car under the hopper at drop time catches the batch.*
- ~~**FR-014** *(Fill Condition, A1)*: A wagon passing under a funnel MUST receive
  `Q_pump × (L_funnel ÷ v)` toys of that factory's type, where `Q_pump` is the factory's pour
  rate (toys per second), `L_funnel` the funnel's length along the track and `v` the train speed.
  Levels are tuned so that on a valid route this dose equals exactly the per-wagon amount the
  order needs (`V_target`).~~
  *Superseded (2026-10-03) by FR-069/FR-070: batch sizes replace the fill condition.*
- **FR-015**: Each wagon MUST hold at most `C_wagon` toys in total; toys that do not fit spill onto
  the track under that funnel.
- ~~**FR-016** *(Spill pile, A1)*: Spilled toys MUST build a pile under each funnel whose height is
  `H_spill = S ÷ (W_track × L_funnel × ρ_toy)`, where `S` is the total number of toys spilled at
  that funnel so far (all wagons, all passes), `W_track` the track width and `ρ_toy` the toys'
  packing density. Piles do not shrink during a run.~~
  *Superseded (2026-10-03) by FR-074: piles build per factory from spilled batches, same height rule.*
- ~~**FR-017** *(Derailment, A1)*: When the engine reaches a funnel whose pile has
  `H_spill ≥ 0.5 × wheel height`, the train MUST derail: the engine and wagons tip over and their
  toys burst out in a comical, non-violent toy explosion; the run ends without a score and Retry
  is offered.~~
  *Superseded (2026-10-03) by FR-074: the derailment rule is unchanged but applies to factory hoppers.*
- **FR-018**: Toys MUST be shown individually pouring, tumbling and settling; wagons visibly fill,
  and spilled toys stay visible on and beside the track. Every loaded toy is shown in its wagon and
  every spilled toy on the ground, so what the player sees matches the counts in FR-014–FR-016.
- **FR-019**: Each wagon's fill level MUST be shown at all times, with a warning style once a wagon
  is at least 90% full.
- **FR-020**: On every valid route (the standard route and, where present, the secret route) no
  wagon may overflow and no pile may form.

#### Edge Cases (F-002)

- A wagon that is already full passes a funnel: the whole dose spills.
- The same funnel is passed several times: its pile grows with every overflow, from every wagon.
- A decoy factory (a toy type the order does not want) loads like any other factory, using up
  wagon room that later loads may need.
- A pile exactly at the threshold derails the train (the rule is "at least").
- The train derails while toys are still pouring: pouring stops.
- A toy explosion throws hundreds of toys at once: the game stays smooth (NFR-001).

---

### F-003: Orders, Scoring & Stars

**Added**: 2026-10-03 | **Input**: Prompt §5.4 "Scoring & Star System", Addendum A3 "Precision
Scoring Formula"

**Summary**: Every Toy Store wants a precise order — certain toys, in certain quantities, in a
certain sequence. Delivering it earns points and 1–3 stars.

#### User Story US3 - Deliver the order and earn stars (Priority: P1)

As a player, I can see what the Toy Store wants and how my load compares, and when the train
arrives I get a clear score and stars that reward accuracy and tidy (spill-free) driving.

**Why this priority**: The order gives the routing puzzle its goal; stars give a reason to replay.

**Independent Test**: Play level 1 perfectly and see 1000 points and 3 stars; play it again with
an extra loop under the funnel and see spills deducted and fewer stars.

**Acceptance Scenarios**:

1. **Given** the order "60 ducks → 45 blocks" on a level without a secret route, **When** the
   train delivers 60 ducks and then 45 blocks with no spills, **Then** the score is 1000 and the
   result is 3 stars.
2. **Given** a delivery with every ordered toy correct and 12 spilled toys, **When** it is scored,
   **Then** the score is 940 and the result is 1 star (2 stars need at most 10 spills).
3. **Given** the order "ducks → blocks", **When** the train loads blocks first and ducks second,
   **Then** only the part that is in sequence counts as correct and the score drops accordingly.
4. **Given** a score below 750, **When** the train arrives, **Then** the store refuses the order,
   the level is not passed and Retry is offered.
5. **Given** any completed delivery, **Then** the results screen shows stars, correct and total
   toys, spills, bonus, final score and personal best.

#### Functional Requirements (F-003)

- ~~**FR-021**: Each Toy Store MUST show an order: a sequence of 1–4 lines, each a toy type and a
  quantity (the total for the whole train). The order, with live counts of what has been loaded
  so far, MUST stay visible throughout the level.~~
  *Superseded (2026-10-03) by FR-073: one order line per wagon chute.*
- ~~**FR-022**: The *loaded sequence* MUST be the list of toy types in the order they were loaded,
  with consecutive loads of the same type merged into one line (with their quantities added).~~
  *Superseded (2026-10-03) by FR-074: the loaded sequence no longer matters; wagon contents do.*
- ~~**FR-023**: `N_correct` MUST be the largest number of delivered toys that can be matched to the
  order in sequence: each order line can be matched to at most one loaded line of the same type,
  matches must keep the order's sequence, and a match counts at most the ordered quantity.
  `N_total` MUST be the larger of the total ordered and total delivered toy counts, so both missing
  toys and extra toys lower the ratio.~~
  *Superseded (2026-10-03) by FR-074.*
- ~~**FR-024** *(Score, A3)*: `Score = 1000 × (N_correct ÷ N_total) − 5 × N_spilled + B_efficiency`,
  where `N_spilled` is the number of toys spilled during the run and `B_efficiency` is 300 when the
  secret route was taken (F-007) and 0 otherwise. The score is rounded to a whole number and never
  shown below 0.~~
  *Superseded (2026-10-03) by FR-074: extras and spills no longer lower the score; no efficiency bonus.*
- ~~**FR-025** *(Stars, A3)*: 1 star for a score of at least 750; 2 stars for at least 900 with at
  most 10 spilled toys; 3 stars for at least 1200 (only reachable via the secret route) **or** for
  a perfect run (score 1000: every ordered toy correct, nothing extra, zero spills). A level counts
  as passed with at least 1 star.~~
  *Superseded (2026-10-03) by FR-075.*
- ~~**FR-026**: Below 750 points the store MUST refuse the order: the level is not passed and Retry
  is offered.~~
  *Superseded (2026-10-03) by FR-075.*
- ~~**FR-027**: The results screen MUST show stars, correct/total toys, spilled toys, efficiency
  bonus, final score and personal best, with **Retry**, **Map** and **Next** (Next only when the
  next level is unlocked).~~
  *Superseded (2026-10-03) by FR-076.*
- **FR-028**: A derailment MUST end the run with 0 stars and no recorded result.
- **FR-029**: The best stars and best score per level MUST be kept; a worse result never lowers
  them.

#### Edge Cases (F-003)

- None of the delivered toys match the order (`N_correct` = 0): the score is at most the bonus
  minus spills, so the order is refused.
- An order that lists the same type twice (e.g. ducks → blocks → ducks): each line is matched
  separately, in sequence.
- More toys of a type than ordered: the surplus counts as extra and lowers the ratio.
- The secret route taken with some spills: the bonus is still added and spills are still deducted.
- A negative score is shown as 0.

---

### F-004: Procedural Level Generation

**Added**: 2026-10-03 | **Input**: Prompt §4 "Deterministic Level Generation" (seed engine,
generation recipe, backward generation algorithm)

**Summary**: Every level is built by a generator from a small recipe and a seed. Working backward
from the Toy Store guarantees that each level can be solved, and the same seed always gives the
same level.

#### User Story US4 - Fair, repeatable puzzles (Priority: P1)

As a player, every level I open is solvable, the same level looks the same every time (so I can
learn it and retry it), and the puzzles get harder as I progress.

**Why this priority**: The campaign's 28 levels only exist through the generator; unfair or
changing levels would break trust and retries.

**Independent Test**: Open level 5 twice, on two devices: the board, order and switch settings are
identical; follow its standard route and score 1000.

**Acceptance Scenarios**:

1. **Given** level N, **When** it is opened twice or on two devices, **Then** the board, order,
   switch settings and toy doses are identical.
2. **Given** any campaign level, **When** the train follows its standard route, **Then** it
   delivers exactly the order with no spills (score 1000).
3. **Given** a recipe asking for K switches, F factories, D distractor branches and an order of
   length N, **Then** the board has exactly K switches, F factories and D distractor branches, and
   the order has exactly N lines.
4. **Given** a freshly opened level, **Then** at least one switch must be changed to complete it.

#### Functional Requirements (F-004)

- ~~**FR-030**: Every level MUST be generated from a recipe — level seed, order length, switch
  count, factory count, distractor branch count, wagon count and train speed. The same recipe
  MUST always produce the identical board, order, initial switch settings and tuning on every
  device.~~
  *Superseded (2026-10-03) by FR-080/FR-081: the recipe is derived from the level number.*
- ~~**FR-031** *(Backward generation)*: The generator MUST work backward from the goal: place the
  Toy Store; place the required factories in reverse order (the last order line first); place the
  Depot and connect everything into the standard route; insert the mandatory switches along that
  route; then splice in distractor branches — loop bays (holding loops that rejoin the route
  before their own switch) and decoy branches (which pass a factory with an unordered toy type
  and/or bypass a required factory before rejoining the route).~~
  *Superseded (2026-10-03) by FR-081: forward construction with simulation-verified timing.*
- **FR-032**: Levels MUST be solvable by construction: the standard route visits the required
  factories in the order's sequence, reaches the Toy Store and delivers exactly the ordered
  quantities with zero spills (score 1000). *(Amended 2026-10-03: "solvable" now means the intended
  route scores 100% under FR-074, verified by simulation, FR-081.)*
- ~~**FR-033**: The board MUST contain exactly the recipe's number of switches, factories (required
  plus decoys) and distractor branches, and the order exactly the recipe's number of lines.
  Switches are counted as: distractor switches (whose second branch is a loop bay or decoy
  branch), plus the route's own loop switches (FR-035), plus — in levels 22–28 — the switch where
  the two routes split (F-007).~~
  *Superseded (2026-10-03) by FR-080.*
- **FR-034**: Initial switch settings MUST come from the seed and MUST NOT already form the whole
  standard route: at least one switch has to be changed.
- ~~**FR-035**: From level 10 on, the standard route of every level MUST include one loop that must
  be entered and then left: a required factory sits on the loop, so the player has to flip the
  loop's switch while the train is inside the loop. The time window to do so — from the moment the
  last wagon clears the switch until the engine comes back to it — MUST be at least 3 seconds on the
  standard route.~~
  *Superseded (2026-10-03) by FR-083: holding loops are optional and rare; timing replaces must-loop factories.*
- ~~**FR-036**: Difficulty MUST increase across the campaign within these ranges:~~
  *Superseded (2026-10-03) by FR-080.*

  | Biome | Levels | Order lines | Switches | Factories | Distractor branches | Wagons | Flip while running |
  |-------|--------|-------------|----------|-----------|---------------------|--------|--------------------|
  | Living Room Rug | 1–7 | 1–2 | 1–3 | 1–3 | 1–3 | 1–2 | never needed |
  | Candy Kingdom | 8–14 | 2–3 | 2–4 | 2–4 | 1–3 | 2–3 | from level 10 |
  | Garden Sandbox | 15–21 | 2–3 | 3–5 | 3–5 | 2–4 | 3 | yes |
  | Space Playroom | 22–28 | 2–3 | 4–6 | 3–7 | 1–3 | 3 | yes, plus the secret route (F-007) |

  Train speed rises gently from biome to biome.
- ~~**FR-037**: Every board MUST fit the overview on the reference phone held upright, with every
  switch tappable without zooming (FR-044).~~
  *Superseded (2026-10-03) by FR-094.*

#### Edge Cases (F-004)

- The generator cannot fit a requested layout on its first attempt: it retries with seeds derived
  deterministically from the level seed, so the result is still the same on every device; campaign
  recipes never fail.
- A distractor branch would make a loop shorter than the train: that layout is rejected (FR-009).
- A very small or very wide screen: the board still fits the overview; only zoom changes.

---

### F-005: Camera & Viewport

**Added**: 2026-10-03 | **Input**: Prompt §3 "Camera & Viewport System"

**Summary**: A warm, near-isometric diorama view with pinch-to-zoom and panning, an overview of the
whole board for planning, and a close follow-cam for watching toys pour into the wagons.

#### User Story US5 - Look around: zoom, pan, follow the train (Priority: P2)

As a player, I can see the whole board to plan my route, zoom and pan freely, and lock the camera
onto the train to watch toys pour into the wagons up close.

**Why this priority**: The game is playable from the default overview, but close-ups and free
camera control make it readable on a small screen and deliver the toy spectacle.

**Independent Test**: In any level, pinch to zoom and drag to pan; tap the train to follow it;
double-tap empty space to return to the overview.

**Acceptance Scenarios**:

1. **Given** the overview, **When** the player pinches outward, **Then** the board zooms in toward
   the fingers; **when** they drag, **then** the board pans.
2. **Given** the overview, **When** the player taps the train, **Then** the camera glides in close
   and keeps the train in view, so the toys pouring into the wagons are clearly visible.
3. **Given** follow mode, **When** the player double-taps empty space or taps the overview button,
   **Then** the camera glides back to show the whole board.
4. **Given** a drag that starts on a switch, **Then** the board pans and the switch does not flip.
5. **Given** a desktop browser, **When** the player drags with the mouse or turns the scroll
   wheel, **Then** the board pans or zooms.

#### Functional Requirements (F-005)

- **FR-038**: The view MUST look down on the board from a raised angle with little perspective (a
  warm, near-isometric diorama look). Each level opens in Overview mode, framing the whole board.
- **FR-039**: Touch: pinch MUST zoom around the point between the fingers, and one- or two-finger
  drag MUST pan. Mouse: drag pans and the wheel zooms. Zoom is limited between the overview
  framing and a close-up in which one wagon fills about a third of the screen width; panning stays
  within the board.
- **FR-040**: Tapping (or double-tapping) the train MUST enter Follow Train mode: the camera
  zooms in close and smoothly keeps the train in view until the player pans or zooms by hand or
  returns to the overview.
- **FR-041**: Double-tapping empty space or tapping the Overview button MUST return to Overview
  mode.
- **FR-042**: A touch MUST count as a tap only if it moves less than 10 points and lasts less than
  0.35 seconds; drags and pinches never flip switches, and taps never pan.
- **FR-043**: Camera transitions MUST be smooth (no jumps) and take at most 0.6 seconds; after a
  rotation or resize, the current view refits to the new screen.
- **FR-044**: Taps on switches MUST be forgiving: a tap within 22 points of a switch counts, so
  every switch has a touch target of at least 44 × 44 points; when two switches are in range, the
  nearer one wins.

#### Edge Cases (F-005)

- A pinch starts with one finger on a switch: it is a pinch, the switch does not flip.
- The train is behind a tall prop when tapped: the tap still selects the train.
- The train derails in follow mode: the camera stays on the explosion, then the result appears.
- Landscape orientation: overview and follow mode frame correctly.

---

### F-006: Meta Map, Biomes & Progression

**Added**: 2026-10-03 | **Input**: Prompt §6 "Meta Map & Biomes", §1 "Aesthetic & Tone"

**Summary**: A 3D map board ties the campaign together: four themed biomes of seven levels each,
unlocked one after the other, with stars and progress kept on the device.

#### User Story US6 - Travel the campaign map (Priority: P2)

As a player, I move through four themed biomes on a 3D map, see my stars, unlock new levels by
passing earlier ones, and find my progress waiting when I come back.

**Why this priority**: Single levels are playable without it, but progression and the biome
themes give the game its arc and replay value.

**Independent Test**: On first launch only level 1 is open; pass it and level 2 opens; reload the
page and both the stars and the unlocked level are still there.

**Acceptance Scenarios**:

1. **Given** a first launch, **Then** the meta map shows the Living Room Rug with level 1 unlocked
   and every other level locked.
2. **Given** level 7 is passed, **Then** the Candy Kingdom and its level 8 unlock with a small
   celebration.
3. **Given** the player closes and reopens the game, **Then** best stars, best scores, unlocked
   levels, secret-route marks and the mute setting are kept.
4. **Given** a corrupt or missing save, **Then** the game starts a fresh campaign without errors.
5. **Given** the player taps an unlocked level, **Then** a level card shows its biome and number,
   best stars and best score, and a Play button.

#### Functional Requirements (F-006)

- ~~**FR-045**: The campaign MUST have exactly 28 levels in four biomes of exactly 7 levels each, in
  this order: Living Room Rug (1–7), Candy Kingdom (8–14), Garden Sandbox (15–21), Space Playroom
  (22–28).~~
  *Superseded (2026-10-03) by FR-079: endless levels in 7-level worlds.*
- ~~**FR-046**: The meta map MUST be a 3D tabletop board that shows the four biomes as themed areas
  joined by a track, with one marker per level showing its number, best stars and lock state. The
  player drags to move between biomes and taps a marker to open that level's card.~~
  *Superseded (2026-10-03) by FR-084.*
- **FR-047**: Level 1 MUST be unlocked from the start; passing a level unlocks the next one; a
  biome opens when its first level unlocks. Locked levels cannot be started.
- **FR-048**: The meta map MUST show the total number of stars earned and mark the levels whose
  secret route has been found.
- **FR-049**: Each biome MUST have its own look, both on the map and in its levels: Living Room
  Rug (rug patterns, pillow mountains, wooden blocks), Candy Kingdom (marshmallow bridges, syrup
  drips, candy trees), Garden Sandbox (sand dunes, buckets and spades, turning toy windmills that
  puff gusts), Space Playroom (dark sky, glow-in-the-dark rails, planets, zero-G funnels in which
  toys float down slowly). These elements are decorative and never change the rules or scores.
- **FR-050**: Progress MUST persist on the device across reloads: best stars, best score and
  secret-route mark per level, and the settings. A missing or corrupt save starts a fresh campaign;
  if the device does not allow saving, the game is still fully playable and a notice says that
  progress will not be kept.
- **FR-051**: From the results screen, **Next** MUST open the next level directly and **Map** MUST
  return to the map centered on the current biome; on launch, the map is centered on the furthest
  unlocked level.

#### Edge Cases (F-006)

- Replaying a passed level with a worse result: best stars and score are unchanged.
- Saving is impossible (e.g. some private browsing modes): play continues, with the notice of
  FR-050.
- A save written by a newer or older version of the game: it is upgraded if possible, otherwise
  treated as corrupt (fresh start).
- Tapping a locked level: it shows which level unlocks it, and does not start.

---

### F-007: Dual-Solution Levels & the Secret Route

**Added**: 2026-10-03 | **Input**: Prompt §4 "Dual Solution Mechanics (Levels 22+)", Addendum A2
"Dual-Solution Graph Construction", A3 "B_efficiency"

**Summary**: In the Space Playroom (levels 22–28) every level has two complete, valid solutions: a
standard route and a shorter, trickier secret route through a Dual Factory, which pays a big
efficiency bonus.

#### User Story US7 - Find the secret route (Priority: P3)

As an experienced player, I look for the faster, harder secret route in the late levels and am
rewarded with bonus points and a mark on the map when I pull it off.

**Why this priority**: It adds mastery and replay value for the last biome, but the campaign is
complete without it.

**Independent Test**: In level 22, follow the standard route and score 1000 (3 stars); restart and
follow the secret route, flipping its loop switch in time, and score 1300 with the "Secret route!"
celebration.

**Acceptance Scenarios**:

1. **Given** any level from 22 to 28, **Then** two distinct routes lead from the Depot to the Toy
   Store, and each delivers the full order without spills.
2. **Given** the player drives exactly the secret route, **When** the train arrives, **Then** 300
   bonus points and a "Secret route!" celebration are awarded and the map marks the level.
3. **Given** the player drives the standard route perfectly, **Then** the score is 1000 and the
   result is 3 stars.
4. **Given** the player starts on the secret route but misses its timed flip and loops again,
   **Then** the extra pass overfills the wagons and the bonus is not awarded.

#### Functional Requirements (F-007)

- ~~**FR-052**: Levels 22–28 MUST contain two independent valid routes between the Depot and the Toy
  Store that share only their start and end: the standard route (P1) and the secret route (P2).
  Distractor branches are added only after both routes exist.~~
  *Superseded (2026-10-03) by FR-090.*
- ~~**FR-053** *(Solvability invariant, A2)*: Both routes MUST load exactly the order's sequence and
  quantities with no spills: Sequence(P1) = Sequence(P2) = the order.~~
  *Superseded (2026-10-03) by FR-092.*
- ~~**FR-054**: The secret route MUST pass at least one Dual Factory (two consecutive order types
  poured one after the other) and MUST use fewer switches than the standard route.~~
  *Superseded (2026-10-03) by FR-090.*
- ~~**FR-055** *(Cost divergence, A2)*: Route cost is the route's track length plus a fixed delay
  for every switch the train passes on it; the secret route MUST cost at most 85% of the standard
  route: `Cost(P2) ≤ 0.85 × Cost(P1)`.~~
  *Superseded (2026-10-03) by FR-092: the secret route is longer, not cheaper.*
- ~~**FR-056** *(Execution window, A2)*: Each route MUST include a loop whose switch has to be
  flipped while the train is inside it; the secret route's window MUST be half of the standard
  route's window (`Δt(P2) = 0.5 × Δt(P1)`, within ±15%).~~
  *Superseded (2026-10-03) by FR-090.*
- ~~**FR-057**: The efficiency bonus (`B_efficiency` = 300, FR-024) MUST be awarded only when the
  train travels exactly the secret route from the Depot to the Toy Store, with no extra loops or
  detours.~~
  *Superseded (2026-10-03) by FR-093.*
- **FR-058**: Neither route is highlighted. Until the secret route of a level has been found, that
  level's card says "A sneakier route exists…" (amended 2026-10-03 for F-012).

#### Edge Cases (F-007)

- The player takes the secret route, misses the tight flip and goes around the loop again: the
  second pass under the Dual Factory overfills the wagons (spills) and loads the order types twice,
  and the run no longer counts as the secret route.
- The player switches from one route to the other midway (where distractor branches allow it): no
  bonus; the delivery is scored normally.
- The player finds the secret route on a replay: the mark and the higher best score are saved.

---

### F-008: Toy-Box 3D Interface

**Added**: 2026-10-03 | **Input**: Owner follow-ups: "all game chrome (ui) needs to be 3d … not
browser html"; "the ui and labels in threejs should animate whimsically as well"

**Summary**: Every piece of the game's interface — buttons, the order card, wagon gauges, hints,
cards, notices, the map's controls and the markers in the world — is a chunky 3D object that lives
in the same toy-box world as the train, instead of a flat web page laid over a 3D picture. And it
is alive: letters hop, buttons wobble and squash, cards bounce in, signs sway, markers bob.

#### User Story US8 - Play with a toy-box interface (Priority: P1)

As a player, I press chunky 3D toy buttons and read 3D cards, counters and gauges that look and
move like part of the toy world — wobbling, hopping and bouncing like wind-up toys — so the whole
game feels like one handmade, playful toy rather than a web page with a 3D scene behind it.

**Why this priority**: The owner requires it for release, and it touches every screen, so it has
to be in place before the game ships.

**Independent Test**: Open the map, start level 1, play it to the results and return to the map.
At every step, every button, card, count, gauge, hint and marker on screen is a lit 3D object with
visible depth, pressing a button pushes it in like a physical key, and no flat page element is
visible at any point.

**Acceptance Scenarios**:

1. **Given** any screen (map, level, any card), **Then** every interface element is a 3D object in
   the game view and nothing on screen is a flat web-page element.
2. **Given** a level, **When** the player presses a 3D button (e.g. Go), **Then** it sinks in while
   pressed and acts when released over it; sliding off before releasing cancels it.
3. **Given** toys pouring into the wagons, **Then** the order counts and the wagon gauges update
   live, and a wagon at 90% or more shows its warning symbol.
4. **Given** a card is open (pause, results, derailment, level card, notice), **When** the player
   touches the board or the map behind it, **Then** nothing behind the card reacts.
5. **Given** the phone is rotated, **Then** the 3D interface re-lays out (portrait: order card on
   top, controls at the bottom; phone held sideways: order card on the left, controls on the
   right), and every button stays at least 44 × 44 points and inside the safe area.
6. **Given** any screen, **Then** the interface and the labels in the world move with whimsical,
   toy-like life on their own (letters hop, buttons wobble, signs sway, markers bob); **when** a
   button is pressed it squashes and springs back with a jelly bounce; **and when** the device
   asks for reduced motion, everything holds still.

#### Functional Requirements (F-008)

- **FR-059**: Every interface element — buttons, the level title, the order card with its live
  counts, wagon gauges, hints, toasts, the pause, results, derailment and level cards, notices,
  celebrations, and the map's star total, biome name and biome arrows — MUST be drawn as a 3D
  object in the game's view: chunky rounded shapes with real depth, lit like the world and in its
  handmade toy style. No interface element may be a flat web-page element laid over the game.
- **FR-060**: Markers and labels inside the world MUST be 3D objects as well: the switch buttons,
  the toy symbol above each factory, the building signs (Depot, Toy Store, Dual Factory), the map's
  level markers (number, stars, lock and secret mark) and the biome name signs.
- **FR-061**: All interface text MUST be 3D lettering in one friendly, rounded typeface. Main text
  is at least 15 points and secondary labels at least 10 points tall on the reference phone; text
  that does not fit its space shrinks to fit instead of overflowing.
- **FR-062**: Toy symbols in the interface (order card, level card, results) MUST be small 3D
  models of the same toys that pour in the world, so orders are read by shape as well as color
  (NFR-011).
- **FR-063**: 3D buttons MUST behave like physical toy buttons: they sink while pressed, spring
  back on release, act only when released over the button, and click. A touch that starts on a
  button never pans the board, flips a switch or selects the train. Disabled buttons look greyed
  out and do nothing.
- **FR-064**: While a card is open, only the card MUST react to touches; the board or map behind it
  is dimmed and ignores input. "Tap to continue" accepts a tap anywhere.
- **FR-065**: The 3D interface MUST stay inside the screen's safe areas (Dynamic Island, home
  indicator, rounded corners) and re-lay out after a rotation or resize: in portrait, the title
  bar and order card sit at the top and the controls at the bottom; on a phone held sideways, the
  order card and gauges sit on the left and the controls on the right, so the board keeps most of
  the height. Every touch target is at least 44 × 44 points in both layouts (NFR-006).
- **FR-066**: The interface and the labels in the world MUST animate whimsically, all the time,
  like wind-up toys on a table — not only when something happens — and MUST hold still when the
  device asks for reduced motion. *(Amended 2026-10-03: was "MAY move in 3D".)*
- **FR-067**: The whimsical motion MUST include at least: (a) buttons that breathe and wobble while
  idle, squash when pressed and spring back with a jelly bounce; (b) titles, banners, the logo and
  the signs in the world with letters that hop one after another in a little wave; (c) counters
  that pop when their number changes, gauges that jiggle as they fill and warning symbols that
  shake; (d) stars that pop in spinning and keep twinkling; (e) cards that drop in with a springy
  wobble and twirl away when closed; (f) toy symbols that turn and hop when their count rises;
  (g) signs that sway, map markers that bob (the next level to play bounces higher) and switch
  buttons that bob over the track.
- **FR-068**: Motion MUST keep the game readable and playable: letters and controls move only a few
  points around their resting place, touch targets stay where the control rests, and nothing
  moves over the train, a switch or the order card.

#### Edge Cases (F-008)

- A finger lands on a button and slides onto the board: the press is cancelled and the board does
  not pan.
- One finger holds a button while another drags the board: the board pans and the button acts
  only if its own finger is released over it.
- Long text (a biome name, a hint) on a narrow screen: the lettering shrinks or wraps to fit.
- The phone is rotated while a card is open: the card re-lays out and stays usable.
- The device cannot show 3D graphics at all: a plain message explains that the game needs 3D
  graphics (NFR-015 exception).
- A button is tapped while it wobbles: the tap counts wherever the button rests (FR-068).
- Reduced motion is switched on while playing: the motion stops at once and resumes when it is
  switched off.

---

### F-009: Timed Toy Batches, Wagon Chutes & the Toy Station

**Summary**: Factories drop batches of toys on a clock, so *when* the train passes matters as much
as *where* it goes. Every wagon has its own job: at the Toy Station each wagon stops at its own
chute, and each chute wants a set number of one toy type. The order is no longer one shared
total; the number of wagons, their order and the timing of every pass decide the payload.
Supersedes the continuous pouring and sequence scoring of F-002 and F-003 (owner feedback,
2026-10-03).

**Status**: Draft

#### User Story US9 - Catch the batches in the right wagons (Priority: P1)

The player watches the factories' countdowns, picks routes (and waits in holding loops) so that
each batch drops into the wagon whose chute wants it, and drives into the Toy Station where every
wagon tips its toys into its chute.

**Why this priority**: It is the core puzzle after the owner's feedback ("number of toys and
wagons plays no role at all, nor does the order … timing does not matter").

**Independent Test**: Play a two-wagon level: wagon 1 must get ducks, wagon 2 blocks. Reaching the
duck factory one wagon-length later than intended puts the ducks into wagon 2 and the level scores
less; the intended timing scores 100%.

**Acceptance Scenarios**:

1. **Given** a running train, **When** a factory's countdown reaches zero while wagon 2 is under
   its hopper, **Then** the whole batch drops into wagon 2 (as far as it fits) and the countdown
   starts again.
2. **Given** a factory's countdown reaches zero while the engine is under the hopper, **When** the
   batch drops, **Then** it lands on the rails as a spill pile.
3. **Given** nothing is under a hopper when its countdown reaches zero, **When** the batch would
   drop, **Then** the hopper stays shut and the batch is skipped (no spill).
4. **Given** the train drives into the Toy Station, **When** the engine reaches the buffer stop,
   **Then** the train stops with each wagon beside its chute, every wagon tips its toys in, and
   each chute counts how many of its wanted toys it got.
5. **Given** a wagon carries more toys than its chute wants, or toys of other types, **When** it
   is scored, **Then** the extras cost nothing; they only took up room in the wagon.

#### Functional Requirements (F-009)

- ~~**FR-069**: Each factory MUST make one toy type and drop a batch of a fixed size every `T`
  seconds of game time, starting at its own offset; a countdown ring and the batch size (e.g. "×12")
  MUST be shown on the factory in 3D, and the countdown runs only while game time runs.~~
  *Superseded (2026-10-03) by FR-108 (F-014).*
- ~~**FR-070**: When a batch drops, the car under the factory's hopper decides where it goes: a wagon
  catches the batch up to its free capacity and the rest spills; if the engine is under the hopper
  the whole batch spills onto the rails; if no car is under it the hopper stays shut and that
  batch is skipped. Whichever car's span (including half of the coupling gaps) contains the hopper
  point counts as under it.~~
  *Superseded (2026-10-03) by FR-108 (F-014).*
- ~~**FR-071**: A factory's period MUST be longer than the time the whole train needs to pass under
  it, so one pass catches at most one batch.~~
  *Superseded (2026-10-03) by FR-097 (F-014).*
- ~~**FR-072**: The Toy Store MUST be a station: a straight platform track ending in a buffer stop,
  at least as long as the train plus a margin, with one chute per wagon. The train slows on the
  platform and stops when the engine reaches the buffer; each wagon then stands beside its own
  chute and tips its toys in.~~
  *Superseded (2026-10-03) by FR-103 (F-014).*
- ~~**FR-073**: The order MUST be one line per wagon: chute `k` wants `Q_k` toys of type `X_k` from
  wagon `k`. The order card MUST show one row per wagon (wagon number, toy, live count / wanted),
  and each wagon MUST carry a small flag with its wanted toy so the player can see it on the board.~~
  *Superseded (2026-10-03) by FR-103 (F-014).*
- ~~**FR-074** *(Score v2)*: `correct_k = min(Q_k, toys of type X_k in wagon k)`;
  `ratio = Σ correct_k ÷ Σ Q_k`; `Score = round(1000 × ratio)`. Extra toys, toys of other types and
  spills MUST NOT lower the score; they only cost wagon space or build piles (FR-016 still applies
  per factory: piles never shrink and the train derails at the threshold, FR-017).~~
  *Superseded (2026-10-03) by FR-105 (F-014).*
- ~~**FR-075** *(Stars v2)*: 3 stars for 100%, 2 stars for at least 85%, 1 star for at least 60%; below
  60% the store refuses the order (not passed, Retry offered).~~
  *Superseded (2026-10-03) by FR-105 (F-014).*
- ~~**FR-076**: The results card MUST show one row per chute (toy, got / wanted), the percentage,
  the stars, the score and the personal best, with Retry, Map and Next.~~
  *Superseded (2026-10-03) by FR-098/FR-105 (F-014).*
- ~~**FR-077**: Track MAY slope: ramps up and down (e.g. onto a bridge) change the train's speed —
  slower uphill, faster downhill, slower on the station platform — so routes of the same length
  can take different times. The speed profile is part of the deterministic rules (FR-011).~~
  *Superseded (2026-10-03) by FR-097: movement is discrete (F-014).*
- ~~**FR-078**: Wagon capacity MUST be tight enough that a wrong batch caught early leaves too little
  room for the wanted batch, so catching batches in the wrong wagon has a real cost.~~
  *Superseded (2026-10-03) by FR-103 (F-014).*

#### Edge Cases (F-009)

- The train loops past a factory several times: each pass may catch a batch; extra toys do not
  cost points but may fill a wagon and spill the next batch.
- A batch drops while a wagon is full: the batch spills and grows that factory's pile.
- The player never flips a holding-loop switch back: the train keeps circling; the run continues
  until the player reroutes or restarts (FR-008).
- The app is backgrounded right before a drop: game time is paused, so the drop happens on resume
  exactly as it would have.

---

### F-010: Endless Levels with a Difficulty Ceiling

**Summary**: Levels never run out. They come in worlds of 7 levels that cycle through the four
biomes, and difficulty climbs with each level up to a ceiling at level 40 (world 6, level 5);
after that every level is new but equally hard. Supersedes the fixed 28-level campaign of F-004
and F-006.

**Status**: Draft

#### User Story US10 - Keep playing new levels (Priority: P1)

The player keeps unlocking new levels without end; each world shows its biome, and the puzzles get
harder until they plateau.

**Why this priority**: The point of procedural generation is endless play (owner feedback).

**Independent Test**: Pass level 28 and see level 29 (world 5, level 1, Living Room Rug again)
unlock; generate levels 1–100 automatically and check that each is solvable at 100%.

**Acceptance Scenarios**:

1. **Given** level `n` has been passed, **When** the map opens, **Then** level `n + 1` is unlocked,
   for any `n`.
2. **Given** level 29, **When** it is opened, **Then** it is labelled "5-1" and uses the first
   biome again, with a harder recipe than level 1.
3. **Given** levels 40 and 75, **When** their recipes are compared, **Then** they use the same
   difficulty settings (only the seed differs).

#### Functional Requirements (F-010)

- **FR-079**: Levels MUST be numbered 1, 2, 3, … without an upper limit. Level `n` belongs to world
  `w = ⌊(n − 1) ÷ 7⌋ + 1` and is labelled `w-i` with `i = (n − 1) mod 7 + 1`; worlds cycle through
  the biomes Living Room Rug, Candy Kingdom, Garden Sandbox, Space Playroom.
- **FR-080**: Difficulty MUST be a function of `d = min(n, 40)` and rise monotonically to the
  ceiling at level 40 ("6-5"): wagons 1 (d ≤ 3), 2 (d ≤ 10), 3 (d ≤ 22), 4 after; required
  factories from 1 up to 6; decoy factories 0–3 and distractor branches 1–5; crossings from level 4,
  bridges from level 9, tunnels from level 12, secret detours from level 15; board size from 7 × 12
  to 10 × 18 tiles; train speed from 1.0 to 1.3 tiles per second; factory periods tighten.
- **FR-081**: Every level MUST be generated deterministically from its number alone and MUST be
  solvable at 100% by its intended route, verified by simulation during generation; when an
  attempt fails, the generator retries with the next deterministic attempt, and a level MUST always
  be produced.
- ~~**FR-082**: Wrong decisions MUST cost: running the level without flipping any switch MUST score
  below a pass, and every distractor branch, when taken instead of the intended route, MUST lead to
  a lower score or a longer route.~~
  *Superseded (2026-10-03) by FR-107 (F-014).*
- ~~**FR-083**: Holding loops that pass nothing (pure waiting loops) MAY appear, in at most about one
  level in three and never in levels 1–7; every other loop MUST pass a factory or be part of a
  crossing route.~~
  *Superseded (2026-10-03) by FR-107 (F-014).*
- **FR-084**: The meta map MUST show a window of worlds around the focused level (the focused world
  and its neighbours) with each world's biome, label and level markers, and let the player move to
  earlier and later worlds without limit up to the furthest unlocked world plus one.
- **FR-085**: Progress MUST be stored per level number with no upper limit; existing saves from the
  28-level campaign MUST keep their stars, best scores and unlocks.

#### Edge Cases (F-010)

- A very high level number (e.g. 10 000) is opened through a link: it generates with ceiling
  difficulty if it is unlocked, otherwise the map opens on the furthest unlocked level.
- A save holds results for a level above the furthest consecutive pass (e.g. after a link): it is
  kept and unlocks the level after it.

---

### F-011: Crossings, Bridges & Tunnels

**Summary**: Track layouts use the whole board in three dimensions: tracks cross each other at
level crossings, pass over each other on bridges with ramps, and dive through tunnels under
hills. Ramps change the train's speed (FR-077).

**Status**: Draft

#### User Story US11 - Read a richer railway (Priority: P2)

The player follows routes that cross, climb over each other and vanish into tunnels, and has to
trace them to plan.

**Why this priority**: The owner asked for crossings, bridges and tunnels; they make layouts dense
and full-screen instead of small loops.

**Independent Test**: Open a level of world 3 or later: it shows at least one crossing, one bridge
or one tunnel, and the train runs through each correctly.

**Acceptance Scenarios**:

1. **Given** a level crossing, **When** the train runs straight through it, **Then** it keeps
   going straight; crossings never switch the train.
2. **Given** a bridge, **When** the train climbs the ramp, **Then** it slows down, crosses over the
   lower track and speeds up on the way down.
3. **Given** a tunnel, **When** the train enters it, **Then** it disappears under the hill and comes
   out of the other portal at the time its speed implies.

#### Functional Requirements (F-011)

- **FR-086**: A level crossing MUST be a tile where two straight tracks cross at right angles at the
  same height; it has no switch, and a train entering it leaves through the opposite edge.
- **FR-087**: A bridge MUST lift one track over another: a ramp tile up, a deck tile above the
  crossing track, and a ramp tile down, in a straight line. The lower track runs under the deck.
- **FR-088**: A tunnel MUST cover a run of 2–4 track tiles under a hill with a portal at each end;
  no switch, factory, station or crossing lies inside a tunnel. The train is hidden inside.
- **FR-089**: The difficulty ramp (FR-080) MUST introduce crossings, bridges and tunnels
  gradually, and from world 3 on most levels MUST contain at least one of them.

#### Edge Cases (F-011)

- The train passes the same crossing twice on one route (once in each direction of the cross):
  allowed; the train never collides with itself.
- A switch is never placed on a bridge, ramp, crossing or inside a tunnel.

---

### F-012: Secret Detours

**Summary**: From level 15 on, some levels hide a detour that is longer and less obvious than the
plain route — it branches off after the last factory, dives through a tunnel or climbs over a
bridge, and passes a bonus factory that tops up the one chute the plain route leaves short.
Supersedes the faster secret route of F-007.

**Status**: Draft

#### User Story US12 - Find the sneakier route (Priority: P3)

A player who scores 2 stars notices one chute is a little short, looks for a way to top it up and
finds a hidden detour that delivers a perfect payload.

**Why this priority**: The secret route should reward curiosity with a better payload, not be the
easiest path (owner feedback).

**Independent Test**: On a level with a secret detour, the plain route scores 85–99% (2 stars) and
the detour scores 100% (3 stars), both verified automatically.

**Acceptance Scenarios**:

1. **Given** a level with a secret detour, **When** the player follows the plain route perfectly,
   **Then** the delivery scores at least 85% but one chute is short.
2. **Given** the same level, **When** the player takes the detour, **Then** the bonus factory's
   batch drops into the short wagon and the delivery scores 100%, celebrated as "Secret route!".

#### Functional Requirements (F-012)

- ~~**FR-090**: From level 15, about 40% of levels MUST contain a secret detour: a branch that leaves
  the route after the last required factory, is longer than the plain way, runs at least partly
  through a tunnel or over a bridge, passes one bonus factory, and rejoins before the station.~~
  *Superseded (2026-10-03) by FR-105: par and an open "shorter than the dispatcher" badge replace hidden detours (F-014).*
- ~~**FR-091**: The detour switch MUST start set to the plain route, and nothing marks the detour.~~
  *Superseded (2026-10-03) by FR-105 (F-014).*
- ~~**FR-092**: The plain route MUST score at least 85% and below 100%; the detour MUST score 100%;
  the bonus batch is at most 15% of the whole order.~~
  *Superseded (2026-10-03) by FR-105 (F-014).*
- ~~**FR-093**: A run counts as a secret-route run when the train passed the bonus factory's track and
  the delivery scored 100%; the level's card then marks the secret as found (FR-048, FR-058).~~
  *Superseded (2026-10-03) by FR-105 (F-014).*

#### Edge Cases (F-012)

- The player takes the detour but at the wrong time: the bonus batch lands in another wagon or is
  skipped; no penalty, no secret.

---

### F-013: Full-Screen Dioramas & Readable Switches

**Summary**: A level fills the whole screen like a play mat instead of a small board on a table,
and switches show their direction with a bold arrow that is easy to read at a glance.

**Status**: Draft

#### User Story US13 - See the whole railway clearly (Priority: P2)

**Why this priority**: The board looked small and the yellow switch arrows were hard to see (owner
feedback).

**Independent Test**: Open any level upright on the reference phone: the ground reaches every
screen edge, the track area spans the screen width, and each switch's arrow is readable without
zooming.

**Acceptance Scenarios**:

1. **Given** any level in overview, **When** it is shown upright, **Then** the biome ground fills
   the screen edge to edge and the track uses the full width between the HUD bars.
2. **Given** a switch, **When** it is flipped, **Then** its floating button turns its arrow to point
   along the newly set branch, and a bold dark-outlined chevron on the track shows the same.

#### Functional Requirements (F-013)

- **FR-094**: Levels MUST NOT show a table or a framed board: the biome ground MUST extend beyond
  every screen edge, with props scattered outside the track area, and the overview MUST fit the
  board's width to the screen (portrait boards).
- **FR-095**: Each switch's floating button MUST show a bold arrow pointing along the currently set
  branch (straight, left or right), turning when the switch flips; the chevrons on the track MUST
  be large, dark-outlined and high-contrast against every biome ground.

---

### F-014: Shunting Yard Puzzles (Plan, then Run)

**Summary**: Each level is a shunting puzzle. Toy wagons stand on sidings around the yard; the
Toy Station wants a train with specific wagons in a specific order. The player prepares the
yard — switch settings and a few uncoupler pads — and taps **Go**. The run is computed at once
and played back with a timeline scrubber; nothing can be changed while it plays. Tracks are used
in both directions: buffer stops send the train back the way it came, so wagons can be pushed
into sidings, left there and picked up again in a different order. Supersedes the timed batches
and toy counts of F-009, the real-time switching of FR-005 and the secret detours of F-012
(owner feedback, 2026-10-03: "less realtime, more puzzle").

**Status**: Ready for planning

#### User Story US14 - Plan a shunting move and watch it play out (Priority: P1)

The player studies the yard, sets the switches, places uncouplers, taps Go and scrubs through the
run to see where it went wrong; then adjusts and tries again until the train arrives in order.

**Why this priority**: It replaces the core loop; the owner found the real-time version slow,
unpredictable and not challenging.

**Independent Test**: On a level that needs the order "duck, car", where the car wagon stands
nearer the depot, the train only succeeds if it first parks the car wagon in a siding, fetches the
duck wagon and then picks the car up again.

**Acceptance Scenarios**:

1. **Given** the planning phase, **When** the player taps a switch, **Then** its setting flips and
   the arrow shows the new direction; **When** the player taps a track tile with an uncoupler left,
   **Then** a pad is placed there (tap again to remove it).
2. **Given** a plan, **When** the player taps Go, **Then** the whole run is computed immediately,
   the timeline shows where it ends (success, wrong order, endless loop or stuck) and the train
   plays it back; the player can drag the locomotive playhead to any moment, pause and replay.
3. **Given** a run playing back, **When** the player taps anything on the board, **Then** nothing in
   the yard changes; **When** the player taps Edit, **Then** planning resumes with the same plan.
4. **Given** the train reaches a buffer stop, **When** it reverses, **Then** every wagon that has
   passed an uncoupler pad on the way in stays behind on that side of the pad.
5. **Given** the train runs into a standing wagon from either end, **When** they touch, **Then** the
   wagon couples to the train.

#### Functional Requirements (F-014)

- **FR-096**: The run MUST be fully determined by the plan: switch settings, uncoupler pads and
  the level's fixed rules. After Go the player MUST NOT be able to change anything in the yard;
  the run is computed in full before playback starts.
- **FR-097**: Movement MUST be discrete: the train advances one track tile per step; the engine
  and every wagon occupy one tile each. Playback animates steps smoothly at a brisk default pace
  (about 6 steps per second) and can be fast-forwarded.
- **FR-098**: Playback MUST have a timeline scrubber whose playhead is a little locomotive. It
  shows the whole run's length and outcome from the start, marks events (couplings, uncouplings,
  reversals, station arrival, failure) and lets the player drag to any step, pause and replay.
- **FR-099**: Buffer stops MUST reverse the train; a train may run through any switch from either
  end. Facing moves (entering a switch at its single end) follow the switch; trailing moves
  (entering from a branch) always pass and do not change the switch unless its rule says so.
- **FR-100**: A train touching a standing wagon MUST couple to it, at the front or the rear.
- **FR-101**: Each level gives a number of uncoupler pads (0–3) the player may place on plain
  track tiles or on a dead-end buffer outside the station. When the train reverses at a buffer, all
  wagons on the buffer side of a pad the train has crossed stay behind, standing on their tiles; a
  pad on the buffer itself leaves just the wagon standing there. *(Amended 2026-10-03: a single
  wagon could not be left behind before.)*
- **FR-102**: Switch kinds MUST be introduced gradually: *manual* (keeps the player's setting),
  *alternating* (flips after every facing pass), *sprung* (returns to its setting after every
  pass), *linked* (a group that always shows the same setting; flipping one flips all) and
  *trigger* switches (flipped whenever the train crosses a matching trigger plate). Each kind
  MUST look distinct and show its rule with an icon (shape, not color alone).
- **FR-103**: The goal MUST be shown as a sequence of wagons (toy symbols, front to back behind
  the engine). A run succeeds when the train stops at the station buffer with exactly those
  wagons in that order; other wagons must have been left in the yard.
- **FR-104**: A run MUST end as failed when the train repeats a full state (endless loop), when it
  cannot move, after a step limit, or when it reaches the station with the wrong train; the
  timeline marks the failure and the scrubber still works so the player can see what happened.
- **FR-105** *(Stars)*: 1 star for any successful run; 2 stars within par + 25% steps; 3 stars at
  or below par steps. Par is shown on the level card. A run shorter than par earns a "Shorter than
  the dispatcher!" badge, kept with the level's progress.
- **FR-106**: Unlimited planning: Edit keeps the plan; Reset clears it. *(Undo/redo was left out of the
  first version: every planning action is a single tap that the same tap reverses.)*
- **FR-108** *(Factories)*: Factories MUST be a core mechanic: each sits over a track tile and acts
  on every wagon that enters that tile, in either direction (the engine is never affected). Types,
  introduced gradually and each with its own building and symbol:
  *loader* (fills every empty wagon with its toy), *single loader* (fills at most one empty wagon
  each time the train passes, so a second visit is needed for a second wagon), *converter* (turns
  every wagon of toy A into toy B), *washer* (empties every wagon) and *swap* (exchanges two toys
  A ⇄ B). Wagons start empty or already loaded. Levels MUST make players reach some factories,
  sometimes more than once, and avoid others.
- **FR-109**: The goal MAY include empty wagons (shown as an empty-wagon symbol).
- **FR-110** *(Introduction levels)*: A mechanic MUST be introduced on its own level with a hint
  that explains it, and that level's goal MUST be reachable only by using it: every solving plan
  the solver finds uncouples (pads, level 3), passes the factory kind being taught (washer 5,
  converter 9, single loader 13, swap 17), flips a trigger switch by its plate (15) or sets a
  linked pair that the train runs over (11). Introduction levels pick a common goal so the new
  mechanic is the only new thing. Other levels show no hint.
- **FR-111** *(Look)*: The yard MUST read as a toy train set in the biome's room: a patterned play
  mat on a textured floor (parquet, tablecloth, lawn, space carpet), grooved wooden track, wooden
  trains whose wheels run in the grooves, buildings with textured walls and roofs (Toy Station,
  one silhouette per factory kind, engine shed, buffer stops), recognisable toys (ABC block, rubber
  duck, toy car, beach ball, puffy star) and lively props (spinning tops, pinwheels, UFOs, smoking
  chimneys, turning gears) that hold still under reduced motion. Textures are generated at load
  time; no image downloads. A factory's sign stays readable: a converter or swap shows its two toys
  beside its arrow, not over it.
- **FR-107** *(Generation)*: Every level MUST be generated from its number, have at least one
  successful plan (found by the generator's solver within a fixed search budget), and take its par
  from the shortest plan the solver found. Difficulty MUST be measured by the solution (reversals,
  uncouplers needed, switch kinds involved, how few plans succeed) and ramp to the ceiling at
  level 40.

#### Edge Cases (F-014)

- The plan sends the train round a loop forever: the run ends at the first repeated state and the
  timeline shows "going round in circles" at that step.
- The train pushes wagons into a dead end that is too short: the run ends as stuck at the buffer.
- The player finds a plan shorter than par: allowed and celebrated (the solver's search is not
  exhaustive).
- Rotation or backgrounding during playback: playback pauses; the result is already known.

---

## Global Requirements *(mandatory)*

### Experience & Performance

- **NFR-001**: Gameplay MUST run at a steady 60 frames per second on the reference device (iPhone
  16, 60 Hz) and never drop below 30, including during pours and toy explosions.
- **NFR-002**: The game MUST become playable within 5 seconds of opening the link on a typical 4G
  connection (first visit).
- **NFR-003**: The first download MUST stay under 5 MB.
- **NFR-004**: The game MUST pause automatically when the tab is hidden or the phone is locked,
  and resume cleanly when the player taps to continue.
- **NFR-005**: Scenes with up to 1,500 toys on screen (in wagons, falling or spilled) MUST still
  meet NFR-001.

### Touch & Layout

- **NFR-006**: All interactive targets MUST be at least 44 × 44 points and reachable with a thumb
  in portrait.
- **NFR-007**: The game MUST fit the visible screen, including the Dynamic Island, the home
  indicator area and the browser's collapsing toolbars, without page scrolling or accidental
  zooming.
- **NFR-008**: Gestures MUST NOT trigger browser actions (pull-to-refresh, back-swipe, text
  selection, double-tap zoom, long-press menus) during play.
- **NFR-009**: Portrait is the primary orientation; landscape MUST also work, and rotating during a
  level keeps the run's state.

### Audio, Accessibility & Persistence

- **NFR-010**: Sound MUST start only after the first player interaction and MUST have a mute
  toggle that is remembered.
- **NFR-011**: Game information MUST NOT rely on color alone: toy types differ by shape and icon,
  switch states by arrows, wagon warnings by a symbol.
- **NFR-012**: Progress and settings MUST persist across reloads on the same device (F-006).

### Look & Delivery

- **NFR-013**: The world MUST look like a handmade tabletop diorama: cardboard, wood, felt and
  plastic materials under warm lighting, with chunky toy-like props.
- **NFR-014**: The latest released (main) version MUST be published automatically as a public web
  page whenever it changes.
- **NFR-015**: The whole interface MUST be part of the 3D presentation (F-008). Flat web-page
  elements are allowed only for a developer diagnostics readout that players never see and for a
  plain error message when the device cannot show 3D graphics.

## Key Entities

- **World**: 7 consecutive levels sharing a biome; worlds cycle through the four biomes (F-010).
- **Biome**: A themed group of 7 consecutive levels (Living Room Rug, Candy Kingdom, Garden
  Sandbox, Space Playroom) with its own look.
- **Level Recipe**: Level number, seed, order length, switch count, factory count, distractor
  branch count, wagon count, train speed; fully determines a level.
- **Board / Track Network**: The level's diorama: a grid of track pieces (straight, curve, switch,
  merge) forming one-way routes from the Depot to the Toy Store, plus decorative props.
- **Switch**: A junction with two branches, an active branch and a lock while the train is on it.
- **Loop**: A circuit that leaves the route at a switch and rejoins it before that switch.
- **Factory**: A building whose funnel spans a stretch of track and pours one toy type at a pour
  rate; *decoy* factories pour types the order does not want; a *Dual Factory* pours two types one
  after the other.
- **Toy Type**: Blocks, ducks, cars, balls, stars — each with a shape, color and icon.
- **Depot / Toy Store**: Start and end of every route; the store holds the order.
- **Order**: A sequence of 1–4 lines (toy type, quantity for the whole train).
- **Train**: One engine and 1–4 wagons with a fixed speed; each wagon has a capacity and keeps
  count of its toys by type and loading order.
- **Spill Pile**: Toys spilled at one funnel; has a height derived from the spilled count.
- **Route**: A sequence of track from Depot to Toy Store; the *standard* route (P1) and, in levels
  22–28, the *secret* route (P2); each has a cost and a switch-flip window.
- **Run**: One attempt at a level — planning, running, paused, delivered or derailed — with the
  switch flips made and their times.
- **Run Result**: per chute got/wanted, ratio, score, stars, spilled toys, whether the secret
  detour was taken (F-009, F-012).
- **Chute**: One per wagon at the Toy Station; wants `Q_k` toys of type `X_k` (F-009).
- **Batch**: A factory's timed drop: size, period and offset (F-009).
- **Crossing / Bridge / Tunnel**: Track features that let routes cross at grade, pass over each
  other with ramps, or run hidden under a hill (F-011).
- **Player Progress**: Per level best stars, best score and secret-route mark; settings (mute).

## Success Criteria *(mandatory)*

- **SC-001**: A first-time player passes level 1 within 2 minutes without outside help.
- **SC-002**: On the reference phone, at least 95% of frames over a full level are delivered at 60
  fps, and none below 30 fps.
- **SC-003**: The game is playable within 5 seconds of opening the link on 4G.
- ~~**SC-004**: (F-004) For all 28 levels, replaying the standard route scores exactly 1000 and 3
  stars — verified automatically for every level.~~ *Superseded by SC-014.*
- ~~**SC-005**: (F-007) For levels 22–28, the secret route costs at most 85% of the standard route,
  its flip window is 0.5 × the standard route's (±15%), and replaying it scores 1300 — verified
  automatically.~~ *Superseded by SC-016.*
- **SC-006**: (F-004) Generating any level twice from its recipe produces identical levels in 100%
  of checks.
- **SC-007**: (F-006) Stars, best scores and unlocked levels survive a page reload in 100% of
  checks.
- **SC-008**: (F-005) Every switch on every level can be flipped with one tap in overview, upright,
  on the reference phone.
- **SC-009**: (F-002) In automated checks, the train derails every time the engine reaches a pile at
  or above the threshold, and never when the pile is lower.
- **SC-010**: A new main version is playable at the public address within 10 minutes of the change.
- **SC-011**: (F-008) On the map, during a level and on every card, no flat web-page interface
  element is visible — verified automatically on each screen.
- **SC-012**: (F-008) Every interface button is at least 44 × 44 points and fully inside the screen
  in portrait and in landscape at the reference phone's screen size — verified automatically.
- **SC-013**: (F-008) On the map and in a level, the interface visibly moves on its own within one
  second of appearing, and holds still when the device asks for reduced motion — verified
  automatically.

- **SC-014**: (F-009, F-010) For levels 1–100, replaying the intended route scores 100% (3 stars),
  and running without flipping any switch scores below a pass — verified automatically.
- **SC-015**: (F-010) Every level from 1 to 100 generates in under 1 second on a desktop test
  machine, and level 40 and every later level use the same difficulty settings.
- **SC-016**: (F-012) On every level with a secret detour among levels 1–100, the plain route
  scores 85–99% and the detour 100% — verified automatically; at least 25% of levels 15–100 have
  one.
- **SC-017**: (F-011) At least 80% of levels 15–100 contain a crossing, bridge or tunnel.
- **SC-018**: (F-013) In overview upright on the reference phone size, the level's ground covers
  the whole screen and the board spans at least 90% of the screen width.

## Assumptions

- The product name is **Choo Choo Express Delivery 3D** (the source prompt called it "Choo Choo
  Cargo").
- Single player, no accounts, no online features; English only.
- ~~Order quantities are totals for the whole train; every wagon receives the same layered mix, and
  the sequence is the order in which toy types are loaded.~~ Superseded: each wagon has its own
  chute and order line (F-009).
- Toy counts, spills, derailments and scores are decided by the game rules above (A1–A3), not by
  how simulated toys happen to bounce, so results are repeatable; the toy animation follows the
  rules (FR-018).
- The train's base speed is fixed per level; slopes and the station change it (FR-077); there is
  no player speed control or fast-forward.
- Biome elements such as syrup leaks, windmill gusts and zero-G funnels are visual only.
- Five toy types (blocks, ducks, cars, balls, stars) are enough for all orders and decoys.
- ~~The A3 star rules are read as: 3 stars = 1200+ points (secret route) or a perfect standard-route
  run, because a standard-route run cannot exceed 1000 points (see Clarifications).~~ Superseded
  by FR-075.
- ~~The "switch delay penalty" in route cost (A2) is a fixed delay per switch passed, used to compare
  routes; it does not slow the train.~~ Superseded: route cost is no longer used (F-012).
- A batch that drops with nothing under the hopper is skipped rather than spilled, so a train that
  arrives late does not bury the track; only the engine or a full wagon causes spills.
- Screen readers cannot read a 3D interface; accessibility relies on shapes, symbols and large
  touch targets (NFR-006, NFR-011). Keyboard play is not required.

## Out of Scope

- Accounts, cloud saves, leaderboards, multiplayer.
- Monetization, ads, in-app purchases.
- Level editor and daily-seed modes (levels are endless, F-010).
- Background music (sound effects only), localization, haptic feedback.
- Native app-store builds.
- Biome hazards that change rules or scores (e.g. syrup slowing the train, gusts causing spills).
- Train speed control.

## Clarifications

### Session 2026-10-03

- Q: What is the game called? → A: "Choo Choo Express Delivery 3D".
- Q: Which phone defines the performance targets? → A: iPhone 16 with a 60 Hz display.
- Q: How is the game delivered? → A: The main version is published as a public web page (the
  owner enables the hosting setting).
- Q: What do the dual-solution and scoring rules say in full? → A: Addendum A2 (two independent
  routes, Dual Factory, `Cost(P2) ≤ 0.85 × Cost(P1)`, `Δt(P2) = 0.5 × Δt(P1)`) and A3
  (`Score = 1000 × N_correct/N_total − 5 × N_spilled + B_efficiency`, B = 300 for the secret
  route; stars at 750 / 900 with ≤ 10 spills / 1200) as captured in F-003 and F-007.
- Q: A3 asks for 1200 points for 3 stars "or a zero-spill run on P1", but a standard-route run
  cannot exceed 1000 points — how is 3 stars reached on the standard route (and on levels 1–21,
  which have no secret route)? → A: Decided by the spec author, to be confirmed by the owner: a
  perfect run (all ordered toys correct, nothing extra, zero spills = 1000 points) earns 3 stars.

### Session 2026-10-03 (gameplay v2, owner feedback after playing)

- Q: How should timing matter at factories? → A: Timed batches: each factory drops a batch on a
  clock (period and offset), and the car under the hopper at that moment catches it. Holding loops
  become useful again, but should not appear in every level.
- Q: How do wagons and their order matter? → A: One chute per wagon at the Toy Station; each chute
  wants one toy type and quantity from its own wagon.
- Q: How should progression work? → A: Endless worlds of 7 levels that repeat the biomes, with
  difficulty rising to a ceiling at level 40 (owner wrote "level 5-5"; level 40 is world 6,
  level 5 = "6-5"; 5-5 is level 33).
- Q: What should the secret route be? → A: A more complicated detour that happens to give a more
  perfect payload (e.g. passing a factory on a slower route, or passing factories twice). More toys
  than ordered must not punish the player.

### Session 2026-10-03 (puzzle redesign, owner feedback after playing to 5-5)

- Q: What should the core loop be? → A: A shunting puzzle: plan, then let the train go; no
  interaction after Go ("less realtime, more puzzle"). The run is shown with a timeline scrubber
  whose playhead is a little locomotive, so the outcome is visible at once.
- Q: Par? → A: Players may find routes shorter than the generator predicted; that is welcome.
- Q: Switches? → A: Add alternating switches and switches with dependencies, which are harder to
  predict.
- Q: Prepare the yard with uncoupler pads, or record driving moves? → A: Owner undecided ("let's
  try something"); pads were chosen as the more puzzle-like option.
- Q: Must the train arrive with exactly the ordered wagons? → A: Yes.
- Q: Factories? → A: A major mechanic: some must be reached, maybe more than once, others avoided;
  more factory types are wanted.

## Changelog

| Date | Change | IDs affected |
|------|--------|--------------|
| 2026-10-03 | Initial spec from the Choo Choo Cargo prompt and Addendum A1–A3 | F-001–F-007, US1–US7, FR-001–FR-058, NFR-001–NFR-014, SC-001–SC-010 |
| 2026-10-03 | Added F-008 Toy-Box 3D Interface: the whole interface, including in-world markers, is 3D (owner follow-up) | F-008, US8, FR-059–FR-066, NFR-015, SC-011–SC-012 |
| 2026-10-03 | Amended F-008: the interface and world labels animate whimsically (owner follow-up) | FR-066 (amended), FR-067, FR-068, SC-013, US8 scenario 6 |
| 2026-10-03 | Gameplay v2 from owner feedback: timed batches, wagon chutes and station, score v2, slopes (F-009); endless levels (F-010); crossings, bridges, tunnels (F-011); secret detours (F-012); full-screen boards and readable switches (F-013). Superseded the fixed campaign, continuous pouring, sequence scoring and the A2 secret route | F-009–F-013, US9–US13, FR-069–FR-095, SC-014–SC-018; superseded FR-001, FR-002, FR-007, FR-012–FR-014, FR-016, FR-017, FR-021–FR-027, FR-030, FR-031, FR-033, FR-035–FR-037, FR-045, FR-046, FR-052–FR-057, SC-004, SC-005; amended FR-058 |
| 2026-10-03 | Owner playtest: introduction levels need the mechanic they teach (FR-110); pads may sit on dead-end buffers (FR-101 amended); generated textures, wooden track and recognisable toys (FR-111) | FR-101 (amended), FR-110, FR-111 |
| 2026-10-03 | F-014 clarified: pads, exact order, factory types (FR-108, FR-109); supersedes F-009 batches and toy counts, FR-005 real-time flips and F-012 secret detours | FR-108, FR-109 |
| 2026-10-03 | Added F-014 Shunting Yard Puzzles (draft): plan-then-run, timeline scrubber, buffer reversals, coupling, uncoupler pads, switch kinds, wagon-order goals, par from the solver | F-014, US14, FR-096–FR-107 |
