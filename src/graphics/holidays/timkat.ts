// Timkat (Ethiopian Epiphany, 19–20 January): a sunny highland festival by the water. A procession
// of big velvet umbrellas, fringed and embroidered in gold, sways along to kebero drums; people in
// white netela shawls splash each other from buckets round a fountain pool; striped tents stand by
// the water and a coffee ceremony is laid out on fresh grass (jebena, little cups, popcorn).
// Green-yellow-red bunting runs round the diorama and the station, and the engine carries a little
// fringed umbrella. Umbrellas, drums, coffee pots, cups, mesob baskets, candles, buckets, shawl
// rolls, bunting and popcorn ride in the wagons.
import * as THREE from 'three';
import type { GeoBatch } from '../batch';
import type { HolidaySkin, Item, PropContext } from '../holiday';
import { ring } from '../holiday';
import { INK, M, WHITE, paintFaces, shadeHex, type Kit } from '../toyModels';

const GREEN = '#1f9a4a';
const YELLOW = '#ffd21f';
const RED = '#e0262f';
const FLAG = [GREEN, YELLOW, RED];
const VELVET = ['#d8213a', '#7b2fbf', '#1f9a4a', '#2f6fd8', '#e8459a', '#f08a1c'];
const GOLD = '#f6c331';
const SKIN = '#7a4a2e';
const CLAY = '#3b2418';
const WOOD = '#a0643a';
const LEATHER = '#f2e2c0';
const WATER = '#3fb4ff';
const SPRAY = '#c9f0ff';
const STONE = '#efe2c8';
const GRASS = '#5fb84a';
const STRAW = '#e8c35a';

const pick = <T>(a: readonly T[], i: number): T => a[((i % a.length) + a.length) % a.length] as T;
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const UP = V(0, 1, 0);

/** A cylinder from p to q (pre-placed geometry). */
function strut(p: THREE.Vector3, q: THREE.Vector3, r: number, seg = 6): THREE.BufferGeometry {
  const d = q.clone().sub(p);
  const g = new THREE.CylinderGeometry(r, r, d.length(), seg);
  return g.applyMatrix4(new THREE.Matrix4().compose(p.clone().add(q).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(UP, d.normalize()), V(1, 1, 1)));
}

/** A small triangular pennant hanging from its top edge (in the x-y plane). */
const pennant = (w: number, h: number) =>
  new THREE.ExtrudeGeometry(new THREE.Shape([new THREE.Vector2(-w / 2, 0), new THREE.Vector2(w / 2, 0), new THREE.Vector2(0, -h)]), { depth: w * 0.12, bevelEnabled: false }).translate(0, 0, -w * 0.06);

// ------------------------------------------------------------------------------------- cargo

/** A fringed ceremonial umbrella, velvet with gold. */
function umbrellaCargo(k: Kit, c: string): void {
  k.cyl(0.0018, 0.0018, 0.05, '#c98a52', 0, -0.004, 0, 0, 0, 0, 6);
  k.sph(0.003, GOLD, 0, -0.029, 0, 1, 1, 1, 6);
  k.dome(0.026, c, 0, 0.011, 0, 1, 0.55, 1, 12);
  k.cyl(0.0262, 0.0262, 0.007, shadeHex(c, -18), 0, 0.008, 0, 0, 0, 0, 12);
  k.tor(0.0264, 0.0015, GOLD, 0, 0.0045, 0, Math.PI / 2, 0, 0, 14);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    k.box(0.0022, 0.007, 0.0022, GOLD, Math.cos(a) * 0.026, 0.0005, Math.sin(a) * 0.026);
    if (i % 2 === 0) k.sph(0.0022, GOLD, Math.cos(a) * 0.018, 0.0215, Math.sin(a) * 0.018, 1, 1, 1, 5);
  }
  k.sph(0.0038, GOLD, 0, 0.027, 0, 1, 1, 1, 6);
  k.cone(0.002, 0.007, GOLD, 0, 0.033, 0, 0, 0, 0, 5);
}

/** A kebero drum on its side: a big and a small leather head, laced along the body. */
function kebero(k: Kit, c: string): void {
  k.cyl(0.015, 0.02, 0.042, c, 0, -0.004, 0, 0, 0, -Math.PI / 2, 12);
  k.cyl(0.0158, 0.0158, 0.003, LEATHER, -0.0215, -0.004, 0, 0, 0, Math.PI / 2, 12);
  k.cyl(0.0208, 0.0208, 0.003, LEATHER, 0.0215, -0.004, 0, 0, 0, Math.PI / 2, 12);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const b = a + Math.PI / 8;
    k.add(strut(V(-0.021, -0.004 + Math.cos(a) * 0.0162, Math.sin(a) * 0.0162), V(0.021, -0.004 + Math.cos(b) * 0.0212, Math.sin(b) * 0.0212), 0.0012, 4), INK);
  }
  k.tor(0.0162, 0.0016, GREEN, -0.019, -0.004, 0, 0, Math.PI / 2, 0, 12);
  k.tor(0.0212, 0.0016, YELLOW, 0.019, -0.004, 0, 0, Math.PI / 2, 0, 12);
  k.tor(0.018, 0.0016, RED, 0, 0.012, 0, 0, 0, 0, 10, Math.PI);
}

