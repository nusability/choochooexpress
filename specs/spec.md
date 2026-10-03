# Game Specification: Choo Choo Express Delivery 3D

**Created**: 2026-10-03 | **Last Updated**: 2026-10-03 | **Status**: Ready for planning

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
- **Session length**: 1–3 minutes per level; 28 levels in the campaign.
- **Connectivity**: Needs a connection to load; once a level is loaded it plays without network.

## Core Game Loop *(mandatory)*

1. Pick an unlocked level on the meta map.
2. Read the Toy Store's order (which toys, how many, in what sequence) and study the board in
   overview; set the switches.
3. Tap **Go** — the train leaves the Depot.
4. Flip switches in real time to steer the train under the right factories, in the right order;
   toys pour into the open wagons as they pass under each funnel. Avoid overfilling and avoid
   driving into toy piles.
5. The train reaches the Toy Store — the delivery is scored and earns 0–3 stars.
6. Passing a level unlocks the next one; finishing a biome opens the next biome.

**Win / lose / end conditions**: A run ends when the engine reaches the Toy Store (scored; the
level is passed with at least 1 star, i.e. 750 points) or when the train derails into a toy pile
(no score, retry). The player can restart at any time.

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

- **FR-001**: Each level MUST show a tabletop board with a one-way track network that links one
  Depot to one Toy Store using straight and curved track, switches (one track splitting in two),
  merges (two tracks joining) and loops.
- **FR-002**: The train MUST consist of one engine pulling 1–4 open wagons. It moves forward only,
  at a constant speed set by the level, and every wagon follows exactly the path of the engine.
- **FR-003**: Each level MUST start in a planning phase with the train waiting at the Depot; game
  time does not run until the player taps **Go**.
- **FR-004**: When the engine reaches a switch, the train MUST take the branch the switch is set
  to at that moment.
- **FR-005**: The player MUST be able to flip a switch with a single tap during planning and
  while the train runs. A switch MUST NOT change while any part of the train is on it (the tap
  shows "locked" feedback instead), and switches cannot be flipped while the game is paused.
- **FR-006**: Each switch MUST show which branch is active by shape (an arrow and a raised rail),
  not by color alone; flipping is animated and makes a click sound.
- **FR-007**: When the engine reaches the Toy Store, the train MUST stop and the delivery is
  evaluated (F-003).
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

- **FR-012**: Each factory MUST produce one of five toy types — blocks, ducks, cars, balls and
  stars — each with its own shape and color. A Dual Factory (F-007) has two funnels in a row and
  pours two different types one after the other.
- **FR-013**: A funnel MUST pour only while a wagon is underneath it; the engine never receives
  toys.
- **FR-014** *(Fill Condition, A1)*: A wagon passing under a funnel MUST receive
  `Q_pump × (L_funnel ÷ v)` toys of that factory's type, where `Q_pump` is the factory's pour
  rate (toys per second), `L_funnel` the funnel's length along the track and `v` the train speed.
  Levels are tuned so that on a valid route this dose equals exactly the per-wagon amount the
  order needs (`V_target`).
- **FR-015**: Each wagon MUST hold at most `C_wagon` toys in total; toys that do not fit spill onto
  the track under that funnel.
- **FR-016** *(Spill pile, A1)*: Spilled toys MUST build a pile under each funnel whose height is
  `H_spill = S ÷ (W_track × L_funnel × ρ_toy)`, where `S` is the total number of toys spilled at
  that funnel so far (all wagons, all passes), `W_track` the track width and `ρ_toy` the toys'
  packing density. Piles do not shrink during a run.
- **FR-017** *(Derailment, A1)*: When the engine reaches a funnel whose pile has
  `H_spill ≥ 0.5 × wheel height`, the train MUST derail: the engine and wagons tip over and their
  toys burst out in a comical, non-violent toy explosion; the run ends without a score and Retry
  is offered.
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

- **FR-021**: Each Toy Store MUST show an order: a sequence of 1–4 lines, each a toy type and a
  quantity (the total for the whole train). The order, with live counts of what has been loaded
  so far, MUST stay visible throughout the level.
- **FR-022**: The *loaded sequence* MUST be the list of toy types in the order they were loaded,
  with consecutive loads of the same type merged into one line (with their quantities added).
- **FR-023**: `N_correct` MUST be the largest number of delivered toys that can be matched to the
  order in sequence: each order line can be matched to at most one loaded line of the same type,
  matches must keep the order's sequence, and a match counts at most the ordered quantity.
  `N_total` MUST be the larger of the total ordered and total delivered toy counts, so both missing
  toys and extra toys lower the ratio.
