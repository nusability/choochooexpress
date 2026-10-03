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

export interface Hook {
  screen(): string;
  phase(): string | null;
  switchScreenPositions(): { id: number; x: number; y: number }[];
  switchLane(id: number): number | null;
  switchArrowAngle(id: number): number | null;
  viewCoverage(): { boardLeft: number; boardRight: number; groundCovers: boolean } | null;
  standardPlan(): { switch: number; lane: number }[];
  levelMarkerScreenPosition(level: number): { x: number; y: number } | null;
  result(): { stars: number; score: number; passed: boolean; ratio: number; chutes: { got: number; wanted: number }[] } | null;
  physicsReady(): boolean;
  cameraMode(): string | null;
  unlocked(level: number): boolean;
  widgets(): Widget[];
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
