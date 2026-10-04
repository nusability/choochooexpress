// Songkran (13–15 April): the Thai New Year water festival under a hot bright sun. A toy elephant
// sprays its trunk over a puddle, two water guns have a splashing duel, children have built little
// sand stupas stuck with flags, a fruit stall sells mangoes and green coconuts, jasmine garlands
// hang on a rack, and silver bowls of water with floating flowers line the rim. Water droplets
// drift up over the board. Water guns, bowls, garlands, elephants and fruit ride the wagons.
import * as THREE from 'three';
import type { GeoBatch } from '../batch';
import type { HolidaySkin, PropContext } from '../holiday';
import { row } from '../holiday';
import { INK, M, WHITE, polygon, shadeHex, type Kit } from '../toyModels';

const WATER = '#3fb8ff';
const WATER_LIGHT = '#bdeeff';
const DROPS = ['#8fdcff', '#bdeeff', '#5ec4ff', '#e6f9ff'];
const SILVER = '#c3ccd9';
const GOLD = '#f2c23a';
const JASMINE = '#fffaf0';
const ROSE = '#e8263c';
const LEAF = '#2f9a4a';
const SAND = '#e6c68c';
const MANGO = '#ffb21e';
const COCONUT = '#5fae3c';
const ELEPHANT = '#a9b6cc';
const FLAGS = ['#ff3d8b', '#ff8a1e', '#ffd23f', '#2fbf5a', '#22b5c6', '#3f7fe0', '#9b4dd6', '#e8263c'];

const pick = <T>(a: readonly T[], i: number): T => a[((i % a.length) + a.length) % a.length] as T;
const sph = (r: number, sx = 1, sy = 1, sz = 1, seg = 8) => new THREE.SphereGeometry(r, seg, Math.max(4, Math.round(seg * 0.7))).scale(sx, sy, sz);
const cyl = (rt: number, rb: number, h: number, seg = 10) => new THREE.CylinderGeometry(rt, rb, h, seg);
const tri = polygon([[0, 0], [0, -0.1], [0.12, -0.05]]);
const pennant = polygon([[-0.05, 0], [0.05, 0], [0, -0.085]]);

/** Tips a model's top toward +z so a flat-topped one reads on the goal card and in wagons. */
const tilted = (build: (k: Kit, c: string) => void, angle: number) => (k: Kit, c: string): void => {
  const from = k.parts.length;
  build(k, c);
  const m = M(0, 0, 0, angle, 0, 0);
  for (const g of k.parts.slice(from)) g.applyMatrix4(m);
};

// ------------------------------------------------------------------------------------- cargo

/** A pump-action water gun with a see-through water tank, nozzle facing +x. */
function waterGun(k: Kit, c: string): void {
  k.box(0.036, 0.013, 0.011, c, 0, 0.002, 0);
  k.cyl(0.0045, 0.0045, 0.018, c, 0.026, 0.004, 0, 0, 0, -Math.PI / 2, 8);
  k.cyl(0.0035, 0.0045, 0.004, '#ffd23f', 0.036, 0.004, 0, 0, 0, -Math.PI / 2, 8);
  k.box(0.011, 0.02, 0.009, c, -0.012, -0.012, 0, 0, 0, 0.35);
  k.box(0.014, 0.008, 0.012, '#ffd23f', 0.016, -0.007, 0);
  k.tor(0.0045, 0.0013, shadeHex(c, -40), -0.001, -0.006, 0, 0, 0, 0, 8, Math.PI);
  k.cyl(0.0085, 0.0085, 0.022, WATER, -0.004, 0.016, 0, 0, 0, Math.PI / 2, 10);
  k.cyl(0.006, 0.006, 0.0235, WATER_LIGHT, -0.004, 0.016, 0.003, 0, 0, Math.PI / 2, 8);
  for (const [x, y] of [[0.045, 0.006], [0.052, 0.002], [0.048, 0.011]] as const) k.sph(0.0025, WATER, x, y, 0, 1, 1, 1, 5);
}

/** A ripe mango with a red blush, a stalk and a leaf. */
function mango(k: Kit, c: string): void {
  k.sph(0.019, c, 0, -0.004, 0, 1.4, 0.95, 0.95, 12);
  k.sph(0.013, '#ff5a3a', 0.008, 0.002, 0.007, 1.3, 0.9, 0.8, 8);
  k.cyl(0.0015, 0.0018, 0.008, '#6a4a22', -0.022, 0.012, 0, 0, 0, 0.5, 5);
  k.sph(0.01, LEAF, -0.016, 0.018, 0.004, 1.6, 0.25, 0.7, 6);
}

