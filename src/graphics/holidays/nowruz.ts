// Nowruz (20–24 March): the Persian New Year on the first day of spring. A haft-sin table is laid
// on a white cloth (sabzeh sprouts with a red ribbon, a goldfish bowl, painted eggs, red apples,
// a mirror between two candles, hyacinths, coins and nokhodchi cookies), pots of hyacinths, tulips
// and sprouts stand round the diorama, blossoming trees shed petals and kites fly in the park.
// A green sabzeh ribbon bow rides on the engine.
import * as THREE from 'three';
import type { HolidaySkin, PropContext } from '../holiday';
import { ring } from '../holiday';
import { M, WHITE, polygon, shadeHex, starShape, type Kit } from '../toyModels';

const SPROUT = '#4fc43a';
const SPROUT_DARK = '#2f9a2a';
const LEAF = '#3c9a3a';
const RED = '#e8263c';
const GOLD = '#f2c23a';
const CLAY = '#d0703a';
const GLASS = '#a8e6ff';
const FISH = '#ff7a1a';
const FLAME = '#ffd23f';
const FLAME_HOT = '#ff8a1e';
const BLOSSOM = ['#ff9cc8', '#ffd0e4', '#ffffff', '#ff7fb5'];
const HYACINTH = ['#9b4dd6', '#ff6fb0', '#5a7ff0', '#c58cff'];
const TULIP = ['#e8263c', '#ffc928', '#ff5fa8', '#ff8a1e'];
const EGGS = ['#3f7fe0', '#ff3d8b', '#ffc928', '#22b5a6', '#9b4dd6', '#e8263c'];
const KITES = ['#ff3d8b', '#22b5a6', '#ffc928', '#3f7fe0', '#ff8a1e'];

const pick = <T>(a: readonly T[], i: number): T => a[((i % a.length) + a.length) % a.length] as T;

// ------------------------------------------------------------------------------------- cargo

/** Tips a flat model's top toward +z so it reads on the goal card and in wagons. */
const tilted = (build: (k: Kit, c: string) => void, angle: number) => (k: Kit, c: string): void => {
  const from = k.parts.length;
  build(k, c);
  const m = M(0, 0, 0, angle, 0, 0);
  for (const g of k.parts.slice(from)) g.applyMatrix4(m);
};

/** Sabzeh: a dish of wheatgrass sprouts tied with a red ribbon. */
function sabzeh(k: Kit, c: string): void {
  k.cyl(0.026, 0.02, 0.01, '#3f7fe0', 0, -0.02, 0, 0, 0, 0, 14);
  k.cyl(0.021, 0.021, 0.004, '#8a5a2e', 0, -0.014, 0, 0, 0, 0, 12);
  for (let i = 0; i < 19; i++) {
    const a = i * 2.4;
    const r = i === 0 ? 0 : 0.006 + (i % 3) * 0.006;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    k.cone(0.0045, 0.03 + (i % 2) * 0.006, i % 3 ? c : shadeHex(c, 18), x, 0.004, z, z * 6, 0, -x * 6, 4);
  }
  k.tor(0.0175, 0.0028, RED, 0, -0.008, 0, Math.PI / 2, 0, 0, 14);
  for (const s of [-1, 1]) k.sph(0.005, RED, 0.002 + s * 0.005, -0.008, 0.018, 1.2, 0.7, 0.5, 6);
}

/** A round goldfish bowl, the goldfish swimming at the front and back. */
function fishbowl(k: Kit, c: string): void {
  k.sph(0.023, c, 0, -0.003, 0, 1, 0.92, 1, 14);
  k.cyl(0.013, 0.013, 0.002, shadeHex(c, 30), 0, 0.017, 0, 0, 0, 0, 12);
  k.tor(0.013, 0.0022, WHITE, 0, 0.018, 0, Math.PI / 2, 0, 0, 14);
  k.cyl(0.012, 0.014, 0.004, GOLD, 0, -0.024, 0, 0, 0, 0, 12);
  for (const s of [-1, 1]) {
    k.sph(0.0075, FISH, 0.002 * s, 0, s * 0.02, 1.5, 1, 0.55, 8);
    k.cone(0.006, 0.008, FISH, -0.011 * s, 0, s * 0.019, 0, 0, -s * Math.PI / 2, 5);
    k.sph(0.0015, '#1e1e24', 0.008 * s, 0.002, s * 0.024, 1, 1, 1, 4);
  }
  k.sph(0.0025, WHITE, -0.008, 0.009, 0.019, 1, 1, 1, 4);
}

/** A painted egg with a white zigzag band and dots. */
function egg(k: Kit, c: string): void {
  k.sph(0.017, c, 0, 0.001, 0, 1, 1.32, 1, 12);
  k.tor(0.0168, 0.0022, WHITE, 0, 0.002, 0, Math.PI / 2, 0, 0, 14);
  k.tor(0.0148, 0.0018, '#ffd23f', 0, 0.012, 0, Math.PI / 2, 0, 0, 14);
  k.tor(0.0148, 0.0018, '#ffd23f', 0, -0.008, 0, Math.PI / 2, 0, 0, 14);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    k.sph(0.0022, WHITE, Math.cos(a) * 0.0135, 0.018 - 0.016, Math.sin(a) * 0.0135, 1, 1, 1, 4);
  }
  k.cyl(0.011, 0.008, 0.007, GOLD, 0, -0.023, 0, 0, 0, 0, 10);
}

