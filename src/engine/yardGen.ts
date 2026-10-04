// Shunting yard generator (spec F-014 FR-107, research R33). Prompt deliverable 2 (v3).
//
// Build a yard — station on the top row, depot on the bottom row, a main line through a waypoint
// or two, dead-end sidings, run-around loops, factories, wagons and special switches — then run
// every plan the solver can try. Each plan that reaches the station delivers some wagon sequence;
// the goal is one of those sequences that the untouched yard does not deliver, picked rarer as the
// difficulty rises. Par is the shortest solving plan found. Failed attempts retry deterministically
// with a simpler recipe, so a level is always produced.
import { FACTORY_LESSONS, levelLabel, yardRecipe, type Lesson, type YardRecipe } from './campaign';
import { DIRS, inBounds, neighbor, opposite, tileCol, tileIndex, tileRow, turnLeft, turnRight } from './grid';
import { Pcg32, hashSeed } from './prng';
import { routeTrack, type Step } from './router';
import { pickToys } from './toys';
import { type BiomeId, type Dir, type PropDef, type ToyType } from './types';
import { defaultPlan, runPlan, type Cell, type Plan, type RunResult, type FactoryKind, type Piece, type StandingGroup, type TriggerPlate, type YardFactory, type YardLevel, type YardSwitch } from './yard';
import { arrivals, enumeratePlans, goalKey, PLAN_CAP } from './yardSolver';

export class YardGenFail extends Error {}

export const ATTEMPTS = 14;
export const RELAX_STEPS = 4;
/** Longest par the generator accepts (steps): short rides early, longer puzzles later. */
export function maxPar(r: YardRecipe): number {
  return Math.min(150, 36 + 3 * r.difficulty);
}

const FREE = 0;
const TRACK = 1;
const BUILDING = 2;

const PROPS: Record<BiomeId, readonly string[]> = {
  rug: ['pillow', 'block', 'book', 'ball'],
  candy: ['lollipop', 'gumdrop', 'marshmallow', 'cupcake'],
  garden: ['dune', 'bucket', 'spade', 'windmill'],
  space: ['planet', 'rocket', 'starSticker', 'crater'],
  ice: ['snowDrift', 'toy:snowflake', 'toy:iceCube', 'toy:mitten'],
  village: ['bush', 'toy:hayBale', 'toy:sheep', 'toy:fir'],
  shop: ['toy:dice', 'toy:gift', 'toy:yoyo', 'toy:block'],
  roads: ['toy:cone', 'toy:tire', 'bush', 'toy:roadSign'],
};

interface Siding {
  tiles: number[];
  dir: Dir;
}

class Yard {
  readonly cols: number;
  readonly rows: number;
  readonly occ: Uint8Array;
  readonly pieces = new Map<number, Piece>();
  readonly switches: YardSwitch[] = [];
  readonly plates: TriggerPlate[] = [];
  readonly factories: YardFactory[] = [];
  /** Tiles that must stay plain (factories, plates, wagons, depot, station, switches). */
  readonly special = new Set<number>();
  main: Step[] = [];
  readonly sidings: Siding[] = [];
  readonly legs: Step[][] = [];
  stationTiles: number[] = [];
  stationBuildings: number[] = [];
  stationDir: Dir = 1;
  approach = -1;
  depotTiles: number[] = [];
  engine: Cell = { tile: 0, from: 3, to: 1 };

  constructor(
    readonly r: YardRecipe,
    readonly rng: Pcg32,
  ) {
    this.cols = r.cols;
    this.rows = r.rows;
    this.occ = new Uint8Array(r.cols * r.rows);
  }

  nb(t: number, d: Dir): number {
    return neighbor(t, d, this.cols, this.rows);
  }

  free(t: number): boolean {
    return t >= 0 && this.occ[t] === FREE;
  }

  track(tile: number, a: Dir, b: Dir): void {
    const existing = this.pieces.get(tile);
    if (existing) {
      // Only a straight crossing a perpendicular straight is allowed (FR-086).
      if (existing.kind !== 'track' || existing.a !== opposite(existing.b as Dir) || a !== opposite(b) || a === existing.a || a === existing.b) {
        throw new YardGenFail(`tile ${tile} taken`);
      }
      this.pieces.set(tile, { tile, kind: 'crossing' });
      this.special.add(tile);
      return;
    }
    this.pieces.set(tile, { tile, kind: 'track', a, b });
    this.occ[tile] = TRACK;
  }

