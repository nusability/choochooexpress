import { expect, test } from '@playwright/test';
import { tapWidget, waitForScreen, widget, type Win } from './hook';

// Gameplay v2 checks (F-010, F-013): full-screen boards, readable switch arrows, endless worlds.

test.use({ contextOptions: { reducedMotion: 'reduce' } });

for (const level of [1, 20, 40]) {
  test(`level ${level}: the ground fills the screen and the board spans its width (SC-018)`, async ({ page }) => {
    await page.addInitScript(() => {
      const levels: Record<number, unknown> = {};
      for (let i = 1; i < 40; i++) levels[i] = { stars: 1, best: 600, secret: false };
      localStorage.setItem('ccxd3d.save', JSON.stringify({ version: 2, levels, settings: { muted: true } }));
    });
    await page.goto(`/?level=${level}`);
    await waitForScreen(page, 'level');
    await widget(page, 'go');
    const view = await page.evaluate(() => (window as unknown as Win).__ccx.viewCoverage());
    const width = page.viewportSize()!.width;
    expect(view?.groundCovers).toBe(true);
    expect((view!.boardRight - view!.boardLeft) / width).toBeGreaterThanOrEqual(0.9);
  });
}

test('a switch button turns its arrow toward the newly set branch (FR-095)', async ({ page }) => {
  await page.goto('/?reset=1&level=1');
  await waitForScreen(page, 'level');
  await widget(page, 'go');
  const before = await page.evaluate(() => (window as unknown as Win).__ccx.switchArrowAngle(0));
  const [p] = await page.evaluate(() => (window as unknown as Win).__ccx.switchScreenPositions());
  await page.touchscreen.tap(p!.x, p!.y);
  await expect.poll(() => page.evaluate(() => (window as unknown as Win).__ccx.switchArrowAngle(0))).not.toBeCloseTo(before!, 1);
});

test('the map shows endless worlds and steps from world to world (F-010)', async ({ page }) => {
  await page.addInitScript(() => {
    const levels: Record<number, unknown> = {};
    for (let i = 1; i <= 30; i++) levels[i] = { stars: 2, best: 900, secret: false };
    localStorage.setItem('ccxd3d.save', JSON.stringify({ version: 2, levels, settings: { muted: true } }));
  });
  await page.goto('/');
  await waitForScreen(page, 'map');
  // Level 31 (world 5, Icy Pond) is the furthest unlocked level.
  expect((await widget(page, 'map.title')).text).toBe('World 5 · Icy Pond');
  expect(await page.evaluate(() => (window as unknown as Win).__ccx.unlocked(31))).toBe(true);
  expect(await page.evaluate(() => (window as unknown as Win).__ccx.unlocked(32))).toBe(false);
  const next = await widget(page, 'map.next');
  await page.touchscreen.tap(next.x + next.w / 2, next.y + next.h / 2);
  await expect.poll(async () => (await widget(page, 'map.title')).text).toBe('World 6 · Model Railway Village');
  // One world past the furthest unlocked one is the end of the map for now.
  await page.touchscreen.tap(next.x + next.w / 2, next.y + next.h / 2);
  await page.waitForTimeout(300);
  expect((await widget(page, 'map.title')).text).toBe('World 6 · Model Railway Village');
});

test('two fingers twist the view; the compass button brings it back (FR-112)', async ({ page }) => {
  await page.goto('/?level=1');
  await waitForScreen(page, 'level');
  await widget(page, 'go');
  expect((await page.evaluate(() => (window as unknown as Win).__ccx.widgets())).some((w) => w.id === 'view')).toBe(false);
  await page.evaluate(async () => {
    const c = document.querySelector('canvas') as HTMLCanvasElement;
    const ev = (type: string, id: number, x: number, y: number) =>
      c.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', clientX: x, clientY: y, bubbles: true, isPrimary: id === 1 }));
    const at = (a: number, k: number): [number, number] => [196 + Math.cos(a + k * Math.PI) * 80, 450 + Math.sin(a + k * Math.PI) * 80];
    ev('pointerdown', 1, ...at(0, 0));
    ev('pointerdown', 2, ...at(0, 1));
    for (let i = 1; i <= 12; i++) {
      ev('pointermove', 1, ...at(i * 0.08, 0));
      ev('pointermove', 2, ...at(i * 0.08, 1));
      await new Promise((r) => setTimeout(r, 16));
    }
    ev('pointerup', 1, 0, 0);
    ev('pointerup', 2, 0, 0);
  });
  await tapWidget(page, 'view');
  await expect.poll(async () => (await page.evaluate(() => (window as unknown as Win).__ccx.widgets())).some((w) => w.id === 'view')).toBe(false);
});
