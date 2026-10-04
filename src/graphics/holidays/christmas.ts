// Christmas (24–26 December, and the Orthodox Christmas on 7 January): snow falling, a decorated
// tree with presents under it, a sleigh with reindeer, a gingerbread house, a garland with fairy
// lights round the diorama and on the station, a Santa hat on the engine. Presents, baubles,
// stars and candy canes ride in the wagons.
import * as THREE from 'three';
import type { HolidaySkin, PropContext } from '../holiday';
import { ring } from '../holiday';
import { M, WHITE, shadeHex, starShape, type Kit } from '../toyModels';

const RED = '#d8312f';
const GREEN = '#2f8a46';
const DARK_GREEN = '#1f6b37';
const GOLD = '#f2c23a';
const LIGHTS = ['#ff4d4d', '#ffd23f', '#4dc3ff', '#7dff6a', '#ff7de9'];

// ------------------------------------------------------------------------------------- cargo

function present(k: Kit, c: string): void {
  k.box(0.042, 0.032, 0.042, c, 0, -0.004, 0);
  k.box(0.044, 0.033, 0.009, WHITE, 0, -0.004, 0);
  k.box(0.009, 0.033, 0.044, WHITE, 0, -0.004, 0);
  for (const s of [-1, 1]) k.tor(0.008, 0.003, WHITE, s * 0.007, 0.016, 0, 0, s * 0.5, 0, 10);
}

function tree(k: Kit, c: string): void {
  k.cyl(0.005, 0.006, 0.012, '#7a4a26', 0, -0.022, 0, 0, 0, 0, 8);
  k.cone(0.026, 0.026, c, 0, -0.008, 0, 0, 0, 0, 10);
  k.cone(0.02, 0.022, shadeHex(c, 10), 0, 0.006, 0, 0, 0, 0, 10);
  k.cone(0.013, 0.018, shadeHex(c, 18), 0, 0.019, 0, 0, 0, 0, 10);
  k.shape(starShape(0.007, 0.0032), 0.003, GOLD, M(0, 0.031, 0));
  for (const [x, y, z, col] of [[0.02, -0.012, 0.006, RED], [-0.013, -0.006, 0.015, GOLD], [0.008, 0.008, -0.012, '#4dc3ff'], [-0.015, -0.014, -0.012, RED]] as const) k.sph(0.0035, col, x, y, z, 1, 1, 1, 6);
}

function star(k: Kit, c: string): void {
  k.shape(starShape(0.028, 0.012), 0.012, c, M(0, 0, 0), 0.002);
  k.sph(0.004, WHITE, 0.004, 0.006, 0.008, 1, 1, 1, 6);
}

function bauble(k: Kit, c: string): void {
  k.sph(0.022, c, 0, -0.004, 0, 1, 1, 1, 14);
  k.tor(0.0222, 0.0022, WHITE, 0, -0.004, 0, Math.PI / 2, 0, 0, 18);
  k.cyl(0.006, 0.006, 0.007, GOLD, 0, 0.02, 0, 0, 0, 0, 8);
  k.tor(0.004, 0.0012, GOLD, 0, 0.026, 0, 0, 0, 0, 8);
}

function candyCane(k: Kit, c: string): void {
  // Stripes painted on a stick and a hook.
  for (let i = 0; i < 7; i++) k.cyl(0.005, 0.005, 0.006, i % 2 ? WHITE : c, 0, -0.024 + i * 0.006, 0, 0, 0, 0, 8);
  k.tor(0.009, 0.005, c, 0.009, 0.018, 0, 0, 0, 0, 10, Math.PI);
  k.sph(0.005, WHITE, 0.018, 0.018, 0, 1, 1, 1, 6);
}

function gingerbread(k: Kit, c: string): void {
  const icing = WHITE;
  k.sph(0.011, c, 0, 0.014, 0, 1, 1, 0.45, 10);
  k.box(0.02, 0.022, 0.009, c, 0, -0.004, 0);
  for (const s of [-1, 1]) {
    k.box(0.009, 0.018, 0.009, c, s * 0.0055, -0.02, 0);
    k.box(0.016, 0.008, 0.009, c, s * 0.014, 0.002, 0, 0, 0, s * 0.3);
    k.sph(0.0018, '#1e1e24', s * 0.004, 0.016, 0.005, 1, 1, 1, 5);
  }
  for (const y of [0.002, -0.006]) k.sph(0.0022, RED, 0, y, 0.005, 1, 1, 1, 5);
  k.tor(0.004, 0.001, icing, 0, 0.011, 0.005, 0, 0, Math.PI, 8, Math.PI);
}

