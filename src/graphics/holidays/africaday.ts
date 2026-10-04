// Africa Day (25 May): a celebration of the whole continent's crafts and nature under a warm
// golden sun. A great baobab shades a giraffe and an elephant, zebras, a giraffe and a lion come
// down to a watering hole, the animals sit in a drum circle round djembes and talking drums, two
// friends play oware on a mud-cloth mat, a market stall under a kente awning sells woven baskets,
// beaded necklaces and fruit, and a feast is laid with a pot of jollof rice. Kente bunting runs
// on posts round the diorama and along the station, kente banners hang on its front, a kente band
// wraps the engine's boiler and gold, green, red and blue confetti drifts down. Djembes, kalimbas,
// baskets, oware boards, giraffes, zebras, elephants, necklaces, pineapples, shekeres and rolls of
// kente cloth ride in the wagons.
import * as THREE from 'three';
import type { GeoBatch } from '../batch';
import type { HolidaySkin, Item, PropContext } from '../holiday';
import { INK, M, WHITE, paintFaces, shadeHex, type Kit } from '../toyModels';

const GOLD = '#f6c21c';
const GREEN = '#1f9a4a';
const RED = '#e0312b';
const BLUE = '#2a6fd6';
const ORANGE = '#ff8a1e';
const CREAM = '#f3e2bc';
const ROPE = '#efdcb0';
const WOOD = '#8a4a26';
const LIGHT_WOOD = '#c98a52';
const BARK = '#a5836a';
const LEAF = '#4fa83a';
const SAND = '#e8c27a';
const STRAW = '#e6b84a';
const KENTE = [RED, GOLD, GREEN, BLUE, ORANGE];

const pick = <T>(a: readonly T[], i: number): T => a[((i % a.length) + a.length) % a.length] as T;
const mod = (n: number, k: number) => ((n % k) + k) % k;

/** A placement in some local frame (prop, rim spot, station): position and an extra yaw. */
type Place = (x: number, y: number, z: number, yaw?: number) => THREE.Matrix4;

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const sph = (r: number, sx = 1, sy = 1, sz = 1, seg = 10) => new THREE.SphereGeometry(r, seg, Math.max(5, Math.round(seg * 0.7))).scale(sx, sy, sz);
const cyl = (rt: number, rb: number, h: number, seg = 8) => new THREE.CylinderGeometry(rt, rb, h, seg);
const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
const lathe = (pts: [number, number][], seg = 14) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);

/** A thin rod from a to b (strings, cords, lacing). */
function rod(a: THREE.Vector3, b: THREE.Vector3, r: number, seg = 4): THREE.BufferGeometry {
  const d = b.clone().sub(a);
  const g = new THREE.CylinderGeometry(r, r, d.length(), seg);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.normalize()));
  return g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
}

/**
 * Kente: blocks of warp stripes alternating with blocks of weft bands, `main` the leading color.
 * u runs across the cloth (0..1 per stripe group), v along it (one block per unit).
 */
function kente(u: number, v: number, main: string): string {
  const row = Math.floor(v);
  const f = v - row;
  if (mod(row, 2) === 0) return pick([main, GOLD, main, RED, main, GREEN], Math.floor(mod(u, 1) * 6));
  return pick([INK, GOLD, main, main, GOLD, INK], Math.floor(f * 6));
}

/** A flat strip of kente w wide and h long (hanging down along y), `blocks` blocks long. */
function kenteStrip(w: number, h: number, d: number, blocks: number, main: string): THREE.BufferGeometry {
  return paintFaces(new THREE.BoxGeometry(w, h, d, 6, blocks * 6, 1), (x, y) => kente(x / w + 0.5, (0.5 - y / h) * blocks + 0.001, main));
}

// ------------------------------------------------------------------------------------- cargo

/** Builds a flat model and tips its top toward +z so it reads on the goal card and in wagons. */
const tilted = (build: (k: Kit, c: string) => void, angle: number) => (k: Kit, c: string): void => {
  const from = k.parts.length;
  build(k, c);
  const m = M(0, 0, 0, angle, 0, 0);
  for (const g of k.parts.slice(from)) g.applyMatrix4(m);
};

/** Adds a geometry placed by `m` and painted triangle by triangle. */
const painted = (k: Kit, g: THREE.BufferGeometry, m: THREE.Matrix4, paint: (x: number, y: number, z: number) => string) => {
  k.parts.push(paintFaces(g.applyMatrix4(m), paint));
};

/** A djembe: a rope-tuned goblet drum with a pale skin and a gold band. */
function djembe(k: Kit, c: string): void {
  k.add(lathe([[0, -0.025], [0.011, -0.025], [0.0115, -0.022], [0.007, -0.009], [0.0075, -0.004], [0.016, 0.011], [0.0172, 0.018], [0, 0.018]], 14), c);
  k.cyl(0.018, 0.018, 0.004, CREAM, 0, 0.02, 0, 0, 0, 0, 14);
  k.tor(0.0172, 0.0016, ROPE, 0, 0.016, 0, Math.PI / 2, 0, 0, 14);
  k.tor(0.0079, 0.0014, ROPE, 0, -0.005, 0, Math.PI / 2, 0, 0, 10);
  k.tor(0.0128, 0.0014, GOLD, 0, 0.005, 0, Math.PI / 2, 0, 0, 14);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    k.add(rod(V(Math.cos(a) * 0.0168, 0.015, Math.sin(a) * 0.0168), V(Math.cos(a + 0.4) * 0.0082, -0.004, Math.sin(a + 0.4) * 0.0082), 0.0009, 3), ROPE);
  }
}

/** A shekere: a gourd rattle wrapped in a net of beads. */
function shekere(k: Kit, c: string): void {
  k.sph(0.019, c, 0, -0.006, 0, 1, 0.95, 1, 12);
  k.cyl(0.0055, 0.009, 0.014, c, 0, 0.016, 0, 0, 0, 0, 10);
  k.sph(0.006, shadeHex(c, -25), 0, 0.024, 0, 1, 0.5, 1, 8);
  for (let r = 0; r < 3; r++) {
    const e = -0.6 + r * 0.55;
    for (let i = 0; i < 7; i++) {
      const a = ((i + (r % 2) * 0.5) / 7) * Math.PI * 2;
      k.sph(0.0027, pick([WHITE, '#2bb3a6', RED, GOLD], i + r), Math.cos(a) * Math.cos(e) * 0.0195, -0.006 + Math.sin(e) * 0.0186, Math.sin(a) * Math.cos(e) * 0.0195, 1, 1, 1, 4);
    }
  }
}

