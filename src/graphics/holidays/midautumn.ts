// Mid-Autumn (the Moon Festival, three days): a moon-viewing evening. A huge full moon glows on a
// carved stand beside the diorama with the jade rabbit pounding at its mortar, a tea table is laid
// with mooncakes, a teapot and cups, pomelos and persimmons, osmanthus trees flower with a lantern
// in their branches, and children's lanterns (round, rabbit, carp and star) glow on sticks, along
// the rim, on the station and on the engine. Paper lanterns float up into the blue evening sky.
// Mooncakes, lanterns, fruit, a teapot, tea cups and osmanthus sprigs ride in the wagons.
import * as THREE from 'three';
import type { GeoBatch } from '../batch';
import type { HolidaySkin, PropContext } from '../holiday';
import { ring, row } from '../holiday';
import { INK, M, WHITE, polygon, shadeHex, starShape, type Kit } from '../toyModels';

const RED = '#e8263c';
const GOLD = '#f2c23a';
const MOON = '#fff0a8';
const PAPER = '#fff6e6';
const JADE = '#e3f7ec';
const PINK = '#ff8fb1';
const LEAF = '#2f8a46';
const WOOD = '#8a4a26';
const BAMBOO = '#c9a35a';
const OSMANTHUS = '#ffb627';
const CAKE = '#c9803e';
const PORCELAIN = '#3f6fd8';
const LANTERNS = ['#ff3b3b', '#ff8a1e', '#ff5a9a', '#ffd23f'];

const pick = <T>(a: readonly T[], i: number): T => a[((i % a.length) + a.length) % a.length] as T;

// ------------------------------------------------------------------------------------- cargo

/** Builds a flat model and tips its top toward +z so it reads on the goal card and in wagons. */
const tilted = (build: (k: Kit, c: string) => void, angle: number) => (k: Kit, c: string): void => {
  const from = k.parts.length;
  build(k, c);
  const m = M(0, 0, 0, angle, 0, 0);
  for (const g of k.parts.slice(from)) g.applyMatrix4(m);
};

/** A mooncake: a scalloped round cake with a raised flower pattern on top. */
function mooncake(k: Kit, c: string): void {
  const top = shadeHex(c, 22);
  k.cyl(0.022, 0.023, 0.016, c, 0, -0.006, 0, 0, 0, 0, 16);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    k.sph(0.0055, c, Math.cos(a) * 0.022, -0.006, Math.sin(a) * 0.022, 1, 1.4, 1, 6);
  }
  k.cyl(0.019, 0.019, 0.002, top, 0, 0.003, 0, 0, 0, 0, 16);
  k.tor(0.0145, 0.0014, shadeHex(c, -25), 0, 0.004, 0, Math.PI / 2, 0, 0, 16);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    k.sph(0.0042, shadeHex(c, -12), Math.cos(a) * 0.0075, 0.0045, Math.sin(a) * 0.0075, 1.3, 0.35, 0.8, 6);
  }
  k.sph(0.0035, GOLD, 0, 0.005, 0, 1, 0.5, 1, 6);
}

/** A rabbit lantern on little wheels, red eyes and a red flower on its side. */
function rabbitLantern(k: Kit, c: string): void {
  k.sph(0.017, c, -0.004, -0.004, 0, 1.35, 1, 0.95, 12);
  k.sph(0.011, c, 0.017, 0.008, 0, 1, 1, 0.95, 10);
  for (const s of [-1, 1]) {
    k.sph(0.0042, c, 0.012, 0.024, s * 0.005, 1, 3, 0.7, 6);
    k.sph(0.0025, PINK, 0.0135, 0.024, s * 0.005, 0.6, 2.4, 0.8, 5);
    k.sph(0.0022, RED, 0.024, 0.01, s * 0.0065, 1, 1, 1, 5);
    k.sph(0.004, RED, -0.004, -0.002, s * 0.016, 1, 1, 0.4, 6);
    for (const x of [-0.016, 0.01]) k.cyl(0.004, 0.004, 0.003, RED, x, -0.02, s * 0.011, Math.PI / 2, 0, 0, 8);
  }
  k.sph(0.0045, WHITE, -0.026, 0.0, 0, 1, 1, 1, 6);
}

