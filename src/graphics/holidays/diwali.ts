// Diwali (five days around the main day): the festival of lights. Rows of clay diyas glow round
// the diorama, big rangoli patterns lie on the mat with lamps round them, marigold garlands hang on
// the station and the engine, a star lantern sways on its pole, a family table is laid with sweets
// and little anar fountains sparkle. Diyas, sweets, marigolds, lanterns and gifts ride the wagons.
import * as THREE from 'three';
import type { HolidaySkin, PropContext } from '../holiday';
import { ring, row } from '../holiday';
import { M, WHITE, polygon, shadeHex, starShape, type Kit } from '../toyModels';

const CLAY = '#c4622d';
const CLAY_DARK = '#8f3f1c';
const FLAME = '#ffd23f';
const FLAME_HOT = '#ff8a1e';
const GOLD = '#f2c23a';
const SILVER = '#dfe4ec';
const MARIGOLD = ['#ff9a1f', '#ffc928'];
const LEAF = '#2f8a46';
const RANGOLI = ['#ff3d8b', '#ff9a1f', '#ffd23f', '#22b5a6', '#3f7fe0', '#9b4dd6', '#e8263c'];
const SPARK = ['#fff3a0', '#ffd23f', '#ffb347'];

const pick = <T>(a: readonly T[], i: number): T => a[((i % a.length) + a.length) % a.length] as T;

// ------------------------------------------------------------------------------------- cargo

/** Builds a flat model and tips its top toward +z so it reads on the goal card and in wagons. */
const tilted = (build: (k: Kit, c: string) => void, angle: number) => (k: Kit, c: string): void => {
  const from = k.parts.length;
  build(k, c);
  const m = M(0, 0, 0, angle, 0, 0);
  for (const g of k.parts.slice(from)) g.applyMatrix4(m);
};

/** A clay lamp: a pinched bowl with a spout, oil and a little flame. */
function diya(k: Kit, c: string): void {
  k.sph(0.022, c, -0.002, -0.01, 0, 1.1, 0.5, 1, 12);
  k.cone(0.009, 0.02, c, 0.021, -0.006, 0, 0, 0, -Math.PI / 2, 8);
  k.cyl(0.019, 0.019, 0.002, '#f0b23a', -0.002, -0.003, 0, 0, 0, 0, 12);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.5;
    k.sph(0.0022, WHITE, -0.002 + Math.cos(a) * 0.024, -0.008, Math.sin(a) * 0.022, 1, 1, 1, 5);
  }
  k.sph(0.0065, FLAME_HOT, 0.026, 0.006, 0, 1, 1.5, 1, 8);
  k.sph(0.0055, FLAME, 0.026, 0.014, 0, 0.8, 1.9, 0.8, 8);
}

/** A pyramid of round ladoos on a small gold plate. */
function ladoo(k: Kit, c: string): void {
  k.cyl(0.027, 0.022, 0.004, GOLD, 0, -0.021, 0, 0, 0, 0, 14);
  for (const [x, z] of [[-0.0105, -0.0105], [0.0105, -0.0105], [-0.0105, 0.0105], [0.0105, 0.0105]] as const) k.sph(0.0115, c, x, -0.008, z, 1, 1, 1, 8);
  k.sph(0.0115, shadeHex(c, 8), 0, 0.009, 0, 1, 1, 1, 8);
  for (const [x, y, z] of [[0.004, 0.019, 0.004], [-0.012, -0.0, 0.014], [0.016, -0.002, -0.008]] as const) k.sph(0.0018, WHITE, x, y, z, 1, 1, 1, 4);
}

/** Three diamond sweets with silver leaf on a banana leaf. */
function barfi(k: Kit, c: string): void {
  const diamond = polygon([[0.018, 0], [0, 0.011], [-0.018, 0], [0, -0.011]]);
  k.sph(0.028, LEAF, 0, -0.017, 0, 1.1, 0.08, 0.75, 10);
  for (const [x, y, z, ry] of [[-0.009, -0.01, -0.007, 0], [0.01, -0.01, 0.006, 0], [0, 0.0, 0, 0.6]] as const) {
    k.shape(diamond, 0.009, c, M(x, y, z, -Math.PI / 2, ry, 0));
    k.shape(diamond.clone(), 0.0012, SILVER, M(x, y + 0.005, z, -Math.PI / 2, ry, 0, 0.85, 0.85, 1));
  }
  k.sph(0.0022, '#7cc35a', 0, 0.0065, 0.002, 1, 0.5, 1, 5);
}