/** A jebena coffee pot: round belly, tall neck, spout, handle and a straw stopper. */
function jebena(k: Kit, c: string): void {
  k.sph(0.017, c, 0, -0.012, 0, 1, 0.9, 1, 12);
  k.cyl(0.009, 0.011, 0.004, shadeHex(c, -15), 0, -0.027, 0, 0, 0, 0, 10);
  k.cyl(0.0055, 0.0075, 0.024, c, 0, 0.012, 0, 0, 0, 0, 10);
  k.cyl(0.008, 0.0055, 0.006, c, 0, 0.026, 0, 0, 0, 0, 10);
  k.sph(0.0055, STRAW, 0, 0.031, 0, 1, 0.8, 1, 6);
  k.add(strut(V(0.012, -0.008, 0), V(0.024, 0.008, 0), 0.0028, 6), c);
  k.tor(0.011, 0.0022, c, -0.007, 0.004, 0, 0, 0, Math.PI / 2, 10, Math.PI);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    k.sph(0.0018, i % 2 ? YELLOW : WHITE, Math.cos(a) * 0.0168, -0.008, Math.sin(a) * 0.0168, 1, 1, 1, 5);
  }
}

/** A little handleless coffee cup on its saucer, with a green-and-red painted band. */
function coffeeCup(k: Kit, c: string): void {
  k.cyl(0.024, 0.02, 0.005, c, 0, -0.016, 0, 0, 0, 0, 14);
  k.tor(0.022, 0.0016, YELLOW, 0, -0.0135, 0, Math.PI / 2, 0, 0, 14);
  k.cyl(0.017, 0.011, 0.026, c, 0, 0.002, 0, 0, 0, 0, 14);
  k.cyl(0.0158, 0.0158, 0.002, '#4a2410', 0, 0.0145, 0, 0, 0, 0, 12);
  k.tor(0.0158, 0.0018, GREEN, 0, 0.008, 0, Math.PI / 2, 0, 0, 14);
  k.tor(0.0135, 0.0016, RED, 0, -0.002, 0, Math.PI / 2, 0, 0, 14);
  k.tor(0.005, 0.0012, WHITE, 0, 0.022, 0, 0, 0, 0, 8, Math.PI);
}

/** A mesob: the woven hourglass basket with its pointed lid. */
function mesob(k: Kit, c: string): void {
  const pts = [[0.001, -0.028], [0.017, -0.028], [0.014, -0.022], [0.008, -0.012], [0.012, -0.006], [0.021, 0.0], [0.022, 0.004], [0.016, 0.014], [0.008, 0.022], [0.002, 0.028], [0.0001, 0.029]].map(([x, y]) => new THREE.Vector2(x, y));
  k.add(new THREE.LatheGeometry(pts, 12), c);
  k.tor(0.0085, 0.0018, RED, 0, -0.012, 0, Math.PI / 2, 0, 0, 12);
  k.tor(0.0215, 0.0018, GREEN, 0, 0.002, 0, Math.PI / 2, 0, 0, 14);
  k.tor(0.016, 0.0018, RED, 0, -0.025, 0, Math.PI / 2, 0, 0, 12);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    k.sph(0.0024, i % 2 ? RED : '#7b2fbf', Math.cos(a) * 0.014, 0.0135, Math.sin(a) * 0.014, 1, 1, 1, 5);
  }
  k.sph(0.0038, RED, 0, 0.031, 0, 1, 1, 1, 6);
}

/** A taper candle with a drip, a flame and a little gold dish. */
function candle(k: Kit, c: string): void {
  k.cyl(0.016, 0.014, 0.004, GOLD, 0, -0.026, 0, 0, 0, 0, 12);
  k.cyl(0.0075, 0.0085, 0.04, c, 0, -0.004, 0, 0, 0, 0, 10);
  k.sph(0.0035, shadeHex(c, 18), 0.007, 0.01, 0.002, 1, 1.8, 1, 6);
  k.cyl(0.0009, 0.0009, 0.004, INK, 0, 0.018, 0, 0, 0, 0, 4);
  k.sph(0.0045, '#ff9a1e', 0, 0.023, 0, 1, 1.6, 1, 8);
  k.sph(0.0028, '#fff27a', 0, 0.021, 0, 1, 1.4, 1, 6);
}

/** A bucket brimming with water, a splash leaping out. */
function bucketCargo(k: Kit, c: string): void {
  k.cyl(0.021, 0.016, 0.034, c, 0, -0.01, 0, 0, 0, 0, 12);
  k.tor(0.021, 0.0022, shadeHex(c, 30), 0, 0.007, 0, Math.PI / 2, 0, 0, 14);
  k.cyl(0.0195, 0.0195, 0.002, WATER, 0, 0.004, 0, 0, 0, 0, 12);
  k.tor(0.02, 0.0013, '#9aa3b5', 0, 0.006, 0, 0, 0, 0, 12, Math.PI);
  for (const [x, y, z, r] of [[0.004, 0.014, 0.004, 0.004], [0.011, 0.022, -0.003, 0.003], [-0.006, 0.019, -0.006, 0.0028], [0.016, 0.027, 0.004, 0.0022]] as const) k.sph(r, SPRAY, x, y, z, 1, 1, 1, 6);
}

