// Día de los Muertos (31 October – 2 November, Mexico): a joyful remembrance. An ofrenda with
// marigolds, candles, pan de muerto, sugar skulls and little photo frames; paths of cempasúchil
// petals; papel picado strung round the diorama and on the station; a band of cheerful skeleton
// mariachis; bright alebrijes; a sombrero on the engine and marigold petals in the warm evening air.
// More candles burn on the rim each day of the festival.
import * as THREE from 'three';
import type { GeoBatch } from '../batch';
import type { HolidaySkin, PropContext } from '../holiday';
import { INK, Kit, M, WHITE, paintFaces, polygon, shadeHex } from '../toyModels';

const ORANGE = '#ff8c1a';
const YELLOW = '#ffc21a';
const MAGENTA = '#e8338a';
const PINK = '#ff5fa8';
const PURPLE = '#8e44c9';
const TURQ = '#1fb8c9';
const LIME = '#7fd13b';
const GOLD = '#f2c23a';
const CLAY = '#c8643c';
const LEAF = '#3f9a3a';
const WOOD = '#c98a52';
const CREAM = '#fff3d6';
const FLAME = '#ffa62b';
const FLAME_CORE = '#fff27a';
const PICADO = ['#ff3d8b', '#ff8c1a', '#ffd23f', '#3dc9e0', '#9b5de5', '#5bd16a'];

type V3 = [number, number, number];

// ------------------------------------------------------------------------------------- helpers

/** Builds parts in a sub-kit and moves them all by `g`. */
function nest(k: Kit, g: THREE.Matrix4, build: (s: Kit) => void): void {
  const s = new Kit();
  build(s);
  for (const p of s.parts) k.parts.push(p.applyMatrix4(g));
}

/** Adds a kit's (already colored) parts to a batch. */
function put(b: GeoBatch, k: Kit, m: THREE.Matrix4): void {
  for (const p of k.parts) b.addColored(p, m);
}

/** A cargo model as a kit, with how far to lift it so it stands on y = 0. */
function model(build: (k: Kit, c: string) => void, c: string): { k: Kit; lift: number } {
  const k = new Kit();
  build(k, c);
  let min = Infinity;
  for (const p of k.parts) {
    p.computeBoundingBox();
    min = Math.min(min, (p.boundingBox as THREE.Box3).min.y);
  }
  return { k, lift: -min };
}

/** A ruffled marigold pompom (striped bands). */
function pom(k: Kit, r: number, c: string, x: number, y: number, z: number, seg = 7): void {
  const g = paintFaces(new THREE.SphereGeometry(r, seg, Math.max(5, seg - 2)), (_x, py) => (Math.floor((py + r) / (r * 0.4)) % 2 ? shadeHex(c, 30) : c));
  k.parts.push(g.applyMatrix4(M(x, y, z)));
}

/** A cylinder between two points. */
function rod(k: Kit, a: V3, b: V3, r: number, c: string, seg = 6): void {
  const A = new THREE.Vector3(...a);
  const B = new THREE.Vector3(...b);
  const d = B.clone().sub(A);
  const len = d.length();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  k.add(new THREE.CylinderGeometry(r, r, len, seg), c, new THREE.Matrix4().compose(A.add(B).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)));
}

const diamond = (x: number, y: number, s: number) => {
  const p = new THREE.Path();
  p.moveTo(x, y + s);
  p.lineTo(x - s * 0.7, y);
  p.lineTo(x, y - s);
  p.lineTo(x + s * 0.7, y);
  p.closePath();
  return p;
};

/** Papel picado: a paper flag hanging from y = 0, scalloped at the bottom, cut with little holes. */
const flags = new Map<string, THREE.BufferGeometry>();
function flagGeo(w: number, h: number, depth = 0.004, holes = w >= 0.15, teeth = holes ? 5 : 3): THREE.BufferGeometry {
  const key = `${w}:${h}:${depth}:${holes}:${teeth}`;
  let g = flags.get(key);
  if (!g) {
    const pts: [number, number][] = [[-w / 2, 0], [w / 2, 0], [w / 2, -h * 0.8]];
    for (let i = 1; i <= teeth * 2; i++) pts.push([w / 2 - (i / (teeth * 2)) * w, i % 2 ? -h : -h * 0.8]);
    const s = polygon(pts);
    if (holes) s.holes.push(diamond(0, -h * 0.42, h * 0.16), diamond(-w * 0.28, -h * 0.3, h * 0.09), diamond(w * 0.28, -h * 0.3, h * 0.09));
    g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false }).translate(0, 0, -depth / 2);
    g.computeVertexNormals();
    flags.set(key, g);
  }
  return g.clone();
}

