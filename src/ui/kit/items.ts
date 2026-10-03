// Interface widgets (spec FR-059, FR-063, FR-066/FR-067): a merged mesh per widget, a screen
// rectangle for touch, the id/label/text the test hook reports, and springy whimsical motion —
// idle breathing and wobble, squash on press with a jelly spring back, kicks, hops, shakes and
// pop-ins (research R23). Touch rectangles never move (FR-068).
import * as THREE from 'three';
import { MeshBuilder } from './builder';
import type { IconName } from './icons3d';
import { UI } from './palette';
import { measure } from './text3d';
import type { LayerName, UiLayer } from './uiLayer';
import { phaseOf, type Hop } from './wiggle';

export interface ItemOptions {
  id?: string;
  label?: string;
  text?: string;
  layer?: LayerName;
  /** Attach to another item's group or to a group (cards) instead of the layer's scene. */
  parent?: UiItem | THREE.Object3D;
}

const easeOutBack = (t: number) => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2);

/** Idle life of a widget: breathing scale, wobbling roll, little hops. */
export interface Idle {
  /** Scale breathing, as a fraction of the size. */
  breathe?: number;
  /** Roll wobble in radians. */
  wobble?: number;
  /** Hop height in px (always upward). */
  bob?: number;
  /** Radians per second. */
  speed?: number;
}

/** A damped spring toward a target (under-damped: it overshoots, like jelly). */
class Spring {
  value = 0;
  velocity = 0;

  constructor(
    private readonly stiffness: number,
    private readonly damping: number,
  ) {}

  step(target: number, dt: number): void {
    // Small sub-steps keep stiff springs stable on slow frames.
    const n = Math.max(1, Math.ceil(dt / (1 / 120)));
    const h = dt / n;
    for (let i = 0; i < n; i++) {
      this.velocity += (this.stiffness * (target - this.value) - this.damping * this.velocity) * h;
      this.value += this.velocity * h;
    }
  }