/** A box of sparklers, three of them fizzing. */
function sparkler(k: Kit, c: string): void {
  k.box(0.03, 0.018, 0.018, c, 0, -0.018, 0);
  k.shape(starShape(0.006, 0.0026), 0.001, GOLD, M(0, -0.018, 0.0095));
  for (const [x, rz] of [[-0.008, 0.35], [0, 0], [0.008, -0.35]] as const) {
    const tx = x - Math.sin(rz) * 0.034;
    k.cyl(0.0014, 0.0014, 0.04, '#5b5f68', x - Math.sin(rz) * 0.012, 0.004, 0, 0, 0, rz, 5);
    k.shape(starShape(0.009, 0.003, 6), 0.002, FLAME, M(tx, 0.026, 0, 0, 0, rz));
    k.sph(0.003, WHITE, tx, 0.026, 0.001, 1, 1, 1, 5);
  }
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
      k.sph(0.0075, r ? shadeHex(c, -18) : c, Math.cos(a) * rad, -0.003 + r * 0.006, Math.sin(a) * rad, 1, 0.75, 1, 6);
    }
  }
  k.sph(0.006, shadeHex(c, -40), 0, 0.007, 0, 1, 0.7, 1, 6);
}

/** An akash kandil: a star lantern with tassels. */
function starLantern(k: Kit, c: string): void {
  k.shape(starShape(0.024, 0.012), 0.014, c, M(0, 0.002, 0), 0.002);
  k.sph(0.008, FLAME, 0, 0.002, 0.008, 1, 1, 0.4, 8);
  k.tor(0.004, 0.0012, GOLD, 0, 0.03, 0, 0, 0, 0, 8);
  for (const x of [-0.008, 0, 0.008]) k.cyl(0.0018, 0.0026, 0.016, x ? GOLD : '#ff3d8b', x, -0.028 + Math.abs(x) * 0.4, 0.002, 0, 0, 0, 6);
}

/** A boxed gift with a gold ribbon and bow. */
function gift(k: Kit, c: string): void {
  k.box(0.04, 0.03, 0.04, c, 0, -0.008, 0);
  k.box(0.041, 0.004, 0.041, GOLD, 0, 0.005, 0);
  k.box(0.008, 0.031, 0.041, GOLD, 0, -0.008, 0);
  for (const s of [-1, 1]) k.sph(0.008, GOLD, s * 0.007, 0.012, 0, 1.2, 0.7, 0.6, 7);
  k.sph(0.004, shadeHex(GOLD, -30), 0, 0.012, 0, 1, 1, 1, 6);
}

/** A rangoli tile: a disc with a flower of coloured petals. */
function rangoliDisc(k: Kit, c: string): void {
  k.cyl(0.027, 0.027, 0.008, c, 0, -0.012, 0, 0, 0, 0, 16);
  k.tor(0.024, 0.0018, WHITE, 0, -0.008, 0, Math.PI / 2, 0, 0, 18);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    k.sph(0.0075, i % 2 ? '#ffd23f' : '#ff3d8b', Math.cos(a) * 0.014, -0.007, Math.sin(a) * 0.014, 1.5, 0.35, 0.7, 6);
  }
  k.sph(0.006, WHITE, 0, -0.006, 0, 1, 0.4, 1, 8);
}

/** A paper kite (patang) with crossed sticks and a little tail. */
function kite(k: Kit, c: string): void {
  k.shape(polygon([[0, 0.026], [0.022, 0.002], [0, -0.024], [-0.022, 0.002]]), 0.003, c, M(0, 0.002, 0));
  k.shape(polygon([[0, -0.024], [0.009, -0.014], [-0.009, -0.014]]), 0.0035, '#ffd23f', M(0, 0.002, 0.0003));
  k.sph(0.005, WHITE, 0, 0.004, 0.002, 1, 1, 0.3, 8);
  k.cyl(0.001, 0.001, 0.05, '#7a4a26', 0, 0.002, 0.002, 0, 0, 0, 4);
  k.tor(0.022, 0.001, '#7a4a26', 0, -0.006, 0.002, 0, 0, 0, 10, Math.PI);
  for (const s of [-1, 1]) k.cone(0.004, 0.007, '#ff3d8b', s * 0.004, -0.03, 0.002, 0, 0, s * Math.PI / 2, 4);
}

