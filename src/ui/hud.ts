// In-level 3D HUD (spec F-008 FR-059/FR-065; F-009 FR-073; F-002 FR-019): title bar, order card
// with one column per wagon chute (wagon number, turning 3D toy, live count, fill gauge), Go /
// restart / camera buttons, hint bubble and toast — all three.js geometry in the interface layer
// (research R18).
import type { CameraMode, Insets } from '../graphics/cameraController';
import { WAGON_TRIMS } from '../graphics/trainView';
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
const LINE_MIN = 56;
const COL_GAP = 8;
const BAR_H = 9;
const CARD_H = 100;

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
    this.card = new UiItem(ui, { id: 'order', text: 'Toy Station order' });
    opts.order.forEach((line) => {
      const toy = new UiItem(ui, { id: `order.toy.${line.wagon}` });
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
    this.gauges = new LiveItem(ui, { id: 'wagons' });
    this.hint = new LiveItem(ui, { id: 'hint' });
    this.hint.idle = { bob: 4, wobble: 0.025, breathe: 0.01, speed: 2.6 };
    this.hint.setVisible(false);
    this.toast = new LiveItem(ui, { id: 'toast', layer: 'top' });
    this.toast.idle = { wobble: 0.04, breathe: 0.02, speed: 3 };
    this.toast.setVisible(false);
    this.card.idle = { wobble: 0.012, breathe: 0.006, speed: 1.6 };
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

    // Order card: one column per wagon chute (FR-073), each with its fill gauge (FR-019).
    const lines = this.opts.order;
    this.lineW = lines.map((l) => Math.max(LINE_MIN, measure(`${l.quantity}/${l.quantity}`, 13) + 12));
    const contentW = this.lineW.reduce((a, b) => a + b, 0) + Math.max(0, lines.length - 1) * COL_GAP;
    const cardW = Math.max(28 + contentW, measure('TOY STATION ORDER', 10, 0.08) + 28);
    const cardH = CARD_H;
    const cardX = side ? left : W / 2 - cardW / 2;
    const cardY = this.barBottom + 6;
    this.cardBox = { x: cardX, y: cardY, w: cardW, h: cardH };
    this.lineX = [];
    let x = cardX + (cardW - contentW) / 2;
    lines.forEach((_, i) => {
      const w = this.lineW[i] as number;
      this.lineX.push(x + w / 2);
      x += w + COL_GAP;
    });
    const cx = cardX + cardW / 2;
    const cy = cardY + cardH / 2;
    this.card.place(cx, cy).setRect(cardX, cardY, cardW, cardH);
    this.card.build((b) => {
      const front = b.toyBlock(cardW, cardH, 18, UI.cream, 0, 0, 0);
      b.text('TOY STATION ORDER', { size: 10, depth: 1.5, tracking: 0.08 }, 0, cardH / 2 - 13, front, UI.inkSoft, false, { height: 1, step: 0.4, speed: 2.4, roll: 0.05 });
      lines.forEach((line, i) => {
        const lx = (this.lineX[i] as number) - cx;
        const w = this.lineW[i] as number;
        const trim = WAGON_TRIMS[(line.wagon - 1) % WAGON_TRIMS.length] as string;
        // Column well, wagon badge in the wagon's trim color, gauge track.
        b.slab(w, cardH - 30, 10, 1.5, UI.row, lx, -7, front, 1);
        // In front of the turning toy.
        b.disc(9, 3, UI.ink, lx - w / 2 + 10, 10, front + 30);
        b.disc(7.8, 3, trim, lx - w / 2 + 10, 10, front + 31);
        b.text(String(line.wagon), { size: 10, depth: 1.5 }, lx - w / 2 + 10, 10, front + 34, UI.white);
        b.slab(w - 10, BAR_H + 2, 4, 1.5, UI.strip, lx, -cardH / 2 + 13, front + 1.5, 0.6);
      });
    });
    const toyY = cy - 6;
    this.toys.forEach((toy, i) => toy.place(this.lineX[i] as number, toyY, 13.5 + TOY / 2 + 2));
    this.counts.forEach((c, i) => {
      c.place(this.lineX[i] as number, cardY + cardH - 30);
      c.invalidate();
    });
    this.refreshCounts();
    this.gauges.place(cx, cy, 18 + 3.2);
    this.gauges.setRect(cardX, cardY + cardH - 20, cardW, 14);
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
        left: this.cardBox.x + this.cardBox.w + DROP + 6,
        right: W - this.controlsLeft + 6,
      };
    }
    const bottomTop = Math.min(this.controlsTop, hintTop ?? Infinity);
    return { top: this.cardBox.y + this.cardBox.h + DROP + 4, bottom: H - bottomTop + 6, left: 4, right: 4 };
  }

  // -------------------------------------------------------------------------------------------
  // Live state

  setPhase(phase: Phase): void {
    this.go.setVisible(phase === 'planning');
  }

  /** Wanted toys in each wagon so far (one count per chute). */
  setLoaded(perWagon: readonly number[]): void {
    let changed = false;
    this.opts.order.forEach((line, i) => {
      const have = Math.min(line.quantity, perWagon[line.wagon - 1] ?? 0);
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
          const bx = (this.lineW[i] as number) / 2 - 10;
          b.disc(9, 4, UI.ink, bx, 30, 40);
          b.disc(7.5, 4, UI.good, bx, 30, 41.5);
          b.icon('check', 10, bx, 30, 45.5, 2, UI.white);
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
    this.card.kick(0.04, 0.2);
  }

  private refreshGauges(): void {
    const cx = this.cardBox.x + this.cardBox.w / 2;
    const cy = this.cardBox.y + this.cardBox.h / 2;
    const pct = this.pct;
    const barY = this.cardBox.y + this.cardBox.h - 13;
    this.gauges.text = pct.map((p) => `${p}%`).join(' ');
    this.gauges.set(`${pct.join(',')}|${this.cardBox.w}`, (b) => {
      this.opts.order.forEach((line, i) => {
        const p = pct[line.wagon - 1] ?? 0;
        const bw = (this.lineW[i] as number) - 12;
        const bx = (this.lineX[i] as number) - cx;
        const by = -(barY - cy);
        const warn = p >= 90;
        const fill = (bw * p) / 100;
        if (fill > 0.5) b.box(fill, BAR_H - 1, 1.5, warn ? UI.warn : UI.green, bx - bw / 2 + fill / 2, by, 0);
        if (warn) {
          // Warning triangles shake (FR-067 c).
          b.wiggle = { phase: i, hop: 1, roll: 0.35, speed: 15, px: bx + bw / 2 + 1, py: by };
          b.icon('warn', 11, bx + bw / 2 - 4, by + 8, 3, 1.5, UI.yellow, UI.ink);
          b.wiggle = null;
        }
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
    for (const item of [this.back, this.pause, this.mute, this.restart, this.go, this.camera, this.title, this.card, this.gauges, this.hint, this.toast, ...this.toys, ...this.counts]) {
      item.dispose();
    }
  }
}
