// Enkutatash (Ethiopian New Year, 11–12 September): the rains are over and the meadows burst into
// yellow Adey Abeba daisies. Daisy clumps and whole fields of them grow between the tracks and round
// the rim, children have painted greeting pictures on little easels and picked bouquets, a coffee
// ceremony is laid on freshly strewn grass (a jebena on its brazier, cups on a tray, popcorn), a
// basket of dabo bread waits, a kebero drum lies ready under green-yellow-red bunting, and chibo
// torch bundles glow for the evening. Daisies, bouquets, a jebena, coffee cups, a painted picture,
// popcorn, a loaf, a kebero drum, a torch bundle, a basket and a painted card ride in the wagons.
import * as THREE from 'three';
import type { GeoBatch } from '../batch';
import type { HolidaySkin, Item, PropContext } from '../holiday';
import { row } from '../holiday';
import { Kit, M, WHITE, shadeHex } from '../toyModels';

const DAISY = '#ffd21f';
const CENTER = '#e8830c';
const LEAF = '#2f9a3e';
const GRASS = '#5cc24a';
const FRESH = '#86d95e';
const FG = '#1fa046';
const FY = '#ffd21f';
const FR = '#e8303f';
const FLAG = [FG, FY, FR];
const WOOD = '#9a6232';
const WICKER = '#d9a052';
const CLAY = '#4a2e22';
const COFFEE = '#3a2014';
const STICK = '#b9a184';
const FLAME = '#ff8a1e';
const FLAME_IN = '#ffe14a';
const SKY = '#8fd6ff';
const PINK = '#ff6fae';
const TEAL = '#2bb3a6';
const PAPER = '#fff3d6';

type Build = (k: Kit, c: string) => void;
const pick = <T>(a: readonly T[], i: number): T => a[((i % a.length) + a.length) % a.length] as T;

/** A daisy outline: `n` round-tipped petals between `inner` and about (inner + outer) / 2. */
function flowerShape(n: number, inner: number, outer: number): THREE.Shape {
  const s = new THREE.Shape();
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2;
    const a1 = ((i + 1) / n) * Math.PI * 2;
    const am = (a0 + a1) / 2;
    if (i === 0) s.moveTo(Math.cos(a0) * inner, Math.sin(a0) * inner);
    s.quadraticCurveTo(Math.cos(am) * outer, Math.sin(am) * outer, Math.cos(a1) * inner, Math.sin(a1) * inner);
  }
  return s;
}

// ------------------------------------------------------------------------------------- cargo

/** Builds a model and tips its face (+z) up toward the camera so it reads on the goal card. */
const tilted = (build: Build, angle: number): Build => (k, c) => {
  const from = k.parts.length;
  build(k, c);
  const m = M(0, 0, 0, angle, 0, 0);
  for (const g of k.parts.slice(from)) g.applyMatrix4(m);
};

/** A small daisy head facing along its rotated +z, with an orange middle. */
function kitHead(k: Kit, r: number, x: number, y: number, z: number, rx: number, rz: number, petal = DAISY): void {
  k.shape(flowerShape(8, r * 0.3, r * 1.6), r * 0.15, petal, M(x, y, z, rx, 0, rz));
  const n = new THREE.Vector3(0, 0, 1).applyEuler(new THREE.Euler(rx, 0, rz)).multiplyScalar(r * 0.12);
  k.sph(r * 0.38, CENTER, x + n.x, y + n.y, z + n.z, 1, 1, 1, 6);
}

/** An Adey Abeba daisy: a big yellow flower on a stem with two leaves. */
function daisy(k: Kit, c: string): void {
  k.cyl(0.0016, 0.0018, 0.03, LEAF, 0, -0.014, 0, 0, 0, 0, 5);
  for (const s of [-1, 1]) k.add(new THREE.SphereGeometry(0.005, 6, 4), GRASS, M(s * 0.006, -0.02, 0, 0, 0, -s * 0.6, 0.6, 2.4, 0.9));
  k.shape(flowerShape(11, 0.0055, 0.031), 0.003, c, M(0, 0.012, 0));
  k.shape(flowerShape(11, 0.004, 0.021), 0.003, shadeHex(c, 14), M(0, 0.012, 0.0016, 0, 0, Math.PI / 11));
  k.sph(0.0064, CENTER, 0, 0.012, 0.0036, 1, 1, 0.6, 10);
  k.sph(0.003, shadeHex(CENTER, -25), 0, 0.012, 0.0068, 1, 1, 0.5, 6);
}

/** A child's bouquet: daisies in a paper cone tied with a red ribbon. */
function bouquet(k: Kit, c: string): void {
  k.cone(0.014, 0.034, c, 0, -0.008, 0, Math.PI, 0, 0, 10);
  k.cyl(0.0148, 0.0148, 0.003, shadeHex(c, 20), 0, 0.009, 0, 0, 0, 0, 10);
  k.tor(0.0076, 0.0018, FR, 0, -0.008, 0, Math.PI / 2, 0, 0, 10);
  for (const s of [-1, 1]) k.sph(0.0035, FR, s * 0.004, -0.008, 0.008, 1.4, 0.9, 0.6, 6);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.4;
    k.sph(0.0045, LEAF, Math.cos(a) * 0.013, 0.011, Math.sin(a) * 0.013, 1, 0.5, 1, 6);
    kitHead(k, 0.0062, Math.cos(a) * 0.009, 0.016, Math.sin(a) * 0.009, -Math.PI / 2 + Math.sin(a) * 0.55, -Math.cos(a) * 0.55);
  }
  kitHead(k, 0.0068, 0, 0.021, 0, -Math.PI / 2 + 0.25, 0);
}

