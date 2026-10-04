// Kwanzaa (26 December – 1 January, seven days): a family table with the kinara, its seven candles
// lit one more each evening (the black one first, then red and green alternating outward), set on
// a woven mkeka mat with a basket of harvest fruit (mazao), ears of corn (muhindi), the unity cup
// and handmade gifts. Drummers play djembes on kente cloth, red-black-green bendera flags and
// bunting trim the rim, the station and the engine. Corn, candles, cups, drums, kente rolls,
// books, gifts, gourds and baskets ride the wagons.
import * as THREE from 'three';
import type { HolidaySkin, PropContext } from '../holiday';
import { activeHoliday, ring, row } from '../holiday';
import { M, WHITE, paintFaces, shadeHex, type Kit } from '../toyModels';

const RED = '#e0282e';
const BLACK = '#26262b';
const GREEN = '#1f9a4a';
const GOLD = '#f2c23a';
const WOOD = '#8a5a2e';
const WOOD_DARK = '#5e3a1c';
const STRAW = '#e2b968';
const SKIN = '#f3dfb4';
const FLAME = '#ffd23f';
const FLAME_HOT = '#ff8a1e';
const FLAG = [RED, BLACK, GREEN];
/** Kinara candles left to right, and the order they are lit in. */
const CANDLES = [RED, RED, RED, BLACK, GREEN, GREEN, GREEN];
const ORDER = [3, 2, 4, 1, 5, 0, 6];
const KENTE = [GOLD, GREEN, GOLD, RED, BLACK, RED];

const pick = <T>(a: readonly T[], i: number): T => a[((i % a.length) + a.length) % a.length] as T;
const litSet = (day: number) => new Set(ORDER.slice(0, Math.max(1, Math.min(7, day + 1))));
/** Kente: bands across x, thinner gold/black threads across z. */
const kente = (u: number, v: number, base = GOLD): string => {
  const band = Math.floor(u);
  if (band % 2 === 0) return Math.floor(v) % 3 === 0 ? BLACK : base;
  return pick(KENTE, band >> 1);
};

// ------------------------------------------------------------------------------------- cargo

function paint(k: Kit, g: THREE.BufferGeometry, m: THREE.Matrix4, f: (x: number, y: number, z: number) => string): void {
  g.applyMatrix4(m);
  k.parts.push(paintFaces(g, f));
}

/** An ear of corn with its husk peeled back. */
function corn(k: Kit, c: string): void {
  const dark = shadeHex(c, -30);
  paint(k, new THREE.SphereGeometry(0.011, 10, 12), M(0.004, 0, 0, 0, 0, 0.2, 2.2, 1, 1), (x, y, z) => ((Math.floor(x * 260) + Math.floor((Math.atan2(z, y) + 4) * 1.6)) % 2 ? c : dark));
  for (const [ry, rz] of [[0.6, 0.15], [-0.6, 0.15], [0, -0.25]] as const) k.add(new THREE.SphereGeometry(0.008, 6, 4), '#9fbf5a', M(-0.02, -0.004, 0, 0, ry, rz, 2.2, 0.35, 0.9));
}

/** A candle (mshumaa) on a gold saucer, burning. */
function candle(k: Kit, c: string): void {
  k.cyl(0.02, 0.018, 0.004, GOLD, 0, -0.023, 0, 0, 0, 0, 12);
  k.cyl(0.011, 0.011, 0.034, c, 0, -0.004, 0, 0, 0, 0, 10);
  k.sph(0.004, shadeHex(c, 25), 0.009, 0.008, 0.005, 1, 1.6, 1, 5);
  k.sph(0.006, FLAME_HOT, 0, 0.019, 0, 1, 1.4, 1, 7);
  k.sph(0.0045, FLAME, 0, 0.026, 0, 0.8, 1.8, 0.8, 7);
}

