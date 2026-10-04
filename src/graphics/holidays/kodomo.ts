// Children's Day (Kodomo no Hi, 3–5 May in Japan): carp streamers fly everywhere. Tall poles
// with a spinning arrow wheel and a striped windsock on top carry a whole carp family (black
// father, red mother, blue and green children); a helmet display stands on a red stand before a
// gold folding screen with little lamps, a low table is laid with oak-leaf rice cakes, chimaki and
// green tea, a drum waits on its stand, irises stand in a vase and a craft corner is strewn with
// origami paper, cranes and a folded paper helmet. Little carp streamers on sticks line the rim,
// the station flies a pole of carps and bunting, the engine a small carp. Carp streamers, samurai
// helmets, oak-leaf rice cakes, irises, paper cranes, paper boats, pellet drums, windsocks,
// chimaki and daruma dolls ride in the wagons.
import * as THREE from 'three';
import type { GeoBatch } from '../batch';
import type { HolidaySkin, PropContext } from '../holiday';
import { INK, Kit, M, WHITE, paintFaces, polygon, shadeHex } from '../toyModels';

const RED = '#e8343a';
const BLACK = '#2a2e3e';
const BLUE = '#2f7fe8';
const GREEN = '#3fb35a';
const ORANGE = '#ff8a2a';
const GOLD = '#f6c32e';
const LEAF = '#3f9a3f';
const WOOD = '#c98a52';
const DARK_WOOD = '#7a4a26';
const POLE = '#f4ead8';
const LACQUER = '#d42a2f';
const NAVY = '#26336a';
const MOCHI = '#fbf6ea';
const STRAW = '#e8d29a';
const BELLY = '#fff4dc';
const SOCK = [BLUE, RED, GOLD, WHITE, GREEN];
const CARPS = [RED, BLUE, BLACK, GREEN, ORANGE, '#ff6fa5'];

/** Builds Kit models (cargo-sized parts) into a batch at a placement. */
function kitInto(b: GeoBatch, build: (k: Kit) => void, m: THREE.Matrix4): void {
  const k = new Kit();
  build(k);
  for (const g of k.parts) {
    b.addColored(g, m);
    g.dispose();
  }
}

// ------------------------------------------------------------------------------------- streamers

/** How a streamer billows: a gentle wave along it and a little sag toward the tail. */
const wave = (u: number, len: number, phase: number) => Math.sin(u * Math.PI * 2 + phase) * len * 0.035 - u * u * len * 0.07;

/** A cloth tube from its mouth at the origin along +x, painted face by face. */
function tube(len: number, r0: number, r1: number, seg: number, rows: number, phase: number, paint: (u: number, a: number, h: number) => string): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(r1, r0, len, seg, rows, false).rotateZ(-Math.PI / 2).translate(len / 2, 0, 0);
  const p = g.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    const u = p.getX(i) / len;
    p.setY(i, p.getY(i) + wave(u, len, phase));
    p.setZ(i, p.getZ(i) * (1 - u * 0.25));
  }
  g.computeVertexNormals();
  return paintFaces(g, (x, y, z) => {
    const u = x / len;
    const yc = y - wave(u, len, phase);
    return paint(u, Math.atan2(z, yc), yc / (r0 + (r1 - r0) * u));
  });
}

/** A carp streamer, mouth at (x, y, z), flying along +x: scales, white mouth ring, big eyes, forked tail. */
function carp(k: Kit, c: string, len: number, x: number, y: number, z: number, phase = 0, seg = 12, fat = 0.17): void {
  const r = len * fat;
  const w = (u: number) => y + wave(u, len, phase);
  const fine = seg >= 12;
  const hi = shadeHex(c, c === BLACK ? 55 : 32);
  k.parts.push(
    tube(len, r, r * 0.42, seg, fine ? 12 : 4, phase, (u, a, h) => {
      if (u < 0.02) return shadeHex(c, -40);
      if (u > 0.98) return c;
      if (h < -0.45 && u > 0.08) return BELLY;
      if (!fine || u < 0.22) return c;
      return (u * 6 + (Math.abs(a) / Math.PI) * 0.5) % 1 < 0.32 ? hi : c;
    }).translate(x, y, z),
  );
  k.tor(r * 1.02, r * 0.13, WHITE, x, w(0), z, 0, Math.PI / 2, 0, seg);
  if (fine) k.tor(r * 0.9, r * 0.07, GOLD, x + len * 0.24, w(0.24), z, 0, Math.PI / 2, 0, seg, Math.PI * 2);
  for (const s of [-1, 1]) {
    const ez = z + s * r * 0.8;
    const ey = w(0.11) + r * 0.22;
    k.sph(r * 0.36, WHITE, x + len * 0.11, ey, ez, 1, 1, 0.5, 7);
    if (fine) k.sph(r * 0.24, GOLD, x + len * 0.11, ey, ez + s * r * 0.07, 1, 1, 0.45, 6);
    k.sph(r * (fine ? 0.14 : 0.18), INK, x + len * 0.11, ey, ez + s * r * 0.12, 1, 1, 0.45, 5);
    if (fine) k.shape(polygon([[0, 0], [len * 0.13, -r * 0.15], [len * 0.04, -r * 0.65]]), r * 0.06, hi, M(x + len * 0.3, w(0.3) - r * 0.35, z + s * r * 0.7, s * 0.6, 0, 0));
  }
  k.shape(polygon([[0, r * 0.32], [len * 0.26, r * 1.05], [len * 0.15, 0], [len * 0.26, -r * 1.05], [0, -r * 0.32]]), r * 0.08, hi, M(x + len * 0.96, w(1), z, 1.1, 0, 0));
}

