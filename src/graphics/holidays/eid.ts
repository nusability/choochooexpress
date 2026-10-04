// Eid (Eid al-Fitr and Eid al-Adha, three days each): an early-evening family celebration. Fanous
// lanterns glow in every colour, strings of lights with little lanterns run round the diorama, a
// gold crescent and star hang under an arch of lights, a low table is laid with dates, maamoul,
// ka'ak, baklava and tea, and gift bags, new clothes and balloons wait for the children. Lanterns,
// crescents, dates, cookies, teapots, gift bags, balloons, sweets, stars and tea glasses ride the wagons.
import * as THREE from 'three';
import type { HolidaySkin, PropContext } from '../holiday';
import { row, type Item } from '../holiday';
import { M, WHITE, shadeHex, starShape, type Kit } from '../toyModels';

const GOLD = '#f2c23a';
const GOLD_DARK = '#c8901e';
const BRASS = '#e0a93a';
const SILVER = '#dfe4ec';
const FLAME = '#ffe066';
const TEA = '#b8471c';
const DATE = '#6b3216';
const DOUGH = '#f0c987';
const PISTACHIO = '#7cc35a';
const WOOD = '#8a4a26';
const GLASS = ['#3f7fe0', '#e8263c', '#22b5a6', '#9b4dd6', '#ff8a1e', '#ff3d8b', '#2fbf5a'];
const LIGHTS = ['#ff4d6d', '#ffd23f', '#4dd9ff', '#7dff6a', '#ff9a1f', '#d68bff'];
const BALLOONS = ['#e8263c', '#3f7fe0', '#ffd23f', '#ff3d8b', '#22b5a6', '#9b4dd6', '#ff8a1e'];

const pick = <T>(a: readonly T[], i: number): T => a[((i % a.length) + a.length) % a.length] as T;

/** A crescent: a disc of radius r with a disc of radius r2 at +d cut away (opening toward +x). */
function crescentShape(r: number, r2: number, d: number, n = 14): THREE.Shape {
  const x = (r * r - r2 * r2 + d * d) / (2 * d);
  const y = Math.sqrt(Math.max(0, r * r - x * x));
  const a0 = Math.atan2(y, x);
  const b0 = Math.atan2(y, x - d);
  const s = new THREE.Shape();
  for (let i = 0; i <= n; i++) {
    const a = a0 + (i / n) * (Math.PI * 2 - 2 * a0);
    if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  for (let i = 1; i < n; i++) {
    const b = Math.PI * 2 - b0 - (i / n) * (Math.PI * 2 - 2 * b0);
    s.lineTo(d + Math.cos(b) * r2, Math.sin(b) * r2);
  }
  s.closePath();
  return s;
}

const extrude = (s: THREE.Shape, depth: number) => new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 6 }).translate(0, 0, -depth / 2);

// ------------------------------------------------------------------------------------- cargo

/** A fanous: a hexagonal lantern of coloured glass in a gold frame, a warm light inside. */
function fanous(k: Kit, c: string): void {
  k.cyl(0.012, 0.009, 0.006, GOLD, 0, -0.025, 0, 0, 0, 0, 6);
  k.cyl(0.014, 0.012, 0.024, c, 0, -0.01, 0, 0, 0, 0, 6);
  k.cyl(0.0145, 0.0125, 0.008, FLAME, 0, -0.01, 0, 0, 0, 0, 6);
  for (const y of [-0.022, 0.002]) k.cyl(0.015, 0.015, 0.003, GOLD, 0, y, 0, 0, 0, 0, 6);
  k.cyl(0.004, 0.016, 0.012, GOLD, 0, 0.009, 0, 0, 0, 0, 6);
  k.sph(0.005, GOLD_DARK, 0, 0.017, 0, 1, 1, 1, 6);
  k.tor(0.004, 0.0012, GOLD, 0, 0.024, 0, 0, 0, 0, 8);
}

/** A gold crescent ornament with a little star in its arms and a hanging loop. */
function crescent(k: Kit, c: string): void {
  k.shape(crescentShape(0.025, 0.019, 0.013), 0.012, c, M(-0.004, 0, 0), 0.0015);
  k.shape(starShape(0.009, 0.004), 0.008, shadeHex(c, 25), M(0.012, 0.001, 0));
  k.tor(0.004, 0.0012, GOLD_DARK, -0.004, 0.027, 0, 0, 0, 0, 8);
}