/** An anar: a striped fountain cone throwing up sparks. */
function anar(k: Kit, c: string): void {
  k.cyl(0.008, 0.019, 0.03, c, 0, -0.012, 0, 0, 0, 0, 12);
  k.cyl(0.0145, 0.0155, 0.004, GOLD, 0, -0.016, 0, 0, 0, 0, 12);
  k.cyl(0.0095, 0.0105, 0.003, GOLD, 0, -0.004, 0, 0, 0, 0, 12);
  k.cone(0.012, 0.022, FLAME, 0, 0.014, 0, Math.PI, 0, 0, 8);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    k.sph(0.0025, i % 2 ? WHITE : FLAME_HOT, Math.cos(a) * 0.015, 0.024, Math.sin(a) * 0.015, 1, 1, 1, 4);
  }
}

/** A jalebi: a sticky syrupy spiral. */
function jalebi(k: Kit, c: string): void {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 36; i++) {
    const t = i / 36;
    const a = t * Math.PI * 5;
    const r = 0.003 + t * 0.019;
    pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a * 3) * 0.0015, Math.sin(a) * r));
  }
  const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.0045, 5);
  k.add(tube, c);
  for (const [x, z] of [[0.01, 0.004], [-0.012, -0.006], [0.002, 0.016]] as const) k.sph(0.0024, shadeHex(c, 40), x, 0.004, z, 1, 0.6, 1, 4);
}

// ------------------------------------------------------------------------------------- props

/** A clay diya about 0.15 across at scale 1, its flame glowing. */
function diyaProp({ b, glow, m }: PropContext): void {
  b.add(new THREE.SphereGeometry(0.06, 12, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).scale(1.15, 0.6, 1), CLAY, m(0, 0.04, 0));
  b.add(new THREE.ConeGeometry(0.024, 0.06, 8).rotateZ(-Math.PI / 2), CLAY, m(0.07, 0.035, 0));
  b.add(new THREE.CylinderGeometry(0.055, 0.055, 0.008, 12), '#f0b23a', m(0, 0.036, 0));
  b.add(new THREE.TorusGeometry(0.066, 0.008, 4, 14).rotateX(Math.PI / 2), CLAY_DARK, m(0, 0.04, 0));
  glow.add(new THREE.SphereGeometry(0.022, 8, 6).scale(1, 1.6, 1), FLAME_HOT, m(0.085, 0.07, 0));
  glow.add(new THREE.SphereGeometry(0.016, 8, 6).scale(1, 2, 1), FLAME, m(0.085, 0.1, 0));
}

/** A big rangoli lying on the mat, about 0.9 across at scale 1. */
function rangoliProp({ b, m, variant }: PropContext): void {
  const c = (i: number) => pick(RANGOLI, variant * 2 + i);
  const flat = (r: number, y: number, col: string, seg = 24) => b.add(new THREE.CylinderGeometry(r, r, 0.008, seg), col, m(0, y, 0));
  flat(0.45, 0.004, WHITE);
  flat(0.43, 0.008, c(0));
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    b.add(new THREE.SphereGeometry(0.06, 8, 4).scale(1.4, 0.12, 0.7), i % 2 ? c(1) : c(2), m(Math.cos(a) * 0.34, 0.013, Math.sin(a) * 0.34, -a));
  }
  flat(0.27, 0.014, WHITE);
  flat(0.255, 0.018, c(3));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    b.add(new THREE.SphereGeometry(0.07, 8, 4).scale(1.5, 0.1, 0.6), c(4), m(Math.cos(a) * 0.15, 0.024, Math.sin(a) * 0.15, -a));
  }
  flat(0.07, 0.027, c(1), 14);
  flat(0.035, 0.031, WHITE, 10);
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    b.add(new THREE.SphereGeometry(0.014, 6, 3).scale(1, 0.4, 1), WHITE, m(Math.cos(a) * 0.45, 0.012, Math.sin(a) * 0.45));
  }
}

