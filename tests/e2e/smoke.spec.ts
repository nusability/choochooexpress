import { expect, test } from '@playwright/test';
import { applyPlan, phase, tapWidget, waitForScreen, waitForText, widget, widgets, type Win } from './hook';

// Mobile smoke tests for the P1 stories (US14 shunting, US8 interface, US6/US10 progression).
// Every step goes through the 3D interface (F-008); ?speed=8 plays runs back quickly.

test.use({ contextOptions: { reducedMotion: 'reduce' } });

test('level 1: set the switch, go, and deliver the wagon (US14)', async ({ page }) => {
  await page.goto('/?reset=1&level=1&speed=8');
  await waitForScreen(page, 'level');
  expect((await widget(page, 'goal')).text).toBe('Toy Station wants');
  await widget(page, 'go');
  const solution = await page.evaluate(() => (window as unknown as Win).__ccx.solution());
  await applyPlan(page, solution!);
  await tapWidget(page, 'go');
  await expect.poll(() => phase(page), { timeout: 60_000 }).toBe('delivered');
  await waitForText(page, 'Perfect shunting!', 15_000);
  const result = await page.evaluate(() => (window as unknown as Win).__ccx.result());
  expect(result).toMatchObject({ stars: 3, passed: true });
  expect(result?.steps).toBe(result?.par);
});

test('a level with uncouplers: place the pads by tapping the track and solve it (FR-101)', async ({ page }) => {
  await page.addInitScript(() => {
    const levels: Record<number, unknown> = {};
    for (let i = 1; i < 20; i++) levels[i] = { stars: 1, best: 500, secret: false };
    localStorage.setItem('ccxd3d.save', JSON.stringify({ version: 2, levels, settings: { muted: true } }));
  });
  // The first level whose solution needs a pad.
  let level = 3;
  for (; level < 20; level++) {
    await page.goto(`/?level=${level}&speed=8`);
    await waitForScreen(page, 'level');
    const s = await page.evaluate(() => (window as unknown as Win).__ccx.solution());
    if (s && s.pads.length > 0) break;
  }
  await widget(page, 'go');
  const solution = await page.evaluate(() => (window as unknown as Win).__ccx.solution());
  await applyPlan(page, solution!);
  await tapWidget(page, 'go');
  await expect.poll(() => phase(page), { timeout: 60_000 }).toBe('delivered');
  expect((await page.evaluate(() => (window as unknown as Win).__ccx.result()))?.stars).toBe(3);
});

test('progress survives a reload and unlocks level 2 on the map (US6)', async ({ page }) => {
  await page.goto('/?reset=1&level=1&speed=8&autoplay=1');
  await waitForScreen(page, 'level');
  await expect.poll(() => phase(page), { timeout: 60_000 }).toBe('delivered');
  const next = await widget(page, 'results.next', 15_000);
  expect(next.enabled).toBe(true);
  await page.goto('/');
  await waitForScreen(page, 'map');
  expect(await page.evaluate(() => (window as unknown as Win).__ccx.unlocked(2))).toBe(true);
  expect(await page.evaluate(() => (window as unknown as Win).__ccx.unlocked(3))).toBe(false);
  const marker = await page.evaluate(() => (window as unknown as Win).__ccx.levelMarkerScreenPosition(2));
  expect(marker).not.toBeNull();
  await page.touchscreen.tap(marker!.x, marker!.y);
  await expect.poll(async () => (await widgets(page)).some((w) => w.label === 'Play level 1-2')).toBe(true);
});
