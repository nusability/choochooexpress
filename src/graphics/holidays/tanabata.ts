// Tanabata (the Star Festival, 7 July): a summer evening when everyone writes a wish on a coloured
// paper strip and ties it to a bamboo branch. Wish bamboos stand dressed with tanzaku strips, paper
// chains, paper stars, origami cranes and kusudama balls trailing long fukinagashi streamers; a little
// writing table is laid with blank strips, brushes and ink; a milky way of glowing star pieces runs
// between two paper cranes who meet across it; and there is a summer fair: a yo-yo balloon pool,
// goldfish in bags, watermelon slices and paper fans. Bamboo sticks with tanzaku line the rim,
// streamers hang from the station's eaves and the engine carries a bamboo sprig. Star sparkles
// twinkle in the dim evening air. Lanterns, fans, stars, cranes and the rest ride in the wagons.
import * as THREE from 'three';
import type { GeoBatch } from '../batch';
import type { HolidaySkin, PropContext } from '../holiday';
import { ring, row } from '../holiday';
import { INK, M, WHITE, polygon, shadeHex, starShape, type Kit } from '../toyModels';

const RED = '#e8263c';
const GOLD = '#f2c23a';
const BAMBOO = '#5fae3a';
const NODE = '#3f8a2a';
const LEAF = '#4cc44a';
const CANE = '#d8b56a';
const WOOD = '#8a4a26';
const STRING = '#5b4a3a';
const WATER = '#4fb8ff';
const FISH = '#ff5a1e';
const PAPER = ['#ff3b5c', '#ffd23f', '#3fb8ff', '#7ed957', '#b06bff', '#ff8a1e', '#ff6fb5', '#ffffff'];
const STARS = ['#fff3a0', '#ffd23f', '#9fd8ff', '#ffffff', '#ffb3e6'];

const pick = <T>(a: readonly T[], i: number): T => a[((i % a.length) + a.length) % a.length] as T;

// ------------------------------------------------------------------------------------- cargo

/** A tall paper lantern (chochin): ribbed paper between black caps, with a hanging loop. */
function chochin(k: Kit, c: string): void {
  k.sph(0.017, c, 0, -0.002, 0, 1, 1.3, 1, 12);
  for (const y of [-0.014, -0.006, 0.002, 0.01]) k.tor(0.0172 * Math.cos(y * 38), 0.0011, shadeHex(c, -28), 0, y, 0, Math.PI / 2, 0, 0, 14);
  k.cyl(0.009, 0.009, 0.005, INK, 0, 0.02, 0, 0, 0, 0, 10);
  k.cyl(0.009, 0.009, 0.005, INK, 0, -0.024, 0, 0, 0, 0, 10);
  k.tor(0.005, 0.0012, INK, 0, 0.026, 0, 0, 0, 0, 8);
  k.sph(0.004, '#fff3a0', 0.009, 0.0, 0.013, 1, 1.4, 0.5, 6);
}

/** An uchiwa fan: a round paper face on bamboo ribs with a handle, a wave and a red dot. */
function uchiwa(k: Kit, c: string): void {
  k.cyl(0.021, 0.021, 0.003, c, 0, 0.007, 0, Math.PI / 2, 0, 0, 16);
  k.tor(0.021, 0.0016, CANE, 0, 0.007, 0, 0, 0, 0, 16);
  for (let i = 0; i < 5; i++) k.box(0.0012, 0.019, 0.0035, shadeHex(c, -24), 0, 0.007 - 0.008, 0, 0, 0, (i - 2) * 0.32);
  k.sph(0.0065, RED, 0.008, 0.013, 0.002, 1, 1, 0.3, 8);
  k.tor(0.007, 0.0016, WHITE, -0.006, 0.002, 0.002, 0, 0, Math.PI, 8, Math.PI);
  k.cyl(0.0025, 0.0025, 0.022, CANE, 0, -0.024, 0, 0, 0, 0, 6);
}

/** A folded paper star with a lighter inner star and a hanging loop. */
function paperStar(k: Kit, c: string): void {
  k.shape(starShape(0.027, 0.012), 0.01, c, M(0, -0.002, 0), 0.002);
  k.shape(starShape(0.014, 0.0065), 0.002, shadeHex(c, 28), M(0, -0.002, 0.0065));
  k.tor(0.004, 0.0012, STRING, 0, 0.029, 0, 0, 0, 0, 8);
}

/** A bamboo sprig: a slanted culm with nodes, a spray of leaves and one pink wish strip. */
function bambooSprig(k: Kit, c: string): void {
  k.cyl(0.0042, 0.0045, 0.052, shadeHex(c, 10), -0.004, -0.002, 0, 0, 0, 0.35, 6);
  for (const t of [-0.012, 0.008]) k.cyl(0.0052, 0.0052, 0.003, shadeHex(c, -18), -0.004 - Math.sin(0.35) * t, -0.002 + Math.cos(0.35) * t, 0, 0, 0, 0.35, 6);
  const leafAt: [number, number, number, number][] = [[0.004, 0.022, 0.006, -0.5], [-0.018, 0.02, -0.004, 0.7], [0.01, 0.008, -0.006, -0.9], [-0.016, 0.006, 0.008, 1.1], [0.016, 0.026, -0.002, -0.2], [-0.026, 0.026, 0.002, 0.3]];
  leafAt.forEach(([x, y, z, a], i) => k.add(new THREE.SphereGeometry(0.011, 6, 5), i % 2 ? shadeHex(c, 15) : c, M(x, y, z, 0, i * 0.9, a, 1.5, 0.3, 0.5)));
  k.box(0.008, 0.02, 0.0015, '#ff6fb5', 0.012, -0.006, 0.007);
  k.cyl(0.0005, 0.0005, 0.006, STRING, 0.012, 0.007, 0.007, 0, 0, 0, 3);
}

