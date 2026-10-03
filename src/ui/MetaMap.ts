// 3D meta map: four biome plates of seven level tokens joined by a track (spec F-006, FR-046).
// Prompt deliverable 5.
import * as THREE from 'three';
import type { AppContext, GameScreen } from '../app/screen';
import { BIOMES, LEVEL_COUNT, LEVELS_PER_BIOME, biomeOf } from '../engine/campaign';
import { generateLevel } from '../engine/levelGenerator';
import type { BiomeId, PropDef } from '../engine/types';
import { GeoBatch, vertexColorMaterial } from '../graphics/batch';
import { THEMES } from '../graphics/biomes';
import { CameraController } from '../graphics/cameraController';
import { PALETTES, addProp } from '../graphics/props';
import { roundRect, woodTexture } from '../graphics/textures';
import { sweptTrack } from '../graphics/trackMesh';
import { TrainView } from '../graphics/trainView';
import { GestureRecognizer } from '../input/gestures';
import { button, el } from './dom';
import { ICONS, toyIcon } from './icons';
import { showCelebration, showLevelCard, showNotice, type OverlayHandle } from './overlays';

const PLATE_W = 6.4;
const PLATE_D = 8.8;
const PLATE_GAP = 1.8;
const PLATE_STEP = PLATE_W + PLATE_GAP;
const TOKEN_Y = 0.75;
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

function plateCenter(biome: number): THREE.Vector3 {
  return new THREE.Vector3(biome * PLATE_STEP, 0, 0);
}

export function tokenPosition(level: number): THREE.Vector3 {
  const b = Math.floor((level - 1) / LEVELS_PER_BIOME);
  const [lx, lz] = PATH[(level - 1) % LEVELS_PER_BIOME] as [number, number];
  return plateCenter(b).add(new THREE.Vector3(lx, 0, lz));
}

