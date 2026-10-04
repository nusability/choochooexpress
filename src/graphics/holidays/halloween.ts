// Halloween (30–31 October), cute and not scary: a pumpkin patch of glowing jack-o'-lanterns, a
// black cat on a fence, friendly sheet ghosts out trick-or-treating with a pumpkin pail spilling
// candy, a witch's cauldron bubbling green with the broom left leaning on it, bats, carved
// pumpkins round the rim, cobwebs and bunting on the station and a witch hat on the engine.
// Autumn leaves drift down in a purple dusk. Jack-o'-lanterns, ghosts, bats, candy corn, wrapped
// sweets, witch hats, cauldrons, spiders, potions, brooms and candy apples ride in the wagons.
import * as THREE from 'three';
import type { GeoBatch } from '../batch';
import type { HolidaySkin, PropContext } from '../holiday';
import { INK, M, WHITE, polygon, shadeHex, starShape, type Kit } from '../toyModels';

const ORANGE = '#ff8a1f';
const PURPLE = '#8a4fd8';
const DEEP = '#5a2f8a';
const CAT = '#2e2440';
const LIME = '#9dff4a';
const GLOW = '#ffd23f';
const STEM = '#5a8a2e';
const LEAF = '#6fbf3a';
const GOLD = '#f2c23a';
const CARVE = '#4a220c';
const PINK = '#ff8fb1';
const CANDY = ['#ff5a8a', '#ffd23f', '#8a4fd8', '#5fd36a', '#4dc3ff', '#ff8a1f'];

type Place = (x: number, y: number, z: number) => THREE.Matrix4;

/** Places parts at local offsets from a base transform. */
const local = (base: THREE.Matrix4): Place => (x, y, z) => base.clone().multiply(new THREE.Matrix4().makeTranslation(x, y, z));

/** A sphere with pumpkin ribs (radius r, squashed to sy). */
function ribbed(r: number, sy: number, ribs = 8): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(r, ribs * 3, 9);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const z = p.getZ(i);
    const k = 0.9 + 0.1 * Math.abs(Math.cos((Math.atan2(z, x) * ribs) / 2));
    p.setXYZ(i, x * k, p.getY(i) * sy, z * k);
  }
  g.computeVertexNormals();
  return g;
}

/** A triangle (eye or nose) facing +z, point up; `down` turns it over. */
const triZ = (r: number, d: number, down = false) => new THREE.CylinderGeometry(r, r, d, 3).rotateX(down ? Math.PI / 2 : -Math.PI / 2);

/** A jack-o'-lantern face on the +x side of a pumpkin of radius R whose middle is at height cy. */
function face(batch: GeoBatch, place: Place, R: number, cy: number, color: string): void {
  for (const s of [-1, 1]) batch.add(triZ(R * 0.2, R * 0.12).rotateY(Math.PI / 2), color, place(R * 0.86, cy + R * 0.22, s * R * 0.34));
  batch.add(triZ(R * 0.1, R * 0.12).rotateY(Math.PI / 2), color, place(R * 0.93, cy + R * 0.02, 0));
  batch.add(new THREE.TorusGeometry(R * 0.36, R * 0.08, 4, 10, Math.PI).rotateZ(Math.PI).rotateY(Math.PI / 2), color, place(R * 0.86, cy + R * 0.02, 0));
  for (const s of [-1, 1]) batch.add(new THREE.BoxGeometry(R * 0.1, R * 0.1, R * 0.1), color, place(R * 0.9, cy - R * 0.28, s * R * 0.12));
}

/** A pumpkin standing on y = 0 with its face (if carved) toward +x. */
function pumpkin(b: GeoBatch, glow: GeoBatch | null, place: Place, R: number, carved: boolean, tall = false): void {
  const sy = tall ? 0.95 : 0.78;
  const cy = R * sy * 0.97;
  b.add(ribbed(R, sy), ORANGE, place(0, cy, 0));
  b.add(new THREE.CylinderGeometry(R * 0.1, R * 0.15, R * 0.4, 6).rotateZ(-0.25), STEM, place(0.02 * R, cy + R * sy + R * 0.12, 0));
  b.add(new THREE.SphereGeometry(R * 0.16, 6, 4).scale(1.5, 0.35, 0.9), LEAF, place(-R * 0.2, cy + R * sy, R * 0.12));
  if (carved && glow) face(glow, place, R, cy, GLOW);
}

// ------------------------------------------------------------------------------------- cargo

