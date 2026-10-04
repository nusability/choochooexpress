// Easter (Good Friday to Easter Monday): the spring egg hunt. Painted eggs hide in grass tufts
// between the tracks, a bunny family sits by the carrot patch, chicks hatch in a nest, someone left
// an egg-painting table with paint pots and brushes, tulips and daffodils bloom, pastel bunting runs
// round the diorama and petals drift by. Painted eggs (stripes, dots, zigzags), chicks, bunnies, a
// basket, carrots, tulips, a chocolate bunny, a cuddly lamb and a paint pot ride in the wagons.
import * as THREE from 'three';
import type { HolidaySkin, Item, PropContext } from '../holiday';
import { ring } from '../holiday';
import { INK, Kit, M, WHITE, paintFaces, polygon, shadeHex } from '../toyModels';

const PINK = '#ff6fae';
const LILAC = '#a77bff';
const MINT = '#3fd6a0';
const SKY = '#4fb6ff';
const BUTTER = '#ffd23a';
const PEACH = '#ff8f4a';
const GRASS = '#4fb848';
const LEAF = '#2f9a3e';
const BEAK = '#ff9a1f';
const WICKER = '#d9a052';
const SHELL = '#fff4dc';
const PASTEL = [PINK, SKY, BUTTER, MINT, LILAC, PEACH];

type Build = (k: Kit, c: string) => void;

// ------------------------------------------------------------------------------------- cargo

/** An egg about 0.05 tall: a sphere stretched up and narrowed at the top. */
function eggGeo(r: number): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(r, 20, 12);
  const p = g.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    const t = p.getY(i) / r;
    p.setXYZ(i, p.getX(i) * (1 - 0.13 * t), p.getY(i) * 1.28, p.getZ(i) * (1 - 0.13 * t));
  }
  g.computeVertexNormals();
  return g;
}

/** A painted egg; `paint(v, a)` colors by height (-1..1) and angle round the egg. */
function paintedEgg(k: Kit, r: number, paint: (v: number, a: number) => string, m?: THREE.Matrix4): void {
  const g = paintFaces(eggGeo(r), (x, y, z) => paint(y / (1.28 * r), Math.atan2(z, x)));
  if (m) g.applyMatrix4(m);
  k.parts.push(g);
}

const band = (v: number, at: number, w: number) => Math.abs(v - at) < w;

function stripeEgg(k: Kit, c: string): void {
  paintedEgg(k, 0.019, (v) => (band(v, 0.4, 0.1) || band(v, -0.4, 0.1) ? WHITE : band(v, 0, 0.11) ? BUTTER : c));
}

function zigzagEgg(k: Kit, c: string): void {
  const zig = (a: number) => {
    const f = ((a / (Math.PI * 2)) * 5) % 1;
    return (Math.abs(((f + 1) % 1) * 2 - 1) * 2 - 1) * 0.13;
  };
  paintedEgg(k, 0.019, (v, a) => (band(v, zig(a), 0.12) ? WHITE : band(v, 0.52 + zig(a), 0.07) || band(v, -0.5 + zig(a), 0.07) ? PINK : c));
}

function dotEgg(k: Kit, c: string): void {
  const r = 0.019;
  paintedEgg(k, r, (v) => (v > 0.88 ? WHITE : c));
  for (let i = 0; i < 11; i++) {
    const v = -0.7 + (i / 10) * 1.4;
    const a = i * 2.4;
    const rr = Math.sqrt(1 - v * v) * (1 - 0.13 * v) * r * 0.97;
    k.sph(0.0042, i % 2 ? BUTTER : WHITE, Math.cos(a) * rr, v * 1.28 * r * 0.97, Math.sin(a) * rr, 1, 1, 1, 6);
  }
}

function tulip(k: Kit, c: string): void {
  k.cyl(0.0018, 0.0018, 0.032, LEAF, 0, -0.012, 0, 0, 0, 0, 5);
  k.add(new THREE.SphereGeometry(0.0055, 6, 5), GRASS, M(0.006, -0.016, 0, 0, 0, -0.35, 0.6, 2.6, 1));
  k.add(new THREE.SphereGeometry(0.0055, 6, 5), GRASS, M(-0.006, -0.018, 0, 0, 0, 0.35, 0.6, 2.4, 1));
  k.sph(0.012, c, 0, 0.012, 0, 1, 1.15, 1, 10);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.5;
    k.add(new THREE.SphereGeometry(0.0085, 8, 6), shadeHex(c, i ? 10 : -12), M(Math.cos(a) * 0.006, 0.017, Math.sin(a) * 0.006, Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25, 0.75, 1.45, 0.75));
  }
}