- **FR-024** *(Score, A3)*: `Score = 1000 × (N_correct ÷ N_total) − 5 × N_spilled + B_efficiency`,
  where `N_spilled` is the number of toys spilled during the run and `B_efficiency` is 300 when the
  secret route was taken (F-007) and 0 otherwise. The score is rounded to a whole number and never
  shown below 0.
- **FR-025** *(Stars, A3)*: 1 star for a score of at least 750; 2 stars for at least 900 with at
  most 10 spilled toys; 3 stars for at least 1200 (only reachable via the secret route) **or** for
  a perfect run (score 1000: every ordered toy correct, nothing extra, zero spills). A level counts
  as passed with at least 1 star.
- **FR-026**: Below 750 points the store MUST refuse the order: the level is not passed and Retry
  is offered.
- **FR-027**: The results screen MUST show stars, correct/total toys, spilled toys, efficiency
  bonus, final score and personal best, with **Retry**, **Map** and **Next** (Next only when the
  next level is unlocked).
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

- **FR-030**: Every level MUST be generated from a recipe — level seed, order length, switch
  count, factory count, distractor branch count, wagon count and train speed. The same recipe
  MUST always produce the identical board, order, initial switch settings and tuning on every
  device.
- **FR-031** *(Backward generation)*: The generator MUST work backward from the goal: place the
  Toy Store; place the required factories in reverse order (the last order line first); place the
  Depot and connect everything into the standard route; insert the mandatory switches along that
  route; then splice in distractor branches — loop bays (holding loops that rejoin the route
  before their own switch) and decoy branches (which pass a factory with an unordered toy type
  and/or bypass a required factory before rejoining the route).
- **FR-032**: Levels MUST be solvable by construction: the standard route visits the required
  factories in the order's sequence, reaches the Toy Store and delivers exactly the ordered
  quantities with zero spills (score 1000).
- **FR-033**: The board MUST contain exactly the recipe's number of switches, factories (required
  plus decoys) and distractor branches, and the order exactly the recipe's number of lines.
  Switches are counted as: distractor switches (whose second branch is a loop bay or decoy
  branch), plus the route's own loop switches (FR-035), plus — in levels 22–28 — the switch where
  the two routes split (F-007).
- **FR-034**: Initial switch settings MUST come from the seed and MUST NOT already form the whole
  standard route: at least one switch has to be changed.
- **FR-035**: From level 10 on, the standard route of every level MUST include one loop that must
  be entered and then left: a required factory sits on the loop, so the player has to flip the
  loop's switch while the train is inside the loop. The time window to do so — from the moment the
  last wagon clears the switch until the engine comes back to it — MUST be at least 3 seconds on the
  standard route.
- **FR-036**: Difficulty MUST increase across the campaign within these ranges:

  | Biome | Levels | Order lines | Switches | Factories | Distractor branches | Wagons | Flip while running |
  |-------|--------|-------------|----------|-----------|---------------------|--------|--------------------|
  | Living Room Rug | 1–7 | 1–2 | 1–3 | 1–3 | 1–3 | 1–2 | never needed |
  | Candy Kingdom | 8–14 | 2–3 | 2–4 | 2–4 | 1–3 | 2–3 | from level 10 |
  | Garden Sandbox | 15–21 | 2–3 | 3–5 | 3–5 | 2–4 | 3 | yes |
  | Space Playroom | 22–28 | 2–3 | 4–6 | 3–7 | 1–3 | 3 | yes, plus the secret route (F-007) |

  Train speed rises gently from biome to biome.
- **FR-037**: Every board MUST fit the overview on the reference phone held upright, with every
  switch tappable without zooming (FR-044).

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

- **FR-045**: The campaign MUST have exactly 28 levels in four biomes of exactly 7 levels each, in
  this order: Living Room Rug (1–7), Candy Kingdom (8–14), Garden Sandbox (15–21), Space Playroom
  (22–28).
- **FR-046**: The meta map MUST be a 3D tabletop board that shows the four biomes as themed areas
  joined by a track, with one marker per level showing its number, best stars and lock state. The
  player drags to move between biomes and taps a marker to open that level's card.
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

- **FR-052**: Levels 22–28 MUST contain two independent valid routes between the Depot and the Toy
  Store that share only their start and end: the standard route (P1) and the secret route (P2).
  Distractor branches are added only after both routes exist.