/** The unity cup (kikombe cha umoja): a goblet with a gold rim. */
function unityCup(k: Kit, c: string): void {
  const p = [[0.001, -0.025], [0.016, -0.025], [0.016, -0.021], [0.004, -0.017], [0.004, -0.004], [0.012, 0.001], [0.018, 0.012], [0.019, 0.024], [0.016, 0.024], [0.001, 0.012]] as const;
  k.add(new THREE.LatheGeometry(p.map(([x, y]) => new THREE.Vector2(x, y)), 14), c);
  k.tor(0.0185, 0.0018, GOLD, 0, 0.023, 0, Math.PI / 2, 0, 0, 16);
  k.tor(0.0165, 0.0016, GOLD, 0, 0.012, 0, Math.PI / 2, 0, 0, 16);
  k.sph(0.004, GOLD, 0, -0.01, 0, 1, 1, 1, 6);
}

/** A basket of harvest fruit (mazao). */
function fruitBasket(k: Kit, c: string): void {
  const dark = shadeHex(c, -35);
  paint(k, new THREE.CylinderGeometry(0.024, 0.017, 0.02, 12, 3), M(0, -0.014, 0), (_x, y, z) => (Math.floor(y * 220 + z * 60) % 2 ? c : dark));
  k.tor(0.024, 0.003, dark, 0, -0.004, 0, Math.PI / 2, 0, 0, 14);
  k.sph(0.009, RED, -0.009, 0.003, 0.006, 1, 1, 1, 8);
  k.sph(0.0085, '#ff9a1f', 0.009, 0.002, -0.006, 1, 1, 1, 8);
  k.sph(0.008, '#7cc35a', 0.007, 0.004, 0.01, 1, 1.2, 1, 8);
  k.tor(0.012, 0.004, '#ffd23f', -0.003, 0.004, -0.008, 0, 0.4, 0, 8, Math.PI * 0.9);
  for (const [x, y, z] of [[0.0, 0.012, 0.0], [0.004, 0.009, 0.004], [-0.004, 0.009, 0.003], [0, 0.008, -0.004]] as const) k.sph(0.0045, '#7a3fa0', x, y, z, 1, 1, 1, 6);
}

/** A djembe: a goblet drum with a skin head, ropes and a striped band. */
function djembe(k: Kit, c: string): void {
  const p = [[0.001, -0.026], [0.011, -0.026], [0.009, -0.012], [0.008, -0.004], [0.016, 0.006], [0.019, 0.016], [0.019, 0.022], [0.001, 0.022]] as const;
  k.add(new THREE.LatheGeometry(p.map(([x, y]) => new THREE.Vector2(x, y)), 12), c);
  k.cyl(0.0195, 0.0195, 0.003, SKIN, 0, 0.0225, 0, 0, 0, 0, 14);
  k.tor(0.0195, 0.0018, WHITE, 0, 0.02, 0, Math.PI / 2, 0, 0, 14);
  for (let i = 0; i < 3; i++) k.tor(0.0135 - i * 0.001, 0.0022, FLAG[i] as string, 0, -0.001 - i * 0.004, 0, Math.PI / 2, 0, 0, 12);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    k.cyl(0.001, 0.001, 0.02, WHITE, Math.cos(a) * 0.017, 0.011, Math.sin(a) * 0.017, Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5, 3);
  }
}

/** A roll of kente cloth with a loose end draped forward. */
function kenteRoll(k: Kit, c: string): void {
  paint(k, new THREE.CylinderGeometry(0.014, 0.014, 0.05, 12, 1), M(0, 0.002, 0, Math.PI / 2, 0, 0), (_x, _y, z) => kente((z + 0.025) * 140, 0, c));
  paint(k, new THREE.BoxGeometry(0.026, 0.003, 0.05, 1, 1, 1), M(0.016, -0.013, 0, 0, 0, -0.25), (x, _y, z) => kente((z + 0.025) * 140, (x + 0.02) * 300, c));
  k.cyl(0.004, 0.004, 0.052, shadeHex(c, -40), 0, 0.002, 0, Math.PI / 2, 0, 0, 6);
}

