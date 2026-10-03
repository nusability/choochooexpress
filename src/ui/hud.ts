// In-level 3D HUD (spec F-008 FR-059/FR-065; F-003 FR-021; F-002 FR-019): title bar, order card
// with turning 3D toys and live counts, wagon gauges, Go / restart / camera buttons, hint bubble
// and toast — all three.js geometry in the interface layer (research R18).
import type { CameraMode, Insets } from '../graphics/cameraController';
import type { OrderLine, Phase, ToyType } from '../engine/types';
import type { MeshBuilder } from './kit/builder';
import { Button, LiveItem, UiItem } from './kit/items';
import { UI } from './kit/palette';
import { measure } from './kit/text3d';
import type { Layoutable, UiLayer } from './kit/uiLayer';
import type { Hop } from './kit/wiggle';

export interface HudCallbacks {
  onGo(): void;
  onPause(): void;
  onRestart(): void;
  onMap(): void;
  onCamera(): void;
  onMute(): void;
}

export interface HudOptions {
  title: string;
  order: readonly OrderLine[];
  wagons: number;
  capacity: number;
  muted: boolean;
}

const BTN = 46;
const DROP = 7; // ink base below a toy block (rim + drop)
const TOY = 26;
const LINE_MIN = 52;
const ARROW_W = 22;
const BAR_W = 48;
const BAR_H = 18;

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Draws a toy-like text label with a dark offset copy behind it (legible on any background). With
 * `hop`, the letters and their shadows hop together in a wave (FR-067 b).
 */
export function embossedText(b: MeshBuilder, text: string, size: number, x: number, y: number, z: number, color: string, opts: { align?: 'left' | 'center' | 'right'; maxWidth?: number; hop?: Hop } = {}): number {
  const style = { size, depth: size * 0.22, align: opts.align ?? 'center', maxWidth: opts.maxWidth, minSize: size * 0.7 };
  b.text(text, { ...style, depth: size * 0.1 }, x + size * 0.06, y - size * 0.1, z, '#1b120c', true, opts.hop);
  return b.text(text, style, x, y, z + size * 0.05, color, false, opts.hop).width;
}

/** Gentle hop for headings: noticeable, never in the way of reading. */
export const HEADING_HOP: Hop = { height: 2.2, step: 0.5, speed: 3.2, roll: 0.07 };

export class Hud implements Layoutable {
  private readonly back: Button;
  private readonly pause: Button;
  private readonly mute: Button;
  private readonly restart: Button;
  private readonly go: Button;
  private readonly camera: Button;
  private readonly title: LiveItem;
  private readonly card: UiItem;
  private readonly toys: UiItem[] = [];
  private readonly counts: LiveItem[] = [];
  private readonly strip: UiItem;
  private readonly gauges: LiveItem;
  private readonly hint: LiveItem;
  private readonly toast: LiveItem;
  private readonly have: number[];
  private pct: number[];
  private cameraIcon: 'overview' | 'follow' = 'follow';
  private hintText: string | null = null;
  private toastText = '';
  private toastLeft = 0;
  private lineX: number[] = [];
  private lineW: number[] = [];
  private cardBox: Box = { x: 0, y: 0, w: 0, h: 0 };
  private stripBox: Box = { x: 0, y: 0, w: 0, h: 0 };
  private barX: number[] = [];
  private controlsTop = 0;
  private controlsLeft = 0;
  private barBottom = 0;
  /** Called after every layout, so the board camera can refit to the new insets. */
  onLayout: (() => void) | null = null;