  buffer(tile: number, a: Dir): void {
    if (!this.free(tile)) throw new YardGenFail('buffer tile taken');
    this.pieces.set(tile, { tile, kind: 'buffer', a });
    this.occ[tile] = TRACK;
    this.special.add(tile);
  }

  building(tile: number): void {
    if (!this.free(tile)) throw new YardGenFail('building tile taken');
    this.occ[tile] = BUILDING;
  }

  addSteps(steps: readonly Step[]): void {
    for (const s of steps) this.track(s.tile, s.from, s.to);
  }

  crossable(tile: number, travel: Dir): boolean {
    if (!this.r.crossings || this.special.has(tile)) return false;
    const p = this.pieces.get(tile);
    return !!p && p.kind === 'track' && p.a === opposite(p.b as Dir) && p.a !== travel && p.a !== opposite(travel);
  }

  /** Route from the edge `exitDir` of `exitTile` into `entryTile` travelling `entryDir`. */
  connect(exitTile: number, exitDir: Dir, entryTile: number, entryDir: Dir, blocked: ReadonlySet<number> = new Set()): Step[] | null {
    const start = this.nb(exitTile, exitDir);
    if (start < 0) return null;
    if (start === entryTile) return exitDir === entryDir ? [] : null;
    const goal = this.nb(entryTile, opposite(entryDir));
    if (goal < 0 || blocked.has(start) || blocked.has(goal)) return null;
    return routeTrack({
      cols: this.cols,
      rows: this.rows,
      isFree: (t) => this.free(t) && !blocked.has(t),
      isOccupied: (t) => !this.free(t),
      canCross: (t, d) => !blocked.has(t) && this.crossable(t, d),
      crossCost: 0.3,
      start,
      startFrom: opposite(exitDir),
      goal,
      goalTo: entryDir,
      rng: this.rng,
      maxExpansions: 5000,
    });
  }

  makeSwitch(tile: number, stem: Dir, branches: [Dir, Dir]): YardSwitch {
    const sw: YardSwitch = { id: this.switches.length, tile, stem, branches, kind: 'manual', group: this.switches.length, initial: 0 };
    this.switches.push(sw);
    this.pieces.set(tile, { tile, kind: 'switch', switchId: sw.id });
    this.special.add(tile);
    return sw;
  }
}

// ---------------------------------------------------------------------------------------------
// Construction

function placeStation(y: Yard): void {
  const n = y.r.goalLength + 2;
  const dir: Dir = y.rng.chance(0.5) ? 1 : 3;
  const lo = dir === 1 ? 1 : 0;
  const hi = dir === 1 ? y.cols - n : y.cols - n - 1;
  if (hi < lo) throw new YardGenFail('station');
  const c0 = y.rng.int(lo, hi);
  const cols = Array.from({ length: n }, (_, i) => c0 + i);
  if (dir === 3) cols.reverse();
  y.stationDir = dir;
  y.stationTiles = cols.map((c) => tileIndex(c, 1, y.cols));
  y.stationBuildings = cols.map((c) => tileIndex(c, 0, y.cols));
  for (const t of y.stationBuildings) y.building(t);
  y.stationTiles.forEach((t, i) => {
    if (i === n - 1) y.buffer(t, opposite(dir));
    else y.track(t, opposite(dir), dir);
    y.special.add(t);
  });
  y.approach = y.nb(y.stationTiles[0] as number, opposite(dir));
}

function placeDepot(y: Yard): void {
  const dir: Dir = y.rng.chance(0.5) ? 1 : 3;
  const row = y.rows - 1;
  const c = dir === 1 ? y.rng.int(0, Math.max(0, y.cols - 4)) : y.rng.int(Math.min(y.cols - 1, 3), y.cols - 1);
  const buf = tileIndex(c, row, y.cols);
  const eng = y.nb(buf, dir);
  if (eng < 0 || y.nb(eng, dir) < 0) throw new YardGenFail('depot');
  y.buffer(buf, dir);
  y.track(eng, opposite(dir), dir);
  y.special.add(eng);
  y.depotTiles = [buf, eng];
  y.engine = { tile: eng, from: opposite(dir), to: dir };
}

