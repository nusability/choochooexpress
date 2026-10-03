// Backward level generator (spec F-004, research R5/R7). Prompt deliverable 2.
//
// Construction order for a level: Toy Store → required factories from the last order line to the
// first (each connected forward to the route built so far) → Depot → distractor branches → initial
// switch states → tuning → props. Levels 22–28 build two independent routes (see buildDual).
import { factoryCount, recipeFor, switchCount } from './campaign';
import {
  FUNNEL_SPAN_END, FUNNEL_SPAN_START, SWITCH_DELAY, WAGON_CAPACITY, pourRate, switchWindow, trainLength,
} from './flow';
import { DIRS, DX, DY, E, N, S, W, inBounds, laneKind, laneLengthOf, neighbor, opposite, tileCol, tileIndex, tileRow, turnLeft, turnRight } from './grid';
import { buildLoop, type LoopShape } from './loops';
import { Pcg32, hashSeed } from './prng';
import { routeTrack, type Step } from './router';
import { TrackGraph } from './trackGraph';
import {
  TOY_TYPES, type BiomeId, type Dir, type DistractorKind, type FactoryDef, type FunnelDef, type Lane, type LevelDefinition,
  type LevelRecipe, type Piece, type PropDef, type RouteInfo, type SwitchDef, type ToyType,
} from './types';

export const MAX_GEN_ATTEMPTS = 400;

/** Windows (seconds) for loops; see data-model.md §Constants. */
export const MUST_LOOP_WINDOW: readonly [number, number] = [3, 6];
export const LOOP_BAY_MIN_WINDOW = 1.2;
export const P2_LOOP_WINDOW: readonly [number, number] = [1.3, 2.5];
export const WINDOW_RATIO: readonly [number, number] = [0.425, 0.575];
export const COST_RATIO_MAX = 0.85;

/** Longest standard route per biome (tiles), so a run stays around half a minute. */
export const MAX_ROUTE_LENGTH: Readonly<Record<BiomeId, number>> = { rug: 30, candy: 42, garden: 46, space: 64 };

export class GenFail extends Error {}

const FREE = 0;
const TRACK = 1;
const BUILDING = 2;

/** Entry point of the part of a route that is already built. */
interface Head {
  tile: number;
  from: Dir;
}

interface Placed {
  head: Head;
  /** Lanes in travel order, to be prepended to the route built so far. */
  lanes: number[];
}

interface FunnelSpec {
  type: ToyType;
  dose: number;
}

const PROPS: Record<BiomeId, readonly string[]> = {
  rug: ['pillow', 'block', 'book', 'ball'],
  candy: ['lollipop', 'gumdrop', 'marshmallow', 'cupcake'],
  garden: ['dune', 'bucket', 'spade', 'windmill'],
  space: ['planet', 'rocket', 'starSticker', 'crater'],
};

class Builder {
  readonly cols: number;
  readonly rows: number;
  readonly occ: Uint8Array;
  readonly lanes: Lane[] = [];
  readonly tileLanes = new Map<number, number[]>();
  readonly switches: SwitchDef[] = [];
  readonly factories: FactoryDef[] = [];
  readonly funnels: FunnelDef[] = [];
  readonly funnelByLane = new Map<number, number>();
  /** Tiles of loops and loop modules; distractors never attach to them. */
  readonly moduleTiles = new Set<number>();
  readonly distractors: { kind: DistractorKind; switch: number }[] = [];
  readonly loopWindow = new Map<number, number>();
  depotTiles: number[] = [];
  depotLanes: number[] = [];
  storeTile = -1;
  storeLane = -1;
  storeBuilding = -1;
  readonly trainLen: number;

  constructor(
    readonly recipe: LevelRecipe,
    readonly rng: Pcg32,
  ) {
    this.cols = recipe.cols;
    this.rows = recipe.rows;
    this.occ = new Uint8Array(recipe.cols * recipe.rows);
    this.trainLen = trainLength(recipe.wagons);
  }

  free(t: number): boolean {
    return t >= 0 && this.occ[t] === FREE;
  }

  occupied(t: number): boolean {
    return t >= 0 && this.occ[t] !== FREE;
  }

  nb(t: number, d: Dir): number {
    return neighbor(t, d, this.cols, this.rows);
  }

  /** Tile at `u` steps along `d` and `v` steps along `side` from `t`, or -1. */
  offset(t: number, d: Dir, u: number, side: Dir = d, v = 0): number {
    const c = tileCol(t, this.cols) + u * (DX[d] as number) + v * (DX[side] as number);
    const r = tileRow(t, this.cols) + u * (DY[d] as number) + v * (DY[side] as number);
    return inBounds(c, r, this.cols, this.rows) ? tileIndex(c, r, this.cols) : -1;
  }

  manhattan(a: number, b: number): number {
    return Math.abs(tileCol(a, this.cols) - tileCol(b, this.cols)) + Math.abs(tileRow(a, this.cols) - tileRow(b, this.cols));
  }

  addLane(tile: number, from: Dir, to: Dir): number {
    const kind = laneKind(from, to);
    const id = this.lanes.length;
    this.lanes.push({ id, tile, from, to, kind, length: laneLengthOf(kind) });
    const list = this.tileLanes.get(tile);
    if (list) {
      if (list.length >= 2) throw new GenFail(`tile ${tile} would hold three lanes`);
      list.push(id);
    } else this.tileLanes.set(tile, [id]);
    this.occ[tile] = TRACK;
    return id;
  }

  addSteps(steps: readonly Step[]): number[] {
    return steps.map((s) => this.addLane(s.tile, s.from, s.to));
  }

