// Toy geometries (≤ 80 triangles each) and instanced rendering per toy type (task T047).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { TOY_TYPES, type ToyType } from '../engine/types';
import { TOY_COLORS } from './palette';

/** Uniform toy scale (geometry and colliders). */
export const TOY_SCALE = 1.15;

/** Half-extents / radii shared with the physics colliders. */
export const TOY_SHAPES: Record<ToyType, { kind: 'box' | 'ball'; hx: number; hy: number; hz: number }> = {
  block: { kind: 'box', hx: 0.025 * TOY_SCALE, hy: 0.025 * TOY_SCALE, hz: 0.025 * TOY_SCALE },
  duck: { kind: 'ball', hx: 0.027 * TOY_SCALE, hy: 0.027 * TOY_SCALE, hz: 0.027 * TOY_SCALE },
  car: { kind: 'box', hx: 0.031 * TOY_SCALE, hy: 0.017 * TOY_SCALE, hz: 0.019 * TOY_SCALE },
  ball: { kind: 'ball', hx: 0.027 * TOY_SCALE, hy: 0.027 * TOY_SCALE, hz: 0.027 * TOY_SCALE },
  star: { kind: 'box', hx: 0.029 * TOY_SCALE, hy: 0.009 * TOY_SCALE, hz: 0.029 * TOY_SCALE },
};

function colored(g: THREE.BufferGeometry, color: string, m?: THREE.Matrix4): THREE.BufferGeometry {
  const geo = g.index ? g.toNonIndexed() : g;
  if (m) geo.applyMatrix4(m);
  geo.deleteAttribute('uv');
  const c = new THREE.Color(color);
  const n = geo.getAttribute('position').count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) arr.set([c.r, c.g, c.b], i * 3);
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  geo.computeVertexNormals();
  return geo;
}

const T = (x: number, y: number, z: number, sx = 1, sy = 1, sz = 1) =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(sx, sy, sz));

export function toyGeometry(type: ToyType): THREE.BufferGeometry {
  const color = TOY_COLORS[type];
  let parts: THREE.BufferGeometry[];
  switch (type) {
    case 'block':
      parts = [colored(new THREE.BoxGeometry(0.05, 0.05, 0.05), color)];
      break;
    case 'duck':
      parts = [
        colored(new THREE.IcosahedronGeometry(0.026, 0), color, T(-0.004, -0.004, 0, 1.2, 0.85, 1)),
        colored(new THREE.IcosahedronGeometry(0.016, 0), color, T(0.016, 0.018, 0)),
        colored(new THREE.ConeGeometry(0.007, 0.016, 3).rotateZ(-Math.PI / 2), '#f08a2c', T(0.034, 0.016, 0)),
      ];
      break;
    case 'car':
      parts = [
        colored(new THREE.BoxGeometry(0.062, 0.02, 0.036), color, T(0, -0.002, 0)),
        colored(new THREE.BoxGeometry(0.032, 0.016, 0.032), '#d7ecff', T(-0.004, 0.016, 0)),
        ...[-0.019, 0.019].flatMap((x) => [-0.018, 0.018].map((z) => colored(new THREE.BoxGeometry(0.014, 0.014, 0.006), '#2c2c2c', T(x, -0.011, z)))),
      ];
      break;
    case 'ball':
      parts = [colored(new THREE.IcosahedronGeometry(0.027, 1), color)];
      break;
    default: {
      const s = new THREE.Shape();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? 0.03 : 0.013;
        const a = Math.PI / 2 + (i * Math.PI) / 5;
        if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      const g = new THREE.ExtrudeGeometry(s, { depth: 0.016, bevelEnabled: false }).translate(0, 0, -0.008).rotateX(-Math.PI / 2);
      parts = [colored(g, color)];
    }
  }
  const merged = mergeGeometries(parts, false);
  if (!merged) throw new Error(`toy geometry ${type}`);
  merged.scale(TOY_SCALE, TOY_SCALE, TOY_SCALE);
  merged.computeBoundingSphere();
  return merged;
}

/** One InstancedMesh per toy type; slots are recycled. */
export class ToyInstances {
  readonly group = new THREE.Group();
  readonly meshes = {} as Record<ToyType, THREE.InstancedMesh>;
  private readonly free = {} as Record<ToyType, number[]>;
  private readonly used = {} as Record<ToyType, number>;
  private readonly material = new THREE.MeshLambertMaterial({ vertexColors: true });
  private readonly hidden = new THREE.Matrix4().makeScale(0, 0, 0);

  constructor(readonly capacity: number) {
    const tint = new THREE.Color();
    for (const type of TOY_TYPES) {
      const mesh = new THREE.InstancedMesh(toyGeometry(type), this.material, capacity);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.count = 0;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      for (let i = 0; i < capacity; i++) {
        const v = 0.85 + ((i * 7919) % 31) / 100;
        mesh.setColorAt(i, tint.setRGB(v, v, v));
      }
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      this.meshes[type] = mesh;
      this.free[type] = [];
      this.used[type] = 0;
      this.group.add(mesh);
    }
  }

  /** Reserve a slot, or -1 when the type is full. */
  alloc(type: ToyType): number {
    const slot = this.free[type].pop();
    if (slot !== undefined) return slot;
    if (this.used[type] >= this.capacity) return -1;
    const mesh = this.meshes[type];
    const i = this.used[type]++;
    mesh.count = this.used[type];
    return i;
  }

  release(type: ToyType, slot: number): void {
    this.meshes[type].setMatrixAt(slot, this.hidden);
    this.free[type].push(slot);
    this.meshes[type].instanceMatrix.needsUpdate = true;
  }

  set(type: ToyType, slot: number, m: THREE.Matrix4): void {
    this.meshes[type].setMatrixAt(slot, m);
  }

  commit(): void {
    for (const type of TOY_TYPES) this.meshes[type].instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    for (const type of TOY_TYPES) {
      this.meshes[type].geometry.dispose();
      this.meshes[type].dispose();
    }
    this.material.dispose();
  }
}
