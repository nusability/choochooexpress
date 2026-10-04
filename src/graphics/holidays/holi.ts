// Holi (three days around the colours day): the festival of colours. Big splashes of colour lie on
// the mat, brass plates and bowls are heaped with gulal powder, buckets of water balloons and
// pichkari squirters stand ready for a water fight, a dhol drum waits under a marigold arch with
// bunting, and a low table is laid with gujiya and glasses of thandai. Powder heaps line the rim,
// the station wears garlands and splashes, and the engine is splotched with paint.
import * as THREE from 'three';
import type { HolidaySkin, Item, PropContext } from '../holiday';
import { ring, row } from '../holiday';
import { INK, M, WHITE, shadeHex, type Kit } from '../toyModels';

const PINK = '#ff2f8f';
const YELLOW = '#ffd21f';
const GREEN = '#22c55e';
const BLUE = '#2f8cff';
const PURPLE = '#9b4dff';
const ORANGE = '#ff7a1a';
const RED = '#ff3b4f';
const POWDER = [PINK, YELLOW, GREEN, BLUE, PURPLE, ORANGE, RED];
const GOLD = '#f2b632';
const BRASS_DARK = '#c98a1e';
const MARIGOLD = ['#ff9a1f', '#ffc928'];
const LEAF = '#2f8a46';
const CREAM = '#f7ead2';
const WATER = '#7fd0ff';

/** Gives each item its own colour (variant) in turn. */
const inTurn = (items: Item[]): Item[] => items.map(([k, x, z, yaw, s], i) => [k, x, z, yaw, s, 0, i]);

const pick = <T>(a: readonly T[], i: number): T => a[((i % a.length) + a.length) % a.length] as T;
/** A repeatable 0..1 number from two integers (no Math.random). */
const hash = (i: number, seed: number): number => {
  const v = Math.sin((i + 1) * 12.9898 + seed * 78.233) * 43758.5453;
  return v - Math.floor(v);
};

/** A wobbly splash outline: a smooth blob with a few longer lobes. */
function blobShape(r: number, seed: number, n = 10): THREE.Shape {
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + seed;
    const k = (0.72 + 0.4 * hash(i, seed)) * (i % 3 === 1 ? 1.3 : 1);
    pts.push([Math.cos(a) * r * k, Math.sin(a) * r * k]);
  }
  const mid = (i: number): [number, number] => {
    const p = pts[i % n] as [number, number];
    const q = pts[(i + 1) % n] as [number, number];
    return [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  };
  const s = new THREE.Shape();
  const start = mid(n - 1);
  s.moveTo(start[0], start[1]);
  for (let i = 0; i < n; i++) {
    const p = pts[i] as [number, number];
    const e = mid(i);
    s.quadraticCurveTo(p[0], p[1], e[0], e[1]);
  }
  return s;
}

/** A flat splash lying on the ground (its bottom at y = 0). */
const flatBlob = (r: number, seed: number, depth: number): THREE.BufferGeometry =>
  new THREE.ExtrudeGeometry(blobShape(r, seed), { depth, bevelEnabled: false, curveSegments: 3 }).rotateX(-Math.PI / 2);

/** A soft cone of powder, `h` tall and `r` across at the bottom. */
const heapGeo = (r: number, h: number, seg = 10): THREE.BufferGeometry =>
  new THREE.LatheGeometry([new THREE.Vector2(0.0, 0), new THREE.Vector2(r, 0), new THREE.Vector2(r * 0.72, h * 0.32), new THREE.Vector2(r * 0.38, h * 0.75), new THREE.Vector2(r * 0.1, h * 0.98), new THREE.Vector2(0, h)], seg);

const halfMoon = (r: number): THREE.Shape => {
  const s = new THREE.Shape();
  s.absarc(0, 0, r, 0, Math.PI, false);
  s.closePath();
  return s;
};

// ------------------------------------------------------------------------------------- cargo

/** Builds a flat model and tips its top toward +z so it reads on the goal card and in wagons. */
const tilted = (build: (k: Kit, c: string) => void, angle: number) => (k: Kit, c: string): void => {
  const from = k.parts.length;
  build(k, c);
  const m = M(0, 0, 0, angle, 0, 0);
  for (const g of k.parts.slice(from)) g.applyMatrix4(m);
};

/** A brass bowl heaped with gulal powder, a few grains spilt on the rim. */
function powderBowl(k: Kit, c: string): void {
  k.add(new THREE.SphereGeometry(0.022, 12, 5, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), GOLD, M(0, -0.004, 0, 0, 0, 0, 1.2, 0.85, 1.2));
  k.tor(0.026, 0.0025, BRASS_DARK, 0, -0.004, 0, Math.PI / 2, 0, 0, 16);
  k.add(heapGeo(0.025, 0.03, 12), c, M(0, -0.006, 0));
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.6;
    k.sph(0.004, c, Math.cos(a) * 0.026, -0.002, Math.sin(a) * 0.026, 1.4, 0.4, 1.4, 5);
  }
}

