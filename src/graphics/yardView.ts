// The shunting yard diorama (spec F-014, F-013): biome ground to every screen edge, track built
// from the yard's pieces, buffer stops, switches with an arrow along the set branch and a badge for
// their kind, trigger plates, uncoupler pads, factories by type, the depot and the Toy Station with
// one chute per wanted wagon.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { DX, DY, edgeMid, lanePoint, opposite } from '../engine/grid';
import { Pcg32, hashSeed } from '../engine/prng';
import type { Dir, Lane, LevelDefinition, PropDef, ToyType } from '../engine/types';
import type { YardLevel, YardSwitch } from '../engine/yard';
import { MeshBuilder } from '../ui/kit/builder';
import { makeWiggly, wigglyWorldMaterial } from '../ui/kit/wiggle';
import { GeoBatch, compose, vertexColorMaterial } from './batch';
import type { BiomeTheme } from './biomes';
import { SIGN_LEAN, signGeometry, tileCenter, type SignSpec } from './buildings';
import { TOY_COLORS } from './palette';
import { buildProps, type PropAnimators } from './props';
import { shade } from './textures';
import { toyGeometry } from './toyMeshes';
import { BED_HEIGHT, RAIL_HEIGHT, buildTrack, chevronGeometry, type TrackMeshes } from './trackMesh';

const SWITCH_Y = BED_HEIGHT + RAIL_HEIGHT + 0.012;
const BUTTON_Y = 0.62;
const BUTTON_D = 0.54;
/** Colors that tell linked groups and trigger plates apart (with a letter badge too, NFR-011). */
export const GROUP_COLORS = ['#e8574a', '#4a90d9', '#9b6ad6', '#5bb36a'];

const OUTSIDE_PROPS: Record<string, readonly string[]> = {
  rug: ['pillow', 'block', 'book', 'ball'],
  candy: ['lollipop', 'gumdrop', 'marshmallow', 'cupcake'],
  garden: ['dune', 'bucket', 'spade'],
  space: ['planet', 'rocket', 'starSticker', 'crater'],
};

const FACTORY_LOOK: Record<string, { wall: string; sign: string }> = {
  loader: { wall: '#e9c99a', sign: 'FILL' },
  single: { wall: '#f2d36b', sign: 'ONE' },
  converter: { wall: '#bfe0f2', sign: '>' },
  swap: { wall: '#d6c2f0', sign: '<>' },
  washer: { wall: '#cfeff0', sign: 'WASH' },
};

interface SwitchView {
  sw: YardSwitch;
  center: THREE.Vector3;
  token: THREE.Mesh;
  badge: THREE.Mesh | null;
  dirs: THREE.Vector3[];
  chevrons: { x: number; z: number; yaw: number }[];
  state: 0 | 1;
  angle: number;
  pop: number;
}

/** Lanes for drawing: a buffer is drawn as a straight piece with a stop block. */
export function yardLanes(level: YardLevel): Lane[] {
  const lanes: Lane[] = [];
  const add = (tile: number, from: Dir, to: Dir) => {
    const straight = from === opposite(to);
    lanes.push({ id: lanes.length, tile, from, to, kind: straight ? 'straight' : 'curve', length: straight ? 1 : Math.PI / 4, z0: 0, z1: 0, speed: 1, tunnel: false });
  };
  for (const p of level.pieces) {
    if (p.kind === 'track') add(p.tile, p.a as Dir, p.b as Dir);
    else if (p.kind === 'crossing') {
      add(p.tile, 3, 1);
      add(p.tile, 0, 2);
    } else if (p.kind === 'buffer') add(p.tile, p.a as Dir, opposite(p.a as Dir));
    else {
      const sw = level.switches[p.switchId as number] as YardSwitch;
      add(p.tile, sw.stem, sw.branches[0]);
      add(p.tile, sw.stem, sw.branches[1]);
    }
  }
  return lanes;
}

