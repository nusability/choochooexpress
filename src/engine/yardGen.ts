// Shunting yard generator (spec F-014 FR-107, research R33). Prompt deliverable 2 (v3).
//
// Build a yard — station on the top row, depot on the bottom row, a main line through a waypoint
// or two, dead-end sidings, run-around loops, factories, wagons and special switches — then run
// every plan the solver can try. Each plan that reaches the station delivers some wagon sequence;
// the goal is one of those sequences that the untouched yard does not deliver, picked rarer as the
// difficulty rises. Par is the shortest solving plan found. Failed attempts retry deterministically
// with a simpler recipe, so a level is always produced.
import { levelLabel, yardRecipe, type YardRecipe } from './campaign';
import { DIRS, inBounds, neighbor, opposite, tileCol, tileIndex, tileRow, turnLeft, turnRight } from './grid';
import { Pcg32, hashSeed } from './prng';
import { routeTrack, type Step } from './router';
import { TOY_TYPES, type BiomeId, type Dir, type PropDef, type ToyType } from './types';
import { defaultPlan, runPlan, type Cell, type FactoryKind, type Piece, type StandingGroup, type TriggerPlate, type YardFactory, type YardLevel, type YardSwitch } from './yard';
import { arrivals, goalKey, PLAN_CAP } from './yardSolver';

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

/** Plain straight tiles with a free tile beside them for a building. */
function factorySpots(y: Yard): { tile: number; building: number }[] {
  const out: { tile: number; building: number }[] = [];
  const candidates = [...y.main.slice(2, -1).map((s) => s.tile), ...y.sidings.flatMap((s) => s.tiles.slice(0, -1)), ...y.legs.flat().map((s) => s.tile)];
  for (const t of candidates) {
    const p = y.pieces.get(t);
    if (!p || p.kind !== 'track' || p.a !== opposite(p.b as Dir) || y.special.has(t)) continue;
    for (const side of [turnLeft(p.a as Dir), turnRight(p.a as Dir)]) {
      const bt = y.nb(t, side);
      if (y.free(bt) && tileRow(bt, y.cols) > 1 && !nearStation(y, bt) && !nearStation(y, t)) out.push({ tile: t, building: bt });
    }
  }
  return out;
}

function addFactories(y: Yard, palette: ToyType[]): void {
  const spots = y.rng.shuffle(factorySpots(y));
  const kinds: FactoryKind[] = ['loader'];
  while (kinds.length < y.r.factories) kinds.push(y.rng.pick(y.r.factoryKinds));
  const used = new Set<number>();
  for (const kind of kinds) {
    const spot = spots.find((s) => !used.has(s.tile) && !used.has(s.building) && y.free(s.building));
    if (!spot) break;
    used.add(spot.tile);
    used.add(spot.building);
    y.building(spot.building);
    y.special.add(spot.tile);
    const [p, q] = y.rng.shuffle([...palette]) as [ToyType, ToyType];
    const f: YardFactory = { id: y.factories.length, tile: spot.tile, kind, building: spot.building };
    if (kind === 'loader' || kind === 'single') f.toy = p;
    if (kind === 'converter' || kind === 'swap') {
      f.from = p;
      f.to = q;
    }
    y.factories.push(f);
  }
  if (y.factories.length === 0) throw new YardGenFail('no factory');
}

