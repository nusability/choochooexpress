import { describe, expect, it } from 'vitest';
import { COUPLING_GAP, ENGINE_LEN, WAGON_LEN, wagonOffset } from '../../src/engine/flow';
import { generateLevel } from '../../src/engine/levelGenerator';
import { TrackGraph } from '../../src/engine/trackGraph';
import { Trail, carPoses, carSpans } from '../../src/engine/train';
import { Simulation } from '../../src/engine/simulation';

describe('train kinematics', () => {
  it('spaces cars by their lengths and coupling gaps', () => {
    const spans = carSpans(3);
    expect(spans).toHaveLength(4);
    expect(spans[0]).toEqual({ index: 0, front: 0, back: ENGINE_LEN });
    for (let k = 1; k <= 3; k++) {
      const span = spans[k];
      expect(span?.front).toBeCloseTo(wagonOffset(k), 12);
      expect((span?.back ?? 0) - (span?.front ?? 0)).toBeCloseTo(WAGON_LEN, 12);
      expect((span?.front ?? 0) - (spans[k - 1]?.back ?? 0)).toBeCloseTo(COUPLING_GAP, 12);
    }
  });

  it('locates distances on the trail and lists overlapping segments', () => {
    const trail = new Trail();
    trail.push(5, 1);
    trail.push(6, Math.PI / 4);
    trail.push(7, 1);
    expect(trail.locate(0.5).lane).toBe(5);
    expect(trail.locate(1.2).lane).toBe(6);
    expect(trail.locate(2.5).lane).toBe(7);
    expect(trail.between(0.9, 1.9).map((s) => s.lane)).toEqual([5, 6, 7]);
    trail.trimBefore(1.5);
    expect(trail.locate(0).lane).toBe(6);
  });

  it('places the whole train on the depot at the start, heading out of it', () => {
    const level = generateLevel(4);
    const sim = new Simulation(level);
    const poses = sim.carPoses();
    expect(poses).toHaveLength(level.train.wagons + 1);
    const graph = TrackGraph.fromLevel(level);
    const depotTiles = new Set(level.depot.tiles);
    for (const pose of poses) {
      const tile = Math.floor(pose.y) * level.cols + Math.floor(pose.x);
      expect(depotTiles.has(tile)).toBe(true);
    }
    const lastDepot = graph.lane(level.depot.lanes.at(-1) as number);
    const engine = poses[0];
    const p = graph.point(lastDepot.id, 1);
    expect(engine?.frontX).toBeCloseTo(p.x, 9);
    expect(engine?.frontY).toBeCloseTo(p.y, 9);
  });

  it('interpolates poses between ticks', () => {
    const sim = new Simulation(generateLevel(2));
    sim.go();
    sim.step();
    const before = sim.carPoses(0)[0];
    const after = sim.carPoses(1)[0];
    const mid = sim.carPoses(0.5)[0];
    const d = Math.hypot((after?.frontX ?? 0) - (before?.frontX ?? 0), (after?.frontY ?? 0) - (before?.frontY ?? 0));
    expect(d).toBeGreaterThan(0);
    // Halfway in distance along the track: equal arc steps on either side of the midpoint.
    const d1 = Math.hypot((mid?.frontX ?? 0) - (before?.frontX ?? 0), (mid?.frontY ?? 0) - (before?.frontY ?? 0));
    const d2 = Math.hypot((after?.frontX ?? 0) - (mid?.frontX ?? 0), (after?.frontY ?? 0) - (mid?.frontY ?? 0));
    expect(d1).toBeCloseTo(d2, 6);
  });

  it('keeps a car pose consistent with its front and back points', () => {
    const level = generateLevel(10);
    const sim = new Simulation(level);
    sim.go();
    for (let i = 0; i < 300; i++) sim.step();
    for (const pose of carPoses(sim.graph, (sim as unknown as { trail: Trail }).trail, sim.engineDistance(), level.train.wagons)) {
      expect(pose.x).toBeCloseTo((pose.frontX + pose.backX) / 2, 9);
      expect(Math.atan2(pose.frontY - pose.backY, pose.frontX - pose.backX)).toBeCloseTo(pose.heading, 9);
    }
  });
});