/** A straw sun hat with a pink ribbon and a flower. */
function sunHat(k: Kit, c: string): void {
  k.cyl(0.028, 0.028, 0.003, c, 0, -0.01, 0, 0, 0, 0, 16);
  k.dome(0.015, shadeHex(c, 6), 0, -0.009, 0, 1, 1.1, 1, 12);
  k.cyl(0.0153, 0.0153, 0.005, '#ff3d8b', 0, -0.005, 0, 0, 0, 0, 12);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    k.sph(0.0035, WHITE, 0.003 + Math.cos(a) * 0.004, -0.004 + Math.sin(a) * 0.004, 0.016, 1, 1, 0.5, 5);
  }
  k.sph(0.0025, '#ffd23f', 0.003, -0.004, 0.018, 1, 1, 1, 5);
}

/** A trimmed green coconut with a white top and a bendy straw. */
function coconut(k: Kit, c: string): void {
  k.sph(0.019, c, 0, -0.008, 0, 1, 1.05, 1, 12);
  k.cone(0.017, 0.016, shadeHex(c, 12), 0, 0.013, 0, 0, 0, 0, 10);
  k.cyl(0.008, 0.01, 0.006, '#f4ecd0', 0, 0.022, 0, 0, 0, 0, 10);
  k.cyl(0.002, 0.002, 0.02, '#ff3d8b', 0.002, 0.032, 0, 0, 0, -0.25, 5);
  k.cyl(0.002, 0.002, 0.01, '#ff3d8b', 0.009, 0.043, 0, 0, 0, -1.2, 5);
  k.sph(0.005, '#ffd23f', -0.009, 0.026, 0.004, 1.4, 0.4, 1, 6);
}

/** A khan: a bowl of water with a silver rim and floating petals. */
function waterBowl(k: Kit, c: string): void {
  k.add(new THREE.LatheGeometry([new THREE.Vector2(0.001, -0.02), new THREE.Vector2(0.012, -0.02), new THREE.Vector2(0.01, -0.016), new THREE.Vector2(0.022, -0.008), new THREE.Vector2(0.026, 0.006)], 14), c);
  k.tor(0.026, 0.0025, SILVER, 0, 0.006, 0, Math.PI / 2, 0, 0, 16);
  k.cyl(0.024, 0.024, 0.002, WATER, 0, 0.003, 0, 0, 0, 0, 14);
  for (const [x, z, col] of [[0.008, 0.004, '#ff3d8b'], [-0.009, -0.006, '#ffd23f'], [0.0, -0.012, JASMINE]] as const) k.sph(0.0045, col, x, 0.005, z, 1, 0.4, 1, 6);
  k.tor(0.01, 0.0018, SILVER, 0, -0.012, 0.0185, -0.25, 0, 0, 8);
}

/** A bucket of water with a splash jumping out. */
function bucket(k: Kit, c: string): void {
  k.cyl(0.02, 0.015, 0.03, c, 0, -0.008, 0, 0, 0, 0, 12);
  k.tor(0.02, 0.0022, shadeHex(c, 30), 0, 0.007, 0, Math.PI / 2, 0, 0, 14);
  k.cyl(0.018, 0.018, 0.002, WATER, 0, 0.004, 0, 0, 0, 0, 12);
  k.tor(0.02, 0.0012, '#5b5f68', 0, 0.007, 0, 0, 0, 0, 10, Math.PI);
  for (const [x, y, z, r] of [[0.004, 0.012, 0.004, 0.004], [-0.006, 0.017, 0, 0.0032], [0.01, 0.02, -0.004, 0.0026], [0, 0.024, 0.006, 0.0022]] as const) k.sph(r, WATER_LIGHT, x, y, z, 1, 1.3, 1, 6);
}

/** A little bowl heaped with orchids. */
function orchidBowl(k: Kit, c: string): void {
  k.sph(0.017, GOLD, 0, -0.014, 0, 1.15, 0.6, 1.15, 12);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const x = i < 5 ? Math.cos(a) * 0.012 : 0;
    const z = i < 5 ? Math.sin(a) * 0.012 : 0;
    const y = i < 5 ? -0.002 : 0.008;
    for (let p = 0; p < 5; p++) {
      const b = (p / 5) * Math.PI * 2 + i;
      k.sph(0.0045, p % 2 ? c : shadeHex(c, 18), x + Math.cos(b) * 0.0045, y + 0.001, z + Math.sin(b) * 0.0045, 1, 0.5, 1, 5);
    }
    k.sph(0.0022, '#ffd23f', x, y + 0.003, z, 1, 1, 1, 4);
  }
  for (const s of [-1, 1]) k.sph(0.008, LEAF, s * 0.02, -0.006, 0, 1.6, 0.3, 0.6, 6);
}