function buildMain(y: Yard): void {
  const waypoints = y.rng.int(1, 2);
  let head = { tile: y.engine.tile, dir: y.engine.to as Dir };
  const steps: Step[] = [{ tile: y.engine.tile, from: y.engine.from as Dir, to: y.engine.to as Dir }];
  for (let w = 0; w < waypoints; w++) {
    let placed = false;
    const band: [number, number] = waypoints === 1 ? [3, y.rows - 4] : w === 0 ? [Math.floor(y.rows / 2), y.rows - 4] : [3, Math.floor(y.rows / 2)];
    for (let tries = 0; tries < 40 && !placed; tries++) {
      const t = tileIndex(y.rng.int(0, y.cols - 1), y.rng.int(band[0], Math.max(band[0], band[1])), y.cols);
      const d = y.rng.pick(DIRS);
      if (!y.free(t) || !y.free(y.nb(t, d)) || !y.free(y.nb(t, opposite(d))) || t === y.approach) continue;
      const leg = y.connect(head.tile, head.dir, t, d, new Set([t, y.approach, y.nb(t, d)]));
      if (!leg) continue;
      y.addSteps(leg);
      y.track(t, opposite(d), d);
      steps.push(...leg, { tile: t, from: opposite(d), to: d });
      head = { tile: t, dir: d };
      placed = true;
    }
    if (!placed) break;
  }
  const last = y.connect(head.tile, head.dir, y.stationTiles[0] as number, y.stationDir);
  if (!last) throw new YardGenFail('station leg');
  y.addSteps(last);
  steps.push(...last);
  y.main = steps;
}

/** A main-line index whose tile can become a switch. */
function switchable(y: Yard, i: number): boolean {
  const s = y.main[i];
  if (!s) return false;
  const p = y.pieces.get(s.tile);
  return !!p && p.kind === 'track' && !y.special.has(s.tile);
}

function addSiding(y: Yard, maxLen: number): boolean {
  for (let tries = 0; tries < 50; tries++) {
    const i = y.rng.int(1, y.main.length - 2);
    if (!switchable(y, i)) continue;
    const s = y.main[i] as Step;
    const c = y.rng.pick(DIRS.filter((d) => d !== s.from && d !== s.to));
    const len = y.rng.int(2, maxLen);
    const tiles: number[] = [];
    let t = s.tile;
    for (let k = 0; k < len; k++) {
      t = y.nb(t, c);
      if (!y.free(t) || t === y.approach) break;
      tiles.push(t);
    }
    if (tiles.length < len) continue;
    // A siding's switch mostly faces trains coming from the depot (always without loops), so the
    // train can back into it and come out again toward the depot.
    const stem = y.r.loops === 0 || y.rng.chance(0.75) ? s.from : s.to;
    const through = stem === s.from ? s.to : s.from;
    y.makeSwitch(s.tile, stem, y.rng.chance(0.5) ? [through, c] : [c, through]);
    tiles.forEach((tile, k) => (k === len - 1 ? y.buffer(tile, opposite(c)) : y.track(tile, opposite(c), c)));
    y.sidings.push({ tiles, dir: c });
    return true;
  }
  return false;
}

function addLoop(y: Yard): boolean {
  for (let tries = 0; tries < 40; tries++) {
    const i = y.rng.int(1, y.main.length - 5);
    const j = y.rng.int(i + 3, Math.min(y.main.length - 2, i + 10));
    if (!switchable(y, i) || !switchable(y, j)) continue;
    const a = y.main[i] as Step;
    const b = y.main[j] as Step;
    const ca = y.rng.pick(DIRS.filter((d) => d !== a.from && d !== a.to));
    const cb = y.rng.pick(DIRS.filter((d) => d !== b.from && d !== b.to));
    const leg = y.connect(a.tile, ca, b.tile, opposite(cb), new Set([y.approach]));
    if (!leg || leg.length < 2) continue;
    y.addSteps(leg);
    y.makeSwitch(a.tile, a.from, y.rng.chance(0.5) ? [a.to, ca] : [ca, a.to]);
    y.makeSwitch(b.tile, b.to, y.rng.chance(0.5) ? [b.from, cb] : [cb, b.from]);
    y.legs.push(leg);
    return true;
  }
  return false;
}

/** Within one tile of the station platform or its hall. */
function nearStation(y: Yard, t: number): boolean {
  const c = tileCol(t, y.cols);
  const r = tileRow(t, y.cols);
  return [...y.stationTiles, ...y.stationBuildings].some((s) => Math.abs(tileCol(s, y.cols) - c) <= 1 && Math.abs(tileRow(s, y.cols) - r) <= 1);
}



