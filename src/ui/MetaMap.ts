// 3D meta map: endless worlds of seven level tokens joined by a track (spec F-006, F-010 FR-084).
// Only a window of three worlds around the focus is built; it is rebuilt as the player moves on.
// Prompt deliverable 5.
import * as THREE from 'three';
import type { AppContext, GameScreen } from '../app/screen';
import { LEVELS_PER_WORLD, biomeOf, biomeOfWorld, firstLevelOf, worldOf } from '../engine/campaign';
import { generateLevel } from '../engine/levelGenerator';
import type { BiomeId, PropDef } from '../engine/types';
import { GeoBatch, vertexColorMaterial } from '../graphics/batch';
import { THEMES } from '../graphics/biomes';
import { CameraController } from '../graphics/cameraController';
import { PALETTES, addProp } from '../graphics/props';
import { woodTexture } from '../graphics/textures';
import { sweptTrack } from '../graphics/trackMesh';
import { TrainView } from '../graphics/trainView';
import { GestureRecognizer } from '../input/gestures';
import { HEADING_HOP, embossedText } from './hud';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makeWiggly, wigglyWorldMaterial } from './kit/wiggle';
import { MeshBuilder } from './kit/builder';
import { Button, LiveItem, UiItem } from './kit/items';
import { UI } from './kit/palette';
import { measure } from './kit/text3d';
import type { Layoutable } from './kit/uiLayer';
import { showCelebration, showLevelCard, showNotice, type OverlayHandle } from './overlays';

const PLATE_W = 6.4;
const PLATE_D = 8.8;
const PLATE_GAP = 1.8;
const PLATE_STEP = PLATE_W + PLATE_GAP;
/** Height of the level medallion's center (also the tap target). */
const TOKEN_Y = 0.52;
/** Medallions and signs lean back toward the camera. */
const LEAN = -0.6;
const PICK_PX = 38;

/** Token positions on a plate, from the near (south) edge to the far (north) edge. */
const PATH: readonly [number, number][] = [
  [-1.7, 3.2],
  [0.6, 2.7],
  [1.9, 1.3],
  [0.2, 0.2],
  [-1.6, -0.9],
  [-0.2, -2.2],
  [1.8, -3.1],
];

const PLATE_PROPS: Record<BiomeId, readonly string[]> = {
  rug: ['pillow', 'block', 'book', 'ball'],
  candy: ['lollipop', 'gumdrop', 'marshmallow', 'cupcake'],
  garden: ['dune', 'bucket', 'spade', 'windmill'],
  space: ['planet', 'rocket', 'starSticker', 'crater'],
};
const PROP_SPOTS: readonly [number, number][] = [
  [2.3, 3.4], [-2.4, 1.6], [2.5, -0.6], [-0.9, -3.4], [-2.5, -2.6], [0.9, 3.9], [-0.6, 1.3], [2.6, -2.2],
];

function plateCenter(world: number): THREE.Vector3 {
  return new THREE.Vector3((world - 1) * PLATE_STEP, 0, 0);
}

export function tokenPosition(level: number): THREE.Vector3 {
  const [lx, lz] = PATH[(level - 1) % LEVELS_PER_WORLD] as [number, number];
  return plateCenter(worldOf(level)).add(new THREE.Vector3(lx, 0, lz));
}

/** Worlds built around the focus (FR-084). */
const WINDOW = 1;

/**
 * A level medallion standing on its token (FR-046, FR-060): number or lock, stars, secret mark.
 * It bobs and rocks in the shader; the next level to play bounces higher (FR-067 g). Built in
 * world space so all 28 share one mesh.
 */
