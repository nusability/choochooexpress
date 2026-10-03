// Swept track geometry: a plastic bed with two rails along every lane (lifted on bridges), instanced
// sleepers, bridge ramps and piers, tunnel hills with portals, and switch indicators (spec FR-006,
// F-011, research R10, R25).
import * as THREE from 'three';
import { DECK_HEIGHT } from '../engine/flow';
import { lanePoint } from '../engine/grid';
import type { Lane, LevelDefinition } from '../engine/types';

export const BED_WIDTH = 0.4;
export const BED_HEIGHT = 0.035;
export const RAIL_GAUGE = 0.22;
export const RAIL_WIDTH = 0.03;
export const RAIL_HEIGHT = 0.03;

/** Engine (x, y) → world (X, Z). */
export function toWorld(def: { cols: number; rows: number }, x: number, y: number, out = new THREE.Vector3()): THREE.Vector3 {
  return out.set(x - def.cols / 2, 0, y - def.rows / 2);
}

export interface Sample {
  x: number;
  z: number;
  h: number;
  /** Ground height of the track bed's underside. */
  y?: number;
}

/** World height of a lane at fraction t (0 … 1) of its length. */
export function laneHeight(lane: Lane, t: number): number {
  return (lane.z0 + (lane.z1 - lane.z0) * t) * DECK_HEIGHT;
}

export function laneSamples(def: LevelDefinition, lane: Lane, segments = lane.kind === 'curve' ? 8 : 1): Sample[] {
  const c = lane.tile % def.cols;
  const r = Math.floor(lane.tile / def.cols);
  const out: Sample[] = [];
  for (let i = 0; i <= segments; i++) {
    const p = lanePoint(c, r, lane.from, lane.to, (lane.length * i) / segments);
    out.push({ x: p.x - def.cols / 2, z: p.y - def.rows / 2, h: p.heading, y: laneHeight(lane, i / segments) });
  }
  return out;
}

interface Builder {
  positions: number[];
  normals: number[];
}

function pushQuad(b: Builder, a: THREE.Vector3, bb: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3, n: THREE.Vector3): void {
  // Counter-clockwise seen from outside, so the explicit normals face the viewer.
  for (const v of [a, c, bb, a, d, c]) {
    b.positions.push(v.x, v.y, v.z);
    b.normals.push(n.x, n.y, n.z);
  }
}

/** Sweep a rectangle (lateral offset, width, bottom, height) along sampled points. */
function sweep(b: Builder, samples: Sample[], offset: number, width: number, base: number, height: number): void {
  const corners = samples.map((s) => {
    const lx = -Math.sin(s.h);
    const lz = Math.cos(s.h);
    const l0 = offset - width / 2;
    const l1 = offset + width / 2;
    const y0 = base + (s.y ?? 0);
    return {
      a: new THREE.Vector3(s.x + lx * l0, y0, s.z + lz * l0),
      b: new THREE.Vector3(s.x + lx * l0, y0 + height, s.z + lz * l0),
      c: new THREE.Vector3(s.x + lx * l1, y0 + height, s.z + lz * l1),
      d: new THREE.Vector3(s.x + lx * l1, y0, s.z + lz * l1),
      lat: new THREE.Vector3(lx, 0, lz),
    };
  });
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < corners.length - 1; i++) {
    const p = corners[i] as (typeof corners)[number];
    const q = corners[i + 1] as (typeof corners)[number];
    pushQuad(b, p.b, q.b, q.c, p.c, up);
    pushQuad(b, p.a, q.a, q.b, p.b, p.lat.clone().negate());
    pushQuad(b, p.d, p.c, q.c, q.d, p.lat);
  }
}

function toGeometry(b: Builder): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(b.positions, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(b.normals, 3));
  g.computeBoundingSphere();
  return g;
}

export interface TrackMeshes {
  group: THREE.Group;
  dispose(): void;
}