function stocking(k: Kit, c: string): void {
  k.box(0.016, 0.03, 0.012, c, 0, 0.002, 0);
  k.sph(0.011, c, 0.006, -0.014, 0, 1.3, 0.8, 0.65, 10);
  k.box(0.019, 0.008, 0.014, WHITE, 0, 0.019, 0);
}

function bell(k: Kit, c: string): void {
  k.add(new THREE.LatheGeometry([new THREE.Vector2(0.001, 0.02), new THREE.Vector2(0.01, 0.017), new THREE.Vector2(0.014, 0.004), new THREE.Vector2(0.021, -0.016), new THREE.Vector2(0.022, -0.018)], 14), c);
  k.sph(0.005, shadeHex(c, -30), 0, -0.02, 0, 1, 1, 1, 6);
  k.tor(0.005, 0.0015, c, 0, 0.023, 0, 0, 0, 0, 8);
  for (const s of [-1, 1]) k.sph(0.006, GREEN, s * 0.006, 0.02, 0.004, 1.4, 0.5, 0.8, 6);
}

function wreath(k: Kit, c: string): void {
  k.tor(0.017, 0.007, c, 0, 0, 0, 0, 0, 0, 16);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    k.sph(0.0035, RED, Math.cos(a) * 0.017, Math.sin(a) * 0.017, 0.006, 1, 1, 1, 6);
  }
  k.sph(0.006, RED, 0, -0.019, 0.006, 1.4, 0.8, 0.6, 8);
}

// ------------------------------------------------------------------------------------- props

/** A decorated Christmas tree about 0.9 tall at scale 1, fairy lights glowing. */
function bigTree({ b, glow, m }: PropContext): void {
  b.add(new THREE.CylinderGeometry(0.16, 0.2, 0.12, 12), RED, m(0, 0.06, 0));
  b.add(new THREE.CylinderGeometry(0.05, 0.06, 0.12, 8), '#7a4a26', m(0, 0.16, 0));
  const tiers: [number, number, number][] = [[0.36, 0.34, 0.36], [0.28, 0.3, 0.55], [0.19, 0.26, 0.74]];
  tiers.forEach(([r, h, y], t) => {
    b.add(new THREE.ConeGeometry(r, h, 14), t % 2 ? GREEN : DARK_GREEN, m(0, y, 0));
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + t;
      glow.add(new THREE.SphereGeometry(0.022, 8, 6), LIGHTS[(i + t) % LIGHTS.length] as string, m(Math.cos(a) * r * 0.78, y - h * 0.32, Math.sin(a) * r * 0.78));
    }
  });
  glow.add(new THREE.ExtrudeGeometry(starShape(0.09, 0.04), { depth: 0.03, bevelEnabled: false }).translate(0, 0, -0.015), GOLD, m(0, 0.97, 0));
}

function presentProp({ b, m, palette, variant }: PropContext): void {
  const c = palette[variant % palette.length] as string;
  b.add(new THREE.BoxGeometry(0.22, 0.16, 0.22), c, m(0, 0.08, 0));
  b.add(new THREE.BoxGeometry(0.23, 0.165, 0.045), WHITE, m(0, 0.08, 0));
  b.add(new THREE.BoxGeometry(0.045, 0.165, 0.23), WHITE, m(0, 0.08, 0));
  for (const s of [-1, 1]) b.add(new THREE.TorusGeometry(0.04, 0.014, 6, 12), WHITE, m(s * 0.035, 0.18, 0, s * 0.5));
}

function sleigh({ b, m }: PropContext): void {
  for (const z of [-0.14, 0.14]) {
    b.add(new THREE.BoxGeometry(0.7, 0.025, 0.03), GOLD, m(0, 0.02, z));
    b.add(new THREE.TorusGeometry(0.06, 0.014, 6, 12, Math.PI), GOLD, m(0.35, 0.08, z, 0).multiply(new THREE.Matrix4().makeRotationZ(-Math.PI / 2)));
  }
  b.add(new THREE.BoxGeometry(0.5, 0.18, 0.34), RED, m(-0.02, 0.14, 0));
  b.add(new THREE.BoxGeometry(0.12, 0.3, 0.34), RED, m(-0.24, 0.2, 0));
  b.add(new THREE.BoxGeometry(0.52, 0.03, 0.36), GOLD, m(-0.02, 0.235, 0));
  b.add(new THREE.BoxGeometry(0.16, 0.12, 0.14), '#4dc3ff', m(0.02, 0.3, 0.05));
  b.add(new THREE.BoxGeometry(0.12, 0.1, 0.12), '#7dff6a', m(0.1, 0.28, -0.08));
}

