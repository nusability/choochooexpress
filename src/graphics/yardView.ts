// The shunting yard diorama (spec F-014, F-013): biome ground to every screen edge, track built
// from the yard's pieces, buffer stops, switches with an arrow along the set branch and a badge for
// their kind, trigger plates, uncoupler pads, factories by type, the depot and the Toy Station with
// one chute per wanted wagon.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { edgeMid, lanePoint, opposite } from '../engine/grid';
import { Pcg32, hashSeed } from '../engine/prng';
import type { Dir, Lane, LevelDefinition, PropDef, ToyType } from '../engine/types';
import type { YardLevel, YardSwitch } from '../engine/yard';
import { MeshBuilder } from '../ui/kit/builder';
import { wigglyWorldMaterial } from '../ui/kit/wiggle';
import { GeoBatch, compose, vertexColorMaterial } from './batch';
import type { BiomeTheme } from './biomes';
import { SIGN_LEAN, signGeometry, tileCenter, type SignSpec } from './buildings';
import { GEAR_GEOMETRY, buildYardBuildings, type GearSpot, type ToyMarker, type YardBuildings } from './yardBuildings';
import { buildProps, type PropAnimators } from './props';
import { floorTexture, matTexture, type FloorKind, type TrackLook } from './textures';
import { toyGeometry } from './toyMeshes';
import { TRACK_TOP, buildWoodTrack, chevronGeometry, type TrackMeshes } from './trackMesh';

const SWITCH_Y = TRACK_TOP + 0.012;
/** The play mat under the yard: border beyond the tiles and thickness. */
const MAT_BORDER = 0.7;
const MAT_HEIGHT = 0.016;

interface BiomeLook {
  floor: FloorKind;
  floorTile: number;
  track: TrackLook;
}

/** Generated surfaces per biome (FR-111). */
const LOOKS: Record<string, BiomeLook> = {
  rug: { floor: 'parquet', floorTile: 4, track: { wood: '#e9c08a', groove: '#8a5a2e', edge: '#a06d3d' } },
  candy: { floor: 'gingham', floorTile: 3, track: { wood: '#f9d6e5', groove: '#c2507f', edge: '#d77fa6' } },
  garden: { floor: 'grass', floorTile: 3, track: { wood: '#dcae70', groove: '#6e4520', edge: '#8e5e30' } },
  space: { floor: 'spaceCarpet', floorTile: 4, track: { wood: '#414a8c', groove: '#141a40', edge: '#262d66', glow: true } },
};
const BUTTON_Y = 0.62;
const BUTTON_D = 0.54;
/** Colors that tell linked groups and trigger plates apart (with a letter badge too, NFR-011). */
export const GROUP_COLORS = ['#e8574a', '#4a90d9', '#9b6ad6', '#5bb36a'];

const OUTSIDE_PROPS: Record<string, readonly string[]> = {
  rug: ['pillow', 'book', 'ball', 'teddy', 'crayons', 'drum', 'top', 'block'],
  candy: ['lollipop', 'cupcake', 'donut', 'candyCane', 'marshmallow', 'gumdrop', 'donut'],
  garden: ['dune', 'bucket', 'spade', 'windmill', 'flowers', 'mushroom', 'ball'],
  space: ['planet', 'rocket', 'starSticker', 'ufo', 'planet', 'crater'],
};

/** Real-life size of each prop (scale on its model; radius and height in units of ~10 cm). */
const PROP_SIZE: Record<string, { real: number; r: number; h: number }> = {
  pillow: { real: 5, r: 2, h: 0.9 },
  teddy: { real: 4, r: 1.2, h: 3 },
  book: { real: 4.6, r: 1.5, h: 1.2 },
  ball: { real: 8, r: 1.9, h: 3.8 },
  drum: { real: 7, r: 1.6, h: 2.3 },
  crayons: { real: 2, r: 0.6, h: 0.15 },
  top: { real: 3, r: 0.6, h: 1.2 },
  block: { real: 1.2, r: 0.5, h: 0.5 },
  lollipop: { real: 2.4, r: 0.6, h: 2 },
  gumdrop: { real: 1.6, r: 0.5, h: 0.35 },
  marshmallow: { real: 2.2, r: 0.7, h: 0.6 },
  cupcake: { real: 3, r: 0.6, h: 1.4 },
  donut: { real: 3.2, r: 0.9, h: 0.5 },
  candyCane: { real: 2.6, r: 0.5, h: 1.8 },
  dune: { real: 4, r: 1.4, h: 2.2 },
  bucket: { real: 5, r: 0.9, h: 1.6 },
  spade: { real: 4, r: 1.2, h: 0.2 },
  windmill: { real: 3.5, r: 0.5, h: 3.2 },
  flowers: { real: 4, r: 0.8, h: 1.5 },
  mushroom: { real: 2.5, r: 0.5, h: 0.8 },
  planet: { real: 3, r: 1.1, h: 1.9 },
  rocket: { real: 4, r: 0.6, h: 3 },
  starSticker: { real: 3, r: 0.8, h: 0.05 },
  crater: { real: 3, r: 0.8, h: 0.1 },
  ufo: { real: 4, r: 1.2, h: 2.6 },
};

