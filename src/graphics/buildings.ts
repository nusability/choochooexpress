// Procedural buildings: depot shed, Toy Station with chutes, factories with hoppers (research R10, R28).
import * as THREE from 'three';
import { DX, DY } from '../engine/grid';
import { wagonCenter } from '../engine/flow';
import type { FactoryDef, LevelDefinition, ToyType } from '../engine/types';
import { MeshBuilder } from '../ui/kit/builder';
import { measure } from '../ui/kit/text3d';
import { GeoBatch } from './batch';
import { TOY_COLORS } from './palette';
import { shade } from './textures';

export const HOPPER_Y = 0.74;
export const HOPPER_BOTTOM = 0.64;

export function tileCenter(def: { cols: number; rows: number }, tile: number): THREE.Vector3 {
  const c = tile % def.cols;
  const r = Math.floor(tile / def.cols);
  return new THREE.Vector3(c + 0.5 - def.cols / 2, 0, r + 0.5 - def.rows / 2);
}

/** Yaw that turns local +X toward world direction (dx, dz). */
export function yawOf(dx: number, dz: number): number {
  return -Math.atan2(dz, dx);
}

function mat(x: number, y: number, z: number, yaw: number, tilt = 0, roll = 0): THREE.Matrix4 {
  return new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(tilt, yaw, roll, 'YXZ')).setPosition(x, y, z);
}

/** Point at local (lx, ly, lz) in a frame at `o` rotated by `yaw`. */
function local(o: THREE.Vector3, yaw: number, lx: number, ly: number, lz: number): THREE.Vector3 {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return new THREE.Vector3(o.x + lx * c + lz * s, o.y + ly, o.z - lx * s + lz * c);
}

/** Signs face the viewer (+z) and lean back this far so they read from the raised camera. */
export const SIGN_LEAN = -0.45;

/** A sign in the world (FR-060): drawn by the board as its own mesh so it can sway (FR-067 g). */
export interface SignSpec {
  text: string;
  bg: string;
  fg: string;
  position: THREE.Vector3;
  size: number;
}

/**
 * Sign board with 3D letters that hop one after another; the board sways around its foot in the
 * shader (FR-067 g). Built straight into world space (`matrix`) so all signs share one mesh.
 */
export function signGeometry(sign: Pick<SignSpec, 'text' | 'bg' | 'fg' | 'size'>, matrix?: THREE.Matrix4, phase = 0): THREE.BufferGeometry {
  const { text, bg, fg, size } = sign;
  const b = new MeshBuilder();
  const w = measure(text, size) + size * 1.1;
  const h = size * 1.75;
  b.wiggle = { phase, hop: 0, roll: 0.07, speed: 1.5, px: 0, py: -h / 2 };
  const front = b.toyBlock(w, h, h * 0.3, bg, 0, 0, 0, { rim: size * 0.12, drop: size * 0.14, depth: size * 0.3 });
  b.wiggle = null;
  b.text(text, { size, depth: size * 0.25 }, 0, 0, front, fg, false, { height: size * 0.12, step: 0.6, speed: 3.2, roll: 0.08, phase });
  return b.build(matrix);
}

export function addDepot(batch: GeoBatch, def: LevelDefinition, signs: SignSpec[]): void {
  const first = def.lanes[def.depot.lanes[0] as number];
  if (!first) return;
  const d = first.to;
  const yaw = yawOf(DX[d] as number, DY[d] as number);
  const a = tileCenter(def, def.depot.tiles[0] as number);
  const b = tileCenter(def, def.depot.tiles[def.depot.tiles.length - 1] as number);
  const center = a.clone().add(b).multiplyScalar(0.5);
  const len = def.depot.tiles.length;
  // Low wooden platform along one side of the track (the train stays visible).
  const platform = local(center, yaw, 0, 0.05, 0.36);
  batch.box(len - 0.1, 0.1, 0.2, '#b07a46', platform.x, platform.y, platform.z, yaw);
  const edge = local(center, yaw, 0, 0.105, 0.27);
  batch.box(len - 0.1, 0.02, 0.03, '#f6c344', edge.x, edge.y, edge.z, yaw);
  for (const lx of [-len / 2 + 0.4, len / 2 - 0.4]) {
    const lamp = local(center, yaw, lx, 0.3, 0.4);
    batch.cylinder(0.018, 0.022, 0.42, '#3b2a20', lamp.x, lamp.y, lamp.z, 8);
    const bulb = local(center, yaw, lx, 0.53, 0.4);
    batch.sphere(0.045, '#fff3a0', bulb.x, bulb.y, bulb.z);
  }
  // Entrance arch at the exit end.
  for (const lz of [-0.3, 0.3]) {
    const post = local(center, yaw, len / 2 - 0.12, 0.28, lz);
    batch.box(0.07, 0.56, 0.07, '#7a4a26', post.x, post.y, post.z, yaw);
  }
  const beam = local(center, yaw, len / 2 - 0.12, 0.58, 0);
  batch.box(0.1, 0.08, 0.72, '#c4473a', beam.x, beam.y, beam.z, yaw);
  const sign = local(center, yaw, len / 2 - 0.12, 0.72, 0);
  signs.push({ text: 'DEPOT', bg: '#c4473a', fg: '#fff6e6', position: sign, size: 0.13 });
  // Buffer stop at the back of the depot.
  const stop = local(center, yaw, -len / 2 + 0.05, 0.1, 0);
  batch.box(0.08, 0.16, 0.36, '#f6c344', stop.x, stop.y, stop.z, yaw);
  const stopTop = local(center, yaw, -len / 2 + 0.05, 0.2, 0);
  batch.box(0.1, 0.04, 0.4, '#3b2a20', stopTop.x, stopTop.y, stopTop.z, yaw);
}

