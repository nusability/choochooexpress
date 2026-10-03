// One level's diorama (spec F-001, F-011, F-013): biome ground to every screen edge, track with
// bridges and tunnels, switches with direction arrows, buildings, factory countdown clocks, props
// and lights.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { DX, DY, lanePoint, opposite, turnLeft, turnRight, edgeMid } from '../engine/grid';
import { Pcg32, hashSeed } from '../engine/prng';
import type { Dir, Lane, LevelDefinition, PropDef, ToyType } from '../engine/types';
import { MeshBuilder } from '../ui/kit/builder';
import { makeWiggly, wigglyWorldMaterial } from '../ui/kit/wiggle';
import { GeoBatch, compose, vertexColorMaterial } from './batch';
import type { BiomeTheme } from './biomes';
import { SIGN_LEAN, addDepot, addFactory, addStation, signGeometry, tileCenter, type SignSpec, type StationParts } from './buildings';
import { buildProps, type PropAnimators } from './props';
import { toyGeometry } from './toyMeshes';
import { BED_HEIGHT, RAIL_HEIGHT, addBridges, addTunnels, buildTrack, chevronGeometry, type TrackMeshes } from './trackMesh';
import { WAGON_TRIMS } from './trainView';

interface SwitchView {
  id: number;
  center: THREE.Vector3;
  anchor: THREE.Vector3;
  /** Tap anchors: the tile itself and the floating button above it. */
  anchors: THREE.Vector3[];
  /** Center of the floating 3D button. */
  buttonPos: THREE.Vector3;
  /** 0 … 1: how far the button has shrunk away while the train passes under it. */
  busy: number;
  busyTarget: number;
  /** Chevron pose on each of the two lanes. */
  chevrons: { x: number; y: number; z: number; yaw: number }[];
  /** World direction (entry edge → exit edge) of each lane, for the button's arrow (FR-095). */
  dirs: THREE.Vector3[];
  /** Raised blade over the start of each lane; only the set lane's blade is drawn. */
  blades: THREE.BufferGeometry[];
  /** Detached pivots: `lever` stands beside the track, `arm` tilts toward the set lane. */
  lever: THREE.Object3D;
  arm: THREE.Object3D;
  laneSide: [number, number];
  state: 0 | 1;
  /** Smoothed arrow angle on screen. */
  angle: number;
  shake: number;
  pop: number;
}

/**
 * Switch parts drawn for all switches at once (instance i = switch i), so a board costs a few draw
 * calls for its switches instead of several per switch. The floating 3D buttons turn toward the
 * camera every frame (spec FR-060) and their arrow points along the set branch (FR-095).
 */
interface SwitchMeshes {
  buttons: THREE.InstancedMesh;
  chevronOn: THREE.InstancedMesh;
  chevronEdge: THREE.InstancedMesh;
  chevronOff: THREE.InstancedMesh;
  rings: THREE.InstancedMesh;
  bases: THREE.InstancedMesh;
  arms: THREE.InstancedMesh;
  blades: THREE.Mesh;
}

/** Factory countdown clocks (FR-069): a face and a progress ring per factory, facing the camera. */
interface ClockMeshes {
  faces: THREE.InstancedMesh;
  rings: THREE.InstancedMesh;
  progress: THREE.InstancedBufferAttribute;
  positions: THREE.Vector3[];
  values: { progress: number; seconds: number }[];
}

const ACTIVE = new THREE.Color('#ffd23f');
const INACTIVE = new THREE.Color('#d8d2c8');
const SWITCH_Y = BED_HEIGHT + RAIL_HEIGHT + 0.012;
const BUTTON_Y = 0.66;
/** Diameter of the floating switch button (world units). */
const BUTTON_D = 0.56;
const CLOCK_FILL = new THREE.Color('#ffd23f');
const CLOCK_SOON = new THREE.Color('#ff6b4a');
const scratch = new THREE.Matrix4();
const scratchScale = new THREE.Vector3();
const scratchPos = new THREE.Vector3();
const scratchQuat = new THREE.Quaternion();
const rollQuat = new THREE.Quaternion();
const Z_AXIS = new THREE.Vector3(0, 0, 1);
const camRight = new THREE.Vector3();
const camUp = new THREE.Vector3();