/** A jebena: the round-bellied clay coffee pot with a long neck, a spout and a handle. */
function jebena(k: Kit, c: string): void {
  k.tor(0.009, 0.0028, WICKER, 0, -0.026, 0, Math.PI / 2, 0, 0, 10);
  k.sph(0.017, c, 0, -0.01, 0, 1, 0.92, 1, 12);
  k.tor(0.0158, 0.0012, shadeHex(c, 30), 0, -0.008, 0, Math.PI / 2, 0, 0, 14);
  k.cyl(0.0045, 0.0075, 0.024, c, 0, 0.014, 0, 0, 0, 0, 8);
  k.tor(0.005, 0.0016, shadeHex(c, 18), 0, 0.026, 0, Math.PI / 2, 0, 0, 8);
  k.sph(0.0042, WICKER, 0, 0.028, 0, 1, 0.9, 1, 6);
  k.cyl(0.0024, 0.0042, 0.022, c, 0.017, 0.002, 0, 0, 0, -0.75, 6);
  k.tor(0.0085, 0.0021, c, -0.006, 0.006, 0, 0, 0, Math.PI / 2, 8, Math.PI);
  for (let i = 0; i < 5; i++) k.sph(0.0018, FY, Math.cos(i * 1.25 - 0.5) * 0.0165, -0.012, Math.sin(i * 1.25 - 0.5) * 0.0165, 1, 1, 1, 5);
}

/** A sini: a handleless coffee cup on a saucer, with painted bands and dark coffee. */
function cup(k: Kit, c: string): void {
  k.cyl(0.024, 0.019, 0.004, c, 0, -0.02, 0, 0, 0, 0, 16);
  k.tor(0.022, 0.0013, FG, 0, -0.018, 0, Math.PI / 2, 0, 0, 16);
  k.cyl(0.017, 0.011, 0.026, c, 0, -0.005, 0, 0, 0, 0, 14);
  k.cyl(0.0155, 0.0155, 0.002, COFFEE, 0, 0.0085, 0, 0, 0, 0, 14);
  k.tor(0.0151, 0.0016, FR, 0, 0.002, 0, Math.PI / 2, 0, 0, 14);
  k.tor(0.0136, 0.0014, FY, 0, -0.004, 0, Math.PI / 2, 0, 0, 14);
  for (let i = 0; i < 4; i++) k.sph(0.0024, FG, Math.cos(i * 1.57 + 0.8) * 0.0142, -0.009, Math.sin(i * 1.57 + 0.8) * 0.0142, 1, 1, 1, 5);
}

/** A painted greeting picture: sun, hills and daisies in a frame on a little easel. */
function picture(k: Kit, c: string): void {
  for (const [x, z] of [[-0.012, 0.004], [0.012, 0.004], [0, -0.01]] as const) k.cyl(0.0014, 0.0014, 0.05, WOOD, x * 1.2, -0.004, z, z * 6, 0, -x * 6, 5);
  const P = (x: number, y: number, z: number) => M(x, y + 0.004, z + 0.004, -0.15, 0, 0);
  k.box(0.046, 0.036, 0.004, c, 0, 0.004, 0.003, -0.15, 0, 0);
  k.add(new THREE.BoxGeometry(0.036, 0.014, 0.002), SKY, P(0, 0.006, 0.0018));
  k.add(new THREE.BoxGeometry(0.036, 0.012, 0.002), GRASS, P(0, -0.007, 0.0018));
  k.add(new THREE.SphereGeometry(0.0045, 8, 5), FY, P(0.011, 0.008, 0.0028).multiply(M(0, 0, 0, 0, 0, 0, 1, 1, 0.4)));
  for (const [x, y] of [[-0.012, -0.005], [-0.004, -0.009], [0.005, -0.004], [0.013, -0.009]] as const) {
    k.add(new THREE.SphereGeometry(0.0028, 6, 4), FY, P(x, y, 0.0028).multiply(M(0, 0, 0, 0, 0, 0, 1, 1, 0.4)));
    k.add(new THREE.SphereGeometry(0.001, 4, 3), CENTER, P(x, y, 0.0036));
  }
  k.add(new THREE.SphereGeometry(0.004, 6, 4), FR, P(-0.009, 0.008, 0.0028).multiply(M(0, 0, 0, 0, 0, 0, 1.4, 0.6, 0.4)));
}

/** A hand-painted New Year card standing like a tent, a daisy and flag stripes on its front. */
function card(k: Kit, c: string): void {
  const t = 0.35;
  const on = (u: number, v: number, d: number) => M(0, -0.004, 0.006, -t, 0, 0).multiply(M(u, v, 0.0012 + d));
  k.add(new THREE.BoxGeometry(0.046, 0.036, 0.0024), c, M(0, -0.004, 0.006, -t, 0, 0));
  k.add(new THREE.BoxGeometry(0.046, 0.036, 0.0024), shadeHex(c, -18), M(0, -0.004, -0.006, t, 0, 0));
  k.add(new THREE.BoxGeometry(0.038, 0.028, 0.001), WHITE, on(0, 0, 0));
  FLAG.forEach((col, i) => k.add(new THREE.BoxGeometry(0.038, 0.004, 0.001), col, on(0, -0.0115 + i * 0.0042, 0.0006)));
  k.shape(flowerShape(9, 0.0035, 0.017), 0.0012, FY, on(-0.004, 0.0035, 0.001));
  k.add(new THREE.SphereGeometry(0.0034, 8, 5), CENTER, on(-0.004, 0.0035, 0.0018).multiply(M(0, 0, 0, 0, 0, 0, 1, 1, 0.5)));
  k.add(new THREE.SphereGeometry(0.0035, 8, 5), FR, on(0.012, 0.007, 0.0008).multiply(M(0, 0, 0, 0, 0, 0, 1, 1, 0.4)));
}