/** A low family table laid with plates of sweets and a diya in the middle. */
function sweetsTable(ctx: PropContext): void {
  const { b, glow, m } = ctx;
  b.add(new THREE.BoxGeometry(0.8, 0.04, 0.46), '#e8263c', m(0, 0.22, 0));
  b.add(new THREE.BoxGeometry(0.82, 0.03, 0.48), GOLD, m(0, 0.2, 0));
  for (const [x, z] of [[-0.35, -0.19], [0.35, -0.19], [-0.35, 0.19], [0.35, 0.19]] as const) b.add(new THREE.CylinderGeometry(0.025, 0.02, 0.2, 6), '#8a4a26', m(x, 0.1, z));
  const plate = (x: number, z: number) => b.add(new THREE.CylinderGeometry(0.1, 0.085, 0.015, 14), GOLD, m(x, 0.25, z));
  // Ladoos.
  plate(-0.24, 0.05);
  for (const [x, y, z] of [[-0.28, 0.29, 0.02], [-0.2, 0.29, 0.02], [-0.24, 0.29, 0.1], [-0.24, 0.35, 0.05]] as const) b.add(new THREE.SphereGeometry(0.04, 8, 6), '#ff9a1f', m(x, y, z));
  // Barfi diamonds with silver leaf.
  plate(0.24, 0.05);
  const diamond = new THREE.ExtrudeGeometry(polygon([[0.05, 0], [0, 0.032], [-0.05, 0], [0, -0.032]]), { depth: 0.025, bevelEnabled: false }).rotateX(-Math.PI / 2);
  for (const [x, z] of [[0.2, 0.0], [0.28, 0.08], [0.2, 0.1]] as const) {
    b.add(diamond, '#f4ecd8', m(x, 0.258, z));
    b.add(diamond, SILVER, m(x, 0.284, z, 0, 0.85).multiply(new THREE.Matrix4().makeScale(1, 0.1, 1)));
  }
  // Jalebi spirals.
  plate(0, -0.12);
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const a = t * Math.PI * 4;
    pts.push(new THREE.Vector3(Math.cos(a) * (0.01 + t * 0.045), 0, Math.sin(a) * (0.01 + t * 0.045)));
  }
  const spiral = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 30, 0.011, 4);
  for (const x of [-0.05, 0.05]) b.add(spiral, '#ff8a1e', m(x, 0.27, -0.12));
  // A diya in the middle.
  b.add(new THREE.SphereGeometry(0.045, 10, 5, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).scale(1.1, 0.6, 1), CLAY, m(0, 0.27, 0.12));
  glow.add(new THREE.SphereGeometry(0.018, 8, 6).scale(1, 2, 1), FLAME, m(0, 0.3, 0.12));
}

/** An akash kandil (star lantern) glowing on a bamboo pole, about 1.0 tall at scale 1. */
function kandil({ b, glow, m, variant }: PropContext): void {
  const bamboo = '#c9a35a';
  b.add(new THREE.CylinderGeometry(0.06, 0.08, 0.04, 10), '#7a4a26', m(0, 0.02, 0));
  b.add(new THREE.CylinderGeometry(0.018, 0.022, 1.0, 6), bamboo, m(0, 0.52, 0));
  b.add(new THREE.CylinderGeometry(0.014, 0.014, 0.32, 6).rotateZ(Math.PI / 2), bamboo, m(0.15, 1.0, 0));
  b.add(new THREE.CylinderGeometry(0.004, 0.004, 0.1, 4), '#5b4a3a', m(0.28, 0.95, 0));
  const col = pick(['#ff8a1e', '#ff3d8b', '#ffd23f', '#e8263c'], variant);
  const star = new THREE.ExtrudeGeometry(starShape(0.15, 0.075), { depth: 0.08, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.015, bevelSegments: 1 }).translate(0, 0, -0.04);
  // Three stars crossed through each other, so it reads as a star from the side and from above.
  glow.add(star, col, m(0.28, 0.75, 0));
  glow.add(star.clone().rotateY(Math.PI / 2), shadeHex(col, -35), m(0.28, 0.75, 0));
  glow.add(star.clone().rotateX(-Math.PI / 2), shadeHex(col, -18), m(0.28, 0.75, 0));
  glow.add(new THREE.CircleGeometry(0.05, 12), FLAME, m(0.28, 0.75, 0.065));
  glow.add(new THREE.CircleGeometry(0.05, 12).rotateY(Math.PI), FLAME, m(0.28, 0.75, -0.065));
  for (const [x, l] of [[-0.06, 0.18], [0, 0.24], [0.06, 0.18]] as const) {
    b.add(new THREE.CylinderGeometry(0.008, 0.016, l, 5), x ? GOLD : '#ff3d8b', m(0.28 + x, 0.6 - l / 2 + 0.02, 0));
  }
}

