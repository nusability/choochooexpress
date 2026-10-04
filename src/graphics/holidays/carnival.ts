// Carnival (the Saturday to Shrove Tuesday before Lent): a parade float with a giant smiling lion
// rolls past samba drums, feather headdresses and masks on stands wait by an open costume trunk,
// and a Fat Tuesday table is laid with sugared krapfen and a stack of pancakes that grows each day.
// Pennant bunting and zigzag streamers run round the diorama, the station wears bunting, masks and
// balloons, the engine a jester hat, and confetti in every colour drifts over the board. Samba
// drums, trumpets, krapfen, jester hats, feather plumes, streamer rolls, masks, balloons, maracas,
// confetti poppers and top hats ride in the wagons.
import * as THREE from 'three';
import type { GeoBatch } from '../batch';
import type { HolidaySkin, PropContext } from '../holiday';
import { INK, Kit, M, WHITE, polygon, shadeHex } from '../toyModels';

const GOLD = '#f2c23a';
const PINK = '#ff4f9a';
const YELLOW = '#ffd23f';
const SKY = '#2fb8ff';
const LIME = '#5fd36a';
const VIOLET = '#a35bff';
const ORANGE = '#ff8a1f';
const RED = '#ff3b4f';
const TEAL = '#2fd2c0';
const FEST = [PINK, YELLOW, SKY, LIME, VIOLET, ORANGE, RED, TEAL];
const BULBS = ['#ffe36a', '#ff7de9', '#7dfcff', '#9dff6a', '#ffb347'];

const fest = (i: number) => FEST[((i % FEST.length) + FEST.length) % FEST.length] as string;

type Add = (g: THREE.BufferGeometry, c: string, m: THREE.Matrix4) => void;

/** A transform `base` followed by a local placement. */
const at = (base: THREE.Matrix4, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, s = 1) => base.clone().multiply(M(x, y, z, rx, ry, rz, s, s, s));

// ------------------------------------------------------------------------------------- cargo

/** A samba surdo: tall drum with white heads, gold rims and rods, a felt mallet on top. */
function surdo(k: Kit, c: string): void {
  k.cyl(0.019, 0.019, 0.03, c, 0, -0.003, 0, 0, 0, 0, 14);
  for (const y of [0.0135, -0.0195]) {
    k.cyl(0.0196, 0.0196, 0.0026, WHITE, 0, y, 0, 0, 0, 0, 14);
    k.tor(0.0196, 0.0019, GOLD, 0, y, 0, Math.PI / 2, 0, 0, 14);
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    k.cyl(0.0011, 0.0011, 0.031, GOLD, Math.cos(a) * 0.0198, -0.003, Math.sin(a) * 0.0198, 0, 0, 0, 4);
  }
  k.box(0.04, 0.0035, 0.002, WHITE, 0, -0.003, 0.0192);
  k.cyl(0.0016, 0.0016, 0.032, '#c98a52', 0.003, 0.0175, 0.006, 0, 0, 1.45, 6);
  k.sph(0.0048, WHITE, -0.0128, 0.0195, 0.006, 1, 1, 1, 8);
}

/** A trumpet along x: bell toward +x, valves with pearl caps, a little pennant hanging below. */
function trumpet(k: Kit, c: string): void {
  k.cyl(0.0028, 0.0028, 0.03, c, -0.002, -0.006, 0, 0, 0, Math.PI / 2, 8);
  k.cyl(0.0028, 0.0028, 0.034, c, -0.011, 0.004, 0, 0, 0, Math.PI / 2, 8);
  k.tor(0.005, 0.0028, c, -0.017, -0.001, 0, 0, 0, Math.PI / 2, 8, Math.PI);
  for (const x of [-0.007, -0.0015, 0.004]) {
    k.cyl(0.0033, 0.0033, 0.017, shadeHex(c, 12), x, 0.002, 0, 0, 0, 0, 8);
    k.sph(0.0029, WHITE, x, 0.0115, 0, 1, 0.6, 1, 8);
  }
  const bell = [[0.003, 0], [0.0042, 0.006], [0.007, 0.012], [0.012, 0.016], [0.014, 0.0175]].map(([r, y]) => new THREE.Vector2(r, y));
  k.add(new THREE.LatheGeometry(bell, 14).rotateZ(-Math.PI / 2), c, M(0.012, -0.006, 0));
  k.cyl(0.0125, 0.0125, 0.001, shadeHex(c, -40), 0.028, -0.006, 0, 0, 0, Math.PI / 2, 14);
  k.tor(0.014, 0.0014, shadeHex(c, 20), 0.0295, -0.006, 0, 0, Math.PI / 2, 0, 14);
  k.cone(0.0036, 0.007, shadeHex(c, 20), -0.0305, 0.004, 0, 0, 0, Math.PI / 2, 8);
  k.box(0.018, 0.011, 0.0015, PINK, 0.0, -0.0145, 0);
  k.box(0.018, 0.0025, 0.0018, GOLD, 0.0, -0.0205, 0);
}

/** A krapfen (carnival doughnut): golden, sugar on top, jam peeking out, on a frilly doily. */
function krapfen(k: Kit, c: string, doily = true): void {
  if (doily) k.cyl(0.024, 0.024, 0.002, '#ffb3d9', 0, -0.0175, 0, 0, 0, 0, 12);
  k.sph(0.021, c, 0, -0.004, 0, 1, 0.62, 1, 14);
  k.tor(0.0205, 0.0026, shadeHex(c, 38), 0, -0.006, 0, Math.PI / 2, 0, 0, 16);
  k.dome(0.0155, WHITE, 0, 0.0035, 0, 1, 0.42, 1, 12);
  k.sph(0.0052, '#d8173f', 0.0138, -0.004, 0.0138, 1, 0.85, 1, 8);
  k.sph(0.0026, '#d8173f', 0.0145, -0.0095, 0.0145, 1, 1.2, 1, 6);
}