/** The striped windsock that flies above the carps. */
function windsock(k: Kit, colors: string[], len: number, x: number, y: number, z: number, phase = 1, seg = 10): void {
  const r = len * 0.13;
  k.parts.push(
    tube(len, r, r * 0.8, seg, 4, phase, (u, a) => (u < 0.02 ? GOLD : (colors[Math.floor(((a + Math.PI) / (Math.PI * 2)) * seg) % colors.length] as string))).translate(x, y, z),
  );
  k.tor(r * 1.03, r * 0.12, GOLD, x, y + wave(0, len, phase), z, 0, Math.PI / 2, 0, seg);
}

// ------------------------------------------------------------------------------------- cargo

/** A little carp streamer on a stick (the hero). */
function carpCargo(k: Kit, c: string): void {
  k.cyl(0.0018, 0.0022, 0.056, DARK_WOOD, -0.022, 0, 0, 0, 0, 0, 5);
  k.sph(0.0035, GOLD, -0.022, 0.029, 0, 1, 1, 1, 6);
  carp(k, c, 0.042, -0.02, 0.012, 0, 0.6, 10, 0.24);
}

/** A samurai helmet: domed bowl with gold ribs, flared neck guard laced in red, gold horns. */
function kabuto(k: Kit, c: string): void {
  k.dome(0.019, c, 0, -0.006, 0, 1, 0.95, 1, 12);
  for (let i = 0; i < 4; i++) k.tor(0.0192, 0.0009, GOLD, 0, -0.006, 0, 0, (i / 4) * Math.PI, 0, 12, Math.PI);
  k.cyl(0.021, 0.029, 0.012, shadeHex(c, -18), -0.003, -0.012, 0, 0, 0, 0, 14);
  for (const y of [-0.009, -0.015]) k.cyl(0.0245 + (y + 0.009) * -0.6, 0.0255 + (y + 0.009) * -0.6, 0.0018, RED, -0.003, y, 0, 0, 0, 0, 14);
  k.box(0.01, 0.003, 0.032, shadeHex(c, -30), 0.019, -0.006, 0, 0, 0, -0.4);
  for (const s of [-1, 1]) {
    k.box(0.004, 0.012, 0.011, c, 0.012, -0.009, s * 0.021, 0, s * 0.7, 0);
    k.box(0.003, 0.028, 0.0045, GOLD, 0.021, 0.011, s * 0.009, s * 0.4, 0, -0.15);
  }
  k.cyl(0.0045, 0.0045, 0.002, GOLD, 0.021, -0.001, 0, 0, 0, Math.PI / 2, 10);
  k.sph(0.0028, GOLD, 0, 0.013, 0, 1, 1, 1, 6);
}

/** A round daruma: one eye painted in, gold belly, black brows and moustache. */
function daruma(k: Kit, c: string): void {
  k.sph(0.022, c, 0, -0.002, 0, 1, 1.08, 0.95, 14);
  k.sph(0.0125, '#fbe7cf', 0.0165, 0.004, 0, 0.5, 0.95, 1.05, 10);
  for (const s of [-1, 1]) {
    k.sph(0.0036, WHITE, 0.0215, 0.007, s * 0.005, 0.5, 1, 1, 7);
    if (s > 0) k.sph(0.0021, INK, 0.0232, 0.007, s * 0.005, 0.5, 1, 1, 5);
    k.box(0.0015, 0.0016, 0.007, INK, 0.0222, 0.0122, s * 0.005, s * 0.25, 0, 0);
    k.box(0.0015, 0.0015, 0.007, INK, 0.0228, 0.0015, s * 0.0038, -s * 0.45, 0, 0);
    k.tor(0.005, 0.0011, GOLD, 0.004, -0.008, s * 0.0195, 0, 0, 0, 8);
  }
  k.sph(0.006, GOLD, 0.019, -0.014, 0, 0.4, 0.8, 1.3, 8);
}

