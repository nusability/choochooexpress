// Hanukkah (eight evenings, December): a menorah by the window with one more candle lit each
// evening (day + 1 candles and the shamash), kids spinning dreidels round a pile of chocolate gelt,
// a table laid with latkes, applesauce and sufganiyot, blue, white and silver bunting round the
// diorama and on the station, a dreidel riding on the engine and silver-blue sparkles in the air.
// Dreidels, gelt, candles, doughnuts, latkes, a little menorah, gifts and oil jugs ride the wagons.
import * as THREE from 'three';
import type { GeoBatch } from '../batch';
import type { HolidaySkin, Item, PropContext } from '../holiday';
import { ring } from '../holiday';
import { M, WHITE, polygon, shadeHex, type Kit } from '../toyModels';

const BLUE = '#2f6fe0';
const SKY = '#8fc3ff';
const SILVER = '#c9d3e6';
const GOLD = '#f2c23a';
const FLAME = '#ffc93a';
const DOUGH = '#d9934a';
const JELLY = '#e0304a';
const BUNTING = [BLUE, WHITE, SKY, SILVER];

// ------------------------------------------------------------------------------------- cargo

function gift(k: Kit, c: string): void {
  k.box(0.04, 0.032, 0.04, c, 0, -0.006, 0);
  k.box(0.042, 0.033, 0.009, SKY, 0, -0.006, 0);
  k.box(0.009, 0.033, 0.042, SKY, 0, -0.006, 0);
  for (const s of [-1, 1]) k.tor(0.008, 0.003, WHITE, s * 0.007, 0.014, 0, 0, s * 0.5, 0, 10);
}

function spinningTop(k: Kit, c: string): void {
  k.sph(0.022, c, 0, 0.002, 0, 1, 0.55, 1, 14);
  k.tor(0.0215, 0.0025, WHITE, 0, 0.002, 0, Math.PI / 2, 0, 0, 16);
  k.cone(0.012, 0.018, shadeHex(c, -18), 0, -0.016, 0, Math.PI, 0, 0, 10);
  k.cyl(0.003, 0.003, 0.016, BLUE, 0, 0.018, 0, 0, 0, 0, 6);
  k.sph(0.0045, BLUE, 0, 0.027, 0, 1, 1, 1, 6);
}

function gelt(k: Kit, c: string): void {
  // A gold-foil chocolate coin standing up, a second one lying behind it.
  k.cyl(0.02, 0.02, 0.005, shadeHex(c, -12), -0.006, -0.02, -0.004, 0, 0, 0, 14);
  k.cyl(0.018, 0.018, 0.005, BLUE, 0.008, -0.015, 0.006, 0.15, 0, 0.1, 14);
  // The front coin leans back on the others, its face up and toward you.
  const lean = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(0.85, 0.5, 0, 'YXZ'));
  const at = (x: number, y: number, z: number, rx = 0) => new THREE.Matrix4().makeTranslation(0, -0.002, 0).multiply(lean).multiply(M(x, y, z, rx));
  k.add(new THREE.CylinderGeometry(0.021, 0.021, 0.006, 16), c, at(0, 0, 0, Math.PI / 2));
  k.add(new THREE.TorusGeometry(0.019, 0.0022, 5, 16), shadeHex(c, 18), at(0, 0, 0.003));
  k.add(new THREE.CylinderGeometry(0.011, 0.011, 0.007, 12), shadeHex(c, 22), at(0, 0, 0.001, Math.PI / 2));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    k.add(new THREE.SphereGeometry(0.0018, 5, 4), WHITE, at(Math.cos(a) * 0.0145, Math.sin(a) * 0.0145, 0.004));
  }
}

function oilJug(k: Kit, c: string): void {
  const pts = [[0.001, -0.025], [0.013, -0.025], [0.019, -0.012], [0.018, 0.002], [0.009, 0.012], [0.006, 0.02], [0.008, 0.025]].map(([x, y]) => new THREE.Vector2(x, y));
  k.add(new THREE.LatheGeometry(pts, 12), c);
  k.tor(0.008, 0.0025, shadeHex(c, -15), -0.012, 0.006, 0, 0, 0, 0.4, 10, Math.PI * 1.2);
  k.tor(0.0185, 0.0025, GOLD, 0, -0.006, 0, Math.PI / 2, 0, 0, 14);
  k.sph(0.004, GOLD, 0.006, -0.006, 0.018, 1, 1.4, 0.6, 6);
}