/** A turquoise bowl heaped with shiny dates. */
function dateBowl(k: Kit, c: string): void {
  k.add(new THREE.SphereGeometry(0.024, 12, 5, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), '#22b5a6', M(0, -0.004, 0, 0, 0, 0, 1, 0.7, 1));
  k.tor(0.0235, 0.0022, GOLD, 0, -0.004, 0, Math.PI / 2, 0, 0, 14);
  const dates: [number, number, number, number][] = [[-0.01, -0.001, -0.007, 0.3], [0.01, -0.001, -0.006, -0.5], [-0.009, -0.001, 0.009, 1.2], [0.01, -0.001, 0.009, 2], [0, 0.007, 0.001, 0.8]];
  dates.forEach(([x, y, z, ry], i) => k.add(new THREE.SphereGeometry(0.0085, 8, 6).scale(1.7, 0.9, 0.9), i % 2 ? c : shadeHex(c, -20), M(x, y, z, 0, ry, 0)));
  k.sph(0.0018, WHITE, 0.002, 0.0125, 0.003, 1, 1, 1, 4);
}

/** A domed maamoul with a golden pressed pattern and sugar dusting. */
function maamoul(k: Kit, c: string): void {
  k.cyl(0.022, 0.022, 0.008, DOUGH, 0, -0.018, 0, 0, 0, 0, 14);
  k.dome(0.022, c, 0, -0.014, 0, 1, 0.95, 1, 14);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    k.add(new THREE.SphereGeometry(0.0032, 5, 4), DOUGH, M(Math.cos(a) * 0.016, -0.004, Math.sin(a) * 0.016, 0, -a, 0, 2.2, 1, 1));
  }
  k.tor(0.009, 0.002, DOUGH, 0, 0.0055, 0, Math.PI / 2, 0, 0, 12);
  k.sph(0.004, DOUGH, 0, 0.008, 0, 1, 0.6, 1, 6);
}

/** A round-bellied teapot with a gold lid and a curved spout. */
function teapot(k: Kit, c: string): void {
  k.sph(0.018, c, 0, -0.006, 0, 1.1, 0.9, 1.1, 12);
  k.cyl(0.012, 0.014, 0.004, GOLD, 0, -0.021, 0, 0, 0, 0, 12);
  k.tor(0.0185, 0.0018, GOLD, 0, -0.004, 0, Math.PI / 2, 0, 0, 14);
  k.dome(0.009, GOLD, 0, 0.009, 0, 1, 0.9, 1, 10);
  k.sph(0.003, GOLD_DARK, 0, 0.019, 0, 1, 1, 1, 6);
  k.cyl(0.0025, 0.0045, 0.022, c, 0.024, 0.0, 0, 0, 0, -0.9, 6);
  k.tor(0.009, 0.0025, c, -0.02, -0.004, 0, 0, 0, Math.PI / 2, 10, Math.PI);
}

/** A gift bag with rope handles, tissue paper poking out and a gold star on the front. */
function giftBag(k: Kit, c: string): void {
  k.box(0.03, 0.034, 0.02, c, 0, -0.01, 0);
  k.box(0.031, 0.004, 0.021, shadeHex(c, -25), 0, 0.006, 0);
  for (const s of [-1, 1]) k.tor(0.007, 0.0012, GOLD, 0, 0.008, s * 0.006, 0, 0, 0, 10, Math.PI);
  for (const [x, rz, col] of [[-0.006, 0.4, '#ffd23f'], [0.004, -0.3, WHITE], [0.0, 0.05, '#22b5a6']] as const) k.cone(0.007, 0.016, col, x, 0.012, 0, 0, 0.6, rz, 4);
  k.shape(starShape(0.0075, 0.0033), 0.002, GOLD, M(0, -0.011, 0.0105));
  k.shape(starShape(0.0075, 0.0033), 0.002, GOLD, M(0.0155, -0.011, 0, 0, Math.PI / 2, 0));
}

/** A balloon on a curly string, with a shine. */
function balloon(k: Kit, c: string): void {
  k.sph(0.017, c, 0, 0.008, 0, 0.95, 1.12, 0.95, 12);
  k.cone(0.004, 0.005, shadeHex(c, -20), 0, -0.0125, 0, Math.PI, 0, 0, 6);
  k.sph(0.004, WHITE, 0.007, 0.016, 0.01, 0.8, 1.3, 0.6, 6);
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 8; i++) pts.push(new THREE.Vector3(Math.sin(i * 1.4) * 0.003, -0.015 - i * 0.0018, 0));
  k.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.0008, 3), WHITE);
}