/** A water balloon, tied off at the top, with a shine. */
function waterBalloon(k: Kit, c: string): void {
  k.sph(0.021, c, 0, -0.005, 0, 1, 1.12, 1, 12);
  k.cone(0.006, 0.008, c, 0, 0.019, 0, Math.PI, 0, 0, 8);
  k.sph(0.0035, shadeHex(c, -30), 0, 0.022, 0, 1, 1, 1, 6);
  k.cone(0.005, 0.006, c, 0, 0.026, 0, 0, 0, 0, 8);
  k.sph(0.005, WHITE, 0.008, 0.004, 0.015, 1, 1.5, 0.5, 6);
  k.sph(0.003, WATER, 0.012, -0.024, 0.008, 1, 1.4, 1, 5);
}

/** A pichkari: a squirter with brass bands, a nozzle, a plunger and a spurt of water. */
function pichkari(k: Kit, c: string): void {
  k.cyl(0.015, 0.015, 0.03, c, -0.004, 0, 0, 0, 0, Math.PI / 2, 12);
  for (const x of [-0.017, 0.008]) k.cyl(0.0162, 0.0162, 0.004, GOLD, x, 0, 0, 0, 0, Math.PI / 2, 12);
  k.sph(0.015, c, 0.011, 0, 0, 0.5, 1, 1, 10);
  k.cone(0.007, 0.016, GOLD, 0.023, 0, 0, 0, 0, -Math.PI / 2, 8);
  k.cyl(0.003, 0.003, 0.012, '#cfd3da', -0.024, 0, 0, 0, 0, Math.PI / 2, 6);
  k.cyl(0.0035, 0.0035, 0.03, GOLD, -0.031, 0, 0, Math.PI / 2, 0, 0, 6);
  k.sph(0.005, PINK, -0.004, 0.014, 0, 1.4, 0.5, 1.4, 6);
  for (const [x, y, r] of [[0.035, 0.002, 0.004], [0.042, 0.005, 0.003]] as const) k.sph(r, PINK, x, y, 0, 1, 1, 1, 5);
}

/** Two gujiyas (half-moon pastries with crimped edges) on a little plate. */
function gujiya(k: Kit, c: string): void {
  k.cyl(0.028, 0.024, 0.004, WHITE, 0, -0.02, 0, 0, 0, 0, 14);
  k.tor(0.026, 0.0016, PINK, 0, -0.018, 0, Math.PI / 2, 0, 0, 16);
  const one = (mat: THREE.Matrix4) => {
    k.shape(halfMoon(0.02), 0.007, c, mat, 0.0035);
    for (let j = 0; j < 7; j++) {
      const a = ((j + 0.5) / 7) * Math.PI;
      const v = new THREE.Vector3(Math.cos(a) * 0.022, Math.sin(a) * 0.022, 0).applyMatrix4(mat);
      k.sph(0.0028, shadeHex(c, -22), v.x, v.y, v.z, 1, 1, 1, 5);
    }
  };
  one(M(-0.004, -0.013, -0.006, -Math.PI / 2 + 0.2, 0.3, 0));
  one(M(0.004, -0.004, 0.008, -Math.PI / 2 + 0.95, -0.4, 0));
  for (const [x, y, z] of [[0.0, -0.006, 0.0], [0.01, 0.006, 0.01], [-0.01, -0.007, -0.002]] as const) k.sph(0.0018, WHITE, x, y, z, 1, 1, 1, 4);
}

/** A dhol: a barrel drum lying along z, two skin heads, brass rings and a strap. */
function dhol(k: Kit, c: string): void {
  const body = new THREE.LatheGeometry([new THREE.Vector2(0.016, -0.026), new THREE.Vector2(0.02, -0.014), new THREE.Vector2(0.0215, 0), new THREE.Vector2(0.02, 0.014), new THREE.Vector2(0.016, 0.026)], 14);
  k.add(body, c, M(0, -0.002, 0, Math.PI / 2, 0, 0));
  for (const s of [-1, 1]) {
    k.cyl(0.0165, 0.0165, 0.004, CREAM, 0, -0.002, s * 0.026, Math.PI / 2, 0, 0, 14);
    k.tor(0.0168, 0.0018, INK, 0, -0.002, s * 0.027, 0, 0, 0, 14);
    k.tor(0.0198, 0.0018, GOLD, 0, -0.002, s * 0.014, 0, 0, 0, 14);
  }
  k.tor(0.0218, 0.0016, YELLOW, 0, -0.002, 0, 0, 0, 0, 14);
  k.tor(0.024, 0.0015, INK, 0, 0.004, 0, Math.PI / 2, 0, 0, 12, Math.PI);
  k.cyl(0.0016, 0.0016, 0.04, '#8a5a2e', 0.006, 0.024, 0.006, 0.3, 0, 1.2, 5);
}

