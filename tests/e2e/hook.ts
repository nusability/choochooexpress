// Helpers for driving the game through its 3D interface via the test hook (contracts/engine-api.md).
import { expect, type Page } from '@playwright/test';

export interface Widget {
  id: string;
  label: string;
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
  enabled: boolean;
  button: boolean;
  layer: 'hud' | 'cards' | 'top';
}

export interface Plan {
  switches: number[];
  pads: number[];
}

export interface Hook {
  screen(): string;
  phase(): 'planning' | 'running' | 'delivered' | 'failed' | null;
  switchScreenPositions(): { id: number; x: number; y: number }[];
  tileScreenPosition(tile: number): { x: number; y: number } | null;
  plan(): Plan | null;
  solution(): Plan | null;
  progressStep(): number | null;
  switchArrowAngle(id: number): number | null;
  viewCoverage(): { boardLeft: number; boardRight: number; groundCovers: boolean } | null;
  levelMarkerScreenPosition(level: number): { x: number; y: number } | null;
  result(): { stars: number; score: number; passed: boolean; steps: number; par: number; outcome: string } | null;
  cameraMode(): string | null;
  unlocked(level: number): boolean;
  widgets(): Widget[];
}

/** Sets switches and pads to `target` by tapping them on screen, like a player. */
export async function applyPlan(page: Page, target: Plan): Promise<void> {
  const hook = () => (window as unknown as Win).__ccx;
  void hook;
  for (let id = 0; id < target.switches.length; id++) {
    const plan = await page.evaluate(() => (window as unknown as Win).__ccx.plan());
    if (plan?.switches[id] === target.switches[id]) continue;
    const pos = (await page.evaluate(() => (window as unknown as Win).__ccx.switchScreenPositions())).find((p) => p.id === id);
    expect(pos, `switch ${id} on screen`).toBeDefined();
    await page.touchscreen.tap(pos!.x, pos!.y);
    await expect.poll(async () => (await page.evaluate(() => (window as unknown as Win).__ccx.plan()))?.switches[id]).toBe(target.switches[id]);
  }
  for (const tile of target.pads) {
    const p = await page.evaluate((t) => (window as unknown as Win).__ccx.tileScreenPosition(t), tile);
    expect(p, `tile ${tile} on screen`).not.toBeNull();
    await page.touchscreen.tap(p!.x, p!.y);
    await expect.poll(async () => (await page.evaluate(() => (window as unknown as Win).__ccx.plan()))?.pads.includes(tile)).toBe(true);
  }
}

export type Win = { __ccx: Hook };

export const widgets = (page: Page) => page.evaluate(() => (window as unknown as Win).__ccx.widgets());
export const phase = (page: Page) => page.evaluate(() => (window as unknown as Win).__ccx.phase());

export async function waitForScreen(page: Page, screen: string): Promise<void> {
  await expect.poll(() => page.evaluate(() => (window as unknown as Win).__ccx.screen()), { timeout: 60_000 }).toBe(screen);
}

/** Waits for a widget (by id) and returns it. */
export async function widget(page: Page, id: string, timeout = 30_000): Promise<Widget> {
  await expect.poll(async () => (await widgets(page)).some((w) => w.id === id), { timeout }).toBe(true);
  return (await widgets(page)).find((w) => w.id === id) as Widget;
}

/** Taps the center of a 3D button, like a finger would. */
export async function tapWidget(page: Page, id: string): Promise<void> {
  const w = await widget(page, id);
  await page.touchscreen.tap(w.x + w.w / 2, w.y + w.h / 2);
}

export async function waitForText(page: Page, text: string, timeout = 30_000): Promise<void> {
  await expect.poll(async () => (await widgets(page)).some((w) => w.text.includes(text)), { timeout }).toBe(true);
}