/** Wagons stand at the far end of sidings (and on loop legs when the sidings are full). */
function placeWagons(y: Yard): { groups: StandingGroup[]; wagons: (ToyType | null)[] } {
  const groups: StandingGroup[] = [];
  const wagons: (ToyType | null)[] = [];
  let left = y.r.wagons;
  for (const siding of y.rng.shuffle([...y.sidings])) {
    if (left <= 0) break;
    const cap = siding.tiles.length;
    const n = Math.min(left, y.rng.int(1, Math.max(1, cap - 1)));
    const cells: Cell[] = [];
    const ids: number[] = [];
    for (let k = 0; k < n; k++) {
      const tile = siding.tiles[cap - 1 - k] as number;
      if (y.special.has(tile) && k > 0) break;
      cells.push({ tile, from: opposite(siding.dir), to: k === 0 ? -1 : siding.dir });
      ids.push(wagons.length);
      wagons.push(null);
      y.special.add(tile);
    }
    groups.push({ cells, ids });
    left -= cells.length;
  }
  if (left > 0) {
    // Remaining wagons stand on a plain piece of a loop leg or the main line.
    const spots = [...y.legs.flat(), ...y.main.slice(3, -2)].filter((s) => y.pieces.get(s.tile)?.kind === 'track' && !y.special.has(s.tile));
    for (const s of y.rng.shuffle(spots)) {
      if (left <= 0) break;
      groups.push({ cells: [{ tile: s.tile, from: s.from, to: s.to }], ids: [wagons.length] });
      wagons.push(null);
      y.special.add(s.tile);
      left--;
    }
  }
  if (left > 0) throw new YardGenFail('wagons');
  return { groups, wagons };
}

function specialSwitches(y: Yard): void {
  const pool = y.rng.shuffle([...y.switches]);
  for (let k = 0; k < y.r.alternating && pool.length; k++) (pool.pop() as YardSwitch).kind = 'alternating';
  if (y.r.linked && pool.length >= 2) {
    const a = pool.pop() as YardSwitch;
    const b = pool.pop() as YardSwitch;
    a.kind = 'linked';
    b.kind = 'linked';
    b.group = a.group;
  }
  for (let k = 0; k < y.r.triggers && pool.length; k++) {
    const sw = pool.pop() as YardSwitch;
    const spots = [...y.main.slice(2, -2), ...y.legs.flat()].filter((s) => y.pieces.get(s.tile)?.kind === 'track' && !y.special.has(s.tile));
    if (!spots.length) break;
    const s = y.rng.pick(spots);
    sw.kind = 'trigger';
    y.plates.push({ tile: s.tile, switches: [sw.id] });
    y.special.add(s.tile);
  }
  for (const sw of y.switches) sw.initial = y.rng.int(0, 1) as 0 | 1;
  for (const sw of y.switches) {
    const first = y.switches.find((o) => o.group === sw.group);
    if (first) sw.initial = first.initial;
  }
}

function props(y: Yard): PropDef[] {
  const kinds = PROPS[y.r.biome];
  const out: PropDef[] = [];
  for (let t = 0; t < y.occ.length; t++) {
    if (!y.free(t) || !y.rng.chance(0.3)) continue;
    const c = tileCol(t, y.cols);
    const r = tileRow(t, y.cols);
    let nearSwitch = false;
    for (const sw of y.switches) if (Math.abs(tileCol(sw.tile, y.cols) - c) <= 1 && Math.abs(tileRow(sw.tile, y.cols) - r) <= 1) nearSwitch = true;
    if (nearSwitch || !inBounds(c, r, y.cols, y.rows)) continue;
    out.push({ kind: y.rng.pick(kinds), tile: t, rotation: y.rng.float(0, Math.PI * 2), scale: y.rng.float(0.8, 1.1), variant: y.rng.int(0, 3) });
  }
  return out;
}

/** The level as data, from the yard as built so far. */
function snapshot(y: Yard, attempt: number, wagons: (ToyType | null)[], groups: StandingGroup[]): YardLevel {
  const r = y.r;
  return {
    level: r.level,
    world: r.world,
    label: levelLabel(r.level),
    biome: r.biome,
    seed: r.seed,
    attempt,
    difficulty: r.difficulty,
    cols: y.cols,
    rows: y.rows,
    pieces: [...y.pieces.values()].sort((a, b) => a.tile - b.tile),
    switches: y.switches.map((sw) => ({ ...sw, branches: [...sw.branches] as [Dir, Dir] })),
    plates: y.plates.map((p) => ({ ...p, switches: [...p.switches] })),
    factories: y.factories.map((f) => ({ ...f })),
    depot: { tiles: y.depotTiles, buffer: y.depotTiles[0] as number },
    station: { tiles: y.stationTiles, buffer: y.stationTiles[y.stationTiles.length - 1] as number, buildingTiles: y.stationBuildings, dir: y.stationDir },
    engine: y.engine,
    wagons: [...wagons],
    groups,
    goal: [],
    pads: r.pads,
    par: 0,
    solution: { switches: [], pads: [] },
    solutions: 0,
    lesson: null,
    props: [],
  };
}

