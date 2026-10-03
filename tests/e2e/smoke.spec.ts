import { expect, test, type Page } from '@playwright/test';

// Mobile smoke tests for the P1 stories (US1–US4) and progression (US6). WebGL runs in software,
// so the game is sped up with ?speed=8 (ticks per frame); the simulation stays deterministic.

interface Hook {
  screen(): string;
  phase(): string | null;
  switchScreenPositions(): { id: number; x: number; y: number }[];
  switchLane(id: number): number | null;
  standardPlan(): { switch: number; lane: number }[];
  levelMarkerScreenPosition(level: number): { x: number; y: number } | null;
  result(): { stars: number; score: number; passed: boolean } | null;
  unlocked(level: number): boolean;
}



async function waitForScreen(page: Page, screen: string) {
  await expect.poll(() => page.evaluate(() => (window as unknown as { __ccx: Hook }).__ccx.screen()), { timeout: 60_000 }).toBe(screen);
}

test.use({ contextOptions: { reducedMotion: 'reduce' } });

test('level 1: flip the switch, go, and deliver the order (US1–US3)', async ({ page }) => {
  await page.goto('/?reset=1&level=1&speed=8');
  await waitForScreen(page, 'level');
  await expect(page.getByText('Toy Store order')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start the train' })).toBeVisible();
  // Point every switch the way the standard route needs it, by tapping it on screen.
  const plan = await page.evaluate(() => (window as unknown as { __ccx: Hook }).__ccx.standardPlan());
  for (const step of plan) {
    const lane = await page.evaluate((id) => (window as unknown as { __ccx: Hook }).__ccx.switchLane(id), step.switch);
    if (lane === step.lane) continue;
    const positions = await page.evaluate(() => (window as unknown as { __ccx: Hook }).__ccx.switchScreenPositions());
    const p = positions.find((s) => s.id === step.switch);
    expect(p, 'switch is on screen').toBeDefined();
    await page.touchscreen.tap(p!.x, p!.y);
    await expect.poll(() => page.evaluate((id) => (window as unknown as { __ccx: Hook }).__ccx.switchLane(id), step.switch)).toBe(step.lane);
  }
  await page.getByRole('button', { name: 'Start the train' }).tap();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __ccx: Hook }).__ccx.phase()), { timeout: 150_000 }).toBe('delivered');
  await expect(page.getByText('Perfect delivery!')).toBeVisible({ timeout: 15_000 });
  const result = await page.evaluate(() => (window as unknown as { __ccx: Hook }).__ccx.result());
  expect(result?.score).toBe(1000);
  expect(result?.stars).toBe(3);
});

test('progress survives a reload and unlocks level 2 on the map (US6)', async ({ page }) => {
  await page.goto('/?reset=1&level=1&speed=8&autoplay=1');
  await waitForScreen(page, 'level');
  await expect.poll(() => page.evaluate(() => (window as unknown as { __ccx: Hook }).__ccx.phase()), { timeout: 150_000 }).toBe('delivered');
  await expect(page.getByRole('button', { name: 'Next level' })).toBeVisible({ timeout: 15_000 });
  await page.goto('/');
  await waitForScreen(page, 'map');
  expect(await page.evaluate(() => (window as unknown as { __ccx: Hook }).__ccx.unlocked(2))).toBe(true);
  expect(await page.evaluate(() => (window as unknown as { __ccx: Hook }).__ccx.unlocked(3))).toBe(false);
  const marker = await page.evaluate(() => (window as unknown as { __ccx: Hook }).__ccx.levelMarkerScreenPosition(2));
  expect(marker).not.toBeNull();
  await page.touchscreen.tap(marker!.x, marker!.y);
  await expect(page.getByRole('button', { name: 'Play level 2' })).toBeVisible();
});
