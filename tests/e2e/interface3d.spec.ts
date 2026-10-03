import { expect, test, type Page } from '@playwright/test';
import { applyPlan, phase, tapWidget, waitForScreen, widget, widgets, type Win } from './hook';

// The toy-box 3D interface (US8, F-008): nothing on screen is a page element (SC-011), buttons are
// big enough and on screen in both orientations (SC-012), buttons act on release (FR-063) and an
// open card keeps touches away from the board (FR-064).

test.use({ contextOptions: { reducedMotion: 'reduce' } });

/** Visible page elements other than the game canvas and its container. */
async function pageElements(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    Array.from(document.body.querySelectorAll('*'))
      .filter((el) => {
        if (el.tagName === 'CANVAS' || el.tagName === 'SCRIPT' || el.id === 'app') return false;
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity) > 0 && r.width > 0 && r.height > 0;
      })
      .map((el) => `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${el.className ? `.${String(el.className)}` : ''}`),
  );
}

async function expectWidgetsOnScreen(page: Page, where: string): Promise<void> {
  const vp = page.viewportSize() as { width: number; height: number };
  const list = await widgets(page);
  expect(list.length, `${where}: widgets`).toBeGreaterThan(0);
  for (const w of list) {
    const name = `${where}: ${w.id || w.label}`;
    expect(w.x, name).toBeGreaterThanOrEqual(-0.5);
    expect(w.y, name).toBeGreaterThanOrEqual(-0.5);
    expect(w.x + w.w, name).toBeLessThanOrEqual(vp.width + 0.5);
    expect(w.y + w.h, name).toBeLessThanOrEqual(vp.height + 0.5);
    if (w.button) {
      expect(w.w, name).toBeGreaterThanOrEqual(44);
      expect(w.h, name).toBeGreaterThanOrEqual(44);
    }
  }
}

async function playLevel1ToResults(page: Page): Promise<void> {
  await page.goto('/?level=1&autoplay=1&speed=8');
  await expect.poll(() => phase(page), { timeout: 150_000 }).toBe('delivered');
  await widget(page, 'results.retry', 15_000);
}

test('every screen is 3D: no page elements on the map, level card, level or results (SC-011)', async ({ page }) => {
  await page.goto('/?reset=1');
  await waitForScreen(page, 'map');
  await widget(page, 'map.mute');
  expect(await pageElements(page)).toEqual([]);
  const marker = await page.evaluate(() => (window as unknown as Win).__ccx.levelMarkerScreenPosition(1));
  await page.touchscreen.tap(marker!.x, marker!.y);
  await widget(page, 'card.play');
  expect(await pageElements(page)).toEqual([]);
  await tapWidget(page, 'card.play');
  await waitForScreen(page, 'level');
  await widget(page, 'go');
  expect(await pageElements(page)).toEqual([]);
  await playLevel1ToResults(page);
  expect(await pageElements(page)).toEqual([]);
});

for (const vp of [
  { name: 'portrait', width: 393, height: 852 },
  { name: 'landscape', width: 852, height: 393 },
]) {
  test(`buttons are at least 44 × 44 and fully on screen in ${vp.name} (SC-012)`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto('/?reset=1');
    await waitForScreen(page, 'map');
    await widget(page, 'map.mute');
    await expectWidgetsOnScreen(page, 'map');
    await page.goto('/?level=1');
    await waitForScreen(page, 'level');
    await widget(page, 'go');
    await expectWidgetsOnScreen(page, 'level');
    await playLevel1ToResults(page);
    await expectWidgetsOnScreen(page, 'results');
  });
}