/** A jester hat: three floppy points with gold bells (the middle one in a second colour). */
function jester(k: Kit, c: string, accent = VIOLET): void {
  k.dome(0.0152, c, 0, -0.013, 0, 1, 0.9, 1, 12);
  for (const s of [-1, 1]) {
    const dx = s * 0.867;
    const dy = 0.498;
    k.cone(0.0075, 0.03, c, s * 0.006 + dx * 0.015, -0.006 + dy * 0.015, 0, 0, 0, -s * 1.05, 10);
    k.sph(0.0045, GOLD, s * 0.006 + dx * 0.031, -0.006 + dy * 0.031, 0, 1, 1, 1, 8);
  }
  k.cone(0.0075, 0.028, accent, 0, -0.004 + 0.94 * 0.014, -0.343 * 0.014, -0.35, 0, 0, 10);
  k.sph(0.0045, GOLD, 0, -0.004 + 0.94 * 0.029, -0.343 * 0.029, 1, 1, 1, 8);
  k.cyl(0.0158, 0.0162, 0.0065, GOLD, 0, -0.0165, 0, 0, 0, 0, 14);
  for (const [x, col] of [[-0.008, PINK], [0, SKY], [0.008, PINK]] as const) k.sph(0.0024, col, x, -0.0165, 0.0146, 1, 1, 0.6, 6);
}

/** A feather plume: a fan of feathers with eyes on the tips, set in a gold jewelled cup. */
function plume(k: Kit, c: string): void {
  const feather = new THREE.SphereGeometry(1, 8, 6).scale(0.0048, 0.0165, 0.0018).translate(0, 0.0165, 0);
  for (let i = 0; i < 7; i++) {
    const a = -0.95 + (i / 6) * 1.9;
    k.add(feather.clone(), i % 2 ? shadeHex(c, 28) : c, M(0, -0.018, (i % 2) * -0.002, 0, 0, a));
    k.sph(0.0028, i % 2 ? GOLD : VIOLET, -Math.sin(a) * 0.028, -0.018 + Math.cos(a) * 0.028, 0.0016, 1, 1, 0.5, 6);
  }
  feather.dispose();
  k.cyl(0.0065, 0.0042, 0.009, GOLD, 0, -0.0205, 0, 0, 0, 0, 10);
  k.sph(0.0032, RED, 0, -0.0195, 0.0058, 1, 1, 0.6, 6);
}

/** A Venetian half mask, flat, facing +z, about 0.054 wide (scale with `s`). */
function maskShape(s = 1): THREE.Shape {
  const right: [number, number][] = [[0, 0.007], [0.008, 0.0095], [0.016, 0.011], [0.022, 0.014], [0.027, 0.02], [0.026, 0.01], [0.023, 0.002], [0.018, -0.006], [0.011, -0.01], [0.005, -0.008], [0.002, -0.003], [0, -0.002]];
  const left = right.slice(1, -1).reverse().map(([x, y]) => [-x, y] as [number, number]);
  const shape = polygon([...right, ...left].map(([x, y]) => [x * s, y * s] as [number, number]));
  for (const e of [-1, 1]) shape.holes.push(new THREE.Path().absellipse(e * 0.0115 * s, 0.0015 * s, 0.0056 * s, 0.0038 * s, 0, Math.PI * 2, true, 0));
  return shape;
}

function mask(k: Kit, c: string, feathers: readonly string[] = [PINK, GOLD, TEAL], stick = true): void {
  k.shape(maskShape(), 0.004, c, M(0, -0.004, 0), 0.0007);
  k.sph(0.0034, GOLD, 0, 0.004, 0.0026, 1, 1, 0.6, 8);
  for (const e of [-1, 1]) {
    k.tor(0.0058, 0.001, GOLD, e * 0.0115, -0.0025, 0.0024, 0, 0, 0, 12);
    k.sph(0.0019, GOLD, e * 0.021, 0.008, 0.0024, 1, 1, 0.6, 5);
  }
  const feather = new THREE.SphereGeometry(1, 8, 6).scale(0.004, 0.015, 0.0015).translate(0, 0.015, 0);
  feathers.forEach((col, i) => k.add(feather.clone(), col, M(0.021, 0.008, -0.002 - i * 0.0008, 0, 0, -0.75 + i * 0.5)));
  feather.dispose();
  if (stick) k.cyl(0.0013, 0.0013, 0.026, GOLD, -0.023, -0.018, -0.001, 0, 0, -0.25, 6);
}

/** A model turned by `yaw` (and tipped back by `tilt`), so its face shows on the goal card. */
const turned = (model: (k: Kit, c: string) => void, yaw: number, tilt = 0) => (k: Kit, c: string) => {
  const n = k.parts.length;
  model(k, c);
  const r = new THREE.Matrix4().makeRotationY(yaw).multiply(new THREE.Matrix4().makeRotationX(-tilt));
  for (const p of k.parts.slice(n)) p.applyMatrix4(r);
};