const OUTSIDE_PROPS: Record<string, readonly string[]> = {
  rug: ['pillow', 'block', 'book', 'ball'],
  candy: ['lollipop', 'gumdrop', 'marshmallow', 'cupcake'],
  garden: ['dune', 'bucket', 'spade'],
  space: ['planet', 'rocket', 'starSticker', 'crater'],
};

/** A progress ring: fragments past `aProg` of a full turn (clockwise from the top) are dropped. */
function progressMaterial(): THREE.MeshBasicMaterial {
  const m = new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false });
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', 'attribute float aProg;\nvarying float vProg;\nvarying vec2 vLocal;\n#include <common>')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvProg = aProg;\nvLocal = position.xy;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', 'varying float vProg;\nvarying vec2 vLocal;\n#include <common>')
      .replace('void main() {', 'void main() {\n  float ang = atan(vLocal.x, vLocal.y);\n  if (ang < 0.0) ang += 6.2831853;\n  if (ang > vProg * 6.2831853) discard;');
  };
  m.customProgramCacheKey = () => 'clock-progress';
  return m;
}

export class BoardView {
  readonly group = new THREE.Group();
  readonly sun: THREE.DirectionalLight;
  /** Hopper mouth of each factory (world). */
  readonly hoppers = new Map<number, THREE.Vector3>();
  readonly station: StationParts;
  private readonly track: TrackMeshes;
  private readonly switches: SwitchView[] = [];
  private readonly parts: SwitchMeshes;
  private readonly clocks: ClockMeshes | null;
  private bladesDirty = false;
  private readonly disposables: { dispose(): void }[] = [];
  private readonly props: PropAnimators;
  private planning = true;
  private time = 0;
  private readonly dangerMarkers = new Map<number, THREE.Mesh>();
  /** Turning 3D toys above the factories and the station's chutes, instanced per toy type. */
  private readonly toyMarkers: { mesh: THREE.InstancedMesh; spots: THREE.Vector3[] }[] = [];
  /** Whimsical idle motion; false when the device asks for reduced motion (FR-066). */
  motion = true;