/** A yo-yo balloon: a marbled water balloon with a rubber-band loop. */
function yoyoBalloon(k: Kit, c: string): void {
  k.sph(0.019, c, 0, -0.004, 0, 1, 0.95, 1, 14);
  k.tor(0.0192, 0.0016, '#ffd23f', 0, -0.004, 0, 1.2, 0.4, 0, 16);
  k.tor(0.0192, 0.0016, '#ff6fb5', 0, -0.004, 0, 1.9, -0.6, 0, 16);
  k.tor(0.0192, 0.0013, WHITE, 0, -0.004, 0, 0.4, 1.2, 0, 16);
  k.cone(0.004, 0.006, c, 0, 0.017, 0, 0, 0, 0, 6);
  k.cyl(0.0007, 0.0007, 0.012, WHITE, 0, 0.026, 0, 0, 0, 0, 3);
  k.tor(0.0045, 0.0008, WHITE, 0, 0.034, 0, 0, 0, 0, 8);
  k.sph(0.004, WHITE, 0.008, 0.004, 0.014, 1, 1.3, 0.5, 6);
}

/** A goldfish in a bag of water, tied at the top with a red string. */
function goldfishBag(k: Kit, c: string): void {
  k.sph(0.019, c, 0, -0.008, 0, 1, 0.92, 1, 12);
  k.cone(0.013, 0.02, shadeHex(c, 45), 0, 0.014, 0, Math.PI, 0, 0, 10);
  k.tor(0.0035, 0.0016, RED, 0, 0.024, 0, Math.PI / 2, 0, 0, 8);
  for (const s of [-1, 1]) k.sph(0.0035, shadeHex(c, 45), s * 0.004, 0.03, 0, 1, 1.6, 0.6, 5);
  // Goldfish swim round the bag, one on each side, tipped up so they show from above.
  for (const s of [-1, 1]) {
    const tip = M(0, -0.006, 0, s * -0.5, s > 0 ? 0 : Math.PI, 0).multiply(M(0, 0, 0.0185));
    k.add(new THREE.SphereGeometry(0.0075, 8, 6).scale(1.5, 0.9, 0.45), FISH, tip);
    k.add(new THREE.ExtrudeGeometry(polygon([[0, 0], [-0.009, 0.007], [-0.006, 0], [-0.009, -0.007]]), { depth: 0.002, bevelEnabled: false }), FISH, tip.clone().multiply(M(-0.009, 0, 0)));
    k.add(new THREE.SphereGeometry(0.0016, 5, 4), INK, tip.clone().multiply(M(0.0065, 0.002, 0.003)));
  }
  k.sph(0.004, WHITE, -0.011, 0.002, 0.012, 1, 1.4, 0.4, 6);
}