/** A rolled netela shawl with its woven tibeb border at both ends. */
function netelaRoll(k: Kit, c: string): void {
  k.cyl(0.014, 0.014, 0.046, c, 0, -0.008, 0, Math.PI / 2, 0, 0, 12);
  for (const s of [-1, 1]) {
    k.cyl(0.0145, 0.0145, 0.004, YELLOW, 0, -0.008, s * 0.017, Math.PI / 2, 0, 0, 12);
    k.cyl(0.0145, 0.0145, 0.0025, RED, 0, -0.008, s * 0.0205, Math.PI / 2, 0, 0, 12);
    k.tor(0.007, 0.0015, shadeHex(c, -25), 0, -0.008, s * 0.0232, 0, 0, 0, 10);
  }
  k.box(0.026, 0.003, 0.046, c, 0.016, -0.02, 0, 0, 0, -0.35);
  k.box(0.004, 0.0032, 0.046, GREEN, 0.028, -0.0245, 0, 0, 0, -0.35);
}

/** A short string of pennants between two little posts. */
function buntingCargo(k: Kit, c: string): void {
  for (const x of [-0.023, 0.023]) {
    k.cyl(0.0018, 0.0022, 0.05, WOOD, x, -0.004, 0, 0, 0, 0, 6);
    k.sph(0.003, x < 0 ? YELLOW : RED, x, 0.022, 0, 1, 1, 1, 6);
  }
  const g = pennant(0.014, 0.022);
  for (let i = 0; i < 3; i++) {
    const x = -0.0135 + i * 0.0135;
    const y = 0.017 - Math.cos(((i - 1) / 2) * Math.PI) * 0.003;
    k.add(g.clone(), i === 1 ? shadeHex(c, 18) : c, M(x, y, 0));
    k.box(0.015, 0.0018, 0.003, i === 1 ? RED : YELLOW, x, y, 0);
  }
  k.add(strut(V(-0.023, 0.019, 0), V(0.023, 0.019, 0), 0.0008, 4), WHITE);
}

/** A metal bowl heaped with popcorn. */
function popcornBowl(k: Kit, c: string): void {
  k.add(new THREE.SphereGeometry(0.025, 14, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).scale(1, 0.75, 1), c, M(0, 0.004, 0));
  k.cyl(0.011, 0.013, 0.006, shadeHex(c, -20), 0, -0.016, 0, 0, 0, 0, 10);
  k.tor(0.0248, 0.002, shadeHex(c, 30), 0, 0.004, 0, Math.PI / 2, 0, 0, 16);
  const kernels: [number, number, number][] = [[0, 0.013, 0], [0.01, 0.009, 0.004], [-0.009, 0.009, 0.007], [0.004, 0.008, -0.012], [-0.011, 0.008, -0.006], [0.015, 0.006, -0.006], [-0.003, 0.008, 0.014], [0.012, 0.006, 0.013], [-0.016, 0.006, 0.004]];
  kernels.forEach(([x, y, z], i) => k.sph(0.0055, i % 3 ? WHITE : '#fff1b8', x, y, z, 1, 0.85, 1, 6));
}

// ------------------------------------------------------------------------------------- builders

type Add = (g: THREE.BufferGeometry, c: string, local?: THREE.Matrix4) => void;
const adder = (b: GeoBatch, base: THREE.Matrix4): Add => (g, c, local) => b.add(g, c, local ? base.clone().multiply(local) : base);

/** A big velvet umbrella: canopy centered at (x, y, z), radius r, its pole reaching `pole` down. */
function umbrella(add: Add, x: number, y: number, z: number, r: number, c: string, pole: number, tilt = 0): void {
  const T = (lx: number, ly: number, lz: number, rx = 0, ry = 0, rz = 0) => M(x, y, z, 0, 0, tilt).multiply(M(lx, ly, lz, rx, ry, rz));
  add(new THREE.CylinderGeometry(r * 0.05, r * 0.05, pole + r * 0.6, 6), '#c98a52', T(0, (r * 0.6 - pole) / 2, 0));
  add(new THREE.SphereGeometry(r, 12, 4, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.55, 1), c, T(0, 0, 0));
  add(new THREE.CylinderGeometry(r * 1.01, r * 1.01, r * 0.24, 12), shadeHex(c, -18), T(0, -r * 0.1, 0));
  add(new THREE.TorusGeometry(r * 1.02, r * 0.035, 4, 14).rotateX(Math.PI / 2), GOLD, T(0, -r * 0.22, 0));
  add(new THREE.TorusGeometry(r * 0.72, r * 0.03, 4, 12).rotateX(Math.PI / 2), GOLD, T(0, r * 0.36, 0));
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    add(new THREE.BoxGeometry(r * 0.07, r * 0.26, r * 0.07), GOLD, T(Math.cos(a) * r * 1.02, -r * 0.36, Math.sin(a) * r * 1.02));
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    add(new THREE.SphereGeometry(r * 0.07, 6, 4), GOLD, T(Math.cos(a) * r * 0.86, r * 0.18, Math.sin(a) * r * 0.86));
  }
  add(new THREE.SphereGeometry(r * 0.11, 8, 6), GOLD, T(0, r * 0.58, 0));
  add(new THREE.ConeGeometry(r * 0.06, r * 0.22, 6), GOLD, T(0, r * 0.75, 0));
}