/** A glass of thandai: cool milk with pistachio, saffron and rose on top, and a straw. */
function thandai(k: Kit, c: string): void {
  k.cyl(0.016, 0.0125, 0.04, c, 0, -0.004, 0, 0, 0, 0, 14);
  k.cyl(0.013, 0.013, 0.004, '#bfe6ff', 0, -0.026, 0, 0, 0, 0, 12);
  k.tor(0.016, 0.0016, '#cfeeff', 0, 0.017, 0, Math.PI / 2, 0, 0, 16);
  k.tor(0.0145, 0.0012, '#ffb74a', 0, 0.0, 0, Math.PI / 2, 0, 0, 16);
  for (const [x, z, col] of [[0.006, 0.004, '#8fd16a'], [-0.006, 0.006, '#ff9a1f'], [0.001, -0.007, '#ff6fa5'], [-0.008, -0.003, '#8fd16a']] as const) k.sph(0.0025, col, x, 0.016, z, 1, 0.5, 1, 5);
  k.cyl(0.0018, 0.0018, 0.03, PINK, 0.006, 0.026, -0.003, 0, 0, -0.35, 6);
}

/** A marigold head: rings of ruffled petals, darker at the heart, two leaves. */
function marigold(k: Kit, c: string): void {
  for (const s of [-1, 1]) k.sph(0.01, LEAF, s * 0.02, -0.012, s * 0.006, 1.6, 0.3, 0.8, 6);
  k.sph(0.02, c, 0, -0.006, 0, 1, 0.6, 1, 10);
  for (let r = 0; r < 2; r++) {
    const n = r ? 7 : 11;
    const rad = r ? 0.011 : 0.019;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + r * 0.3;
      k.sph(0.0075, r ? shadeHex(c, -14) : c, Math.cos(a) * rad, -0.003 + r * 0.006, Math.sin(a) * rad, 1, 0.75, 1, 6);
    }
  }
  k.sph(0.006, ORANGE, 0, 0.007, 0, 1, 0.7, 1, 6);
}

/** A splash of colour with droplets flying off it. */
function splashBlob(k: Kit, c: string): void {
  k.shape(blobShape(0.019, 3), 0.006, c, M(0, 0.002, 0));
  k.shape(blobShape(0.008, 7, 8), 0.007, shadeHex(c, 28), M(-0.004, 0.006, 0.001));
  for (let i = 0; i < 5; i++) {
    const a = i * 1.3 + 0.4;
    k.sph(0.0035 - (i % 2) * 0.001, c, Math.cos(a) * 0.03, 0.002 + Math.sin(a) * 0.03, 0, 1, 1, 0.6, 6);
  }
}

/** A bunch of three balloons tied with a ribbon. */
function balloonBunch(k: Kit, c: string): void {
  for (const [x, y, z, r, col] of [[-0.011, 0.008, -0.003, 0.012, c], [0.011, 0.01, 0.002, 0.012, shadeHex(c, 12)], [0, 0.0, 0.009, 0.011, YELLOW]] as const) {
    k.sph(r, col, x, y, z, 1, 1.15, 1, 10);
    k.sph(0.003, WHITE, x + 0.004, y + 0.005, z + r * 0.8, 1, 1.4, 0.5, 5);
    k.cyl(0.0008, 0.0008, 0.026, '#7a7e88', x * 0.5, y - 0.024, z * 0.5, z * 0.3, 0, -x * 18, 4);
  }
  for (const s of [-1, 1]) k.sph(0.0045, PINK, s * 0.004, -0.024, 0, 1.4, 0.7, 0.6, 6);
}

/** A ring of marigolds (a garland), standing up, with a tassel of flowers. */
function garlandRing(k: Kit, c: string): void {
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    k.sph(0.0065, i % 2 ? c : shadeHex(c, 22), Math.cos(a) * 0.018, 0.004 + Math.sin(a) * 0.018, 0, 1, 1, 0.85, 7);
  }
  for (const [y, col] of [[-0.019, c], [-0.027, YELLOW]] as const) k.sph(0.0055, col, 0, y, 0.002, 1, 1, 0.85, 6);
  for (const s of [-1, 1]) k.sph(0.005, LEAF, s * 0.006, -0.015, 0.003, 1.4, 0.5, 0.4, 5);
}

/** A tin bucket of water balloons. */
function balloonBucket(k: Kit, c: string): void {
  k.cyl(0.021, 0.016, 0.03, c, 0, -0.01, 0, 0, 0, 0, 14);
  k.tor(0.021, 0.0018, shadeHex(c, -25), 0, 0.005, 0, Math.PI / 2, 0, 0, 16);
  k.tor(0.021, 0.0012, shadeHex(c, -25), 0, 0.012, 0, 0, 0, 0, 12, Math.PI);
  for (const [x, z, col] of [[-0.008, -0.006, PINK], [0.008, -0.004, BLUE], [0, 0.009, YELLOW], [0.009, 0.009, GREEN]] as const) k.sph(0.0085, col, x, 0.009, z, 1, 1.1, 1, 8);
}

// ------------------------------------------------------------------------------------- props

