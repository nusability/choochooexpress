// The shunting yard diorama (spec F-014, F-013): biome ground to every screen edge, track built
// from the yard's pieces, buffer stops, switches whose wooden tongue swings to the set branch with
// their kind on its pivot, trigger plates, uncoupler pads and the spots that take them, factories by type, the depot and the Toy Station with
// one chute per wanted wagon.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { lanePoint, opposite } from '../engine/grid';
import { Pcg32, hashSeed } from '../engine/prng';
import type { Dir, Lane, LevelDefinition, ToyType } from '../engine/types';
import { padReach, type YardLevel, type YardSwitch } from '../engine/yard';
import { MeshBuilder } from '../ui/kit/builder';
import { wigglyWorldMaterial } from '../ui/kit/wiggle';
import { GeoBatch, compose, vertexColorMaterial } from './batch';
import { buildDiorama, type Diorama } from './diorama';
import { insideScenes, outsideScenes } from './vignettes';
import type { BiomeTheme } from './biomes';
import { SIGN_LEAN, signGeometry, tileCenter, type SignSpec } from './buildings';
import { GEAR_GEOMETRY, buildYardBuildings, type GearSpot, type ToyMarker, type YardBuildings } from './yardBuildings';
import { buildProps, type PropAnimators } from './props';
import { floorTexture, matTexture, type FloorKind, type TrackLook } from './textures';
import { toyGeometry } from './toyMeshes';
import { TRACK_TOP, buildWoodTrack, type TrackMeshes } from './trackMesh';

/** The play mat under the yard: border beyond the tiles and thickness. */
const MAT_BORDER = 0.7;
const MAT_HEIGHT = 0.016;

interface BiomeLook {
  floor: FloorKind;
  floorTile: number;
  track: TrackLook;
  /** Play-mat border beyond the tiles (the car play rug has a ring road in it). */
  border?: number;
}

/** Generated surfaces per biome (FR-111). */
const LOOKS: Record<string, BiomeLook> = {
  rug: { floor: 'parquet', floorTile: 4, track: { wood: '#e9c08a', groove: '#8a5a2e', edge: '#a06d3d' } },
  candy: { floor: 'gingham', floorTile: 3, track: { wood: '#f9d6e5', groove: '#c2507f', edge: '#d77fa6' } },
  garden: { floor: 'grass', floorTile: 3, track: { wood: '#dcae70', groove: '#6e4520', edge: '#8e5e30' } },
  space: { floor: 'spaceCarpet', floorTile: 4, track: { wood: '#414a8c', groove: '#141a40', edge: '#262d66', glow: true } },
  ice: { floor: 'snow', floorTile: 4, track: { wood: '#eef3f8', groove: '#5b7da8', edge: '#a9c0d6' } },
  village: { floor: 'flock', floorTile: 3, track: { wood: '#8f877a', groove: '#cfd4de', edge: '#5f584e', rails: true } },
  shop: { floor: 'tiles', floorTile: 3, track: { wood: '#e3b97c', groove: '#8a5a2e', edge: '#a06d3d' } },
  roads: { floor: 'carpet', floorTile: 3, track: { wood: '#e9c08a', groove: '#8a5a2e', edge: '#a06d3d' }, border: 1.6 },
};
/** Colors that tell linked groups and trigger plates apart (with a letter badge too, NFR-011). */
export const GROUP_COLORS = ['#e8574a', '#4a90d9', '#9b6ad6', '#5bb36a'];


interface SwitchView {
  sw: YardSwitch;
  center: THREE.Vector3;
  /** Where the tongue turns, near the stem edge. */
  pivot: THREE.Vector3;
  tongue: Stamp;
  badge: Stamp | null;
  /** Tongue yaw for each setting (pointing into that branch). */
  yaws: [number, number];
  state: 0 | 1;
  /** The tongue's current yaw (it swings toward `yaws[state]`). */
  angle: number;
  pop: number;
}

/** The switch tongue (FR-095): from its pivot to the arrow tip, in tile units. */
const TONGUE_LEN = 0.44;
const TONGUE_Y = TRACK_TOP + 0.002;