/** A silver tray of baklava diamonds with pistachio on top. */
function sweetsTray(k: Kit, c: string): void {
  k.cyl(0.027, 0.024, 0.004, SILVER, 0, -0.016, 0, 0, 0, 0, 16);
  k.tor(0.026, 0.0018, SILVER, 0, -0.013, 0, Math.PI / 2, 0, 0, 16);
  const diamond = new THREE.CylinderGeometry(0.009, 0.009, 0.008, 4).scale(1, 1, 0.65);
  for (const [x, z] of [[-0.012, -0.007], [0.0, -0.007], [0.012, -0.007], [-0.006, 0.006], [0.006, 0.006], [-0.018, 0.006], [0.018, 0.006], [0, 0.018], [0, -0.019]] as const) {
    k.add(diamond.clone(), c, M(x, -0.009, z));
    k.sph(0.0022, PISTACHIO, x, -0.004, z, 1, 0.6, 1, 4);
  }
}

/** A gold-rimmed eight-pointed star ornament. */
function starOrnament(k: Kit, c: string): void {
  k.shape(starShape(0.025, 0.014, 8), 0.007, c, M(0, -0.002, 0), 0.0015);
  k.cyl(0.0085, 0.0085, 0.011, GOLD, 0, -0.002, 0, Math.PI / 2, 0, 0, 12);
  k.tor(0.004, 0.0012, GOLD_DARK, 0, 0.026, 0, 0, 0, 0, 8);
}

/** A coloured tea glass with gold bands and amber tea, on a little gold saucer with a mint sprig. */
function teaGlass(k: Kit, c: string): void {
  k.cyl(0.019, 0.016, 0.003, GOLD, 0, -0.023, 0, 0, 0, 0, 14);
  k.cyl(0.0125, 0.009, 0.03, c, 0, -0.006, 0, 0, 0, 0, 12);
  k.cyl(0.0122, 0.0122, 0.001, TEA, 0, 0.0095, 0, 0, 0, 0, 12);
  for (const y of [-0.016, -0.004, 0.006]) k.cyl(0.0123, 0.0115, 0.0025, GOLD, 0, y, 0, 0, 0, 0, 12);
  for (const [x, z] of [[0.003, 0.002], [-0.003, -0.001]] as const) k.sph(0.0035, '#2f8a46', x, 0.011, z, 1.4, 0.4, 0.8, 5);
}

// ------------------------------------------------------------------------------------- props

type Place = (x: number, y: number, z: number) => THREE.Matrix4;
type Batch = PropContext['b'];

/** A fanous lantern about 0.55 tall in `place`'s units: gold frame, glowing glass panels. */
function lantern(b: Batch, glow: Batch, place: Place, col: string): void {
  b.add(new THREE.CylinderGeometry(0.1, 0.07, 0.06, 6), GOLD, place(0, 0.03, 0));
  glow.add(new THREE.CylinderGeometry(0.115, 0.1, 0.22, 6), col, place(0, 0.17, 0));
  for (const y of [0.065, 0.28]) b.add(new THREE.CylinderGeometry(0.125, 0.125, 0.025, 6), GOLD, place(0, y, 0));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    b.add(new THREE.BoxGeometry(0.018, 0.22, 0.018), GOLD, place(Math.sin(a) * 0.112, 0.17, Math.cos(a) * 0.112));
    const f = a + Math.PI / 6;
    // A brighter heart on each pane, as if the light inside shone through.
    glow.add(new THREE.BoxGeometry(0.05, 0.11, 0.004).rotateY(f), shadeHex(col, 70), place(Math.sin(f) * 0.097, 0.17, Math.cos(f) * 0.097));
  }
  b.add(new THREE.CylinderGeometry(0.03, 0.13, 0.11, 6), GOLD, place(0, 0.345, 0));
  glow.add(new THREE.CylinderGeometry(0.045, 0.1, 0.05, 6), shadeHex(col, 30), place(0, 0.34, 0));
  b.add(new THREE.SphereGeometry(0.04, 8, 6), GOLD_DARK, place(0, 0.42, 0));
  b.add(new THREE.ConeGeometry(0.018, 0.07, 6), GOLD, place(0, 0.48, 0));
  b.add(new THREE.TorusGeometry(0.025, 0.007, 4, 10), GOLD, place(0, 0.53, 0));
}

/** A crescent and star, about 0.5 across in `place`'s units, opening toward +x. */
function moonAndStar(b: Batch, place: Place, col = GOLD, depth = 0.06): void {
  b.add(extrude(crescentShape(0.24, 0.2, 0.11), depth), col, place(-0.04, 0, 0));
  b.add(extrude(starShape(0.08, 0.035), depth * 0.8), shadeHex(col, 20), place(0.12, 0.01, 0));
}