/** A bucket of water (about 0.1 tall at s = 1). */
function bucket(add: Add, x: number, y: number, z: number, s: number, c: string, tip = 0): void {
  const T = (ly: number) => M(x, y, z, tip, 0, 0, s, s, s).multiply(M(0, ly, 0));
  add(new THREE.CylinderGeometry(0.06, 0.045, 0.1, 10), c, T(0.05));
  add(new THREE.TorusGeometry(0.06, 0.007, 4, 12).rotateX(Math.PI / 2), shadeHex(c, 30), T(0.1));
  add(new THREE.CylinderGeometry(0.056, 0.056, 0.005, 10), WATER, T(0.092));
}

type Pose = 'plain' | 'umbrella' | 'bucket' | 'drum';

/** A wooden peg doll in a white dress and a white netela shawl with a coloured border (0.4 tall). */
function doll(add: Add, border: string, pose: Pose, accent: string): void {
  add(new THREE.CylinderGeometry(0.055, 0.08, 0.2, 10), WHITE, M(0, 0.1, 0));
  add(new THREE.CylinderGeometry(0.081, 0.081, 0.03, 10), border, M(0, 0.02, 0));
  add(new THREE.BoxGeometry(0.012, 0.15, 0.022), border, M(0.068, 0.1, 0, 0, 0, 0.13));
  add(new THREE.SphereGeometry(0.072, 10, 6).scale(1, 0.62, 1), WHITE, M(0, 0.205, 0));
  add(new THREE.TorusGeometry(0.07, 0.007, 4, 14).rotateX(Math.PI / 2), border, M(0, 0.19, 0));
  add(new THREE.SphereGeometry(0.057, 10, 8), SKIN, M(0.004, 0.28, 0));
  add(new THREE.SphereGeometry(0.063, 10, 7), WHITE, M(-0.014, 0.29, 0));
  add(new THREE.TorusGeometry(0.052, 0.008, 4, 14).rotateY(Math.PI / 2), border, M(0.03, 0.283, 0));
  for (const s of [-1, 1]) add(new THREE.SphereGeometry(0.007, 5, 4), INK, M(0.058, 0.288, s * 0.018));
  add(new THREE.TorusGeometry(0.012, 0.003, 3, 6, Math.PI).rotateY(Math.PI / 2).rotateX(Math.PI), '#b0302a', M(0.059, 0.268, 0));
  const arm = (side: number, hx: number, hy: number, hz: number) => {
    add(strut(V(0, 0.2, side * 0.06), V(hx, hy, hz), 0.017), WHITE);
    add(new THREE.SphereGeometry(0.018, 6, 5), SKIN, M(hx, hy, hz));
  };
  if (pose === 'umbrella') {
    arm(-1, 0.075, 0.25, -0.012);
    arm(1, 0.075, 0.2, 0.012);
    umbrella(add, 0.08, 0.68, 0, 0.21, accent, 0.58);
  } else if (pose === 'bucket') {
    // Swinging a bucket forward: the water flies out in an arc.
    arm(-1, 0.1, 0.26, -0.04);
    arm(1, 0.1, 0.26, 0.04);
    bucket(add, 0.13, 0.24, 0, 0.9, accent, -0.9);
    for (let i = 0; i < 7; i++) {
      const t = (i + 1) / 7;
      add(new THREE.SphereGeometry(0.028 - t * 0.012, 6, 5), i % 2 ? SPRAY : WATER, M(0.2 + t * 0.32, 0.34 + t * 0.12 - t * t * 0.4, Math.sin(i * 2.1) * 0.04));
    }
  } else if (pose === 'drum') {
    arm(-1, 0.1, 0.16, -0.09);
    arm(1, 0.1, 0.16, 0.09);
    add(new THREE.CylinderGeometry(0.06, 0.075, 0.2, 10).rotateX(Math.PI / 2), accent, M(0.1, 0.16, 0));
    for (const [z, r] of [[-0.1, 0.06], [0.1, 0.075]] as const) add(new THREE.CylinderGeometry(r + 0.003, r + 0.003, 0.008, 10).rotateX(Math.PI / 2), LEATHER, M(0.1, 0.16, z));
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      add(strut(V(0.1 + Math.cos(a) * 0.062, 0.16 + Math.sin(a) * 0.062, -0.1), V(0.1 + Math.cos(a + 0.5) * 0.077, 0.16 + Math.sin(a + 0.5) * 0.077, 0.1), 0.004, 4), INK);
    }
    add(strut(V(0.1, 0.16, -0.06), V(0, 0.21, 0), 0.006, 4), RED);
  } else {
    arm(-1, 0.04, 0.12, -0.08);
    arm(1, 0.04, 0.12, 0.08);
  }
}