function bauble(k: Kit, c: string): void {
  k.sph(0.021, c, 0, -0.004, 0, 1, 1, 1, 14);
  k.tor(0.0212, 0.0025, WHITE, 0, -0.004, 0, Math.PI / 2, 0, 0, 18);
  for (const s of [-1, 1]) k.tor(0.0165, 0.0018, WHITE, 0, -0.004 + s * 0.011, 0, Math.PI / 2, 0, 0, 14);
  k.cyl(0.006, 0.006, 0.007, SILVER, 0, 0.019, 0, 0, 0, 0, 8);
  k.tor(0.004, 0.0012, SILVER, 0, 0.025, 0, 0, 0, 0, 8);
}

function dreidel(k: Kit, c: string): void {
  k.box(0.03, 0.03, 0.03, c, 0, 0.002, 0);
  k.cone(0.0212, 0.018, shadeHex(c, -15), 0, -0.022, 0, Math.PI, Math.PI / 4, 0, 4);
  k.box(0.031, 0.004, 0.031, WHITE, 0, 0.0165, 0);
  k.cyl(0.004, 0.004, 0.016, SILVER, 0, 0.026, 0, 0, 0, 0, 8);
  for (const [x, z, rx, rz] of [[0.0155, 0, 0, Math.PI / 2], [-0.0155, 0, 0, Math.PI / 2], [0, 0.0155, Math.PI / 2, 0], [0, -0.0155, Math.PI / 2, 0]] as const) k.cyl(0.007, 0.007, 0.002, GOLD, x, 0.002, z, rx, 0, rz, 10);
}

function candle(k: Kit, c: string): void {
  k.cyl(0.017, 0.014, 0.005, SILVER, 0, -0.025, 0, 0, 0, 0, 12);
  k.cyl(0.009, 0.009, 0.04, c, 0, -0.003, 0, 0, 0, 0, 10);
  for (const y of [-0.012, 0.004]) k.tor(0.0092, 0.0018, WHITE, 0, y, 0, Math.PI / 2, 0, 0, 12);
  k.cyl(0.001, 0.001, 0.004, '#3b2a20', 0, 0.019, 0, 0, 0, 0, 4);
  k.sph(0.0055, FLAME, 0, 0.026, 0, 1, 1.7, 1, 8);
  k.sph(0.003, '#fff4c0', 0, 0.024, 0.002, 1, 1.4, 1, 6);
}

function sufganiyah(k: Kit, c: string): void {
  k.sph(0.021, DOUGH, 0, -0.008, 0, 1, 0.75, 1, 12);
  k.dome(0.0215, c, 0, -0.006, 0, 1, 0.85, 1, 12);
  k.sph(0.006, JELLY, 0, 0.012, 0, 1, 0.8, 1, 8);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3;
    k.sph(0.0022, WHITE, Math.cos(a) * 0.013, 0.006, Math.sin(a) * 0.013, 1, 1, 1, 5);
  }
}

function latkes(k: Kit, c: string): void {
  for (const [x, y, z, r] of [[0, -0.018, 0, 0.022], [0.003, -0.01, -0.002, 0.02], [-0.002, -0.002, 0.002, 0.018]] as const) {
    k.cyl(r, r, 0.007, c, x, y, z, 0, 0, 0, 12);
    k.tor(r, 0.0025, shadeHex(c, -22), x, y, z, Math.PI / 2, 0, 0, 12);
  }
  k.sph(0.009, '#f2d27a', 0.002, 0.004, 0, 1, 0.6, 1, 8);
  k.sph(0.005, WHITE, -0.002, 0.008, 0.002, 1, 0.8, 1, 6);
}

