// Holiday skins (spec F-015, research R43): on a holiday every level is dressed for it — the same
// puzzle with the holiday's cargo models, scenes, trimmings on the diorama, the station and the
// engine, its light and a few things drifting through the air. Each holiday lives in its own module
// under ./holidays/ and is loaded only when it is on (or asked for with `?holiday=<id>`).
import type * as THREE from 'three';
import type { HolidayDay, HolidayId } from '../engine/holidays';
import type { Hue } from '../engine/toys';
import type { GeoBatch } from './batch';
import type { BiomeTheme } from './biomes';
import type { Kit } from './toyModels';

/** [kind, dx, dz, yaw ('face' turns +x toward the scene's middle), scale, dy, variant]. */
export type Item = [string, number, number, (number | 'face')?, number?, number?, number?];

/** A little scene (FR-117): items around a middle point. */
export interface Scene {
  name: string;
  /** Inside: footprint in tiles (2 × 2 or 2 × 1). Outside: radius in world units (h = 0). */
  w: number;
  h: number;
  items: Item[];
}

export const ring = (n: number, r: number, kind: string, scale: number, phase = 0, face = true): Item[] =>
  Array.from({ length: n }, (_, i) => {
    const a = phase + (i / n) * Math.PI * 2;
    return [kind, Math.cos(a) * r, Math.sin(a) * r, face ? 'face' : a, scale] as Item;
  });

export const row = (n: number, gap: number, kind: string, scale: number, yaw = 0, dz = 0): Item[] =>
  Array.from({ length: n }, (_, i) => [kind, (i - (n - 1) / 2) * gap, dz, yaw, scale] as Item);

/** What a holiday prop builder gets (the same helpers the built-in props use, see props.ts). */
export interface PropContext {
  /** Lit, shadow-casting geometry (vertex colors). */
  b: GeoBatch;
  /** Unlit, always-bright geometry: flames, lamps, fairy lights. */
  glow: GeoBatch;
  /** Prop-local placement: (x, y, z) in prop units (scaled by the item's scale), extra yaw, extra scale. */
  m(x: number, y: number, z: number, yaw?: number, scale?: number): THREE.Matrix4;
  /** Prop-local placement with a full rotation and a per-axis scale. */
  mr(x: number, y: number, z: number, rx: number, ry: number, rz: number, sx?: number, sy?: number, sz?: number): THREE.Matrix4;
  palette: string[];
  variant: number;
  /** Which day of the holiday it is (0-based) and how many days it lasts. */
  day: number;
  length: number;
}

/** A spot on the diorama's rim (top edge of the play mat), facing outward along +x after `yaw`. */
export interface EdgeSpot {
  x: number;
  z: number;
  /** Turns local +x to point out of the yard. */
  yaw: number;
  corner: boolean;
  index: number;
}

/** The station hall's local frame: x along the hall, y up, +z toward the track and the camera. */
export interface StationFrame {
  m(x: number, y: number, z: number, rx?: number, ry?: number, rz?: number): THREE.Matrix4;
  /** Hall width along x (centered on 0). */
  width: number;
  /** Eaves height (the roof starts here) and the front wall's z. */
  roofY: number;
  frontZ: number;
  /** The platform awning: its height and z. */
  awningY: number;
  awningZ: number;
}

export type FxKind = 'snow' | 'confetti' | 'petals' | 'leaves' | 'sparkles' | 'lanterns' | 'bubbles';

export interface HolidaySkin {
  id: HolidayId;
  /** Shown in level titles, e.g. "Christmas · 1-3" (keep it short; ASCII and ×−…’·–— only). */
  name: string;
  /** Hops in once when a level opens, e.g. "Merry Christmas!". */
  greeting: string;
  /**
   * Cargo models by hue. A toy whose hue (engine/toys.ts TOY_HUE) has a model here is drawn as
   * that model, painted with the toy's identity color `c`; other hues keep their usual toy. Same
   * size and conventions as toyModels.ts: about 0.05 units across, centered, facing +x.
   */
  cargo: Partial<Record<Hue, (k: Kit, c: string) => void>>;
  /** Prop kinds the scenes use (name them `<holiday>.<thing>` to avoid clashes). */
  props?: Record<string, (ctx: PropContext) => void>;
  /** Scenes between the tracks (2 × 2 and 2 × 1); they come before the biome's own scenes. */
  inside: Scene[];
  /** Room-sized scenes beside the diorama (h = 0); they come before the biome's own. */
  outside: Scene[];
  /** Trimming at spots around the diorama's rim, e.g. a garland, lanterns, candles. */
  edge?(b: GeoBatch, glow: GeoBatch, spot: EdgeSpot, ctx: { day: number; length: number }): void;
  /** Dressing on the Toy Station hall (`glow`: unlit, always-bright parts such as lamps). */
  station?(b: GeoBatch, f: StationFrame, glow: GeoBatch): void;
  /** Something on the engine (engine-local: +x forward, chimney top near (0.21, 0.40, 0), cab roof near (-0.17, 0.42, 0)). */
  engine?(b: GeoBatch): void;
  /** Light and sky changes. */
  light?: Partial<Pick<BiomeTheme, 'background' | 'hemiSky' | 'hemiGround' | 'hemiIntensity' | 'sunColor' | 'sunIntensity'>>;
  /** Things drifting through the air over the board. */
  fx?: { kind: FxKind; colors: string[]; count?: number };
}

let active: { skin: HolidaySkin; day: number; length: number } | null = null;

/** The holiday the next screen is dressed for (set by the app before it builds a level). */
export function setHoliday(skin: HolidaySkin | null, day = 0, length = 1): void {
  active = skin ? { skin, day, length } : null;
}

export function activeHoliday(): { skin: HolidaySkin; day: number; length: number } | null {
  return active;
}

/** The theme with the holiday's light. */
export function holidayTheme(theme: BiomeTheme): BiomeTheme {
  return active?.skin.light ? { ...theme, ...active.skin.light } : theme;
}

const modules = import.meta.glob<{ default: HolidaySkin }>('./holidays/*.ts');
const loaded = new Map<HolidayId, HolidaySkin>();

/** Loads a holiday's module (null if it has none yet). */
export async function loadHoliday(id: HolidayId): Promise<HolidaySkin | null> {
  const have = loaded.get(id);
  if (have) return have;
  const load = modules[`./holidays/${id}.ts`];
  if (!load) return null;
  const skin = (await load()).default;
  loaded.set(id, skin);
  return skin;
}

/** A loaded skin (after `loadHoliday`). */
export function loadedHoliday(h: HolidayDay | null): HolidaySkin | null {
  return h ? (loaded.get(h.id) ?? null) : null;
}