/** One copy of a shared button model (all copies of a model are one instanced mesh). */
interface Stamp {
  key: string;
  slot: number;
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
  private readonly pads: THREE.InstancedMesh;
  private readonly padSpots: THREE.InstancedMesh;
  private padSpotTiles: number[] = [];
  private readonly props: PropAnimators;
  private readonly disposables: { dispose(): void }[] = [];
  private readonly toyMarkers: { mesh: THREE.InstancedMesh; spots: THREE.Vector3[]; sizes: number[]; anchors: (THREE.Vector3 | null)[] }[] = [];
  private readonly buildings: YardBuildings;
  private readonly gears: { mesh: THREE.InstancedMesh; spots: GearSpot[] } | null;
  private readonly diorama: Diorama;
  /** Play-mat border beyond the tiles. */
  private border = MAT_BORDER;
  /** Cars driving round the car play rug's ring road. */
  private traffic: { mesh: THREE.InstancedMesh; offset: number; speed: number }[] = [];
  /** How far the view is turned: signs (and toys standing on them) turn with it. */
  private readonly turnUniform = { value: 0 };
  /** Chimney tops, for the session's smoke puffs. */
  readonly chimneys: THREE.Vector3[];
  private readonly failMark: THREE.Mesh;
  private time = 0;
  motion = true;
  /** Where each goal slot's chute stands (slot 0 at the station buffer). */
  readonly chutes: THREE.Vector3[] = [];