/** Pennants on a sagging cord from p to q (local units). */
function bunting(add: Add, p: THREE.Vector3, q: THREE.Vector3, sag: number, n: number, size: number, phase = 0): void {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    pts.push(p.clone().lerp(q, t).add(V(0, -Math.sin(t * Math.PI) * sag, 0)));
  }
  add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, size * 0.05, 4), WHITE);
  const yaw = -Math.atan2(q.z - p.z, q.x - p.x);
  const g = pennant(size, size * 1.3).rotateY(yaw);
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const at = p.clone().lerp(q, t).add(V(0, -Math.sin(t * Math.PI) * sag, 0));
    add(g.clone(), pick(FLAG, i + phase), M(at.x, at.y, at.z));
  }
}

// ------------------------------------------------------------------------------------- props

const base = (ctx: PropContext) => adder(ctx.b, ctx.m(0, 0, 0));

function carrier(ctx: PropContext): void {
  doll(base(ctx), pick(FLAG, ctx.variant + 1), 'umbrella', pick(VELVET, ctx.variant));
}

function splasher(ctx: PropContext): void {
  doll(base(ctx), pick(VELVET, ctx.variant + 2), 'bucket', pick(['#2f6fd8', '#f08a1c', '#e8459a', '#1f9a4a'], ctx.variant));
}

function drummer(ctx: PropContext): void {
  doll(base(ctx), pick(FLAG, ctx.variant), 'drum', pick(['#c25a1e', '#8a4a26', '#a0302a'], ctx.variant));
}

function guest(ctx: PropContext): void {
  doll(base(ctx), pick(VELVET, ctx.variant + 1), 'plain', WHITE);
}

/** A standing umbrella on a weighted base (props-local, about 0.75 tall). */
function standingUmbrella(ctx: PropContext): void {
  const add = base(ctx);
  add(new THREE.CylinderGeometry(0.07, 0.09, 0.05, 10), WOOD, M(0, 0.025, 0));
  umbrella(add, 0, 0.62, 0, 0.22, pick(VELVET, ctx.variant), 0.6);
}

/** A round pool with a stone rim and a fountain splashing in the middle (radius 0.66). */
function pool({ b, m }: PropContext): void {
  b.add(new THREE.CylinderGeometry(0.62, 0.66, 0.08, 24), STONE, m(0, 0.04, 0));
  b.add(new THREE.CylinderGeometry(0.54, 0.54, 0.084, 24), WATER, m(0, 0.042, 0));
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    b.add(new THREE.BoxGeometry(0.07, 0.012, 0.09), pick(FLAG, i), m(Math.cos(a) * 0.6, 0.083, Math.sin(a) * 0.6, -a));
  }
  for (const r of [0.28, 0.42]) b.add(new THREE.TorusGeometry(r, 0.008, 3, 24).rotateX(Math.PI / 2), SPRAY, m(0, 0.086, 0));
  // The fountain: a pedestal, a bowl spilling a sheet of water, jets arcing out.
  b.add(new THREE.CylinderGeometry(0.05, 0.07, 0.2, 10), STONE, m(0, 0.15, 0));
  b.add(new THREE.SphereGeometry(0.16, 12, 4, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).scale(1, 0.4, 1), STONE, m(0, 0.27, 0));
  b.add(new THREE.CylinderGeometry(0.15, 0.15, 0.01, 12), WATER, m(0, 0.268, 0));
  b.add(new THREE.CylinderGeometry(0.155, 0.2, 0.18, 12, 1, true), SPRAY, m(0, 0.18, 0));
  b.add(new THREE.ConeGeometry(0.035, 0.22, 8), SPRAY, m(0, 0.38, 0));
  b.add(new THREE.SphereGeometry(0.04, 8, 6), WHITE, m(0, 0.5, 0));
  for (let j = 0; j < 6; j++) {
    const a = (j / 6) * Math.PI * 2 + 0.25;
    for (let i = 0; i < 5; i++) {
      const t = (i + 1) / 5;
      const r = 0.04 + t * 0.34;
      b.add(new THREE.SphereGeometry(0.026 - t * 0.008, 6, 5), i % 2 ? WHITE : SPRAY, m(Math.cos(a) * r, 0.48 + t * 0.12 - t * t * 0.48, Math.sin(a) * r));
    }
    b.add(new THREE.TorusGeometry(0.03, 0.008, 3, 8).rotateX(Math.PI / 2), WHITE, m(Math.cos(a) * 0.4, 0.09, Math.sin(a) * 0.4));
  }
}

