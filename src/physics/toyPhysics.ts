// Presentation-only toy physics with Rapier3D (spec FR-018, research R3). Prompt deliverable 3.
//
// The engine decides every toy's fate (caught by wagon k, or spilled under a hopper, FR-070); this
// module only animates it. Settled toys are frozen — into a collider on their wagon's kinematic body, or a
// fixed collider on the ground — so only a few dozen bodies are simulated at any time.
import type RAPIER_NS from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import type { PhysicsFactory, ToyPhysicsService } from '../app/screen';
import { DECK_HEIGHT, DT } from '../engine/flow';
import type { CarPose, LevelDefinition, ToyType } from '../engine/types';
import { TOY_SHAPES, ToyInstances } from '../graphics/toyMeshes';
import { WAGON_INTERIOR } from '../graphics/trainView';

type Rapier = typeof RAPIER_NS;
type World = RAPIER_NS.World;
type RigidBody = RAPIER_NS.RigidBody;
type Collider = RAPIER_NS.Collider;

export const MAX_ALIVE = 1500;
export const MAX_ACTIVE = 150;
export const EXPLODE_MAX = 600;
const STILL_SPEED = 0.15;
const STILL_TICKS = 8;
const MAX_FALL_AGE = 1.5;
const GRAVITY = -11;
const Z_AXIS = new THREE.Vector3(0, 0, 1);

let rapier: Rapier | null = null;
let loading: Promise<void> | null = null;

export const physicsFactory: PhysicsFactory = {
  ready: () => rapier !== null,
  load() {
    loading ??= import('@dimforge/rapier3d-compat').then(async (mod) => {
      const lib = (mod.default ?? mod) as Rapier;
      await lib.init();
      rapier = lib;
    });
    return loading;
  },
  create(level: LevelDefinition): ToyPhysicsService {
    if (!rapier) throw new Error('Physics engine not loaded yet');
    return new ToyPhysics(rapier, level);
  },
};

interface Toy {
  type: ToyType;
  slot: number;
  /** `tipped`: poured out at the station; removed after a moment. */
  state: 'falling' | 'wagon' | 'ground' | 'tipped';
  body: RigidBody | null;
  collider: Collider | null;
  /** Car index (1-based wagon) the toy rests in, or 0. */
  wagon: number;
  local: THREE.Matrix4 | null;
  age: number;
  still: number;
  seq: number;
}

interface Car {
  body: RigidBody;
  pos: THREE.Vector3;
  quat: THREE.Quaternion;
  vel: THREE.Vector3;
  synced: boolean;
}

export class ToyPhysics implements ToyPhysicsService {
  readonly group = new THREE.Group();
  private readonly world: World;
  private readonly cars: Car[] = [];
  private readonly toys = new Set<Toy>();
  private readonly falling = new Set<Toy>();
  private readonly ground: Toy[] = [];
  private readonly instances = new ToyInstances(MAX_ALIVE);
  private exploded = false;
  private seq = 0;
  private readonly zeroG: boolean;
  private readonly offset: THREE.Vector3;
  private readonly m = new THREE.Matrix4();
  private readonly m2 = new THREE.Matrix4();
  private readonly v = new THREE.Vector3();
  private readonly q = new THREE.Quaternion();
  private readonly one = new THREE.Vector3(1, 1, 1);
  private readonly wagonMats: THREE.Matrix4[] = [];
  /** Toys waiting to leave a hopper: a batch pours out over a few ticks. */
  private readonly queue: { kind: 'load' | 'spill'; car: number; x: number; z: number; type: ToyType }[] = [];
  private readonly pitchQuat = new THREE.Quaternion();
  private readonly hidden: boolean[] = [];
  private readonly zero = new THREE.Vector3(0, 0, 0);