/** Wagons stand at the far end of sidings (and on loop legs when the sidings are full). */
function placeWagons(y: Yard, palette: ToyType[]): { groups: StandingGroup[]; wagons: (ToyType | null)[] } {
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
  // Some wagons start loaded.
  for (const id of y.rng.shuffle(wagons.map((_, i) => i)).slice(0, y.r.preloaded)) wagons[id] = y.rng.pick(palette);
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

function build(r: YardRecipe, rng: Pcg32, attempt: number): YardLevel {
  const y = new Yard(r, rng);
  placeStation(y);
  placeDepot(y);
  buildMain(y);
  const maxSiding = Math.min(5, r.wagons + 2);
  let sidings = 0;
  for (let k = 0; k < r.sidings; k++) if (addSiding(y, maxSiding)) sidings++;
  if (sidings === 0) throw new YardGenFail('siding');
  for (let k = 0; k < r.loops; k++) addLoop(y);
  const palette = rng.shuffle([...TOY_TYPES]).slice(0, Math.min(5, 2 + Math.floor(r.difficulty / 8)));
  const { groups, wagons } = placeWagons(y, palette);
  addFactories(y, palette);
  specialSwitches(y);
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
    switches: y.switches,
    plates: y.plates,
    factories: y.factories,
    depot: { tiles: y.depotTiles, buffer: y.depotTiles[0] as number },
    station: { tiles: y.stationTiles, buffer: y.stationTiles[y.stationTiles.length - 1] as number, buildingTiles: y.stationBuildings, dir: y.stationDir },
    engine: y.engine,
    wagons,
    groups,
    goal: [],
    pads: r.pads,
    par: 0,
    solution: { switches: [], pads: [] },
    solutions: 0,
    props: props(y),
  };
}

/** Picks the goal among the sequences some plan delivers (research R33). */
function chooseGoal(level: YardLevel, r: YardRecipe, lenient = false): void {
  const all = arrivals(level, PLAN_CAP);
  const idle = runPlan(level, defaultPlan(level));
  const idleKey = idle.delivered ? goalKey(idle.delivered) : null;
  const byKey = new Map<string, { count: number; best: (typeof all)[number]; withoutPads: number }>();
  for (const a of all) {
    if (a.result.steps > (lenient ? 150 : maxPar(r))) continue;
    const e = byKey.get(a.key) ?? { count: 0, best: a, withoutPads: 0 };
    e.count++;
    if (a.plan.pads.length === 0) e.withoutPads++;
    if (a.result.steps < e.best.result.steps) e.best = a;
    byKey.set(a.key, e);
  }
  let candidates = [...byKey.entries()].filter(([key, e]) => {
    const seq = e.best.result.delivered as (ToyType | null)[];
    return key !== idleKey && seq.length <= r.goalLength && seq.length >= Math.max(1, r.goalLength - 1) && seq.some((t) => t !== null);
  });
  // The full goal length when possible.
  const full = candidates.filter(([, e]) => (e.best.result.delivered as unknown[]).length === r.goalLength);
  if (full.length) candidates = full;
  if (candidates.length === 0) throw new YardGenFail('no goal');
  // With pads to place, prefer goals that cannot be reached without uncoupling.
  if (level.pads > 0) {
    const needPads = candidates.filter(([, e]) => e.withoutPads === 0);
    if (needPads.length) candidates = needPads;
  }
  // Needing a factory: prefer goals whose best plan changes wagon contents.
  const factory = candidates.filter(([, e]) => e.best.result.factoryHits > 0);
  if (factory.length) candidates = factory;
  candidates.sort((x, y) => x[1].count - y[1].count || x[1].best.result.steps - y[1].best.result.steps || (x[0] < y[0] ? -1 : 1));
  const pick = candidates[Math.round((1 - r.rarity) * (candidates.length - 1))] as (typeof candidates)[number];
  const e = pick[1];
  level.goal = e.best.result.delivered as (ToyType | null)[];
  level.par = e.best.result.steps;
  level.solution = e.best.plan;
  level.solutions = e.count;
}

function relax(r: YardRecipe, step: number): YardRecipe {
  const x = { ...r };
  if (step >= 1) {
    x.triggers = Math.max(0, x.triggers - 1);
    x.linked = false;
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

export function generateYardFromRecipe(recipe: YardRecipe, log?: (attempt: number, reason: string) => void): YardLevel {
  let last = '';
  for (let step = 0; step <= RELAX_STEPS; step++) {
    const r = relax(recipe, step);
    for (let k = 0; k < ATTEMPTS; k++) {
      const attempt = step * ATTEMPTS + k;
      const rng = new Pcg32(hashSeed(recipe.seed, attempt), 7);
      try {
        const level = build(r, rng, attempt);
        chooseGoal(level, r, step === RELAX_STEPS);
        return level;
      } catch (err) {
        if (!(err instanceof YardGenFail)) throw err;
        last = err.message;
        log?.(attempt, last);
      }
    }
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
