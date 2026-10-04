// Buildings of the shunting yard (spec F-014, FR-111): Toy Station, factories by kind, the engine
// shed and buffer stops. Built from primitives into a few batches, one per surface (painted wood,
// bricks, roof shingles, planks), each with a generated detail texture: four draw calls in all.
import * as THREE from 'three';
import { activeHoliday } from './holiday';
import { DX, DY, opposite } from '../engine/grid';
import type { Dir, ToyType } from '../engine/types';
import type { YardFactory, YardLevel } from '../engine/yard';
import { GeoBatch, detailMaterial } from './batch';
import { tileCenter, type SignSpec } from './buildings';
import { TOY_COLORS } from './palette';
import { detailTexture, shade, type DetailKind } from './textures';

export interface ToyMarker {
  type: ToyType;
  position: THREE.Vector3;
  size?: number;
  /** The sign this toy stands beside; it turns with the sign. */
  anchor?: THREE.Vector3;
}

/** A gear lying flat on a roof, turned by the view (FR-067). */
export interface GearSpot {
  position: THREE.Vector3;
  radius: number;
  speed: number;
}

export interface YardBuildings {
  meshes: THREE.Mesh[];
  signs: SignSpec[];
  markers: ToyMarker[];
  chimneys: THREE.Vector3[];
  gears: GearSpot[];
  /** Where each goal slot's chute stands (slot 0 at the station buffer). */
  chutes: THREE.Vector3[];
  dispose(): void;
}

type Surface = DetailKind;
const SURFACES: readonly Surface[] = ['paint', 'bricks', 'shingles', 'planks'];
const DENSITY: Record<string, number> = { paint: 3, bricks: 3.2, shingles: 3.4, planks: 2.6 };

/** Wall, trim and roof colors per factory kind; the sign says what it does. */
const FACTORY_LOOK: Record<string, { wall: string; trim: string; roof: string; sign: string }> = {
  loader: { wall: '#f1d9b0', trim: '#c4473a', roof: '#d0574a', sign: 'FILL' },
  single: { wall: '#f6e08a', trim: '#e0803a', roof: '#e8963f', sign: 'ONE' },
  converter: { wall: '#cfe6f5', trim: '#2f6fb3', roof: '#3d7fc2', sign: '>' },
  swap: { wall: '#e4d6f5', trim: '#7b4fc2', roof: '#8d63cf', sign: '<>' },
  washer: { wall: '#d6f3f1', trim: '#2b9c95', roof: '#49b8b0', sign: 'WASH' },
};

interface StationTint {
  wall: string;
  roof: string;
  awning: string;
}

/** The Toy Station dresses for its biome. */
const STATION_TINTS: Record<string, StationTint> = {
  rug: { wall: '#f0c9a0', roof: '#d0574a', awning: '#e8574a' },
  candy: { wall: '#fff0f6', roof: '#ff7eb3', awning: '#f25c9a' },
  garden: { wall: '#f3e3c3', roof: '#5bb36a', awning: '#3f9a52' },
  space: { wall: '#dfe3fa', roof: '#5468d8', awning: '#3f51c8' },
  ice: { wall: '#eef6ff', roof: '#4a7fc0', awning: '#3f6fb3' },
  village: { wall: '#f4ead6', roof: '#9a3b2b', awning: '#7a3b2b' },
  shop: { wall: '#ffe9d6', roof: '#ef6fa5', awning: '#d94f8a' },
  roads: { wall: '#f2e2c4', roof: '#4a90d9', awning: '#e8574a' },
};

/** Places local geometry: x along the building's front, z toward the track, y up. */
class Local {
  private readonly base: THREE.Matrix4;
  constructor(origin: THREE.Vector3, yaw: number) {
    this.base = new THREE.Matrix4().compose(origin, new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw), new THREE.Vector3(1, 1, 1));
  }

  m(x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1): THREE.Matrix4 {
    const local = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
    return this.base.clone().multiply(local);
  }

  point(x: number, y: number, z: number): THREE.Vector3 {
    return new THREE.Vector3(x, y, z).applyMatrix4(this.base);
  }
}