function apple(k: Kit, c: string): void {
  k.sph(0.021, c, 0, -0.003, 0, 1, 0.92, 1, 12);
  k.sph(0.005, shadeHex(c, -30), 0, 0.015, 0, 1, 0.5, 1, 6);
  k.cyl(0.0016, 0.002, 0.012, '#6b4423', 0.001, 0.021, 0, 0, 0, -0.2, 5);
  k.sph(0.007, LEAF, 0.008, 0.023, 0, 1.5, 0.35, 0.8, 6);
  k.sph(0.004, WHITE, -0.008, 0.006, 0.016, 1, 1.3, 0.5, 5);
}

/** A hyacinth in a little clay pot: a dense spike of florets. */
function hyacinth(k: Kit, c: string): void {
  k.cyl(0.014, 0.01, 0.016, CLAY, 0, -0.019, 0, 0, 0, 0, 10);
  k.cyl(0.0155, 0.0155, 0.004, shadeHex(CLAY, -15), 0, -0.011, 0, 0, 0, 0, 10);
  for (const s of [-1, 1]) k.sph(0.012, LEAF, s * 0.007, -0.006, 0, 0.25, 1.1, 0.5, 6);
  for (let r = 0; r < 5; r++) {
    const rad = 0.0085 - r * 0.0011;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + r * 0.5;
      k.sph(0.0043, r % 2 ? shadeHex(c, 15) : c, Math.cos(a) * rad, -0.002 + r * 0.0058, Math.sin(a) * rad, 1, 1, 1, 5);
    }
  }
  k.sph(0.0045, shadeHex(c, 15), 0, 0.027, 0, 1, 1, 1, 5);
}

/** A tulip head on its stem with two leaves. */
function tulip(k: Kit, c: string): void {
  k.cyl(0.0022, 0.0022, 0.03, LEAF, 0, -0.014, 0, 0, 0, 0, 5);
  for (const s of [-1, 1]) k.sph(0.013, LEAF, s * 0.007, -0.016, 0, 0.3, 1, 0.55, 6);
  k.sph(0.0135, c, 0, 0.011, 0, 1, 1.15, 1, 10);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.3;
    k.cone(0.007, 0.013, shadeHex(c, i ? 0 : 12), Math.cos(a) * 0.0065, 0.024, Math.sin(a) * 0.0065, Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25, 5);
  }
  k.cyl(0.012, 0.009, 0.004, '#8a5a2e', 0, -0.028, 0, 0, 0, 0, 8);
}

/** Stacks of gold coins with one standing up to show its sun. */
function coins(k: Kit, c: string): void {
  const stack = (x: number, z: number, n: number) => {
    for (let i = 0; i < n; i++) k.cyl(0.0105, 0.0105, 0.0032, i % 2 ? shadeHex(c, -12) : c, x, -0.022 + i * 0.0036, z, 0, 0, 0, 12);
  };
  stack(-0.01, -0.006, 5);
  stack(0.011, -0.008, 3);
  k.cyl(0.014, 0.014, 0.004, c, 0.004, -0.004, 0.012, Math.PI / 2 - 0.25, 0, 0, 14);
  k.shape(starShape(0.008, 0.0045, 8), 0.0012, shadeHex(c, -28), M(0.004, -0.0035, 0.0145, -0.25, 0, 0));
}

/** A haft-sin candle on a gold holder. */
function candle(k: Kit, c: string): void {
  k.cyl(0.015, 0.017, 0.004, GOLD, 0, -0.024, 0, 0, 0, 0, 12);
  k.cyl(0.004, 0.005, 0.006, GOLD, 0, -0.019, 0, 0, 0, 0, 8);
  k.cyl(0.0095, 0.0095, 0.032, c, 0, 0.0, 0, 0, 0, 0, 10);
  k.sph(0.003, c, 0.009, 0.01, 0, 1, 2, 1, 5);
  k.tor(0.0098, 0.0015, '#4fc43a', 0, -0.006, 0, Math.PI / 2, 0, 0, 12);
  k.cyl(0.0008, 0.0008, 0.004, '#1e1e24', 0, 0.018, 0, 0, 0, 0, 4);
  k.sph(0.0055, FLAME_HOT, 0, 0.023, 0, 1, 1.4, 1, 6);
  k.sph(0.0042, FLAME, 0, 0.029, 0, 0.8, 1.8, 0.8, 6);
}

/** A diamond kite with crossed sticks and a bow tail. */
function kite(k: Kit, c: string): void {
  k.shape(polygon([[0, 0.025], [0.02, 0.004], [0, -0.022], [-0.02, 0.004]]), 0.003, c, M(0, 0.004, 0));
  k.shape(polygon([[0, 0.025], [0.02, 0.004], [0, 0.004]]), 0.0034, shadeHex(c, 30), M(0, 0.004, 0));
  k.shape(polygon([[0, -0.022], [-0.02, 0.004], [0, 0.004]]), 0.0034, '#ffd23f', M(0, 0.004, 0));
  k.box(0.042, 0.0016, 0.0016, '#7a4a26', 0, 0.008, 0.002);
  k.box(0.0016, 0.046, 0.0016, '#7a4a26', 0, 0.005, 0.002);
  for (let i = 0; i < 3; i++) k.sph(0.0035, pick(['#3f7fe0', '#4fc43a', '#ff3d8b'], i), 0.004 * Math.sin(i * 2), -0.023 - i * 0.006, 0.002, 1.5, 0.7, 0.6, 5);
}

