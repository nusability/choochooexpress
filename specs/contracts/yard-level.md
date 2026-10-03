# Contract: Shunting yard levels and runs (F-014)

Source of truth: `src/engine/yard.ts` (types, `runPlan`, `initialFrame`, `flipGroup`),
`src/engine/yardSolver.ts` (`enumeratePlans`, `padCandidates`, `arrivals`) and
`src/engine/yardGen.ts` (`generateYard(level)`). Pure data, JSON-serializable, deterministic.

```ts
interface YardLevel {
  level; world; label; biome; seed; attempt; difficulty; cols; rows;
  pieces: Piece[];            // track (a, b) | crossing | switch (switchId) | buffer (open edge a)
  switches: YardSwitch[];     // stem, branches [b0, b1], kind manual|alternating|linked|trigger, group, initial
  plates: TriggerPlate[];     // tile → switches it flips when the front car enters it
  factories: YardFactory[];   // tile, kind loader|single|converter|washer|swap, toy | from/to, building
  depot: { tiles; buffer };
  station: { tiles; buffer; buildingTiles; dir };
  engine: Cell;               // { tile, from, to }, -1 = buffer end
  wagons: (ToyType | null)[]; // starting contents by wagon id
  groups: StandingGroup[];    // standing wagons: cells (cells[0] faces outward) + ids
  goal: (ToyType | null)[];   // the train the station wants, read from the station buffer
  pads: number;               // uncouplers the player may place
  par: number; solution: Plan; solutions: number; props: PropDef[];
  lesson: Lesson | null;      // pad|washer|converter|linked|single|trigger|swap on introduction levels (FR-110)
}
interface Plan { switches: (0 | 1)[]; pads: number[] }

function runPlan(level: YardLevel, plan: Plan, opts?: { frames?: boolean; maxSteps?: number }): RunResult;
function padAllowed(level: YardLevel, tile: number): boolean; // plain track or a dead-end buffer, not the station
function needsLesson(level, lesson, plan, result): boolean;     // yardGen.ts: the plan could not do without it
// RunResult: outcome delivered|wrongTrain|loop|stuck|crash|limit, success, steps, delivered,
// reversals, uncouples, couples, factoryHits, frames (cars, standing, switches, contents, events).
```

## Invariants (unit tests)

1. `runPlan(level, level.solution)` delivers `level.goal` in exactly `level.par` steps.
2. `runPlan(level, defaultPlan(level))` does not succeed.
3. `level.solution.pads.length ≤ level.pads`; linked switches always share one setting.
4. The same level number always yields a deep-equal level; the same plan always the same run.
5. On an introduction level (`LESSONS` in `campaign.ts`), every solving plan the solver finds needs
   `level.lesson`; every other level has `lesson: null`.