/** A carp lantern: a plump fish with a forked tail, fins and scale dots. */
function carpLantern(k: Kit, c: string): void {
  k.sph(0.016, c, 0.002, 0, 0, 1.5, 0.95, 0.75, 12);
  k.shape(polygon([[-0.018, 0], [-0.033, 0.014], [-0.028, 0], [-0.033, -0.014]]), 0.004, shadeHex(c, 18), M(0, 0, 0));
  k.shape(polygon([[-0.008, 0.012], [0.006, 0.012], [-0.004, 0.022]]), 0.003, GOLD, M(0, 0, 0));
  for (const s of [-1, 1]) {
    k.sph(0.0034, WHITE, 0.018, 0.004, s * 0.0095, 1, 1, 0.5, 6);
    k.sph(0.0018, INK, 0.0195, 0.004, s * 0.011, 1, 1, 0.5, 5);
    for (const [x, y] of [[0.004, -0.004], [-0.006, 0.002], [-0.004, -0.007]] as const) k.sph(0.0028, GOLD, x, y, s * 0.011, 1, 1, 0.35, 5);
  }
  k.tor(0.003, 0.0012, RED, 0.026, -0.001, 0, 0, Math.PI / 2, 0, 8);
}

/** A red round paper lantern with gold caps and a tassel. */
function roundLantern(k: Kit, c: string): void {
  k.sph(0.02, c, 0, 0.002, 0, 1.1, 0.85, 1.1, 14);
  for (const ry of [0, Math.PI / 3, (Math.PI * 2) / 3]) k.add(new THREE.TorusGeometry(0.0222, 0.0011, 4, 18).scale(1, 0.85, 1), shadeHex(c, -22), M(0, 0.002, 0, 0, ry, 0));
  k.cyl(0.008, 0.01, 0.005, GOLD, 0, 0.019, 0, 0, 0, 0, 10);
  k.cyl(0.01, 0.008, 0.005, GOLD, 0, -0.015, 0, 0, 0, 0, 10);
  k.tor(0.004, 0.0012, GOLD, 0, 0.025, 0, 0, 0, 0, 8);
  k.cyl(0.0015, 0.004, 0.012, GOLD, 0, -0.024, 0, 0, 0, 0, 6);
}

/** A pomelo: a big pear-shaped citrus with a stalk and two leaves. */
function pomelo(k: Kit, c: string): void {
  k.sph(0.022, c, 0, -0.006, 0, 1, 0.9, 1, 12);
  k.sph(0.013, c, 0, 0.011, 0, 1, 1, 1, 10);
  k.sph(0.006, shadeHex(c, 30), 0.012, 0.0, 0.016, 1, 1, 0.5, 6);
  k.cyl(0.0018, 0.0022, 0.008, WOOD, 0, 0.026, 0, 0, 0, 0, 5);
  for (const s of [-1, 1]) k.sph(0.008, LEAF, s * 0.008, 0.027, 0, 1.4, 0.25, 0.7, 6);
}

/** A persimmon: squat and shiny with a four-leaf green cap. */
function persimmon(k: Kit, c: string): void {
  k.sph(0.022, c, 0, -0.004, 0, 1, 0.75, 1, 12);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    k.sph(0.0075, LEAF, Math.cos(a) * 0.006, 0.012, Math.sin(a) * 0.006, 1.4, 0.3, 0.8, 6);
  }
  k.cyl(0.0018, 0.0022, 0.006, WOOD, 0, 0.016, 0, 0, 0, 0, 5);
  k.sph(0.005, shadeHex(c, 35), 0.01, 0.0, 0.016, 1, 1, 0.5, 6);
}

/** A round teapot with a spout, a handle, a lid and a white band. */
function teapot(k: Kit, c: string): void {
  k.sph(0.019, c, 0, -0.006, 0, 1, 0.8, 1, 12);
  k.tor(0.019, 0.0018, WHITE, 0, -0.006, 0, Math.PI / 2, 0, 0, 16);
  k.cyl(0.003, 0.005, 0.02, c, 0.022, 0.0, 0, 0, 0, -0.9, 6);
  k.tor(0.008, 0.0024, c, -0.019, -0.004, 0, 0, 0, 0, 10, Math.PI * 1.2);
  k.dome(0.01, shadeHex(c, 15), 0, 0.008, 0, 1, 0.6, 1, 10);
  k.sph(0.0035, GOLD, 0, 0.016, 0, 1, 1, 1, 6);
}

/** A tea cup of green tea on a saucer. */
function teaCup(k: Kit, c: string): void {
  k.cyl(0.025, 0.02, 0.004, shadeHex(c, -15), 0, -0.018, 0, 0, 0, 0, 14);
  k.cyl(0.017, 0.011, 0.024, c, 0, -0.004, 0, 0, 0, 0, 12);
  k.tor(0.0145, 0.0016, WHITE, 0, -0.002, 0, Math.PI / 2, 0, 0, 14);
  k.cyl(0.0155, 0.0155, 0.002, '#b8c85a', 0, 0.007, 0, 0, 0, 0, 12);
  k.sph(0.0035, WHITE, 0.0, 0.0, 0.016, 1, 1, 0.4, 6);
}

