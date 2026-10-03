// Toy geometries (≤ 80 triangles each) and instanced rendering per toy type (task T047).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { TOY_TYPES, type ToyType } from '../engine/types';
import { CAP_HEIGHT, textGeometry } from '../ui/kit/text3d';
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
  if (geo.getAttribute('uv')) geo.deleteAttribute('uv');
  const c = new THREE.Color(color);
  const n = geo.getAttribute('position').count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) arr.set([c.r, c.g, c.b], i * 3);
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  if (!geo.getAttribute('normal')) geo.computeVertexNormals();
  return geo;
}

/** Colors each triangle by a function of its centroid (beach-ball wedges, ...). */
function paintFaces(g: THREE.BufferGeometry, paint: (cx: number, cy: number, cz: number) => string): THREE.BufferGeometry {
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

const T = (x: number, y: number, z: number, sx = 1, sy = 1, sz = 1) =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(sx, sy, sz));

const R = (x: number, y: number, z: number, rx: number, ry: number, rz: number, s = 1) =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(s, s, s));

/** A raised letter centered on the origin, facing +z, `size` tall. */
function letter(ch: string, size: number, depth: number): THREE.BufferGeometry {
  const g = textGeometry(ch, { size: size / CAP_HEIGHT, depth });
  g.computeBoundingBox();
  const box = g.boundingBox as THREE.Box3;
  const c = box.getCenter(new THREE.Vector3());
  g.translate(-c.x, -c.y, -box.min.z);
  return g;
}

/** Wooden ABC block: natural wood edges, colored panels and a raised letter on each face. */
function abcBlock(color: string): THREE.BufferGeometry[] {
  const s = 0.05;
  const h = s / 2;
  const parts = [colored(new THREE.BoxGeometry(s, s, s), '#ecc994')];
  const faces: [THREE.Euler, string, string][] = [
    [new THREE.Euler(0, 0, 0), 'A', color],
    [new THREE.Euler(0, Math.PI, 0), 'B', '#f6c344'],
    [new THREE.Euler(0, Math.PI / 2, 0), 'C', '#4a90d9'],
    [new THREE.Euler(0, -Math.PI / 2, 0), 'D', color],
    [new THREE.Euler(-Math.PI / 2, 0, 0), 'E', '#5bb36a'],
  ];
  for (const [rot, ch, panel] of faces) {
    const q = new THREE.Quaternion().setFromEuler(rot);
    const m = new THREE.Matrix4().compose(new THREE.Vector3(0, 0, h).applyQuaternion(q), q, new THREE.Vector3(1, 1, 1));
    parts.push(colored(new THREE.BoxGeometry(s * 0.8, s * 0.8, 0.003).translate(0, 0, 0.0015), panel, m));
    // Letters on three faces keep the triangle count down; the others show a plain panel.
    if ('ACE'.includes(ch)) parts.push(colored(letter(ch, s * 0.5, 0.004).translate(0, 0, 0.003), '#fff6e6', m));
  }
  return parts;
}

/** Inflatable beach ball: six colored wedges around white caps. */
function beachBall(color: string): THREE.BufferGeometry[] {
  const r = 0.028;
  const wedges = [color, '#ffffff', '#f6c344', '#ffffff', '#e8574a', '#ffffff'];
  const ball = paintFaces(new THREE.SphereGeometry(r, 18, 10), (x, y, z) => {
    if (Math.abs(y) > r * 0.86) return '#ffffff';
    const a = (Math.atan2(z, x) + Math.PI) / (Math.PI * 2);
    return wedges[Math.floor(a * wedges.length) % wedges.length] as string;
  });
  return [ball, colored(new THREE.CylinderGeometry(0.004, 0.004, 0.004, 8), '#e8574a', T(0, r + 0.001, 0))];
}