  addBuilding(tile: number): void {
    if (!this.free(tile)) throw new GenFail(`building on occupied tile ${tile}`);
    this.occ[tile] = BUILDING;
  }

  addSwitch(tile: number, lanes: [number, number], kind: SwitchDef['kind']): SwitchDef {
    const sw: SwitchDef = { id: this.switches.length, tile, lanes, initial: 0, kind };
    this.switches.push(sw);
    return sw;
  }

  addFactory(kind: FactoryDef['kind'], route: FactoryDef['route'], specs: { lane: number; type: ToyType; dose: number }[], buildingTiles: number[]): FactoryDef {
    const factory: FactoryDef = { id: this.factories.length, kind, route, funnels: [], buildingTiles };
    for (const spec of specs) {
      const funnel: FunnelDef = {
        id: this.funnels.length,
        factory: factory.id,
        lane: spec.lane,
        type: spec.type,
        dose: spec.dose,
        rate: pourRate(spec.dose, this.recipe.speed),
        spanStart: FUNNEL_SPAN_START,
        spanEnd: FUNNEL_SPAN_END,
      };
      this.funnels.push(funnel);
      this.funnelByLane.set(spec.lane, funnel.id);
      factory.funnels.push(funnel.id);
    }
    for (const t of buildingTiles) this.addBuilding(t);
    this.factories.push(factory);
    return factory;
  }

  lane(id: number): Lane {
    return this.lanes[id] as Lane;
  }

  /** Route a connection leaving `exitTile` through `exitDir` and entering the head. */
  routeLeg(exitTile: number, exitDir: Dir, head: Head, blocked: ReadonlySet<number>): Step[] | null {
    const start = this.nb(exitTile, exitDir);
    if (start < 0) return null;
    if (start === head.tile) return opposite(exitDir) === head.from ? [] : null;
    const goal = this.nb(head.tile, head.from);
    if (goal < 0 || blocked.has(start) || blocked.has(goal)) return null;
    return routeTrack({
      cols: this.cols,
      rows: this.rows,
      isFree: (t) => this.free(t) && !blocked.has(t),
      isOccupied: (t) => this.occupied(t),
      start,
      startFrom: opposite(exitDir),
      goal,
      goalTo: opposite(head.from),
      rng: this.rng,
    });
  }
}

function legLength(steps: readonly Step[]): number {
  return steps.reduce((sum, s) => sum + laneLengthOf(laneKind(s.from, s.to)), 0);
}

function splitDoses(rng: Pcg32, n: number): number[] {
  // 75–89% of capacity: the valid route stays below the 90% warning, any extra pass overflows.
  const total = rng.int(60, 71);
  if (n === 1) return [total];
  const weights = Array.from({ length: n }, () => rng.float(0.7, 1.3));
  const sum = weights.reduce((a, b) => a + b, 0);
  const doses = weights.map((w) => Math.max(15, Math.round((total * w) / sum)));
  let diff = total - doses.reduce((a, b) => a + b, 0);
  while (diff !== 0) {
    const i = diff > 0 ? doses.indexOf(Math.min(...doses)) : doses.indexOf(Math.max(...doses));
    doses[i] = (doses[i] as number) + Math.sign(diff);
    diff -= Math.sign(diff);
  }
  if (doses.some((d) => d < 15)) throw new GenFail('dose split');
  return doses;
}

// ---------------------------------------------------------------------------------------------
// Placement steps (backward)

function placeStore(b: Builder): Placed {
  const col = b.rng.int(1, b.cols - 2);
  b.storeBuilding = tileIndex(col, 0, b.cols);
  b.storeTile = tileIndex(col, 1, b.cols);
  b.addBuilding(b.storeBuilding);
  b.storeLane = b.addLane(b.storeTile, S, N);
  return { head: { tile: b.storeTile, from: S }, lanes: [b.storeLane] };
}

interface FactoryOpts {
  dist: [number, number];
  minLeg: number;
  route: FactoryDef['route'];
  /** Prefer candidates far from this tile (used to spread the standard route in dual levels). */
  farFrom?: number;
}

function placeFactory(b: Builder, head: Head, spec: FunnelSpec, opts: FactoryOpts): (Placed & { factory: FactoryDef }) | null {
  const approach = b.nb(head.tile, head.from);
  if (approach < 0 || !b.free(approach)) return null;
  const candidates: { t: number; d: Dir; bt: number }[] = [];
  for (let t = 0; t < b.occ.length; t++) {
    if (!b.free(t)) continue;
    const dist = b.manhattan(t, approach);
    if (dist < opts.dist[0] || dist > opts.dist[1]) continue;
    for (const d of DIRS) {
      const entry = b.nb(t, opposite(d));
      const exit = b.nb(t, d);
      if (entry < 0 || exit < 0 || !b.free(entry) || entry === approach) continue;
      for (const side of [turnLeft(d), turnRight(d)]) {
        const bt = b.nb(t, side);
        if (bt < 0 || !b.free(bt) || bt === approach || bt === exit) continue;
        candidates.push({ t, d, bt });
      }
    }
  }
  b.rng.shuffle(candidates);
  if (opts.farFrom !== undefined) {
    const far = opts.farFrom;
    candidates.sort((x, y) => b.manhattan(y.t, far) - b.manhattan(x.t, far));
  }
  for (const c of candidates.slice(0, 60)) {
    const entry = b.nb(c.t, opposite(c.d));
    const steps = b.routeLeg(c.t, c.d, head, new Set([c.t, c.bt, entry]));
    if (!steps || legLength(steps) < opts.minLeg) continue;
    const lane = b.addLane(c.t, opposite(c.d), c.d);
    const leg = b.addSteps(steps);
    const factory = b.addFactory('required', opts.route, [{ lane, type: spec.type, dose: spec.dose }], [c.bt]);
    return { head: { tile: c.t, from: opposite(c.d) }, lanes: [lane, ...leg], factory };
  }
  return null;
}

