// Train kinematics: the engine front moves along an append-only trail of lanes; every car follows
// the same trail at a fixed offset behind the engine (spec FR-002).
import { ENGINE_LEN, WAGON_LEN, wagonOffset } from './flow';
import type { LanePoint } from './grid';
import type { TrackGraph } from './trackGraph';
import type { CarPose } from './types';

export interface Segment {
  lane: number;
  start: number;
  end: number;
}

export class Trail {
  private segs: Segment[] = [];
  private first = 0;

  get end(): number {
    return this.segs.length ? (this.segs[this.segs.length - 1] as Segment).end : 0;
  }

  get start(): number {
    return this.segs.length > this.first ? (this.segs[this.first] as Segment).start : 0;
  }

  get last(): Segment | undefined {
    return this.segs[this.segs.length - 1];
  }

  push(lane: number, length: number): Segment {
    const start = this.end;
    const seg = { lane, start, end: start + length };
    this.segs.push(seg);
    return seg;
  }

  /** Segment containing distance d (clamped to the trail). */
  locate(d: number): Segment {
    let lo = this.first;
    let hi = this.segs.length - 1;
    if (hi < lo) throw new Error('empty trail');
    if (d <= (this.segs[lo] as Segment).start) return this.segs[lo] as Segment;
    if (d >= (this.segs[hi] as Segment).end) return this.segs[hi] as Segment;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if ((this.segs[mid] as Segment).end < d) lo = mid + 1;
      else hi = mid;
    }
    return this.segs[lo] as Segment;
  }

  /** Segments overlapping the half-open interval (d0, d1]. */
  between(d0: number, d1: number, out: Segment[] = []): Segment[] {
    out.length = 0;
    if (d1 <= d0) return out;
    for (let i = this.segs.length - 1; i >= this.first; i--) {
      const seg = this.segs[i] as Segment;
      if (seg.end <= d0) break;
      if (seg.start < d1) out.push(seg);
    }
    out.reverse();
    return out;
  }

  /** Forget segments that end before distance d (keeps memory bounded on long runs). */
  trimBefore(d: number): void {
    while (this.first < this.segs.length - 1 && (this.segs[this.first] as Segment).end < d) this.first++;
    if (this.first > 256) {
      this.segs = this.segs.slice(this.first);
      this.first = 0;
    }
  }
}

export interface CarSpan {
  index: number;
  front: number;
  back: number;
}

/** Front/back distances (behind the engine front) of the engine (0) and wagons 1..W. */
export function carSpans(wagons: number): CarSpan[] {
  const spans: CarSpan[] = [{ index: 0, front: 0, back: ENGINE_LEN }];
  for (let k = 1; k <= wagons; k++) {
    const front = wagonOffset(k);
    spans.push({ index: k, front, back: front + WAGON_LEN });
  }
  return spans;
}

const scratchA: LanePoint = { x: 0, y: 0, heading: 0 };
const scratchB: LanePoint = { x: 0, y: 0, heading: 0 };

export function pointOnTrail(graph: TrackGraph, trail: Trail, d: number, out: LanePoint): LanePoint {
  const seg = trail.locate(d);
  const lane = graph.lane(seg.lane);
  const u = Math.max(0, Math.min(lane.length, d - seg.start));
  return graph.point(seg.lane, u, out);
}

/** Pose of every car with the engine front at distance `s`. */
export function carPoses(graph: TrackGraph, trail: Trail, s: number, wagons: number, out: CarPose[] = []): CarPose[] {
  const spans = carSpans(wagons);
  out.length = spans.length;
  for (const span of spans) {
    const f = pointOnTrail(graph, trail, s - span.front, scratchA);
    const fx = f.x;
    const fy = f.y;
    const b = pointOnTrail(graph, trail, s - span.back, scratchB);
    const pose = out[span.index] ?? { index: span.index, x: 0, y: 0, heading: 0, frontX: 0, frontY: 0, backX: 0, backY: 0 };
    pose.index = span.index;
    pose.frontX = fx;
    pose.frontY = fy;
    pose.backX = b.x;
    pose.backY = b.y;
    pose.x = (fx + b.x) / 2;
    pose.y = (fy + b.y) / 2;
    pose.heading = Math.atan2(fy - b.y, fx - b.x);
    out[span.index] = pose;
  }
  return out;
}