/** A big splash of powder on the mat, about 0.9 across at scale 1, another colour on top. */
function splashProp({ b, m, variant }: PropContext): void {
  const c = pick(POWDER, variant);
  b.add(flatBlob(0.4, variant, 0.008), c, m(0, 0.003, 0));
  b.add(flatBlob(0.2, variant + 5, 0.008), pick(POWDER, variant + 3), m(0.1, 0.007, -0.06));
  b.add(flatBlob(0.1, variant + 9, 0.008), pick(POWDER, variant + 5), m(-0.14, 0.008, 0.12));
  // Streaks flung outward, each ending in a drop, and a few loose drops.
  for (let i = 0; i < 6; i++) {
    const a = i * 1.05 + variant * 0.7 + hash(i, variant) * 0.5;
    const r = 0.42 + 0.12 * hash(i + 7, variant);
    b.add(new THREE.SphereGeometry(0.05, 8, 3).scale(2.4, 0.12, 0.45), c, m(Math.cos(a) * (r - 0.06), 0.004, Math.sin(a) * (r - 0.06), -a));
    b.add(new THREE.CylinderGeometry(0.04, 0.04, 0.008, 8), c, m(Math.cos(a) * (r + 0.08), 0.007, Math.sin(a) * (r + 0.08)));
  }
  for (let i = 0; i < 5; i++) {
    const a = i * 2.3 + 0.5 + variant;
    const r = 0.62 + 0.1 * (i % 2);
    b.add(new THREE.CylinderGeometry(0.025 - 0.006 * (i % 2), 0.025 - 0.006 * (i % 2), 0.008, 7), c, m(Math.cos(a) * r, 0.007, Math.sin(a) * r));
  }
}

/** A soft heap of powder on the ground, spilt round its foot. */
function heapProp({ b, m, variant }: PropContext): void {
  const c = pick(POWDER, variant);
  b.add(new THREE.CylinderGeometry(0.24, 0.24, 0.008, 12), c, m(0, 0.004, 0));
  b.add(heapGeo(0.19, 0.19), c, m(0, 0.004, 0));
}

/** A brass bowl heaped with one colour. */
function bowlProp({ b, m, variant }: PropContext): void {
  const c = pick(POWDER, variant);
  b.add(new THREE.SphereGeometry(0.16, 14, 5, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).scale(1.15, 0.7, 1.15), GOLD, m(0, 0.115, 0));
  b.add(new THREE.TorusGeometry(0.185, 0.014, 4, 18).rotateX(Math.PI / 2), BRASS_DARK, m(0, 0.115, 0));
  b.add(heapGeo(0.18, 0.16), c, m(0, 0.09, 0));
  b.add(flatBlob(0.12, variant + 2, 0.006), c, m(0.2, 0.003, 0.08));
}

/** A brass thali with five heaps of colour, ready to share. */
function thaliProp({ b, m, variant }: PropContext): void {
  b.add(new THREE.CylinderGeometry(0.34, 0.3, 0.03, 18), GOLD, m(0, 0.015, 0));
  b.add(new THREE.TorusGeometry(0.34, 0.016, 4, 20).rotateX(Math.PI / 2), BRASS_DARK, m(0, 0.03, 0));
  b.add(heapGeo(0.11, 0.11), pick(POWDER, variant), m(0, 0.03, 0));
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3;
    b.add(heapGeo(0.075, 0.075, 8), pick(POWDER, variant + i + 1), m(Math.cos(a) * 0.21, 0.03, Math.sin(a) * 0.21));
  }
}

/** A bucket of water balloons. */
function bucketProp({ b, m, variant }: PropContext): void {
  const c = pick([BLUE, RED, GREEN, PURPLE], variant);
  b.add(new THREE.CylinderGeometry(0.16, 0.12, 0.22, 14), c, m(0, 0.11, 0));
  b.add(new THREE.TorusGeometry(0.16, 0.012, 4, 16).rotateX(Math.PI / 2), shadeHex(c, -30), m(0, 0.22, 0));
  b.add(new THREE.TorusGeometry(0.16, 0.008, 4, 12, Math.PI), '#9aa3b5', m(0, 0.22, 0, 0.4));
  b.add(new THREE.CylinderGeometry(0.15, 0.15, 0.01, 12), WATER, m(0, 0.2, 0));
  for (let i = 0; i < 6; i++) {
    const a = (i / 5) * Math.PI * 2;
    const r = i === 5 ? 0 : 0.085;
    const col = pick([PINK, YELLOW, BLUE, GREEN, PURPLE, ORANGE], i + variant);
    b.add(new THREE.SphereGeometry(0.06, 10, 7).scale(1, 1.15, 1), col, m(Math.cos(a) * r, 0.24 + (i === 5 ? 0.06 : 0), Math.sin(a) * r));
  }
  // One spilled beside the bucket.
  b.add(new THREE.SphereGeometry(0.06, 10, 7).scale(1.1, 0.95, 1), PINK, m(0.24, 0.055, 0.1));
}

