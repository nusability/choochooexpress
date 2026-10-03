// Toy engine and open wooden wagons, posed from engine CarPoses (local +X = forward).
import * as THREE from 'three';
import type { CarPose } from '../engine/types';
import { GeoBatch, vertexColorMaterial } from './batch';

/** Wagon interior, shared with the physics colliders (toyPhysics). */
export const WAGON_INTERIOR = { halfLength: 0.22, halfWidth: 0.14, floorY: 0.12, wallTop: 0.29 };

const WAGON_TRIMS = ['#e8574a', '#4a90d9', '#5bb36a', '#9b6ad6'];

function wheels(b: GeoBatch, xs: number[], hub: string): void {
  for (const x of xs) {
    for (const z of [-0.125, 0.125]) {
      b.cylinder(0.055, 0.055, 0.035, '#2c2c2c', x, 0.055, z, 14, Math.PI / 2);
      b.cylinder(0.022, 0.022, 0.04, hub, x, 0.055, z * 1.02, 8, Math.PI / 2);
    }
  }
}

function engineGeometry(b: GeoBatch): void {
  b.box(0.6, 0.06, 0.26, '#7a2a22', 0, 0.09, 0);
  wheels(b, [-0.17, 0.02, 0.19], '#e8574a');
  b.cylinder(0.1, 0.1, 0.34, '#2f6fb3', 0.08, 0.215, 0, 16, 0, 0, Math.PI / 2);
  b.cylinder(0.106, 0.106, 0.03, '#e7b53a', 0.2, 0.215, 0, 16, 0, 0, Math.PI / 2);
  b.cylinder(0.106, 0.106, 0.03, '#e7b53a', -0.04, 0.215, 0, 16, 0, 0, Math.PI / 2);
  b.box(0.2, 0.24, 0.27, '#e8574a', -0.19, 0.24, 0);
  b.box(0.12, 0.08, 0.28, '#9fd8f2', -0.19, 0.28, 0);
  b.box(0.27, 0.04, 0.31, '#3b2a20', -0.19, 0.38, 0);
  b.cylinder(0.035, 0.045, 0.12, '#2c2c2c', 0.2, 0.37, 0, 10);
  b.cylinder(0.06, 0.035, 0.05, '#2c2c2c', 0.2, 0.445, 0, 10);
  b.sphere(0.045, '#e7b53a', 0.04, 0.315, 0);
  b.box(0.04, 0.07, 0.28, '#3b2a20', 0.3, 0.085, 0);
  b.sphere(0.03, '#fff3a0', 0.28, 0.24, 0);
}

function wagonGeometry(b: GeoBatch, trim: string): void {
  const i = WAGON_INTERIOR;
  const wall = '#d49a5c';
  b.box(0.46, 0.04, 0.24, '#3b2a20', 0, 0.08, 0);
  b.box(0.5, 0.03, 0.32, wall, 0, i.floorY - 0.015, 0);
  const h = i.wallTop - i.floorY + 0.015;
  const y = i.floorY + h / 2 - 0.015;
  b.box(0.03, h, 0.32, wall, i.halfLength + 0.015, y, 0);
  b.box(0.03, h, 0.32, wall, -i.halfLength - 0.015, y, 0);
  b.box(0.5, h, 0.03, wall, 0, y, i.halfWidth + 0.015);
  b.box(0.5, h, 0.03, wall, 0, y, -i.halfWidth - 0.015);
  b.box(0.52, 0.03, 0.035, trim, 0, i.wallTop, i.halfWidth + 0.015);
  b.box(0.52, 0.03, 0.035, trim, 0, i.wallTop, -i.halfWidth - 0.015);
  b.box(0.035, 0.03, 0.34, trim, i.halfLength + 0.015, i.wallTop, 0);
  b.box(0.035, 0.03, 0.34, trim, -i.halfLength - 0.015, i.wallTop, 0);
  wheels(b, [-0.15, 0.15], trim);
  b.box(0.05, 0.03, 0.05, '#3b2a20', 0.27, 0.09, 0);
  b.box(0.05, 0.03, 0.05, '#3b2a20', -0.27, 0.09, 0);
}

export class TrainView {
  readonly group = new THREE.Group();
  readonly cars: THREE.Mesh[] = [];
  private readonly material = vertexColorMaterial(0.5, 0.05);
  private readonly offset: { x: number; z: number };

  constructor(wagons: number, cols: number, rows: number) {
    this.offset = { x: -cols / 2, z: -rows / 2 };
    const engine = new GeoBatch();
    engineGeometry(engine);
    this.addCar(engine);
    for (let k = 0; k < wagons; k++) {
      const b = new GeoBatch();
      wagonGeometry(b, WAGON_TRIMS[k % WAGON_TRIMS.length] as string);
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
      car.position.set(pose.x + this.offset.x, 0, pose.y + this.offset.z);
      car.rotation.set(0, -pose.heading, 0);
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