/** A bowl of fresh popcorn. */
function popcorn(k: Kit, c: string): void {
  k.cyl(0.011, 0.009, 0.004, c, 0, -0.024, 0, 0, 0, 0, 12);
  k.cyl(0.023, 0.012, 0.018, c, 0, -0.013, 0, 0, 0, 0, 14);
  k.tor(0.023, 0.0018, shadeHex(c, 30), 0, -0.004, 0, Math.PI / 2, 0, 0, 14);
  k.tor(0.0185, 0.0014, FY, 0, -0.012, 0, Math.PI / 2, 0, 0, 14);
  k.dome(0.021, '#fff2c8', 0, -0.005, 0, 1, 0.45, 1, 10);
  for (let i = 0; i < 16; i++) {
    const a = i * 2.4;
    const r = 0.003 + (i / 16) * 0.016;
    const y = -0.004 + 0.009 * Math.sqrt(Math.max(0, 1 - (r / 0.021) ** 2));
    k.sph(0.0036 + (i % 3) * 0.0006, i % 4 ? WHITE : '#ffe7a0', Math.cos(a) * r, y + 0.002, Math.sin(a) * r, 1, 0.85, 1, 5);
  }
}

/** A round loaf of dabo with a wheel scored on its top, on a white cloth. */
function bread(k: Kit, c: string): void {
  k.cyl(0.027, 0.027, 0.002, WHITE, 0, -0.019, 0, 0, 0, 0, 14);
  for (let i = 0; i < 3; i++) k.box(0.006, 0.0022, 0.003, FLAG[i] as string, -0.009 + i * 0.006, -0.019, 0.026);
  k.cyl(0.024, 0.024, 0.006, shadeHex(c, -12), 0, -0.015, 0, 0, 0, 0, 16);
  k.dome(0.024, c, 0, -0.012, 0, 1, 0.75, 1, 16);
  const top = (r: number) => -0.012 + 0.75 * Math.sqrt(0.024 ** 2 - r * r);
  k.tor(0.012, 0.0014, shadeHex(c, -28), 0, top(0.012), 0, Math.PI / 2, 0, 0, 14);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    k.add(new THREE.SphereGeometry(0.003, 6, 4), shadeHex(c, -28), M(Math.cos(a) * 0.0065, top(0.0065) + 0.0005, Math.sin(a) * 0.0065, 0, -a, 0, 2, 0.5, 0.5));
  }
  k.sph(0.0035, shadeHex(c, -28), 0, top(0) + 0.0005, 0, 1, 0.5, 1, 6);
}

/** A kebero drum lying on its side: two leather heads, laces and flag-coloured bands. */
function kebero(k: Kit, c: string): void {
  const hide = '#f3e2c0';
  k.cyl(0.015, 0.019, 0.034, c, 0, 0, 0, 0, 0, Math.PI / 2, 14);
  k.cyl(0.0158, 0.0158, 0.003, hide, -0.0175, 0, 0, 0, 0, Math.PI / 2, 14);
  k.cyl(0.0198, 0.0198, 0.003, hide, 0.0175, 0, 0, 0, 0, Math.PI / 2, 14);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    k.box(0.034, 0.0012, 0.0012, hide, 0, Math.cos(a) * 0.0176, Math.sin(a) * 0.0176, a, 0, (i % 2 ? 1 : -1) * 0.05);
  }
  FLAG.forEach((col, i) => k.tor(0.0158 + i * 0.0012, 0.0016, col, -0.006 + i * 0.006, 0, 0, 0, Math.PI / 2, 0, 14));
  k.tor(0.012, 0.0014, '#3b2a20', 0, 0.019, 0, 0, 0, 0, 10, Math.PI);
}

/** A chibo: a bundle of dry sticks tied with flag-coloured ribbons, flaming at the top. */
function torch(k: Kit, c: string): void {
  for (let i = 0; i < 7; i++) {
    const a = (i / 6) * Math.PI * 2;
    const r = i === 6 ? 0 : 0.0068;
    k.cyl(0.0042, 0.0036, 0.042, i % 2 ? c : shadeHex(c, -14), Math.cos(a) * r, -0.006, Math.sin(a) * r, Math.sin(a) * 0.08, 0, -Math.cos(a) * 0.08, 6);
  }
  FLAG.forEach((col, i) => k.tor(0.0108, 0.0026, col, 0, -0.018 + i * 0.011, 0, Math.PI / 2, 0, 0, 10));
  k.sph(0.0115, FLAME, 0, 0.019, 0, 1, 0.8, 1, 8);
  k.cone(0.0115, 0.024, FLAME, 0, 0.03, 0, 0, 0, 0, 8);
  k.cone(0.007, 0.018, FLAME_IN, 0, 0.03, 0.005, 0, 0, 0, 7);
}

/** A woven mesob basket with its pointed lid, in coloured bands. */
function basket(k: Kit, c: string): void {
  k.cyl(0.011, 0.013, 0.008, c, 0, -0.023, 0, 0, 0, 0, 12);
  k.cyl(0.02, 0.012, 0.018, c, 0, -0.01, 0, 0, 0, 0, 14);
  k.cone(0.021, 0.024, shadeHex(c, 10), 0, 0.012, 0, 0, 0, 0, 14);
  k.sph(0.0035, FY, 0, 0.025, 0, 1, 1, 1, 6);
  FLAG.forEach((col, i) => k.tor(0.0175 - i * 0.002, 0.0015, col, 0, -0.004 - i * 0.005, 0, Math.PI / 2, 0, 0, 14));
  k.tor(0.0135, 0.0014, WHITE, 0, 0.008, 0, Math.PI / 2, 0, 0, 14);
  k.tor(0.0075, 0.0013, FY, 0, 0.0155, 0, Math.PI / 2, 0, 0, 12);
}

// ------------------------------------------------------------------------------------- props