  constructor(
    private readonly R: Rapier,
    level: LevelDefinition,
  ) {
    this.zeroG = level.biome === 'space';
    this.offset = new THREE.Vector3(-level.cols / 2, 0, -level.rows / 2);
    this.world = new R.World({ x: 0, y: GRAVITY, z: 0 });
    this.world.timestep = DT;
    this.world.lengthUnit = 0.05;
    this.world.createCollider(R.ColliderDesc.cuboid(level.cols / 2 + 3, 0.1, level.rows / 2 + 3).setTranslation(0, -0.1, 0).setFriction(0.9));
    // Engine.
    this.addCar([{ hx: 0.3, hy: 0.13, hz: 0.13, x: 0, y: 0.2, z: 0 }]);
    // Wagons: floor + four walls around the interior shared with the wagon mesh.
    const w = WAGON_INTERIOR;
    const wallH = (w.wallTop - w.floorY) / 2 + 0.005;
    const wallY = w.floorY + wallH - 0.005;
    for (let k = 0; k < level.train.wagons; k++) {
      this.addCar([
        { hx: 0.25, hy: 0.04, hz: 0.16, x: 0, y: w.floorY - 0.04, z: 0 },
        { hx: 0.015, hy: wallH, hz: 0.16, x: w.halfLength + 0.015, y: wallY, z: 0 },
        { hx: 0.015, hy: wallH, hz: 0.16, x: -w.halfLength - 0.015, y: wallY, z: 0 },
        { hx: 0.25, hy: wallH, hz: 0.015, x: 0, y: wallY, z: w.halfWidth + 0.015 },
        { hx: 0.25, hy: wallH, hz: 0.015, x: 0, y: wallY, z: -w.halfWidth - 0.015 },
      ]);
    }
    this.group.add(this.instances.group);
  }

  private addCar(boxes: { hx: number; hy: number; hz: number; x: number; y: number; z: number }[]): void {
    const body = this.world.createRigidBody(this.R.RigidBodyDesc.kinematicPositionBased());
    for (const b of boxes) {
      this.world.createCollider(this.R.ColliderDesc.cuboid(b.hx, b.hy, b.hz).setTranslation(b.x, b.y, b.z).setFriction(0.8).setDensity(2), body);
    }
    this.cars.push({ body, pos: new THREE.Vector3(), quat: new THREE.Quaternion(), vel: new THREE.Vector3(), synced: false });
    this.wagonMats.push(new THREE.Matrix4());
  }