function jackOLantern(k: Kit, c: string): void {
  k.add(ribbed(0.024, 0.8), c, M(0, -0.004, 0));
  k.cyl(0.003, 0.0045, 0.009, STEM, 0.001, 0.019, 0, 0, 0, -0.3, 6);
  k.sph(0.005, LEAF, -0.006, 0.016, 0.003, 1.4, 0.4, 0.9, 6);
  for (const s of [-1, 1]) k.add(triZ(0.0052, 0.004), CARVE, M(s * 0.008, 0.0, 0.0205));
  k.add(triZ(0.0026, 0.004), CARVE, M(0, -0.005, 0.0225));
  k.tor(0.0085, 0.002, CARVE, 0, -0.006, 0.0205, 0, 0, Math.PI, 10, Math.PI);
}

function ghost(k: Kit, c: string): void {
  k.sph(0.016, c, 0, 0.01, 0, 1, 1.05, 1, 12);
  k.cyl(0.016, 0.021, 0.024, c, 0, -0.008, 0, 0, 0, 0, 12);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    k.sph(0.0055, c, Math.cos(a) * 0.018, -0.02, Math.sin(a) * 0.018, 1, 0.9, 1, 6);
  }
  for (const s of [-1, 1]) {
    k.sph(0.006, c, s * 0.02, 0.0, 0.002, 1.3, 0.7, 0.8, 6);
    k.sph(0.0032, INK, s * 0.006, 0.013, 0.0145, 1, 1.4, 0.6, 6);
    k.sph(0.0026, PINK, s * 0.011, 0.007, 0.0135, 1, 0.7, 0.4, 5);
  }
  k.sph(0.0025, INK, 0, 0.006, 0.016, 1, 1.2, 0.5, 6);
}

function witchHat(k: Kit, c: string): void {
  k.cyl(0.027, 0.027, 0.003, c, 0, -0.016, 0, 0, 0, 0, 16);
  k.cyl(0.006, 0.0145, 0.024, c, 0, -0.003, 0, 0, 0, 0, 12);
  k.cone(0.006, 0.014, c, 0.0045, 0.0144, 0, 0, 0, -0.7, 8);
  k.cyl(0.0132, 0.0146, 0.005, ORANGE, 0, -0.0115, 0, 0, 0, 0, 12);
  k.box(0.007, 0.006, 0.002, GOLD, 0, -0.0115, 0.0142);
  k.shape(starShape(0.004, 0.0018), 0.002, GOLD, M(-0.004, 0.002, 0.009, -0.35));
}

function candyCorn(k: Kit, c: string): void {
  const squash = (y: number) => M(0, y, 0, 0, 0, 0, 1, 1, 0.75);
  k.add(new THREE.SphereGeometry(0.017, 12, 6).scale(1, 0.3, 1), c, squash(-0.021));
  k.add(new THREE.CylinderGeometry(0.0125, 0.017, 0.016, 12), c, squash(-0.013));
  k.add(new THREE.CylinderGeometry(0.0075, 0.0125, 0.015, 12), ORANGE, squash(0.0025));
  k.add(new THREE.ConeGeometry(0.0075, 0.014, 12), WHITE, squash(0.017));
}

function wrappedCandy(k: Kit, c: string): void {
  k.sph(0.0125, c, 0, 0, 0, 1.35, 1, 1, 12);
  for (const s of [-1, 1]) {
    k.tor(0.0118, 0.0016, WHITE, s * 0.007, 0, 0, 0, Math.PI / 2, 0, 12);
    k.cone(0.009, 0.013, shadeHex(c, 25), s * 0.0225, 0, 0, 0, 0, s * (Math.PI / 2), 8);
  }
}

function candyApple(k: Kit, c: string): void {
  k.sph(0.019, c, 0, -0.004, 0, 1, 0.92, 1, 14);
  k.cyl(0.019, 0.022, 0.004, shadeHex(c, -30), 0, -0.02, 0, 0, 0, 0, 14);
  k.cyl(0.0022, 0.0022, 0.024, '#e8c99a', 0, 0.02, 0, 0, 0, 0, 6);
  k.sph(0.0045, WHITE, 0.007, 0.006, 0.014, 1, 1.3, 0.5, 6);
  for (const s of [-1, 1]) k.sph(0.0035, LEAF, s * 0.004, 0.013, 0, 1.3, 0.6, 0.8, 6);
}

function spider(k: Kit, c: string): void {
  const leg = shadeHex(c, -45);
  k.sph(0.016, c, 0, -0.004, -0.002, 1, 0.82, 1.05, 12);
  for (const s of [-1, 1]) {
    k.sph(0.0055, WHITE, s * 0.0062, 0.0, 0.0125, 1, 1.1, 0.7, 8);
    k.sph(0.0028, INK, s * 0.0062, 0.0, 0.0165, 1, 1, 0.6, 6);
    for (const z of [-0.011, -0.004, 0.003, 0.01]) {
      k.cyl(0.0017, 0.0017, 0.012, leg, s * 0.018, 0.001, z, 0, 0, -s * 0.93, 5);
      k.cyl(0.0016, 0.0016, 0.013, leg, s * 0.026, -0.009, z, 0, 0, s * 0.38, 5);
    }
  }
  k.tor(0.0035, 0.0011, INK, 0, -0.007, 0.0145, 0, 0, Math.PI, 8, Math.PI);
}