/** A big pichkari raised and squirting an arc of coloured water onto a splash. */
function pichkariProp({ b, m, mr, variant }: PropContext): void {
  const c = pick([ORANGE, GREEN, BLUE, PINK], variant);
  const spray = pick(POWDER, variant + 4);
  const tilt = 0.35;
  const along = (d: number, y0: number) => [d * Math.cos(tilt), y0 + d * Math.sin(tilt)] as const;
  const [bx, by] = along(0, 0.1);
  b.add(new THREE.CylinderGeometry(0.06, 0.06, 0.3, 12), c, mr(bx, by, 0, 0, 0, -Math.PI / 2 + tilt));
  for (const d of [-0.12, 0.1]) {
    const [x, y] = along(d, 0.1);
    b.add(new THREE.CylinderGeometry(0.066, 0.066, 0.025, 12), GOLD, mr(x, y, 0, 0, 0, -Math.PI / 2 + tilt));
  }
  const [nx, ny] = along(0.2, 0.1);
  b.add(new THREE.ConeGeometry(0.03, 0.1, 8), GOLD, mr(nx, ny, 0, 0, 0, -Math.PI / 2 + tilt));
  const [rx, ry] = along(-0.2, 0.1);
  b.add(new THREE.CylinderGeometry(0.014, 0.014, 0.12, 6), '#cfd3da', mr(rx, ry, 0, 0, 0, -Math.PI / 2 + tilt));
  const [hx, hy] = along(-0.27, 0.1);
  b.add(new THREE.CylinderGeometry(0.018, 0.018, 0.16, 6), GOLD, mr(hx, hy, 0, Math.PI / 2, 0, 0));
  // A little stand of two crossed sticks under it.
  for (const s of [-1, 1]) b.add(new THREE.CylinderGeometry(0.012, 0.012, 0.14, 5), '#8a5a2e', mr(0.02, 0.05, s * 0.03, s * 0.5, 0, 0));
  // The spurt: an arc of drops, landing in a splash.
  const tipX = nx + 0.05;
  for (let i = 1; i <= 7; i++) {
    const t = i / 7;
    const x = tipX + t * 0.55;
    const y = ny + 0.03 + t * 0.12 - t * t * (ny + 0.15);
    b.add(new THREE.SphereGeometry(0.03 - t * 0.008, 6, 5), spray, m(x, Math.max(0.02, y), 0));
  }
  b.add(flatBlob(0.16, variant + 1, 0.008), spray, m(tipX + 0.6, 0.004, 0));
}

/** A dhol on a little wooden stand, with its sticks. */
function dholProp({ b, m, mr, variant }: PropContext): void {
  const c = pick([RED, PURPLE, ORANGE, BLUE], variant);
  const body = new THREE.LatheGeometry([new THREE.Vector2(0.12, -0.2), new THREE.Vector2(0.15, -0.1), new THREE.Vector2(0.16, 0), new THREE.Vector2(0.15, 0.1), new THREE.Vector2(0.12, 0.2)], 16).rotateX(Math.PI / 2);
  b.add(body, c, m(0, 0.24, 0));
  for (const s of [-1, 1]) {
    b.add(new THREE.CylinderGeometry(0.125, 0.125, 0.02, 16).rotateX(Math.PI / 2), CREAM, m(0, 0.24, s * 0.2));
    b.add(new THREE.TorusGeometry(0.127, 0.012, 5, 16), INK, m(0, 0.24, s * 0.205));
    b.add(new THREE.TorusGeometry(0.155, 0.012, 5, 16), GOLD, m(0, 0.24, s * 0.1));
    // Stand legs.
    b.add(new THREE.BoxGeometry(0.3, 0.03, 0.03), '#8a5a2e', mr(0, 0.07, s * 0.12, 0, 0, 0));
    for (const x of [-0.12, 0.12]) b.add(new THREE.BoxGeometry(0.03, 0.14, 0.03), '#8a5a2e', m(x, 0.07, s * 0.12));
  }
  b.add(new THREE.TorusGeometry(0.162, 0.01, 5, 16), YELLOW, m(0, 0.24, 0));
  b.add(new THREE.TorusGeometry(0.2, 0.012, 4, 14, Math.PI), PINK, m(0, 0.27, 0, Math.PI / 2));
  for (const s of [-1, 1]) b.add(new THREE.CylinderGeometry(0.01, 0.014, 0.3, 5), '#8a5a2e', mr(0.28, 0.012, s * 0.07, Math.PI / 2, s * 0.3, 0));
}