  private poseQuat(pose: CarPose, out: THREE.Quaternion): THREE.Quaternion {
    out.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, -pose.heading);
    return out.multiply(this.pitchQuat.setFromAxisAngle(Z_AXIS, pose.pitch));
  }

  syncTrain(poses: readonly CarPose[]): void {
    if (this.exploded) return;
    for (const pose of poses) {
      const car = this.cars[pose.index];
      if (!car) continue;
      const x = pose.x + this.offset.x;
      const y = pose.z * DECK_HEIGHT;
      const z = pose.y + this.offset.z;
      this.poseQuat(pose, this.q);
      if (!car.synced) {
        car.body.setTranslation({ x, y, z }, false);
        car.body.setRotation(this.q, false);
        car.vel.set(0, 0, 0);
        car.synced = true;
      } else {
        car.vel.set((x - car.pos.x) / DT, (y - car.pos.y) / DT, (z - car.pos.z) / DT);
        car.body.setNextKinematicTranslation({ x, y, z });
        car.body.setNextKinematicRotation(this.q);
      }
      car.pos.set(x, y, z);
      car.quat.copy(this.q);
      this.hidden[pose.index] = pose.hidden;
    }
  }

  drop(car: number, hopper: { x: number; z: number }, type: ToyType, caught: number, spilled: number): void {
    if (this.exploded) return;
    for (let i = 0; i < caught; i++) this.queue.push({ kind: 'load', car, x: hopper.x, z: hopper.z, type });
    for (let i = 0; i < spilled; i++) this.queue.push({ kind: 'spill', car, x: hopper.x, z: hopper.z, type });
  }

  tip(dx: number, dz: number): void {
    if (this.exploded) return;
    for (const toy of [...this.toys]) {
      if (toy.state !== 'wagon' || !toy.local) continue;
      const mat = this.wagonMats[toy.wagon];
      if (!mat) continue;
      const pos = new THREE.Vector3();
      const quat = new THREE.Quaternion();
      this.m.multiplyMatrices(mat, toy.local).decompose(pos, quat, new THREE.Vector3());
      if (toy.collider) this.world.removeCollider(toy.collider, false);
      const s = 1.1 + Math.random() * 0.7;
      const body = this.world.createRigidBody(
        this.R.RigidBodyDesc.dynamic()
          .setTranslation(pos.x, pos.y + 0.03, pos.z)
          .setRotation(quat)
          .setLinvel(dx * s, 1.3 + Math.random() * 0.9, dz * s)
          .setAngvel({ x: (Math.random() - 0.5) * 10, y: (Math.random() - 0.5) * 10, z: (Math.random() - 0.5) * 10 }),
      );
      toy.collider = this.world.createCollider(this.shape(toy.type), body);
      toy.body = body;
      toy.state = 'tipped';
      toy.local = null;
      toy.age = 0;
      toy.wagon = 0;
      this.falling.add(toy);
    }
  }

  /** Releases a few queued toys per tick from their hopper. */
  private pour(): void {
    for (let n = 0; n < 3 && this.queue.length; n++) {
      const q = this.queue.shift() as (typeof this.queue)[number];
      this.spawn(q.kind, q.car, q.x, q.z, q.type);
    }
  }

  private spawn(kind: 'load' | 'spill', wagon: number, hx: number, hz: number, type: ToyType): void {
    const car = this.cars[wagon];
    if (!car || this.exploded) return;
    if (this.toys.size >= MAX_ALIVE) this.recycleGround();
    const slot = this.instances.alloc(type);
    if (slot < 0) return;
    const lx = (Math.random() - 0.5) * 0.2;
    const lz = (Math.random() - 0.5) * 0.14;
    const y = this.zeroG ? 0.5 : 0.6;
    // Caught toys fall into the wagon (they follow it); spilled toys tumble from the hopper.
    const p = kind === 'load' ? this.v.set(lx, 0, lz).applyQuaternion(car.quat).add(car.pos) : this.v.set(hx + lx, 0, hz + lz);
    let vx = kind === 'load' ? car.vel.x : 0;
    let vy = -0.6;
    let vz = kind === 'load' ? car.vel.z : 0;
    if (kind === 'spill') {
      const side = Math.random() < 0.5 ? -1 : 1;
      const lateral = new THREE.Vector3(0, 0, side * (0.9 + Math.random() * 0.6)).applyQuaternion(car.quat);
      vx += lateral.x;
      vz += lateral.z;
      vy = 0.4 + Math.random() * 0.5;
    }
    const rot = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.random() * 6.3, Math.random() * 6.3, Math.random() * 6.3));
    const body = this.world.createRigidBody(
      this.R.RigidBodyDesc.dynamic()
        .setTranslation(p.x, y, p.z)
        .setRotation(rot)
        .setLinvel(vx, vy, vz)
        .setAngvel({ x: (Math.random() - 0.5) * 12, y: (Math.random() - 0.5) * 12, z: (Math.random() - 0.5) * 12 })
        .setGravityScale(this.zeroG ? 0.35 : 1),
    );
    const collider = this.world.createCollider(this.shape(type), body);
    const toy: Toy = { type, slot, state: 'falling', body, collider, wagon: kind === 'load' ? wagon : 0, local: null, age: 0, still: 0, seq: this.seq++ };
    this.toys.add(toy);
    this.falling.add(toy);
    if (this.falling.size > MAX_ACTIVE) this.freezeOldestFalling();
  }

  step(): void {
    this.pour();
    this.world.step();
    for (const toy of this.falling) {
      const body = toy.body;
      if (!body) continue;
      toy.age += DT;
      const p = body.translation();
      if (p.y < -1 || (toy.state === 'tipped' && toy.age > 0.9)) {
        this.remove(toy);
        continue;
      }
      if (toy.state === 'tipped') continue;
      const lv = body.linvel();
      const ref = toy.wagon > 0 && !this.exploded ? this.cars[toy.wagon]?.vel : undefined;
      const rel = Math.hypot(lv.x - (ref?.x ?? 0), lv.y, lv.z - (ref?.z ?? 0));
      toy.still = rel < STILL_SPEED ? toy.still + 1 : 0;
      if (toy.age < 0.2) continue;
      if (toy.still >= STILL_TICKS || toy.age > MAX_FALL_AGE) {
        const inWagon = this.exploded ? -1 : this.wagonContaining(p.x, p.y, p.z, toy.wagon);
        if (inWagon > 0) this.freezeToWagon(toy, inWagon);
        else if (p.y < 0.3 || toy.age > 3) this.freezeToGround(toy);
      }
    }
  }

  render(poses: readonly CarPose[] | null): void {
    // Frozen wagon toys follow the (interpolated) wagon poses used for the wagon meshes.
    if (poses && !this.exploded) {
      for (const pose of poses) {
        const mat = this.wagonMats[pose.index];
        if (!mat) continue;
        this.poseQuat(pose, this.q);
        // Toys in a wagon inside a tunnel are hidden with it.
        mat.compose(this.v.set(pose.x + this.offset.x, pose.z * DECK_HEIGHT, pose.y + this.offset.z), this.q, pose.hidden ? this.zero : this.one);
      }
    }
    for (const toy of this.toys) {
      if ((toy.state === 'falling' || toy.state === 'tipped') && toy.body) {
        const t = toy.body.translation();
        const r = toy.body.rotation();
        this.m.compose(this.v.set(t.x, t.y, t.z), this.q.set(r.x, r.y, r.z, r.w), this.one);
        this.instances.set(toy.type, toy.slot, this.m);
      } else if (toy.state === 'wagon' && toy.local) {
        const mat = this.wagonMats[toy.wagon];
        if (mat) this.instances.set(toy.type, toy.slot, this.m2.multiplyMatrices(mat, toy.local));
      }
    }
    this.instances.commit();
  }

  /** World transform of car i once the toy explosion has taken over the train. */
  carTransform(index: number, pos: THREE.Vector3, quat: THREE.Quaternion): boolean {
    if (!this.exploded) return false;
    const car = this.cars[index];
    if (!car) return false;
    const t = car.body.translation();
    const r = car.body.rotation();
    pos.set(t.x, t.y, t.z);
    quat.set(r.x, r.y, r.z, r.w);
    return true;
  }

  explode(poses: readonly CarPose[]): void {
    if (this.exploded) return;
    this.queue.length = 0;
    this.syncTrain(poses);
    this.render(poses);
    this.exploded = true;
    let freed = 0;
    for (const toy of [...this.toys]) {
      if (toy.state !== 'wagon' || !toy.local) continue;
      const mat = this.wagonMats[toy.wagon];
      if (!mat || freed >= EXPLODE_MAX) {
        this.remove(toy);
        continue;
      }
      freed++;
      const world = this.m.multiplyMatrices(mat, toy.local);
      const pos = new THREE.Vector3();
      const quat = new THREE.Quaternion();
      world.decompose(pos, quat, new THREE.Vector3());
      if (toy.collider) this.world.removeCollider(toy.collider, false);
      const car = this.cars[toy.wagon];
      const out = pos.clone().sub(car?.pos ?? pos).setY(0).normalize();
      const body = this.world.createRigidBody(
        this.R.RigidBodyDesc.dynamic()
          .setTranslation(pos.x, pos.y + 0.02, pos.z)
          .setRotation(quat)
          .setLinvel(out.x * (0.6 + Math.random() * 1.6), 1.6 + Math.random() * 2.6, out.z * (0.6 + Math.random() * 1.6))
          .setAngvel({ x: (Math.random() - 0.5) * 20, y: (Math.random() - 0.5) * 20, z: (Math.random() - 0.5) * 20 }),
      );
      toy.collider = this.world.createCollider(this.shape(toy.type), body);
      toy.body = body;
      toy.state = 'falling';
      toy.local = null;
      toy.age = 0;
      toy.still = 0;
      toy.wagon = 0;
      this.falling.add(toy);
    }
    this.cars.forEach((car, i) => {
      car.body.setBodyType(this.R.RigidBodyType.Dynamic, true);
      const side = i % 2 === 0 ? 1 : -1;
      const lateral = new THREE.Vector3(0, 0, side * (0.8 + Math.random() * 0.8)).applyQuaternion(car.quat);
      car.body.setLinvel({ x: car.vel.x * 0.6 + lateral.x, y: 2.2 + Math.random() * 1.2, z: car.vel.z * 0.6 + lateral.z }, true);
      car.body.setAngvel({ x: (Math.random() - 0.5) * 8, y: (Math.random() - 0.5) * 4, z: (Math.random() - 0.5) * 8 }, true);
    });
  }

  stats(): { active: number; alive: number } {
    return { active: this.falling.size, alive: this.toys.size };
  }

  dispose(): void {
    this.world.free();
    this.instances.dispose();
  }

  private shape(type: ToyType): RAPIER_NS.ColliderDesc {
    const s = TOY_SHAPES[type];
    const desc = s.kind === 'ball' ? this.R.ColliderDesc.ball(s.hx) : this.R.ColliderDesc.cuboid(s.hx, s.hy, s.hz);
    return desc.setFriction(0.65).setRestitution(0.12).setDensity(1);
  }

  /** 1-based wagon whose interior contains the point (preferring `prefer`), or -1. */
  private wagonContaining(x: number, y: number, z: number, prefer: number): number {
    const order = prefer > 0 ? [prefer, ...this.cars.keys()] : [...this.cars.keys()];
    const w = WAGON_INTERIOR;
    for (const k of order) {
      if (k === 0) continue;
      const car = this.cars[k];
      if (!car) continue;
      const local = this.v.set(x, y, z).sub(car.pos).applyQuaternion(this.q.copy(car.quat).invert());
      if (Math.abs(local.x) <= w.halfLength + 0.02 && Math.abs(local.z) <= w.halfWidth + 0.02 && local.y >= w.floorY - 0.02 && local.y <= w.wallTop + 0.2) return k;
    }
    return -1;
  }

  private freezeToWagon(toy: Toy, k: number): void {
    const car = this.cars[k];
    const body = toy.body;
    if (!car || !body) return;
    const t = body.translation();
    const r = body.rotation();
    const inv = this.q.copy(car.quat).invert();
    const localPos = new THREE.Vector3(t.x, t.y, t.z).sub(car.pos).applyQuaternion(inv);
    const localRot = new THREE.Quaternion().copy(inv).multiply(new THREE.Quaternion(r.x, r.y, r.z, r.w));
    this.world.removeRigidBody(body);
    toy.body = null;
    toy.collider = this.world.createCollider(
      this.shape(toy.type).setTranslation(localPos.x, localPos.y, localPos.z).setRotation(localRot),
      car.body,
    );
    toy.local = new THREE.Matrix4().compose(localPos, localRot, this.one);
    toy.state = 'wagon';
    toy.wagon = k;
    this.falling.delete(toy);
  }

  private freezeToGround(toy: Toy): void {
    const body = toy.body;
    if (!body) return;
    const t = body.translation();
    const r = body.rotation();
    this.world.removeRigidBody(body);
    toy.body = null;
    toy.collider = this.world.createCollider(this.shape(toy.type).setTranslation(t.x, t.y, t.z).setRotation(r));
    this.m.compose(this.v.set(t.x, t.y, t.z), this.q.set(r.x, r.y, r.z, r.w), this.one);
    this.instances.set(toy.type, toy.slot, this.m);
    toy.state = 'ground';
    toy.wagon = 0;
    this.falling.delete(toy);
    this.ground.push(toy);
  }

  private freezeOldestFalling(): void {
    let oldest: Toy | null = null;
    for (const toy of this.falling) {
      if (!toy.body || toy.state === 'tipped') continue;
      if (toy.body.translation().y > 0.35) continue;
      if (!oldest || toy.seq < oldest.seq) oldest = toy;
    }
    if (!oldest?.body) return;
    const p = oldest.body.translation();
    const inWagon = this.exploded ? -1 : this.wagonContaining(p.x, p.y, p.z, oldest.wagon);
    if (inWagon > 0) this.freezeToWagon(oldest, inWagon);
    else this.freezeToGround(oldest);
  }

  private recycleGround(): void {
    const toy = this.ground.shift();
    if (toy) this.remove(toy);
  }

  private remove(toy: Toy): void {
    if (toy.body) this.world.removeRigidBody(toy.body);
    else if (toy.collider) this.world.removeCollider(toy.collider, false);
    toy.body = null;
    toy.collider = null;
    this.toys.delete(toy);
    this.falling.delete(toy);
    const gi = this.ground.indexOf(toy);
    if (gi >= 0) this.ground.splice(gi, 1);
    this.instances.release(toy.type, toy.slot);
  }
}
