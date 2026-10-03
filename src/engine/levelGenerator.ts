// Forward level generator v2 (spec F-009 – F-012, research R26). Prompt deliverable 2.
//
// Construction order: Toy Station on the top rows → Depot on the bottom row → the main route from
// the depot through "stops" (required factories and waypoints, in bands from bottom to top) to the
// station → secret detour → distractor branches and loops → bridges → tunnels. Then the timing:
// a kinematic run of the intended route says when each wagon passes each hopper, and every
// factory's phase is set so its batch drops into its target wagon. Finally full simulations check
// the level (intended route 100%, doing nothing fails, every distractor costs, secret detour 100%
// and the plain route 85–99%). Failed attempts retry deterministically and the recipe is relaxed
// step by step, so a level is always produced (FR-081).
import { levelLabel, recipeFor } from './campaign';
import { Autopilot } from './autopilot';
import { SPEED_DOWNHILL, SPEED_PLATFORM, SPEED_UPHILL, STAR_1_RATIO, STAR_2_RATIO, trainLength, wagonCenter } from './flow';
import { DIRS, inBounds, laneKind, laneLengthOf, neighbor, opposite, tileCol, tileIndex, tileRow, turnLeft, turnRight } from './grid';
import { Pcg32, hashSeed } from './prng';
import { routeTrack, type Step } from './router';
import { Simulation } from './simulation';
import { TrackGraph } from './trackGraph';
import {
  TOY_TYPES, type BiomeId, type BridgeDef, type Dir, type DistractorKind, type FactoryDef, type Lane, type LevelDefinition,
  type LevelRecipe, type OrderLine, type PropDef, type RouteInfo, type SwitchDef, type TileIndex, type ToyType, type TunnelDef,
} from './types';

export const ATTEMPTS_PER_RELAXATION = 12;
export const RELAXATION_STEPS = 6;
export const MAX_GEN_ATTEMPTS = ATTEMPTS_PER_RELAXATION * (RELAXATION_STEPS + 1);
/** Longest allowed run of the intended route, in seconds. */
export const MAX_ROUTE_SECONDS = 150;
const RUN_LIMIT_TICKS = 60 * 400;

export class GenFail extends Error {}

const FREE = 0;
const TRACK = 1;
const BUILDING = 2;

type Role = 'plain' | 'factory' | 'station' | 'depot' | 'stop' | 'fixed';

const PROPS: Record<BiomeId, readonly string[]> = {
  rug: ['pillow', 'block', 'book', 'ball'],
  candy: ['lollipop', 'gumdrop', 'marshmallow', 'cupcake'],
  garden: ['dune', 'bucket', 'spade', 'windmill'],
  space: ['planet', 'rocket', 'starSticker', 'crater'],
};

/** A branch off the main route: forward (i < j) or a loop back (j < i). */
interface Branch {
  kind: DistractorKind;
  switchId: number;
  /** Route index of the switch tile's through lane. */
  i: number;
  /** Route index of the merge tile's route lane. */
  j: number;
  divLane: number;
  legLanes: number[];
  mergeLane: number;
}

class Builder {
  readonly cols: number;
  readonly rows: number;
  readonly occ: Uint8Array;
  readonly role: Role[];
  readonly lanes: Lane[] = [];
  readonly tileLanes = new Map<number, number[]>();
  readonly switches: SwitchDef[] = [];
  readonly factories: FactoryDef[] = [];
  readonly branches: Branch[] = [];
  readonly crossings = new Set<number>();
  readonly bridges: BridgeDef[] = [];
  readonly tunnels: TunnelDef[] = [];
  /** Tiles that may not become ramps, tunnels, switches or merges. */
  readonly special = new Set<number>();
  route: number[] = [];
  depotTiles: number[] = [];
  depotLanes: number[] = [];
  depotDir: Dir = 1;
  stationTiles: number[] = [];
  stationLanes: number[] = [];
  stationBuildings: number[] = [];
  stationDir: Dir = 1;
  /** Tile the route enters the station from, and the direction into the station. */
  approach = -1;
  readonly trainLen: number;