/** A cargo model drawn ten times bigger (like `toy:` props), standing on the floor. */
function put(ctx: PropContext, build: Build, c: string, x = 0, z = 0, yaw = 0, size = 1, dy = 0): void {
  const k = new Kit();
  build(k, c);
  let min = Infinity;
  for (const g of k.parts) {
    g.computeBoundingBox();
    min = Math.min(min, (g.boundingBox as THREE.Box3).min.y);
  }
  const mtx = ctx.m(x, -min * 10 * size + dy, z, yaw, 10 * size);
  for (const g of k.parts) ctx.b.addColored(g, mtx);
}

let petalGeo: THREE.BufferGeometry | null = null;
let middleGeo: THREE.BufferGeometry | null = null;

/** A daisy head of radius about `r`, lying flat (facing +y) in `base`'s frame, tipped by rx / rz. */
function head(b: GeoBatch, base: THREE.Matrix4, r: number, rx = 0, rz = 0, petal = DAISY): void {
  petalGeo ??= new THREE.ExtrudeGeometry(flowerShape(10, 0.35, 1.6), { depth: 0.14, bevelEnabled: false, curveSegments: 2 }).rotateX(-Math.PI / 2);
  middleGeo ??= new THREE.SphereGeometry(0.36, 8, 3, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.7, 1).translate(0, 0.12, 0);
  const m = base.clone().multiply(M(0, 0, 0, rx, 0, rz, r, r, r));
  b.add(petalGeo, petal, m);
  b.add(middleGeo, CENTER, m);
}

/** A clump of Adey Abeba: a leafy mound with daisies nodding on stems. */
function clump({ b, m, mr, variant }: PropContext): void {
  b.add(new THREE.SphereGeometry(0.16, 10, 5).scale(1.2, 0.4, 1), LEAF, m(0, 0, 0));
  for (let i = 0; i < 7; i++) {
    const a = i * 0.9 + variant;
    b.add(new THREE.SphereGeometry(0.04, 6, 4).scale(0.5, 2.4, 1), i % 2 ? GRASS : LEAF, mr(Math.cos(a) * 0.12, 0.07, Math.sin(a) * 0.1, Math.sin(a) * 0.5, -a, -Math.cos(a) * 0.5));
  }
  const n = 5 + (variant % 3);
  for (let i = 0; i < n; i++) {
    const a = i * 2.4 + variant;
    const r = i ? 0.05 + (i % 3) * 0.045 : 0;
    const h = 0.17 + ((i * 5 + variant) % 4) * 0.045;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    b.add(new THREE.CylinderGeometry(0.008, 0.01, h, 5), LEAF, m(x, h / 2, z));
    head(b, m(x, h, z), 0.065, Math.sin(a) * 0.45, -Math.cos(a) * 0.45);
  }
}

/** A meadow patch thick with daisies after the rains. */
function meadow({ b, m, variant }: PropContext): void {
  b.add(new THREE.CylinderGeometry(0.5, 0.52, 0.014, 20), FRESH, m(0, 0.007, 0));
  for (let i = 0; i < 12; i++) {
    const a = i * 2.4 + variant;
    const r = 0.1 + ((i * 7) % 11) * 0.033;
    b.add(new THREE.ConeGeometry(0.03, 0.09, 4), i % 2 ? GRASS : LEAF, m(Math.cos(a) * r, 0.05, Math.sin(a) * r));
  }
  for (let i = 0; i < 26; i++) {
    const a = i * 2.4 + 1 + variant;
    const r = 0.06 + ((i * 5) % 13) * 0.033;
    const h = 0.025 + (i % 3) * 0.025;
    if (h > 0.03) b.add(new THREE.CylinderGeometry(0.005, 0.005, h, 4), LEAF, m(Math.cos(a) * r, h / 2, Math.sin(a) * r));
    head(b, m(Math.cos(a) * r, h, Math.sin(a) * r), 0.036 + (i % 2) * 0.01, Math.sin(a) * 0.3, Math.cos(a) * 0.3);
  }
}

/** A stick from a to b (prop units). */
function stick(ctx: PropContext, a: [number, number, number], bb: [number, number, number], r: number, col: string): void {
  const va = new THREE.Vector3(...a);
  const vb = new THREE.Vector3(...bb);
  const d = vb.clone().sub(va);
  const e = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()));
  const mid = va.add(vb).multiplyScalar(0.5);
  ctx.b.add(new THREE.CylinderGeometry(r, r, 1, 5), col, ctx.mr(mid.x, mid.y, mid.z, e.x, e.y, e.z, 1, d.length(), 1));
}

