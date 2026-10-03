// One level's diorama: table, base, track, switches, buildings, props and lights (spec F-001).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { DX, DY, lanePoint, opposite, turnLeft, turnRight } from '../engine/grid';
import type { Dir, Lane, LevelDefinition, ToyType } from '../engine/types';
import { MeshBuilder } from '../ui/kit/builder';
import { GeoBatch, compose, vertexColorMaterial } from './batch';
import type { BiomeTheme } from './biomes';
import { addDepot, addFactory, addStore, tileCenter } from './buildings';
import { buildProps, type PropAnimators } from './props';
import { woodTexture } from './textures';
import { toyGeometry } from './toyMeshes';
import { BED_HEIGHT, RAIL_HEIGHT, buildTrack, chevronGeometry, type TrackMeshes } from './trackMesh';

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
  /** Raised blade over the start of each lane; only the set lane's blade is drawn. */
  blades: THREE.BufferGeometry[];
  /** Detached pivots: `lever` stands beside the track, `arm` tilts toward the set lane. */
  lever: THREE.Object3D;
  arm: THREE.Object3D;
  laneSide: [number, number];
  state: 0 | 1;
  shake: number;
  pop: number;
}

/**
 * Switch parts drawn for all switches at once (instance i = switch i), so a board costs a few draw
 * calls for its switches instead of several per switch. The floating 3D buttons turn toward the
 * camera every frame (spec FR-060).
 */
interface SwitchMeshes {
  buttons: THREE.InstancedMesh;
  chevronOn: THREE.InstancedMesh;
  chevronOff: THREE.InstancedMesh;
  rings: THREE.InstancedMesh;
  bases: THREE.InstancedMesh;
  arms: THREE.InstancedMesh;
  blades: THREE.Mesh;
}

const ACTIVE = new THREE.Color('#ffd23f');
const INACTIVE = new THREE.Color('#fff6e6');
const SWITCH_Y = BED_HEIGHT + RAIL_HEIGHT + 0.006;
const BUTTON_Y = 0.62;
/** Diameter of the floating switch button (world units). */
const BUTTON_D = 0.5;
const scratch = new THREE.Matrix4();
const scratchScale = new THREE.Vector3();

export class BoardView {
  readonly group = new THREE.Group();
  readonly sun: THREE.DirectionalLight;
  readonly hoppers = new Map<number, THREE.Vector3>();
  private readonly track: TrackMeshes;
  private readonly switches: SwitchView[] = [];
  private readonly parts: SwitchMeshes;
  private bladesDirty = false;
  private readonly disposables: { dispose(): void }[] = [];
  private readonly props: PropAnimators;
  private planning = true;
  private time = 0;
  private readonly dangerMarkers = new Map<number, THREE.Mesh>();
  /** Turning 3D toys above the factories. */
  private readonly toyMarkers: THREE.Mesh[] = [];

