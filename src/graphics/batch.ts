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

  /** Adds geometry in one color (white keeps the geometry's own vertex colors). */
  add(geometry: THREE.BufferGeometry, color: THREE.ColorRepresentation, matrix?: THREE.Matrix4): void {
    const g = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    if (matrix) g.applyMatrix4(matrix);
    if (!g.getAttribute('normal')) g.computeVertexNormals();
    if (color === '#ffffff' && g.getAttribute('color')) {
      for (const name of Object.keys(g.attributes)) if (!KEEP.has(name)) g.deleteAttribute(name);
      this.parts.push(g);
      return;
    }
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

  /** Adds geometry that already carries vertex colors (e.g. toy models). */
  addColored(geometry: THREE.BufferGeometry, matrix?: THREE.Matrix4): void {
    const g = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    if (matrix) g.applyMatrix4(matrix);
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

  /** `uvDensity` > 0 adds box-projected UVs (texture repeats per world unit) for a detail map. */
  build(material: THREE.Material, uvDensity = 0): THREE.Mesh | null {
    const merged = this.buildGeometry(uvDensity);
    return merged ? new THREE.Mesh(merged, material) : null;
  }

  /** The merged geometry alone (e.g. for an InstancedMesh); the batch is emptied. */
  buildGeometry(uvDensity = 0): THREE.BufferGeometry | null {
    if (this.parts.length === 0) return null;
    const merged = mergeGeometries(this.parts, false);
    for (const p of this.parts) p.dispose();
    this.parts = [];
    if (merged && uvDensity > 0) projectUVs(merged, uvDensity);
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

/**
 * Box-projected UVs: each vertex takes the two coordinates across its normal's main axis, so one
 * tiling detail texture covers boxes, cylinders and spheres at the same texel density.
 */
export function projectUVs(geo: THREE.BufferGeometry, density: number): void {
  const pos = geo.getAttribute('position');
  const nrm = geo.getAttribute('normal');
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const ax = Math.abs(nrm.getX(i));
    const ay = Math.abs(nrm.getY(i));
    const az = Math.abs(nrm.getZ(i));
    let u: number;
    let v: number;
    if (ay >= ax && ay >= az) {
      u = x;
      v = z;
    } else if (ax >= az) {
      u = z;
      v = y;
    } else {
      u = x;
      v = y;
    }
    uv[i * 2] = u * density;
    uv[i * 2 + 1] = v * density;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

/** Vertex-colored material with a tiling grayscale detail map (needs projected UVs). */
export function detailMaterial(map: THREE.Texture, roughness = 0.62, metalness = 0.02): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ vertexColors: true, map, roughness, metalness });
}