/** Triangular prism (gable roof) along local x: width along z, `h` high, origin at the eaves. */
function gable(len: number, width: number, h: number): THREE.BufferGeometry {
  const s = new THREE.Shape();
  s.moveTo(-width / 2, 0);
  s.lineTo(width / 2, 0);
  s.lineTo(0, h);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: false });
  g.translate(0, 0, -len / 2);
  g.rotateY(Math.PI / 2);
  return g;
}

/** Two sloped roof slabs over a gable (slightly overhanging). */
function roofSlabs(b: GeoBatch, at: Local, x: number, y: number, z: number, len: number, width: number, h: number, color: string): void {
  const slope = Math.atan2(h, width / 2);
  const run = Math.hypot(width / 2, h) + 0.05;
  for (const side of [-1, 1]) {
    const g = new THREE.BoxGeometry(len + 0.08, 0.03, run);
    b.add(g, color, at.m(x, y + h / 2 + 0.01, z + (side * width) / 4, side * slope, 0, 0));
  }
  b.add(new THREE.BoxGeometry(len + 0.1, 0.035, 0.05), shade(color, -30), at.m(x, y + h + 0.015, z));
}

function windowAt(paint: GeoBatch, at: Local, x: number, y: number, z: number, w: number, h: number, frame: string, ry = 0): void {
  paint.add(new THREE.BoxGeometry(w + 0.03, h + 0.03, 0.012), frame, at.m(x, y, z, 0, ry, 0));
  paint.add(new THREE.BoxGeometry(w, h, 0.016), '#bfe6ff', at.m(x, y, z, 0, ry, 0));
  paint.add(new THREE.BoxGeometry(w, 0.012, 0.02), frame, at.m(x, y, z, 0, ry, 0));
  paint.add(new THREE.BoxGeometry(0.012, h, 0.02), frame, at.m(x, y, z, 0, ry, 0));
}

function gearGeometry(teeth = 10): THREE.BufferGeometry {
  const s = new THREE.Shape();
  const n = teeth * 4;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = i % 4 < 2 ? 1 : 0.8;
    if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const hole = new THREE.Path();
  hole.absarc(0, 0, 0.28, 0, Math.PI * 2, true);
  s.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.18, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 1 });
  g.rotateX(-Math.PI / 2);
  return g;
}

/** Shared gear model for the view's instanced gears. */
export const GEAR_GEOMETRY = gearGeometry;

export function buildYardBuildings(level: YardLevel): YardBuildings {
  const tint = STATION_TINTS[level.biome] ?? (STATION_TINTS.rug as StationTint);
  const batches = new Map<Surface, GeoBatch>(SURFACES.map((k) => [k, new GeoBatch()]));
  const B = (k: Surface) => batches.get(k) as GeoBatch;
  const out: YardBuildings = { meshes: [], signs: [], markers: [], chimneys: [], gears: [], chutes: [], dispose: () => {} };
  const center = (t: number) => tileCenter(level, t);

  // Buffer stops: a red-painted frame with two black buffers facing the track.
  for (const p of level.pieces) {
    if (p.kind !== 'buffer') continue;
    const c = center(p.tile);
    const back = opposite(p.a as Dir);
    const at = new Local(c.clone().add(new THREE.Vector3((DX[back] as number) * 0.3, 0, (DY[back] as number) * 0.3)), Math.atan2(DX[back] as number, DY[back] as number));
    const paint = B('paint');
    paint.add(new THREE.BoxGeometry(0.42, 0.08, 0.12), '#c4473a', at.m(0, 0.17, 0));
    for (const x of [-0.17, 0.17]) {
      paint.add(new THREE.BoxGeometry(0.05, 0.22, 0.05), '#8b5a2b', at.m(x, 0.11, 0.02));
      paint.add(new THREE.BoxGeometry(0.05, 0.05, 0.22), '#8b5a2b', at.m(x, 0.1, 0.1, 0.6));
      paint.add(new THREE.CylinderGeometry(0.035, 0.035, 0.05, 12), '#2a2a2e', at.m(x * 0.6, 0.17, -0.07, Math.PI / 2));
      paint.add(new THREE.CylinderGeometry(0.045, 0.045, 0.012, 12), '#c9ccd4', at.m(x * 0.6, 0.17, -0.1, Math.PI / 2));
    }
    paint.add(new THREE.BoxGeometry(0.4, 0.02, 0.02), '#fff6e6', at.m(0, 0.17, -0.062));
  }

  depot(level, B, out);
  station(level, B, out, tint);
  for (const f of level.factories) factory(level, f, B, out);

  const textures = SURFACES.map((k) => detailTexture(k));
  const materials: THREE.Material[] = [];
  for (const [k, batch] of batches) {
    const mat = detailMaterial(detailTexture(k), k === 'shingles' ? 0.75 : 0.62);
    materials.push(mat);
    const mesh = batch.build(mat, DENSITY[k] ?? 3);
    if (!mesh) continue;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    out.meshes.push(mesh);
  }
  out.dispose = () => {
    for (const m of out.meshes) m.geometry.dispose();
    for (const m of materials) m.dispose();
    void textures;
  };
  return out;
}