/** A string of papel picado from (x0, z0) to (x1, z1) at height y. */
function bunting(k: Kit, x0: number, z0: number, x1: number, z1: number, y: number, n: number, w: number, h: number, ci = 0, tilt = 0.5, teeth?: number): void {
  const phi = Math.atan2(z1 - z0, x1 - x0);
  const len = Math.hypot(x1 - x0, z1 - z0);
  k.add(new THREE.CylinderGeometry(w * 0.03, w * 0.03, len, 5), WHITE, M((x0 + x1) / 2, y, (z0 + z1) / 2, 0, -phi, Math.PI / 2));
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    // Flags lift a little in the breeze so they read from above.
    const at = new THREE.Matrix4().makeRotationY(-phi).multiply(new THREE.Matrix4().makeRotationX(tilt)).setPosition(x0 + (x1 - x0) * t, y, z0 + (z1 - z0) * t);
    k.add(flagGeo(w, h, 0.004, w >= 0.15, teeth), PICADO[(ci + i) % PICADO.length] as string, at);
  }
}

/** A candle with its flame in a separate (glowing) kit. */
function candle(k: Kit, glow: Kit, x: number, y: number, z: number, r: number, h: number, c = CREAM): void {
  k.cyl(r, r, h, c, x, y + h / 2, z, 0, 0, 0, 8);
  k.cyl(r * 0.15, r * 0.15, r * 0.6, INK, x, y + h + r * 0.3, z, 0, 0, 0, 4);
  glow.sph(r * 0.75, FLAME, x, y + h + r * 1.1, z, 1, 1.7, 1, 6);
  glow.sph(r * 0.4, FLAME_CORE, x, y + h + r * 0.95, z, 1, 1.6, 1, 4);
}

/** Tiny deterministic jitter. */
const jit = (i: number, salt: number) => {
  const v = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return v - Math.floor(v);
};

// ------------------------------------------------------------------------------------- cargo

/** A painted sugar skull (calavera), face toward +x. */
function sugarSkull(k: Kit, c: string): void {
  nest(k, M(0, 0, 0, 0, Math.PI / 2, 0), (q) => skullFace(q, c));
}

function skullFace(k: Kit, c: string): void {
  k.sph(0.021, c, 0, 0.004, 0, 1, 0.95, 0.9, 10);
  k.sph(0.014, c, 0, -0.012, 0.003, 1, 0.8, 0.85, 8);
  for (const s of [-1, 1]) {
    k.sph(0.0075, s < 0 ? PINK : TURQ, s * 0.0085, 0.001, 0.016, 1, 1, 0.45, 7);
    k.sph(0.0045, INK, s * 0.0085, 0.001, 0.0185, 1, 1, 0.4, 5);
  }
  k.sph(0.0022, INK, 0, -0.007, 0.0185, 1, 1.3, 0.5, 5);
  k.box(0.014, 0.0012, 0.002, INK, 0, -0.0135, 0.0155);
  for (const x of [-0.004, 0, 0.004]) k.box(0.001, 0.004, 0.002, INK, x, -0.0135, 0.0155);
  k.sph(0.003, YELLOW, 0, 0.015, 0.0168, 1, 1, 0.6, 4);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.78;
    k.sph(0.0028, ORANGE, Math.cos(a) * 0.0048, 0.015 + Math.sin(a) * 0.0048, 0.0158, 1, 1, 0.5, 4);
  }
}

/** A cempasúchil (marigold) bloom. */
function marigold(k: Kit, c: string): void {
  pom(k, 0.015, c, 0, 0.002, 0, 10);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    k.add(new THREE.SphereGeometry(0.0075, 5, 3), i % 2 ? shadeHex(c, -15) : c, M(Math.cos(a) * 0.016, -0.003, Math.sin(a) * 0.016, 0, -a, 0.25, 1.4, 0.6, 1));
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    k.add(new THREE.SphereGeometry(0.006, 5, 3), shadeHex(c, 22), M(Math.cos(a) * 0.012, 0.008, Math.sin(a) * 0.012, 0, -a, 0.5, 1.3, 0.6, 1));
  }
  k.cone(0.008, 0.01, LEAF, 0, -0.014, 0, Math.PI, 0, 0, 8);
  k.cyl(0.0022, 0.0022, 0.008, LEAF, 0, -0.021, 0, 0, 0, 0, 5);
  for (const s of [-1, 1]) k.sph(0.007, LEAF, s * 0.008, -0.022, 0.004, 1.4, 0.3, 0.7, 6);
}

function candleCargo(k: Kit, c: string): void {
  k.cyl(0.018, 0.015, 0.005, CLAY, 0, -0.022, 0, 0, 0, 0, 12);
  k.cyl(0.011, 0.011, 0.034, c, 0, -0.003, 0, 0, 0, 0, 12);
  k.cyl(0.0105, 0.0105, 0.002, shadeHex(c, 22), 0, 0.0145, 0, 0, 0, 0, 12);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.4;
    k.sph(0.003, shadeHex(c, 22), Math.cos(a) * 0.011, 0.01 - (i % 2) * 0.004, Math.sin(a) * 0.011, 1, 1.8, 1, 4);
  }
  k.tor(0.0114, 0.0013, MAGENTA, 0, -0.008, 0, Math.PI / 2, 0, 0, 10);
  k.cyl(0.001, 0.001, 0.005, INK, 0, 0.017, 0, 0, 0, 0, 4);
  k.sph(0.0055, '#ff8a1f', 0, 0.024, 0, 1, 1.8, 1, 8);
  k.sph(0.003, FLAME_CORE, 0, 0.0225, 0.001, 1, 1.6, 1, 4);
}