/** Half a disc standing on its round edge, flat side up, facing ±z. */
const halfDisc = (R: number, T: number, seg = 12) => new THREE.CylinderGeometry(R, R, T, seg, 1, false, 0, Math.PI).rotateX(Math.PI / 2).rotateZ(-Math.PI / 2);

/** Kashiwa-mochi: a folded white rice cake in an oak leaf. */
function kashiwa(k: Kit, c: string): void {
  k.add(halfDisc(0.025, 0.017), c, M(0, 0.01, 0));
  k.add(halfDisc(0.021, 0.013), MOCHI, M(0, 0.0135, 0));
  for (const s of [-1, 1]) k.tor(0.015, 0.0009, shadeHex(c, 25), 0, 0.01, s * 0.0087, 0, 0, Math.PI, 10, Math.PI);
  for (let i = 1; i < 5; i++) {
    const a = Math.PI + (i * Math.PI) / 5;
    k.sph(0.0038, c, Math.cos(a) * 0.025, 0.01 + Math.sin(a) * 0.025, 0, 1, 1, 2.2, 6);
  }
  k.cyl(0.0015, 0.0015, 0.008, DARK_WOOD, 0.027, 0.012, 0, 0, 0, 0.8, 4);
}

/** Chimaki: three long leaf-wrapped rice cakes tied with straw. */
function chimaki(k: Kit, c: string): void {
  ([[-0.007, -0.005, -0.15, 0.15, 0], [0.007, -0.005, -0.15, -0.15, 14], [0, 0.008, 0.18, 0, -12]] as const).forEach(([x, z, rx, rz, sh]) => {
    k.cone(0.0085, 0.052, shadeHex(c, sh), x, 0, z, rx, 0, rz, 7);
    k.cone(0.009, 0.004, shadeHex(c, sh - 20), x, -0.027, z, Math.PI + rx, 0, rz, 7);
  });
  k.tor(0.0145, 0.0018, STRAW, 0, -0.01, 0.001, Math.PI / 2, 0, 0, 12);
  k.tor(0.0105, 0.0015, STRAW, 0, 0.006, 0.001, Math.PI / 2, 0, 0, 12);
}

/** An origami paper boat. */
function boat(k: Kit, c: string): void {
  k.shape(polygon([[-0.03, 0.006], [0.03, 0.006], [0.019, -0.01], [-0.019, -0.01]]), 0.024, c, M(0, -0.002, 0));
  k.shape(polygon([[-0.017, 0.006], [0.017, 0.006], [0, 0.02]]), 0.007, shadeHex(c, 16), M(0, -0.002, 0));
  k.box(0.054, 0.0012, 0.02, shadeHex(c, -35), 0, 0.0045, 0);
  k.box(0.0015, 0.014, 0.0075, shadeHex(c, -20), 0, 0.011, 0);
}

/** An iris (shobu) flower: three drooping falls with gold patches, three standards, sword leaves. */
function iris(k: Kit, c: string): void {
  k.cyl(0.0016, 0.0018, 0.04, LEAF, 0, -0.012, 0, 0, 0, 0, 5);
  for (const s of [-1, 1]) k.box(0.004, 0.038, 0.0012, shadeHex(LEAF, 10), s * 0.005, -0.013, 0.002, 0, 0, s * 0.2);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    k.add(new THREE.SphereGeometry(0.008, 7, 5), c, M(Math.cos(a) * 0.009, 0.008, Math.sin(a) * 0.009, 0, -a, -0.5, 1.6, 0.35, 0.9));
    k.sph(0.0028, GOLD, Math.cos(a) * 0.011, 0.009, Math.sin(a) * 0.011, 1, 0.5, 1, 5);
    const b = a + Math.PI / 3;
    k.add(new THREE.SphereGeometry(0.007, 6, 4), shadeHex(c, 18), M(Math.cos(b) * 0.004, 0.016, Math.sin(b) * 0.004, 0, -b, 1.2, 1.3, 0.35, 0.7));
  }
  k.sph(0.003, shadeHex(c, -20), 0, 0.012, 0, 1, 1, 1, 6);
}