const WING: [number, number][] = [[0.004, 0.004], [0.014, 0.012], [0.024, 0.012], [0.031, 0.004], [0.026, 0.0], [0.022, -0.006], [0.017, -0.001], [0.012, -0.007], [0.008, -0.002], [0.004, -0.004]];

function bat(k: Kit, c: string): void {
  const wing = shadeHex(c, -18);
  k.sph(0.0105, c, 0, -0.001, 0, 1, 1.12, 0.95, 10);
  for (const s of [-1, 1]) {
    k.shape(polygon(WING.map(([x, y]) => [s * x, y] as [number, number])), 0.002, wing, M(0, 0, -0.001));
    k.cone(0.0035, 0.008, c, s * 0.0055, 0.013, 0, 0, 0, -s * 0.3, 6);
    k.sph(0.003, WHITE, s * 0.004, 0.003, 0.0085, 1, 1, 0.6, 6);
    k.sph(0.0016, INK, s * 0.004, 0.003, 0.0105, 1, 1, 0.6, 5);
    k.cone(0.0012, 0.003, WHITE, s * 0.0022, -0.0045, 0.009, Math.PI, 0, 0, 4);
  }
}

function cauldron(k: Kit, c: string): void {
  k.sph(0.02, c, 0, -0.004, 0, 1, 0.85, 1, 14);
  k.tor(0.0155, 0.003, shadeHex(c, -20), 0, 0.01, 0, Math.PI / 2, 0, 0, 14);
  k.cyl(0.0155, 0.0155, 0.002, LIME, 0, 0.0105, 0, 0, 0, 0, 12);
  k.sph(0.0045, LIME, 0.004, 0.014, 0.004, 1, 1, 1, 6);
  k.sph(0.0032, LIME, -0.006, 0.014, -0.003, 1, 1, 1, 6);
  k.sph(0.0024, '#ccff99', -0.001, 0.021, 0.001, 1, 1, 1, 5);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.5;
    k.cyl(0.0025, 0.002, 0.007, shadeHex(c, -30), Math.cos(a) * 0.012, -0.021, Math.sin(a) * 0.012, 0, 0, 0, 5);
  }
}

function potion(k: Kit, c: string): void {
  k.sph(0.016, c, 0, -0.009, 0, 1, 1, 1, 12);
  k.cyl(0.0055, 0.0068, 0.013, c, 0, 0.011, 0, 0, 0, 0, 10);
  k.tor(0.006, 0.0016, PURPLE, 0, 0.008, 0, Math.PI / 2, 0, 0, 10);
  k.cyl(0.0058, 0.005, 0.007, '#c98a52', 0, 0.0205, 0, 0, 0, 0, 8);
  k.shape(starShape(0.0065, 0.003), 0.002, GOLD, M(0, -0.009, 0.0155));
  k.sph(0.0035, WHITE, -0.007, -0.002, 0.012, 1, 1.4, 0.5, 6);
}

function broom(k: Kit, c: string): void {
  const tilt = 0.35;
  const at = (d: number) => [Math.cos(tilt) * d, Math.sin(tilt) * d] as const;
  const [hx, hy] = at(0.01);
  k.cyl(0.0024, 0.0024, 0.046, shadeHex(c, -25), hx, hy, 0, 0, 0, -Math.PI / 2 + tilt, 6);
  const [bx, by] = at(-0.021);
  k.cone(0.012, 0.024, shadeHex(c, 18), bx, by, 0, 0, 0, -Math.PI / 2 + tilt, 10);
  const [tx, ty] = at(-0.011);
  k.cyl(0.0058, 0.0058, 0.004, PURPLE, tx, ty, 0, 0, 0, -Math.PI / 2 + tilt, 8);
}

// ------------------------------------------------------------------------------------- props

const placer = (m: PropContext['m']): Place => (x, y, z) => m(x, y, z);

/** A pumpkin: variant 0 a big glowing jack-o'-lantern, 1 a plain one, 2 a tall carved one. */
function pumpkinProp({ b, glow, m, variant }: PropContext): void {
  const v = variant % 3;
  pumpkin(b, glow, placer(m), [0.22, 0.15, 0.17][v] as number, v !== 1, v === 2);
}