/** A pineapple with a diamond-scaled skin and a spiky green crown. */
function pineapple(k: Kit, c: string): void {
  const dark = shadeHex(c, -45);
  painted(k, new THREE.SphereGeometry(0.0145, 14, 10), M(0, -0.007, 0, 0, 0, 0, 1, 1.32, 1), (x, y, z) => {
    const p = (Math.atan2(z, x) / (Math.PI * 2)) * 10;
    const q = y * 260;
    return mod(Math.floor(p + q) + Math.floor(p - q), 2) ? c : dark;
  });
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const t = i % 2 ? 0.5 : 0.25;
    k.add(new THREE.ConeGeometry(0.003, 0.018, 5).translate(0, 0.009, 0), i % 2 ? GREEN : '#3fb84a', M(Math.cos(a) * 0.002, 0.011, Math.sin(a) * 0.002, Math.sin(a) * t, 0, -Math.cos(a) * t));
  }
  k.add(new THREE.ConeGeometry(0.0032, 0.02, 5), GREEN, M(0, 0.022, 0));
}

/** An oware (mancala) board: two rows of six cups, a store at each end, seeds in play. */
function oware(k: Kit, c: string): void {
  const dark = shadeHex(c, -42);
  k.box(0.056, 0.008, 0.026, c, 0, -0.002, 0);
  k.box(0.058, 0.003, 0.028, shadeHex(c, -20), 0, -0.007, 0);
  const seeds = [CREAM, GOLD, RED, CREAM, '#2bb3a6'];
  for (let i = 0; i < 6; i++) {
    for (const s of [-1, 1]) {
      const x = -0.0175 + i * 0.007;
      k.cyl(0.003, 0.0026, 0.0012, dark, x, 0.0016, s * 0.0058, 0, 0, 0, 8);
      if ((i + (s > 0 ? 1 : 0)) % 3) k.sph(0.0017, pick(seeds, i + s), x, 0.0026, s * 0.0058, 1, 0.8, 1, 4);
    }
  }
  for (const s of [-1, 1]) {
    k.add(cyl(0.0034, 0.003, 0.0012, 8).scale(1, 1, 2), dark, M(s * 0.0245, 0.0016, 0));
    k.sph(0.0017, GOLD, s * 0.0245, 0.0026, 0.002, 1, 0.8, 1, 4);
    k.sph(0.0017, CREAM, s * 0.0245, 0.0026, -0.002, 1, 0.8, 1, 4);
  }
}

/** A string of beads with a gold pendant. */
function necklace(k: Kit, c: string): void {
  const n = 18;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.PI / 2;
    k.sph(0.0035, pick([c, c, GOLD, c, c, WHITE], i), Math.cos(a) * 0.0165, 0.004 + Math.sin(a) * 0.0165, 0, 1, 1, 1, 5);
  }
  k.cyl(0.0062, 0.0062, 0.003, GOLD, 0, -0.019, 0, Math.PI / 2, 0, 0, 10);
  k.sph(0.0032, RED, 0, -0.019, 0.0018, 1, 1, 0.5, 6);
}

/** A roll of kente cloth tied with gold, lying along z. */
function kenteRoll(k: Kit, c: string): void {
  const L = 0.046;
  painted(k, new THREE.CylinderGeometry(0.0135, 0.0135, L, 12, 16), M(0, 0, 0, Math.PI / 2, 0, 0), (x, y, z) => kente((Math.atan2(y, x) / (Math.PI * 2)) * 3, (z / L + 0.5) * 4 + 0.001, c));
  for (const s of [-1, 1]) {
    k.tor(0.009, 0.0012, shadeHex(c, -30), 0, 0, s * 0.023, 0, 0, 0, 10);
    k.tor(0.0042, 0.0012, shadeHex(c, -30), 0, 0, s * 0.023, 0, 0, 0, 8);
  }
  // The loose end hangs down the front.
  painted(k, new THREE.BoxGeometry(0.0016, 0.016, 0.044, 1, 2, 8), M(0.0138, -0.006, 0), (_x, y, z) => kente(y * 30, (z / L + 0.5) * 4 + 0.001, c));
}

/** A kalimba (thumb piano): a painted board, a sound hole, a bridge and steel tines. */
function kalimba(k: Kit, c: string): void {
  k.box(0.046, 0.009, 0.036, c, 0, -0.001, 0);
  k.box(0.048, 0.003, 0.038, shadeHex(c, -25), 0, -0.0055, 0);
  for (let i = 0; i < 6; i++) k.box(0.0055, 0.0016, 0.004, i % 2 ? GOLD : WHITE, -0.0175 + i * 0.007, 0.0042, 0.0155);
  k.cyl(0.0052, 0.0052, 0.0016, INK, 0, 0.0033, 0.008, 0, 0, 0, 12);
  k.tor(0.0056, 0.0011, GOLD, 0, 0.0038, 0.008, Math.PI / 2, 0, 0, 12);
  k.box(0.038, 0.0035, 0.0035, '#5a3a22', 0, 0.0052, -0.009);
  for (let i = 0; i < 7; i++) {
    const x = -0.0156 + i * 0.0052;
    const len = 0.02 - Math.abs(i - 3) * 0.0026;
    k.box(0.0034, 0.0018, len, '#e6ebf2', x, 0.0078, -0.013 + len / 2);
  }
}

/** A woven basket with zigzag bands and a leather-wrapped handle. */
function basket(k: Kit, c: string): void {
  painted(k, new THREE.CylinderGeometry(0.021, 0.0135, 0.03, 18, 7), M(0, -0.01, 0), (x, y, z) => {
    if (y > 0.0145) return shadeHex(c, -40);
    const zig = Math.abs(mod((Math.atan2(z, x) / (Math.PI * 2)) * 16, 2) - 1);
    return pick([c, WHITE, c, GOLD], Math.floor(y * 150 + zig * 1.2 + 3));
  });
  k.tor(0.0205, 0.0018, shadeHex(c, -20), 0, 0.0055, 0, Math.PI / 2, 0, 0, 16);
  k.tor(0.017, 0.0022, WOOD, 0, 0.005, 0, 0, 0, 0, 12, Math.PI);
}