/** An origami crane: diamond body, wings up, long neck and tail. */
function crane(k: Kit, c: string): void {
  k.shape(polygon([[-0.012, 0], [0, 0.007], [0.012, 0], [0, -0.007]]), 0.01, c, M(0, -0.008, 0));
  k.shape(polygon([[0.006, 0], [0.027, 0.022], [0.023, 0.023], [0.002, 0.003]]), 0.003, c, M(0, -0.008, 0));
  k.shape(polygon([[0, 0], [0.009, 0.004], [0.0015, 0.0025]]), 0.003, shadeHex(c, -15), M(0.023, 0.014, 0, 0, 0, -0.9));
  k.shape(polygon([[-0.006, 0], [-0.027, 0.02], [-0.023, 0.021], [-0.002, 0.003]]), 0.003, c, M(0, -0.008, 0));
  for (const s of [-1, 1]) k.shape(polygon([[-0.011, 0], [0.011, 0], [-0.003, 0.028]]), 0.002, shadeHex(c, s > 0 ? 12 : -12), M(0, -0.004, s * 0.003, s * 1.0, 0, 0));
}

/** A pellet drum (den-den daiko) on a stick, with beads on strings, facing +z. */
function denden(k: Kit, c: string): void {
  k.cyl(0.017, 0.017, 0.012, c, 0, 0.006, 0, Math.PI / 2, 0, 0, 14);
  for (const s of [-1, 1]) {
    k.cyl(0.0172, 0.0172, 0.0015, '#fbe7cf', 0, 0.006, s * 0.0062, Math.PI / 2, 0, 0, 14);
    k.cyl(0.0075, 0.0075, 0.0018, RED, 0, 0.006, s * 0.0068, Math.PI / 2, 0, 0, 10);
    k.tor(0.017, 0.0013, GOLD, 0, 0.006, s * 0.006, 0, 0, 0, 14);
    k.box(0.012, 0.0009, 0.0009, INK, s * 0.022, 0.004, 0);
    k.sph(0.0036, RED, s * 0.029, 0.003, 0, 1, 1, 1, 6);
  }
  k.cyl(0.0022, 0.0026, 0.032, WOOD, 0, -0.026, 0, 0, 0, 0, 6);
  k.sph(0.0026, GOLD, 0, 0.0245, 0, 1, 1, 1, 6);
}

/** A windsock on a stick, striped in its colour and the four others. */
function windsockCargo(k: Kit, c: string): void {
  k.cyl(0.0018, 0.0022, 0.056, DARK_WOOD, -0.022, 0, 0, 0, 0, 0, 5);
  k.sph(0.0035, GOLD, -0.022, 0.029, 0, 1, 1, 1, 6);
  windsock(k, [c, BLUE, c, RED, c, GOLD, c, GREEN], 0.044, -0.02, 0.014, 0, 1, 8);
}

/** A folded newspaper samurai helmet, the kind children make and wear, facing +z. */
function paperHelmet(k: Kit, c: string): void {
  k.shape(polygon([[-0.028, -0.008], [0.028, -0.008], [0, 0.024]]), 0.024, c, M(0, 0, -0.002));
  k.box(0.058, 0.009, 0.028, shadeHex(c, -14), 0, -0.012, 0);
  k.shape(polygon([[-0.012, -0.008], [0.012, -0.008], [0, 0.012]]), 0.002, shadeHex(c, 12), M(0, 0, 0.011));
  for (const s of [-1, 1]) k.shape(polygon([[0, 0], [s * 0.012, 0], [s * 0.004, 0.016]]), 0.002, shadeHex(c, -8), M(s * 0.008, -0.004, 0.0115, 0, 0, s * -0.25));
}

// ------------------------------------------------------------------------------------- props

/** A koinobori pole about 1.35 tall at scale 1: arrow wheel, windsock and a carp family (variant 1 adds a fourth carp). */
function carpPole({ b, m, mr, variant }: PropContext): void {
  for (const yaw of [0, Math.PI / 2]) b.add(new THREE.BoxGeometry(0.34, 0.05, 0.07), DARK_WOOD, m(0, 0.025, 0, yaw));
  b.add(new THREE.CylinderGeometry(0.06, 0.08, 0.12, 8), '#b9c0cc', m(0, 0.08, 0));
  b.add(new THREE.CylinderGeometry(0.016, 0.024, 1.3, 8), POLE, m(0, 0.7, 0));
  for (const y of [0.22, 0.28]) b.add(new THREE.CylinderGeometry(0.026, 0.026, 0.025, 8), RED, m(0, y, 0));
  b.add(new THREE.SphereGeometry(0.035, 10, 8), GOLD, m(0, 1.37, 0));
  // The arrow wheel (yaguruma) facing the wind.
  b.add(new THREE.CylinderGeometry(0.025, 0.025, 0.05, 8).rotateZ(Math.PI / 2), GOLD, m(-0.04, 1.27, 0));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const [cy, cz] = [Math.cos(a), Math.sin(a)];
    b.add(new THREE.BoxGeometry(0.008, 0.12, 0.008), WHITE, mr(-0.05, 1.27 + cy * 0.07, cz * 0.07, a, 0, 0));
    b.add(new THREE.ConeGeometry(0.022, 0.05, 4), i % 2 ? RED : BLUE, mr(-0.05, 1.27 + cy * 0.14, cz * 0.14, a + Math.PI, 0, 0));
  }
  kitInto(b, (k) => windsock(k, SOCK, 0.42, 0, 0, 0, 1.2, 10), m(0.02, 1.18, 0));
  const family: [string, number, number][] = [[BLACK, 0.52, 1.0], [RED, 0.44, 0.82], [BLUE, 0.35, 0.65]];
  if (variant % 2 === 1) family.push([GREEN, 0.28, 0.5]);
  family.forEach(([c, len, y], i) => kitInto(b, (k) => carp(k, c, len, 0, 0, 0, i * 1.3, 12, 0.2), m(0.02, y, 0, [-0.45, 0.05, 0.5, -0.2][i])));
}