/** Glowing spark arcs above a point (anar fountains, sparklers). */
function sparks(glow: PropContext['glow'], m: PropContext['m'], y: number, size: number, n: number, seed: number): void {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + seed;
    for (let j = 1; j <= 4; j++) {
      const t = j / 4;
      const r = t * size * 0.9;
      const h = y + size * (1.6 * t - 1.0 * t * t);
      glow.add(new THREE.SphereGeometry(size * (0.09 - t * 0.012), 4, 3), pick(SPARK, i + j), m(Math.cos(a) * r, h, Math.sin(a) * r));
    }
  }
  glow.add(new THREE.ConeGeometry(size * 0.18, size * 0.7, 6).rotateX(Math.PI), WHITE, m(0, y + size * 0.3, 0));
}

/** An anar fountain: a striped clay cone with a fountain of sparks. */
function anarProp({ b, glow, m, variant }: PropContext): void {
  const col = pick(['#e8263c', '#9b4dd6', '#22b5a6', '#3f7fe0'], variant);
  b.add(new THREE.CylinderGeometry(0.03, 0.09, 0.18, 10), col, m(0, 0.09, 0));
  for (const [y, r] of [[0.05, 0.08], [0.12, 0.055]] as const) b.add(new THREE.CylinderGeometry(r + 0.003, r + 0.006, 0.025, 10), GOLD, m(0, y, 0));
  sparks(glow, m, 0.2, 0.28, 7, variant);
}

/** A sand bucket with three lit sparklers. */
function sparklerBucket({ b, glow, m }: PropContext): void {
  b.add(new THREE.CylinderGeometry(0.1, 0.08, 0.14, 12), '#3f7fe0', m(0, 0.07, 0));
  b.add(new THREE.CylinderGeometry(0.09, 0.09, 0.01, 12), '#e8c890', m(0, 0.13, 0));
  for (const [x, rz] of [[-0.03, 0.3], [0, 0], [0.03, -0.3]] as const) {
    b.add(new THREE.CylinderGeometry(0.006, 0.006, 0.36, 4), '#7a7e88', m(x, 0.3, 0).multiply(new THREE.Matrix4().makeRotationZ(rz)));
    const tip = m(x - Math.sin(rz) * 0.18, 0.3 + Math.cos(rz) * 0.18, 0);
    glow.add(new THREE.ExtrudeGeometry(starShape(0.07, 0.025, 8), { depth: 0.01, bevelEnabled: false }), FLAME, tip);
    glow.add(new THREE.SphereGeometry(0.03, 6, 4), WHITE, tip.clone());
  }
}

/** A stack of wrapped gifts. */
function gifts({ b, m, variant }: PropContext): void {
  const boxes: [number, number, number, number][] = [[0, 0.24, 0.14, 0], [0.04, 0.17, 0.12, 0.4], [-0.02, 0.12, 0.1, -0.3]];
  let y = 0;
  boxes.forEach(([x, w, h, yaw], i) => {
    const c = pick(['#ff3d8b', '#22b5a6', '#9b4dd6', '#e8263c', '#3f7fe0'], variant + i);
    b.add(new THREE.BoxGeometry(w, h, w), c, m(x, y + h / 2, 0, yaw));
    b.add(new THREE.BoxGeometry(w + 0.004, h + 0.002, 0.03), GOLD, m(x, y + h / 2, 0, yaw));
    b.add(new THREE.BoxGeometry(0.03, h + 0.002, w + 0.004), GOLD, m(x, y + h / 2, 0, yaw));
    y += h;
  });
  for (const s of [-1, 1]) b.add(new THREE.TorusGeometry(0.03, 0.01, 4, 10), GOLD, m(-0.02 + s * 0.025, y + 0.02, 0, s * 0.5));
}