/** A toy giraffe with patches, ossicones and a long neck. */
function giraffe(k: Kit, c: string): void {
  const patch = shadeHex(c, -42);
  const y0 = -0.004;
  k.sph(0.0115, c, -0.004, y0, 0, 1.5, 1, 0.85, 12);
  for (const [x, z] of [[-0.013, -0.005], [-0.013, 0.005], [0.006, -0.005], [0.006, 0.005]] as const) k.cyl(0.0022, 0.0019, 0.021, c, x, y0 - 0.017, z, 0, 0, 0, 6);
  k.cyl(0.0038, 0.0058, 0.028, c, 0.009, y0 + 0.017, 0, 0, 0, -0.42, 8);
  k.sph(0.0055, c, 0.018, y0 + 0.031, 0, 1.6, 0.9, 0.9, 10);
  k.sph(0.003, shadeHex(c, 25), 0.025, y0 + 0.0295, 0, 1, 0.9, 1, 6);
  for (const s of [-1, 1]) {
    k.cyl(0.0008, 0.0008, 0.006, patch, 0.016, y0 + 0.037, s * 0.0022, s * 0.2, 0, 0, 4);
    k.sph(0.0013, patch, 0.016, y0 + 0.0405, s * 0.0028, 1, 1, 1, 5);
    k.sph(0.0011, INK, 0.021, y0 + 0.033, s * 0.0045, 1, 1, 1, 5);
    k.sph(0.0018, c, 0.013, y0 + 0.034, s * 0.0045, 1.4, 0.6, 1, 5);
    for (const [x, y] of [[-0.012, 0.002], [-0.004, 0.005], [0.003, -0.002], [-0.008, -0.005]] as const) k.sph(0.0029, patch, x, y0 + y, s * 0.0092, 1, 1, 0.35, 5);
  }
  for (const [x, y] of [[0.006, 0.01], [0.01, 0.019], [0.0135, 0.027]] as const) for (const s of [-1, 1]) k.sph(0.0018, patch, x, y0 + y, s * 0.0045, 1, 1, 0.4, 5);
  k.cyl(0.0007, 0.0007, 0.012, c, -0.021, y0 - 0.004, 0, 0, 0, 0.3, 4);
  k.sph(0.0015, patch, -0.023, y0 - 0.0105, 0, 1, 1.6, 1, 5);
}

/** A toy zebra in black stripes with a standing mane. */
function zebra(k: Kit, c: string): void {
  const stripes = (w: number, slant: number) => (x: number, y: number) => (mod(Math.floor((x + y * slant) / w), 2) ? INK : c);
  painted(k, new THREE.SphereGeometry(0.0125, 16, 10), M(-0.003, 0, 0, 0, 0, 0, 1.55, 0.95, 0.85), stripes(0.0042, 0.5));
  for (const [x, z] of [[-0.014, -0.0055], [-0.014, 0.0055], [0.008, -0.0055], [0.008, 0.0055]] as const) {
    painted(k, new THREE.CylinderGeometry(0.0024, 0.0021, 0.016, 6, 4), M(x, -0.0145, z), (_x, y) => (mod(Math.floor(y / 0.0035), 2) ? INK : c));
    k.cyl(0.0024, 0.0024, 0.003, INK, x, -0.0235, z, 0, 0, 0, 6);
  }
  painted(k, new THREE.CylinderGeometry(0.0045, 0.0062, 0.016, 8, 4), M(0.014, 0.008, 0, 0, 0, -0.6), stripes(0.004, -0.8));
  painted(k, new THREE.SphereGeometry(0.0052, 10, 7), M(0.022, 0.0135, 0, 0, 0, -0.5, 1.75, 0.95, 0.95), stripes(0.004, 0.3));
  k.sph(0.0034, INK, 0.0295, 0.0095, 0, 1, 1, 1, 6);
  k.box(0.016, 0.004, 0.0018, INK, 0.0145, 0.0135, 0, 0, 0, -0.75);
  for (const s of [-1, 1]) {
    k.sph(0.0018, c, 0.019, 0.02, s * 0.0028, 0.7, 1.6, 0.7, 5);
    k.sph(0.001, INK, 0.0235, 0.0155, s * 0.0045, 1, 1, 1, 5);
  }
  k.cyl(0.0007, 0.0007, 0.011, c, -0.022, -0.004, 0, 0, 0, 0.35, 4);
  k.sph(0.0016, INK, -0.024, -0.0095, 0, 1, 1.8, 1, 5);
}

/** A toy elephant with big ears, a curled trunk, tusks and a kente blanket. */
function elephant(k: Kit, c: string): void {
  k.sph(0.0155, c, -0.004, 0.002, 0, 1.25, 0.95, 0.95, 11);
  for (const [x, z] of [[-0.013, -0.0075], [-0.013, 0.0075], [0.005, -0.0075], [0.005, 0.0075]] as const) {
    k.cyl(0.0048, 0.0052, 0.016, c, x, -0.014, z, 0, 0, 0, 7);
  }
  k.sph(0.0105, c, 0.0145, 0.008, 0, 1, 1, 0.95, 10);
  for (const s of [-1, 1]) {
    k.sph(0.0095, shadeHex(c, -10), 0.009, 0.008, s * 0.0105, 0.75, 1.1, 0.3, 10);
    k.sph(0.006, '#ff9fb6', 0.0098, 0.0075, s * 0.012, 0.6, 0.8, 0.2, 5);
    k.sph(0.0012, INK, 0.021, 0.012, s * 0.0055, 1, 1, 1, 5);
    k.add(new THREE.ConeGeometry(0.0016, 0.008, 5), WHITE, M(0.0225, -0.001, s * 0.004, 0, 0, -2.1));
  }
  k.sph(0.0042, c, 0.0235, 0.0015, 0, 1, 1, 1, 7);
  k.sph(0.0036, c, 0.0265, -0.0065, 0, 1, 1, 1, 7);
  k.sph(0.0031, c, 0.0285, -0.0135, 0, 1, 1, 1, 6);
  k.sph(0.0028, c, 0.0315, -0.0165, 0, 1, 1, 1, 6);
  // A little kente blanket over the back.
  k.dome(0.0162, RED, -0.005, 0.004, 0, 0.75, 0.8, 1.02, 12);
  k.tor(0.0122, 0.0012, GOLD, -0.005, 0.004, 0, Math.PI / 2, 0, 0, 14);
  k.tor(0.0078, 0.0012, GREEN, -0.005, 0.0104, 0, Math.PI / 2, 0, 0, 12);
  k.cyl(0.0007, 0.0007, 0.01, c, -0.0235, -0.002, 0, 0, 0, 0.4, 4);
}

// ------------------------------------------------------------------------------------- shared parts