/** A flowery holiday shirt. */
function shirt(k: Kit, c: string): void {
  k.box(0.03, 0.034, 0.01, c, 0, -0.004, 0);
  for (const s of [-1, 1]) {
    k.box(0.014, 0.012, 0.0095, c, s * 0.019, 0.006, 0, 0, 0, s * -0.6);
    k.shape(polygon([[0, 0], [s * 0.009, 0], [s * 0.002, -0.009]]), 0.002, WHITE, M(s * 0.0005, 0.012, 0.005));
  }
  k.box(0.0015, 0.03, 0.002, shadeHex(c, -30), 0, -0.006, 0.0055);
  for (const [x, y, col] of [[-0.009, 0.004, '#ffd23f'], [0.008, -0.008, WHITE], [-0.007, -0.015, '#ffd23f'], [0.009, 0.006, '#22b5c6']] as const) {
    for (let p = 0; p < 4; p++) k.sph(0.0022, col, x + Math.cos(p * 1.57) * 0.0022, y + Math.sin(p * 1.57) * 0.0022, 0.0055, 1, 1, 0.4, 4);
    k.sph(0.0012, ROSE, x, y, 0.0062, 1, 1, 1, 4);
  }
}

/** A chedi sai: a stepped sand stupa with a little flag on top. */
function stupa(k: Kit, c: string): void {
  k.cyl(0.022, 0.025, 0.01, c, 0, -0.02, 0, 0, 0, 0, 12);
  k.cyl(0.016, 0.019, 0.009, shadeHex(c, 8), 0, -0.011, 0, 0, 0, 0, 12);
  k.sph(0.013, c, 0, -0.004, 0, 1, 0.9, 1, 10);
  k.cone(0.008, 0.02, shadeHex(c, 8), 0, 0.014, 0, 0, 0, 0, 8);
  k.cyl(0.0008, 0.0008, 0.022, WHITE, 0, 0.03, 0, 0, 0, 0, 4);
  k.shape(polygon([[0, 0], [0, -0.01], [0.016, -0.005]]), 0.001, '#ff3d8b', M(0, 0.041, 0));
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3;
    k.sph(0.0025, pick(FLAGS, i), Math.cos(a) * 0.024, -0.015, Math.sin(a) * 0.024, 1, 1, 1, 4);
  }
}

/** A phuang malai: a ring of jasmine with a rosebud and a tassel. */
function garland(k: Kit, c: string): void {
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    k.sph(0.0055, i % 3 ? c : shadeHex(c, -18), Math.cos(a) * 0.015, 0.012 + Math.sin(a) * 0.015, 0, 1, 1, 1, 6);
  }
  k.sph(0.006, ROSE, 0, -0.005, 0.002, 1, 1, 1, 7);
  k.cyl(0.0045, 0.006, 0.01, c, 0, -0.014, 0, 0, 0, 0, 8);
  k.sph(0.0035, '#ff3d8b', 0, -0.02, 0.001, 1, 1, 1, 5);
  for (const x of [-0.004, 0, 0.004]) k.cyl(0.0012, 0.0016, 0.012, x ? LEAF : '#ffd23f', x, -0.029, 0, 0, 0, x * 20, 4);
}

/** A toy elephant with a red saddle cloth, trunk raised and dripping. */
function elephant(k: Kit, c: string): void {
  k.sph(0.017, c, -0.004, 0, 0, 1.25, 1, 1, 12);
  for (const [x, z] of [[-0.014, -0.008], [-0.014, 0.008], [0.008, -0.008], [0.008, 0.008]] as const) k.cyl(0.0055, 0.0055, 0.014, c, x, -0.017, z, 0, 0, 0, 7);
  k.sph(0.012, c, 0.02, 0.01, 0, 1, 1, 1, 10);
  for (const s of [-1, 1]) {
    k.sph(0.011, c, 0.015, 0.011, s * 0.012, 0.35, 1, 1, 8);
    k.sph(0.008, '#ffb3c8', 0.017, 0.011, s * 0.0125, 0.3, 1, 1, 6);
    k.sph(0.0018, INK, 0.029, 0.014, s * 0.006, 1, 1, 1, 4);
    k.cone(0.0018, 0.008, WHITE, 0.031, 0.0, s * 0.004, 0, 0, -1.9, 5);
  }
  k.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.029, 0.006, 0), new THREE.Vector3(0.037, -0.006, 0), new THREE.Vector3(0.044, 0.004, 0), new THREE.Vector3(0.044, 0.016, 0)]), 8, 0.0035, 6), c);
  k.box(0.022, 0.003, 0.03, ROSE, -0.006, 0.016, 0, 0, 0, 0);
  k.box(0.024, 0.002, 0.032, GOLD, -0.006, 0.0145, 0);
  for (const [x, y] of [[0.046, 0.024], [0.04, 0.028], [0.051, 0.028]] as const) k.sph(0.0028, WATER, x, y, 0, 1, 1.3, 1, 5);
}