interface LoopModuleOpts {
  window: readonly [number, number];
  route: FactoryDef['route'];
  factoryKind: FactoryDef['kind'];
  maxHeight: number;
  /** Prefer compact (short circuit) shapes. */
  tight?: boolean;
  tries?: number;
}

/**
 * A loop the route must enter and leave again: M (merge) … W (switch), with the factory funnel(s)
 * on straight loop tiles. Route: M → chord → W(diverge) → loop → M(merge) → chord → W(straight).
 */
function placeLoopModule(
  b: Builder,
  head: Head,
  specs: readonly FunnelSpec[],
  opts: LoopModuleOpts,
): (Placed & { factory: FactoryDef; switchId: number; window: number }) | null {
  const approach = b.nb(head.tile, head.from);
  if (approach < 0 || !b.free(approach)) return null;
  const near: number[] = [];
  for (let t = 0; t < b.occ.length; t++) if (b.free(t) && b.manhattan(t, approach) <= 6) near.push(t);
  if (near.length === 0) return null;
  for (let tries = 0; tries < (opts.tries ?? 500); tries++) {
    const wTile = b.rng.pick(near);
    const d = b.rng.pick(DIRS);
    const k = b.rng.pick([0, 0, 1, 1, 2]);
    const side = b.rng.chance(0.5) ? turnLeft(d) : turnRight(d);
    const h = opts.tight ? b.rng.int(1, 2) : b.rng.int(1, opts.maxHeight);
    const a = h === 1 ? 0 : b.rng.int(0, opts.tight ? 1 : 2);
    const bb = h === 1 ? 0 : b.rng.int(0, opts.tight ? 1 : 2);
    const mTile = b.offset(wTile, d, -(k + 1));
    if (mTile < 0 || !b.free(mTile)) continue;
    const entry = b.nb(mTile, opposite(d));
    if (entry < 0 || !b.free(entry) || b.nb(wTile, d) < 0) continue;
    const shape = buildLoop({ cols: b.cols, rows: b.rows, mTile, d, k, side, a, b: bb, h });
    if (!shape || shape.wTile !== wTile) continue;
    const moduleTiles = new Set<number>([mTile, wTile, ...shape.chord, ...shape.cells.map((c) => c.tile)]);
    if (moduleTiles.size !== 2 + shape.chord.length + shape.cells.length) continue;
    if ([...moduleTiles].some((t) => !b.free(t)) || moduleTiles.has(entry) || moduleTiles.has(approach)) continue;
    const window = switchWindow(shape.circuit, shape.switchLaneLength, b.trainLen, b.recipe.speed);
    if (window < opts.window[0] || window > opts.window[1]) continue;
    const funnelCells = pickFunnelCells(b, shape, specs.length, moduleTiles, entry, approach);
    if (!funnelCells) continue;
    const blocked = new Set<number>([...moduleTiles, entry, ...funnelCells.map((f) => f.building)]);
    const steps = b.routeLeg(wTile, d, head, blocked);
    if (!steps) continue;
    // Commit.
    const laneM = b.addLane(mTile, opposite(d), d);
    const chordLanes = shape.chord.map((t) => b.addLane(t, opposite(d), d));
    const laneW = b.addLane(wTile, opposite(d), d);
    const laneWd = b.addLane(wTile, opposite(d), side);
    const loopLanes = shape.cells.map((c) => b.addLane(c.tile, c.from, c.to));
    const laneMm = b.addLane(mTile, side, d);
    const sw = b.addSwitch(wTile, [laneW, laneWd], 'loop');
    const factory = b.addFactory(
      opts.factoryKind,
      opts.route,
      funnelCells.map((f, i) => ({ lane: loopLanes[f.index] as number, type: (specs[i] as FunnelSpec).type, dose: (specs[i] as FunnelSpec).dose })),
      funnelCells.map((f) => f.building),
    );
    for (const t of moduleTiles) b.moduleTiles.add(t);
    b.loopWindow.set(sw.id, window);
    const leg = b.addSteps(steps);
    return {
      head: { tile: mTile, from: opposite(d) },
      lanes: [laneM, ...chordLanes, laneWd, ...loopLanes, laneMm, ...chordLanes, laneW, ...leg],
      factory,
      switchId: sw.id,
      window,
    };
  }
  return null;
}

/** Straight loop cells for the funnels (in travel order) with a free building tile outside. */
function pickFunnelCells(
  b: Builder,
  shape: LoopShape,
  count: number,
  moduleTiles: ReadonlySet<number>,
  entry: number,
  approach: number,
): { index: number; building: number }[] | null {
  const straight = shape.cells.map((c, i) => ({ c, i })).filter(({ c }) => c.from === opposite(c.to));
  if (straight.length < count) return null;
  const chosen: { index: number; building: number }[] = [];
  const used = new Set<number>();
  // Spread funnels around the loop: try candidates in a shuffled order but keep travel order.
  const order = b.rng.shuffle(straight.map((s) => s.i));
  for (const index of order) {
    if (chosen.length === count) break;
    const cell = shape.cells[index];
    if (!cell) continue;
    const sides = b.rng.shuffle([turnLeft(cell.to), turnRight(cell.to)]);
    for (const side of sides) {
      const bt = b.nb(cell.tile, side);
      if (bt < 0 || !b.free(bt) || moduleTiles.has(bt) || used.has(bt) || bt === entry || bt === approach) continue;
      chosen.push({ index, building: bt });
      used.add(bt);
      break;
    }
  }
  if (chosen.length < count) return null;
  chosen.sort((x, y) => x.index - y.index);
  return chosen;
}

