// One run of a level (specs/contracts/engine-api.md, gameplay v2). Deterministic: the same flips at
// the same ticks always give the same events and result (FR-011).
import { DERAIL_PILE, DT, L_PILE, carAt, pileHeight } from './flow';
import { scoreDelivery, type WagonContents } from './scoring';
import { TrackGraph } from './trackGraph';
import { Trail, carPoses, type Segment } from './train';
import type { CarPose, FactoryDef, FlipOutcome, LevelDefinition, Phase, RunResult, SimEvent, ToyType } from './types';

interface WagonState {
  total: number;
  byType: WagonContents;
}

/** Ticks from `tick` to the next drop of a factory (≥ 1). */
export function ticksToDrop(factory: Pick<FactoryDef, 'period' | 'phase'>, tick: number): number {
  const p = factory.period;
  return ((((factory.phase - (tick + 1)) % p) + p) % p) + 1;
}

export class Simulation {
  readonly level: LevelDefinition;
  readonly graph: TrackGraph;
  private _phase: Phase = 'planning';
  private _tick = 0;
  private readonly states: (0 | 1)[];
  private pending: number[] = [];
  private readonly flips: [number, number][] = [];
  private events: SimEvent[] = [];
  private readonly trail = new Trail();
  private s = 0;
  private prevS = 0;
  private readonly startS: number;
  private currentLane: number;
  private readonly traversed: number[] = [];
  private readonly wagons: WagonState[];
  private readonly pile: number[];
  private nSpilled = 0;
  private readonly factoryByLane = new Map<number, FactoryDef>();
  private resultValue: RunResult | null = null;
  private readonly scratch: Segment[] = [];
  private readonly trainLen: number;
  private readonly secretLane: number;

  constructor(level: LevelDefinition) {
    this.level = level;
    this.graph = TrackGraph.fromLevel(level);
    this.states = level.switches.map((sw) => sw.initial);
    for (const f of level.factories) this.factoryByLane.set(f.lane, f);
    this.pile = level.factories.map(() => 0);
    for (const id of level.depot.lanes) {
      this.trail.push(id, this.graph.lane(id).length);
      this.traversed.push(id);
    }
    this.currentLane = level.depot.lanes[level.depot.lanes.length - 1] as number;
    this.s = this.trail.end;
    this.prevS = this.s;
    this.startS = this.s;
    this.trainLen = level.train.length;
    this.wagons = Array.from({ length: level.train.wagons }, () => ({ total: 0, byType: {} }));
    const bonus = level.factories.find((f) => f.kind === 'bonus');
    this.secretLane = bonus ? bonus.lane : -1;
  }

  get phase(): Phase {
    return this._phase;
  }

  get tick(): number {
    return this._tick;
  }

  switchState(id: number): 0 | 1 {
    return this.states[id] ?? 0;
  }

  /** The lane a switch currently points to. */
  switchLane(id: number): number {
    const sw = this.level.switches[id];
    if (!sw) throw new Error(`Unknown switch ${id}`);
    return sw.lanes[this.switchState(id)];
  }

  /** True while any part of the train is on the switch's tile. */
  isSwitchLocked(id: number): boolean {
    const sw = this.level.switches[id];
    if (!sw) return false;
    for (const seg of this.trail.between(this.s - this.trainLen, this.s, this.scratch)) {
      if (this.graph.lane(seg.lane).tile === sw.tile) return true;
    }
    return false;
  }

  flip(id: number): FlipOutcome {
    if (!this.level.switches[id]) return 'refused';
    if (this._phase !== 'planning' && this._phase !== 'running') return 'refused';
    if (this.isSwitchLocked(id)) {
      this.events.push({ t: 'switchLocked', tick: this._tick, switch: id });
      return 'locked';
    }
    if (this._phase === 'planning') {
      this.apply(id, 0);
      return 'flipped';
    }
    this.pending.push(id);
    return 'queued';
  }

  go(): void {
    if (this._phase !== 'planning') return;
    this._phase = 'running';
    this.events.push({ t: 'depart', tick: this._tick });
  }

  pause(): void {
    if (this._phase === 'running') this._phase = 'paused';
  }

  resume(): void {
    if (this._phase === 'paused') this._phase = 'running';
  }