/** A storybook with a gold title band and a ribbon bookmark. */
function book(k: Kit, c: string): void {
  k.box(0.044, 0.012, 0.034, c, 0, -0.008, 0);
  k.box(0.04, 0.009, 0.032, WHITE, 0.003, -0.008, 0);
  k.box(0.044, 0.012, 0.034, c, -0.001, 0.006, 0, 0, 0.12, 0);
  k.box(0.04, 0.009, 0.032, WHITE, 0.002, 0.006, 0, 0, 0.12, 0);
  for (let i = 0; i < 3; i++) k.box(0.004, 0.0125, 0.034, FLAG[i] as string, -0.014 + i * 0.006, 0.006, 0, 0, 0.12, 0);
  k.box(0.004, 0.002, 0.014, RED, 0.008, 0.0005, 0.02);
}

/** A wrapped gift (zawadi) tied with a red-black-green ribbon. */
function gift(k: Kit, c: string): void {
  k.box(0.04, 0.03, 0.04, c, 0, -0.008, 0);
  FLAG.forEach((col, i) => {
    k.box(0.041, 0.031, 0.005, col, 0, -0.008, (i - 1) * 0.005);
    k.box(0.005, 0.031, 0.041, col, (i - 1) * 0.005, -0.008, 0);
  });
  for (const s of [-1, 1]) k.sph(0.008, GOLD, s * 0.007, 0.012, 0, 1.2, 0.7, 0.6, 7);
  k.sph(0.004, shadeHex(GOLD, -30), 0, 0.012, 0, 1, 1, 1, 6);
}

/** A bottle gourd (calabash) with carved bands and a stem. */
function gourd(k: Kit, c: string): void {
  const light = shadeHex(c, 35);
  paint(k, new THREE.SphereGeometry(0.017, 12, 9), M(0, -0.01, 0), (_x, y) => (Math.abs(y) < 0.002 ? light : c));
  paint(k, new THREE.SphereGeometry(0.01, 10, 7), M(0, 0.013, 0), (_x, y) => (Math.abs(y) < 0.0015 ? light : c));
  k.cyl(0.0035, 0.004, 0.008, c, 0, 0.004, 0, 0, 0, 0, 8);
  k.cyl(0.0015, 0.002, 0.008, WOOD_DARK, 0.001, 0.025, 0, 0, 0, 0.3, 5);
  k.tor(0.0172, 0.0013, light, 0, -0.01, 0, Math.PI / 2, 0, 0, 14);
}

/** A woven lidded basket with red-black-green zigzag bands. */
function wovenBasket(k: Kit, c: string): void {
  paint(k, new THREE.CylinderGeometry(0.021, 0.016, 0.03, 14, 4), M(0, -0.01, 0), (x, y, z) => {
    const a = Math.atan2(z, x) * 7 / Math.PI;
    return Math.abs(y + 0.01 - (Math.abs((a % 2) - 1) * 0.008 - 0.004)) < 0.003 ? pick(FLAG, Math.floor(y * 200)) : c;
  });
  k.cyl(0.022, 0.022, 0.004, shadeHex(c, -20), 0, 0.007, 0, 0, 0, 0, 14);
  k.cone(0.02, 0.012, c, 0, 0.015, 0, 0, 0, 0, 14);
  k.sph(0.004, RED, 0, 0.022, 0, 1, 1, 1, 6);
}

// ------------------------------------------------------------------------------------- props

type Ctx = Pick<PropContext, 'b' | 'glow' | 'm' | 'day'>;

/** The same context moved and scaled, to set one prop on another. */
const sub = (ctx: Ctx, ox: number, oy: number, oz: number, s: number): Ctx => ({ ...ctx, m: (x, y, z, yaw = 0, sc = 1) => ctx.m(ox + x * s, oy + y * s, oz + z * s, yaw, sc * s) });