/** A djembe about 0.37 tall at s = 1 standing at (x, y, z). */
function djembeAt(b: GeoBatch, P: Place, x: number, y: number, z: number, s: number, col: string): void {
  const at = (lx: number, ly: number, lz: number) => P(x, y, z).multiply(new THREE.Matrix4().makeScale(s, s, s)).multiply(new THREE.Matrix4().makeTranslation(lx, ly, lz));
  b.add(lathe([[0, 0], [0.09, 0], [0.095, 0.02], [0.06, 0.13], [0.065, 0.19], [0.13, 0.32], [0.142, 0.36], [0, 0.36]], 14), col, at(0, 0, 0));
  b.add(cyl(0.146, 0.146, 0.02, 14), CREAM, at(0, 0.37, 0));
  b.add(new THREE.TorusGeometry(0.14, 0.01, 4, 14).rotateX(Math.PI / 2), ROPE, at(0, 0.345, 0));
  b.add(new THREE.TorusGeometry(0.066, 0.009, 4, 10).rotateX(Math.PI / 2), ROPE, at(0, 0.17, 0));
  b.add(new THREE.TorusGeometry(0.104, 0.01, 4, 14).rotateX(Math.PI / 2), GOLD, at(0, 0.26, 0));
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    b.add(rod(V(Math.cos(a) * 0.138, 0.34, Math.sin(a) * 0.138), V(Math.cos(a + 0.32) * 0.068, 0.175, Math.sin(a + 0.32) * 0.068), 0.006, 3), ROPE, at(0, 0, 0));
  }
}

/** A talking drum about 0.36 tall at s = 1: an hourglass laced with cords, a curved beater. */
function talkingDrumAt(b: GeoBatch, P: Place, x: number, y: number, z: number, s: number, col: string): void {
  const at = (lx: number, ly: number, lz: number) => P(x, y, z).multiply(new THREE.Matrix4().makeScale(s, s, s)).multiply(new THREE.Matrix4().makeTranslation(lx, ly, lz));
  b.add(cyl(0.1, 0.042, 0.17, 12), col, at(0, 0.265, 0));
  b.add(cyl(0.042, 0.1, 0.17, 12), col, at(0, 0.095, 0));
  for (const yy of [0.355, 0.006]) b.add(cyl(0.106, 0.106, 0.014, 12), CREAM, at(0, yy, 0));
  b.add(new THREE.TorusGeometry(0.106, 0.01, 4, 12).rotateX(Math.PI / 2), RED, at(0, 0.34, 0));
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    b.add(rod(V(Math.cos(a) * 0.1, 0.345, Math.sin(a) * 0.1), V(Math.cos(a) * 0.1, 0.015, Math.sin(a) * 0.1), 0.005, 3), ROPE, at(0, 0, 0));
  }
  b.add(new THREE.TorusGeometry(0.09, 0.012, 4, 8, Math.PI * 0.7), '#5a3a22', at(0.16, 0.08, 0.05).multiply(new THREE.Matrix4().makeRotationZ(0.6)));
}

/** A small woven basket about 0.16 tall at s = 1, zigzag bands in col. */
function basketAt(b: GeoBatch, P: Place, x: number, y: number, z: number, s: number, col: string): void {
  const g = paintFaces(cyl(0.12, 0.08, 0.16, 14), (gx, gy, gz) => {
    if (gy > 0.079) return shadeHex(col, -40);
    const zig = Math.abs(mod((Math.atan2(gz, gx) / (Math.PI * 2)) * 12, 2) - 1);
    return pick([col, WHITE, col, GOLD], Math.floor(gy * 25 + zig * 1.2 + 3));
  });
  b.add(g, '#ffffff', P(x, y + 0.08 * s, z).multiply(new THREE.Matrix4().makeScale(s, s, s)));
  b.add(new THREE.TorusGeometry(0.12, 0.012, 4, 14).rotateX(Math.PI / 2), shadeHex(col, -20), P(x, y + 0.16 * s, z).multiply(new THREE.Matrix4().makeScale(s, s, s)));
}

/** A pineapple about 0.24 tall at s = 1. */
function pineappleAt(b: GeoBatch, P: Place, x: number, y: number, z: number, s: number): void {
  const at = (ly: number) => P(x, y + ly * s, z).multiply(new THREE.Matrix4().makeScale(s, s, s));
  b.add(paintFaces(sph(0.06, 1, 1.3, 1, 10), (gx, gy, gz) => {
    const p = (Math.atan2(gz, gx) / (Math.PI * 2)) * 8;
    return mod(Math.floor(p + gy * 50) + Math.floor(p - gy * 50), 2) ? '#f6c344' : '#c98a1c';
  }), '#ffffff', at(0.078));
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    b.add(new THREE.ConeGeometry(0.014, 0.09, 4).translate(0, 0.045, 0).rotateZ(0.35).rotateY(a), GREEN, at(0.15));
  }
}

/**
 * Kente bunting: a string sagging from a to c with stepped kente pennants hanging from it.
 * `half` makes a half swag that ends at its low point (the other half comes from the next post).
 */
function bunting(b: GeoBatch, P: Place, a: THREE.Vector3, c: THREE.Vector3, sag: number, flags: number, size: number, start: number, half = false): void {
  const at = (t: number) => {
    const p = a.clone().lerp(c, t);
    p.y -= half ? sag * (1 - (1 - t) * (1 - t)) : sag * 4 * t * (1 - t);
    return p;
  };
  const n = half ? 3 : 6;
  for (let i = 0; i < n; i++) b.add(rod(at(i / n), at((i + 1) / n), 0.006 * size, 3), WHITE, P(0, 0, 0));
  const d = c.clone().sub(a);
  const yaw = Math.atan2(-d.z, d.x);
  for (let i = 0; i < flags; i++) {
    const p = at((i + (half ? 0.45 : 0.5)) / flags);
    const col = pick(KENTE, start + i);
    const alt = pick(KENTE, start + i + 2);
    const w = 0.13 * size;
    const h = 0.16 * size;
    b.add(box(w, h * 0.42, 0.012 * size), col, P(p.x, p.y - h * 0.21, p.z, yaw));
    b.add(box(w * 0.82, h * 0.06, 0.016 * size), INK, P(p.x, p.y - h * 0.38, p.z, yaw));
    b.add(box(w * 0.6, h * 0.28, 0.012 * size), alt, P(p.x, p.y - h * 0.55, p.z, yaw));
    b.add(box(w * 0.28, h * 0.26, 0.012 * size), col, P(p.x, p.y - h * 0.82, p.z, yaw));
  }
}

// ------------------------------------------------------------------------------------- props

