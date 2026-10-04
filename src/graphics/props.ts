// Decorative biome props (spec FR-049): merged into one static mesh, plus a few animated parts.
import * as THREE from 'three';
import type { LevelDefinition, PropDef, ToyType } from '../engine/types';
import { GeoBatch, compose, detailMaterial, vertexColorMaterial } from './batch';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { blobTexture, detailTexture, shade } from './textures';
import { toyGeometry } from './toyMeshes';
import type { BiomeTheme } from './biomes';
import { activeHoliday } from './holiday';
import { tileCenter } from './buildings';

export interface PropAnimators {
  group: THREE.Group;
  update(dt: number, time: number): void;
  dispose(): void;
}

export const PALETTES: Record<string, string[]> = {
  rug: ['#e8574a', '#f6c344', '#4a90d9', '#5bb36a', '#f3e3c3'],
  candy: ['#ff7eb3', '#ffd1e3', '#9be3ff', '#fff07a', '#c9a0ff'],
  garden: ['#e8574a', '#4a90d9', '#f6c344', '#5bb36a', '#ff9a3d'],
  space: ['#ff8a3d', '#7ff6ff', '#c9a0ff', '#f6c344', '#ff7eb3'],
  ice: ['#7fd6ff', '#ffffff', '#4a90d9', '#e8574a', '#9b6ad6'],
  village: ['#9a3b2b', '#f4ead6', '#5bb36a', '#8a5a2e', '#f6c344'],
  shop: ['#ef6fa5', '#f6c344', '#4a90d9', '#5bb36a', '#9b6ad6'],
  roads: ['#e8574a', '#4a90d9', '#f6c344', '#5bb36a', '#ffffff'],
};

function pick(list: string[], i: number): string {
  return list[((i % list.length) + list.length) % list.length] as string;
}

/** Spinning parts of props (tops, pinwheels, UFOs), animated by `update`. */
export interface Spinner {
  kind: 'top' | 'pinwheel' | 'ufo';
  at: THREE.Vector3;
  scale: number;
  phase: number;
}