function geltPouch(k: Kit, c: string): void {
  k.sph(0.019, c, 0, -0.008, 0, 1, 1, 1, 12);
  k.cyl(0.007, 0.01, 0.01, c, 0, 0.012, 0, 0, 0, 0, 10);
  k.tor(0.0085, 0.0022, BLUE, 0, 0.01, 0, Math.PI / 2, 0, 0, 10);
  k.cone(0.012, 0.01, c, 0, 0.021, 0, Math.PI, 0, 0, 10);
  for (const [x, rz] of [[-0.004, 0.4], [0.005, -0.3]] as const) k.cyl(0.0065, 0.0065, 0.002, GOLD, x, 0.026, 0, Math.PI / 2, 0, rz, 10);
  k.sph(0.0045, BLUE, 0.006, -0.006, 0.017, 1, 1, 0.5, 6);
}

function littleMenorah(k: Kit, c: string): void {
  k.cyl(0.01, 0.013, 0.005, c, 0, -0.024, 0, 0, 0, 0, 10);
  k.cyl(0.0025, 0.0025, 0.032, c, 0, -0.006, 0, 0, 0, 0, 6);
  for (const R of [0.006, 0.012, 0.018, 0.024]) k.tor(R, 0.0016, c, 0, 0.006, 0, 0, 0, Math.PI, 12, Math.PI);
  for (let i = -4; i <= 4; i++) {
    const x = i * 0.006;
    const y = i === 0 ? 0.016 : 0.009;
    k.cyl(0.002, 0.002, 0.008, i % 2 ? WHITE : BLUE, x, y, 0, 0, 0, 0, 5);
    k.sph(0.0022, FLAME, x, y + 0.006, 0, 1, 1.5, 1, 5);
  }
}

// ------------------------------------------------------------------------------------- props

type Add = (g: THREE.BufferGeometry, c: string, local: THREE.Matrix4, glow?: boolean) => void;

/** A menorah about 0.55 tall at scale 1: day + 1 candles from the right, and the shamash in the middle. */
function menorahParts(add: Add, lit: number): void {
  add(new THREE.CylinderGeometry(0.12, 0.15, 0.04, 14), SILVER, M(0, 0.02, 0));
  add(new THREE.CylinderGeometry(0.025, 0.03, 0.42, 8), SILVER, M(0, 0.24, 0));
  add(new THREE.SphereGeometry(0.045, 10, 6), shadeHex(SILVER, 12), M(0, 0.12, 0));
  for (const R of [0.07, 0.14, 0.21, 0.28]) add(new THREE.TorusGeometry(R, 0.014, 5, 16, Math.PI), SILVER, M(0, 0.34, 0, 0, 0, Math.PI));
  // Positions from the right (as you face it): the first evening's candle goes on the far right.
  const spots = [0.28, 0.21, 0.14, 0.07, -0.07, -0.14, -0.21, -0.28];
  const candleAt = (x: number, y: number, col: string) => {
    add(new THREE.CylinderGeometry(0.014, 0.014, 0.09, 8), col, M(x, y + 0.045, 0));
    add(new THREE.SphereGeometry(0.028, 8, 6), FLAME, M(x, y + 0.125, 0, 0, 0, 0, 1, 1.8, 1), true);
    add(new THREE.SphereGeometry(0.014, 6, 5), '#fff6d0', M(x, y + 0.115, 0.012), true);
  };
  spots.forEach((x, i) => {
    add(new THREE.CylinderGeometry(0.03, 0.02, 0.03, 10), SILVER, M(x, 0.355, 0));
    if (i < lit) candleAt(x, 0.37, i % 2 ? WHITE : BLUE);
  });
  add(new THREE.CylinderGeometry(0.032, 0.022, 0.03, 10), GOLD, M(0, 0.465, 0));
  candleAt(0, 0.48, WHITE);
}

const litCount = (day: number) => Math.max(1, Math.min(8, day + 1));

function adder({ b, glow, m }: PropContext): Add {
  return (g, c, local, bright) => (bright ? glow : b).add(g, c, m(0, 0, 0).multiply(local));
}

function menorahProp(ctx: PropContext): void {
  menorahParts(adder(ctx), litCount(ctx.day));
}