  constructor(
    private readonly level: YardLevel,
    theme: BiomeTheme,
  ) {
    const { cols, rows } = level;
    const size = Math.max(cols, rows) * 5 + 24;
    // The floor of the room around the play mat (parquet, tablecloth, lawn, space carpet).
    const look = LOOKS[theme.id] ?? (LOOKS.rug as BiomeLook);
    const floorTex = floorTexture(look.floor).clone();
    floorTex.needsUpdate = true;
    floorTex.repeat.set(size / look.floorTile, size / look.floorTile);
    const groundGeo = new THREE.PlaneGeometry(size, size).rotateX(-Math.PI / 2);
    const ground = new THREE.Mesh(groundGeo, this.own(new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.9 })));
    // The room's floor lies below the diorama (FR-116).
    this.diorama = buildDiorama(theme.id, cols + (look.border ?? MAT_BORDER) * 2, rows + (look.border ?? MAT_BORDER) * 2, level.seed);
    this.group.add(this.diorama.group);
    ground.position.y = -this.diorama.depth - 0.002;
    ground.receiveShadow = true;
    this.disposables.push(floorTex, groundGeo);
    this.group.add(ground);
    // The play mat under the yard, drawn for this yard's size.
    this.border = look.border ?? MAT_BORDER;
    const mw = cols + this.border * 2;
    const mh = rows + this.border * 2;
    const matTex = matTexture(theme.id, cols, rows, this.border);
    const matGeo = new THREE.BoxGeometry(mw, MAT_HEIGHT, mh).translate(0, MAT_HEIGHT / 2 - 0.004, 0);
    // One material: the thin sides sample the texture's outer border.
    const playMat = new THREE.Mesh(matGeo, this.own(new THREE.MeshStandardMaterial({ map: matTex, roughness: 0.92 })));
    playMat.receiveShadow = true;
    this.disposables.push(matTex, matGeo);
    this.group.add(playMat);

    const shape = { cols, rows, lanes: yardLanes(level) } as unknown as LevelDefinition;
    this.track = buildWoodTrack(shape, look.track, new Set(level.pieces.filter((pc) => pc.kind === 'crossing').map((pc) => pc.tile)));
    this.group.add(this.track.group);

    // Buildings (station, factories, depot, buffer stops) and the trigger plates.
    this.buildings = buildYardBuildings(level);
    for (const m of this.buildings.meshes) this.group.add(m);
    this.chutes.push(...this.buildings.chutes);
    this.chimneys = this.buildings.chimneys;
    const batch = new GeoBatch();
    this.addPlates(batch);
    const plates = batch.build(this.own(vertexColorMaterial()));
    if (plates) {
      plates.receiveShadow = true;
      this.disposables.push(plates.geometry);
      this.group.add(plates);
    }
    this.buildSigns(this.buildings.signs);
    this.buildToyMarkers(this.buildings.markers);
    this.gears = this.buildGears(this.buildings.gears);

    // Switches: a tongue on the track that swings to the set branch, its kind on the pivot.
    for (const sw of level.switches) this.switches.push(this.buildSwitch(sw));
    // Every tongue and badge model is drawn as one instanced mesh (few draw calls).
    const tokenMat = this.own(vertexColorMaterial(0.4));
    for (const st of this.stamps.values()) {
      st.mesh = new THREE.InstancedMesh(st.geo, tokenMat, st.count);
      st.mesh.frustumCulled = false;
      this.disposables.push(st.geo, st.mesh);
      this.group.add(st.mesh);
    }
    for (const v of this.switches) this.setSwitch(v.sw.id, v.sw.initial, false);

    // Uncoupler pads: hazard-striped discs, hidden until placed.
    const padBatch = new GeoBatch();
    padBatch.cylinder(0.3, 0.3, 0.03, '#2a1d14', 0, 0.015, 0, 24);
    padBatch.cylinder(0.25, 0.25, 0.04, '#ffd23f', 0, 0.02, 0, 24);
    padBatch.box(0.36, 0.045, 0.08, '#2a1d14', 0, 0.025, 0, Math.PI / 4);
    padBatch.box(0.36, 0.045, 0.08, '#2a1d14', 0, 0.025, 0, -Math.PI / 4);
    // A striped post with a diamond sign, tall enough to show above a wagon standing on the pad.
    padBatch.cylinder(0.025, 0.025, 0.8, '#2a1d14', 0, 0.4, 0.26, 8);
    padBatch.add(new THREE.BoxGeometry(0.3, 0.3, 0.05), '#2a1d14', new THREE.Matrix4().makeRotationZ(Math.PI / 4).setPosition(0, 0.86, 0.26));
    padBatch.add(new THREE.BoxGeometry(0.23, 0.23, 0.06), '#ffd23f', new THREE.Matrix4().makeRotationZ(Math.PI / 4).setPosition(0, 0.86, 0.27));
    padBatch.add(new THREE.BoxGeometry(0.26, 0.05, 0.07), '#2a1d14', new THREE.Matrix4().makeRotationZ(Math.PI / 4).setPosition(0, 0.86, 0.28));
    const padGeo = padBatch.buildGeometry() as THREE.BufferGeometry;
    // The open spots that take a pad while planning: a dashed ring on the track (FR-101).
    const spotBatch = new GeoBatch();
    for (let i = 0; i < 8; i++) spotBatch.box(0.1, 0.012, 0.035, '#ffd23f', Math.cos((i / 8) * Math.PI * 2) * 0.2, 0.006, Math.sin((i / 8) * Math.PI * 2) * 0.2, -(i / 8) * Math.PI * 2 + Math.PI / 2);
    const spotGeo = spotBatch.buildGeometry() as THREE.BufferGeometry;
    const spotCount = Math.max(1, padReach(level).size);
    this.padSpots = new THREE.InstancedMesh(spotGeo, this.own(new THREE.MeshStandardMaterial({ vertexColors: true, emissive: '#5a4300', roughness: 0.5 })), spotCount);
    this.padSpots.count = 0;
    this.padSpots.frustumCulled = false;
    this.disposables.push(spotGeo, this.padSpots);
    this.group.add(this.padSpots);
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

    this.props = buildProps({ cols, rows, props: [] } as unknown as LevelDefinition, theme, outsideScenes(level, theme.id, this.border, -this.diorama.depth), insideScenes(level, theme.id));
    this.group.add(this.props.group);
    if (theme.id === 'roads') this.buildTraffic(level.seed);

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

  /** The middle of the track on a tile: on a curve that is off the tile's centre. */
  trackPoint(tile: number): THREE.Vector3 {
    const piece = this.level.pieces.find((pc) => pc.tile === tile);
    if (!piece || piece.kind !== 'track') return this.tileCenter(tile);
    const a = piece.a as Dir;
    const b = piece.b as Dir;
    const len = a === opposite(b) ? 1 : Math.PI / 4;
    const p = lanePoint(tile % this.level.cols, Math.floor(tile / this.level.cols), a, b, len / 2);
    return new THREE.Vector3(p.x - this.level.cols / 2, 0, p.y - this.level.rows / 2);
  }

  /** Tap anchors of a switch: the middle of its tile, on the track. */
  switchAnchors(id: number): THREE.Vector3[] {
    const v = this.switches[id];
    return v ? [v.center.clone().setY(TRACK_TOP)] : [];
  }

  /** The tongue's current yaw (it points along the set branch). */
  switchArrowAngle(id: number): number {
    return this.switches[id]?.angle ?? 0;
  }

  setSwitch(id: number, state: 0 | 1, animate = true): void {
    const v = this.switches[id];
    if (!v) return;
    if (v.state !== state && animate) v.pop = 1;
    v.state = state;
    if (!animate) v.angle = v.yaws[state];
  }

  /** Shows the open pad spots (planning only; none during a run). */
  setPadSpots(tiles: readonly number[]): void {
    this.padSpotTiles = [...tiles];
    this.padSpots.count = tiles.length;
    this.placePadSpots(0);
  }

  private placePadSpots(spin: number): void {
    this.padSpotTiles.forEach((t, i) => {
      const c = this.trackPoint(t);
      this.padSpots.setMatrixAt(i, compose(c.x, TRACK_TOP, c.z, spin));
    });
    this.padSpots.instanceMatrix.needsUpdate = true;
  }

  setPads(tiles: readonly number[]): void {
    this.pads.count = tiles.length;
    tiles.forEach((t, i) => {
      const c = this.trackPoint(t);
      this.pads.setMatrixAt(i, compose(c.x, TRACK_TOP, c.z, 0));
    });
    this.pads.instanceMatrix.needsUpdate = true;
  }

  /** Turns signs (and the toys beside them) to face a view turned by `turn` radians. */
  faceTurn(turn: number): void {
    this.turnUniform.value = turn;
  }

  markFailure(tile: number | null): void {
    this.failMark.visible = tile !== null;
    if (tile !== null) this.failMark.position.copy(this.tileCenter(tile)).setY(0.9);
  }

  update(dt: number, camera: THREE.Camera): void {
    this.time += dt;
    const lively = this.motion ? 1 : 0;
    const sm = new THREE.Matrix4();
    const sp = new THREE.Vector3();
    const sq = new THREE.Quaternion();
    const ss = new THREE.Vector3();
    const yAxis = new THREE.Vector3(0, 1, 0);
    // Badges turn to read upright from wherever the camera looks.
    const look = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 2);
    const facing = Math.atan2(look.x, look.z);
    for (const v of this.switches) {
      let delta = v.yaws[v.state] - v.angle;
      delta = Math.atan2(Math.sin(delta), Math.cos(delta));
      v.angle += this.motion ? delta * Math.min(1, dt * 10) : delta;
      v.pop = Math.max(0, v.pop - dt * 3);
      const lift = Math.sin(v.pop * Math.PI) * 0.06;
      const s = 1 + v.pop * 0.18;
      sp.copy(v.pivot).setY(TONGUE_Y + lift);
      this.placeStamp(v.tongue, sm.compose(sp, sq.setFromAxisAngle(yAxis, v.angle), ss.setScalar(s)));
      if (v.badge) {
        const bob = Math.sin(this.time * 2.4 + v.sw.id * 1.3) * 0.12 * lively;
        sp.copy(v.pivot).setY(TONGUE_Y + 0.07 + lift);
        this.placeStamp(v.badge, sm.compose(sp, sq.setFromAxisAngle(yAxis, facing + bob), ss.setScalar(s)));
      }
    }
    if (this.padSpots.count > 0 && this.motion) this.placePadSpots(this.time * 0.6);
    for (const st of this.stamps.values()) if (st.mesh) st.mesh.instanceMatrix.needsUpdate = true;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const p = new THREE.Vector3();
    const one = new THREE.Vector3();
    let k = 0;
    const turn = this.turnUniform.value;
    for (const { mesh, spots, sizes, anchors } of this.toyMarkers) {
      spots.forEach((at, i) => {
        q.setFromEuler(new THREE.Euler(0.35, this.time * 0.9 * lively + (k + i) * 1.7, 0));
        p.copy(at).setY(at.y + Math.abs(Math.sin(this.time * 2.3 + k + i)) * 0.06 * lively);
        const anchor = anchors[i];
        if (anchor && turn) {
          const dx = p.x - anchor.x;
          const dz = p.z - anchor.z;
          p.x = anchor.x + dx * Math.cos(turn) + dz * Math.sin(turn);
          p.z = anchor.z - dx * Math.sin(turn) + dz * Math.cos(turn);
        }
        const size = sizes[i] ?? 5.5;
        mesh.setMatrixAt(i, m.compose(p, q, one.set(size, size, size)));
      });
      k += spots.length;
      mesh.instanceMatrix.needsUpdate = true;
    }
    if (this.failMark.visible) this.failMark.position.y = 0.9 + Math.abs(Math.sin(this.time * 5)) * 0.12 * lively;
    if (this.gears && lively) this.turnGears(this.gears, this.time);
    if (this.traffic.length && lively) this.driveTraffic(this.time);
    this.props.update(this.motion ? dt : 0, this.time);
  }

  dispose(): void {
    this.track.dispose();
    this.diorama.dispose();
    this.buildings.dispose();
    this.props.dispose();
    for (const d of this.disposables) d.dispose();
  }

  // -------------------------------------------------------------------------------------------

  private readonly stamps = new Map<string, { geo: THREE.BufferGeometry; count: number; mesh?: THREE.InstancedMesh }>();

  /** Reserves a copy of the model `key` (built once by `build`). */
  private stamp(key: string, build: () => THREE.BufferGeometry): Stamp {
    let st = this.stamps.get(key);
    if (!st) {
      st = { geo: build(), count: 0 };
      this.stamps.set(key, st);
    }
    return { key, slot: st.count++ };
  }

  private placeStamp(stamp: Stamp, m: THREE.Matrix4): void {
    this.stamps.get(stamp.key)?.mesh?.setMatrixAt(stamp.slot, m);
  }

  private buildSwitch(sw: YardSwitch): SwitchView {
    const level = this.level;
    const c = sw.tile % level.cols;
    const r = Math.floor(sw.tile / level.cols);
    const center = this.tileCenter(sw.tile);
    const at = (b: Dir, share: number) => {
      const len = b === opposite(sw.stem) ? 1 : Math.PI / 4;
      const pt = lanePoint(c, r, sw.stem, b, len * share);
      return new THREE.Vector3(pt.x - level.cols / 2, 0, pt.y - level.rows / 2);
    };
    // The tongue turns near the stem and points to where each branch has parted from the other.
    const pivot = at(sw.branches[0], 0.12).add(at(sw.branches[1], 0.12)).multiplyScalar(0.5);
    const yawTo = (b: Dir) => {
      const d = at(b, 0.7).sub(pivot);
      return Math.atan2(-d.z, d.x);
    };
    const yaws: [number, number] = [yawTo(sw.branches[0]), yawTo(sw.branches[1])];
    const cap = '#ffd23f';
    const tongue = this.stamp(`tongue:${sw.kind === 'alternating' ? 'striped' : 'plain'}`, () => tongueGeometry(cap, sw.kind === 'alternating'));
    let badge: Stamp | null = null;
    if (sw.kind !== 'manual') {
      const color = sw.kind === 'alternating' ? '#ffffff' : (GROUP_COLORS[this.groupIndex(sw)] as string);
      badge = this.stamp(`badge:${sw.kind}:${color}`, () => {
        const bb = new MeshBuilder();
        bb.disc(0.13, 0.03, '#3b2a20', 0, 0, 0, 0.01, 'low');
        bb.disc(0.105, 0.035, color, 0, 0, 0.01, 0.01, 'low');
        if (sw.kind === 'alternating') bb.icon('swap', 0.15, 0, 0, 0.045, 0.02, '#3b2a20');
        else bb.text(sw.kind === 'linked' ? '=' : 'T', { size: 0.14, depth: 0.02 }, 0, 0, 0.045, '#ffffff');
        // Built facing +Z like the interface; laid flat on the pivot, reading away from the camera.
        return bb.build().rotateX(-Math.PI / 2);
      });
    }
    return { sw, center, pivot, tongue, badge, yaws, state: sw.initial, angle: yaws[sw.initial], pop: 0 };
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

  private addPlates(batch: GeoBatch): void {
    this.level.plates.forEach((p, i) => {
      const c = this.trackPoint(p.tile);
      const color = GROUP_COLORS[(i + 2) % GROUP_COLORS.length] as string;
      batch.cylinder(0.2, 0.22, 0.03, '#3b2a20', c.x, TRACK_TOP + 0.005, c.z, 20);
      batch.cylinder(0.16, 0.16, 0.035, color, c.x, TRACK_TOP + 0.01, c.z, 20);
    });
  }

  private buildSigns(signs: SignSpec[]): void {
    if (!signs.length) return;
    const lean = new THREE.Quaternion().setFromEuler(new THREE.Euler(SIGN_LEAN, 0, 0));
    const geos = signs.map((s, i) => {
      const g = signGeometry(s, new THREE.Matrix4().compose(s.position, lean, new THREE.Vector3(1, 1, 1)), i * 1.3);
      // Each sign turns around its own post to face the camera when the view is twisted.
      const n = g.getAttribute('position').count;
      const anchor = new Float32Array(n * 3);
      for (let k = 0; k < n; k++) anchor.set([s.position.x, s.position.y, s.position.z], k * 3);
      g.setAttribute('aAnchor', new THREE.BufferAttribute(anchor, 3));
      return g;
    });
    const merged = mergeGeometries(geos, false);
    for (const g of geos) g.dispose();
    if (!merged) return;
    const mat = this.own(wigglyWorldMaterial(0.55));
    const wiggle = mat.onBeforeCompile.bind(mat);
    const turn = this.turnUniform;
    mat.onBeforeCompile = (shader, renderer) => {
      wiggle(shader, renderer);
      shader.uniforms.uTurn = turn;
      shader.vertexShader =
        'attribute vec3 aAnchor;\nuniform float uTurn;\n' +
        shader.vertexShader
          .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\nobjectNormal = vec3(objectNormal.x * cos(uTurn) + objectNormal.z * sin(uTurn), objectNormal.y, -objectNormal.x * sin(uTurn) + objectNormal.z * cos(uTurn));')
          .replace(
            '#include <project_vertex>',
            '{ vec2 d = transformed.xz - aAnchor.xz; transformed.xz = aAnchor.xz + vec2(d.x * cos(uTurn) + d.y * sin(uTurn), -d.x * sin(uTurn) + d.y * cos(uTurn)); }\n#include <project_vertex>',
          );
    };
    mat.customProgramCacheKey = () => 'wiggle-turn';
    const mesh = new THREE.Mesh(merged, mat);
    this.disposables.push(merged);
    this.group.add(mesh);
  }

  private buildToyMarkers(markers: ToyMarker[]): void {
    const byType = new Map<ToyType, ToyMarker[]>();
    for (const m of markers) byType.set(m.type, [...(byType.get(m.type) ?? []), m]);
    const mat = this.own(vertexColorMaterial(0.45));
    for (const [type, list] of byType) {
      const geo = toyGeometry(type);
      const mesh = new THREE.InstancedMesh(geo, mat, list.length);
      mesh.frustumCulled = false;
      this.disposables.push(geo, mesh);
      this.toyMarkers.push({ mesh, spots: list.map((m) => m.position), sizes: list.map((m) => m.size ?? 5.5), anchors: list.map((m) => m.anchor ?? null) });
      this.group.add(mesh);
    }
  }

  /** Gears lying on roofs, all one instanced mesh, turned in `update`. */
  private buildGears(spots: GearSpot[]): { mesh: THREE.InstancedMesh; spots: GearSpot[] } | null {
    if (!spots.length) return null;
    const geo = GEAR_GEOMETRY();
    const mesh = new THREE.InstancedMesh(geo, this.own(new THREE.MeshStandardMaterial({ color: '#e7b53a', roughness: 0.35, metalness: 0.5 })), spots.length);
    mesh.frustumCulled = false;
    this.disposables.push(geo, mesh);
    this.group.add(mesh);
    const gears = { mesh, spots };
    this.turnGears(gears, 0);
    return gears;
  }

  /** Little cars, buses and trucks going round the ring road of the car play rug. */
  private buildTraffic(seed: number): void {
    const rng = new Pcg32(hashSeed(seed, 'traffic'));
    const mat = this.own(vertexColorMaterial(0.4));
    const fleet: [ToyType, number, number][] = [['car', 10, 4], ['bus', 12, 1], ['truck', 12, 2]];
    for (const [type, scale, count] of fleet) {
      const geo = toyGeometry(type);
      geo.computeBoundingBox();
      const lift = -(geo.boundingBox as THREE.Box3).min.y * scale + MAT_HEIGHT;
      geo.scale(scale, scale, scale);
      geo.translate(0, lift, 0);
      // Shadowless: they drive on the mat's edge, outside the shadow map.
      const mesh = new THREE.InstancedMesh(geo, mat, count);
      mesh.frustumCulled = false;
      this.disposables.push(geo, mesh);
      this.group.add(mesh);
      for (let i = 0; i < count; i++) this.traffic.push({ mesh, offset: rng.float(0, 1), speed: rng.float(0.035, 0.06) * (rng.chance(0.5) ? 1 : -1) });
    }
    this.driveTraffic(0);
  }

  private driveTraffic(time: number): void {
    const { cols, rows } = this.level;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const one = new THREE.Vector3(1, 1, 1);
    const up = new THREE.Vector3(0, 1, 0);
    const slots = new Map<THREE.InstancedMesh, number>();
    for (const car of this.traffic) {
      // Each direction keeps to its own lane of the ring.
      const lane = car.speed > 0 ? 0.12 : -0.12;
      const hx = cols / 2 + this.border * 0.55 + lane;
      const hz = rows / 2 + this.border * 0.55 + lane;
      const perimeter = 4 * (hx + hz);
      let d = ((((car.offset + time * car.speed) % 1) + 1) % 1) * perimeter;
      let x: number;
      let z: number;
      let dirX: number;
      let dirZ: number;
      if (d < 2 * hx) [x, z, dirX, dirZ] = [-hx + d, -hz, 1, 0];
      else if ((d -= 2 * hx) < 2 * hz) [x, z, dirX, dirZ] = [hx, -hz + d, 0, 1];
      else if ((d -= 2 * hz) < 2 * hx) [x, z, dirX, dirZ] = [hx - d, hz, -1, 0];
      else [x, z, dirX, dirZ] = [-hx, hz - (d - 2 * hx), 0, -1];
      if (car.speed < 0) {
        dirX = -dirX;
        dirZ = -dirZ;
      }
      q.setFromAxisAngle(up, Math.atan2(-dirZ, dirX));
      const k = slots.get(car.mesh) ?? 0;
      slots.set(car.mesh, k + 1);
      car.mesh.setMatrixAt(k, m.compose(new THREE.Vector3(x, 0, z), q, one));
    }
    for (const mesh of slots.keys()) mesh.instanceMatrix.needsUpdate = true;
  }

  private turnGears(g: { mesh: THREE.InstancedMesh; spots: GearSpot[] }, time: number): void {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    g.spots.forEach((s, i) => {
      q.setFromAxisAngle(up, time * s.speed);
      g.mesh.setMatrixAt(i, m.compose(s.position, q, new THREE.Vector3(s.radius, s.radius, s.radius)));
    });
    g.mesh.instanceMatrix.needsUpdate = true;
  }

}