/** The track, wagons and special switches, without factories: the stage the solution is planned on. */
function skeleton(r: YardRecipe, rng: Pcg32): { y: Yard; groups: StandingGroup[]; wagons: (ToyType | null)[] } {
  const y = new Yard(r, rng);
  placeStation(y);
  placeDepot(y);
  buildMain(y);
  const maxSiding = Math.min(5, r.wagons + 2);
  let sidings = 0;
  for (let k = 0; k < r.sidings; k++) if (addSiding(y, maxSiding)) sidings++;
  if (sidings === 0) throw new YardGenFail('siding');
  for (let k = 0; k < r.loops; k++) addLoop(y);
  const { groups, wagons } = placeWagons(y);
  specialSwitches(y);
  return { y, groups, wagons };
}

/** Which wagon entered which tile (and every tile any car stood on) during a run. */
function traceOf(level: YardLevel, plan: Plan): { visited: Map<number, Set<number>>; touched: Set<number> } {
  const frames = runPlan(level, plan, { frames: true }).frames;
  const visited = new Map<number, Set<number>>();
  const touched = new Set<number>();
  for (const f of frames) {
    for (const c of f.cars) {
      touched.add(c.cell.tile);
      if (c.id < 0) continue;
      const set = visited.get(c.cell.tile) ?? new Set<number>();
      set.add(c.id);
      visited.set(c.cell.tile, set);
    }
    for (const g of f.standing) for (const c of g.cells) touched.add(c.tile);
  }
  return { visited, touched };
}

/**
 * Step 1 of the design (research R39): pick the intended solution on the bare yard — a plan that
 * reaches the station with about as many reversals and uncouplings as the recipe asks for.
 */
function intendedPlan(level: YardLevel, r: YardRecipe, rng: Pcg32): Plan {
  const wantUncouples = r.lesson === 'pad' ? 1 : r.pads > 0 && r.difficulty >= 6 ? Math.min(r.pads, 1 + Math.floor(r.difficulty / 20)) : 0;
  const runs = arrivals(level, PLAN_CAP).filter((a) => {
    const n = (a.result.delivered as unknown[]).length;
    if (a.result.steps > maxPar(r) || n < 1) return false;
    if (r.lesson === 'pad' && (a.result.uncouples === 0 || n >= level.wagons.length)) return false;
    // Pads that cut nothing are not part of a plan.
    return a.plan.pads.length <= a.result.uncouples;
  });
  if (!runs.length) throw new YardGenFail('no route');
  // Uncoupling is a core move: when the recipe asks for it and the yard allows it, insist.
  const cutting = runs.filter((a) => a.result.uncouples >= wantUncouples);
  if (wantUncouples > 0 && cutting.length) runs.splice(0, runs.length, ...cutting);
  const cost = (a: (typeof runs)[number]) => Math.abs(a.result.reversals - r.reversals) + 1.5 * Math.abs(a.result.uncouples - wantUncouples) + 1.2 * Math.abs(r.goalLength - (a.result.delivered as unknown[]).length);
  runs.sort((a, b) => cost(a) - cost(b) || a.result.steps - b.result.steps);
  const best = cost(runs[0] as (typeof runs)[number]);
  const near = runs.filter((a) => cost(a) <= best + 0.5).slice(0, 6);
  return (rng.pick(near) as (typeof runs)[number]).plan;
}

/** Plain straight tiles with a free tile beside them for a building. */
function factorySpots(y: Yard): { tile: number; building: number }[] {
  const out: { tile: number; building: number }[] = [];
  for (const [t, p] of y.pieces) {
    if (p.kind !== 'track' || p.a !== opposite(p.b as Dir) || y.special.has(t) || y.depotTiles.includes(t)) continue;
    for (const side of [turnLeft(p.a as Dir), turnRight(p.a as Dir)]) {
      const bt = y.nb(t, side);
      if (y.free(bt) && tileRow(bt, y.cols) > 1 && !nearStation(y, bt) && !nearStation(y, t)) out.push({ tile: t, building: bt });
    }
  }
  return out.sort((a, b) => a.tile - b.tile || a.building - b.building);
}