function depot(level: YardLevel, B: (k: Surface) => GeoBatch, out: YardBuildings): void {
  const [a, b] = level.depot.tiles.map((t) => tileCenter(level, t)) as [THREE.Vector3, THREE.Vector3];
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const along = b.clone().sub(a).normalize();
  const side = new THREE.Vector3(-along.z, 0, along.x);
  // Face the shed toward the camera side when we can.
  if (side.z < 0) side.negate();
  const at = new Local(mid.clone().addScaledVector(side, 0.52), Math.atan2(-side.x, -side.z));
  const planks = B('planks');
  const paint = B('paint');
  // Wooden platform with an engine shed: plank walls, an arched door, a shingle roof.
  planks.add(new THREE.BoxGeometry(1.9, 0.07, 0.22), '#b07a46', at.m(0, 0.035, 0.07));
  planks.add(new THREE.BoxGeometry(0.8, 0.36, 0.26), '#c4473a', at.m(-0.45, 0.18, -0.1));
  paint.add(new THREE.CylinderGeometry(0.11, 0.11, 0.02, 16, 1, false, 0, Math.PI), '#3b2a20', at.m(-0.45, 0.22, 0.031, Math.PI / 2, 0, -Math.PI / 2));
  paint.add(new THREE.BoxGeometry(0.22, 0.13, 0.02), '#3b2a20', at.m(-0.45, 0.085, 0.031));
  B('shingles').add(gable(0.86, 0.32, 0.14), '#5b3a26', at.m(-0.45, 0.36, -0.1));
  roofSlabs(B('shingles'), at, -0.45, 0.36, -0.1, 0.86, 0.32, 0.14, '#6b4430');
  // Water tower and a coal heap.
  paint.add(new THREE.CylinderGeometry(0.12, 0.12, 0.2, 16), '#4a90d9', at.m(0.45, 0.42, -0.1));
  paint.add(new THREE.ConeGeometry(0.14, 0.1, 16), '#2f6fb3', at.m(0.45, 0.57, -0.1));
  for (const [x, z] of [[-0.08, -0.08], [0.08, -0.08], [-0.08, 0.08], [0.08, 0.08]] as const) paint.add(new THREE.BoxGeometry(0.025, 0.32, 0.025), '#8b5a2b', at.m(0.45 + x, 0.16, -0.1 + z));
  for (let i = 0; i < 6; i++) paint.add(new THREE.DodecahedronGeometry(0.05 + (i % 3) * 0.01, 0), '#2c2c30', at.m(0.78 - (i % 3) * 0.06, 0.04 + Math.floor(i / 3) * 0.05, -0.05 + (i % 2) * 0.05));
  out.signs.push({ text: 'DEPOT', bg: '#c4473a', fg: '#fff6e6', position: at.point(-0.45, 0.62, -0.05), size: 0.12 });
}

