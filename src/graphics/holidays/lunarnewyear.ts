// Lunar New Year (a week from the first day of the lunar year): red and gold everywhere. A long
// dragon dances on poles in a winding line, a lion-dance head waits by its drum and cymbals,
// a feast table is laid with mandarins, dumplings and tea, firecracker strings hang from a gate,
// plum blossom branches stand in vases and round red lanterns with gold tassels glow along the
// rim, on the station and on the engine. Red envelopes, mandarins, gold ingots, lanterns,
// dumplings, firecrackers, drums, fans, plum blossoms, lucky knots and teapots ride in the wagons.
import * as THREE from 'three';
import type { GeoBatch } from '../batch';
import type { HolidaySkin, Item, PropContext } from '../holiday';
import { INK, M, WHITE, polygon, shadeHex, type Kit } from '../toyModels';

const RED = '#e0262b';
const DEEP_RED = '#a8141c';
const LANTERN = '#ff3328';
const GOLD = '#f6c32e';
const DARK_GOLD = '#d4961a';
const WOOD = '#7a4a26';
const BLOSSOM = '#ffb3cc';
const LEAF = '#2f9a46';
const SKIN = '#f3e2c0';

// ------------------------------------------------------------------------------------- cargo

/** A red envelope (hongbao) standing up, gold flap and a gold coin. */
function envelope(k: Kit, c: string): void {
  k.box(0.034, 0.048, 0.007, c, 0, 0, 0);
  k.shape(polygon([[-0.017, 0.024], [0.017, 0.024], [0, 0.009]]), 0.002, GOLD, M(0, 0, 0.0045));
  k.cyl(0.0075, 0.0075, 0.002, GOLD, 0, -0.008, 0.0045, Math.PI / 2, 0, 0, 12);
  k.box(0.004, 0.004, 0.0025, shadeHex(c, -30), 0, -0.008, 0.005);
  for (const y of [-0.021, 0.021]) k.box(0.035, 0.002, 0.0075, GOLD, 0, y, 0);
}

function mandarin(k: Kit, c: string): void {
  k.sph(0.022, c, 0, -0.004, 0, 1, 0.85, 1, 14);
  k.cyl(0.002, 0.002, 0.006, WOOD, 0, 0.016, 0, 0, 0, 0, 5);
  k.sph(0.011, LEAF, 0.008, 0.018, 0.002, 1.5, 0.25, 0.7, 8);
  k.sph(0.008, shadeHex(LEAF, 8), -0.007, 0.017, -0.004, 1.4, 0.25, 0.7, 7);
}

/** A gold ingot (yuanbao): a boat with turned-up ends and a dome in the middle. */
function ingot(k: Kit, c: string): void {
  k.sph(0.02, c, 0, -0.008, 0, 1.45, 0.55, 0.95, 14);
  for (const s of [-1, 1]) k.sph(0.011, shadeHex(c, -10), s * 0.024, 0.0, 0, 0.9, 0.85, 1.4, 10);
  k.sph(0.012, shadeHex(c, 18), 0, 0.004, 0, 1, 0.95, 1, 10);
  k.sph(0.003, WHITE, 0.004, 0.012, 0.006, 1, 1, 1, 5);
}

/** A round lantern with gold caps, ribs and a tassel (Kit version, cargo size). */
function lanternCargo(k: Kit, c: string): void {
  k.sph(0.021, c, 0, 0, 0, 1.05, 0.85, 1.05, 14);
  for (let i = 0; i < 3; i++) k.tor(0.0205, 0.0013, GOLD, 0, 0, 0, 0, (i * Math.PI) / 3, 0, 14);
  for (const y of [-0.017, 0.017]) k.cyl(0.009, 0.009, 0.005, GOLD, 0, y, 0, 0, 0, 0, 10);
  k.tor(0.004, 0.0013, GOLD, 0, 0.023, 0, 0, 0, 0, 8);
  k.cyl(0.0012, 0.0012, 0.006, GOLD, 0, -0.022, 0, 0, 0, 0, 4);
  k.cone(0.004, 0.011, GOLD, 0, -0.029, 0, 0, 0, 0, 6);
}

/** Plum blossoms on a twig, facing +z. */
function blossom(k: Kit, c: string): void {
  k.cyl(0.0022, 0.003, 0.056, WOOD, 0.002, -0.002, -0.004, 0, 0, -0.6, 5);
  const flower = (x: number, y: number, r: number) => {
    for (let i = 0; i < 5; i++) {
      const a = Math.PI / 2 + (i / 5) * Math.PI * 2;
      k.sph(r, c, x + Math.cos(a) * r * 1.15, y + Math.sin(a) * r * 1.15, 0, 1, 1, 0.45, 8);
    }
    k.sph(r * 0.55, GOLD, x, y, r * 0.35, 1, 1, 0.6, 6);
  };
  flower(0.002, 0.004, 0.0085);
  flower(-0.016, -0.019, 0.0055);
  flower(0.019, 0.022, 0.005);
  k.sph(0.0035, shadeHex(c, -25), -0.019, 0.014, 0, 1, 1, 1, 5);
}

