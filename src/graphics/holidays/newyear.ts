// New Year (31 December – 1 January): a countdown party. A big clock about to strike midnight,
// toy fireworks bursting on sticks, a party table with a cake and poppers, a disco ball with toys
// dancing under it, balloons and streamers round the diorama and on the station, a party hat on
// the engine and confetti in the air. Party hats, balloons, clocks and noisemakers ride the wagons.
import * as THREE from 'three';
import type { HolidaySkin, Item, PropContext } from '../holiday';
import { INK, M, WHITE, letter, paintFaces, shadeHex, starShape, type Kit } from '../toyModels';

const GOLD = '#f2c23a';
const SILVER = '#d9dee8';
const PARTY = ['#ff3d7f', '#ffd23f', '#3fb8ff', '#7be04a', '#b05cff', '#ff8a2a', '#2fe0c8'];
const party = (i: number) => PARTY[((i % PARTY.length) + PARTY.length) % PARTY.length] as string;

/** Spiral stripes on a cone or tube (party hats, horns, poppers). */
const stripes = (a: string, b: string, n: number, twist: number) => (x: number, y: number, z: number) =>
  Math.floor(((Math.atan2(z, x) / (Math.PI * 2) + 0.5) * n + y * twist) % 2) ? a : b;

/** A disco ball's mirror tiles. */
const mirror = (c: string) => (x: number, y: number, z: number) => {
  const k = Math.floor(Math.atan2(z, x) * 3) + Math.floor(y * 400);
  return k % 5 === 0 ? WHITE : k % 2 ? shadeHex(c, 35) : c;
};

// ------------------------------------------------------------------------------------- cargo

function partyHat(k: Kit, c: string): void {
  k.parts.push(paintFaces(new THREE.ConeGeometry(0.02, 0.044, 12, 4), stripes(c, WHITE, 6, 160)).translate(0, -0.004, 0));
  k.tor(0.0195, 0.0022, GOLD, 0, -0.026, 0, Math.PI / 2, 0, 0, 14);
  k.sph(0.0065, GOLD, 0, 0.02, 0, 1, 1, 1, 8);
}

function balloon(k: Kit, c: string): void {
  k.sph(0.019, c, 0, 0.007, 0, 1, 1.18, 1, 14);
  k.sph(0.005, WHITE, -0.007, 0.016, 0.014, 1, 1.4, 0.6, 6);
  k.cone(0.004, 0.006, shadeHex(c, -25), 0, -0.016, 0, Math.PI, 0, 0, 6);
  k.cyl(0.001, 0.001, 0.014, WHITE, 0.002, -0.026, 0, 0, 0, 0.25, 4);
}

function alarmClock(k: Kit, c: string): void {
  k.cyl(0.02, 0.02, 0.014, c, 0, 0, 0, Math.PI / 2, 0, 0, 16);
  k.cyl(0.016, 0.016, 0.002, WHITE, 0, 0, 0.0075, Math.PI / 2, 0, 0, 16);
  for (let i = 0; i < 4; i++) k.sph(0.0016, INK, Math.sin((i * Math.PI) / 2) * 0.013, Math.cos((i * Math.PI) / 2) * 0.013, 0.009, 1, 1, 1, 4);
  // Both hands nearly at twelve: a minute to midnight.
  k.box(0.0018, 0.013, 0.0015, INK, 0, 0.0055, 0.0095);
  k.box(0.0022, 0.009, 0.0015, '#e8303a', -0.0008, 0.004, 0.0105, 0, 0, 0.18);
  for (const s of [-1, 1]) {
    k.dome(0.008, GOLD, s * 0.012, 0.018, 0, 1, 1, 1, 8);
    k.cyl(0.0015, 0.0015, 0.008, shadeHex(c, -30), s * 0.012, -0.021, 0, 0, 0, s * 0.5, 5);
  }
  k.sph(0.0025, GOLD, 0, 0.024, 0, 1, 1, 1, 5);
}