export function buildTrack(def: LevelDefinition, colors: { bed: string; sleeper: string; rail: string; railEmissive: string | null }): TrackMeshes {
  const bed: Builder = { positions: [], normals: [] };
  const rails: Builder = { positions: [], normals: [] };
  const sleepers: THREE.Matrix4[] = [];
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  for (const lane of def.lanes) {
    const samples = laneSamples(def, lane);
    sweep(bed, samples, 0, BED_WIDTH, 0.002, BED_HEIGHT);
    sweep(rails, samples, -RAIL_GAUGE / 2, RAIL_WIDTH, BED_HEIGHT, RAIL_HEIGHT);
    sweep(rails, samples, RAIL_GAUGE / 2, RAIL_WIDTH, BED_HEIGHT, RAIL_HEIGHT);
    const count = lane.kind === 'curve' ? 3 : 4;
    const c = lane.tile % def.cols;
    const r = Math.floor(lane.tile / def.cols);
    for (let i = 0; i < count; i++) {
      const t = (i + 0.5) / count;
      const p = lanePoint(c, r, lane.from, lane.to, lane.length * t);
      q.setFromAxisAngle(up, -p.heading);
      m.compose(new THREE.Vector3(p.x - def.cols / 2, BED_HEIGHT + 0.001 + laneHeight(lane, t), p.y - def.rows / 2), q, new THREE.Vector3(1, 1, 1));
      sleepers.push(m.clone());
    }
  }
  const group = new THREE.Group();
  const bedMat = new THREE.MeshStandardMaterial({ color: colors.bed, roughness: 0.55, metalness: 0.0 });
  const railMat = new THREE.MeshStandardMaterial({
    color: colors.rail,
    roughness: 0.4,
    metalness: 0.05,
    emissive: colors.railEmissive ? new THREE.Color(colors.railEmissive) : new THREE.Color(0x000000),
    emissiveIntensity: colors.railEmissive ? 1.4 : 0,
  });
  const bedMesh = new THREE.Mesh(toGeometry(bed), bedMat);
  bedMesh.receiveShadow = true;
  const railMesh = new THREE.Mesh(toGeometry(rails), railMat);
  railMesh.castShadow = true;
  railMesh.receiveShadow = true;
  const sleeperGeo = new THREE.BoxGeometry(0.07, 0.012, BED_WIDTH * 0.92);
  const sleeperMat = new THREE.MeshStandardMaterial({ color: colors.sleeper, roughness: 0.7 });
  const sleeperMesh = new THREE.InstancedMesh(sleeperGeo, sleeperMat, sleepers.length);
  sleepers.forEach((mat, i) => sleeperMesh.setMatrixAt(i, mat));
  sleeperMesh.receiveShadow = true;
  group.add(bedMesh, sleeperMesh, railMesh);
  return {
    group,
    dispose() {
      bedMesh.geometry.dispose();
      railMesh.geometry.dispose();
      sleeperGeo.dispose();
      bedMat.dispose();
      railMat.dispose();
      sleeperMat.dispose();
      sleeperMesh.dispose();
    },
  };
}

/** Track (bed + rails) along arbitrary samples, e.g. the meta map path. */
export function sweptTrack(samples: Sample[], y: number, colors: { bed: string; rail: string }): { group: THREE.Group; dispose(): void } {
  const bed: Builder = { positions: [], normals: [] };
  const rails: Builder = { positions: [], normals: [] };
  sweep(bed, samples, 0, BED_WIDTH, y, BED_HEIGHT);
  sweep(rails, samples, -RAIL_GAUGE / 2, RAIL_WIDTH, y + BED_HEIGHT, RAIL_HEIGHT);
  sweep(rails, samples, RAIL_GAUGE / 2, RAIL_WIDTH, y + BED_HEIGHT, RAIL_HEIGHT);
  const bedMat = new THREE.MeshStandardMaterial({ color: colors.bed, roughness: 0.55 });
  const railMat = new THREE.MeshStandardMaterial({ color: colors.rail, roughness: 0.4, metalness: 0.05 });
  const bedMesh = new THREE.Mesh(toGeometry(bed), bedMat);
  const railMesh = new THREE.Mesh(toGeometry(rails), railMat);
  bedMesh.receiveShadow = true;
  railMesh.castShadow = true;
  const group = new THREE.Group();
  group.add(bedMesh, railMesh);
  return {
    group,
    dispose() {
      bedMesh.geometry.dispose();
      railMesh.geometry.dispose();
      bedMat.dispose();
      railMat.dispose();
    },
  };
}

/** Flat chevron arrow pointing along +X, for switch indicators. */
export function chevronGeometry(size = 0.3, depth = 0.012): THREE.BufferGeometry {
  const s = new THREE.Shape();
  s.moveTo(size * 0.6, 0);
  s.lineTo(-size * 0.4, size * 0.5);
  s.lineTo(-size * 0.15, 0);
  s.lineTo(-size * 0.4, -size * 0.5);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false });
  g.rotateX(-Math.PI / 2);
  return g;
}