/** The kinara: seven candles on a carved wooden holder, about 0.75 wide at scale 1. */
function kinara({ b, glow, m, day }: Ctx): void {
  const lit = litSet(day);
  b.add(new THREE.BoxGeometry(0.78, 0.05, 0.16), WOOD_DARK, m(0, 0.025, 0));
  b.add(new THREE.BoxGeometry(0.72, 0.07, 0.11), WOOD, m(0, 0.085, 0));
  for (let i = 0; i < 6; i++) b.add(new THREE.BoxGeometry(0.02, 0.06, 0.114), WOOD_DARK, m(-0.25 + i * 0.1, 0.085, 0));
  CANDLES.forEach((col, i) => {
    const x = (i - 3) * 0.105;
    const h = 0.22 + (i === 3 ? 0.04 : 0);
    b.add(new THREE.CylinderGeometry(0.034, 0.028, 0.03, 10), GOLD, m(x, 0.135, 0));
    b.add(new THREE.CylinderGeometry(0.024, 0.024, h, 10), col, m(x, 0.15 + h / 2, 0));
    const top = 0.15 + h;
    if (lit.has(i)) {
      glow.add(new THREE.SphereGeometry(0.034, 8, 6).scale(1, 1.5, 1), FLAME_HOT, m(x, top + 0.04, 0));
      glow.add(new THREE.SphereGeometry(0.024, 8, 6).scale(1, 2.1, 1), FLAME, m(x, top + 0.08, 0));
    } else b.add(new THREE.CylinderGeometry(0.004, 0.004, 0.025, 4), BLACK, m(x, top + 0.012, 0));
  });
}

/** A woven mkeka mat, about 0.9 × 0.6 at scale 1. */
function mkeka({ b, m }: Ctx): void {
  const g = paintFaces(new THREE.BoxGeometry(0.9, 0.014, 0.6, 12, 1, 8), (x, _y, z) => {
    const i = Math.floor((x + 0.45) / 0.075);
    const j = Math.floor((z + 0.3) / 0.075);
    if (i === 0 || i === 11 || j === 0 || j === 7) return pick(FLAG, i + j);
    if (i === 1 || i === 10) return pick([GOLD, GREEN, RED], j);
    return (i + j) % 2 ? STRAW : '#c9963e';
  });
  b.add(g, '#ffffff', m(0, 0.007, 0));
}

/** A basket heaped with harvest fruit and vegetables (mazao). */
function mazao({ b, m }: Ctx): void {
  b.add(paintFaces(new THREE.CylinderGeometry(0.2, 0.14, 0.14, 12, 4), (_x, y) => (Math.floor(y * 30 + 10) % 2 ? STRAW : '#b98a4a')), '#ffffff', m(0, 0.07, 0));
  b.add(new THREE.TorusGeometry(0.2, 0.02, 4, 14).rotateX(Math.PI / 2), '#8a5a2e', m(0, 0.14, 0));
  const fruit: [number, number, number, number, string][] = [[-0.08, 0.18, 0.05, 0.07, RED], [0.08, 0.18, -0.06, 0.07, '#ff9a1f'], [0.07, 0.19, 0.09, 0.06, '#7cc35a'], [-0.06, 0.2, -0.09, 0.065, '#ff9a1f'], [0.0, 0.25, 0.0, 0.07, RED], [0.13, 0.17, 0.02, 0.05, '#f6c344']];
  for (const [x, y, z, r, c] of fruit) b.add(new THREE.SphereGeometry(r, 8, 6), c, m(x, y, z));
  b.add(new THREE.TorusGeometry(0.13, 0.03, 5, 10, Math.PI * 0.8).rotateX(-0.4), '#ffd23f', m(-0.02, 0.22, 0.04, 0.6));
  for (let i = 0; i < 6; i++) b.add(new THREE.SphereGeometry(0.03, 6, 4), '#7a3fa0', m(-0.13 + (i % 3) * 0.035, 0.2 + Math.floor(i / 3) * 0.035, -0.02 + (i % 2) * 0.03));
}

/** Two ears of corn (muhindi) lying crossed. */
function muhindi({ b, m, variant }: Ctx & { variant?: number }): void {
  [[0, 0.4], [0.06, -0.5]].forEach(([dz, yaw], i) => {
    const c = i === (variant ?? 0) % 2 ? '#ffc928' : '#f6a623';
    b.add(paintFaces(new THREE.SphereGeometry(0.045, 10, 10).scale(2.6, 1, 1), (x, y, z) => ((Math.floor(x * 70) + Math.floor((Math.atan2(z, y) + 4) * 1.6)) % 2 ? c : shadeHex(c, -30))), '#ffffff', m(0.02, 0.045, dz as number, yaw as number));
    for (const s of [-1, 0, 1]) b.add(new THREE.SphereGeometry(0.04, 6, 4).scale(2.4, 0.3, 0.8), '#9fbf5a', m(-0.17 * Math.cos(yaw as number), 0.04, (dz as number) + 0.17 * Math.sin(yaw as number) + s * 0.03, (yaw as number) + s * 0.6));
  });
}