function medallion(level: number, unlocked: boolean, stars: number, secret: boolean, current: boolean, matrix: THREE.Matrix4): THREE.BufferGeometry {
  const b = new MeshBuilder();
  b.wiggle = current
    ? { phase: level * 0.9, hop: 0.13, roll: 0.14, speed: 4.6, px: 0, py: -0.37 }
    : { phase: level * 0.9, hop: unlocked ? 0.045 : 0.02, roll: 0.06, speed: 2.2, px: 0, py: -0.37 };
  const face = unlocked ? (current ? UI.yellow : UI.cream) : '#c9bba7';
  b.disc(0.37, 0.07, UI.ink, 0, 0, 0, 0.02, 'low');
  b.disc(0.33, 0.07, face, 0, 0, 0.03, 0.02, 'low');
  const front = 0.1;
  if (unlocked) b.text(String(level - firstLevelOf(worldOf(level)) + 1), { size: 0.28, depth: 0.05 }, 0, 0.08, front, UI.ink);
  else b.icon('lock', 0.25, 0, 0.08, front, 0.05, '#7d6d5c', '#c9bba7');
  for (let i = 0; i < 3; i++) b.icon('star', 0.16, (i - 1) * 0.15, -0.2, front, 0.04, i < stars ? UI.yellow : '#e9dcc8');
  if (secret) {
    b.disc(0.12, 0.05, UI.navy, 0.27, 0.27, front - 0.02, 0.01, 'low');
    b.icon('rocket', 0.15, 0.27, 0.27, front + 0.03, 0.03, UI.cyan, UI.navy);
  }
  return b.build(matrix);
}

/**
 * A painted sign on two springy posts with the biome's name in 3D letters (FR-060); the origin is
 * at the foot of the posts so the whole sign can sway, and the letters hop (FR-067 b, g).
 */
function biomeSign(name: string, color: string, locked: boolean): { geo: THREE.BufferGeometry; width: number } {
  const b = new MeshBuilder();
  const size = 0.34;
  const iconW = locked ? size + 0.08 : 0;
  const w = measure(name, size) + iconW + 0.5;
  const h = 0.6;
  for (const px of [-w / 2 + 0.35, w / 2 - 0.35]) b.box(0.08, 0.9, 0.08, '#7a4a26', px, -0.75, -0.08);
  const front = b.toyBlock(w, h, 0.2, locked ? '#c9bba7' : color, 0, 0, 0, { rim: 0.05, drop: 0.06, depth: 0.1 });
  let x = -(w - 0.5) / 2;
  if (locked) {
    b.icon('lock', size, x + size / 2, 0, front, 0.05, UI.ink, '#c9bba7');
    x += iconW;
  }
  b.text(name, { size, depth: 0.06, align: 'left' }, x, 0, front, UI.ink, false, { height: 0.04, step: 0.55, speed: 3, roll: 0.08 });
  const geo = b.build(new THREE.Matrix4().makeTranslation(0, 1.2, 0));
  return { geo, width: w };
}

