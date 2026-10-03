// Shunting yard puzzles (spec F-014, research R31/R32): the yard model and the run simulation.
//
// The railway is a set of tile pieces (plain track, crossing, switch, buffer). The train is a list
// of cars, front first, one car per tile; each car's cell says which edge it entered by and which
// edge it leaves by. A step moves the front car into the next tile and every other car into the
// tile of the car in front of it, so cars always follow the front car's trail. Deterministic: a
// plan (switch settings + uncoupler pads) always gives the same run (FR-096).
import { neighbor, opposite } from './grid';
import type { BiomeId, Dir, PropDef, ToyType } from './types';

export type SwitchKind = 'manual' | 'alternating' | 'linked' | 'trigger';
export type FactoryKind = 'loader' | 'single' | 'converter' | 'washer' | 'swap';

export interface Piece {
  tile: number;
  kind: 'track' | 'crossing' | 'switch' | 'buffer';
  /** Track: the two edges. Buffer: `a` is the open edge. */
  a?: Dir;
  b?: Dir;
  /** Switch: index into `YardLevel.switches`. */
  switchId?: number;
}

export interface YardSwitch {
  id: number;
  tile: number;
  stem: Dir;
  branches: [Dir, Dir];
  kind: SwitchKind;
  /** Linked switches share a group; every other switch is its own group. */
  group: number;
  /** Setting before the player changes anything. */
  initial: 0 | 1;
}

export interface TriggerPlate {
  tile: number;
  /** Switches flipped whenever the front car enters the plate. */
  switches: number[];
}

export interface YardFactory {
  id: number;
  tile: number;
  kind: FactoryKind;
  /** Loader / single loader: the toy. Converter: from → to. Swap: from ⇄ to. */
  toy?: ToyType;
  from?: ToyType;
  to?: ToyType;
  building: number;
}

/** A car's place: the tile, the edge it came in by and the edge it heads for (-1 = buffer). */
export interface Cell {
  tile: number;
  from: Dir | -1;
  to: Dir | -1;
}

/** Wagons standing together; cells[0] is the outer end that faces `cells[0].to`. */
export interface StandingGroup {
  cells: Cell[];
  ids: number[];
}

export interface YardLevel {
  level: number;
  world: number;
  label: string;
  biome: BiomeId;
  seed: number;
  attempt: number;
  difficulty: number;
  cols: number;
  rows: number;
  pieces: Piece[];
  switches: YardSwitch[];
  plates: TriggerPlate[];
  factories: YardFactory[];
  depot: { tiles: number[]; buffer: number };
  station: { tiles: number[]; buffer: number; buildingTiles: number[]; dir: Dir };
  /** The engine's starting cell (alone at the depot, facing out). */
  engine: Cell;
  /** Starting contents of every wagon (index = wagon id). */
  wagons: (ToyType | null)[];
  groups: StandingGroup[];
  /** The train the station wants, read from the station buffer outward (FR-103). */
  goal: (ToyType | null)[];
  /** Uncoupler pads the player may place (FR-101). */
  pads: number;
  par: number;
  /** A plan the generator found with `par` steps. */
  solution: Plan;
  /** Plans (of those the solver tried) that solve the level. */
  solutions: number;
  props: PropDef[];
}

export interface Plan {
  /** Setting of every switch (linked switches always equal). */
  switches: (0 | 1)[];
  /** Tiles with an uncoupler pad. */
  pads: number[];
}

export type Outcome = 'delivered' | 'wrongTrain' | 'loop' | 'stuck' | 'crash' | 'limit';

export type YardEvent =
  | { t: 'couple'; tile: number }
  | { t: 'uncouple'; tile: number }
  | { t: 'reverse'; tile: number }
  | { t: 'flip'; switch: number }
  | { t: 'factory'; factory: number; wagon: number; content: ToyType | null }
  | { t: 'arrive'; ok: boolean }
  | { t: 'fail'; outcome: Outcome; tile: number };