/** A folding fan, half open, facing +z, with gold ribs. */
function fan(k: Kit, c: string): void {
  k.add(new THREE.CylinderGeometry(0.03, 0.03, 0.003, 12, 1, false, -Math.PI / 2, Math.PI).rotateX(-Math.PI / 2), c, M(0, -0.012, 0));
  k.add(new THREE.CylinderGeometry(0.011, 0.011, 0.0035, 8, 1, false, -Math.PI / 2, Math.PI).rotateX(-Math.PI / 2), WHITE, M(0, -0.012, 0));
  for (let i = 0; i <= 6; i++) {
    const a = (i / 6) * Math.PI;
    k.box(0.029, 0.0016, 0.004, GOLD, Math.cos(a) * 0.015, -0.012 + Math.sin(a) * 0.015, 0, 0, 0, a);
  }
  k.sph(0.004, '#ff7aa8', -0.012, 0.004, 0.002, 1, 1, 0.5, 6);
  k.sph(0.004, '#ff7aa8', 0.009, 0.01, 0.002, 1, 1, 0.5, 6);
  k.box(0.004, 0.012, 0.004, WOOD, 0, -0.019, 0);
  k.sph(0.003, GOLD, 0, -0.012, 0.002, 1, 1, 1, 6);
}

/** A lucky knot: a diamond with loops, a bead and a tassel, facing +z. */
function luckyKnot(k: Kit, c: string): void {
  k.box(0.022, 0.022, 0.006, c, 0, 0.004, 0, 0, 0, Math.PI / 4);
  k.box(0.012, 0.012, 0.0075, shadeHex(c, -20), 0, 0.004, 0, 0, 0, Math.PI / 4);
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    k.tor(0.0055, 0.0017, c, Math.cos(a) * 0.017, 0.004 + Math.sin(a) * 0.017, 0, 0, 0, 0, 8);
  }
  k.tor(0.004, 0.0013, c, 0, 0.026, 0, 0, 0, 0, 8);
  k.sph(0.0035, GOLD, 0, -0.014, 0, 1, 1, 1, 6);
  k.cone(0.006, 0.016, c, 0, -0.025, 0, Math.PI, 0, 0, 7);
}

/** A bundle of three firecrackers tied with gold, with a fuse. */
function firecracker(k: Kit, c: string): void {
  for (const [x, z] of [[-0.009, 0.005], [0.009, 0.005], [0, -0.01]] as const) {
    k.cyl(0.0085, 0.0085, 0.044, c, x, -0.002, z, 0, 0, 0, 10);
    k.cyl(0.0088, 0.0088, 0.004, GOLD, x, 0.016, z, 0, 0, 0, 10);
    k.cyl(0.0088, 0.0088, 0.004, GOLD, x, -0.02, z, 0, 0, 0, 10);
  }
  k.cyl(0.018, 0.018, 0.005, GOLD, 0, -0.002, 0, 0, 0, 0, 12);
  k.tor(0.005, 0.0012, INK, 0.004, 0.025, 0, 0, 0, 0, 8, Math.PI);
}

function dumpling(k: Kit, c: string): void {
  k.sph(0.021, c, 0, -0.01, 0, 1.3, 0.7, 0.85, 12);
  for (let i = 0; i < 5; i++) k.sph(0.0058, shadeHex(c, -12), -0.016 + i * 0.008, 0.003 + (i % 4 === 0 ? -0.003 : 0), 0, 0.9, 1.1, 0.7, 6);
  k.sph(0.003, '#ff7a8a', 0.012, -0.004, 0.015, 1, 0.6, 0.4, 5);
  k.sph(0.003, '#ff7a8a', -0.012, -0.004, 0.015, 1, 0.6, 0.4, 5);
}

/** A festival drum with skins, gold studs and crossed sticks. */
function drum(k: Kit, c: string): void {
  k.sph(0.022, c, 0, -0.004, 0, 1, 0.75, 1, 12);
  for (const y of [-0.016, 0.009]) k.cyl(0.018, 0.018, 0.003, SKIN, 0, y, 0, 0, 0, 0, 12);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    k.sph(0.0022, GOLD, Math.cos(a) * 0.0185, 0.005, Math.sin(a) * 0.0185, 1, 1, 1, 5);
  }
  for (const s of [-1, 1]) {
    k.cyl(0.0016, 0.0016, 0.036, WOOD, s * 0.006, 0.02, 0, 0, 0, s * 0.7, 5);
    k.sph(0.003, RED, s * 0.017, 0.031, 0, 1, 1, 1, 5);
  }
}