export function addProp(b: GeoBatch, glow: GeoBatch, p: PropDef, at: THREE.Vector3, palette: string[], windmills: THREE.Vector3[], spinners: Spinner[] | null = null): void {
  // Without a spinner list (e.g. the map), moving parts are drawn standing still.
  const spin = (sp: Spinner) => {
    if (spinners) spinners.push(sp);
    else b.add(spinnerGeometry(sp.kind, palette), '#ffffff', compose(sp.at.x, sp.kind === 'ufo' ? at.y + 0.55 * sp.scale : sp.at.y, sp.at.z, 0, sp.scale));
  };
  const s = p.scale;
  const yaw = p.rotation;
  const c1 = pick(palette, p.variant);
  const c2 = pick(palette, p.variant + 2);
  const c3 = pick(palette, p.variant + 1);
  const m = (lx: number, ly: number, lz: number, extraYaw = 0, scale = 1): THREE.Matrix4 => {
    const c = Math.cos(yaw);
    const sn = Math.sin(yaw);
    return compose(at.x + (lx * c + lz * sn) * s, at.y + ly * s, at.z + (-lx * sn + lz * c) * s, yaw + extraYaw, s * scale);
  };
  const mr = (lx: number, ly: number, lz: number, rx: number, ry: number, rz: number, sx = 1, sy = 1, sz = 1): THREE.Matrix4 => {
    const base = m(lx, ly, lz);
    return base.multiply(new THREE.Matrix4().compose(new THREE.Vector3(), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz)));
  };
  // Holiday skins bring their own prop kinds (F-015).
  const holiday = activeHoliday();
  const custom = holiday?.skin.props?.[p.kind];
  if (holiday && custom) {
    custom({ b, glow, m, mr, palette, variant: p.variant, day: holiday.day, length: holiday.length });
    return;
  }
  switch (p.kind) {
    case 'pillow':
      b.add(new THREE.SphereGeometry(0.34, 18, 10).scale(1.15, 0.36, 0.95), c1, m(0, 0.12, 0));
      b.add(new THREE.TorusGeometry(0.12, 0.03, 6, 18).rotateX(Math.PI / 2), c2, m(0, 0.23, 0));
      for (const [x, z] of [[-0.36, -0.28], [0.36, -0.28], [-0.36, 0.28], [0.36, 0.28]] as const) b.add(new THREE.ConeGeometry(0.045, 0.12, 8).rotateZ(Math.PI / 2), c3, m(x, 0.1, z, Math.atan2(z, x)));
      break;
    case 'block':
      // A little tower of ABC blocks.
      b.addColored(toyGeometry('block'), mr(-0.12, 0.17, 0, 0, 0.2, 0, 6, 6, 6));
      b.addColored(toyGeometry('block'), mr(0.2, 0.15, 0.12, 0, 0.9, 0, 5, 5, 5));
      break;
    case 'book':
      for (let i = 0; i < 3; i++) {
        const cover = pick(palette, p.variant + i);
        b.add(new THREE.BoxGeometry(0.52, 0.08, 0.38), cover, m(0, 0.04 + i * 0.085, 0, i * 0.18));
        b.add(new THREE.BoxGeometry(0.48, 0.06, 0.36), '#fbf3e2', m(0.025, 0.04 + i * 0.085, 0, i * 0.18));
      }
      break;
    case 'ball':
      b.addColored(toyGeometry('ball'), m(0, 0.24, 0, 0, 7.5));
      break;
    case 'teddy': {
      const fur = '#b07a46';
      b.add(new THREE.SphereGeometry(0.2, 16, 12).scale(1, 1.15, 0.9), fur, m(0, 0.24, 0));
      b.add(new THREE.SphereGeometry(0.15, 16, 12), fur, m(0, 0.56, 0.02));
      b.add(new THREE.SphereGeometry(0.07, 12, 8).scale(1, 0.8, 0.7), '#e8c99a', m(0, 0.53, 0.15));
      b.add(new THREE.SphereGeometry(0.025, 8, 6), '#2a2a2e', m(0, 0.56, 0.2));
      for (const x of [-0.06, 0.06]) b.add(new THREE.SphereGeometry(0.018, 8, 6), '#2a2a2e', m(x, 0.6, 0.15));
      for (const x of [-0.12, 0.12]) {
        b.add(new THREE.SphereGeometry(0.055, 10, 8), fur, m(x, 0.68, 0));
        b.add(new THREE.SphereGeometry(0.08, 10, 8).scale(1, 1.4, 1), fur, m(x * 1.7, 0.3, 0.05));
        b.add(new THREE.SphereGeometry(0.085, 10, 8).scale(1, 0.8, 1.4), fur, m(x, 0.07, 0.12));
      }
      b.add(new THREE.TorusGeometry(0.1, 0.022, 6, 16).rotateX(Math.PI / 2), c1, m(0, 0.43, 0.02));
      break;
    }
    case 'crayons':
      // Four crayons fanned out; each one's parts turn together around its middle.
      for (let i = 0; i < 4; i++) {
        const col = pick(palette, p.variant + i);
        const a = (i - 1.5) * 0.15;
        const z0 = -0.12 + i * 0.08;
        const along = (d: number): [number, number] => [Math.cos(a) * d, z0 - Math.sin(a) * d];
        const [bx, bz] = along(0);
        const [tx, tz] = along(0.245);
        const [lx, lz] = along(-0.04);
        b.add(new THREE.CylinderGeometry(0.035, 0.035, 0.42, 10).rotateZ(Math.PI / 2), col, m(bx, 0.035, bz, a));
        b.add(new THREE.ConeGeometry(0.035, 0.07, 10).rotateZ(-Math.PI / 2), col, m(tx, 0.035, tz, a));
        b.add(new THREE.CylinderGeometry(0.037, 0.037, 0.2, 10).rotateZ(Math.PI / 2), '#fff6e6', m(lx, 0.035, lz, a));
      }
      break;
    case 'drum':
      b.add(new THREE.CylinderGeometry(0.22, 0.22, 0.24, 20), c1, m(0, 0.12, 0));
      b.add(new THREE.CylinderGeometry(0.225, 0.225, 0.03, 20), '#fff6e6', m(0, 0.245, 0));
      b.add(new THREE.CylinderGeometry(0.228, 0.228, 0.03, 20), c2, m(0, 0.01, 0));
      for (let i = 0; i < 8; i++) b.add(new THREE.BoxGeometry(0.012, 0.22, 0.012), '#e7b53a', m(Math.cos((i / 8) * Math.PI * 2) * 0.225, 0.12, Math.sin((i / 8) * Math.PI * 2) * 0.225, -((i / 8) * Math.PI * 2) + 0.4));
      b.add(new THREE.CylinderGeometry(0.012, 0.012, 0.32, 6).rotateZ(1.2), '#c98a52', m(0.1, 0.3, 0.05));
      break;
    case 'top':
      spin({ kind: 'top', at: at.clone(), scale: s, phase: p.variant });
      break;
    case 'lollipop':
      b.add(new THREE.CylinderGeometry(0.022, 0.022, 0.6, 6), '#fff6e6', m(0, 0.3, 0));
      b.add(new THREE.CylinderGeometry(0.2, 0.2, 0.07, 20).rotateX(Math.PI / 2), c1, m(0, 0.66, 0));
      b.add(new THREE.TorusGeometry(0.14, 0.032, 6, 20), '#fff6e6', m(0, 0.66, 0.04));
      b.add(new THREE.TorusGeometry(0.07, 0.03, 6, 16), c2, m(0, 0.66, 0.045));
      break;
    case 'gumdrop':
      b.add(new THREE.SphereGeometry(0.2, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), c1, m(0, 0, 0));
      b.add(new THREE.SphereGeometry(0.13, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), c2, m(0.24, 0, 0.1));
      b.add(new THREE.SphereGeometry(0.1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), c3, m(-0.12, 0, 0.22));
      break;
    case 'marshmallow':
      b.add(new THREE.CylinderGeometry(0.14, 0.14, 0.24, 16), '#fff8fb', m(-0.1, 0.12, 0));
      b.add(new THREE.CylinderGeometry(0.12, 0.12, 0.2, 16), '#ffd1e3', m(0.17, 0.1, 0.1));
      b.add(new THREE.CylinderGeometry(0.11, 0.11, 0.18, 16).rotateZ(Math.PI / 2), '#d6f5ff', m(0.0, 0.11, -0.22));
      break;
    case 'cupcake':
      b.add(new THREE.CylinderGeometry(0.17, 0.13, 0.18, 16), '#c98a52', m(0, 0.09, 0));
      for (let i = 0; i < 3; i++) b.add(new THREE.TorusGeometry(0.15 - i * 0.045, 0.06 - i * 0.008, 8, 18).rotateX(Math.PI / 2), c1, m(0, 0.21 + i * 0.07, 0));
      b.add(new THREE.SphereGeometry(0.05, 10, 8), '#e8574a', m(0, 0.42, 0));
      b.add(new THREE.CylinderGeometry(0.006, 0.006, 0.06, 4).rotateZ(0.4), '#3c7a2f', m(0.01, 0.47, 0));
      break;
    case 'donut':
      b.add(new THREE.TorusGeometry(0.17, 0.08, 10, 22).rotateX(Math.PI / 2), '#d9a066', m(0, 0.08, 0));
      b.add(new THREE.TorusGeometry(0.17, 0.07, 10, 22, Math.PI * 2).rotateX(Math.PI / 2).scale(1, 0.6, 1), c1, m(0, 0.12, 0));
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        b.add(new THREE.BoxGeometry(0.05, 0.015, 0.015), pick(palette, i), m(Math.cos(a) * (0.12 + (i % 3) * 0.04), 0.165, Math.sin(a) * (0.12 + (i % 3) * 0.04), a * 2));
      }
      break;
    case 'candyCane':
      for (let i = 0; i < 6; i++) b.add(new THREE.CylinderGeometry(0.04, 0.04, 0.1, 10), i % 2 ? '#fff6e6' : '#e8574a', m(0, 0.05 + i * 0.1, 0));
      b.add(new THREE.TorusGeometry(0.1, 0.04, 8, 14, Math.PI), '#e8574a', m(-0.1, 0.6, 0));
      break;
    case 'dune':
      // A sand castle with towers and flags.
      b.add(new THREE.BoxGeometry(0.4, 0.18, 0.3), '#e3c27f', m(0, 0.09, 0));
      for (const [x, z] of [[-0.2, -0.15], [0.2, -0.15], [-0.2, 0.15], [0.2, 0.15]] as const) {
        b.add(new THREE.CylinderGeometry(0.075, 0.085, 0.3, 10), '#e9cd8e', m(x, 0.15, z));
        b.add(new THREE.ConeGeometry(0.09, 0.12, 10), '#d8b46f', m(x, 0.36, z));
      }
      b.add(new THREE.CylinderGeometry(0.006, 0.006, 0.2, 4), '#3b2a20', m(-0.2, 0.5, -0.15));
      b.add(new THREE.BoxGeometry(0.08, 0.05, 0.005), c1, m(-0.16, 0.57, -0.15));
      break;
    case 'bucket':
      b.add(new THREE.CylinderGeometry(0.17, 0.13, 0.3, 16, 1, true), c1, m(0, 0.15, 0));
      b.add(new THREE.CylinderGeometry(0.13, 0.13, 0.02, 16), c1, m(0, 0.01, 0));
      b.add(new THREE.CylinderGeometry(0.16, 0.16, 0.04, 16), '#e9cd8e', m(0, 0.26, 0));
      b.add(new THREE.TorusGeometry(0.16, 0.012, 4, 16, Math.PI), '#3b2a20', m(0, 0.3, 0));
      break;
    case 'spade':
      b.add(new THREE.BoxGeometry(0.06, 0.04, 0.45), c2, m(0, 0.03, -0.1));
      b.add(new THREE.BoxGeometry(0.22, 0.03, 0.22), c2, m(0, 0.025, 0.2));
      b.add(new THREE.BoxGeometry(0.16, 0.05, 0.06), c2, m(0, 0.03, -0.34));
      break;
    case 'windmill':
      b.add(new THREE.CylinderGeometry(0.02, 0.02, 0.7, 6), '#fff6e6', m(0, 0.35, 0));
      spin({ kind: 'pinwheel', at: new THREE.Vector3(at.x, at.y + 0.72 * s, at.z), scale: s, phase: p.variant });
      void windmills;
      break;
    case 'flowers':
      for (let i = 0; i < 4; i++) {
        const x = Math.cos(i * 2.1) * 0.15;
        const z = Math.sin(i * 2.1) * 0.15;
        const h = 0.25 + (i % 2) * 0.12;
        b.add(new THREE.CylinderGeometry(0.01, 0.012, h, 5), '#3c8a2f', m(x, h / 2, z));
        b.add(new THREE.SphereGeometry(0.04, 8, 6), '#ffd23f', m(x, h, z));
        for (let k = 0; k < 6; k++) b.add(new THREE.SphereGeometry(0.035, 8, 6).scale(1, 0.4, 1), pick(palette, i), m(x + Math.cos(k) * 0.06, h - 0.005, z + Math.sin(k) * 0.06));
        b.add(new THREE.SphereGeometry(0.05, 8, 6).scale(1.6, 0.3, 0.8), '#5bb36a', m(x + 0.04, h * 0.4, z, i));
      }
      break;
    case 'mushroom':
      b.add(new THREE.CylinderGeometry(0.06, 0.08, 0.2, 10), '#fff6e6', m(0, 0.1, 0));
      b.add(new THREE.SphereGeometry(0.17, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), '#e8574a', m(0, 0.18, 0));
      for (let i = 0; i < 5; i++) b.add(new THREE.SphereGeometry(0.025, 6, 4), '#ffffff', m(Math.cos(i * 1.3) * 0.1, 0.3 - (i % 2) * 0.03, Math.sin(i * 1.3) * 0.1));
      break;
    case 'planet':
      b.add(new THREE.SphereGeometry(0.24, 18, 12), c1, m(0, 0.32, 0));
      b.add(new THREE.SphereGeometry(0.06, 10, 8), shade(c1, -30), m(0.12, 0.42, 0.15));
      b.add(new THREE.TorusGeometry(0.36, 0.03, 6, 32).rotateX(Math.PI / 2.4), c2, m(0, 0.32, 0));
      b.add(new THREE.CylinderGeometry(0.03, 0.06, 0.1, 6), '#9aa3c7', m(0, 0.05, 0));
      break;
    case 'rocket':
      b.add(new THREE.CylinderGeometry(0.1, 0.12, 0.45, 14), '#f3f3f7', m(0, 0.3, 0));
      b.add(new THREE.ConeGeometry(0.1, 0.2, 14), c1, m(0, 0.62, 0));
      b.add(new THREE.CylinderGeometry(0.045, 0.045, 0.02, 12).rotateX(Math.PI / 2), '#3fb6ff', m(0, 0.4, 0.1));
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        b.add(new THREE.BoxGeometry(0.02, 0.16, 0.12), c1, m(Math.cos(a) * 0.11, 0.1, Math.sin(a) * 0.11, -a));
      }
      glow.add(new THREE.ConeGeometry(0.07, 0.12, 10).rotateX(Math.PI), '#ffb347', m(0, 0.02, 0));
      break;
    case 'ufo':
      spin({ kind: 'ufo', at: at.clone(), scale: s, phase: p.variant });
      break;
    case 'starSticker': {
      const shape = new THREE.Shape();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? 0.24 : 0.1;
        const a = (i / 10) * Math.PI * 2;
        if (i === 0) shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else shape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      const g = new THREE.ExtrudeGeometry(shape, { depth: 0.02, bevelEnabled: false }).rotateX(-Math.PI / 2);
      glow.add(g, pick(['#fff3a0', '#9fe9ff', '#ffb3e6'], p.variant), m(0, 0.005, 0));
      break;
    }
    case 'crater':
      b.add(new THREE.TorusGeometry(0.22, 0.06, 6, 18).rotateX(Math.PI / 2), '#4a5180', m(0, 0.02, 0));
      b.add(new THREE.CircleGeometry(0.2, 16).rotateX(-Math.PI / 2), '#2a2f55', m(0, 0.005, 0));
      break;
    case 'snowTree':
      b.add(new THREE.CylinderGeometry(0.03, 0.04, 0.16, 6), '#7a4a26', m(0, 0.08, 0));
      for (const [y, r, h] of [[0.28, 0.24, 0.3], [0.48, 0.19, 0.26], [0.66, 0.13, 0.22]] as const) {
        b.add(new THREE.ConeGeometry(r, h, 10), '#3f7f4a', m(0, y, 0));
        b.add(new THREE.ConeGeometry(r * 0.75, h * 0.45, 10), '#f4f8ff', m(0, y + h * 0.3, 0));
      }
      break;
    case 'igloo':
      b.add(new THREE.SphereGeometry(0.34, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), '#f4f8ff', m(0, 0, 0));
      for (let i = 1; i < 4; i++) b.add(new THREE.TorusGeometry(0.34 * Math.cos(i * 0.38), 0.008, 4, 24).rotateX(Math.PI / 2), '#c7d9ec', m(0, 0.34 * Math.sin(i * 0.38), 0));
      b.add(new THREE.CylinderGeometry(0.11, 0.11, 0.18, 12, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateY(Math.PI / 2), '#f4f8ff', m(0, 0.0, 0.32));
      b.add(new THREE.CircleGeometry(0.08, 12, 0, Math.PI), '#2a3a5a', m(0, 0.005, 0.415));
      break;
    case 'snowDrift':
      b.add(new THREE.SphereGeometry(0.3, 12, 6).scale(1.3, 0.3, 0.9), '#f4f8ff', m(0, 0, 0));
      b.add(new THREE.SphereGeometry(0.18, 10, 6).scale(1, 0.4, 1), '#eef4fb', m(0.28, 0, 0.1));
      break;
    case 'house': {
      // A half-timbered model-railway house.
      b.add(new THREE.BoxGeometry(0.5, 0.36, 0.4), '#f4ead6', m(0, 0.18, 0));
      for (const x of [-0.24, -0.08, 0.08, 0.24]) b.add(new THREE.BoxGeometry(0.03, 0.36, 0.41), '#5a3a20', m(x, 0.18, 0));
      b.add(new THREE.BoxGeometry(0.51, 0.03, 0.41), '#5a3a20', m(0, 0.2, 0));
      for (const x of [-0.16, 0.16]) b.add(new THREE.BoxGeometry(0.08, 0.08, 0.42), '#bfe6ff', m(x, 0.28, 0));
      const roof = new THREE.CylinderGeometry(0.3, 0.3, 0.56, 3).rotateZ(Math.PI / 2).rotateX(Math.PI / 6).scale(1, 0.75, 0.82);
      b.add(roof, pick(['#9a3b2b', '#6b4a3a', '#3f4a5a'], p.variant), m(0, 0.46, 0));
      b.add(new THREE.BoxGeometry(0.07, 0.18, 0.07), '#9a3b2b', m(0.14, 0.62, -0.06));
      break;
    }
    case 'tree':
      b.add(new THREE.CylinderGeometry(0.03, 0.045, 0.32, 7), '#7a4a26', m(0, 0.16, 0));
      b.add(new THREE.IcosahedronGeometry(0.22, 1), pick(['#4f9a3a', '#5fae45', '#3f8a3a'], p.variant), m(0, 0.46, 0));
      b.add(new THREE.IcosahedronGeometry(0.15, 1), pick(['#5fae45', '#6fbf50', '#4f9a3a'], p.variant + 1), m(0.12, 0.6, 0.05));
      b.add(new THREE.IcosahedronGeometry(0.14, 1), pick(['#3f8a3a', '#4f9a3a', '#5fae45'], p.variant + 2), m(-0.12, 0.56, -0.05));
      break;
    case 'bush':
      b.add(new THREE.IcosahedronGeometry(0.16, 1).scale(1.2, 0.8, 1), '#4f9a3a', m(0, 0.11, 0));
      b.add(new THREE.IcosahedronGeometry(0.1, 1), '#5fae45', m(0.12, 0.09, 0.06));
      for (let i = 0; i < 3; i++) b.add(new THREE.SphereGeometry(0.02, 6, 4), pick(['#ff8fb1', '#ffe066', '#ffffff'], p.variant + i), m(Math.cos(i * 2) * 0.12, 0.18, Math.sin(i * 2) * 0.1));
      break;
    case 'fence':
      for (let i = 0; i < 5; i++) b.add(new THREE.BoxGeometry(0.03, 0.16, 0.03), '#f4ead6', m(-0.4 + i * 0.2, 0.08, 0));
      for (const y of [0.06, 0.12]) b.add(new THREE.BoxGeometry(0.84, 0.025, 0.02), '#f4ead6', m(0, y, 0));
      break;
    case 'shelf':
      // A toy-shop shelf with boxes on it.
      b.add(new THREE.BoxGeometry(0.9, 1.0, 0.3), '#8a5a3a', m(0, 0.5, -0.02));
      for (let r = 0; r < 3; r++) {
        b.add(new THREE.BoxGeometry(0.84, 0.28, 0.26), '#5a3a28', m(0, 0.2 + r * 0.31, 0.03));
        for (let k = 0; k < 4; k++) b.add(new THREE.BoxGeometry(0.16, 0.12 + ((k + r) % 3) * 0.04, 0.16), pick(palette, k + r * 2), m(-0.3 + k * 0.2, 0.14 + r * 0.31 + ((k + r) % 3) * 0.02, 0.06, 0.1 * (k - 1.5)));
      }
      break;
    case 'garage':
      b.add(new THREE.BoxGeometry(0.6, 0.3, 0.45), '#f2e2c4', m(0, 0.15, 0));
      b.add(new THREE.BoxGeometry(0.66, 0.05, 0.5), '#4a90d9', m(0, 0.32, 0));
      for (const x of [-0.15, 0.15]) b.add(new THREE.BoxGeometry(0.22, 0.2, 0.02), '#d9dde6', m(x, 0.11, 0.23));
      b.add(new THREE.BoxGeometry(0.4, 0.08, 0.02), '#e8574a', m(0, 0.27, 0.235));
      break;
    // ------------------------------------------------------------- scene pieces (FR-117)
    case 'paper': {
      // A notepad page with a child's drawing: a sun, a house, a squiggle.
      b.add(new THREE.BoxGeometry(1.1, 0.008, 0.8), '#fbf8f2', m(0, 0.004, 0));
      for (let i = 0; i < 6; i++) b.add(new THREE.CylinderGeometry(0.018, 0.018, 0.02, 6), '#9aa3b5', m(-0.45 + i * 0.18, 0.006, -0.38));
      if (p.variant % 2 === 0) {
        b.add(new THREE.CylinderGeometry(0.11, 0.11, 0.004, 16), '#f6c344', m(-0.3, 0.01, -0.12));
        for (let i = 0; i < 8; i++) b.add(new THREE.BoxGeometry(0.1, 0.004, 0.02), '#f39c34', m(-0.3 + Math.cos(i * 0.785) * 0.18, 0.01, -0.12 + Math.sin(i * 0.785) * 0.18, -i * 0.785));
        b.add(new THREE.BoxGeometry(0.26, 0.004, 0.2), '#e8574a', m(0.22, 0.01, 0.12));
        b.add(new THREE.CylinderGeometry(0.16, 0.16, 0.004, 3).rotateY(Math.PI / 6), '#4a90d9', m(0.22, 0.011, -0.04, 0, 1));
      } else {
        for (let i = 0; i < 7; i++) b.add(new THREE.BoxGeometry(0.16, 0.004, 0.025), pick(palette, i), m(-0.4 + i * 0.13, 0.01, Math.sin(i * 1.3) * 0.15, Math.cos(i) * 0.8));
      }
      break;
    }
    case 'bigPaper':
      b.add(new THREE.BoxGeometry(2.1, 0.01, 3.0), '#fbf8f2', m(0, 0.005, 0));
      b.add(new THREE.CylinderGeometry(0.35, 0.35, 0.004, 20), '#f6c344', m(-0.4, 0.012, -0.8));
      b.add(new THREE.BoxGeometry(0.9, 0.004, 0.7), '#e8574a', m(0.3, 0.012, 0.4));
      b.add(new THREE.CylinderGeometry(0.6, 0.6, 0.004, 3).rotateY(Math.PI / 6), '#4a90d9', m(0.3, 0.013, -0.15, 0, 1));
      for (let i = 0; i < 9; i++) b.add(new THREE.BoxGeometry(0.25, 0.004, 0.05), '#5bb36a', m(-0.9 + i * 0.22, 0.012, 1.25 + Math.sin(i * 1.7) * 0.06, 0.4));
      break;
    case 'crayon': {
      const col = pick(palette, p.variant);
      b.add(new THREE.CylinderGeometry(0.04, 0.04, 0.62, 10).rotateZ(Math.PI / 2), col, m(0, 0.04, 0));
      b.add(new THREE.ConeGeometry(0.04, 0.1, 10).rotateZ(-Math.PI / 2), col, m(0.36, 0.04, 0));
      b.add(new THREE.CylinderGeometry(0.042, 0.042, 0.3, 10).rotateZ(Math.PI / 2), '#fff6e6', m(-0.06, 0.04, 0));
      break;
    }
    case 'marble': {
      const col = pick(['#4a90d9', '#e8574a', '#5bb36a', '#f6c344', '#9b6ad6'], p.variant);
      b.add(new THREE.SphereGeometry(0.07, 12, 8), col, m(0, 0.07, 0));
      b.add(new THREE.SphereGeometry(0.02, 6, 4), '#ffffff', m(-0.025, 0.11, 0.025));
      break;
    }
    case 'table':
      b.add(new THREE.CylinderGeometry(0.3, 0.3, 0.03, 18), pick(palette, p.variant), m(0, 0.19, 0));
      b.add(new THREE.CylinderGeometry(0.31, 0.31, 0.012, 18), '#fff6e6', m(0, 0.17, 0));
      b.add(new THREE.CylinderGeometry(0.03, 0.05, 0.18, 8), '#8b5a2b', m(0, 0.09, 0));
      b.add(new THREE.CylinderGeometry(0.12, 0.12, 0.02, 12), '#8b5a2b', m(0, 0.01, 0));
      break;
    case 'teapot':
      b.add(new THREE.SphereGeometry(0.075, 12, 8).scale(1, 0.8, 1), '#4a90d9', m(0, 0.06, 0));
      b.add(new THREE.CylinderGeometry(0.012, 0.02, 0.08, 6).rotateZ(-0.9), '#4a90d9', m(0.08, 0.07, 0));
      b.add(new THREE.TorusGeometry(0.035, 0.01, 5, 10, Math.PI * 1.3), '#4a90d9', m(-0.075, 0.07, 0, 0, 1));
      b.add(new THREE.SphereGeometry(0.02, 6, 4), '#fff6e6', m(0, 0.125, 0));
      break;
    case 'cup':
      b.add(new THREE.CylinderGeometry(0.06, 0.06, 0.008, 12), '#fff6e6', m(0, 0.004, 0));
      b.add(new THREE.CylinderGeometry(0.04, 0.032, 0.05, 10), '#fff6e6', m(0, 0.033, 0));
      b.add(new THREE.CylinderGeometry(0.036, 0.036, 0.004, 10), '#8a5a2e', m(0, 0.056, 0));
      b.add(new THREE.TorusGeometry(0.016, 0.006, 4, 8), '#fff6e6', m(0.045, 0.035, 0));
      break;
    case 'plate':
      b.add(new THREE.CylinderGeometry(0.25, 0.2, 0.02, 20), '#fbf8f2', m(0, 0.01, 0));
      b.add(new THREE.TorusGeometry(0.235, 0.012, 4, 20).rotateX(Math.PI / 2), pick(palette, p.variant), m(0, 0.02, 0));
      break;
    case 'jar':
      // A sweet jar lying on its side, its lid off.
      b.add(new THREE.CylinderGeometry(0.15, 0.15, 0.36, 16).rotateZ(Math.PI / 2), '#cdeefa', m(0, 0.15, 0));
      b.add(new THREE.CylinderGeometry(0.16, 0.16, 0.04, 16).rotateZ(Math.PI / 2), '#e8574a', m(-0.2, 0.15, 0));
      b.add(new THREE.CylinderGeometry(0.17, 0.17, 0.05, 16), '#e8574a', m(-0.32, 0.025, 0.12));
      break;
    case 'pond': {
      const ice = p.variant === 1;
      b.add(new THREE.CylinderGeometry(0.62, 0.62, 0.012, 24), ice ? '#d9f0fb' : '#6fb7e0', m(0, 0.006, 0));
      b.add(new THREE.TorusGeometry(0.62, 0.045, 6, 24).rotateX(Math.PI / 2), ice ? '#ffffff' : '#9a8a72', m(0, 0.012, 0));
      if (!ice) for (let i = 0; i < 3; i++) b.add(new THREE.TorusGeometry(0.1 + i * 0.12, 0.006, 3, 18).rotateX(Math.PI / 2), '#a9dcf5', m(0.1, 0.014, -0.1));
      break;
    }
    case 'flag':
      b.add(new THREE.CylinderGeometry(0.012, 0.012, 0.55, 6), '#e9e9ef', m(0, 0.275, 0));
      b.add(new THREE.CylinderGeometry(0.11, 0.11, 0.012, 3).rotateX(Math.PI / 2).rotateZ(Math.PI / 2), pick(palette, p.variant), m(0.09, 0.48, 0));
      break;
    case 'pad':
      b.add(new THREE.CylinderGeometry(0.62, 0.66, 0.05, 24), p.variant === 1 ? '#3a4176' : '#9aa3b5', m(0, 0.025, 0));
      for (let i = 0; i < 8; i++) b.add(new THREE.BoxGeometry(0.12, 0.012, 0.06), i % 2 ? '#2a2a2e' : '#f6c344', m(Math.cos(i * 0.785) * 0.52, 0.052, Math.sin(i * 0.785) * 0.52, -i * 0.785));
      glow.add(new THREE.TorusGeometry(0.4, 0.015, 4, 24).rotateX(Math.PI / 2), '#7ff6ff', m(0, 0.055, 0));
      break;
    case 'pen':
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        b.add(new THREE.BoxGeometry(0.03, 0.16, 0.03), '#f4ead6', m(Math.cos(a) * 0.72, 0.08, Math.sin(a) * 0.72));
        for (const y of [0.06, 0.13]) b.add(new THREE.BoxGeometry(0.46, 0.022, 0.018), '#f4ead6', m(Math.cos(a + 0.314) * 0.7, y, Math.sin(a + 0.314) * 0.7, -(a + 0.314) + Math.PI / 2));
      }
      b.add(new THREE.CylinderGeometry(0.66, 0.66, 0.006, 24), '#8fbf5a', m(0, 0.003, 0));
      break;
    case 'lines':
      for (let i = 0; i < 4; i++) b.add(new THREE.BoxGeometry(0.03, 0.006, 0.55), '#ffffff', m(-0.66 + i * 0.44, 0.004, -0.2));
      b.add(new THREE.BoxGeometry(1.4, 0.004, 1.3), '#6a6a72', m(0, 0.001, 0));
      break;
    case 'pump':
      b.add(new THREE.BoxGeometry(0.2, 0.42, 0.14), '#e8574a', m(0, 0.21, 0));
      b.add(new THREE.BoxGeometry(0.14, 0.1, 0.01), '#bfe6ff', m(0, 0.32, 0.075));
      b.add(new THREE.TorusGeometry(0.08, 0.012, 4, 10, Math.PI), '#2a2a2e', mr(0.1, 0.2, 0, 0, Math.PI / 2, -Math.PI / 2));
      b.add(new THREE.BoxGeometry(0.24, 0.04, 0.18), '#f6c344', m(0, 0.44, 0));
      break;
    case 'board':
      b.add(new THREE.BoxGeometry(0.95, 0.03, 0.95), '#fff6e6', m(0, 0.015, 0));
      for (let i = 0; i < 16; i++) b.add(new THREE.BoxGeometry(0.2, 0.006, 0.2), (Math.floor(i / 4) + i) % 2 ? '#e8574a' : '#2a2a2e', m(-0.33 + (i % 4) * 0.22, 0.033, -0.33 + Math.floor(i / 4) * 0.22));
      break;
    case 'token': {
      const col = pick(['#4a90d9', '#f6c344', '#5bb36a', '#e8574a'], p.variant);
      b.add(new THREE.ConeGeometry(0.055, 0.13, 10), col, m(0, 0.065, 0));
      b.add(new THREE.SphereGeometry(0.04, 8, 6), col, m(0, 0.15, 0));
      break;
    }
    case 'snowball':
      b.add(new THREE.SphereGeometry(0.11, 10, 8), '#f8fbff', m(0, 0.1, 0));
      break;
    case 'leaf':
      b.add(new THREE.SphereGeometry(0.35, 14, 6).scale(1, 0.06, 0.55), '#5fae45', m(0, 0.02, 0));
      b.add(new THREE.BoxGeometry(0.6, 0.012, 0.02), '#3f8a3a', m(0, 0.035, 0));
      break;
    case 'reeds':
      for (let i = 0; i < 4; i++) {
        const h = 0.35 + (i % 2) * 0.12;
        b.add(new THREE.CylinderGeometry(0.008, 0.01, h, 5), '#4a8a3a', mr(Math.cos(i * 1.7) * 0.06, h / 2, Math.sin(i * 1.7) * 0.06, 0, 0, (i - 1.5) * 0.08));
        b.add(new THREE.CapsuleGeometry(0.02, 0.07, 2, 6), '#8a5a2e', m(Math.cos(i * 1.7) * 0.06, h, Math.sin(i * 1.7) * 0.06));
      }
      break;
    case 'stand':
      b.add(new THREE.BoxGeometry(1.1, 0.24, 0.3), '#fff6e6', m(0, 0.12, 0));
      for (let i = 0; i < 6; i++) b.add(new THREE.BoxGeometry(0.18, 0.02, 0.36), i % 2 ? '#fff6e6' : '#ff6fa5', m(-0.46 + i * 0.185, 0.5, 0.08));
      for (const x of [-0.52, 0.52]) b.add(new THREE.CylinderGeometry(0.015, 0.015, 0.28, 6), '#fff6e6', m(x, 0.37, -0.1));
      break;
    case 'ribbon':
      b.add(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 16).rotateX(Math.PI / 2), '#f6c344', m(0, 0.12, 0));
      b.add(new THREE.BoxGeometry(0.5, 0.004, 0.06), '#f6c344', m(0.3, 0.004, 0.05, 0.3));
      break;
    default:
      if (p.kind.startsWith('toy:')) {
        // A toy from the biome's set, standing on the floor at the given size.
        // Toy props are ten times a wagon load at scale 1 (about the size of the other props).
        const geo = toyGeometry(p.kind.slice(4) as ToyType).scale(10, 10, 10);
        geo.computeBoundingBox();
        const lift = -(geo.boundingBox as THREE.Box3).min.y;
        b.add(geo, '#ffffff', m(0, lift, 0));
        geo.dispose();
        break;
      }
      b.add(new THREE.BoxGeometry(0.25, 0.25, 0.25), c1, m(0, 0.125, 0));
  }
}