/** A tent with a striped green-yellow-red canopy and a scalloped valance (about 0.75 tall). */
function tent({ b, m, variant }: PropContext): void {
  const roof = paintFaces(new THREE.ConeGeometry(0.46, 0.3, 12, 1), (cx, _cy, cz) => pick(FLAG, Math.floor(((Math.atan2(cz, cx) + Math.PI) / (Math.PI * 2)) * 12) + variant));
  b.add(roof, '#ffffff', m(0, 0.55, 0));
  for (let i = 0; i < 12; i++) {
    const a = ((i + 0.5) / 12) * Math.PI * 2;
    b.add(new THREE.CylinderGeometry(0.05, 0.05, 0.012, 8, 1, false, 0, Math.PI).rotateX(Math.PI / 2).rotateZ(Math.PI), pick(FLAG, i + variant + 1), m(Math.cos(a) * 0.44, 0.4, Math.sin(a) * 0.44, -a + Math.PI / 2));
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    b.add(new THREE.CylinderGeometry(0.015, 0.015, 0.42, 6), WOOD, m(Math.cos(a) * 0.38, 0.21, Math.sin(a) * 0.38));
  }
  b.add(new THREE.CylinderGeometry(0.42, 0.42, 0.01, 16), '#c94a5a', m(0, 0.005, 0));
  b.add(new THREE.CylinderGeometry(0.012, 0.012, 0.2, 6), WOOD, m(0, 0.78, 0));
  b.add(new THREE.SphereGeometry(0.025, 8, 6), GOLD, m(0, 0.88, 0));
  b.add(pennant(0.1, 0.14).rotateZ(Math.PI / 2).translate(0.07, 0, 0), GREEN, m(0, 0.84, 0));
}

/** Two poles with green-yellow-red bunting between them (1 wide along z). */
function buntingProp(ctx: PropContext): void {
  const add = base(ctx);
  for (const z of [-0.5, 0.5]) {
    add(new THREE.CylinderGeometry(0.014, 0.018, 0.55, 6), WOOD, M(0, 0.275, z));
    add(new THREE.SphereGeometry(0.03, 8, 6), GOLD, M(0, 0.56, z));
  }
  bunting(add, V(0, 0.52, -0.5), V(0, 0.52, 0.5), 0.12, 7, 0.1, ctx.variant);
}

function jebenaAt(add: Add, x: number, y: number, z: number, s: number): void {
  const T = (lx: number, ly: number, lz: number, rz = 0) => M(x, y, z, 0, 0, 0, s, s, s).multiply(M(lx, ly, lz, 0, 0, rz));
  add(new THREE.SphereGeometry(0.05, 10, 8).scale(1, 0.9, 1), CLAY, T(0, 0.045, 0));
  add(new THREE.CylinderGeometry(0.017, 0.022, 0.07, 8), CLAY, T(0, 0.115, 0));
  add(new THREE.CylinderGeometry(0.024, 0.017, 0.018, 8), CLAY, T(0, 0.155, 0));
  add(new THREE.SphereGeometry(0.017, 6, 5), STRAW, T(0, 0.168, 0));
  add(strut(V(0.035, 0.055, 0), V(0.075, 0.105, 0), 0.008), CLAY, T(0, 0, 0));
  add(new THREE.TorusGeometry(0.032, 0.007, 4, 8, Math.PI), CLAY, T(-0.02, 0.085, 0, Math.PI / 2));
}

/** The coffee ceremony on fresh-cut grass: a jebena on its little stove, cups on a tray, popcorn. */
function coffee({ b, glow, m }: PropContext): void {
  const add = adder(b, m(0, 0, 0));
  b.add(new THREE.CylinderGeometry(0.42, 0.42, 0.012, 18), GRASS, m(0, 0.006, 0));
  for (let i = 0; i < 16; i++) {
    const a = i * 2.4;
    const r = 0.12 + ((i * 37) % 10) * 0.028;
    b.add(new THREE.BoxGeometry(0.07, 0.008, 0.012), i % 2 ? '#3f8a3a' : '#8ed05a', m(Math.cos(a) * r, 0.016, Math.sin(a) * r, a * 1.7));
  }
  // The low rekebot table, a round tray on it with six little cups.
  b.add(new THREE.CylinderGeometry(0.15, 0.13, 0.07, 14), '#8a4a26', m(0.1, 0.035, -0.04));
  b.add(new THREE.CylinderGeometry(0.17, 0.17, 0.014, 16), YELLOW, m(0.1, 0.077, -0.04));
  b.add(new THREE.TorusGeometry(0.17, 0.01, 4, 18).rotateX(Math.PI / 2), RED, m(0.1, 0.084, -0.04));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const [x, z] = [0.1 + Math.cos(a) * 0.1, -0.04 + Math.sin(a) * 0.1];
    b.add(new THREE.CylinderGeometry(0.027, 0.019, 0.04, 8), WHITE, m(x, 0.104, z));
    b.add(new THREE.CylinderGeometry(0.024, 0.024, 0.004, 8), '#4a2410', m(x, 0.123, z));
    b.add(new THREE.TorusGeometry(0.025, 0.005, 3, 8).rotateX(Math.PI / 2), i % 2 ? GREEN : RED, m(x, 0.106, z));
  }
  // The jebena on a little charcoal stove, embers glowing.
  b.add(new THREE.CylinderGeometry(0.075, 0.06, 0.08, 10), '#4a4a52', m(-0.2, 0.04, 0.12));
  for (let i = 0; i < 5; i++) glow.add(new THREE.SphereGeometry(0.02, 6, 4), i % 2 ? '#ff6a1f' : '#ffb03a', m(-0.2 + Math.cos(i * 1.3) * 0.045, 0.084, 0.12 + Math.sin(i * 1.3) * 0.045));
  jebenaAt(add, -0.2, 0.085, 0.12, 1.45);
  // A bowl of popcorn and a little basket of bread.
  b.add(new THREE.SphereGeometry(0.1, 12, 4, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).scale(1, 0.6, 1), '#9aa3b5', m(0.16, 0.065, 0.24));
  for (let i = 0; i < 11; i++) b.add(new THREE.SphereGeometry(0.026, 5, 4), i % 3 ? WHITE : '#fff1b8', m(0.16 + Math.cos(i * 2.2) * (i % 4) * 0.022, 0.07 + (i % 3) * 0.01, 0.24 + Math.sin(i * 2.2) * (i % 4) * 0.022));
}