function teapot(k: Kit, c: string): void {
  k.sph(0.019, c, 0, -0.006, 0, 1.1, 0.85, 1.1, 12);
  k.cyl(0.0205, 0.0205, 0.004, GOLD, 0, -0.004, 0, 0, 0, 0, 12);
  k.dome(0.009, shadeHex(c, 12), 0, 0.009, 0, 1, 0.7, 1, 10);
  k.sph(0.0035, GOLD, 0, 0.016, 0, 1, 1, 1, 6);
  k.cyl(0.003, 0.005, 0.02, c, 0.022, 0.002, 0, 0, 0, -0.8, 6);
  k.tor(0.008, 0.0025, c, -0.021, -0.004, 0, 0, 0, 0, 8, Math.PI * 1.2);
}

// ------------------------------------------------------------------------------------- shared parts

/** A round lantern of radius `r` centred at the frame's origin, body glowing red. */
function lanternAt(b: GeoBatch, glow: GeoBatch, f: THREE.Matrix4, r: number, body = LANTERN): void {
  glow.add(new THREE.SphereGeometry(r, 12, 8).scale(1.05, 0.85, 1.05), body, f);
  for (let i = 0; i < 3; i++) b.add(new THREE.TorusGeometry(r * 0.99, r * 0.05, 4, 14).rotateY((i * Math.PI) / 3).scale(1.05, 0.86, 1.05), GOLD, f);
  for (const y of [-0.8, 0.8]) b.add(new THREE.CylinderGeometry(r * 0.45, r * 0.45, r * 0.22, 10).translate(0, y * r, 0), GOLD, f);
  b.add(new THREE.CylinderGeometry(r * 0.05, r * 0.05, r * 0.4, 4).translate(0, -r * 1.1, 0), GOLD, f);
  b.add(new THREE.ConeGeometry(r * 0.2, r * 0.6, 6).translate(0, -r * 1.55, 0), GOLD, f);
}

// ------------------------------------------------------------------------------------- props

/** A wooden post with an arm and a hanging lantern (about 0.75 tall). */
function lanternPost({ b, glow, m, variant }: PropContext): void {
  b.add(new THREE.CylinderGeometry(0.1, 0.12, 0.05, 10), DEEP_RED, m(0, 0.025, 0));
  b.add(new THREE.CylinderGeometry(0.018, 0.022, 0.75, 6), WOOD, m(0, 0.4, 0));
  b.add(new THREE.BoxGeometry(0.26, 0.025, 0.025), WOOD, m(0.1, 0.74, 0));
  b.add(new THREE.SphereGeometry(0.028, 8, 6), GOLD, m(0, 0.79, 0));
  b.add(new THREE.CylinderGeometry(0.004, 0.004, 0.08, 4), GOLD, m(0.19, 0.69, 0));
  lanternAt(b, glow, m(0.19, 0.55, 0), 0.1, variant % 3 === 2 ? '#ffb02e' : LANTERN);
}

/** One body segment of the dancing dragon on its pole; the variant sets how high it is held. */
function dragonBody({ b, m, variant }: PropContext): void {
  const y = 0.42 + [0, 0.07, 0.11, 0.05][variant % 4]!;
  b.add(new THREE.CylinderGeometry(0.012, 0.014, y, 6), WOOD, m(0, y / 2, 0));
  b.add(new THREE.SphereGeometry(0.1, 12, 8).scale(1.4, 0.85, 0.85), variant % 2 ? RED : shadeHex(RED, 8), m(0, y + 0.03, 0));
  b.add(new THREE.SphereGeometry(0.08, 10, 6).scale(1.5, 0.5, 0.95), GOLD, m(0, y - 0.015, 0));
  b.add(new THREE.TorusGeometry(0.086, 0.012, 5, 14).rotateY(Math.PI / 2), GOLD, m(0, y + 0.03, 0));
  for (const x of [-0.07, 0.04]) b.add(new THREE.ConeGeometry(0.03, 0.08, 4), GOLD, m(x, y + 0.13, 0, 0, 1).multiply(new THREE.Matrix4().makeRotationZ(0.35)));
  for (const s of [-1, 1]) b.add(new THREE.SphereGeometry(0.018, 6, 5), '#fff3b0', m(-0.08, y - 0.03, s * 0.06));
}

/** The dragon's tail on its pole: a smaller segment and a fan of golden fins. */
function dragonTail({ b, m }: PropContext): void {
  const y = 0.44;
  b.add(new THREE.CylinderGeometry(0.012, 0.014, y, 6), WOOD, m(0, y / 2, 0));
  b.add(new THREE.SphereGeometry(0.08, 10, 8).scale(1.4, 0.8, 0.8), RED, m(0, y + 0.03, 0));
  for (const [a, c] of [[0.5, GOLD], [0, DARK_GOLD], [-0.5, GOLD]] as const) b.add(new THREE.ConeGeometry(0.04, 0.2, 5).rotateZ(Math.PI / 2 + a), c, m(-0.18, y + 0.05 + a * 0.1, 0));
}