export class MetaMap implements GameScreen {
  readonly kind = 'map' as const;
  private readonly scene = new THREE.Scene();
  private readonly cam = new CameraController(THREE.MathUtils.degToRad(52), THREE.MathUtils.degToRad(-10));
  private readonly gestures: GestureRecognizer;
  private readonly logo: UiItem;
  private readonly starTotal: UiItem;
  private readonly mute: Button;
  private readonly prev: Button;
  private readonly next: Button;
  private readonly title: LiveItem;
  private readonly hudLayout: Layoutable;
  private titleText = '';
  private readonly disposables: { dispose(): void }[] = [];
  private readonly engine: TrainView;
  /** Medallions and signs share a wiggly material (shader hops, research R23). */
  private readonly markerMat = wigglyWorldMaterial(0.6);
  private readonly markerDepth = makeWiggly(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }));
  private readonly signs: THREE.Mesh[] = [];
  private overlay: OverlayHandle | null = null;
  private world: number;
  private time = 0;
  private enginePos = new THREE.Vector3();
  /** The built window of worlds and what it owns. */
  private lo = 0;
  private hi = -1;
  private worldGroup = new THREE.Group();
  private worldDisposables: { dispose(): void }[] = [];
  private readonly maxWorld: number;

  constructor(
    private readonly ctx: AppContext,
    focusLevel: number,
  ) {
    const progress = ctx.progress;
    this.scene.background = new THREE.Color('#2b1d14');
    this.maxWorld = progress.furthestWorld() + 1;
    this.world = Math.min(this.maxWorld, worldOf(focusLevel));
    this.scene.add(this.worldGroup);
    this.disposables.push(this.markerMat, this.markerDepth);

    // The little engine waits at the furthest unlocked level.
    this.engine = new TrainView(0, 0, 0);
    this.engine.group.scale.setScalar(1.6);
    this.engine.group.rotation.y = 0.6;
    this.scene.add(this.engine.group);

    // Lights.
    const hemi = new THREE.HemisphereLight('#fff4e2', '#6b4426', 1.3);
    const sun = new THREE.DirectionalLight('#fff0d4', 2.4);
    sun.position.set(-8, 16, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera;
    sc.left = -8;
    sc.right = 8;
    sc.top = 8;
    sc.bottom = -8;
    sc.near = 1;
    sc.far = 60;
    sun.shadow.bias = -0.0004;
    this.scene.add(hemi, sun, sun.target);
    this.sunLight = sun;

    // 3D interface (spec F-008): logo, star total, mute, biome arrows and name.
    const ui = ctx.ui;
    this.logo = new UiItem(ui, { id: 'map.logo', text: 'Choo Choo Express Delivery 3D' });
    this.logo.build((b) => {
      embossedText(b, 'Choo Choo', 15, 0, 10, 0, UI.cream, { align: 'left', hop: { height: 2.5, step: 0.7, speed: 3.6, roll: 0.1 } });
      embossedText(b, 'Express Delivery 3D', 19, 0, -10, 0, UI.yellow, { align: 'left', hop: { ...HEADING_HOP, phase: 2 } });
    });
    this.logo.idle = { wobble: 0.015, speed: 1.5 };
    const total = `${progress.totalStars()}`;
    this.starTotal = new UiItem(ui, { id: 'map.stars', text: total });
    const pillW = 28 + 6 + measure(total, 17) + 22;
    this.starTotal.idle = { breathe: 0.025, wobble: 0.025, speed: 2 };
    this.starTotal.build((b) => {
      const front = b.toyBlock(pillW, 34, 14, UI.cream, 0, 0, 0);
      const sx = -pillW / 2 + 11 + 14;
      b.wiggle = { phase: 0, hop: 2, roll: 0.3, speed: 3, px: sx, py: 0 };
      b.icon('star', 22, sx, 0, front, 4, UI.yellow);
      b.wiggle = null;
      b.text(total, { size: 17, depth: 2.5, align: 'left' }, -pillW / 2 + 11 + 28 + 6, 0, front, UI.ink);
    });
    this.mute = new Button(ui, {
      id: 'map.mute',
      label: 'Sound on or off',
      look: { w: 46, h: 46, cap: UI.cream, icon: ctx.sound.muted ? 'soundOff' : 'soundOn' },
      onTap: () => {
        ctx.sound.muted = !ctx.sound.muted;
        ctx.progress.muted = ctx.sound.muted;
        this.mute.setLook({ icon: ctx.sound.muted ? 'soundOff' : 'soundOn' });
      },
    });
    this.prev = new Button(ui, { id: 'map.prev', label: 'Previous world', look: { w: 46, h: 46, cap: UI.cream, icon: 'back' }, onTap: () => this.focusWorld(this.world - 1) });
    this.next = new Button(ui, { id: 'map.next', label: 'Next world', look: { w: 46, h: 46, cap: UI.cream, icon: 'next' }, onTap: () => this.focusWorld(this.world + 1) });
    this.title = new LiveItem(ui, { id: 'map.title' });
    this.hudLayout = { layout: () => this.layoutHud(pillW) };
    ui.addLayoutable(this.hudLayout);
    this.layoutHud(pillW);

    this.focusWorld(this.world, true);
    this.gestures = new GestureRecognizer(ctx.gfx.canvas, {
      onPointerDown: () => ctx.sound.unlock(),
      onTap: (x, y) => this.tap(x, y),
      onPan: (dx, dy, x, y) => {
        this.cam.pan(dx, dy, x, y);
        this.updateWorldFromCamera();
      },
      onPanEnd: () => this.focusWorld(this.nearestWorld()),
      onPinch: (scale, cx, cy) => this.cam.zoomAt(scale, cx, cy),
      onWheel: (deltaY, x, y) => {
        if (Math.abs(deltaY) > 0) this.cam.zoomAt(Math.exp(-deltaY * 0.0015), x, y);
      },
    });

    // Pre-generate the focus level so tapping Play is instant.
    window.setTimeout(() => generateLevel(Math.max(1, focusLevel)), 50);
    const ps = ctx.progress as { pendingWorldUnlock?: string | null; available: boolean };
    if (ps.pendingWorldUnlock) {
      showCelebration(ctx.ui, `${ps.pendingWorldUnlock} unlocked!`, 'star', 2600);
      ps.pendingWorldUnlock = null;
    }
    if (!ctx.progress.available && !MetaMap.noticeShown) {
      MetaMap.noticeShown = true;
      this.overlay = showNotice(ctx.ui, 'Progress won’t be saved', 'This browser does not allow saving. You can still play every unlocked level.');
    }
  }

  static noticeShown = false;
  private readonly sunLight: THREE.DirectionalLight;

  tick(): void {}

  frame(dt: number): void {
    this.time += dt;
    this.cam.update(dt);
    const t = this.cam.camera.position;
    this.sunLight.position.set(t.x - 8, 16, 10);
    this.sunLight.target.position.set(t.x, 0, 0);
    this.engine.group.position.y = this.enginePos.y + Math.abs(Math.sin(this.time * 3)) * 0.08;
    const lively = this.ctx.ui.reducedMotion ? 0 : 1;
    this.signs.forEach((sign, i) => {
      sign.rotation.z = Math.sin(this.time * 1.2 + i * 1.7) * 0.05 * lively;
    });
    this.ctx.gfx.render(this.scene, this.cam.camera);
  }

  resize(width: number, height: number): void {
    this.cam.setViewport(width, height, this.insets());
    this.focusWorld(this.world, true);
  }

  hidden(): void {
    this.ctx.sound.suspend();
  }

  dispose(): void {
    this.overlay?.close();
    this.gestures.dispose();
    this.ctx.ui.removeLayoutable(this.hudLayout);
    for (const item of [this.logo, this.starTotal, this.mute, this.prev, this.next, this.title]) item.dispose();
    this.engine.dispose();
    for (const d of this.worldDisposables) d.dispose();
    for (const d of this.disposables) d.dispose();
  }

  levelMarkerScreenPosition(level: number): { x: number; y: number } | null {
    if (worldOf(level) < this.lo || worldOf(level) > this.hi) return null;
    const p = tokenPosition(level);
    return this.cam.project(p.x, TOKEN_Y, p.z);
  }

  private insets() {
    const top = Math.max(this.mute.rect.y + this.mute.rect.h, this.logo.rect.y + this.logo.rect.h) + 7 + 4;
    return { top, bottom: this.ctx.ui.height - this.prev.rect.y + 4, left: 4, right: 4 };
  }

  private layoutHud(pillW: number): void {
    const { width: W, height: H, safe } = this.ctx.ui;
    const topY = safe.top + 8 + 23;
    const left = safe.left + 10;
    const right = W - safe.right - 10;
    this.logo.place(left, topY).setRect(left, topY - 22, measure('Express Delivery 3D', 19), 44);
    this.mute.at(right - 23, topY);
    const pillX = right - 46 - 10 - pillW / 2;
    this.starTotal.place(pillX, topY).setRect(pillX - pillW / 2, topY - 17, pillW, 34);
    const bottomY = H - safe.bottom - 14 - 7 - 23;
    this.prev.at(left + 2 + 23, bottomY);
    this.next.at(right - 2 - 23, bottomY);
    const titleL = this.prev.rect.x + this.prev.rect.w + 8;
    const titleR = this.next.rect.x - 8;
    this.title.place(W / 2, bottomY).setRect(titleL, bottomY - 14, titleR - titleL, 28);
    this.title.invalidate();
    this.setTitle(this.titleText);
  }

  private setTitle(text: string): void {
    if (this.titleText && text !== this.titleText) this.title.kick(0.3);
    this.titleText = text;
    this.title.text = text;
    const maxW = this.next.rect.x - (this.prev.rect.x + this.prev.rect.w) - 20;
    this.title.set(`${text}|${maxW}`, (b) => embossedText(b, text, 22, 0, 0, 0, UI.cream, { maxWidth: maxW, hop: HEADING_HOP }));
  }

  private focusWorld(index: number, snap = false): void {
    this.world = Math.max(1, Math.min(this.maxWorld, index));
    if (this.world - WINDOW < this.lo || this.world + WINDOW > this.hi) {
      this.buildWindow(Math.max(1, this.world - WINDOW), Math.min(this.maxWorld, this.world + WINDOW));
      snap = true;
    }
    const c = plateCenter(this.world);
    this.cam.setBounds({ minX: c.x - PLATE_W / 2, maxX: c.x + PLATE_W / 2, minZ: -PLATE_D / 2, maxZ: PLATE_D / 2, height: 1.2 });
    if (snap) this.cam.snapToOverview();
    else this.cam.showOverview();
    this.setTitle(this.worldTitle(this.world));
  }

  private worldTitle(world: number): string {
    return `World ${world} · ${biomeOfWorld(world).name}`;
  }

  private nearestWorld(): number {
    const ground = this.cam.groundAt(window.innerWidth / 2, window.innerHeight / 2, new THREE.Vector3());
    if (!ground) return this.world;
    return Math.max(this.lo, Math.min(this.hi, Math.round(ground.x / PLATE_STEP) + 1));
  }

  private updateWorldFromCamera(): void {
    this.setTitle(this.worldTitle(this.nearestWorld()));
  }

  /** Builds the plates, tokens, props, signs and track of worlds lo … hi (FR-084). */
  private buildWindow(lo: number, hi: number): void {
    for (const d of this.worldDisposables) d.dispose();
    this.worldDisposables = [];
    this.scene.remove(this.worldGroup);
    this.worldGroup = new THREE.Group();
    this.scene.add(this.worldGroup);
    this.lo = lo;
    this.hi = hi;
    const own = <T extends { dispose(): void }>(d: T): T => {
      this.worldDisposables.push(d);
      return d;
    };
    const progress = this.ctx.progress;
    const count = hi - lo + 1;
    const mid = (plateCenter(lo).x + plateCenter(hi).x) / 2;

    // Table.
    const tableTex = own(woodTexture('#c98a52', '#8f5a2e').clone());
    tableTex.needsUpdate = true;
    tableTex.repeat.set(2 + count * 2, 3);
    const tableMat = own(new THREE.MeshStandardMaterial({ map: tableTex, roughness: 0.8 }));
    const tableGeo = own(new THREE.BoxGeometry(PLATE_STEP * count + 14, 0.4, PLATE_D + 14));
    const table = new THREE.Mesh(tableGeo, tableMat);
    table.position.set(mid, -0.55, 0);
    table.receiveShadow = true;
    this.worldGroup.add(table);

    // World plates with props and signs.
    this.signs.length = 0;
    const batch = new GeoBatch();
    const glow = new GeoBatch();
    for (let w = lo; w <= hi; w++) {
      const biome = biomeOfWorld(w);
      const theme = THEMES[biome.id];
      const center = plateCenter(w);
      const shape = new THREE.Shape();
      const hw = PLATE_W / 2;
      const hd = PLATE_D / 2;
      const r = 0.8;
      shape.moveTo(-hw + r, -hd);
      shape.lineTo(hw - r, -hd);
      shape.quadraticCurveTo(hw, -hd, hw, -hd + r);
      shape.lineTo(hw, hd - r);
      shape.quadraticCurveTo(hw, hd, hw - r, hd);
      shape.lineTo(-hw + r, hd);
      shape.quadraticCurveTo(-hw, hd, -hw, hd - r);
      shape.lineTo(-hw, -hd + r);
      shape.quadraticCurveTo(-hw, -hd, -hw + r, -hd);
      const geo = own(new THREE.ExtrudeGeometry(shape, { depth: 0.35, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 2 }));
      geo.rotateX(Math.PI / 2);
      geo.translate(center.x, -0.06, center.z);
      const top = own(theme.baseTop().clone());
      top.needsUpdate = true;
      top.repeat.set(biome.id === 'rug' ? 1 / PLATE_W : 1 / 2.5, biome.id === 'rug' ? 1 / PLATE_D : 1 / 2.5);
      top.offset.set(0.5, 0.5);
      const topMat = own(new THREE.MeshStandardMaterial({ map: top, roughness: 0.95 }));
      const sideMat = own(new THREE.MeshStandardMaterial({ color: theme.baseSide, roughness: 0.85 }));
      const plate = new THREE.Mesh(geo, [topMat, sideMat]);
      plate.receiveShadow = true;
      plate.castShadow = true;
      this.worldGroup.add(plate);
      const locked = !progress.unlocked(firstLevelOf(w));
      const sign = biomeSign(`${w} · ${biome.name}`, theme.accent, locked);
      own(sign.geo);
      const signMesh = new THREE.Mesh(sign.geo, this.markerMat);
      signMesh.position.set(center.x, -0.05, center.z - hd + 0.35);
      signMesh.rotation.x = LEAN * 0.5;
      signMesh.castShadow = true;
      signMesh.customDepthMaterial = this.markerDepth;
      this.worldGroup.add(signMesh);
      this.signs.push(signMesh);
      const kinds = PLATE_PROPS[biome.id];
      PROP_SPOTS.forEach(([lx, lz], i) => {
        const prop: PropDef = { kind: kinds[(i + w) % kinds.length] as string, tile: 0, rotation: i * 1.3 + w, scale: 1.25, variant: i };
        addProp(batch, glow, prop, new THREE.Vector3(center.x + lx, 0, center.z + lz), PALETTES[biome.id] ?? [], []);
      });
    }
    // Tokens.
    const furthest = progress.furthestUnlocked();
    const medallions: THREE.BufferGeometry[] = [];
    const first = firstLevelOf(lo);
    const last = firstLevelOf(hi) + LEVELS_PER_WORLD - 1;
    for (let level = first; level <= last; level++) {
      const p = tokenPosition(level);
      const unlocked = progress.unlocked(level);
      const accent = THEMES[biomeOf(level).id].accent;
      batch.cylinder(0.46, 0.5, 0.16, unlocked ? '#a8703f' : '#8a7f72', p.x, 0.08, p.z, 24);
      batch.cylinder(0.4, 0.4, 0.04, unlocked ? accent : '#b9ada0', p.x, 0.17, p.z, 24);
      const at = new THREE.Matrix4().compose(new THREE.Vector3(p.x, TOKEN_Y, p.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(LEAN, 0, 0)), new THREE.Vector3(1, 1, 1));
      medallions.push(medallion(level, unlocked, progress.stars(level), progress.secret(level), level === furthest, at));
    }
    // All medallions in one mesh: they bob and rock in the shader (FR-067 g).
    const merged = mergeGeometries(medallions, false);
    for (const g of medallions) g.dispose();
    if (merged) {
      const tokens = new THREE.Mesh(merged, this.markerMat);
      tokens.castShadow = true;
      tokens.receiveShadow = true;
      tokens.customDepthMaterial = this.markerDepth;
      this.worldGroup.add(tokens);
      own(merged);
    }
    // Bridges between plates.
    for (let w = lo; w < hi; w++) {
      const a = tokenPosition(firstLevelOf(w) + LEVELS_PER_WORLD - 1);
      const c = tokenPosition(firstLevelOf(w + 1));
      const midP = a.clone().add(c).multiplyScalar(0.5);
      const len = a.distanceTo(c);
      batch.add(new THREE.BoxGeometry(len, 0.08, 0.7), '#8f5a2e', new THREE.Matrix4().makeRotationY(-Math.atan2(c.z - a.z, c.x - a.x)).setPosition(midP.x, -0.02, midP.z));
    }
    const mat = own(vertexColorMaterial(0.7));
    const mesh = batch.build(mat);
    if (mesh) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.worldGroup.add(mesh);
      own(mesh.geometry);
    }
    const glowMat = own(new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }));
    const glowMesh = glow.build(glowMat);
    if (glowMesh) {
      this.worldGroup.add(glowMesh);
      own(glowMesh.geometry);
    }
    // Track path through the tokens.
    const curve = new THREE.CatmullRomCurve3(Array.from({ length: last - first + 1 }, (_, i) => tokenPosition(first + i)), false, 'centripetal');
    const samples = curve.getSpacedPoints(120 * count).map((p, i, arr) => {
      const q = arr[Math.min(arr.length - 1, i + 1)] as THREE.Vector3;
      const o = arr[Math.max(0, i - 1)] as THREE.Vector3;
      return { x: p.x, z: p.z, h: Math.atan2(q.z - o.z, q.x - o.x) };
    });
    const track = own(sweptTrack(samples, 0.005, { bed: '#5aa0d8', rail: '#eef0f6' }));
    this.worldGroup.add(track.group);

    // The engine waits at the furthest unlocked level (if it is in the window).
    const inWindow = worldOf(furthest) >= lo && worldOf(furthest) <= hi;
    this.engine.group.visible = inWindow;
    this.enginePos = tokenPosition(furthest).add(new THREE.Vector3(0.62, 0, 0.35));
    this.engine.group.position.copy(this.enginePos);
    this.cam.setPanBounds({ minX: plateCenter(lo).x - 1, maxX: plateCenter(hi).x + 1, minZ: -PLATE_D / 2 + 1, maxZ: PLATE_D / 2 - 1, height: 1.5 });
  }

  private tap(x: number, y: number): void {
    if (this.overlay) return;
    let best = -1;
    let bestDist = PICK_PX;
    for (let level = firstLevelOf(this.lo); level < firstLevelOf(this.hi + 1); level++) {
      const p = this.levelMarkerScreenPosition(level);
      if (!p) continue;
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < bestDist) {
        bestDist = d;
        best = level;
      }
    }
    if (best < 0) return;
    this.ctx.sound.play('tap');
    const level = best;
    const progress = this.ctx.progress;
    const unlocked = progress.unlocked(level);
    const order = unlocked ? generateLevel(level).order.lines : [];
    this.overlay = showLevelCard(
      this.ctx.ui,
      {
        level,
        unlocked,
        stars: progress.stars(level),
        best: progress.best(level),
        secretAvailable: unlocked && generateLevel(level).routes.secret !== null,
        secretFound: progress.secret(level),
        order,
      },
      {
        onPlay: () => {
          this.overlay = null;
          this.ctx.openLevel(level);
        },
        onClose: () => {
          this.overlay = null;
        },
      },
    );
  }
}
