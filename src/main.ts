import './ui/styles.css';
import { ProgressStore } from './app/progressStore';
import { YardSession } from './app/YardSession';
import type { AppContext, AppParams, GameScreen } from './app/screen';
import { Sfx } from './audio/sfx';
import { isLevel } from './engine/campaign';
import { SAVE_KEY } from './engine/progress';
import { DT } from './engine/flow';
import { GameRenderer } from './graphics/renderer';
import { loadHoliday, loadedHoliday, setHoliday } from './graphics/holiday';
import { HOLIDAY_IDS, holidayForLevel, holidaysOn, type HolidayDay, type HolidayId } from './engine/holidays';
import { createStorage } from './platform/storage';
import { MetaMap } from './ui/MetaMap';
import { UiInput } from './ui/kit/uiInput';
import { UiLayer } from './ui/kit/uiLayer';

/**
 * `?reset=true` (or `?reset=1`) wipes the saved progress, then reloads the same address without
 * the parameter, so a bookmark or a reload never wipes it again.
 */
function resetIfAsked(): boolean {
  const url = new URL(window.location.href);
  const value = url.searchParams.get('reset');
  if (value === null || !['1', 'true', 'yes', ''].includes(value.toLowerCase())) return false;
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    // Storage unavailable: nothing was saved anyway.
  }
  url.searchParams.delete('reset');
  window.location.replace(url.toString());
  return true;
}

function readParams(): AppParams {
  const q = new URLSearchParams(window.location.search);
  const speed = Math.round(Number(q.get('speed') ?? '1'));
  const level = Number(q.get('level'));
  const quality = q.get('quality') === null ? NaN : Number(q.get('quality'));
  const holiday = q.get('holiday');
  const day = Number(q.get('day') ?? '0');
  const date = /^(\d{4})-(\d{2})-(\d{2})$/.exec(q.get('date') ?? '');
  return {
    speed: Number.isFinite(speed) ? Math.min(8, Math.max(1, speed)) : 1,
    autoplay: q.get('autoplay') === '1',
    level: isLevel(level) ? level : null,
    debug: q.get('debug') === '1',
    quality: Number.isInteger(quality) && quality >= 0 && quality <= 4 ? quality : null,
    holiday: holiday === 'none' || HOLIDAY_IDS.includes(holiday as HolidayId) ? (holiday as HolidayId | 'none') : null,
    holidayDay: Number.isInteger(day) && day >= 0 ? day : 0,
    date: date ? [Number(date[1]), Number(date[2]), Number(date[3])] : null,
  };
}

const MAX_TICKS_PER_FRAME = 4;

class App implements AppContext {
  readonly params = readParams();
  readonly ui: UiLayer;
  readonly progress: ProgressStore;
  readonly sound: Sfx;
  private screen: GameScreen | null = null;
  private last = 0;
  private acc = 0;
  private debugEl: HTMLElement | null = null;
  private fpsAccum = 0;
  private fpsFrames = 0;
  /** Today's holidays (F-015): levels take turns when several overlap. */
  readonly holidays: HolidayDay[];