/** The dragon's head on its pole: snout, open jaw, big eyes, horns and whiskers, facing +x. */
function dragonHead({ b, glow, m, mr }: PropContext): void {
  const y = 0.5;
  b.add(new THREE.CylinderGeometry(0.014, 0.016, y, 6), WOOD, m(0, y / 2, 0));
  b.add(new THREE.SphereGeometry(0.13, 14, 10).scale(1.1, 0.9, 0.95), RED, m(0, y + 0.06, 0));
  b.add(new THREE.BoxGeometry(0.16, 0.08, 0.16), GOLD, m(0.14, y + 0.07, 0));
  b.add(new THREE.BoxGeometry(0.15, 0.03, 0.14), DEEP_RED, mr(0.14, y - 0.03, 0, 0, 0, -0.25));
  b.add(new THREE.SphereGeometry(0.03, 8, 6).scale(1.6, 0.4, 1), '#ff7a9a', m(0.16, y - 0.0, 0));
  for (const s of [-1, 1]) {
    b.add(new THREE.SphereGeometry(0.045, 10, 8), WHITE, m(0.07, y + 0.14, s * 0.07));
    b.add(new THREE.SphereGeometry(0.022, 8, 6), INK, m(0.105, y + 0.145, s * 0.08));
    b.add(new THREE.ConeGeometry(0.025, 0.16, 6), GOLD, mr(-0.06, y + 0.22, s * 0.06, s * 0.3, 0, 0.7));
    b.add(new THREE.CylinderGeometry(0.006, 0.006, 0.22, 4), GOLD, mr(0.25, y + 0.06, s * 0.1, s * 0.9, 0, -1.2));
    b.add(new THREE.SphereGeometry(0.02, 6, 5), WHITE, m(0.21, y + 0.03, s * 0.06));
    for (const t of [0, 1, 2]) b.add(new THREE.SphereGeometry(0.035, 6, 5), t % 2 ? WHITE : GOLD, m(-0.12, y + 0.0 + t * 0.06, s * 0.1));
  }
  glow.add(new THREE.SphereGeometry(0.022, 8, 6), '#ffe066', m(0.23, y + 0.11, 0));
}

/** A lion-dance head sitting on the ground: big eyes, a single horn, a furry fringe. */
function lionHead({ b, m, mr }: PropContext): void {
  b.add(new THREE.SphereGeometry(0.24, 16, 12).scale(1, 0.85, 1.05), RED, m(0, 0.22, 0));
  b.add(new THREE.SphereGeometry(0.2, 14, 10).scale(0.6, 0.75, 1), GOLD, m(0.1, 0.22, 0));
  b.add(new THREE.BoxGeometry(0.1, 0.06, 0.28), DEEP_RED, m(0.2, 0.08, 0));
  b.add(new THREE.SphereGeometry(0.06, 10, 8).scale(1, 0.8, 1.2), '#ff7aa8', m(0.24, 0.18, 0));
  b.add(new THREE.ConeGeometry(0.04, 0.14, 8), GOLD, mr(0.05, 0.46, 0, 0, 0, -0.3));
  b.add(new THREE.SphereGeometry(0.03, 8, 6), '#2bb3a6', m(0.17, 0.32, 0));
  for (const s of [-1, 1]) {
    b.add(new THREE.SphereGeometry(0.07, 12, 10), WHITE, m(0.17, 0.3, s * 0.12));
    b.add(new THREE.SphereGeometry(0.038, 10, 8), INK, m(0.22, 0.31, s * 0.13));
    b.add(new THREE.TorusGeometry(0.07, 0.012, 5, 12, Math.PI).rotateY(Math.PI / 2), GOLD, m(0.18, 0.33, s * 0.12));
    b.add(new THREE.SphereGeometry(0.08, 10, 8).scale(0.5, 1, 0.6), '#2f9a46', m(0.0, 0.38, s * 0.2));
  }
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI / 2 + (i / 8) * Math.PI;
    b.add(new THREE.SphereGeometry(0.045, 6, 5), i % 2 ? WHITE : GOLD, m(-0.02 + Math.cos(a) * 0.02, 0.4 + Math.cos(a) * 0.05, Math.sin(a) * 0.24));
  }
  // The dancers' cloth trailing behind, with a gold stripe and white fur along its spine.
  b.add(new THREE.SphereGeometry(0.22, 12, 8).scale(1.5, 0.6, 1.05), shadeHex(RED, -10), m(-0.3, 0.06, 0));
  b.add(new THREE.SphereGeometry(0.2, 12, 6).scale(1.55, 0.55, 0.5), GOLD, m(-0.3, 0.075, 0));
  for (let i = 0; i < 4; i++) b.add(new THREE.SphereGeometry(0.04, 6, 5), WHITE, m(-0.18 - i * 0.1, 0.18 - i * 0.02, 0));
}

