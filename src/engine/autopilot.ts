// Drives a route's switch plan: every switch is flipped toward its next required lane as soon as it
// is free (used by tests, `?autoplay=1` and the e2e smoke test).
import { Simulation } from './simulation';
import type { LevelDefinition, RouteInfo } from './types';

export class Autopilot {
  private consumed = 0;
  private seen = 0;

  constructor(
    private readonly sim: Simulation,
    private readonly route: RouteInfo,
  ) {}

  /** Call once before each `sim.step()` (and once during planning). */
  update(): void {
    const plan = this.route.switchPlan;
    const traversed = this.sim.traversedLanes();
    for (; this.seen < traversed.length; this.seen++) {
      const step = plan[this.consumed];
      if (step && step.lane === traversed[this.seen]) this.consumed++;
    }
    const desired = new Map<number, number>();
    for (let i = this.consumed; i < plan.length; i++) {
      const step = plan[i];
      if (step && !desired.has(step.switch)) desired.set(step.switch, step.lane);
    }
    for (const [id, lane] of desired) {
      if (this.sim.switchLane(id) !== lane && !this.sim.isSwitchLocked(id)) this.sim.flip(id);
    }
  }
}

/** Runs a whole level along `route` and returns the finished simulation. */
export function runRoute(level: LevelDefinition, route: RouteInfo, maxTicks = 60 * 600): Simulation {
  const sim = new Simulation(level);
  const pilot = new Autopilot(sim, route);
  pilot.update();
  sim.go();
  while (sim.phase === 'running' && sim.tick < maxTicks) {
    pilot.update();
    sim.step();
  }
  return sim;
}