function station(level: YardLevel, B: (k: Surface) => GeoBatch, out: YardBuildings, tint: StationTint): void {
  const st = level.station;
  const first = tileCenter(level, st.tiles[0] as number);
  const last = tileCenter(level, st.buffer);
  const mid = first.clone().add(last).multiplyScalar(0.5);
  const toward = tileCenter(level, st.buildingTiles[0] as number).sub(first).normalize();
  const len = st.tiles.length;
  // Local frame: x along the platform, z toward the track (away from the hall). The hall stands
  // back from the track so the crates on the platform are not hidden under the awning.
  const HALL = 1.2;
  const at = new Local(mid.clone().addScaledVector(toward, HALL), Math.atan2(-toward.x, -toward.z));
  const fromTrack = (w: number) => HALL - w;
  const paint = B('paint');
  const bricks = B('bricks');
  const shingles = B('shingles');
  const planks = B('planks');
  // Platform (planks) with a white edge.
  planks.add(new THREE.BoxGeometry(len, 0.08, 0.72), '#d9b98c', at.m(0, 0.04, fromTrack(0.6)));
  paint.add(new THREE.BoxGeometry(len, 0.012, 0.035), '#fff6e6', at.m(0, 0.085, fromTrack(0.26)));
  // Brick hall with windows and doors, a shingle roof and a clock gable in the middle.
  const hallW = len - 0.1;
  bricks.add(new THREE.BoxGeometry(hallW, 0.5, 0.48), tint.wall, at.m(0, 0.25, 0));
  paint.add(new THREE.BoxGeometry(hallW + 0.04, 0.04, 0.52), '#fff6e6', at.m(0, 0.5, 0));
  for (let i = 0; i < len; i++) {
    const x = -hallW / 2 + 0.5 + i * ((hallW - 1) / Math.max(1, len - 1));
    if (i % 2 === 0) windowAt(paint, at, x, 0.3, 0.245, 0.18, 0.2, tint.roof);
    else {
      paint.add(new THREE.BoxGeometry(0.2, 0.3, 0.02), '#7a4a26', at.m(x, 0.15, 0.245));
      paint.add(new THREE.CylinderGeometry(0.1, 0.1, 0.02, 14, 1, false, 0, Math.PI), '#7a4a26', at.m(x, 0.3, 0.245, Math.PI / 2, 0, -Math.PI / 2));
    }
  }
  shingles.add(gable(hallW + 0.02, 0.48, 0.28), shade(tint.roof, -15), at.m(0, 0.52, 0));
  roofSlabs(shingles, at, 0, 0.52, 0, hallW + 0.04, 0.48, 0.28, tint.roof);
  // Clock gable.
  bricks.add(new THREE.BoxGeometry(0.5, 0.32, 0.3), tint.wall, at.m(0, 0.68, 0.17));
  shingles.add(gable(0.3, 0.56, 0.2).rotateY(Math.PI / 2), tint.roof, at.m(0, 0.84, 0.17));
  paint.add(new THREE.CylinderGeometry(0.11, 0.11, 0.03, 24), '#fff6e6', at.m(0, 0.7, 0.33, Math.PI / 2));
  paint.add(new THREE.TorusGeometry(0.11, 0.015, 6, 24), '#e7b53a', at.m(0, 0.7, 0.345));
  paint.add(new THREE.BoxGeometry(0.012, 0.08, 0.01), '#2a2a2e', at.m(0, 0.73, 0.35));
  paint.add(new THREE.BoxGeometry(0.06, 0.012, 0.01), '#2a2a2e', at.m(0.025, 0.7, 0.35));
  // Awning over the platform on posts.
  for (let i = 0; i <= len; i++) paint.add(new THREE.CylinderGeometry(0.02, 0.02, 0.42, 8), '#fff6e6', at.m(-len / 2 + 0.05 + i * ((len - 0.1) / len), 0.3, fromTrack(0.72)));
  for (let i = 0; i < len * 4; i++) {
    const x = -len / 2 + (i + 0.5) / 4;
    paint.add(new THREE.BoxGeometry(0.25, 0.025, 0.3), i % 2 ? '#fff6e6' : tint.awning, at.m(x, 0.5, fromTrack(0.82), -0.25));
  }
  // Flags on the roof.
  for (const x of [-hallW / 2 + 0.15, hallW / 2 - 0.15]) {
    paint.add(new THREE.CylinderGeometry(0.01, 0.01, 0.4, 6), '#e9e9ef', at.m(x, 0.9, 0));
    paint.add(new THREE.BoxGeometry(0.16, 0.1, 0.01), x < 0 ? '#4a90d9' : '#f6c344', at.m(x + 0.08, 1.04, 0));
  }
  // Holiday dressing on the hall (F-015).
  activeHoliday()?.skin.station?.(paint, { m: (x, y, z, rx, ry, rz) => at.m(x, y, z, rx, ry, rz), width: hallW, roofY: 0.52, frontZ: 0.245, awningY: 0.5, awningZ: fromTrack(0.82) });
  out.signs.push({ text: 'TOY STATION', bg: tint.awning, fg: '#fff6e6', position: at.point(0, 1.12, 0.15), size: 0.16 });
  // One chute per wanted wagon, from the buffer outward (FR-103): a crate in the toy's color.
  level.goal.forEach((toy, k) => {
    const tile = st.tiles[st.tiles.length - 1 - k];
    if (tile === undefined) return;
    const p = tileCenter(level, tile);
    out.chutes.push(p.clone());
    const crate = new Local(p.clone().addScaledVector(toward, 0.45), Math.atan2(-toward.x, -toward.z));
    const color = toy ? TOY_COLORS[toy] : '#c9bba7';
    planks.add(new THREE.BoxGeometry(0.36, 0.22, 0.24), shade(color, 30), crate.m(0, 0.19, 0));
    paint.add(new THREE.BoxGeometry(0.38, 0.03, 0.26), color, crate.m(0, 0.31, 0));
    paint.add(new THREE.BoxGeometry(0.38, 0.03, 0.26), color, crate.m(0, 0.1, 0));
    paint.add(new THREE.BoxGeometry(0.28, 0.02, 0.16), '#3b2a20', crate.m(0, 0.33, 0));
    if (toy) out.markers.push({ type: toy, position: p.clone().addScaledVector(toward, 0.45).setY(0.66) });
    out.signs.push({ text: String(k + 1), bg: '#3b2a20', fg: '#fff6e6', position: p.clone().addScaledVector(toward, 0.24).setY(0.36), size: 0.12 });
  });
}