/** Glowing bulbs on a sagging string from (x0, y, z0) to (x1, y, z1). */
function stringLights(glow: Batch, b: Batch, place: Place, x0: number, z0: number, x1: number, z1: number, y: number, sag: number, n: number, r: number, seed = 0): void {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p = new THREE.Vector3(x0 + (x1 - x0) * t, y - sag * 4 * t * (1 - t), z0 + (z1 - z0) * t);
    pts.push(p);
    if (i > 0 && i < n) glow.add(new THREE.SphereGeometry(r, 6, 4).scale(1, 1.3, 1), pick(LIGHTS, i + seed), place(p.x, p.y - r * 1.2, p.z));
  }
  b.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n * 2, r * 0.18, 3), '#3a3a42', place(0, 0, 0));
}

/** A thin rod from a to b (strings, poles). */
function rod(b: Batch, mr: PropContext['mr'], a: THREE.Vector3, c: THREE.Vector3, r: number, col: string): void {
  const d = c.clone().sub(a);
  const len = d.length();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  const e = new THREE.Euler().setFromQuaternion(q);
  const mid = a.clone().add(c).multiplyScalar(0.5);
  b.add(new THREE.CylinderGeometry(r, r, 1, 4), col, mr(mid.x, mid.y, mid.z, e.x, e.y, e.z, 1, len, 1));
}

const sub = (m: PropContext['m'], ox: number, oy: number, oz: number, k: number): Place => (x, y, z) => m(ox + x * k, oy + y * k, oz + z * k, 0, k);

/** A standing fanous lantern, about 0.55 tall at scale 1. */
function fanousProp({ b, glow, m, variant }: PropContext): void {
  lantern(b, glow, sub(m, 0, 0, 0, 1), pick(GLASS, variant));
}

/** Three lanterns of different sizes, set out together as a little parade. */
function lanternTrio({ b, glow, m, variant }: PropContext): void {
  lantern(b, glow, sub(m, -0.28, 0, 0.05, 0.75), pick(GLASS, variant));
  lantern(b, glow, sub(m, 0, 0, -0.05, 1.05), pick(GLASS, variant + 2));
  lantern(b, glow, sub(m, 0.27, 0, 0.08, 0.6), pick(GLASS, variant + 4));
}

/** A low round table with a brass tray, laid for the Eid morning: tea, dates, maamoul, ka'ak, baklava. */
function feastTable({ b, m }: PropContext): void {
  b.add(new THREE.CylinderGeometry(0.3, 0.34, 0.17, 8), WOOD, m(0, 0.085, 0));
  b.add(new THREE.CylinderGeometry(0.31, 0.31, 0.03, 8), '#22b5a6', m(0, 0.1, 0));
  b.add(new THREE.CylinderGeometry(0.44, 0.42, 0.03, 20), BRASS, m(0, 0.185, 0));
  b.add(new THREE.TorusGeometry(0.43, 0.014, 4, 22).rotateX(Math.PI / 2), GOLD_DARK, m(0, 0.2, 0));
  const top = 0.2;
  // The teapot in the middle with four tea glasses round it.
  b.add(new THREE.SphereGeometry(0.065, 12, 8).scale(1.1, 0.85, 1.1), SILVER, m(0, top + 0.055, 0));
  b.add(new THREE.SphereGeometry(0.035, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), GOLD, m(0, top + 0.1, 0));
  b.add(new THREE.SphereGeometry(0.012, 6, 4), GOLD_DARK, m(0, top + 0.14, 0));
  b.add(new THREE.CylinderGeometry(0.008, 0.016, 0.09, 6).rotateZ(-0.9), SILVER, m(0.09, top + 0.075, 0));
  b.add(new THREE.TorusGeometry(0.035, 0.009, 4, 10, Math.PI).rotateZ(Math.PI / 2), SILVER, m(-0.07, top + 0.06, 0));
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i / 4) * Math.PI * 2;
    const x = Math.cos(a) * 0.17;
    const z = Math.sin(a) * 0.17;
    b.add(new THREE.CylinderGeometry(0.032, 0.03, 0.006, 10), GOLD, m(x, top + 0.003, z));
    b.add(new THREE.CylinderGeometry(0.022, 0.016, 0.06, 8), pick(['#2fbf5a', '#e8263c', '#3f7fe0', '#9b4dd6'], i), m(x, top + 0.035, z));
    b.add(new THREE.CylinderGeometry(0.021, 0.021, 0.004, 8), TEA, m(x, top + 0.064, z));
  }
  const plate = (x: number, z: number, col = WHITE) => b.add(new THREE.CylinderGeometry(0.095, 0.08, 0.016, 14), col, m(x, top + 0.008, z));
  // Dates in a turquoise bowl.
  b.add(new THREE.SphereGeometry(0.09, 12, 4, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).scale(1, 0.55, 1), '#22b5a6', m(0.28, top + 0.05, 0));
  for (let i = 0; i < 7; i++) {
    const a = i * 2.3;
    const r = i ? 0.045 : 0;
    b.add(new THREE.SphereGeometry(0.026, 8, 5).scale(1.7, 0.9, 0.9), i % 2 ? DATE : '#8a4220', m(0.28 + Math.cos(a) * r, top + 0.058 + (i ? 0 : 0.02), Math.sin(a) * r, a));
  }
  // Maamoul domes.
  plate(-0.28, 0);
  for (const [x, z] of [[-0.31, -0.035], [-0.25, -0.035], [-0.31, 0.035], [-0.25, 0.035], [-0.28, 0]] as const) {
    const y = x === -0.28 ? top + 0.045 : top + 0.016;
    b.add(new THREE.SphereGeometry(0.03, 10, 4, 0, Math.PI * 2, 0, Math.PI / 2), '#f6ead2', m(x, y, z));
    b.add(new THREE.TorusGeometry(0.014, 0.004, 3, 10).rotateX(Math.PI / 2), DOUGH, m(x, y + 0.022, z));
  }
  // Ka'ak rings with sesame.
  plate(0, 0.28);
  for (const [x, z, a] of [[-0.035, 0.26, 0.2], [0.035, 0.27, -0.3], [0, 0.31, 0.8]] as const) {
    b.add(new THREE.TorusGeometry(0.03, 0.011, 4, 12).rotateX(Math.PI / 2), '#d99a4e', m(x, top + 0.025 + (z > 0.3 ? 0.012 : 0), z, a));
  }
  // Baklava diamonds with pistachio on a silver tray.
  plate(0, -0.28, SILVER);
  const diamond = new THREE.CylinderGeometry(0.03, 0.03, 0.025, 4).scale(1, 1, 0.65);
  for (const [x, z] of [[-0.035, -0.3], [0.035, -0.3], [0, -0.255], [0, -0.345]] as const) {
    b.add(diamond, '#f39c34', m(x, top + 0.028, z));
    b.add(new THREE.SphereGeometry(0.008, 5, 3), PISTACHIO, m(x, top + 0.042, z));
  }
}

