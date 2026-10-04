// Engine, wagons and the toys they carry, posed from a run's frames (spec F-014 FR-097/FR-098,
// research R34). Between two frames a car slides from its old tile's centre through the shared
// edge to its new tile's centre; the engine keeps facing the same way when the train reverses.
import * as THREE from 'three';
import { activeHoliday } from './holiday';
import { lanePoint, opposite, type LanePoint } from '../engine/grid';
import type { ToyType } from '../engine/types';
import { ENGINE, type Cell, type Frame, type YardLevel } from '../engine/yard';
import { GeoBatch, detailMaterial, vertexColorMaterial } from './batch';
import { detailTexture } from './textures';
import { TRACK_TOP } from './trackMesh';
import { toyGeometry } from './toyMeshes';
import { WAGON_TRIMS, engineGeometry, wagonGeometry } from './trainView';

/** Where a wagon's three toys sit (two on the floor, one on top) and how big they are. */
const TOY_SPOTS: readonly [number, number, number][] = [
  [-0.1, 0.235, -0.03],
  [0.1, 0.235, 0.03],
  [0, 0.36, 0],
];
const TOY_SIZE = 3.7;

export class YardTrainView {
  readonly group = new THREE.Group();
  readonly cars = new Map<number, THREE.Mesh>();
  private readonly material = detailMaterial(detailTexture('paint'), 0.5, 0.02);
  private readonly toyMaterial = vertexColorMaterial(0.45, 0.02);
  private readonly toys = new Map<ToyType, THREE.InstancedMesh>();
  private readonly geos: THREE.BufferGeometry[] = [];
  private readonly p: LanePoint = { x: 0, y: 0, heading: 0 };
  /** Reversals before each frame (the engine model keeps its facing). */
  private parity: number[] = [0];

  constructor(private readonly level: YardLevel) {
    const add = (id: number, b: GeoBatch) => {
      const geo = b.buildGeometry(5) as THREE.BufferGeometry;
      this.geos.push(geo);
      const mesh = new THREE.Mesh(geo, this.material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.cars.set(id, mesh);
      this.group.add(mesh);
    };
    const engine = new GeoBatch();
    engineGeometry(engine);
    activeHoliday()?.skin.engine?.(engine);
    add(ENGINE, engine);
    level.wagons.forEach((_, id) => {
      const b = new GeoBatch();
      wagonGeometry(b, WAGON_TRIMS[id % WAGON_TRIMS.length] as string);
      add(id, b);
    });
    const max = Math.max(1, level.wagons.length * TOY_SPOTS.length);
    // Only the toys this level can carry (its loads, factories and goal).
    const kinds = new Set<ToyType>();
    for (const t of [...level.wagons, ...level.goal]) if (t) kinds.add(t);
    for (const f of level.factories) for (const t of [f.toy, f.from, f.to]) if (t) kinds.add(t);
    for (const type of kinds) {
      const geo = toyGeometry(type);
      this.geos.push(geo);
      const mesh = new THREE.InstancedMesh(geo, this.toyMaterial, max);
      mesh.count = 0;
      mesh.frustumCulled = false;
      mesh.castShadow = true;
      this.toys.set(type, mesh);
      this.group.add(mesh);
    }
  }

  /** Remembers how many times the train has reversed before each frame. */
  setRun(frames: readonly Frame[]): void {
    this.parity = [];
    let n = 0;
    for (const f of frames) {
      n += f.events.filter((e) => e.t === 'reverse').length;
      this.parity.push(n);
    }
  }

  private cellPoint(cell: Cell, f: number, out: LanePoint): LanePoint {
    const from = cell.from === -1 ? opposite(cell.to as 0) : cell.from;
    const to = cell.to === -1 ? opposite(from) : cell.to;
    const len = from === opposite(to) ? 1 : Math.PI / 4;
    const c = cell.tile % this.level.cols;
    const r = Math.floor(cell.tile / this.level.cols);
    return lanePoint(c, r, from, to, len * f, out);
  }

  private static cellsOf(frame: Frame): Map<number, Cell> {
    const map = new Map<number, Cell>();
    for (const c of frame.cars) map.set(c.id, c.cell);
    for (const g of frame.standing) g.ids.forEach((id, i) => map.set(id, g.cells[i] as Cell));
    return map;
  }

  /** Poses every car at fractional step `t` (frames[floor(t)] → frames[floor(t) + 1]). */
  pose(frames: readonly Frame[], t: number): void {
    const i = Math.max(0, Math.min(frames.length - 1, Math.floor(t)));
    const a = t - i;
    const f0 = frames[i] as Frame;
    const f1 = frames[Math.min(frames.length - 1, i + 1)] as Frame;
    const c0 = YardTrainView.cellsOf(f0);
    const c1 = YardTrainView.cellsOf(f1);
    const offX = -this.level.cols / 2;
    const offZ = -this.level.rows / 2;
    const counts = new Map<ToyType, number>();
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const pos = new THREE.Vector3();
    const scale = new THREE.Vector3(TOY_SIZE, TOY_SIZE, TOY_SIZE);
    for (const [id, mesh] of this.cars) {
      const before = c0.get(id);
      const after = c1.get(id) ?? before;
      if (!before || !after) {
        mesh.visible = false;
        continue;
      }
      mesh.visible = true;
      let pt: LanePoint;
      if (before.tile !== after.tile) pt = a < 0.5 ? this.cellPoint(before, 0.5 + a, this.p) : this.cellPoint(after, a - 0.5, this.p);
      else pt = this.cellPoint(a < 0.5 ? before : after, 0.5, this.p);
      let heading = pt.heading;
      if (id === ENGINE && ((this.parity[a < 0.5 ? i : Math.min(frames.length - 1, i + 1)] ?? 0) % 2 === 1)) heading += Math.PI;
      mesh.position.set(pt.x + offX, TRACK_TOP, pt.y + offZ);
      mesh.rotation.set(0, -heading, 0);
      if (id === ENGINE) continue;
      const content = (a < 0.5 ? f0 : f1).contents[id] ?? null;
      if (!content) continue;
      const inst = this.toys.get(content) as THREE.InstancedMesh;
      for (const [lx, ly, lz] of TOY_SPOTS) {
        const k = counts.get(content) ?? 0;
        counts.set(content, k + 1);
        q.setFromEuler(new THREE.Euler(0, -heading + k * 1.3, ly > 0.3 ? 0.25 : 0));
        pos.set(lx, ly, lz).applyAxisAngle(THREE.Object3D.DEFAULT_UP, -heading).add(mesh.position);
        inst.setMatrixAt(k, m.compose(pos, q, scale));
      }
    }
    for (const [type, inst] of this.toys) {
      inst.count = counts.get(type) ?? 0;
      inst.visible = inst.count > 0;
      inst.instanceMatrix.needsUpdate = true;
    }
  }

  /** World position of a car (for the follow camera and picking). */
  carPosition(id: number, out = new THREE.Vector3()): THREE.Vector3 {
    const mesh = this.cars.get(id);
    return mesh ? out.copy(mesh.position) : out.set(0, 0, 0);
  }

  dispose(): void {
    for (const g of this.geos) g.dispose();
    for (const inst of this.toys.values()) inst.dispose();
    this.material.dispose();
    this.toyMaterial.dispose();
  }
}