/** The unity cup on its own, about 0.2 tall. */
function cup({ b, m }: Ctx): void {
  const p = [[0.001, 0], [0.07, 0], [0.07, 0.015], [0.02, 0.03], [0.018, 0.09], [0.05, 0.11], [0.075, 0.16], [0.08, 0.21], [0.07, 0.21], [0.001, 0.15]] as const;
  b.add(new THREE.LatheGeometry(p.map(([x, y]) => new THREE.Vector2(x, y)), 14), '#d9a03a', m(0, 0, 0));
  b.add(new THREE.TorusGeometry(0.078, 0.008, 4, 16).rotateX(Math.PI / 2), GOLD, m(0, 0.205, 0));
  b.add(new THREE.TorusGeometry(0.066, 0.008, 4, 16).rotateX(Math.PI / 2), RED, m(0, 0.16, 0));
}

/** A djembe about 0.45 tall at scale 1. */
function drum({ b, m, variant }: Ctx & { variant?: number }): void {
  const p = [[0.001, 0], [0.1, 0], [0.085, 0.12], [0.075, 0.2], [0.14, 0.3], [0.16, 0.4], [0.16, 0.44], [0.001, 0.44]] as const;
  b.add(new THREE.LatheGeometry(p.map(([x, y]) => new THREE.Vector2(x, y)), 14), pick([WOOD, '#a8693a', WOOD_DARK], variant ?? 0), m(0, 0, 0));
  b.add(new THREE.CylinderGeometry(0.165, 0.165, 0.02, 14), SKIN, m(0, 0.445, 0));
  for (let i = 0; i < 3; i++) b.add(new THREE.TorusGeometry(0.11 - i * 0.008, 0.016, 4, 14).rotateX(Math.PI / 2), FLAG[i] as string, m(0, 0.23 - i * 0.032, 0));
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    b.add(new THREE.CylinderGeometry(0.005, 0.005, 0.17, 3).rotateX(0.3), WHITE, m(Math.cos(a) * 0.14, 0.34, Math.sin(a) * 0.14, -a));
  }
}

/** Folded kente cloth in a stack. */
function kenteStack({ b, m, variant }: Ctx & { variant?: number }): void {
  for (let i = 0; i < 3; i++) {
    const base = pick([GOLD, GREEN, RED], (variant ?? 0) + i);
    b.add(paintFaces(new THREE.BoxGeometry(0.36, 0.05, 0.26, 12, 1, 4), (x, _y, z) => kente((x + 0.18) * 30, (z + 0.13) * 30, base)), '#ffffff', m(0, 0.025 + i * 0.05, 0, i * 0.15 - 0.15));
  }
}

/** Handmade gifts (zawadi): books, a wrapped box and a little clay pot. */
function zawadi({ b, m, variant }: Ctx & { variant?: number }): void {
  const v = variant ?? 0;
  for (let i = 0; i < 3; i++) {
    const c = pick(['#3f7fe0', RED, GREEN, '#9b4dd6'], v + i);
    b.add(new THREE.BoxGeometry(0.26, 0.05, 0.19), c, m(-0.12, 0.025 + i * 0.05, 0, i * 0.2));
    b.add(new THREE.BoxGeometry(0.24, 0.04, 0.2), WHITE, m(-0.11, 0.025 + i * 0.05, 0, i * 0.2));
  }
  const c = pick(['#9b4dd6', '#ff3d8b', '#22b5a6'], v);
  b.add(new THREE.BoxGeometry(0.17, 0.14, 0.17), c, m(0.16, 0.07, 0.04, 0.4));
  FLAG.forEach((col, i) => b.add(new THREE.BoxGeometry(0.175, 0.145, 0.025), col, m(0.16 + (i - 1) * 0.025 * Math.sin(0.4), 0.07, 0.04 + (i - 1) * 0.025 * Math.cos(0.4), 0.4)));
  for (const s of [-1, 1]) b.add(new THREE.TorusGeometry(0.03, 0.011, 4, 10), GOLD, m(0.16 + s * 0.025, 0.155, 0.04, 0.4 + s * 0.5));
  b.add(new THREE.SphereGeometry(0.07, 10, 7).scale(1, 0.85, 1), '#c4622d', m(0.02, 0.06, -0.18));
  b.add(new THREE.CylinderGeometry(0.035, 0.045, 0.05, 10), '#c4622d', m(0.02, 0.13, -0.18));
  b.add(new THREE.TorusGeometry(0.068, 0.008, 4, 14).rotateX(Math.PI / 2), WHITE, m(0.02, 0.07, -0.18));
}