// ------------------------------------------------------------------------------------- props

type Place = PropContext['m'];

/** An arc of water droplets from (0, h) to (len, 0) along +x, bright like sunlit water. */
function arc(glow: GeoBatch, m: Place, h: number, len: number, peak: number, n: number, size: number, seed = 0): void {
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const y = h * (1 - t) + peak * 4 * t * (1 - t);
    const wob = Math.sin(i * 2.3 + seed) * size * 0.4;
    glow.add(sph(size * (0.75 + 0.35 * Math.sin(i * 1.7 + seed)), 1.5, 1, 1, 6), pick(DROPS, i + seed), m(t * len, y, wob));
  }
}

/** A puddle with a crown of splashing drops. */
function splashAt(b: GeoBatch, glow: GeoBatch, m: Place, x: number, z: number, r: number): void {
  b.add(cyl(r, r, 0.01, 16), WATER, m(x, 0.014, z));
  b.add(cyl(r * 0.6, r * 0.6, 0.01, 14), WATER_LIGHT, m(x + r * 0.15, 0.016, z - r * 0.1));
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    glow.add(sph(r * 0.11, 1, 1.6, 1, 6), pick(DROPS, i), m(x + Math.cos(a) * r * 0.45, 0.04 + (i % 2) * r * 0.25, z + Math.sin(a) * r * 0.45));
  }
}

/** A water spray toward +x landing in a splash, starting 0.18 up (water gun nozzle height). */
function spray({ b, glow, m, variant }: PropContext): void {
  arc(glow, m, 0.18, 0.95, 0.12, 12, 0.03, variant);
  arc(glow, m, 0.17, 0.88, 0.16, 8, 0.02, variant + 3);
  splashAt(b, glow, m, 1.0, 0, 0.16);
}

function splash({ b, glow, m }: PropContext): void {
  splashAt(b, glow, m, 0, 0, 0.2);
}

/** A big toy elephant spraying water from its trunk into a puddle, about 1.4 long at scale 1. */
function elephantProp({ b, glow, m }: PropContext): void {
  b.add(sph(0.2, 1.3, 1, 1, 14), ELEPHANT, m(0, 0.34, 0));
  for (const [x, z] of [[-0.15, -0.1], [-0.15, 0.1], [0.12, -0.1], [0.12, 0.1]] as const) {
    b.add(cyl(0.065, 0.07, 0.24, 10), ELEPHANT, m(x, 0.12, z));
    b.add(cyl(0.071, 0.071, 0.03, 10), '#f4ecd8', m(x, 0.015, z));
  }
  b.add(sph(0.15, 1, 1, 1, 12), ELEPHANT, m(0.26, 0.46, 0));
  for (const s of [-1, 1]) {
    b.add(sph(0.14, 0.3, 1, 0.95, 10), ELEPHANT, m(0.2, 0.47, s * 0.15));
    b.add(sph(0.1, 0.3, 1, 0.9, 8), '#ffb3c8', m(0.215, 0.47, s * 0.155));
    b.add(sph(0.022, 1, 1, 1, 6), INK, m(0.37, 0.52, s * 0.075));
    b.add(new THREE.ConeGeometry(0.022, 0.1, 6).rotateZ(-1.9), WHITE, m(0.4, 0.37, s * 0.06));
  }
  const trunk = new THREE.CatmullRomCurve3([new THREE.Vector3(0.38, 0.42, 0), new THREE.Vector3(0.48, 0.3, 0), new THREE.Vector3(0.56, 0.36, 0), new THREE.Vector3(0.6, 0.52, 0)]);
  b.add(new THREE.TubeGeometry(trunk, 10, 0.04, 8), ELEPHANT, m(0, 0, 0));
  b.add(new THREE.CylinderGeometry(0.04, 0.032, 0.03, 8), shadeHex(ELEPHANT, -20), m(0.605, 0.54, 0));
  // Saddle cloth with gold trim, and a jasmine garland round the neck.
  b.add(new THREE.BoxGeometry(0.26, 0.03, 0.42), ROSE, m(-0.04, 0.53, 0).multiply(new THREE.Matrix4().makeRotationZ(0.05)));
  b.add(new THREE.BoxGeometry(0.28, 0.02, 0.44), GOLD, m(-0.04, 0.51, 0).multiply(new THREE.Matrix4().makeRotationZ(0.05)));
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    b.add(sph(0.026, 1, 1, 1, 6), i % 3 ? JASMINE : ROSE, m(0.15, 0.4 + Math.cos(a) * 0.14, Math.sin(a) * 0.16));
  }
  b.add(sph(0.02, 1, 1, 1, 6), ELEPHANT, m(-0.27, 0.36, 0));
  // The spray: up out of the trunk and over into a puddle.
  arc(glow, (x, y, z) => m(0.6 + x, y, z), 0.56, 0.8, 0.3, 13, 0.035);
  arc(glow, (x, y, z) => m(0.6 + x, y, z), 0.56, 0.7, 0.38, 9, 0.025, 2);
  splashAt(b, glow, m, 1.42, 0, 0.22);
}