/** A bit of wall with a night window, curtains and the menorah on the sill. */
function windowProp(ctx: PropContext): void {
  const { b, glow, m } = ctx;
  b.add(new THREE.BoxGeometry(1.0, 0.7, 0.06), '#f3d9a4', m(0, 0.35, 0));
  b.add(new THREE.BoxGeometry(0.56, 0.46, 0.03), WHITE, m(0, 0.42, 0.03));
  b.add(new THREE.BoxGeometry(0.48, 0.38, 0.03), '#1b2a6b', m(0, 0.42, 0.04));
  b.add(new THREE.BoxGeometry(0.02, 0.38, 0.035), WHITE, m(0, 0.42, 0.045));
  b.add(new THREE.BoxGeometry(0.48, 0.02, 0.035), WHITE, m(0, 0.45, 0.045));
  for (const [x, y] of [[-0.17, 0.56], [0.12, 0.58], [0.19, 0.5], [-0.08, 0.53]] as const) glow.add(new THREE.OctahedronGeometry(0.012, 0), '#fff4c0', m(x, y, 0.06));
  for (const s of [-1, 1]) b.add(new THREE.BoxGeometry(0.1, 0.5, 0.04), BLUE, m(s * 0.32, 0.43, 0.06));
  b.add(new THREE.BoxGeometry(0.76, 0.03, 0.06), WHITE, m(0, 0.67, 0.06));
  b.add(new THREE.BoxGeometry(0.66, 0.03, 0.2), WHITE, m(0, 0.2, 0.1));
  const base = m(0, 0.215, 0.1, 0, 0.75);
  menorahParts((g, c, local, bright) => (bright ? glow : b).add(g, c, base.clone().multiply(local)), litCount(ctx.day));
}

const KID_TOPS = [BLUE, '#f2c23a', '#e8574a', '#5bb36a', '#9b6ad6', '#ef6fa5'];
const SKIN = ['#f1c7a1', '#c98a5a', '#8d5a3b', '#e8b48a'];
const HAIR = ['#3b2a20', '#7a4a26', '#e0a83a', '#1e1e24'];

/** A peg-doll kid about 0.45 tall, looking and reaching along +x. */
function kid({ b, m, mr, variant }: PropContext): void {
  const top = KID_TOPS[variant % KID_TOPS.length] as string;
  const skin = SKIN[variant % SKIN.length] as string;
  const hair = HAIR[(variant + 1) % HAIR.length] as string;
  for (const s of [-1, 1]) b.add(new THREE.CylinderGeometry(0.03, 0.035, 0.12, 8), '#2b3f7a', m(0, 0.06, s * 0.04));
  b.add(new THREE.CylinderGeometry(0.075, 0.095, 0.17, 12), top, m(0, 0.2, 0));
  b.add(new THREE.TorusGeometry(0.085, 0.012, 4, 14).rotateX(Math.PI / 2), WHITE, m(0, 0.16, 0));
  b.add(new THREE.SphereGeometry(0.085, 12, 8), skin, m(0, 0.36, 0));
  b.add(new THREE.SphereGeometry(0.09, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), hair, m(-0.012, 0.37, 0));
  for (const s of [-1, 1]) {
    b.add(new THREE.SphereGeometry(0.012, 6, 5), '#1e1e24', m(0.078, 0.37, s * 0.03));
    b.add(new THREE.CylinderGeometry(0.022, 0.022, 0.13, 6), top, mr(0.06, 0.21, s * 0.075, 0, 0, Math.PI / 4));
    b.add(new THREE.SphereGeometry(0.026, 8, 6), skin, m(0.11, 0.165, s * 0.07));
  }
  b.add(new THREE.SphereGeometry(0.016, 6, 5), '#ff8f9a', m(0.08, 0.34, 0, 0, 0.8));
}