/** Pan de muerto: a round sweet bread with crossed "bones" and a ball on top. */
function panDeMuerto(k: Kit, c: string): void {
  k.dome(0.024, c, 0, -0.014, 0, 1, 0.75, 1, 12);
  const bone = shadeHex(c, -16);
  for (const ry of [0, Math.PI / 2]) {
    k.add(new THREE.TorusGeometry(0.021, 0.0032, 4, 8, Math.PI), bone, M(0, -0.014, 0, 0, ry, 0, 1, 0.78, 1));
    for (const a of [Math.PI / 4, (3 * Math.PI) / 4]) {
      const x = Math.cos(a) * 0.021;
      k.sph(0.0045, bone, Math.cos(ry) * x, -0.014 + Math.sin(a) * 0.021 * 0.78, -Math.sin(ry) * x, 1, 1, 1, 5);
    }
  }
  k.sph(0.0055, bone, 0, 0.006, 0, 1, 1, 1, 6);
}

/** A papel picado flag on its string, facing +z. */
function picadoCargo(k: Kit, c: string): void {
  k.cyl(0.0012, 0.0012, 0.054, WHITE, 0, 0.02, 0, 0, 0, Math.PI / 2, 5);
  k.add(flagGeo(0.044, 0.042, 0.003, true), c, M(0, 0.02, 0));
  for (const s of [-1, 1]) k.sph(0.0025, YELLOW, s * 0.025, 0.02, 0, 1, 1, 1, 5);
}

/** An alebrije: a winged, spotted fantasy creature, facing +x. */
function alebrije(k: Kit, c: string): void {
  k.sph(0.016, c, -0.002, -0.002, 0, 1.45, 0.9, 0.85, 10);
  k.sph(0.011, c, 0.021, 0.011, 0, 1, 1, 1, 8);
  k.sph(0.006, shadeHex(c, 22), 0.031, 0.008, 0, 1.2, 0.8, 1, 6);
  for (const s of [-1, 1]) {
    k.sph(0.0038, YELLOW, 0.027, 0.016, s * 0.006, 1, 1, 1, 5);
    k.sph(0.0018, INK, 0.03, 0.017, s * 0.0068, 1, 1, 1, 4);
    k.cone(0.0028, 0.009, YELLOW, 0.017, 0.024, s * 0.006, 0, 0, 0.35, 6);
    k.shape(polygon([[0, 0], [0.006, 0.012], [0.016, 0.018], [0.012, 0.008], [0.02, 0.006], [0.01, 0]]), 0.002, s < 0 ? TURQ : PINK, M(-0.012, 0.008, s * 0.009, s * -0.7, 0, 0));
    for (const x of [-0.011, 0.009]) {
      k.cyl(0.0035, 0.0038, 0.013, shadeHex(c, -20), x, -0.0155, s * 0.007, 0, 0, 0, 5);
      k.cyl(0.0039, 0.0039, 0.003, YELLOW, x, -0.0215, s * 0.007, 0, 0, 0, 5);
    }
  }
  k.tor(0.008, 0.0028, c, -0.027, 0.006, 0, 0, 0, -0.6, 8, Math.PI * 1.3);
  k.sph(0.0035, ORANGE, -0.034, 0.012, 0, 1, 1, 1, 6);
  const spots: [number, number, number, string][] = [[-0.01, 0.004, 0.0117, YELLOW], [0.004, -0.003, 0.0125, LIME], [-0.012, 0.013, 0, YELLOW], [-0.003, 0.0145, 0, PINK], [0.007, 0.013, 0, LIME]];
  for (const [x, y, z, col] of spots) {
    k.sph(0.0032, col, x, y, z, 1, 1, 1, 4);
    if (z) k.sph(0.0032, col, x, y, -z, 1, 1, 1, 4);
  }
}

/** A pair of crossed maracas. */
function maracas(k: Kit, c: string): void {
  const bands = [c, YELLOW, c, PINK, c];
  for (const s of [-1, 1]) {
    nest(k, M(0.002, -0.004, s * 0.006, 0, s * 0.5, 0.35), (q) => {
      const r = 0.012;
      const g = paintFaces(new THREE.SphereGeometry(r, 10, 7), (x) => bands[Math.min(bands.length - 1, Math.floor(((x + r) / (2 * r)) * bands.length))] as string);
      q.parts.push(g.applyMatrix4(M(0.011, 0, 0, 0, 0, 0, 1.2, 1, 1)));
      q.cyl(0.0028, 0.0034, 0.024, WOOD, -0.014, 0, 0, 0, 0, Math.PI / 2, 6);
      q.sph(0.0036, shadeHex(WOOD, -20), -0.026, 0, 0, 1, 1, 1, 6);
    });
  }
}