/** The helmet display (gogatsu ningyo): red stand, gold folding screen, helmet, lamps, little flags. */
function helmetDisplay({ b, glow, m }: PropContext): void {
  b.add(new THREE.BoxGeometry(0.86, 0.06, 0.56), '#2a1f22', m(0, 0.03, 0));
  b.add(new THREE.BoxGeometry(0.82, 0.05, 0.52), LACQUER, m(0, 0.085, 0));
  b.add(new THREE.BoxGeometry(0.46, 0.12, 0.24), LACQUER, m(0, 0.17, -0.1));
  b.add(new THREE.BoxGeometry(0.48, 0.015, 0.26), GOLD, m(0, 0.235, -0.1));
  b.add(new THREE.BoxGeometry(0.84, 0.015, 0.02), GOLD, m(0, 0.11, 0.26));
  for (let i = 0; i < 4; i++) {
    const x = -0.3 + i * 0.2;
    const yaw = i % 2 ? 0.3 : -0.3;
    b.add(new THREE.BoxGeometry(0.2, 0.42, 0.012), GOLD, m(x, 0.33, -0.24, yaw));
    for (const y of [0.12, 0.54]) b.add(new THREE.BoxGeometry(0.205, 0.022, 0.02), INK, m(x, y, -0.24, yaw));
    // Painted green hills and a pine on the screen.
    b.add(new THREE.SphereGeometry(0.09, 8, 6).scale(1.1, 0.5, 0.1), i % 2 ? '#5fae5a' : '#4a9a4f', m(x, 0.16, -0.23, yaw));
  }
  b.add(new THREE.SphereGeometry(0.06, 10, 6).scale(1, 1, 0.12), RED, m(-0.18, 0.44, -0.23, 0.3));
  kitInto(b, (k) => kabuto(k, NAVY), m(0, 0.31, -0.1, -Math.PI / 2, 6));
  for (const s of [-1, 1]) {
    // A paper lamp (bonbori) on each side.
    b.add(new THREE.CylinderGeometry(0.01, 0.014, 0.16, 6), INK, m(s * 0.33, 0.19, 0.08));
    glow.add(new THREE.CylinderGeometry(0.04, 0.032, 0.09, 8), '#ffe9a8', m(s * 0.33, 0.3, 0.08));
    b.add(new THREE.ConeGeometry(0.05, 0.035, 8), INK, m(s * 0.33, 0.36, 0.08));
    // A little carp flag.
    b.add(new THREE.CylinderGeometry(0.005, 0.006, 0.3, 5), POLE, m(s * 0.18, 0.26, 0.14));
    kitInto(b, (k) => carp(k, s > 0 ? RED : BLACK, 0.14, 0, 0, 0, s, 8), m(s * 0.18, 0.37, 0.14));
  }
  // A dish of rice cakes in front.
  b.add(new THREE.CylinderGeometry(0.07, 0.05, 0.015, 12), WHITE, m(0, 0.118, 0.14));
  for (const [x, a] of [[-0.03, 0.2], [0.03, -0.2]] as const) kitInto(b, (k) => kashiwa(k, LEAF), m(x, 0.14, 0.14, a, 1.4));
}

