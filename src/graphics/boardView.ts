// One level's diorama: table, base, track, switches, buildings, props and lights (spec F-001).
import * as THREE from 'three';
import { DX, DY, lanePoint, opposite, turnLeft, turnRight } from '../engine/grid';
import type { Dir, Lane, LevelDefinition } from '../engine/types';
import { GeoBatch, vertexColorMaterial } from './batch';
import type { BiomeTheme } from './biomes';
import { addDepot, addFactory, addStore, tileCenter } from './buildings';
import { buildProps, type PropAnimators } from './props';
import { switchButtonTexture, woodTexture } from './textures';
import { BED_HEIGHT, RAIL_HEIGHT, buildTrack, chevronGeometry, type TrackMeshes } from './trackMesh';

interface SwitchView {
  id: number;
  anchor: THREE.Vector3;
  /** Tap anchors: the tile itself and the floating button above it. */
  anchors: THREE.Vector3[];
  button: THREE.Sprite;
  chevrons: THREE.Mesh[];
  blades: THREE.Mesh[];
  lever: THREE.Group;
  leverSide: number;
  laneSide: [number, number];
  ring: THREE.Mesh;
  state: 0 | 1;
  shake: number;
  pop: number;
}

const ACTIVE = new THREE.Color('#ffd23f');
const INACTIVE = new THREE.Color('#fff6e6');

export class BoardView {
  readonly group = new THREE.Group();
  readonly sun: THREE.DirectionalLight;
  readonly hoppers = new Map<number, THREE.Vector3>();
  private readonly track: TrackMeshes;
  private readonly switches: SwitchView[] = [];
  private readonly disposables: { dispose(): void }[] = [];
  private readonly props: PropAnimators;
  private planning = true;
  private time = 0;
  private readonly dangerMarkers = new Map<number, THREE.Mesh>();

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
    addDepot(batch, def, extras);
    addStore(batch, def, extras);
    for (const factory of def.factories) {
      const parts = addFactory(batch, def, factory, extras);
      factory.funnels.forEach((id, i) => {
        const p = parts.hoppers[i];
        if (p) this.hoppers.set(id, p);
      });
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
    const chevron = chevronGeometry();
    this.disposables.push(chevron);
    for (const sw of def.switches) this.switches.push(this.buildSwitch(sw.id, chevron));
    for (const sw of def.switches) this.setSwitch(sw.id, sw.initial, false);

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
    view.chevrons.forEach((c, i) => {
      const mat = c.material as THREE.MeshStandardMaterial;
      const active = i === state;
      mat.color.copy(active ? ACTIVE : INACTIVE);
      mat.emissive.copy(active ? ACTIVE : INACTIVE).multiplyScalar(active ? 0.45 : 0);
      mat.opacity = active ? 1 : 0.4;
      c.scale.setScalar(active ? 1 : 0.75);
    });
    view.blades.forEach((b, i) => {
      b.visible = i === state;
    });
    if (animate) view.pop = 1;
  }

