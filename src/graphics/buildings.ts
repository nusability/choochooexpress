// Procedural buildings: depot shed, toy store, factories with hoppers (research R10).
import * as THREE from 'three';
import { DX, DY } from '../engine/grid';
import type { FactoryDef, LevelDefinition, ToyType } from '../engine/types';
import { GeoBatch } from './batch';
import { TOY_COLORS } from './palette';
import { labelTexture, shade, stripeTexture, toyIconTexture } from './textures';

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

function sprite(texture: THREE.Texture, x: number, y: number, z: number, w: number, h: number): THREE.Sprite {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthWrite: false }));
  s.position.set(x, y, z);
  s.scale.set(w, h, 1);
  s.renderOrder = 2;
  return s;
}

export function addDepot(batch: GeoBatch, def: LevelDefinition, extras: THREE.Group): void {
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
  extras.add(sprite(labelTexture('DEPOT', '#c4473a', '#fff6e6', 256, 96, 'bold 56px'), sign.x, sign.y, sign.z, 0.62, 0.23));
  // Buffer stop at the back of the depot.
  const stop = local(center, yaw, -len / 2 + 0.05, 0.1, 0);
  batch.box(0.08, 0.16, 0.36, '#f6c344', stop.x, stop.y, stop.z, yaw);
  const stopTop = local(center, yaw, -len / 2 + 0.05, 0.2, 0);
  batch.box(0.1, 0.04, 0.4, '#3b2a20', stopTop.x, stopTop.y, stopTop.z, yaw);
}

export function addStore(batch: GeoBatch, def: LevelDefinition, extras: THREE.Group): void {
  const c = tileCenter(def, def.store.buildingTile);
  // Body.
  batch.box(0.92, 0.62, 0.8, '#fbe3c2', c.x, 0.31, c.z - 0.02);
  batch.box(1.0, 0.08, 0.88, '#e8574a', c.x, 0.66, c.z - 0.02);
  batch.box(0.78, 0.18, 0.66, '#f6c344', c.x, 0.79, c.z - 0.06);
  // Door where the track ends and two windows.
  batch.box(0.34, 0.38, 0.04, '#4a2f1f', c.x, 0.19, c.z + 0.39);
  for (const wx of [-0.3, 0.3]) {
    batch.box(0.18, 0.2, 0.04, '#9fd8f2', c.x + wx, 0.34, c.z + 0.39);
    batch.box(0.22, 0.03, 0.06, '#ffffff', c.x + wx, 0.23, c.z + 0.41);
  }
  // Striped awning.
  const awning = new THREE.Mesh(
    new THREE.BoxGeometry(1.02, 0.03, 0.3),
    new THREE.MeshStandardMaterial({ map: stripeTexture('#ffffff', '#e8574a'), roughness: 0.8 }),
  );
  awning.position.set(c.x, 0.55, c.z + 0.52);
  awning.rotation.x = 0.45;
  awning.castShadow = true;
  extras.add(awning);
  extras.add(sprite(labelTexture('TOY STORE', '#e8574a', '#fff6e6', 320, 96, 'bold 52px'), c.x, 1.1, c.z, 1.1, 0.33));
}

export interface FactoryParts {
  /** World position of each funnel's hopper mouth (center of the slot). */
  hoppers: THREE.Vector3[];
}

export function addFactory(batch: GeoBatch, def: LevelDefinition, factory: FactoryDef, extras: THREE.Group): FactoryParts {
  const hoppers: THREE.Vector3[] = [];
  factory.funnels.forEach((funnelId, i) => {
    const funnel = def.funnels[funnelId];
    const lane = funnel ? def.lanes[funnel.lane] : undefined;
    const buildingTile = factory.buildingTiles[i] ?? factory.buildingTiles[0];
    if (!funnel || !lane || buildingTile === undefined) return;
    const color = TOY_COLORS[funnel.type as ToyType];
    const f = tileCenter(def, lane.tile);
    const bpos = tileCenter(def, buildingTile);
    const toF = f.clone().sub(bpos).normalize();
    const along = yawOf(DX[lane.to] as number, DY[lane.to] as number);
    const houseYaw = yawOf(toF.x, toF.z);
    const roof = factory.kind === 'dual' ? '#e7b53a' : shade(color, -10);
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
    // Hopper over the funnel span, with a dark slot underneath.
    batch.box(0.8, 0.18, 0.3, color, f.x, HOPPER_Y, f.z, along);
    batch.box(0.84, 0.04, 0.34, shade(color, -45), f.x, HOPPER_Y + 0.1, f.z, along);
    batch.box(0.76, 0.03, 0.09, '#2a1d14', f.x, HOPPER_BOTTOM + 0.005, f.z, along);
    // Far-side leg so the hopper looks supported.
    const leg = local(f, houseYaw, 0.32, HOPPER_Y / 2, 0);
    batch.box(0.05, HOPPER_Y, 0.05, '#7a4a26', leg.x, leg.y, leg.z, houseYaw);
    hoppers.push(new THREE.Vector3(f.x, HOPPER_BOTTOM, f.z));
    extras.add(sprite(toyIconTexture(funnel.type, color), bpos.x, 1.05, bpos.z, 0.42, 0.42));
  });
  if (factory.kind === 'dual' && factory.buildingTiles.length === 2) {
    const a = tileCenter(def, factory.buildingTiles[0] as number);
    const b = tileCenter(def, factory.buildingTiles[1] as number);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    // Gold gantry joining the two towers over both hoppers: one building, two pours.
    const span = a.distanceTo(b) - 0.5;
    const yaw = yawOf(b.x - a.x, b.z - a.z);
    batch.box(span, 0.08, 0.14, '#e7b53a', mid.x, 0.98, mid.z, yaw);
    batch.box(span + 0.04, 0.03, 0.18, '#b8862a', mid.x, 1.035, mid.z, yaw);
    extras.add(sprite(labelTexture('2×', '#e7b53a', '#3b2a20', 128, 96, 'bold 64px'), mid.x, 1.45, mid.z, 0.4, 0.3));
  }
  return { hoppers };
}