/** A friendly sheet ghost, hovering a little, face toward +x; variant 1 wears a bow. */
function ghostProp({ b, m, variant }: PropContext): void {
  const g = '#fbf8ff';
  b.add(new THREE.SphereGeometry(0.15, 14, 10), g, m(0, 0.4, 0));
  b.add(new THREE.CylinderGeometry(0.15, 0.2, 0.26, 14), g, m(0, 0.24, 0));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    b.add(new THREE.SphereGeometry(0.05, 8, 6), g, m(Math.cos(a) * 0.17, 0.11, Math.sin(a) * 0.17));
  }
  for (const s of [-1, 1]) {
    b.add(new THREE.SphereGeometry(0.06, 8, 6).scale(0.8, 0.7, 1.5), g, m(0.03, 0.3, s * 0.19));
    b.add(new THREE.SphereGeometry(0.03, 8, 6).scale(0.6, 1.4, 1), INK, m(0.135, 0.43, s * 0.055));
    b.add(new THREE.SphereGeometry(0.024, 8, 6).scale(0.5, 0.7, 1), PINK, m(0.13, 0.37, s * 0.1));
  }
  b.add(new THREE.SphereGeometry(0.022, 8, 6).scale(0.6, 1.2, 1), INK, m(0.145, 0.36, 0));
  if (variant % 2) {
    for (const s of [-1, 1]) b.add(new THREE.SphereGeometry(0.05, 8, 6).scale(0.5, 0.8, 1.2), PINK, m(0, 0.55, s * 0.05));
    b.add(new THREE.SphereGeometry(0.025, 8, 6), PINK, m(0, 0.55, 0));
  }
}

/** A black cat sitting, glowing eyes toward +x, tail curled up. */
function catProp({ b, glow, m }: PropContext): void {
  b.add(new THREE.SphereGeometry(0.11, 12, 10).scale(0.9, 1.15, 0.85), CAT, m(0, 0.12, 0));
  b.add(new THREE.SphereGeometry(0.09, 12, 10), CAT, m(0.03, 0.3, 0));
  for (const s of [-1, 1]) {
    b.add(new THREE.ConeGeometry(0.038, 0.08, 4), CAT, m(0.02, 0.39, s * 0.05).multiply(new THREE.Matrix4().makeRotationX(s * 0.3)));
    b.add(new THREE.ConeGeometry(0.02, 0.04, 4), PINK, m(0.035, 0.38, s * 0.052).multiply(new THREE.Matrix4().makeRotationX(s * 0.3)));
    glow.add(new THREE.SphereGeometry(0.024, 8, 6).scale(0.5, 1.15, 1), LIME, m(0.105, 0.315, s * 0.038));
    b.add(new THREE.BoxGeometry(0.01, 0.03, 0.008), INK, m(0.118, 0.315, s * 0.038));
    b.add(new THREE.SphereGeometry(0.035, 8, 6).scale(1.3, 0.6, 0.8), CAT, m(0.07, 0.02, s * 0.05));
    for (const dz of [-0.025, 0.025]) b.add(new THREE.BoxGeometry(0.004, 0.004, 0.07), WHITE, m(0.11, 0.285, s * (0.06 + dz * 0.2)).multiply(new THREE.Matrix4().makeRotationX(dz * 6)));
  }
  b.add(new THREE.SphereGeometry(0.012, 6, 5), PINK, m(0.12, 0.29, 0));
  b.add(new THREE.TorusGeometry(0.065, 0.014, 5, 14).rotateX(Math.PI / 2), ORANGE, m(0.02, 0.23, 0));
  b.add(new THREE.SphereGeometry(0.018, 8, 6), GOLD, m(0.085, 0.21, 0));
  b.add(new THREE.TorusGeometry(0.09, 0.022, 6, 12, Math.PI * 1.3).rotateZ(-0.6), CAT, m(-0.16, 0.12, 0));
}

/** A purple picket fence, 0.9 long. */
function fenceProp({ b, m }: PropContext): void {
  for (let i = 0; i < 5; i++) {
    b.add(new THREE.BoxGeometry(0.03, 0.24, 0.07), DEEP, m(0, 0.12, -0.4 + i * 0.2));
    b.add(new THREE.ConeGeometry(0.05, 0.07, 4).rotateY(Math.PI / 4).scale(0.45, 1, 1), DEEP, m(0, 0.275, -0.4 + i * 0.2));
  }
  for (const y of [0.07, 0.18]) b.add(new THREE.BoxGeometry(0.03, 0.03, 0.88), PURPLE, m(-0.03, y, 0));
}

