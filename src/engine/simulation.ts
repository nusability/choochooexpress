// One run of a level (specs/contracts/engine-api.md). Deterministic: the same flips at the same
// ticks always give the same events and result (FR-011).
import { DERAIL_PILE, DT, WAGON_LEN, pileHeight, wagonOffset } from './flow';
import { loadedLines, scoreDelivery, type PassRecord } from './scoring';
import { TrackGraph } from './trackGraph';
import { Trail, carPoses, type Segment } from './train';
import type { CarPose, FlipOutcome, FunnelDef, LevelDefinition, Phase, RunResult, SimEvent, ToyType } from './types';

interface WagonState {
  total: number;
  byType: Partial<Record<ToyType, number>>;
  /** Funnel passes this wagon has started (index into the train's pass list). */
  visits: number;
  /** Pass index of the funnel the wagon is currently under, per funnel id. */
  currentPass: Map<number, number>;
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
  private readonly passes: (PassRecord & { funnel: number })[] = [];
  private readonly spilledAt: number[];
  private nSpilled = 0;
  private readonly funnelByLane = new Map<number, FunnelDef>();
  private readonly switchByTile = new Map<number, number>();
  private resultValue: RunResult | null = null;
  private readonly scratch: Segment[] = [];
  private readonly wagonCenter: number[];
  private readonly trainLen: number;

  constructor(level: LevelDefinition) {
    this.level = level;
    this.graph = TrackGraph.fromLevel(level);
    this.states = level.switches.map((sw) => sw.initial);
    for (const sw of level.switches) this.switchByTile.set(sw.tile, sw.id);
    for (const f of level.funnels) this.funnelByLane.set(f.lane, f);
    this.spilledAt = level.funnels.map(() => 0);
    for (const id of level.depot.lanes) {
      this.trail.push(id, this.graph.lane(id).length);
      this.traversed.push(id);
    }
    this.currentLane = level.depot.lanes[level.depot.lanes.length - 1] as number;
    this.s = this.trail.end;
    this.prevS = this.s;
    this.startS = this.s;
    this.trainLen = level.train.length;
    this.wagons = Array.from({ length: level.train.wagons }, () => ({ total: 0, byType: {}, visits: 0, currentPass: new Map() }));
    this.wagonCenter = Array.from({ length: level.train.wagons }, (_, i) => wagonOffset(i + 1) + WAGON_LEN / 2);
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

    this.prevS = this.s;
    let target = this.s + this.level.train.speed * DT;
    let arrived = false;
    while (target > this.trail.end) {
      if (this.currentLane === this.level.store.lane) {
        target = this.trail.end;
        arrived = true;
        break;
      }
      const next = this.graph.next(this.currentLane, (sw) => this.states[sw.id] ?? 0);
      if (next < 0) {
        // Unreachable for valid levels (FR-008); stop safely.
        target = this.trail.end;
        arrived = this.currentLane === this.level.store.lane;
        break;
      }
      this.trail.push(next, this.graph.lane(next).length);
      this.currentLane = next;
      this.traversed.push(next);
    }
    if (this.currentLane === this.level.store.lane && target >= this.trail.end - 1e-9) arrived = true;
    this.s = target;

    // Derailment: the engine front reaches a funnel span whose pile is high enough (FR-017).
    for (const seg of this.trail.between(this.prevS, this.s, this.scratch)) {
      const funnel = this.funnelByLane.get(seg.lane);
      if (!funnel) continue;
      const l0 = this.prevS - seg.start;
      const l1 = this.s - seg.start;
      if (l0 < funnel.spanStart && funnel.spanStart <= l1 && (this.spilledAt[funnel.id] as number) >= DERAIL_PILE) {
        this._phase = 'derailed';
        this.events.push({ t: 'derail', tick: this._tick, funnel: funnel.id });
        return;
      }
    }

    for (let k = 0; k < this.wagons.length; k++) this.load(k);

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

  loadedByType(): Partial<Record<ToyType, number>> {
    const sum: Partial<Record<ToyType, number>> = {};
    for (const w of this.wagons) {
      for (const [type, n] of Object.entries(w.byType) as [ToyType, number][]) sum[type] = (sum[type] ?? 0) + n;
    }
    return sum;
  }

  piles(): { funnel: number; spilled: number; height: number; dangerous: boolean }[] {
    return this.spilledAt.map((spilled, funnel) => ({ funnel, spilled, height: pileHeight(spilled), dangerous: spilled >= DERAIL_PILE }));
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

  private load(k: number): void {
    const wagon = this.wagons[k] as WagonState;
    const offset = this.wagonCenter[k] as number;
    const c0 = this.prevS - offset;
    const c1 = this.s - offset;
    for (const seg of this.trail.between(c0, c1, this.scratch)) {
      const funnel = this.funnelByLane.get(seg.lane);
      if (!funnel) continue;
      const l0 = c0 - seg.start;
      const l1 = c1 - seg.start;
      if (l0 < funnel.spanStart && funnel.spanStart <= l1) {
        const passIndex = wagon.visits++;
        if (k === 0) {
          this.passes.push({ funnel: funnel.id, type: funnel.type, loaded: 0, spilled: 0 });
          this.events.push({ t: 'passStart', tick: this._tick, funnel: funnel.id, pass: passIndex });
        }
        wagon.currentPass.set(funnel.id, passIndex);
      }
      const passIndex = wagon.currentPass.get(funnel.id);
      if (passIndex === undefined) continue;
      const span = funnel.spanEnd - funnel.spanStart;
      for (let i = 1; i <= funnel.dose; i++) {
        const threshold = funnel.spanStart + ((i - 0.5) * span) / funnel.dose;
        if (l0 < threshold && threshold <= l1) this.emitToy(k, funnel, passIndex);
      }
    }
  }

  private emitToy(k: number, funnel: FunnelDef, passIndex: number): void {
    const wagon = this.wagons[k] as WagonState;
    const pass = this.passes[passIndex];
    if (wagon.total < this.level.train.capacity) {
      wagon.total++;
      wagon.byType[funnel.type] = (wagon.byType[funnel.type] ?? 0) + 1;
      if (pass) pass.loaded++;
      this.events.push({ t: 'load', tick: this._tick, wagon: k + 1, funnel: funnel.id, type: funnel.type });
      return;
    }
    const spilled = (this.spilledAt[funnel.id] as number) + 1;
    this.spilledAt[funnel.id] = spilled;
    this.nSpilled++;
    if (pass) pass.spilled++;
    this.events.push({ t: 'spill', tick: this._tick, wagon: k + 1, funnel: funnel.id, type: funnel.type });
    if (spilled === DERAIL_PILE) this.events.push({ t: 'pileDanger', tick: this._tick, funnel: funnel.id });
  }

  private deliver(): void {
    this._phase = 'delivered';
    const loaded = loadedLines(this.passes);
    const secret = this.level.routes.secret;
    const secretRoute =
      !!secret && secret.lanes.length === this.traversed.length && secret.lanes.every((id, i) => this.traversed[i] === id);
    const score = scoreDelivery(this.level.order.lines, loaded, this.nSpilled, secretRoute);
    this.resultValue = {
      orderLines: this.level.order.lines.map((l) => ({ ...l })),
      loadedLines: loaded,
      nCorrect: score.nCorrect,
      nTotal: score.nTotal,
      nSpilled: this.nSpilled,
      secretRoute,
      bonus: score.bonus,
      score: score.score,
      stars: score.stars,
      passed: score.passed,
      distance: this.traveled(),
      ticks: this._tick,
    };
    this.events.push({ t: 'delivered', tick: this._tick, result: this.resultValue });
  }
}