function carrot(k: Kit, c: string): void {
  k.cone(0.014, 0.044, c, 0, -0.008, 0, Math.PI, 0, 0, 10);
  for (let i = 0; i < 3; i++) k.tor(0.012 - i * 0.003, 0.0009, shadeHex(c, -28), 0, -0.004 - i * 0.009, 0, Math.PI / 2, 0, 0, 10);
  for (const rz of [-0.5, 0, 0.5]) k.add(new THREE.SphereGeometry(0.0045, 6, 5), GRASS, M(Math.sin(rz) * 0.008, 0.024, 0, 0, 0, -rz, 1, 3, 0.6));
}

function chick(k: Kit, c: string, shell = true): void {
  const y0 = shell ? 0 : -0.012;
  if (shell) {
    k.add(new THREE.SphereGeometry(0.018, 12, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), SHELL, M(0, -0.008, 0, 0, 0, 0, 1, 1.25, 1));
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      k.cone(0.0045, 0.008, SHELL, Math.cos(a) * 0.016, -0.005, Math.sin(a) * 0.016, 0, 0, 0, 4);
    }
  }
  k.sph(0.013, c, 0, y0 + 0.004, 0, 1.05, 1, 1, 10);
  k.sph(0.0105, c, 0.004, y0 + 0.02, 0, 1, 1, 1, 10);
  k.cone(0.003, 0.008, BEAK, 0.017, y0 + 0.019, 0, 0, 0, -Math.PI / 2, 5);
  for (const s of [-1, 1]) {
    k.sph(0.0022, INK, 0.012, y0 + 0.024, s * 0.006, 1, 1, 1, 5);
    k.sph(0.0055, shadeHex(c, -18), -0.002, y0 + 0.005, s * 0.012, 1.3, 0.8, 0.5, 6);
  }
  k.sph(0.003, c, 0.002, y0 + 0.032, 0, 0.6, 1.4, 0.6, 5);
  if (shell) k.add(new THREE.SphereGeometry(0.011, 10, 4, 0, Math.PI * 2, 0, Math.PI / 2), SHELL, M(-0.002, y0 + 0.027, 0, 0.2, 0, 0.35, 1, 0.9, 1));
}

function bunny(k: Kit, c: string): void {
  const inner = '#ffb6d3';
  k.sph(0.016, c, -0.005, -0.01, 0, 1.15, 1, 1, 10);
  k.sph(0.0125, c, 0.011, 0.01, 0, 1, 1, 1, 10);
  for (const s of [-1, 1]) {
    k.add(new THREE.SphereGeometry(0.0055, 8, 6), c, M(0.006, 0.033, s * 0.006, s * 0.25, 0, 0.25, 1, 3, 0.65));
    k.add(new THREE.SphereGeometry(0.0035, 6, 5), inner, M(0.0085, 0.033, s * 0.006, s * 0.25, 0, 0.25, 0.6, 2.6, 0.5));
    k.sph(0.0022, INK, 0.021, 0.014, s * 0.0055, 1, 1, 1, 5);
    k.sph(0.0065, c, 0.012, -0.023, s * 0.009, 1.5, 0.7, 1, 6);
  }
  k.sph(0.0045, WHITE, 0.021, 0.006, 0, 1, 0.8, 1.4, 6);
  k.sph(0.002, '#ff4f8f', 0.0245, 0.008, 0, 1, 1, 1, 5);
  k.sph(0.0062, WHITE, -0.024, -0.006, 0, 1, 1, 1, 6);
}