/** A rectangular carpet with a border and a medallion, tassels at the ends (about 1.4 × 0.95). */
function carpet({ b, m, variant }: PropContext): void {
  const field = pick(['#c8283c', '#2a4fa8', '#7a2a8a'], variant);
  b.add(new THREE.BoxGeometry(1.4, 0.014, 0.95), GOLD, m(0, 0.007, 0));
  b.add(new THREE.BoxGeometry(1.32, 0.016, 0.87), field, m(0, 0.008, 0));
  b.add(new THREE.BoxGeometry(1.18, 0.018, 0.73), shadeHex(field, -25), m(0, 0.009, 0));
  b.add(new THREE.CylinderGeometry(0.3, 0.3, 0.02, 4).scale(1.4, 1, 0.9), GOLD, m(0, 0.01, 0));
  b.add(new THREE.CylinderGeometry(0.24, 0.24, 0.022, 4).scale(1.4, 1, 0.9), '#22b5a6', m(0, 0.011, 0));
  b.add(new THREE.CylinderGeometry(0.1, 0.1, 0.024, 8), '#ffd23f', m(0, 0.012, 0));
  for (const s of [-1, 1]) {
    for (let i = 0; i < 9; i++) b.add(new THREE.BoxGeometry(0.05, 0.008, 0.02), WHITE, m(s * 0.72, 0.004, -0.4 + i * 0.1));
    b.add(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 4), '#ffd23f', m(s * 0.48, 0.01, 0));
  }
}