/** A round balloon with a knot, a shine and a wavy string. */
function balloon(k: Kit, c: string): void {
  k.sph(0.0175, c, 0, 0.007, 0, 1, 1.18, 1, 14);
  k.sph(0.0038, WHITE, -0.006, 0.016, 0.0135, 1, 1.4, 0.5, 6);
  k.cone(0.0032, 0.0045, shadeHex(c, -18), 0, -0.0145, 0, 0, 0, 0, 8);
  k.cyl(0.0007, 0.0007, 0.009, WHITE, 0.001, -0.021, 0, 0, 0, 0.2, 4);
  k.cyl(0.0007, 0.0007, 0.009, WHITE, 0.001, -0.029, 0, 0, 0, -0.25, 4);
}

/** Two maracas crossed, painted with stripes. */
function maracas(k: Kit, c: string): void {
  for (const s of [-1, 1]) {
    const base = M(s * 0.005, -0.006, s * 0.006, 0, 0, s * 0.5);
    k.add(new THREE.CylinderGeometry(0.0024, 0.0028, 0.02, 6), shadeHex(c, -28), at(base, 0, -0.011, 0));
    k.add(new THREE.SphereGeometry(0.0112, 10, 7), c, at(base, 0, 0.009, 0).multiply(M(0, 0, 0, 0, 0, 0, 1, 1.25, 1)));
    k.add(new THREE.TorusGeometry(0.0107, 0.0017, 4, 12).rotateX(Math.PI / 2), s > 0 ? YELLOW : LIME, at(base, 0, 0.0055, 0));
    k.add(new THREE.TorusGeometry(0.0085, 0.0015, 4, 12).rotateX(Math.PI / 2), s > 0 ? RED : SKY, at(base, 0, 0.015, 0));
  }
}

/** A streamer roll with its paper zigzagging out along the floor toward +x. */
function streamerRoll(k: Kit, c: string): void {
  k.cyl(0.0145, 0.0145, 0.016, c, -0.008, -0.004, 0, Math.PI / 2, 0, 0, 14);
  k.cyl(0.0052, 0.0052, 0.0165, WHITE, -0.008, -0.004, 0, Math.PI / 2, 0, 0, 10);
  k.tor(0.0145, 0.0012, shadeHex(c, 30), -0.008, -0.004, 0.0081, 0, 0, 0, 14);
  const pts: [number, number][] = [[-0.008, -0.0185], [0.004, -0.0185], [0.011, -0.012], [0.018, -0.0185], [0.025, -0.012], [0.031, -0.018], [0.033, -0.008]];
  for (let i = 0; i + 1 < pts.length; i++) {
    const [x0, y0] = pts[i] as [number, number];
    const [x1, y1] = pts[i + 1] as [number, number];
    k.box(Math.hypot(x1 - x0, y1 - y0) + 0.001, 0.0012, 0.0155, shadeHex(c, i % 2 ? 14 : 0), (x0 + x1) / 2, (y0 + y1) / 2, 0, 0, 0, Math.atan2(y1 - y0, x1 - x0));
  }
}

/** A top hat with a pink band and a feather tucked in. */
function topHat(k: Kit, c: string): void {
  k.cyl(0.0225, 0.0225, 0.0025, c, 0, -0.016, 0, 0, 0, 0, 16);
  k.cyl(0.0128, 0.0118, 0.028, c, 0, -0.001, 0, 0, 0, 0, 14);
  k.cyl(0.0123, 0.0123, 0.0012, shadeHex(c, 20), 0, 0.013, 0, 0, 0, 0, 14);
  k.cyl(0.0122, 0.0124, 0.0065, PINK, 0, -0.0105, 0, 0, 0, 0, 14);
  k.add(new THREE.SphereGeometry(1, 8, 6).scale(0.0035, 0.015, 0.0015).translate(0, 0.015, 0), TEAL, M(0.007, -0.012, 0.009, 0, 0, -0.35));
  k.sph(0.0035, YELLOW, 0.004, -0.0105, 0.0122, 1, 1, 0.6, 6);
}

/** A confetti popper: a striped cone with confetti and curls bursting out of the top. */
function popper(k: Kit, c: string): void {
  const base = M(-0.008, -0.008, 0, 0, 0, -0.5);
  k.add(new THREE.CylinderGeometry(0.0105, 0.004, 0.03, 12), c, base);
  ([[-0.007, PINK], [0.0, SKY], [0.007, YELLOW]] as const).forEach(([y, col]) => k.add(new THREE.TorusGeometry(0.0072 + y * 0.45, 0.0014, 4, 12).rotateX(Math.PI / 2), col, at(base, 0, y, 0)));
  k.add(new THREE.CylinderGeometry(0.0012, 0.0012, 0.008, 4), GOLD, at(base, 0, -0.019, 0));
  k.add(new THREE.SphereGeometry(0.0022, 6, 5), RED, at(base, 0, -0.023, 0));
  const bits: [number, number, number][] = [[0.006, 0.012, 0.004], [0.012, 0.02, -0.003], [0.002, 0.022, 0.002], [0.016, 0.012, 0.005], [0.01, 0.026, 0.004], [0.019, 0.022, -0.002], [-0.003, 0.016, -0.004], [0.022, 0.016, 0.003], [0.014, 0.006, -0.004]];
  bits.forEach(([x, y, z], i) => k.box(0.0042, 0.0042, 0.0012, fest(i), x, y, z, i, i * 0.7, i * 1.3));
  k.tor(0.005, 0.0011, PINK, 0.014, 0.017, 0.006, 0, 0, 0.4, 10, Math.PI * 1.5);
  k.tor(0.004, 0.0011, LIME, 0.005, 0.02, -0.005, 0, 0.5, 2.0, 10, Math.PI * 1.5);
}

