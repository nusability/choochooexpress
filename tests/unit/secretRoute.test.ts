import { describe, expect, it } from 'vitest';
import { runRoute } from '../../src/engine/autopilot';
import { STAR_2_RATIO } from '../../src/engine/flow';
import { generateLevel } from '../../src/engine/levelGenerator';

const LEVELS = Array.from({ length: 100 }, (_, i) => i + 1);
const withSecret = LEVELS.filter((n) => generateLevel(n).routes.secret !== null);

describe('secret detours (US12, F-012, SC-016)', () => {
  it('appear only from level 15, in at least a quarter of levels 15–100', () => {
    expect(withSecret.every((n) => n >= 15)).toBe(true);
    expect(withSecret.length / 86).toBeGreaterThanOrEqual(0.25);
  });

  it.each(withSecret)('level %i: the plain route scores 85–99%, the detour 100% and counts as the secret', (n) => {
    const level = generateLevel(n);
    const plain = runRoute(level, level.routes.standard).result();
    expect(plain?.ratio).toBeGreaterThanOrEqual(STAR_2_RATIO);
    expect(plain?.ratio).toBeLessThan(1);
    expect(plain?.secretRoute).toBe(false);
    const secret = runRoute(level, level.routes.secret!).result();
    expect(secret).toMatchObject({ ratio: 1, stars: 3, secretRoute: true });
    // Longer than the plain way, starts set to the plain route, hidden in a tunnel or on a bridge.
    expect(level.routes.secret!.length).toBeGreaterThan(level.routes.standard.length);
    const sw = level.switches.find((s) => s.kind === 'secret')!;
    expect(sw.initial).toBe(0);
    const detour = new Set(level.routes.secret!.lanes.filter((l) => !level.routes.standard.lanes.includes(l)));
    const hidden = level.tunnels.some((t) => t.lanes.some((l) => detour.has(l))) || level.bridges.some((b) => detour.has(b.deckLane) || detour.has(b.rampUp));
    expect(hidden).toBe(true);
    const bonus = level.factories.find((f) => f.kind === 'bonus')!;
    const total = level.order.lines.reduce((s, l) => s + l.quantity, 0);
    expect(bonus.batch / total).toBeLessThanOrEqual(0.15 + 1e-9);
  });
});