function factory(level: YardLevel, f: YardFactory, B: (k: Surface) => GeoBatch, out: YardBuildings): void {
  const look = FACTORY_LOOK[f.kind] as (typeof FACTORY_LOOK)[string];
  const t = tileCenter(level, f.tile);
  const bpos = tileCenter(level, f.building);
  const toT = t.clone().sub(bpos).normalize();
  // Local frame: z toward the track. Keep text upright for the camera: x runs left to right.
  const at = new Local(bpos, Math.atan2(toT.x, toT.z));
  const paint = B('paint');
  const bricks = B('bricks');
  const shingles = B('shingles');
  const planks = B('planks');
  const toyColor = f.toy ? TOY_COLORS[f.toy] : f.to ? TOY_COLORS[f.to] : look.trim;
  // Stone plinth.
  paint.add(new THREE.BoxGeometry(0.84, 0.05, 0.84), '#b9b2a6', at.m(0, 0.025, 0));
  switch (f.kind) {
    case 'loader':
    case 'single': {
      // A silo of planks with a cone roof, and a little shop at its foot.
      planks.add(new THREE.CylinderGeometry(0.22, 0.22, 0.62, 18), look.wall, at.m(-0.12, 0.36, -0.1));
      for (const y of [0.18, 0.4, 0.62]) paint.add(new THREE.TorusGeometry(0.222, 0.014, 6, 20), look.trim, at.m(-0.12, y, -0.1, Math.PI / 2));
      shingles.add(new THREE.ConeGeometry(0.26, 0.22, 18), look.roof, at.m(-0.12, 0.78, -0.1));
      bricks.add(new THREE.BoxGeometry(0.36, 0.3, 0.34), shade(look.wall, -10), at.m(0.2, 0.18, 0.1));
      shingles.add(gable(0.4, 0.38, 0.14), look.roof, at.m(0.2, 0.33, 0.1));
      roofSlabs(shingles, at, 0.2, 0.33, 0.1, 0.4, 0.38, 0.14, look.roof);
      windowAt(paint, at, 0.2, 0.2, 0.275, 0.14, 0.12, look.trim);
      if (f.kind === 'single') {
        for (let i = 0; i < 4; i++) paint.add(new THREE.BoxGeometry(0.1, 0.02, 0.16), i % 2 ? '#fff6e6' : look.trim, at.m(0.05 + i * 0.1, 0.32, 0.33, -0.35));
      }
      out.signs.push({ text: look.sign, bg: '#fff6e6', fg: look.trim, position: at.point(-0.12, 0.98, -0.1), size: 0.15 });
      out.markers.push({ type: f.toy as ToyType, position: at.point(-0.12, 1.36, -0.1) });
      break;
    }
    case 'converter': {
      // A brick workshop with a saw-tooth roof, a tall chimney and a big gear.
      bricks.add(new THREE.BoxGeometry(0.66, 0.4, 0.5), look.wall, at.m(0, 0.22, -0.05));
      for (const x of [-0.17, 0.17]) {
        shingles.add(new THREE.BoxGeometry(0.32, 0.03, 0.52), look.roof, at.m(x, 0.5, -0.05, 0, 0, 0.45));
        paint.add(new THREE.BoxGeometry(0.02, 0.13, 0.5), '#bfe6ff', at.m(x + 0.14, 0.49, -0.05));
      }
      bricks.add(new THREE.CylinderGeometry(0.06, 0.075, 0.5, 12), '#b5584a', at.m(0.25, 0.65, -0.2));
      paint.add(new THREE.CylinderGeometry(0.075, 0.075, 0.04, 12), '#3b2a20', at.m(0.25, 0.91, -0.2));
      out.chimneys.push(at.point(0.25, 0.95, -0.2));
      for (const x of [-0.18, 0.05]) windowAt(paint, at, x, 0.24, 0.205, 0.13, 0.13, look.trim);
      out.gears.push({ position: at.point(-0.2, 0.58, -0.2), radius: 0.13, speed: 1.4 });
      break;
    }
    case 'swap': {
      // Twin towers joined by a bridge, cone roofs, swapping arrows.
      for (const x of [-0.2, 0.2]) {
        bricks.add(new THREE.CylinderGeometry(0.15, 0.17, 0.6, 16), look.wall, at.m(x, 0.33, -0.05));
        shingles.add(new THREE.ConeGeometry(0.2, 0.26, 16), look.roof, at.m(x, 0.76, -0.05));
        windowAt(paint, at, x, 0.4, 0.115, 0.08, 0.12, look.trim);
      }
      planks.add(new THREE.BoxGeometry(0.3, 0.1, 0.16), look.trim, at.m(0, 0.48, -0.05));
      out.gears.push({ position: at.point(0, 0.56, -0.05), radius: 0.09, speed: -2 });
      break;
    }
    default: {
      // Wash house: tiled walls, a dome, a shower bar over the track and soap bubbles.
      bricks.add(new THREE.BoxGeometry(0.6, 0.38, 0.5), look.wall, at.m(0, 0.21, -0.05));
      shingles.add(new THREE.SphereGeometry(0.3, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), look.roof, at.m(0, 0.4, -0.05, 0, 0, 0, 1, 0.7, 0.85));
      windowAt(paint, at, -0.15, 0.22, 0.205, 0.12, 0.12, look.trim);
      windowAt(paint, at, 0.15, 0.22, 0.205, 0.12, 0.12, look.trim);
      for (let i = 0; i < 6; i++) paint.add(new THREE.SphereGeometry(0.04 + (i % 3) * 0.02, 10, 8), '#ffffff', at.m(-0.2 + i * 0.08, 0.62 + (i % 2) * 0.08, -0.1 + (i % 3) * 0.05));
      out.chimneys.push(at.point(0, 0.62, -0.05));
    }
  }
  // A chute from the building out over the track, ending in a funnel (a shower bar for the wash).
  const reach = bpos.distanceTo(t);
  const from = new THREE.Vector3(0, 0.68, 0.2);
  // The chute ends above the funnel's open top, so it never pokes through it.
  const to = new THREE.Vector3(0, 0.62, reach - 0.1);
  const len = from.distanceTo(to);
  const tilt = Math.atan2(from.y - to.y, to.z - from.z);
  paint.add(new THREE.BoxGeometry(0.12, 0.04, len), shade(look.trim, -20), at.m(0, (from.y + to.y) / 2, (from.z + to.z) / 2, tilt));
  for (const x of [-0.065, 0.065]) paint.add(new THREE.BoxGeometry(0.015, 0.06, len), look.trim, at.m(x, (from.y + to.y) / 2 + 0.02, (from.z + to.z) / 2, tilt));
  paint.add(new THREE.BoxGeometry(0.04, 0.58, 0.04), '#7a4a26', at.m(0, 0.29, reach + 0.25));
  paint.add(new THREE.BoxGeometry(0.04, 0.04, 0.2), '#7a4a26', at.m(0, 0.56, reach + 0.15));
  if (f.kind === 'washer') {
    paint.add(new THREE.CylinderGeometry(0.025, 0.025, 0.42, 10), '#c9ccd4', at.m(0, 0.5, reach, Math.PI / 2));
    for (let i = 0; i < 5; i++) paint.add(new THREE.SphereGeometry(0.02, 8, 6), '#7fd6ff', at.m(((i % 2) - 0.5) * 0.06, 0.42 - (i % 3) * 0.05, reach - 0.16 + i * 0.08));
  } else {
    // An open funnel: outer wall, a dark mouth inside and a rim.
    paint.add(new THREE.CylinderGeometry(0.12, 0.04, 0.16, 18, 1, true), toyColor, at.m(0, 0.5, reach));
    paint.add(new THREE.CircleGeometry(0.095, 18).rotateX(-Math.PI / 2), '#2a1d14', at.m(0, 0.545, reach));
    paint.add(new THREE.TorusGeometry(0.12, 0.016, 6, 18), look.trim, at.m(0, 0.58, reach, Math.PI / 2));
  }
  if (f.kind === 'converter' || f.kind === 'swap') {
    // One wide sign: [from] > [to], the toys standing on the board beside the arrow.
    const width = 0.92;
    const signPos = at.point(0, 1.02, -0.05);
    out.signs.push({ text: look.sign, bg: '#fff6e6', fg: look.trim, position: signPos, size: 0.16, width });
    const right = new THREE.Vector3(1, 0, 0);
    out.markers.push({ type: f.from as ToyType, position: signPos.clone().addScaledVector(right, -0.3).add(new THREE.Vector3(0, 0.02, 0.1)), size: 4.2, anchor: signPos });
    out.markers.push({ type: f.to as ToyType, position: signPos.clone().addScaledVector(right, 0.3).add(new THREE.Vector3(0, 0.02, 0.1)), size: 4.2, anchor: signPos });
  } else if (f.kind === 'washer') {
    out.signs.push({ text: look.sign, bg: '#fff6e6', fg: look.trim, position: at.point(0, 0.9, -0.05), size: 0.15 });
  }
}