function makeFactory(id: number, spot: { tile: number; building: number }, kind: FactoryKind, rng: Pcg32, palette: ToyType[]): YardFactory {
  const f: YardFactory = { id, tile: spot.tile, kind, building: spot.building };
  const [p, q] = rng.shuffle([...palette]) as [ToyType, ToyType];
  if (kind === 'loader' || kind === 'single') f.toy = p;
  if (kind === 'converter' || kind === 'swap') {
    f.from = p;
    f.to = q;
  }
  return f;
}

/**
 * Step 2: put the factories the intended run needs on tiles its wagons pass, and the starting
 * loads, so that the run delivers a varied train and every one of those factories matters.
 */
function routeFactories(y: Yard, level: YardLevel, plan: Plan, palette: ToyType[], rng: Pcg32, lenient: boolean): { factories: YardFactory[]; wagons: (ToyType | null)[]; delivered: (ToyType | null)[] } {
  const r = y.r;
  const { visited } = traceOf(level, plan);
  const spots = factorySpots(y).filter((s) => visited.has(s.tile));
  if (!spots.length) throw new YardGenFail('no factory spot');
  const lessonKind = !lenient && r.lesson && FACTORY_LESSONS.has(r.lesson) ? (r.lesson as FactoryKind) : null;
  // The taught kind goes in first, so the factories added later have to work around it.
  const kinds: FactoryKind[] = lessonKind ? [lessonKind, 'loader'] : ['loader'];
  while (kinds.length < r.factories) kinds.push(rng.pick(r.factoryKinds));
  let best: { factories: YardFactory[]; wagons: (ToyType | null)[]; delivered: (ToyType | null)[]; score: number } | null = null;
  for (let tries = 0; tries < 10; tries++) {
    const wagons: (ToyType | null)[] = level.wagons.map(() => null);
    for (const id of rng.shuffle(wagons.map((_, i) => i)).slice(0, r.preloaded)) wagons[id] = rng.pick(palette);
    // Add the factories one by one; keep each only if every factory so far still matters.
    const used = new Set<number>();
    let factories: YardFactory[] = [];
    let delivered: (ToyType | null)[] | null = null;
    for (const kind of kinds) {
      for (const spot of rng.shuffle(spots.filter((s) => !used.has(s.tile) && !used.has(s.building))).slice(0, 5)) {
        const next = [...factories, makeFactory(factories.length, spot, kind, rng, palette)];
        const trial = { ...level, factories: next, wagons };
        const run = runPlan(trial, plan);
        if (!run.delivered) continue;
        const key = goalKey(run.delivered);
        const matters = next.every((f) => {
          const without = runPlan({ ...trial, factories: next.filter((g) => g !== f) }, plan);
          return !without.delivered || goalKey(without.delivered) !== key;
        });
        if (!matters) continue;
        factories = next;
        delivered = run.delivered;
        used.add(spot.tile);
        used.add(spot.building);
        break;
      }
    }
    // The station must get at least one toy.
    if (!delivered || !factories.length || delivered.every((t) => t === null)) continue;
    if (lessonKind && !factories.some((f) => f.kind === lessonKind)) continue;
    const distinct = new Set(delivered.filter((t) => t !== null)).size;
    const score = factories.length * 2 + distinct + (delivered.includes(null) ? -0.5 : 0);
    if (!best || score > best.score) best = { factories, wagons, delivered, score };
    if (factories.length === kinds.length && distinct >= Math.min(2, delivered.length)) break;
  }
  if (!best) throw new YardGenFail('factories');
  return best;
}

/** Step 3: a decoy siding or two off the main line (set to pass by in the intended plan). */
function decoySidings(y: Yard, plan: Plan, count: number): Plan {
  const switches = [...plan.switches];
  for (let k = 0; k < count; k++) {
    const before = y.switches.length;
    if (!addSiding(y, 3)) break;
    const sw = y.switches[before] as YardSwitch;
    sw.initial = y.rng.int(0, 1) as 0 | 1;
    // The intended run keeps going straight through it.
    const main = y.main.find((s) => s.tile === sw.tile) as Step;
    const through = sw.stem === main.from ? main.to : main.from;
    switches.push(sw.branches.indexOf(through) as 0 | 1);
  }
  return { switches, pads: plan.pads };
}