  constructor(
    readonly recipe: LevelRecipe,
    readonly rng: Pcg32,
  ) {
    this.cols = recipe.cols;
    this.rows = recipe.rows;
    this.occ = new Uint8Array(recipe.cols * recipe.rows);
    this.role = new Array<Role>(recipe.cols * recipe.rows).fill('plain');
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

  col(t: number): number {
    return tileCol(t, this.cols);
  }

  row(t: number): number {
    return tileRow(t, this.cols);
  }

  lane(id: number): Lane {
    return this.lanes[id] as Lane;
  }

  addLane(tile: number, from: Dir, to: Dir, speed = 1): number {
    const kind = laneKind(from, to);
    const id = this.lanes.length;
    this.lanes.push({ id, tile, from, to, kind, length: laneLengthOf(kind), z0: 0, z1: 0, speed, tunnel: false });
    const list = this.tileLanes.get(tile);
    if (list) {
      if (list.length >= 2) throw new GenFail(`tile ${tile} would hold three lanes`);
      list.push(id);
    } else this.tileLanes.set(tile, [id]);
    this.occ[tile] = TRACK;
    return id;
  }

  addSteps(steps: readonly Step[]): number[] {
    return steps.map((s) => {
      if ((this.tileLanes.get(s.tile)?.length ?? 0) === 1) this.crossings.add(s.tile);
      return this.addLane(s.tile, s.from, s.to);
    });
  }

  addBuilding(tile: number): void {
    if (!this.free(tile)) throw new GenFail(`building on occupied tile ${tile}`);
    this.occ[tile] = BUILDING;
    this.role[tile] = 'fixed';
  }

  /** A single plain straight lane perpendicular to `travel`, not part of anything special. */
  crossable(tile: number, travel: Dir): boolean {
    if (!this.recipe.crossings || this.role[tile] !== 'plain' || this.special.has(tile)) return false;
    const list = this.tileLanes.get(tile);
    if (!list || list.length !== 1) return false;
    const lane = this.lane(list[0] as number);
    return lane.kind === 'straight' && lane.to !== travel && lane.to !== opposite(travel);
  }

  /** Route a leg leaving `exitTile` through `exitDir` and entering `entryTile` heading `entryDir`. */
  connect(exitTile: number, exitDir: Dir, entryTile: number, entryDir: Dir, blocked: ReadonlySet<number>, crossCost = 0.4): Step[] | null {
    const start = this.nb(exitTile, exitDir);
    if (start < 0) return null;
    if (start === entryTile) return exitDir === entryDir ? [] : null;
    const goal = this.nb(entryTile, opposite(entryDir));
    if (goal < 0 || blocked.has(start) || blocked.has(goal)) return null;
    return routeTrack({
      cols: this.cols,
      rows: this.rows,
      isFree: (t) => this.free(t) && !blocked.has(t),
      isOccupied: (t) => this.occupied(t),
      canCross: (t, d) => !blocked.has(t) && this.crossable(t, d),
      crossCost,
      start,
      startFrom: opposite(exitDir),
      goal,
      goalTo: entryDir,
      rng: this.rng,
      maxExpansions: 6000,
    });
  }
}

function legLength(lanes: readonly Lane[], ids: readonly number[]): number {
  return ids.reduce((sum, id) => sum + (lanes[id] as Lane).length, 0);
}

// ---------------------------------------------------------------------------------------------
// Station, depot and the main route

function placeStation(b: Builder): void {
  const n = Math.ceil(b.trainLen + 0.6);
  const dir: Dir = b.rng.chance(0.5) ? 1 : 3;
  const row = 1;
  // Leave room for the approach tile before the platform.
  const lo = dir === 1 ? 1 : 0;
  const hi = dir === 1 ? b.cols - n : b.cols - n - 1;
  if (hi < lo) throw new GenFail('station does not fit');
  const c0 = b.rng.int(lo, hi);
  const cols = Array.from({ length: n }, (_, i) => c0 + i);
  if (dir === 3) cols.reverse();
  b.stationDir = dir;
  b.stationTiles = cols.map((c) => tileIndex(c, row, b.cols));
  b.stationBuildings = cols.map((c) => tileIndex(c, 0, b.cols));
  for (const t of b.stationBuildings) b.addBuilding(t);
  b.stationLanes = b.stationTiles.map((t) => b.addLane(t, opposite(dir), dir, SPEED_PLATFORM));
  for (const t of b.stationTiles) b.role[t] = 'station';
  b.approach = b.nb(b.stationTiles[0] as number, opposite(dir));
  if (b.approach < 0) throw new GenFail('station approach');
}

function placeDepot(b: Builder): void {
  const n = Math.ceil(b.trainLen + 0.3);
  const dir: Dir = b.rng.chance(0.5) ? 1 : 3;
  const row = b.rows - 1;
  const c0 = dir === 1 ? b.rng.int(0, Math.max(0, b.cols - n - 2)) : b.rng.int(Math.min(b.cols - 1, n + 1), b.cols - 1);
  const tiles: number[] = [];
  for (let i = 0; i < n; i++) {
    const c = c0 + (dir === 1 ? i : -i);
    if (c < 0 || c >= b.cols) throw new GenFail('depot does not fit');
    tiles.push(tileIndex(c, row, b.cols));
  }
  b.depotDir = dir;
  b.depotTiles = tiles;
  b.depotLanes = tiles.map((t) => b.addLane(t, opposite(dir), dir));
  for (const t of tiles) b.role[t] = 'depot';
}

interface Stop {
  tile: number;
  dir: Dir;
  building: number;
}

/** Candidate stop tiles in a row band, preferring one side of the board. */
function stopCandidates(b: Builder, rows: [number, number], side: number, withBuilding: boolean): Stop[] {
  const out: (Stop & { score: number })[] = [];
  for (let r = rows[0]; r <= rows[1]; r++) {
    for (let c = 0; c < b.cols; c++) {
      const t = tileIndex(c, r, b.cols);
      if (!b.free(t)) continue;
      for (const d of DIRS) {
        const entry = b.nb(t, opposite(d));
        const exit = b.nb(t, d);
        if (entry < 0 || exit < 0 || !b.free(entry) || !b.free(exit)) continue;
        if (entry === b.approach || exit === b.approach) continue;
        const sides = withBuilding ? [turnLeft(d), turnRight(d)] : [d];
        for (const s of sides) {
          const bt = withBuilding ? b.nb(t, s) : -1;
          if (withBuilding && (bt < 0 || !b.free(bt) || bt === b.approach || b.row(bt) <= 0)) continue;
          const pref = side < 0 ? 0 : 1 - Math.abs(c / Math.max(1, b.cols - 1) - side);
          out.push({ tile: t, dir: d, building: bt, score: pref * 2 + b.rng.next() });
        }
      }
    }
  }
  out.sort((x, y) => y.score - x.score);
  return out;
}

function buildMainRoute(b: Builder, factoryCount: number, reserveTop: boolean): { stopLanes: number[]; factoryStops: Stop[] } {
  const top = reserveTop ? 5 : 3;
  const bottom = b.rows - 3;
  if (bottom < top) throw new GenFail('board too small');
  const stops = Math.max(factoryCount + 1, Math.ceil((bottom - top + 1) / 3));
  // Which stops are factories: spread over the stops, never the top one when a detour needs room.
  const slots = Array.from({ length: stops }, (_, i) => i);
  const factorySlots = new Set(b.rng.shuffle(slots.slice(0, reserveTop ? stops - 1 : stops)).slice(0, factoryCount));
  if (factorySlots.size < factoryCount) throw new GenFail('not enough stops');
  const bandSize = (bottom - top + 1) / stops;
  const order = [...slots];
  // Swapping two neighbouring bands makes a leg double back, which tends to cross the route.
  if (b.recipe.crossings && stops >= 3 && b.rng.chance(0.7)) {
    const k = b.rng.int(0, stops - 2);
    [order[k], order[k + 1]] = [order[k + 1] as number, order[k] as number];
  }
  let head = { tile: b.depotTiles[b.depotTiles.length - 1] as number, dir: b.depotDir };
  const route = [...b.depotLanes];
  const stopLanes: number[] = [];
  const factoryStops: Stop[] = [];
  let side = b.rng.chance(0.5) ? 0.15 : 0.85;
  for (let k = 0; k < stops; k++) {
    const band = order[k] as number;
    const r1 = Math.round(bottom - band * bandSize);
    const r0 = Math.max(top, Math.round(bottom - (band + 1) * bandSize) + 1);
    const isFactory = factorySlots.has(k);
    const candidates = stopCandidates(b, [Math.min(r0, r1), Math.max(r0, r1)], side, isFactory);
    side = side < 0.5 ? b.rng.float(0.65, 0.95) : b.rng.float(0.05, 0.35);
    let placed = false;
    for (const c of candidates.slice(0, 24)) {
      const blocked = new Set<number>([c.tile, b.approach, b.nb(c.tile, c.dir)]);
      if (c.building >= 0) blocked.add(c.building);
      const steps = b.connect(head.tile, head.dir, c.tile, c.dir, blocked);
      if (!steps) continue;
      route.push(...b.addSteps(steps));
      const lane = b.addLane(c.tile, opposite(c.dir), c.dir);
      route.push(lane);
      if (isFactory) {
        b.addBuilding(c.building);
        b.role[c.tile] = 'factory';
        factoryStops.push(c);
      } else b.role[c.tile] = 'stop';
      stopLanes.push(lane);
      head = { tile: c.tile, dir: c.dir };
      placed = true;
      break;
    }
    if (!placed) throw new GenFail(`stop ${k}`);
  }
  const last = b.connect(head.tile, head.dir, b.stationTiles[0] as number, b.stationDir, new Set());
  if (!last) throw new GenFail('station leg');
  route.push(...b.addSteps(last), ...b.stationLanes);
  b.route = route;
  // Waypoints are ordinary track once the route exists.
  for (let t = 0; t < b.role.length; t++) if (b.role[t] === 'stop') b.role[t] = 'plain';
  return { stopLanes, factoryStops };
}

// ---------------------------------------------------------------------------------------------
// Branches

/** Route indices whose tile can become a switch or merge (plain, one lane, not special). */
function branchable(b: Builder, index: number): boolean {
  const id = b.route[index];
  if (id === undefined) return false;
  const lane = b.lane(id);
  return b.role[lane.tile] === 'plain' && !b.special.has(lane.tile) && b.tileLanes.get(lane.tile)?.length === 1 && !b.crossings.has(lane.tile);
}

/**
 * Branches the intended route or a deviation takes together (the holding loop, the secret detour)
 * must not overlap anything; other branches are only ever taken one at a time and may overlap.
 */
function overlaps(b: Builder, lo: number, hi: number, kind: DistractorKind): boolean {
  const exclusive = kind === 'hold' || kind === 'secret';
  return b.branches.some((br) => {
    if (!exclusive && br.kind !== 'hold' && br.kind !== 'secret') return false;
    const a = Math.min(br.i, br.j);
    const z = Math.max(br.i, br.j);
    return !(hi < a - 1 || lo > z + 1);
  });
}

interface BranchOpts {
  kind: DistractorKind;
  /** Route index range for the switch and the merge. */
  iRange: [number, number];
  jRange: [number, number];
  loop: boolean;
  /** Place a factory on the branch (decoy / bonus); returns its building tile choice. */
  factory: boolean;
  minLength?: number;
  /** Extra track the branch must add over the route segment it replaces. */
  minExtra?: number;
  tries?: number;
}

function addBranch(b: Builder, o: BranchOpts): (Branch & { factoryLane: number; factoryBuilding: number }) | null {
  for (let tries = 0; tries < (o.tries ?? 60); tries++) {
    if (o.iRange[1] < o.iRange[0] || o.jRange[1] < o.jRange[0]) return null;
    const i = b.rng.int(o.iRange[0], o.iRange[1]);
    const j = b.rng.int(o.jRange[0], o.jRange[1]);
    if (o.loop ? !(j < i - 1) : !(i < j - 1)) continue;
    if (!branchable(b, i) || !branchable(b, j)) continue;
    if (overlaps(b, Math.min(i, j), Math.max(i, j), o.kind)) continue;
    const through = b.lane(b.route[i] as number);
    const merged = b.lane(b.route[j] as number);
    const divOptions = DIRS.filter((d) => d !== through.from && d !== through.to);
    const mergeOptions = DIRS.filter((d) => d !== merged.from && d !== merged.to);
    const divTo = b.rng.pick(divOptions);
    const mergeFrom = b.rng.pick(mergeOptions);
    const divNext = b.nb(through.tile, divTo);
    const mergePrev = b.nb(merged.tile, mergeFrom);
    if (divNext < 0 || mergePrev < 0 || !b.free(divNext) || !b.free(mergePrev)) continue;
    const steps = b.connect(through.tile, divTo, merged.tile, opposite(mergeFrom), new Set([b.approach]));
    if (!steps) continue;
    let factoryStop: Stop | null = null;
    if (o.factory) {
      // A straight tile of the branch (not a crossing) with a free tile beside it for the building.
      const options: Stop[] = [];
      steps.forEach((st, k) => {
        if (st.from !== opposite(st.to) || b.occupied(st.tile) || k === 0 || k === steps.length - 1) return;
        for (const side of [turnLeft(st.to), turnRight(st.to)]) {
          const bt = b.nb(st.tile, side);
          if (bt >= 0 && b.free(bt) && bt !== b.approach && b.row(bt) > 0 && !steps.some((x) => x.tile === bt)) options.push({ tile: st.tile, dir: st.to, building: bt });
        }
      });
      if (options.length === 0) continue;
      factoryStop = b.rng.pick(options);
    }
    const length = steps.reduce((s, st) => s + laneLengthOf(laneKind(st.from, st.to)), 0) + 2 * laneLengthOf(laneKind(through.from, divTo));
    if (o.minLength !== undefined && length < o.minLength) continue;
    if (o.minExtra !== undefined) {
      const segment = legLength(b.lanes, b.route.slice(i, j + 1));
      if (length < segment + o.minExtra) continue;
    }
    // Commit.
    const divLane = b.addLane(through.tile, through.from, divTo);
    let factoryLane = -1;
    const legLanes: number[] = [];
    for (const st of steps) {
      if (factoryStop && st.tile === factoryStop.tile) {
        factoryLane = b.addLane(st.tile, st.from, st.to);
        legLanes.push(factoryLane);
        b.role[st.tile] = 'factory';
        b.addBuilding(factoryStop.building);
      } else legLanes.push(...b.addSteps([st]));
    }
    const mergeLane = b.addLane(merged.tile, mergeFrom, merged.to);
    b.special.add(through.tile);
    b.special.add(merged.tile);
    const sw: SwitchDef = { id: b.switches.length, tile: through.tile, lanes: [through.id, divLane], initial: 0, kind: o.kind };
    b.switches.push(sw);
    const branch: Branch = { kind: o.kind, switchId: sw.id, i, j, divLane, legLanes, mergeLane };
    b.branches.push(branch);
    return { ...branch, factoryLane, factoryBuilding: factoryStop?.building ?? -1 };
  }
  return null;
}

// ---------------------------------------------------------------------------------------------
// Bridges and tunnels (F-011)

function promoteBridges(b: Builder, max: number): void {
  const tiles = b.rng.shuffle([...b.crossings]);
  for (const tile of tiles) {
    if (b.bridges.length >= max) return;
    const ids = b.tileLanes.get(tile) ?? [];
    for (const id of b.rng.shuffle([...ids])) {
      const deck = b.lane(id);
      const before = b.nb(tile, deck.from);
      const after = b.nb(tile, deck.to);
      const ok = (t: number, rampFrom: Dir) => {
        if (t < 0 || b.role[t] !== 'plain' || b.special.has(t) || b.crossings.has(t)) return -1;
        const list = b.tileLanes.get(t);
        if (!list || list.length !== 1) return -1;
        const lane = b.lane(list[0] as number);
        return lane.kind === 'straight' && lane.from === rampFrom ? lane.id : -1;
      };
      const up = ok(before, deck.from);
      const down = ok(after, deck.from);
      if (up < 0 || down < 0) continue;
      const lower = ids.find((x) => x !== id) as number;
      const rampUp = b.lane(up);
      const rampDown = b.lane(down);
      rampUp.z1 = 1;
      rampUp.speed = SPEED_UPHILL;
      deck.z0 = 1;
      deck.z1 = 1;
      rampDown.z0 = 1;
      rampDown.speed = SPEED_DOWNHILL;
      for (const t of [before, tile, after]) b.special.add(t);
      b.bridges.push({ tile, deckLane: id, lowerLane: lower, rampUp: up, rampDown: down });
      break;
    }
  }
}

/** Tunnels over runs of 2–4 plain single-lane tiles along a lane sequence. */
function placeTunnel(b: Builder, path: readonly number[], minLen = 2): boolean {
  const runs: number[][] = [];
  let run: number[] = [];
  for (const id of path) {
    const lane = b.lane(id);
    const t = lane.tile;
    const ok =
      b.role[t] === 'plain' &&
      !b.special.has(t) &&
      !b.crossings.has(t) &&
      b.tileLanes.get(t)?.length === 1 &&
      b.row(t) > 1 &&
      b.row(t) < b.rows - 1;
    if (ok) run.push(id);
    else {
      if (run.length >= minLen) runs.push(run);
      run = [];
    }
  }
  if (run.length >= minLen) runs.push(run);
  if (runs.length === 0) return false;
  const chosen = b.rng.pick(runs);
  const len = Math.min(chosen.length, b.rng.int(minLen, 4));
  const start = b.rng.int(0, chosen.length - len);
  const lanes = chosen.slice(start, start + len);
  for (const id of lanes) {
    b.lane(id).tunnel = true;
    b.special.add(b.lane(id).tile);
  }
  b.tunnels.push({ tiles: lanes.map((id) => b.lane(id).tile), lanes });
  return true;
}

// ---------------------------------------------------------------------------------------------
// Routes

function withDetour(route: readonly number[], br: Branch): number[] {
  return [...route.slice(0, br.i), br.divLane, ...br.legLanes, br.mergeLane, ...route.slice(br.j + 1)];
}

function withLap(route: readonly number[], br: Branch): number[] {
  return [...route.slice(0, br.i), br.divLane, ...br.legLanes, br.mergeLane, ...route.slice(br.j + 1, br.i), ...route.slice(br.i)];
}

/** The main route with the given branches taken (forward branches) or lapped once (loops). */
function compose(route: readonly number[], taken: readonly Branch[]): number[] {
  // Branches never overlap, so applying them from the end of the route keeps indices valid.
  const sorted = [...taken].sort((x, y) => Math.max(y.i, y.j) - Math.max(x.i, x.j));
  let lanes = [...route];
  for (const br of sorted) lanes = br.j > br.i ? withDetour(lanes, br) : withLap(lanes, br);
  return lanes;
}

function switchPlan(switches: readonly SwitchDef[], lanes: readonly number[]): { switch: number; lane: number }[] {
  const byLane = new Map<number, number>();
  for (const sw of switches) {
    byLane.set(sw.lanes[0], sw.id);
    byLane.set(sw.lanes[1], sw.id);
  }
  const plan: { switch: number; lane: number }[] = [];
  for (const id of lanes) {
    const sw = byLane.get(id);
    if (sw !== undefined) plan.push({ switch: sw, lane: id });
  }
  return plan;
}

function routeInfo(def: Pick<LevelDefinition, 'lanes' | 'switches'>, lanes: number[], ticks = 0): RouteInfo {
  return { lanes, switchPlan: switchPlan(def.switches, lanes), length: legLength(def.lanes, lanes), seconds: ticks / 60 };
}

/** Runs a level along a lane sequence; `trace` receives the engine distance after every tick. */
function run(def: LevelDefinition, lanes: number[], trace?: number[]): Simulation {
  const sim = new Simulation(def);
  const pilot = new Autopilot(sim, routeInfo(def, lanes));
  pilot.update();
  sim.go();
  trace?.push(sim.engineDistance());
  while (sim.phase === 'running' && sim.tick < RUN_LIMIT_TICKS) {
    pilot.update();
    sim.step();
    trace?.push(sim.engineDistance());
  }
  return sim;
}

/** Runs a level with the switches left as they are. */
function runIdle(def: LevelDefinition): Simulation {
  const sim = new Simulation(def);
  sim.go();
  while (sim.phase === 'running' && sim.tick < RUN_LIMIT_TICKS) sim.step();
  return sim;
}

function sameLanes(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

/** Distance along `lanes` (from the depot start) of each occurrence of `lane`'s hopper. */
function hopperDistances(def: LevelDefinition, lanes: readonly number[], lane: number, hopper: number): number[] {
  const out: number[] = [];
  let d = 0;
  for (const id of lanes) {
    if (id === lane) out.push(d + hopper);
    d += (def.lanes[id] as Lane).length;
  }
  return out;
}

/** Tick at which the point `behind` the engine front is closest to distance D, and the passing time. */
function passTiming(trace: readonly number[], D: number, behind: number, trainLen: number): { tick: number; passage: number } {
  let best = -1;
  let bestErr = Infinity;
  let enter = -1;
  let leave = -1;
  for (let n = 1; n < trace.length; n++) {
    const s = trace[n] as number;
    const err = Math.abs(s - behind - D);
    if (err < bestErr) {
      bestErr = err;
      best = n;
    }
    if (enter < 0 && s >= D - 0.05) enter = n;
    if (leave < 0 && s >= D + trainLen + 0.1) leave = n;
  }
  if (best < 0 || enter < 0) throw new GenFail('hopper never reached');
  if (leave < 0) leave = trace.length;
  return { tick: best, passage: leave - enter };
}

// ---------------------------------------------------------------------------------------------
// Construction

interface Draft {
  def: LevelDefinition;
  intended: number[];
  standard: number[];
  secret: number[] | null;
  /** Lane sequences that take one distractor wrongly (each must score below 100%). */
  deviations: number[][];
}

function relaxRecipe(r: LevelRecipe, step: number): LevelRecipe {
  const x = { ...r };
  if (step >= 1) x.decoys = Math.max(0, x.decoys - 1);
  if (step >= 2) {
    x.factoryLoop = false;
    x.hold = false;
    x.holdLap = false;
  }
  if (step >= 3) x.secret = false;
  if (step >= 4) {
    x.decoys = Math.min(x.decoys, 1);
    x.bypasses = 1;
    x.bridges = false;
    x.tunnels = false;
  }
  if (step >= 5) {
    x.factories = x.wagons;
    x.decoys = 0;
    x.crossings = false;
  }
  if (step >= 6) {
    x.wagons = Math.max(1, x.wagons - 1);
    x.factories = x.wagons;
  }
  return x;
}

function build(recipe: LevelRecipe, rng: Pcg32, attempt: number, relaxed: number): Draft {
  const b = new Builder(recipe, rng);
  placeStation(b);
  placeDepot(b);
  const { factoryStops } = buildMainRoute(b, recipe.factories, recipe.secret);
  const route = b.route;
  const factoryIdx = factoryStops.map((s) => route.findIndex((id) => b.lane(id).tile === s.tile));
  const lastFactory = Math.max(...factoryIdx);
  const stationStart = route.length - b.stationLanes.length;

  // Secret detour after the last required factory (F-012): longer than the plain way.
  let secretBranch: (Branch & { factoryLane: number; factoryBuilding: number }) | null = null;
  if (recipe.secret) {
    secretBranch = addBranch(b, {
      kind: 'secret',
      iRange: [lastFactory + 2, stationStart - 4],
      jRange: [lastFactory + 4, stationStart - 1],
      loop: false,
      factory: true,
      minExtra: 2,
      tries: 60,
    });
    if (!secretBranch) throw new GenFail('secret detour');
  }

  // Distractors (FR-082, FR-083). Ranges stay before the secret detour.
  const limit = secretBranch ? Math.min(secretBranch.i, secretBranch.j) - 2 : stationStart - 1;
  // Route-index gaps between required factories (before the last one).
  const sortedF = [...factoryIdx].sort((x, y) => x - y);
  const between = (k: number): [number, number] => [k === 0 ? b.depotLanes.length : (sortedF[k - 1] as number) + 1, (sortedF[k] as number) - 1];
  let holdBranch: Branch | null = null;
  if (recipe.hold) {
    // An empty holding loop: it rejoins the route before its own switch, with no factory inside.
    const gaps = sortedF
      .map((_, k) => between(k))
      .filter(([lo, hi]) => hi <= limit && hi - lo >= 4);
    for (const [lo, hi] of b.rng.shuffle(gaps)) {
      holdBranch = addBranch(b, {
        kind: 'hold',
        iRange: [lo + 2, hi],
        jRange: [lo, hi - 2],
        loop: true,
        factory: false,
        minLength: b.trainLen + 2.5,
        tries: 30,
      });
      if (holdBranch) break;
    }
    if (!holdBranch) throw new GenFail('hold loop');
  }
  if (recipe.factoryLoop) {
    // A loop back over exactly one required factory: it passes something (FR-083).
    let done = false;
    for (const k of b.rng.shuffle(sortedF.map((_, n) => n))) {
      const f = sortedF[k] as number;
      const lo = between(k)[0];
      const hi = Math.min(limit, k + 1 < sortedF.length ? (sortedF[k + 1] as number) - 1 : limit);
      if (f >= limit) continue;
      const br = addBranch(b, {
        kind: 'loop',
        iRange: [f + 1, Math.min(hi, f + 6)],
        jRange: [Math.max(lo, f - 6), f - 1],
        loop: true,
        factory: false,
        minLength: b.trainLen + 1.5,
        tries: 25,
      });
      if (br) {
        done = true;
        break;
      }
    }
    if (!done) throw new GenFail('factory loop');
  }

  const decoyBranches: (Branch & { factoryLane: number; factoryBuilding: number })[] = [];
  const wanted: { kind: DistractorKind; count: number }[] = [
    { kind: 'decoy', count: recipe.decoys },
    { kind: 'bypass', count: recipe.bypasses },
  ];
  for (const { kind, count } of wanted) {
    for (let n = 0; n < count; n++) {
      // Prefer a segment that contains a required factory (taking the branch skips it).
      const f = b.rng.pick(factoryIdx.filter((x) => x < limit));
      const opts = { kind, loop: false, factory: kind === 'decoy', minLength: 2 };
      const br =
        (f !== undefined
          ? addBranch(b, { ...opts, iRange: [Math.max(b.depotLanes.length, f - 8), f - 1], jRange: [f + 1, Math.min(limit, f + 8)], tries: 40 })
          : null) ?? addBranch(b, { ...opts, iRange: [b.depotLanes.length, limit - 2], jRange: [b.depotLanes.length + 2, limit], tries: 80 });
      if (!br) {
        // Crowded boards get fewer branches than the recipe asks for, but never none.
        if (n === 0 && kind === 'bypass' && decoyBranches.length === 0) throw new GenFail(kind);
        break;
      }
      if (kind === 'decoy') decoyBranches.push(br);
    }
  }
  if (recipe.bridges) promoteBridges(b, recipe.difficulty >= 20 ? 2 : 1);
  if (secretBranch) {
    // The detour hides in a tunnel unless it already climbs a bridge.
    const onBridge = b.bridges.some((br) => secretBranch.legLanes.includes(br.deckLane) || secretBranch.legLanes.includes(br.rampUp));
    if (!onBridge && !placeTunnel(b, secretBranch.legLanes, 2)) throw new GenFail('secret tunnel');
  }
  if (recipe.tunnels) placeTunnel(b, route.slice(b.depotLanes.length, stationStart), 2);

  // Order and factories.
  const types = rng.shuffle([...TOY_TYPES]);
  const wagonTypes = types.slice(0, recipe.wagons);
  const spare = types.slice(recipe.wagons);
  const targets = rng.shuffle(Array.from({ length: recipe.wagons }, (_, k) => k + 1));
  while (targets.length < factoryStops.length) targets.push(rng.int(1, recipe.wagons));
  const factories: FactoryDef[] = [];
  const pushFactory = (kind: FactoryDef['kind'], lane: number, building: number, type: ToyType, target: number, batch: number) => {
    factories.push({ id: factories.length, kind, lane, type, batch, period: 1 << 30, phase: -1, hopper: b.lane(lane).length / 2, buildingTile: building, target });
  };
  factoryStops.forEach((stop, i) => {
    const target = targets[i] as number;
    pushFactory('required', route[factoryIdx[i] as number] as number, stop.building, wagonTypes[target - 1] as ToyType, target, rng.int(recipe.batch[0], recipe.batch[1]));
  });
  for (const br of decoyBranches) {
    const type = spare.length ? rng.pick(spare) : rng.pick(TOY_TYPES);
    pushFactory('decoy', br.factoryLane, br.factoryBuilding, type, 0, rng.int(recipe.batch[0], recipe.batch[1]));
  }
  const quantity = Array.from({ length: recipe.wagons }, () => 0);
  for (const f of factories) if (f.kind === 'required') quantity[f.target - 1] = (quantity[f.target - 1] as number) + f.batch;
  if (secretBranch) {
    const total = quantity.reduce((s, q) => s + q, 0);
    const target = rng.int(1, recipe.wagons);
    const batch = Math.max(2, Math.floor(total * 0.15));
    pushFactory('bonus', secretBranch.factoryLane, secretBranch.factoryBuilding, wagonTypes[target - 1] as ToyType, target, batch);
    quantity[target - 1] = (quantity[target - 1] as number) + batch;
  }
  const lines: OrderLine[] = wagonTypes.map((type, k) => ({ wagon: k + 1, type, quantity: quantity[k] as number }));
  const capacity = Math.max(...quantity) + 3;

  // Routes.
  const intendedTaken = holdBranch && recipe.holdLap ? [holdBranch] : [];
  const standard = compose(route, intendedTaken);
  const secret = secretBranch ? compose(route, [...intendedTaken, secretBranch]) : null;
  const intended = secret ?? standard;
  const deviations: number[][] = [];
  for (const br of b.branches) {
    if (br.kind === 'secret') continue;
    const taken = br === holdBranch ? (recipe.holdLap ? [] : [br]) : [...intendedTaken, br];
    deviations.push(compose(route, taken));
  }

  const def: LevelDefinition = {
    level: recipe.level,
    world: recipe.world,
    label: levelLabel(recipe.level),
    biome: recipe.biome,
    seed: recipe.seed,
    attempt,
    relaxed,
    difficulty: recipe.difficulty,
    cols: b.cols,
    rows: b.rows,
    lanes: b.lanes,
    switches: b.switches,
    factories,
    depot: { tiles: b.depotTiles, lanes: b.depotLanes, buildingTiles: [], dir: b.depotDir },
    station: {
      tiles: b.stationTiles,
      lanes: b.stationLanes,
      lane: b.stationLanes[b.stationLanes.length - 1] as number,
      buildingTiles: b.stationBuildings,
      dir: b.stationDir,
    },
    train: { wagons: recipe.wagons, speed: recipe.speed, capacity, length: b.trainLen },
    order: { lines },
    routes: { standard: routeInfo({ lanes: b.lanes, switches: b.switches }, standard), secret: null },
    crossings: [...b.crossings].filter((t) => !b.bridges.some((br) => br.tile === t)).sort((x, y) => x - y),
    bridges: b.bridges,
    tunnels: b.tunnels,
    props: placeProps(b),
  };
  return { def, intended, standard, secret, deviations };
}

/** Sets every factory's period and phase from a kinematic run of the intended route. */
function tune(draft: Draft, recipe: LevelRecipe, rng: Pcg32): void {
  const { def } = draft;
  const traces = new Map<number[], number[]>();
  const traceOf = (lanes: number[]): number[] => {
    let trace = traces.get(lanes);
    if (!trace) {
      trace = [];
      const sim = run(def, lanes, trace);
      if (sim.phase !== 'delivered' || !sameLanes(sim.traversedLanes(), lanes)) throw new GenFail('route does not drive');
      traces.set(lanes, trace);
    }
    return trace;
  };
  const slack = (): number => Math.round(rng.float(recipe.periodSlack[0], recipe.periodSlack[1]) * 60);
  for (const f of def.factories) {
    if (f.kind === 'decoy') {
      const passage = Math.ceil(((def.train.length + 0.2) / def.train.speed) * 60);
      f.period = passage + 30 + slack();
      f.phase = rng.int(0, f.period - 1);
      continue;
    }
    const lanes = f.kind === 'bonus' ? (draft.secret as number[]) : draft.intended;
    const trace = traceOf(lanes);
    const hits = hopperDistances(def, lanes, f.lane, f.hopper);
    if (hits.length !== 1) throw new GenFail(`factory ${f.id} passed ${hits.length}×`);
    const { tick, passage } = passTiming(trace, hits[0] as number, wagonCenter(f.target), def.train.length);
    f.period = passage + 30 + slack();
    f.phase = tick % f.period;
  }
}

function verify(draft: Draft, rng: Pcg32): void {
  const { def } = draft;
  const intended = run(def, draft.intended);
  const ir = intended.result();
  if (!ir || ir.ratio < 1 || intended.spilled() > 0) throw new GenFail(`intended route ${ir ? Math.round(ir.ratio * 100) : 'stuck'}%`);
  if (ir.ticks / 60 > MAX_ROUTE_SECONDS) throw new GenFail('route too long');
  if (draft.secret) {
    const plain = run(def, draft.standard).result();
    if (!plain || plain.ratio < STAR_2_RATIO || plain.ratio >= 1) throw new GenFail('plain route vs secret');
    if (!ir.secretRoute) throw new GenFail('secret not detected');
    def.routes.secret = routeInfo(def, draft.secret, ir.ticks);
    def.routes.standard = routeInfo(def, draft.standard, plain.ticks);
  } else def.routes.standard = routeInfo(def, draft.standard, ir.ticks);
  for (const lanes of draft.deviations) {
    const r = run(def, lanes).result();
    if (r && r.ratio >= 1) throw new GenFail('a distractor does not cost');
  }
  // Initial switch settings (FR-034, FR-082): doing nothing must fail.
  const first = new Map<number, number>();
  for (const step of def.routes.standard.switchPlan) if (!first.has(step.switch)) first.set(step.switch, step.lane);
  for (const sw of def.switches) {
    const wantFirst = first.get(sw.id);
    const intendedState: 0 | 1 = wantFirst === undefined ? 0 : sw.lanes[0] === wantFirst ? 0 : 1;
    const wrongChance = sw.kind === 'secret' ? 0 : sw.kind === 'loop' ? 0.3 : 0.55;
    sw.initial = sw.kind === 'secret' ? 0 : rng.chance(wrongChance) ? ((1 - intendedState) as 0 | 1) : intendedState;
  }
  const flippable = def.switches.filter((sw) => sw.kind === 'decoy' || sw.kind === 'bypass');
  for (let k = 0; ; k++) {
    const idle = runIdle(def).result();
    if (!idle || idle.ratio < STAR_1_RATIO) break;
    const candidates = flippable.filter((sw) => sw.initial === 0);
    if (k >= 4 || candidates.length === 0) throw new GenFail('doing nothing passes');
    rng.pick(candidates).initial = 1;
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
    if (!b.free(t) || nearSwitch.has(t) || !b.rng.chance(0.38)) continue;
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

// ---------------------------------------------------------------------------------------------
// Validation (contracts/level-definition.md §Invariants)

export function validateLevel(def: LevelDefinition): string[] {
  const errors: string[] = [];
  const byTile = new Map<TileIndex, Lane[]>();
  for (const lane of def.lanes) {
    const list = byTile.get(lane.tile) ?? [];
    list.push(lane);
    byTile.set(lane.tile, list);
  }
  const switchTiles = new Set(def.switches.map((s) => s.tile));
  const crossingTiles = new Set([...def.crossings, ...def.bridges.map((br) => br.tile)]);
  for (const [tile, lanes] of byTile) {
    if (lanes.length > 2) errors.push(`tile ${tile} holds ${lanes.length} lanes`);
    if (lanes.length !== 2) continue;
    const [a, c] = lanes as [Lane, Lane];
    if (switchTiles.has(tile)) {
      if (a.from !== c.from) errors.push(`switch ${tile} lanes do not share an entry`);
    } else if (crossingTiles.has(tile)) {
      const perpendicular = a.kind === 'straight' && c.kind === 'straight' && a.from !== c.from && a.from !== opposite(c.from);
      if (!perpendicular) errors.push(`crossing ${tile} is not two perpendicular straights`);
    } else if (a.to !== c.to) errors.push(`tile ${tile} with two lanes is neither switch, merge nor crossing`);
  }
  for (const sw of def.switches) {
    const lanes = byTile.get(sw.tile) ?? [];
    if (lanes.some((l) => l.tunnel || l.z0 !== 0 || l.z1 !== 0)) errors.push(`switch ${sw.id} on a bridge or in a tunnel`);
  }
  for (const br of def.bridges) {
    const up = def.lanes[br.rampUp] as Lane;
    const deck = def.lanes[br.deckLane] as Lane;
    const down = def.lanes[br.rampDown] as Lane;
    if (up.from !== deck.from || down.from !== deck.from || up.kind !== 'straight' || down.kind !== 'straight') errors.push(`bridge ${br.tile} ramps not in line`);
    if (!(up.z0 === 0 && up.z1 === 1 && deck.z0 === 1 && deck.z1 === 1 && down.z0 === 1 && down.z1 === 0)) errors.push(`bridge ${br.tile} heights`);
    const lower = def.lanes[br.lowerLane] as Lane;
    if (lower.z0 !== 0 || lower.z1 !== 0) errors.push(`bridge ${br.tile} lower lane lifted`);
  }
  for (const tunnel of def.tunnels) {
    if (tunnel.tiles.length < 2 || tunnel.tiles.length > 4) errors.push('tunnel length');
    for (const t of tunnel.tiles) if ((byTile.get(t)?.length ?? 0) !== 1 || switchTiles.has(t)) errors.push(`tunnel tile ${t}`);
  }
  for (const f of def.factories) {
    if (def.lanes[f.lane]?.kind !== 'straight') errors.push(`factory ${f.id} on a curve`);
    if (f.period < 1 || f.phase < 0 || f.phase >= f.period) errors.push(`factory ${f.id} timing`);
    if ((byTile.get(def.lanes[f.lane]?.tile ?? -1)?.length ?? 0) !== 1) errors.push(`factory ${f.id} tile shared`);
  }
  const graph = TrackGraph.fromLevel(def);
  for (const lane of def.lanes) {
    if (lane.id !== def.station.lane && graph.successors(lane.id).length === 0) errors.push(`dead end after lane ${lane.id}`);
  }
  if (!graph.allReachStore()) errors.push('station unreachable from some lane');
  const cycle = graph.shortestCycle();
  if (cycle <= def.train.length + 0.5) errors.push(`cycle ${cycle.toFixed(2)} too short`);
  for (const route of [def.routes.standard, def.routes.secret]) {
    if (!route) continue;
    for (let i = 1; i < route.lanes.length; i++) {
      const prev = route.lanes[i - 1] as number;
      if (!graph.successors(prev).includes(route.lanes[i] as number)) errors.push(`route breaks after lane ${prev}`);
    }
    if (route.lanes[route.lanes.length - 1] !== def.station.lane) errors.push('route does not end at the station');
  }
  const wanted = def.order.lines.reduce((s, l) => s + l.quantity, 0);
  if (def.order.lines.length !== def.train.wagons || wanted <= 0) errors.push('order lines');
  if (def.order.lines.some((l) => l.quantity > def.train.capacity)) errors.push('capacity below an order line');
  return errors;
}

// ---------------------------------------------------------------------------------------------
// Public API

export function generateFromRecipe(recipe: LevelRecipe, log?: (attempt: number, reason: string) => void): LevelDefinition {
  let lastError = '';
  for (let attempt = 0; attempt < MAX_GEN_ATTEMPTS; attempt++) {
    const relaxed = Math.floor(attempt / ATTEMPTS_PER_RELAXATION);
    const r = relaxRecipe(recipe, relaxed);
    const rng = new Pcg32(hashSeed(recipe.seed, attempt), recipe.level);
    try {
      const draft = build(r, rng, attempt, relaxed);
      tune(draft, r, rng);
      verify(draft, rng);
      const errors = validateLevel(draft.def);
      if (errors.length === 0) return draft.def;
      lastError = errors.join('; ');
    } catch (err) {
      if (!(err instanceof GenFail)) throw err;
      lastError = err.message;
    }
    log?.(attempt, lastError);
  }
  throw new Error(`Level ${recipe.level}: generation failed after ${MAX_GEN_ATTEMPTS} attempts (${lastError})`);
}

const cache = new Map<number, LevelDefinition>();

/** Generates (and caches) a level. */
export function generateLevel(level: number): LevelDefinition {
  const hit = cache.get(level);
  if (hit) return hit;
  const def = generateFromRecipe(recipeFor(level));
  cache.set(level, def);
  return def;
}