/** A low table laid with rice cakes in oak leaves, chimaki and green tea. */
function feastTable({ b, m }: PropContext): void {
  b.add(new THREE.CylinderGeometry(0.34, 0.34, 0.035, 18), WOOD, m(0, 0.14, 0));
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    b.add(new THREE.BoxGeometry(0.035, 0.13, 0.035), DARK_WOOD, m(Math.cos(a) * 0.24, 0.065, Math.sin(a) * 0.24));
  }
  b.add(new THREE.CylinderGeometry(0.13, 0.1, 0.015, 14), WHITE, m(-0.08, 0.165, -0.05));
  for (const [x, z, a] of [[-0.13, -0.08, 0.3], [-0.04, -0.1, -0.2], [-0.08, 0.0, 0.1]] as const) kitInto(b, (k) => kashiwa(k, LEAF), m(x, 0.19, z, a, 2.2));
  b.add(new THREE.CylinderGeometry(0.09, 0.07, 0.015, 12), '#2f8fd8', m(0.17, 0.165, 0.06));
  kitInto(b, (k) => chimaki(k, '#2fae7a'), m(0.17, 0.225, 0.06, 0, 2.2));
  for (const [x, z] of [[0.05, 0.2], [-0.2, 0.17], [0.2, -0.17]] as const) {
    b.add(new THREE.CylinderGeometry(0.035, 0.028, 0.05, 10), '#e9efe2', m(x, 0.182, z));
    b.add(new THREE.CylinderGeometry(0.03, 0.03, 0.005, 10), '#8fc04a', m(x, 0.205, z));
  }
}

function cushion({ b, m, variant }: PropContext): void {
  const c = ([RED, BLUE, GREEN, ORANGE] as const)[variant % 4];
  b.add(new THREE.BoxGeometry(0.3, 0.05, 0.3), c, m(0, 0.03, 0));
  b.add(new THREE.BoxGeometry(0.31, 0.012, 0.31), shadeHex(c, 25), m(0, 0.012, 0));
  b.add(new THREE.SphereGeometry(0.02, 6, 5), GOLD, m(0, 0.058, 0));
}

/** Irises in a blue-and-white vase. */
function irisVase({ b, m }: PropContext): void {
  b.add(new THREE.CylinderGeometry(0.06, 0.08, 0.22, 12), '#3a6fd0', m(0, 0.11, 0));
  b.add(new THREE.CylinderGeometry(0.081, 0.081, 0.04, 12), WHITE, m(0, 0.08, 0));
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    b.add(new THREE.BoxGeometry(0.02, 0.32, 0.006), LEAF, m(Math.cos(a) * 0.03, 0.34, Math.sin(a) * 0.03, -a).multiply(new THREE.Matrix4().makeRotationZ(0.18)));
  }
  for (const [x, z, y, c] of [[0, 0, 0.42, '#7a4fd6'], [0.04, 0.03, 0.36, '#9b6ad6'], [-0.04, -0.02, 0.34, '#5a5ae0']] as const) kitInto(b, (k) => iris(k, c), m(x, y, z, x * 20, 3.6));
}

/** A big drum (taiko) on a wooden stand with its two sticks. */
function taiko({ b, m, mr }: PropContext): void {
  for (const s of [-1, 1]) {
    b.add(new THREE.BoxGeometry(0.04, 0.3, 0.04), DARK_WOOD, mr(s * 0.12, 0.15, 0, 0, 0, s * 0.25));
    b.add(new THREE.CylinderGeometry(0.15, 0.15, 0.01, 16).rotateX(Math.PI / 2), '#fbe7cf', m(0, 0.32, s * 0.13));
    b.add(new THREE.CylinderGeometry(0.06, 0.06, 0.012, 12).rotateX(Math.PI / 2), RED, m(0, 0.32, s * 0.136));
    b.add(new THREE.TorusGeometry(0.15, 0.012, 5, 16), GOLD, m(0, 0.32, s * 0.12));
    b.add(new THREE.CylinderGeometry(0.012, 0.015, 0.3, 6), WOOD, mr(0.22 + s * 0.04, 0.14, 0.12, 0, 0, -0.35 + s * 0.08));
  }
  b.add(new THREE.CylinderGeometry(0.16, 0.16, 0.24, 16).rotateX(Math.PI / 2), '#b5572e', m(0, 0.32, 0));
  b.add(new THREE.BoxGeometry(0.32, 0.03, 0.18), DARK_WOOD, m(0, 0.15, 0));
}

/** A craft corner: sheets of origami paper, cranes, a boat and a folded paper helmet. */
function origami({ b, m }: PropContext): void {
  ([[-0.15, -0.1, 0.3, '#ff6fa5'], [0.05, -0.15, -0.2, GOLD], [-0.05, 0.12, 0.6, BLUE], [0.2, 0.1, 1.1, GREEN]] as const).forEach(([x, z, a, c], i) =>
    b.add(new THREE.BoxGeometry(0.18, 0.004, 0.18), c, m(x, 0.002 + i * 0.002, z, a)),
  );
  kitInto(b, (k) => paperHelmet(k, '#f2ede0'), m(-0.05, 0.06, 0, 0.3, 5));
  kitInto(b, (k) => crane(k, '#ff6fa5'), m(0.22, 0.05, -0.12, 2, 3.5));
  kitInto(b, (k) => crane(k, GOLD), m(0.25, 0.05, 0.16, 0.6, 3));
  kitInto(b, (k) => boat(k, BLUE), m(-0.22, 0.05, 0.18, 0.8, 3));
}