// ------------------------------------------------------------------------------------- props

/** Draws a cargo model into a batch, scaled up into a prop. */
function big(add: Add, model: (k: Kit, c: string) => void, c: string, m: THREE.Matrix4): void {
  const k = new Kit();
  model(k, c);
  for (const p of k.parts) add(p, '#ffffff', m);
}

const PENNANT = new THREE.ExtrudeGeometry(polygon([[-1, 0], [1, 0], [0, -1.7]]), { depth: 0.12, bevelEnabled: false }).translate(0, 0, -0.06);

/** A curve from `a` to `b` sagging by `sag` in the middle (`half`: only its first half, ending flat at the low point). */
const swag = (a: THREE.Vector3, b: THREE.Vector3, sag: number, half = false) => (t: number) => {
  const u = half ? t / 2 : t;
  const e = half ? a.clone().lerp(b, 2) : b;
  return a.clone().lerp(e, u).setY(a.y + (e.y - a.y) * u - sag * 4 * u * (1 - u));
};

/** Pennant bunting in frame `F` along curve `p`: a string with `n` flags of half-width `w`; `bulbs` hangs glowing bulbs between them. */
function bunting(add: Add, F: THREE.Matrix4, p: (t: number) => THREE.Vector3, n: number, w: number, offset: number, bulbs?: Add): void {
  const up = new THREE.Vector3(0, 1, 0);
  const seg = 8;
  for (let i = 0; i < seg; i++) {
    const p0 = p(i / seg);
    const p1 = p((i + 1) / seg);
    const d = p1.clone().sub(p0);
    const len = d.length();
    add(new THREE.CylinderGeometry(w * 0.06, w * 0.06, len, 4), WHITE, F.clone().multiply(new THREE.Matrix4().compose(p0.clone().add(p1).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(up, d.normalize()), new THREE.Vector3(1, 1, 1))));
  }
  const d = p(1).sub(p(0));
  const yaw = Math.atan2(-d.z, d.x);
  for (let i = 0; i < n; i++) {
    const q = p((i + 0.5) / n);
    add(PENNANT.clone(), fest(i + offset), at(F, q.x, q.y, q.z, 0, yaw, 0, w));
    if (bulbs && i + 1 < n) {
      const r = p((i + 1) / n);
      bulbs(new THREE.SphereGeometry(w * 0.35, 8, 6), BULBS[(i + offset) % BULBS.length] as string, at(F, r.x, r.y - w * 0.3, r.z));
    }
  }
}

/** A striped pole standing on y = 0, `h` tall, with a ball on top (glowing if `glow` is given). */
function pole(b: Add, F: THREE.Matrix4, x: number, z: number, h: number, r: number, i: number, glow?: Add): void {
  b(new THREE.CylinderGeometry(r, r * 1.15, h, 8), WHITE, at(F, x, h / 2, z));
  for (let k = 0; k < 3; k++) b(new THREE.CylinderGeometry(r * 1.08, r * 1.08, h * 0.12, 8), fest(i + k), at(F, x, h * (0.22 + k * 0.25), z));
  (glow ?? b)(new THREE.SphereGeometry(r * 2, 10, 8), BULBS[i % BULBS.length] as string, at(F, x, h + r * 1.4, z));
}

const add = (batch: GeoBatch): Add => (g, c, m) => batch.add(g, c, m);