  constructor(
    private readonly def: LevelDefinition,
    private readonly theme: BiomeTheme,
  ) {
    const { cols, rows } = def;
    // Table and diorama base.
    const tableTex = woodTexture(theme.tableLight, theme.tableDark);
    tableTex.repeat.set(4, 4);
    const table = new THREE.Mesh(new THREE.BoxGeometry(cols + 18, 0.4, rows + 18), this.track0(new THREE.MeshStandardMaterial({ map: tableTex, roughness: 0.8 })));
    table.position.y = -0.52;
    table.receiveShadow = true;
    const topTex = theme.baseTop();
    if (theme.id === 'rug') topTex.repeat.set(1, 1);
    else topTex.repeat.set(cols / 3, rows / 3);
    const side = this.track0(new THREE.MeshStandardMaterial({ color: theme.baseSide, roughness: 0.85 }));
    const top = this.track0(new THREE.MeshStandardMaterial({ map: topTex, roughness: 0.95 }));
    const base = new THREE.Mesh(new THREE.BoxGeometry(cols + 0.5, 0.3, rows + 0.5), [side, side, top, side, side, side]);
    base.position.y = -0.15;
    base.receiveShadow = true;
    this.group.add(table, base);

    // Track.
    this.track = buildTrack(def, { bed: theme.trackBed, sleeper: theme.sleeper, rail: theme.rail, railEmissive: theme.railEmissive });
    this.group.add(this.track.group);

    // Buildings (one merged mesh) + signs.
    const batch = new GeoBatch();
    const extras = new THREE.Group();
    const frame = '#7a4a26';
    batch.box(cols + 0.62, 0.08, 0.1, frame, 0, 0.0, rows / 2 + 0.28);
    batch.box(cols + 0.62, 0.08, 0.1, frame, 0, 0.0, -rows / 2 - 0.28);
    batch.box(0.1, 0.08, rows + 0.62, frame, cols / 2 + 0.28, 0.0, 0);
    batch.box(0.1, 0.08, rows + 0.62, frame, -cols / 2 - 0.28, 0.0, 0);
    addDepot(batch, def);
    addStore(batch, def, extras);
    const toyMat = this.track0(vertexColorMaterial(0.5));
    const toyGeos = new Map<ToyType, THREE.BufferGeometry>();
    for (const factory of def.factories) {
      const parts = addFactory(batch, def, factory);
      factory.funnels.forEach((id, i) => {
        const p = parts.hoppers[i];
        if (p) this.hoppers.set(id, p);
      });
      for (const t of parts.toys) {
        let geo = toyGeos.get(t.type);
        if (!geo) {
          geo = toyGeometry(t.type);
          this.disposables.push(geo);
          toyGeos.set(t.type, geo);
        }
        const marker = new THREE.Mesh(geo, toyMat);
        marker.position.copy(t.position);
        marker.scale.setScalar(7);
        marker.rotation.x = 0.35;
        marker.castShadow = true;
        this.toyMarkers.push(marker);
        this.group.add(marker);
      }
    }
    const buildingMat = this.track0(vertexColorMaterial());
    const buildings = batch.build(buildingMat);
    if (buildings) {
      buildings.castShadow = true;
      buildings.receiveShadow = true;
      this.group.add(buildings);
      this.disposables.push(buildings.geometry);
    }
    this.group.add(extras);

    // Props.
    this.props = buildProps(def, theme);
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

  get bounds(): { minX: number; maxX: number; minZ: number; maxZ: number; height: number } {
    return { minX: -this.def.cols / 2 - 0.3, maxX: this.def.cols / 2 + 0.3, minZ: -this.def.rows / 2 - 0.3, maxZ: this.def.rows / 2 + 0.3, height: 0.9 };
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

  setSwitch(id: number, state: 0 | 1, animate = true): void {
    const view = this.switches[id];
    if (!view) return;
    view.state = state;
    const on = view.chevrons[state];
    const off = view.chevrons[1 - state];
    if (on && off) {
      this.parts.chevronOn.setMatrixAt(id, compose(on.x, on.y, on.z, on.yaw));
      this.parts.chevronOff.setMatrixAt(id, compose(off.x, off.y, off.z, off.yaw, 0.75));
      this.parts.chevronOn.instanceMatrix.needsUpdate = true;
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

  /** Mark a dangerous pile under a funnel (FR-017 cue). */
  markDanger(funnelId: number): void {
    if (this.dangerMarkers.has(funnelId)) return;
    const hopper = this.hoppers.get(funnelId);
    if (!hopper) return;
    const mark = new THREE.Mesh(
      new THREE.ConeGeometry(0.09, 0.16, 3),
      new THREE.MeshStandardMaterial({ color: '#e0533f', emissive: '#e0533f', emissiveIntensity: 0.6 }),
    );
    mark.position.set(hopper.x, hopper.y + 0.42, hopper.z);
    mark.rotation.x = Math.PI;
    this.group.add(mark);
    this.dangerMarkers.set(funnelId, mark);
    this.disposables.push(mark.geometry, mark.material as THREE.Material);
  }

  update(dt: number, camera: THREE.Camera): void {
    this.time += dt;
    if (this.bladesDirty) this.rebuildBlades();
    const { arms, rings, buttons } = this.parts;
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
      const base = this.planning ? 0.5 + 0.04 * Math.sin(this.time * 3.2 + view.id) : 0.44;
      view.busy += (view.busyTarget - view.busy) * Math.min(1, dt * 10);
      const s = (base + view.pop * 0.16 + view.shake * 0.06 * Math.sin(this.time * 50)) * (1 - 0.5 * view.busy);
      const k = s / BUTTON_D;
      buttons.setMatrixAt(view.id, scratch.compose(view.buttonPos, camera.quaternion, scratchScale.set(k, k, k)));
    }
    arms.instanceMatrix.needsUpdate = true;
    rings.instanceMatrix.needsUpdate = true;
    buttons.instanceMatrix.needsUpdate = true;
    this.toyMarkers.forEach((m, i) => {
      m.rotation.y = this.time * 0.9 + i * 1.7;
      m.position.y = 1.08 + Math.sin(this.time * 2 + i) * 0.03;
    });
    (rings.material as THREE.MeshBasicMaterial).opacity = this.planning ? 0.28 + 0.22 * Math.sin(this.time * 3.2) : 0.12;
    for (const mark of this.dangerMarkers.values()) mark.position.y = 1.06 + Math.sin(this.time * 5) * 0.04;
    this.props.update(dt, this.time);
  }

  dispose(): void {
    this.track.dispose();
    this.props.dispose();
    for (const d of this.disposables) d.dispose();
    this.group.traverse((o) => {
      if (o instanceof THREE.Sprite) o.material.dispose();
    });
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
    lanes.forEach((lane) => {
      const c = lane.tile % def.cols;
      const r = Math.floor(lane.tile / def.cols);
      const p = lanePoint(c, r, lane.from, lane.to, lane.length * 0.62);
      chevrons.push({ x: p.x - def.cols / 2, y: SWITCH_Y, z: p.y - def.rows / 2, yaw: -p.heading });
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
      blades,
      lever,
      arm,
      laneSide,
      state: sw.initial,
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
    const chevron = chevronGeometry();
    const chevronOn = instanced(chevron, new THREE.MeshStandardMaterial({ color: ACTIVE, emissive: ACTIVE.clone().multiplyScalar(0.45), roughness: 0.4 }));
    const chevronOff = instanced(chevron.clone(), new THREE.MeshStandardMaterial({ color: INACTIVE, transparent: true, opacity: 0.4, roughness: 0.4 }));
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
    // Floating "flip me" buttons: chunky 3D tokens with the swap arrows (big, readable tap targets).
    const token = new MeshBuilder();
    token.disc(BUTTON_D / 2, 0.06, '#3b2a20', 0, -0.012, -0.03, 0.02);
    token.disc(BUTTON_D / 2 - 0.035, 0.07, '#ffd23f', 0, 0, 0, 0.025);
    token.icon('swap', 0.27, 0, 0, 0.07, 0.03, '#3b2a20');
    const buttons = instanced(token.build(), vertexColorMaterial(0.4), 4);
    return { buttons, chevronOn, chevronOff, rings, bases, arms, blades };
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
