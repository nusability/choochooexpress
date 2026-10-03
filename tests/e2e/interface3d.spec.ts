import { expect, test, type Page } from '@playwright/test';
import { phase, tapWidget, waitForScreen, widget, widgets, type Win } from './hook';

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

test('buttons act on release, and an open card keeps touches from the board (FR-063, FR-064)', async ({ page }) => {
  await page.goto('/?reset=1&level=1');
  await waitForScreen(page, 'level');
  await expect.poll(() => page.evaluate(() => (window as unknown as Win).__ccx.physicsReady()), { timeout: 60_000 }).toBe(true);
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
  // A real press starts the train.
  await page.mouse.click(cx, cy);
  await expect.poll(() => phase(page)).toBe('running');
  // With the pause card open, a drag across the screen does not move the camera.
  await tapWidget(page, 'pause');
  await widget(page, 'pause.resume');
  await page.mouse.move(120, 300);
  await page.mouse.down();
  await page.mouse.move(260, 420, { steps: 6 });
  await page.mouse.up();
  expect(await page.evaluate(() => (window as unknown as Win).__ccx.cameraMode())).toBe('overview');
  expect(await phase(page)).toBe('paused');
  await tapWidget(page, 'pause.resume');
  await expect.poll(() => phase(page)).toBe('running');
  // Without a card, the same drag pans the board.
  await page.mouse.move(120, 300);
  await page.mouse.down();
  await page.mouse.move(260, 420, { steps: 6 });
  await page.mouse.up();
  expect(await page.evaluate(() => (window as unknown as Win).__ccx.cameraMode())).toBe('free');
});