export class YardView {
  readonly group = new THREE.Group();
  readonly sun: THREE.DirectionalLight;
  private readonly track: TrackMeshes;
  private readonly switches: SwitchView[] = [];
  private readonly chevronOn: THREE.InstancedMesh;
  private readonly chevronEdge: THREE.InstancedMesh;
  private readonly chevronOff: THREE.InstancedMesh;
  private readonly pads: THREE.InstancedMesh;
  private readonly props: PropAnimators;
  private readonly disposables: { dispose(): void }[] = [];
  private readonly toyMarkers: { mesh: THREE.InstancedMesh; spots: THREE.Vector3[] }[] = [];
  private readonly failMark: THREE.Mesh;
  private time = 0;
  motion = true;
  /** Where each goal slot's chute stands (slot 0 at the station buffer). */
  readonly chutes: THREE.Vector3[] = [];

  constructor(
    private readonly level: YardLevel,
    private readonly theme: BiomeTheme,
  ) {
    const { cols, rows } = level;
    const size = Math.max(cols, rows) * 5 + 24;
    const groundTex = theme.baseTop();
    groundTex.wrapS = THREE.RepeatWrapping;
    groundTex.wrapT = THREE.RepeatWrapping;
    const rep = size / (theme.id === 'rug' ? 8 : 3);
    groundTex.repeat.set(rep, rep);
    const groundGeo = new THREE.PlaneGeometry(size, size).rotateX(-Math.PI / 2);
    const ground = new THREE.Mesh(groundGeo, this.own(new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.95 })));
    ground.position.y = -0.002;
    ground.receiveShadow = true;
    this.disposables.push(groundTex, groundGeo);
    this.group.add(ground);

    const shape = { cols, rows, lanes: yardLanes(level) } as unknown as LevelDefinition;
    this.track = buildTrack(shape, { bed: theme.trackBed, sleeper: theme.sleeper, rail: theme.rail, railEmissive: theme.railEmissive });
    this.group.add(this.track.group);

    const batch = new GeoBatch();
    const signs: SignSpec[] = [];
    const markers: { type: ToyType; position: THREE.Vector3 }[] = [];
    this.addBuffers(batch);
    this.addDepot(batch, signs);
    this.addStation(batch, signs, markers);
    this.addFactories(batch, signs, markers);
    this.addPlates(batch);
    const mat = this.own(vertexColorMaterial());
    const buildings = batch.build(mat);
    if (buildings) {
      buildings.castShadow = true;
      buildings.receiveShadow = true;
      this.disposables.push(buildings.geometry);
      this.group.add(buildings);
    }
    this.buildSigns(signs);
    this.buildToyMarkers(markers);

    // Switch chevrons (instanced) and tokens (one small mesh each, with a kind badge).
    const n = Math.max(1, level.switches.length);
    const inst = (geo: THREE.BufferGeometry, m: THREE.Material) => {
      const mesh = new THREE.InstancedMesh(geo, m, n);
      mesh.count = level.switches.length;
      mesh.frustumCulled = false;
      this.disposables.push(geo, m, mesh);
      this.group.add(mesh);
      return mesh;
    };
    this.chevronOn = inst(chevronGeometry(0.42, 0.02), new THREE.MeshStandardMaterial({ color: '#ffd23f', emissive: '#806010', roughness: 0.4 }));
    this.chevronEdge = inst(chevronGeometry(0.56, 0.016).translate(-0.04, 0, 0), new THREE.MeshStandardMaterial({ color: '#2a1d14', roughness: 0.6 }));
    this.chevronOff = inst(chevronGeometry(0.3, 0.012), new THREE.MeshStandardMaterial({ color: '#d8d2c8', transparent: true, opacity: 0.55 }));
    const tokenMat = this.own(vertexColorMaterial(0.4));
    for (const sw of level.switches) this.switches.push(this.buildSwitch(sw, tokenMat));
    for (const v of this.switches) this.setSwitch(v.sw.id, v.sw.initial, false);

    // Uncoupler pads: hazard-striped discs, hidden until placed.
    const padBatch = new GeoBatch();
    padBatch.cylinder(0.3, 0.3, 0.03, '#2a1d14', 0, 0.015, 0, 24);
    padBatch.cylinder(0.25, 0.25, 0.04, '#ffd23f', 0, 0.02, 0, 24);
    padBatch.box(0.36, 0.045, 0.08, '#2a1d14', 0, 0.025, 0, Math.PI / 4);
    padBatch.box(0.36, 0.045, 0.08, '#2a1d14', 0, 0.025, 0, -Math.PI / 4);
    const padGeo = padBatch.buildGeometry() as THREE.BufferGeometry;
    this.pads = new THREE.InstancedMesh(padGeo, this.own(vertexColorMaterial(0.5)), Math.max(1, level.pads));
    this.pads.count = 0;
    this.pads.frustumCulled = false;
    this.disposables.push(padGeo, this.pads);
    this.group.add(this.pads);

    this.failMark = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.28, 4), this.own(new THREE.MeshStandardMaterial({ color: '#e0533f', emissive: '#e0533f', emissiveIntensity: 0.6 })));
    this.failMark.rotation.x = Math.PI;
    this.failMark.visible = false;
    this.disposables.push(this.failMark.geometry);
    this.group.add(this.failMark);

    this.props = buildProps({ cols, rows, props: level.props } as unknown as LevelDefinition, theme, this.outsideProps());
    this.group.add(this.props.group);

    const hemi = new THREE.HemisphereLight(theme.hemiSky, theme.hemiGround, theme.hemiIntensity);
    this.sun = new THREE.DirectionalLight(theme.sunColor, theme.sunIntensity);
    this.sun.position.set(-cols * 0.45, Math.max(cols, rows) * 1.3, rows * 0.55);
    this.sun.castShadow = true;
    const ext = Math.max(cols, rows) / 2 + 1.5;
    const cam = this.sun.shadow.camera;
    cam.left = -ext;
    cam.right = ext;
    cam.top = ext;
    cam.bottom = -ext;
    cam.near = 0.5;
    cam.far = Math.max(cols, rows) * 4;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.02;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.group.add(hemi, this.sun, this.sun.target);
  }

  private own<T extends THREE.Material>(m: T): T {
    this.disposables.push(m);
    return m;
  }

  get bounds(): { minX: number; maxX: number; minZ: number; maxZ: number; height: number } {
    return { minX: -this.level.cols / 2 + 0.05, maxX: this.level.cols / 2 - 0.05, minZ: -this.level.rows / 2 + 0.1, maxZ: this.level.rows / 2 - 0.05, height: 0.7 };
  }

  setShadowMapSize(size: number): void {
    this.sun.castShadow = size > 0;
    if (size > 0 && this.sun.shadow.mapSize.x !== size) {
      this.sun.shadow.mapSize.set(size, size);
      this.sun.shadow.map?.dispose();
      this.sun.shadow.map = null;
    }
  }

  tileCenter(tile: number): THREE.Vector3 {
    return tileCenter(this.level, tile);
  }

  /** Tap anchors of a switch: its tile and its floating button. */
  switchAnchors(id: number): THREE.Vector3[] {
    const v = this.switches[id];
    return v ? [v.center.clone().setY(0.06), v.center.clone().setY(BUTTON_Y)] : [];
  }

  switchArrowAngle(id: number): number {
    return this.switches[id]?.angle ?? 0;
  }

  setSwitch(id: number, state: 0 | 1, animate = true): void {
    const v = this.switches[id];
    if (!v) return;
    if (v.state !== state && animate) v.pop = 1;
    v.state = state;
    const on = v.chevrons[state] as { x: number; z: number; yaw: number };
    const off = v.chevrons[1 - state] as { x: number; z: number; yaw: number };
    this.chevronOn.setMatrixAt(id, compose(on.x, SWITCH_Y + 0.006, on.z, on.yaw));
    this.chevronEdge.setMatrixAt(id, compose(on.x, SWITCH_Y, on.z, on.yaw));
    this.chevronOff.setMatrixAt(id, compose(off.x, SWITCH_Y, off.z, off.yaw, 0.7));
    this.chevronOn.instanceMatrix.needsUpdate = true;
    this.chevronEdge.instanceMatrix.needsUpdate = true;
    this.chevronOff.instanceMatrix.needsUpdate = true;
  }

  setPads(tiles: readonly number[]): void {
    this.pads.count = tiles.length;
    tiles.forEach((t, i) => {
      const c = this.tileCenter(t);
      this.pads.setMatrixAt(i, compose(c.x, BED_HEIGHT + RAIL_HEIGHT, c.z, 0));
    });
    this.pads.instanceMatrix.needsUpdate = true;
  }

  markFailure(tile: number | null): void {
    this.failMark.visible = tile !== null;
    if (tile !== null) this.failMark.position.copy(this.tileCenter(tile)).setY(0.9);
  }

  update(dt: number, camera: THREE.Camera): void {
    this.time += dt;
    const lively = this.motion ? 1 : 0;
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
    const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
    const roll = new THREE.Quaternion();
    const z = new THREE.Vector3(0, 0, 1);
    for (const v of this.switches) {
      const dir = v.dirs[v.state] as THREE.Vector3;
      const goal = Math.atan2(dir.dot(up), dir.dot(right));
      let delta = goal - v.angle;
      delta = Math.atan2(Math.sin(delta), Math.cos(delta));
      v.angle += this.motion ? delta * Math.min(1, dt * 12) : delta;
      v.pop = Math.max(0, v.pop - dt * 3);
      const hop = Math.abs(Math.sin(this.time * 2.6 + v.sw.id * 1.3)) * 0.04 * lively;
      const s = 1 + v.pop * 0.25;
      v.token.position.copy(v.center).setY(BUTTON_Y + hop);
      v.token.quaternion.copy(camera.quaternion).multiply(roll.setFromAxisAngle(z, v.angle));
      v.token.scale.setScalar(s);
      if (v.badge) {
        v.badge.position.copy(v.center).setY(BUTTON_Y + hop).addScaledVector(right, 0.21).addScaledVector(up, 0.21);
        v.badge.quaternion.copy(camera.quaternion);
        v.badge.scale.setScalar(s);
      }
    }
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const p = new THREE.Vector3();
    const one = new THREE.Vector3(5.5, 5.5, 5.5);
    let k = 0;
    for (const { mesh, spots } of this.toyMarkers) {
      spots.forEach((at, i) => {
        q.setFromEuler(new THREE.Euler(0.35, this.time * 0.9 * lively + (k + i) * 1.7, 0));
        p.copy(at).setY(at.y + Math.abs(Math.sin(this.time * 2.3 + k + i)) * 0.06 * lively);
        mesh.setMatrixAt(i, m.compose(p, q, one));
      });
      k += spots.length;
      mesh.instanceMatrix.needsUpdate = true;
    }
    if (this.failMark.visible) this.failMark.position.y = 0.9 + Math.abs(Math.sin(this.time * 5)) * 0.12 * lively;
    this.props.update(dt, this.time);
  }

  dispose(): void {
    this.track.dispose();
    this.props.dispose();
    for (const v of this.switches) {
      v.token.geometry.dispose();
      v.badge?.geometry.dispose();
    }
    for (const d of this.disposables) d.dispose();
  }

  // -------------------------------------------------------------------------------------------

  private buildSwitch(sw: YardSwitch, mat: THREE.Material): SwitchView {
    const level = this.level;
    const c = sw.tile % level.cols;
    const r = Math.floor(sw.tile / level.cols);
    const center = this.tileCenter(sw.tile);
    const dirs: THREE.Vector3[] = [];
    const chevrons: SwitchView['chevrons'] = [];
    for (const b of sw.branches) {
      const len = b === opposite(sw.stem) ? 1 : Math.PI / 4;
      const pt = lanePoint(c, r, sw.stem, b, len * 0.62);
      chevrons.push({ x: pt.x - level.cols / 2, z: pt.y - level.rows / 2, yaw: -pt.heading });
      const a = edgeMid(c, r, sw.stem);
      const e = edgeMid(c, r, b);
      dirs.push(new THREE.Vector3(e.x - a.x, 0, e.y - a.y).normalize());
    }
    const tb = new MeshBuilder();
    tb.disc(BUTTON_D / 2, 0.06, '#3b2a20', 0, -0.012, -0.03, 0.02);
    tb.disc(BUTTON_D / 2 - 0.035, 0.07, sw.kind === 'alternating' ? '#ffe9a8' : '#ffd23f', 0, 0, 0, 0.025);
    tb.icon('arrow', 0.32, 0, 0, 0.07, 0.035, '#3b2a20');
    const token = new THREE.Mesh(tb.build(), mat);
    token.castShadow = true;
    this.group.add(token);
    let badge: THREE.Mesh | null = null;
    if (sw.kind !== 'manual') {
      const bb = new MeshBuilder();
      const color = sw.kind === 'alternating' ? '#ffffff' : (GROUP_COLORS[this.groupIndex(sw)] as string);
      bb.disc(0.12, 0.04, '#3b2a20', 0, 0, 0.08, 0.01, 'low');
      bb.disc(0.1, 0.045, color, 0, 0, 0.09, 0.01, 'low');
      if (sw.kind === 'alternating') bb.icon('swap', 0.15, 0, 0, 0.14, 0.02, '#3b2a20');
      else bb.text(sw.kind === 'linked' ? '=' : 'T', { size: 0.13, depth: 0.02 }, 0, 0, 0.14, '#ffffff');
      badge = new THREE.Mesh(bb.build(), mat);
      this.group.add(badge);
    }
    return { sw, center, token, badge, dirs, chevrons, state: sw.initial, angle: 0, pop: 0 };
  }

  /** Linked group or trigger plate index for colors. */
  groupIndex(sw: YardSwitch): number {
    if (sw.kind === 'linked') {
      const groups = [...new Set(this.level.switches.filter((s) => s.kind === 'linked').map((s) => s.group))];
      return groups.indexOf(sw.group) % GROUP_COLORS.length;
    }
    const plate = this.level.plates.findIndex((p) => p.switches.includes(sw.id));
    return (Math.max(0, plate) + 2) % GROUP_COLORS.length;
  }

  private addBuffers(batch: GeoBatch): void {
    for (const p of this.level.pieces) {
      if (p.kind !== 'buffer') continue;
      const c = this.tileCenter(p.tile);
      const back = opposite(p.a as Dir);
      const x = c.x + (DX[back] as number) * 0.32;
      const z = c.z + (DY[back] as number) * 0.32;
      const yaw = -Math.atan2(DY[back] as number, DX[back] as number);
      batch.box(0.1, 0.18, 0.4, '#e8574a', x, 0.11, z, yaw);
      batch.box(0.12, 0.05, 0.44, '#3b2a20', x, 0.22, z, yaw);
    }
  }

  private addDepot(batch: GeoBatch, signs: SignSpec[]): void {
    const [a, b] = this.level.depot.tiles.map((t) => this.tileCenter(t)) as [THREE.Vector3, THREE.Vector3];
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const along = b.clone().sub(a).normalize();
    const side = new THREE.Vector3(-along.z, 0, along.x);
    const yaw = -Math.atan2(along.z, along.x);
    const plat = mid.clone().addScaledVector(side, 0.36);
    batch.box(1.9, 0.1, 0.2, '#b07a46', plat.x, 0.05, plat.z, yaw);
    signs.push({ text: 'DEPOT', bg: '#c4473a', fg: '#fff6e6', position: mid.clone().addScaledVector(side, 0.5).setY(0.45), size: 0.13 });
  }

  private addStation(batch: GeoBatch, signs: SignSpec[], markers: { type: ToyType; position: THREE.Vector3 }[]): void {
    const st = this.level.station;
    const along = new THREE.Vector3(DX[st.dir] as number, 0, DY[st.dir] as number);
    const yaw = -Math.atan2(along.z, along.x);
    const first = this.tileCenter(st.tiles[0] as number);
    const last = this.tileCenter(st.buffer);
    const center = first.clone().add(last).multiplyScalar(0.5);
    const toward = this.tileCenter(st.buildingTiles[0] as number).sub(first).normalize();
    const len = st.tiles.length;
    const at = (k: number) => center.clone().addScaledVector(toward, k);
    const plat = at(0.36);
    batch.box(len, 0.1, 0.24, '#d8c3a5', plat.x, 0.05, plat.z, yaw);
    const hall = at(0.95);
    batch.box(len - 0.06, 0.56, 0.62, '#fbe3c2', hall.x, 0.28, hall.z, yaw);
    batch.box(len + 0.04, 0.07, 0.74, '#e8574a', hall.x, 0.6, hall.z, yaw);
    signs.push({ text: 'TOY STATION', bg: '#e8574a', fg: '#fff6e6', position: at(0.95).setY(1.0), size: 0.16 });
    // One chute per wanted wagon, from the buffer outward (FR-103).
    this.level.goal.forEach((toy, k) => {
      const tile = st.tiles[st.tiles.length - 1 - k];
      if (tile === undefined) return;
      const p = this.tileCenter(tile);
      this.chutes.push(p.clone());
      const bin = p.clone().addScaledVector(toward, 0.62);
      batch.box(0.4, 0.2, 0.22, toy ? TOY_COLORS[toy] : '#c9bba7', bin.x, 0.3, bin.z, yaw);
      batch.box(0.32, 0.03, 0.14, '#2a1d14', bin.x, 0.41, bin.z, yaw);
      if (toy) markers.push({ type: toy, position: bin.clone().setY(0.82) });
      signs.push({ text: String(k + 1), bg: '#3b2a20', fg: '#fff6e6', position: p.clone().addScaledVector(toward, 0.48).setY(0.33), size: 0.12 });
    });
  }

  private addFactories(batch: GeoBatch, signs: SignSpec[], markers: { type: ToyType; position: THREE.Vector3 }[]): void {
    for (const f of this.level.factories) {
      const look = FACTORY_LOOK[f.kind] as { wall: string; sign: string };
      const t = this.tileCenter(f.tile);
      const bpos = this.tileCenter(f.building);
      const toT = t.clone().sub(bpos).normalize();
      const houseYaw = -Math.atan2(toT.z, toT.x);
      const roofToy = f.toy ?? f.to ?? f.from;
      const roof = roofToy ? shade(TOY_COLORS[roofToy], -10) : '#8fb7c9';
      batch.box(0.6, 0.48, 0.62, look.wall, bpos.x, 0.24, bpos.z, houseYaw);
      batch.box(0.66, 0.08, 0.68, roof, bpos.x, 0.52, bpos.z, houseYaw);
      // Arm and hopper over the track.
      const armMid = bpos.clone().lerp(t, 0.55).setY(0.78);
      batch.box(0.1, 0.08, 0.1, '#7a4a26', armMid.x, armMid.y, armMid.z);
      batch.add(new THREE.BoxGeometry(bpos.distanceTo(t), 0.06, 0.08), '#7a4a26', new THREE.Matrix4().makeRotationY(houseYaw).setPosition((bpos.x + t.x) / 2, 0.8, (bpos.z + t.z) / 2));
      batch.box(0.36, 0.18, 0.36, roofToy ? TOY_COLORS[roofToy] : '#bfe0f2', t.x, 0.72, t.z, houseYaw);
      batch.box(0.26, 0.03, 0.26, '#2a1d14', t.x, 0.625, t.z, houseYaw);
      if (f.kind === 'washer') for (let i = 0; i < 3; i++) batch.sphere(0.07 + i * 0.02, '#ffffff', bpos.x - 0.15 + i * 0.15, 0.68 + i * 0.05, bpos.z, 1, 1, 1, 8);
      signs.push({ text: look.sign, bg: '#fff6e6', fg: '#3b2a20', position: bpos.clone().setY(0.95), size: 0.17 });
      if (f.kind === 'loader' || f.kind === 'single') markers.push({ type: f.toy as ToyType, position: bpos.clone().setY(1.38) });
      else if (f.kind === 'converter' || f.kind === 'swap') {
        const side = new THREE.Vector3(Math.cos(-houseYaw + Math.PI / 2), 0, Math.sin(-houseYaw + Math.PI / 2)).multiplyScalar(0.24);
        markers.push({ type: f.from as ToyType, position: bpos.clone().sub(side).setY(1.36) });
        markers.push({ type: f.to as ToyType, position: bpos.clone().add(side).setY(1.36) });
      }
    }
  }

  private addPlates(batch: GeoBatch): void {
    this.level.plates.forEach((p, i) => {
      const c = this.tileCenter(p.tile);
      const color = GROUP_COLORS[(i + 2) % GROUP_COLORS.length] as string;
      batch.cylinder(0.2, 0.22, 0.03, '#3b2a20', c.x, BED_HEIGHT + RAIL_HEIGHT + 0.005, c.z, 20);
      batch.cylinder(0.16, 0.16, 0.035, color, c.x, BED_HEIGHT + RAIL_HEIGHT + 0.01, c.z, 20);
    });
  }

  private buildSigns(signs: SignSpec[]): void {
    if (!signs.length) return;
    const lean = new THREE.Quaternion().setFromEuler(new THREE.Euler(SIGN_LEAN, 0, 0));
    const geos = signs.map((s, i) => signGeometry(s, new THREE.Matrix4().compose(s.position, lean, new THREE.Vector3(1, 1, 1)), i * 1.3));
    const merged = mergeGeometries(geos, false);
    for (const g of geos) g.dispose();
    if (!merged) return;
    const mesh = new THREE.Mesh(merged, this.own(wigglyWorldMaterial(0.55)));
    mesh.castShadow = true;
    mesh.customDepthMaterial = this.own(makeWiggly(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking })));
    this.disposables.push(merged);
    this.group.add(mesh);
  }

  private buildToyMarkers(markers: { type: ToyType; position: THREE.Vector3 }[]): void {
    const byType = new Map<ToyType, THREE.Vector3[]>();
    for (const m of markers) byType.set(m.type, [...(byType.get(m.type) ?? []), m.position]);
    const mat = this.own(vertexColorMaterial(0.5));
    for (const [type, spots] of byType) {
      const geo = toyGeometry(type);
      const mesh = new THREE.InstancedMesh(geo, mat, spots.length);
      mesh.castShadow = true;
      mesh.frustumCulled = false;
      this.disposables.push(geo, mesh);
      this.toyMarkers.push({ mesh, spots });
      this.group.add(mesh);
    }
  }

  private outsideProps(): { prop: PropDef; at: THREE.Vector3 }[] {
    const { cols, rows } = this.level;
    const rng = new Pcg32(hashSeed(this.level.seed, 'outside'));
    const kinds = OUTSIDE_PROPS[this.theme.id] ?? (OUTSIDE_PROPS.rug as string[]);
    const out: { prop: PropDef; at: THREE.Vector3 }[] = [];
    for (let i = 0; i < 70 && out.length < 40; i++) {
      const x = rng.float(-cols / 2 - 4.5, cols / 2 + 4.5);
      const z = rng.float(-rows / 2 - 4.5, rows / 2 + 4.5);
      if (Math.abs(x) < cols / 2 + 0.6 && Math.abs(z) < rows / 2 + 0.6) continue;
      out.push({ prop: { kind: rng.pick(kinds), tile: -1, rotation: rng.float(0, Math.PI * 2), scale: rng.float(0.9, 1.4), variant: rng.int(0, 3) }, at: new THREE.Vector3(x, 0, z) });
    }
    return out;
  }
}