const placeOf = (m: PropContext['m']): Place => (x, y, z, yaw = 0) => m(x, y, z, yaw);

/** A baobab about 1.25 tall at scale 1: a fat bottle trunk, stubby branches, flat leaf tufts, pods. */
function baobab({ b, m, mr }: PropContext): void {
  b.add(lathe([[0, 0], [0.22, 0], [0.26, 0.1], [0.28, 0.32], [0.24, 0.55], [0.15, 0.75], [0.11, 0.86], [0, 0.86]], 12), BARK, m(0, 0, 0));
  for (let i = 0; i < 4; i++) b.add(sph(0.08, 1.6, 0.5, 0.7, 6), shadeHex(BARK, -15), m(Math.cos(i * 1.6) * 0.22, 0.03, Math.sin(i * 1.6) * 0.22, -i * 1.6));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    const r = 0.13 + (i % 2) * 0.04;
    b.add(cyl(0.025, 0.05, 0.32, 6), BARK, mr(Math.cos(a) * r, 0.94, Math.sin(a) * r, 0, -a, -0.85 - (i % 2) * 0.2));
    const tx = Math.cos(a) * (0.3 + (i % 2) * 0.05);
    const tz = Math.sin(a) * (0.3 + (i % 2) * 0.05);
    b.add(sph(0.15, 1, 0.42, 1, 10), i % 2 ? LEAF : '#3d9433', m(tx, 1.07 - (i % 2) * 0.04, tz));
    b.add(cyl(0.004, 0.004, 0.08, 3), '#6b5a3a', m(tx * 0.9, 0.98, tz * 0.9));
    b.add(sph(0.025, 1, 1.8, 1, 6), '#b9b48a', m(tx * 0.9, 0.92, tz * 0.9));
  }
  b.add(sph(0.18, 1, 0.45, 1, 10), '#3d9433', m(0, 1.12, 0));
}

/** A drum: djembes in three colors, or (variant 2) a talking drum. */
function drum({ b, m, variant }: PropContext): void {
  const P = placeOf(m);
  if (mod(variant, 3) === 2) talkingDrumAt(b, P, 0, 0, 0, 1, LIGHT_WOOD);
  else djembeAt(b, P, 0, 0, 0, 1, pick([RED, ORANGE, WOOD, GREEN], variant));
}

/** A mat about 1.0 × 0.7: mud cloth (cream marks on brown) or, variant 1, kente. */
function mat({ b, m, variant }: PropContext): void {
  const g = new THREE.PlaneGeometry(1, 0.7, 12, 8).rotateX(-Math.PI / 2);
  if (mod(variant, 2) === 1) {
    b.add(paintFaces(g, (x, _y, z) => kente(x * 4 + 0.5, (z + 0.35) * 8 + 0.001, BLUE)), '#ffffff', m(0, 0.022, 0));
  } else {
    b.add(paintFaces(g, (x, _y, z) => {
      const i = Math.floor((x + 0.5) * 12);
      const j = Math.floor((z + 0.35) * 8 * 1.0001);
      const dark = '#4f2c18';
      if (j === 0 || j === 7) return mod(i, 3) === 1 ? CREAM : dark;
      if (i === 0 || i === 11) return dark;
      if (j % 3 === 1) return mod(i, 4) === 1 || mod(i, 4) === 2 ? CREAM : dark;
      if (j % 3 === 2) return mod(i, 4) === 3 ? '#e8a23a' : dark;
      return mod(i, 4) === 0 ? CREAM : dark;
    }), '#ffffff', m(0, 0.022, 0));
  }
  b.add(box(1.02, 0.02, 0.72), shadeHex(SAND, -30), m(0, 0.01, 0));
}

/** An oware game in progress on its board, about 0.7 long. */
function owareProp({ b, m }: PropContext): void {
  b.add(box(0.62, 0.07, 0.24), WOOD, m(0, 0.035, 0));
  for (const s of [-1, 1]) b.add(box(0.06, 0.05, 0.2), shadeHex(WOOD, -12), m(s * 0.34, 0.025, 0));
  const seeds = [CREAM, GOLD, RED, '#2bb3a6'];
  for (let i = 0; i < 6; i++) {
    for (const s of [-1, 1]) {
      const x = -0.225 + i * 0.09;
      b.add(cyl(0.036, 0.03, 0.008, 10), '#4a2a18', m(x, 0.068, s * 0.058));
      const n = 1 + ((i * 3 + (s > 0 ? 1 : 0)) % 3);
      for (let j = 0; j < n; j++) b.add(sph(0.013, 1, 0.8, 1, 5), pick(seeds, i + j), m(x + Math.cos(j * 2.1) * 0.014, 0.076, s * 0.058 + Math.sin(j * 2.1) * 0.014));
    }
  }
  for (const s of [-1, 1]) {
    b.add(cyl(0.045, 0.04, 0.008, 10).scale(1, 1, 1.8), '#4a2a18', m(s * 0.3, 0.068, 0));
    for (let j = 0; j < 5; j++) b.add(sph(0.013, 1, 0.8, 1, 5), pick(seeds, j + 1), m(s * 0.3 + Math.cos(j * 2.4) * 0.018, 0.078, Math.sin(j * 2.4) * 0.04));
  }
}