function placeDepot(b: Builder, head: Head): number[] {
  const len = Math.ceil(b.trainLen + 0.3);
  const candidates: { first: number; d: Dir; tiles: number[]; score: number }[] = [];
  for (let t = 0; t < b.occ.length; t++) {
    for (const d of DIRS) {
      const tiles: number[] = [];
      for (let i = 0; i < len; i++) tiles.push(b.offset(t, d, i));
      if (tiles.some((x) => !b.free(x))) continue;
      const last = tiles[len - 1] as number;
      if (b.nb(last, d) < 0) continue;
      const bottom = Math.min(...tiles.map((x) => tileRow(x, b.cols)));
      candidates.push({ first: t, d, tiles, score: bottom + b.rng.next() * 1.5 });
    }
  }
  candidates.sort((x, y) => y.score - x.score);
  for (const c of candidates.slice(0, 80)) {
    const last = c.tiles[c.tiles.length - 1] as number;
    const steps = b.routeLeg(last, c.d, head, new Set(c.tiles));
    if (!steps) continue;
    b.depotTiles = c.tiles;
    b.depotLanes = c.tiles.map((t) => b.addLane(t, opposite(c.d), c.d));
    const leg = b.addSteps(steps);
    return [...b.depotLanes, ...leg];
  }
  throw new GenFail('depot');
}

// ---------------------------------------------------------------------------------------------
// Distractors

interface RouteSlot {
  index: number;
  lane: Lane;
}

function plainSlots(b: Builder, route: readonly number[], exclude: ReadonlySet<number> = new Set()): RouteSlot[] {
  const visits = new Map<number, number>();
  for (const id of route) {
    const t = b.lane(id).tile;
    visits.set(t, (visits.get(t) ?? 0) + 1);
  }
  const special = (t: number) => (b.tileLanes.get(t)?.length ?? 0) > 1;
  const slots: RouteSlot[] = [];
  for (let i = 1; i < route.length - 1; i++) {
    const lane = b.lane(route[i] as number);
    const t = lane.tile;
    if (lane.kind !== 'straight' || visits.get(t) !== 1 || special(t)) continue;
    if (b.moduleTiles.has(t) || b.depotTiles.includes(t) || t === b.storeTile || b.funnelByLane.has(lane.id) || exclude.has(t)) continue;
    slots.push({ index: i, lane });
  }
  return slots;
}

function adjacentToSpecial(b: Builder, route: readonly number[], index: number): boolean {
  for (const j of [index - 1, index + 1]) {
    const id = route[j];
    if (id === undefined) continue;
    if ((b.tileLanes.get(b.lane(id).tile)?.length ?? 0) > 1) return true;
  }
  return false;
}

function tryLoopBay(b: Builder, route: readonly number[], exclude: ReadonlySet<number>): boolean {
  const slots = plainSlots(b, route, exclude);
  const byIndex = new Map(slots.map((s) => [s.index, s]));
  const options = b.rng.shuffle(slots.filter((s) => !adjacentToSpecial(b, route, s.index)));
  for (const w of options.slice(0, 20)) {
    const k = b.rng.pick([0, 0, 1]);
    const d = w.lane.to;
    let ok = true;
    for (let j = w.index - k - 1; j < w.index; j++) {
      const s = byIndex.get(j);
      if (!s || s.lane.to !== d) ok = false;
    }
    if (!ok) continue;
    const m = byIndex.get(w.index - k - 1) as RouteSlot;
    if (adjacentToSpecial(b, route, m.index)) continue;
    for (let tries = 0; tries < 12; tries++) {
      const side = b.rng.chance(0.5) ? turnLeft(d) : turnRight(d);
      const h = b.rng.int(1, 3);
      const a = h === 1 ? 0 : b.rng.int(0, 1);
      const bb = h === 1 ? 0 : b.rng.int(0, 1);
      const shape = buildLoop({ cols: b.cols, rows: b.rows, mTile: m.lane.tile, d, k, side, a, b: bb, h });
      if (!shape || shape.wTile !== w.lane.tile) continue;
      if (shape.cells.some((c) => !b.free(c.tile))) continue;
      const window = switchWindow(shape.circuit, shape.switchLaneLength, b.trainLen, b.recipe.speed);
      if (window < LOOP_BAY_MIN_WINDOW) continue;
      const laneWd = b.addLane(w.lane.tile, opposite(d), side);
      for (const c of shape.cells) {
        b.addLane(c.tile, c.from, c.to);
        b.moduleTiles.add(c.tile);
      }
      b.addLane(m.lane.tile, side, d);
      const sw = b.addSwitch(w.lane.tile, [w.lane.id, laneWd], 'distractor');
      b.distractors.push({ kind: 'loopBay', switch: sw.id });
      b.loopWindow.set(sw.id, window);
      return true;
    }
  }
  return false;
}