/** A big mesob basket (about 0.4 tall), woven in bands. */
function mesobProp({ b, m, variant }: PropContext): void {
  const pts = [[0.001, 0], [0.14, 0], [0.12, 0.03], [0.07, 0.11], [0.1, 0.16], [0.17, 0.21], [0.175, 0.24], [0.13, 0.31], [0.06, 0.38], [0.015, 0.42], [0.001, 0.425]].map(([x, y]) => new THREE.Vector2(x, y));
  const bands = [STRAW, RED, STRAW, GREEN, STRAW, '#7b2fbf', STRAW, YELLOW];
  const g = paintFaces(new THREE.LatheGeometry(pts, 12), (_cx, cy) => pick(bands, Math.floor(cy / 0.053) + variant));
  b.add(g, '#ffffff', m(0, 0, 0));
  b.add(new THREE.SphereGeometry(0.03, 8, 6), RED, m(0, 0.44, 0));
}

function bucketProp({ b, m, variant }: PropContext): void {
  bucket(adder(b, m(0, 0, 0)), 0, 0, 0, 1.4, pick(['#2f6fd8', '#f08a1c', '#e8459a', '#1f9a4a'], variant));
}

/** A kebero drum standing on its big head. */
function drumProp({ b, m, variant }: PropContext): void {
  const c = pick(['#c25a1e', '#a0302a', '#8a4a26'], variant);
  b.add(new THREE.CylinderGeometry(0.09, 0.12, 0.26, 12), c, m(0, 0.13, 0));
  b.add(new THREE.CylinderGeometry(0.093, 0.093, 0.012, 12), LEATHER, m(0, 0.265, 0));
  b.add(new THREE.TorusGeometry(0.12, 0.012, 4, 14).rotateX(Math.PI / 2), YELLOW, m(0, 0.012, 0));
  b.add(new THREE.TorusGeometry(0.093, 0.01, 4, 14).rotateX(Math.PI / 2), GREEN, m(0, 0.258, 0));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    b.add(strut(V(Math.cos(a) * 0.095, 0.26, Math.sin(a) * 0.095), V(Math.cos(a + 0.4) * 0.124, 0.02, Math.sin(a + 0.4) * 0.124), 0.006, 4), INK, m(0, 0, 0));
  }
}

// ------------------------------------------------------------------------------------- the skin

/** Someone at the coffee ceremony, facing it. */
const sitter = (x: number, z: number, v: number): Item => ['timkat.guest', x, z, 'face', 1.1, 0, v];