/**
 * The switch tongue (FR-095): a chunky wooden arrow lying on the track, pointing along +X from its
 * pivot hub at the origin, dark-edged so it reads on every track color. The alternating switch's
 * tongue is striped.
 */
function tongueGeometry(cap: string, striped: boolean): THREE.BufferGeometry {
  const arrow = (shaft: number, head: number, len: number, back: number) => {
    const s = new THREE.Shape();
    const neck = len - head * 0.8;
    s.moveTo(-back, -shaft / 2);
    s.lineTo(neck, -shaft / 2);
    s.lineTo(neck, -head / 2);
    s.lineTo(len, 0);
    s.lineTo(neck, head / 2);
    s.lineTo(neck, shaft / 2);
    s.lineTo(-back, shaft / 2);
    s.closePath();
    return s;
  };
  const b = new GeoBatch();
  const slab = (shape: THREE.Shape, depth: number, y: number, color: string) =>
    b.add(new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false }).rotateX(-Math.PI / 2).translate(0, y, 0), color);
  slab(arrow(0.18, 0.34, TONGUE_LEN + 0.035, 0.03), 0.03, 0, '#3b2a20');
  slab(arrow(0.12, 0.26, TONGUE_LEN, 0), 0.05, 0, cap);
  if (striped) for (const x of [0.13, 0.25]) b.box(0.04, 0.012, 0.125, '#3b2a20', x, 0.05, 0);
  b.cylinder(0.12, 0.12, 0.05, '#3b2a20', 0, 0.025, 0, 20);
  b.cylinder(0.09, 0.09, 0.062, cap, 0, 0.031, 0, 20);
  return b.buildGeometry() as THREE.BufferGeometry;
}