function chocBunny(k: Kit, c: string): void {
  k.cyl(0.015, 0.016, 0.004, '#f2c23a', 0, -0.026, 0, 0, 0, 0, 12);
  k.sph(0.014, c, 0, -0.01, 0, 0.95, 1.25, 0.9, 10);
  k.sph(0.0105, c, 0.002, 0.014, 0, 1, 1, 1, 10);
  k.add(new THREE.SphereGeometry(0.0048, 8, 6), c, M(0.001, 0.034, 0.005, 0.15, 0, 0.1, 1, 2.8, 0.7));
  k.add(new THREE.SphereGeometry(0.0048, 8, 6), c, M(0.008, 0.032, -0.005, -0.15, 0, -0.9, 1, 2.6, 0.7));
  k.sph(0.0045, shadeHex(c, 12), 0.011, 0.011, 0, 0.8, 0.8, 1.3, 6);
  for (const s of [-1, 1]) k.sph(0.0018, WHITE, 0.0105, 0.017, s * 0.005, 1, 1, 1, 4);
  k.tor(0.0085, 0.0018, '#e8303f', 0.001, 0.004, 0, Math.PI / 2, 0, 0, 12);
  k.sph(0.0032, '#f2c23a', 0.009, 0.002, 0, 1, 1, 1, 6);
}

function basket(k: Kit, c: string): void {
  k.cyl(0.021, 0.015, 0.022, c, 0, -0.012, 0, 0, 0, 0, 14);
  for (const y of [-0.016, -0.008]) k.tor(0.0185 + (y + 0.012) * 0.25, 0.0012, shadeHex(c, -28), 0, y, 0, Math.PI / 2, 0, 0, 14);
  k.tor(0.021, 0.0022, shadeHex(c, 22), 0, -0.001, 0, Math.PI / 2, 0, 0, 14);
  k.tor(0.019, 0.0018, shadeHex(c, 22), 0, 0, 0, 0, Math.PI / 2, 0, 12, Math.PI);
  k.dome(0.018, GRASS, 0, -0.002, 0, 1, 0.3, 1, 10);
  for (const [x, z, col] of [[0.006, 0.006, PINK], [-0.007, -0.002, BUTTER], [0.004, -0.009, SKY]] as const) k.add(eggGeo(0.006), col, M(x, 0.005, z, z * 20, 0, x * 25));
  k.sph(0.0035, PINK, 0, 0.019, 0.018, 1.4, 1, 0.6, 6);
}

function lamb(k: Kit, c: string): void {
  for (const [x, y, z] of [[-0.009, 0, 0], [0.004, 0.002, 0.006], [0.004, 0.002, -0.006], [-0.013, -0.002, 0.007], [-0.013, -0.002, -0.007], [-0.002, 0.008, 0]] as const) k.sph(0.0105, c, x, y - 0.004, z, 1, 1, 1, 8);
  const face = '#ffd9c8';
  k.sph(0.008, face, 0.018, 0.006, 0, 1.15, 1, 0.95, 8);
  k.sph(0.006, c, 0.015, 0.014, 0, 1, 0.8, 1, 6);
  for (const s of [-1, 1]) {
    k.sph(0.0035, face, 0.013, 0.008, s * 0.009, 0.8, 0.5, 1.5, 5);
    k.sph(0.0016, INK, 0.024, 0.009, s * 0.0035, 1, 1, 1, 4);
    for (const x of [-0.012, 0.006]) k.cyl(0.0026, 0.0026, 0.012, face, x, -0.02, s * 0.006, 0, 0, 0, 6);
    k.sph(0.0035, PINK, 0.011, 0.0, s * 0.006, 1, 1, 0.6, 6);
  }
  k.sph(0.002, PINK, 0.011, 0.0, 0, 1, 1, 1, 5);
}