/** An osmanthus sprig: a twig with glossy leaves and clusters of tiny flowers. */
function osmanthus(k: Kit, c: string): void {
  k.cyl(0.0018, 0.0026, 0.05, WOOD, 0, 0, 0, 0, 0, -0.7, 5);
  for (const [x, y, s] of [[-0.012, -0.012, 1], [0.004, 0.004, -1], [0.016, 0.016, 1]] as const) k.sph(0.009, LEAF, x, y + s * 0.006, s * 0.006, 1.6, 0.6, 0.35, 6);
  for (let i = 0; i < 14; i++) {
    const a = i * 2.4;
    const t = (i % 3) - 1;
    k.sph(0.0045, i % 4 ? c : shadeHex(c, 18), t * 0.013 + Math.cos(a) * 0.006, t * 0.013 + Math.sin(a) * 0.006 + 0.004, Math.sin(a * 1.7) * 0.007, 1, 1, 1, 5);
  }
}

/** A folded paper star lantern with a glowing middle and a tassel. */
function starLantern(k: Kit, c: string): void {
  k.shape(starShape(0.025, 0.012), 0.012, c, M(0, 0.002, 0), 0.002);
  k.shape(starShape(0.016, 0.008), 0.002, shadeHex(c, 25), M(0, 0.002, 0.008));
  k.sph(0.005, '#fff3a0', 0, 0.002, 0.01, 1, 1, 0.4, 6);
  k.tor(0.004, 0.0012, GOLD, 0, 0.03, 0, 0, 0, 0, 8);
  k.cyl(0.0016, 0.0035, 0.012, RED, 0, -0.026, 0, 0, 0, 0, 6);
}

// ------------------------------------------------------------------------------------- lanterns

/** Placement of a point in some local frame (prop, rim spot, station). */
type Place = (x: number, y: number, z: number) => THREE.Matrix4;

const sph = (r: number, sx = 1, sy = 1, sz = 1, seg = 10) => new THREE.SphereGeometry(r, seg, Math.max(5, Math.round(seg * 0.7))).scale(sx, sy, sz);
const cyl = (rt: number, rb: number, h: number, seg = 8) => new THREE.CylinderGeometry(rt, rb, h, seg);

/** A glowing round paper lantern of radius r centred at (x, y, z), with gold caps and a tassel. */
function lanternRound(b: GeoBatch, glow: GeoBatch, P: Place, x: number, y: number, z: number, r: number, col: string): void {
  glow.add(sph(r, 1.08, 0.85, 1.08, 12), col, P(x, y, z));
  const rib = new THREE.TorusGeometry(r * 1.09, r * 0.05, 3, 14).scale(1, 0.86, 1);
  for (let i = 0; i < 3; i++) glow.add(rib.clone().rotateY((i * Math.PI) / 3), shadeHex(col, -40), P(x, y, z));
  b.add(cyl(r * 0.42, r * 0.5, r * 0.22, 10), GOLD, P(x, y + r * 0.86, z));
  b.add(cyl(r * 0.5, r * 0.42, r * 0.22, 10), GOLD, P(x, y - r * 0.86, z));
  b.add(cyl(r * 0.06, r * 0.2, r * 0.7, 6), GOLD, P(x, y - r * 1.3, z));
}

/** A glowing rabbit lantern (about 0.3 long at s = 1) on little red wheels. */
function lanternRabbit(b: GeoBatch, glow: GeoBatch, P: Place, x: number, y: number, z: number, s: number): void {
  glow.add(sph(0.1 * s, 1.35, 1, 0.95), PAPER, P(x, y, z));
  glow.add(sph(0.065 * s), PAPER, P(x + 0.11 * s, y + 0.07 * s, z));
  for (const k of [-1, 1]) {
    glow.add(sph(0.022 * s, 1, 3, 0.7, 6), PAPER, P(x + 0.08 * s, y + 0.17 * s, z + k * 0.03 * s));
    glow.add(sph(0.014 * s, 0.6, 2.6, 0.5, 6), PINK, P(x + 0.088 * s, y + 0.17 * s, z + k * 0.03 * s));
    b.add(sph(0.013 * s, 1, 1, 1, 6), RED, P(x + 0.165 * s, y + 0.08 * s, z + k * 0.035 * s));
    glow.add(sph(0.03 * s, 1, 1, 0.35, 8), '#ff4d5a', P(x - 0.01 * s, y, z + k * 0.093 * s));
    for (const wx of [-0.08, 0.06]) b.add(cyl(0.025 * s, 0.025 * s, 0.015 * s).rotateX(Math.PI / 2), RED, P(x + wx * s, y - 0.1 * s, z + k * 0.06 * s));
  }
}