function spinnerGeometry(kind: Spinner['kind'], palette: string[]): THREE.BufferGeometry {
  const b = new GeoBatch();
  if (kind === 'top') {
    b.add(new THREE.ConeGeometry(0.2, 0.22, 20).rotateX(Math.PI), palette[0] as string, compose(0, 0.13, 0));
    b.add(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 20), palette[1] as string, compose(0, 0.255, 0));
    for (let i = 0; i < 4; i++) b.add(new THREE.BoxGeometry(0.2, 0.052, 0.04), palette[(i + 2) % palette.length] as string, compose(Math.cos((i * Math.PI) / 2) * 0.1, 0.256, Math.sin((i * Math.PI) / 2) * 0.1, -(i * Math.PI) / 2));
    b.add(new THREE.CylinderGeometry(0.025, 0.025, 0.14, 8), '#3b2a20', compose(0, 0.34, 0));
  } else if (kind === 'pinwheel') {
    for (let i = 0; i < 4; i++) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0.22, 0.05, 0, 0.05, 0.22, 0], 3));
      g.computeVertexNormals();
      const tri = g.clone();
      tri.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0.05, 0.22, 0, 0.22, 0.05, 0], 3));
      tri.computeVertexNormals();
      const m = new THREE.Matrix4().makeRotationZ((i * Math.PI) / 2);
      b.add(g, palette[i % palette.length] as string, m);
      b.add(tri, palette[i % palette.length] as string, m);
    }
    b.add(new THREE.SphereGeometry(0.03, 8, 6), '#fff6e6', compose(0, 0, 0.02));
  } else {
    b.add(new THREE.SphereGeometry(0.3, 20, 8).scale(1, 0.25, 1), '#c9ccd4', compose(0, 0, 0));
    b.add(new THREE.SphereGeometry(0.14, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), '#9fe9ff', compose(0, 0.04, 0));
    for (let i = 0; i < 6; i++) b.add(new THREE.SphereGeometry(0.03, 8, 6), palette[i % palette.length] as string, compose(Math.cos((i / 6) * Math.PI * 2) * 0.26, -0.02, Math.sin((i / 6) * Math.PI * 2) * 0.26));
  }
  return b.buildGeometry() as THREE.BufferGeometry;
}