/** A round hand mirror on a little stand, its frame dotted with gold. */
function mirror(k: Kit, c: string): void {
  k.tor(0.017, 0.0045, c, 0, 0.004, 0, 0, 0, 0, 16);
  k.cyl(0.0165, 0.0165, 0.002, '#cff1ff', 0, 0.004, 0, Math.PI / 2, 0, 0, 16);
  k.box(0.006, 0.014, 0.0012, WHITE, -0.005, 0.009, 0.0014, 0, 0, -0.6);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    k.sph(0.0026, GOLD, Math.cos(a) * 0.017, 0.004 + Math.sin(a) * 0.017, 0.004, 1, 1, 1, 5);
  }
  k.box(0.006, 0.01, 0.004, c, 0, -0.017, -0.004);
  k.cyl(0.012, 0.013, 0.004, c, 0, -0.024, -0.002, 0, 0, 0, 12);
}

/** Nokhodchi: clover-shaped chickpea cookies with a pistachio crumb, on a plate. */
function nokhodchi(k: Kit, c: string): void {
  k.cyl(0.028, 0.022, 0.004, WHITE, 0, -0.016, 0, 0, 0, 0, 16);
  k.tor(0.025, 0.0015, '#3f7fe0', 0, -0.0135, 0, Math.PI / 2, 0, 0, 16);
  const cookie = (x: number, y: number, z: number, yaw: number, col: string) => {
    for (let i = 0; i < 4; i++) {
      const a = yaw + (i / 4) * Math.PI * 2;
      k.cyl(0.0058, 0.0062, 0.006, col, x + Math.cos(a) * 0.005, y, z + Math.sin(a) * 0.005, 0, 0, 0, 8);
    }
    k.sph(0.0022, '#7cc35a', x, y + 0.003, z, 1, 0.6, 1, 4);
  };
  cookie(-0.01, -0.0105, -0.006, 0.3, c);
  cookie(0.011, -0.0105, -0.004, 0.0, shadeHex(c, 8));
  cookie(0.0, -0.0105, 0.012, 0.6, shadeHex(c, -6));
  cookie(0.0, -0.0045, 0.0, 0.1, shadeHex(c, 12));
}

// ------------------------------------------------------------------------------------- props

/** Wheatgrass blades in a disc of radius r, at height y. */
function blades(b: PropContext['b'], m: PropContext['m'], r: number, y: number, h: number, n: number): void {
  for (let i = 0; i < n; i++) {
    const a = i * 2.4;
    const d = Math.sqrt((i + 0.5) / n) * r;
    const x = Math.cos(a) * d;
    const z = Math.sin(a) * d;
    const hh = h * (0.85 + (i % 3) * 0.12);
    b.add(new THREE.ConeGeometry(h * 0.16, hh, 4), i % 3 ? SPROUT : SPROUT_DARK, m(x, y + hh / 2, z).multiply(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(z * 1.5, 0, -x * 1.5))));
  }
}

/** A dish of sabzeh with a red ribbon round it, about 0.3 across. */
function sabzehProp({ b, m, variant }: PropContext): void {
  b.add(new THREE.CylinderGeometry(0.15, 0.11, 0.06, 14), pick(['#3f7fe0', '#22b5a6', WHITE], variant), m(0, 0.03, 0));
  b.add(new THREE.CylinderGeometry(0.135, 0.135, 0.02, 14), '#8a5a2e', m(0, 0.055, 0));
  blades(b, m, 0.12, 0.06, 0.18, 26);
  b.add(new THREE.TorusGeometry(0.115, 0.016, 4, 16).rotateX(Math.PI / 2), RED, m(0, 0.11, 0));
  for (const s of [-1, 1]) b.add(new THREE.SphereGeometry(0.035, 8, 5).scale(1.2, 0.8, 0.4), RED, m(s * 0.035, 0.115, 0.12, s * 0.4));
  b.add(new THREE.SphereGeometry(0.018, 6, 5), shadeHex(RED, -20), m(0, 0.115, 0.125));
}

function flowerPot(b: PropContext['b'], m: PropContext['m']): void {
  b.add(new THREE.CylinderGeometry(0.1, 0.075, 0.13, 12), CLAY, m(0, 0.065, 0));
  b.add(new THREE.CylinderGeometry(0.11, 0.11, 0.03, 12), shadeHex(CLAY, -15), m(0, 0.125, 0));
  b.add(new THREE.CylinderGeometry(0.095, 0.095, 0.01, 12), '#6b4423', m(0, 0.135, 0));
}

/** A pot of hyacinths, about 0.45 tall. */
function hyacinthPot({ b, m, variant }: PropContext): void {
  flowerPot(b, m);
  for (let f = 0; f < 3; f++) {
    const fx = Math.cos(f * 2.1) * 0.045;
    const fz = Math.sin(f * 2.1) * 0.045;
    const col = pick(HYACINTH, variant + f);
    const base = 0.2 + (f % 2) * 0.04;
    b.add(new THREE.CylinderGeometry(0.012, 0.014, base - 0.13, 5), LEAF, m(fx, (base + 0.13) / 2, fz));
    for (let r = 0; r < 5; r++) {
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + r * 0.6;
        const rad = 0.04 - r * 0.005;
        b.add(new THREE.SphereGeometry(0.02, 6, 4), r % 2 ? shadeHex(col, 18) : col, m(fx + Math.cos(a) * rad, base + r * 0.032, fz + Math.sin(a) * rad));
      }
    }
  }
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3;
    b.add(new THREE.SphereGeometry(0.05, 6, 4).scale(0.3, 1.4, 0.6), LEAF, m(Math.cos(a) * 0.07, 0.2, Math.sin(a) * 0.07, -a).multiply(new THREE.Matrix4().makeRotationZ(0.25)));
  }
}

