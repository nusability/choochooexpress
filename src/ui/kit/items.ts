// Interface widgets (spec FR-059, FR-063): a merged mesh per widget, a screen rectangle for touch,
// press and pop animations, and the id/label/text the test hook reports.
import * as THREE from 'three';
import { MeshBuilder } from './builder';
import type { IconName } from './icons3d';
import { UI } from './palette';
import { measure } from './text3d';
import type { LayerName, UiLayer } from './uiLayer';

export interface ItemOptions {
  id?: string;
  label?: string;
  text?: string;
  layer?: LayerName;
  /** Attach to another item's group or to a group (cards) instead of the layer's scene. */
  parent?: UiItem | THREE.Object3D;
}

const easeOutBack = (t: number) => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2);

export class UiItem {
  readonly group = new THREE.Group();
  readonly mesh: THREE.Mesh;
  id: string;
  label: string;
  text: string;
  readonly layer: LayerName;
  button = false;
  enabled = true;
  /** Screen rectangle in CSS px (touch target and test-hook bounds). */
  readonly rect = { x: 0, y: 0, w: 0, h: 0 };
  onTap: (() => void) | null = null;
  /** Per-frame animation hook (`t` = interface time in seconds). */
  animate: ((item: UiItem, dt: number, t: number) => void) | null = null;
  /** Resting position (the group's position before animation offsets). */
  readonly home = new THREE.Vector3();
  private pressTarget = 0;
  private press = 0;
  private popAt = -1;

  constructor(
    readonly ui: UiLayer,
    opts: ItemOptions = {},
  ) {
    this.id = opts.id ?? '';
    this.label = opts.label ?? '';
    this.text = opts.text ?? '';
    this.layer = opts.parent instanceof UiItem ? opts.parent.layer : (opts.layer ?? 'hud');
    this.mesh = new THREE.Mesh(new THREE.BufferGeometry(), ui.material);
    this.mesh.frustumCulled = false;
    this.group.add(this.mesh);
    const parent = opts.parent instanceof UiItem ? opts.parent.group : (opts.parent ?? ui.scene(this.layer));
    parent.add(this.group);
    ui.register(this);
  }

  /** Visible, including every parent group. */
  get shown(): boolean {
    let o: THREE.Object3D | null = this.group;
    while (o) {
      if (!o.visible) return false;
      o = o.parent;
    }
    return true;
  }

  /** Puts the origin at (x, y) in screen-style coordinates (y down), relative to the parent. */
  place(x: number, y: number, z = 0): this {
    this.home.set(x, -y, z);
    this.group.position.copy(this.home);
    return this;
  }

  setRect(x: number, y: number, w: number, h: number): this {
    this.rect.x = x;
    this.rect.y = y;
    this.rect.w = w;
    this.rect.h = h;
    return this;
  }

  contains(x: number, y: number): boolean {
    const r = this.rect;
    return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  }

  setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  setGeometry(geo: THREE.BufferGeometry): void {
    this.mesh.geometry.dispose();
    this.mesh.geometry = geo;
    if (geo.morphAttributes.position) {
      this.mesh.updateMorphTargets();
      this.applyPress();
    } else {
      this.mesh.morphTargetInfluences = undefined;
      this.mesh.morphTargetDictionary = undefined;
    }
  }

  build(fn: (b: MeshBuilder) => void): void {
    const b = new MeshBuilder();
    fn(b);
    this.setGeometry(b.build());
  }

  setPressed(pressed: boolean): void {
    this.pressTarget = pressed ? 1 : 0;
  }

  /** Grow in with a little bounce after `delay` seconds (FR-066). */
  pop(delay = 0): void {
    if (this.ui.reducedMotion) {
      this.group.scale.setScalar(1);
      this.popAt = -1;
      return;
    }
    this.popAt = this.ui.time + delay;
    this.group.scale.setScalar(0.001);
  }