/** A kusudama ball: a flower-covered paper ball with a short tassel of streamers. */
function kusudama(k: Kit, c: string): void {
  k.sph(0.015, shadeHex(c, -15), 0, 0.006, 0, 1, 1, 1, 10);
  const v = new THREE.IcosahedronGeometry(0.015, 0).getAttribute('position');
  const seen = new Set<string>();
  for (let i = 0; i < v.count; i++) {
    const key = `${v.getX(i).toFixed(4)},${v.getY(i).toFixed(4)},${v.getZ(i).toFixed(4)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    k.sph(0.0058, seen.size % 3 ? c : shadeHex(c, 22), v.getX(i), v.getY(i) + 0.006, v.getZ(i), 1, 1, 1, 6);
  }
  for (let i = 0; i < 5; i++) k.box(0.0035, 0.018, 0.001, pick(PAPER, i), (i - 2) * 0.0045, -0.016, 0.004 - Math.abs(i - 2) * 0.002, 0, 0, (i - 2) * 0.12);
  k.tor(0.0035, 0.0011, GOLD, 0, 0.024, 0, 0, 0, 0, 8);
}

/** A watermelon slice: pink flesh, a white band, a green rind and black seeds. */
function watermelon(k: Kit, c: string): void {
  const half = (r: number) => {
    const s = new THREE.Shape();
    s.moveTo(-r, 0);
    s.absarc(0, 0, r, Math.PI, Math.PI * 2, false);
    s.closePath();
    return s;
  };
  k.shape(half(0.026), 0.012, '#2f9a3a', M(0, 0.01, 0));
  k.shape(half(0.0235), 0.0128, '#f6f3d6', M(0, 0.01, 0));
  k.shape(half(0.021), 0.0136, c, M(0, 0.01, 0));
  for (const [x, y] of [[-0.01, 0.0], [0.0, -0.006], [0.01, 0.0], [-0.005, -0.012], [0.005, -0.012]] as const) {
    for (const s of [-1, 1]) k.sph(0.0018, INK, x, y + 0.01 - 0.002, s * 0.0069, 0.7, 1.2, 0.35, 5);
  }
}

/** An origami crane: a folded body, two wings raised, a long neck with a head and a tail. */
function crane(k: Kit, c: string): void {
  const under = shadeHex(c, -22);
  k.add(new THREE.OctahedronGeometry(0.011), c, M(0, -0.006, 0, 0, 0, 0, 1.5, 0.75, 0.7));
  const wing = polygon([[-0.013, 0], [0.011, 0], [-0.006, 0.026]]);
  for (const s of [-1, 1]) k.shape(wing, 0.0016, s > 0 ? c : under, M(0, -0.004, s * 0.003, s * 0.95, 0, 0));
  k.cone(0.0028, 0.024, c, 0.016, 0.004, 0, 0, 0, -0.75, 4);
  k.cone(0.0022, 0.009, RED, 0.026, 0.014, 0, 0, 0, -2.2, 4);
  k.cone(0.0028, 0.024, under, -0.016, 0.004, 0, 0, 0, 0.75, 4);
}

/** A bundle of blank wish strips in a little wooden tray, with a brush. */
function tanzakuBundle(k: Kit, c: string): void {
  k.box(0.04, 0.012, 0.024, c, 0, -0.014, 0);
  k.box(0.036, 0.004, 0.02, shadeHex(c, -25), 0, -0.0075, 0);
  for (let i = 0; i < 5; i++) k.box(0.008, 0.032, 0.0018, pick(PAPER, i), (i - 2) * 0.0075, 0.004, (i % 2) * 0.004 - 0.002, 0, 0, (i - 2) * 0.14);
  k.tor(0.012, 0.0014, RED, 0, -0.002, 0, Math.PI / 2, 0, 0, 12);
  k.cyl(0.0018, 0.0018, 0.034, '#b8743a', 0.004, -0.004, 0.013, 0, 0, 1.3, 5);
  k.cone(0.0024, 0.006, INK, -0.0135, -0.0095, 0.013, 0, 0, 1.3, 5);
}

// ------------------------------------------------------------------------------------- pieces

/** Placement of a point in some local frame (prop, rim spot, station). */
type Place = (x: number, y: number, z: number) => THREE.Matrix4;
const turn = (P: Place, x: number, y: number, z: number, rx: number, ry: number, rz: number) => P(x, y, z).multiply(M(0, 0, 0, rx, ry, rz));

const sph = (r: number, sx = 1, sy = 1, sz = 1, seg = 10) => new THREE.SphereGeometry(r, seg, Math.max(5, Math.round(seg * 0.7))).scale(sx, sy, sz);
const cyl = (rt: number, rb: number, h: number, seg = 8) => new THREE.CylinderGeometry(rt, rb, h, seg);
const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);

/** A bamboo culm from (x, 0, z) leaning by `lean` (toward −x), with nodes. Returns its top. */
function culm(b: GeoBatch, P: Place, x: number, z: number, h: number, r: number, lean = 0): [number, number] {
  const dx = -Math.sin(lean);
  const dy = Math.cos(lean);
  b.add(cyl(r * 0.85, r, h, 7), BAMBOO, turn(P, x + (dx * h) / 2, (dy * h) / 2, z, 0, 0, lean));
  for (let t = 0.22; t < 1; t += 0.24) b.add(cyl(r * 1.12, r * 1.12, r * 0.6, 7), NODE, turn(P, x + dx * h * t, dy * h * t, z, 0, 0, lean));
  return [x + dx * h, dy * h];
}

/** A spray of bamboo leaves around a point. */
function leaves(b: GeoBatch, P: Place, x: number, y: number, z: number, s: number, n = 5, seed = 0): void {
  for (let i = 0; i < n; i++) {
    const a = seed + i * 2.4;
    b.add(sph(0.05 * s, 1.6, 0.18, 0.45, 6), i % 2 ? LEAF : shadeHex(LEAF, -14), turn(P, x + Math.cos(a) * 0.05 * s, y + ((i % 3) - 1) * 0.025 * s, z + Math.sin(a) * 0.05 * s, 0, -a, -0.35));
  }
}

/** A blank tanzaku wish strip hanging from (x, y, z) on a thread, `h` long. */
function strip(b: GeoBatch, P: Place, x: number, y: number, z: number, h: number, col: string, yaw = 0): void {
  b.add(cyl(0.002, 0.002, h * 0.25, 3), STRING, P(x, y - h * 0.12, z));
  b.add(box(h * 0.32, h, h * 0.03), col, turn(P, x, y - h * 0.75, z, 0, yaw, 0));
}

/** A kusudama ball at (x, y, z) trailing fukinagashi streamers `len` long. */
function streamerBall(b: GeoBatch, P: Place, x: number, y: number, z: number, r: number, len: number, col: string, from = 0): void {
  b.add(sph(r, 1, 1, 1, 10), col, P(x, y, z));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    b.add(sph(r * 0.38, 1, 1, 1, 5), i % 2 ? shadeHex(col, 25) : GOLD, P(x + Math.cos(a) * r * 0.85, y + ((i % 3) - 1) * r * 0.45, z + Math.sin(a) * r * 0.85));
  }
  const n = 8;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + 0.2;
    const l = len * (0.85 + (i % 3) * 0.08);
    b.add(box(r * 0.42, l, r * 0.05), pick(PAPER, i + from), turn(P, x + Math.cos(a) * r * 0.7, y - r * 0.6 - l / 2, z + Math.sin(a) * r * 0.7, 0, -a + Math.PI / 2, 0));
  }
}

/** A glowing paper lantern (chochin) of radius r centred at (x, y, z). */
function lantern(b: GeoBatch, glow: GeoBatch, P: Place, x: number, y: number, z: number, r: number, col: string): void {
  glow.add(sph(r, 1, 1.3, 1, 12), col, P(x, y, z));
  for (const t of [-0.6, 0, 0.6]) glow.add(new THREE.TorusGeometry(r * Math.cos(t * 0.75) * 1.02, r * 0.05, 3, 12).rotateX(Math.PI / 2), shadeHex(col, -35), P(x, y + t * r * 1.1, z));
  for (const s of [-1, 1]) b.add(cyl(r * 0.55, r * 0.55, r * 0.28, 10), INK, P(x, y + s * r * 1.28, z));
}

/** A paper star (glowing when `lit`). */
function star(g: GeoBatch, P: Place, x: number, y: number, z: number, s: number, col: string, yaw = 0, flat = false): void {
  const geo = new THREE.ExtrudeGeometry(starShape(0.1 * s, 0.045 * s), { depth: 0.025 * s, bevelEnabled: false }).translate(0, 0, -0.0125 * s);
  g.add(geo, col, turn(P, x, y, z, flat ? -Math.PI / 2 : 0, yaw, 0));
}

/** A paper chain sagging from p0 to p1 (each [x, y, z]). */
function chain(b: GeoBatch, P: Place, p0: readonly number[], p1: readonly number[], sag: number, n: number, from = 0): void {
  const link = new THREE.TorusGeometry(0.022, 0.006, 3, 8).scale(1.4, 1, 1);
  const [x0, y0, z0] = p0 as [number, number, number];
  const [x1, y1, z1] = p1 as [number, number, number];
  const run = Math.hypot(x1 - x0, z1 - z0);
  const yaw = Math.atan2(-(z1 - z0), x1 - x0);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const y = y0 + (y1 - y0) * t - sag * 4 * t * (1 - t);
    const slope = Math.atan2(y1 - y0 - sag * 4 * (1 - 2 * t), run);
    b.add(link, pick(PAPER, i + from), turn(P, x0 + (x1 - x0) * t, y, z0 + (z1 - z0) * t, 0, yaw, 0).multiply(M(0, 0, 0, 0, 0, slope)).multiply(M(0, 0, 0, i % 2 ? Math.PI / 2 : 0, 0, 0)));
  }
}

/** A paper crane, about 0.3 long at s = 1. */
function bigCrane(b: GeoBatch, P: Place, x: number, y: number, z: number, s: number, col: string, yaw = 0): void {
  const Q: Place = (px, py, pz) => turn(P, x, y, z, 0, yaw, 0).multiply(M(px * s, py * s, pz * s, 0, 0, 0, s, s, s));
  const under = shadeHex(col, -22);
  b.add(new THREE.OctahedronGeometry(0.07).scale(1.5, 0.75, 0.7), col, Q(0, 0.05, 0));
  const wing = new THREE.ExtrudeGeometry(polygon([[-0.08, 0], [0.07, 0], [-0.04, 0.16]]), { depth: 0.01, bevelEnabled: false });
  for (const k of [-1, 1]) b.add(wing, k > 0 ? col : under, Q(0, 0.06, k * 0.02).multiply(M(0, 0, 0, k * 0.95, 0, 0)));
  b.add(new THREE.ConeGeometry(0.018, 0.15, 4), col, Q(0.1, 0.11, 0).multiply(M(0, 0, 0, 0, 0, -0.75)));
  b.add(new THREE.ConeGeometry(0.014, 0.06, 4), RED, Q(0.165, 0.175, 0).multiply(M(0, 0, 0, 0, 0, -2.2)));
  b.add(new THREE.ConeGeometry(0.018, 0.15, 4), under, Q(-0.1, 0.11, 0).multiply(M(0, 0, 0, 0, 0, 0.75)));
}

// ------------------------------------------------------------------------------------- props

/** A wish bamboo in a wooden tub, dressed with strips, chains, stars, cranes and a kusudama, about 1.3 tall. */
function wishBamboo({ b, glow, m, variant }: PropContext): void {
  const P: Place = (x, y, z) => m(x, y, z);
  b.add(cyl(0.17, 0.14, 0.16, 12), WOOD, m(0, 0.08, 0));
  for (const y of [0.04, 0.12]) b.add(new THREE.TorusGeometry(0.16, 0.012, 4, 14).rotateX(Math.PI / 2), GOLD, m(0, y, 0));
  b.add(cyl(0.15, 0.15, 0.01, 12), '#6b4a2a', m(0, 0.16, 0));
  const tops = [culm(b, P, -0.04, 0.02, 1.25, 0.03, 0.08), culm(b, P, 0.06, -0.04, 1.05, 0.026, -0.12), culm(b, P, 0.0, 0.07, 0.85, 0.022, 0.2)];
  tops.forEach(([x, y], i) => leaves(b, P, x, y, [0.02, -0.04, 0.07][i] as number, 1.0, 6, i));
  // Branches with leaves, wish strips hanging from them.
  const twigs: [number, number, number][] = [[-0.3, 0.95, 0.04], [0.28, 0.85, -0.02], [-0.26, 0.7, 0.08], [0.25, 0.62, 0.05], [-0.04, 1.08, -0.18]];
  twigs.forEach(([x, y, z], i) => {
    b.add(cyl(0.007, 0.009, Math.hypot(x, 0.12), 5), BAMBOO, turn(P, x / 2, y - 0.06, z, 0, 0, Math.atan2(-x, 0.12)));
    leaves(b, P, x, y, z, 0.7, 4, i);
    for (let j = 0; j < 3; j++) strip(b, P, x * (0.45 + j * 0.25), y - 0.05 - j * 0.02, z + (j - 1) * 0.05, 0.21, pick(PAPER, i * 3 + j + variant), j * 0.5);
  });
  chain(b, P, [-0.28, 0.82, 0.12], [0.26, 0.76, 0.12], 0.12, 12, variant);
  chain(b, P, [-0.24, 0.56, 0.1], [0.22, 0.52, 0.1], 0.08, 9, variant + 3);
  streamerBall(b, P, -0.03, 1.12, 0.1, 0.06, 0.3, '#ff6fb5', variant);
  for (const [x, y, z, col] of [[0.22, 0.98, 0.08, '#ffd23f'], [-0.2, 0.46, 0.12, '#9fd8ff'], [0.16, 0.38, 0.1, '#ffffff']] as const) {
    b.add(cyl(0.002, 0.002, 0.06, 3), STRING, m(x, y + 0.1, z));
    star(glow, P, x, y, z, 0.6, col);
  }
  bigCrane(b, P, 0.3, 0.42, 0.0, 0.45, '#3fb8ff', 0.5);
}

/** A low writing table: blank wish strips, an ink stone, brushes in a pot and a cushion, about 0.8 wide. */
function writingTable({ b, m }: PropContext): void {
  b.add(box(0.8, 0.045, 0.46), '#c8322f', m(0, 0.2, 0));
  b.add(box(0.82, 0.02, 0.48), shadeHex('#c8322f', -25), m(0, 0.175, 0));
  for (const [x, z] of [[-0.35, -0.19], [0.35, -0.19], [-0.35, 0.19], [0.35, 0.19]] as const) b.add(cyl(0.024, 0.02, 0.17, 6), WOOD, m(x, 0.085, z));
  // Strips laid out ready to be written on.
  for (let i = 0; i < 5; i++) b.add(box(0.06, 0.006, 0.2), pick(PAPER, i), m(-0.28 + i * 0.09, 0.227, 0.05, (i - 2) * 0.12));
  // Ink stone and brushes.
  b.add(box(0.12, 0.025, 0.08), '#2a2a32', m(0.24, 0.235, -0.12));
  b.add(box(0.09, 0.006, 0.05), INK, m(0.24, 0.25, -0.12));
  b.add(cyl(0.045, 0.04, 0.1, 10), '#3fb8ff', m(0.3, 0.27, 0.1));
  for (let i = 0; i < 3; i++) {
    b.add(cyl(0.008, 0.008, 0.18, 5), CANE, turn(P(m), 0.3 + (i - 1) * 0.015, 0.34, 0.1, (i - 1) * 0.15, 0, (i - 1) * 0.2));
  }
  b.add(cyl(0.009, 0.009, 0.16, 5), CANE, turn(P(m), 0.08, 0.235, -0.1, 0, 0, Math.PI / 2 - 0.3));
  b.add(new THREE.ConeGeometry(0.011, 0.04, 6), INK, turn(P(m), 0.005, 0.245, -0.1, 0, 0, Math.PI / 2 - 0.3));
  // A finished strip with a paper star clip, ready to hang.
  b.add(box(0.06, 0.006, 0.2), '#7ed957', m(-0.12, 0.233, -0.12, 1.2));
  star(b, P(m), -0.12, 0.24, -0.12, 0.35, GOLD, 0, true);
}
const P = (m: PropContext['m']): Place => (x, y, z) => m(x, y, z);

/** A pole with a crossbar carrying three kusudama balls and their long fukinagashi streamers, about 1.2 tall. */
function streamerPole({ b, m, variant }: PropContext): void {
  const Q = P(m);
  b.add(cyl(0.06, 0.07, 0.05, 8), WOOD, m(0, 0.025, 0));
  culm(b, Q, 0, 0, 1.2, 0.025);
  b.add(cyl(0.012, 0.012, 0.8, 6).rotateZ(Math.PI / 2), BAMBOO, m(0, 1.12, 0));
  leaves(b, Q, 0, 1.22, 0, 1.1, 6);
  for (let i = 0; i < 3; i++) {
    const x = (i - 1) * 0.34;
    b.add(cyl(0.003, 0.003, 0.05, 3), STRING, m(x, 1.09, 0));
    streamerBall(b, Q, x, 1.02, 0, 0.065, 0.55, pick(['#ff3b5c', '#b06bff', '#ffd23f', '#3fb8ff'], i + variant), i * 2);
  }
}

/** A milky way: a winding river of glowing star pieces across the ground, about 1.8 long. */
function milkyWay({ b, glow, m, variant }: PropContext): void {
  const Q = P(m);
  for (let i = 0; i < 22; i++) {
    const t = i / 21;
    const x = -0.9 + t * 1.8;
    const z = Math.sin(t * Math.PI * 2 + variant) * 0.14 + ((i * 7) % 5 - 2) * 0.045;
    star(glow, Q, x, 0.02 + (i % 3) * 0.006, z, 0.35 + (i % 4) * 0.12, pick(STARS, i), i * 0.7, true);
  }
  for (let i = 0; i < 26; i++) {
    const t = (i + 0.5) / 26;
    const z = Math.sin(t * Math.PI * 2 + variant) * 0.14 + (((i * 5) % 7) - 3) * 0.05;
    glow.add(sph(0.012, 1, 1, 1, 5), pick(['#cfe6ff', '#ffffff', '#fff3a0'], i), m(-0.9 + t * 1.8, 0.015, z));
  }
  b.add(sph(0.9, 1, 0.012, 0.22, 16), '#2e3f9a', m(0, 0.005, 0));
}

/** A yo-yo balloon pool: a blue tub of water with floating balloons and goldfish. */
function yoyoPool({ b, m }: PropContext): void {
  b.add(cyl(0.42, 0.4, 0.12, 18), '#ff6fb5', m(0, 0.06, 0));
  b.add(new THREE.TorusGeometry(0.42, 0.025, 4, 20).rotateX(Math.PI / 2), WHITE, m(0, 0.12, 0));
  b.add(cyl(0.39, 0.39, 0.01, 18), WATER, m(0, 0.11, 0));
  const balloons: [number, number, string][] = [[-0.2, 0.05, '#ff3b5c'], [0.05, -0.2, '#ffd23f'], [0.2, 0.12, '#3fb8ff'], [-0.05, 0.22, '#7ed957'], [-0.22, -0.18, '#b06bff'], [0.24, -0.1, '#ff8a1e']];
  balloons.forEach(([x, z, c], i) => {
    b.add(sph(0.055, 1, 0.9, 1, 10), c, m(x, 0.14, z));
    b.add(new THREE.TorusGeometry(0.056, 0.006, 3, 12).rotateX(1.2 + i), WHITE, m(x, 0.14, z));
  });
  for (const [x, z, a] of [[0.0, 0.02, 0.4], [0.12, 0.25, 2], [-0.28, 0.24, 4]] as const) {
    b.add(sph(0.03, 1.5, 0.5, 0.8, 8), FISH, m(x, 0.12, z, a));
    b.add(new THREE.ConeGeometry(0.022, 0.03, 4).rotateZ(Math.PI / 2), FISH, m(x - Math.cos(a) * 0.05, 0.12, z + Math.sin(a) * 0.05, a));
  }
}

/** A tray of watermelon slices with half a melon beside it. */
function watermelonTray({ b, m }: PropContext): void {
  b.add(box(0.5, 0.025, 0.3), CANE, m(0, 0.0125, 0));
  b.add(new THREE.SphereGeometry(0.13, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(-Math.PI / 2), '#2f9a3a', m(-0.38, 0.13, -0.02));
  b.add(cyl(0.122, 0.122, 0.01, 14).rotateX(Math.PI / 2), '#ff4f6a', m(-0.38, 0.13, -0.017));
  const half = (r: number, h: number) => new THREE.CylinderGeometry(r, r, h, 12, 1, false, Math.PI / 2, Math.PI);
  for (let i = 0; i < 3; i++) {
    const x = -0.13 + i * 0.13;
    const z = i % 2 ? -0.04 : 0.04;
    const yaw = i % 2 ? Math.PI : 0;
    b.add(half(0.11, 0.03), '#2f9a3a', m(x, 0.04, z, yaw));
    b.add(half(0.1, 0.031), '#f6f3d6', m(x, 0.04, z, yaw));
    b.add(half(0.09, 0.032), '#ff4f6a', m(x, 0.04, z, yaw));
    for (const [sx, sz] of [[-0.04, -0.04], [0.0, -0.055], [0.04, -0.04], [0.0, -0.025]] as const) {
      const k = i % 2 ? -1 : 1;
      b.add(sph(0.008, 1.2, 0.4, 0.7, 5), INK, m(x + sx * k, 0.056, z + sz * k));
    }
  }
}

/** A paper lantern hung from a bamboo post, glowing, about 0.8 tall. */
function lanternPost({ b, glow, m, variant }: PropContext): void {
  const Q = P(m);
  b.add(cyl(0.05, 0.06, 0.04, 8), WOOD, m(0, 0.02, 0));
  culm(b, Q, 0, 0, 0.8, 0.018);
  b.add(cyl(0.009, 0.009, 0.2, 5).rotateZ(Math.PI / 2), BAMBOO, m(0.09, 0.76, 0));
  b.add(cyl(0.003, 0.003, 0.05, 4), STRING, m(0.17, 0.73, 0));
  lantern(b, glow, Q, 0.17, 0.62, 0, 0.065, pick([RED, '#ffffff', '#ff8a1e', '#ffd23f'], variant));
  strip(b, Q, 0.17, 0.52, 0, 0.12, pick(PAPER, variant + 2));
}

/** A round cushion to sit on. */
function cushion({ b, m, variant }: PropContext): void {
  b.add(sph(0.15, 1, 0.3, 1, 12), pick(['#3fb8ff', '#ff6fb5', '#7ed957', '#b06bff'], variant), m(0, 0.045, 0));
  b.add(sph(0.025, 1, 0.5, 1, 6), GOLD, m(0, 0.09, 0));
}

/** An uchiwa fan lying on the ground. */
function fanProp({ b, m, variant }: PropContext): void {
  b.add(cyl(0.12, 0.12, 0.012, 14), pick(['#3fb8ff', '#ff8a1e', '#ff6fb5'], variant), m(0.06, 0.01, 0));
  b.add(new THREE.TorusGeometry(0.12, 0.008, 3, 14).rotateX(Math.PI / 2), CANE, m(0.06, 0.012, 0));
  b.add(sph(0.035, 1, 0.2, 1, 8), RED, m(0.09, 0.018, -0.03));
  b.add(cyl(0.012, 0.012, 0.14, 5).rotateZ(Math.PI / 2), CANE, m(-0.12, 0.012, 0));
}

// ------------------------------------------------------------------------------------- the skin

const skin: HolidaySkin = {
  id: 'tanabata',
  name: 'Tanabata',
  greeting: 'Happy Tanabata!',
  cargo: {
    red: chochin, orange: uchiwa, yellow: paperStar, green: bambooSprig, teal: yoyoBalloon,
    blue: goldfishBag, purple: kusudama, pink: watermelon, white: crane, brown: tanzakuBundle,
  },
  props: {
    'tanabata.bamboo': wishBamboo,
    'tanabata.table': writingTable,
    'tanabata.streamers': streamerPole,
    'tanabata.milkyway': milkyWay,
    'tanabata.pool': yoyoPool,
    'tanabata.watermelon': watermelonTray,
    'tanabata.lantern': lanternPost,
    'tanabata.cushion': cushion,
    'tanabata.fan': fanProp,
  },
  inside: [
    { name: 'wishBamboo', w: 2, h: 2, items: [['tanabata.bamboo', -0.2, -0.25, 0, 1.05], ['tanabata.table', 0.35, 0.45, 0, 0.75], ['tanabata.cushion', 0.35, 0.82, 0, 0.8, 0, 1], ['toy:teddy', -0.6, 0.55, 'face', 0.55], ['tanabata.lantern', 0.7, -0.55, Math.PI, 0.9, 0, 0]] },
    { name: 'starRiver', w: 2, h: 1, items: [['tanabata.milkyway', 0, 0, 0, 0.9, 0, 0], ['toy:helmet', -0.78, 0.05, 0, 0.6], ['toy:helmet', 0.78, -0.05, Math.PI, 0.6]] },
    { name: 'yoyoPool', w: 2, h: 2, items: [['tanabata.pool', -0.1, -0.1, 0, 1], ['toy:car', 0.6, 0.5, 'face', 0.55], ['toy:car', 0.35, 0.68, 'face', 0.5], ['toy:top', -0.62, 0.55, 'face', 0.6], ['tanabata.lantern', 0.68, -0.55, Math.PI, 0.9, 0, 3]] },
    { name: 'streamers', w: 2, h: 1, items: [['tanabata.streamers', -0.15, 0, 0, 0.85, 0, 0], ['toy:star', 0.72, 0.05, 0, 0.6]] },
    { name: 'watermelon', w: 2, h: 1, items: [['tanabata.watermelon', -0.3, 0, 0, 1.1], ['tanabata.fan', 0.35, 0.15, 0.6, 1, 0, 0], ['tanabata.cushion', 0.65, -0.1, 0, 0.8, 0, 2]] },
  ],
  outside: [
    { name: 'wishGarden', w: 2.6, h: 0, items: [['tanabata.bamboo', 0, -0.3, 0, 3.4], ['tanabata.table', 1.6, 0.9, -0.4, 2.4], ['tanabata.cushion', 1.6, 1.8, 0, 2.2, 0, 0], ['tanabata.streamers', -1.8, 0.4, 0, 2.6, 0, 1], ['toy:helmet', 0.4, 1.5, 'face', 2.2]] },
    { name: 'summerFair', w: 2.4, h: 0, items: [['tanabata.pool', 0, 0, 0, 3], ['tanabata.watermelon', 0.2, 1.9, 0.3, 2.6], ...ring(3, 1.9, 'tanabata.lantern', 2.6, 3.6), ['toy:car', -1.4, 1.2, 'face', 2], ['toy:top', 1.5, 0.9, 'face', 2.2]] },
    { name: 'milkyWay', w: 2.6, h: 0, items: [['tanabata.milkyway', 0, 0, 0.2, 3.2, 0, 1], ['toy:helmet', -2.4, 0.5, 'face', 2.4], ['toy:helmet', 2.4, -0.6, 'face', 2.4], ...row(3, 1.4, 'tanabata.cushion', 2.2, 0, 1.4)] },
  ],
  edge(b, glow, spot) {
    // The rim's grassy top sits above the mat: everything stands on it, a size up.
    const LIFT = 0.05;
    const K = 1.4;
    const c = Math.cos(spot.yaw);
    const s = Math.sin(spot.yaw);
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), spot.yaw);
    const at: Place = (x, y, z) => new THREE.Matrix4().compose(new THREE.Vector3(spot.x + x * c + z * s, LIFT + y * K, spot.z - x * s + z * c), q, new THREE.Vector3(K, K, K));
    if (spot.corner) {
      // A taller bamboo on each corner crowned with a glowing paper star and a kusudama ball.
      const [tx, ty] = culm(b, at, 0.02, 0, 0.55, 0.014, 0.05);
      leaves(b, at, tx, ty - 0.02, 0, 0.6, 5, spot.index);
      star(glow, at, tx, ty + 0.06, 0, 0.45, pick(STARS, spot.index + 1), spot.yaw);
      b.add(cyl(0.006, 0.006, 0.14, 5).rotateX(Math.PI / 2), BAMBOO, at(0.02, 0.4, 0.07));
      streamerBall(b, at, 0.02, 0.36, 0.12, 0.03, 0.14, pick(['#ff3b5c', '#b06bff', '#3fb8ff'], spot.index), spot.index);
      return;
    }
    // Two leafy bamboo sticks with a paper chain between them, tanzaku strips fluttering below.
    const tops = ([[-0.17, 0.5, -0.1], [0.15, 0.44, 0.08]] as const).map(([z, h, lean], k) => {
      const [tx, ty] = culm(b, at, 0.02, z, h, 0.016, lean);
      leaves(b, at, tx, ty, z, 0.7, 5, spot.index + k);
      leaves(b, at, 0.02 - Math.sin(lean) * h * 0.6, ty * 0.6, z + (k ? 0.04 : -0.04), 0.5, 3, spot.index * 2 + k);
      for (let j = 0; j < 3; j++) strip(b, at, 0.02 + (j - 1) * 0.035, ty * (0.82 - j * 0.12), z + (j - 1) * 0.04 + (k ? -0.03 : 0.03), 0.13, pick(PAPER, spot.index * 5 + k * 3 + j), j * 0.7);
      return ty;
    });
    chain(b, at, [0.03, (tops[0] as number) * 0.75, -0.17], [0.03, (tops[1] as number) * 0.75, 0.15], 0.05, 7, spot.index);
    if (spot.index % 2 === 0) star(glow, at, 0.03, (tops[0] as number) + 0.07, -0.18, 0.35, pick(STARS, spot.index));
  },
  station(b, f, glow) {
    // Along the awning's front edge, kusudama balls trail long fukinagashi streamers between
    // glowing chochin lanterns; more streamers hang from the hall's eaves.
    const Q: Place = (x, y, z) => f.m(x, y, z);
    const n = Math.max(4, Math.round(f.width / 0.32));
    const edgeZ = f.awningZ + 0.17;
    for (let i = 0; i < n; i++) {
      const x = -f.width / 2 + ((i + 0.5) / n) * f.width;
      b.add(cyl(0.003, 0.003, 0.04, 3), STRING, f.m(x, f.awningY - 0.03, edgeZ));
      if (i % 2) lantern(b, glow, Q, x, f.awningY - 0.1, edgeZ, 0.042, i % 4 === 1 ? RED : '#ffffff');
      else streamerBall(b, Q, x, f.awningY - 0.07, edgeZ, 0.04, 0.22, pick(['#ff3b5c', '#b06bff', '#ffd23f', '#3fb8ff', '#7ed957'], i / 2), i);
    }
    for (const x of [-f.width / 2 + 0.25, f.width / 2 - 0.25]) streamerBall(b, Q, x, f.roofY - 0.05, f.frontZ + 0.07, 0.035, 0.18, '#ff6fb5', 2);
  },
  engine(b) {
    // A bamboo sprig on the cab roof with three wish strips.
    const E: Place = (x, y, z) => M(x, y, z);
    const [tx, ty] = culm(b, (x, y, z) => M(-0.17 + x, 0.42 + y, z), 0, 0, 0.2, 0.008, 0.25);
    leaves(b, (x, y, z) => M(-0.17 + x, 0.42 + y, z), tx, ty, 0, 0.45, 5);
    strip(b, E, -0.2, 0.57, 0.03, 0.07, '#ff3b5c', 0.4);
    strip(b, E, -0.18, 0.53, -0.03, 0.07, '#ffd23f', -0.3);
    strip(b, E, -0.215, 0.6, -0.01, 0.06, '#3fb8ff', 1);
  },
  light: { background: '#2a2f6e', sunColor: '#ffc9a0', sunIntensity: 1.8, hemiSky: '#9aa6ff', hemiGround: '#4a3d6a', hemiIntensity: 0.98 },
  fx: { kind: 'sparkles', colors: STARS, count: 60 },
};

export default skin;