/** The witch's cauldron on a little fire, bubbling green, a ladle in it. */
function cauldronProp({ b, glow, m }: PropContext): void {
  const pot = '#3b3450';
  b.add(new THREE.SphereGeometry(0.22, 16, 12).scale(1, 0.85, 1), pot, m(0, 0.3, 0));
  b.add(new THREE.TorusGeometry(0.17, 0.03, 6, 18).rotateX(Math.PI / 2), shadeHex(pot, 15), m(0, 0.46, 0));
  glow.add(new THREE.CylinderGeometry(0.165, 0.165, 0.02, 16), LIME, m(0, 0.46, 0));
  for (const [x, y, z, r] of [[0.05, 0.5, 0.04, 0.04], [-0.07, 0.49, -0.03, 0.03], [0.02, 0.56, -0.06, 0.025], [-0.03, 0.63, 0.02, 0.02], [0.04, 0.7, 0.0, 0.015]] as const) glow.add(new THREE.SphereGeometry(r, 8, 6), LIME, m(x, y, z));
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.3;
    b.add(new THREE.CylinderGeometry(0.025, 0.02, 0.14, 6), shadeHex(pot, -10), m(Math.cos(a) * 0.15, 0.07, Math.sin(a) * 0.15));
  }
  for (const a of [0.4, -0.4]) b.add(new THREE.CylinderGeometry(0.025, 0.025, 0.26, 6).rotateZ(Math.PI / 2), '#8a5a2e', m(0, 0.025, 0, a));
  glow.add(new THREE.ConeGeometry(0.06, 0.12, 7), ORANGE, m(0, 0.08, 0));
  glow.add(new THREE.ConeGeometry(0.035, 0.08, 6), GLOW, m(0.03, 0.07, 0.02));
  b.add(new THREE.CylinderGeometry(0.012, 0.012, 0.36, 6), '#c98a52', m(-0.06, 0.55, 0.06).multiply(new THREE.Matrix4().makeRotationZ(0.5)));
}

/** A broom leaning toward +x, bristles on the floor. */
function broomProp({ b, mr }: PropContext): void {
  const lean = (x: number, y: number) => mr(x, y, 0, 0, 0, -0.32);
  b.add(new THREE.CylinderGeometry(0.018, 0.018, 0.72, 6).translate(0, 0.5, 0), '#8a5a2e', lean(0, 0));
  b.add(new THREE.ConeGeometry(0.11, 0.24, 9).translate(0, 0.12, 0), '#e8c35a', lean(0, 0));
  b.add(new THREE.CylinderGeometry(0.045, 0.05, 0.035, 9).translate(0, 0.21, 0), PURPLE, lean(0, 0));
}

/** A pumpkin trick-or-treat pail heaped with sweets, more spilt on the floor toward +x. */
function pailProp({ b, glow, m, variant }: PropContext): void {
  b.add(new THREE.CylinderGeometry(0.15, 0.12, 0.2, 14), ORANGE, m(0, 0.1, 0));
  b.add(new THREE.TorusGeometry(0.15, 0.015, 5, 16).rotateX(Math.PI / 2), shadeHex(ORANGE, -15), m(0, 0.2, 0));
  b.add(new THREE.TorusGeometry(0.14, 0.01, 4, 12, Math.PI), CAT, m(0, 0.2, 0, Math.PI / 2));
  face(glow, (x, y, z) => m(x * 0.88, y, z), 0.16, 0.1, GLOW);
  for (let i = 0; i < 6; i++) {
    const a = i * 2.1;
    b.add(new THREE.SphereGeometry(0.045, 8, 6), CANDY[(i + variant) % CANDY.length] as string, m(Math.cos(a) * 0.07, 0.21 + (i % 2) * 0.03, Math.sin(a) * 0.07));
  }
  const spill: [number, number, number][] = [[0.24, 0.05, 0.4], [0.34, -0.1, 1.5], [0.42, 0.12, 2.4], [0.55, -0.02, 0.9], [0.3, 0.2, 2]];
  spill.forEach(([x, z, yaw], i) => sweet(b, m, x, z, yaw, CANDY[(i + variant + 2) % CANDY.length] as string));
}

function sweet(b: GeoBatch, m: PropContext['m'], x: number, z: number, yaw: number, c: string): void {
  b.add(new THREE.SphereGeometry(0.035, 8, 6).scale(1.3, 0.9, 1), c, m(x, 0.032, z, yaw));
  for (const s of [-1, 1]) b.add(new THREE.ConeGeometry(0.026, 0.04, 6).rotateZ(s * (Math.PI / 2)), shadeHex(c, 25), m(x + Math.cos(yaw) * s * 0.06, 0.032, z - Math.sin(yaw) * s * 0.06, yaw));
}