/** A pot of tulips, about 0.5 tall. */
function tulipPot({ b, m, variant }: PropContext): void {
  flowerPot(b, m);
  for (let f = 0; f < 5; f++) {
    const a = f * 1.26;
    const r = f === 0 ? 0 : 0.055;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const h = 0.3 + (f % 3) * 0.05;
    const col = pick(TULIP, variant + f);
    b.add(new THREE.CylinderGeometry(0.008, 0.008, h - 0.13, 5), LEAF, m(x, (h + 0.13) / 2, z));
    b.add(new THREE.SphereGeometry(0.045, 8, 6).scale(1, 1.2, 1), col, m(x, h + 0.03, z));
    for (let i = 0; i < 3; i++) {
      const p = (i / 3) * Math.PI * 2 + f;
      b.add(new THREE.ConeGeometry(0.022, 0.05, 5), col, m(x + Math.cos(p) * 0.022, h + 0.08, z + Math.sin(p) * 0.022));
    }
  }
  for (const s of [-1, 1]) b.add(new THREE.SphereGeometry(0.07, 6, 4).scale(0.3, 1.5, 0.7), LEAF, m(s * 0.06, 0.22, 0, 0).multiply(new THREE.Matrix4().makeRotationZ(-s * 0.35)));
}

/** A pot of sprouts. */
function sproutPot({ b, m }: PropContext): void {
  flowerPot(b, m);
  blades(b, m, 0.085, 0.13, 0.16, 18);
  b.add(new THREE.TorusGeometry(0.1, 0.012, 4, 14).rotateX(Math.PI / 2), RED, m(0, 0.11, 0));
}