  constructor(
    private readonly ui: UiLayer,
    private readonly opts: HudOptions,
    cb: HudCallbacks,
  ) {
    const icon = (id: string, label: string, name: 'back' | 'pause' | 'soundOn' | 'soundOff' | 'restart' | 'follow', onTap: () => void) =>
      new Button(ui, { id, label, look: { w: BTN, h: BTN, cap: UI.cream, icon: name }, onTap });
    this.back = icon('back', 'Back to the map', 'back', cb.onMap);
    this.pause = icon('pause', 'Pause', 'pause', cb.onPause);
    this.mute = icon('mute', 'Sound on or off', opts.muted ? 'soundOff' : 'soundOn', cb.onMute);
    this.restart = icon('restart', 'Restart level', 'restart', cb.onRestart);
    this.camera = icon('camera', 'Follow the train or show the whole board', 'follow', cb.onCamera);
    this.go = new Button(ui, { id: 'go', label: 'Start the train', look: { w: 140, h: 62, cap: UI.green, text: 'GO!', textSize: 27, ink: UI.white, radius: 22, hop: 3 }, onTap: cb.onGo });
    this.go.idle = { breathe: 0.035, wobble: 0.05, bob: 3, speed: 3.3 };
    this.title = new LiveItem(ui, { id: 'title', text: opts.title });
    this.card = new UiItem(ui, { id: 'order', text: 'Toy Store order' });
    opts.order.forEach((line) => {
      const toy = new UiItem(ui, { id: `order.toy.${line.type}` });
      toy.build((b) => b.toy(line.type as ToyType, TOY, 0, 0, -TOY / 2, 0, 0));
      toy.idle = { bob: 1.5, speed: 2.6 };
      toy.animate = (it, _dt, t) => {
        it.group.rotation.x = 0.45;
        it.group.rotation.y = -0.6 + t * 0.9;
      };
      toy.group.rotation.set(0.45, -0.6, 0);
      this.toys.push(toy);
      this.counts.push(new LiveItem(ui));
    });
    this.have = opts.order.map(() => 0);
    this.pct = Array.from({ length: opts.wagons }, () => 0);
    this.strip = new UiItem(ui, { id: 'wagons' });
    this.gauges = new LiveItem(ui);
    this.hint = new LiveItem(ui, { id: 'hint' });
    this.hint.idle = { bob: 4, wobble: 0.025, breathe: 0.01, speed: 2.6 };
    this.hint.setVisible(false);
    this.toast = new LiveItem(ui, { id: 'toast', layer: 'top' });
    this.toast.idle = { wobble: 0.04, breathe: 0.02, speed: 3 };
    this.toast.setVisible(false);
    this.card.idle = { wobble: 0.012, breathe: 0.006, speed: 1.6 };
    this.strip.idle = { wobble: 0.01, speed: 1.4 };
    ui.addLayoutable(this);
    this.layout();
  }

  // -------------------------------------------------------------------------------------------
  // Layout (portrait / phone held sideways)