/** Rubber duck facing +x. */
function rubberDuck(color: string): THREE.BufferGeometry[] {
  return [
    colored(new THREE.SphereGeometry(0.026, 14, 9), color, T(-0.004, -0.006, 0, 1.25, 0.78, 1)),
    colored(new THREE.ConeGeometry(0.01, 0.022, 7), color, R(-0.034, 0.006, 0, 0, 0, 0.9)),
    colored(new THREE.SphereGeometry(0.017, 12, 8), color, T(0.016, 0.019, 0)),
    colored(new THREE.SphereGeometry(0.009, 8, 5), '#f08a2c', T(0.033, 0.016, 0, 1.3, 0.45, 1)),
    colored(new THREE.SphereGeometry(0.012, 8, 5), shadeHex(color, -22), T(-0.008, 0.0, 0.019, 1.5, 0.6, 0.45)),
    colored(new THREE.SphereGeometry(0.012, 8, 5), shadeHex(color, -22), T(-0.008, 0.0, -0.019, 1.5, 0.6, 0.45)),
    colored(new THREE.SphereGeometry(0.0032, 5, 4), '#1e1e24', T(0.026, 0.025, 0.009)),
    colored(new THREE.SphereGeometry(0.0032, 5, 4), '#1e1e24', T(0.026, 0.025, -0.009)),
  ];
}

/** Little toy car facing +x. */
function toyCar(color: string): THREE.BufferGeometry[] {
  const parts = [
    colored(new THREE.CapsuleGeometry(0.014, 0.036, 4, 10).rotateZ(Math.PI / 2), color, T(0, -0.002, 0, 1, 0.75, 1.3)),
    colored(new THREE.BoxGeometry(0.03, 0.016, 0.032), '#d7ecff', T(-0.004, 0.014, 0)),
    colored(new THREE.BoxGeometry(0.034, 0.005, 0.036), color, T(-0.004, 0.024, 0)),
    colored(new THREE.BoxGeometry(0.006, 0.012, 0.034), color, T(-0.004, 0.015, 0)),
    colored(new THREE.SphereGeometry(0.004, 6, 4), '#fff3a0', T(0.032, 0.0, 0.01)),
    colored(new THREE.SphereGeometry(0.004, 6, 4), '#fff3a0', T(0.032, 0.0, -0.01)),
    colored(new THREE.BoxGeometry(0.004, 0.006, 0.03), '#c9ccd4', T(-0.033, -0.006, 0)),
  ];
  for (const x of [-0.019, 0.019]) {
    for (const z of [-0.019, 0.019]) {
      parts.push(colored(new THREE.CylinderGeometry(0.0085, 0.0085, 0.007, 10).rotateX(Math.PI / 2), '#26262b', T(x, -0.011, z)));
      parts.push(colored(new THREE.CylinderGeometry(0.004, 0.004, 0.0075, 6).rotateX(Math.PI / 2), '#e9e9ef', T(x, -0.011, z)));
    }
  }
  return parts;
}

/** Puffy star with a happy face (front +z). */
function puffyStar(color: string): THREE.BufferGeometry[] {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 0.026 : 0.012;
    const a = Math.PI / 2 + (i * Math.PI) / 5;
    if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.008, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.0035, bevelSegments: 2 }).translate(0, 0, -0.004);
  g.computeVertexNormals();
  return [
    colored(g, color),
    colored(new THREE.SphereGeometry(0.0028, 5, 4), '#1e1e24', T(-0.006, 0.003, 0.0085)),
    colored(new THREE.SphereGeometry(0.0028, 5, 4), '#1e1e24', T(0.006, 0.003, 0.0085)),
    colored(new THREE.TorusGeometry(0.004, 0.0012, 4, 10, Math.PI), '#1e1e24', R(0, -0.002, 0.0085, 0, 0, Math.PI)),
    colored(new THREE.SphereGeometry(0.003, 5, 4), '#ff9fc4', T(-0.011, -0.002, 0.008, 1, 0.6, 0.4)),
    colored(new THREE.SphereGeometry(0.003, 5, 4), '#ff9fc4', T(0.011, -0.002, 0.008, 1, 0.6, 0.4)),
  ];
}

function shadeHex(hex: string, amount: number): string {
  const c = new THREE.Color(hex);
  c.offsetHSL(0, 0, amount / 255);
  return `#${c.getHexString()}`;
}

export function toyGeometry(type: ToyType): THREE.BufferGeometry {
  const color = TOY_COLORS[type];
  let parts: THREE.BufferGeometry[];
  switch (type) {
    case 'block':
      parts = abcBlock(color);
      break;
    case 'duck':
      parts = rubberDuck(color);
      break;
    case 'car':
      parts = toyCar(color);
      break;
    case 'ball':
      parts = beachBall(color);
      break;
    default:
      parts = puffyStar(color);
  }
  for (const p of parts) for (const name of Object.keys(p.attributes)) if (!['position', 'normal', 'color'].includes(name)) p.deleteAttribute(name);
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
