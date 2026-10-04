// The toy models (spec FR-113): built from a few primitives each, vertex-colored, about 0.05 units
// across before TOY_SCALE (a wagon holds three), facing +x (sideways things face +z).
import * as THREE from 'three';
import type { ToyType } from '../engine/types';
import { CAP_HEIGHT, textGeometry } from '../ui/kit/text3d';
import { TOY_HUE } from '../engine/toys';
import { activeHoliday } from './holiday';
import { TOY_COLORS } from './palette';

export const INK = '#1e1e24';
export const WHITE = '#fbf8f2';

function colored(g: THREE.BufferGeometry, color: string, m?: THREE.Matrix4): THREE.BufferGeometry {
  const geo = g.index ? g.toNonIndexed() : g;
  if (m) geo.applyMatrix4(m);
  if (geo.getAttribute('uv')) geo.deleteAttribute('uv');
  const c = new THREE.Color(color);
  const n = geo.getAttribute('position').count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) arr.set([c.r, c.g, c.b], i * 3);
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  if (!geo.getAttribute('normal')) geo.computeVertexNormals();
  return geo;
}

/** Colors each triangle by a function of its centroid (beach-ball wedges, planet bands). */
export function paintFaces(g: THREE.BufferGeometry, paint: (cx: number, cy: number, cz: number) => string): THREE.BufferGeometry {
  const geo = g.index ? g.toNonIndexed() : g;
  if (geo.getAttribute('uv')) geo.deleteAttribute('uv');
  const pos = geo.getAttribute('position');
  const arr = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let t = 0; t < pos.count; t += 3) {
    const cx = (pos.getX(t) + pos.getX(t + 1) + pos.getX(t + 2)) / 3;
    const cy = (pos.getY(t) + pos.getY(t + 1) + pos.getY(t + 2)) / 3;
    const cz = (pos.getZ(t) + pos.getZ(t + 1) + pos.getZ(t + 2)) / 3;
    c.set(paint(cx, cy, cz));
    for (let k = 0; k < 3; k++) arr.set([c.r, c.g, c.b], (t + k) * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}

export function shadeHex(hex: string, amount: number): string {
  const c = new THREE.Color(hex);
  c.offsetHSL(0, 0, amount / 255);
  return `#${c.getHexString()}`;
}

export const M = (x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));

/** Collects colored parts. */
export class Kit {
  readonly parts: THREE.BufferGeometry[] = [];

  add(g: THREE.BufferGeometry, c: string, m?: THREE.Matrix4): this {
    this.parts.push(colored(g, c, m));
    return this;
  }

  sph(r: number, c: string, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1, seg = 10): this {
    return this.add(new THREE.SphereGeometry(r, seg, Math.max(5, Math.round(seg * 0.7))), c, M(x, y, z, 0, 0, 0, sx, sy, sz));
  }

  /** Upper half of a sphere (domes, caps). */
  dome(r: number, c: string, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1, seg = 12): this {
    return this.add(new THREE.SphereGeometry(r, seg, Math.round(seg / 2), 0, Math.PI * 2, 0, Math.PI / 2), c, M(x, y, z, 0, 0, 0, sx, sy, sz));
  }

  box(w: number, h: number, d: number, c: string, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0): this {
    return this.add(new THREE.BoxGeometry(w, h, d), c, M(x, y, z, rx, ry, rz));
  }

  cyl(rt: number, rb: number, h: number, c: string, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, seg = 12, open = false): this {
    return this.add(new THREE.CylinderGeometry(rt, rb, h, seg, 1, open), c, M(x, y, z, rx, ry, rz));
  }

  cone(r: number, h: number, c: string, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, seg = 10): this {
    return this.add(new THREE.ConeGeometry(r, h, seg), c, M(x, y, z, rx, ry, rz));
  }

  tor(R: number, t: number, c: string, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, seg = 14, arc = Math.PI * 2): this {
    return this.add(new THREE.TorusGeometry(R, t, 5, seg, arc), c, M(x, y, z, rx, ry, rz));
  }

  /** A flat shape extruded along +z, centered on z. */
  shape(s: THREE.Shape, depth: number, c: string, m: THREE.Matrix4, bevel = 0): this {
    const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 6 }).translate(0, 0, -depth / 2);
    g.computeVertexNormals();
    return this.add(g, c, m);
  }
}

export function polygon(points: [number, number][]): THREE.Shape {
  const s = new THREE.Shape();
  points.forEach(([x, y], i) => (i === 0 ? s.moveTo(x, y) : s.lineTo(x, y)));
  s.closePath();
  return s;
}

export function starShape(outer: number, inner: number, n = 5): THREE.Shape {
  const pts: [number, number][] = [];
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = Math.PI / 2 + (i * Math.PI) / n;
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return polygon(pts);
}

/** A raised letter centered on the origin, facing +z, `size` tall. */
export function letter(ch: string, size: number, depth: number): THREE.BufferGeometry {
  const g = textGeometry(ch, { size: size / CAP_HEIGHT, depth });
  g.computeBoundingBox();
  const box = g.boundingBox as THREE.Box3;
  const c = box.getCenter(new THREE.Vector3());
  g.translate(-c.x, -c.y, -box.min.z);
  return g;
}

export function wheels(k: Kit, xs: number[], z: number, y: number, r = 0.0085): void {
  for (const x of xs) {
    for (const s of [-1, 1]) {
      k.cyl(r, r, 0.007, '#26262b', x, y, s * z, Math.PI / 2, 0, 0, 10);
      k.cyl(r * 0.45, r * 0.45, 0.0075, '#e9e9ef', x, y, s * z, Math.PI / 2, 0, 0, 6);
    }
  }
}

type Builder = (k: Kit, c: string) => void;