test('buttons act on release, nothing changes after Go, and an open card keeps touches from the board (FR-063, FR-064, FR-096)', async ({ page }) => {
  await page.goto('/?reset=1&level=1&speed=8');
  await waitForScreen(page, 'level');
  const go = await widget(page, 'go');
  const cx = go.x + go.w / 2;
  const cy = go.y + go.h / 2;
  // Press Go, slide off and let go: nothing happens, and the board did not pan either.
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx, cy - 220, { steps: 6 });
  await page.mouse.up();
  expect(await phase(page)).toBe('planning');
  expect(await page.evaluate(() => (window as unknown as Win).__ccx.cameraMode())).toBe('overview');
  // Set up the solution, then a real press starts the run; tapping a switch afterwards changes
  // nothing (FR-096).
  await applyPlan(page, (await page.evaluate(() => (window as unknown as Win).__ccx.solution()))!);
  await page.mouse.click(cx, cy);
  await expect.poll(() => phase(page)).not.toBe('planning');
  const before = await page.evaluate(() => (window as unknown as Win).__ccx.plan());
  const [sw] = await page.evaluate(() => (window as unknown as Win).__ccx.switchScreenPositions());
  if (sw) await page.mouse.click(sw.x, sw.y);
  expect(await page.evaluate(() => (window as unknown as Win).__ccx.plan())).toEqual(before);
  // Once the results card is open, a drag across the screen does not move the camera.
  await widget(page, 'results.retry', 60_000);
  await page.mouse.move(120, 300);
  await page.mouse.down();
  await page.mouse.move(260, 420, { steps: 6 });
  await page.mouse.up();
  expect(await page.evaluate(() => (window as unknown as Win).__ccx.cameraMode())).toBe('overview');
  // Edit closes the card and keeps the plan; then a drag pans the board.
  await tapWidget(page, 'results.retry');
  await expect.poll(() => phase(page)).toBe('planning');
  expect(await page.evaluate(() => (window as unknown as Win).__ccx.plan())).toEqual(before);
  await page.mouse.move(120, 300);
  await page.mouse.down();
  await page.mouse.move(260, 420, { steps: 6 });
  await page.mouse.up();
  expect(await page.evaluate(() => (window as unknown as Win).__ccx.cameraMode())).toBe('free');
});

test('the scrubber shows the whole run and the locomotive playhead can be dragged (FR-098)', async ({ page }) => {
  await page.goto('/?reset=1&level=1&speed=1&autoplay=1');
  await waitForScreen(page, 'level');
  const bar = await widget(page, 'scrubber');
  expect(bar.text).toMatch(/\d+ steps/);
  const y = bar.y + bar.h / 2;
  // Drag the playhead to the start: the run rewinds and pauses there.
  await page.mouse.move(bar.x + bar.w / 2, y);
  await page.mouse.down();
  await page.mouse.move(bar.x + 2, y, { steps: 5 });
  await page.mouse.up();
  expect(await page.evaluate(() => (window as unknown as Win).__ccx.progressStep())).toBeLessThan(0.5);
  expect(await phase(page)).toBe('running');
  // Drag to the end: the run is over.
  await page.mouse.move(bar.x + 2, y);
  await page.mouse.down();
  await page.mouse.move(bar.x + bar.w - 2, y, { steps: 5 });
  await page.mouse.up();
  await expect.poll(() => phase(page)).toBe('delivered');
});

// SC-013: the interface moves on its own (FR-066, FR-067) and holds still with reduced motion.
async function interfaceFrames(page: Page): Promise<{ map: [Buffer, Buffer]; level: [Buffer, Buffer] }> {
  const vp = page.viewportSize() as { width: number; height: number };
  const top = { x: 0, y: 0, width: vp.width, height: 120 };
  const bottom = { x: 0, y: vp.height - 150, width: vp.width, height: 150 };
  // Pinned render quality: adaptive quality would change the whole picture on slow machines.
  await page.goto('/?reset=1&quality=2');
  await waitForScreen(page, 'map');
  await widget(page, 'map.mute');
  await page.waitForTimeout(1200);
  const m1 = await page.screenshot({ clip: top });
  await page.waitForTimeout(600);
  const m2 = await page.screenshot({ clip: top });
  await page.goto('/?level=1&quality=2');
  await waitForScreen(page, 'level');
  await widget(page, 'go');
  await page.waitForTimeout(1200);
  const l1 = await page.screenshot({ clip: bottom });
  await page.waitForTimeout(600);
  const l2 = await page.screenshot({ clip: bottom });
  return { map: [m1, m2], level: [l1, l2] };
}

test.describe('whimsical motion', () => {
  test.use({ contextOptions: { reducedMotion: 'no-preference' } });

  test('the interface moves on its own on the map and in a level (SC-013)', async ({ page }) => {
    const { map, level } = await interfaceFrames(page);
    expect(map[0].equals(map[1]), 'map interface moved').toBe(false);
    expect(level[0].equals(level[1]), 'level interface moved').toBe(false);
  });
});

test('the interface holds still with reduced motion (SC-013)', async ({ page }) => {
  const { map, level } = await interfaceFrames(page);
  expect(map[0].equals(map[1]), 'map interface still').toBe(true);
  expect(level[0].equals(level[1]), 'level interface still').toBe(true);
});