  constructor(readonly gfx: GameRenderer) {
    if (this.params.quality !== null) this.gfx.pinQualityLevel(this.params.quality);
    this.holidays = todaysHolidays(this.params);
    // The whole interface is 3D, drawn over each frame's scene (spec F-008).
    this.ui = new UiLayer();
    this.ui.resize(this.gfx.width, this.gfx.height);
    this.gfx.overlay = (renderer) => this.ui.render(renderer);
    new UiInput(this.ui, this.gfx.canvas);
    const storage = createStorage();
    this.progress = new ProgressStore(storage);
    this.sound = new Sfx(this.progress.muted);
    this.ui.onButton = () => this.sound.play('tap');
    window.addEventListener('resize', () => this.onResize());
    window.visualViewport?.addEventListener('resize', () => this.onResize());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.screen?.hidden();
    });
    window.addEventListener('pagehide', () => this.screen?.hidden());
    // Unlock audio on the very first gesture anywhere (HUD buttons included).
    const unlock = () => this.sound.unlock();
    window.addEventListener('pointerdown', unlock, { capture: true });
    if (this.params.debug) {
      this.debugEl = document.createElement('div');
      this.debugEl.className = 'debug';
      document.body.append(this.debugEl);
    }
    requestAnimationFrame((t) => this.loop(t));
  }

  get current(): GameScreen | null {
    return this.screen;
  }

  openMap(focusLevel?: number): void {
    setHoliday(null);
    this.show(new MetaMap(this, focusLevel ?? this.progress.furthestUnlocked()));
  }

  openLevel(level: number): void {
    if (!this.progress.unlocked(level)) {
      this.openMap(level);
      return;
    }
    const h = holidayForLevel(this.holidays, level);
    setHoliday(loadedHoliday(h), h?.day, h?.length);
    this.show(new YardSession(this, level));
  }

  private show(next: GameScreen): void {
    this.screen?.dispose();
    this.screen = next;
    this.acc = 0;
    next.resize(this.gfx.width, this.gfx.height);
    this.gfx.resetFrameTracking();
  }

  private onResize(): void {
    if (!this.gfx.resize()) return;
    this.ui.resize(this.gfx.width, this.gfx.height);
    this.screen?.resize(this.gfx.width, this.gfx.height);
  }

  private loop(now: number): void {
    requestAnimationFrame((t) => this.loop(t));
    const frameMs = this.last ? now - this.last : 16.7;
    this.last = now;
    const dt = Math.min(frameMs / 1000, 0.25);
    this.gfx.trackFrame(now, frameMs);
    const screen = this.screen;
    if (!screen) return;
    this.acc += dt * this.params.speed;
    let ticks = 0;
    const maxTicks = MAX_TICKS_PER_FRAME * this.params.speed;
    while (this.acc >= DT && ticks < maxTicks) {
      screen.tick();
      this.acc -= DT;
      ticks++;
    }
    if (ticks >= maxTicks) this.acc = Math.min(this.acc, DT);
    this.ui.update(dt);
    screen.frame(dt, this.acc / DT);
    if (this.debugEl) this.updateDebug(frameMs);
  }

  private updateDebug(frameMs: number): void {
    this.fpsAccum += frameMs;
    this.fpsFrames++;
    if (this.fpsAccum < 500 || !this.debugEl) return;
    const info = this.gfx.renderer.info;
    const fps = (1000 * this.fpsFrames) / this.fpsAccum;
    const level = this.screen instanceof YardSession ? this.screen.debugStats() : '';
    this.debugEl.textContent = `${fps.toFixed(0)} fps · ${info.render.calls} calls · ${(info.render.triangles / 1000).toFixed(0)}k tris · q${this.gfx.level}${level}`;
    this.fpsAccum = 0;
    this.fpsFrames = 0;
  }
}

declare global {
  interface Window {
    __ccx: unknown;
  }
}

/** The holidays of the device's local date, or the one asked for in the address (F-015). */
function todaysHolidays(params: AppParams): HolidayDay[] {
  if (params.holiday === 'none') return [];
  if (params.holiday) return [{ id: params.holiday, day: params.holidayDay, length: Math.max(8, params.holidayDay + 1) }];
  const now = new Date();
  const [y, m, d] = params.date ?? [now.getFullYear(), now.getMonth() + 1, now.getDate()];
  return holidaysOn(y, m, d);
}

async function boot(): Promise<void> {
  const root = document.getElementById('app');
  if (!root) throw new Error('#app missing');
  let gfx: GameRenderer;
  try {
    gfx = new GameRenderer(root);
  } catch (err) {
    // The one plain-page message the game has (NFR-015): without WebGL there is no 3D interface.
    const note = document.createElement('p');
    note.className = 'no-webgl';
    note.textContent = 'Choo Choo Express Delivery 3D needs 3D graphics (WebGL), which this browser has turned off or does not support.';
    document.body.append(note);
    throw err;
  }
  const app = new App(gfx);
  // Today's holiday skins load before the first level opens; without them the game still runs.
  await Promise.all(app.holidays.map((h) => loadHoliday(h.id).catch(() => null)));
  const start = app.params.level;
  if (start && app.progress.unlocked(start)) app.openLevel(start);
  else app.openMap(start ?? undefined);
  // Read-only test hook for the Playwright smoke test (contracts/engine-api.md §Test hook).
  window.__ccx = {
    screen: () => (app.current ? app.current.kind : 'boot'),
    phase: () => (app.current instanceof YardSession ? app.current.phase() : null),
    level: () => (app.current instanceof YardSession ? app.current.levelNumber : null),
    switchScreenPositions: () => (app.current instanceof YardSession ? app.current.switchScreenPositions() : []),
    tileScreenPosition: (tile: number) => (app.current instanceof YardSession ? app.current.tileScreenPosition(tile) : null),
    plan: () => (app.current instanceof YardSession ? app.current.planState() : null),
    solution: () => (app.current instanceof YardSession ? app.current.solution() : null),
    progressStep: () => (app.current instanceof YardSession ? app.current.progressStep() : null),
    switchArrowAngle: (id: number) => (app.current instanceof YardSession ? app.current.switchArrowAngle(id) : null),
    viewCoverage: () => (app.current instanceof YardSession ? app.current.viewCoverage() : null),
    levelMarkerScreenPosition: (level: number) => (app.current instanceof MetaMap ? app.current.levelMarkerScreenPosition(level) : null),
    result: () => (app.current instanceof YardSession ? app.current.result() : null),
    cameraMode: () => (app.current instanceof YardSession ? app.current.cameraMode() : null),
    unlocked: (level: number) => app.progress.unlocked(level),
    widgets: () => app.ui.widgets(),
  };
}

if (!resetIfAsked()) void boot();