export interface StationParts {
  /** Where each wagon's chute is (world, at platform height), in wagon order. */
  chutes: THREE.Vector3[];
  /** Direction from the track toward the chutes (unit, world XZ). */
  toward: THREE.Vector3;
  toys: { type: ToyType; position: THREE.Vector3 }[];
  /** Middle of the platform (for confetti). */
  center: THREE.Vector3;
}

/**
 * The Toy Station (FR-072): a platform along the last straight, a hall behind it with one chute per
 * wagon at the spot where that wagon stops, and a buffer stop at the end of the track.
 */
export function addStation(batch: GeoBatch, def: LevelDefinition, signs: SignSpec[], trims: readonly string[]): StationParts {
  const st = def.station;
  const d = st.dir;
  const along = new THREE.Vector3(DX[d] as number, 0, DY[d] as number);
  const yaw = yawOf(along.x, along.z);
  const first = tileCenter(def, st.tiles[0] as number);
  const last = tileCenter(def, st.tiles[st.tiles.length - 1] as number);
  const center = first.clone().add(last).multiplyScalar(0.5);
  const hall = tileCenter(def, st.buildingTiles[0] as number).sub(first);
  const toward = hall.clone().normalize();
  const len = st.tiles.length;
  const side = (k: number) => toward.clone().multiplyScalar(k);
  // Platform between the track and the hall.
  const plat = center.clone().add(side(0.36));
  batch.box(len, 0.1, 0.24, '#d8c3a5', plat.x, 0.05, plat.z, yaw);
  const edge = center.clone().add(side(0.25));
  batch.box(len, 0.02, 0.03, '#f6c344', edge.x, 0.105, edge.z, yaw);
  // The hall.
  const h = center.clone().add(side(0.95));
  batch.box(len - 0.06, 0.56, 0.62, '#fbe3c2', h.x, 0.28, h.z, yaw);
  batch.box(len + 0.04, 0.07, 0.74, '#e8574a', h.x, 0.6, h.z, yaw);
  const roofTop = center.clone().add(side(1.0));
  batch.box(len - 0.3, 0.12, 0.4, '#f6c344', roofTop.x, 0.69, roofTop.z, yaw);
  // Buffer stop at the end of the platform track.
  const end = last.clone().add(along.clone().multiplyScalar(0.44));
  batch.box(0.08, 0.16, 0.36, '#f6c344', end.x, 0.1, end.z, yaw);
  batch.box(0.1, 0.04, 0.4, '#3b2a20', end.x, 0.2, end.z, yaw);
  signs.push({ text: 'TOY STATION', bg: '#e8574a', fg: '#fff6e6', position: center.clone().add(side(0.95)).setY(1.02), size: 0.16 });
  // One chute per wagon where it stops (the engine front stops at the buffer, FR-072).
  const stop = last.clone().add(along.clone().multiplyScalar(0.5));
  const chutes: THREE.Vector3[] = [];
  const toys: StationParts['toys'] = [];
  for (const line of def.order.lines) {
    const p = stop.clone().sub(along.clone().multiplyScalar(wagonCenter(line.wagon)));
    const trim = trims[(line.wagon - 1) % trims.length] as string;
    // A slide from the platform edge up into a bin on the hall's front.
    const slide = p.clone().add(side(0.42));
    batch.add(new THREE.BoxGeometry(0.34, 0.03, 0.36), '#d0d6de', mat(slide.x, 0.2, slide.z, yawOf(toward.x, toward.z), 0, -0.45));
    const bin = p.clone().add(side(0.66));
    batch.box(0.4, 0.22, 0.2, trim, bin.x, 0.31, bin.z, yaw);
    batch.box(0.32, 0.03, 0.14, '#2a1d14', bin.x, 0.425, bin.z, yaw);
    chutes.push(p.clone().setY(0.1));
    toys.push({ type: line.type, position: bin.clone().setY(0.82) });
    signs.push({ text: String(line.wagon), bg: trim, fg: '#fff6e6', position: bin.clone().add(side(-0.11)).setY(0.33), size: 0.15 });
  }
  return { chutes, toward, toys, center };
}