  constructor(
    private readonly def: LevelDefinition,
    private readonly theme: BiomeTheme,
  ) {
    const { cols, rows } = def;
    // Biome ground reaching far past every screen edge (FR-094): no table, no frame.
    const size = Math.max(cols, rows) * 5 + 24;
    const groundTex = theme.baseTop();
    groundTex.wrapS = THREE.RepeatWrapping;
    groundTex.wrapT = THREE.RepeatWrapping;
    groundTex.repeat.set(size / (theme.id === 'rug' ? 8 : 3), size / (theme.id === 'rug' ? 8 : 3));
    this.disposables.push(groundTex);
    const groundGeo = new THREE.PlaneGeometry(size, size).rotateX(-Math.PI / 2);
    const ground = new THREE.Mesh(groundGeo, this.track0(new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.95 })));
    ground.position.y = -0.002;
    ground.receiveShadow = true;
    this.disposables.push(groundGeo);
    this.group.add(ground);

    // Track.
    this.track = buildTrack(def, { bed: theme.trackBed, sleeper: theme.sleeper, rail: theme.rail, railEmissive: theme.railEmissive });
    this.group.add(this.track.group);

    // Buildings, bridges and tunnel hills (one merged mesh) + signs (another).
    const batch = new GeoBatch();
    const signs: SignSpec[] = [];
    addDepot(batch, def, signs);
    this.station = addStation(batch, def, signs, WAGON_TRIMS);
    addBridges(batch, def, theme.pier);
    addTunnels(batch, def, theme.hill);
    const markers: { type: ToyType; position: THREE.Vector3 }[] = [...this.station.toys];
    const clockSpots: THREE.Vector3[] = [];
    for (const factory of def.factories) {
      const parts = addFactory(batch, def, factory, signs);
      this.hoppers.set(factory.id, parts.hopper);
      clockSpots.push(parts.clock);
      markers.push(parts.toy);
    }
    this.buildToyMarkers(markers);
    this.buildSigns(signs);
    const buildingMat = this.track0(vertexColorMaterial());
    const buildings = batch.build(buildingMat);
    if (buildings) {
      buildings.castShadow = true;
      buildings.receiveShadow = true;
      this.group.add(buildings);
      this.disposables.push(buildings.geometry);
    }
    this.clocks = this.buildClocks(clockSpots);

    // Props on free tiles and scattered around the board.
    this.props = buildProps(def, theme, this.outsideProps());
    this.group.add(this.props.group);

    // Switches.
    for (const sw of def.switches) this.switches.push(this.buildSwitch(sw.id));
    this.parts = this.buildSwitchMeshes();
    for (const sw of def.switches) this.setSwitch(sw.id, sw.initial, false);
    this.rebuildBlades();

    // Lights.
    const hemi = new THREE.HemisphereLight(theme.hemiSky, theme.hemiGround, theme.hemiIntensity);
    this.sun = new THREE.DirectionalLight(theme.sunColor, theme.sunIntensity);
    this.sun.position.set(-cols * 0.45, Math.max(cols, rows) * 1.3, rows * 0.55);
    this.sun.target.position.set(0, 0, 0);
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

  private track0<T extends THREE.Material>(m: T): T {
    this.disposables.push(m);
    return m;
  }

  setShadowMapSize(size: number): void {
    this.sun.castShadow = size > 0;
    if (size > 0 && this.sun.shadow.mapSize.x !== size) {
      this.sun.shadow.mapSize.set(size, size);
      this.sun.shadow.map?.dispose();
      this.sun.shadow.map = null;
    }
  }

  /** The track area the overview frames (FR-094: the board spans the screen width). */
  get bounds(): { minX: number; maxX: number; minZ: number; maxZ: number; height: number } {
    return { minX: -this.def.cols / 2 + 0.05, maxX: this.def.cols / 2 - 0.05, minZ: -this.def.rows / 2 + 0.1, maxZ: this.def.rows / 2 - 0.05, height: 0.7 };
  }

  setPlanning(planning: boolean): void {
    this.planning = planning;
  }

  switchAnchor(id: number): THREE.Vector3 {
    return this.switches[id]?.anchor ?? new THREE.Vector3();
  }

  switchAnchors(id: number): readonly THREE.Vector3[] {
    return this.switches[id]?.anchors ?? [];
  }

  /** Screen angle (radians, 0 = right, counter-clockwise) of a switch button's arrow. */
  switchArrowAngle(id: number): number {
    return this.switches[id]?.angle ?? 0;
  }

  setSwitch(id: number, state: 0 | 1, animate = true): void {
    const view = this.switches[id];
    if (!view) return;
    view.state = state;
    const on = view.chevrons[state];
    const off = view.chevrons[1 - state];
    if (on && off) {
      this.parts.chevronOn.setMatrixAt(id, compose(on.x, on.y + 0.006, on.z, on.yaw));
      this.parts.chevronEdge.setMatrixAt(id, compose(on.x, on.y, on.z, on.yaw));
      this.parts.chevronOff.setMatrixAt(id, compose(off.x, off.y, off.z, off.yaw, 0.7));
      this.parts.chevronOn.instanceMatrix.needsUpdate = true;
      this.parts.chevronEdge.instanceMatrix.needsUpdate = true;
      this.parts.chevronOff.instanceMatrix.needsUpdate = true;
    }
    this.bladesDirty = true;
    if (animate) view.pop = 1;
  }

  /** Shrink a switch's floating button while the train passes underneath it. */
  setSwitchBusy(id: number, busy: boolean): void {
    const view = this.switches[id];
    if (view) view.busyTarget = busy ? 1 : 0;
  }

  /** "Locked" feedback: the lever wiggles. */
  shakeSwitch(id: number): void {
    const view = this.switches[id];
    if (view) view.shake = 1;
  }

  /** A factory's countdown (FR-069): fraction of the period gone and seconds to the next drop. */
  setClock(id: number, progress: number, seconds: number): void {
    const v = this.clocks?.values[id];
    if (v) {
      v.progress = progress;
      v.seconds = seconds;
    }
  }

  /** Mark a dangerous pile under a factory (FR-017 cue). */
  markDanger(factoryId: number): void {
    if (this.dangerMarkers.has(factoryId)) return;
    const hopper = this.hoppers.get(factoryId);
    if (!hopper) return;
    const mark = new THREE.Mesh(
      new THREE.ConeGeometry(0.09, 0.16, 3),
      new THREE.MeshStandardMaterial({ color: '#e0533f', emissive: '#e0533f', emissiveIntensity: 0.6 }),
    );
    mark.position.set(hopper.x, hopper.y + 0.42, hopper.z);
    mark.rotation.x = Math.PI;
    this.group.add(mark);
    this.dangerMarkers.set(factoryId, mark);
    this.disposables.push(mark.geometry, mark.material as THREE.Material);
  }

  update(dt: number, camera: THREE.Camera): void {
    this.time += dt;
    if (this.bladesDirty) this.rebuildBlades();
    const { arms, rings, buttons } = this.parts;
    camRight.setFromMatrixColumn(camera.matrixWorld, 0);
    camUp.setFromMatrixColumn(camera.matrixWorld, 1);
    for (const view of this.switches) {
      const targetTilt = view.laneSide[view.state] * 0.55;
      const arm = view.arm;
      const shake = view.shake > 0 ? Math.sin(this.time * 60) * 0.35 * view.shake : 0;
      arm.rotation.x += (targetTilt - arm.rotation.x) * Math.min(1, dt * 14);
      arm.rotation.z = shake;
      view.lever.updateMatrixWorld(true);
      arms.setMatrixAt(view.id, arm.matrixWorld);
      view.shake = Math.max(0, view.shake - dt * 2.5);
      view.pop = Math.max(0, view.pop - dt * 3);
      const ringScale = 1 + view.pop * 0.25;
      rings.setMatrixAt(view.id, scratch.makeScale(ringScale, 1, ringScale).setPosition(view.center.x, SWITCH_Y + 0.01, view.center.z));
      const base = this.planning ? 0.56 + (this.motion ? 0.03 * Math.sin(this.time * 3.2 + view.id) : 0) : 0.5;
      view.busy += (view.busyTarget - view.busy) * Math.min(1, dt * 10);
      const s = (base + view.pop * 0.16 + view.shake * 0.06 * Math.sin(this.time * 50)) * (1 - 0.5 * view.busy);
      const k = s / BUTTON_D;
      // The arrow points along the set branch as seen on screen (FR-095); it swings round on a flip.
      const dir = view.dirs[view.state] as THREE.Vector3;
      const goal = Math.atan2(dir.dot(camUp), dir.dot(camRight));
      let delta = goal - view.angle;
      delta = Math.atan2(Math.sin(delta), Math.cos(delta));
      view.angle += this.motion ? delta * Math.min(1, dt * 12) : delta;
      // The button hops and rocks a little over its switch (FR-067 g), less while the train is under it.
      const lively = this.motion ? 1 - view.busy : 0;
      const hop = Math.abs(Math.sin(this.time * 2.6 + view.id * 1.3)) * 0.05 * lively;
      const roll = Math.sin(this.time * 2.1 + view.id * 2.1) * 0.08 * lively;
      scratchPos.copy(view.buttonPos).setY(view.buttonPos.y + hop);
      scratchQuat.copy(camera.quaternion).multiply(rollQuat.setFromAxisAngle(Z_AXIS, view.angle + roll));
      buttons.setMatrixAt(view.id, scratch.compose(scratchPos, scratchQuat, scratchScale.set(k, k, k)));
    }
    arms.instanceMatrix.needsUpdate = true;
    rings.instanceMatrix.needsUpdate = true;
    buttons.instanceMatrix.needsUpdate = true;
    const lively = this.motion ? 1 : 0;
    let n = 0;
    for (const { mesh, spots } of this.toyMarkers) {
      spots.forEach((p, i) => {
        const j = n + i;
        scratchQuat.setFromEuler(new THREE.Euler(0.35, this.time * 0.9 * lively + j * 1.7, 0));
        scratchPos.copy(p).setY(p.y + Math.abs(Math.sin(this.time * 2.3 + j)) * 0.07 * lively);
        mesh.setMatrixAt(i, scratch.compose(scratchPos, scratchQuat, scratchScale.set(6, 6, 6)));
      });
      n += spots.length;
      mesh.instanceMatrix.needsUpdate = true;
    }
    if (this.clocks) this.updateClocks(camera);
    (rings.material as THREE.MeshBasicMaterial).opacity = this.planning ? (this.motion ? 0.28 + 0.22 * Math.sin(this.time * 3.2) : 0.4) : 0.12;
    for (const mark of this.dangerMarkers.values()) mark.position.y = 1.06 + Math.sin(this.time * 5) * 0.04 * lively;
    this.props.update(dt, this.time);
  }

  dispose(): void {
    this.track.dispose();
    this.props.dispose();
    for (const d of this.disposables) d.dispose();
  }

  private updateClocks(camera: THREE.Camera): void {
    const c = this.clocks as ClockMeshes;
    c.positions.forEach((p, i) => {
      const v = c.values[i] as { progress: number; seconds: number };
      const soon = v.seconds <= 1;
      // The clock swells in its last second (not with reduced motion).
      const pulse = soon && this.motion ? 1 + 0.12 * Math.abs(Math.sin(this.time * 9)) : 1;
      scratch.compose(p, camera.quaternion, scratchScale.set(pulse, pulse, pulse));
      c.faces.setMatrixAt(i, scratch);
      c.rings.setMatrixAt(i, scratch);
      c.progress.setX(i, Math.max(0.001, v.progress));
      c.rings.setColorAt(i, soon ? CLOCK_SOON : CLOCK_FILL);
    });
    c.faces.instanceMatrix.needsUpdate = true;
    c.rings.instanceMatrix.needsUpdate = true;
    c.progress.needsUpdate = true;
    if (c.rings.instanceColor) c.rings.instanceColor.needsUpdate = true;
  }

  private buildClocks(spots: THREE.Vector3[]): ClockMeshes | null {
    if (spots.length === 0) return null;
    const face = new GeoBatch();
    face.add(new THREE.CircleGeometry(0.25, 32), '#3b2a20', new THREE.Matrix4().makeTranslation(0, 0, -0.004));
    face.add(new THREE.CircleGeometry(0.205, 32), '#fff6e6');
    const faceGeo = face.buildGeometry() as THREE.BufferGeometry;
    const faceMat = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
    const faces = new THREE.InstancedMesh(faceGeo, faceMat, spots.length);
    const ringGeo = new THREE.RingGeometry(0.07, 0.19, 40, 1);
    const progress = new THREE.InstancedBufferAttribute(new Float32Array(spots.length), 1);
    ringGeo.setAttribute('aProg', progress);
    const ringMat = progressMaterial();
    const rings = new THREE.InstancedMesh(ringGeo, ringMat, spots.length);
    rings.setColorAt(0, CLOCK_FILL);
    for (const mesh of [faces, rings]) {
      mesh.frustumCulled = false;
      this.group.add(mesh);
    }
    rings.renderOrder = 2;
    this.disposables.push(faceGeo, faceMat, faces, ringGeo, ringMat, rings);
    return { faces, rings, progress, positions: spots, values: spots.map(() => ({ progress: 0, seconds: 99 })) };
  }

  private buildToyMarkers(markers: { type: ToyType; position: THREE.Vector3 }[]): void {
    const byType = new Map<ToyType, THREE.Vector3[]>();
    for (const m of markers) {
      const list = byType.get(m.type) ?? [];
      list.push(m.position);
      byType.set(m.type, list);
    }
    const mat = this.track0(vertexColorMaterial(0.5));
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

  /** All signs in one mesh; each sways around its foot in the shader while its letters hop. */
  private buildSigns(signs: SignSpec[]): void {
    if (signs.length === 0) return;
    const lean = new THREE.Quaternion().setFromEuler(new THREE.Euler(SIGN_LEAN, 0, 0));
    const geos = signs.map((spec, i) => signGeometry(spec, new THREE.Matrix4().compose(spec.position, lean, new THREE.Vector3(1, 1, 1)), i * 1.3));
    const merged = mergeGeometries(geos, false);
    for (const g of geos) g.dispose();
    if (!merged) return;
    const mesh = new THREE.Mesh(merged, this.track0(wigglyWorldMaterial(0.55)));
    mesh.castShadow = true;
    mesh.customDepthMaterial = this.track0(makeWiggly(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking })));
    this.disposables.push(merged);
    this.group.add(mesh);
  }

  /** Props scattered on the ground around the board, so the world reaches past the screen. */
  private outsideProps(): { prop: PropDef; at: THREE.Vector3 }[] {
    const { cols, rows } = this.def;
    const rng = new Pcg32(hashSeed(this.def.seed, 'outside'));
    const kinds = OUTSIDE_PROPS[this.theme.id] ?? (OUTSIDE_PROPS.rug as string[]);
    const out: { prop: PropDef; at: THREE.Vector3 }[] = [];
    const margin = 4.5;
    for (let i = 0; i < 70 && out.length < 40; i++) {
      const x = rng.float(-cols / 2 - margin, cols / 2 + margin);
      const z = rng.float(-rows / 2 - margin, rows / 2 + margin);
      if (Math.abs(x) < cols / 2 + 0.6 && Math.abs(z) < rows / 2 + 0.6) continue;
      out.push({
        prop: { kind: rng.pick(kinds), tile: -1, rotation: rng.float(0, Math.PI * 2), scale: rng.float(0.9, 1.4), variant: rng.int(0, 3) },
        at: new THREE.Vector3(x, 0, z),
      });
    }
    return out;
  }

  private buildSwitch(id: number): SwitchView {
    const def = this.def;
    const sw = def.switches[id];
    if (!sw) throw new Error(`switch ${id}`);
    const center = tileCenter(def, sw.tile);
    const lanes = sw.lanes.map((l) => def.lanes[l] as Lane);
    const from = (lanes[0] as Lane).from;
    const travel = opposite(from);
    const lateral = (d: Dir) => (d === turnLeft(travel) ? -1 : d === turnRight(travel) ? 1 : 0);
    const laneSide: [number, number] = [lateral((lanes[0] as Lane).to), lateral((lanes[1] as Lane).to)];
    const chevrons: SwitchView['chevrons'] = [];
    const blades: THREE.BufferGeometry[] = [];
    const dirs: THREE.Vector3[] = [];
    lanes.forEach((lane) => {
      const c = lane.tile % def.cols;
      const r = Math.floor(lane.tile / def.cols);
      const p = lanePoint(c, r, lane.from, lane.to, lane.length * 0.6);
      chevrons.push({ x: p.x - def.cols / 2, y: SWITCH_Y, z: p.y - def.rows / 2, yaw: -p.heading });
      const a = edgeMid(c, r, lane.from);
      const b = edgeMid(c, r, lane.to);
      dirs.push(new THREE.Vector3(b.x - a.x, 0, b.y - a.y).normalize());
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 6; i++) {
        const q = lanePoint(c, r, lane.from, lane.to, lane.length * (0.04 + 0.4 * (i / 6)));
        pts.push(new THREE.Vector3(q.x - def.cols / 2, SWITCH_Y + 0.004, q.y - def.rows / 2));
      }
      blades.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.022, 6, false));
    });
    // Lever on the free side of the tile, near the entry edge.
    let leverSide = 1;
    if (laneSide.includes(1) && !laneSide.includes(-1)) leverSide = -1;
    const lever = new THREE.Object3D();
    const back = { x: -(DX[travel] as number) * 0.24, z: -(DY[travel] as number) * 0.24 };
    const latDir = turnRight(travel);
    const lat = { x: (DX[latDir] as number) * 0.36 * leverSide, z: (DY[latDir] as number) * 0.36 * leverSide };
    lever.position.set(center.x + back.x + lat.x, 0.02, center.z + back.z + lat.z);
    lever.rotation.order = 'YXZ';
    lever.rotation.y = -Math.atan2(DY[travel] as number, DX[travel] as number);
    const arm = new THREE.Object3D();
    lever.add(arm);
    this.disposables.push(...blades);
    return {
      id,
      center,
      anchor: new THREE.Vector3(center.x, 0.06, center.z),
      anchors: [new THREE.Vector3(center.x, 0.06, center.z), new THREE.Vector3(center.x, BUTTON_Y, center.z)],
      buttonPos: new THREE.Vector3(center.x, BUTTON_Y, center.z),
      busy: 0,
      busyTarget: 0,
      chevrons,
      dirs,
      blades,
      lever,
      arm,
      laneSide,
      state: sw.initial,
      angle: 0,
      shake: 0,
      pop: 0,
    };
  }

  private buildSwitchMeshes(): SwitchMeshes {
    const n = this.switches.length;
    const instanced = (geometry: THREE.BufferGeometry, material: THREE.Material, renderOrder = 0) => {
      const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, n));
      mesh.count = n;
      mesh.frustumCulled = false;
      mesh.renderOrder = renderOrder;
      this.disposables.push(geometry, material, mesh);
      this.group.add(mesh);
      return mesh;
    };
    // Big, dark-edged chevrons on the set branch; a small grey one on the other (FR-095).
    const chevronOn = instanced(chevronGeometry(0.42, 0.02), new THREE.MeshStandardMaterial({ color: ACTIVE, emissive: ACTIVE.clone().multiplyScalar(0.5), roughness: 0.4 }));
    const chevronEdge = instanced(chevronGeometry(0.56, 0.016).translate(-0.04, 0, 0), new THREE.MeshStandardMaterial({ color: '#2a1d14', roughness: 0.6 }));
    const chevronOff = instanced(chevronGeometry(0.3, 0.012), new THREE.MeshStandardMaterial({ color: INACTIVE, transparent: true, opacity: 0.55, roughness: 0.5 }));
    // Pulsing tap rings.
    const rings = instanced(
      new THREE.RingGeometry(0.36, 0.45, 32).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: this.theme.accent, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide }),
      1,
    );
    // Lever bases stand still; lever arms (post and knob) tilt toward the set lane.
    const bases = instanced(new THREE.BoxGeometry(0.12, 0.05, 0.12), new THREE.MeshStandardMaterial({ color: '#7a4a26' }));
    const armBatch = new GeoBatch();
    armBatch.cylinder(0.018, 0.022, 0.26, '#d9d9e0', 0, 0.13, 0, 8);
    armBatch.sphere(0.05, this.theme.accent, 0, 0.27, 0, 1, 1, 1, 12);
    const arms = instanced(armBatch.buildGeometry() ?? new THREE.BufferGeometry(), vertexColorMaterial(0.4, 0.2));
    for (const view of this.switches) {
      view.lever.updateMatrixWorld(true);
      bases.setMatrixAt(view.id, view.lever.matrixWorld);
      arms.setMatrixAt(view.id, view.arm.matrixWorld);
    }
    const bladeMat = new THREE.MeshStandardMaterial({ color: '#ffd23f', emissive: '#ffb000', emissiveIntensity: 0.35, roughness: 0.35 });
    const blades = new THREE.Mesh(new THREE.BufferGeometry(), bladeMat);
    this.disposables.push(bladeMat, { dispose: () => blades.geometry.dispose() });
    this.group.add(blades);
    // Floating "flip me" buttons: chunky 3D tokens with a bold arrow along the set branch.
    const token = new MeshBuilder();
    token.disc(BUTTON_D / 2, 0.06, '#3b2a20', 0, -0.012, -0.03, 0.02);
    token.disc(BUTTON_D / 2 - 0.035, 0.07, '#ffd23f', 0, 0, 0, 0.025);
    token.icon('arrow', 0.34, 0, 0, 0.07, 0.035, '#3b2a20');
    const buttons = instanced(token.build(), vertexColorMaterial(0.4), 4);
    return { buttons, chevronOn, chevronEdge, chevronOff, rings, bases, arms, blades };
  }

  /** One mesh holds the blade of every switch's set lane; rebuilt after flips. */
  private rebuildBlades(): void {
    this.bladesDirty = false;
    const set = this.switches.map((v) => v.blades[v.state]).filter((g): g is THREE.BufferGeometry => !!g);
    const merged = set.length ? mergeGeometries(set, false) : null;
    this.parts.blades.geometry.dispose();
    this.parts.blades.geometry = merged ?? new THREE.BufferGeometry();
  }
}