/** A child's greeting picture on an easel, facing +x; the variant picks the painting. */
function easel(ctx: PropContext): void {
  const { b, variant } = ctx;
  stick(ctx, [0.06, 0, 0.17], [0.0, 0.8, 0.05], 0.014, WOOD);
  stick(ctx, [0.06, 0, -0.17], [0.0, 0.8, -0.05], 0.014, WOOD);
  stick(ctx, [-0.26, 0, 0], [-0.02, 0.76, 0], 0.014, WOOD);
  const frame = pick([FR, '#4a90d9', FG, PINK], variant);
  const cm = ctx.mr(0.07, 0.56, 0, 0, 0, 0.12);
  const at = (u: number, v: number, d = 0) => cm.clone().multiply(M(0.02 + d, v, u));
  b.add(new THREE.BoxGeometry(0.06, 0.03, 0.56), WOOD, cm.clone().multiply(M(0.02, -0.22, 0)));
  b.add(new THREE.BoxGeometry(0.025, 0.4, 0.52), frame, cm);
  b.add(new THREE.BoxGeometry(0.01, 0.34, 0.44), WHITE, at(0, 0, -0.005));
  const box = (w: number, h: number, u: number, v: number, col: string, d = 0, rz = 0) => b.add(new THREE.BoxGeometry(0.006, h, w), col, at(u, v, d).multiply(M(0, 0, 0, rz, 0, 0)));
  const dot = (r: number, u: number, v: number, col: string, d = 0.004) => b.add(new THREE.SphereGeometry(r, 8, 6).scale(0.3, 1, 1), col, at(u, v, d));
  const daisies = (v: number, n: number) => {
    for (let i = 0; i < n; i++) {
      const u = -0.17 + (i / (n - 1)) * 0.34;
      const vv = v + (i % 2) * 0.03;
      for (let p = 0; p < 6; p++) dot(0.014, u + Math.cos(p * 1.05) * 0.018, vv + Math.sin(p * 1.05) * 0.018, FY);
      dot(0.011, u, vv, CENTER, 0.007);
    }
  };
  switch (variant % 4) {
    case 0:
      // Sun over green hills, daisies in front.
      box(0.44, 0.17, 0, 0.085, SKY);
      box(0.44, 0.17, 0, -0.085, GRASS);
      dot(0.05, 0.12, 0.09, FY);
      dot(0.08, -0.1, -0.02, shadeHex(GRASS, -12), 0.002);
      daisies(-0.1, 4);
      break;
    case 1:
      // A little red train on a green line through the meadow.
      box(0.44, 0.34, 0, 0, '#bfe9ff');
      box(0.44, 0.08, 0, -0.13, GRASS, 0.001);
      box(0.16, 0.08, -0.05, -0.03, FR, 0.003);
      box(0.06, 0.12, -0.1, 0.0, FR, 0.003);
      box(0.03, 0.05, 0.02, 0.03, '#3b2a20', 0.003);
      for (const u of [-0.11, -0.05, 0.02]) dot(0.022, u, -0.075, '#3b2a20', 0.008);
      for (const u of [0.1, 0.15]) dot(0.022 + (u - 0.1), u, 0.09 + (u - 0.1) * 0.6, WHITE, 0.006);
      daisies(-0.14, 3);
      break;
    case 2:
      // One huge daisy filling the picture.
      box(0.44, 0.34, 0, 0, '#9fd8ff');
      box(0.012, 0.16, 0, -0.1, LEAF, 0.002);
      for (let p = 0; p < 10; p++) dot(0.034, Math.cos(p * 0.628) * 0.07, 0.04 + Math.sin(p * 0.628) * 0.07, FY);
      dot(0.04, 0, 0.04, CENTER, 0.008);
      break;
    default:
      // Green, yellow and red stripes like a rainbow, and a smiling sun.
      box(0.44, 0.34, 0, 0, WHITE);
      FLAG.forEach((col, i) => box(0.44, 0.06, 0, 0.09 - i * 0.07, col, 0.002));
      dot(0.05, 0.13, 0.11, FY, 0.006);
      daisies(-0.13, 4);
  }
}

/** A clay vase holding a bouquet of daisies. */
function vase({ b, m, mr, variant }: PropContext): void {
  const pot = pick([CLAY, '#b4542c', TEAL], variant);
  b.add(new THREE.SphereGeometry(0.08, 10, 8).scale(1, 0.95, 1), pot, m(0, 0.08, 0));
  b.add(new THREE.CylinderGeometry(0.035, 0.045, 0.08, 10), pot, m(0, 0.18, 0));
  b.add(new THREE.TorusGeometry(0.04, 0.01, 4, 10).rotateX(Math.PI / 2), shadeHex(pot, 20), m(0, 0.22, 0));
  FLAG.forEach((col, i) => b.add(new THREE.TorusGeometry(0.079 - Math.abs(i - 1) * 0.006, 0.006, 4, 14).rotateX(Math.PI / 2), col, m(0, 0.06 + i * 0.022, 0)));
  for (let i = 0; i < 7; i++) {
    const a = (i / 6) * Math.PI * 2;
    const lean = i === 6 ? 0 : 0.42;
    const h = i === 6 ? 0.26 : 0.2;
    const tip = new THREE.Vector3(Math.cos(a) * Math.sin(lean) * h, 0.2 + Math.cos(lean) * h, Math.sin(a) * Math.sin(lean) * h);
    b.add(new THREE.CylinderGeometry(0.006, 0.006, h, 4), LEAF, mr(tip.x / 2, 0.2 + (tip.y - 0.2) / 2, tip.z / 2, Math.sin(a) * lean, 0, -Math.cos(a) * lean));
    head(b, m(tip.x, tip.y, tip.z), 0.055, Math.sin(a) * lean * 1.2, -Math.cos(a) * lean * 1.2);
    if (i < 6) b.add(new THREE.SphereGeometry(0.03, 6, 4).scale(0.45, 1.8, 1), GRASS, mr(Math.cos(a + 0.5) * 0.05, 0.25, Math.sin(a + 0.5) * 0.05, Math.sin(a) * 0.7, 0, -Math.cos(a) * 0.7));
  }
}

