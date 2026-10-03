// Hand-built levels for exact rule tests: one straight row of track, heading east.
import { SPEED_PLATFORM, trainLength } from '../../src/engine/flow';
import type { FactoryDef, Lane, LevelDefinition, OrderLine } from '../../src/engine/types';

export interface LineOptions {
  /** Tiles in the row. */
  length?: number;
  wagons?: number;
  speed?: number;
  capacity?: number;
  /** Tiles at the start the train stands on. */
  depot?: number;
  /** Platform tiles at the end. */
  station?: number;
  factories?: Partial<FactoryDef>[];
  order?: OrderLine[];
  /** Per-lane overrides (heights, speed factors). */
  lanes?: Record<number, Partial<Lane>>;
}

export function lineLevel(o: LineOptions = {}): LevelDefinition {
  const length = o.length ?? 14;
  const wagons = o.wagons ?? 2;
  const depot = o.depot ?? 4;
  const station = o.station ?? 4;
  const lanes: Lane[] = Array.from({ length }, (_, i) => ({
    id: i,
    tile: length + i,
    from: 3,
    to: 1,
    kind: 'straight',
    length: 1,
    z0: 0,
    z1: 0,
    speed: i >= length - station ? SPEED_PLATFORM : 1,
    tunnel: false,
    ...(o.lanes?.[i] ?? {}),
  }));
  const factories: FactoryDef[] = (o.factories ?? []).map((f, id) => ({
    id,
    kind: 'required',
    lane: 6,
    type: 'duck',
    batch: 10,
    period: 300,
    phase: 0,
    hopper: 0.5,
    buildingTile: f.lane ?? 6,
    target: 1,
    ...f,
  }));
  const stationLanes = lanes.slice(length - station).map((l) => l.id);
  const all = lanes.map((l) => l.id);
  return {
    level: 1,
    world: 1,
    label: '1-1',
    biome: 'rug',
    seed: 1,
    attempt: 0,
    relaxed: 0,
    difficulty: 1,
    cols: length,
    rows: 3,
    lanes,
    switches: [],
    factories,
    depot: { tiles: lanes.slice(0, depot).map((l) => l.tile), lanes: all.slice(0, depot), buildingTiles: [], dir: 1 },
    station: { tiles: stationLanes.map((id) => (lanes[id] as Lane).tile), lanes: stationLanes, lane: length - 1, buildingTiles: [], dir: 1 },
    train: { wagons, speed: o.speed ?? 1, capacity: o.capacity ?? 20, length: trainLength(wagons) },
    order: { lines: o.order ?? Array.from({ length: wagons }, (_, k) => ({ wagon: k + 1, type: 'duck' as const, quantity: 10 })) },
    routes: { standard: { lanes: all, switchPlan: [], length, seconds: 0 }, secret: null },
    crossings: [],
    bridges: [],
    tunnels: [],
    props: [],
  };
}

/**
 * A closed ring of track around a 4 × 3 board (clockwise, 10 tiles, no station): the train
 * circles until the test stops it. Lane 1 (tile (1, 0), heading east) is straight.
 */
export function ringLevel(o: { wagons?: number; capacity?: number; factories?: Partial<FactoryDef>[] } = {}): LevelDefinition {
  const path: [number, number][] = [[0, 0], [1, 0], [2, 0], [3, 0], [3, 1], [3, 2], [2, 2], [1, 2], [0, 2], [0, 1]];
  const dirTo = (a: [number, number], b: [number, number]): 0 | 1 | 2 | 3 => (b[0] > a[0] ? 1 : b[0] < a[0] ? 3 : b[1] > a[1] ? 2 : 0);
  const lanes: Lane[] = path.map((p, i) => {
    const prev = path[(i + path.length - 1) % path.length] as [number, number];
    const next = path[(i + 1) % path.length] as [number, number];
    const from = ((dirTo(p, prev) as number) & 3) as 0 | 1 | 2 | 3;
    const to = dirTo(p, next);
    const straight = (from + 2) % 4 === to;
    return { id: i, tile: p[1] * 4 + p[0], from, to, kind: straight ? 'straight' : 'curve', length: straight ? 1 : Math.PI / 4, z0: 0, z1: 0, speed: 1, tunnel: false };
  });
  const base = lineLevel({ wagons: o.wagons ?? 1, capacity: o.capacity ?? 20, factories: [] });
  const factories: FactoryDef[] = (o.factories ?? []).map((f, id) => ({
    id, kind: 'required', lane: 1, type: 'duck', batch: 10, period: 300, phase: 0, hopper: 0.5, buildingTile: 5, target: 1, ...f,
  }));
  return {
    ...base,
    cols: 4,
    rows: 3,
    lanes,
    factories,
    depot: { tiles: [8, 4], lanes: [8, 9], buildingTiles: [], dir: 0 },
    station: { tiles: [], lanes: [], lane: -1, buildingTiles: [], dir: 1 },
    order: { lines: [{ wagon: 1, type: 'duck', quantity: 10 }] },
    routes: { standard: { lanes: [], switchPlan: [], length: 0, seconds: 0 }, secret: null },
  };
}