/** A basket heaped with marigold heads. */
function marigoldBasket({ b, m }: PropContext): void {
  b.add(new THREE.CylinderGeometry(0.2, 0.15, 0.14, 12), '#b98a4a', m(0, 0.07, 0));
  b.add(new THREE.TorusGeometry(0.2, 0.018, 4, 14).rotateX(Math.PI / 2), '#8a5a2e', m(0, 0.14, 0));
  for (let i = 0; i < 11; i++) {
    const a = i * 2.4;
    const r = i === 0 ? 0 : 0.06 + (i % 2) * 0.07;
    b.add(new THREE.SphereGeometry(0.055, 8, 5).scale(1, 0.8, 1), pick(MARIGOLD, i), m(Math.cos(a) * r, 0.17 + (0.13 - r) * 0.5, Math.sin(a) * r));
  }
}

/** A marigold string between two points, sagging, flowers alternating. */
function garland(add: (x: number, y: number, z: number, col: string) => void, x0: number, x1: number, y: number, sag: number, step: number): void {
  const n = Math.max(2, Math.round((x1 - x0) / step));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    add(x0 + (x1 - x0) * t, y - sag * 4 * t * (1 - t), 0, pick(MARIGOLD, i));
  }
}

/** A house doorway dressed for Diwali: a toran of mango leaves and marigolds, lamps on the sills. */
function doorway({ b, glow, m }: PropContext): void {
  const wall = '#f6e3c4';
  b.add(new THREE.BoxGeometry(1.1, 0.95, 0.12), wall, m(0, 0.475, -0.02));
  b.add(new THREE.BoxGeometry(0.46, 0.72, 0.03), '#8a3a22', m(0, 0.36, 0.05));
  for (const s of [-1, 1]) {
    b.add(new THREE.BoxGeometry(0.21, 0.68, 0.02), '#b0522c', m(s * 0.11, 0.36, 0.07));
    b.add(new THREE.SphereGeometry(0.018, 6, 4), GOLD, m(s * 0.03, 0.36, 0.09));
    b.add(new THREE.BoxGeometry(0.06, 0.74, 0.06), GOLD, m(s * 0.26, 0.37, 0.05));
    // Strings of marigolds down the frame.
    for (let i = 0; i < 6; i++) b.add(new THREE.SphereGeometry(0.03, 6, 4), pick(MARIGOLD, i), m(s * 0.33, 0.7 - i * 0.07, 0.08));
    // A sill lamp each side.
    b.add(new THREE.BoxGeometry(0.16, 0.03, 0.12), '#d9b98c', m(s * 0.46, 0.5, 0.08));
    b.add(new THREE.SphereGeometry(0.04, 8, 4, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).scale(1.2, 0.6, 1), CLAY, m(s * 0.46, 0.54, 0.08));
    glow.add(new THREE.SphereGeometry(0.016, 6, 5).scale(1, 2, 1), FLAME, m(s * 0.46, 0.57, 0.08));
  }
  b.add(new THREE.BoxGeometry(0.64, 0.06, 0.08), GOLD, m(0, 0.75, 0.05));
  // The toran: a row of mango leaves with marigold swags hanging from the lintel.
  for (let i = 0; i < 9; i++) {
    const x = -0.36 + i * 0.09;
    b.add(new THREE.SphereGeometry(0.04, 6, 4).scale(0.5, 1.4, 0.2), LEAF, m(x, 0.7, 0.1));
  }
  garland((x, y, z, col) => b.add(new THREE.SphereGeometry(0.028, 6, 4), col, m(x, y, 0.12 + z)), -0.38, 0.38, 0.79, 0.09, 0.055);
  b.add(new THREE.BoxGeometry(1.2, 0.08, 0.16), '#c75b4a', m(0, 0.98, -0.02));
}

// ------------------------------------------------------------------------------------- the skin