/** A glowing carp lantern (about 0.35 long at s = 1). */
function lanternCarp(b: GeoBatch, glow: GeoBatch, P: Place, x: number, y: number, z: number, s: number, col: string): void {
  glow.add(sph(0.1 * s, 1.5, 0.85, 0.7, 12), col, P(x, y, z));
  const tail = new THREE.ExtrudeGeometry(polygon([[0, 0], [-0.11, 0.09], [-0.08, 0], [-0.11, -0.09]]), { depth: 0.02, bevelEnabled: false }).translate(0, 0, -0.01).scale(s, s, s);
  glow.add(tail, shadeHex(col, 20), P(x - 0.12 * s, y, z));
  glow.add(sph(0.04 * s, 1.4, 0.5, 0.25, 6), GOLD, P(x - 0.02 * s, y + 0.09 * s, z));
  for (const k of [-1, 1]) {
    b.add(sph(0.018 * s, 1, 1, 0.5, 6), WHITE, P(x + 0.11 * s, y + 0.025 * s, z + k * 0.055 * s));
    b.add(sph(0.01 * s, 1, 1, 0.5, 5), INK, P(x + 0.12 * s, y + 0.025 * s, z + k * 0.065 * s));
    for (const [dx, dy] of [[0.02, -0.03], [-0.04, 0.01], [-0.03, -0.04], [0.04, 0.03]] as const) glow.add(sph(0.017 * s, 1, 1, 0.3, 6), GOLD, P(x + dx * s, y + dy * s, z + k * 0.068 * s));
  }
}

/** A glowing star lantern (about 0.24 across at s = 1), three stars crossed through each other. */
function lanternStar(b: GeoBatch, glow: GeoBatch, P: Place, x: number, y: number, z: number, s: number, col: string): void {
  const star = new THREE.ExtrudeGeometry(starShape(0.12 * s, 0.06 * s), { depth: 0.05 * s, bevelEnabled: false }).translate(0, 0, -0.025 * s);
  glow.add(star, col, P(x, y, z));
  glow.add(star.clone().rotateY(Math.PI / 2), shadeHex(col, -30), P(x, y, z));
  b.add(cyl(0.006 * s, 0.018 * s, 0.07 * s, 6), RED, P(x, y - 0.14 * s, z));
}

/** One of the children's lanterns by variant: round, rabbit, carp, star. */
function anyLantern(b: GeoBatch, glow: GeoBatch, P: Place, x: number, y: number, z: number, s: number, variant: number): void {
  switch (((variant % 4) + 4) % 4) {
    case 0: lanternRound(b, glow, P, x, y, z, 0.1 * s, RED); break;
    case 1: lanternRabbit(b, glow, P, x, y, z, s); break;
    case 2: lanternCarp(b, glow, P, x, y, z, s, '#ff8a1e'); break;
    default: lanternStar(b, glow, P, x, y, z, s, '#ffd23f');
  }
}

// ------------------------------------------------------------------------------------- props

/** The full moon on a carved red cradle with clouds at its foot, about 1.05 tall at scale 1. */
function moonProp({ b, glow, m }: PropContext): void {
  b.add(new THREE.BoxGeometry(0.62, 0.07, 0.26), WOOD, m(0, 0.035, 0));
  b.add(new THREE.BoxGeometry(0.66, 0.02, 0.3), GOLD, m(0, 0.075, 0));
  b.add(cyl(0.035, 0.05, 0.12), RED, m(0, 0.13, 0));
  b.add(new THREE.TorusGeometry(0.42, 0.03, 6, 22, Math.PI).rotateZ(Math.PI), RED, m(0, 0.6, 0));
  for (const s of [-1, 1]) b.add(sph(0.045, 1, 1, 1, 8), GOLD, m(s * 0.42, 0.6, 0));
  glow.add(sph(0.38, 1, 1, 1, 22), MOON, m(0, 0.6, 0));
  // Soft craters all round so it reads as the moon from any side.
  for (let i = 0; i < 9; i++) {
    const a = i * 2.4;
    const e = ((i % 3) - 1) * 0.45;
    const n = new THREE.Vector3(Math.cos(a) * Math.cos(e), Math.sin(e), Math.sin(a) * Math.cos(e));
    const c = sph(0.05 + (i % 3) * 0.02, 1, 1, 0.25, 8).lookAt(n);
    glow.add(c, '#f4dc86', m(n.x * 0.37, 0.6 + n.y * 0.37, n.z * 0.37));
  }
  for (const [x, z, r] of [[-0.32, 0.08, 0.09], [-0.2, 0.14, 0.11], [0.26, 0.12, 0.1], [0.36, 0.02, 0.08], [0.0, 0.16, 0.08]] as const) b.add(sph(r, 1.3, 0.7, 1, 10), '#e8ecff', m(x, 0.1 + r * 0.3, z));
}