function tryBranch(b: Builder, route: readonly number[], kind: 'decoy' | 'bypass', decoyType: ToyType, exclude: ReadonlySet<number>): boolean {
  const slots = plainSlots(b, route, exclude);
  const requiredLanes = new Set(b.funnels.filter((f) => b.factories[f.factory]?.kind !== 'decoy').map((f) => f.lane));
  const starts = b.rng.shuffle(slots.filter((s) => !adjacentToSpecial(b, route, s.index)));
  for (const w of starts.slice(0, 16)) {
    const d = w.lane.to;
    const sides1 = b.rng.shuffle([turnLeft(d), turnRight(d)]).filter((s) => b.free(b.nb(w.lane.tile, s)));
    if (sides1.length === 0) continue;
    const ends = slots
      .filter((m) => m.index >= w.index + 2 && !adjacentToSpecial(b, route, m.index))
      .filter((m) => {
        if (kind !== 'bypass') return true;
        for (let j = w.index + 1; j < m.index; j++) if (requiredLanes.has(route[j] as number)) return true;
        return false;
      })
      .map((m) => ({ m, score: m.index - w.index + b.rng.next() * 4 }))
      .sort((x, y) => x.score - y.score)
      .slice(0, 6);
    for (const { m } of ends) {
      const d2 = m.lane.to;
      for (const s1 of sides1) {
        const start = b.nb(w.lane.tile, s1);
        for (const s2 of b.rng.shuffle([turnLeft(d2), turnRight(d2)])) {
          const goal = b.nb(m.lane.tile, s2);
          if (goal < 0 || !b.free(goal)) continue;
          const steps = routeTrack({
            cols: b.cols,
            rows: b.rows,
            isFree: (t) => b.free(t),
            isOccupied: (t) => b.occupied(t),
            start,
            startFrom: opposite(s1),
            goal,
            goalTo: opposite(s2),
            rng: b.rng,
          });
          if (!steps || steps.length > 12) continue;
          let factoryCell: { step: number; building: number } | null = null;
          if (kind === 'decoy') {
            const pathTiles = new Set(steps.map((s) => s.tile));
            const straight = b.rng.shuffle(steps.map((s, i) => ({ s, i })).filter(({ s }) => s.from === opposite(s.to)));
            for (const { s, i } of straight) {
              for (const side of b.rng.shuffle([turnLeft(s.to), turnRight(s.to)])) {
                const bt = b.nb(s.tile, side);
                if (bt >= 0 && b.free(bt) && !pathTiles.has(bt)) {
                  factoryCell = { step: i, building: bt };
                  break;
                }
              }
              if (factoryCell) break;
            }
            if (!factoryCell) continue;
          }
          const laneWd = b.addLane(w.lane.tile, opposite(d), s1);
          const branch = b.addSteps(steps);
          b.addLane(m.lane.tile, s2, d2);
          const sw = b.addSwitch(w.lane.tile, [w.lane.id, laneWd], 'distractor');
          if (factoryCell) {
            b.addFactory('decoy', 'branch', [{ lane: branch[factoryCell.step] as number, type: decoyType, dose: b.rng.int(15, 30) }], [factoryCell.building]);
          }
          b.distractors.push({ kind, switch: sw.id });
          return true;
        }
      }
    }
  }
  return false;
}

function placeDistractors(
  b: Builder,
  route: readonly number[],
  kinds: readonly DistractorKind[],
  decoyTypes: readonly ToyType[],
  exclude: ReadonlySet<number> = new Set(),
): void {
  let decoyIndex = 0;
  for (const kind of kinds) {
    let ok = false;
    if (kind === 'loopBay') ok = tryLoopBay(b, route, exclude);
    else {
      const type = decoyTypes[decoyIndex % decoyTypes.length] as ToyType;
      ok = tryBranch(b, route, kind, type, exclude);
      if (ok && kind === 'decoy') decoyIndex++;
    }
    if (!ok) throw new GenFail(`distractor ${kind}`);
  }
}

// ---------------------------------------------------------------------------------------------
// Routes, switches, props

function switchPlan(b: { switches: readonly SwitchDef[] }, lanes: readonly Lane[], route: readonly number[]): { switch: number; lane: number }[] {
  const byLane = new Map<number, SwitchDef>();
  for (const sw of b.switches) {
    byLane.set(sw.lanes[0], sw);
    byLane.set(sw.lanes[1], sw);
  }
  const plan: { switch: number; lane: number }[] = [];
  for (const id of route) {
    const sw = byLane.get(id);
    if (sw && lanes[id]) plan.push({ switch: sw.id, lane: id });
  }
  return plan;
}

function routeInfo(b: Builder, route: number[]): RouteInfo {
  const plan = switchPlan(b, b.lanes, route);
  const length = route.reduce((sum, id) => sum + b.lane(id).length, 0);
  let loopWindow: number | null = null;
  for (const step of plan) {
    const sw = b.switches[step.switch];
    if (sw?.kind === 'loop' && b.loopWindow.has(sw.id)) {
      loopWindow = b.loopWindow.get(sw.id) as number;
      break;
    }
  }
  return { lanes: route, switchPlan: plan, length, cost: length + SWITCH_DELAY * plan.length, loopWindow };
}

function setInitialSwitches(b: Builder, standard: RouteInfo): void {
  for (const sw of b.switches) sw.initial = b.rng.int(0, 1) as 0 | 1;
  const first = new Map<number, 0 | 1>();
  for (const step of standard.switchPlan) {
    if (first.has(step.switch)) continue;
    const sw = b.switches[step.switch] as SwitchDef;
    first.set(step.switch, sw.lanes[0] === step.lane ? 0 : 1);
  }
  const ids = [...first.keys()];
  if (ids.length > 0 && ids.every((id) => b.switches[id]?.initial === first.get(id))) {
    const sw = b.switches[b.rng.pick(ids)] as SwitchDef;
    sw.initial = (1 - sw.initial) as 0 | 1;
  }
}