/** A low table laid with gujiya, thandai and a brass jug; its cloth already has colour on it. */
function tableProp({ b, m }: PropContext): void {
  b.add(new THREE.BoxGeometry(0.8, 0.04, 0.46), WHITE, m(0, 0.22, 0));
  for (const [x, z, col, sd] of [[-0.3, 0.12, PINK, 2], [0.32, -0.14, GREEN, 5], [0.05, 0.18, YELLOW, 8]] as const) b.add(flatBlob(0.07, sd, 0.004), col, m(x, 0.24, z));
  for (const [x, z] of [[-0.35, -0.19], [0.35, -0.19], [-0.35, 0.19], [0.35, 0.19]] as const) b.add(new THREE.CylinderGeometry(0.025, 0.02, 0.2, 6), '#8a4a26', m(x, 0.1, z));
  // A plate of gujiya.
  b.add(new THREE.CylinderGeometry(0.13, 0.11, 0.015, 14), GOLD, m(-0.18, 0.248, -0.02));
  const guj = new THREE.ExtrudeGeometry(halfMoon(0.06), { depth: 0.024, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 1, curveSegments: 5 }).rotateX(-Math.PI / 2);
  for (const [x, z, yaw] of [[-0.22, -0.06, 0.3], [-0.13, 0.03, 2.6], [-0.2, 0.05, -1.2]] as const) b.add(guj, '#d79a52', m(x, 0.262, z, yaw));
  // Glasses of thandai and a jug.
  for (const [x, z] of [[0.1, -0.08], [0.22, 0.06], [0.3, -0.06]] as const) {
    b.add(new THREE.CylinderGeometry(0.04, 0.032, 0.11, 10), '#fbf1dc', m(x, 0.295, z));
    b.add(new THREE.TorusGeometry(0.04, 0.005, 4, 12).rotateX(Math.PI / 2), '#cfeeff', m(x, 0.35, z));
    b.add(new THREE.SphereGeometry(0.008, 4, 3), '#8fd16a', m(x + 0.01, 0.35, z));
  }
  b.add(new THREE.LatheGeometry([new THREE.Vector2(0.05, 0), new THREE.Vector2(0.075, 0.05), new THREE.Vector2(0.06, 0.12), new THREE.Vector2(0.04, 0.16), new THREE.Vector2(0.05, 0.19)], 12), GOLD, m(0.16, 0.24, 0.13));
}

/** A garland arch: two bamboo poles, a marigold swag and a string of bunting in powder colours. */
function archProp({ b, m }: PropContext): void {
  const bamboo = '#c9a35a';
  for (const s of [-1, 1]) {
    b.add(new THREE.CylinderGeometry(0.025, 0.03, 1.0, 6), bamboo, m(s * 0.55, 0.5, 0));
    b.add(new THREE.SphereGeometry(0.05, 8, 5), pick(MARIGOLD, 0), m(s * 0.55, 1.0, 0));
  }
  const n = 16;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    b.add(new THREE.SphereGeometry(0.045, 6, 4), pick(MARIGOLD, i), m(-0.55 + 1.1 * t, 0.96 - 0.22 * 4 * t * (1 - t), 0.02));
  }
  // Three hanging strands.
  for (const x of [-0.28, 0, 0.28]) {
    const t = (x + 0.55) / 1.1;
    const y0 = 0.96 - 0.22 * 4 * t * (1 - t);
    for (let j = 1; j <= 3; j++) b.add(new THREE.SphereGeometry(0.03, 6, 4), pick(MARIGOLD, j), m(x, y0 - j * 0.055, 0.02));
    b.add(new THREE.SphereGeometry(0.03, 6, 4).scale(0.5, 1.3, 0.3), LEAF, m(x, y0 - 0.22, 0.02));
  }
  // Bunting just below the poles' tops.
  const flag = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.045, 0, 0), new THREE.Vector3(0.045, 0, 0), new THREE.Vector3(0, -0.1, 0)]);
  flag.computeVertexNormals();
  const back = flag.clone().rotateY(Math.PI);
  for (let i = 0; i < 10; i++) {
    const t = (i + 0.5) / 10;
    const y = 0.86 - 0.12 * 4 * t * (1 - t);
    const col = pick(POWDER, i);
    b.add(flag, col, m(-0.55 + 1.1 * t, y, 0.05));
    b.add(back, col, m(-0.55 + 1.1 * t, y, 0.05));
  }
}

// ------------------------------------------------------------------------------------- the skin