/** The jade rabbit pounding at its mortar, about 0.45 tall at scale 1. */
function jadeRabbit({ b, m, mr }: PropContext): void {
  b.add(sph(0.12, 1.1, 1, 0.9, 12), JADE, m(0, 0.12, 0));
  b.add(sph(0.08, 1, 1, 1, 12), JADE, m(0.08, 0.27, 0));
  for (const s of [-1, 1]) {
    b.add(sph(0.026, 1, 3.4, 0.6, 8), JADE, mr(0.04, 0.4, s * 0.035, s * 0.15, 0, 0.35));
    b.add(sph(0.016, 0.6, 3, 0.4, 6), PINK, mr(0.048, 0.4, s * 0.035, s * 0.15, 0, 0.35).multiply(M(0.006, 0, 0)));
    b.add(sph(0.014, 1, 1, 1, 6), RED, m(0.14, 0.29, s * 0.04));
    b.add(sph(0.035, 1.3, 0.8, 1, 8), shadeHex(JADE, -12), m(0.06, 0.02, s * 0.07));
  }
  b.add(sph(0.012, 1, 1, 1, 6), PINK, m(0.16, 0.26, 0));
  b.add(sph(0.04, 1, 1, 1, 8), WHITE, m(-0.13, 0.08, 0));
  // Mortar and pestle.
  b.add(cyl(0.07, 0.055, 0.1, 12), '#b07a46', m(0.24, 0.05, 0));
  b.add(cyl(0.06, 0.06, 0.004, 12), PAPER, m(0.24, 0.1, 0));
  b.add(cyl(0.012, 0.016, 0.24), BAMBOO, mr(0.2, 0.18, 0, 0, 0, 0.45));
  for (const s of [-1, 1]) b.add(sph(0.025, 1, 1, 1, 6), JADE, m(0.15, 0.24, s * 0.03));
}

const mooncakeGeo = (r: number) => {
  const g: THREE.BufferGeometry[] = [cyl(r, r * 1.03, r * 0.65, 14)];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    g.push(sph(r * 0.22, 1, 1.3, 1, 5).translate(Math.cos(a) * r, 0, Math.sin(a) * r));
  }
  return g;
};

function cakeAt(b: GeoBatch, P: Place, x: number, y: number, z: number, r: number): void {
  for (const g of mooncakeGeo(r)) b.add(g, CAKE, P(x, y, z));
  b.add(new THREE.TorusGeometry(r * 0.6, r * 0.07, 3, 12).rotateX(Math.PI / 2), shadeHex(CAKE, -30), P(x, y + r * 0.33, z));
  b.add(sph(r * 0.2, 1, 0.4, 1, 6), GOLD, P(x, y + r * 0.33, z));
}

/** A low tea table laid for the moon: mooncakes, a blue-and-white teapot with cups, fruit. */
function teaTable({ b, glow, m }: PropContext): void {
  const P: Place = (x, y, z) => m(x, y, z);
  b.add(new THREE.BoxGeometry(0.84, 0.045, 0.52), '#c8322f', m(0, 0.22, 0));
  b.add(new THREE.BoxGeometry(0.86, 0.03, 0.54), GOLD, m(0, 0.195, 0));
  for (const [x, z] of [[-0.37, -0.21], [0.37, -0.21], [-0.37, 0.21], [0.37, 0.21]] as const) b.add(cyl(0.025, 0.02, 0.19, 6), WOOD, m(x, 0.095, z));
  // Mooncakes on a plate, one cut open showing its yolk.
  b.add(cyl(0.12, 0.1, 0.014, 16), WHITE, m(-0.22, 0.25, 0.04));
  for (const [x, z] of [[-0.27, 0.0], [-0.17, 0.0], [-0.22, 0.1]] as const) cakeAt(b, P, x, 0.275, z, 0.045);
  cakeAt(b, P, -0.22, 0.32, 0.03, 0.045);
  // Teapot and cups.
  b.add(sph(0.07, 1, 0.8, 1, 12), WHITE, m(0.14, 0.3, -0.1));
  b.add(new THREE.TorusGeometry(0.07, 0.008, 4, 16).rotateX(Math.PI / 2), PORCELAIN, m(0.14, 0.3, -0.1));
  b.add(cyl(0.01, 0.018, 0.08).rotateZ(-0.9), WHITE, m(0.21, 0.31, -0.1));
  b.add(new THREE.TorusGeometry(0.03, 0.009, 4, 10, Math.PI * 1.2).rotateZ(-0.3), PORCELAIN, m(0.07, 0.3, -0.1));
  b.add(sph(0.035, 1, 0.5, 1, 8), PORCELAIN, m(0.14, 0.35, -0.1));
  for (const [x, z] of [[0.02, -0.15], [0.3, -0.04], [0.02, 0.14]] as const) {
    b.add(cyl(0.032, 0.022, 0.04, 10), WHITE, m(x, 0.263, z));
    b.add(cyl(0.029, 0.029, 0.004, 10), '#b8c85a', m(x, 0.282, z));
    b.add(new THREE.TorusGeometry(0.031, 0.004, 3, 10).rotateX(Math.PI / 2), PORCELAIN, m(x, 0.274, z));
  }
  // Fruit: a pomelo and persimmons.
  b.add(sph(0.06, 1, 0.92, 1, 10), '#a8d84a', m(0.25, 0.3, 0.13));
  for (const [x, z] of [[0.13, 0.17], [0.16, 0.08]] as const) {
    b.add(sph(0.032, 1, 0.75, 1, 8), '#ff7a1a', m(x, 0.265, z));
    b.add(sph(0.014, 1.4, 0.3, 1.4, 6), LEAF, m(x, 0.288, z));
  }
  // A little rabbit lantern glowing at the end of the table.
  lanternRabbit(b, glow, P, -0.02, 0.33, 0.12, 0.45);
}