/** A guitar lying back, face up and toward +z. */
function guitar(k: Kit, c: string): void {
  nest(k, M(0, 0, 0, -1.1, 0, 0.15), (q) => {
    q.sph(0.013, c, -0.01, 0, 0, 1, 1, 0.38, 10);
    q.sph(0.01, c, 0.005, 0, 0, 1, 1, 0.38, 10);
    q.cyl(0.0042, 0.0042, 0.001, INK, -0.005, 0, 0.0046, Math.PI / 2, 0, 0, 10);
    q.tor(0.005, 0.0009, YELLOW, -0.005, 0, 0.0046, 0, 0, 0, 12);
    q.box(0.002, 0.008, 0.002, INK, -0.016, 0, 0.0042);
    for (const [x, y] of [[-0.016, -0.007], [-0.016, 0.007]] as const) q.sph(0.0022, x < -0.015 && y < 0 ? YELLOW : TURQ, x, y, 0.0036, 1, 1, 0.5, 5);
    q.box(0.02, 0.0045, 0.003, '#7a4a26', 0.023, 0, 0.0015);
    q.box(0.007, 0.007, 0.003, shadeHex(c, -25), 0.036, 0, 0.0015);
    q.box(0.044, 0.0035, 0.0006, '#efe6d0', 0.012, 0, 0.0035);
  });
}

function sombrero(k: Kit, c: string): void {
  k.cyl(0.026, 0.026, 0.003, c, 0, -0.008, 0, 0, 0, 0, 18);
  k.tor(0.026, 0.0028, shadeHex(c, -12), 0, -0.006, 0, Math.PI / 2, 0, 0, 14);
  k.cyl(0.0085, 0.0125, 0.018, c, 0, 0.003, 0, 0, 0, 0, 12);
  k.dome(0.0085, c, 0, 0.012, 0, 1, 0.6, 1, 10);
  k.tor(0.0122, 0.0018, YELLOW, 0, -0.004, 0, Math.PI / 2, 0, 0, 10);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    k.sph(0.0026, i % 2 ? PINK : YELLOW, Math.cos(a) * 0.019, -0.0062, Math.sin(a) * 0.019, 1, 0.6, 1, 4);
  }
}

/** A painted cup of hot chocolate with a wooden molinillo. */
function hotChocolate(k: Kit, c: string): void {
  k.cyl(0.0135, 0.011, 0.026, c, 0, -0.008, 0, 0, 0, 0, 14);
  k.cyl(0.0126, 0.0126, 0.002, '#5a2e1a', 0, 0.0045, 0, 0, 0, 0, 14);
  for (const [x, z] of [[0.004, 0.003], [-0.005, -0.002]] as const) k.sph(0.0035, '#d9a06b', x, 0.0055, z, 1, 0.5, 1, 5);
  k.tor(0.007, 0.0022, c, 0.014, -0.007, 0, 0, 0, 0, 10);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.9;
    k.sph(0.0023, i % 2 ? WHITE : YELLOW, Math.cos(a) * 0.0124, -0.008, Math.sin(a) * 0.0124, 1, 1, 1, 4);
  }
  k.cyl(0.0014, 0.0014, 0.024, WOOD, -0.004, 0.012, 0.002, 0, 0, 0.3, 5);
  k.sph(0.0045, WOOD, -0.0075, 0.023, 0.002, 1, 1.2, 1, 6);
  k.tor(0.003, 0.0012, shadeHex(WOOD, -20), -0.0068, 0.018, 0.002, Math.PI / 2, 0.3, 0, 8);
}

// ------------------------------------------------------------------------------------- props

