// Merges many small colored primitives into one vertex-colored mesh (one draw call).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const KEEP = new Set(['position', 'normal', 'color']);

export class GeoBatch {
  private parts: THREE.BufferGeometry[] = [];
  private readonly color = new THREE.Color();

  get size(): number {
    return this.parts.length;
  }

  add(geometry: THREE.BufferGeometry, color: THREE.ColorRepresentation, matrix?: THREE.Matrix4): void {
    const g = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    if (matrix) g.applyMatrix4(matrix);
    if (!g.getAttribute('normal')) g.computeVertexNormals();
    this.color.set(color);
    const count = g.getAttribute('position').count;
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      colors[i * 3] = this.color.r;
      colors[i * 3 + 1] = this.color.g;
      colors[i * 3 + 2] = this.color.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    for (const name of Object.keys(g.attributes)) if (!KEEP.has(name)) g.deleteAttribute(name);
    this.parts.push(g);
  }

  /** Box centered at (x, y, z), rotated by `yaw` around Y. */
  box(w: number, h: number, d: number, color: THREE.ColorRepresentation, x: number, y: number, z: number, yaw = 0): void {
    this.add(new THREE.BoxGeometry(w, h, d), color, compose(x, y, z, yaw));
  }

  cylinder(rTop: number, rBottom: number, h: number, color: THREE.ColorRepresentation, x: number, y: number, z: number, segments = 12, rotX = 0, yaw = 0, rotZ = 0): void {
    const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rotX, yaw, rotZ, 'YXZ')).setPosition(x, y, z);
    this.add(new THREE.CylinderGeometry(rTop, rBottom, h, segments), color, m);
  }

  sphere(r: number, color: THREE.ColorRepresentation, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1, segments = 10): void {
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(sx, sy, sz));
    this.add(new THREE.SphereGeometry(r, segments, Math.max(6, Math.round(segments * 0.7))), color, m);
  }

  build(material: THREE.Material): THREE.Mesh | null {
    const merged = this.buildGeometry();
    return merged ? new THREE.Mesh(merged, material) : null;
  }

  /** The merged geometry alone (e.g. for an InstancedMesh); the batch is emptied. */
  buildGeometry(): THREE.BufferGeometry | null {
    if (this.parts.length === 0) return null;
    const merged = mergeGeometries(this.parts, false);
    for (const p of this.parts) p.dispose();
    this.parts = [];
    merged?.computeBoundingSphere();
    return merged;
  }
}

export function compose(x: number, y: number, z: number, yaw = 0, scale = 1): THREE.Matrix4 {
  return new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw),
    new THREE.Vector3(scale, scale, scale),
  );
}

export function vertexColorMaterial(roughness = 0.62, metalness = 0.02): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ vertexColors: true, roughness, metalness });
}