/** The coffee ceremony: fresh grass strewn on the floor, a jebena on its brazier, cups on a tray, popcorn. */
function coffee(ctx: PropContext): void {
  const { b, glow, m, mr } = ctx;
  b.add(new THREE.CylinderGeometry(0.5, 0.5, 0.012, 20), FRESH, m(0, 0.006, 0));
  for (let i = 0; i < 34; i++) {
    const a = i * 2.4;
    const r = 0.06 + ((i * 7) % 13) * 0.033;
    b.add(new THREE.BoxGeometry(0.12, 0.008, 0.014), i % 3 ? GRASS : LEAF, mr(Math.cos(a) * r, 0.014, Math.sin(a) * r, 0, a * 1.7, 0.05));
  }
  for (const [x, z] of [[-0.38, -0.26], [0.4, 0.12], [-0.05, 0.4], [0.3, -0.36]] as const) head(b, m(x, 0.02, z), 0.04);
  // The rekebot (low coffee table) with a tray of cups.
  b.add(new THREE.BoxGeometry(0.34, 0.14, 0.26), WOOD, m(0.12, 0.07, -0.1));
  b.add(new THREE.BoxGeometry(0.26, 0.08, 0.01), shadeHex(WOOD, -18), m(0.12, 0.07, 0.031));
  b.add(new THREE.BoxGeometry(0.36, 0.02, 0.28), shadeHex(WOOD, 14), m(0.12, 0.15, -0.1));
  b.add(new THREE.CylinderGeometry(0.15, 0.15, 0.014, 16), WICKER, m(0.12, 0.167, -0.1));
  for (let i = 0; i < 6; i++) {
    const x = 0.05 + (i % 3) * 0.07;
    const z = -0.135 + Math.floor(i / 3) * 0.07;
    b.add(new THREE.CylinderGeometry(0.026, 0.017, 0.038, 10), WHITE, m(x, 0.193, z));
    b.add(new THREE.CylinderGeometry(0.023, 0.023, 0.004, 10), COFFEE, m(x, 0.211, z));
    b.add(new THREE.TorusGeometry(0.0235, 0.004, 3, 10).rotateX(Math.PI / 2), pick(FLAG, i), m(x, 0.198, z));
  }
  // The brazier with glowing coals and the jebena on top.
  b.add(new THREE.CylinderGeometry(0.075, 0.055, 0.1, 10), '#7a4a32', m(-0.24, 0.05, 0.06));
  glow.add(new THREE.SphereGeometry(0.066, 10, 4, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.35, 1), FLAME, m(-0.24, 0.1, 0.06));
  put(ctx, jebena, CLAY, -0.24, 0.06, 0.4, 0.5, 0.1);
  // A bowl of popcorn and a low stool.
  put(ctx, popcorn, PINK, 0.22, 0.24, 0, 0.55);
  b.add(new THREE.CylinderGeometry(0.075, 0.065, 0.025, 12), WICKER, m(-0.26, 0.11, -0.28));
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    b.add(new THREE.CylinderGeometry(0.012, 0.012, 0.11, 5), WOOD, mr(-0.26 + Math.cos(a) * 0.045, 0.05, -0.28 + Math.sin(a) * 0.045, Math.sin(a) * 0.2, 0, -Math.cos(a) * 0.2));
  }
}

/** A wide woven basket with a loaf of dabo on a cloth. */
function breadBasket(ctx: PropContext): void {
  const { b, m } = ctx;
  b.add(new THREE.CylinderGeometry(0.24, 0.17, 0.09, 16), WICKER, m(0, 0.045, 0));
  FLAG.forEach((col, i) => b.add(new THREE.TorusGeometry(0.2 + i * 0.016, 0.01, 4, 16).rotateX(Math.PI / 2), col, m(0, 0.025 + i * 0.025, 0)));
  b.add(new THREE.BoxGeometry(0.34, 0.012, 0.34), WHITE, m(0, 0.094, 0, 0.5));
  put(ctx, bread, '#e89a3a', 0, 0, 0, 0.8, 0.1);
}

const drum = (ctx: PropContext) => put(ctx, kebero, FR, 0, 0, 0, 1);

/** A chibo torch bundle stuck in the ground, its tip burning (unlit glow). */
function chibo({ b, glow, m, mr, variant }: PropContext): void {
  const lean = ((variant % 3) - 1) * 0.08;
  b.add(new THREE.SphereGeometry(0.1, 8, 4).scale(1, 0.4, 1), '#8a5a2e', m(0, 0, 0));
  for (let i = 0; i < 7; i++) {
    const a = (i / 6) * Math.PI * 2;
    const r = i === 6 ? 0 : 0.032;
    b.add(new THREE.CylinderGeometry(0.016, 0.02, 0.62, 5), i % 2 ? STICK : shadeHex(STICK, -16), mr(Math.cos(a) * r, 0.31, Math.sin(a) * r, Math.sin(a) * 0.05, 0, lean - Math.cos(a) * 0.05));
  }
  FLAG.forEach((col, i) => b.add(new THREE.TorusGeometry(0.052, 0.013, 4, 10).rotateX(Math.PI / 2), col, mr(-lean * (0.16 + i * 0.13), 0.16 + i * 0.13, 0, 0, 0, lean)));
  const tip = -Math.sin(lean) * 0.64;
  glow.add(new THREE.ConeGeometry(0.075, 0.2, 8), FLAME, m(tip, 0.72, 0));
  glow.add(new THREE.ConeGeometry(0.045, 0.14, 7), FLAME_IN, m(tip, 0.7, 0));
  glow.add(new THREE.SphereGeometry(0.06, 8, 5), FLAME, m(tip, 0.64, 0));
}

/** Green, yellow and red pennants on a string between two poles (along x). */
function bunting({ b, m }: PropContext): void {
  const half = 0.65;
  for (const x of [-half, half]) {
    b.add(new THREE.CylinderGeometry(0.016, 0.02, 0.66, 6), WOOD, m(x, 0.33, 0));
    head(b, m(x, 0.66, 0), 0.05);
  }
  const sag = (x: number) => 0.62 - 0.14 * (1 - (x / half) ** 2);
  const n = 10;
  for (let i = 0; i < n; i++) {
    const x0 = -half + (i / n) * half * 2;
    const x1 = x0 + (half * 2) / n;
    const y0 = sag(x0);
    const y1 = sag(x1);
    const len = Math.hypot(x1 - x0, y1 - y0);
    b.add(new THREE.BoxGeometry(len + 0.004, 0.008, 0.008), WHITE, m((x0 + x1) / 2, (y0 + y1) / 2, 0).multiply(new THREE.Matrix4().makeRotationZ(Math.atan2(y1 - y0, x1 - x0))));
    const xm = (x0 + x1) / 2;
    const g = new THREE.ExtrudeGeometry(new THREE.Shape([new THREE.Vector2(-0.05, 0), new THREE.Vector2(0.05, 0), new THREE.Vector2(0, -0.12)]), { depth: 0.008, bevelEnabled: false }).translate(0, 0, -0.004);
    b.add(g, pick(FLAG, i), m(xm, sag(xm) + 0.002, 0));
  }
}