export interface Car {
  /** Wagon id, or -1 for the engine. */
  id: number;
  cell: Cell;
}

/** Everything needed to draw one step of a run (FR-098). */
export interface Frame {
  cars: Car[];
  standing: StandingGroup[];
  switches: (0 | 1)[];
  contents: (ToyType | null)[];
  events: YardEvent[];
}

export interface RunResult {
  outcome: Outcome;
  success: boolean;
  steps: number;
  /** Wagon contents from the station buffer outward, when the train reached the station. */
  delivered: (ToyType | null)[] | null;
  reversals: number;
  uncouples: number;
  couples: number;
  factoryHits: number;
  frames: Frame[];
}

export const MAX_STEPS = 200;
export const ENGINE = -1;

/** The plan with every switch as the level shows it and no pads. */
export function defaultPlan(level: YardLevel): Plan {
  return { switches: level.switches.map((s) => s.initial), pads: [] };
}

/** Flips a switch and every switch linked to it (FR-102). */
export function flipGroup(level: YardLevel, states: (0 | 1)[], id: number): number[] {
  const g = level.switches[id]?.group ?? id;
  const flipped: number[] = [];
  for (const sw of level.switches) {
    if (sw.group !== g) continue;
    states[sw.id] = (1 - (states[sw.id] ?? 0)) as 0 | 1;
    flipped.push(sw.id);
  }
  return flipped;
}

const pieceCache = new WeakMap<YardLevel, (Piece | undefined)[]>();

export function pieceAt(level: YardLevel): (Piece | undefined)[] {
  let map = pieceCache.get(level);
  if (!map) {
    map = new Array<Piece | undefined>(level.cols * level.rows);
    for (const p of level.pieces) map[p.tile] = p;
    pieceCache.set(level, map);
  }
  return map;
}

/** The cell a car gets when it enters `piece` through edge `entry`, or null if it cannot. */
export function enterPiece(level: YardLevel, piece: Piece, entry: Dir, states: (0 | 1)[]): { cell: Cell; facing: number } | null {
  switch (piece.kind) {
    case 'track':
      if (entry === piece.a) return { cell: { tile: piece.tile, from: entry, to: piece.b as Dir }, facing: -1 };
      if (entry === piece.b) return { cell: { tile: piece.tile, from: entry, to: piece.a as Dir }, facing: -1 };
      return null;
    case 'crossing':
      return { cell: { tile: piece.tile, from: entry, to: opposite(entry) }, facing: -1 };
    case 'buffer':
      return entry === piece.a ? { cell: { tile: piece.tile, from: entry, to: -1 }, facing: -1 } : null;
    case 'switch': {
      const sw = level.switches[piece.switchId as number] as YardSwitch;
      if (entry === sw.stem) return { cell: { tile: piece.tile, from: entry, to: sw.branches[states[sw.id] ?? 0] }, facing: sw.id };
      if (entry === sw.branches[0] || entry === sw.branches[1]) return { cell: { tile: piece.tile, from: entry, to: sw.stem }, facing: -1 };
      return null;
    }
  }
}

const swapCell = (c: Cell): Cell => ({ tile: c.tile, from: c.to, to: c.from });

function mix(h: number, v: number): number {
  return Math.imul(h ^ (v + 0x9e3779b9), 0x01000193) >>> 0;
}

/**
 * Runs a plan to its end. With `frames`, every step is recorded for playback; without, only the
 * summary is computed (fast, for the solver).
 */