/** A big dreidel (about 0.33 tall) spinning on its point, or (variant 1) fallen on its side. */
function dreidelProp({ b, m, variant }: PropContext): void {
  const body = variant % 2 ? WHITE : BLUE;
  const deco = variant % 2 ? BLUE : WHITE;
  const pose = variant % 2 ? M(0, 0.08, 0, 0, 0.4, 1.25) : M(0, 0, 0);
  const add = (g: THREE.BufferGeometry, c: string, local: THREE.Matrix4) => b.add(g, c, m(0, 0, 0).multiply(pose).multiply(local));
  add(new THREE.BoxGeometry(0.16, 0.16, 0.16), body, M(0, 0.17, 0));
  add(new THREE.ConeGeometry(0.113, 0.09, 4).rotateY(Math.PI / 4).rotateX(Math.PI), shadeHex(body, -14), M(0, 0.045, 0));
  add(new THREE.BoxGeometry(0.165, 0.02, 0.165), deco, M(0, 0.25, 0));
  add(new THREE.CylinderGeometry(0.02, 0.02, 0.09, 8), SILVER, M(0, 0.3, 0));
  for (const [x, z, rx, rz] of [[0.082, 0, 0, Math.PI / 2], [-0.082, 0, 0, Math.PI / 2], [0, 0.082, Math.PI / 2, 0], [0, -0.082, Math.PI / 2, 0]] as const) add(new THREE.CylinderGeometry(0.042, 0.042, 0.008, 12), variant % 2 ? GOLD : deco, M(x, 0.17, z, rx, 0, rz));
}

/** A heap of chocolate gelt, mostly gold foil, a few blue and silver. */
function geltPile({ b, m }: PropContext): void {
  const coins: [number, number, number, number, number, string][] = [
    [0, 0.008, 0, 0, 0, GOLD], [0.07, 0.008, 0.04, 0.1, 0, GOLD], [-0.06, 0.008, 0.05, 0, 0.1, SILVER], [0.02, 0.008, -0.07, 0, 0, BLUE],
    [-0.07, 0.008, -0.04, 0.1, 0, GOLD], [0.1, 0.008, -0.05, 0, 0, GOLD], [0.01, 0.022, 0.02, 0.2, 0.1, GOLD], [-0.03, 0.03, -0.02, 0.15, -0.2, BLUE],
    [0.04, 0.036, -0.01, -0.2, 0.1, GOLD], [-0.12, 0.008, 0.0, 0, 0, GOLD], [0.0, 0.05, 0.0, 0.1, 0.25, SILVER],
  ];
  for (const [x, y, z, rx, rz, c] of coins) b.add(new THREE.CylinderGeometry(0.045, 0.045, 0.012, 14), c, m(0, 0, 0).multiply(M(x, y, z, rx, 0, rz)));
  for (const [x, z, a] of [[0.13, 0.08, 0.4], [-0.1, 0.11, -0.6]] as const) b.add(new THREE.CylinderGeometry(0.045, 0.045, 0.012, 14), GOLD, m(0, 0, 0).multiply(M(x, 0.045, z, Math.PI / 2, a, 0)));
}

/** A table laid for the feast: latkes with applesauce and sour cream, a plate of sufganiyot. */
function feast({ b, m }: PropContext): void {
  for (const [x, z] of [[-0.48, -0.2], [0.48, -0.2], [-0.48, 0.2], [0.48, 0.2]] as const) b.add(new THREE.CylinderGeometry(0.025, 0.025, 0.2, 6), '#8b5a2b', m(x, 0.1, z));
  b.add(new THREE.BoxGeometry(1.1, 0.03, 0.52), '#a86b38', m(0, 0.215, 0));
  b.add(new THREE.BoxGeometry(1.14, 0.012, 0.56), BLUE, m(0, 0.235, 0));
  b.add(new THREE.BoxGeometry(1.15, 0.014, 0.14), WHITE, m(0, 0.236, 0));
  const top = 0.242;
  // Latkes.
  b.add(new THREE.CylinderGeometry(0.13, 0.11, 0.015, 16), WHITE, m(-0.33, top + 0.008, 0));
  for (const [x, z, y] of [[-0.38, -0.04, 0], [-0.28, -0.03, 0], [-0.33, 0.05, 0], [-0.33, 0, 0.022]] as const) b.add(new THREE.CylinderGeometry(0.055, 0.055, 0.02, 12), '#b0702e', m(x, top + 0.026 + y, z));
  b.add(new THREE.SphereGeometry(0.025, 8, 6).scale(1, 0.6, 1), WHITE, m(-0.33, top + 0.05, 0));
  // Applesauce.
  b.add(new THREE.CylinderGeometry(0.07, 0.045, 0.05, 12), SKY, m(-0.02, top + 0.025, 0.14));
  b.add(new THREE.CylinderGeometry(0.064, 0.064, 0.006, 12), '#f2d27a', m(-0.02, top + 0.047, 0.14));
  // Sufganiyot.
  b.add(new THREE.CylinderGeometry(0.15, 0.12, 0.015, 16), WHITE, m(0.3, top + 0.008, -0.02));
  for (const [x, z] of [[0.25, -0.06], [0.35, -0.06], [0.3, 0.03], [0.21, 0.04], [0.39, 0.04]] as const) {
    b.add(new THREE.SphereGeometry(0.045, 10, 7).scale(1, 0.75, 1), DOUGH, m(x, top + 0.045, z));
    b.add(new THREE.SphereGeometry(0.046, 10, 5, 0, Math.PI * 2, 0, Math.PI / 3).scale(1, 0.75, 1), WHITE, m(x, top + 0.047, z));
    b.add(new THREE.SphereGeometry(0.013, 6, 5), JELLY, m(x, top + 0.08, z));
  }
  for (const x of [-0.12, 0.08]) b.add(new THREE.CylinderGeometry(0.03, 0.025, 0.06, 8), x < 0 ? WHITE : SKY, m(x, top + 0.03, -0.15));
}