  park(): void {
    this.value = 0;
    this.velocity = 0;
  }
}

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
  /** Drag handler (sliders such as the playback scrubber); the widget must be a `button`. */
  onDrag: ((x: number, y: number, phase: 'start' | 'move' | 'end') => void) | null = null;
  /** Per-frame animation hook (`t` = interface time in seconds). */
  animate: ((item: UiItem, dt: number, t: number) => void) | null = null;
  /** Resting position (the group's position before animation offsets). */
  readonly home = new THREE.Vector3();
  /** Idle whimsy (FR-067); null holds still between kicks. */
  idle: Idle | null = null;
  /** Spin a full turn while popping in (stars). */
  popSpin = false;
  private readonly phase: number;
  private pressTarget = 0;
  private press = 0;
  private popAt = -1;
  private readonly squash = new Spring(420, 13);
  private readonly kickS = new Spring(260, 9);
  private readonly hopS = new Spring(220, 11);
  private shakeLeft = 0;
  private lastKick = -1;

  constructor(
    readonly ui: UiLayer,
    opts: ItemOptions = {},
  ) {
    this.id = opts.id ?? '';
    this.label = opts.label ?? '';
    this.text = opts.text ?? '';
    this.layer = opts.parent instanceof UiItem ? opts.parent.layer : (opts.layer ?? 'hud');
    this.phase = phaseOf(`${this.id}|${ui.time}|${Math.random()}`);
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

  /** Grow in with a little bounce after `delay` seconds (FR-067). */
  pop(delay = 0): void {
    if (this.ui.reducedMotion) {
      this.popAt = -1;
      return;
    }
    this.popAt = this.ui.time + delay;
    this.group.scale.setScalar(0.001);
  }

  /** A springy scale bump (counters, gauges); repeated kicks within `gap` seconds are ignored. */
  kick(amount = 0.35, gap = 0.12): void {
    if (this.ui.time - this.lastKick < gap) return;
    this.lastKick = this.ui.time;
    this.kickS.velocity += amount * 12;
  }

  /** A little jump (toy symbols when their count rises). */
  hop(height = 10): void {
    this.hopS.velocity += height * 14;
  }

  /** Shake for a moment (locked or warning feedback). */
  shake(seconds = 0.5): void {
    this.shakeLeft = Math.max(this.shakeLeft, seconds);
  }

  private applyPress(): void {
    const inf = this.mesh.morphTargetInfluences;
    if (inf && inf.length > 0) inf[0] = this.press;
  }

  update(dt: number): void {
    // The cap sinking in is feedback, not decoration: it runs even with reduced motion.
    if (this.press !== this.pressTarget) {
      const k = Math.min(1, dt * 30);
      this.press += (this.pressTarget - this.press) * k;
      if (Math.abs(this.press - this.pressTarget) < 0.01) this.press = this.pressTarget;
      this.applyPress();
    }
    const g = this.group;
    if (this.ui.reducedMotion) {
      this.squash.park();
      this.kickS.park();
      this.hopS.park();
      this.shakeLeft = 0;
      this.popAt = -1;
      g.position.copy(this.home);
      g.scale.setScalar(1);
      g.rotation.z = 0;
      if (this.popSpin) g.rotation.y = 0;
      return;
    }
    const t = this.ui.time;
    this.squash.step(this.pressTarget, dt);
    this.kickS.step(0, dt);
    this.hopS.step(0, dt);
    let pop = 1;
    let spin = 0;
    if (this.popAt >= 0) {
      const k = (t - this.popAt) / 0.38;
      if (k >= 1) this.popAt = -1;
      else {
        pop = k <= 0 ? 0.001 : Math.max(0.001, easeOutBack(k));
        if (this.popSpin) spin = (1 - Math.min(1, Math.max(0, k))) * -Math.PI * 2;
      }
    }
    const idle = this.idle;
    const speed = idle?.speed ?? 2.2;
    const breathe = idle?.breathe ? Math.sin(t * speed + this.phase) * idle.breathe : 0;
    const wobble = idle?.wobble ? Math.sin(t * speed * 0.77 + this.phase * 1.7) * idle.wobble : 0;
    const bob = idle?.bob ? Math.abs(Math.sin(t * speed + this.phase)) * idle.bob : 0;
    const sq = this.squash.value;
    const s = pop * (1 + breathe + this.kickS.value);
    g.scale.set(s * (1 + sq * 0.08), s * (1 - sq * 0.13), s);
    g.position.set(this.home.x, this.home.y + bob + Math.max(0, this.hopS.value), this.home.z);
    let roll = wobble;
    if (this.shakeLeft > 0) {
      this.shakeLeft -= dt;
      roll += Math.sin(t * 46) * 0.12 * Math.min(1, this.shakeLeft * 4);
    }
    g.rotation.z = roll;
    if (this.popSpin) g.rotation.y = spin;
    if (this.animate) this.animate(this, dt, t);
  }

  /** Stop taking part in input and the test hook (an exiting widget), keeping its mesh. */
  detach(): void {
    this.ui.unregister(this);
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
  /** Letters hop in a wave, this high (px). */
  hop?: number;
}

/** A chunky toy button: sinks while pressed and acts on release (FR-063). */
export class Button extends UiItem {
  private look: ButtonLook;

  constructor(ui: UiLayer, opts: ItemOptions & { look: ButtonLook; onTap: () => void }) {
    super(ui, opts);
    this.button = true;
    this.onTap = opts.onTap;
    this.look = opts.look;
    // Every button is a little alive (FR-067 a).
    this.idle = { breathe: 0.02, wobble: 0.03, speed: 2.1 };
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
    const hop: Hop | undefined = l.hop ? { height: l.hop, step: 0.6, speed: 3.6, roll: 0.07 } : undefined;
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
      if (l.text) b.text(l.text, { size: textSize, depth: 3, align: 'left' }, x, 0, front, ink, false, hop);
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