/** The haft-sin table: a low table under a white cloth, laid for the new year, about 0.95 wide. */
function haftsin({ b, glow, m }: PropContext): void {
  // Table and cloth with a green and red border.
  for (const [x, z] of [[-0.42, -0.22], [0.42, -0.22], [-0.42, 0.22], [0.42, 0.22]] as const) b.add(new THREE.CylinderGeometry(0.025, 0.02, 0.18, 6), '#8a4a26', m(x, 0.09, z));
  b.add(new THREE.BoxGeometry(0.98, 0.04, 0.56), WHITE, m(0, 0.2, 0));
  b.add(new THREE.BoxGeometry(1.0, 0.1, 0.012), WHITE, m(0, 0.17, 0.285));
  b.add(new THREE.BoxGeometry(1.004, 0.022, 0.016), SPROUT_DARK, m(0, 0.14, 0.287));
  b.add(new THREE.BoxGeometry(1.004, 0.012, 0.016), RED, m(0, 0.16, 0.287));
  for (let i = 0; i < 9; i++) b.add(new THREE.SphereGeometry(0.014, 6, 4).scale(1, 1, 0.4), pick(['#ff3d8b', '#3f7fe0', GOLD], i), m(-0.44 + i * 0.11, 0.195, 0.292));
  const top = 0.22;
  // Mirror between two candles at the back.
  // (Leaning back so it shows from above.)
  const lean = () => m(0, top + 0.12, -0.18).multiply(new THREE.Matrix4().makeRotationX(-0.75));
  b.add(new THREE.TorusGeometry(0.1, 0.022, 5, 18), GOLD, lean());
  b.add(new THREE.CircleGeometry(0.1, 18).translate(0, 0, 0.004), '#cff1ff', lean());
  b.add(new THREE.PlaneGeometry(0.03, 0.12).rotateZ(-0.6).translate(-0.03, 0.02, 0.006), WHITE, lean());
  for (let i = 0; i < 8; i++) b.add(new THREE.SphereGeometry(0.014, 5, 4), pick(['#ff3d8b', '#3f7fe0'], i), lean().multiply(new THREE.Matrix4().makeTranslation(Math.cos(i * 0.785) * 0.1, Math.sin(i * 0.785) * 0.1, 0.018)));
  b.add(new THREE.BoxGeometry(0.06, 0.05, 0.04), GOLD, m(0, top + 0.02, -0.19));
  for (const s of [-1, 1]) {
    b.add(new THREE.CylinderGeometry(0.045, 0.05, 0.015, 10), GOLD, m(s * 0.2, top + 0.008, -0.18));
    b.add(new THREE.CylinderGeometry(0.024, 0.024, 0.15, 8), s < 0 ? '#ff5fa8' : '#4fc43a', m(s * 0.2, top + 0.09, -0.18));
    glow.add(new THREE.SphereGeometry(0.02, 6, 5).scale(1, 1.6, 1), FLAME_HOT, m(s * 0.2, top + 0.19, -0.18));
    glow.add(new THREE.SphereGeometry(0.014, 6, 5).scale(1, 2, 1), FLAME, m(s * 0.2, top + 0.225, -0.18));
  }
  // Sabzeh in front, with its red ribbon.
  b.add(new THREE.CylinderGeometry(0.1, 0.075, 0.04, 12), '#3f7fe0', m(0, top + 0.02, 0.1));
  blades(b, m, 0.08, top + 0.04, 0.14, 18);
  b.add(new THREE.TorusGeometry(0.075, 0.012, 4, 14).rotateX(Math.PI / 2), RED, m(0, top + 0.07, 0.1));
  // Goldfish bowl.
  b.add(new THREE.CylinderGeometry(0.05, 0.055, 0.02, 10), GOLD, m(0.33, top + 0.01, 0.06));
  b.add(new THREE.SphereGeometry(0.1, 14, 10).scale(1, 0.9, 1), GLASS, m(0.33, top + 0.1, 0.06));
  b.add(new THREE.TorusGeometry(0.055, 0.01, 4, 14).rotateX(Math.PI / 2), WHITE, m(0.33, top + 0.185, 0.06));
  b.add(new THREE.CircleGeometry(0.05, 12).rotateX(-Math.PI / 2), '#5cc8f0', m(0.33, top + 0.183, 0.06));
  b.add(new THREE.SphereGeometry(0.022, 8, 5).scale(1.5, 0.6, 0.8), FISH, m(0.33, top + 0.186, 0.06, 0.7));
  b.add(new THREE.ConeGeometry(0.016, 0.022, 4).rotateZ(-Math.PI / 2), FISH, m(0.33 - Math.cos(0.7) * 0.04, top + 0.186, 0.06 + Math.sin(0.7) * 0.04, 0.7));
  for (const s of [-1, 1]) {
    b.add(new THREE.SphereGeometry(0.03, 8, 6).scale(1.4, 1, 0.6), FISH, m(0.33 + s * 0.01, top + 0.09, 0.06 + s * 0.085));
    b.add(new THREE.ConeGeometry(0.022, 0.03, 5).rotateZ(-s * Math.PI / 2), FISH, m(0.33 - s * 0.04, top + 0.09, 0.06 + s * 0.08));
  }
  // Red apples.
  b.add(new THREE.CylinderGeometry(0.09, 0.07, 0.015, 12), WHITE, m(-0.33, top + 0.008, 0.08));
  for (const [x, y, z] of [[-0.36, 0.045, 0.06], [-0.3, 0.045, 0.11], [-0.31, 0.045, 0.03], [-0.33, 0.1, 0.07]] as const) {
    b.add(new THREE.SphereGeometry(0.04, 8, 6), RED, m(x, top + y, z));
    b.add(new THREE.CylinderGeometry(0.004, 0.004, 0.02, 4), '#6b4423', m(x, top + y + 0.045, z));
  }
  // A bowl of painted eggs.
  b.add(new THREE.SphereGeometry(0.075, 10, 4, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), GOLD, m(-0.17, top + 0.06, 0.13));
  for (let i = 0; i < 4; i++) b.add(new THREE.SphereGeometry(0.03, 8, 6).scale(1, 1.3, 1), pick(EGGS, i), m(-0.17 + Math.cos(i * 1.6) * 0.035, top + 0.075, 0.13 + Math.sin(i * 1.6) * 0.035));
  // A hyacinth, coins and cookies.
  b.add(new THREE.CylinderGeometry(0.035, 0.03, 0.05, 8), CLAY, m(0.17, top + 0.025, 0.14));
  for (let r = 0; r < 4; r++) for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + r * 0.8;
    b.add(new THREE.SphereGeometry(0.016, 5, 4), r % 2 ? '#c58cff' : '#9b4dd6', m(0.17 + Math.cos(a) * 0.02, top + 0.08 + r * 0.025, 0.14 + Math.sin(a) * 0.02));
  }
  for (const [x, z, n] of [[0.17, -0.03, 3], [0.22, 0.0, 2], [0.12, 0.01, 1]] as const) b.add(new THREE.CylinderGeometry(0.022, 0.022, 0.008 * n, 10), GOLD, m(x, top + 0.004 * n, z));
  b.add(new THREE.CylinderGeometry(0.07, 0.05, 0.03, 10), '#22b5a6', m(-0.34, top + 0.015, -0.14));
  for (let i = 0; i < 4; i++) b.add(new THREE.CylinderGeometry(0.022, 0.022, 0.014, 8), '#e8c08a', m(-0.34 + Math.cos(i * 1.6) * 0.03, top + 0.037, -0.14 + Math.sin(i * 1.6) * 0.03));
}

/** A blossoming tree, about 1.1 tall at scale 1. */
function blossomTree({ b, m, variant }: PropContext): void {
  const bark = '#7a4a2e';
  b.add(new THREE.CylinderGeometry(0.04, 0.06, 0.5, 7), bark, m(0, 0.25, 0));
  const limbs: [number, number, number][] = [[0.6, 0.0, 0.48], [-0.55, 2.0, 0.5], [0.5, 4.0, 0.55]];
  for (const [rz, ry, y] of limbs) b.add(new THREE.CylinderGeometry(0.022, 0.032, 0.36, 6), bark, m(0, y, 0, ry).multiply(new THREE.Matrix4().makeRotationZ(rz)).multiply(new THREE.Matrix4().makeTranslation(0, 0.14, 0)));
  const puffs: [number, number, number, number][] = [[0, 0.82, 0, 0.2], [0.2, 0.7, 0.05, 0.16], [-0.18, 0.72, -0.1, 0.17], [0.05, 0.68, 0.2, 0.14], [-0.05, 0.7, -0.22, 0.14], [0.12, 0.95, -0.05, 0.12], [-0.12, 0.92, 0.1, 0.12]];
  puffs.forEach(([x, y, z, r], i) => {
    b.add(new THREE.IcosahedronGeometry(r, 1), pick(BLOSSOM, variant + i), m(x, y, z));
    for (let j = 0; j < 3; j++) {
      const a = i * 1.7 + j * 2.1;
      b.add(new THREE.SphereGeometry(r * 0.22, 5, 4), pick(BLOSSOM, variant + i + j + 1), m(x + Math.cos(a) * r * 0.85, y + 0.04, z + Math.sin(a) * r * 0.85));
    }
  });
  // Fallen petals on the ground.
  for (let i = 0; i < 7; i++) b.add(new THREE.CircleGeometry(0.03, 5).rotateX(-Math.PI / 2), pick(BLOSSOM, i), m(Math.cos(i * 2.3) * 0.3, 0.004, Math.sin(i * 2.3) * 0.28));
}