/** A big red drum on a wooden stand, with two sticks, and a pair of cymbals beside it. */
function drumProp({ b, m, mr }: PropContext): void {
  for (const [x, z] of [[-0.12, -0.12], [0.12, -0.12], [-0.12, 0.12], [0.12, 0.12]] as const) b.add(new THREE.CylinderGeometry(0.014, 0.014, 0.2, 5), WOOD, m(x, 0.1, z));
  b.add(new THREE.CylinderGeometry(0.2, 0.2, 0.2, 16).scale(1, 1, 1), RED, m(0, 0.3, 0));
  b.add(new THREE.SphereGeometry(0.22, 16, 6, 0, Math.PI * 2, Math.PI * 0.35, Math.PI * 0.3), RED, m(0, 0.3, 0));
  b.add(new THREE.CylinderGeometry(0.19, 0.19, 0.012, 16), SKIN, m(0, 0.41, 0));
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    b.add(new THREE.SphereGeometry(0.012, 5, 4), GOLD, m(Math.cos(a) * 0.205, 0.385, Math.sin(a) * 0.205));
  }
  for (const s of [-1, 1]) {
    b.add(new THREE.CylinderGeometry(0.008, 0.008, 0.26, 5), WOOD, mr(0.02, 0.46, s * 0.06, s * 0.2, 0, 1.0));
    b.add(new THREE.SphereGeometry(0.018, 6, 5), RED, m(0.13, 0.53, s * 0.08));
    // Cymbals leaning on the stand.
    b.add(new THREE.SphereGeometry(0.11, 12, 4, 0, Math.PI * 2, 0, Math.PI * 0.25).scale(1, 0.5, 1), GOLD, mr(0.33, 0.1 + (s + 1) * 0.02, s * 0.1, 0, 0, 1.3));
  }
}

/** A low red table laid for the feast: mandarins, dumplings, a teapot and cups. */
function feastTable({ b, m }: PropContext): void {
  b.add(new THREE.BoxGeometry(0.7, 0.04, 0.5), RED, m(0, 0.2, 0));
  b.add(new THREE.BoxGeometry(0.74, 0.02, 0.54), GOLD, m(0, 0.185, 0));
  for (const [x, z] of [[-0.31, -0.21], [0.31, -0.21], [-0.31, 0.21], [0.31, 0.21]] as const) b.add(new THREE.BoxGeometry(0.04, 0.18, 0.04), DEEP_RED, m(x, 0.09, z));
  // Mandarins piled on a gold plate.
  b.add(new THREE.CylinderGeometry(0.11, 0.08, 0.02, 14), GOLD, m(-0.18, 0.24, -0.06));
  for (const [x, y, z] of [[-0.22, 0.28, -0.1], [-0.14, 0.28, -0.1], [-0.18, 0.28, -0.02], [-0.18, 0.34, -0.07]] as const) {
    b.add(new THREE.SphereGeometry(0.042, 10, 8).scale(1, 0.88, 1), '#ff9a1a', m(x, y, z));
    b.add(new THREE.SphereGeometry(0.014, 6, 4).scale(1.6, 0.3, 0.8), LEAF, m(x + 0.01, y + 0.04, z));
  }
  // Dumplings on a white plate.
  b.add(new THREE.CylinderGeometry(0.1, 0.08, 0.016, 14), WHITE, m(0.16, 0.238, 0.08));
  for (const [x, z, a] of [[0.12, 0.05, 0.3], [0.2, 0.06, -0.4], [0.15, 0.12, 1.2], [0.21, 0.13, 0.9]] as const) {
    b.add(new THREE.SphereGeometry(0.035, 8, 6).scale(1.3, 0.7, 0.85), '#fff4e2', m(x, 0.26, z, a));
    b.add(new THREE.BoxGeometry(0.06, 0.016, 0.012), '#f0dcc0', m(x, 0.282, z, a));
  }
  // A teapot and three cups.
  b.add(new THREE.SphereGeometry(0.055, 10, 8).scale(1.1, 0.85, 1.1), '#3f7fd0', m(0.15, 0.29, -0.13));
  b.add(new THREE.SphereGeometry(0.02, 6, 5), GOLD, m(0.15, 0.345, -0.13));
  b.add(new THREE.CylinderGeometry(0.01, 0.016, 0.07, 6), '#3f7fd0', m(0.21, 0.3, -0.13, 0).multiply(new THREE.Matrix4().makeRotationZ(-0.8)));
  for (const [x, z] of [[0.0, -0.17], [0.0, 0.15], [-0.25, 0.14]] as const) b.add(new THREE.CylinderGeometry(0.025, 0.018, 0.035, 8), WHITE, m(x, 0.245, z));
}