/** The ofrenda: three steps dressed in cloth and papel picado, an arch of marigolds; front +x, about 1 wide. */
function ofrenda({ b, glow, m }: PropContext): void {
  const k = new Kit();
  const g = new Kit();
  const tiers: [number, number, number, number, string][] = [[0, 0.08, 0.5, 1.0, MAGENTA], [-0.08, 0.24, 0.34, 0.84, ORANGE], [-0.16, 0.4, 0.18, 0.68, TURQ]];
  tiers.forEach(([x, y, d, w, col], t) => {
    k.box(d, 0.16, w, col, x, y, 0);
    const n = Math.round(w / 0.13);
    for (let i = 0; i < n; i++) k.add(flagGeo(0.1, 0.075), PICADO[(i + t * 2) % PICADO.length] as string, M(x + d / 2 + 0.004, y + 0.075, -w / 2 + ((i + 0.5) / n) * w, 0, Math.PI / 2, 0));
  });
  // Bottom step: candles, pan de muerto, cups of chocolate.
  for (const [z, h] of [[-0.44, 0.08], [-0.3, 0.11], [0.3, 0.11], [0.44, 0.08]] as const) candle(k, g, 0.17, 0.16, z, 0.022, h);
  const pan = model(panDeMuerto, '#c98a4a');
  nest(k, M(0.16, 0.16 + pan.lift * 3.2, 0, 0, 0, 0, 3.2, 3.2, 3.2), (q) => q.parts.push(...pan.k.parts));
  for (const [z, col] of [[-0.15, TURQ], [0.15, PINK]] as const) {
    const cup = model(hotChocolate, col);
    nest(k, M(0.17, 0.16 + cup.lift * 2.4, z, 0, 0.6, 0, 2.4, 2.4, 2.4), (q) => q.parts.push(...cup.k.parts));
  }
  // Middle step: sugar skulls between marigolds.
  for (const z of [-0.28, 0, 0.28]) {
    const skull = model(sugarSkull, WHITE);
    nest(k, M(0.01, 0.32 + skull.lift * 2.8, z, 0, 0, 0.45, 2.8, 2.8, 2.8), (q) => q.parts.push(...skull.k.parts));
  }
  for (const z of [-0.4, -0.14, 0.14, 0.4]) pom(k, 0.04, ORANGE, 0.02, 0.36, z);
  // Top step: photos of the ones remembered, and tall candles.
  const frames = [GOLD, PINK, TURQ];
  const photos = ['#bfe6ff', '#ffe2b8', '#d9f2c4'];
  [-0.2, 0, 0.2].forEach((z, i) =>
    nest(k, M(-0.17, 0.555, z, 0, 0, 0.3), (q) => {
      q.box(0.018, 0.15, 0.12, frames[i] as string, 0, 0, 0);
      q.box(0.006, 0.11, 0.085, photos[i] as string, 0.008, 0, 0);
      q.sph(0.022, ['#8a5a2e', '#5a3a2a', '#b07a46'][i] as string, 0.011, 0.012, 0, 0.3, 1, 1, 8);
      q.sph(0.035, [PURPLE, MAGENTA, ORANGE][i] as string, 0.011, -0.045, 0, 0.3, 0.6, 1, 8);
    }),
  );
  for (const z of [-0.3, 0.3]) candle(k, g, -0.16, 0.48, z, 0.024, 0.16);
  // An arch of marigolds over it all.
  for (const s of [-1, 1]) rod(k, [-0.22, 0, s * 0.54], [-0.22, 0.16, s * 0.54], 0.02, LEAF);
  for (let i = 0; i <= 12; i++) {
    const a = (i / 12) * Math.PI;
    pom(k, 0.05, i % 3 === 1 ? YELLOW : ORANGE, -0.22, 0.16 + Math.sin(a) * 0.54, Math.cos(a) * 0.54, 6);
  }
  put(b, k, m(0, 0, 0));
  put(glow, g, m(0, 0, 0));
}

/** A winding path of marigold petals along x, about 1 long. */
function petals({ b, m, variant }: PropContext): void {
  const k = new Kit();
  const zAt = (x: number) => Math.sin(x * 5 + variant) * 0.07;
  for (let i = 0; i < 10; i++) {
    const x = -0.45 + i * 0.1;
    const yaw = -Math.atan(Math.cos(x * 5 + variant) * 0.35);
    k.add(new THREE.CylinderGeometry(0.08, 0.08, 0.008, 8), i % 2 ? ORANGE : '#ff9f2a', M(x, 0.016, zAt(x), 0, yaw, 0, 1, 1, 0.9));
  }
  const cols = [ORANGE, YELLOW, '#ff6a00', ORANGE, YELLOW, MAGENTA];
  for (let i = 0; i < 40; i++) {
    const x = -0.52 + jit(i, variant) * 1.04;
    k.add(new THREE.SphereGeometry(0.028, 5, 2), cols[i % cols.length] as string, M(x, 0.022, zAt(x) + (jit(i, 7) - 0.5) * 0.22, 0, jit(i, 3) * 6, 0, 1, 0.3, 0.65));
  }
  put(b, k, m(0, 0, 0));
}