function placeProps(b: Builder): PropDef[] {
  const kinds = PROPS[b.recipe.biome];
  const nearSwitch = new Set<number>();
  for (const sw of b.switches) {
    const c = tileCol(sw.tile, b.cols);
    const r = tileRow(sw.tile, b.cols);
    for (let dc = -1; dc <= 1; dc++) for (let dr = -1; dr <= 1; dr++) if (inBounds(c + dc, r + dr, b.cols, b.rows)) nearSwitch.add(tileIndex(c + dc, r + dr, b.cols));
  }
  const props: PropDef[] = [];
  for (let t = 0; t < b.occ.length; t++) {
    if (!b.free(t) || nearSwitch.has(t) || !b.rng.chance(0.42)) continue;
    props.push({
      kind: b.rng.pick(kinds),
      tile: t,
      rotation: b.rng.int(0, 3) * (Math.PI / 2) + b.rng.float(-0.35, 0.35),
      scale: b.rng.float(0.8, 1.15),
      variant: b.rng.int(0, 3),
    });
  }
  return props;
}

function assemble(b: Builder, attempt: number, order: { type: ToyType; quantity: number }[], standard: RouteInfo, secret: RouteInfo | null, props: PropDef[]): LevelDefinition {
  const depot = new Set(b.depotTiles);
  const switchTiles = new Set(b.switches.map((s) => s.tile));
  const pieces: Piece[] = [...b.tileLanes.entries()]
    .sort((x, y) => x[0] - y[0])
    .map(([tile, lanes]) => ({
      tile,
      lanes: [...lanes],
      role: depot.has(tile) ? 'depot' : tile === b.storeTile ? 'store' : switchTiles.has(tile) ? 'switch' : lanes.length === 2 ? 'merge' : 'plain',
    }));
  return {
    level: b.recipe.level,
    biome: b.recipe.biome,
    seed: b.recipe.seed,
    attempt,
    cols: b.cols,
    rows: b.rows,
    lanes: b.lanes,
    pieces,
    switches: b.switches,
    factories: b.factories,
    funnels: b.funnels,
    depot: { tiles: b.depotTiles, lanes: b.depotLanes, buildingTiles: [...b.depotTiles] },
    store: { tile: b.storeTile, lane: b.storeLane, buildingTile: b.storeBuilding },
    train: { wagons: b.recipe.wagons, speed: b.recipe.speed, capacity: WAGON_CAPACITY, length: b.trainLen },
    order: { lines: order },
    routes: { standard, secret },
    distractors: b.distractors,
    props,
  };
}

// ---------------------------------------------------------------------------------------------
// Level construction

function chooseTypes(rng: Pcg32, n: number): { order: ToyType[]; decoys: ToyType[] } {
  const types = rng.shuffle([...TOY_TYPES]);
  return { order: types.slice(0, n), decoys: types.slice(n) };
}

function buildStandard(recipe: LevelRecipe, rng: Pcg32, attempt: number): LevelDefinition {
  const b = new Builder(recipe, rng);
  const { order: orderTypes, decoys } = chooseTypes(rng, recipe.orderLength);
  const doses = splitDoses(rng, recipe.orderLength);
  const small = recipe.cols * recipe.rows <= 70;
  const dist: [number, number] = small ? [2, 5] : [2, 6];
  const loopIndex = recipe.mustLoop ? rng.int(1, recipe.orderLength) : -1;

  let placed = placeStore(b);
  let route = placed.lanes;
  for (let k = recipe.orderLength; k >= 1; k--) {
    const spec = { type: orderTypes[k - 1] as ToyType, dose: doses[k - 1] as number };
    const minLeg = k === recipe.orderLength ? Math.max(0, b.trainLen - 0.8) : 0;
    const next =
      k === loopIndex
        ? placeLoopModule(b, placed.head, [spec], { window: MUST_LOOP_WINDOW, route: 'P1', factoryKind: 'required', maxHeight: 4 })
        : placeFactory(b, placed.head, spec, { dist, minLeg, route: 'P1' });
    if (!next) throw new GenFail(`factory ${k}`);
    placed = next;
    route = [...next.lanes, ...route];
  }
  route = [...placeDepot(b, placed.head), ...route];
  const length = route.reduce((sum, id) => sum + b.lane(id).length, 0);
  if (length > MAX_ROUTE_LENGTH[recipe.biome]) throw new GenFail('route too long');
  placeDistractors(b, route, recipe.distractors, decoys);
  const standard = routeInfo(b, route);
  setInitialSwitches(b, standard);
  const props = placeProps(b);
  const order = orderTypes.map((type, i) => ({ type, quantity: (doses[i] as number) * recipe.wagons }));
  return assemble(b, attempt, order, standard, null, props);
}

/** Final merge below the store: the standard route enters straight, the secret route from a side. */
function placeStoreMerge(b: Builder): { p1: Head; p2: Head; straight: number; merge: number } {
  placeStore(b);
  const m = b.nb(b.storeTile, S);
  if (!b.free(m)) throw new GenFail('merge tile');
  const sides = b.rng.shuffle([E, W] as Dir[]).filter((s) => b.free(b.nb(m, s)));
  const side = sides[0];
  if (side === undefined) throw new GenFail('merge side');
  const straight = b.addLane(m, S, N);
  const merge = b.addLane(m, side, N);
  return { p1: { tile: m, from: S }, p2: { tile: m, from: side }, straight, merge };
}