/** On the mat, between the tracks, only small things fit: what the generator's props become. */
const INSIDE_PROPS: Record<string, Record<string, string>> = {
  rug: { pillow: 'crayons', block: 'block', book: 'top', ball: 'block' },
  candy: { lollipop: 'donut' },
  garden: { dune: 'flowers', bucket: 'mushroom', spade: 'flowers', windmill: 'mushroom' },
  space: { rocket: 'crater' },
};
const INSIDE_SCALE: Record<string, number> = { crayons: 1.6, block: 1.1, top: 2, gumdrop: 0.8, marshmallow: 1, cupcake: 1.4, donut: 1.6, flowers: 2, mushroom: 2, planet: 1.2, starSticker: 1.5, crater: 1.8 };


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
  private readonly toyMarkers: { mesh: THREE.InstancedMesh; spots: THREE.Vector3[]; sizes: number[]; anchors: (THREE.Vector3 | null)[] }[] = [];
  private readonly buildings: YardBuildings;
  private readonly gears: { mesh: THREE.InstancedMesh; spots: GearSpot[] } | null;
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
    private readonly theme: BiomeTheme,
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
    ground.position.y = -0.002;
    ground.receiveShadow = true;
    this.disposables.push(floorTex, groundGeo);
    this.group.add(ground);
    // The play mat under the yard, drawn for this yard's size.
    const mw = cols + MAT_BORDER * 2;
    const mh = rows + MAT_BORDER * 2;
    const matTex = matTexture(theme.id, cols, rows, MAT_BORDER);
    const matGeo = new THREE.BoxGeometry(mw, MAT_HEIGHT, mh).translate(0, MAT_HEIGHT / 2 - 0.004, 0);
    // One material: the thin sides sample the texture's outer border.
    const playMat = new THREE.Mesh(matGeo, this.own(new THREE.MeshStandardMaterial({ map: matTex, roughness: 0.92 })));
    playMat.receiveShadow = true;
    this.disposables.push(matTex, matGeo);
    this.group.add(playMat);

    const shape = { cols, rows, lanes: yardLanes(level) } as unknown as LevelDefinition;
    this.track = buildWoodTrack(shape, look.track);
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
    // A striped post with a diamond sign, tall enough to show above a wagon standing on the pad.
    padBatch.cylinder(0.025, 0.025, 0.8, '#2a1d14', 0, 0.4, 0.26, 8);
    padBatch.add(new THREE.BoxGeometry(0.3, 0.3, 0.05), '#2a1d14', new THREE.Matrix4().makeRotationZ(Math.PI / 4).setPosition(0, 0.86, 0.26));
    padBatch.add(new THREE.BoxGeometry(0.23, 0.23, 0.06), '#ffd23f', new THREE.Matrix4().makeRotationZ(Math.PI / 4).setPosition(0, 0.86, 0.27));
    padBatch.add(new THREE.BoxGeometry(0.26, 0.05, 0.07), '#2a1d14', new THREE.Matrix4().makeRotationZ(Math.PI / 4).setPosition(0, 0.86, 0.28));
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

    this.props = buildProps({ cols, rows, props: this.insideProps() } as unknown as LevelDefinition, theme, this.outsideProps());
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
    this.props.update(this.motion ? dt : 0, this.time);
  }

  dispose(): void {
    this.track.dispose();
    this.buildings.dispose();
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

  private addPlates(batch: GeoBatch): void {
    this.level.plates.forEach((p, i) => {
      const c = this.tileCenter(p.tile);
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

  /**
   * Room-sized things around the play mat at their real size next to a wooden train (1 unit is
   * about 10 cm): cushions, drums, teddies, beach balls, buckets, rockets. Kept apart, and low or
   * far enough on the camera's side not to hide the yard.
   */
  private outsideProps(): { prop: PropDef; at: THREE.Vector3; radius: number }[] {
    const { cols, rows } = this.level;
    const rng = new Pcg32(hashSeed(this.level.seed, 'outside'));
    const kinds = OUTSIDE_PROPS[this.theme.id] ?? (OUTSIDE_PROPS.rug as string[]);
    const out: { prop: PropDef; at: THREE.Vector3; radius: number }[] = [];
    const ex = cols / 2 + MAT_BORDER;
    const ez = rows / 2 + MAT_BORDER;
    for (let i = 0; i < 400 && out.length < 20; i++) {
      const kind = rng.pick(kinds);
      const size = PROP_SIZE[kind] ?? { real: 1, r: 0.5, h: 0.5 };
      const vary = rng.float(0.85, 1.15);
      const r = size.r * vary;
      const x = rng.float(-ex - 7, ex + 7);
      const z = rng.float(-ez - 7, ez + 7);
      // Off the mat by at least the prop's radius.
      const gapX = Math.abs(x) - ex;
      const gapZ = Math.abs(z) - ez;
      if (Math.max(gapX, gapZ) < r + 0.15) continue;
      // On the camera's side (toward +z), tall things stand back so they do not cover the yard.
      if (z > 0 && gapZ > 0 && gapX < 0 && gapZ < r + size.h * vary * 0.7) continue;
      if (out.some((o) => Math.hypot(o.at.x - x, o.at.z - z) < o.radius + r + 0.3)) continue;
      out.push({ prop: { kind, tile: -1, rotation: rng.float(0, Math.PI * 2), scale: size.real * vary, variant: rng.int(0, 3) }, at: new THREE.Vector3(x, 0, z), radius: r });
    }
    return out;
  }

  /** The generator's props on free tiles, as small things at their real size (≤ one tile). */
  private insideProps(): PropDef[] {
    const swap = INSIDE_PROPS[this.theme.id] ?? {};
    return this.level.props.map((p) => {
      const kind = swap[p.kind] ?? p.kind;
      return { ...p, kind, scale: p.scale * (INSIDE_SCALE[kind] ?? 1) };
    });
  }

}