/** A market stall about 0.95 wide: a kente awning, baskets, necklaces on a rail and fruit. */
function stall({ b, m, mr }: PropContext): void {
  const P = placeOf(m);
  for (const [x, z] of [[-0.42, -0.2], [0.42, -0.2], [-0.42, 0.2], [0.42, 0.2]] as const) b.add(cyl(0.018, 0.022, z < 0 ? 0.82 : 0.7, 6), LIGHT_WOOD, m(x, z < 0 ? 0.41 : 0.35, z));
  b.add(box(0.86, 0.035, 0.42), LIGHT_WOOD, m(0, 0.3, 0));
  b.add(kenteStrip(0.86, 0.2, 0.01, 2, GREEN), '#ffffff', m(0, 0.2, 0.215));
  // Awning: kente striped, sloping toward the front.
  b.add(paintFaces(new THREE.BoxGeometry(0.98, 0.02, 0.52, 14, 1, 1), (x) => pick([RED, GOLD, GREEN, GOLD, BLUE, GOLD], Math.floor((x + 0.49) * 14.0001))), '#ffffff', mr(0, 0.78, 0, 0.25, 0, 0));
  for (let i = 0; i < 7; i++) b.add(new THREE.ConeGeometry(0.035, 0.07, 4).rotateX(Math.PI), pick(KENTE, i), m(-0.42 + i * 0.14, 0.69, 0.27));
  // Necklaces hanging from a rail under the awning.
  b.add(cyl(0.008, 0.008, 0.84, 4).rotateZ(Math.PI / 2), WOOD, m(0, 0.64, 0.2));
  for (let i = 0; i < 5; i++) {
    const x = -0.32 + i * 0.16;
    const col = pick(['#2bb3a6', RED, BLUE, ORANGE, '#9b6ad6'], i);
    b.add(new THREE.TorusGeometry(0.045, 0.011, 4, 12).scale(1, 1.1, 1), col, m(x, 0.59, 0.205));
    for (const a of [-1.2, -1.57, -1.94]) b.add(sph(0.016, 1, 1, 1, 5), GOLD, m(x + Math.cos(a) * 0.045, 0.59 + Math.sin(a) * 0.05, 0.21));
  }
  basketAt(b, P, -0.28, 0.318, -0.05, 0.75, '#ef6fa5');
  basketAt(b, P, -0.08, 0.318, 0.02, 0.6, ORANGE);
  pineappleAt(b, P, 0.12, 0.318, -0.04, 0.85);
  for (const [x, z, col] of [[0.3, 0.06, '#ff9a2a'], [0.25, -0.06, '#ffb62a'], [0.34, -0.05, '#e8572a'], [0.29, 0.0, '#ffd23f']] as const) b.add(sph(0.04, 1.3, 0.85, 0.95, 8), col, m(x, 0.35, z, 0.7));
}

/** A feast on a round woven mat: a pot of jollof rice, a fruit bowl with mangoes and a pineapple. */
function feast({ b, m }: PropContext): void {
  const P = placeOf(m);
  b.add(cyl(0.5, 0.5, 0.02, 24), shadeHex(STRAW, -30), m(0, 0.01, 0));
  b.add(paintFaces(new THREE.RingGeometry(0, 0.5, 24, 8).rotateX(-Math.PI / 2), (x, _y, z) => pick([STRAW, RED, STRAW, GREEN, STRAW, GOLD, STRAW, BLUE], Math.floor(Math.hypot(x, z) * 16))), '#ffffff', m(0, 0.021, 0));
  // The jollof pot.
  b.add(sph(0.16, 1, 0.72, 1, 14), '#3a3a40', m(-0.12, 0.13, -0.05));
  b.add(new THREE.TorusGeometry(0.15, 0.018, 5, 16).rotateX(Math.PI / 2), '#55555e', m(-0.12, 0.22, -0.05));
  b.add(sph(0.145, 1, 0.38, 1, 14), ORANGE, m(-0.12, 0.215, -0.05));
  for (let i = 0; i < 12; i++) {
    const a = i * 2.4;
    const r = 0.03 + (i % 4) * 0.025;
    b.add(sph(0.014, 1, 1, 1, 5), i % 3 ? '#e8402a' : '#4fb84a', m(-0.12 + Math.cos(a) * r, 0.27 - r * 0.3, -0.05 + Math.sin(a) * r));
  }
  for (const s of [-1, 1]) b.add(new THREE.TorusGeometry(0.03, 0.01, 4, 8), '#55555e', m(-0.12 + s * 0.17, 0.18, -0.05, Math.PI / 2));
  b.add(rod(V(-0.08, 0.24, 0.0), V(0.05, 0.42, 0.08), 0.012, 5), LIGHT_WOOD, m(0, 0, 0));
  // Fruit bowl.
  b.add(sph(0.13, 1, 0.5, 1, 12), '#c0632a', m(0.24, 0.07, 0.12));
  b.add(cyl(0.125, 0.125, 0.01, 12), '#7a3a1a', m(0.24, 0.13, 0.12));
  for (const [x, z, col] of [[0.18, 0.08, '#ff9a2a'], [0.28, 0.07, '#e8572a'], [0.22, 0.18, '#ffd23f'], [0.31, 0.17, '#ff9a2a']] as const) b.add(sph(0.045, 1.3, 0.85, 0.95, 8), col, m(x, 0.165, z, x * 9));
  pineappleAt(b, P, 0.3, 0.13, 0.04, 0.8);
  // Cups of hibiscus drink.
  for (const [x, z] of [[0.05, 0.3], [-0.3, 0.22], [0.32, -0.2]] as const) {
    b.add(cyl(0.035, 0.028, 0.07, 10), WHITE, m(x, 0.055, z));
    b.add(cyl(0.031, 0.031, 0.004, 10), '#b0183a', m(x, 0.088, z));
  }
}

/** A watering hole about 1.1 across: water, a sandy shore, rocks, reeds and a lily pad. */
function pool({ b, m }: PropContext): void {
  b.add(cyl(0.58, 0.6, 0.02, 22).scale(1, 1, 0.72), SAND, m(0, 0.01, 0));
  b.add(cyl(0.5, 0.5, 0.012, 22).scale(1, 1, 0.68), '#3fa9e0', m(0, 0.025, 0));
  b.add(cyl(0.3, 0.3, 0.004, 16).scale(1, 1, 0.6), '#7fd0f6', m(-0.08, 0.032, -0.04));
  for (const [x, z, r] of [[0.48, 0.2, 0.06], [0.52, 0.08, 0.045], [-0.5, -0.2, 0.07], [-0.2, 0.42, 0.05]] as const) b.add(sph(r, 1.3, 0.7, 1, 7), '#a69a8a', m(x, 0.02, z));
  for (const [x, z] of [[0.15, 0.1], [-0.25, 0.12]] as const) {
    b.add(cyl(0.05, 0.05, 0.006, 10), '#4fb84a', m(x, 0.034, z));
    b.add(sph(0.018, 1, 0.7, 1, 6), '#ff8fb1', m(x + 0.015, 0.045, z));
  }
  for (let i = 0; i < 6; i++) {
    const a = -0.6 + i * 0.12;
    b.add(cyl(0.006, 0.01, 0.22 + (i % 3) * 0.05, 4), i % 2 ? '#7aa83a' : '#5a8a2e', m(Math.cos(a) * 0.55, 0.12, -Math.sin(a) * 0.4 - 0.05));
  }
}