/** A floor cushion beside the table. */
function cushion({ b, m, variant }: PropContext): void {
  const c = [RED, GOLD, '#ff7aa8', DEEP_RED][variant % 4]!;
  b.add(new THREE.BoxGeometry(0.22, 0.06, 0.22), c, m(0, 0.04, 0));
  b.add(new THREE.SphereGeometry(0.02, 6, 5), c === GOLD ? RED : GOLD, m(0, 0.075, 0));
}

/** A red gate post with a long string of firecrackers hanging from its arm. */
function firecrackers({ b, glow, m }: PropContext): void {
  b.add(new THREE.BoxGeometry(0.05, 0.9, 0.05), RED, m(0, 0.45, 0));
  b.add(new THREE.BoxGeometry(0.3, 0.04, 0.05), GOLD, m(0.1, 0.88, 0));
  b.add(new THREE.CylinderGeometry(0.004, 0.004, 0.7, 4), DARK_GOLD, m(0.2, 0.52, 0));
  for (let i = 0; i < 10; i++) {
    const y = 0.82 - i * 0.065;
    for (const s of [-1, 1]) b.add(new THREE.CylinderGeometry(0.014, 0.014, 0.07, 6).rotateZ(s * 0.9), i % 3 === 2 ? GOLD : RED, m(0.2 + s * 0.022, y, 0));
  }
  glow.add(new THREE.SphereGeometry(0.03, 8, 6), '#ffe066', m(0.2, 0.15, 0));
  b.add(new THREE.SphereGeometry(0.05, 8, 6).scale(1.3, 0.5, 1.3), GOLD, m(0.1, 0.86, 0.04));
}

/** Plum blossom branches in a round vase. */
function plumVase({ b, m, mr }: PropContext): void {
  b.add(new THREE.SphereGeometry(0.1, 12, 8).scale(1, 1.2, 1), '#2f6fc0', m(0, 0.12, 0));
  b.add(new THREE.CylinderGeometry(0.045, 0.06, 0.06, 10), '#2f6fc0', m(0, 0.25, 0));
  b.add(new THREE.TorusGeometry(0.1, 0.008, 4, 14).rotateX(Math.PI / 2), WHITE, m(0, 0.13, 0));
  // Three crooked branches leaning out of the vase, blossoms all along them.
  const branches: [number, number, number][] = [[0.15, 0.1, 0.5], [-0.55, 0.9, 0.42], [0.6, -1.2, 0.46]];
  for (const [rz, ry, len] of branches) {
    const base = mr(0, 0.27, 0, 0, ry, rz).multiply(new THREE.Matrix4().makeTranslation(0, len / 2, 0));
    b.add(new THREE.CylinderGeometry(0.009, 0.015, len, 5), '#5a3420', base);
    b.add(new THREE.CylinderGeometry(0.006, 0.008, len * 0.4, 4).rotateZ(-0.8).translate(0.06, len * 0.12, 0), '#5a3420', base);
    for (let i = 0; i < 6; i++) {
      const t = -0.2 + i * 0.15;
      const side = i % 2 ? 1 : -1;
      const blossom = base.clone().multiply(new THREE.Matrix4().makeTranslation(side * 0.022, t * len + 0.08, side * 0.012));
      b.add(new THREE.SphereGeometry(0.036, 7, 5), i % 3 === 1 ? '#ff7fae' : BLOSSOM, blossom);
      b.add(new THREE.SphereGeometry(0.013, 5, 4), GOLD, blossom.multiply(new THREE.Matrix4().makeTranslation(0, 0.02, 0.025)));
    }
  }
}

/** A heap of gold ingots and red envelopes. */
function treasure({ b, m }: PropContext): void {
  const ing = (x: number, y: number, z: number, a: number) => {
    b.add(new THREE.SphereGeometry(0.08, 12, 8).scale(1.45, 0.55, 0.95), GOLD, m(x, y, z, a));
    for (const s of [-1, 1]) b.add(new THREE.SphereGeometry(0.045, 8, 6).scale(0.9, 0.85, 1.4), DARK_GOLD, m(x + Math.cos(a) * s * 0.095, y + 0.03, z - Math.sin(a) * s * 0.095, a));
    b.add(new THREE.SphereGeometry(0.048, 8, 6), '#ffe27a', m(x, y + 0.05, z));
  };
  ing(0, 0.04, 0, 0.2);
  ing(0.2, 0.04, 0.12, 1.2);
  ing(0.08, 0.13, 0.05, 0.6);
  for (const [x, z, a] of [[-0.22, 0.1, 0.4], [-0.18, -0.15, 1.3], [0.22, -0.16, 2.2]] as const) {
    b.add(new THREE.BoxGeometry(0.13, 0.012, 0.18), RED, m(x, 0.008, z, a));
    b.add(new THREE.CylinderGeometry(0.03, 0.03, 0.004, 10), GOLD, m(x, 0.016, z, a));
  }
}