/** A little scatter of wrapped sweets and candy corn. */
function candyProp({ b, m, variant }: PropContext): void {
  const spots: [number, number, number][] = [[0, 0, 0.3], [0.18, 0.12, 1.8], [-0.16, 0.1, 2.6], [0.1, -0.18, 1.1], [-0.12, -0.14, 0.2]];
  spots.forEach(([x, z, yaw], i) => sweet(b, m, x, z, yaw, CANDY[(i + variant) % CANDY.length] as string));
  for (const [x, z] of [[0.3, -0.02], [-0.3, 0.02], [0.02, 0.26]] as const) {
    b.add(new THREE.CylinderGeometry(0.03, 0.04, 0.04, 8), '#ffd23f', m(x, 0.02, z));
    b.add(new THREE.CylinderGeometry(0.018, 0.03, 0.035, 8), ORANGE, m(x, 0.057, z));
    b.add(new THREE.ConeGeometry(0.018, 0.035, 8), WHITE, m(x, 0.092, z));
  }
}

/** A cute bat with wings spread (span along z), face toward +x; hang it in the air with dy. */
function batProp({ b, m }: PropContext): void {
  const fur = '#4a3070';
  b.add(new THREE.SphereGeometry(0.06, 10, 8).scale(0.9, 1.1, 0.9), fur, m(0, 0, 0));
  const wing = new THREE.ExtrudeGeometry(polygon(WING.map(([x, y]) => [x * 6.5, y * 6.5] as [number, number])), { depth: 0.012, bevelEnabled: false });
  for (const s of [-1, 1]) {
    const g = wing.clone().translate(0, 0, -0.006).scale(s, 1, 1).rotateY(Math.PI / 2);
    b.add(g, shadeHex(fur, -12), m(0, 0, 0, 0).multiply(new THREE.Matrix4().makeRotationX(s * -0.25)));
    b.add(new THREE.ConeGeometry(0.02, 0.05, 5), fur, m(0, 0.075, s * 0.03).multiply(new THREE.Matrix4().makeRotationX(s * 0.3)));
    b.add(new THREE.SphereGeometry(0.018, 8, 6), WHITE, m(0.045, 0.015, s * 0.024));
    b.add(new THREE.SphereGeometry(0.01, 6, 5), INK, m(0.06, 0.015, s * 0.024));
    b.add(new THREE.ConeGeometry(0.007, 0.018, 4).rotateX(Math.PI), WHITE, m(0.05, -0.028, s * 0.012));
  }
  wing.dispose();
}

/** A hay bale. */
function hayProp({ b, m }: PropContext): void {
  b.add(new THREE.BoxGeometry(0.4, 0.2, 0.26), '#ebc65a', m(0, 0.1, 0));
  for (const x of [-0.1, 0.1]) b.add(new THREE.BoxGeometry(0.025, 0.205, 0.265), '#b8892e', m(x, 0.1, 0));
}

/** Pumpkin vines curling over the ground with a few leaves. */
function vineProp({ b, m, variant }: PropContext): void {
  for (let i = 0; i < 3; i++) {
    b.add(new THREE.TorusGeometry(0.1 + i * 0.03, 0.012, 4, 10, Math.PI * 1.2).rotateX(Math.PI / 2), STEM, m(-0.2 + i * 0.2, 0.012, (i % 2 ? 0.05 : -0.05), variant + i * 1.7));
    b.add(new THREE.SphereGeometry(0.06, 7, 4).scale(1.3, 0.25, 1), LEAF, m(-0.15 + i * 0.2, 0.02, i % 2 ? -0.08 : 0.1, i));
  }
}

// ------------------------------------------------------------------------------------- the skin

const FRONT = -Math.PI / 2;