const skin: HolidaySkin = {
  id: 'timkat',
  name: 'Timkat',
  greeting: 'Melkam Timkat!',
  cargo: { red: umbrellaCargo, orange: kebero, brown: jebena, white: coffeeCup, yellow: mesob, pink: candle, blue: bucketCargo, teal: netelaRoll, green: buntingCargo, gray: popcornBowl },
  props: {
    'timkat.carrier': carrier,
    'timkat.splasher': splasher,
    'timkat.drummer': drummer,
    'timkat.guest': guest,
    'timkat.umbrella': standingUmbrella,
    'timkat.pool': pool,
    'timkat.tent': tent,
    'timkat.bunting': buntingProp,
    'timkat.coffee': coffee,
    'timkat.mesob': mesobProp,
    'timkat.bucket': bucketProp,
    'timkat.drum': drumProp,
  },
  inside: [
    { name: 'procession', w: 2, h: 1, items: [['timkat.drummer', 0.72, 0, 0, 1.1, 0, 0], ['timkat.carrier', 0.22, 0.05, 0, 1.1, 0, 0], ['timkat.carrier', -0.26, -0.05, 0, 1.1, 0, 1], ['timkat.carrier', -0.74, 0.05, 0, 1.1, 0, 3]] },
    { name: 'splashPool', w: 2, h: 2, items: [['timkat.pool', 0, 0, 0, 0.85], ...ring(3, 0.8, 'timkat.splasher', 1.1, 0.5), ['timkat.bucket', 0.65, -0.7, 0, 0.8, 0, 1], ['timkat.bucket', -0.75, 0.65, 0, 0.8, 0, 2]] },
    { name: 'coffeeCeremony', w: 2, h: 2, items: [['timkat.coffee', -0.05, 0, 0, 1.15], sitter(0.62, 0.05, 0), sitter(-0.15, 0.68, 2), sitter(-0.2, -0.66, 4), ['timkat.mesob', 0.65, -0.6, 0, 0.8, 0, 1], ['timkat.umbrella', -0.68, -0.55, 0, 0.9, 0, 0]] },
    { name: 'tentByWater', w: 2, h: 1, items: [['timkat.tent', -0.4, 0, 0, 0.95, 0, 0], ['timkat.bunting', 0.35, 0, 0, 0.8, 0, 1], ['timkat.bucket', 0.7, 0.2, 0, 0.8, 0, 0], ['toy:duck', 0.62, -0.2, 'face', 0.5]] },
    { name: 'drummers', w: 2, h: 1, items: [['timkat.drummer', -0.6, 0.05, 0.3, 1.1, 0, 1], ['timkat.drummer', 0.0, -0.05, -0.2, 1.1, 0, 2], ['timkat.drum', 0.6, 0.15, 0, 0.9, 0, 0], ['timkat.umbrella', 0.55, -0.25, 0, 0.75, 0, 4]] },
  ],
  outside: [
    { name: 'bigPool', w: 2.6, h: 0, items: [['timkat.pool', 0, 0, 0, 3.2], ...ring(4, 2.35, 'timkat.splasher', 2.3, 0.4), ['timkat.bunting', 0, -2.35, Math.PI / 2, 3, 0, 0]] },
    { name: 'procession', w: 2.4, h: 0, items: [['timkat.drummer', 1.5, 0, 0, 2.6, 0, 0], ['timkat.carrier', 0.45, 0.2, 0, 2.6, 0, 0], ['timkat.carrier', -0.6, -0.1, 0, 2.6, 0, 1], ['timkat.carrier', -1.6, 0.2, 0, 2.6, 0, 3], ['timkat.drummer', 0.9, 1.1, 0, 2.3, 0, 2]] },
    { name: 'camp', w: 2.4, h: 0, items: [['timkat.tent', -0.8, -0.3, 0.3, 3], ['timkat.coffee', 0.9, 0.5, 0, 2.6], ['timkat.mesob', 1.7, -0.6, 0, 2.2, 0, 0], ['timkat.bunting', -0.2, 1.4, 0, 2.6, 0, 2]] },
  ],
  edge(b, _glow, spot) {
    const LIFT = 0.05;
    const add = adder(b, new THREE.Matrix4().compose(V(spot.x, LIFT, spot.z), new THREE.Quaternion().setFromAxisAngle(UP, spot.yaw), V(1, 1, 1)));
    if (spot.corner) {
      // A ceremonial umbrella planted at each corner, a bucket of water at its foot.
      add(new THREE.CylinderGeometry(0.05, 0.065, 0.04, 10), WOOD, M(0.02, 0.02, 0));
      umbrella(add, 0.02, 0.5, 0, 0.17, pick(VELVET, spot.index), 0.46);
      bucket(add, 0.05, 0, 0.15, 0.9, pick(['#2f6fd8', '#f08a1c', '#e8459a', '#1f9a4a'], spot.index));
      return;
    }
    // Green-yellow-red bunting on little posts along the rim.
    for (const z of [-0.4, 0.4]) {
      add(new THREE.CylinderGeometry(0.013, 0.017, 0.34, 6), WOOD, M(0.02, 0.17, z));
      add(new THREE.SphereGeometry(0.028, 8, 6), GOLD, M(0.02, 0.35, z));
    }
    bunting(add, V(0.02, 0.32, -0.4), V(0.02, 0.32, 0.4), 0.08, 6, 0.1, spot.index);
  },
  station(b, f) {
    // Bunting along the eaves and the awning, and two velvet umbrellas on the roof.
    const add = adder(b, f.m(0, 0, 0));
    const hw = f.width / 2;
    for (let x = -hw, i = 0; x < hw - 0.01; x += f.width / 4, i++) {
      bunting(add, V(x, f.roofY - 0.01, f.frontZ + 0.04), V(x + f.width / 4, f.roofY - 0.01, f.frontZ + 0.04), 0.06, 6, 0.07, i);
      bunting(add, V(x, f.awningY - 0.01, f.awningZ + 0.17), V(x + f.width / 4, f.awningY - 0.01, f.awningZ + 0.17), 0.05, 6, 0.07, i + 1);
    }
    for (const sx of [-1, 1]) umbrella(add, sx * (hw - 0.45), f.roofY + 0.5, 0.05, 0.16, sx < 0 ? VELVET[0] as string : VELVET[1] as string, 0.4);
  },
  engine(b) {
    // A little fringed velvet umbrella over the cab.
    umbrella(adder(b, new THREE.Matrix4()), -0.17, 0.6, 0, 0.1, '#d8213a', 0.18, 0.12);
  },
  light: { sunColor: '#fff6de', sunIntensity: 2.8, hemiSky: '#d8eeff', hemiGround: '#d8e6b0' },
  fx: { kind: 'confetti', colors: FLAG, count: 45 },
};

export default skin;