/** A cheerful skeleton mariachi in a sombrero, front +x; variant picks the instrument. */
function skeleton({ b, m, variant }: PropContext): void {
  const k = new Kit();
  const v = variant % 4;
  const jacket = [MAGENTA, TURQ, PURPLE, ORANGE][v] as string;
  const hat = [YELLOW, PINK, ORANGE, TURQ][v] as string;
  for (const s of [-1, 1]) {
    k.box(0.08, 0.03, 0.045, INK, 0.015, 0.015, s * 0.045);
    k.cyl(0.028, 0.026, 0.2, '#2a2340', 0, 0.13, s * 0.045, 0, 0, 0, 8);
    k.sph(0.02, GOLD, 0.0, 0.2, s * 0.072, 1, 1, 1, 6);
  }
  k.cyl(0.07, 0.08, 0.2, jacket, 0, 0.32, 0, 0, 0, 0, 12);
  for (const y of [0.28, 0.33, 0.38]) k.sph(0.01, GOLD, 0.073, y, 0, 1, 1, 1, 4);
  for (const s of [-1, 1]) k.sph(0.018, '#d8312f', 0.072, 0.415, s * 0.017, 0.5, 0.8, 1.2, 6);
  k.cyl(0.018, 0.018, 0.05, WHITE, 0, 0.44, 0, 0, 0, 0, 6);
  // The painted skull.
  k.sph(0.085, WHITE, 0, 0.53, 0, 0.95, 1, 0.95, 12);
  k.sph(0.055, WHITE, 0.022, 0.47, 0, 1, 0.7, 1, 10);
  for (const s of [-1, 1]) {
    k.sph(0.03, s < 0 ? PINK : TURQ, 0.068, 0.55, s * 0.032, 0.4, 1, 1, 6);
    k.sph(0.019, INK, 0.08, 0.55, s * 0.032, 0.4, 1, 1, 6);
  }
  k.sph(0.01, INK, 0.084, 0.515, 0, 0.5, 1.2, 1, 6);
  k.box(0.006, 0.006, 0.05, INK, 0.073, 0.473, 0);
  for (const z of [-0.016, 0, 0.016]) k.box(0.006, 0.018, 0.004, INK, 0.073, 0.473, z);
  for (const [z, col] of [[-0.02, ORANGE], [0, YELLOW], [0.02, LIME]] as const) k.sph(0.008, col, 0.077, 0.6, z, 0.5, 1, 1, 6);
  // Sombrero.
  k.cyl(0.17, 0.17, 0.012, hat, 0, 0.61, 0, 0, 0, 0, 16);
  k.tor(0.165, 0.012, shadeHex(hat, -14), 0, 0.618, 0, Math.PI / 2, 0, 0, 12);
  k.cyl(0.045, 0.065, 0.1, hat, 0, 0.665, 0, 0, 0, 0, 12);
  k.dome(0.045, hat, 0, 0.714, 0, 1, 0.6, 1, 10);
  k.tor(0.062, 0.01, jacket, 0, 0.625, 0, Math.PI / 2, 0, 0, 10);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    k.sph(0.012, i % 2 ? MAGENTA : TURQ, Math.cos(a) * 0.12, 0.618, Math.sin(a) * 0.12, 1, 0.5, 1, 4);
  }
  // Arms and the instrument.
  const shoulder = (s: number): V3 => [0, 0.4, s * 0.08];
  const hands: [V3, V3] = [[0.12, 0.3, -0.02], [0.11, 0.46, 0.17]];
  if (v === 0 || v === 3) {
    const big = v === 3 ? 1.35 : 1;
    const body = v === 3 ? '#a0703f' : '#e8574a';
    nest(k, M(0.11, 0.32, 0.02, 0.75, 0, 0, big, big, big), (q) => {
      q.sph(0.075, body, 0, -0.03, 0, 0.3, 1, 1, 12);
      q.sph(0.055, body, 0, 0.06, 0, 0.3, 1, 1, 12);
      q.cyl(0.024, 0.024, 0.006, INK, 0.022, 0.02, 0, 0, 0, Math.PI / 2, 10);
      q.tor(0.027, 0.005, YELLOW, 0.024, 0.02, 0, 0, Math.PI / 2, 0, 12);
      q.box(0.012, 0.18, 0.026, '#7a4a26', 0.01, 0.19, 0);
      q.box(0.014, 0.05, 0.034, shadeHex(body, -25), 0.01, 0.3, 0);
    });
    if (v === 3) hands[1] = [0.11, 0.48, 0.21];
  } else if (v === 1) {
    hands[0] = [0.2, 0.48, -0.03];
    hands[1] = [0.2, 0.48, 0.03];
    rod(k, [0.09, 0.49, 0], [0.32, 0.49, 0], 0.012, GOLD);
    k.cone(0.05, 0.09, GOLD, 0.35, 0.49, 0, 0, 0, Math.PI / 2, 12);
    k.cyl(0.04, 0.04, 0.03, GOLD, 0.22, 0.49, 0, Math.PI / 2, 0, 0, 10);
  } else {
    hands[0] = [0.09, 0.56, -0.15];
    hands[1] = [0.09, 0.56, 0.15];
    for (const [s, col] of [[-1, LIME], [1, PINK]] as const) {
      k.sph(0.04, col, 0.09, 0.63, s * 0.16, 1, 1.2, 1, 8);
      k.tor(0.04, 0.007, YELLOW, 0.09, 0.63, s * 0.16, Math.PI / 2, 0, 0, 10);
    }
  }
  [-1, 1].forEach((s, i) => {
    const h = hands[i] as V3;
    const sh = shoulder(s);
    const elbow: V3 = [(sh[0] + h[0]) / 2 + 0.01, Math.min(sh[1], h[1]) - 0.05, (sh[2] + h[2]) / 2 + s * 0.04];
    rod(k, sh, elbow, 0.022, jacket);
    rod(k, elbow, h, 0.02, jacket);
    k.sph(0.022, WHITE, h[0], h[1], h[2], 1, 1, 1, 6);
  });
  put(b, k, m(0, 0, 0));
}

/** A clay dish of candles with marigolds round it. */
function candles({ b, glow, m, variant }: PropContext): void {
  const k = new Kit();
  const g = new Kit();
  k.cyl(0.17, 0.15, 0.03, CLAY, 0, 0.015, 0, 0, 0, 0, 14);
  const spots: [number, number, number][] = [[0, 0, 0.22], [0.08, 0.06, 0.15], [-0.07, 0.07, 0.12], [-0.04, -0.08, 0.17], [0.07, -0.07, 0.1]];
  spots.slice(0, 3 + (variant % 3)).forEach(([x, z, h], i) => candle(k, g, x, 0.03, z, 0.03, h, i % 2 ? '#fff7e8' : CREAM));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    pom(k, 0.04, i % 2 ? YELLOW : ORANGE, Math.cos(a) * 0.19, 0.04, Math.sin(a) * 0.19);
  }
  put(b, k, m(0, 0, 0));
  put(glow, g, m(0, 0, 0));
}