/** The parade float: a flower-trimmed wagon with a giant smiling lion head toward +x, about 1 long. */
function floatProp({ b, m, mr, variant }: PropContext): void {
  const deck = fest(variant + 4);
  b.add(new THREE.BoxGeometry(0.98, 0.13, 0.52), fest(variant), m(0, 0.11, 0));
  b.add(new THREE.BoxGeometry(0.95, 0.05, 0.5), deck, m(0, 0.2, 0));
  for (const x of [-0.3, 0.3]) {
    for (const z of [-0.26, 0.26]) {
      b.add(new THREE.CylinderGeometry(0.075, 0.075, 0.04, 12).rotateX(Math.PI / 2), '#3b3450', m(x, 0.075, z));
      b.add(new THREE.CylinderGeometry(0.03, 0.03, 0.045, 8).rotateX(Math.PI / 2), GOLD, m(x, 0.075, z));
    }
  }
  // Flowers all round the deck's edge.
  for (let i = 0; i < 10; i++) {
    for (const z of [-0.27, 0.27]) b.add(new THREE.SphereGeometry(0.035, 7, 5), fest(i + (z > 0 ? 1 : 3)), m(-0.45 + i * 0.1, 0.23, z));
  }
  for (const z of [-0.15, -0.05, 0.05, 0.15]) b.add(new THREE.SphereGeometry(0.035, 7, 5), fest(Math.round(z * 20) + 6), m(-0.5, 0.23, z));
  // A flower mound at the back with a balloon bunch.
  b.add(new THREE.SphereGeometry(0.2, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1.1, 0.8, 1), '#3fae5a', m(-0.22, 0.22, 0));
  for (let i = 0; i < 9; i++) {
    const a = i * 2.4;
    const r = 0.06 + (i % 3) * 0.05;
    b.add(new THREE.SphereGeometry(0.04, 7, 5), fest(i + variant), m(-0.22 + Math.cos(a) * r * 1.1, 0.22 + Math.sqrt(Math.max(0, 0.04 - r * r)) * 0.8 + 0.02, Math.sin(a) * r));
  }
  for (let i = 0; i < 3; i++) big(add(b), balloon, fest(i * 3 + variant + 1), mr(-0.38 + i * 0.05, 0.52 + (i % 2) * 0.1, -0.12 + i * 0.12, 0, 0, 0, 5, 5, 5));
  // The lion.
  // The lion looks up a little so its face shows from above.
  const head = m(0.28, 0.5, 0).multiply(M(0, 0, 0, 0, 0, 0.45));
  const L = (x: number, y: number, z: number) => head.clone().multiply(new THREE.Matrix4().makeTranslation(x, y, z));
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    b.add(new THREE.SphereGeometry(0.075, 8, 6), i % 2 ? ORANGE : RED, L(-0.04, Math.sin(a) * 0.19, Math.cos(a) * 0.19));
  }
  b.add(new THREE.SphereGeometry(0.17, 14, 10), YELLOW, L(0, 0, 0));
  for (const s of [-1, 1]) {
    b.add(new THREE.SphereGeometry(0.05, 8, 6), YELLOW, L(-0.03, 0.17, s * 0.12));
    b.add(new THREE.SphereGeometry(0.03, 8, 6), PINK, L(-0.01, 0.17, s * 0.12));
    b.add(new THREE.SphereGeometry(0.058, 10, 8), '#fff3d6', L(0.13, -0.05, s * 0.045));
    b.add(new THREE.SphereGeometry(0.024, 8, 6).scale(0.6, 1.3, 1), INK, L(0.145, 0.06, s * 0.065));
    b.add(new THREE.SphereGeometry(0.009, 6, 5), WHITE, L(0.16, 0.075, s * 0.06));
    b.add(new THREE.SphereGeometry(0.03, 8, 6).scale(0.5, 0.7, 1), PINK, L(0.12, -0.0, s * 0.12));
  }
  b.add(new THREE.SphereGeometry(0.034, 8, 6).scale(0.8, 0.7, 1.2), PINK, L(0.18, -0.01, 0));
  b.add(new THREE.SphereGeometry(0.03, 8, 6).scale(0.6, 0.8, 1), RED, L(0.15, -0.11, 0));
  // A party hat on the lion.
  b.add(new THREE.ConeGeometry(0.07, 0.17, 12), VIOLET, L(-0.02, 0.22, 0).multiply(new THREE.Matrix4().makeRotationZ(0.25)));
  b.add(new THREE.TorusGeometry(0.06, 0.012, 5, 12).rotateX(Math.PI / 2), YELLOW, L(-0.008, 0.16, 0));
  b.add(new THREE.SphereGeometry(0.03, 8, 6), YELLOW, L(-0.06, 0.31, 0));
}

/** A big samba drum standing on the floor; the variant picks its colour. */
function surdoProp({ b, mr, variant }: PropContext): void {
  big(add(b), surdo, fest(variant * 3), mr(0, 0.021 * 9, 0, 0, 0, 0, 9, 9, 9));
}

/** A mask on a stand facing +x: variant 0 a Venetian mask, 1 a Rio mask with a feather crown. */
function maskStandProp({ b, m, variant }: PropContext): void {
  const v = variant % 2;
  b.add(new THREE.CylinderGeometry(0.11, 0.13, 0.04, 14), INK, m(0, 0.02, 0));
  b.add(new THREE.CylinderGeometry(0.016, 0.016, 0.6, 6), GOLD, m(0, 0.32, 0));
  // Tipped back so the face shows from above whichever way the scene turns.
  const tilt = (x: number, y: number, s: number) => m(x, y, 0).multiply(M(0, 0, 0, 0, 0, 0.75)).multiply(M(0, 0, 0, 0, Math.PI / 2, 0, s, s, s));
  if (v === 1) big(add(b), plume, fest(variant + 2), tilt(-0.06, 0.7, 11));
  big(add(b), (k, c) => mask(k, c, v ? [SKY, YELLOW, LIME] : [PINK, GOLD, TEAL], false), v ? PINK : VIOLET, tilt(0.02, 0.64, 9));
}

/** A rainbow feather headdress on a mannequin head, facing +x. */
function headdressProp({ b, m, variant }: PropContext): void {
  b.add(new THREE.CylinderGeometry(0.11, 0.13, 0.04, 14), INK, m(0, 0.02, 0));
  b.add(new THREE.CylinderGeometry(0.02, 0.02, 0.4, 6), WHITE, m(0, 0.22, 0));
  b.add(new THREE.SphereGeometry(0.1, 12, 10).scale(0.9, 1.1, 0.85), '#f3d9c0', m(0, 0.5, 0));
  b.add(new THREE.TorusGeometry(0.09, 0.022, 5, 14).rotateX(Math.PI / 2), GOLD, m(0, 0.56, 0));
  const feather = new THREE.SphereGeometry(1, 8, 6).scale(0.04, 0.2, 0.015).translate(0, 0.2, 0);
  // The fan leans back a little so it shows from above.
  const fan = m(-0.04, 0.58, 0).multiply(M(0, 0, 0, 0, 0, 0.55));
  for (let i = 0; i < 11; i++) {
    const a = -1.35 + (i / 10) * 2.7;
    b.add(feather, fest(i + variant), at(fan, 0, 0, 0, a, Math.PI / 2, 0));
    b.add(new THREE.SphereGeometry(0.024, 6, 5).scale(0.5, 1, 1), i % 2 ? GOLD : SKY, at(fan, 0.01, Math.cos(a) * 0.36, Math.sin(a) * 0.36));
  }
  feather.dispose();
  for (const z of [-0.05, 0, 0.05]) b.add(new THREE.SphereGeometry(0.018, 8, 6), z ? PINK : RED, m(0.085, 0.57, z));
}