function tokenTexture(level: number, unlocked: boolean, stars: number, secret: boolean, current: boolean): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 192;
  c.height = 192;
  const ctx = c.getContext('2d') as CanvasRenderingContext2D;
  ctx.fillStyle = unlocked ? (current ? '#f6c344' : '#fff6e6') : '#c9bba7';
  ctx.strokeStyle = '#3b2a20';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.arc(96, 84, 66, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = unlocked ? '#3b2a20' : '#7d6d5c';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (unlocked) {
    ctx.font = 'bold 74px ui-rounded, "SF Pro Rounded", system-ui, sans-serif';
    ctx.fillText(String(level), 96, 88);
  } else {
    roundRect(ctx, 70, 82, 52, 40, 8);
    ctx.fill();
    ctx.lineWidth = 9;
    ctx.strokeStyle = '#7d6d5c';
    ctx.beginPath();
    ctx.arc(96, 80, 18, Math.PI, 0);
    ctx.stroke();
  }
  // Stars row.
  for (let i = 0; i < 3; i++) {
    const x = 52 + i * 44;
    const y = 166;
    ctx.beginPath();
    for (let k = 0; k < 10; k++) {
      const r = k % 2 === 0 ? 20 : 8.5;
      const a = -Math.PI / 2 + (k * Math.PI) / 5;
      if (k === 0) ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      else ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fillStyle = i < stars ? '#f6c344' : 'rgba(255,246,230,0.55)';
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#3b2a20';
    ctx.fill();
    ctx.stroke();
  }
  if (secret) {
    ctx.fillStyle = '#2d3466';
    ctx.beginPath();
    ctx.arc(156, 30, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7ff6ff';
    ctx.font = 'bold 30px system-ui, sans-serif';
    ctx.fillText('🚀', 156, 32);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function labelSprite(text: string, bg: string, fg: string): THREE.Sprite {
  const c = document.createElement('canvas');
  c.width = 640;
  c.height = 128;
  const ctx = c.getContext('2d') as CanvasRenderingContext2D;
  ctx.fillStyle = bg;
  roundRect(ctx, 6, 6, 628, 116, 40);
  ctx.fill();
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#3b2a20';
  ctx.stroke();
  ctx.fillStyle = fg;
  ctx.font = 'bold 64px ui-rounded, "SF Pro Rounded", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 320, 68);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false }));
  sprite.scale.set(3.6, 0.72, 1);
  return sprite;
}

export class MetaMap implements GameScreen {
  readonly kind = 'map' as const;
  private readonly scene = new THREE.Scene();
  private readonly cam = new CameraController(THREE.MathUtils.degToRad(52), THREE.MathUtils.degToRad(-10));
  private readonly gestures: GestureRecognizer;
  private readonly hud: HTMLElement;
  private readonly title: HTMLElement;
  private readonly disposables: { dispose(): void }[] = [];
  private readonly tokens: THREE.Sprite[] = [];
  private readonly engine: TrainView;
  private overlay: OverlayHandle | null = null;
  private biome: number;
  private time = 0;
  private readonly enginePos: THREE.Vector3;

  constructor(
    private readonly ctx: AppContext,
    focusLevel: number,
  ) {
    const progress = ctx.progress;
    this.scene.background = new THREE.Color('#2b1d14');
    this.biome = biomeOf(focusLevel).firstLevel === 1 ? 0 : BIOMES.indexOf(biomeOf(focusLevel));

    // Table.
    const tableTex = woodTexture('#c98a52', '#8f5a2e').clone();
    tableTex.needsUpdate = true;
    tableTex.repeat.set(8, 3);
    const tableMat = new THREE.MeshStandardMaterial({ map: tableTex, roughness: 0.8 });
    const tableGeo = new THREE.BoxGeometry(PLATE_STEP * 4 + 12, 0.4, PLATE_D + 14);
    const table = new THREE.Mesh(tableGeo, tableMat);
    table.position.set(PLATE_STEP * 1.5, -0.55, 0);
    table.receiveShadow = true;
    this.scene.add(table);
    this.disposables.push(tableGeo, tableMat, tableTex);

    // Biome plates with props and labels.
    const batch = new GeoBatch();
    const glow = new GeoBatch();
    BIOMES.forEach((biome, b) => {
      const theme = THEMES[biome.id];
      const center = plateCenter(b);
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
      const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.35, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 2 });
      geo.rotateX(Math.PI / 2);
      geo.translate(center.x, -0.06, center.z);
      const top = theme.baseTop().clone();
      top.needsUpdate = true;
      top.repeat.set(biome.id === 'rug' ? 1 / PLATE_W : 1 / 2.5, biome.id === 'rug' ? 1 / PLATE_D : 1 / 2.5);
      top.offset.set(0.5, 0.5);
      const topMat = new THREE.MeshStandardMaterial({ map: top, roughness: 0.95 });
      const sideMat = new THREE.MeshStandardMaterial({ color: theme.baseSide, roughness: 0.85 });
      const plate = new THREE.Mesh(geo, [topMat, sideMat]);
      plate.receiveShadow = true;
      plate.castShadow = true;
      this.scene.add(plate);
      this.disposables.push(geo, top, topMat, sideMat);
      const locked = !progress.unlocked(biome.firstLevel);
      const label = labelSprite(locked ? `🔒 ${biome.name}` : biome.name, locked ? '#c9bba7' : theme.accent, '#3b2a20');
      label.position.set(center.x, 1.5, center.z - hd + 0.2);
      this.scene.add(label);
      this.disposables.push(label.material, label.material.map as THREE.Texture);
      const kinds = PLATE_PROPS[biome.id];
      PROP_SPOTS.forEach(([lx, lz], i) => {
        const prop: PropDef = { kind: kinds[i % kinds.length] as string, tile: 0, rotation: i * 1.3, scale: 1.25, variant: i };
        addProp(batch, glow, prop, new THREE.Vector3(center.x + lx, 0, center.z + lz), PALETTES[biome.id] ?? [], []);
      });
    });
    // Tokens.
    const furthest = progress.furthestUnlocked();
    for (let level = 1; level <= LEVEL_COUNT; level++) {
      const p = tokenPosition(level);
      const unlocked = progress.unlocked(level);
      const accent = THEMES[biomeOf(level).id].accent;
      batch.cylinder(0.46, 0.5, 0.16, unlocked ? '#a8703f' : '#8a7f72', p.x, 0.08, p.z, 24);
      batch.cylinder(0.4, 0.4, 0.04, unlocked ? accent : '#b9ada0', p.x, 0.17, p.z, 24);
      const tex = tokenTexture(level, unlocked, progress.stars(level), progress.secret(level), level === furthest);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false }));
      sprite.position.set(p.x, TOKEN_Y, p.z);
      sprite.scale.set(0.95, 0.95, 1);
      this.tokens.push(sprite);
      this.scene.add(sprite);
      this.disposables.push(sprite.material, tex);
    }
    // Bridges between plates.
    for (let b = 0; b < BIOMES.length - 1; b++) {
      const a = tokenPosition((b + 1) * LEVELS_PER_BIOME);
      const c = tokenPosition((b + 1) * LEVELS_PER_BIOME + 1);
      const mid = a.clone().add(c).multiplyScalar(0.5);
      const len = a.distanceTo(c);
      batch.add(new THREE.BoxGeometry(len, 0.08, 0.7), '#8f5a2e', new THREE.Matrix4().makeRotationY(-Math.atan2(c.z - a.z, c.x - a.x)).setPosition(mid.x, -0.02, mid.z));
    }
    const mat = vertexColorMaterial(0.7);
    const mesh = batch.build(mat);
    if (mesh) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      this.disposables.push(mesh.geometry, mat);
    }
    const glowMat = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
    const glowMesh = glow.build(glowMat);
    if (glowMesh) {
      this.scene.add(glowMesh);
      this.disposables.push(glowMesh.geometry, glowMat);
    }
    // Track path through all tokens.
    const curve = new THREE.CatmullRomCurve3(Array.from({ length: LEVEL_COUNT }, (_, i) => tokenPosition(i + 1)), false, 'centripetal');
    const samples = curve.getSpacedPoints(400).map((p, i, arr) => {
      const q = arr[Math.min(arr.length - 1, i + 1)] as THREE.Vector3;
      const o = arr[Math.max(0, i - 1)] as THREE.Vector3;
      return { x: p.x, z: p.z, h: Math.atan2(q.z - o.z, q.x - o.x) };
    });
    const track = sweptTrack(samples, 0.005, { bed: '#5aa0d8', rail: '#eef0f6' });
    this.scene.add(track.group);
    this.disposables.push(track);

    // The little engine waits at the furthest unlocked level.
    this.engine = new TrainView(0, 0, 0);
    this.enginePos = tokenPosition(furthest).add(new THREE.Vector3(0.62, 0, 0.35));
    this.engine.group.position.copy(this.enginePos);
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

    // DOM HUD.
    this.hud = el('div', 'map-hud');
    const top = el('div', 'map-top');
    this.title = el('div', 'map-title', '');
    const starsTotal = el('div', 'map-stars', `${ICONS.star}<span>${progress.totalStars()} / ${LEVEL_COUNT * 3}</span>`);
    const mute = button('icon', ctx.sound.muted ? ICONS.soundOff : ICONS.soundOn, 'Sound on or off', () => {
      ctx.sound.muted = !ctx.sound.muted;
      ctx.progress.muted = ctx.sound.muted;
      mute.innerHTML = ctx.sound.muted ? ICONS.soundOff : ICONS.soundOn;
    });
    top.append(el('div', 'map-logo', 'Choo Choo<br><b>Express Delivery 3D</b>'), starsTotal, mute);
    const bottom = el('div', 'map-bottom');
    bottom.append(
      button('icon', ICONS.back, 'Previous biome', () => this.focusBiome(this.biome - 1)),
      this.title,
      button('icon', `<span style="display:inline-block;transform:scaleX(-1)">${ICONS.back}</span>`, 'Next biome', () => this.focusBiome(this.biome + 1)),
    );
    this.hud.append(top, bottom);
    ctx.hudHost.append(this.hud);

    this.cam.setPanBounds({ minX: plateCenter(0).x - 1, maxX: plateCenter(3).x + 1, minZ: -PLATE_D / 2 + 1, maxZ: PLATE_D / 2 - 1, height: 1.5 });
    this.focusBiome(this.biome, true);
    this.gestures = new GestureRecognizer(ctx.gfx.canvas, {
      onPointerDown: () => ctx.sound.unlock(),
      onTap: (x, y) => this.tap(x, y),
      onPan: (dx, dy, x, y) => {
        this.cam.pan(dx, dy, x, y);
        this.updateBiomeFromCamera();
      },
      onPanEnd: () => this.focusBiome(this.nearestBiome()),
      onPinch: (scale, cx, cy) => this.cam.zoomAt(scale, cx, cy),
      onWheel: (deltaY, x, y) => {
        if (Math.abs(deltaY) > 0) this.cam.zoomAt(Math.exp(-deltaY * 0.0015), x, y);
      },
    });

    // Pre-generate the focus level so tapping Play is instant.
    window.setTimeout(() => generateLevel(Math.max(1, Math.min(LEVEL_COUNT, focusLevel))), 50);
    const ps = ctx.progress as { pendingBiomeUnlock?: string | null; available: boolean };
    if (ps.pendingBiomeUnlock) {
      showCelebration(ctx.hudHost, `🎉 ${ps.pendingBiomeUnlock} unlocked!`, 2600);
      ps.pendingBiomeUnlock = null;
    }
    if (!ctx.progress.available && !MetaMap.noticeShown) {
      MetaMap.noticeShown = true;
      this.overlay = showNotice(ctx.hudHost, 'Progress won’t be saved', 'This browser does not allow saving. You can still play every unlocked level.');
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
    this.ctx.gfx.render(this.scene, this.cam.camera);
  }

  resize(width: number, height: number): void {
    this.cam.setViewport(width, height, this.insets());
    this.focusBiome(this.biome, true);
  }

  hidden(): void {
    this.ctx.sound.suspend();
  }

  dispose(): void {
    this.overlay?.close();
    this.gestures.dispose();
    this.hud.remove();
    this.engine.dispose();
    for (const d of this.disposables) d.dispose();
  }

  levelMarkerScreenPosition(level: number): { x: number; y: number } | null {
    const p = tokenPosition(level);
    return this.cam.project(p.x, TOKEN_Y, p.z);
  }

  private insets() {
    const top = this.hud.querySelector('.map-top')?.getBoundingClientRect();
    const bottom = this.hud.querySelector('.map-bottom')?.getBoundingClientRect();
    return { top: (top?.bottom ?? 60) + 4, bottom: bottom ? window.innerHeight - bottom.top + 4 : 70, left: 4, right: 4 };
  }

  private focusBiome(index: number, snap = false): void {
    this.biome = Math.max(0, Math.min(BIOMES.length - 1, index));
    const c = plateCenter(this.biome);
    this.cam.setBounds({ minX: c.x - PLATE_W / 2, maxX: c.x + PLATE_W / 2, minZ: -PLATE_D / 2, maxZ: PLATE_D / 2, height: 1.2 });
    if (snap) this.cam.snapToOverview();
    else this.cam.showOverview();
    this.title.textContent = BIOMES[this.biome]?.name ?? '';
  }

  private nearestBiome(): number {
    const ground = this.cam.groundAt(window.innerWidth / 2, window.innerHeight / 2, new THREE.Vector3());
    if (!ground) return this.biome;
    return Math.max(0, Math.min(BIOMES.length - 1, Math.round(ground.x / PLATE_STEP)));
  }

  private updateBiomeFromCamera(): void {
    this.title.textContent = BIOMES[this.nearestBiome()]?.name ?? '';
  }

  private tap(x: number, y: number): void {
    if (this.overlay) return;
    let best = -1;
    let bestDist = PICK_PX;
    for (let level = 1; level <= LEVEL_COUNT; level++) {
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
    let orderPreview = '';
    if (unlocked) {
      const def = generateLevel(level);
      orderPreview = def.order.lines.map((l) => `<span class="mini-line">${toyIcon(l.type, 26)}${l.quantity}</span>`).join('<span class="order-arrow">➜</span>');
    }
    this.overlay = showLevelCard(
      this.ctx.hudHost,
      {
        level,
        unlocked,
        stars: progress.stars(level),
        best: progress.best(level),
        secretAvailable: level >= 22,
        secretFound: progress.secret(level),
        orderPreview,
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