/** A sand stupa (chedi sai) about 0.6 tall, stuck with coloured flags. */
function stupaProp({ b, m, variant }: PropContext): void {
  const sand = shadeHex(SAND, (variant % 3) * 6 - 6);
  b.add(cyl(0.2, 0.24, 0.1, 16), sand, m(0, 0.05, 0));
  b.add(cyl(0.15, 0.18, 0.09, 14), shadeHex(sand, 8), m(0, 0.145, 0));
  b.add(sph(0.12, 1, 0.95, 1, 12), sand, m(0, 0.24, 0));
  b.add(cyl(0.07, 0.07, 0.03, 10), shadeHex(sand, -10), m(0, 0.345, 0));
  b.add(new THREE.ConeGeometry(0.06, 0.2, 10), shadeHex(sand, 8), m(0, 0.46, 0));
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    b.add(sph(0.018, 1, 1, 1, 5), pick(FLAGS, i + variant), m(Math.cos(a) * 0.205, 0.105, Math.sin(a) * 0.205));
  }
  flagPole(b, m, 0, 0.5, 0, 0.24, pick(FLAGS, variant), 1.1);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.6;
    flagPole(b, m, Math.cos(a) * 0.16, 0.18, Math.sin(a) * 0.16, 0.2, pick(FLAGS, i + variant + 2), 0.75);
  }
}

function flagPole(b: GeoBatch, m: Place, x: number, y: number, z: number, h: number, col: string, size: number): void {
  b.add(cyl(0.006, 0.006, h, 4), WHITE, m(x, y + h / 2, z));
  const flag = new THREE.ExtrudeGeometry(tri, { depth: 0.006, bevelEnabled: false }).scale(size, size, 1);
  b.add(flag, col, m(x, y + h, z));
}

/** Bunting: two poles with a sagging string of Thai-coloured pennants, about 1.0 wide. */
function bunting({ b, m, variant }: PropContext): void {
  for (const x of [-0.5, 0.5]) {
    b.add(cyl(0.022, 0.028, 0.6, 6), '#ff3d8b', m(x, 0.3, 0));
    b.add(sph(0.035, 1, 1, 1, 6), GOLD, m(x, 0.62, 0));
  }
  pennants(b, (x, y, z) => m(x, y, z), -0.5, 0.5, 0.58, 0.1, 7, variant, 1.5);
}

/** A sagging string of pennants between x0 and x1, each with a white diamond (a Thai-pattern hint). */
function pennants(b: GeoBatch, at: (x: number, y: number, z: number) => THREE.Matrix4, x0: number, x1: number, y: number, sag: number, n: number, from: number, size: number): void {
  const yAt = (t: number) => y - sag * 4 * t * (1 - t);
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const x = x0 + (x1 - x0) * t;
    b.add(new THREE.ExtrudeGeometry(pennant, { depth: 0.008, bevelEnabled: false }).scale(size, size, 1), pick(FLAGS, i + from), at(x, yAt(t), 0));
    b.add(new THREE.ExtrudeGeometry(polygon([[0, 0.014], [0.011, 0], [0, -0.014], [-0.011, 0]]), { depth: 0.004, bevelEnabled: false }).scale(size, size, 1), WHITE, at(x, yAt(t) - 0.03 * size, 0.008));
  }
  for (let i = 0; i < 12; i++) {
    const t = (i + 0.5) / 12;
    b.add(cyl(0.004, 0.004, (x1 - x0) / 12 + 0.01, 3).rotateZ(Math.PI / 2 + (yAt(t + 0.04) - yAt(t - 0.04)) * 1.2), '#5b4a3a', at(x0 + (x1 - x0) * t, yAt(t) + 0.002, 0));
  }
}