/** The Fat Tuesday table: krapfen heaped on a plate and a pancake stack that grows each day. */
function tableProp({ b, m, mr, day }: PropContext): void {
  b.add(new THREE.CylinderGeometry(0.04, 0.06, 0.3, 8), '#c98a52', m(0, 0.15, 0));
  b.add(new THREE.CylinderGeometry(0.14, 0.16, 0.03, 12), '#c98a52', m(0, 0.015, 0));
  b.add(new THREE.CylinderGeometry(0.34, 0.34, 0.07, 20), PINK, m(0, 0.295, 0));
  b.add(new THREE.CylinderGeometry(0.33, 0.33, 0.075, 20), WHITE, m(0, 0.305, 0));
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    b.add(new THREE.SphereGeometry(0.03, 6, 4), i % 2 ? YELLOW : SKY, m(Math.cos(a) * 0.34, 0.26, Math.sin(a) * 0.34));
  }
  // Krapfen piled on a plate.
  b.add(new THREE.CylinderGeometry(0.15, 0.12, 0.02, 14), WHITE, m(-0.1, 0.35, -0.08));
  const heap: [number, number, number][] = [[-0.16, 0.37, -0.12], [-0.04, 0.37, -0.12], [-0.1, 0.37, -0.01], [-0.16, 0.37, -0.01], [-0.04, 0.37, -0.02], [-0.1, 0.43, -0.07]];
  heap.forEach(([x, y, z], i) => big(add(b), (k, c) => krapfen(k, c, false), '#f0a83a', mr(x, y + 0.03, z, 0, i * 1.3, 0, 2.2, 2.2, 2.2)));
  // Pancakes: one more each day of Carnival, with butter and syrup.
  const n = 2 + Math.min(3, day);
  b.add(new THREE.CylinderGeometry(0.11, 0.1, 0.015, 14), WHITE, m(0.15, 0.347, 0.1));
  for (let i = 0; i < n; i++) b.add(new THREE.CylinderGeometry(0.085, 0.085, 0.022, 14), i % 2 ? '#f0b558' : '#e8a548', m(0.15, 0.367 + i * 0.024, 0.1, i));
  const top = 0.356 + n * 0.024;
  b.add(new THREE.CylinderGeometry(0.075, 0.08, 0.008, 14), '#a8551c', m(0.15, top + 0.004, 0.1));
  b.add(new THREE.BoxGeometry(0.035, 0.022, 0.035), '#fff1a0', m(0.15, top + 0.018, 0.1, 0.4));
  // A jug of juice and a confetti popper.
  b.add(new THREE.CylinderGeometry(0.04, 0.045, 0.12, 10), ORANGE, m(0.12, 0.4, -0.16));
  b.add(new THREE.TorusGeometry(0.03, 0.008, 4, 8, Math.PI), ORANGE, m(0.075, 0.41, -0.16, 0).multiply(new THREE.Matrix4().makeRotationZ(Math.PI / 2)));
  big(add(b), popper, WHITE, mr(-0.18, 0.42, 0.18, 0, 0.6, 0, 3, 3, 3));
}

/** A bunch of balloons tied to a little weight. */
function balloonsProp({ b, m, mr, variant }: PropContext): void {
  b.add(new THREE.BoxGeometry(0.08, 0.06, 0.08), GOLD, m(0, 0.03, 0));
  b.add(new THREE.TorusGeometry(0.02, 0.006, 4, 8), PINK, m(0, 0.07, 0));
  const spots: [number, number, number][] = [[0, 0.95, 0], [0.13, 0.82, 0.08], [-0.12, 0.84, 0.1], [0.06, 0.8, -0.14], [-0.1, 0.78, -0.1]];
  const up = new THREE.Vector3(0, 1, 0);
  spots.forEach(([x, y, z], i) => {
    const top = new THREE.Vector3(x, y - 0.1, z);
    const from = new THREE.Vector3(0, 0.07, 0);
    const d = top.clone().sub(from);
    b.add(new THREE.CylinderGeometry(0.004, 0.004, d.length(), 4), WHITE, m(0, 0, 0).multiply(new THREE.Matrix4().compose(from.clone().add(top).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(up, d.clone().normalize()), new THREE.Vector3(1, 1, 1))));
    big(add(b), (k, c) => {
      k.sph(0.0175, c, 0, 0.007, 0, 1, 1.18, 1, 12);
      k.sph(0.0038, WHITE, -0.006, 0.016, 0.0135, 1, 1.4, 0.5, 6);
      k.cone(0.0032, 0.0045, shadeHex(c, -18), 0, -0.0145, 0, 0, 0, 0, 8);
    }, fest(i * 2 + variant), mr(x, y, z, 0, 0, 0, 6, 6, 6));
  });
}