export interface FactoryParts {
  /** World position of the hopper mouth. */
  hopper: THREE.Vector3;
  /** Where the countdown ring floats (FR-069). */
  clock: THREE.Vector3;
  /** Where a turning 3D model of the factory's toy floats above its building (FR-060). */
  toy: { type: ToyType; position: THREE.Vector3 };
}

export function addFactory(batch: GeoBatch, def: LevelDefinition, factory: FactoryDef, signs: SignSpec[]): FactoryParts {
  const lane = def.lanes[factory.lane];
  if (!lane) throw new Error(`factory ${factory.id} lane`);
  const color = TOY_COLORS[factory.type];
  const f = tileCenter(def, lane.tile);
  const bpos = tileCenter(def, factory.buildingTile);
  const toF = f.clone().sub(bpos).normalize();
  const along = yawOf(DX[lane.to] as number, DY[lane.to] as number);
  const houseYaw = yawOf(toF.x, toF.z);
  const roof = shade(color, -10);
  const wall = factory.kind === 'decoy' ? '#d9c3a2' : '#e9c99a';
  // House.
  batch.box(0.6, 0.5, 0.62, wall, bpos.x, 0.25, bpos.z, houseYaw);
  batch.box(0.64, 0.06, 0.66, '#7a4a26', bpos.x, 0.03, bpos.z, houseYaw);
  for (const side of [-1, 1]) {
    const p = local(bpos, houseYaw, 0, 0.62, side * 0.17);
    batch.add(new THREE.BoxGeometry(0.66, 0.05, 0.4), roof, mat(p.x, p.y, p.z, houseYaw, side * 0.6));
  }
  const chimney = local(bpos, houseYaw, -0.18, 0.75, 0.16);
  batch.cylinder(0.05, 0.06, 0.26, '#8c5a3a', chimney.x, chimney.y, chimney.z);
  const door = local(bpos, houseYaw, 0.301, 0.14, 0);
  batch.box(0.02, 0.24, 0.16, shade(color, -40), door.x, door.y, door.z, houseYaw);
  // Arm from the house to the hopper above the track.
  const arm = local(bpos, houseYaw, 0.62, 0.86, 0);
  batch.box(0.66, 0.08, 0.1, '#7a4a26', arm.x, arm.y, arm.z, houseYaw);
  // Hopper with a trap door underneath.
  batch.box(0.44, 0.22, 0.32, color, f.x, HOPPER_Y, f.z, along);
  batch.box(0.48, 0.04, 0.36, shade(color, -45), f.x, HOPPER_Y + 0.12, f.z, along);
  batch.box(0.3, 0.03, 0.2, '#2a1d14', f.x, HOPPER_BOTTOM + 0.005, f.z, along);
  const leg = local(f, houseYaw, 0.32, HOPPER_Y / 2, 0);
  batch.box(0.05, HOPPER_Y, 0.05, '#7a4a26', leg.x, leg.y, leg.z, houseYaw);
  // Batch size on a sign above the house (FR-069).
  signs.push({ text: `×${factory.batch}`, bg: '#fff6e6', fg: '#3b2a20', position: new THREE.Vector3(bpos.x, 1.0, bpos.z), size: 0.22 });
  return {
    hopper: new THREE.Vector3(f.x, HOPPER_BOTTOM, f.z),
    clock: new THREE.Vector3(f.x, 1.12, f.z),
    toy: { type: factory.type, position: new THREE.Vector3(bpos.x, 1.45, bpos.z) },
  };
}
