// Decorative biome props (spec FR-049): merged into one static mesh, plus a few animated parts.
import * as THREE from 'three';
import type { LevelDefinition, PropDef } from '../engine/types';
import { GeoBatch, compose, vertexColorMaterial } from './batch';
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

export function addProp(b: GeoBatch, glow: GeoBatch, p: PropDef, at: THREE.Vector3, palette: string[], windmills: THREE.Vector3[]): void {
  const s = p.scale;
  const yaw = p.rotation;
  const c1 = pick(palette, p.variant);
  const c2 = pick(palette, p.variant + 2);
  const m = (lx: number, ly: number, lz: number, extraYaw = 0, scale = 1): THREE.Matrix4 => {
    const c = Math.cos(yaw);
    const sn = Math.sin(yaw);
    return compose(at.x + (lx * c + lz * sn) * s, ly * s, at.z + (-lx * sn + lz * c) * s, yaw + extraYaw, s * scale);
  };
  switch (p.kind) {
    case 'pillow':
      b.add(new THREE.SphereGeometry(0.34, 14, 8).scale(1.15, 0.38, 0.9), c1, m(0, 0.12, 0));
      b.add(new THREE.SphereGeometry(0.12, 8, 6).scale(1, 0.5, 1), c2, m(0, 0.24, 0));
      break;
    case 'block':
      b.add(new THREE.BoxGeometry(0.3, 0.3, 0.3), c1, m(-0.1, 0.15, 0));
      b.add(new THREE.BoxGeometry(0.24, 0.24, 0.24), c2, m(0.18, 0.12, 0.12, 0.4));
      b.add(new THREE.BoxGeometry(0.22, 0.22, 0.22), pick(palette, p.variant + 1), m(0.02, 0.41, 0.02, 0.2));
      break;
    case 'book':
      for (let i = 0; i < 3; i++) b.add(new THREE.BoxGeometry(0.5, 0.07, 0.36), pick(palette, p.variant + i), m(0, 0.035 + i * 0.072, 0, i * 0.15));
      break;
    case 'ball':
      b.add(new THREE.SphereGeometry(0.2, 14, 10), c1, m(0, 0.2, 0));
      b.add(new THREE.TorusGeometry(0.2, 0.025, 6, 20), '#fff6e6', m(0, 0.2, 0, Math.PI / 2));
      break;
    case 'lollipop':
      b.add(new THREE.CylinderGeometry(0.025, 0.025, 0.55, 6), '#fff6e6', m(0, 0.27, 0));
      b.add(new THREE.CylinderGeometry(0.2, 0.2, 0.07, 18).rotateX(Math.PI / 2), c1, m(0, 0.6, 0));
      b.add(new THREE.TorusGeometry(0.13, 0.03, 6, 18), c2, m(0, 0.6, 0.04));
      break;
    case 'gumdrop':
      b.add(new THREE.SphereGeometry(0.2, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), c1, m(0, 0, 0));
      b.add(new THREE.SphereGeometry(0.13, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), c2, m(0.22, 0, 0.1));
      break;
    case 'marshmallow':
      b.add(new THREE.CylinderGeometry(0.14, 0.14, 0.24, 14), '#fff8fb', m(-0.1, 0.12, 0));
      b.add(new THREE.CylinderGeometry(0.12, 0.12, 0.2, 14), '#ffd1e3', m(0.17, 0.1, 0.1));
      break;
    case 'cupcake':
      b.add(new THREE.CylinderGeometry(0.17, 0.13, 0.18, 12), '#c98a52', m(0, 0.09, 0));
      b.add(new THREE.SphereGeometry(0.19, 12, 8), c1, m(0, 0.23, 0));
      b.add(new THREE.SphereGeometry(0.05, 8, 6), '#e8574a', m(0, 0.42, 0));
      break;
    case 'dune':
      b.add(new THREE.SphereGeometry(0.42, 14, 8).scale(1.1, 0.35, 0.8), '#e3c27f', m(0, 0, 0));
      b.add(new THREE.SphereGeometry(0.25, 10, 6).scale(1, 0.4, 1), '#ecd39e', m(0.3, 0, 0.15));
      break;
    case 'bucket':
      b.add(new THREE.CylinderGeometry(0.17, 0.13, 0.3, 14, 1, true), c1, m(0, 0.15, 0));
      b.add(new THREE.CylinderGeometry(0.13, 0.13, 0.02, 14), c1, m(0, 0.01, 0));
      b.add(new THREE.TorusGeometry(0.16, 0.012, 4, 16, Math.PI), '#3b2a20', m(0, 0.3, 0));
      break;
    case 'spade':
      b.add(new THREE.BoxGeometry(0.06, 0.04, 0.45), c2, m(0, 0.03, -0.1));
      b.add(new THREE.BoxGeometry(0.2, 0.03, 0.2), c2, m(0, 0.025, 0.2));
      break;
    case 'windmill':
      b.add(new THREE.CylinderGeometry(0.07, 0.15, 0.7, 8), '#fff6e6', m(0, 0.35, 0));
      b.add(new THREE.ConeGeometry(0.12, 0.16, 8), c1, m(0, 0.78, 0));
      windmills.push(new THREE.Vector3(at.x, 0.68 * s, at.z));
      break;
    case 'planet':
      b.add(new THREE.SphereGeometry(0.24, 16, 10), c1, m(0, 0.32, 0));
      b.add(new THREE.TorusGeometry(0.36, 0.025, 6, 32).rotateX(Math.PI / 2.4), c2, m(0, 0.32, 0));
      b.add(new THREE.CylinderGeometry(0.03, 0.06, 0.1, 6), '#9aa3c7', m(0, 0.05, 0));
      break;
    case 'rocket':
      b.add(new THREE.CylinderGeometry(0.1, 0.12, 0.45, 12), '#f3f3f7', m(0, 0.3, 0));
      b.add(new THREE.ConeGeometry(0.1, 0.2, 12), c1, m(0, 0.62, 0));
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        b.add(new THREE.BoxGeometry(0.02, 0.16, 0.12), c1, m(Math.cos(a) * 0.11, 0.1, Math.sin(a) * 0.11, -a));
      }
      glow.add(new THREE.SphereGeometry(0.05, 8, 6), '#9fe9ff', m(0, 0.36, 0.1));
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

export function buildProps(def: LevelDefinition, theme: BiomeTheme): PropAnimators {
  const group = new THREE.Group();
  const batch = new GeoBatch();
  const glow = new GeoBatch();
  const windmills: THREE.Vector3[] = [];
  const palette = PALETTES[theme.id] ?? (PALETTES.rug as string[]);
  for (const p of def.props) {
    const at = tileCenter(def, p.tile);
    addProp(batch, glow, p, at, palette, windmills);
  }
  const material = vertexColorMaterial(0.7);
  const mesh = batch.build(material);
  if (mesh) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  const glowMat = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
  const glowMesh = glow.build(glowMat);
  if (glowMesh) group.add(glowMesh);

  // Windmill blades turn (garden "gusts" are decorative only).
  const bladeGeo = new THREE.BoxGeometry(0.03, 0.42, 0.08);
  bladeGeo.translate(0, 0.21, 0);
  const bladeMat = new THREE.MeshStandardMaterial({ color: '#e8574a', roughness: 0.6 });
  const rotors: THREE.Group[] = [];
  for (const w of windmills) {
    const rotor = new THREE.Group();
    rotor.position.set(w.x, w.y, w.z + 0.12);
    for (let i = 0; i < 4; i++) {
      const blade = new THREE.Mesh(bladeGeo, bladeMat);
      blade.rotation.z = (i * Math.PI) / 2;
      rotor.add(blade);
    }
    rotors.push(rotor);
    group.add(rotor);
  }
  return {
    group,
    update(dt, time) {
      rotors.forEach((r, i) => {
        const gust = 1 + 1.5 * Math.max(0, Math.sin(time * 0.6 + i * 1.7));
        r.rotation.z += dt * 2.2 * gust;
      });
    },
    dispose() {
      mesh?.geometry.dispose();
      glowMesh?.geometry.dispose();
      material.dispose();
      glowMat.dispose();
      bladeGeo.dispose();
      bladeMat.dispose();
    },
  };
}