  private applyPress(): void {
    const inf = this.mesh.morphTargetInfluences;
    if (inf && inf.length > 0) inf[0] = this.press;
  }

  update(dt: number): void {
    if (this.press !== this.pressTarget) {
      const k = Math.min(1, dt * 30);
      this.press += (this.pressTarget - this.press) * k;
      if (Math.abs(this.press - this.pressTarget) < 0.01) this.press = this.pressTarget;
      this.applyPress();
    }
    if (this.popAt >= 0) {
      const t = (this.ui.time - this.popAt) / 0.32;
      if (t >= 1) {
        this.group.scale.setScalar(1);
        this.popAt = -1;
      } else this.group.scale.setScalar(t <= 0 ? 0.001 : Math.max(0.001, easeOutBack(t)));
    }
    if (this.animate && !this.ui.reducedMotion) this.animate(this, dt, this.ui.time);
  }

  dispose(): void {
    this.ui.unregister(this);
    this.group.removeFromParent();
    this.mesh.geometry.dispose();
  }
}

export interface ButtonLook {
  w: number;
  h: number;
  radius?: number;
  /** Cap color; the base is ink. */
  cap: string;
  icon?: IconName;
  iconSize?: number;
  text?: string;
  textSize?: number;
  /** Lettering and icon color. */
  ink?: string;
}

/** A chunky toy button: sinks while pressed and acts on release (FR-063). */
export class Button extends UiItem {
  private look: ButtonLook;

  constructor(ui: UiLayer, opts: ItemOptions & { look: ButtonLook; onTap: () => void }) {
    super(ui, opts);
    this.button = true;
    this.onTap = opts.onTap;
    this.look = opts.look;
    this.rebuild();
  }

  setLook(look: Partial<ButtonLook>): void {
    this.look = { ...this.look, ...look };
    this.rebuild();
  }

  setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) return;
    this.enabled = enabled;
    this.rebuild();
  }

  /** Centers the button on screen point (cx, cy) and sets its touch rectangle. */
  at(cx: number, cy: number, ox = 0, oy = 0): this {
    this.place(cx - ox, cy - oy);
    this.setRect(cx - this.look.w / 2, cy - this.look.h / 2, this.look.w, this.look.h);
    return this;
  }

  get size(): { w: number; h: number } {
    return { w: this.look.w, h: this.look.h };
  }

  private rebuild(): void {
    const l = this.look;
    this.text = l.text ?? '';
    const cap = this.enabled ? l.cap : UI.disabledCap;
    const ink = this.enabled ? (l.ink ?? UI.ink) : UI.disabledInk;
    this.build((b) => {
      b.movable = true;
      const front = b.toyBlock(l.w, l.h, l.radius ?? Math.min(15, l.h / 3), cap, 0, 0, 0);
      const iconSize = l.iconSize ?? 22;
      const textSize = l.textSize ?? 16;
      const gap = l.icon && l.text ? 6 : 0;
      const textW = l.text ? measure(l.text, textSize) : 0;
      const iconW = l.icon ? iconSize : 0;
      const total = iconW + gap + textW;
      let x = -total / 2;
      if (l.icon) {
        b.icon(l.icon, iconSize, x + iconSize / 2, 0, front, 3, ink, cap);
        x += iconSize + gap;
      }
      if (l.text) b.text(l.text, { size: textSize, depth: 3, align: 'left' }, x, 0, front, ink);
    });
  }
}

/** A widget whose geometry is rebuilt whenever its content key changes (counters, gauges). */
export class LiveItem extends UiItem {
  private key: string | null = null;

  set(key: string, fn: (b: MeshBuilder) => void): void {
    if (key === this.key) return;
    this.key = key;
    const b = new MeshBuilder();
    fn(b);
    b.writeTo(this.mesh);
  }

  /** Forget the current content so the next `set` rebuilds (after a layout change). */
  invalidate(): void {
    this.key = null;
  }
}
