// Toy engine and open wooden wagons, posed from engine CarPoses (local +X = forward).
import * as THREE from 'three';
import { DECK_HEIGHT } from '../engine/flow';
import type { CarPose, ToyType } from '../engine/types';
import { GeoBatch, vertexColorMaterial } from './batch';
import { toyGeometry } from './toyMeshes';

/** Wagon interior (toys stand on the floor, below the wall tops). Car origin = top of the track. */
export const WAGON_INTERIOR = { halfLength: 0.21, halfWidth: 0.13, floorY: 0.13, wallTop: 0.27 };

/** Wagon k's trim color (also its chute and its row on the order card, FR-073). */
export const WAGON_TRIMS: readonly string[] = ['#e8574a', '#4a90d9', '#5bb36a', '#9b6ad6', '#f39c34'];

/** Wheels sit in the track grooves: at the rail gauge, sunk a little into the wood (FR-111). */
const GAUGE = 0.22;
const WHEEL_R = 0.05;
const WHEEL_Y = WHEEL_R - 0.008;
const INK = '#2a2a2e';

function wheels(b: GeoBatch, xs: number[], hub: string, rods = false): void {
  for (const x of xs) {
    for (const side of [-1, 1]) {
      const z = (side * GAUGE) / 2;
      b.cylinder(WHEEL_R, WHEEL_R, 0.03, INK, x, WHEEL_Y, z, 16, Math.PI / 2);
      b.cylinder(WHEEL_R * 0.55, WHEEL_R * 0.55, 0.036, hub, x, WHEEL_Y, z, 12, Math.PI / 2);
      b.cylinder(WHEEL_R * 0.18, WHEEL_R * 0.18, 0.042, '#f2e6cf', x, WHEEL_Y, z, 8, Math.PI / 2);
    }
    // Axle.
    b.cylinder(0.012, 0.012, GAUGE, '#8a8a90', x, WHEEL_Y, 0, 6, Math.PI / 2);
  }
  if (rods && xs.length > 1) {
    const lo = Math.min(...xs);
    const hi = Math.max(...xs);
    for (const side of [-1, 1]) b.box(hi - lo + 0.03, 0.014, 0.01, '#c9ccd4', (lo + hi) / 2, WHEEL_Y - 0.015, (side * GAUGE) / 2 + side * 0.024);
  }
}

/** Red wooden-train magnet coupler at local x. */
function coupler(b: GeoBatch, x: number): void {
  const dir = Math.sign(x);
  b.box(0.05, 0.022, 0.03, INK, x - dir * 0.02, 0.07, 0);
  b.cylinder(0.026, 0.026, 0.022, '#d23b30', x + dir * 0.008, 0.07, 0, 12, 0, 0, Math.PI / 2);
}

export function engineGeometry(b: GeoBatch): void {
  const boiler = '#2f6fb3';
  const cab = '#e8574a';
  const gold = '#e7b53a';
  // Chassis between the wheels and a footplate over them.
  b.box(0.56, 0.05, 0.16, INK, 0, 0.075, 0);
  b.box(0.6, 0.025, 0.3, '#3b2a20', 0, 0.112, 0);
  wheels(b, [-0.17, 0.0, 0.17], '#e8574a', true);
  // Boiler with gold bands, a darker smokebox and a round door.
  b.cylinder(0.092, 0.092, 0.34, boiler, 0.07, 0.215, 0, 20, 0, 0, Math.PI / 2);
  for (const x of [-0.06, 0.07, 0.2]) b.cylinder(0.097, 0.097, 0.022, gold, x, 0.215, 0, 20, 0, 0, Math.PI / 2);
  b.cylinder(0.088, 0.088, 0.05, '#24507f', 0.255, 0.215, 0, 20, 0, 0, Math.PI / 2);
  b.cylinder(0.06, 0.06, 0.012, '#3a3a40', 0.284, 0.215, 0, 16, 0, 0, Math.PI / 2);
  b.sphere(0.012, gold, 0.29, 0.215, 0, 1, 1, 1, 6);
  // Chimney, steam dome, sand dome and whistle.
  b.cylinder(0.034, 0.03, 0.1, INK, 0.21, 0.35, 0, 12);
  b.cylinder(0.052, 0.034, 0.045, INK, 0.21, 0.42, 0, 12);
  b.cylinder(0.054, 0.054, 0.012, gold, 0.21, 0.444, 0, 12);
  b.sphere(0.045, gold, 0.06, 0.3, 0, 1, 0.9, 1, 12);
  b.sphere(0.034, boiler, -0.03, 0.296, 0, 1, 0.9, 1, 10);
  b.cylinder(0.008, 0.008, 0.05, gold, -0.07, 0.33, 0, 6);
  // Cab with windows and a curved roof.
  b.box(0.2, 0.22, 0.28, cab, -0.19, 0.235, 0);
  for (const z of [-0.142, 0.142]) {
    b.box(0.1, 0.075, 0.006, '#cfeeff', -0.18, 0.28, z);
    b.box(0.12, 0.012, 0.008, '#fff6e6', -0.18, 0.322, z);
    b.box(0.12, 0.012, 0.008, '#fff6e6', -0.18, 0.238, z);
  }
  b.box(0.006, 0.075, 0.16, '#cfeeff', -0.088, 0.29, 0);
  b.add(new THREE.CylinderGeometry(0.2, 0.2, 0.3, 24, 1, false, -0.55, 1.1), '#a8322a', new THREE.Matrix4().makeRotationX(-Math.PI / 2).setPosition(-0.19, 0.17, 0));
  // Front: buffer beam, cowcatcher, lamp.
  b.box(0.03, 0.05, 0.3, '#d23b30', 0.29, 0.1, 0);
  b.add(new THREE.CylinderGeometry(0.0, 0.13, 0.08, 4, 1).rotateY(Math.PI / 4).scale(0.6, 1, 1.15), '#d23b30', new THREE.Matrix4().makeRotationZ(-Math.PI / 2).setPosition(0.31, 0.05, 0));
  b.sphere(0.028, '#fff3a0', 0.29, 0.3, 0, 1, 1, 1, 10);
  b.cylinder(0.032, 0.032, 0.02, INK, 0.276, 0.3, 0, 12, 0, 0, Math.PI / 2);
  coupler(b, -0.32);
  coupler(b, 0.33);
}