const skin: HolidaySkin = {
  id: 'diwali',
  name: 'Diwali',
  greeting: 'Happy Diwali!',
  cargo: { brown: diya, orange: ladoo, white: tilted(barfi, 0.5), gray: sparkler, yellow: marigold, blue: starLantern, red: gift, teal: tilted(rangoliDisc, 0.8), green: kite, purple: anar, pink: tilted(jalebi, 0.95) },
  props: {
    'diwali.diya': diyaProp,
    'diwali.rangoli': rangoliProp,
    'diwali.table': sweetsTable,
    'diwali.kandil': kandil,
    'diwali.anar': anarProp,
    'diwali.sparklers': sparklerBucket,
    'diwali.gifts': gifts,
    'diwali.marigolds': marigoldBasket,
    'diwali.door': doorway,
  },
  inside: [
    { name: 'rangoli', w: 2, h: 2, items: [['diwali.rangoli', 0, 0, 0, 1.45], ...ring(8, 0.8, 'diwali.diya', 1.1, Math.PI / 8)] },
    { name: 'sweets', w: 2, h: 1, items: [['diwali.table', 0, 0, 0, 1.05], ['pillow', -0.72, 0, 0, 0.32], ['pillow', 0.72, 0, 0, 0.32], ['toy:top', 0.15, 0.36, 'face', 0.5]] },
    { name: 'fireworks', w: 2, h: 1, items: [['diwali.anar', -0.62, -0.1, 0, 0.9], ['diwali.sparklers', 0.05, 0, 0, 1.25], ['diwali.anar', 0.66, 0.1, 0, 0.75], ...row(4, 0.4, 'diwali.diya', 0.9, Math.PI / 2, 0.36)] },
    { name: 'lantern', w: 2, h: 2, items: [['diwali.kandil', -0.3, -0.35, 0, 1.15], ['diwali.marigolds', 0.5, -0.4, 0, 0.9], ['diwali.gifts', -0.55, 0.45, 0.3, 1], ['toy:block', 0.55, 0.45, 'face', 0.55], ...row(3, 0.35, 'diwali.diya', 1, Math.PI / 2, 0.15)] },
  ],
  outside: [
    { name: 'bigRangoli', w: 2.4, h: 0, items: [['diwali.rangoli', 0, 0, 0, 4], ...ring(12, 2.05, 'diwali.diya', 3)] },
    { name: 'doorway', w: 2.4, h: 0, items: [['diwali.door', 0, -0.6, 0, 3], ['diwali.rangoli', 0, 1.0, 0, 1.6], ['diwali.kandil', 1.9, -0.4, Math.PI, 2.6], ['diwali.marigolds', -1.6, 0.2, 0, 2.2], ...row(4, 0.5, 'diwali.diya', 2.2, Math.PI / 2, 1.9)] },
    { name: 'feast', w: 2.2, h: 0, items: [['diwali.table', 0, 0, 0, 3], ['pillow', -1.6, 0.2, 0, 1], ['pillow', 1.6, 0.2, 0, 1], ['diwali.gifts', 0.9, 1.3, 0.4, 2.6], ['diwali.anar', -1.0, 1.4, 0, 2.4], ['diwali.sparklers', -1.6, -0.9, 0, 2.4]] },
  ],
  edge(b, glow, spot, ctx) {
    // The rim's grassy top sits above the mat: everything stands on it, a size up.
    const LIFT = 0.05;
    const K = 1.45;
    const at = (x: number, y: number, z: number, sx = 1, sy = sx, sz = sx) => {
      const c = Math.cos(spot.yaw);
      const s = Math.sin(spot.yaw);
      return new THREE.Matrix4().compose(new THREE.Vector3(spot.x + x * c + z * s, LIFT + y * K, spot.z - x * s + z * c), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), spot.yaw), new THREE.Vector3(sx * K, sy * K, sz * K));
    };
    const lamp = (z: number) => {
      b.add(new THREE.SphereGeometry(0.05, 10, 4, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), CLAY, at(0, 0.03, z, 1.15, 0.6, 1));
      b.add(new THREE.ConeGeometry(0.018, 0.04, 6).rotateZ(Math.PI / 2), CLAY, at(-0.06, 0.026, z));
      b.add(new THREE.CylinderGeometry(0.044, 0.044, 0.006, 10), '#f0b23a', at(0, 0.026, z));
      glow.add(new THREE.SphereGeometry(0.018, 6, 5), FLAME_HOT, at(-0.065, 0.05, z, 1, 1.5, 1));
      glow.add(new THREE.SphereGeometry(0.013, 6, 5), FLAME, at(-0.065, 0.075, z, 1, 2, 1));
    };
    if (spot.corner) {
      // A heap of marigolds round a lamp; on the main day an anar fountain sparkles there too.
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        b.add(new THREE.SphereGeometry(0.045, 8, 5).scale(1, 0.75, 1), pick(MARIGOLD, i), at(Math.cos(a) * 0.1, 0.015, Math.sin(a) * 0.1));
      }
      if (ctx.day === Math.floor(ctx.length / 2)) {
        b.add(new THREE.CylinderGeometry(0.025, 0.06, 0.12, 8), '#9b4dd6', at(0, 0.06, 0));
        const m = (x: number, y: number, z: number, _yaw = 0, scale = 1) => at(x, y, z, scale);
        sparks(glow, m, 0.13, 0.18, 6, spot.index);
      } else lamp(0);
      return;
    }
    // Two diyas with marigolds between them.
    lamp(-0.22);
    lamp(0.22);
    for (const z of [-0.065, 0.065]) b.add(new THREE.SphereGeometry(0.04, 8, 5).scale(1, 0.75, 1), pick(MARIGOLD, spot.index + (z > 0 ? 1 : 0)), at(0, 0.015, z));
  },
  station(b, f) {
    // Marigold swags along the eaves with mango leaves at each hook, and a star lantern each side.
    const hooks: number[] = [];
    for (let x = -f.width / 2; x <= f.width / 2 + 1e-6; x += f.width / 4) hooks.push(x);
    for (let i = 0; i + 1 < hooks.length; i++) {
      garland((x, y, _z, col) => b.add(new THREE.SphereGeometry(0.028, 6, 4), col, f.m(x, y, f.frontZ + 0.04)), hooks[i] as number, hooks[i + 1] as number, f.roofY - 0.01, 0.08, 0.05);
    }
    for (const x of hooks) {
      for (const s of [-1, 1]) b.add(new THREE.SphereGeometry(0.035, 6, 4).scale(0.45, 1.3, 0.2), LEAF, f.m(x + s * 0.025, f.roofY - 0.05, f.frontZ + 0.05, 0, 0, s * 0.4));
    }
    for (const x of [-0.42, 0.42]) {
      b.add(new THREE.CylinderGeometry(0.003, 0.003, 0.08, 4), '#5b4a3a', f.m(x, f.roofY - 0.06, f.frontZ + 0.06));
      b.add(new THREE.ExtrudeGeometry(starShape(0.07, 0.035), { depth: 0.035, bevelEnabled: false }).translate(0, 0, -0.0175), x < 0 ? '#ff8a1e' : '#ff3d8b', f.m(x, f.roofY - 0.16, f.frontZ + 0.06));
      b.add(new THREE.CircleGeometry(0.025, 10), FLAME, f.m(x, f.roofY - 0.16, f.frontZ + 0.079));
      b.add(new THREE.CylinderGeometry(0.004, 0.008, 0.07, 4), GOLD, f.m(x, f.roofY - 0.26, f.frontZ + 0.06));
    }
  },
  engine(b) {
    // A marigold garland round the smokebox with a swag hanging in front.
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      b.sphere(0.017, pick(MARIGOLD, i), 0.255, 0.215 + Math.cos(a) * 0.1, Math.sin(a) * 0.1, 1, 1, 1, 6);
    }
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      const z = -0.11 + t * 0.22;
      b.sphere(0.015, pick(MARIGOLD, i + 1), 0.3, 0.27 - 0.13 * 4 * t * (1 - t), z, 1, 1, 1, 6);
    }
  },
  light: { background: '#2a1638', sunColor: '#ffc98e', sunIntensity: 1.75, hemiSky: '#ffbfa0', hemiGround: '#3e2244', hemiIntensity: 0.88 },
  fx: { kind: 'sparkles', colors: ['#ffd23f', '#ffb347', '#fff3a0'], count: 60 },
};

export default skin;