/** A costume trunk, lid open, hats and a feather boa spilling out toward +x. */
function trunkProp({ b, m, mr }: PropContext): void {
  const wood = '#a0632e';
  b.add(new THREE.BoxGeometry(0.34, 0.24, 0.5), wood, m(0, 0.12, 0));
  b.add(new THREE.BoxGeometry(0.3, 0.02, 0.46), '#c8233f', m(0, 0.235, 0));
  for (const z of [-0.17, 0.17]) b.add(new THREE.BoxGeometry(0.35, 0.245, 0.03), GOLD, m(0, 0.12, z));
  b.add(new THREE.BoxGeometry(0.05, 0.06, 0.06), GOLD, m(0.17, 0.2, 0));
  // The lid, hinged at the back and leaning open.
  b.add(new THREE.BoxGeometry(0.34, 0.04, 0.5), shadeHex(wood, 8), mr(-0.17, 0.24, 0, 0, 0, 1.9).multiply(new THREE.Matrix4().makeTranslation(0.17, 0, 0)));
  // Hats and things.
  big(add(b), jester, LIME, mr(0.0, 0.32, -0.1, 0, Math.PI / 2, 0.2, 5.5, 5.5, 5.5));
  big(add(b), topHat, '#6a6f82', mr(0.32, 0.16 * 0.6 + 0.012, 0.16, 0.2, 0, -0.15, 6, 6, 6));
  big(add(b), mask, VIOLET, mr(0.3, 0.02, -0.14, -Math.PI / 2, 0, 0.6, 5, 5, 5));
  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    b.add(new THREE.SphereGeometry(0.035, 7, 5), i % 2 ? PINK : '#ff8cc6', m(0.05 + t * 0.32, 0.25 - t * t * 0.23 + Math.sin(t * 9) * 0.02, 0.08 + Math.sin(t * 5) * 0.06));
  }
}

/** A string of pennant bunting between two striped poles, 1.1 long along z. */
function buntingProp({ b, glow, m, variant }: PropContext): void {
  const F = m(0, 0, 0);
  for (const z of [-0.55, 0.55]) pole(add(b), F, 0, z, 0.7, 0.02, variant + (z > 0 ? 2 : 0), add(glow));
  bunting(add(b), F, swag(new THREE.Vector3(0, 0.66, -0.55), new THREE.Vector3(0, 0.66, 0.55), 0.14), 8, 0.05, variant, add(glow));
}

/** Confetti and streamer curls on the floor. */
function confettiProp({ b, m, variant }: PropContext): void {
  for (let i = 0; i < 26; i++) {
    const a = i * 2.39996 + variant;
    const r = 0.06 + Math.sqrt(i / 26) * 0.32;
    b.add(new THREE.BoxGeometry(0.032, 0.006, 0.022), fest(i + variant), m(Math.cos(a) * r, 0.004, Math.sin(a) * r, a * 3));
  }
  for (let i = 0; i < 3; i++) b.add(new THREE.TorusGeometry(0.07 + i * 0.02, 0.008, 4, 12, Math.PI * 1.4).rotateX(Math.PI / 2), fest(i * 3 + variant + 1), m(-0.2 + i * 0.2, 0.01, i % 2 ? 0.12 : -0.1, i * 2));
}

// ------------------------------------------------------------------------------------- the skin

const FRONT = -Math.PI / 2;