export function runPlan(level: YardLevel, plan: Plan, opts: { frames?: boolean; maxSteps?: number } = {}): RunResult {
  const pieces = pieceAt(level);
  const record = opts.frames ?? false;
  const maxSteps = opts.maxSteps ?? MAX_STEPS;
  const states: (0 | 1)[] = level.switches.map((s, i) => plan.switches[i] ?? s.initial);
  const pads = new Set(plan.pads);
  const contents = [...level.wagons];
  let cars: Car[] = [{ id: ENGINE, cell: { ...level.engine } }];
  let standing: StandingGroup[] = level.groups.map((g) => ({ cells: g.cells.map((c) => ({ ...c })), ids: [...g.ids] }));
  const plateAt = new Map<number, TriggerPlate>();
  for (const p of level.plates) plateAt.set(p.tile, p);
  const factoryAt = new Map<number, YardFactory>();
  for (const f of level.factories) factoryAt.set(f.tile, f);
  const singleUsed = level.factories.map(() => false);
  const frames: Frame[] = [];
  let events: YardEvent[] = [];
  const result: RunResult = { outcome: 'limit', success: false, steps: 0, delivered: null, reversals: 0, uncouples: 0, couples: 0, factoryHits: 0, frames };
  const snapshot = () => {
    if (!record) return;
    frames.push({
      cars: cars.map((c) => ({ id: c.id, cell: { ...c.cell } })),
      standing: standing.map((g) => ({ cells: g.cells.map((c) => ({ ...c })), ids: [...g.ids] })),
      switches: [...states],
      contents: [...contents],
      events,
    });
    events = [];
  };
  const seen = new Set<number>();
  const stateKey = (): number => {
    let h1 = 0x811c9dc5;
    let h2 = 0x12345678;
    const put = (v: number) => {
      h1 = mix(h1, v);
      h2 = mix(h2, v * 31 + 7);
    };
    for (const c of cars) {
      put(c.id);
      put(c.cell.tile);
      put(c.cell.from);
      put(c.cell.to);
    }
    put(-9);
    for (const g of standing) {
      for (let i = 0; i < g.cells.length; i++) {
        put(g.ids[i] as number);
        put((g.cells[i] as Cell).tile);
      }
      put(-7);
    }
    for (const s of states) put(s);
    for (const c of contents) put(c ? c.charCodeAt(0) + c.length : 0);
    for (const u of singleUsed) put(u ? 1 : 0);
    return (h1 >>> 0) * 2097152 + (h2 & 0x1fffff);
  };
  const end = (outcome: Outcome, tile: number) => {
    result.outcome = outcome;
    if (outcome !== 'delivered' && outcome !== 'wrongTrain') events.push({ t: 'fail', outcome, tile });
  };
  const occupiedByTrain = (tile: number) => cars.some((c) => c.cell.tile === tile);

  snapshot();
  seen.add(stateKey());
  for (let step = 1; step <= maxSteps; step++) {
    result.steps = step;
    const head = cars[0] as Car;
    if (head.cell.to === -1) {
      // At a buffer: reverse, leaving behind the wagons past the pad nearest the engine (FR-101).
      const e = cars.findIndex((c) => c.id === ENGINE);
      let cut = -1;
      for (let k = 0; k < e; k++) if (pads.has((cars[k] as Car).cell.tile)) cut = k;
      if (cut >= 0) {
        const left = cars.slice(0, cut + 1);
        standing.push({ cells: left.map((c) => c.cell), ids: left.map((c) => c.id) });
        cars = cars.slice(cut + 1);
        result.uncouples++;
        events.push({ t: 'uncouple', tile: (left[cut] as Car).cell.tile });
      }
      cars = cars.reverse().map((c) => ({ id: c.id, cell: swapCell(c.cell) }));
      result.reversals++;
      events.push({ t: 'reverse', tile: head.cell.tile });
    } else {
      const exit = head.cell.to as Dir;
      const next = neighbor(head.cell.tile, exit, level.cols, level.rows);
      const piece = next >= 0 ? pieces[next] : undefined;
      const entry = opposite(exit);
      if (!piece) {
        end('stuck', head.cell.tile);
        snapshot();
        return result;
      }
      // A standing wagon in the way couples to the train (FR-100).
      const gi = standing.findIndex((g) => g.cells.some((c) => c.tile === next));
      if (gi >= 0) {
        const g = standing[gi] as StandingGroup;
        const last = g.cells.length - 1;
        let joined: Car[] | null = null;
        if ((g.cells[last] as Cell).tile === next && (g.cells[last] as Cell).from === entry) {
          joined = g.cells.map((c, i) => ({ id: g.ids[i] as number, cell: { ...c } }));
        } else if ((g.cells[0] as Cell).tile === next && (g.cells[0] as Cell).to === entry) {
          joined = g.cells.map((c, i) => ({ id: g.ids[i] as number, cell: swapCell(c) })).reverse();
        }
        if (!joined) {
          end('crash', next);
          snapshot();
          return result;
        }
        standing = standing.filter((_, i) => i !== gi);
        cars = [...joined, ...cars];
        result.couples++;
        events.push({ t: 'couple', tile: next });
      } else {
        if (occupiedByTrain(next)) {
          end('crash', next);
          snapshot();
          return result;
        }
        const entered = enterPiece(level, piece, entry, states);
        if (!entered) {
          end('stuck', head.cell.tile);
          snapshot();
          return result;
        }
        for (let i = cars.length - 1; i > 0; i--) (cars[i] as Car).cell = (cars[i - 1] as Car).cell;
        head.cell = entered.cell;
        // An alternating switch flips after every facing pass.
        if (entered.facing >= 0 && level.switches[entered.facing]?.kind === 'alternating') {
          for (const id of flipGroup(level, states, entered.facing)) events.push({ t: 'flip', switch: id });
        }
        const plate = plateAt.get(next);
        if (plate) for (const id of plate.switches) for (const f of flipGroup(level, states, id)) events.push({ t: 'flip', switch: f });
        // Factories act on every wagon entering their tile (FR-108).
        for (const car of cars) {
          if (car.id === ENGINE) continue;
          const f = factoryAt.get(car.cell.tile);
          if (!f) continue;
          const before = contents[car.id] ?? null;
          let after = before;
          if (f.kind === 'loader' && before === null) after = f.toy ?? null;
          else if (f.kind === 'single' && before === null && !singleUsed[f.id]) {
            after = f.toy ?? null;
            singleUsed[f.id] = true;
          } else if (f.kind === 'converter' && before === f.from) after = f.to ?? null;
          else if (f.kind === 'washer') after = null;
          else if (f.kind === 'swap') after = before === f.from ? (f.to ?? null) : before === f.to ? (f.from ?? null) : before;
          if (after !== before) {
            contents[car.id] = after;
            result.factoryHits++;
            events.push({ t: 'factory', factory: f.id, wagon: car.id, content: after });
          }
        }
        for (const f of level.factories) if (f.kind === 'single' && !cars.some((c) => c.cell.tile === f.tile)) singleUsed[f.id] = false;
        if (next === level.station.buffer) {
          const delivered = cars.filter((c) => c.id !== ENGINE).map((c) => contents[c.id] ?? null);
          result.delivered = delivered;
          const ok = delivered.length === level.goal.length && delivered.every((c, i) => c === level.goal[i]);
          result.success = ok;
          result.outcome = ok ? 'delivered' : 'wrongTrain';
          events.push({ t: 'arrive', ok });
          snapshot();
          return result;
        }
      }
    }
    const key = stateKey();
    if (seen.has(key)) {
      end('loop', (cars[0] as Car).cell.tile);
      snapshot();
      return result;
    }
    seen.add(key);
    snapshot();
  }
  end('limit', (cars[0] as Car).cell.tile);
  if (record && frames.length) (frames[frames.length - 1] as Frame).events.push(...events);
  return result;
}

/** The yard before Go: the engine at the depot and every wagon where it stands. */
export function initialFrame(level: YardLevel, switches: (0 | 1)[] = defaultPlan(level).switches): Frame {
  return {
    cars: [{ id: ENGINE, cell: { ...level.engine } }],
    standing: level.groups.map((g) => ({ cells: g.cells.map((c) => ({ ...c })), ids: [...g.ids] })),
    switches: [...switches],
    contents: [...level.wagons],
    events: [],
  };
}