const MODELS: Record<ToyType, Builder> = {
  // ---------------------------------------------------------------------------- living room
  block: (k, c) => {
    const s = 0.05;
    k.box(s, s, s, '#ecc994', 0, 0, 0);
    const faces: [THREE.Euler, string, string][] = [
      [new THREE.Euler(0, 0, 0), 'A', c],
      [new THREE.Euler(0, Math.PI, 0), 'B', '#f6c344'],
      [new THREE.Euler(0, Math.PI / 2, 0), 'C', '#4a90d9'],
      [new THREE.Euler(0, -Math.PI / 2, 0), 'D', c],
      [new THREE.Euler(-Math.PI / 2, 0, 0), 'E', '#5bb36a'],
    ];
    for (const [rot, ch, panel] of faces) {
      const q = new THREE.Quaternion().setFromEuler(rot);
      const m = new THREE.Matrix4().compose(new THREE.Vector3(0, 0, s / 2).applyQuaternion(q), q, new THREE.Vector3(1, 1, 1));
      k.add(new THREE.BoxGeometry(s * 0.8, s * 0.8, 0.003).translate(0, 0, 0.0015), panel, m);
      if ('ACE'.includes(ch)) k.add(letter(ch, s * 0.5, 0.004).translate(0, 0, 0.003), '#fff6e6', m);
    }
  },
  duck: (k, c) => {
    k.sph(0.026, c, -0.004, -0.006, 0, 1.25, 0.78, 1, 14);
    k.cone(0.01, 0.022, c, -0.034, 0.006, 0, 0, 0, 0.9, 7);
    k.sph(0.017, c, 0.016, 0.019, 0, 1, 1, 1, 12);
    k.sph(0.009, '#f08a2c', 0.033, 0.016, 0, 1.3, 0.45, 1, 8);
    for (const z of [-1, 1]) {
      k.sph(0.012, shadeHex(c, -22), -0.008, 0, z * 0.019, 1.5, 0.6, 0.45, 8);
      k.sph(0.0032, INK, 0.026, 0.025, z * 0.009, 1, 1, 1, 5);
    }
  },
  car: (k, c) => {
    k.add(new THREE.CapsuleGeometry(0.014, 0.036, 4, 10).rotateZ(Math.PI / 2), c, M(0, -0.002, 0, 0, 0, 0, 1, 0.75, 1.3));
    k.box(0.03, 0.016, 0.032, '#d7ecff', -0.004, 0.014, 0);
    k.box(0.034, 0.005, 0.036, c, -0.004, 0.024, 0);
    k.box(0.006, 0.012, 0.034, c, -0.004, 0.015, 0);
    for (const z of [-0.01, 0.01]) k.sph(0.004, '#fff3a0', 0.032, 0, z, 1, 1, 1, 6);
    k.box(0.004, 0.006, 0.03, '#c9ccd4', -0.033, -0.006, 0);
    wheels(k, [-0.019, 0.019], 0.019, -0.011);
  },
  ball: (k, c) => {
    const r = 0.028;
    const wedges = [c, WHITE, '#f6c344', WHITE, '#e8574a', WHITE];
    k.parts.push(
      paintFaces(new THREE.SphereGeometry(r, 18, 10), (x, y, z) => {
        if (Math.abs(y) > r * 0.86) return WHITE;
        const a = (Math.atan2(z, x) + Math.PI) / (Math.PI * 2);
        return wedges[Math.floor(a * wedges.length) % wedges.length] as string;
      }),
    );
    k.cyl(0.004, 0.004, 0.004, '#e8574a', 0, r + 0.001, 0, 0, 0, 0, 8);
  },
  star: (k, c) => {
    k.shape(starShape(0.026, 0.012), 0.008, c, M(0, 0, 0), 0.0035);
    for (const x of [-0.006, 0.006]) k.sph(0.0028, INK, x, 0.003, 0.0085, 1, 1, 1, 5);
    k.tor(0.004, 0.0012, INK, 0, -0.002, 0.0085, 0, 0, Math.PI, 8, Math.PI);
    for (const x of [-0.011, 0.011]) k.sph(0.003, '#ff9fc4', x, -0.002, 0.008, 1, 0.6, 0.4, 5);
  },
  teddy: (k, c) => {
    const muzzle = '#ecd2a8';
    k.sph(0.019, c, 0, -0.009, 0, 1, 1.12, 0.95, 12);
    k.sph(0.008, muzzle, 0, -0.009, 0.014, 1, 1.2, 0.5, 8);
    k.sph(0.015, c, 0, 0.019, 0, 1, 1, 1, 12);
    for (const x of [-1, 1]) {
      k.sph(0.0062, c, x * 0.011, 0.031, 0, 1, 1, 0.6, 8);
      k.sph(0.0035, muzzle, x * 0.011, 0.031, 0.003, 1, 1, 0.4, 6);
      k.sph(0.0068, c, x * 0.019, -0.003, 0.004, 1, 1.5, 1, 8);
      k.sph(0.0075, c, x * 0.01, -0.025, 0.008, 1, 0.8, 1.3, 8);
      k.sph(0.0022, INK, x * 0.005, 0.023, 0.013, 1, 1, 1, 5);
    }
    k.sph(0.0068, muzzle, 0, 0.015, 0.012, 1, 0.8, 0.7, 8);
    k.sph(0.0028, INK, 0, 0.017, 0.017, 1, 0.8, 1, 5);
    k.tor(0.0085, 0.0022, '#e8574a', 0, 0.006, 0, Math.PI / 2, 0, 0, 12);
  },
  top: (k, c) => {
    k.cone(0.023, 0.03, c, 0, -0.01, 0, Math.PI, 0, 0, 14);
    k.cyl(0.024, 0.024, 0.008, '#f6c344', 0, 0.009, 0, 0, 0, 0, 14);
    k.cyl(0.0245, 0.0245, 0.0025, WHITE, 0, 0.0055, 0, 0, 0, 0, 14);
    k.cone(0.02, 0.008, c, 0, 0.017, 0, 0, 0, 0, 14);
    k.cyl(0.0035, 0.0035, 0.018, '#7a4a26', 0, 0.028, 0, 0, 0, 0, 8);
    k.sph(0.005, '#e8574a', 0, 0.037, 0, 1, 1, 1, 8);
  },
  drum: (k, c) => {
    k.cyl(0.023, 0.023, 0.026, c, 0, -0.004, 0, 0, 0, 0, 16);
    k.cyl(0.0235, 0.0235, 0.003, WHITE, 0, 0.0105, 0, 0, 0, 0, 16);
    for (const y of [0.008, -0.017]) k.tor(0.0235, 0.0022, '#f6c344', 0, y, 0, Math.PI / 2, 0, 0, 16);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      k.box(0.0015, 0.024, 0.0015, '#f6c344', Math.cos(a) * 0.0235, -0.004, Math.sin(a) * 0.0235, 0, 0, i % 2 ? 0.5 : -0.5);
    }
    k.cyl(0.0018, 0.0018, 0.032, '#c98a52', 0.004, 0.018, 0.006, 0.2, 0, 1.2, 6);
    k.cyl(0.0018, 0.0018, 0.032, '#c98a52', -0.004, 0.018, -0.006, -0.2, 0, -1.2, 6);
  },
  robot: (k, c) => {
    k.box(0.028, 0.026, 0.02, c, 0, -0.006, 0);
    k.box(0.012, 0.01, 0.002, '#e8574a', 0, -0.004, 0.0105);
    k.box(0.022, 0.018, 0.018, shadeHex(c, 15), 0, 0.017, 0);
    for (const z of [-1, 1]) {
      k.sph(0.0032, '#5fd3ff', 0.012, 0.019, z * 0.005, 1, 1, 1, 6);
      k.box(0.006, 0.016, 0.006, c, 0, -0.008, z * 0.014);
      k.box(0.007, 0.01, 0.007, shadeHex(c, -25), 0, -0.024, z * 0.006);
    }
    k.cyl(0.0012, 0.0012, 0.01, INK, 0, 0.031, 0, 0, 0, 0, 5);
    k.sph(0.0028, '#e8574a', 0, 0.037, 0, 1, 1, 1, 6);
  },
  kite: (k, c) => {
    k.shape(polygon([[0, 0.03], [0.019, 0.004], [0, -0.024], [-0.019, 0.004]]), 0.003, c, M(0, 0.004, 0));
    k.shape(polygon([[0, 0.03], [0.019, 0.004], [0, 0.004]]), 0.0035, '#f6c344', M(0, 0.004, 0));
    k.shape(polygon([[0, -0.024], [-0.019, 0.004], [0, 0.004]]), 0.0035, '#f6c344', M(0, 0.004, 0));
    k.box(0.0015, 0.054, 0.0045, '#7a4a26', 0, 0.007, 0);
    k.box(0.038, 0.0015, 0.0045, '#7a4a26', 0, 0.008, 0);
    for (let i = 0; i < 3; i++) k.box(0.007, 0.004, 0.002, ['#e8574a', '#4a90d9', '#f6c344'][i] as string, 0.004 * (i % 2 ? 1 : -1), -0.024 - i * 0.006, 0, 0, 0, 0.6);
  },
  // ---------------------------------------------------------------------------- candy
  lollipop: (k, c) => {
    k.cyl(0.002, 0.002, 0.032, WHITE, 0, -0.014, 0, 0, 0, 0, 6);
    k.cyl(0.021, 0.021, 0.008, c, 0, 0.012, 0, Math.PI / 2, 0, 0, 18);
    k.tor(0.0135, 0.0022, WHITE, 0, 0.012, 0.0042, 0, 0, 0, 16);
    k.tor(0.0065, 0.0022, WHITE, 0, 0.012, 0.0042, 0, 0, 0, 12);
  },
  cupcake: (k, c) => {
    k.cyl(0.018, 0.013, 0.02, '#e8a25a', 0, -0.014, 0, 0, 0, 0, 14);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      k.box(0.0015, 0.02, 0.003, '#c9823e', Math.cos(a) * 0.0156, -0.014, Math.sin(a) * 0.0156, 0, -a, 0.12);
    }
    k.tor(0.0135, 0.0075, c, 0, 0.0, 0, Math.PI / 2, 0, 0, 14);
    k.tor(0.0085, 0.0065, c, 0, 0.008, 0, Math.PI / 2, 0, 0, 12);
    k.sph(0.0065, c, 0, 0.014, 0, 1, 1, 1, 8);
    k.sph(0.0045, '#d0304a', 0, 0.022, 0, 1, 1, 1, 8);
  },
  donut: (k, c) => {
    k.tor(0.016, 0.0095, c, 0, 0, 0, Math.PI / 2, 0, 0, 16);
    k.add(new THREE.TorusGeometry(0.016, 0.0085, 5, 16), '#ff8fb8', M(0, 0.003, 0, Math.PI / 2, 0, 0, 1, 1, 0.6));
    const sprinkles = ['#ffffff', '#6fb7ff', '#f6c344', '#7cd35a'];
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + 0.3;
      const r = 0.012 + (i % 3) * 0.004;
      k.box(0.006, 0.0018, 0.0018, sprinkles[i % 4] as string, Math.cos(a) * r, 0.0085, Math.sin(a) * r, 0, a * 1.7, 0);
    }
  },
  candyCane: (k, c) => {
    for (let i = 0; i < 5; i++) k.cyl(0.0045, 0.0045, 0.008, i % 2 ? WHITE : c, 0.006, -0.026 + i * 0.008, 0, 0, 0, 0.1, 10);
    k.tor(0.0075, 0.0045, c, -0.002, 0.012, 0, 0, 0, 0, 10, Math.PI);
    k.tor(0.0075, 0.0047, WHITE, -0.002, 0.012, 0, 0, 0, 0.6, 10, Math.PI * 0.35);
  },
  gumdrop: (k, c) => {
    k.dome(0.021, c, 0, -0.022, 0, 1, 1.9, 1, 16);
    for (let i = 0; i < 9; i++) {
      const a = i * 2.4;
      const h = 0.3 + (i % 3) * 0.2;
      k.sph(0.0018, WHITE, Math.cos(a) * 0.021 * Math.cos(h), -0.022 + Math.sin(h) * 0.04, Math.sin(a) * 0.021 * Math.cos(h), 1, 1, 1, 4);
    }
  },
  iceCream: (k, c) => {
    k.cone(0.013, 0.032, '#d9a066', 0, -0.012, 0, Math.PI, 0, 0, 12);
    k.sph(0.0135, c, 0, 0.007, 0, 1, 1, 1, 12);
    k.sph(0.011, '#ff8fb8', 0, 0.02, 0, 1, 1, 1, 12);
    k.sph(0.0042, '#d0304a', 0, 0.032, 0, 1, 1, 1, 8);
    k.tor(0.0132, 0.0022, shadeHex(c, -20), 0, 0.0, 0, Math.PI / 2, 0, 0, 14);
  },
  cookie: (k, c) => {
    k.cyl(0.024, 0.024, 0.008, '#d9a066', 0, 0, 0, Math.PI / 2, 0, 0, 18);
    for (let i = 0; i < 7; i++) {
      const a = i * 2.2;
      const r = 0.006 + (i % 3) * 0.006;
      k.sph(0.0032, c === '#a0703f' ? '#5a3a20' : c, Math.cos(a) * r, Math.sin(a) * r, 0.004, 1, 1, 0.6, 6);
    }
  },
  cherry: (k, c) => {
    k.sph(0.011, c, -0.009, -0.014, 0, 1, 1, 1, 12);
    k.sph(0.011, c, 0.009, -0.012, 0.003, 1, 1, 1, 12);
    k.cyl(0.0012, 0.0012, 0.032, '#4a8a3a', -0.005, 0.004, 0, 0, 0, 0.3, 5);
    k.cyl(0.0012, 0.0012, 0.03, '#4a8a3a', 0.005, 0.005, 0.0015, 0, 0, -0.3, 5);
    k.sph(0.007, '#5bb36a', 0.006, 0.022, 0, 1.5, 0.35, 0.8, 8);
    for (const [x, y] of [[-0.012, -0.01], [0.006, -0.008]] as const) k.sph(0.0025, '#ffb3c0', x, y, 0.008, 1, 1, 0.5, 5);
  },
  sweet: (k, c) => {
    k.sph(0.013, c, 0, 0, 0, 1.35, 1, 1, 12);
    k.tor(0.0105, 0.002, shadeHex(c, 40), 0, 0, 0, 0, Math.PI / 2, 0, 12);
    for (const s of [-1, 1]) k.cone(0.01, 0.014, shadeHex(c, 20), s * 0.024, 0, 0, 0, 0, (s * Math.PI) / 2, 8);
  },
  macaron: (k, c) => {
    for (const y of [-0.0075, 0.0075]) k.sph(0.018, c, 0, y, 0, 1, 0.38, 1, 14);
    k.cyl(0.0162, 0.0162, 0.0055, WHITE, 0, 0, 0, 0, 0, 0, 14);
    k.tor(0.0172, 0.0018, shadeHex(c, 25), 0, -0.004, 0, Math.PI / 2, 0, 0, 14);
  },
  // ---------------------------------------------------------------------------- garden
  apple: (k, c) => {
    k.sph(0.02, c, 0, -0.004, 0, 1, 0.92, 1, 14);
    k.cyl(0.0016, 0.0012, 0.01, '#6b4423', 0, 0.018, 0, 0, 0, 0.2, 5);
    k.sph(0.0065, '#3f8a3a', 0.006, 0.019, 0, 1.6, 0.3, 0.8, 8);
    k.sph(0.0045, shadeHex(c, 35), -0.008, 0.004, 0.014, 1, 1, 0.4, 6);
  },
  carrot: (k, c) => {
    k.cone(0.011, 0.046, c, 0, -0.008, 0, Math.PI, 0, 0, 10);
    for (let i = 0; i < 4; i++) k.box(0.0025, 0.0008, 0.0025, shadeHex(c, -30), 0, -0.012 + i * 0.008, 0, 0, i, 0);
    for (const rz of [-0.4, 0, 0.4]) k.cone(0.003, 0.018, '#4a9a3a', Math.sin(rz) * 0.008, 0.023, 0, 0, 0, -rz, 6);
  },
  toadstool: (k, c) => {
    k.cyl(0.0075, 0.009, 0.024, WHITE, 0, -0.014, 0, 0, 0, 0, 10);
    k.dome(0.021, c, 0, -0.003, 0, 1, 0.85, 1, 14);
    for (let i = 0; i < 7; i++) {
      const a = i * 2.4;
      const h = 0.35 + (i % 3) * 0.3;
      k.sph(0.003, WHITE, Math.cos(a) * 0.021 * Math.cos(h), -0.003 + Math.sin(h) * 0.018, Math.sin(a) * 0.021 * Math.cos(h), 1, 0.5, 1, 5);
    }
  },
  flower: (k, c) => {
    k.cyl(0.0016, 0.0016, 0.034, '#3f8a3a', 0, -0.012, 0, 0, 0, 0, 5);
    k.sph(0.007, '#4a9a3a', 0.006, -0.014, 0, 1.6, 0.3, 0.8, 6);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      k.sph(0.0075, c, Math.cos(a) * 0.009, 0.012 + Math.sin(a) * 0.009, 0, 1, 1, 0.35, 8);
    }
    k.sph(0.0055, '#f6c344', 0, 0.012, 0.002, 1, 1, 0.6, 8);
  },
  ladybug: (k, c) => {
    k.dome(0.019, c, 0, -0.016, 0, 1.2, 1.05, 1, 14);
    k.sph(0.0085, INK, 0.021, -0.012, 0, 1, 0.9, 1, 8);
    k.box(0.04, 0.0016, 0.0018, INK, -0.002, 0.004, 0);
    for (const [x, z] of [[-0.01, 0.009], [0.006, 0.01], [-0.006, -0.011], [0.008, -0.009], [-0.016, 0.0], [0.0, 0.004]] as const) k.sph(0.0035, INK, x, -0.016 + Math.sqrt(Math.max(0, 0.019 ** 2 - (x / 1.2) ** 2 - z ** 2)) * 1.05, z, 1, 0.5, 1, 6);
    for (const z of [-1, 1]) k.sph(0.0022, WHITE, 0.027, -0.009, z * 0.004, 1, 1, 1, 5);
  },
  snail: (k, c) => {
    k.sph(0.009, '#e8d0a0', 0.002, -0.019, 0, 2.4, 0.8, 1, 10);
    k.sph(0.0155, c, -0.004, 0.0, 0, 1, 1, 0.75, 12);
    k.tor(0.009, 0.0026, shadeHex(c, -35), -0.004, 0.0, 0.011, 0, 0, 0, 12, Math.PI * 1.7);
    k.tor(0.0045, 0.0022, shadeHex(c, -35), -0.004, 0.0, 0.0115, 0, 0, 1.5, 10, Math.PI * 1.5);
    for (const z of [-0.004, 0.004]) {
      k.cyl(0.0012, 0.0012, 0.012, '#e8d0a0', 0.021, -0.01, z, 0, 0, -0.35, 5);
      k.sph(0.0022, INK, 0.023, -0.004, z, 1, 1, 1, 5);
    }
  },
  acorn: (k, c) => {
    k.sph(0.014, '#c9a46a', 0, -0.009, 0, 1, 1.25, 1, 12);
    k.dome(0.0165, c, 0, 0.002, 0, 1, 0.65, 1, 12);
    k.cyl(0.002, 0.0025, 0.009, '#5a3a20', 0, 0.015, 0, 0, 0, 0.3, 6);
  },
  pail: (k, c) => {
    k.cyl(0.02, 0.015, 0.03, c, 0, -0.008, 0, 0, 0, 0, 16);
    k.cyl(0.019, 0.019, 0.002, '#ecd39e', 0, 0.007, 0, 0, 0, 0, 16);
    k.tor(0.0202, 0.0018, shadeHex(c, 25), 0, 0.007, 0, Math.PI / 2, 0, 0, 16);
    k.tor(0.019, 0.0012, INK, 0, 0.008, 0, 0, 0, 0, 12, Math.PI);
  },
  wateringCan: (k, c) => {
    k.cyl(0.015, 0.016, 0.026, c, -0.004, -0.01, 0, 0, 0, 0, 14);
    k.cyl(0.003, 0.0022, 0.032, c, 0.018, 0.0, 0, 0, 0, -0.9, 8);
    k.cyl(0.0055, 0.0035, 0.004, shadeHex(c, -25), 0.031, 0.012, 0, 0, 0, -0.9, 8);
    k.tor(0.01, 0.0025, c, -0.006, 0.008, 0, 0, 0, 0, 10, Math.PI);
    k.cyl(0.0152, 0.0152, 0.002, shadeHex(c, -25), -0.004, 0.003, 0, 0, 0, 0, 14);
  },
  bee: (k, c) => {
    k.sph(0.014, c, 0, -0.004, 0, 1.35, 1, 1, 12);
    for (const x of [-0.006, 0.004]) k.tor(0.0132, 0.0026, INK, x, -0.004, 0, 0, Math.PI / 2, 0, 12);
    k.sph(0.0075, INK, 0.019, -0.002, 0, 1, 1, 1, 8);
    for (const z of [-1, 1]) {
      k.sph(0.0095, '#e8f6ff', -0.002, 0.012, z * 0.008, 1, 0.3, 1.3, 8);
      k.sph(0.0018, WHITE, 0.024, 0.001, z * 0.004, 1, 1, 1, 4);
    }
    k.cone(0.0025, 0.006, INK, -0.021, -0.004, 0, 0, 0, Math.PI / 2, 6);
  },
  // ---------------------------------------------------------------------------- space
  rocket: (k, c) => {
    k.cyl(0.0105, 0.012, 0.034, WHITE, 0, -0.006, 0, 0, 0, 0, 12);
    k.cone(0.0105, 0.018, c, 0, 0.02, 0, 0, 0, 0, 12);
    k.cyl(0.005, 0.005, 0.003, '#3fb6ff', 0, 0.002, 0.0105, Math.PI / 2, 0, 0, 10);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      k.box(0.0025, 0.014, 0.01, c, Math.cos(a) * 0.012, -0.02, Math.sin(a) * 0.012, 0, -a, 0);
    }
    k.cone(0.007, 0.01, '#ffb347', 0, -0.027, 0, Math.PI, 0, 0, 8);
  },
  planet: (k, c) => {
    k.parts.push(paintFaces(new THREE.SphereGeometry(0.018, 16, 10), (_x, y) => (Math.abs(y) < 0.004 || Math.abs(y - 0.01) < 0.002 ? shadeHex(c, 30) : y < -0.009 ? shadeHex(c, -25) : c)));
    k.add(new THREE.TorusGeometry(0.027, 0.0028, 4, 24), '#f3dc7a', M(0, 0, 0, Math.PI / 2.4, 0, 0.2, 1, 1, 0.3));
  },
  ufo: (k, c) => {
    k.sph(0.027, '#c9ccd4', 0, -0.006, 0, 1, 0.28, 1, 16);
    k.dome(0.012, c, 0, -0.002, 0, 1, 1, 1, 12);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      k.sph(0.0025, '#fff07a', Math.cos(a) * 0.024, -0.007, Math.sin(a) * 0.024, 1, 1, 1, 5);
    }
    k.cyl(0.006, 0.01, 0.004, '#9aa3b5', 0, -0.0135, 0, 0, 0, 0, 10);
  },
  moon: (k, c) => {
    const pts: [number, number][] = [];
    for (let i = 0; i <= 14; i++) {
      const a = Math.PI * 0.35 + (i / 14) * Math.PI * 1.3;
      pts.push([Math.cos(a) * 0.024, Math.sin(a) * 0.024]);
    }
    for (let i = 14; i >= 0; i--) {
      const a = Math.PI * 0.42 + (i / 14) * Math.PI * 1.16;
      pts.push([0.01 + Math.cos(a) * 0.019, Math.sin(a) * 0.019]);
    }
    k.shape(polygon(pts), 0.008, c, M(0, 0, 0), 0.003);
    k.sph(0.0026, INK, -0.012, 0.004, 0.0075, 1, 1, 0.5, 5);
    k.sph(0.003, '#ff9fc4', -0.014, -0.004, 0.007, 1, 0.6, 0.4, 5);
  },
  satellite: (k, c) => {
    k.box(0.016, 0.016, 0.016, '#e7b53a', 0, 0, 0);
    for (const s of [-1, 1]) {
      k.box(0.004, 0.002, 0.002, c, s * 0.011, 0, 0);
      k.box(0.022, 0.0018, 0.014, '#3f6fb3', s * 0.024, 0, 0);
      for (const x of [0.017, 0.024, 0.031]) k.box(0.0008, 0.002, 0.014, c, s * x, 0, 0);
    }
    k.cone(0.008, 0.005, WHITE, 0, 0.012, 0, Math.PI, 0, 0, 10);
    k.cyl(0.0008, 0.0008, 0.01, c, 0, 0.016, 0, 0, 0, 0, 4);
  },
  alien: (k, c) => {
    k.sph(0.016, c, 0, 0.005, 0, 1, 1.15, 1, 12);
    k.sph(0.01, c, 0, -0.018, 0, 1, 0.9, 1, 10);
    for (const s of [-1, 1]) {
      k.sph(0.0055, INK, s * 0.0065, 0.008, 0.012, 1, 1.4, 0.5, 8);
      k.sph(0.0015, WHITE, s * 0.0058, 0.011, 0.0145, 1, 1, 1, 4);
      k.cyl(0.0009, 0.0009, 0.012, c, s * 0.006, 0.025, 0, 0, 0, s * -0.4, 4);
      k.sph(0.0025, '#f6c344', s * 0.009, 0.031, 0, 1, 1, 1, 5);
    }
  },
  helmet: (k, c) => {
    k.sph(0.021, c, 0, 0.002, 0, 1, 1, 1, 14);
    k.sph(0.016, '#2a3a7a', 0.008, 0.004, 0, 0.55, 0.8, 1, 12);
    k.sph(0.005, '#9fe9ff', 0.0165, 0.009, 0.004, 0.4, 0.8, 0.6, 6);
    k.cyl(0.017, 0.017, 0.007, '#9aa3b5', 0, -0.018, 0, 0, 0, 0, 14);
  },
  // ---------------------------------------------------------------------------- ice
  snowman: (k, c) => {
    k.sph(0.014, c, 0, -0.016, 0, 1, 1, 1, 12);
    k.sph(0.011, c, 0, 0.004, 0, 1, 1, 1, 12);
    k.sph(0.0085, c, 0, 0.019, 0, 1, 1, 1, 10);
    k.cone(0.0022, 0.009, '#f39c34', 0.011, 0.019, 0, 0, 0, -Math.PI / 2, 6);
    for (const z of [-0.003, 0.003]) k.sph(0.0013, INK, 0.007, 0.022, z, 1, 1, 1, 4);
    for (const y of [0.0, 0.006]) k.sph(0.0015, INK, 0.0108, y, 0, 1, 1, 1, 4);
    k.tor(0.0082, 0.0022, '#e8574a', 0, 0.012, 0, Math.PI / 2, 0, 0, 12);
    k.cyl(0.0095, 0.0095, 0.0015, INK, 0, 0.026, 0, 0, 0, 0, 12);
    k.cyl(0.006, 0.006, 0.008, INK, 0, 0.031, 0, 0, 0, 0, 10);
  },
  penguin: (k, c) => {
    k.sph(0.015, c, 0, -0.004, 0, 1, 1.4, 1, 12);
    k.sph(0.011, WHITE, 0.006, -0.007, 0, 0.8, 1.35, 1, 10);
    k.cone(0.003, 0.008, '#f39c34', 0.017, 0.01, 0, 0, 0, -Math.PI / 2, 6);
    for (const z of [-1, 1]) {
      k.sph(0.0022, WHITE, 0.012, 0.013, z * 0.0045, 1, 1, 1, 5);
      k.sph(0.0012, INK, 0.0135, 0.013, z * 0.0045, 1, 1, 1, 4);
      k.sph(0.006, c, -0.001, -0.004, z * 0.014, 1.2, 1.6, 0.4, 8);
      k.sph(0.0045, '#f39c34', 0.006, -0.024, z * 0.005, 1.5, 0.4, 1, 6);
    }
  },
  snowflake: (k, c) => {
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI) / 3;
      k.box(0.05, 0.0045, 0.008, c, 0, 0, 0, 0, 0, a);
      for (const s of [-1, 1]) {
        for (const d of [0.012, 0.019]) {
          const x = Math.cos(a) * d * s;
          const y = Math.sin(a) * d * s;
          k.box(0.01, 0.0035, 0.007, c, x, y, 0, 0, 0, a + Math.PI / 3);
          k.box(0.01, 0.0035, 0.007, c, x, y, 0, 0, 0, a - Math.PI / 3);
        }
      }
    }
    k.sph(0.006, WHITE, 0, 0, 0, 1, 1, 1, 8);
  },
  mitten: (k, c) => {
    k.sph(0.016, c, 0, 0.004, 0, 1, 1.3, 0.5, 12);
    k.sph(0.0065, c, 0.014, -0.001, 0, 1, 1.4, 0.8, 8);
    k.cyl(0.0145, 0.0145, 0.01, WHITE, 0, -0.019, 0, 0, 0, 0, 12);
    k.add(new THREE.CylinderGeometry(0.0145, 0.0145, 0.01, 12), WHITE, M(0, -0.019, 0, 0, 0, 0, 1, 1, 0.55));
    for (const y of [0.0, 0.01]) k.box(0.022, 0.0025, 0.0165, WHITE, -0.002, y, 0);
  },
  iceCube: (k, c) => {
    k.box(0.032, 0.03, 0.032, c, 0, 0, 0);
    k.box(0.026, 0.002, 0.026, WHITE, 0, 0.016, 0);
    k.box(0.004, 0.02, 0.002, WHITE, -0.008, 0.002, 0.0165);
    k.box(0.002, 0.012, 0.002, WHITE, -0.003, -0.002, 0.0165);
  },
  sled: (k, c) => {
    for (let i = 0; i < 3; i++) k.box(0.044, 0.003, 0.007, c, -0.002, 0.002, -0.009 + i * 0.009);
    for (const z of [-0.011, 0.011]) {
      k.box(0.04, 0.003, 0.003, '#e8574a', -0.004, -0.014, z);
      k.tor(0.006, 0.0016, '#e8574a', 0.016, -0.008, z, 0, 0, -Math.PI / 2, 8, Math.PI);
      for (const x of [-0.014, 0.008]) k.box(0.003, 0.014, 0.003, shadeHex(c, -25), x, -0.006, z);
    }
  },
  bobbleHat: (k, c) => {
    k.dome(0.018, c, 0, -0.008, 0, 1, 1.15, 1, 14);
    k.cyl(0.0185, 0.0185, 0.008, WHITE, 0, -0.011, 0, 0, 0, 0, 14);
    k.tor(0.0158, 0.0022, WHITE, 0, 0.002, 0, Math.PI / 2, 0, 0, 14);
    k.sph(0.0075, WHITE, 0, 0.016, 0, 1, 1, 1, 10);
  },
  cocoa: (k, c) => {
    k.cyl(0.0145, 0.013, 0.026, '#e8574a', 0, -0.006, 0, 0, 0, 0, 14);
    k.cyl(0.013, 0.013, 0.002, c, 0, 0.006, 0, 0, 0, 0, 14);
    k.tor(0.007, 0.0025, '#e8574a', 0.015, -0.006, 0, 0, 0, -Math.PI / 2, 10, Math.PI);
    for (const [x, z] of [[-0.004, 0.003], [0.004, -0.002], [0.0, 0.006]] as const) k.box(0.005, 0.004, 0.005, WHITE, x, 0.008, z, 0, x * 80, 0);
    k.tor(0.0146, 0.002, WHITE, 0, -0.002, 0, Math.PI / 2, 0, 0, 14);
  },
  polarBear: (k, c) => {
    k.sph(0.016, c, -0.004, -0.006, 0, 1.45, 1, 1, 12);
    k.sph(0.0105, c, 0.022, 0.002, 0, 1.1, 1, 1, 10);
    k.sph(0.0055, c, 0.031, 0.0, 0, 1, 0.8, 0.8, 8);
    k.sph(0.0022, INK, 0.036, 0.001, 0, 1, 1, 1, 5);
    for (const z of [-1, 1]) {
      k.sph(0.0035, c, 0.02, 0.012, z * 0.006, 1, 1, 0.6, 6);
      k.sph(0.0015, INK, 0.029, 0.006, z * 0.004, 1, 1, 1, 4);
      for (const x of [-0.016, 0.01]) k.cyl(0.0048, 0.005, 0.014, c, x, -0.02, z * 0.009, 0, 0, 0, 8);
    }
  },
  skate: (k, c) => {
    k.box(0.026, 0.026, 0.014, c, -0.004, 0.004, 0);
    k.sph(0.0085, c, 0.011, -0.004, 0, 1.4, 1, 1, 8);
    k.box(0.044, 0.003, 0.0025, '#c9ccd4', 0.0, -0.019, 0);
    k.tor(0.0045, 0.0014, '#c9ccd4', 0.022, -0.015, 0, 0, 0, -Math.PI / 2, 8, Math.PI);
    for (const x of [-0.012, 0.008]) k.box(0.0025, 0.007, 0.0025, '#c9ccd4', x, -0.014, 0);
    for (let i = 0; i < 3; i++) k.box(0.002, 0.0015, 0.015, WHITE, 0.002 - i * 0.005, 0.006 + i * 0.005, 0);
  },
  // ---------------------------------------------------------------------------- model railway village
  log: (k, c) => {
    k.cyl(0.012, 0.012, 0.048, c, 0, 0, 0, 0, 0, Math.PI / 2, 12);
    for (const s of [-1, 1]) {
      k.cyl(0.0112, 0.0112, 0.002, '#e3b97c', s * 0.0241, 0, 0, 0, 0, Math.PI / 2, 12);
      k.tor(0.006, 0.0008, '#b98a55', s * 0.0252, 0, 0, 0, Math.PI / 2, 0, 10);
    }
    k.cyl(0.002, 0.003, 0.008, c, 0.004, 0.012, 0, 0, 0, 0.3, 5);
  },
  milkCan: (k, c) => {
    k.cyl(0.0145, 0.0145, 0.026, c, 0, -0.012, 0, 0, 0, 0, 14);
    k.cyl(0.008, 0.0145, 0.008, c, 0, 0.005, 0, 0, 0, 0, 14);
    k.cyl(0.0075, 0.0075, 0.008, c, 0, 0.013, 0, 0, 0, 0, 12);
    k.cyl(0.0095, 0.0095, 0.004, shadeHex(c, -20), 0, 0.019, 0, 0, 0, 0, 12);
    for (const s of [-1, 1]) k.tor(0.0045, 0.0013, shadeHex(c, -30), s * 0.009, 0.006, 0, 0, Math.PI / 2, 0, 8, Math.PI);
    k.tor(0.0147, 0.0014, shadeHex(c, -25), 0, -0.004, 0, Math.PI / 2, 0, 0, 14);
  },
  hayBale: (k, c) => {
    k.cyl(0.021, 0.021, 0.03, c, 0, 0, 0, Math.PI / 2, 0, 0, 16);
    for (const s of [-1, 1]) {
      k.tor(0.013, 0.0015, shadeHex(c, -35), 0, 0, s * 0.0152, 0, 0, 0, 14);
      k.tor(0.006, 0.0015, shadeHex(c, -35), 0, 0, s * 0.0152, 0, 0, 0, 10);
    }
    k.tor(0.0212, 0.0012, '#e8574a', 0, 0, 0.006, 0, 0, 0, 16);
  },
  barrel: (k, c) => {
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      pts.push(new THREE.Vector2(0.013 + Math.sin(t * Math.PI) * 0.004, -0.018 + t * 0.036));
    }
    k.add(new THREE.LatheGeometry(pts, 14), c);
    for (const y of [-0.018, 0.018]) k.cyl(0.0128, 0.0128, 0.001, shadeHex(c, 25), 0, y, 0, 0, 0, 0, 14);
    for (const y of [-0.011, 0.011]) k.tor(0.0158, 0.0014, '#4a4a52', 0, y, 0, Math.PI / 2, 0, 0, 14);
  },
  crate: (k, c) => {
    k.box(0.034, 0.034, 0.034, shadeHex(c, 15), 0, 0, 0);
    for (const s of [-1, 1]) {
      for (const y of [-0.0145, 0.0145]) k.box(0.0355, 0.005, 0.0355, c, 0, y, 0);
      k.box(0.004, 0.036, 0.0355, c, s * 0.0145, 0, 0);
      k.box(0.0355, 0.004, 0.0355, c, 0, 0, 0, 0, 0, s * 0.75);
    }
  },
  sheep: (k, c) => {
    for (const [x, y, z] of [[-0.01, 0, 0], [0.004, 0.002, 0.006], [0.004, 0.002, -0.006], [-0.014, -0.002, 0.007], [-0.014, -0.002, -0.007], [0.0, 0.007, 0], [-0.006, -0.006, 0]] as const) k.sph(0.0105, c, x, y - 0.002, z, 1, 1, 1, 8);
    k.sph(0.0075, INK, 0.017, 0.004, 0, 1.25, 1, 0.9, 8);
    for (const z of [-1, 1]) {
      k.sph(0.0035, INK, 0.014, 0.008, z * 0.0075, 1, 0.5, 1.4, 5);
      k.sph(0.0013, WHITE, 0.024, 0.006, z * 0.003, 1, 1, 1, 4);
      for (const x of [-0.014, 0.006]) k.cyl(0.0022, 0.0022, 0.014, INK, x, -0.019, z * 0.006, 0, 0, 0, 6);
    }
  },
  coal: (k, c) => {
    for (const [x, y, z, r] of [[-0.01, -0.012, 0.004, 0.011], [0.01, -0.012, -0.003, 0.011], [0.0, -0.012, -0.012, 0.01], [0.0, -0.01, 0.012, 0.009], [0.0, 0.002, 0.0, 0.012], [-0.006, 0.012, 0.004, 0.008]] as const) k.add(new THREE.DodecahedronGeometry(r, 0), c, M(x, y, z, x * 90, y * 90, z * 90));
    k.add(new THREE.DodecahedronGeometry(0.004, 0), '#8a8f9c', M(0.004, 0.012, 0.006));
  },
  fir: (k, c) => {
    k.cyl(0.0035, 0.004, 0.012, '#7a4a26', 0, -0.024, 0, 0, 0, 0, 6);
    k.cone(0.02, 0.022, c, 0, -0.01, 0, 0, 0, 0, 12);
    k.cone(0.016, 0.019, shadeHex(c, 10), 0, 0.004, 0, 0, 0, 0, 12);
    k.cone(0.011, 0.016, shadeHex(c, 20), 0, 0.017, 0, 0, 0, 0, 10);
  },
  // ---------------------------------------------------------------------------- toy shop
  gift: (k, c) => {
    k.box(0.034, 0.03, 0.034, c, 0, -0.004, 0);
    k.box(0.0355, 0.0315, 0.007, '#f6c344', 0, -0.004, 0);
    k.box(0.007, 0.0315, 0.0355, '#f6c344', 0, -0.004, 0);
    for (const s of [-1, 1]) k.tor(0.006, 0.0022, '#f6c344', s * 0.005, 0.016, 0, 0, Math.PI / 2, s * 0.6, 10);
    k.sph(0.0035, '#f6c344', 0, 0.012, 0, 1, 1, 1, 6);
  },
  dice: (k, c) => {
    k.box(0.032, 0.032, 0.032, c, 0, 0, 0);
    const pip = (x: number, y: number, z: number) => k.sph(0.0032, INK, x, y, z, 1, 1, 1, 6);
    const o = 0.0163;
    const d = 0.0085;
    for (const [x, z] of [[0, 0], [d, d], [-d, -d], [d, -d], [-d, d]] as const) pip(x, o, z);
    for (const [x, y] of [[-d, d], [d, -d]] as const) pip(x, y, o);
    for (const [y, z] of [[d, d], [0, 0], [-d, -d]] as const) pip(o, y, z);
  },
  yoyo: (k, c) => {
    for (const s of [-1, 1]) {
      k.cyl(0.018, 0.016, 0.008, c, 0, 0, s * 0.0058, Math.PI / 2, 0, 0, 16);
      k.cyl(0.008, 0.008, 0.0012, '#f6c344', 0, 0, s * 0.0103, Math.PI / 2, 0, 0, 12);
    }
    k.cyl(0.004, 0.004, 0.004, WHITE, 0, 0, 0, Math.PI / 2, 0, 0, 8);
    k.cyl(0.0007, 0.0007, 0.024, WHITE, 0, 0.016, 0, 0, 0, 0, 4);
    k.tor(0.003, 0.0009, WHITE, 0, 0.029, 0, 0, 0, 0, 8);
  },
  soldier: (k, c) => {
    k.box(0.016, 0.018, 0.012, c, 0, -0.001, 0);
    k.box(0.0165, 0.003, 0.0125, WHITE, 0, -0.006, 0);
    for (const z of [-1, 1]) {
      k.box(0.006, 0.016, 0.006, '#2f4f9f', 0, -0.018, z * 0.0035);
      k.box(0.005, 0.014, 0.005, c, 0, 0.0, z * 0.0085);
      k.sph(0.0028, '#f2c9a0', 0, -0.008, z * 0.0085, 1, 1, 1, 5);
    }
    k.sph(0.0068, '#f2c9a0', 0, 0.013, 0, 1, 1, 1, 10);
    for (const z of [-1, 1]) k.sph(0.0015, '#e86f6f', 0.006, 0.012, z * 0.0035, 1, 1, 1, 4);
    k.cyl(0.0072, 0.0072, 0.016, INK, 0, 0.026, 0, 0, 0, 0, 10);
    k.sph(0.0028, '#f6c344', 0.006, 0.026, 0, 1, 1, 1, 5);
  },
  // ---------------------------------------------------------------------------- car play rug
  bus: (k, c) => {
    k.box(0.056, 0.026, 0.026, c, 0, 0.0, 0);
    k.box(0.044, 0.009, 0.0268, '#bfe6ff', -0.004, 0.005, 0);
    k.box(0.0035, 0.012, 0.0222, '#bfe6ff', 0.0283, 0.004, 0);
    k.box(0.058, 0.003, 0.028, WHITE, 0, -0.006, 0);
    for (const z of [-0.008, 0.008]) k.sph(0.0025, '#fff3a0', 0.0285, -0.008, z, 1, 1, 1, 5);
    wheels(k, [-0.017, 0.017], 0.0135, -0.013, 0.0075);
  },
  truck: (k, c) => {
    k.box(0.019, 0.022, 0.026, c, 0.019, -0.001, 0);
    k.box(0.004, 0.009, 0.022, '#bfe6ff', 0.0285, 0.004, 0);
    k.box(0.034, 0.028, 0.028, '#e9e9ef', -0.009, 0.002, 0);
    k.box(0.036, 0.004, 0.0285, c, -0.009, 0.014, 0);
    k.box(0.058, 0.004, 0.022, '#4a4a52', 0.0, -0.014, 0);
    wheels(k, [-0.018, -0.006, 0.02], 0.0135, -0.014, 0.0075);
  },
  cone: (k, c) => {
    k.box(0.032, 0.004, 0.032, shadeHex(c, -20), 0, -0.024, 0);
    k.cone(0.014, 0.042, c, 0, -0.001, 0, 0, 0, 0, 14);
    k.cyl(0.0085, 0.0105, 0.006, WHITE, 0, -0.002, 0, 0, 0, 0, 14);
    k.cyl(0.0042, 0.0055, 0.004, WHITE, 0, 0.012, 0, 0, 0, 0, 12);
  },
  tire: (k, c) => {
    k.tor(0.0155, 0.0085, c, 0, 0, 0, 0, 0, 0, 18);
    k.cyl(0.0095, 0.0095, 0.012, '#c9ccd4', 0, 0, 0, Math.PI / 2, 0, 0, 14);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      k.sph(0.0015, '#4a4a52', Math.cos(a) * 0.005, Math.sin(a) * 0.005, 0.0062, 1, 1, 1, 4);
    }
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      k.box(0.004, 0.0035, 0.016, shadeHex(c, -20), Math.cos(a) * 0.0235, Math.sin(a) * 0.0235, 0, 0, 0, a);
    }
  },
  fuelCan: (k, c) => {
    k.box(0.028, 0.034, 0.013, c, 0, -0.005, 0);
    k.box(0.016, 0.012, 0.0136, '#f6c344', -0.002, -0.006, 0);
    k.tor(0.0055, 0.0018, c, -0.005, 0.012, 0, 0, 0, 0, 8, Math.PI);
    k.cyl(0.0025, 0.0035, 0.01, '#4a4a52', 0.009, 0.015, 0, 0, 0, -0.6, 8);
  },
  trafficLight: (k, c) => {
    k.cyl(0.0022, 0.0022, 0.02, '#9aa3b5', 0, -0.019, 0, 0, 0, 0, 6);
    k.box(0.014, 0.036, 0.012, '#2a2a2e', 0, 0.008, 0);
    for (const [y, col] of [[0.019, '#e8574a'], [0.008, '#f6c344'], [-0.003, c]] as const) {
      k.sph(0.0042, col, 0, y, 0.006, 1, 1, 0.5, 8);
      k.box(0.011, 0.0015, 0.004, '#2a2a2e', 0, y + 0.005, 0.007);
    }
  },
  roadSign: (k, c) => {
    k.cyl(0.0018, 0.0018, 0.03, '#9aa3b5', 0, -0.014, 0, 0, 0, 0, 6);
    k.cyl(0.017, 0.017, 0.003, c, 0, 0.012, 0, Math.PI / 2, 0, 0, 18);
    k.tor(0.0168, 0.0016, WHITE, 0, 0.012, 0.0016, 0, 0, 0, 18);
    k.box(0.016, 0.004, 0.002, WHITE, -0.002, 0.012, 0.0022);
    k.shape(polygon([[0.012, 0], [0.004, 0.007], [0.004, -0.007]]), 0.002, WHITE, M(0, 0.012, 0.0022));
  },
  wrench: (k, c) => {
    k.box(0.036, 0.007, 0.004, c, 0, 0, 0);
    for (const s of [-1, 1]) k.tor(0.0065, 0.0028, c, s * 0.021, 0, 0, 0, 0, s > 0 ? -0.9 : Math.PI - 0.9, 10, Math.PI * 1.55);
    k.box(0.018, 0.002, 0.0042, shadeHex(c, 30), -0.002, 0.002, 0);
  },
};

/** Merged, vertex-colored geometry of a toy (before TOY_SCALE). */
export function toyParts(type: ToyType, holidayModels = true): THREE.BufferGeometry[] {
  const k = new Kit();
  // On a holiday, toys of a hue the holiday has a model for are drawn as that model (F-015).
  const holiday = holidayModels ? activeHoliday()?.skin.cargo[TOY_HUE[type]] : undefined;
  (holiday ?? MODELS[type])(k, TOY_COLORS[type]);
  return k.parts;
}