function paintPot(k: Kit, c: string): void {
  k.cyl(0.016, 0.016, 0.026, c, 0, -0.012, 0, 0, 0, 0, 14);
  k.tor(0.016, 0.0016, shadeHex(c, 30), 0, 0.001, 0, Math.PI / 2, 0, 0, 14);
  k.cyl(0.0148, 0.0148, 0.002, PINK, 0, 0.0, 0, 0, 0, 0, 14);
  k.sph(0.0035, PINK, 0.0158, -0.005, 0.004, 0.5, 2, 1, 6);
  k.box(0.022, 0.006, 0.016, SKY, 0, -0.012, 0.0095);
  k.cyl(0.0018, 0.0018, 0.032, WICKER, -0.004, 0.012, 0, 0, 0, 0.45, 5);
  k.cyl(0.0028, 0.0022, 0.008, '#c9ccd4', -0.0115, 0.027, 0, 0, 0, 0.45, 6);
  k.cone(0.003, 0.007, MINT, -0.0145, 0.034, 0, 0, 0, 0.45, 6);
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

const EGGS: [Build, string][] = [[stripeEgg, SKY], [dotEgg, MINT], [zigzagEgg, LILAC], [stripeEgg, PINK], [dotEgg, PEACH], [zigzagEgg, BUTTER]];

function tuftAt({ b, m }: PropContext, x: number, z: number, n = 14, h = 0.2): void {
  b.add(new THREE.CylinderGeometry(0.17, 0.19, 0.02, 10), LEAF, m(x, 0.01, z));
  for (let i = 0; i < n; i++) {
    const a = i * 2.4;
    const r = 0.03 + (i % 3) * 0.05;
    b.add(new THREE.ConeGeometry(0.035, h * (0.7 + (i % 3) * 0.25), 5), i % 2 ? GRASS : LEAF, m(x + Math.cos(a) * r, h * 0.4, z + Math.sin(a) * r).multiply(new THREE.Matrix4().makeRotationX(Math.sin(a) * 0.35).multiply(new THREE.Matrix4().makeRotationZ(-Math.cos(a) * 0.35))));
  }
}

/** A grass tuft with a painted egg half hidden in it. */
function tuft(ctx: PropContext): void {
  tuftAt(ctx, 0, 0);
  const [build, c] = EGGS[ctx.variant % EGGS.length] as [Build, string];
  const k = new Kit();
  build(k, c);
  for (const g of k.parts) ctx.b.addColored(g, ctx.mr(0.05, 0.07, 0.05, 0.35, 0.5, -0.6, 3.6, 3.6, 3.6));
}

/** A patch of lawn with daisies, where the hunt happens. */
function lawn({ b, m }: PropContext): void {
  b.add(new THREE.CylinderGeometry(0.5, 0.5, 0.012, 20), '#79cf5c', m(0, 0.006, 0));
  for (let i = 0; i < 16; i++) {
    const a = i * 2.4;
    const r = 0.12 + ((i * 7) % 11) * 0.033;
    b.add(new THREE.SphereGeometry(0.018, 6, 4).scale(1, 0.4, 1), i % 3 ? WHITE : BUTTER, m(Math.cos(a) * r, 0.014, Math.sin(a) * r));
  }
}

function egg(ctx: PropContext): void {
  const [build, c] = EGGS[ctx.variant % EGGS.length] as [Build, string];
  put(ctx, build, c, 0, 0, 0, 0.7);
}

function bigBasket(ctx: PropContext): void {
  put(ctx, basket, WICKER);
  ctx.b.add(new THREE.TorusGeometry(0.08, 0.025, 5, 10).scale(1, 0.6, 1), PASTEL[ctx.variant % 6] as string, ctx.m(0.06, 0.38, 0.17));
}

const FUR = ['#f6f1ea', '#c99a6a', '#b8b8c6', '#f6f1ea'];
const bunnyProp = (ctx: PropContext) => put(ctx, bunny, FUR[ctx.variant % FUR.length] as string);
const chickProp = (ctx: PropContext) => put(ctx, (k, c) => chick(k, c, ctx.variant % 2 === 1), BUTTER, 0, 0, 0, 0.7);

function nest(ctx: PropContext): void {
  const { b, m } = ctx;
  for (let i = 0; i < 3; i++) b.add(new THREE.TorusGeometry(0.2 - i * 0.02, 0.05, 5, 14).rotateX(Math.PI / 2), i % 2 ? '#a0703f' : '#8a5a2e', m(0, 0.04 + i * 0.03, 0, i));
  b.add(new THREE.CylinderGeometry(0.18, 0.16, 0.04, 12), '#e8c35a', m(0, 0.05, 0));
  put(ctx, chick, BUTTER, -0.06, 0.04, 0, 0.55, 0.06);
  put(ctx, (k, c) => chick(k, c, false), BUTTER, 0.08, -0.06, 0.8, 0.5, 0.07);
  put(ctx, dotEgg, SKY, 0.06, 0.1, 0, 0.45, 0.06);
}

function flowers({ b, m, variant }: PropContext): void {
  for (let i = 0; i < 5; i++) {
    const x = Math.cos(i * 2.4 + variant) * (0.06 + i * 0.03);
    const z = Math.sin(i * 2.4 + variant) * (0.06 + i * 0.03);
    const h = 0.22 + (i % 3) * 0.06;
    b.add(new THREE.CylinderGeometry(0.01, 0.012, h, 5), LEAF, m(x, h / 2, z));
    b.add(new THREE.SphereGeometry(0.03, 6, 5).scale(0.5, 2.6, 1), GRASS, m(x + 0.03, 0.07, z, i));
    if (i % 2) {
      // A daffodil: a star of petals and an orange trumpet.
      b.add(new THREE.CylinderGeometry(0.06, 0.06, 0.01, 6), '#fff07a', m(x, h, z, 0).multiply(new THREE.Matrix4().makeRotationZ(0.9)));
      b.add(new THREE.CylinderGeometry(0.03, 0.022, 0.05, 8), PEACH, m(x + 0.02, h + 0.015, z).multiply(new THREE.Matrix4().makeRotationZ(-0.68)));
    } else {
      const c = [PINK, '#e8303f', LILAC][(i / 2 + variant) % 3] as string;
      b.add(new THREE.SphereGeometry(0.055, 8, 6).scale(1, 1.3, 1), c, m(x, h + 0.04, z));
      for (let p = 0; p < 3; p++) b.add(new THREE.SphereGeometry(0.04, 6, 5).scale(0.8, 1.5, 0.8), shadeHex(c, 12), m(x + Math.cos(p * 2.1) * 0.03, h + 0.06, z + Math.sin(p * 2.1) * 0.03));
    }
  }
}

function carrots(ctx: PropContext): void {
  const { b, m } = ctx;
  b.add(new THREE.SphereGeometry(0.3, 12, 6).scale(1.3, 0.25, 0.8), '#8a5a2e', m(0, 0, 0));
  for (let i = 0; i < 5; i++) {
    const x = -0.28 + i * 0.14;
    b.add(new THREE.CylinderGeometry(0.035, 0.03, 0.03, 8), PEACH, m(x, 0.075, (i % 2) * 0.08 - 0.04));
    for (const rz of [-0.4, 0, 0.4]) b.add(new THREE.SphereGeometry(0.03, 6, 5).scale(0.5, 2.4, 0.5), GRASS, m(x, 0.14, (i % 2) * 0.08 - 0.04).multiply(new THREE.Matrix4().makeRotationZ(rz)));
  }
  put(ctx, carrot, PEACH, 0.2, 0.32, 1.4, 0.7, -0.03);
}

/** The egg-painting table: a checked cloth, paint pots, brushes and eggs drying in egg cups. */
function table(ctx: PropContext): void {
  const { b, m } = ctx;
  for (const [x, z] of [[-0.3, -0.18], [0.3, -0.18], [-0.3, 0.18], [0.3, 0.18]] as const) b.add(new THREE.CylinderGeometry(0.018, 0.018, 0.24, 6), WICKER, m(x, 0.12, z));
  b.add(new THREE.BoxGeometry(0.74, 0.03, 0.48), WHITE, m(0, 0.25, 0));
  for (let i = 0; i < 6; i++) b.add(new THREE.BoxGeometry(0.06, 0.032, 0.49), PINK, m(-0.3 + i * 0.12, 0.25, 0));
  PASTEL.slice(0, 4).forEach((c, i) => {
    b.add(new THREE.CylinderGeometry(0.04, 0.04, 0.06, 10), '#c9ccd4', m(-0.26 + i * 0.09, 0.3, -0.13));
    b.add(new THREE.CylinderGeometry(0.035, 0.035, 0.012, 10), c, m(-0.26 + i * 0.09, 0.33, -0.13));
  });
  for (const [x, z, a, c] of [[0.12, -0.12, 0.3, SKY], [0.2, 0.15, 2, PINK]] as const) {
    b.add(new THREE.CylinderGeometry(0.008, 0.008, 0.2, 5).rotateZ(Math.PI / 2), WICKER, m(x, 0.275, z, a));
    b.add(new THREE.ConeGeometry(0.014, 0.04, 6).rotateZ(Math.PI / 2), c, m(x + Math.cos(a) * 0.12, 0.275, z - Math.sin(a) * 0.12, a));
  }
  EGGS.slice(0, 3).forEach(([build, c], i) => {
    const x = -0.22 + i * 0.15;
    b.add(new THREE.CylinderGeometry(0.035, 0.025, 0.04, 10), WHITE, m(x, 0.285, 0.1));
    put(ctx, build, c, x, 0.1, 0.5, 0.42, 0.28);
  });
}

// ------------------------------------------------------------------------------------- the skin

const hunt = (n: number, r: number, scale: number, phase: number): Item[] => ring(n, r, 'easter.tuft', scale, phase).map(([k, x, z, yaw, s], i): Item => [k, x, z, yaw, s, 0, i]);

const skin: HolidaySkin = {
  id: 'easter',
  name: 'Easter',
  greeting: 'Happy Easter!',
  cargo: { red: tulip, orange: carrot, yellow: (k, c) => chick(k, c), green: zigzagEgg, teal: dotEgg, blue: stripeEgg, purple: basket, pink: bunny, brown: chocBunny, white: lamb, gray: paintPot },
  props: {
    'easter.tuft': tuft,
    'easter.egg': egg,
    'easter.lawn': lawn,
    'easter.basket': bigBasket,
    'easter.bunny': bunnyProp,
    'easter.chick': chickProp,
    'easter.nest': nest,
    'easter.flowers': flowers,
    'easter.carrots': carrots,
    'easter.table': table,
  },
  inside: [
    { name: 'eggHunt', w: 2, h: 2, items: [['easter.lawn', 0, 0, 0, 1.9], ['easter.basket', 0, 0, 0.4, 1.5], ...hunt(5, 0.68, 1.6, 0.5), ['easter.bunny', -0.3, 0.42, 'face', 1.1, 0, 0], ['easter.egg', 0.36, -0.3, 0, 1.4, 0, 4]] },
    { name: 'bunnyFamily', w: 2, h: 1, items: [['easter.carrots', -0.5, 0, 0.2, 1.1], ['easter.bunny', 0.1, 0.05, 2.6, 1.15, 0, 1], ['easter.bunny', 0.5, -0.14, 2.9, 0.8, 0, 0], ['easter.bunny', 0.8, 0.14, 2.3, 0.7, 0, 2]] },
    { name: 'hatching', w: 2, h: 1, items: [['easter.nest', -0.35, 0, 0, 1.7], ['easter.chick', 0.3, 0.12, 2.6, 1.2, 0, 1], ['easter.chick', 0.6, -0.12, 2.9, 1, 0, 1], ['easter.egg', 0.85, 0.16, 0, 1.1, 0, 2]] },
    { name: 'eggPainting', w: 2, h: 2, items: [['easter.table', 0, -0.12, 0, 1.6], ['easter.bunny', -0.15, 0.52, Math.PI / 2, 1.05, 0, 3], ['easter.chick', 0.55, 0.5, 2.2, 1.2, 0, 1], ['easter.tuft', -0.65, 0.5, 0, 1.4, 0, 0], ['easter.egg', 0.7, -0.62, 0, 1.1, 0, 5]] },
    { name: 'tulips', w: 2, h: 1, items: [['easter.flowers', -0.5, 0, 0, 1.8, 0, 0], ['easter.flowers', 0.15, 0.05, 1, 1.8, 0, 1], ['easter.tuft', 0.72, -0.08, 0, 1.5, 0, 3]] },
  ],
  outside: [
    { name: 'bigHunt', w: 2.4, h: 0, items: [['easter.lawn', 0, 0, 0, 4.5], ['easter.basket', 0, 0, 0.5, 3], ...hunt(4, 1.4, 2.6, 0.3), ['easter.bunny', 0.9, 0.4, 'face', 2.4, 0, 0]] },
    { name: 'bunnyFamily', w: 2.4, h: 0, items: [['easter.carrots', 0, 0, 0.3, 2.6], ['easter.bunny', 1.3, 0.5, 2.4, 2.6, 0, 1], ['easter.bunny', 1.8, -0.2, 2.8, 1.8, 0, 2], ['easter.flowers', -1.2, 0.8, 0, 3]] },
    { name: 'paintingTable', w: 2, h: 0, items: [['easter.table', 0, 0, 0.3, 3.2], ['easter.chick', 1.3, 0.6, 2.4, 2.4, 0, 1], ['easter.egg', -1.2, 0.7, 0, 2.6, 0, 1]] },
  ],
  edge(b, _glow, spot, { day }) {
    const at = (x: number, y: number, z: number, ry = 0, rz = 0, s = 1) => {
      const c = Math.cos(spot.yaw);
      const sn = Math.sin(spot.yaw);
      return new THREE.Matrix4().compose(new THREE.Vector3(spot.x + x * c + z * sn, y, spot.z - x * sn + z * c), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, spot.yaw + ry, rz)), new THREE.Vector3(s, s, s));
    };
    if (spot.corner) {
      // A big painted egg in a grass tuft on each corner.
      for (let i = 0; i < 7; i++) b.add(new THREE.ConeGeometry(0.035, 0.14 + (i % 3) * 0.04, 5), i % 2 ? GRASS : LEAF, at(Math.cos(i * 2.4) * 0.07, 0.07, Math.sin(i * 2.4) * 0.07, 0, Math.cos(i * 2.4) * 0.3));
      const [build, c] = EGGS[(spot.index + day) % EGGS.length] as [Build, string];
      const k = new Kit();
      build(k, c);
      for (const g of k.parts) b.addColored(g, at(0, 0.12, 0, 0.6, 0.15, 4.4));
      return;
    }
    // Pastel bunting on little posts: the string sags halfway to the next post.
    b.add(new THREE.CylinderGeometry(0.016, 0.02, 0.26, 6), WHITE, at(0.03, 0.13, 0));
    b.add(new THREE.SphereGeometry(0.04, 8, 6), PASTEL[spot.index % 6] as string, at(0.03, 0.27, 0));
    const sag = (z: number) => 0.25 - 0.07 * (1 - ((0.45 - Math.abs(z)) / 0.45) ** 2);
    for (let i = -4; i < 4; i++) {
      const z0 = i * 0.1125;
      const z1 = z0 + 0.1125;
      const y0 = sag(z0);
      const y1 = sag(z1);
      b.add(new THREE.BoxGeometry(0.01, 0.01, Math.hypot(0.1125, y1 - y0) + 0.004), WHITE, at(0.03, (y0 + y1) / 2, (z0 + z1) / 2).multiply(new THREE.Matrix4().makeRotationX(-Math.atan2(y1 - y0, 0.1125))));
      const zm = (z0 + z1) / 2;
      b.add(new THREE.ExtrudeGeometry(polygon([[-0.05, 0], [0.05, 0], [0, -0.1]]), { depth: 0.008, bevelEnabled: false }), PASTEL[(spot.index * 3 + i + 8) % 6] as string, at(0.03, sag(zm) + 0.003, zm, Math.PI / 2));
    }
  },
  station(b, f) {
    // A pastel garland of flowers along the eaves, with egg wreaths beside the clock.
    for (let x = -f.width / 2, i = 0; x <= f.width / 2; x += 0.1, i++) {
      b.add(new THREE.SphereGeometry(0.04, 8, 6), i % 2 ? GRASS : LEAF, f.m(x, f.roofY + 0.01, f.frontZ + 0.03));
      if (i % 2 === 0) b.add(new THREE.SphereGeometry(0.03, 8, 6), PASTEL[(i / 2) % 6] as string, f.m(x, f.roofY + 0.005, f.frontZ + 0.07));
    }
    for (const x of [-0.42, 0.42]) {
      b.add(new THREE.TorusGeometry(0.08, 0.025, 6, 14), GRASS, f.m(x, 0.36, f.frontZ + 0.02));
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + 0.3;
        b.add(new THREE.SphereGeometry(0.022, 8, 6).scale(1, 1.3, 1), PASTEL[i] as string, f.m(x + Math.cos(a) * 0.08, 0.36 + Math.sin(a) * 0.08, f.frontZ + 0.05));
      }
    }
  },
  engine(b) {
    // Bunny ears on a pink band round the cab roof, leaning out so they show from above.
    for (const s of [-1, 1]) {
      const ear = new THREE.Matrix4().compose(new THREE.Vector3(-0.17, 0.52, s * 0.05), new THREE.Quaternion().setFromEuler(new THREE.Euler(s * 0.5, 0, s > 0 ? 0.1 : 0.35)), new THREE.Vector3(1, 1, 1));
      b.add(new THREE.SphereGeometry(0.032, 10, 8).scale(1, 3.2, 0.45), WHITE, ear);
      b.add(new THREE.SphereGeometry(0.021, 8, 6).scale(1, 3.4, 0.3).translate(0, -0.005, -s * 0.009), '#ff9cc4', ear);
    }
    b.cylinder(0.075, 0.075, 0.025, PINK, -0.17, 0.43, 0, 14);
  },
  light: { sunColor: '#fff4e0', hemiSky: '#e8f6ff', hemiGround: '#d8f0c0' },
  fx: { kind: 'petals', colors: ['#ffb3d1', '#d6b8ff', '#fff1a8', '#b8f0d8', '#ffffff'], count: 55 },
};

export default skin;