/** Split switch right after the depot leading into both routes. */
function placeSplit(b: Builder, h1: Head, h2: Head): { head: Head; lane1: number; lane2: number; leg1: number[]; leg2: number[]; tile: number } {
  const candidates: { t: number; d: Dir; e1: Dir; e2: Dir; score: number }[] = [];
  for (let t = 0; t < b.occ.length; t++) {
    if (!b.free(t)) continue;
    for (const d of DIRS) {
      const entry = b.nb(t, opposite(d));
      if (entry < 0 || !b.free(entry)) continue;
      const exits: Dir[] = [d, turnLeft(d), turnRight(d)];
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          if (i === j) continue;
          const e1 = exits[i] as Dir;
          const e2 = exits[j] as Dir;
          if (b.nb(t, e1) < 0 || b.nb(t, e2) < 0) continue;
          candidates.push({ t, d, e1, e2, score: tileRow(t, b.cols) + b.rng.next() * 3 });
        }
      }
    }
  }
  candidates.sort((x, y) => y.score - x.score);
  for (const c of candidates.slice(0, 120)) {
    const entry = b.nb(c.t, opposite(c.d));
    const blocked = new Set([c.t, entry]);
    const leg1 = b.routeLeg(c.t, c.e1, h1, blocked);
    if (!leg1) continue;
    const blocked2 = new Set([...blocked, ...leg1.map((s) => s.tile)]);
    const leg2 = b.routeLeg(c.t, c.e2, h2, blocked2);
    if (!leg2) continue;
    const lane1 = b.addLane(c.t, opposite(c.d), c.e1);
    const lane2 = b.addLane(c.t, opposite(c.d), c.e2);
    const legLanes1 = b.addSteps(leg1);
    const legLanes2 = b.addSteps(leg2);
    b.addSwitch(c.t, [lane1, lane2], 'split');
    return { head: { tile: c.t, from: opposite(c.d) }, lane1, lane2, leg1: legLanes1, leg2: legLanes2, tile: c.t };
  }
  throw new GenFail('split');
}

/** Levels 22–28: two independent routes between the depot and the store (research R7, A2). */
function buildDual(recipe: LevelRecipe, rng: Pcg32, attempt: number): LevelDefinition {
  const b = new Builder(recipe, rng);
  const n = recipe.orderLength;
  const { order: orderTypes, decoys } = chooseTypes(rng, n);
  const doses = splitDoses(rng, n);
  const spec = (k: number) => ({ type: orderTypes[k - 1] as ToyType, dose: doses[k - 1] as number });
  const merge = placeStoreMerge(b);

  // Secret route (P2), built first: [dual-factory loop for lines 1–2] → [single factory for line 3].
  let p2Head = merge.p2;
  let p2Lanes: number[] = [];
  if (n === 3) {
    const single = placeFactory(b, p2Head, spec(3), { dist: [2, 4], minLeg: Math.max(0, b.trainLen - 1.6), route: 'P2' });
    if (!single) throw new GenFail('P2 factory 3');
    p2Head = single.head;
    p2Lanes = [...single.lanes, ...p2Lanes];
  }
  const dual = placeLoopModule(b, p2Head, [spec(1), spec(2)], { window: P2_LOOP_WINDOW, route: 'P2', factoryKind: 'dual', maxHeight: 2, tight: true, tries: 900 });
  if (!dual) throw new GenFail('P2 dual loop');
  p2Head = dual.head;
  p2Lanes = [...dual.lanes, ...p2Lanes];
  const window2 = dual.window;

  // Standard route (P1): factories N…1, one of them on a loop whose window pairs with P2's.
  const window1: [number, number] = [Math.max(MUST_LOOP_WINDOW[0], window2 / WINDOW_RATIO[1]), Math.min(MUST_LOOP_WINDOW[1], window2 / WINDOW_RATIO[0])];
  if (window1[0] > window1[1]) throw new GenFail('window pairing');
  const loopIndex = rng.int(1, n);
  let p1Head = merge.p1;
  let p1Lanes: number[] = [];
  for (let k = n; k >= 1; k--) {
    const next =
      k === loopIndex
        ? placeLoopModule(b, p1Head, [spec(k)], { window: window1, route: 'P1', factoryKind: 'required', maxHeight: 4, tries: 900 })
        : placeFactory(b, p1Head, spec(k), { dist: [2, 7], minLeg: k === n ? Math.max(0, b.trainLen - 1.6) : 0, route: 'P1', farFrom: k === n ? dual.head.tile : undefined });
    if (!next) throw new GenFail(`P1 factory ${k}`);
    p1Head = next.head;
    p1Lanes = [...next.lanes, ...p1Lanes];
  }

  // Split switch and depot.
  const split = placeSplit(b, p1Head, p2Head);
  const start = placeDepot(b, split.head);
  const p1 = [...start, split.lane1, ...split.leg1, ...p1Lanes, merge.straight, b.storeLane];
  const p2 = [...start, split.lane2, ...split.leg2, ...p2Lanes, merge.merge, b.storeLane];
  const p1Length = p1.reduce((sum, id) => sum + b.lane(id).length, 0);
  if (p1Length > MAX_ROUTE_LENGTH[recipe.biome]) throw new GenFail('route too long');

  // Distractors only on the standard route's own track (FR-052, FR-054).
  const shared = new Set<number>([split.tile, ...start.map((id) => b.lane(id).tile), b.lane(merge.straight).tile]);
  placeDistractors(b, p1, recipe.distractors, decoys, shared);

  const standard = routeInfo(b, p1);
  const secret = routeInfo(b, p2);
  if (secret.cost > COST_RATIO_MAX * standard.cost) throw new GenFail('cost ratio');
  setInitialSwitches(b, standard);
  const props = placeProps(b);
  const order = orderTypes.map((type, i) => ({ type, quantity: (doses[i] as number) * recipe.wagons }));
  return assemble(b, attempt, order, standard, secret, props);
}

// ---------------------------------------------------------------------------------------------
// Validation (contracts/level-definition.md §Invariants)