/** A toy lion about 0.45 long at scale 1: a golden body and a big round mane. */
function lion({ b, m, mr }: PropContext): void {
  const fur = '#f2b23a';
  const mane = '#c8641e';
  b.add(new THREE.CapsuleGeometry(0.08, 0.18, 4, 10).rotateZ(Math.PI / 2), fur, m(-0.02, 0.18, 0));
  for (const [x, z] of [[-0.12, -0.05], [-0.12, 0.05], [0.08, -0.05], [0.08, 0.05]] as const) {
    b.add(cyl(0.03, 0.03, 0.14, 8), fur, m(x, 0.07, z));
    b.add(sph(0.032, 1.2, 0.5, 1, 6), shadeHex(fur, 15), m(x + 0.01, 0.01, z));
  }
  b.add(sph(0.13, 1, 1, 0.9, 12), mane, m(0.13, 0.28, 0));
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    b.add(sph(0.045, 1, 1, 1, 6), i % 2 ? mane : '#a84a14', m(0.15, 0.28 + Math.sin(a) * 0.12, Math.cos(a) * 0.12));
  }
  b.add(sph(0.085, 1, 1, 1, 12), fur, m(0.2, 0.28, 0));
  b.add(sph(0.045, 1, 0.8, 1, 8), shadeHex(fur, 25), m(0.27, 0.25, 0));
  b.add(sph(0.018, 1.2, 0.8, 1, 6), '#5a2e14', m(0.31, 0.27, 0));
  for (const s of [-1, 1]) {
    b.add(sph(0.012, 1, 1, 1, 6), INK, m(0.27, 0.31, s * 0.035));
    b.add(sph(0.025, 1, 1, 0.5, 6), fur, m(0.19, 0.36, s * 0.06));
  }
  b.add(cyl(0.01, 0.01, 0.2, 5), fur, mr(-0.2, 0.22, 0, 0, 0, 0.9));
  b.add(sph(0.03, 1, 1.3, 1, 6), mane, m(-0.28, 0.29, 0));
}

/** A tuft of golden savanna grass. */
function grass({ b, m }: PropContext): void {
  for (let i = 0; i < 9; i++) {
    const a = i * 2.4;
    const t = 0.15 + (i % 3) * 0.12;
    b.add(new THREE.ConeGeometry(0.018, 0.24 + (i % 4) * 0.05, 4).translate(0, 0.12, 0).rotateZ(t).rotateY(a), i % 2 ? STRAW : '#c9a23a', m(Math.cos(a) * 0.04, 0, Math.sin(a) * 0.04));
  }
}

/** Kente bunting on two posts, about 1.2 long. */
function buntingProp({ b, m }: PropContext): void {
  for (const s of [-1, 1]) {
    b.add(cyl(0.02, 0.025, 0.64, 6), LIGHT_WOOD, m(s * 0.6, 0.32, 0));
    b.add(sph(0.03, 1, 1, 1, 6), GOLD, m(s * 0.6, 0.65, 0));
  }
  bunting(b, placeOf(m), V(-0.6, 0.6, 0), V(0.6, 0.6, 0), 0.16, 6, 1, 0);
}

// ------------------------------------------------------------------------------------- scenes

const animals = (r: number, scale: number, phase: number): Item[] =>
  (['toy:teddy', 'toy:dice', 'toy:robot', 'africa.lion'] as const).map((kind, i) => {
    const a = phase + (i / 4) * Math.PI * 2;
    return [kind, Math.cos(a) * r, Math.sin(a) * r, 'face', kind === 'africa.lion' ? scale * 1.3 : scale] as Item;
  });

const drums = (n: number, r: number, scale: number, phase: number): Item[] =>
  Array.from({ length: n }, (_, i) => {
    const a = phase + (i / n) * Math.PI * 2;
    return ['africa.drum', Math.cos(a) * r, Math.sin(a) * r, 0, scale, 0, i] as Item;
  });

// ------------------------------------------------------------------------------------- the skin