  layout(): void {
    const { width: W, height: H, safe } = this.ui;
    const side = this.ui.side;
    // Title bar.
    const barY = safe.top + 8 + BTN / 2;
    const left = safe.left + 8;
    const right = W - safe.right - 8;
    this.back.at(left + BTN / 2, barY);
    this.mute.at(right - BTN / 2, barY);
    this.pause.at(right - BTN - 8 - BTN / 2, barY);
    this.barBottom = barY + BTN / 2 + DROP;
    const titleL = left + BTN + 10;
    const titleR = right - 2 * BTN - 18;
    this.title.place((titleL + titleR) / 2, barY);
    this.title.setRect(titleL, barY - 12, titleR - titleL, 24);
    this.title.invalidate();
    this.title.set(`${this.opts.title}|${titleR - titleL}`, (b) => embossedText(b, this.opts.title, 17, 0, 0, 0, UI.cream, { maxWidth: titleR - titleL, hop: HEADING_HOP }));

    // Order card.
    const lines = this.opts.order;
    this.lineW = lines.map((l) => Math.max(LINE_MIN, measure(`${l.quantity}/${l.quantity}`, 13) + 8));
    const contentW = this.lineW.reduce((a, b) => a + b, 0) + Math.max(0, lines.length - 1) * ARROW_W;
    const cardW = Math.max(28 + contentW, measure('TOY STORE ORDER', 10, 0.08) + 28);
    const cardH = 82;
    const cardX = side ? left : W / 2 - cardW / 2;
    const cardY = this.barBottom + 6;
    this.cardBox = { x: cardX, y: cardY, w: cardW, h: cardH };
    this.lineX = [];
    let x = cardX + (cardW - contentW) / 2;
    lines.forEach((_, i) => {
      const w = this.lineW[i] as number;
      this.lineX.push(x + w / 2);
      x += w + ARROW_W;
    });
    const cx = cardX + cardW / 2;
    const cy = cardY + cardH / 2;
    this.card.place(cx, cy).setRect(cardX, cardY, cardW, cardH);
    this.card.build((b) => {
      const front = b.toyBlock(cardW, cardH, 18, UI.cream, 0, 0, 0);
      b.text('TOY STORE ORDER', { size: 10, depth: 1.5, tracking: 0.08 }, 0, cardH / 2 - 13, front, UI.inkSoft, false, { height: 1, step: 0.4, speed: 2.4, roll: 0.05 });
      for (let i = 1; i < lines.length; i++) {
        const ax = (this.lineX[i - 1] as number) + (this.lineW[i - 1] as number) / 2 + ARROW_W / 2 - cx;
        b.icon('arrow', 13, ax, 3, front, 2, UI.inkSoft);
      }
    });
    const toyY = cy - 2;
    this.toys.forEach((toy, i) => toy.place(this.lineX[i] as number, toyY, 13.5 + TOY / 2 + 2));
    this.counts.forEach((c, i) => {
      c.place(this.lineX[i] as number, cardY + cardH - 17);
      c.invalidate();
    });
    this.refreshCounts();

    // Wagon gauges.
    const n = this.opts.wagons;
    const stripW = 16 + 24 + n * (BAR_W + 6);
    const stripH = 28;
    const stripX = side ? left : W / 2 - stripW / 2;
    const stripY = cardY + cardH + DROP + 5;
    this.stripBox = { x: stripX, y: stripY, w: stripW, h: stripH };
    const sx = stripX + stripW / 2;
    const sy = stripY + stripH / 2;
    this.barX = Array.from({ length: n }, (_, k) => stripX + 8 + 24 + k * (BAR_W + 6) + BAR_W / 2);
    this.strip.place(sx, sy).setRect(stripX, stripY, stripW, stripH);
    this.strip.build((b) => {
      b.slab(stripW, stripH, 12, 5, UI.strip, 0, 0, 0, 1.5);
      // The little engine chugs along (FR-067).
      const ex = stripX + 8 + 10 - sx;
      b.wiggle = { phase: 0, hop: 1.6, roll: 0.07, speed: 7, px: ex, py: -6 };
      b.icon('train', 20, ex, 0, 5, 3, UI.red, UI.ink);
      b.wiggle = null;
      this.barX.forEach((bx) => b.toyBlock(BAR_W, BAR_H, 6, UI.cream, bx - sx, 0, 5, { rim: 2, drop: 0, depth: 5 }));
    });
    this.gauges.place(sx, sy, 5 + 5 * 1.35);
    this.gauges.invalidate();
    this.refreshGauges();

    // Controls.
    const goLook = side ? { w: 116, h: 54, textSize: 23 } : { w: 140, h: 62, textSize: 27 };
    this.go.setLook(goLook);
    if (side) {
      const colW = goLook.w;
      const colX = right - colW / 2;
      const midY = (this.barBottom + H - safe.bottom) / 2;
      this.restart.at(colX, midY - goLook.h / 2 - 14 - BTN / 2);
      this.go.at(colX, midY);
      this.camera.at(colX, midY + goLook.h / 2 + 14 + BTN / 2);
      this.controlsLeft = colX - colW / 2 - 4;
      this.controlsTop = H;
    } else {
      const rowY = H - safe.bottom - 12 - DROP - goLook.h / 2;
      this.go.at(W / 2, rowY);
      this.restart.at(W / 2 - goLook.w / 2 - 18 - BTN / 2, rowY);
      this.camera.at(W / 2 + goLook.w / 2 + 18 + BTN / 2, rowY);
      this.controlsTop = rowY - goLook.h / 2 - 4;
      this.controlsLeft = W;
    }
    this.layoutHint();
    this.layoutToast();
    this.onLayout?.();
  }