const skin: HolidaySkin = {
  id: 'holi',
  name: 'Holi',
  greeting: 'Happy Holi!',
  cargo: {
    pink: powderBowl,
    blue: waterBalloon,
    teal: pichkari,
    brown: gujiya,
    red: dhol,
    white: thandai,
    yellow: marigold,
    purple: tilted(splashBlob, 0),
    green: balloonBunch,
    orange: garlandRing,
    gray: balloonBucket,
  },
  props: {
    'holi.splash': splashProp,
    'holi.heap': heapProp,
    'holi.bowl': bowlProp,
    'holi.thali': thaliProp,
    'holi.bucket': bucketProp,
    'holi.pichkari': pichkariProp,
    'holi.dhol': dholProp,
    'holi.table': tableProp,
    'holi.arch': archProp,
  },
  inside: [
    {
      name: 'colourPlay', w: 2, h: 2, items: [
        ['holi.splash', 0, 0, 0, 1.5, 0, 0], ['holi.splash', -0.5, 0.5, 1, 0.9, 0, 3], ['holi.splash', 0.55, -0.5, 2, 0.85, 0, 2],
        ['holi.thali', 0.05, 0, 0, 1.15, 0, 1], ['holi.bowl', 0.6, 0.55, 0, 1.05, 0, 4], ['holi.bowl', -0.6, -0.5, 0, 1.05, 0, 2],
      ],
    },
    { name: 'waterFight', w: 2, h: 1, items: [['holi.bucket', -0.7, 0.05, 0, 0.9, 0, 0], ['holi.pichkari', -0.4, -0.15, 0, 0.9, 0, 2], ['holi.bucket', 0.72, -0.05, 0, 0.9, 0, 1], ['holi.splash', 0.3, 0.2, 0, 0.6, 0, 4]] },
    { name: 'feast', w: 2, h: 1, items: [['holi.table', 0, 0, 0, 1.05], ['pillow', -0.72, 0, 0, 0.32], ['pillow', 0.72, 0, 0, 0.32], ['holi.splash', 0.55, 0.32, 0, 0.35, 0, 0]] },
    {
      name: 'dhol', w: 2, h: 2, items: [
        ['holi.arch', 0, -0.45, 0, 1.2], ['holi.dhol', -0.2, 0.15, 0.4, 0.95, 0, 0], ['holi.splash', 0.35, 0.35, 0, 0.8, 0, 1],
        ...inTurn(row(4, 0.42, 'holi.heap', 0.8, 0, 0.7)),
      ],
    },
  ],
  outside: [
    { name: 'colourField', w: 2.4, h: 0, items: [['holi.splash', 0, 0, 0, 3.6, 0, 0], ['holi.splash', 1.3, 1.0, 1, 1.8, 0, 3], ['holi.thali', 0, 0, 0, 2.6, 0, 2], ...inTurn(ring(6, 1.95, 'holi.heap', 2.2, 0.3))] },
    { name: 'party', w: 2.4, h: 0, items: [['holi.arch', 0, -0.9, 0, 3], ['holi.dhol', -0.6, 0.4, 0.5, 2.6, 0, 0], ['holi.bucket', 1.2, 0.5, 0, 2.4, 0, 1], ['holi.pichkari', 0.5, 1.3, Math.PI, 2.2, 0, 3], ['holi.splash', -1.5, 1.1, 0, 1.6, 0, 1]] },
    { name: 'feast', w: 2.2, h: 0, items: [['holi.table', 0, 0, 0, 3], ['pillow', -1.6, 0.2, 0, 1], ['pillow', 1.6, 0.2, 0, 1], ['holi.bowl', 1.0, 1.3, 0, 2.2, 0, 4], ['holi.bowl', -1.0, 1.35, 0, 2.2, 0, 2], ['holi.splash', 0, 1.4, 0, 1.4, 0, 3]] },
  ],
  edge(b, _glow, spot, ctx) {
    // The rim's top sits above the mat: everything stands on it, a size up.
    const LIFT = 0.05;
    const K = 1.4;
    const at = (x: number, y: number, z: number, sx = 1, sy = sx, sz = sx) => {
      const c = Math.cos(spot.yaw);
      const s = Math.sin(spot.yaw);
      return new THREE.Matrix4().compose(new THREE.Vector3(spot.x + x * c + z * s, LIFT + y * K, spot.z - x * s + z * c), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), spot.yaw), new THREE.Vector3(sx * K, sy * K, sz * K));
    };
    const heap = (z: number, col: string, size = 1) => {
      b.add(new THREE.CylinderGeometry(0.075, 0.075, 0.004, 10), col, at(0, 0.002, z, size));
      b.add(heapGeo(0.06, 0.065, 9), col, at(0, 0.002, z, size));
    };
    if (spot.corner) {
      // A brass bowl of colour ringed with marigolds.
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        b.add(new THREE.SphereGeometry(0.035, 7, 5).scale(1, 0.75, 1), pick(MARIGOLD, i), at(Math.cos(a) * 0.12, 0.015, Math.sin(a) * 0.12));
      }
      b.add(new THREE.SphereGeometry(0.07, 10, 4, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).scale(1.1, 0.7, 1.1), GOLD, at(0, 0.05, 0));
      b.add(heapGeo(0.075, 0.07, 9), pick(POWDER, spot.index + ctx.day), at(0, 0.035, 0));
      return;
    }
    // Little heaps of powder in turn, a splash between them.
    const i0 = spot.index * 3 + ctx.day;
    heap(-0.22, pick(POWDER, i0));
    heap(0.0, pick(POWDER, i0 + 1), 0.8);
    heap(0.22, pick(POWDER, i0 + 2));
    b.add(flatBlob(0.06, spot.index, 0.004), pick(POWDER, i0 + 4), at(0.02, 0.0, 0.11));
  },
  station(b, f) {
    // Colour splashed over the roof and the awning, marigold swags along the awning's edge.
    const splat = (x: number, y: number, z: number, rx: number, r: number, seed: number, col: string) => {
      b.add(new THREE.ExtrudeGeometry(blobShape(r, seed), { depth: 0.006, bevelEnabled: false, curveSegments: 3 }), col, f.m(x, y, z, rx));
      for (let i = 0; i < 3; i++) {
        const a = seed + i * 2.1;
        b.add(new THREE.CylinderGeometry(r * 0.14, r * 0.14, 0.006, 8).rotateX(Math.PI / 2), col, f.m(x, y, z, rx).multiply(new THREE.Matrix4().makeTranslation(Math.cos(a) * r * 1.6, Math.sin(a) * r * 1.6, 0)));
      }
    };
    const w = f.width / 2;
    // The roof's front slope rises from the eaves (frontZ) to the ridge (z = 0, 0.28 higher).
    const slope = Math.atan2(f.frontZ, 0.28);
    const onRoof = (x: number, t: number, r: number, seed: number, col: string) =>
      splat(x, f.roofY + 0.28 * t + 0.025, f.frontZ * (1 - t) + 0.02, -slope, r, seed, col);
    onRoof(-w * 0.62, 0.45, 0.12, 1, PINK);
    onRoof(-w * 0.2, 0.3, 0.1, 4, YELLOW);
    onRoof(w * 0.35, 0.5, 0.13, 7, GREEN);
    onRoof(w * 0.8, 0.35, 0.1, 2, PURPLE);
    const tilt = -0.25;
    const AW = 0.5 + 0.016;
    for (const [x, seed, col] of [[-w * 0.85, 3, BLUE], [-w * 0.4, 6, ORANGE], [w * 0.1, 8, PINK], [w * 0.62, 5, YELLOW]] as const) {
      splat(x, AW, f.awningZ, -Math.PI / 2 + tilt, 0.08, seed, col);
    }
    // Swags hang from the awning's front edge, with a mango-leaf pair at each hook.
    const edgeY = 0.5 + 0.15 * Math.sin(-tilt) - 0.01;
    const edgeZ = f.awningZ + 0.15 * Math.cos(tilt) + 0.02;
    const hooks: number[] = [];
    for (let x = -w; x <= w + 1e-6; x += f.width / 5) hooks.push(x);
    for (let i = 0; i + 1 < hooks.length; i++) {
      const x0 = hooks[i] as number;
      const x1 = hooks[i + 1] as number;
      const n = Math.max(2, Math.round((x1 - x0) / 0.055));
      for (let j = 0; j <= n; j++) {
        const t = j / n;
        b.add(new THREE.SphereGeometry(0.03, 6, 4), pick(MARIGOLD, j), f.m(x0 + (x1 - x0) * t, edgeY - 0.09 * 4 * t * (1 - t), edgeZ));
      }
    }
    for (const x of hooks) {
      for (const s of [-1, 1]) b.add(new THREE.SphereGeometry(0.035, 6, 4).scale(0.45, 1.3, 0.2), LEAF, f.m(x + s * 0.025, edgeY - 0.05, edgeZ + 0.01, 0, 0, s * 0.4));
      b.add(new THREE.SphereGeometry(0.03, 6, 4), pick(POWDER, Math.round(x * 7)), f.m(x, edgeY - 0.11, edgeZ));
    }
  },
  engine(b) {
    // Paint splotches stuck on the boiler and the cab, as if it drove through the party.
    const splotch = (x: number, theta: number, col: string, r: number) => {
      const R = 0.093;
      const pos = new THREE.Vector3(x, 0.215 + Math.sin(theta) * R, Math.cos(theta) * R);
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2 - theta, 0, 0));
      b.add(new THREE.SphereGeometry(r, 8, 5).scale(1, 0.25, 1), col, new THREE.Matrix4().compose(pos, q, new THREE.Vector3(1, 1, 1)));
    };
    const spots: [number, number, string, number][] = [
      [0.12, 0.5, PINK, 0.03], [-0.0, 1.1, YELLOW, 0.026], [0.16, 1.6, GREEN, 0.024], [0.0, 2.3, PURPLE, 0.028], [0.13, 2.7, ORANGE, 0.024],
      [0.02, -0.2, BLUE, 0.022], [0.15, 0.95, BLUE, 0.018], [-0.03, 2.8, PINK, 0.02],
    ];
    for (const [x, th, col, r] of spots) splotch(x, th, col, r);
    for (const [x, y, z, col, r] of [[-0.22, 0.2, 0.141, GREEN, 0.03], [-0.15, 0.17, -0.141, PINK, 0.032], [-0.24, 0.29, -0.141, YELLOW, 0.022], [-0.13, 0.31, 0.141, PURPLE, 0.02]] as const) {
      b.add(new THREE.SphereGeometry(r, 8, 5).scale(1, 1, 0.25), col, new THREE.Matrix4().makeTranslation(x, y, z));
    }
  },
  light: { sunColor: '#fff2dc', hemiSky: '#ffe8f4' },
  fx: { kind: 'confetti', colors: POWDER, count: 80 },
};

export default skin;