function discoBall(k: Kit, c: string): void {
  k.parts.push(paintFaces(new THREE.SphereGeometry(0.022, 12, 8), mirror(c)));
  k.cyl(0.004, 0.005, 0.005, SILVER, 0, 0.023, 0, 0, 0, 0, 8);
  k.tor(0.004, 0.0012, SILVER, 0, 0.029, 0, 0, 0, 0, 8);
  k.sph(0.003, WHITE, 0.01, 0.012, 0.016, 1, 1, 1, 5);
}

function rocket(k: Kit, c: string): void {
  k.cyl(0.009, 0.009, 0.03, c, 0, 0.002, 0, 0, 0, 0, 10);
  k.cyl(0.0095, 0.0095, 0.006, WHITE, 0, 0.006, 0, 0, 0, 0, 10);
  k.cone(0.0095, 0.014, '#e8303a', 0, 0.024, 0, 0, 0, 0, 10);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    k.box(0.008, 0.01, 0.002, '#3fb8ff', Math.cos(a) * 0.01, -0.01, Math.sin(a) * 0.01, 0, -a, 0);
  }
  k.cyl(0.0015, 0.0015, 0.02, '#a0703f', 0, -0.022, 0, 0, 0, 0, 5);
  k.sph(0.003, GOLD, 0, -0.016, 0, 1, 1, 1, 5);
}

function sparkler(k: Kit, c: string): void {
  k.cyl(0.0015, 0.0015, 0.03, SILVER, 0, -0.016, 0, 0, 0, 0, 5);
  k.shape(starShape(0.02, 0.009), 0.007, c, M(0, 0.008, 0), 0.002);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    k.sph(0.0025, i % 2 ? WHITE : '#ff8a2a', Math.cos(a) * 0.026, 0.008 + Math.sin(a) * 0.026, 0, 1, 1, 1, 4);
  }
}

function partyHorn(k: Kit, c: string): void {
  k.parts.push(paintFaces(new THREE.CylinderGeometry(0.012, 0.004, 0.036, 10, 4, true), stripes(c, WHITE, 2, 90)).rotateZ(Math.PI / 2).translate(0.006, 0, 0));
  k.tor(0.012, 0.002, GOLD, 0.024, 0, 0, 0, Math.PI / 2, 0, 12);
  k.cyl(0.004, 0.004, 0.01, shadeHex(c, -30), -0.016, 0, 0, 0, 0, Math.PI / 2, 8);
  k.cyl(0.011, 0.011, 0.002, shadeHex(c, 30), 0.024, 0, 0, 0, 0, Math.PI / 2, 10);
}

function popper(k: Kit, c: string): void {
  k.parts.push(paintFaces(new THREE.ConeGeometry(0.013, 0.034, 10, 3), stripes(c, WHITE, 4, 0)).rotateX(Math.PI).translate(0, -0.006, 0));
  k.tor(0.013, 0.002, GOLD, 0, 0.011, 0, Math.PI / 2, 0, 0, 12);
  k.cyl(0.001, 0.001, 0.012, WHITE, 0.004, -0.026, 0, 0, 0, 0.5, 4);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    k.box(0.006, 0.0015, 0.004, party(i), Math.cos(a) * 0.012, 0.018 + (i % 3) * 0.005, Math.sin(a) * 0.012, i, a, i * 0.7);
  }
}

function gift(k: Kit, c: string): void {
  k.box(0.04, 0.032, 0.04, c, 0, -0.005, 0);
  for (const [x, z] of [[0.0201, 0.01], [0.0201, -0.012], [-0.012, 0.0201], [0.01, 0.0201]] as const) k.sph(0.0035, WHITE, x, -0.008 + (x > 0.02 ? 0.006 : 0), z, x > 0.02 ? 0.3 : 1, 1, z > 0.02 ? 0.3 : 1, 5);
  k.box(0.042, 0.033, 0.008, GOLD, 0, -0.005, 0);
  k.box(0.008, 0.033, 0.042, GOLD, 0, -0.005, 0);
  for (const s of [-1, 1]) k.tor(0.008, 0.003, GOLD, s * 0.007, 0.016, 0, 0, s * 0.5, 0, 10);
}

