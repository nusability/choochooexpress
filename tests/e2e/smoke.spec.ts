import { expect, test } from '@playwright/test';
import { phase, tapWidget, waitForScreen, waitForText, widget, widgets, type Win } from './hook';

// Mobile smoke tests for the P1 stories (US1–US4, US8, US9) and progression (US6, US10). Every step goes
// through the 3D interface (F-008). WebGL runs in software, so the game is sped up with ?speed=8
// (ticks per frame); the simulation stays deterministic.

test.use({ contextOptions: { reducedMotion: 'reduce' } });

test('level 1: flip the switch, go, and deliver the order (US1–US3)', async ({ page }) => {
  await page.goto('/?reset=1&level=1&speed=8');
  await waitForScreen(page, 'level');
  const order = await widget(page, 'order');
  expect(order.text).toBe('Toy Station order');
  await widget(page, 'go');
  // Point every switch the way the standard route needs it, by tapping it on screen.
  const plan = await page.evaluate(() => (window as unknown as Win).__ccx.standardPlan());
  for (const step of plan) {
    const lane = await page.evaluate((id) => (window as unknown as Win).__ccx.switchLane(id), step.switch);
    if (lane === step.lane) continue;
    const positions = await page.evaluate(() => (window as unknown as Win).__ccx.switchScreenPositions());
    const p = positions.find((s) => s.id === step.switch);
    expect(p, 'switch is on screen').toBeDefined();
    await page.touchscreen.tap(p!.x, p!.y);
    await expect.poll(() => page.evaluate((id) => (window as unknown as Win).__ccx.switchLane(id), step.switch)).toBe(step.lane);
  }
  await tapWidget(page, 'go');
  await expect.poll(() => phase(page), { timeout: 150_000 }).toBe('delivered');
  await waitForText(page, 'Perfect delivery!', 15_000);
  const result = await page.evaluate(() => (window as unknown as Win).__ccx.result());
  expect(result?.score).toBe(1000);
  expect(result?.stars).toBe(3);
  expect(result?.chutes.every((c) => c.got === c.wanted)).toBe(true);
});

test('progress survives a reload and unlocks level 2 on the map (US6)', async ({ page }) => {
  await page.goto('/?reset=1&level=1&speed=8&autoplay=1');
  await waitForScreen(page, 'level');
  await expect.poll(() => phase(page), { timeout: 150_000 }).toBe('delivered');
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
