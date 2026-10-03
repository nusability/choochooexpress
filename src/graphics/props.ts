// Decorative biome props (spec FR-049): merged into one static mesh, plus a few animated parts.
import * as THREE from 'three';
import type { LevelDefinition, PropDef } from '../engine/types';
import { GeoBatch, compose, detailMaterial, vertexColorMaterial } from './batch';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { blobTexture, detailTexture, shade } from './textures';
import { toyGeometry } from './toyMeshes';
import type { BiomeTheme } from './biomes';
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
    else b.add(spinnerGeometry(sp.kind, palette), '#ffffff', compose(sp.at.x, sp.kind === 'ufo' ? 0.55 * sp.scale : sp.at.y, sp.at.z, 0, sp.scale));
  };
  const s = p.scale;
  const yaw = p.rotation;
  const c1 = pick(palette, p.variant);
  const c2 = pick(palette, p.variant + 2);
  const c3 = pick(palette, p.variant + 1);
  const m = (lx: number, ly: number, lz: number, extraYaw = 0, scale = 1): THREE.Matrix4 => {
    const c = Math.cos(yaw);
    const sn = Math.sin(yaw);
    return compose(at.x + (lx * c + lz * sn) * s, ly * s, at.z + (-lx * sn + lz * c) * s, yaw + extraYaw, s * scale);
  };
  const mr = (lx: number, ly: number, lz: number, rx: number, ry: number, rz: number, sx = 1, sy = 1, sz = 1): THREE.Matrix4 => {
    const base = m(lx, ly, lz);
    return base.multiply(new THREE.Matrix4().compose(new THREE.Vector3(), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz)));
  };
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
      for (let i = 0; i < 4; i++) {
        const col = pick(palette, p.variant + i);
        b.add(new THREE.CylinderGeometry(0.035, 0.035, 0.42, 8).rotateZ(Math.PI / 2), col, m(0, 0.035, -0.12 + i * 0.08, (i - 1.5) * 0.15));
        b.add(new THREE.ConeGeometry(0.035, 0.07, 8).rotateZ(-Math.PI / 2), col, m(0.245, 0.035, -0.12 + i * 0.08, (i - 1.5) * 0.15));
        b.add(new THREE.CylinderGeometry(0.037, 0.037, 0.2, 8).rotateZ(Math.PI / 2), '#fff6e6', m(-0.04, 0.035, -0.12 + i * 0.08, (i - 1.5) * 0.15, 1));
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
      spin({ kind: 'pinwheel', at: new THREE.Vector3(at.x, 0.72 * s, at.z), scale: s, phase: p.variant });
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
    default:
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

export function buildProps(def: LevelDefinition, theme: BiomeTheme, outside: readonly { prop: PropDef; at: THREE.Vector3; radius?: number }[] = []): PropAnimators {
  const group = new THREE.Group();
  const batch = new GeoBatch();
  const far = new GeoBatch();
  const glow = new GeoBatch();
  const windmills: THREE.Vector3[] = [];
  const spinners: Spinner[] = [];
  const palette = PALETTES[theme.id] ?? (PALETTES.rug as string[]);
  for (const p of def.props) addProp(batch, glow, p, tileCenter(def, p.tile), palette, windmills, spinners);
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
  const blobs = outside.filter((o) => o.radius).map((o) => new THREE.CircleGeometry((o.radius as number) * 1.15, 24).rotateX(-Math.PI / 2).translate(o.at.x, 0.004, o.at.z));
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
          p.y = (0.55 + Math.sin(time * 1.6 + sp.phase) * 0.08) * sp.scale;
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