function cake(k: Kit, c: string): void {
  k.cyl(0.022, 0.022, 0.016, c, 0, -0.016, 0, 0, 0, 0, 16);
  k.cyl(0.015, 0.015, 0.013, c, 0, -0.001, 0, 0, 0, 0, 14);
  k.tor(0.022, 0.0028, '#ff3d7f', 0, -0.008, 0, Math.PI / 2, 0, 0, 16);
  k.tor(0.015, 0.0025, '#3fb8ff', 0, 0.005, 0, Math.PI / 2, 0, 0, 14);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    k.box(0.004, 0.0015, 0.0015, party(i), Math.cos(a) * 0.017, -0.0075, Math.sin(a) * 0.017, 0, a, 0);
  }
  k.cyl(0.0022, 0.0022, 0.012, '#ff3d7f', 0, 0.012, 0, 0, 0, 0, 6);
  k.sph(0.003, '#ffb02e', 0, 0.021, 0, 1, 1.6, 1, 5);
}

// ------------------------------------------------------------------------------------- props

const tube = (pts: [number, number, number][], r: number, seg = 24) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(([x, y, z]) => new THREE.Vector3(x, y, z))), seg, r, 4);

/** A grandfather clock, about 1 tall, a minute before midnight. */
function bigClock({ b, glow, m }: PropContext): void {
  const wood = '#7a3fd0';
  b.add(new THREE.BoxGeometry(0.34, 0.06, 0.26), GOLD, m(0, 0.03, 0));
  b.add(new THREE.BoxGeometry(0.26, 0.6, 0.2), wood, m(0, 0.36, 0));
  b.add(new THREE.BoxGeometry(0.12, 0.34, 0.01), '#cdeefa', m(0, 0.34, 0.1));
  b.add(new THREE.CylinderGeometry(0.008, 0.008, 0.22, 5), GOLD, m(0, 0.4, 0.106));
  b.add(new THREE.CylinderGeometry(0.04, 0.04, 0.012, 12).rotateX(Math.PI / 2), GOLD, m(0, 0.28, 0.106));
  // The clock head leans back so its face looks up at the camera.
  const tilt = new THREE.Matrix4().makeRotationX(-0.6);
  const fm = (x: number, y: number, z: number, rz = 0) => m(0, 0.84, 0.02).multiply(tilt).multiply(new THREE.Matrix4().makeRotationZ(rz).setPosition(x, y, z));
  b.add(new THREE.CylinderGeometry(0.2, 0.2, 0.18, 20).rotateX(Math.PI / 2), wood, fm(0, 0, 0));
  b.add(new THREE.TorusGeometry(0.19, 0.024, 6, 24), GOLD, fm(0, 0, 0.09));
  glow.add(new THREE.CylinderGeometry(0.17, 0.17, 0.01, 20).rotateX(Math.PI / 2), '#fff6d6', fm(0, 0, 0.09));
  for (let i = 1; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    b.add(new THREE.SphereGeometry(0.014, 6, 4), INK, fm(Math.sin(a) * 0.14, Math.cos(a) * 0.14, 0.1));
  }
  b.add(letter('12', 0.06, 0.012), '#e8303a', fm(0, 0.125, 0.095));
  b.add(new THREE.BoxGeometry(0.024, 0.12, 0.012), INK, fm(0, 0.05, 0.104));
  b.add(new THREE.BoxGeometry(0.018, 0.09, 0.012), '#e8303a', fm(-0.006, 0.04, 0.112, 0.13));
  b.add(new THREE.SphereGeometry(0.022, 8, 6), GOLD, fm(0, 0, 0.114));
  b.add(new THREE.ConeGeometry(0.06, 0.1, 4), GOLD, m(0, 1.08, 0, Math.PI / 4));
  glow.add(new THREE.ExtrudeGeometry(starShape(0.06, 0.026), { depth: 0.02, bevelEnabled: false }).translate(0, 0, -0.01), '#ffd23f', m(0, 1.18, 0));
}