/** The bendera: a red, black and green flag on a pole, about 1.0 tall at scale 1. */
function bendera({ b, m }: Ctx): void {
  b.add(new THREE.CylinderGeometry(0.07, 0.09, 0.05, 10), WOOD_DARK, m(0, 0.025, 0));
  b.add(new THREE.CylinderGeometry(0.014, 0.016, 1.0, 6), '#e9e9ef', m(0, 0.52, 0));
  b.add(new THREE.SphereGeometry(0.03, 8, 6), GOLD, m(0, 1.03, 0));
  FLAG.forEach((col, i) => b.add(new THREE.BoxGeometry(0.42, 0.08, 0.012), col, m(0.225, 0.93 - i * 0.08, 0)));
}

/** A low family table with a kente runner, the kinara, the mkeka, the harvest and the unity cup. */
function table(ctx: PropContext): void {
  const { b, m } = ctx;
  b.add(new THREE.BoxGeometry(1.1, 0.05, 0.6), WOOD, m(0, 0.24, 0));
  for (const [x, z] of [[-0.48, -0.24], [0.48, -0.24], [-0.48, 0.24], [0.48, 0.24]] as const) b.add(new THREE.CylinderGeometry(0.03, 0.025, 0.22, 6), WOOD_DARK, m(x, 0.11, z));
  b.add(paintFaces(new THREE.BoxGeometry(0.3, 0.012, 0.66, 1, 1, 14), (_x, _y, z) => kente((z + 0.33) * 30, 0, GOLD)), '#ffffff', m(0, 0.27, 0));
  mkeka(sub(ctx, 0, 0.265, 0, 1.1));
  kinara(sub(ctx, 0, 0.28, -0.08, 0.9));
  mazao(sub(ctx, -0.38, 0.28, 0.08, 0.6));
  muhindi(sub(ctx, 0.36, 0.28, 0.1, 0.8));
  cup(sub(ctx, 0.08, 0.28, 0.17, 0.75));
}

// ------------------------------------------------------------------------------------- the skin

/** A tiny kinara for the station wall, lit for today. */
function miniKinara(b: PropContext['b'], glow: PropContext['glow'], at: (x: number, y: number) => THREE.Matrix4, day: number): void {
  const lit = litSet(day);
  b.add(new THREE.BoxGeometry(0.26, 0.03, 0.05), WOOD, at(0, 0));
  b.add(new THREE.BoxGeometry(0.04, 0.06, 0.04), WOOD_DARK, at(0, -0.04));
  CANDLES.forEach((col, i) => {
    const x = (i - 3) * 0.036;
    b.add(new THREE.CylinderGeometry(0.009, 0.009, 0.07, 6), col, at(x, 0.05));
    if (lit.has(i)) glow.add(new THREE.SphereGeometry(0.009, 6, 4).scale(1, 1.8, 1), FLAME, at(x, 0.1));
  });
}