export function validateLevel(def: LevelDefinition, recipe: LevelRecipe): string[] {
  const errors: string[] = [];
  if (def.switches.length !== switchCount(recipe)) errors.push(`switches ${def.switches.length} ≠ ${switchCount(recipe)}`);
  if (def.factories.length !== factoryCount(recipe)) errors.push(`factories ${def.factories.length} ≠ ${factoryCount(recipe)}`);
  if (def.distractors.length !== recipe.distractors.length) errors.push('distractor count');
  if (def.order.lines.length !== recipe.orderLength) errors.push('order length');
  const kinds = [...def.distractors.map((d) => d.kind)].sort().join();
  if (kinds !== [...recipe.distractors].sort().join()) errors.push('distractor kinds');

  for (const piece of def.pieces) {
    const lanes = piece.lanes.map((id) => def.lanes[id] as Lane);
    if (piece.role === 'switch') {
      if (lanes.length !== 2 || lanes[0]?.from !== lanes[1]?.from) errors.push(`switch piece ${piece.tile}`);
    } else if (piece.role === 'merge') {
      if (lanes.length !== 2 || lanes[0]?.to !== lanes[1]?.to) errors.push(`merge piece ${piece.tile}`);
    } else if (lanes.length !== 1) errors.push(`piece ${piece.tile} has ${lanes.length} lanes`);
  }
  for (const sw of def.switches) {
    const piece = def.pieces.find((p) => p.tile === sw.tile);
    if (piece?.role !== 'switch') errors.push(`switch ${sw.id} tile role`);
  }

  const graph = TrackGraph.fromLevel(def);
  for (const lane of def.lanes) {
    if (lane.id !== def.store.lane && graph.successors(lane.id).length === 0) errors.push(`dead end after lane ${lane.id}`);
  }
  if (!graph.allReachStore()) errors.push('store unreachable from some lane');
  const cycle = graph.shortestCycle();
  if (cycle <= def.train.length + 0.5) errors.push(`cycle ${cycle.toFixed(2)} too short`);

  for (const f of def.funnels) if (def.lanes[f.lane]?.kind !== 'straight') errors.push(`funnel ${f.id} on a curve`);

  for (const route of [def.routes.standard, def.routes.secret]) {
    if (!route) continue;
    // Every wagon must have passed the last funnel before the engine stops (clearance).
    let pos = 0;
    let lastFunnelEnd = -Infinity;
    const funnelLanes = new Set(def.funnels.map((f) => f.lane));
    for (const id of route.lanes) {
      const lane = def.lanes[id] as Lane;
      if (funnelLanes.has(id)) lastFunnelEnd = pos + FUNNEL_SPAN_END;
      pos += lane.length;
    }
    if (pos - lastFunnelEnd < def.train.length + 0.3) errors.push('last funnel too close to the store');
    // Route continuity.
    for (let i = 1; i < route.lanes.length; i++) {
      const prev = route.lanes[i - 1] as number;
      if (!graph.successors(prev).includes(route.lanes[i] as number)) errors.push(`route breaks after lane ${prev}`);
    }
  }

  // Invariant 6: dual-solution constraints (FR-054 – FR-056).
  if (recipe.dual) {
    const { standard, secret } = def.routes;
    if (!secret) errors.push('missing secret route');
    else {
      if (secret.cost > COST_RATIO_MAX * standard.cost) errors.push('secret route too expensive');
      const w1 = standard.loopWindow;
      const w2 = secret.loopWindow;
      if (w1 === null || w2 === null) errors.push('dual loop windows');
      else if (w2 / w1 < WINDOW_RATIO[0] || w2 / w1 > WINDOW_RATIO[1] || w1 < MUST_LOOP_WINDOW[0]) errors.push('window ratio');
      const distinct = (r: RouteInfo) => new Set(r.switchPlan.map((s) => s.switch)).size;
      if (distinct(secret) >= distinct(standard)) errors.push('secret route needs fewer switches');
      if (!def.factories.some((f) => f.kind === 'dual' && f.route === 'P2' && f.funnels.length === 2)) errors.push('dual factory');
    }
  } else if (def.routes.secret) errors.push('unexpected secret route');

  // FR-034: at least one switch starts off the standard route.
  const first = new Map<number, number>();
  for (const step of def.routes.standard.switchPlan) if (!first.has(step.switch)) first.set(step.switch, step.lane);
  if (first.size > 0 && [...first.entries()].every(([id, lane]) => def.switches[id]?.lanes[def.switches[id]?.initial ?? 0] === lane)) {
    errors.push('initial switches already form the standard route');
  }
  return errors;
}

// ---------------------------------------------------------------------------------------------
// Public API

export function generateFromRecipe(recipe: LevelRecipe): LevelDefinition {
  let lastError = '';
  for (let attempt = 0; attempt < MAX_GEN_ATTEMPTS; attempt++) {
    const rng = new Pcg32(hashSeed(recipe.seed, attempt), recipe.level);
    try {
      const def = recipe.dual ? buildDual(recipe, rng, attempt) : buildStandard(recipe, rng, attempt);
      const errors = validateLevel(def, recipe);
      if (errors.length === 0) return def;
      lastError = errors.join('; ');
    } catch (err) {
      if (!(err instanceof GenFail)) throw err;
      lastError = err.message;
    }
  }
  throw new Error(`Level ${recipe.level}: generation failed after ${MAX_GEN_ATTEMPTS} attempts (${lastError})`);
}

const cache = new Map<number, LevelDefinition>();

/** Generates (and caches) a campaign level. */
export function generateLevel(level: number): LevelDefinition {
  const hit = cache.get(level);
  if (hit) return hit;
  const def = generateFromRecipe(recipeFor(level));
  cache.set(level, def);
  return def;
}