function giftProp({ b, m, variant }: PropContext): void {
  const c = [BLUE, WHITE, '#9b6ad6', SKY][variant % 4] as string;
  const r = c === WHITE ? BLUE : WHITE;
  b.add(new THREE.BoxGeometry(0.2, 0.15, 0.2), c, m(0, 0.075, 0));
  b.add(new THREE.BoxGeometry(0.21, 0.155, 0.04), r, m(0, 0.075, 0));
  b.add(new THREE.BoxGeometry(0.04, 0.155, 0.21), r, m(0, 0.075, 0));
  for (const s of [-1, 1]) b.add(new THREE.TorusGeometry(0.035, 0.012, 5, 10), SILVER, m(s * 0.03, 0.17, 0, s * 0.5));
}

// ------------------------------------------------------------------------------------- trimmings

/** A pennant hanging from its top edge, flat in the local y–z plane. */
const pennant = () => new THREE.ExtrudeGeometry(polygon([[-0.035, 0], [0.035, 0], [0, -0.075]]), { depth: 0.008, bevelEnabled: false }).translate(0, 0, -0.004).rotateY(Math.PI / 2);

/** A small silver six-pointed star (two triangles), flat in the local y–z plane. */
const sixStar = (r: number) => {
  const tri = (a: number) => polygon([0, 1, 2].map((i) => [Math.cos(a + (i * 2 * Math.PI) / 3) * r, Math.sin(a + (i * 2 * Math.PI) / 3) * r] as [number, number]));
  const opts = { depth: 0.008, bevelEnabled: false };
  return [new THREE.ExtrudeGeometry(tri(Math.PI / 2), opts), new THREE.ExtrudeGeometry(tri(-Math.PI / 2), opts)].map((g) => g.translate(0, 0, -0.004).rotateY(Math.PI / 2));
};