  /** Fade a switch's floating button while the train passes underneath it. */
  setSwitchBusy(id: number, busy: boolean): void {
    const view = this.switches[id];
    if (!view) return;
    const mat = view.button.material as THREE.SpriteMaterial;
    const target = busy ? 0.25 : 1;
    mat.opacity += (target - mat.opacity) * 0.25;
    mat.transparent = true;
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

  update(dt: number): void {
    this.time += dt;
    for (const view of this.switches) {
      const targetTilt = view.laneSide[view.state] * 0.55;
      const lever = view.lever;
      const shake = view.shake > 0 ? Math.sin(this.time * 60) * 0.35 * view.shake : 0;
      lever.rotation.x += (targetTilt - lever.rotation.x) * Math.min(1, dt * 14);
      lever.rotation.z = shake;
      view.shake = Math.max(0, view.shake - dt * 2.5);
      view.pop = Math.max(0, view.pop - dt * 3);
      const ringMat = view.ring.material as THREE.MeshBasicMaterial;
      const pulse = this.planning ? 0.28 + 0.22 * Math.sin(this.time * 3.2) : 0.12;
      ringMat.opacity = pulse + view.pop * 0.5;
      view.ring.scale.setScalar(1 + view.pop * 0.25);
      const base = this.planning ? 0.5 + 0.04 * Math.sin(this.time * 3.2 + view.id) : 0.44;
      const s = base + view.pop * 0.16 + view.shake * 0.06 * Math.sin(this.time * 50);
      view.button.scale.set(s, s, 1);
    }
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

  private buildSwitch(id: number, chevron: THREE.BufferGeometry): SwitchView {
    const def = this.def;
    const sw = def.switches[id];
    if (!sw) throw new Error(`switch ${id}`);
    const center = tileCenter(def, sw.tile);
    const lanes = sw.lanes.map((l) => def.lanes[l] as Lane);
    const from = (lanes[0] as Lane).from;
    const travel = opposite(from);
    const lateral = (d: Dir) => (d === turnLeft(travel) ? -1 : d === turnRight(travel) ? 1 : 0);
    const laneSide: [number, number] = [lateral((lanes[0] as Lane).to), lateral((lanes[1] as Lane).to)];
    const group = new THREE.Group();
    const chevrons: THREE.Mesh[] = [];
    const blades: THREE.Mesh[] = [];
    const y = BED_HEIGHT + RAIL_HEIGHT + 0.006;
    lanes.forEach((lane) => {
      const c = lane.tile % def.cols;
      const r = Math.floor(lane.tile / def.cols);
      const p = lanePoint(c, r, lane.from, lane.to, lane.length * 0.62);
      const mat = new THREE.MeshStandardMaterial({ color: ACTIVE, transparent: true, roughness: 0.4 });
      this.disposables.push(mat);
      const mesh = new THREE.Mesh(chevron, mat);
      mesh.position.set(p.x - def.cols / 2, y, p.y - def.rows / 2);
      mesh.rotation.y = -p.heading;
      chevrons.push(mesh);
      group.add(mesh);
      // Raised blade over the first part of the lane.
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 6; i++) {
        const q = lanePoint(c, r, lane.from, lane.to, lane.length * (0.04 + 0.4 * (i / 6)));
        pts.push(new THREE.Vector3(q.x - def.cols / 2, y + 0.004, q.y - def.rows / 2));
      }
      const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.022, 6, false);
      const bladeMat = new THREE.MeshStandardMaterial({ color: '#ffd23f', emissive: '#ffb000', emissiveIntensity: 0.35, roughness: 0.35 });
      this.disposables.push(tube, bladeMat);
      const blade = new THREE.Mesh(tube, bladeMat);
      blades.push(blade);
      group.add(blade);
    });
    // Lever on the free side of the tile, near the entry edge.
    let leverSide = 1;
    if (laneSide.includes(1) && !laneSide.includes(-1)) leverSide = -1;
    const lever = new THREE.Group();
    const back = { x: -(DX[travel] as number) * 0.24, z: -(DY[travel] as number) * 0.24 };
    const latDir = turnRight(travel);
    const lat = { x: (DX[latDir] as number) * 0.36 * leverSide, z: (DY[latDir] as number) * 0.36 * leverSide };
    lever.position.set(center.x + back.x + lat.x, 0.02, center.z + back.z + lat.z);
    lever.rotation.order = 'YXZ';
    lever.rotation.y = -Math.atan2(DY[travel] as number, DX[travel] as number);
    const baseGeo = new THREE.BoxGeometry(0.12, 0.05, 0.12);
    const postGeo = new THREE.CylinderGeometry(0.018, 0.022, 0.26, 8);
    const knobGeo = new THREE.SphereGeometry(0.05, 12, 8);
    const baseMat = new THREE.MeshStandardMaterial({ color: '#7a4a26' });
    const postMat = new THREE.MeshStandardMaterial({ color: '#d9d9e0', metalness: 0.4, roughness: 0.4 });
    const knobMat = new THREE.MeshStandardMaterial({ color: this.theme.accent, emissive: this.theme.accent, emissiveIntensity: 0.25 });
    this.disposables.push(baseGeo, postGeo, knobGeo, baseMat, postMat, knobMat);
    const leverBase = new THREE.Mesh(baseGeo, baseMat);
    const post = new THREE.Mesh(postGeo, postMat);
    post.position.y = 0.13;
    const knob = new THREE.Mesh(knobGeo, knobMat);
    knob.position.y = 0.27;
    const arm = new THREE.Group();
    arm.add(post, knob);
    lever.add(leverBase, arm);
    group.add(lever);
    // Pulsing tap ring.
    const ringGeo = new THREE.RingGeometry(0.36, 0.45, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: this.theme.accent, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide });
    this.disposables.push(ringGeo, ringMat);
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(center.x, y + 0.01, center.z);
    ring.renderOrder = 1;
    group.add(ring);
    // Floating "flip me" button (big, readable tap target in overview).
    const buttonMat = new THREE.SpriteMaterial({ map: switchButtonTexture(), depthWrite: false });
    this.disposables.push(buttonMat);
    const buttonSprite = new THREE.Sprite(buttonMat);
    buttonSprite.position.set(center.x, 0.62, center.z);
    buttonSprite.scale.set(0.5, 0.5, 1);
    buttonSprite.renderOrder = 4;
    group.add(buttonSprite);
    this.group.add(group);
    return {
      id,
      anchor: new THREE.Vector3(center.x, 0.06, center.z),
      anchors: [new THREE.Vector3(center.x, 0.06, center.z), new THREE.Vector3(center.x, 0.62, center.z)],
      button: buttonSprite,
      chevrons,
      blades,
      lever: arm as unknown as THREE.Group,
      leverSide,
      laneSide,
      ring,
      state: sw.initial,
      shake: 0,
      pop: 0,
    };
  }
}