  private layoutHint(): void {
    const text = this.hintText;
    this.hint.setVisible(!!text);
    if (!text) return;
    const { width: W, height: H, safe } = this.ui;
    const side = this.ui.side;
    const maxW = Math.min(300, W - 32);
    const pad = 14;
    let box = { w: 0, h: 0 };
    const bottom = side ? H - safe.bottom - 12 - DROP : this.controlsTop - 12 - DROP;
    this.hint.invalidate();
    this.hint.set(`${text}|${W}x${H}`, (b) => {
      // Measure first (wrap inside the bubble), then draw the bubble around the text.
      const probe = b.text(text, { size: 15, depth: 2, maxWidth: maxW - pad * 2, wrap: true }, 0, 0, 13.5, UI.ink);
      box = { w: Math.min(maxW, probe.width + pad * 2), h: probe.height + 22 };
      b.toyBlock(box.w, box.h, 16, UI.cream, 0, 0, 0);
    });
    const cxh = side ? (this.cardBox.x + this.cardBox.w + this.controlsLeft) / 2 : W / 2;
    const cy = bottom - box.h / 2;
    this.hint.place(cxh, cy).setRect(cxh - box.w / 2, cy - box.h / 2, box.w, box.h + DROP);
  }

  private layoutToast(): void {
    if (!this.toastText) return;
    const { width: W, height: H, safe } = this.ui;
    const text = this.toastText;
    let w = 0;
    this.toast.invalidate();
    this.toast.set(`${text}|${W}`, (b) => {
      const t = b.text(text, { size: 14, depth: 2, maxWidth: W - 64 }, 0, 0, 10, UI.cream);
      w = t.width + 28;
      b.toyBlock(w, 30, 14, UI.ink, 0, 0, 0, { ink: '#20160f', rim: 2, drop: 3, depth: 7 });
    });
    const above = this.hint.group.visible ? this.hint.rect.y : this.ui.side ? H - safe.bottom - 12 : this.controlsTop;
    const cy = above - 12 - 15;
    const cxt = this.ui.side ? (this.cardBox.x + this.cardBox.w + this.controlsLeft) / 2 : W / 2;
    this.toast.place(cxt, cy).setRect(cxt - w / 2, cy - 15, w, 30);
  }

  /** Screen areas covered by the HUD, for camera framing. */
  get insets(): Insets {
    const { width: W, height: H } = this.ui;
    const hintTop = this.hint.group.visible ? this.hint.rect.y : null;
    if (this.ui.side) {
      return {
        top: this.barBottom + 6,
        bottom: hintTop !== null ? H - hintTop + 6 : 8,
        left: Math.max(this.cardBox.x + this.cardBox.w, this.stripBox.x + this.stripBox.w) + DROP + 6,
        right: W - this.controlsLeft + 6,
      };
    }
    const bottomTop = Math.min(this.controlsTop, hintTop ?? Infinity);
    return { top: this.stripBox.y + this.stripBox.h + 8, bottom: H - bottomTop + 6, left: 8, right: 8 };
  }

  // -------------------------------------------------------------------------------------------
  // Live state

  setPhase(phase: Phase): void {
    this.go.setVisible(phase === 'planning');
  }

  setLoaded(byType: Partial<Record<ToyType, number>>): void {
    // Lines with the same type share their count, assigned to lines in order.
    const remaining: Partial<Record<ToyType, number>> = { ...byType };
    let changed = false;
    this.opts.order.forEach((line, i) => {
      const have = Math.min(line.quantity, remaining[line.type] ?? 0);
      remaining[line.type] = (remaining[line.type] ?? 0) - have;
      if (this.have[i] !== have) {
        this.have[i] = have;
        changed = true;
      }
    });
    if (changed) this.refreshCounts();
  }