/** A fruit stall: a striped awning over baskets of mangoes and a row of green coconuts. */
function stall({ b, m }: PropContext): void {
  b.add(new THREE.BoxGeometry(0.9, 0.24, 0.36), '#c98a52', m(0, 0.12, 0));
  b.add(new THREE.BoxGeometry(0.92, 0.02, 0.38), '#ff8fb1', m(0, 0.25, 0));
  for (const x of [-0.43, 0.43]) b.add(cyl(0.015, 0.015, 0.72, 6), WHITE, m(x, 0.36, -0.14));
  for (let i = 0; i < 6; i++) {
    b.add(new THREE.BoxGeometry(0.16, 0.02, 0.44), i % 2 ? WHITE : '#22b5c6', m(-0.4 + i * 0.16, 0.7, 0.04).multiply(new THREE.Matrix4().makeRotationX(0.28)));
    b.add(new THREE.ConeGeometry(0.08, 0.06, 3).rotateX(Math.PI).scale(1, 1, 0.2), i % 2 ? WHITE : '#22b5c6', m(-0.4 + i * 0.16, 0.62, 0.25));
  }
  // Baskets of mangoes.
  for (const x of [-0.25, 0.04]) {
    b.add(cyl(0.12, 0.09, 0.07, 10), '#b98a4a', m(x, 0.29, 0));
    for (let i = 0; i < 6; i++) {
      const a = i * 2.1;
      const r = i ? 0.06 : 0;
      b.add(sph(0.045, 1.4, 0.95, 0.95, 8), i % 3 ? MANGO : '#ff7a2a', m(x + Math.cos(a) * r, 0.34 + (i ? 0 : 0.03), Math.sin(a) * r, a));
    }
  }
  // Green coconuts, tops trimmed, one with a straw.
  for (let i = 0; i < 3; i++) {
    const x = 0.24 + (i % 2) * 0.1;
    const z = -0.08 + i * 0.08;
    b.add(sph(0.055, 1, 1, 1, 10), COCONUT, m(x, 0.31, z));
    b.add(new THREE.ConeGeometry(0.05, 0.05, 8), shadeHex(COCONUT, 12), m(x, 0.37, z));
    b.add(cyl(0.02, 0.025, 0.012, 8), '#f4ecd0', m(x, 0.395, z));
  }
  b.add(cyl(0.006, 0.006, 0.1, 4), '#ff3d8b', m(0.25, 0.44, 0.0).multiply(new THREE.Matrix4().makeRotationZ(-0.25)));
}

/** A garland rack: a little wooden frame with jasmine garlands hanging from it. */
function rack({ b, m }: PropContext): void {
  for (const x of [-0.32, 0.32]) {
    b.add(cyl(0.018, 0.022, 0.55, 6), '#a8693a', m(x, 0.275, 0));
    b.add(new THREE.BoxGeometry(0.12, 0.03, 0.16), '#a8693a', m(x, 0.015, 0));
  }
  b.add(cyl(0.014, 0.014, 0.72, 6).rotateZ(Math.PI / 2), '#a8693a', m(0, 0.54, 0));
  for (let g = 0; g < 3; g++) hangingGarland(b, m, -0.2 + g * 0.2, 0.54, 0, 1, pick([ROSE, '#ff3d8b', '#9b4dd6'], g));
}

/** A phuang malai hanging from (x, y): a loop of jasmine, a rosebud and a tassel. */
function hangingGarland(b: GeoBatch, m: Place, x: number, y: number, z: number, s: number, accent: string): void {
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    b.add(sph(0.017 * s, 1, 1, 1, 6), i % 4 ? JASMINE : accent, m(x + Math.sin(a) * 0.05 * s, y - 0.06 * s + Math.cos(a) * 0.06 * s, z));
  }
  b.add(sph(0.024 * s, 1, 1, 1, 7), accent, m(x, y - 0.14 * s, z));
  b.add(cyl(0.014 * s, 0.02 * s, 0.05 * s, 7), JASMINE, m(x, y - 0.18 * s, z));
  for (const dx of [-0.012, 0, 0.012]) b.add(cyl(0.004 * s, 0.006 * s, 0.07 * s, 4), dx ? LEAF : '#ffd23f', m(x + dx * s, y - 0.24 * s, z));
}

/** A silver bowl of water with floating flowers, about 0.3 across. */
function bowlProp({ b, m, variant }: PropContext): void {
  silverBowl(b, m, 0, 0, 1, variant);
}

function silverBowl(b: GeoBatch, m: Place, x: number, z: number, s: number, variant: number): void {
  b.add(new THREE.SphereGeometry(0.15 * s, 14, 5, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).scale(1, 0.6, 1), SILVER, m(x, 0.095 * s, z));
  b.add(new THREE.TorusGeometry(0.15 * s, 0.012 * s, 4, 16).rotateX(Math.PI / 2), shadeHex(SILVER, 15), m(x, 0.095 * s, z));
  b.add(cyl(0.142 * s, 0.142 * s, 0.01 * s, 14), WATER, m(x, 0.09 * s, z));
  b.add(cyl(0.06 * s, 0.06 * s, 0.01 * s, 10), WATER_LIGHT, m(x - 0.05 * s, 0.093 * s, z - 0.04 * s));
  for (let i = 0; i < 3; i++) {
    const a = i * 2.1 + variant;
    b.add(sph(0.026 * s, 1, 0.45, 1, 6), pick(['#ff3d8b', JASMINE, '#ffd23f', '#9b4dd6'], i + variant), m(x + Math.cos(a) * 0.06 * s, 0.1 * s, z + Math.sin(a) * 0.06 * s));
  }
}