const skin: HolidaySkin = {
  id: 'carnival',
  name: 'Carnival',
  greeting: 'Happy Carnival!',
  cargo: { red: surdo, orange: trumpet, yellow: krapfen, green: jester, teal: plume, purple: turned(mask, Math.PI / 4, 0.2), pink: balloon, brown: maracas, blue: streamerRoll, gray: topHat, white: popper },
  props: {
    'cv.float': floatProp,
    'cv.surdo': surdoProp,
    'cv.mask': maskStandProp,
    'cv.headdress': headdressProp,
    'cv.table': tableProp,
    'cv.balloons': balloonsProp,
    'cv.trunk': trunkProp,
    'cv.bunting': buntingProp,
    'cv.confetti': confettiProp,
  },
  inside: [
    {
      name: 'paradeFloat', w: 2, h: 1,
      items: [['cv.confetti', 0.1, 0.05, 0, 1.1, 0, 1], ['cv.float', 0.05, 0, -0.35, 0.82, 0, 0], ['cv.surdo', -0.78, 0.12, 0, 0.75, 0, 0], ['cv.surdo', -0.72, -0.25, 0, 0.6, 0, 1], ['toy:top', 0.78, 0.25, -0.6, 0.55]],
    },
    {
      name: 'fatTuesday', w: 2, h: 2,
      items: [['cv.table', -0.05, 0, 0.3, 1.25], ['cv.balloons', 0.62, -0.5, 0, 0.95, 0, 0], ['cv.confetti', 0.4, 0.55, 0, 1, 0, 2], ['toy:duck', -0.62, 0.5, 0.4, 0.6], ['toy:dice', 0.7, 0.55, 0.5, 0.55]],
    },
    {
      name: 'costumeTrunk', w: 2, h: 2,
      items: [['cv.trunk', -0.15, -0.1, FRONT + 0.25, 1.15], ['cv.mask', 0.55, -0.5, FRONT, 1, 0, 0], ['cv.headdress', -0.65, -0.5, FRONT + 0.3, 0.95, 0, 0], ['cv.mask', 0.65, 0.35, FRONT - 0.3, 0.9, 0, 1], ['toy:ball', -0.6, 0.55, 0.3, 0.6]],
    },
    {
      name: 'sambaBand', w: 2, h: 1,
      items: [['cv.surdo', -0.62, 0, 0, 1, 0, 0], ['cv.surdo', -0.15, 0.08, 0, 0.8, 0, 1], ['cv.surdo', 0.25, -0.05, 0, 0.65, 0, 2], ['toy:top', 0.68, 0.15, -0.5, 0.6], ['toy:teddy', 0.62, -0.25, 0.5, 0.55]],
    },
    {
      name: 'maskParade', w: 2, h: 1,
      items: [['cv.bunting', 0, -0.3, Math.PI / 2, 1.15, 0, 0], ['cv.mask', -0.5, 0.05, FRONT, 0.85, 0, 0], ['cv.headdress', 0, 0.05, FRONT, 0.85, 0, 1], ['cv.mask', 0.5, 0.05, FRONT, 0.85, 0, 1]],
    },
  ],
  outside: [
    {
      name: 'bigParade', w: 2.6, h: 0,
      items: [['cv.confetti', 0, 0.3, 0, 4, 0, 0], ['cv.float', 0.2, 0, -0.35, 3, 0, 1], ['cv.surdo', -1.9, 0.5, 0, 2.6, 0, 2], ['cv.surdo', -1.6, -0.6, 0, 2.2, 0, 0], ['cv.balloons', 1.8, -0.7, 0, 3, 0, 3]],
    },
    {
      name: 'carnivalFeast', w: 2.2, h: 0,
      items: [['cv.table', 0, 0, 0.3, 3.6], ['cv.balloons', -1.4, -0.6, 0, 3.2, 0, 1], ['cv.confetti', 1.1, 0.8, 0, 3, 0, 3], ['toy:duck', 1.3, -0.5, 0.5, 2.2]],
    },
    {
      name: 'costumeCorner', w: 2.4, h: 0,
      items: [['cv.trunk', 0, 0, FRONT + 0.3, 3.4], ['cv.mask', -1.4, -0.5, FRONT + 0.2, 3, 0, 1], ['cv.headdress', 1.4, -0.4, FRONT - 0.2, 3, 0, 0], ['cv.bunting', 0, -1.3, Math.PI / 2, 2.6, 0, 3], ['toy:robot', 1.2, 0.9, 0.4, 2]],
    },
  ],
  edge(b, glow, spot) {
    const lit = add(b);
    const bright = add(glow);
    const H = 0.42;
    if (spot.corner) {
      // A tall striped pole with balloons, bunting running off along both edges.
      const sx = Math.sign(spot.x) || 1;
      const sz = Math.sign(spot.z) || 1;
      const F = new THREE.Matrix4().makeTranslation(spot.x + sx * 0.05, 0, spot.z + sz * 0.05);
      pole(lit, F, 0, 0, H + 0.1, 0.026, spot.index, bright);
      for (const [dx, dz] of [[-sx * 0.46, 0], [0, -sz * 0.46]] as const) bunting(lit, F, swag(new THREE.Vector3(0, H, 0), new THREE.Vector3(dx, H, dz), 0.14, true), 3, 0.065, spot.index + (dx ? 0 : 3));
      for (let i = 0; i < 3; i++) big(lit, balloon, fest(spot.index * 2 + i * 3), at(F, Math.cos(i * 2.1) * 0.07, H + 0.2 + (i % 2) * 0.06, Math.sin(i * 2.1) * 0.07, 0, 0, 0, 4.5));
      return;
    }
    const F = new THREE.Matrix4().compose(new THREE.Vector3(spot.x, 0, spot.z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), spot.yaw), new THREE.Vector3(1, 1, 1));
    pole(lit, F, 0.05, 0, H, 0.022, spot.index, bright);
    // Half a swag each way: neighbouring poles' halves meet at the low point.
    for (const s of [-1, 1]) bunting(lit, F, swag(new THREE.Vector3(0.05, H - 0.02, 0), new THREE.Vector3(0.05, H - 0.02, s * 0.46), 0.14, true), 3, 0.065, spot.index * 3 + (s > 0 ? 0 : 3));
    // A zigzag crepe streamer along the rim.
    const col = fest(spot.index * 5 + 2);
    for (let i = 0; i < 8; i++) b.add(new THREE.BoxGeometry(0.012, 0.035, 0.13), i % 2 ? col : shadeHex(col, 25), at(F, 0.035, 0.05, -0.42 + i * 0.12, i % 2 ? 0.45 : -0.45));
  },
  station(b, f, glow) {
    const w = f.width / 2;
    const F = f.m(0, 0, 0);
    // Bunting with glowing bulbs along the awning's front edge.
    const y = f.awningY - 0.05;
    const z = f.awningZ + 0.17;
    bunting(add(b), F, swag(new THREE.Vector3(-w, y, z), new THREE.Vector3(w, y, z), 0.05), Math.max(6, Math.round(f.width / 0.14)), 0.06, 0, add(glow));
    for (const s of [-1, 1]) {
      // A mask on each end post, balloons tied to the front corners of the roof.
      big(add(b), (k, c) => mask(k, c, s > 0 ? [SKY, YELLOW, LIME] : [PINK, GOLD, TEAL], false), s > 0 ? PINK : VIOLET, at(F, s * w, 0.32, f.awningZ + 0.14, -0.35, 0, 0, 5));
      for (let i = 0; i < 3; i++) big(add(b), balloon, fest(i * 3 + (s > 0 ? 1 : 0)), at(F, s * (w - 0.06) + Math.cos(i * 2.1) * 0.06, f.roofY + 0.12 + (i % 2) * 0.06, f.frontZ + 0.02 + Math.sin(i * 2.1) * 0.05, 0, 0, 0, 3.8));
    }
  },
  engine(b) {
    // A jester hat on the cab roof.
    big((g, c, m) => b.add(g, c, m), (k, c) => jester(k, c, YELLOW), RED, M(-0.17, 0.42 + 0.019 * 4.3, 0, 0, 0, 0, 4.3, 4.3, 4.3));
  },
  light: { sunColor: '#fff2e0', hemiSky: '#ffeefa' },
  fx: { kind: 'confetti', colors: [PINK, YELLOW, SKY, LIME, VIOLET, ORANGE, RED, TEAL, '#ffffff'], count: 90 },
};

export default skin;