/** A kite flying on a string tied to a peg, about 1.2 tall at scale 1. */
function kiteProp({ b, m, variant }: PropContext): void {
  const col = pick(KITES, variant);
  b.add(new THREE.CylinderGeometry(0.02, 0.012, 0.12, 5), '#8a5a2e', m(0, 0.06, 0));
  b.add(new THREE.TorusGeometry(0.03, 0.01, 4, 8).rotateX(Math.PI / 2), '#f4ecd8', m(0, 0.08, 0));
  const top = new THREE.Vector3(0.36, 1.05, 0);
  const dir = top.clone().sub(new THREE.Vector3(0, 0.1, 0));
  const len = dir.length();
  b.add(new THREE.CylinderGeometry(0.004, 0.004, len, 3), WHITE, m(top.x / 2, (top.y + 0.1) / 2, 0).multiply(new THREE.Matrix4().makeRotationZ(-Math.atan2(dir.x, dir.y))));
  const kite = (shape: THREE.Shape, c: string, dz: number) => b.add(new THREE.ExtrudeGeometry(shape, { depth: 0.012, bevelEnabled: false }).translate(0, 0, -0.006), c, m(top.x, top.y + 0.08, 0, 0).multiply(new THREE.Matrix4().makeRotationX(-1.1)).multiply(new THREE.Matrix4().makeRotationZ(-0.4)).multiply(new THREE.Matrix4().makeTranslation(0, 0, dz)));
  kite(polygon([[0, 0.2], [0.15, 0.04], [0, -0.17], [-0.15, 0.04]]), col, 0);
  kite(polygon([[0, 0.2], [0.15, 0.04], [0, 0.04]]), shadeHex(col, 35), 0.004);
  kite(polygon([[0, -0.17], [-0.15, 0.04], [0, 0.04]]), '#ffd23f', 0.004);
  for (let i = 0; i < 5; i++) {
    const t = i + 1;
    b.add(new THREE.SphereGeometry(0.028, 6, 4).scale(1.6, 0.7, 0.5), pick(KITES, variant + i + 1), m(top.x - 0.07 - t * 0.05, top.y - t * 0.07 + Math.sin(t) * 0.02, 0));
  }
}

/** A wicker basket of painted eggs. */
function eggBasket({ b, m, variant }: PropContext): void {
  b.add(new THREE.CylinderGeometry(0.17, 0.13, 0.12, 12), '#c9a35a', m(0, 0.06, 0));
  b.add(new THREE.TorusGeometry(0.17, 0.02, 4, 14).rotateX(Math.PI / 2), '#8a5a2e', m(0, 0.12, 0));
  b.add(new THREE.TorusGeometry(0.16, 0.012, 4, 14, Math.PI), '#8a5a2e', m(0, 0.12, 0));
  b.add(new THREE.CylinderGeometry(0.15, 0.15, 0.02, 12), SPROUT, m(0, 0.11, 0));
  for (let i = 0; i < 7; i++) {
    const a = i * 0.9;
    const r = i === 0 ? 0 : 0.09;
    b.add(new THREE.SphereGeometry(0.045, 8, 6).scale(1, 1.3, 1), pick(EGGS, variant + i), m(Math.cos(a) * r, 0.15 + (i === 0 ? 0.03 : 0), Math.sin(a) * r));
  }
}

/** A big goldfish bowl on a little stand. */
function bowlProp({ b, m }: PropContext): void {
  b.add(new THREE.CylinderGeometry(0.12, 0.14, 0.05, 12), GOLD, m(0, 0.025, 0));
  b.add(new THREE.SphereGeometry(0.22, 16, 12).scale(1, 0.9, 1), GLASS, m(0, 0.23, 0));
  b.add(new THREE.TorusGeometry(0.12, 0.018, 5, 16).rotateX(Math.PI / 2), WHITE, m(0, 0.42, 0));
  b.add(new THREE.CircleGeometry(0.11, 14).rotateX(-Math.PI / 2), '#5cc8f0', m(0, 0.418, 0));
  b.add(new THREE.SphereGeometry(0.045, 8, 5).scale(1.5, 0.6, 0.8), FISH, m(0.01, 0.422, 0, 0.6));
  b.add(new THREE.ConeGeometry(0.032, 0.045, 4).rotateZ(-Math.PI / 2), FISH, m(0.01 - Math.cos(0.6) * 0.08, 0.422, Math.sin(0.6) * 0.08, 0.6));
  for (const [x, y, z, s] of [[0.03, 0.24, 0.19, 1], [-0.05, 0.18, -0.19, -1], [0.19, 0.2, -0.03, 1]] as const) {
    b.add(new THREE.SphereGeometry(0.055, 8, 6).scale(1.4, 1, 0.6), FISH, m(x, y, z, s < 0 ? Math.PI : 0));
    b.add(new THREE.ConeGeometry(0.04, 0.05, 5).rotateZ(-Math.PI / 2), FISH, m(x - s * 0.08, y, z, s < 0 ? Math.PI : 0));
  }
}