const skin: HolidaySkin = {
  id: 'halloween',
  name: 'Halloween',
  greeting: 'Happy Halloween!',
  cargo: { orange: jackOLantern, white: ghost, purple: witchHat, yellow: candyCorn, pink: wrappedCandy, red: candyApple, green: spider, blue: bat, gray: cauldron, teal: potion, brown: broom },
  props: {
    'hw.pumpkin': pumpkinProp,
    'hw.ghost': ghostProp,
    'hw.cat': catProp,
    'hw.fence': fenceProp,
    'hw.cauldron': cauldronProp,
    'hw.broom': broomProp,
    'hw.pail': pailProp,
    'hw.candy': candyProp,
    'hw.bat': batProp,
    'hw.hay': hayProp,
    'hw.vine': vineProp,
  },
  inside: [
    {
      name: 'pumpkinPatch', w: 2, h: 2,
      items: [['hw.vine', 0, 0.1, 0, 1.3, 0, 0], ['hw.pumpkin', 0.05, -0.05, FRONT, 1.25, 0, 0], ['hw.pumpkin', 0.6, 0.45, FRONT + 0.4, 1, 0, 2], ['hw.pumpkin', -0.55, 0.5, FRONT, 1, 0, 1], ['hw.pumpkin', 0.62, -0.5, FRONT - 0.5, 0.9, 0, 1], ['hw.hay', -0.55, -0.45, 0.3, 1], ['hw.cat', -0.55, -0.45, FRONT + 0.3, 0.9, 0.2]],
    },
    {
      name: 'witchBrew', w: 2, h: 2,
      items: [['hw.cauldron', -0.05, 0, 0, 1.15], ['hw.broom', 0.42, -0.2, 0, 1], ['toy:kite', -0.6, 0.45, 0, 0.5], ['toy:iceCream', -0.4, 0.62, 0.6, 0.42], ['toy:star', 0.55, 0.5, 0.4, 0.55], ['hw.bat', -0.55, -0.45, 'face', 0.9, 0.75]],
    },
    {
      name: 'trickOrTreat', w: 2, h: 1,
      items: [['hw.ghost', -0.65, 0, FRONT + 0.5, 0.95, 0, 0], ['hw.pail', -0.15, 0.05, FRONT + 0.9, 1], ['hw.candy', 0.35, 0.12, 0, 0.9], ['hw.ghost', 0.72, -0.05, FRONT - 0.5, 0.7, 0, 1]],
    },
    {
      name: 'catOnFence', w: 2, h: 1,
      items: [['hw.fence', 0, -0.22, Math.PI / 2, 1.05], ['hw.cat', 0.1, -0.22, FRONT, 0.75, 0.24], ['hw.pumpkin', -0.55, 0.15, FRONT, 0.9, 0, 0], ['hw.pumpkin', 0.62, 0.18, FRONT + 0.3, 0.8, 0, 2], ['hw.bat', -0.2, 0.1, FRONT, 0.7, 0.75]],
    },
    {
      name: 'ghostParade', w: 2, h: 1,
      items: [['hw.ghost', -0.6, 0, FRONT + 0.6, 0.9, 0.05, 0], ['hw.ghost', -0.05, 0.05, FRONT + 0.3, 0.72, 0.05, 1], ['hw.ghost', 0.42, 0.05, FRONT, 0.56, 0.05, 0], ['hw.pumpkin', 0.8, -0.05, FRONT, 0.6, 0, 0]],
    },
  ],
  outside: [
    {
      name: 'bigPatch', w: 2.4, h: 0,
      items: [['hw.pumpkin', 0, 0, FRONT, 4, 0, 0], ['hw.pumpkin', 1.35, 0.55, FRONT + 0.3, 3, 0, 2], ['hw.pumpkin', -1.3, 0.6, FRONT, 2.6, 0, 1], ['hw.vine', 0.2, 1.2, 0, 4], ['hw.hay', -1.1, -0.8, 0.2, 3.2], ['hw.cat', -1.1, -0.8, FRONT + 0.4, 2.8, 0.62]],
    },
    {
      name: 'cauldron', w: 2.2, h: 0,
      items: [['hw.cauldron', 0, 0, 0, 3.6], ['hw.broom', 1.3, -0.3, 0, 3.4], ['hw.bat', -1.1, 0.4, FRONT + 0.5, 2.6, 2.4], ['hw.bat', 0.6, 0.6, FRONT - 0.4, 2.2, 3]],
    },
    {
      name: 'trickOrTreaters', w: 2.4, h: 0,
      items: [['hw.ghost', -0.8, 0, FRONT + 0.4, 3.2, 0, 1], ['hw.ghost', 0.5, 0.3, FRONT - 0.3, 2.5, 0, 0], ['hw.pail', -0.1, 1.0, FRONT + 0.7, 3], ['hw.fence', 0, -1.1, Math.PI / 2, 3], ['hw.cat', 0.9, -1.1, FRONT, 2.4, 0.72]],
    },
  ],
  edge(b, glow, spot) {
    const at = (x: number, y: number, z: number, yaw = spot.yaw): Place => {
      const c = Math.cos(spot.yaw);
      const sn = Math.sin(spot.yaw);
      return local(new THREE.Matrix4().compose(new THREE.Vector3(spot.x + x * c + z * sn, y, spot.z - x * sn + z * c), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw), new THREE.Vector3(1, 1, 1)));
    };
    if (spot.corner) {
      // A big glowing jack-o'-lantern on each corner, a small one beside it, both facing the camera.
      pumpkin(b, glow, at(0.06, 0, 0, FRONT), 0.2, true);
      pumpkin(b, glow, at(0.14, 0, spot.z > 0 ? 0.26 : -0.26, FRONT), 0.11, spot.index % 2 === 0, true);
      return;
    }
    // A vine along the rim with a little pumpkin (every other one carved) and a purple light.
    b.add(new THREE.CapsuleGeometry(0.025, 0.55, 3, 6).rotateX(Math.PI / 2), STEM, at(0.03, 0.02, 0)(0, 0, 0));
    for (const z of [-0.18, 0.18]) b.add(new THREE.SphereGeometry(0.05, 7, 4).scale(1.2, 0.3, 1), LEAF, at(0.05, 0.035, z)(0, 0, 0));
    pumpkin(b, glow, at(0.07, 0, -0.04, FRONT), 0.11, spot.index % 2 === 0);
    glow.add(new THREE.SphereGeometry(0.03, 8, 6), spot.index % 2 ? PURPLE : ORANGE, at(0.05, 0.05, 0.25)(0, 0, 0));
  },
  station(b, f) {
    const w = f.width / 2;
    // Orange, purple and black bunting along the eaves.
    b.add(new THREE.BoxGeometry(f.width, 0.008, 0.008), CAT, f.m(0, f.roofY - 0.01, f.frontZ + 0.03));
    for (let x = -w + 0.08, i = 0; x < w - 0.04; x += 0.13, i++) b.add(triZ(0.05, 0.01, true), [ORANGE, PURPLE, CAT][i % 3] as string, f.m(x, f.roofY - 0.045, f.frontZ + 0.035));
    // Cobwebs in the top corners of the front wall, a little green spider on a thread.
    for (const s of [-1, 1]) {
      const cx = s * (w - 0.01);
      const cy = f.roofY - 0.01;
      const z = f.frontZ + 0.02;
      const angles = [0, 0.4, 0.8, 1.2, 1.57].map((a) => (s > 0 ? Math.PI + a : -a));
      const len = 0.2;
      for (const a of angles) b.add(new THREE.BoxGeometry(len, 0.006, 0.006), '#f4f0ff', f.m(cx + Math.cos(a) * len * 0.5, cy + Math.sin(a) * len * 0.5, z, 0, 0, a));
      for (const r of [0.08, 0.15]) {
        for (let i = 0; i + 1 < angles.length; i++) {
          const a0 = angles[i] as number;
          const a1 = angles[i + 1] as number;
          const x0 = cx + Math.cos(a0) * r;
          const y0 = cy + Math.sin(a0) * r;
          const x1 = cx + Math.cos(a1) * r * 0.9;
          const y1 = cy + Math.sin(a1) * r * 0.9;
          b.add(new THREE.BoxGeometry(Math.hypot(x1 - x0, y1 - y0), 0.005, 0.005), '#f4f0ff', f.m((x0 + x1) / 2, (y0 + y1) / 2, z, 0, 0, Math.atan2(y1 - y0, x1 - x0)));
        }
      }
    }
    b.add(new THREE.CylinderGeometry(0.003, 0.003, 0.12, 4), '#f4f0ff', f.m(w - 0.12, f.roofY - 0.11, f.frontZ + 0.03));
    b.add(new THREE.SphereGeometry(0.025, 8, 6), '#5fd36a', f.m(w - 0.12, f.roofY - 0.18, f.frontZ + 0.03));
    // A jack-o'-lantern either side of the door.
    for (const s of [-1, 1]) {
      const place = local(f.m(s * 0.44, 0, f.frontZ + 0.1, 0, FRONT, 0));
      pumpkin(b, null, place, 0.07, false);
      face(b, place, 0.07, 0.07 * 0.78 * 0.97, GLOW);
    }
  },
  engine(b) {
    // A witch hat on the cab roof.
    b.cylinder(0.1, 0.1, 0.012, PURPLE, -0.17, 0.432, 0, 18);
    b.cylinder(0.036, 0.066, 0.1, PURPLE, -0.17, 0.488, 0, 14);
    b.cylinder(0.064, 0.068, 0.024, ORANGE, -0.17, 0.452, 0, 14);
    b.add(new THREE.ConeGeometry(0.036, 0.09, 12), PURPLE, new THREE.Matrix4().compose(new THREE.Vector3(-0.195, 0.574, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0.6)), new THREE.Vector3(1, 1, 1)));
    b.box(0.03, 0.026, 0.012, GOLD, -0.17, 0.452, 0.066);
  },
  light: { background: '#2a1a40', sunColor: '#ffc890', sunIntensity: 2.45, hemiSky: '#d6bfff', hemiGround: '#5a3070', hemiIntensity: 1.2 },
  fx: { kind: 'leaves', colors: ['#ff8a1f', '#e0601a', '#9a5a2a', '#f2b33a'], count: 45 },
};

export default skin;