const skin: HolidaySkin = {
  id: 'africaday',
  name: 'Africa Day',
  greeting: 'Happy Africa Day!',
  cargo: {
    red: djembe, orange: shekere, yellow: pineapple, green: tilted(oware, 0.8), teal: necklace, blue: kenteRoll,
    purple: tilted(kalimba, 0.75), pink: basket, brown: giraffe, white: zebra, gray: elephant,
  },
  props: {
    'africa.baobab': baobab,
    'africa.drum': drum,
    'africa.mat': mat,
    'africa.oware': owareProp,
    'africa.stall': stall,
    'africa.feast': feast,
    'africa.pool': pool,
    'africa.lion': lion,
    'africa.grass': grass,
    'africa.bunting': buntingProp,
  },
  inside: [
    { name: 'drumCircle', w: 2, h: 2, items: [['africa.mat', 0, 0, 0.3, 1.1, 0, 0], ...drums(3, 0.28, 0.8, 0.5), ...animals(0.72, 0.5, 0.8)] },
    { name: 'wateringHole', w: 2, h: 2, items: [['africa.pool', -0.05, 0, 0, 1.15], ['toy:teddy', 0.62, -0.5, 'face', 0.75], ['toy:dice', -0.6, 0.5, 'face', 0.6], ['toy:robot', -0.62, -0.48, 'face', 0.62], ['africa.grass', 0.7, 0.6, 0, 1.1]] },
    { name: 'market', w: 2, h: 1, items: [['africa.stall', -0.2, -0.05, 0, 0.95], ['toy:drum', 0.62, 0.15, 0.4, 0.55], ['toy:top', 0.82, -0.15, 0.5, 0.5]] },
    { name: 'oware', w: 2, h: 1, items: [['africa.mat', 0, 0, 0, 1.05, 0, 1], ['africa.oware', 0, 0, 0, 0.95], ['toy:robot', -0.72, 0, 'face', 0.5], ['toy:dice', 0.72, 0, 'face', 0.5]] },
    { name: 'feast', w: 2, h: 2, items: [['africa.feast', 0, 0.12, 0, 1.15], ['africa.bunting', 0, -0.7, 0, 1.15], ['toy:teddy', -0.72, 0.55, 'face', 0.55], ['toy:star', 0.72, 0.6, 'face', 0.5]] },
    { name: 'baobab', w: 2, h: 2, items: [['africa.baobab', -0.2, -0.2, 0, 1.1], ['toy:teddy', 0.55, 0.42, 'face', 0.7], ['africa.grass', -0.6, 0.55, 0, 1], ['africa.grass', 0.65, -0.55, 0, 0.9]] },
  ],
  outside: [
    { name: 'baobabGrove', w: 2.6, h: 0, items: [['africa.baobab', 0, -0.2, 0, 3.6], ['toy:teddy', 1.7, 0.7, 'face', 2.2], ['toy:robot', -1.7, 0.6, 'face', 1.9], ['africa.grass', 0.8, 1.5, 0, 3], ['africa.grass', -1.2, -1.4, 0, 3]] },
    { name: 'savanna', w: 2.6, h: 0, items: [['africa.pool', 0, 0, 0, 3.6], ['toy:dice', 1.7, 1.1, 'face', 1.8], ['toy:dice', 2.2, 0.4, 'face', 1.5], ['toy:teddy', -1.8, -0.7, 'face', 2.2], ['africa.lion', 1.8, -1.2, 'face', 2.6], ['africa.grass', -1.6, 1.2, 0, 3]] },
    { name: 'festival', w: 2.4, h: 0, items: [['africa.mat', 0, 0.3, 0, 3, 0, 0], ...drums(4, 0.8, 2.2, 0.4).map((it) => [it[0], it[1], (it[2] as number) + 0.3, it[3], it[4], it[5], it[6]] as Item), ['africa.stall', 0, -1.7, 0, 2.6]] },
  ],
  edge(b, glow, spot) {
    // Kente bunting on posts all round the rim; a djembe and a talking drum on each corner.
    const LIFT = 0.05;
    const P: Place = (x, y, z, yaw = 0) => new THREE.Matrix4().compose(V(spot.x + x, LIFT + y, spot.z + z), new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), yaw), V(1, 1, 1));
    const H = spot.corner ? 0.5 : 0.42;
    b.add(cyl(0.015, 0.02, H, 6), LIGHT_WOOD, P(0, H / 2, 0));
    b.add(sph(0.026, 1, 1, 1, 6), GOLD, P(0, H + 0.01, 0));
    const top = V(0, H - 0.02, 0);
    const swag = (dx: number, dz: number, start: number) => bunting(b, P, top, V(dx * 0.45, 0.28, dz * 0.45), 0.05, 3, 1.15, start, true);
    if (spot.corner) {
      swag(-Math.sign(spot.x), 0, spot.index);
      swag(0, -Math.sign(spot.z), spot.index + 2);
      const ox = Math.sign(spot.x) * 0.06;
      const oz = Math.sign(spot.z) * 0.06;
      djembeAt(b, P, ox - Math.sign(spot.x) * 0.1, 0, oz + Math.sign(spot.z) * 0.02, 0.38, RED);
      talkingDrumAt(b, P, ox + Math.sign(spot.x) * 0.02, 0, oz - Math.sign(spot.z) * 0.1, 0.32, LIGHT_WOOD);
      return;
    }
    const dx = Math.sin(spot.yaw);
    const dz = Math.cos(spot.yaw);
    swag(dx, dz, spot.index * 2);
    swag(-dx, -dz, spot.index * 2 + 3);
    // Something at the foot of every other post: savanna grass or a little basket.
    const ox = Math.cos(spot.yaw) * 0.05;
    const oz = -Math.sin(spot.yaw) * 0.05;
    if (spot.index % 3 === 0) basketAt(b, P, ox + dx * 0.08, 0, oz + dz * 0.08, 0.4, pick(['#ef6fa5', ORANGE, '#2bb3a6'], spot.index));
    else if (spot.index % 3 === 1) for (let i = 0; i < 5; i++) b.add(new THREE.ConeGeometry(0.01, 0.12, 4).translate(0, 0.06, 0).rotateZ(0.25).rotateY(i * 1.3), STRAW, P(ox + dx * 0.07, 0, oz + dz * 0.07));
    void glow;
  },
  station(b, f) {
    // Kente bunting between the roof's flagpoles and along the awning's edge, kente banners
    // either side of the clock.
    const P: Place = (x, y, z, yaw = 0) => f.m(x, y, z, 0, yaw, 0);
    const swags = (x0: number, x1: number, y: number, z: number, n: number, sag: number, size: number, flags: number) => {
      for (let i = 0; i < n; i++) {
        const a = x0 + (i / n) * (x1 - x0);
        const c = x0 + ((i + 1) / n) * (x1 - x0);
        bunting(b, P, V(a, y, z), V(c, y, z), sag, flags, size, i * flags);
      }
    };
    const pole = f.width / 2 - 0.15;
    swags(-pole, -0.27, f.roofY + 0.5, -0.02, 1, 0.1, 0.75, Math.max(2, Math.round((pole - 0.27) / 0.11)));
    swags(0.27, pole, f.roofY + 0.5, -0.02, 1, 0.1, 0.75, Math.max(2, Math.round((pole - 0.27) / 0.11)));
    const awnZ = f.awningZ + 0.17;
    swags(-f.width / 2 - 0.05, f.width / 2 + 0.05, f.awningY - 0.03, awnZ, Math.max(2, Math.round(f.width / 0.7)), 0.05, 0.6, 4);
    for (const [x, main] of [[-0.19, GREEN], [0.19, RED]] as const) {
      b.add(cyl(0.007, 0.007, 0.1, 5).rotateZ(Math.PI / 2), WOOD, f.m(x, f.roofY + 0.29, f.frontZ + 0.085));
      b.add(kenteStrip(0.085, 0.24, 0.008, 3, main), '#ffffff', f.m(x, f.roofY + 0.165, f.frontZ + 0.085));
      for (let i = 0; i < 3; i++) b.add(cyl(0.004, 0.004, 0.03, 3), GOLD, f.m(x - 0.03 + i * 0.03, f.roofY + 0.03, f.frontZ + 0.085));
    }
  },
  engine(b) {
    // A kente band round the boiler and a beaded band round the smokebox.
    const band = paintFaces(new THREE.CylinderGeometry(0.096, 0.096, 0.06, 24, 5, true), (x, y, z) =>
      Math.abs(y) > 0.019 ? INK : pick([RED, GOLD, GREEN, GOLD, BLUE, GOLD], Math.floor(mod(Math.atan2(z, x) / (Math.PI * 2), 1) * 24)));
    band.rotateZ(Math.PI / 2);
    b.add(band, '#ffffff', new THREE.Matrix4().makeTranslation(0.11, 0.215, 0));
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      b.sphere(0.011, pick([RED, GOLD, GREEN, BLUE, WHITE, GOLD], i), 0.235, 0.215 + Math.cos(a) * 0.095, Math.sin(a) * 0.095, 1, 1, 1, 6);
    }
  },
  light: { sunColor: '#ffd27a', sunIntensity: 2.9, hemiSky: '#ffeccc', hemiGround: '#8a5a2e' },
  fx: { kind: 'confetti', colors: [GOLD, GREEN, RED, BLUE], count: 45 },
};

export default skin;