/** A swag of triangular pennants between two points (local z), drawn in a frame `at`. */
function bunting(b: PropContext['b'], at: (x: number, y: number, z: number) => THREE.Matrix4, z0: number, z1: number, y: number, sag: number, size: number, phase: number): void {
  const n = Math.max(2, Math.round((z1 - z0) / (size * 1.25)));
  const pennant = new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(-size / 2, 0), new THREE.Vector2(size / 2, 0), new THREE.Vector2(0, -size * 1.2)])).rotateY(Math.PI / 2);
  pennant.computeVertexNormals();
  const cord = new THREE.CylinderGeometry(size * 0.04, size * 0.04, (z1 - z0) / n, 3).rotateX(Math.PI / 2);
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const yy = y - sag * 4 * t * (1 - t);
    b.add(pennant, pick(FLAG, i + phase), at(0, yy, z0 + (z1 - z0) * t));
    b.add(pennant.clone().rotateY(Math.PI), pick(FLAG, i + phase), at(0, yy, z0 + (z1 - z0) * t));
    b.add(cord, WHITE, at(0, yy + size * 0.02, z0 + (z1 - z0) * t));
  }
}

const skin: HolidaySkin = {
  id: 'kwanzaa',
  name: 'Kwanzaa',
  greeting: 'Happy Kwanzaa!',
  cargo: { yellow: corn, red: candle, pink: unityCup, orange: fruitBasket, brown: djembe, teal: kenteRoll, blue: book, purple: gift, green: gourd, white: wovenBasket },
  props: {
    'kwanzaa.kinara': kinara,
    'kwanzaa.mkeka': mkeka,
    'kwanzaa.mazao': mazao,
    'kwanzaa.corn': muhindi,
    'kwanzaa.cup': cup,
    'kwanzaa.drum': drum,
    'kwanzaa.kente': kenteStack,
    'kwanzaa.gifts': zawadi,
    'kwanzaa.flag': bendera,
    'kwanzaa.table': table,
  },
  inside: [
    { name: 'kinara', w: 2, h: 2, items: [['kwanzaa.mkeka', 0, 0, 0, 1.6], ['kwanzaa.kinara', 0, -0.1, 0, 1.25, 0.022], ['kwanzaa.mazao', -0.45, 0.25, 0, 0.75, 0.022], ['kwanzaa.corn', 0.4, 0.25, 0.3, 0.9, 0.022], ['kwanzaa.cup', 0.05, 0.3, 0, 0.9, 0.022], ['kwanzaa.gifts', 0.7, -0.6, 2.4, 0.8]] },
    { name: 'drums', w: 2, h: 1, items: [['kwanzaa.drum', -0.55, 0, 0, 0.9, 0, 0], ['kwanzaa.drum', 0.05, 0.1, 0, 0.75, 0, 1], ['kwanzaa.kente', 0.62, -0.05, 0.4, 1.1]] },
    { name: 'gifts', w: 2, h: 1, items: [['kwanzaa.gifts', -0.35, 0, 0.3, 1.1], ['toy:gift', 0.3, 0.1, 'face', 0.6], ['kwanzaa.flag', 0.72, -0.1, 0, 0.8]] },
    { name: 'harvest', w: 2, h: 2, items: [['kwanzaa.mazao', -0.2, -0.15, 0, 1.3], ['kwanzaa.corn', 0.45, 0.4, 0.8, 1.2], ['kwanzaa.corn', 0.5, -0.4, 2.2, 1.1, 0, 1], ['kwanzaa.flag', -0.65, 0.5, 0, 1], ['kwanzaa.cup', 0.1, 0.55, 0, 1]] },
  ],
  outside: [
    { name: 'familyTable', w: 2.4, h: 0, items: [['kwanzaa.table', 0, 0, 0, 3], ['pillow', -1.9, 0.2, 0, 1], ['pillow', 1.9, 0.2, 0, 1], ['pillow', 0, 1.4, 0, 1], ['kwanzaa.gifts', 1.6, 1.3, 0.5, 2.6], ['kwanzaa.flag', -1.9, -1.0, 0, 2.6]] },
    { name: 'drumCircle', w: 2.2, h: 0, items: [['kwanzaa.mkeka', 0, 0, 0, 3.4], ...ring(5, 1.55, 'kwanzaa.drum', 2.4, 0.3), ['kwanzaa.kente', 0.3, 0.2, 0.3, 2.6]] },
    { name: 'harvest', w: 2.2, h: 0, items: [['kwanzaa.mazao', 0, 0, 0, 4], ['kwanzaa.corn', 1.5, 0.6, 0.5, 3.5], ['kwanzaa.cup', -1.3, 0.8, 0, 3.4], ...row(2, 2.6, 'kwanzaa.flag', 3, 0, -1.3)] },
  ],
  edge(b, glow, spot, ctx) {
    const LIFT = 0.05;
    const K = 1.4;
    const at = (x: number, y: number, z: number, sx = 1, sy = sx, sz = sx) => {
      const c = Math.cos(spot.yaw);
      const s = Math.sin(spot.yaw);
      return new THREE.Matrix4().compose(new THREE.Vector3(spot.x + x * c + z * s, LIFT + y * K, spot.z - x * s + z * c), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), spot.yaw), new THREE.Vector3(sx * K, sy * K, sz * K));
    };
    if (spot.corner) {
      // A bendera on each corner with a burning candle at its foot.
      bendera({ b, glow, m: (x, y, z, _yaw = 0, sc = 1) => at(x * 0.42, y * 0.42, z * 0.42, sc * 0.42), day: ctx.day });
      const col = pick(FLAG, spot.index);
      b.add(new THREE.CylinderGeometry(0.03, 0.03, 0.1, 8), col === BLACK ? GREEN : col, at(0.08, 0.05, 0.08));
      glow.add(new THREE.SphereGeometry(0.018, 6, 5).scale(1, 1.8, 1), FLAME, at(0.08, 0.125, 0.08));
      return;
    }
    // Two posts with a swag of red, black and green pennants between them.
    for (const z of [-0.32, 0.32]) {
      b.add(new THREE.CylinderGeometry(0.014, 0.016, 0.28, 6), WOOD, at(0, 0.14, z));
      b.add(new THREE.SphereGeometry(0.024, 6, 4), GOLD, at(0, 0.285, z));
    }
    bunting(b, (x, y, z) => at(x, y, z), -0.32, 0.32, 0.26, 0.07, 0.095, spot.index);
  },
  station(b, f, glow) {
    // A kente fascia with red-black-green bunting along the awning, and a kinara on the roof
    // ridge each side, lit for today.
    const z = f.awningZ + 0.16;
    const n = 4;
    for (let i = 0; i < n; i++) {
      const x0 = -f.width / 2 + (i * f.width) / n;
      bunting(b, (x, y, zz) => f.m(zz, y, z + x, 0, -Math.PI / 2, 0), x0, x0 + f.width / n, f.awningY + 0.005, 0.05, 0.08, i);
    }
    const band = Math.round(f.width / 0.06);
    for (let i = 0; i < band; i++) b.add(new THREE.BoxGeometry(f.width / band, 0.035, 0.012), kente(i, 0), f.m(-f.width / 2 + (i + 0.5) * (f.width / band), f.awningY + 0.03, z));
    const day = activeHoliday()?.day ?? 6;
    for (const x of [-0.8, 0.8]) miniKinara(b, glow, (dx, dy) => f.m(x + dx * 2.2, f.roofY + 0.33 + dy * 2.2, 0).multiply(new THREE.Matrix4().makeScale(2.2, 2.2, 2.2)), day);
  },
  engine(b) {
    // A red-black-green sash round the smokebox and a bendera on the cab roof.
    FLAG.forEach((col, i) => b.add(new THREE.TorusGeometry(0.105, 0.012, 5, 18).rotateY(Math.PI / 2), col, new THREE.Matrix4().makeTranslation(0.24 + i * 0.022, 0.215, 0)));
    b.cylinder(0.008, 0.008, 0.32, '#e9e9ef', -0.17, 0.58, 0, 6);
    FLAG.forEach((col, i) => b.add(new THREE.BoxGeometry(0.18, 0.04, 0.008), col, new THREE.Matrix4().makeTranslation(-0.26, 0.7 - i * 0.04, 0)));
  },
  light: { background: '#3a2238', sunColor: '#ffcf96', sunIntensity: 2.2, hemiSky: '#ffd0b0', hemiGround: '#4a2e34', hemiIntensity: 1.05 },
  fx: { kind: 'confetti', colors: [RED, BLACK, GREEN, GOLD], count: 50 },
};

export default skin;