- **FR-053** *(Solvability invariant, A2)*: Both routes MUST load exactly the order's sequence and
  quantities with no spills: Sequence(P1) = Sequence(P2) = the order.
- **FR-054**: The secret route MUST pass at least one Dual Factory (two consecutive order types
  poured one after the other) and MUST use fewer switches than the standard route.
- **FR-055** *(Cost divergence, A2)*: Route cost is the route's track length plus a fixed delay
  for every switch the train passes on it; the secret route MUST cost at most 85% of the standard
  route: `Cost(P2) ≤ 0.85 × Cost(P1)`.
- **FR-056** *(Execution window, A2)*: Each route MUST include a loop whose switch has to be
  flipped while the train is inside it; the secret route's window MUST be half of the standard
  route's window (`Δt(P2) = 0.5 × Δt(P1)`, within ±15%).
- **FR-057**: The efficiency bonus (`B_efficiency` = 300, FR-024) MUST be awarded only when the
  train travels exactly the secret route from the Depot to the Toy Store, with no extra loops or
  detours.
- **FR-058**: Neither route is highlighted. Until the secret route of a level has been found, that
  level's card says "A faster route exists".

#### Edge Cases (F-007)

- The player takes the secret route, misses the tight flip and goes around the loop again: the
  second pass under the Dual Factory overfills the wagons (spills) and loads the order types twice,
  and the run no longer counts as the secret route.
- The player switches from one route to the other midway (where distractor branches allow it): no
  bonus; the delivery is scored normally.
- The player finds the secret route on a replay: the mark and the higher best score are saved.

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

## Key Entities

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
- **Run Result**: N_correct, N_total, N_spilled, bonus, score, stars, whether the secret route was
  taken.
- **Player Progress**: Per level best stars, best score and secret-route mark; settings (mute).

## Success Criteria *(mandatory)*

- **SC-001**: A first-time player passes level 1 within 2 minutes without outside help.
- **SC-002**: On the reference phone, at least 95% of frames over a full level are delivered at 60
  fps, and none below 30 fps.
- **SC-003**: The game is playable within 5 seconds of opening the link on 4G.
- **SC-004**: (F-004) For all 28 levels, replaying the standard route scores exactly 1000 and 3
  stars — verified automatically for every level.
- **SC-005**: (F-007) For levels 22–28, the secret route costs at most 85% of the standard route,
  its flip window is 0.5 × the standard route's (±15%), and replaying it scores 1300 — verified
  automatically.
- **SC-006**: (F-004) Generating any level twice from its recipe produces identical levels in 100%
  of checks.
- **SC-007**: (F-006) Stars, best scores and unlocked levels survive a page reload in 100% of
  checks.
- **SC-008**: (F-005) Every switch on every level can be flipped with one tap in overview, upright,
  on the reference phone.
- **SC-009**: (F-002) In automated checks, the train derails every time the engine reaches a pile at
  or above the threshold, and never when the pile is lower.
- **SC-010**: A new main version is playable at the public address within 10 minutes of the change.

## Assumptions

- The product name is **Choo Choo Express Delivery 3D** (the source prompt called it "Choo Choo
  Cargo").
- Single player, no accounts, no online features; English only.
- Order quantities are totals for the whole train; every wagon receives the same layered mix, and
  the sequence is the order in which toy types are loaded.
- Toy counts, spills, derailments and scores are decided by the game rules above (A1–A3), not by
  how simulated toys happen to bounce, so results are repeatable; the toy animation follows the
  rules (FR-018).
- The train's speed is fixed per level; there is no speed control or fast-forward.
- Biome elements such as syrup leaks, windmill gusts and zero-G funnels are visual only.
- Five toy types (blocks, ducks, cars, balls, stars) are enough for all orders and decoys.
- The A3 star rules are read as: 3 stars = 1200+ points (secret route) or a perfect standard-route
  run, because a standard-route run cannot exceed 1000 points (see Clarifications).
- The "switch delay penalty" in route cost (A2) is a fixed delay per switch passed, used to compare
  routes; it does not slow the train.

## Out of Scope

- Accounts, cloud saves, leaderboards, multiplayer.
- Monetization, ads, in-app purchases.
- Level editor, endless or daily-seed modes beyond the 28 campaign levels.
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

## Changelog

| Date | Change | IDs affected |
|------|--------|--------------|
| 2026-10-03 | Initial spec from the Choo Choo Cargo prompt and Addendum A1–A3 | F-001–F-007, US1–US7, FR-001–FR-058, NFR-001–NFR-014, SC-001–SC-010 |