/** A child's lantern hung from a bamboo stick planted in the ground, about 0.75 tall. */
function lanternStick({ b, glow, m, mr, variant }: PropContext): void {
  b.add(cyl(0.05, 0.06, 0.04, 8), WOOD, m(0, 0.02, 0));
  b.add(cyl(0.012, 0.015, 0.7, 6), BAMBOO, mr(0.05, 0.36, 0, 0, 0, -0.15));
  b.add(cyl(0.009, 0.009, 0.2, 5).rotateZ(Math.PI / 2), BAMBOO, m(0.19, 0.7, 0));
  b.add(cyl(0.003, 0.003, 0.1, 4), '#5b4a3a', m(0.28, 0.65, 0));
  anyLantern(b, glow, (x, y, z) => m(x, y, z), 0.28, 0.49, 0, 1, variant);
}

/** A basket of pomelos and persimmons. */
function fruitBasket({ b, m }: PropContext): void {
  b.add(cyl(0.2, 0.15, 0.12, 12), '#b98a4a', m(0, 0.06, 0));
  b.add(new THREE.TorusGeometry(0.2, 0.018, 4, 14).rotateX(Math.PI / 2), '#8a5a2e', m(0, 0.12, 0));
  b.add(sph(0.11, 1, 0.92, 1, 12), '#a8d84a', m(-0.05, 0.2, -0.03));
  b.add(sph(0.012, 1, 3, 1, 5), WOOD, m(-0.05, 0.31, -0.03));
  for (let i = 0; i < 4; i++) {
    const a = 0.3 + i * 0.9;
    const [x, z] = [Math.cos(a) * 0.12, Math.sin(a) * 0.12];
    b.add(sph(0.055, 1, 0.75, 1, 10), '#ff7a1a', m(x, 0.17, z));
    b.add(sph(0.022, 1.4, 0.3, 1.4, 6), LEAF, m(x, 0.21, z));
  }
}

/** An osmanthus tree in flower with a red lantern hanging from a branch, about 1.0 tall. */
function osmanthusTree({ b, glow, m, mr, variant }: PropContext): void {
  b.add(cyl(0.04, 0.06, 0.5, 8), WOOD, m(0, 0.25, 0));
  b.add(cyl(0.015, 0.02, 0.3, 5), WOOD, mr(0.12, 0.5, 0, 0, 0, -1.0));
  const blobs: [number, number, number, number][] = [[0, 0.72, 0, 0.26], [-0.18, 0.6, 0.06, 0.18], [0.16, 0.62, -0.08, 0.17], [0.02, 0.6, 0.18, 0.17], [-0.04, 0.88, -0.04, 0.16]];
  blobs.forEach(([x, y, z, r], i) => {
    b.add(sph(r, 1, 0.85, 1, 10), i % 2 ? '#3f9a50' : LEAF, m(x, y, z));
    for (let j = 0; j < 7; j++) {
      const a = j * 2.4 + i;
      const e = 0.2 + (j % 3) * 0.35;
      b.add(sph(0.025, 1, 1, 1, 5), j % 3 ? OSMANTHUS : '#ffe08a', m(x + Math.cos(a) * Math.cos(e) * r, y + Math.sin(e) * r * 0.85, z + Math.sin(a) * Math.cos(e) * r));
    }
  });
  b.add(cyl(0.003, 0.003, 0.08, 4), '#5b4a3a', m(0.25, 0.52, 0));
  lanternRound(b, glow, (x, y, z) => m(x, y, z), 0.25, 0.42, 0, 0.065, pick(LANTERNS, variant));
}