// ------------------------------------------------------------------------------------- the skin

const skin: HolidaySkin = {
  id: 'enkutatash',
  name: 'Enkutatash',
  greeting: 'Melkam Addis Amet!',
  cargo: { yellow: tilted(daisy, -1.1), green: bouquet, brown: jebena, white: cup, blue: tilted(picture, -0.2), pink: popcorn, orange: bread, red: kebero, gray: torch, teal: basket, purple: card },
  props: {
    'enk.daisies': clump,
    'enk.meadow': meadow,
    'enk.easel': easel,
    'enk.vase': vase,
    'enk.coffee': coffee,
    'enk.bread': breadBasket,
    'enk.drum': drum,
    'enk.torch': chibo,
    'enk.bunting': bunting,
  },
  inside: [
    { name: 'daisyMeadow', w: 2, h: 2, items: [['enk.meadow', 0, 0, 0, 1.8, 0, 0], ['enk.daisies', -0.5, -0.4, 0, 1.3, 0, 0], ['enk.daisies', 0.5, 0.35, 1, 1.4, 0, 1], ['enk.daisies', 0.5, -0.5, 2, 1.1, 0, 2], ['enk.vase', -0.45, 0.45, 0, 1.1, 0, 0], ['toy:duck', 0.0, 0.0, 0.3, 0.75]] },
    { name: 'coffeeCeremony', w: 2, h: 2, items: [['enk.coffee', 0, 0, 0, 1.35], ['enk.daisies', 0.72, -0.62, 0, 0.9, 0, 1], ['enk.daisies', -0.72, 0.62, 0, 0.9, 0, 2], ['enk.bread', 0.66, 0.55, 0, 0.9]] },
    { name: 'paintings', w: 2, h: 1, items: [['enk.easel', -0.55, -0.05, -1.25, 1.1, 0, 0], ['enk.easel', 0.15, -0.1, -1.85, 1.1, 0, 1], ['enk.vase', 0.72, 0.18, 0, 1, 0, 1], ['toy:drum', -0.05, 0.3, 0.2, 0.5]] },
    { name: 'drumAndBunting', w: 2, h: 1, items: [['enk.bunting', 0, -0.2, 0, 1.05], ['enk.drum', -0.35, 0.15, 0.3, 1], ['enk.bread', 0.3, 0.12, 0, 0.9], ['enk.daisies', 0.8, 0.2, 0, 0.8, 0, 2], ['enk.daisies', -0.85, 0.15, 0, 0.8, 0, 0]] },
    { name: 'torches', w: 2, h: 1, items: [...row(3, 0.6, 'enk.torch', 1.05, 0, -0.12).map((it, i): Item => [it[0], it[1], it[2], it[3], it[4], 0, i]), ['enk.daisies', -0.3, 0.25, 0, 0.8, 0, 1], ['enk.daisies', 0.3, 0.25, 0, 0.8, 0, 2]] },
  ],
  outside: [
    { name: 'bigMeadow', w: 2.4, h: 0, items: [['enk.meadow', 0, 0, 0, 4.6, 0, 1], ['enk.daisies', 1.2, 0.6, 0, 2.8, 0, 0], ['enk.daisies', -1.3, 0.4, 1, 2.6, 0, 1], ['enk.daisies', 0.3, -1.4, 2, 2.4, 0, 2], ['enk.daisies', -0.6, 1.4, 3, 2.2, 0, 1], ['toy:duck', 0, 0, 0.4, 3.2], ['enk.vase', 1.6, -0.9, 0, 2.4, 0, 2]] },
    { name: 'coffee', w: 2.2, h: 0, items: [['enk.coffee', 0, 0, 0.3, 3.4], ['enk.bread', 1.9, 0.3, 0, 2.2], ['enk.torch', -1.8, -0.6, 0, 2.6, 0, 1], ['enk.daisies', -1.6, 1, 0, 2.4, 0, 2]] },
    { name: 'gallery', w: 2.4, h: 0, items: [['enk.bunting', 0, -0.9, 0, 3], ['enk.easel', -1, 0, -1.4, 2.8, 0, 2], ['enk.easel', 0.8, 0.1, -1.8, 2.8, 0, 3], ['enk.drum', 0, 1, 0.4, 2.4], ['enk.daisies', 1.9, 0.8, 0, 2.4, 0, 1]] },
  ],
  edge(b, glow, spot) {
    const c = Math.cos(spot.yaw);
    const sn = Math.sin(spot.yaw);
    const at = (x: number, y: number, z: number) => new THREE.Matrix4().compose(new THREE.Vector3(spot.x + x * c + z * sn, y, spot.z - x * sn + z * c), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), spot.yaw), new THREE.Vector3(1, 1, 1));
    if (spot.corner) {
      // A chibo torch in a big daisy clump on each corner.
      b.add(new THREE.SphereGeometry(0.15, 10, 5).scale(1, 0.45, 1), LEAF, at(0.02, 0.02, 0));
      for (let i = 0; i < 5; i++) {
        const a = i * 1.26 + 0.3;
        const x = 0.02 + Math.cos(a) * 0.1;
        const z = Math.sin(a) * 0.1;
        b.add(new THREE.CylinderGeometry(0.006, 0.006, 0.12, 4), LEAF, at(x, 0.08, z));
        head(b, at(x, 0.14, z), 0.05, Math.sin(a) * 0.5, -Math.cos(a) * 0.5);
      }
      for (let i = 0; i < 5; i++) b.add(new THREE.CylinderGeometry(0.011, 0.013, 0.34, 5), i % 2 ? STICK : shadeHex(STICK, -16), at(0.02 + Math.cos(i * 1.26) * 0.018, 0.17, Math.sin(i * 1.26) * 0.018));
      b.add(new THREE.TorusGeometry(0.03, 0.009, 4, 10).rotateX(Math.PI / 2), pick(FLAG, spot.index), at(0.02, 0.2, 0));
      glow.add(new THREE.ConeGeometry(0.045, 0.13, 8), FLAME, at(0.02, 0.4, 0));
      glow.add(new THREE.SphereGeometry(0.04, 8, 5), FLAME_IN, at(0.02, 0.35, 0));
      return;
    }
    // A leafy bank along the rim with Adey Abeba nodding out of it.
    b.add(new THREE.CapsuleGeometry(0.07, 0.62, 3, 8).rotateX(Math.PI / 2).scale(1, 0.75, 1), LEAF, at(0.02, 0.03, 0));
    for (let i = 0; i < 6; i++) {
      const z = -0.33 + i * 0.132;
      const h = 0.11 + ((i + spot.index) % 3) * 0.04;
      const x = 0.02 + (i % 2 ? 0.035 : -0.025);
      b.add(new THREE.CylinderGeometry(0.007, 0.007, h, 4), LEAF, at(x, h / 2, z));
      head(b, at(x, h, z), 0.065, (i - 2.5) * 0.12, -0.4);
      b.add(new THREE.SphereGeometry(0.03, 6, 4).scale(0.5, 1.8, 1), GRASS, at(x + 0.025, 0.07, z + 0.06));
    }
  },
  station(b, f) {
    // A daisy garland along the eaves, flag bunting along the awning and daisy wreaths by the clock.
    for (let x = -f.width / 2, i = 0; x <= f.width / 2 + 0.001; x += 0.1, i++) {
      b.add(new THREE.SphereGeometry(0.035, 8, 6), i % 2 ? GRASS : LEAF, f.m(x, f.roofY + 0.005, f.frontZ + 0.03));
      if (i % 2 === 0) head(b, f.m(x, f.roofY + 0.0, f.frontZ + 0.06), 0.03, 1.25, 0);
    }
    const n = Math.max(4, Math.round(f.width / 0.15));
    const sag = (t: number) => f.awningY - 0.02 - 0.05 * Math.sin(Math.PI * ((t * 3) % 1));
    for (let i = 0; i < n; i++) {
      const t0 = i / n;
      const t1 = (i + 1) / n;
      const x0 = -f.width / 2 + t0 * f.width;
      const x1 = -f.width / 2 + t1 * f.width;
      const y0 = sag(t0);
      const y1 = sag(t1 - 1e-6);
      b.add(new THREE.BoxGeometry(Math.hypot(x1 - x0, y1 - y0) + 0.004, 0.007, 0.007), WHITE, f.m((x0 + x1) / 2, (y0 + y1) / 2, f.awningZ + 0.02, 0, 0, Math.atan2(y1 - y0, x1 - x0)));
      const xm = (x0 + x1) / 2;
      b.add(new THREE.ExtrudeGeometry(new THREE.Shape([new THREE.Vector2(-0.04, 0), new THREE.Vector2(0.04, 0), new THREE.Vector2(0, -0.09)]), { depth: 0.006, bevelEnabled: false }), pick(FLAG, i), f.m(xm, sag((t0 + t1) / 2) + 0.002, f.awningZ + 0.017));
    }
    for (const x of [-0.42, 0.42]) {
      b.add(new THREE.TorusGeometry(0.075, 0.022, 6, 14), LEAF, f.m(x, 0.36, f.frontZ + 0.02));
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        head(b, f.m(x + Math.cos(a) * 0.075, 0.36 + Math.sin(a) * 0.075, f.frontZ + 0.04), 0.024, Math.PI / 2, 0);
      }
    }
  },
  engine(b) {
    // A bouquet of daisies in a paper cone on the cab roof.
    const base = new THREE.Matrix4().compose(new THREE.Vector3(-0.17, 0.42, 0), new THREE.Quaternion(), new THREE.Vector3(1.35, 1.35, 1.35));
    const at = (x: number, y: number, z: number, rx = 0, rz = 0) => base.clone().multiply(M(x, y, z, rx, 0, rz));
    b.add(new THREE.ConeGeometry(0.05, 0.12, 10).rotateX(Math.PI), PAPER, at(0, 0.075, 0));
    b.add(new THREE.TorusGeometry(0.026, 0.008, 4, 10).rotateX(Math.PI / 2), FR, at(0, 0.06, 0));
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      b.add(new THREE.SphereGeometry(0.018, 6, 4).scale(0.6, 1.6, 1), LEAF, at(Math.cos(a + 0.5) * 0.045, 0.14, Math.sin(a + 0.5) * 0.045, Math.sin(a) * 0.7, -Math.cos(a) * 0.7));
      head(b, at(Math.cos(a) * 0.035, 0.145, Math.sin(a) * 0.035), 0.02, Math.sin(a) * 0.55, -Math.cos(a) * 0.55);
    }
    head(b, at(0, 0.16, 0), 0.022);
  },
  light: { sunColor: '#fffbe6', hemiSky: '#e2f5ff', hemiGround: '#dff2b0' },
  fx: { kind: 'petals', colors: ['#ffd21f', '#ffe45c', '#ffc400', '#fff3a0'], count: 60 },
};

export default skin;