/** Three balloons tied to a little gift. */
function balloons({ b, m, mr, variant }: PropContext): void {
  b.add(new THREE.BoxGeometry(0.1, 0.08, 0.1), party(variant + 4), m(0, 0.04, 0));
  b.add(new THREE.BoxGeometry(0.105, 0.085, 0.02), GOLD, m(0, 0.04, 0));
  const tops: [number, number, number][] = [[-0.12, 0.72, 0.02], [0.1, 0.8, -0.05], [0.02, 0.62, 0.12]];
  tops.forEach(([x, y, z], i) => {
    const c = party(variant + i);
    b.add(tube([[0, 0.08, 0], [x * 0.4, y * 0.4, z * 0.5], [x, y - 0.11, z]], 0.005, 8), WHITE, m(0, 0, 0));
    b.add(new THREE.SphereGeometry(0.1, 12, 9).scale(1, 1.2, 1), c, m(x, y, z));
    b.add(new THREE.ConeGeometry(0.02, 0.03, 6).rotateX(Math.PI), shadeHex(c, -25), m(x, y - 0.12, z));
    b.add(new THREE.SphereGeometry(0.025, 6, 4).scale(1, 1.5, 0.5), WHITE, mr(x - 0.04, y + 0.05, z + 0.07, 0, 0, 0.3));
  });
}

/** A toy firework: a burst of glowing stars on a stick, planted in a little pot. */
function firework({ b, glow, m, variant }: PropContext): void {
  const c = party(variant);
  const h = 0.6 + (variant % 3) * 0.12;
  b.add(new THREE.CylinderGeometry(0.08, 0.06, 0.1, 10), party(variant + 3), m(0, 0.05, 0));
  b.add(new THREE.CylinderGeometry(0.012, 0.012, h, 6), '#a0703f', m(0, h / 2, 0));
  // The burst leans back toward the camera so it reads from above.
  const lean = new THREE.Matrix4().makeRotationX(-0.8);
  const bm = (x: number, y: number, rz = 0) => m(0, h, 0).multiply(lean).multiply(new THREE.Matrix4().makeRotationZ(rz).setPosition(x, y, 0));
  const star = (r: number) => new THREE.ExtrudeGeometry(starShape(r, r * 0.44), { depth: 0.02, bevelEnabled: false }).translate(0, 0, -0.01);
  glow.add(star(0.1), c, bm(0, 0));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    glow.add(new THREE.CylinderGeometry(0.01, 0.004, 0.17, 4), shadeHex(c, 40), bm(Math.cos(a) * 0.16, Math.sin(a) * 0.16, a - Math.PI / 2));
    glow.add(star(0.045), party(variant + 1 + (i % 2)), bm(Math.cos(a) * 0.28, Math.sin(a) * 0.28));
  }
}

/** A party table: tablecloth, a cake with a candle, hats and a popper. */
function table({ b, glow, m, mr, variant }: PropContext): void {
  b.add(new THREE.CylinderGeometry(0.34, 0.34, 0.03, 20), WHITE, m(0, 0.2, 0));
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    b.add(new THREE.SphereGeometry(0.045, 6, 4).scale(1, 1.2, 0.5), party(variant + i), m(Math.cos(a) * 0.34, 0.17, Math.sin(a) * 0.34, Math.PI / 2 - a));
  }
  b.add(new THREE.CylinderGeometry(0.04, 0.06, 0.18, 8), '#8b5a2b', m(0, 0.09, 0));
  b.add(new THREE.CylinderGeometry(0.13, 0.13, 0.02, 12), '#8b5a2b', m(0, 0.01, 0));
  b.add(new THREE.CylinderGeometry(0.14, 0.12, 0.015, 16), SILVER, m(0, 0.222, 0));
  b.add(new THREE.CylinderGeometry(0.11, 0.11, 0.08, 16), '#ff9fc4', m(0, 0.27, 0));
  b.add(new THREE.CylinderGeometry(0.075, 0.075, 0.06, 14), WHITE, m(0, 0.34, 0));
  b.add(new THREE.TorusGeometry(0.11, 0.014, 5, 16).rotateX(Math.PI / 2), WHITE, m(0, 0.31, 0));
  b.add(new THREE.TorusGeometry(0.075, 0.012, 5, 14).rotateX(Math.PI / 2), '#ff3d7f', m(0, 0.37, 0));
  b.add(new THREE.CylinderGeometry(0.01, 0.01, 0.06, 6), '#3fb8ff', m(0, 0.4, 0));
  glow.add(new THREE.SphereGeometry(0.016, 6, 5).scale(1, 1.6, 1), '#ffb02e', m(0, 0.445, 0));
  for (const [x, z, i] of [[0.22, 0.1, 0], [-0.2, -0.14, 1], [-0.12, 0.22, 2]] as const) {
    b.addColored(paintFaces(new THREE.ConeGeometry(0.04, 0.09, 10, 3), stripes(party(variant + i * 2), WHITE, 6, 30)), m(x, 0.26, z));
    b.add(new THREE.SphereGeometry(0.014, 6, 4), GOLD, m(x, 0.31, z));
  }
  b.add(new THREE.ConeGeometry(0.03, 0.09, 8).rotateZ(Math.PI / 2), '#2fe0c8', mr(0.12, 0.235, -0.2, 0, 0.4, 0));
}