/** Step 4: a little misdirection — factories off the intended route. */
function decoyFactories(y: Yard, level: YardLevel, plan: Plan, factories: YardFactory[], palette: ToyType[], rng: Pcg32): YardFactory[] {
  const { touched } = traceOf(level, plan);
  const used = new Set(factories.flatMap((f) => [f.tile, f.building]));
  const out = [...factories];
  const spots = rng.shuffle(factorySpots(y).filter((s) => !touched.has(s.tile)));
  for (let k = 0; k < y.r.decoys; k++) {
    const spot = spots.find((s) => !used.has(s.tile) && !used.has(s.building));
    if (!spot) break;
    used.add(spot.tile);
    used.add(spot.building);
    out.push(makeFactory(out.length, spot, rng.pick(y.r.factoryKinds), rng, palette));
  }
  return out;
}

/**
 * How hard a level plays (research R39): reversals and uncouplings in the shortest solution,
 * factories and switches the player must use, and how few of the plans tried succeed.
 */
export function difficultyScore(level: YardLevel, best: RunResult, solving: number, tried: number): number {
  const changed = level.switches.filter((s, i) => level.solution.switches[i] !== s.initial).length;
  const used = new Set(best.frames.flatMap((f) => f.events.filter((e) => e.t === 'factory').map((e) => (e as { factory: number }).factory))).size;
  return best.reversals * 1.2 + best.uncouples * 2 + used * 0.8 + changed * 0.7 + Math.log10(Math.max(1, tried / Math.max(1, solving))) * 2 + best.steps / 30;
}

function design(r: YardRecipe, rng: Pcg32, attempt: number, lenient: boolean): { level: YardLevel; score: number; cuts: boolean } {
  const { y, groups, wagons } = skeleton(r, rng);
  const palette = toyPalette(r, rng);
  // 1. The intended solution on the bare yard.
  let plan = intendedPlan(snapshot(y, attempt, wagons, groups), r, rng);
  // 2. Factories and loads around it.
  const routed = routeFactories(y, snapshot(y, attempt, wagons, groups), plan, palette, rng, lenient);
  for (const f of routed.factories) {
    y.building(f.building);
    y.special.add(f.tile);
  }
  y.factories.push(...routed.factories);
  // 3. Distractor track, then 4. decoy factories off the route.
  plan = decoySidings(y, plan, r.difficulty >= 8 && rng.chance(0.5) ? 1 : 0);
  let level = snapshot(y, attempt, routed.wagons, groups);
  const factories = decoyFactories(y, level, plan, level.factories, palette, rng);
  for (const f of factories.slice(level.factories.length)) {
    y.building(f.building);
    y.special.add(f.tile);
  }
  y.factories.length = 0;
  y.factories.push(...factories);
  level = snapshot(y, attempt, routed.wagons, groups);
  // The goal is what the intended solution delivers.
  const intended = runPlan(level, plan);
  if (!intended.delivered || goalKey(intended.delivered) !== goalKey(routed.delivered)) throw new YardGenFail('route changed');
  level.goal = intended.delivered;
  const idle = runPlan(level, defaultPlan(level));
  if (idle.delivered && goalKey(idle.delivered) === goalKey(level.goal)) throw new YardGenFail('idle solves');
  // Verify with the solver: par is the shortest solving plan it finds (maybe shorter than ours).
  const key = goalKey(level.goal);
  const tried = enumeratePlans(level, PLAN_CAP).length;
  const solving = arrivals(level, PLAN_CAP).filter((a) => a.key === key);
  // The intended plan always counts (the solver samples big plan spaces).
  const same = (a: Plan) => a.switches.join() === plan.switches.join() && [...a.pads].sort().join() === [...plan.pads].sort().join();
  if (!solving.some((a) => same(a.plan))) solving.push({ key, plan, result: intended });
  if (!solving.length) throw new YardGenFail('unsolvable');
  const lesson = lenient ? null : r.lesson;
  if (lesson && !solving.every((a) => needsLesson(level, lesson, a.plan, a.result))) throw new YardGenFail(`lesson ${lesson}`);
  solving.sort((a, b) => a.result.steps - b.result.steps);
  const top = solving[0] as (typeof solving)[number];
  level.par = top.result.steps;
  level.solution = top.plan;
  level.solutions = solving.length;
  level.lesson = lesson;
  level.props = props(y);
  const bestRun = runPlan(level, top.plan, { frames: true });
  // The shortest solution may take another way than ours; it must still use most factories.
  const used = new Set(bestRun.frames.flatMap((f) => f.events.flatMap((e) => (e.t === 'factory' ? [e.factory] : []))));
  if (level.factories.length - used.size > Math.max(1, r.decoys + 1) || used.size < Math.ceil(level.factories.length / 2)) throw new YardGenFail('unused factories');
  const score = difficultyScore(level, bestRun, solving.length, tried);
  // Whether every solution found has to uncouple.
  const cuts = solving.every((a) => a.result.uncouples > 0);
  return { level, score, cuts };
}