const skin: HolidaySkin = {
  id: 'hanukkah',
  name: 'Hanukkah',
  greeting: 'Happy Hanukkah!',
  cargo: { red: gift, orange: spinningTop, yellow: gelt, green: oilJug, teal: bauble, blue: dreidel, purple: candle, pink: sufganiyah, brown: latkes, white: geltPouch, gray: littleMenorah },
  props: {
    'hk.menorah': menorahProp,
    'hk.window': windowProp,
    'hk.kid': kid,
    'hk.dreidel': dreidelProp,
    'hk.gelt': geltPile,
    'hk.feast': feast,
    'hk.gift': giftProp,
  },
  inside: [
    { name: 'menorah', w: 2, h: 2, items: [['hk.menorah', -0.1, -0.15, 0, 2.2], ['hk.gift', -0.6, 0.5, 0.4, 1.6, 0, 0], ['hk.gift', -0.15, 0.62, 1.1, 1.3, 0, 1], ['hk.gift', 0.62, -0.5, 0.2, 1.5, 0, 2], ['hk.gelt', 0.45, 0.4, 0, 1.6]] },
    { name: 'dreidelGame', w: 2, h: 2, items: [...ring(3, 0.7, 'hk.kid', 1.8, 0.5).map((it, i): Item => [it[0], it[1], it[2], it[3], it[4], 0, i]), ['hk.dreidel', -0.05, -0.1, 0.3, 1.2, 0, 0], ['hk.dreidel', 0.3, 0.22, 1.2, 1.1, 0, 1], ['hk.gelt', -0.22, 0.25, 0, 1.6]] },
    { name: 'latkeTable', w: 2, h: 1, items: [['hk.feast', -0.2, 0, 0, 1.25], ['hk.kid', 0.72, 0.05, Math.PI, 1.2, 0, 3]] },
    { name: 'oilAndDonuts', w: 2, h: 1, items: [['toy:ball', -0.62, 0, 0.4, 0.85], ['plate', 0.05, 0, 0, 1.5], ['toy:drum', -0.05, -0.08, 0, 0.55, 0.02], ['toy:drum', 0.16, 0.06, 1, 0.55, 0.02], ['toy:drum', 0.0, 0.14, 2, 0.55, 0.02], ['toy:star', 0.66, -0.12, 0, 0.75], ['toy:star', 0.82, 0.16, 0, 0.6]] },
  ],
  outside: [
    { name: 'menorahWindow', w: 2.4, h: 0, items: [['hk.window', 0, 0, 0, 3.2], ['hk.gift', 1.3, 0.9, 0.3, 3.2, 0, 0], ['hk.gift', -1.2, 1.0, 1, 2.8, 0, 1], ['hk.gelt', 0.2, 1.1, 0, 3.5]] },
    { name: 'dreidelSpin', w: 2.4, h: 0, items: [['hk.dreidel', 0, 0, 0.3, 4, 0, 0], ['hk.dreidel', 1.0, 0.8, 1, 3.4, 0, 1], ['hk.gelt', -0.9, 0.7, 0, 4], ['hk.kid', 1.9, -0.3, 'face', 4, 0, 0], ['hk.kid', -1.8, -0.4, 'face', 4, 0, 4]] },
    { name: 'feast', w: 2.2, h: 0, items: [['hk.feast', 0, 0, 0, 3.2], ['hk.kid', 0.3, 1.25, Math.PI / 2, 3.2, 0, 2], ['hk.kid', -2.1, 0, 0, 3.2, 0, 5], ['hk.gift', 1.9, 0.8, 0.6, 3, 0, 3]] },
  ],
  edge(b, glow, spot) {
    const at = (x: number, y: number, z: number, scale = 1) => {
      const c = Math.cos(spot.yaw);
      const s = Math.sin(spot.yaw);
      return new THREE.Matrix4().compose(new THREE.Vector3(spot.x + x * c + z * s, y, spot.z - x * s + z * c), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), spot.yaw), new THREE.Vector3(scale, scale, scale));
    };
    if (spot.corner) {
      // A tall blue-and-white candle with a glowing flame and a few gelt coins at its foot.
      const S = 1.5;
      b.add(new THREE.CylinderGeometry(0.09, 0.1, 0.04, 12), SILVER, at(0.02, 0.02 * S, 0, S));
      b.add(new THREE.CylinderGeometry(0.04, 0.04, 0.28, 10), WHITE, at(0.02, 0.18 * S, 0, S));
      for (const y of [0.1, 0.18, 0.26]) b.add(new THREE.TorusGeometry(0.041, 0.01, 4, 12).rotateX(Math.PI / 2), BLUE, at(0.02, y * S, 0, S));
      glow.add(new THREE.SphereGeometry(0.04, 8, 6).scale(1, 1.7, 1), FLAME, at(0.02, 0.38 * S, 0, S));
      for (const [x, z] of [[0.18, 0.12], [0.15, -0.15]] as const) b.add(new THREE.CylinderGeometry(0.04, 0.04, 0.012, 12), GOLD, at(x, 0.009, z, S));
      return;
    }
    // Blue, white and silver bunting sagging between two posts, little lights on the posts.
    const half = 0.4;
    for (const z of [-half, half]) {
      b.add(new THREE.CylinderGeometry(0.018, 0.022, 0.4, 6), SILVER, at(0.02, 0.2, z));
      glow.add(new THREE.SphereGeometry(0.04, 8, 6), (spot.index + (z > 0 ? 1 : 0)) % 2 ? SKY : WHITE, at(0.02, 0.42, z));
    }
    const y = (z: number) => 0.38 - 0.09 * (1 - (z / half) ** 2);
    const zs = [-half, -0.27, -0.135, 0, 0.135, 0.27, half];
    for (let i = 0; i < zs.length - 1; i++) {
      const z0 = zs[i] as number;
      const z1 = zs[i + 1] as number;
      const len = Math.hypot(z1 - z0, y(z1) - y(z0));
      b.add(new THREE.CylinderGeometry(0.008, 0.008, len, 4), WHITE, at(0.02, (y(z0) + y(z1)) / 2, (z0 + z1) / 2).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2 + Math.atan2(y(z1) - y(z0), z1 - z0))));
    }
    zs.slice(1, -1).forEach((z, i) => {
      if (i === 2 && spot.index % 3 === 0) {
        for (const g of sixStar(0.065)) b.add(g, SILVER, at(0.02, y(z) - 0.07, z));
      } else b.add(pennant().scale(1, 1.6, 1.6), BUNTING[(i + spot.index) % BUNTING.length] as string, at(0.02, y(z), z));
    });
  },
  station(b, f) {
    // Blue, white and silver bunting along the awning's front edge and under the eaves.
    const string = (y: number, z: number, step: number, scale: number) => {
      b.add(new THREE.BoxGeometry(f.width, 0.01, 0.01), WHITE, f.m(0, y, z));
      for (let x = -f.width / 2 + step / 2, i = 0; x < f.width / 2; x += step, i++) {
        const g = new THREE.ExtrudeGeometry(polygon([[-0.035, 0], [0.035, 0], [0, -0.075]]), { depth: 0.006, bevelEnabled: false }).scale(scale, scale, 1);
        b.add(g, BUNTING[i % BUNTING.length] as string, f.m(x, y, z));
      }
    };
    string(f.awningY - 0.045, f.awningZ + 0.16, 0.14, 1.4);
    string(f.roofY - 0.005, f.frontZ + 0.03, 0.14, 1.2);
  },
  engine(b: GeoBatch) {
    // A dreidel riding on the cab roof.
    const base = new THREE.Matrix4().compose(new THREE.Vector3(-0.17, 0.43, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0.6, 0.15)), new THREE.Vector3(1, 1, 1));
    const add = (g: THREE.BufferGeometry, c: string, local: THREE.Matrix4) => b.add(g, c, base.clone().multiply(local));
    add(new THREE.ConeGeometry(0.057, 0.05, 4).rotateY(Math.PI / 4).rotateX(Math.PI), shadeHex(BLUE, -14), M(0, 0.025, 0));
    add(new THREE.BoxGeometry(0.08, 0.08, 0.08), BLUE, M(0, 0.09, 0));
    add(new THREE.BoxGeometry(0.083, 0.012, 0.083), WHITE, M(0, 0.13, 0));
    add(new THREE.CylinderGeometry(0.01, 0.01, 0.05, 6), SILVER, M(0, 0.155, 0));
    for (const [x, z, rx, rz] of [[0.041, 0, 0, Math.PI / 2], [-0.041, 0, 0, Math.PI / 2], [0, 0.041, Math.PI / 2, 0], [0, -0.041, Math.PI / 2, 0]] as const) add(new THREE.CylinderGeometry(0.02, 0.02, 0.004, 10), GOLD, M(x, 0.09, z, rx, 0, rz));
  },
  light: { background: '#1d2650', sunColor: '#e8eeff', sunIntensity: 2.3, hemiSky: '#dbe4ff', hemiGround: '#3a3f6b', hemiIntensity: 1.15 },
  fx: { kind: 'sparkles', colors: ['#ffffff', SILVER, SKY, '#5b8cff'], count: 60 },
};

export default skin;
