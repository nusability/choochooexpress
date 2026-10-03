# Contract: Engine API (simulation ↔ presentation)

`src/engine/simulation.ts` exposes one class per run. Presentation code (physics, graphics, UI,
audio) never mutates engine state except through these methods (Principle IV).

```ts
type Phase = 'planning' | 'running' | 'paused' | 'delivered' | 'derailed';
type FlipOutcome = 'flipped' | 'queued' | 'locked' | 'refused';

interface CarPose {
  index: number;            // 0 = engine, 1..W = wagons
  x: number; y: number;     // center, tile coordinates
  heading: number;          // radians; 0 = +x (east), π/2 = +y (south)
  frontX: number; frontY: number; backX: number; backY: number;
}

type SimEvent =
  | { t: 'depart'; tick: number }
  | { t: 'switch'; tick: number; switch: number; state: 0 | 1 }
  | { t: 'switchLocked'; tick: number; switch: number }
  | { t: 'passStart'; tick: number; funnel: number; pass: number }      // engine-side: first wagon enters a funnel span
  | { t: 'load'; tick: number; wagon: number; funnel: number; type: ToyType }
  | { t: 'spill'; tick: number; wagon: number; funnel: number; type: ToyType }
  | { t: 'pileDanger'; tick: number; funnel: number }                    // pile just reached DERAIL_PILE
  | { t: 'derail'; tick: number; funnel: number }
  | { t: 'delivered'; tick: number; result: RunResult };

class Simulation {
  constructor(level: LevelDefinition);
  readonly level: LevelDefinition;
  readonly phase: Phase;
  readonly tick: number;                       // ticks since Go
  switchState(id: number): 0 | 1;
  isSwitchLocked(id: number): boolean;         // any car on the switch tile
  flip(id: number): FlipOutcome;               // planning: applied now; running: queued for next tick
  go(): void;                                  // planning → running
  pause(): void; resume(): void;               // running ⇄ paused
  step(): void;                                // advance exactly one DT tick (no-op unless running)
  drainEvents(): SimEvent[];                   // events since the last drain, in order
  carPoses(alpha?: number): CarPose[];         // alpha ∈ [0,1] interpolates between ticks
  wagonLoads(): { total: number; byType: Partial<Record<ToyType, number>> }[];
  loadedByType(): Partial<Record<ToyType, number>>;
  piles(): { funnel: number; spilled: number; height: number; dangerous: boolean }[];
  traveled(): number;                          // engine distance since Go
  result(): RunResult | null;                  // set once delivered
  replay(): { level: number; flips: [number, number][] };
}

interface RunResult {
  orderLines: { type: ToyType; quantity: number }[];
  loadedLines: { type: ToyType; quantity: number }[];
  nCorrect: number; nTotal: number; nSpilled: number;
  secretRoute: boolean; bonus: 0 | 300;
  score: number; stars: 0 | 1 | 2 | 3; passed: boolean;
  distance: number; ticks: number;
}
```

## Behavioural guarantees

- **Determinism**: two `Simulation`s of the same level fed the same `flip` calls at the same
  ticks emit identical event streams and results (FR-011).
- **Switch decisions**: when the engine front crosses into a switch tile, the lane is chosen from
  the switch's state at that tick (FR-004). Flips are refused while any car overlaps the switch
  tile (`'locked'`, plus a `switchLocked` event) and while paused (`'refused'`).
- **Loading**: per wagon and funnel pass, exactly `dose` `load`/`spill` events are emitted, at
  distance-based thresholds (research R4). The engine car never loads.
- **Derailment**: emitted when the engine front reaches a funnel's span start while that funnel's
  pile is ≥ `DERAIL_PILE`; the phase becomes `derailed` and no further events are emitted.
- **Delivery**: when the engine front reaches the store stop point the phase becomes `delivered`
  and a single `delivered` event carries the `RunResult`.

## Replay format

```json
{ "level": 12, "flips": [[0, 3], [412, 1], [655, 1]] }
```

`[tick, switchId]` pairs; tick 0 = flips made during planning (applied before Go, in order).
Used by unit tests (autopilot) and for bug reports.

## Test hook (browser)

`window.__ccx` (always present, read-only helpers) for the Playwright smoke test:

```ts
interface CcxTestHook {
  screen(): 'boot' | 'map' | 'level';
  phase(): Phase | null;
  level(): number | null;
  switchScreenPositions(): { id: number; x: number; y: number }[]; // CSS px
  switchLane(id: number): number | null;
  standardPlan(): SwitchStep[];
  levelMarkerScreenPosition(level: number): { x: number; y: number } | null;
  result(): RunResult | null;
  physicsReady(): boolean;
  cameraMode(): 'overview' | 'follow' | 'free' | null;
  unlocked(level: number): boolean;
  /** Visible 3D interface widgets (F-008), topmost layer first. */
  widgets(): UiWidgetInfo[];
}

interface UiWidgetInfo {
  id: string;            // stable, e.g. 'go', 'restart', 'results.next', 'card.play', 'map.mute'
  label: string;         // what the control does, e.g. 'Start the train' ('' for non-buttons)
  text: string;          // lettering shown on it, e.g. 'Perfect delivery!'
  x: number; y: number;  // top-left, CSS px
  w: number; h: number;  // size, CSS px (touch target)
  enabled: boolean;      // false for greyed-out buttons
  button: boolean;       // reacts to taps
  layer: 'hud' | 'cards' | 'top';
}
```

URL parameters: `?speed=N` (1–8 ticks per frame, default 1), `?autoplay=1` (autopilot drives the
standard route), `?level=N` (open level N directly if unlocked), `?reset=1` (clear the save),
`?debug=1` (diagnostics readout), `?quality=0–4` (pin the render quality).