/** A string of round lanterns between two bamboo poles, about 1.6 long. */
function lanternString({ b, glow, m }: PropContext): void {
  for (const s of [-1, 1]) {
    b.add(cyl(0.05, 0.06, 0.04, 8), WOOD, m(s * 0.75, 0.02, 0));
    b.add(cyl(0.015, 0.018, 0.78, 6), BAMBOO, m(s * 0.75, 0.39, 0));
  }
  b.add(cyl(0.004, 0.004, 1.5, 4).rotateZ(Math.PI / 2), '#5b4a3a', m(0, 0.76, 0));
  for (let i = 0; i < 5; i++) {
    const x = -0.5 + i * 0.25;
    b.add(cyl(0.003, 0.003, 0.06, 4), '#5b4a3a', m(x, 0.73, 0));
    lanternRound(b, glow, (px, py, pz) => m(px, py, pz), x, 0.62, 0, 0.075, pick(LANTERNS, i));
  }
}

/** A cushion to sit on for moon-viewing. */
function cushion({ b, m, variant }: PropContext): void {
  const c = pick(['#e8263c', '#9b4dd6', '#22b5a6', '#ff8a1e'], variant);
  b.add(sph(0.16, 1, 0.3, 1, 12), c, m(0, 0.05, 0));
  b.add(sph(0.03, 1, 0.5, 1, 6), GOLD, m(0, 0.095, 0));
}

// ------------------------------------------------------------------------------------- the skin