function reindeer({ b, m }: PropContext): void {
  const fur = '#9a6a3a';
  b.add(new THREE.CapsuleGeometry(0.08, 0.2, 4, 10).rotateZ(Math.PI / 2), fur, m(0, 0.26, 0));
  for (const [x, z] of [[-0.1, -0.05], [-0.1, 0.05], [0.1, -0.05], [0.1, 0.05]] as const) b.add(new THREE.CylinderGeometry(0.022, 0.02, 0.2, 6), shadeHex(fur, -20), m(x, 0.1, z));
  b.add(new THREE.CylinderGeometry(0.04, 0.05, 0.14, 8), fur, m(0.16, 0.38, 0, 0).multiply(new THREE.Matrix4().makeRotationZ(-0.5)));
  b.add(new THREE.SphereGeometry(0.065, 10, 8), fur, m(0.22, 0.46, 0));
  b.add(new THREE.SphereGeometry(0.025, 8, 6), RED, m(0.29, 0.45, 0));
  for (const s of [-1, 1]) {
    b.add(new THREE.CylinderGeometry(0.008, 0.01, 0.14, 5), '#e8d8b8', m(0.2, 0.56, s * 0.04).multiply(new THREE.Matrix4().makeRotationX(s * 0.4)));
    b.add(new THREE.CylinderGeometry(0.007, 0.008, 0.07, 5), '#e8d8b8', m(0.23, 0.58, s * 0.07).multiply(new THREE.Matrix4().makeRotationZ(-0.9)));
    b.add(new THREE.SphereGeometry(0.01, 6, 5), '#1e1e24', m(0.27, 0.48, s * 0.03));
  }
}

function gingerbreadHouse({ b, m }: PropContext): void {
  const dough = '#b8743a';
  b.add(new THREE.BoxGeometry(0.42, 0.28, 0.34), dough, m(0, 0.14, 0));
  for (const s of [-1, 1]) {
    b.add(new THREE.BoxGeometry(0.48, 0.03, 0.26), WHITE, m(0, 0.38, s * 0.1).multiply(new THREE.Matrix4().makeRotationX(s * 0.75)));
    b.add(new THREE.BoxGeometry(0.46, 0.025, 0.24), dough, m(0, 0.37, s * 0.1).multiply(new THREE.Matrix4().makeRotationX(s * 0.75)));
  }
  b.add(new THREE.BoxGeometry(0.1, 0.16, 0.02), '#7a4a26', m(0, 0.08, 0.175));
  for (const x of [-0.13, 0.13]) b.add(new THREE.BoxGeometry(0.08, 0.08, 0.02), GOLD, m(x, 0.17, 0.175));
  for (let i = 0; i < 6; i++) b.add(new THREE.SphereGeometry(0.018, 8, 6), LIGHTS[i % LIGHTS.length] as string, m(-0.2 + i * 0.08, 0.29, 0.17));
}

function snowPile({ b, m }: PropContext): void {
  b.add(new THREE.SphereGeometry(0.2, 12, 8).scale(1.3, 0.35, 1), '#f7fbff', m(0, 0, 0));
}

// ------------------------------------------------------------------------------------- the skin

