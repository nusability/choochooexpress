// The 3D interface layer (research R18, spec F-008): scenes drawn over the game scene on the same
// canvas, a camera where 1 unit = 1 CSS pixel on the plane z = 0 (y = −screenY), shared lights and
// material, safe-area insets, and the registry of widgets used for input and the test hook.
import * as THREE from 'three';
import type { UiItem } from './items';

export type LayerName = 'hud' | 'cards' | 'top';
export const LAYERS: readonly LayerName[] = ['hud', 'cards', 'top'];

export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** Phones held sideways: order card on the left, controls on the right (FR-065). */
export function isSideLayout(width: number, height: number): boolean {
  return width > height && height <= 540;
}

export interface WidgetInfo {
  id: string;
  label: string;
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
  enabled: boolean;
  button: boolean;
  layer: LayerName;
}

/** Anything that must be laid out again after a resize (HUD, open cards). */
export interface Layoutable {
  layout(): void;
}

/** An open card: it receives every touch (FR-064). */
export interface ModalHandle {
  /** A tap that hit none of the card's buttons. */
  onBackdropTap?(): void;
  /** Widgets the card owns (only these can be pressed while it is open). */
  owns(item: UiItem): boolean;
}

/** Tangent of the half angle the long screen side spans: perspective shows some depth near edges. */
const EDGE_TAN = 0.3;

export class UiLayer {
  readonly camera = new THREE.PerspectiveCamera(30, 1, 1, 10000);
  /** Shared material of every interface mesh. */
  readonly material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0, toneMapped: false });
  width = 1;
  height = 1;
  safe: Insets = { top: 0, right: 0, bottom: 0, left: 0 };
  reducedMotion = false;
  time = 0;
  /** Played when a button acts. */
  onButton: (() => void) | null = null;
  private readonly scenes = new Map<LayerName, THREE.Scene>();
  private readonly items = new Set<UiItem>();
  private readonly layoutables = new Set<Layoutable>();
  private readonly modals: ModalHandle[] = [];
  private readonly probe: HTMLElement;
  private readonly motionQuery: MediaQueryList | null;

  constructor() {
    for (const name of LAYERS) {
      const scene = new THREE.Scene();
      const hemi = new THREE.HemisphereLight('#ffffff', '#b9a78f', 1.7);
      const sun = new THREE.DirectionalLight('#ffffff', 2.1);
      sun.position.set(-0.35, 0.6, 1).multiplyScalar(1000);
      scene.add(hemi, sun, sun.target);
      this.scenes.set(name, scene);
    }
    // Invisible probe for env(safe-area-inset-*) (not interface: it is never visible).
    this.probe = document.createElement('div');
    this.probe.setAttribute('aria-hidden', 'true');
    this.probe.style.cssText =
      'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;' +
      'padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)';
    document.body.append(this.probe);
    this.motionQuery = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    this.reducedMotion = this.motionQuery?.matches ?? false;
    this.motionQuery?.addEventListener('change', (e) => {
      this.reducedMotion = e.matches;
    });
  }

  get side(): boolean {
    return isSideLayout(this.width, this.height);
  }

  scene(layer: LayerName): THREE.Scene {
    return this.scenes.get(layer) as THREE.Scene;
  }

  resize(width: number, height: number): void {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    const dist = Math.max(this.width, this.height) / 2 / EDGE_TAN;
    this.camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(this.height / 2 / dist));
    this.camera.aspect = this.width / this.height;
    this.camera.near = Math.max(1, dist - 1000);
    this.camera.far = dist + 1000;
    this.camera.position.set(this.width / 2, -this.height / 2, dist);
    this.camera.lookAt(this.width / 2, -this.height / 2, 0);
    this.camera.updateProjectionMatrix();
    this.readSafeArea();
    this.relayout();
    // iOS updates the safe area after the resize event; check again on the next frame.
    requestAnimationFrame(() => {
      if (this.readSafeArea()) this.relayout();
    });
  }

  private readSafeArea(): boolean {
    const cs = getComputedStyle(this.probe);
    const next = {
      top: parseFloat(cs.paddingTop) || 0,
      right: parseFloat(cs.paddingRight) || 0,
      bottom: parseFloat(cs.paddingBottom) || 0,
      left: parseFloat(cs.paddingLeft) || 0,
    };
    const changed = next.top !== this.safe.top || next.right !== this.safe.right || next.bottom !== this.safe.bottom || next.left !== this.safe.left;
    this.safe = next;
    return changed;
  }

  private relayout(): void {
    for (const l of [...this.layoutables]) l.layout();
  }

  addLayoutable(l: Layoutable): void {
    this.layoutables.add(l);
  }

  removeLayoutable(l: Layoutable): void {
    this.layoutables.delete(l);
  }

  register(item: UiItem): void {
    this.items.add(item);
  }

  unregister(item: UiItem): void {
    this.items.delete(item);
  }

  pushModal(m: ModalHandle): void {
    this.modals.push(m);
  }

  popModal(m: ModalHandle): void {
    const i = this.modals.lastIndexOf(m);
    if (i >= 0) this.modals.splice(i, 1);
  }

  get modal(): ModalHandle | null {
    return this.modals[this.modals.length - 1] ?? null;
  }

  update(dt: number): void {
    this.time += dt;
    for (const item of [...this.items]) item.update(dt);
  }

  render(renderer: THREE.WebGLRenderer): void {
    const autoClear = renderer.autoClear;
    renderer.autoClear = false;
    for (const name of LAYERS) {
      const scene = this.scene(name);
      // Lights and the light target are always there; skip empty layers.
      if (scene.children.length <= 3) continue;
      renderer.clearDepth();
      renderer.render(scene, this.camera);
    }
    renderer.autoClear = autoClear;
  }

  /** Topmost pressable widget under a screen point (only the open card's, if one is open). */
  hitTest(x: number, y: number): UiItem | null {
    const modal = this.modal;
    let best: UiItem | null = null;
    let bestRank = -1;
    let order = 0;
    for (const item of this.items) {
      order++;
      if (!item.button || !item.shown || !item.contains(x, y)) continue;
      if (modal && !modal.owns(item)) continue;
      const rank = LAYERS.indexOf(item.layer) * 100000 + order;
      if (rank > bestRank) {
        bestRank = rank;
        best = item;
      }
    }
    return best;
  }

  /** Visible widgets for the test hook, topmost layer first. */
  widgets(): WidgetInfo[] {
    const list = [...this.items].filter((i) => i.shown && (i.button || i.id));
    list.sort((a, b) => LAYERS.indexOf(b.layer) - LAYERS.indexOf(a.layer));
    return list.map((i) => ({
      id: i.id,
      label: i.label,
      text: i.text,
      x: Math.round(i.rect.x * 10) / 10,
      y: Math.round(i.rect.y * 10) / 10,
      w: Math.round(i.rect.w * 10) / 10,
      h: Math.round(i.rect.h * 10) / 10,
      enabled: i.enabled,
      button: i.button,
      layer: i.layer,
    }));
  }

  /** Screen position (CSS px) of a point in interface space. */
  toScreen(v: THREE.Vector3): { x: number; y: number } {
    const p = v.clone().project(this.camera);
    return { x: ((p.x + 1) / 2) * this.width, y: ((1 - p.y) / 2) * this.height };
  }
}