/** A painted clay pot of marigolds, about 0.32 tall. */
function pot({ b, m, variant }: PropContext): void {
  const k = new Kit();
  k.cyl(0.12, 0.09, 0.16, CLAY, 0, 0.08, 0, 0, 0, 0, 12);
  k.tor(0.12, 0.016, shadeHex(CLAY, 12), 0, 0.16, 0, Math.PI / 2, 0, 0, 12);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    k.sph(0.016, i % 2 ? TURQ : YELLOW, Math.cos(a) * 0.107, 0.09, Math.sin(a) * 0.107, 1, 1, 1, 4);
  }
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.4;
    k.sph(0.05, LEAF, Math.cos(a) * 0.1, 0.18, Math.sin(a) * 0.1, 1.4, 0.35, 0.7, 5);
  }
  const bloom = variant % 2 ? YELLOW : ORANGE;
  pom(k, 0.07, bloom, 0, 0.25, 0, 10);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    pom(k, 0.055, i % 2 ? bloom : ORANGE, Math.cos(a) * 0.085, 0.2, Math.sin(a) * 0.085);
  }
  put(b, k, m(0, 0, 0));
}

/** Two painted poles with papel picado strung between them (along z), about 0.75 tall. */
function picado({ b, m, variant }: PropContext): void {
  const k = new Kit();
  for (const s of [-1, 1]) {
    k.cyl(0.018, 0.022, 0.76, s < 0 ? PINK : TURQ, 0, 0.38, s * 0.6, 0, 0, 0, 8);
    pom(k, 0.045, ORANGE, 0, 0.78, s * 0.6);
  }
  bunting(k, 0, -0.6, 0, 0.6, 0.72, 7, 0.15, 0.13, variant);
  bunting(k, 0, -0.6, 0, 0.6, 0.5, 6, 0.15, 0.13, variant + 3);
  put(b, k, m(0, 0, 0));
}

// ------------------------------------------------------------------------------------- the skin