export function wagonGeometry(b: GeoBatch, trim: string): void {
  const i = WAGON_INTERIOR;
  const wood = '#e2b47a';
  b.box(0.44, 0.04, 0.16, INK, 0, 0.075, 0);
  b.box(0.5, 0.03, 0.3, '#c89358', 0, i.floorY - 0.015, 0);
  wheels(b, [-0.15, 0.15], trim);
  // Walls of three planks each, in slightly different tones.
  const planks = 3;
  const ph = (i.wallTop - i.floorY) / planks;
  const tones = [wood, '#d9a96c', '#e8c08a'];
  for (let k = 0; k < planks; k++) {
    const y = i.floorY + ph * (k + 0.5);
    const tone = tones[k % tones.length] as string;
    b.box(0.5, ph * 0.9, 0.025, tone, 0, y, i.halfWidth + 0.0125);
    b.box(0.5, ph * 0.9, 0.025, tone, 0, y, -i.halfWidth - 0.0125);
    b.box(0.025, ph * 0.9, 0.26, tone, i.halfLength + 0.0125, y, 0);
    b.box(0.025, ph * 0.9, 0.26, tone, -i.halfLength - 0.0125, y, 0);
  }
  // Painted corner posts and top rails in the wagon's trim color.
  for (const x of [-1, 1]) for (const z of [-1, 1]) b.box(0.04, i.wallTop - i.floorY + 0.03, 0.04, trim, x * (i.halfLength + 0.012), (i.wallTop + i.floorY) / 2, z * (i.halfWidth + 0.012));
  b.box(0.52, 0.022, 0.035, trim, 0, i.wallTop + 0.01, i.halfWidth + 0.0125);
  b.box(0.52, 0.022, 0.035, trim, 0, i.wallTop + 0.01, -i.halfWidth - 0.0125);
  b.box(0.035, 0.022, 0.3, trim, i.halfLength + 0.0125, i.wallTop + 0.01, 0);
  b.box(0.035, 0.022, 0.3, trim, -i.halfLength - 0.0125, i.wallTop + 0.01, 0);
  coupler(b, -0.27);
  coupler(b, 0.27);
}

/** A little flag at the back of a wagon with the toy its chute wants (FR-073). */
function wagonFlag(b: GeoBatch, trim: string, type: ToyType): void {
  b.cylinder(0.008, 0.008, 0.36, '#3b2a20', -0.2, 0.42, 0.12, 6);
  b.box(0.1, 0.07, 0.012, trim, -0.15, 0.57, 0.12);
  b.addColored(toyGeometry(type), new THREE.Matrix4().compose(new THREE.Vector3(-0.2, 0.66, 0.12), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.4, -0.5, 0)), new THREE.Vector3(2.4, 2.4, 2.4)));
}

export class TrainView {
  readonly group = new THREE.Group();
  readonly cars: THREE.Mesh[] = [];
  private readonly material = vertexColorMaterial(0.5, 0.05);
  private readonly offset: { x: number; z: number };

  constructor(wagons: number, cols: number, rows: number, wanted: readonly ToyType[] = []) {
    this.offset = { x: -cols / 2, z: -rows / 2 };
    const engine = new GeoBatch();
    engineGeometry(engine);
    this.addCar(engine);
    for (let k = 0; k < wagons; k++) {
      const b = new GeoBatch();
      const trim = WAGON_TRIMS[k % WAGON_TRIMS.length] as string;
      wagonGeometry(b, trim);
      const type = wanted[k];
      if (type) wagonFlag(b, trim, type);
      this.addCar(b);
    }
  }

  private addCar(b: GeoBatch): void {
    const mesh = b.build(this.material);
    if (!mesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.cars.push(mesh);
    this.group.add(mesh);
  }

  update(poses: readonly CarPose[]): void {
    for (const pose of poses) {
      const car = this.cars[pose.index];
      if (!car) continue;
      car.position.set(pose.x + this.offset.x, pose.z * DECK_HEIGHT, pose.y + this.offset.z);
      car.rotation.set(0, -pose.heading, pose.pitch, 'YXZ');
      car.visible = !pose.hidden;
    }
  }

  /** World-space center of a car (for picking and the follow camera). */
  carPosition(index: number, out = new THREE.Vector3()): THREE.Vector3 {
    const car = this.cars[index];
    return car ? out.copy(car.position) : out.set(0, 0, 0);
  }

  dispose(): void {
    for (const car of this.cars) car.geometry.dispose();
    this.material.dispose();
  }
}