// ------------------------------------------------------------------------------------- scenes

/** A dragon dancing in a winding line toward +x: tail, `n` body segments on poles, head. */
function dragon(n: number, gap: number, amp: number, scale: number, x0: number, dz = 0): Item[] {
  const k = (Math.PI * 2) / (gap * 5);
  const at = (i: number): [number, number, number] => {
    const x = x0 + i * gap;
    const z = dz + amp * Math.sin(k * x);
    const yaw = Math.atan2(-amp * k * Math.cos(k * x), 1);
    return [x, z, yaw];
  };
  const items: Item[] = [];
  const [tx, tz, ty] = at(0);
  items.push(['lny.dragonTail', tx, tz, ty, scale, 0, 0]);
  for (let i = 1; i <= n; i++) {
    const [x, z, yaw] = at(i);
    items.push(['lny.dragonBody', x, z, yaw, scale, 0, i]);
  }
  const [hx, hz, hy] = at(n + 1);
  items.push(['lny.dragonHead', hx, hz, hy, scale, 0, 0]);
  return items;
}

// ------------------------------------------------------------------------------------- the skin

const skin: HolidaySkin = {
  id: 'lunarnewyear',
  name: 'Lunar New Year',
  greeting: 'Happy Lunar New Year!',
  cargo: { red: envelope, orange: mandarin, yellow: ingot, blue: lanternCargo, pink: blossom, purple: fan, teal: luckyKnot, green: firecracker, white: dumpling, brown: drum, gray: teapot },
  props: {
    'lny.lantern': lanternPost,
    'lny.dragonBody': dragonBody,
    'lny.dragonTail': dragonTail,
    'lny.dragonHead': dragonHead,
    'lny.lion': lionHead,
    'lny.drum': drumProp,
    'lny.table': feastTable,
    'lny.cushion': cushion,
    'lny.firecrackers': firecrackers,
    'lny.plum': plumVase,
    'lny.treasure': treasure,
  },
  inside: [
    { name: 'dragonDance', w: 2, h: 1, items: dragon(4, 0.27, 0.12, 0.8, -0.8) },
    { name: 'feast', w: 2, h: 2, items: [['lny.table', 0, 0, 0, 1.1], ['lny.cushion', 0, -0.48, 0, 1, 0, 0], ['lny.cushion', 0, 0.48, 0, 1, 0, 1], ['lny.cushion', -0.6, 0, 0, 1, 0, 2], ['lny.cushion', 0.6, 0, 0, 1, 0, 3], ['lny.plum', -0.6, -0.55, 0, 0.9], ['lny.lantern', 0.55, 0.5, Math.PI * 0.75, 0.9, 0, 0]] },
    { name: 'lionDance', w: 2, h: 2, items: [['lny.lion', -0.25, 0.1, -0.4, 1.1], ['lny.drum', 0.45, -0.35, 2.4, 0.9], ['lny.firecrackers', 0.5, 0.45, Math.PI, 0.9], ['lny.cushion', -0.6, -0.6, 0, 1, 0, 1]] },
    { name: 'lanterns', w: 2, h: 1, items: [['lny.lantern', -0.6, 0.05, 0, 0.9, 0, 0], ['lny.lantern', 0.05, -0.05, 0, 0.9, 0, 2], ['lny.treasure', 0.65, 0.05, 0.4, 1]] },
    { name: 'plumBlossom', w: 2, h: 1, items: [['lny.plum', -0.55, 0, 0, 1.1], ['lny.treasure', 0.1, 0.05, 1, 0.9], ['lny.plum', 0.65, -0.05, 2, 0.9]] },
  ],
  outside: [
    { name: 'dragonParade', w: 2.8, h: 0, items: dragon(6, 0.62, 0.35, 2.3, -2.4) },
    { name: 'lionDance', w: 2.2, h: 0, items: [['lny.lion', 0, 0, 0.3, 3], ['lny.drum', 1.5, -0.6, 2.6, 2.6], ['lny.firecrackers', -1.3, -0.5, 0.3, 2.8], ['lny.firecrackers', 1.3, 0.9, 2.2, 2.8]] },
    { name: 'feastTable', w: 2.2, h: 0, items: [['lny.table', 0, 0, 0.2, 3], ['lny.lantern', -1.4, -0.4, 0, 3, 0, 0], ['lny.plum', 1.4, 0.5, 0, 3], ['lny.treasure', 0.9, -1.1, 0.5, 2.6]] },
  ],
  edge(b, glow, spot) {
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), spot.yaw);
    const at = (x: number, y: number, z: number, scale = 1) => {
      const c = Math.cos(spot.yaw);
      const s = Math.sin(spot.yaw);
      return new THREE.Matrix4().compose(new THREE.Vector3(spot.x + x * c + z * s, y, spot.z - x * s + z * c), q, new THREE.Vector3(scale, scale, scale));
    };
    if (spot.corner) {
      // A tall post with a big lantern on each corner.
      b.add(new THREE.CylinderGeometry(0.025, 0.03, 0.62, 6), RED, at(0.03, 0.31, 0));
      b.add(new THREE.BoxGeometry(0.03, 0.03, 0.22), GOLD, at(0.03, 0.6, 0.06));
      b.add(new THREE.SphereGeometry(0.035, 8, 6), GOLD, at(0.03, 0.64, 0));
      lanternAt(b, glow, at(0.03, 0.44, 0.15), 0.1);
      return;
    }
    // A red cloth swag along the rim with gold trim, and a small lantern on a hook.
    b.add(new THREE.CapsuleGeometry(0.045, 0.6, 3, 8).rotateX(Math.PI / 2), RED, at(0.02, 0.035, 0));
    b.add(new THREE.CapsuleGeometry(0.012, 0.62, 2, 5).rotateX(Math.PI / 2), GOLD, at(0.06, 0.06, 0));
    b.add(new THREE.CylinderGeometry(0.008, 0.008, 0.26, 4), GOLD, at(0.04, 0.16, -0.18));
    b.add(new THREE.BoxGeometry(0.008, 0.008, 0.08), GOLD, at(0.04, 0.29, -0.14));
    lanternAt(b, glow, at(0.04, 0.2, -0.11), 0.07, spot.index % 3 === 0 ? '#ffb02e' : LANTERN);
    // Plum blossoms sprinkled on the swag.
    for (const z of [0.12, 0.24]) b.add(new THREE.SphereGeometry(0.022, 7, 5), spot.index % 2 ? BLOSSOM : GOLD, at(0.05, 0.08, z));
  },
  station(b, f) {
    // Gold trim along the eaves, red lanterns hanging under them, firecracker strings either side
    // and a red diamond banner over the door.
    b.add(new THREE.BoxGeometry(f.width + 0.04, 0.025, 0.02), GOLD, f.m(0, f.roofY + 0.01, f.frontZ + 0.03));
    for (let x = -f.width / 2 + 0.18, i = 0; x < f.width / 2 - 0.1; x += 0.3, i++) {
      b.add(new THREE.CylinderGeometry(0.003, 0.003, 0.05, 4), GOLD, f.m(x, f.roofY - 0.02, f.frontZ + 0.06));
      lanternAt(b, b, f.m(x, f.roofY - 0.08, f.frontZ + 0.06), 0.045, i % 3 === 1 ? '#ffb02e' : LANTERN);
    }
    for (const x of [-f.width / 2 + 0.04, f.width / 2 - 0.04]) {
      for (let i = 0; i < 6; i++) b.add(new THREE.CylinderGeometry(0.01, 0.01, 0.045, 6).rotateZ(i % 2 ? 0.9 : -0.9), i % 3 === 2 ? GOLD : RED, f.m(x, f.roofY - 0.06 - i * 0.045, f.frontZ + 0.04));
    }
    b.add(new THREE.BoxGeometry(0.13, 0.13, 0.012), RED, f.m(0, 0.36, f.frontZ + 0.02, 0, 0, Math.PI / 4));
    b.add(new THREE.BoxGeometry(0.1, 0.1, 0.014), GOLD, f.m(0, 0.36, f.frontZ + 0.021, 0, 0, Math.PI / 4));
    b.add(new THREE.BoxGeometry(0.075, 0.075, 0.016), RED, f.m(0, 0.36, f.frontZ + 0.022, 0, 0, Math.PI / 4));
  },
  engine(b) {
    // A little red lantern hanging from a gold pole on the cab roof, and a gold band on the roof.
    b.cylinder(0.006, 0.006, 0.14, GOLD, -0.22, 0.49, 0, 6);
    b.box(0.08, 0.008, 0.008, GOLD, -0.19, 0.555, 0);
    b.cylinder(0.003, 0.003, 0.03, GOLD, -0.155, 0.54, 0, 4);
    lanternAt(b, b, new THREE.Matrix4().makeTranslation(-0.155, 0.495, 0), 0.032, LANTERN);
  },
  light: { sunColor: '#fff0dc' },
  fx: { kind: 'petals', colors: ['#ffb3cc', '#ff8fb4', '#ffe3ec', '#f6c32e'], count: 60 },
};

export default skin;