// ------------------------------------------------------------------------------------- the skin

const skin: HolidaySkin = {
  id: 'kodomo',
  name: "Children's Day",
  greeting: "Happy Children's Day!",
  cargo: { red: carpCargo, blue: kabuto, orange: daruma, green: kashiwa, teal: chimaki, yellow: boat, purple: iris, pink: crane, brown: denden, white: windsockCargo },
  props: {
    'kdm.pole': carpPole,
    'kdm.display': helmetDisplay,
    'kdm.table': feastTable,
    'kdm.cushion': cushion,
    'kdm.iris': irisVase,
    'kdm.taiko': taiko,
    'kdm.origami': origami,
  },
  inside: [
    { name: 'carpPole', w: 2, h: 2, items: [['kdm.pole', -0.6, 0.1, 0, 1.2, 0, 1], ['kdm.iris', 0.6, 0.6, 0, 1.1], ['toy:block', 0.6, -0.5, 0.4, 0.65], ['toy:teddy', -0.65, -0.6, 0.5, 0.6], ['kdm.cushion', 0.1, 0.65, 0.3, 1, 0, 2]] },
    { name: 'helmetDisplay', w: 2, h: 2, items: [['kdm.display', 0, -0.15, 0, 1.3], ['kdm.cushion', -0.4, 0.6, 0.2, 1, 0, 0], ['toy:top', 0.4, 0.6, 'face', 0.65], ['toy:top', 0.72, 0.4, 'face', 0.5]] },
    { name: 'feast', w: 2, h: 2, items: [['kdm.table', 0, 0, 0, 1.35], ['kdm.cushion', 0, -0.6, 0, 1.1, 0, 0], ['kdm.cushion', 0, 0.6, 0, 1.1, 0, 1], ['kdm.cushion', -0.66, 0, 0, 1.1, 0, 2], ['kdm.cushion', 0.66, 0, 0, 1.1, 0, 3], ['kdm.iris', 0.68, -0.62, 0, 0.9]] },
    { name: 'origami', w: 2, h: 1, items: [['kdm.origami', -0.45, 0, 0.3, 1.4], ['toy:drum', 0.2, 0.12, 0.4, 0.6], ['toy:drum', 0.5, -0.12, 2.2, 0.5], ['toy:duck', 0.8, 0.15, 0.8, 0.55]] },
    { name: 'drums', w: 2, h: 1, items: [['kdm.taiko', -0.5, 0, 0, 1.1], ['toy:top', 0.1, 0.1, 'face', 0.6], ['toy:teddy', 0.42, -0.1, 0.3, 0.6], ['toy:dice', 0.78, 0.1, 0.2, 0.6]] },
  ],
  outside: [
    { name: 'carpPoles', w: 2.6, h: 0, items: [['kdm.pole', -0.9, -0.2, 0, 3.2, 0, 1], ['kdm.pole', 0.5, 0.8, 0, 2.6, 0, 0], ['kdm.iris', 1.7, -0.5, 0, 2.6], ['kdm.cushion', -0.2, 1.2, 0.3, 2.4, 0, 1]] },
    { name: 'display', w: 2.2, h: 0, items: [['kdm.display', 0, 0, 0, 2.8], ['kdm.taiko', 1.75, 0.6, -0.5, 2.3], ['kdm.iris', -1.55, 0.5, 0, 2.5]] },
    { name: 'picnic', w: 2.4, h: 0, items: [['kdm.table', 0.3, 0.2, 0, 2.8], ['kdm.cushion', 0.3, 1.35, 0, 2.4, 0, 0], ['kdm.cushion', 1.45, 0.2, 0.2, 2.4, 0, 3], ['kdm.pole', -1.4, -0.6, 0, 2.8, 0, 0], ['kdm.origami', -0.9, 1.3, 0.4, 2.6]] },
  ],
  edge(b, _glow, spot) {
    const at = (x: number, y: number, z: number, yaw = 0) => {
      const c = Math.cos(spot.yaw);
      const s = Math.sin(spot.yaw);
      return new THREE.Matrix4().compose(new THREE.Vector3(spot.x + x * c + z * s, y, spot.z - x * s + z * c), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), spot.yaw + yaw), new THREE.Vector3(1, 1, 1));
    };
    if (spot.corner) {
      // A tall carp pole on each corner, flying round the yard.
      b.add(new THREE.CylinderGeometry(0.012, 0.018, 0.86, 6), POLE, at(0.04, 0.43, 0));
      b.add(new THREE.SphereGeometry(0.025, 8, 6), GOLD, at(0.04, 0.88, 0));
      kitInto(b, (k) => windsock(k, SOCK, 0.22, 0, 0, 0, 1, 8), at(0.04, 0.8, 0, Math.PI / 2));
      kitInto(b, (k) => carp(k, BLACK, 0.3, 0, 0, 0, 0.5, 10), at(0.04, 0.68, 0, Math.PI / 2));
      kitInto(b, (k) => carp(k, RED, 0.25, 0, 0, 0, 2, 10), at(0.04, 0.53, 0, Math.PI / 2));
      return;
    }
    if (spot.index % 3 === 2) {
      // An iris.
      kitInto(b, (k) => iris(k, spot.index % 2 ? '#7a4fd6' : '#9b6ad6'), at(0.04, 0.11, 0).multiply(new THREE.Matrix4().makeScale(3.6, 3.6, 3.6)));
      return;
    }
    // A little carp streamer on a stick.
    b.add(new THREE.CylinderGeometry(0.008, 0.01, 0.42, 5), DARK_WOOD, at(0.04, 0.21, 0));
    b.add(new THREE.SphereGeometry(0.016, 6, 5), GOLD, at(0.04, 0.425, 0));
    kitInto(b, (k) => carp(k, CARPS[spot.index % CARPS.length] as string, 0.27, 0, 0, 0, spot.index, 8, 0.21), at(0.04, 0.36, 0, Math.PI / 2));
  },
  station(b, f) {
    // Bunting along the front of the platform awning.
    const flag = new THREE.ExtrudeGeometry(polygon([[-0.035, 0], [0.035, 0], [0, -0.075]]), { depth: 0.005, bevelEnabled: false });
    const [by, bz] = [f.awningY - 0.03, f.awningZ + 0.17];
    b.add(new THREE.BoxGeometry(f.width + 0.1, 0.006, 0.006), INK, f.m(0, by, bz));
    for (let x = -f.width / 2 + 0.02, i = 0; x < f.width / 2 + 0.03; x += 0.1, i++) b.add(flag, [RED, GOLD, BLUE, WHITE, GREEN][i % 5] as string, f.m(x, by, bz));
    flag.dispose();
    // A koinobori pole beside the hall.
    const px = f.width / 2 + 0.14;
    b.add(new THREE.CylinderGeometry(0.012, 0.02, 1.35, 8), POLE, f.m(px, 0.675, 0.05));
    b.add(new THREE.SphereGeometry(0.03, 8, 6), GOLD, f.m(px, 1.37, 0.05));
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      b.add(new THREE.BoxGeometry(0.006, 0.1, 0.006), i % 2 ? RED : BLUE, f.m(px - 0.04, 1.29 + Math.cos(a) * 0.05, 0.05 + Math.sin(a) * 0.05, a));
    }
    kitInto(b, (k) => windsock(k, SOCK, 0.3, 0, 0, 0, 1, 10), f.m(px + 0.015, 1.22, 0.05));
    ([[BLACK, 0.4, 1.06], [RED, 0.34, 0.9], [BLUE, 0.27, 0.75]] as const).forEach(([c, len, y], i) => kitInto(b, (k) => carp(k, c, len, 0, 0, 0, i, 12), f.m(px + 0.015, y, 0.05)));
  },
  engine(b) {
    // A small carp pole on the cab roof, the carps streaming back in the wind.
    b.cylinder(0.007, 0.008, 0.3, POLE, -0.2, 0.57, 0, 6);
    b.sphere(0.014, GOLD, -0.2, 0.725, 0, 1, 1, 1, 8);
    const back = (y: number) => new THREE.Matrix4().compose(new THREE.Vector3(-0.205, y, 0), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI), new THREE.Vector3(1, 1, 1));
    kitInto(b, (k) => windsock(k, SOCK, 0.11, 0, 0, 0, 1, 8), back(0.7));
    kitInto(b, (k) => carp(k, RED, 0.17, 0, 0, 0, 0.4, 10, 0.21), back(0.645));
    kitInto(b, (k) => carp(k, BLUE, 0.13, 0, 0, 0, 1.6, 10, 0.21), back(0.58));
  },
  light: { sunColor: '#fff8ec', hemiSky: '#d6efff' },
  fx: { kind: 'petals', colors: ['#ffc4dc', '#ffffff', '#d9b8ff', '#c6f0a8'], count: 45 },
};

export default skin;