  private refreshCounts(): void {
    this.opts.order.forEach((line, i) => {
      const have = this.have[i] as number;
      const done = have >= line.quantity;
      const text = `${have}/${line.quantity}`;
      const item = this.counts[i] as LiveItem;
      if (item.text && item.text !== text && have > 0) {
        // Counters pop and toys hop as toys arrive (FR-067 c, f).
        item.kick(0.3);
        if (done && !item.text.startsWith(`${line.quantity}/`)) this.toys[i]?.hop(14);
        else this.toys[i]?.hop(3);
      }
      item.text = text;
      item.set(`${text}|${done}`, (b) => {
        b.text(text, { size: 13, depth: 2 }, 0, 0, 13.5, UI.ink);
        if (done) {
          // Green check badge at the toy's top-right, in front of the turning toy.
          const bx = (this.lineW[i] as number) / 2 - 7;
          b.disc(9, 4, UI.ink, bx, 27, 40);
          b.disc(7.5, 4, UI.good, bx, 27, 41.5);
          b.icon('check', 10, bx, 27, 45.5, 2, UI.white);
        }
      });
    });
  }

  setWagons(loads: readonly { total: number }[], capacity: number): void {
    const pct = loads.map((l) => Math.min(100, Math.round((l.total / capacity) * 100)));
    if (pct.join(',') === this.pct.join(',')) return;
    this.pct = pct;
    this.refreshGauges();
    // The gauges jiggle as the wagons fill (FR-067 c).
    this.gauges.kick(0.12, 0.2);
    this.strip.kick(0.06, 0.2);
  }

  private refreshGauges(): void {
    const sx = this.stripBox.x + this.stripBox.w / 2;
    const pct = this.pct;
    this.gauges.text = pct.map((p) => `${p}%`).join(' ');
    this.gauges.set(pct.join(','), (b) => {
      pct.forEach((p, k) => {
        const bx = (this.barX[k] as number) - sx;
        const warn = p >= 90;
        const fill = ((BAR_W - 2) * p) / 100;
        if (fill > 0.5) b.box(fill, BAR_H - 2, 1.5, warn ? UI.warn : UI.green, bx - (BAR_W - 2) / 2 + fill / 2, 0, 0);
        const label = `${p}%`;
        const tw = measure(label, 10);
        const iconW = warn ? 11 : 0;
        const x0 = bx - (tw + iconW) / 2;
        if (warn) {
          // Warning triangles shake (FR-067 c).
          b.wiggle = { phase: k, hop: 1, roll: 0.35, speed: 15, px: x0 + 4.5, py: 0 };
          b.icon('warn', 10, x0 + 4.5, 0, 2, 1.5, UI.yellow, UI.ink);
          b.wiggle = null;
        }
        b.text(label, { size: 10, depth: 1.2, align: 'left' }, x0 + iconW, 0, 2, warn ? UI.white : UI.ink);
      });
    });
  }

  setCameraMode(mode: CameraMode): void {
    const icon = mode === 'follow' ? 'overview' : 'follow';
    if (this.cameraIcon === icon) return;
    this.cameraIcon = icon;
    this.camera.setLook({ icon });
    this.camera.kick(0.25);
  }

  setMuted(muted: boolean): void {
    this.mute.setLook({ icon: muted ? 'soundOff' : 'soundOn' });
    this.mute.kick(0.3);
  }

  /** "Locked" feedback: the HUD's toast and the pressed switch shake (LevelSession calls this). */
  shakeToast(): void {
    this.toast.shake(0.5);
  }

  showHint(text: string | null): void {
    if (text === this.hintText) return;
    this.hintText = text;
    this.hint.text = text ?? '';
    this.layoutHint();
    if (text) this.hint.pop();
    this.layoutToast();
    this.onLayout?.();
  }

  showToast(text: string, ms = 1400): void {
    const fresh = !this.toast.group.visible || this.toastText !== text;
    this.toastText = text;
    this.toast.text = text;
    this.toastLeft = ms / 1000;
    this.layoutToast();
    this.toast.setVisible(true);
    if (fresh) this.toast.pop();
  }

  /** Per-frame timers (toast). */
  frame(dt: number): void {
    if (this.toastLeft > 0) {
      this.toastLeft -= dt;
      if (this.toastLeft <= 0) {
        this.toast.setVisible(false);
        this.toastText = '';
      }
    }
  }

  dispose(): void {
    this.ui.removeLayoutable(this);
    for (const item of [this.back, this.pause, this.mute, this.restart, this.go, this.camera, this.title, this.card, this.strip, this.gauges, this.hint, this.toast, ...this.toys, ...this.counts]) {
      item.dispose();
    }
  }
}