const skin: HolidaySkin = {
  id: 'midautumn',
  name: 'Mid-Autumn',
  greeting: 'Happy Mid-Autumn!',
  cargo: {
    brown: tilted(mooncake, 0.7), white: rabbitLantern, pink: carpLantern, red: roundLantern, green: pomelo, orange: persimmon,
    blue: teapot, teal: teaCup, yellow: osmanthus, purple: starLantern,
  },
  props: {
    'midautumn.moon': moonProp,
    'midautumn.rabbit': jadeRabbit,
    'midautumn.table': teaTable,
    'midautumn.lantern': lanternStick,
    'midautumn.fruit': fruitBasket,
    'midautumn.osmanthus': osmanthusTree,
    'midautumn.string': lanternString,
    'midautumn.cushion': cushion,
  },
  inside: [
    { name: 'teaTable', w: 2, h: 2, items: [['midautumn.table', 0, -0.05, 0, 1.15], ['midautumn.cushion', 0, 0.6, 0, 1, 0, 0], ['midautumn.cushion', 0, -0.68, 0, 1, 0, 1], ['midautumn.lantern', -0.72, 0.55, 0, 1, 0, 1], ['midautumn.lantern', 0.7, -0.6, Math.PI, 1, 0, 2]] },
    { name: 'parade', w: 2, h: 1, items: [['midautumn.lantern', -0.6, 0, 0, 0.95, 0, 0], ['midautumn.lantern', -0.2, 0.05, 0, 0.95, 0, 3], ['midautumn.lantern', 0.2, -0.05, 0, 0.95, 0, 2], ['midautumn.rabbit', 0.68, 0.05, 'face', 0.8]] },
    { name: 'osmanthus', w: 2, h: 2, items: [['midautumn.osmanthus', -0.25, -0.3, 0, 1.25, 0, 0], ['midautumn.fruit', 0.5, 0.4, 0, 0.9], ['midautumn.rabbit', -0.45, 0.5, 'face', 0.8], ['midautumn.lantern', 0.55, -0.45, Math.PI, 0.95, 0, 1]] },
    { name: 'lanternString', w: 2, h: 1, items: [['midautumn.string', 0, 0, 0, 1.1], ...row(3, 0.45, 'midautumn.cushion', 0.7, 0, 0.3)] },
  ],
  outside: [
    { name: 'moonViewing', w: 2.6, h: 0, items: [['midautumn.moon', 0, -0.2, 0, 4], ['midautumn.rabbit', 1.9, 0.6, 'face', 3], ['midautumn.fruit', -1.8, 0.7, 0, 2.4], ...row(3, 1.1, 'midautumn.cushion', 2.6, 0, 1.7)] },
    { name: 'teaParty', w: 2.4, h: 0, items: [['midautumn.table', 0, 0, 0, 3], ['midautumn.cushion', 0, 1.3, 0, 2.6, 0, 0], ['midautumn.cushion', 0, -1.3, 0, 2.6, 0, 1], ['midautumn.lantern', -1.8, 0.6, 0, 2.6, 0, 2], ['midautumn.lantern', 1.8, -0.4, Math.PI, 2.6, 0, 1]] },
    { name: 'osmanthusGrove', w: 2.4, h: 0, items: [['midautumn.osmanthus', -0.9, -0.3, 0, 3.4, 0, 0], ['midautumn.osmanthus', 1.1, 0.1, Math.PI, 3, 0, 1], ...ring(3, 1.5, 'midautumn.lantern', 2.4, 0.9)] },
  ],
  edge(b, glow, spot, ctx) {
    // The rim's grassy top sits above the mat: everything stands on it, a size up.
    const LIFT = 0.05;
    const K = 1.4;
    const c = Math.cos(spot.yaw);
    const s = Math.sin(spot.yaw);
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), spot.yaw);
    const at: Place = (x, y, z) => new THREE.Matrix4().compose(new THREE.Vector3(spot.x + x * c + z * s, LIFT + y * K, spot.z - x * s + z * c), q, new THREE.Vector3(K, K, K));
    const crossbar = (h: number, z0: number, z1: number) => {
      b.add(cyl(0.009, 0.012, h, 5), BAMBOO, at(0, h / 2, 0));
      b.add(cyl(0.007, 0.007, z1 - z0, 5).rotateX(Math.PI / 2), BAMBOO, at(0, h, (z0 + z1) / 2));
    };
    const hang = (h: number, z: number, r: number, col: string) => {
      b.add(cyl(0.002, 0.002, 0.04, 3), '#5b4a3a', at(0, h - 0.02, z));
      lanternRound(b, glow, at, 0, h - 0.04 - r * 0.95, z, r, col);
    };
    if (spot.corner) {
      // A rabbit lantern on each corner under a red lantern; on the festival's main day a little
      // full moon rises behind them.
      lanternRabbit(b, glow, at, 0.12, 0.08, 0, 0.75);
      crossbar(0.4, -0.02, 0.12);
      hang(0.4, 0.1, 0.065, RED);
      if (ctx.day === Math.min(1, ctx.length - 1)) glow.add(sph(0.1, 1, 1, 1, 14), MOON, at(-0.06, 0.55, 0));
      return;
    }
    // A bamboo crossbar with two paper lanterns hanging from it, osmanthus flowers at its foot.
    crossbar(0.36, -0.22, 0.22);
    hang(0.36, -0.18, 0.068, RED);
    hang(0.36, 0.18, 0.068, pick(['#ff8a1e', '#ff5a9a', '#ffd23f', RED], spot.index));
    b.add(sph(0.05, 1.5, 0.35, 0.6, 6), LEAF, at(0.02, 0.015, 0.06));
    for (const z of [0.02, 0.06, 0.1]) b.add(sph(0.016, 1, 1, 1, 5), OSMANTHUS, at(0.03, 0.035, z));
  },
  station(b, f, glow) {
    // Rows of glowing round lanterns along the eaves and the awning's edge, and a rabbit and a
    // carp lantern by the door.
    const P: Place = (x, y, z) => f.m(x, y, z);
    const line = (y: number, z: number, n: number, r: number, from: number) => {
      b.add(cyl(0.004, 0.004, f.width, 4).rotateZ(Math.PI / 2), '#5b4a3a', f.m(0, y, z));
      for (let i = 0; i < n; i++) {
        const x = -f.width / 2 + ((i + 0.5) / n) * f.width;
        b.add(cyl(0.003, 0.003, 0.03, 4), '#5b4a3a', f.m(x, y - 0.015, z));
        lanternRound(b, glow, P, x, y - 0.03 - r * 0.95, z, r, pick(LANTERNS, i + from));
      }
    };
    line(f.roofY - 0.01, f.frontZ + 0.06, 5, 0.05, 1);
    line(f.awningY - 0.01, f.awningZ, 6, 0.055, 0);
    lanternRabbit(b, glow, P, -0.42, 0.13, f.frontZ + 0.12, 0.7);
    lanternCarp(b, glow, P, 0.42, 0.3, f.frontZ + 0.08, 0.65, '#ff8a1e');
  },
  engine(b) {
    // A little red lantern hanging from a bamboo rod on the cab roof.
    b.add(cyl(0.006, 0.006, 0.12, 5), BAMBOO, M(-0.17, 0.48, 0));
    b.add(cyl(0.005, 0.005, 0.12, 5), BAMBOO, M(-0.12, 0.54, 0, 0, 0, Math.PI / 2));
    b.add(cyl(0.002, 0.002, 0.03, 4), '#5b4a3a', M(-0.065, 0.525, 0));
    b.add(sph(0.035, 1.05, 0.85, 1.05, 10), RED, M(-0.065, 0.48, 0));
    b.add(cyl(0.016, 0.019, 0.01, 8), GOLD, M(-0.065, 0.509, 0));
    b.add(cyl(0.019, 0.016, 0.01, 8), GOLD, M(-0.065, 0.451, 0));
    b.add(cyl(0.002, 0.007, 0.03, 5), GOLD, M(-0.065, 0.43, 0));
  },
  light: { background: '#1d2a5c', sunColor: '#ffd29a', sunIntensity: 2.0, hemiSky: '#93a8ff', hemiGround: '#46385e', hemiIntensity: 1.05 },
  fx: { kind: 'lanterns', colors: ['#ff4d3a', '#ff8a1e', '#ffb627', '#ff6f9a'], count: 25 },
};

export default skin;