  /** Advance exactly one tick of DT. No-op unless running. */
  step(): void {
    if (this._phase !== 'running') return;
    this._tick++;
    if (this.pending.length) {
      const queued = this.pending;
      this.pending = [];
      for (const id of queued) {
        if (this.isSwitchLocked(id)) this.events.push({ t: 'switchLocked', tick: this._tick, switch: id });
        else this.apply(id, this._tick);
      }
    }

    // Move the engine front: the speed is the base speed times the factor of the lane it is on.
    this.prevS = this.s;
    const base = this.level.train.speed;
    let time = DT;
    let arrived = false;
    while (time > 1e-12) {
      if (this.s >= this.trail.end - 1e-12) {
        if (this.currentLane === this.level.station.lane) {
          arrived = true;
          break;
        }
        const next = this.graph.next(this.currentLane, (sw) => this.states[sw.id] ?? 0);
        if (next < 0) break; // Unreachable for valid levels (FR-008); stop safely.
        this.trail.push(next, this.graph.lane(next).length);
        this.currentLane = next;
        this.traversed.push(next);
      }
      const v = base * this.graph.lane(this.currentLane).speed;
      const room = this.trail.end - this.s;
      if (v * time <= room) {
        this.s += v * time;
        time = 0;
      } else {
        this.s = this.trail.end;
        time -= room / v;
      }
    }
    if (this.currentLane === this.level.station.lane && this.s >= this.trail.end - 1e-9) arrived = true;

    // Derailment: the engine front reaches a pile at or above the threshold (FR-017).
    for (const seg of this.trail.between(this.prevS, this.s, this.scratch)) {
      const f = this.factoryByLane.get(seg.lane);
      if (!f || (this.pile[f.id] as number) < DERAIL_PILE) continue;
      const pileStart = seg.start + f.hopper - L_PILE / 2;
      if (this.prevS < pileStart && pileStart <= this.s) {
        this._phase = 'derailed';
        this.events.push({ t: 'derail', tick: this._tick, factory: f.id });
        return;
      }
    }

    for (const f of this.level.factories) {
      if (this._tick % f.period === f.phase) this.drop(f);
    }

    if (arrived) this.deliver();
    this.trail.trimBefore(this.s - this.trainLen - 2);
  }

  drainEvents(): SimEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }

  carPoses(alpha = 1, out: CarPose[] = []): CarPose[] {
    const a = Math.max(0, Math.min(1, alpha));
    const s = this.prevS + (this.s - this.prevS) * a;
    return carPoses(this.graph, this.trail, s, this.level.train.wagons, out);
  }

  wagonLoads(): { total: number; byType: Partial<Record<ToyType, number>> }[] {
    return this.wagons.map((w) => ({ total: w.total, byType: { ...w.byType } }));
  }

  /** Seconds until each factory's next drop, and the fraction of its period that has passed. */
  factoryClock(id: number): { seconds: number; progress: number } {
    const f = this.level.factories[id];
    if (!f) return { seconds: 0, progress: 0 };
    const ticks = ticksToDrop(f, this._tick);
    return { seconds: ticks * DT, progress: 1 - ticks / f.period };
  }

  piles(): { factory: number; spilled: number; height: number; dangerous: boolean }[] {
    return this.pile.map((spilled, factory) => ({ factory, spilled, height: pileHeight(spilled), dangerous: spilled >= DERAIL_PILE }));
  }

  spilled(): number {
    return this.nSpilled;
  }

  traveled(): number {
    return this.s - this.startS;
  }

  traversedLanes(): readonly number[] {
    return this.traversed;
  }

  /** Engine front distance (for presentation, e.g. follow camera). */
  engineDistance(): number {
    return this.s;
  }

  result(): RunResult | null {
    return this.resultValue;
  }

  replay(): { level: number; flips: [number, number][] } {
    return { level: this.level.level, flips: this.flips.map(([t, id]) => [t, id] as [number, number]) };
  }

  private apply(id: number, tick: number): void {
    this.states[id] = (1 - (this.states[id] ?? 0)) as 0 | 1;
    this.flips.push([tick, id]);
    this.events.push({ t: 'switch', tick: this._tick, switch: id, state: this.states[id] as 0 | 1 });
  }

  /** The car under a factory's hopper right now (FR-070): 0 engine, k wagon, -1 none. */
  carUnder(f: FactoryDef): number {
    let car = -1;
    for (const seg of this.trail.between(this.s - this.trainLen - 0.1, this.s, this.scratch)) {
      if (seg.lane !== f.lane) continue;
      const c = carAt(this.s - (seg.start + f.hopper), this.level.train.wagons);
      if (c >= 0) car = c;
    }
    return car;
  }

  private drop(f: FactoryDef): void {
    const car = this.carUnder(f);
    if (car < 0) {
      this.events.push({ t: 'skip', tick: this._tick, factory: f.id });
      return;
    }
    let caught = 0;
    if (car > 0) {
      const wagon = this.wagons[car - 1] as WagonState;
      caught = Math.min(f.batch, Math.max(0, this.level.train.capacity - wagon.total));
      wagon.total += caught;
      wagon.byType[f.type] = (wagon.byType[f.type] ?? 0) + caught;
    }
    const spilled = f.batch - caught;
    this.events.push({ t: 'drop', tick: this._tick, factory: f.id, car, type: f.type, caught, spilled });
    if (spilled > 0) {
      const before = this.pile[f.id] as number;
      this.pile[f.id] = before + spilled;
      this.nSpilled += spilled;
      if (before < DERAIL_PILE && before + spilled >= DERAIL_PILE) this.events.push({ t: 'pileDanger', tick: this._tick, factory: f.id });
    }
  }

  private deliver(): void {
    this._phase = 'delivered';
    const score = scoreDelivery(this.level.order.lines, this.wagons.map((w) => w.byType));
    const secretRoute = this.secretLane >= 0 && score.ratio >= 1 && this.traversed.includes(this.secretLane);
    this.resultValue = {
      chutes: score.chutes,
      ratio: score.ratio,
      score: score.score,
      stars: score.stars,
      passed: score.passed,
      nSpilled: this.nSpilled,
      secretRoute,
      distance: this.traveled(),
      ticks: this._tick,
    };
    this.events.push({ t: 'delivered', tick: this._tick, result: this.resultValue });
  }
}