/** The toys a level uses, from its biome's set. */
function toyPalette(r: YardRecipe, rng: Pcg32): ToyType[] {
  return pickToys(r.biome, Math.min(5, 2 + Math.floor(r.difficulty / 8)), (list) => rng.shuffle(list));
}

/** Whether a solving plan could not reach the same train without the lesson's mechanic (FR-110). */
export function needsLesson(level: YardLevel, lesson: Lesson, plan: Plan, result: RunResult): boolean {
  const key = goalKey(result.delivered ?? []);
  const sameWithout = (variant: YardLevel, p: Plan = plan) => {
    const run = runPlan(variant, p);
    return run.delivered !== null && goalKey(run.delivered) === key;
  };
  switch (lesson) {
    case 'pad':
      return result.uncouples > 0;
    case 'linked': {
      if (!level.switches.some((s) => s.kind === 'linked' && plan.switches[s.id] !== s.initial)) return false;
      // The train runs over both switches of a linked pair, set away from how they start.
      const frames = runPlan(level, plan, { frames: true }).frames;
      const visited = new Set(frames.flatMap((f) => f.cars.map((c) => c.cell.tile)));
      const linked = level.switches.filter((s) => s.kind === 'linked');
      return linked.length > 0 && linked.every((s) => visited.has(s.tile)) && linked.some((s) => plan.switches[s.id] !== s.initial);
    }
    case 'trigger':
      return !sameWithout({ ...level, plates: [] });
    default:
      return !sameWithout({ ...level, factories: level.factories.filter((f) => f.kind !== lesson) });
  }
}

function relax(r: YardRecipe, step: number): YardRecipe {
  const x = { ...r };
  if (step >= 1) {
    // Never relax away the mechanic the level teaches.
    x.triggers = Math.max(x.lesson === 'trigger' ? 1 : 0, x.triggers - 1);
    x.linked = x.lesson === 'linked';
  }
  if (step >= 2) {
    x.goalLength = Math.max(1, x.goalLength - 1);
    x.loops = Math.max(0, x.loops - 1);
  }
  if (step >= 3) {
    x.pads = Math.min(x.pads, 1);
    x.alternating = 0;
    x.factories = Math.max(1, x.factories - 1);
  }
  if (step >= 4) {
    x.goalLength = 1;
    x.preloaded = 0;
    x.factoryKinds = ['loader'];
    x.sidings = Math.max(1, x.sidings);
  }
  return x;
}

/** Successful designs compared per level; the one closest to the recipe's target difficulty wins. */
export const CANDIDATES = 4;

export function generateYardFromRecipe(recipe: YardRecipe, log?: (attempt: number, reason: string) => void): YardLevel {
  let last = '';
  for (let step = 0; step <= RELAX_STEPS; step++) {
    const r = relax(recipe, step);
    let best: { level: YardLevel; score: number; cuts: boolean } | null = null;
    // Distance to the target; levels with pads would rather need them.
    const miss = (d: { score: number; cuts: boolean }) => Math.abs(d.score - r.target) + (r.pads > 0 && r.difficulty >= 6 && !d.cuts ? 8 : 0);
    let found = 0;
    for (let k = 0; k < ATTEMPTS && found < CANDIDATES; k++) {
      const attempt = step * ATTEMPTS + k;
      const rng = new Pcg32(hashSeed(recipe.seed, attempt), 7);
      try {
        const d = design(r, rng, attempt, step === RELAX_STEPS);
        found++;
        if (!best || miss(d) < miss(best)) best = d;
        // Close enough: stop looking (keeps generation quick on phones).
        if (miss(best) < 1.5) break;
      } catch (err) {
        if (!(err instanceof YardGenFail)) throw err;
        last = err.message;
        log?.(attempt, last);
      }
    }
    if (best) return best.level;
  }
  throw new Error(`Level ${recipe.level}: no yard after ${(RELAX_STEPS + 1) * ATTEMPTS} attempts (${last})`);
}

const cache = new Map<number, YardLevel>();

export function generateYard(level: number): YardLevel {
  const hit = cache.get(level);
  if (hit) return hit;
  const def = generateYardFromRecipe(yardRecipe(level));
  cache.set(level, def);
  return def;
}