// ------------------------------------------------------------------------------------- the skin

const skin: HolidaySkin = {
  id: 'nowruz',
  name: 'Nowruz',
  greeting: 'Happy Nowruz!',
  cargo: {
    green: sabzeh, teal: fishbowl, blue: egg, red: apple, purple: hyacinth, pink: tulip, yellow: coins,
    white: candle, orange: kite, gray: mirror, brown: tilted(nokhodchi, 0.5),
  },
  props: {
    'nowruz.haftsin': haftsin,
    'nowruz.sabzeh': sabzehProp,
    'nowruz.hyacinth': hyacinthPot,
    'nowruz.tulips': tulipPot,
    'nowruz.sprouts': sproutPot,
    'nowruz.blossom': blossomTree,
    'nowruz.kite': kiteProp,
    'nowruz.eggs': eggBasket,
    'nowruz.bowl': bowlProp,
  },
  inside: [
    { name: 'haftsin', w: 2, h: 2, items: [['nowruz.haftsin', 0, -0.12, 0, 1.45], ['pillow', -0.5, 0.6, 0, 0.3], ['pillow', 0.5, 0.6, 0, 0.3], ['nowruz.hyacinth', -0.8, -0.65, 0, 0.75], ['nowruz.tulips', 0.8, -0.65, 0, 0.75], ['nowruz.sabzeh', 0, 0.66, 0, 0.75]] },
    { name: 'pots', w: 2, h: 1, items: [['nowruz.hyacinth', -0.66, 0, 0, 0.9, 0, 0], ['nowruz.sabzeh', -0.22, 0.05, 0, 0.95], ['nowruz.tulips', 0.22, 0, 0, 0.9, 0, 1], ['nowruz.hyacinth', 0.66, 0, 0, 0.9, 0, 1]] },
    { name: 'blossom', w: 2, h: 2, items: [['nowruz.blossom', -0.3, -0.25, 0, 1.15], ['nowruz.kite', 0.45, -0.35, 0, 0.85], ['nowruz.eggs', 0.5, 0.45, 0, 1], ['nowruz.sprouts', -0.55, 0.55, 0, 0.8], ['toy:drum', 0.0, 0.55, 'face', 0.5]] },
    { name: 'goldfish', w: 2, h: 1, items: [['nowruz.bowl', -0.35, 0, 0, 0.95], ['nowruz.eggs', 0.35, -0.05, 0, 0.85], ['nowruz.sprouts', 0.85, -0.25, 0, 0.55], ['nowruz.hyacinth', 0.85, 0.25, 0, 0.55]] },
  ],
  outside: [
    { name: 'haftsinFeast', w: 2.4, h: 0, items: [['nowruz.haftsin', 0, -0.2, 0, 3], ['pillow', -1.0, 1.1, 0, 1], ['pillow', 0, 1.25, 0, 1], ['pillow', 1.0, 1.1, 0, 1], ['nowruz.hyacinth', -1.9, -0.6, 0, 2.2], ['nowruz.tulips', 1.9, -0.6, 0, 2.2], ['nowruz.sabzeh', -1.8, 0.8, 0, 2], ['nowruz.bowl', 1.8, 0.8, 0, 1.8]] },
    { name: 'blossomPark', w: 2.4, h: 0, items: [['nowruz.blossom', -0.9, -0.4, 0, 3.4], ['nowruz.blossom', 1.0, -0.6, 2, 3], ['nowruz.kite', 0.2, 0.7, 0, 2.6], ['nowruz.kite', 1.6, 0.9, 1, 2.2], ['nowruz.eggs', -1.4, 1.1, 0, 2.2]] },
    { name: 'flowerBeds', w: 2.0, h: 0, items: [...ring(6, 1.2, 'nowruz.tulips', 2.2, 0.3), ['nowruz.sabzeh', 0, 0, 0, 3], ...ring(3, 0.6, 'nowruz.hyacinth', 1.8, 1.0)] },
  ],
  edge(b, glow, spot) {
    const LIFT = 0.05;
    const K = 1.4;
    const at = (x: number, y: number, z: number, sx = 1, sy = sx, sz = sx) => {
      const c = Math.cos(spot.yaw);
      const s = Math.sin(spot.yaw);
      return new THREE.Matrix4().compose(new THREE.Vector3(spot.x + x * c + z * s, LIFT + y * K, spot.z - x * s + z * c), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), spot.yaw), new THREE.Vector3(sx * K, sy * K, sz * K));
    };
    const pot = (z: number) => {
      b.add(new THREE.CylinderGeometry(0.045, 0.034, 0.06, 8), CLAY, at(0, 0.03, z));
      b.add(new THREE.CylinderGeometry(0.05, 0.05, 0.014, 8), shadeHex(CLAY, -15), at(0, 0.06, z));
    };
    const sprouts = (z: number) => {
      pot(z);
      for (let i = 0; i < 7; i++) {
        const a = i * 2.4;
        const r = i ? 0.025 : 0;
        b.add(new THREE.ConeGeometry(0.012, 0.08, 4), i % 2 ? SPROUT : SPROUT_DARK, at(Math.cos(a) * r, 0.1, z + Math.sin(a) * r));
      }
      b.add(new THREE.TorusGeometry(0.047, 0.007, 3, 10).rotateX(Math.PI / 2), RED, at(0, 0.075, z));
    };
    const flower = (z: number, col: string) => {
      pot(z);
      b.add(new THREE.CylinderGeometry(0.006, 0.006, 0.05, 4), LEAF, at(0, 0.08, z));
      for (let r = 0; r < 3; r++) for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + r * 0.8;
        b.add(new THREE.SphereGeometry(0.014, 5, 4), r % 2 ? shadeHex(col, 18) : col, at(Math.cos(a) * 0.018, 0.1 + r * 0.02, z + Math.sin(a) * 0.018));
      }
    };
    if (spot.corner) {
      // A painted egg and a candle beside a pot of sprouts.
      sprouts(0);
      b.add(new THREE.SphereGeometry(0.035, 8, 6).scale(1, 1.3, 1), pick(EGGS, spot.index), at(0.02, 0.045, 0.1));
      b.add(new THREE.CylinderGeometry(0.018, 0.018, 0.09, 8), WHITE, at(0.02, 0.045, -0.1));
      glow.add(new THREE.SphereGeometry(0.013, 6, 5).scale(1, 1.8, 1), FLAME, at(0.02, 0.11, -0.1));
      return;
    }
    sprouts(-0.2);
    flower(0.04, pick(HYACINTH, spot.index));
    flower(0.24, pick(TULIP, spot.index + 1));
  },
  station(b, f, glow) {
    // Blossoming twigs along the eaves, and a green sabzeh ribbon with a bow over the door.
    for (let x = -f.width / 2 + 0.06, i = 0; x <= f.width / 2 - 0.05; x += 0.11, i++) {
      b.add(new THREE.CylinderGeometry(0.008, 0.008, 0.12, 4).rotateZ(Math.PI / 2 + (i % 2 ? 0.3 : -0.3)), '#7a4a2e', f.m(x, f.roofY + 0.01, f.frontZ + 0.04));
      b.add(new THREE.SphereGeometry(0.035, 6, 5), pick(BLOSSOM, i), f.m(x, f.roofY + 0.03, f.frontZ + 0.05));
      b.add(new THREE.SphereGeometry(0.022, 6, 4), pick(BLOSSOM, i + 2), f.m(x + 0.04, f.roofY - 0.0, f.frontZ + 0.06));
    }
    // The green ribbon swags along the awning's front edge, with a big bow in the middle.
    const z = f.awningZ + 0.165;
    const top = f.awningY - 0.045;
    const half = f.width / 2 - 0.04;
    const sag = (x: number) => top - 0.05 * Math.abs(Math.sin((x / half) * Math.PI));
    for (let x = -half; x <= half; x += 0.04) b.add(new THREE.BoxGeometry(0.045, 0.026, 0.012), SPROUT_DARK, f.m(x, sag(x), z));
    for (const s of [-1, 1]) {
      b.add(new THREE.SphereGeometry(0.075, 8, 6).scale(1.2, 0.75, 0.35), SPROUT, f.m(s * 0.08, top + 0.01, z + 0.02, 0, 0, s * 0.3));
      b.add(new THREE.BoxGeometry(0.035, 0.14, 0.012), SPROUT, f.m(s * 0.04, top - 0.08, z + 0.015, 0, 0, s * 0.3));
      b.add(new THREE.SphereGeometry(0.035, 6, 5), pick(BLOSSOM, s + 1), f.m(s * half, top + 0.005, z + 0.01));
    }
    b.add(new THREE.SphereGeometry(0.034, 8, 6), SPROUT_DARK, f.m(0, top + 0.01, z + 0.035));
    // Two candles standing on the awning.
    for (const x of [-half + 0.08, half - 0.08]) {
      b.add(new THREE.CylinderGeometry(0.035, 0.03, 0.015, 8), GOLD, f.m(x, f.awningY + 0.0, f.awningZ + 0.06));
      b.add(new THREE.CylinderGeometry(0.02, 0.02, 0.08, 8), WHITE, f.m(x, f.awningY + 0.045, f.awningZ + 0.06));
      glow.add(new THREE.SphereGeometry(0.016, 6, 5).scale(1, 1.8, 1), FLAME, f.m(x, f.awningY + 0.11, f.awningZ + 0.06));
    }
  },
  engine(b) {
    // A green sabzeh ribbon round the smokebox, tied in a big bow at the front.
    b.add(new THREE.TorusGeometry(0.105, 0.016, 4, 20).rotateY(Math.PI / 2), SPROUT_DARK, new THREE.Matrix4().makeTranslation(0.24, 0.215, 0));
    const bow = (z: number, rx: number) => b.add(new THREE.SphereGeometry(0.06, 8, 6).scale(0.35, 0.65, 1), SPROUT, new THREE.Matrix4().compose(new THREE.Vector3(0.3, 0.31, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, 0, 0)), new THREE.Vector3(1, 1, 1)));
    bow(-0.06, -0.5);
    bow(0.06, 0.5);
    b.sphere(0.026, SPROUT_DARK, 0.305, 0.31, 0, 1, 1, 1, 8);
    for (const s of [-1, 1]) b.add(new THREE.BoxGeometry(0.012, 0.09, 0.026), SPROUT, new THREE.Matrix4().compose(new THREE.Vector3(0.305, 0.255, s * 0.028), new THREE.Quaternion().setFromEuler(new THREE.Euler(s * 0.4, 0, 0)), new THREE.Vector3(1, 1, 1)));
  },
  light: { sunColor: '#fff6e4', hemiSky: '#e6f6ff', hemiGround: '#d8f0c8' },
  fx: { kind: 'petals', colors: ['#ff9cc8', '#ffd0e4', '#ffffff'], count: 60 },
};

export default skin;