/** Gift bags with tissue paper and a wrapped box of new clothes with a ribbon. */
function giftBags({ b, m, variant }: PropContext): void {
  const bags: [number, number, number, number][] = [[-0.2, 0, 0.26, 0.2], [0.02, -0.06, 0.32, -0.1], [0.24, 0.06, 0.22, 0.3]];
  bags.forEach(([x, z, h, yaw], i) => {
    const c = pick(['#ff3d8b', '#3f7fe0', '#2fbf5a', '#9b4dd6', '#ff8a1e'], variant + i);
    b.add(new THREE.BoxGeometry(0.18, h, 0.11), c, m(x, h / 2, z, yaw));
    b.add(new THREE.BoxGeometry(0.182, 0.025, 0.112), shadeHex(c, -30), m(x, h - 0.012, z, yaw));
    b.add(new THREE.TorusGeometry(0.05, 0.008, 3, 10, Math.PI), GOLD, m(x, h, z, yaw));
    for (const [dx, col] of [[-0.03, '#ffd23f'], [0.03, WHITE]] as const) b.add(new THREE.ConeGeometry(0.04, 0.09, 4), col, m(x + dx, h + 0.035, z, yaw + dx * 10));
    b.add(new THREE.ExtrudeGeometry(starShape(0.04, 0.018), { depth: 0.01, bevelEnabled: false }), GOLD, m(x, h * 0.45, z + 0.055, yaw));
  });
  // New clothes in a flat box, a shirt folded on the lid.
  b.add(new THREE.BoxGeometry(0.34, 0.07, 0.24), '#fff3d6', m(0.0, 0.035, 0.26));
  b.add(new THREE.BoxGeometry(0.345, 0.072, 0.04), '#e8263c', m(0.0, 0.035, 0.26));
  b.add(new THREE.BoxGeometry(0.2, 0.025, 0.16), '#4dc3ff', m(0.0, 0.082, 0.26));
  b.add(new THREE.BoxGeometry(0.06, 0.03, 0.03), WHITE, m(0.0, 0.09, 0.19));
  for (const s of [-1, 1]) b.add(new THREE.TorusGeometry(0.03, 0.01, 4, 8), '#e8263c', m(s * 0.03 + 0.12, 0.08, 0.26, s * 0.5));
}

/** A bunch of balloons tied to a little weight. */
function balloonBunch({ b, mr, m, variant }: PropContext): void {
  b.add(new THREE.CylinderGeometry(0.05, 0.06, 0.06, 8), GOLD, m(0, 0.03, 0));
  const tie = new THREE.Vector3(0, 0.06, 0);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.4;
    const p = new THREE.Vector3(Math.cos(a) * 0.17, 0.62 + (i % 3) * 0.1, Math.sin(a) * 0.17);
    rod(b, mr, tie, p.clone().setY(p.y - 0.12), 0.004, WHITE);
    const c = pick(BALLOONS, variant + i);
    b.add(new THREE.SphereGeometry(0.11, 12, 9).scale(0.95, 1.15, 0.95), c, m(p.x, p.y, p.z));
    b.add(new THREE.ConeGeometry(0.02, 0.03, 6).rotateX(Math.PI), shadeHex(c, -20), m(p.x, p.y - 0.13, p.z));
    b.add(new THREE.SphereGeometry(0.025, 6, 4).scale(0.8, 1.3, 0.6), WHITE, m(p.x + 0.045, p.y + 0.05, p.z + 0.06));
  }
}

/** An arch of string lights between two posts, lanterns and a gold crescent and star hanging from it. */
function lightArch({ b, glow, m, mr, variant }: PropContext): void {
  const H = 0.95;
  for (const s of [-1, 1]) {
    b.add(new THREE.CylinderGeometry(0.07, 0.08, 0.05, 8), GOLD_DARK, m(s * 0.62, 0.025, 0));
    b.add(new THREE.CylinderGeometry(0.02, 0.025, H, 8), WHITE, m(s * 0.62, H / 2, 0));
    b.add(new THREE.SphereGeometry(0.035, 8, 6), GOLD, m(s * 0.62, H + 0.02, 0));
  }
  stringLights(glow, b, (x, y, z) => m(x, y, z), -0.62, 0, 0.62, 0, H - 0.02, 0.16, 14, 0.022, variant);
  const sagAt = (x: number) => {
    const t = (x + 0.62) / 1.24;
    return H - 0.02 - 0.16 * 4 * t * (1 - t);
  };
  for (const x of [-0.34, 0.34]) {
    const y = sagAt(x);
    rod(b, mr, new THREE.Vector3(x, y, 0), new THREE.Vector3(x, y - 0.1, 0), 0.003, '#3a3a42');
    lantern(b, glow, sub(m, x, y - 0.29, 0, 0.36), pick(GLASS, variant + (x > 0 ? 3 : 0)));
  }
  const y = sagAt(0);
  rod(b, mr, new THREE.Vector3(0, y, 0), new THREE.Vector3(0, y - 0.08, 0), 0.003, '#3a3a42');
  moonAndStar(glow, sub(m, 0, y - 0.2, 0, 0.55), GOLD, 0.05);
}

/** A big glowing crescent and star on a stand, little bulbs round its base. */
function moonStand({ b, glow, m }: PropContext): void {
  b.add(new THREE.CylinderGeometry(0.12, 0.15, 0.06, 10), GOLD_DARK, m(0, 0.03, 0));
  b.add(new THREE.CylinderGeometry(0.018, 0.022, 0.5, 6), GOLD, m(0, 0.3, 0));
  moonAndStar(glow, sub(m, 0, 0.78, 0, 1), GOLD, 0.06);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    glow.add(new THREE.SphereGeometry(0.02, 6, 4), pick(LIGHTS, i), m(Math.cos(a) * 0.135, 0.065, Math.sin(a) * 0.135));
  }
}