/** A disco ball on a gold stand. */
function disco({ b, glow, m }: PropContext): void {
  b.add(new THREE.CylinderGeometry(0.16, 0.18, 0.04, 14), '#2b2340', m(0, 0.02, 0));
  b.add(new THREE.CylinderGeometry(0.015, 0.015, 0.9, 6), GOLD, m(0, 0.45, 0));
  b.add(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 6).rotateZ(Math.PI / 2), GOLD, m(0.11, 0.9, 0));
  b.add(new THREE.CylinderGeometry(0.004, 0.004, 0.12, 4), SILVER, m(0.2, 0.84, 0));
  b.addColored(paintFaces(new THREE.SphereGeometry(0.14, 14, 10), mirror('#b05cff')), m(0.2, 0.66, 0));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    glow.add(new THREE.OctahedronGeometry(0.022, 0), i % 2 ? WHITE : '#7ff6ff', m(0.2 + Math.cos(a) * 0.15, 0.66 + Math.sin(a * 2) * 0.06, Math.sin(a) * 0.15));
  }
  // A dance floor of coloured tiles.
  for (let i = 0; i < 9; i++) b.add(new THREE.BoxGeometry(0.15, 0.012, 0.15), party(i), m(0.2 + ((i % 3) - 1) * 0.16, 0.006, (Math.floor(i / 3) - 1) * 0.16 + 0.36));
}

/** A party hat sitting on the floor. */
function hat({ b, m, variant }: PropContext): void {
  b.addColored(paintFaces(new THREE.ConeGeometry(0.1, 0.24, 12, 4), stripes(party(variant), WHITE, 6, 30)), m(0, 0.12, 0));
  b.add(new THREE.TorusGeometry(0.1, 0.012, 5, 14).rotateX(Math.PI / 2), GOLD, m(0, 0.01, 0));
  b.add(new THREE.SphereGeometry(0.035, 8, 6), GOLD, m(0, 0.25, 0));
}

/** A curly streamer lying on the floor. */
function streamer({ b, m, variant }: PropContext): void {
  for (let s = 0; s < 2; s++) {
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= 16; i++) {
      const t = i / 16;
      pts.push([-0.4 + t * 0.8, 0.03 + Math.abs(Math.sin(t * 9 + s)) * 0.05, Math.cos(t * 12 + s * 2) * 0.06 + (s - 0.5) * 0.18]);
    }
    b.add(tube(pts, 0.012, 40), party(variant + s * 3), m(0, 0, 0));
  }
}

// ------------------------------------------------------------------------------------- the skin

const atSpot = (spot: { x: number; z: number; yaw: number }) => (x: number, y: number, z: number) => {
  const c = Math.cos(spot.yaw);
  const s = Math.sin(spot.yaw);
  return new THREE.Matrix4().compose(new THREE.Vector3(spot.x + x * c + z * s, y, spot.z - x * s + z * c), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), spot.yaw), new THREE.Vector3(1, 1, 1));
};

/** A teddy guest wearing a party hat (scenes inside the yard). */
const guest = (x: number, z: number, hatColor: number, yaw: number | 'face' = 'face'): Item[] => [
  ['toy:teddy', x, z, yaw, 0.55],
  ['ny.hat', x, z, 0, 1, 0.48, hatColor],
];