export function buildProps(def: LevelDefinition, theme: BiomeTheme, outside: readonly { prop: PropDef; at: THREE.Vector3; radius?: number }[] = [], inside: readonly { prop: PropDef; at: THREE.Vector3 }[] = []): PropAnimators {
  const group = new THREE.Group();
  const batch = new GeoBatch();
  const far = new GeoBatch();
  const glow = new GeoBatch();
  const windmills: THREE.Vector3[] = [];
  const spinners: Spinner[] = [];
  const palette = PALETTES[theme.id] ?? (PALETTES.rug as string[]);
  for (const p of def.props) addProp(batch, glow, p, tileCenter(def, p.tile), palette, windmills, spinners);
  for (const o of inside) addProp(batch, glow, o.prop, o.at, palette, windmills, spinners);
  // Props off the board cast no shadows (outside the shadow map anyway): half the triangles.
  for (const o of outside) addProp(far, glow, o.prop, o.at, palette, windmills, spinners);
  const material = detailMaterial(detailTexture('paint'), 0.6);
  const mesh = batch.build(material, 3);
  if (mesh) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  const farMesh = far.build(material, 3);
  if (farMesh) {
    farMesh.receiveShadow = true;
    group.add(farMesh);
  }
  // Soft contact shadows under the big things off the board (outside the shadow map).
  const blobs = outside.filter((o) => o.radius).map((o) => new THREE.CircleGeometry((o.radius as number) * 1.15, 24).rotateX(-Math.PI / 2).translate(o.at.x, o.at.y + 0.004, o.at.z));
  const blobGeo = blobs.length ? mergeGeometries(blobs, false) : null;
  for (const b of blobs) b.dispose();
  const blobMat = new THREE.MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false, color: '#000000', opacity: 0.32 });
  if (blobGeo) group.add(new THREE.Mesh(blobGeo, blobMat));
  const glowMat = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
  const glowMesh = glow.build(glowMat);
  if (glowMesh) group.add(glowMesh);

  // Spinning tops, pinwheels and hovering UFOs: one instanced mesh per kind.
  const spinMat = vertexColorMaterial(0.45);
  const spinMeshes: { mesh: THREE.InstancedMesh; list: Spinner[] }[] = [];
  for (const kind of ['top', 'pinwheel', 'ufo'] as const) {
    const list = spinners.filter((sp) => sp.kind === kind);
    if (!list.length) continue;
    const mesh = new THREE.InstancedMesh(spinnerGeometry(kind, palette), spinMat, list.length);
    mesh.castShadow = true;
    mesh.frustumCulled = false;
    spinMeshes.push({ mesh, list });
    group.add(mesh);
  }
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const p = new THREE.Vector3();
  const sc = new THREE.Vector3();
  const pose = (time: number) => {
    for (const { mesh, list } of spinMeshes) {
      list.forEach((sp, i) => {
        p.copy(sp.at);
        if (sp.kind === 'top') e.set(Math.sin(time * 1.3 + sp.phase) * 0.12, time * 9 + sp.phase, Math.cos(time * 1.3 + sp.phase) * 0.12);
        else if (sp.kind === 'pinwheel') {
          // Pinwheels face the camera (+z) and turn faster in gusts.
          const gust = time * 2.2 + 1.5 * Math.max(0, Math.sin(time * 0.6 + sp.phase)) * 2;
          e.set(-0.3, 0, gust + sp.phase);
        } else {
          p.y = sp.at.y + (0.55 + Math.sin(time * 1.6 + sp.phase) * 0.08) * sp.scale;
          p.x += Math.sin(time * 0.4 + sp.phase) * 0.3;
          e.set(Math.sin(time * 1.1 + sp.phase) * 0.1, time * 1.5, 0);
        }
        mesh.setMatrixAt(i, m.compose(p, q.setFromEuler(e), sc.setScalar(sp.scale)));
      });
      mesh.instanceMatrix.needsUpdate = true;
    }
  };
  pose(0);
  let clock = 0;
  return {
    group,
    update(dt, time) {
      void time;
      if (dt <= 0) return;
      clock += dt;
      pose(clock);
    },
    dispose() {
      mesh?.geometry.dispose();
      farMesh?.geometry.dispose();
      blobGeo?.dispose();
      blobMat.dispose();
      glowMesh?.geometry.dispose();
      material.dispose();
      glowMat.dispose();
      spinMat.dispose();
      for (const sm of spinMeshes) {
        sm.mesh.geometry.dispose();
        sm.mesh.dispose();
      }
    },
  };
}