// ------------------------------------------------------------------------------------- the skin

const skin: HolidaySkin = {
  id: 'eid',
  name: 'Eid',
  greeting: 'Eid Mubarak!',
  cargo: { blue: fanous, yellow: crescent, brown: dateBowl, white: maamoul, teal: teapot, pink: giftBag, red: balloon, orange: sweetsTray, purple: starOrnament, green: teaGlass },
  props: {
    'eid.fanous': fanousProp,
    'eid.lanterns': lanternTrio,
    'eid.table': feastTable,
    'eid.carpet': carpet,
    'eid.gifts': giftBags,
    'eid.balloons': balloonBunch,
    'eid.arch': lightArch,
    'eid.moon': moonStand,
  },
  inside: [
    { name: 'eidFeast', w: 2, h: 2, items: [['eid.carpet', 0, 0, 0, 1.15], ['eid.table', 0, 0, 0, 1.05], ['pillow', -0.62, 0.05, 0, 0.36], ['pillow', 0.62, 0.05, 0, 0.36], ['pillow', 0, -0.48, Math.PI / 2, 0.32], ['eid.fanous', 0.72, -0.62, 0, 1.1, 0, 1], ['eid.balloons', -0.7, 0.62, 0, 0.6, 0, 2]] },
    { name: 'eidArch', w: 2, h: 1, items: [['eid.arch', 0, 0, 0, 1.25], ['toy:drum', -0.2, 0.15, 0.4, 0.7], ['toy:car', 0.22, 0.1, 'face', 0.6]] },
    { name: 'eidLanterns', w: 2, h: 1, items: [['eid.lanterns', -0.4, 0, 0, 1.15, 0, 0], ['eid.moon', 0.55, -0.05, 0, 1]] },
    { name: 'eidGifts', w: 2, h: 2, items: [['eid.gifts', -0.15, -0.1, 0.3, 1.35, 0, 0], ['eid.balloons', 0.55, -0.5, 0, 0.8, 0, 0], ['toy:block', 0.55, 0.45, 'face', 0.6], ['toy:dice', -0.55, 0.6, 'face', 0.55], ['eid.fanous', -0.65, -0.55, 0, 1.05, 0, 3]] },
  ],
  outside: [
    { name: 'eidFamily', w: 2.4, h: 0, items: [['eid.carpet', 0, 0, 0, 3.2], ['eid.table', 0, 0, 0, 2.8], ['pillow', -1.75, 0.1, 0, 1], ['pillow', 1.75, 0.1, 0, 1], ['eid.lanterns', 0, -1.6, 0, 2.4], ['eid.balloons', 1.9, 1.3, 0, 2.2, 0, 1]] },
    { name: 'eidLights', w: 2.4, h: 0, items: [['eid.arch', 0, -0.4, 0, 3.2], ['eid.gifts', -0.5, 0.6, 0.2, 2.6, 0, 1], ['eid.moon', 1.5, 0.9, 0, 2.2], ...row(3, 0.9, 'eid.fanous', 1.7, 0, 1.6).map((it, i): Item => [it[0], it[1], it[2], it[3], it[4], 0, i * 2])] },
    { name: 'eidLanternParade', w: 2.2, h: 0, items: [['eid.fanous', -1.1, 0, 0, 3.4, 0, 0], ['eid.fanous', 0, -0.3, 0, 4, 0, 2], ['eid.fanous', 1.1, 0.1, 0, 3, 0, 4], ['eid.balloons', 0.4, 1.3, 0, 2, 0, 3], ['toy:teddy', -0.5, 1.2, 'face', 2.4]] },
  ],
  edge(b, glow, spot) {
    const LIFT = 0.05;
    const K = 1.3;
    const c = Math.cos(spot.yaw);
    const s = Math.sin(spot.yaw);
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), spot.yaw);
    const at = (x: number, y: number, z: number, k = 1) => new THREE.Matrix4().compose(new THREE.Vector3(spot.x + x * c + z * s, LIFT + y * K, spot.z - x * s + z * c), q, new THREE.Vector3(k * K, k * K, k * K));
    const place = (ox: number, oy: number, oz: number, k: number): Place => (x, y, z) => at(ox + x * k, oy + y * k, oz + z * k, k);
    if (spot.corner) {
      // A big lantern stands on each corner.
      lantern(b, glow, place(0.02, 0, 0, 0.62), pick(GLASS, spot.index));
      return;
    }
    // A post with a little lantern hanging off a bracket; the string of lights runs post to post.
    const P = 0.4;
    b.add(new THREE.CylinderGeometry(0.012, 0.015, P, 6), WHITE, at(0, P / 2, 0));
    b.add(new THREE.SphereGeometry(0.02, 6, 5), GOLD, at(0, P + 0.01, 0));
    b.add(new THREE.BoxGeometry(0.13, 0.014, 0.014), GOLD, at(0.065, P - 0.03, 0));
    b.add(new THREE.CylinderGeometry(0.002, 0.002, 0.03, 3), '#3a3a42', at(0.12, P - 0.05, 0));
    lantern(b, glow, place(0.12, P - 0.26, 0, 0.36), pick(GLASS, spot.index));
    // Half a scallop each way, lowest where it meets the next post's string.
    const pts: THREE.Vector3[] = [];
    const n = 10;
    for (let i = 0; i <= n; i++) {
      const z = -0.45 + (i / n) * 0.9;
      const y = P - 0.01 - 0.12 * (1 - Math.cos((Math.PI * z) / 0.45)) / 2;
      pts.push(new THREE.Vector3(0, y, z));
      if (i % 2 === 1) glow.add(new THREE.SphereGeometry(0.026, 6, 4).scale(1, 1.3, 1), pick(LIGHTS, spot.index * 3 + i), at(0, y - 0.03, z));
    }
    b.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.004, 3), '#3a3a42', at(0, 0, 0));
  },
  station(b, f, glow) {
    // Scallops of lights along the awning's front edge between its posts, a lantern hanging in each
    // bay, and a glowing crescent and star standing on the roof either side of the clock.
    const len = f.width + 0.1;
    const z = f.awningZ + 0.17;
    const y = f.awningY - 0.05;
    const fm: Place = (x, yy, zz) => f.m(x, yy, zz);
    for (let i = 0; i < len; i++) {
      const x0 = -len / 2 + 0.05 + i * ((len - 0.1) / len);
      const x1 = -len / 2 + 0.05 + (i + 1) * ((len - 0.1) / len);
      stringLights(glow, b, fm, x0, z, x1, z, y, 0.07, 7, 0.026, i * 3);
      b.add(new THREE.SphereGeometry(0.02, 6, 4), GOLD, f.m(x0, y, z));
      const mx = (x0 + x1) / 2;
      b.add(new THREE.CylinderGeometry(0.003, 0.003, 0.05, 3), '#3a3a42', f.m(mx, y - 0.095, z));
      const k = 0.34;
      lantern(b, glow, (lx, ly, lz) => f.m(mx + lx * k, y - 0.31 + ly * k, z + lz * k).multiply(new THREE.Matrix4().makeScale(k, k, k)), pick(GLASS, i * 2 + 1));
    }
    b.add(new THREE.SphereGeometry(0.02, 6, 4), GOLD, f.m(len / 2 - 0.05, y, z));
    for (const x of [-0.5, 0.5]) {
      b.add(new THREE.CylinderGeometry(0.008, 0.008, 0.16, 5), GOLD_DARK, f.m(x, f.roofY + 0.18, 0.1));
      const k = 0.36;
      moonAndStar(glow, (lx, ly, lz) => f.m(x + lx * k, f.roofY + 0.33 + ly * k, 0.1 + lz * k).multiply(new THREE.Matrix4().makeScale(k, k, k)), GOLD, 0.06);
    }
  },
  engine(b) {
    // A gold crescent and star on the cab roof, a swag of coloured bulbs from the chimney to the cab.
    const mm: Place = (x, y, z) => new THREE.Matrix4().compose(new THREE.Vector3(-0.17 + x * 0.32, 0.56 + y * 0.32, z * 0.32), new THREE.Quaternion(), new THREE.Vector3(0.32, 0.32, 0.32));
    b.cylinder(0.006, 0.006, 0.08, GOLD_DARK, -0.17, 0.46, 0, 6);
    moonAndStar(b, mm, GOLD, 0.08);
    for (const z of [-0.06, 0.06]) {
      for (let i = 1; i < 8; i++) {
        const t = i / 8;
        b.sphere(0.014, pick(LIGHTS, i + (z > 0 ? 1 : 0)), 0.19 - t * 0.33, 0.38 + t * 0.04 - 0.06 * 4 * t * (1 - t), z, 1, 1.25, 1, 6);
      }
    }
  },
  light: { background: '#2b2456', sunColor: '#ffc68a', sunIntensity: 2.0, hemiSky: '#ffc4b0', hemiGround: '#4a3064', hemiIntensity: 0.98 },
  fx: { kind: 'sparkles', colors: ['#ffd23f', '#f2c23a', '#fff3a0'], count: 55 },
};

export default skin;