const skin: HolidaySkin = {
  id: 'newyear',
  name: 'New Year',
  greeting: 'Happy New Year!',
  cargo: { red: partyHat, pink: balloon, gray: alarmClock, purple: discoBall, orange: rocket, yellow: sparkler, green: partyHorn, teal: popper, blue: gift, white: cake },
  props: {
    'ny.clock': bigClock,
    'ny.balloons': balloons,
    'ny.firework': firework,
    'ny.table': table,
    'ny.disco': disco,
    'ny.hat': hat,
    'ny.streamer': streamer,
  },
  inside: [
    { name: 'countdown', w: 2, h: 2, items: [['ny.clock', 0, -0.2, 0, 1.05], ['ny.balloons', 0.6, 0.35, 0, 0.9, 0, 0], ['ny.balloons', -0.62, 0.3, 2, 0.8, 0, 3], ['ny.streamer', 0.05, 0.62, 0.2, 1, 0, 1], ['ny.hat', 0.6, -0.55, 0, 0.9, 0, 4]] },
    { name: 'partyTable', w: 2, h: 2, items: [['ny.table', 0, 0, 0, 1.3], ...guest(-0.64, 0, 1), ...guest(0.64, 0.04, 3), ...guest(0.02, 0.66, 5), ['ny.balloons', -0.62, -0.58, 0, 0.7, 0, 2], ['ny.streamer', 0.55, -0.6, 0.6, 0.8, 0, 5]] },
    { name: 'fireworks', w: 2, h: 1, items: [['ny.firework', -0.6, 0, 0, 0.85, 0, 1], ['ny.firework', 0, 0.1, 0, 0.85, 0, 3], ['ny.firework', 0.6, 0, 0, 0.85, 0, 5]] },
    { name: 'discoParty', w: 2, h: 2, items: [['ny.disco', -0.25, -0.25, 0, 1.05], ...guest(0.05, 0.45, 0, 0.6), ...guest(0.5, 0.2, 2, 2.6), ['ny.balloons', 0.65, -0.5, 0, 0.75, 0, 5], ['ny.hat', -0.6, 0.55, 0, 0.8, 0, 4]] },
    { name: 'balloonBunch', w: 2, h: 1, items: [['ny.balloons', -0.45, 0, 0, 0.9, 0, 1], ['ny.hat', 0.15, 0.1, 0, 0.9, 0, 0], ['ny.hat', 0.45, -0.1, 0, 0.75, 0, 2], ['ny.streamer', 0.4, 0.2, 1.2, 0.7, 0, 4]] },
  ],
  outside: [
    { name: 'bigClock', w: 2.4, h: 0, items: [['ny.clock', 0, 0, 0, 3.6], ['ny.balloons', 1.3, 0.6, 0.3, 3, 0, 0], ['ny.balloons', -1.3, 0.5, 1, 2.6, 0, 3], ['ny.streamer', 0, 1.3, 0.2, 3, 0, 2]] },
    { name: 'fireworkShow', w: 2.4, h: 0, items: [['ny.firework', 0, 0, 0, 4, 0, 0], ['ny.firework', 1.3, 0.5, 0.4, 3.4, 0, 3], ['ny.firework', -1.2, 0.6, -0.4, 3.2, 0, 5], ['ny.hat', 0.6, 1.3, 0, 2.5, 0, 0], ['ny.hat', -0.4, 1.4, 0, 2.2, 0, 2]] },
    { name: 'party', w: 2.2, h: 0, items: [['ny.table', -0.6, 0.3, 0, 3.4], ['ny.disco', 1.0, -0.4, 0.3, 3]] },
  ],
  edge(b, glow, spot) {
    const at = atSpot(spot);
    if (spot.corner) {
      // A bunch of balloons tied at each corner.
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 + spot.index;
        const [x, y, z] = [0.05 + Math.cos(a) * 0.13, 0.55 + i * 0.1, Math.sin(a) * 0.13];
        const c = party(spot.index * 3 + i);
        b.add(tube([[0.05, 0, 0], [x * 0.6, y * 0.5, z * 0.5], [x, y - 0.15, z]], 0.007, 6), WHITE, at(0, 0, 0));
        b.add(new THREE.SphereGeometry(0.13, 12, 9).scale(1, 1.2, 1), c, at(x, y, z));
        b.add(new THREE.ConeGeometry(0.025, 0.04, 6).rotateX(Math.PI), shadeHex(c, -25), at(x, y - 0.16, z));
      }
      return;
    }
    // Two streamers curling along the rim top, a glowing star where they are pinned.
    for (let st = 0; st < 2; st++) {
      const pts: [number, number, number][] = [];
      for (let i = 0; i <= 12; i++) {
        const t = i / 12;
        pts.push([0.0 + Math.sin(t * Math.PI * 4 + st * Math.PI) * 0.05, 0.03 + st * 0.01, -0.45 + t * 0.9]);
      }
      b.add(tube(pts, 0.018, 18), party(spot.index * 2 + st), at(0, 0, 0));
    }
    glow.add(new THREE.ExtrudeGeometry(starShape(0.075, 0.032), { depth: 0.025, bevelEnabled: false }).translate(0, 0, -0.0125).rotateX(-Math.PI / 2), party(spot.index + 1), at(0, 0.07, 0.45));
  },
  station(b, f) {
    // Bunting along the awning's edge and the eaves, balloon bunches tied at both ends of the roof.
    const flag = new THREE.ExtrudeGeometry(new THREE.Shape([new THREE.Vector2(-0.05, 0), new THREE.Vector2(0.05, 0), new THREE.Vector2(0, -0.1)]), { depth: 0.01, bevelEnabled: false });
    for (const [y, z] of [[f.awningY, f.awningZ + 0.02], [f.roofY, f.frontZ + 0.03]] as const) {
      for (let x = -f.width / 2 + 0.06, i = 0; x < f.width / 2; x += 0.12, i++) b.add(flag.clone(), party(i + (z > 0.5 ? 0 : 3)), f.m(x, y - 0.005, z, -0.25));
      b.add(new THREE.CylinderGeometry(0.006, 0.006, f.width, 4).rotateZ(Math.PI / 2), WHITE, f.m(0, y - 0.002, z + 0.005));
    }
    for (const sx of [-1, 1]) {
      const x0 = sx * (f.width / 2 - 0.15);
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 + sx;
        const [x, y, z] = [x0 + Math.cos(a) * 0.08, f.roofY + 0.42 + i * 0.06, Math.sin(a) * 0.08];
        const c = party(i * 2 + (sx > 0 ? 1 : 0));
        b.add(tube([[x0, f.roofY + 0.15, 0], [(x + x0) / 2, f.roofY + 0.25, z / 2], [x, y - 0.1, z]], 0.005, 6), WHITE, f.m(0, 0, 0));
        b.add(new THREE.SphereGeometry(0.085, 10, 8).scale(1, 1.2, 1), c, f.m(x, y, z));
        b.add(new THREE.ConeGeometry(0.018, 0.03, 6).rotateX(Math.PI), shadeHex(c, -25), f.m(x, y - 0.105, z));
      }
    }
  },
  engine(b) {
    // A striped party hat on the cab roof.
    const hatGeo = paintFaces(new THREE.ConeGeometry(0.07, 0.17, 12, 4), stripes('#ff3d7f', '#ffd23f', 6, 30));
    b.addColored(hatGeo, new THREE.Matrix4().compose(new THREE.Vector3(-0.18, 0.5, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0.25)), new THREE.Vector3(1, 1, 1)));
    b.add(new THREE.TorusGeometry(0.068, 0.012, 5, 14).rotateX(Math.PI / 2), '#3fb8ff', new THREE.Matrix4().compose(new THREE.Vector3(-0.16, 0.425, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0.25)), new THREE.Vector3(1, 1, 1)));
    b.sphere(0.03, GOLD, -0.22, 0.585, 0, 1, 1, 1, 8);
  },
  light: { sunColor: '#fff0e4', hemiSky: '#eadcff' },
  fx: { kind: 'confetti', colors: PARTY, count: 80 },
};

export default skin;