/** A big blue water tub, the refill station, with a bowl floating in it. */
function tub({ b, m }: PropContext): void {
  b.add(cyl(0.2, 0.17, 0.32, 14), '#2f7fe0', m(0, 0.16, 0));
  for (const y of [0.06, 0.26]) b.add(new THREE.TorusGeometry(0.19 - y * 0.05, 0.012, 4, 16).rotateX(Math.PI / 2), '#5ea8ff', m(0, y, 0));
  b.add(cyl(0.19, 0.19, 0.012, 14), WATER, m(0, 0.3, 0));
  b.add(sph(0.07, 1, 0.45, 1, 10), SILVER, m(0.05, 0.31, 0.03));
}

// ------------------------------------------------------------------------------------- the skin

const skin: HolidaySkin = {
  id: 'songkran',
  name: 'Songkran',
  greeting: 'Happy Songkran!',
  cargo: { red: waterGun, orange: mango, yellow: sunHat, green: coconut, teal: tilted(waterBowl, 0.5), blue: bucket, purple: tilted(orchidBowl, 0.4), pink: shirt, brown: stupa, white: garland, gray: elephant },
  props: {
    'songkran.spray': spray,
    'songkran.splash': splash,
    'songkran.elephant': elephantProp,
    'songkran.stupa': stupaProp,
    'songkran.bunting': bunting,
    'songkran.stall': stall,
    'songkran.rack': rack,
    'songkran.bowl': bowlProp,
    'songkran.tub': tub,
  },
  inside: [
    { name: 'waterFight', w: 2, h: 1, items: [['toy:block', -0.78, -0.12, 0, 0.5], ['songkran.spray', -0.62, -0.12, 0, 0.75], ['toy:block', 0.78, 0.15, Math.PI, 0.5], ['songkran.spray', 0.62, 0.15, Math.PI, 0.6], ['toy:car', 0.05, 0.38, 'face', 0.45]] },
    { name: 'elephantBath', w: 2, h: 2, items: [['songkran.elephant', -0.55, -0.2, 0, 0.85], ['songkran.tub', -0.65, 0.6, 0, 0.9], ['toy:car', 0.65, 0.65, 'face', 0.5], ['toy:kite', 0.15, 0.7, 'face', 0.5], ['toy:duck', 0.7, -0.65, 0.6, 0.5]] },
    { name: 'sandStupas', w: 2, h: 2, items: [['songkran.stupa', 0, -0.15, 0, 1.05], ['songkran.stupa', -0.6, 0.4, 0, 0.75], ['songkran.stupa', 0.6, 0.45, 0, 0.7], ['songkran.bunting', 0, -0.72, 0, 1.6], ['bucket', 0.65, -0.3, 0, 0.6], ['spade', -0.7, -0.3, 0.8, 0.6]] },
    { name: 'fruitStall', w: 2, h: 1, items: [['songkran.stall', 0, -0.08, 0, 1.0], ['toy:top', -0.72, 0.3, 'face', 0.45], ['toy:ball', 0.72, 0.3, 'face', 0.45]] },
    { name: 'garlands', w: 2, h: 1, items: [['songkran.rack', -0.35, -0.1, 0, 1.0], ['toy:star', 0.4, 0.2, 'face', 0.5], ['toy:sheep', 0.75, -0.15, 'face', 0.5], ...row(2, 0.4, 'songkran.bowl', 0.9, 0, 0.32).map(([k, x, z, y, s]) => [k, x - 0.35, z, y, s] as [string, number, number, number, number])] },
  ],
  outside: [
    { name: 'elephantSpray', w: 2.4, h: 0, items: [['songkran.elephant', -1.3, -0.3, 0.2, 2.4], ['songkran.tub', 1.7, -1.2, 0, 2.2], ['songkran.bowl', 1.9, 0.9, 0, 2.2], ['toy:drum', -1.7, 1.3, 0.5, 1.6]] },
    { name: 'stupaField', w: 2.4, h: 0, items: [['songkran.stupa', 0, -0.2, 0, 3], ['songkran.stupa', -1.4, 0.6, 0, 2.2], ['songkran.stupa', 1.3, 0.8, 0, 2], ['songkran.bunting', 0, -1.6, 0, 4], ['toy:car', 1.5, -0.6, 'face', 1.4]] },
    { name: 'waterMarket', w: 2.4, h: 0, items: [['songkran.stall', -0.4, -0.6, 0, 2.6], ['songkran.rack', 1.6, -0.3, -0.6, 2.2], ['toy:block', -1.6, 1.2, 0.3, 1.4], ['songkran.spray', -1.1, 1.05, 0.3, 2], ['songkran.bowl', 0.9, 1.3, 0, 2]] },
  ],
  edge(b, _glow, spot) {
    // The rim's top sits above the mat: everything stands on it, a size up.
    const LIFT = 0.05;
    const K = 1.4;
    const at = (x: number, y: number, z: number) => {
      const c = Math.cos(spot.yaw);
      const s = Math.sin(spot.yaw);
      return new THREE.Matrix4().compose(new THREE.Vector3(spot.x + x * c + z * s, LIFT + y * K, spot.z - x * s + z * c), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), spot.yaw), new THREE.Vector3(K, K, K));
    };
    const m: Place = (x, y, z) => at(x, y, z);
    if (spot.corner) {
      // A little sand stupa with a flag on each corner.
      stupaProp({ b, glow: _glow, m: (x, y, z) => at(x * 0.45, y * 0.45, z * 0.45).multiply(new THREE.Matrix4().makeScale(0.45, 0.45, 0.45)), mr: () => new THREE.Matrix4(), palette: FLAGS, variant: spot.index, day: 0, length: 1 });
      return;
    }
    // Two silver bowls of water with a jasmine garland lying between them.
    silverBowl(b, (x, y, z) => at(x, y, z).multiply(new THREE.Matrix4().makeScale(0.6, 0.6, 0.6)), 0, -0.36, 1, spot.index);
    silverBowl(b, (x, y, z) => at(x, y, z).multiply(new THREE.Matrix4().makeScale(0.6, 0.6, 0.6)), 0, 0.36, 1, spot.index + 1);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      b.add(sph(0.024, 1, 1, 1, 5), i % 5 ? JASMINE : ROSE, m(Math.cos(a) * 0.07, 0.02, Math.sin(a) * 0.11));
    }
    b.add(sph(0.028, 1, 1, 1, 6), ROSE, m(0, 0.025, 0.14));
    b.add(cyl(0.012, 0.02, 0.06, 6).rotateX(Math.PI / 2), '#ffd23f', m(0, 0.02, 0.19));
  },
  station(b, f) {
    // The awning is what shows from above: Thai-coloured bunting swags along its front edge, a
    // jasmine garland hanging at every post, and a string of pennants on the roof flags.
    const len = Math.round(f.width + 0.1);
    const posts = Array.from({ length: len + 1 }, (_, i) => -f.width / 2 + (i * f.width) / len);
    const z = f.awningZ + 0.17;
    for (let i = 0; i < len; i++) pennants(b, (x, y, dz) => f.m(x, y, z + dz), posts[i] as number, posts[i + 1] as number, f.awningY + 0.03, 0.07, 5, i * 3, 1.45);
    const P: Place = (x, y, zz) => f.m(x, y, zz);
    posts.forEach((x, i) => hangingGarland(b, P, x, f.awningY + 0.02, z + 0.02, 0.85, pick([ROSE, '#ff3d8b', '#9b4dd6'], i)));
    const flagX = f.width / 2 - 0.15;
    for (const s of [-1, 1]) pennants(b, (x, y, dz) => f.m(x, y, dz - 0.06), s * flagX, s * 0.32, 1.0, 0.05, 4, s > 0 ? 4 : 0, 1.4);
  },
  engine(b) {
    // A jasmine garland round the smokebox with a rosebud and a tassel hanging in front.
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      b.sphere(0.017, i % 4 ? JASMINE : ROSE, 0.255, 0.215 + Math.cos(a) * 0.1, Math.sin(a) * 0.1, 1, 1, 1, 6);
    }
    b.sphere(0.022, ROSE, 0.27, 0.105, 0, 1, 1, 1, 7);
    b.add(cyl(0.012, 0.017, 0.04, 7), JASMINE, M(0.27, 0.075, 0));
    for (const z of [-0.01, 0, 0.01]) b.add(cyl(0.004, 0.005, 0.05, 4), z ? LEAF : '#ffd23f', M(0.27, 0.035, z));
  },
  light: { background: '#4fb6e8', sunColor: '#fff3d0', sunIntensity: 3.1, hemiSky: '#c6ecff', hemiGround: '#e8c98c', hemiIntensity: 1.35 },
  fx: { kind: 'bubbles', colors: ['#8fdcff', '#bdeeff', '#e6f9ff'], count: 50 },
};

export default skin;