const skin: HolidaySkin = {
  id: 'muertos',
  name: 'Día de Muertos',
  greeting: '¡Feliz Día de Muertos!',
  cargo: { white: sugarSkull, orange: marigold, yellow: candleCargo, brown: panDeMuerto, pink: picadoCargo, purple: alebrije, green: maracas, red: guitar, teal: sombrero, blue: hotChocolate },
  props: {
    'muertos.ofrenda': ofrenda,
    'muertos.petals': petals,
    'muertos.skeleton': skeleton,
    'muertos.candles': candles,
    'muertos.pot': pot,
    'muertos.picado': picado,
  },
  inside: [
    { name: 'ofrenda', w: 2, h: 2, items: [['muertos.ofrenda', -0.35, 0, 0, 1.15], ['muertos.petals', 0.55, 0, 0, 0.85], ['muertos.candles', 0.6, 0.65, 0, 0.8], ['muertos.pot', 0.65, -0.62, 0, 0.8]] },
    { name: 'mariachis', w: 2, h: 1, items: [['muertos.skeleton', -0.62, 0, -Math.PI / 2, 0.8, 0, 0], ['muertos.skeleton', 0, 0.05, -Math.PI / 2, 0.8, 0, 1], ['muertos.skeleton', 0.62, 0, -Math.PI / 2, 0.8, 0, 2]] },
    { name: 'alebrijes', w: 2, h: 2, items: [['toy:star', -0.35, -0.2, 0.4, 0.8], ['toy:cupcake', 0.4, 0.3, 2.6, 0.6], ['muertos.petals', 0.1, -0.05, 0.6, 0.8, 0, 2], ['muertos.pot', -0.65, 0.6, 0, 0.7], ['muertos.pot', 0.7, -0.6, 0, 0.6], ['muertos.candles', 0.72, 0.68, 0, 0.6]] },
    { name: 'petalWalk', w: 2, h: 1, items: [['muertos.petals', -0.15, 0, 0, 1.15], ['muertos.candles', 0.75, 0, 0, 0.75], ['toy:top', -0.82, 0.18, 0, 0.6], ['toy:dice', 0.4, -0.28, -Math.PI / 2, 0.5]] },
  ],
  outside: [
    { name: 'bigOfrenda', w: 2.6, h: 0, items: [['muertos.ofrenda', 0, 0, -Math.PI / 2, 3.2], ['muertos.petals', 0, 2.1, -Math.PI / 2, 2.2], ['muertos.candles', -1.05, 1.0, 0, 2.6], ['muertos.candles', 1.05, 1.0, 0, 2.6, 0, 2], ['muertos.pot', -2.0, 0.2, 0, 2.8], ['muertos.pot', 2.0, 0.2, 0, 2.8, 0, 1]] },
    { name: 'mariachiBand', w: 2.4, h: 0, items: [['muertos.picado', 0, -0.6, Math.PI / 2, 3], ...[0, 1, 2, 3].map((v) => ['muertos.skeleton', -1.2 + v * 0.8, 0.25 + (v % 2) * 0.2, -Math.PI / 2, 2.4, 0, v] as [string, number, number, number, number, number, number])] },
    { name: 'alebrije', w: 2, h: 0, items: [['toy:star', 0, 0, -0.5, 3.8], ['muertos.pot', 1.5, 0.6, 0, 2.6], ['muertos.candles', -1.3, 0.7, 0, 2.4, 0, 1], ['muertos.pot', 0.9, 1.5, 0, 2.2], ['muertos.petals', -0.2, 1.6, 0.3, 2]] },
  ],
  edge(b, glow, spot, ctx) {
    const at = new THREE.Matrix4().compose(new THREE.Vector3(spot.x, 0, spot.z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), spot.yaw), new THREE.Vector3(1, 1, 1));
    const k = new Kit();
    const g = new Kit();
    // Flags swing toward the camera's side (+z) so they never show edge-on.
    const tilt = -Math.sin(spot.yaw) < -0.1 ? -0.5 : 0.5;
    if (spot.corner) {
      // A painted post with papel picado running off along both edges, a pot of marigolds and
      // candles: one more lit on each day of the festival.
      k.cyl(0.02, 0.024, 0.36, MAGENTA, 0.02, 0.18, 0, 0, 0, 0, 8);
      pom(k, 0.05, ORANGE, 0.02, 0.38, 0);
      for (const s of [-1, 1]) bunting(k, 0.02, 0, 0.02 - 0.32, s * 0.32, 0.31, 2, 0.14, 0.12, spot.index + (s > 0 ? 2 : 0), tilt, 1);
      k.cyl(0.07, 0.055, 0.08, CLAY, 0.1, 0.04, 0, 0, 0, 0, 10);
      pom(k, 0.045, ORANGE, 0.1, 0.11, 0);
      for (const z of [-0.035, 0.035]) pom(k, 0.035, YELLOW, 0.1, 0.09, z);
      for (let i = 0; i < Math.min(3, ctx.day + 1); i++) candle(k, g, 0.2, 0, (i - (Math.min(3, ctx.day + 1) - 1) / 2) * 0.07, 0.018, 0.07 + (i % 2) * 0.03);
    } else {
      // A post with a marigold on top and a string of papel picado along the rim.
      k.cyl(0.014, 0.018, 0.34, spot.index % 2 ? TURQ : PINK, 0.03, 0.17, 0, 0, 0, 0, 6);
      pom(k, 0.04, spot.index % 2 ? YELLOW : ORANGE, 0.03, 0.36, 0, 5);
      bunting(k, 0.03, -0.45, 0.03, 0.45, 0.31, 4, 0.14, 0.12, spot.index * 4, tilt, 1);
    }
    put(b, k, at);
    put(glow, g, at);
  },
  station(b, f) {
    const k = new Kit();
    // Papel picado along the eaves and the awning, marigolds on the eaves, sugar skulls beside the clock.
    bunting(k, -f.width / 2, f.frontZ + 0.04, f.width / 2, f.frontZ + 0.04, f.roofY + 0.01, Math.max(4, Math.round(f.width / 0.12)), 0.1, 0.09, 0, -0.3);
    bunting(k, -f.width / 2, f.awningZ + 0.17, f.width / 2, f.awningZ + 0.17, f.awningY - 0.045, Math.max(4, Math.round(f.width / 0.14)), 0.11, 0.09, 3, -0.3);
    for (const s of [-1, 1]) pom(k, 0.05, ORANGE, s * (f.width / 2), f.roofY + 0.03, f.frontZ + 0.05);
    for (const x of [-0.42, 0.42]) {
      const skull = model(sugarSkull, WHITE);
      nest(k, M(x, 0.36, f.frontZ + 0.02, 0, -Math.PI / 2, 0, 4.2, 4.2, 4.2), (q) => q.parts.push(...skull.k.parts));
      for (const s of [-1, 1]) pom(k, 0.035, s < 0 ? ORANGE : YELLOW, x + s * 0.1, 0.32, f.frontZ + 0.04);
    }
    put(b, k, f.m(0, 0, 0));
  },
  engine(b) {
    // A bright sombrero on the cab roof.
    const hat = model(sombrero, TURQ);
    const k = new Kit();
    nest(k, M(-0.17, 0.43 + hat.lift * 3.8, 0, 0, 0, 0.12, 3.8, 3.8, 3.8), (q) => q.parts.push(...hat.k.parts));
    put(b, k, new THREE.Matrix4());
  },
  light: { background: '#3b1a3f', sunColor: '#ffcf9a', sunIntensity: 2.4, hemiSky: '#ffd8c4', hemiGround: '#6a3050', hemiIntensity: 1.2 },
  fx: { kind: 'petals', colors: [ORANGE, '#ffb21a', '#ffd23f', '#ff6a00'], count: 60 },
};

export default skin;