const skin: HolidaySkin = {
  id: 'christmas',
  name: 'Christmas',
  greeting: 'Merry Christmas!',
  cargo: { red: present, pink: candyCane, green: tree, yellow: star, blue: bauble, purple: stocking, brown: gingerbread, orange: bell, teal: wreath },
  props: {
    'xmas.tree': bigTree,
    'xmas.present': presentProp,
    'xmas.sleigh': sleigh,
    'xmas.reindeer': reindeer,
    'xmas.house': gingerbreadHouse,
    'xmas.snow': snowPile,
  },
  inside: [
    { name: 'xmasTree', w: 2, h: 2, items: [['xmas.tree', 0, 0, 0, 1.25], ...ring(5, 0.55, 'xmas.present', 1, 0.4), ['xmas.snow', 0.6, -0.6, 0, 0.8]] },
    { name: 'sleigh', w: 2, h: 1, items: [['xmas.sleigh', -0.3, 0, 0, 0.95], ['xmas.reindeer', 0.6, 0, 0, 0.95]] },
    { name: 'gingerbread', w: 2, h: 2, items: [['xmas.house', 0, -0.1, 0, 1.2], ['toy:cookie', 0.55, 0.5, 'face', 0.6], ['xmas.snow', -0.55, 0.5, 0, 0.9], ['xmas.present', 0.6, -0.5, 0.5, 0.8]] },
  ],
  outside: [
    { name: 'bigTree', w: 2.4, h: 0, items: [['xmas.tree', 0, 0, 0, 4], ['xmas.present', 1.2, 0.7, 0.3, 3], ['xmas.present', -1.1, 0.8, 1, 2.6], ['xmas.present', 0.4, 1.3, 2, 2.2]] },
    { name: 'sleighRide', w: 2.4, h: 0, items: [['xmas.sleigh', 0, 0, 0.3, 3], ['xmas.reindeer', 1.9, -0.4, 0.3, 3]] },
    { name: 'house', w: 1.8, h: 0, items: [['xmas.house', 0, 0, 0.4, 3.2], ['xmas.snow', 1.2, 0.6, 0, 3]] },
  ],
  edge(b, glow, spot) {
    const at = (x: number, y: number, z: number, scale = 1) => {
      const c = Math.cos(spot.yaw);
      const s = Math.sin(spot.yaw);
      return new THREE.Matrix4().compose(new THREE.Vector3(spot.x + x * c + z * s, y, spot.z - x * s + z * c), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), spot.yaw), new THREE.Vector3(scale, scale, scale));
    };
    if (spot.corner) {
      // A big red bow on each corner.
      for (const s of [-1, 1]) b.add(new THREE.SphereGeometry(0.1, 10, 8).scale(1, 0.6, 0.4), RED, at(0.02, 0.1, s * 0.09));
      b.add(new THREE.SphereGeometry(0.05, 8, 6), RED, at(0.02, 0.1, 0));
      return;
    }
    // A fir bough along the rim with one glowing fairy light.
    b.add(new THREE.CapsuleGeometry(0.06, 0.6, 3, 8).rotateX(Math.PI / 2), DARK_GREEN, at(0.02, 0.04, 0));
    glow.add(new THREE.SphereGeometry(0.035, 8, 6), LIGHTS[spot.index % LIGHTS.length] as string, at(0.06, 0.09, 0.1));
    glow.add(new THREE.SphereGeometry(0.03, 8, 6), LIGHTS[(spot.index + 2) % LIGHTS.length] as string, at(0.06, 0.08, -0.2));
  },
  station(b, hall) {
    // Hang everything from the awning's front edge: the hall's front wall is hidden under it.
    const f = { ...hall, roofY: hall.awningY - 0.02, frontZ: hall.awningZ + 0.14 };
    // A garland along the awning with baubles, and two wreaths hanging from it.
    for (let x = -f.width / 2; x <= f.width / 2; x += 0.12) b.add(new THREE.SphereGeometry(0.045, 8, 6), DARK_GREEN, f.m(x, f.roofY + 0.01, f.frontZ + 0.03));
    for (let x = -f.width / 2 + 0.2, i = 0; x < f.width / 2; x += 0.36, i++) b.add(new THREE.SphereGeometry(0.03, 8, 6), LIGHTS[i % LIGHTS.length] as string, f.m(x, f.roofY - 0.04, f.frontZ + 0.05));
    for (const x of [-0.42, 0.42]) {
      b.add(new THREE.TorusGeometry(0.08, 0.03, 6, 14), DARK_GREEN, f.m(x, f.roofY - 0.14, f.frontZ + 0.02));
      b.add(new THREE.SphereGeometry(0.03, 8, 6).scale(1.5, 1, 0.8), RED, f.m(x, f.roofY - 0.22, f.frontZ + 0.05));
    }
  },
  engine(b) {
    // A Santa hat on the cab roof.
    b.cylinder(0.075, 0.075, 0.035, WHITE, -0.17, 0.44, 0, 14);
    b.add(new THREE.ConeGeometry(0.065, 0.16, 12), RED, new THREE.Matrix4().compose(new THREE.Vector3(-0.19, 0.52, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0.45)), new THREE.Vector3(1, 1, 1)));
    b.sphere(0.03, WHITE, -0.25, 0.58, 0, 1, 1, 1, 8);
  },
  light: { sunColor: '#fff1dc', hemiSky: '#dfeeff' },
  fx: { kind: 'snow', colors: ['#ffffff', '#eaf4ff'], count: 70 },
};

export default skin;
