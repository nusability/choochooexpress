// 3D HUD for shunting puzzles (spec F-014, F-008): title bar, the goal card (wanted wagons from the
// station buffer outward), uncouplers left and par, Go / Reset during planning, and during playback
// Edit, the timeline scrubber with a little locomotive playhead (FR-098) and play / pause.
import type { CameraMode, Insets } from '../graphics/cameraController';
import type { ToyType } from '../engine/types';
import type { YardEvent } from '../engine/yard';
import { TOY_COLORS } from '../graphics/palette';
import { HEADING_HOP, embossedText } from './hud';
import { Button, LiveItem, UiItem } from './kit/items';
import { UI } from './kit/palette';
import { measure } from './kit/text3d';
import type { Layoutable, UiLayer } from './kit/uiLayer';

export interface YardHudCallbacks {
  onGo(): void;
  onEdit(): void;
  onReset(): void;
  onPlayPause(): void;
  onScrub(step: number, phase: 'start' | 'move' | 'end'): void;
  onMap(): void;
  onCamera(): void;
  onMute(): void;
}

export interface YardHudOptions {
  title: string;
  goal: readonly (ToyType | null)[];
  pads: number;
  par: number;
  muted: boolean;
}

const BTN = 46;
const DROP = 7;
const CHIP = 44;
const TOY = 24;

export class YardHud implements Layoutable {
  private readonly back: Button;
  private readonly mute: Button;
  private readonly reset: Button;
  private readonly go: Button;
  private readonly camera: Button;
  private readonly edit: Button;
  private readonly play: Button;
  private readonly title: LiveItem;
  private readonly card: UiItem;
  private readonly toys: UiItem[] = [];
  private readonly info: LiveItem;
  private readonly scrubber: LiveItem;
  private readonly playhead: UiItem;
  private readonly hint: LiveItem;
  private readonly toast: LiveItem;
  private mode: 'planning' | 'playback' = 'planning';
  private padsLeft: number;
  private steps = 0;
  private events: YardEvent[][] = [];
  private ok = false;
  private scrub = { x0: 0, x1: 1, y: 0 };
  private cardBox = { x: 0, y: 0, w: 0, h: 0 };
  private controlsTop = 0;
  private hintText: string | null = null;
  private toastText = '';
  private toastLeft = 0;
  private dragging = false;
  onLayout: (() => void) | null = null;

  constructor(
    private readonly ui: UiLayer,
    private readonly opts: YardHudOptions,
    cb: YardHudCallbacks,
  ) {
    this.padsLeft = opts.pads;
    const icon = (id: string, label: string, name: 'back' | 'soundOn' | 'soundOff' | 'restart' | 'follow' | 'pause', onTap: () => void) =>
      new Button(ui, { id, label, look: { w: BTN, h: BTN, cap: UI.cream, icon: name }, onTap });
    this.back = icon('back', 'Back to the map', 'back', cb.onMap);
    this.mute = icon('mute', 'Sound on or off', opts.muted ? 'soundOff' : 'soundOn', cb.onMute);
    this.reset = icon('reset', 'Clear the plan', 'restart', cb.onReset);
    this.camera = icon('camera', 'Follow the train or show the whole yard', 'follow', cb.onCamera);
    this.play = icon('play', 'Play or pause the run', 'pause', cb.onPlayPause);
    this.go = new Button(ui, { id: 'go', label: 'Let the train go', look: { w: 140, h: 62, cap: UI.green, text: 'GO!', textSize: 27, ink: UI.white, radius: 22, hop: 3 }, onTap: cb.onGo });
    this.go.idle = { breathe: 0.035, wobble: 0.05, bob: 3, speed: 3.3 };
    this.edit = new Button(ui, { id: 'edit', label: 'Edit the plan', look: { w: 84, h: BTN, cap: UI.yellow, text: 'Edit', icon: 'back', textSize: 16 }, onTap: cb.onEdit });
    this.title = new LiveItem(ui, { id: 'title', text: opts.title });
    this.card = new UiItem(ui, { id: 'goal', text: 'Toy Station wants' });
    this.card.idle = { wobble: 0.012, breathe: 0.006, speed: 1.6 };
    opts.goal.forEach((toy, k) => {
      const item = new UiItem(ui, { id: `goal.${k + 1}` });
      if (toy) {
        item.build((b) => b.toy(toy, TOY, 0, 0, -TOY / 2, 0, 0));
        item.animate = (it, _dt, t) => {
          it.group.rotation.x = 0.45;
          it.group.rotation.y = -0.6 + t * 0.9 + k;
        };
      } else {
        // An empty wagon: a little open box.
        item.build((b) => {
          b.box(TOY, 4, 12, '#a0703f', 0, -TOY / 2 + 2, 0);
          b.box(4, TOY * 0.6, 12, '#a0703f', -TOY / 2 + 2, -4, 0);
          b.box(4, TOY * 0.6, 12, '#a0703f', TOY / 2 - 2, -4, 0);
        });
      }
      item.idle = { bob: 1.5, speed: 2.6 };
      this.toys.push(item);
    });
    this.info = new LiveItem(ui, { id: 'info' });
    this.scrubber = new LiveItem(ui, { id: 'scrubber', label: 'Scrub through the run' });
    this.scrubber.button = true;
    this.scrubber.onDrag = (x, _y, phase) => {
      this.dragging = phase !== 'end';
      cb.onScrub(this.stepAt(x), phase);
    };
    this.playhead = new UiItem(ui, { id: 'playhead' });
    this.playhead.build((b) => {
      b.disc(17, 5, UI.ink, 0, 0, 0, 1.5);
      b.disc(15, 5, UI.cream, 0, 0, 1.5, 1.5);
      b.icon('train', 20, 0, 0, 7, 3, UI.red, UI.ink);
    });
    this.hint = new LiveItem(ui, { id: 'hint' });
    this.hint.idle = { bob: 4, wobble: 0.025, breathe: 0.01, speed: 2.6 };
    this.hint.setVisible(false);
    this.toast = new LiveItem(ui, { id: 'toast', layer: 'top' });
    this.toast.setVisible(false);
    ui.addLayoutable(this);
    this.setMode('planning');
    this.layout();
  }

  // -------------------------------------------------------------------------------------------
  // Layout

  layout(): void {
    const { width: W, height: H, safe } = this.ui;
    const side = this.ui.side;
    const barY = safe.top + 8 + BTN / 2;
    const left = safe.left + 8;
    const right = W - safe.right - 8;
    this.back.at(left + BTN / 2, barY);
    this.mute.at(right - BTN / 2, barY);
    const titleL = left + BTN + 10;
    const titleR = right - BTN - 10;
    this.title.place((titleL + titleR) / 2, barY).setRect(titleL, barY - 12, titleR - titleL, 24);
    this.title.invalidate();
    this.title.set(`${this.opts.title}|${titleR - titleL}`, (b) => embossedText(b, this.opts.title, 17, 0, 0, 0, UI.cream, { maxWidth: titleR - titleL, hop: HEADING_HOP }));

    // Goal card: chute 1 is at the station buffer.
    const n = this.opts.goal.length;
    const chipsW = n * CHIP + (n - 1) * 6;
    const cardW = Math.max(chipsW + 28, measure('TOY STATION WANTS', 10, 0.08) + 28, 190);
    const cardH = 102;
    const cardX = side ? left : W / 2 - cardW / 2;
    const cardY = barY + BTN / 2 + DROP + 6;
    this.cardBox = { x: cardX, y: cardY, w: cardW, h: cardH };
    const cx = cardX + cardW / 2;
    const cy = cardY + cardH / 2;
    const chipX = (k: number) => cx - chipsW / 2 + CHIP / 2 + k * (CHIP + 6);
    this.card.place(cx, cy).setRect(cardX, cardY, cardW, cardH);
    this.card.build((b) => {
      const front = b.toyBlock(cardW, cardH, 18, UI.cream, 0, 0, 0);
      b.text('TOY STATION WANTS', { size: 10, depth: 1.5, tracking: 0.08 }, 0, cardH / 2 - 13, front, UI.inkSoft, false, { height: 1, step: 0.4, speed: 2.4, roll: 0.05 });
      this.opts.goal.forEach((toy, k) => {
        const x = chipX(k) - cx;
        b.slab(CHIP, CHIP, 10, 1.5, toy ? UI.row : '#e6dccd', x, 1, front, 1);
        b.disc(8, 3, UI.ink, x - CHIP / 2 + 6, 1 + CHIP / 2 - 9, front + 30);
        b.text(String(k + 1), { size: 9, depth: 1.5 }, x - CHIP / 2 + 6, 1 + CHIP / 2 - 9, front + 33, UI.white);
        if (toy) b.disc(4, 1.5, TOY_COLORS[toy], x, 1 - CHIP / 2 + 5, front + 2);
      });
    });
    this.toys.forEach((t, k) => t.place(chipX(k), cy - 1, 14 + TOY / 2));
    this.info.place(cx, cardY + cardH - 15, 18).setRect(cardX, cardY + cardH - 26, cardW, 22);
    this.info.invalidate();
    this.refreshInfo();

    // Bottom row.
    const rowY = H - safe.bottom - 12 - DROP - 31;
    this.go.at(W / 2, rowY);
    this.reset.at(W / 2 - 70 - 18 - BTN / 2, rowY);
    this.camera.at(W / 2 + 70 + 18 + BTN / 2, rowY);
    this.edit.at(left + 42, rowY);
    this.play.at(right - BTN / 2, rowY);
    this.scrub = { x0: left + 84 + 14 + 16, x1: right - BTN - 14 - 16, y: rowY };
    this.scrubber.place((this.scrub.x0 + this.scrub.x1) / 2, rowY).setRect(this.scrub.x0 - 16, rowY - 28, this.scrub.x1 - this.scrub.x0 + 32, 56);
    this.scrubber.invalidate();
    this.refreshScrubber();
    this.controlsTop = rowY - 31 - 4;
    this.layoutHint();
    this.layoutToast();
    this.onLayout?.();
  }

  get insets(): Insets {
    const { width: W, height: H } = this.ui;
    const hintTop = this.hint.group.visible ? this.hint.rect.y : Infinity;
    const bottomTop = Math.min(this.controlsTop, hintTop);
    if (this.ui.side) return { top: this.cardBox.y, bottom: H - bottomTop + 6, left: this.cardBox.x + this.cardBox.w + DROP + 6, right: 8 };
    void W;
    return { top: this.cardBox.y + this.cardBox.h + DROP + 4, bottom: H - bottomTop + 6, left: 4, right: 4 };
  }

  private refreshInfo(): void {
    const text = `${this.padsLeft}|${this.opts.pads}|${this.opts.par}`;
    this.info.text = this.opts.pads ? `Uncouplers ${this.padsLeft} · Par ${this.opts.par}` : `Par ${this.opts.par}`;
    this.info.set(`${text}|${this.cardBox.w}`, (b) => {
      let x = this.opts.pads ? -this.cardBox.w / 2 + 16 : -measure(`Par ${this.opts.par} steps`, 12) / 2;
      if (this.opts.pads) {
        // A little uncoupler pad, then how many are left.
        b.disc(7, 2, UI.ink, x + 7, 0, 0);
        b.disc(5.5, 2.5, UI.yellow, x + 7, 0, 1);
        b.text(`× ${this.padsLeft}`, { size: 12, depth: 1.5, align: 'left' }, x + 18, 0, 1, UI.ink);
        x = this.cardBox.w / 2 - 16 - measure(`Par ${this.opts.par} steps`, 12);
      }
      b.text(`Par ${this.opts.par} steps`, { size: 12, depth: 1.5, align: 'left' }, x, 0, 1, UI.inkSoft);
    });
  }

  setPadsLeft(n: number): void {
    if (n === this.padsLeft) return;
    this.padsLeft = n;
    this.refreshInfo();
    this.info.kick(0.3);
  }

  // -------------------------------------------------------------------------------------------
  // Modes and playback

  setMode(mode: 'planning' | 'playback'): void {
    this.mode = mode;
    const planning = mode === 'planning';
    for (const b of [this.go, this.reset, this.camera]) b.setVisible(planning);
    for (const b of [this.edit, this.play, this.scrubber, this.playhead]) b.setVisible(!planning);
    if (planning) this.go.pop();
    else this.edit.pop();
  }

  /** A new run: its length, events per step and outcome (FR-098). */
  setRun(steps: number, events: YardEvent[][], ok: boolean): void {
    this.steps = steps;
    this.events = events;
    this.ok = ok;
    this.scrubber.invalidate();
    this.refreshScrubber();
  }

  setPlaying(playing: boolean): void {
    this.play.setLook({ icon: playing ? 'pause' : 'next' });
  }

  /** Moves the locomotive playhead to fractional step `t`. */
  setProgress(t: number): void {
    const f = this.steps > 0 ? Math.max(0, Math.min(1, t / this.steps)) : 0;
    this.playhead.place(this.scrub.x0 + f * (this.scrub.x1 - this.scrub.x0), this.scrub.y - 2, 12);
  }

  private stepAt(x: number): number {
    const f = (x - this.scrub.x0) / Math.max(1, this.scrub.x1 - this.scrub.x0);
    return Math.max(0, Math.min(1, f)) * this.steps;
  }

  get isDragging(): boolean {
    return this.dragging;
  }

  private refreshScrubber(): void {
    const w = this.scrub.x1 - this.scrub.x0;
    const steps = this.steps;
    this.scrubber.text = this.steps ? `${this.steps} steps` : '';
    this.scrubber.set(`${w}|${steps}|${this.ok}|${this.events.length}`, (b) => {
      b.slab(w + 32, 40, 16, 4, UI.strip, 0, 0, 0, 1.5);
      b.slab(w, 8, 4, 2, '#8a6f5c', 0, 0, 4, 0.6);
      if (steps <= 0) return;
      const x = (s: number) => -w / 2 + (s / steps) * w;
      this.events.forEach((list, s) => {
        for (const e of list) {
          const color = e.t === 'couple' ? UI.green : e.t === 'uncouple' ? UI.yellow : e.t === 'factory' ? (e.content ? TOY_COLORS[e.content] : '#ffffff') : e.t === 'reverse' ? UI.cream : null;
          if (color) b.box(3, e.t === 'reverse' ? 8 : 14, 2, color, x(s), 0, 7);
        }
      });
      // The end: a green check for a delivery, a red warning for anything else.
      b.disc(9, 3, UI.ink, w / 2 + 6, 0, 6);
      if (this.ok) {
        b.disc(7.5, 3, UI.good, w / 2 + 6, 0, 7.5);
        b.icon('check', 10, w / 2 + 6, 0, 11, 2, UI.white);
      } else b.icon('warn', 13, w / 2 + 6, 0, 9, 2, UI.yellow, UI.ink);
    });
  }

  // -------------------------------------------------------------------------------------------
  // Hint and toast

  showHint(text: string | null): void {
    if (text === this.hintText) return;
    this.hintText = text;
    this.hint.text = text ?? '';
    this.layoutHint();
    if (text) this.hint.pop();
    this.onLayout?.();
  }

  private layoutHint(): void {
    const text = this.hintText;
    this.hint.setVisible(!!text);
    if (!text) return;
    const W = this.ui.width;
    const maxW = Math.min(320, W - 32);
    let box = { w: 0, h: 0 };
    this.hint.invalidate();
    this.hint.set(`${text}|${W}`, (b) => {
      const probe = b.text(text, { size: 14, depth: 2, maxWidth: maxW - 28, wrap: true }, 0, 0, 13.5, UI.ink);
      box = { w: Math.min(maxW, probe.width + 28), h: probe.height + 20 };
      b.toyBlock(box.w, box.h, 16, UI.cream, 0, 0, 0);
    });
    const cy = this.controlsTop - 12 - DROP - box.h / 2;
    this.hint.place(W / 2, cy).setRect(W / 2 - box.w / 2, cy - box.h / 2, box.w, box.h + DROP);
  }

  showToast(text: string, ms = 1800): void {
    const fresh = !this.toast.group.visible || this.toastText !== text;
    this.toastText = text;
    this.toast.text = text;
    this.toastLeft = ms / 1000;
    this.layoutToast();
    this.toast.setVisible(true);
    if (fresh) this.toast.pop();
  }

  shakeToast(): void {
    this.toast.shake(0.5);
  }

  private layoutToast(): void {
    if (!this.toastText) return;
    const W = this.ui.width;
    const text = this.toastText;
    let w = 0;
    this.toast.invalidate();
    this.toast.set(`${text}|${W}`, (b) => {
      const t = b.text(text, { size: 14, depth: 2, maxWidth: W - 64 }, 0, 0, 10, UI.cream);
      w = t.width + 28;
      b.toyBlock(w, 30, 14, UI.ink, 0, 0, 0, { ink: '#20160f', rim: 2, drop: 3, depth: 7 });
    });
    const above = this.hint.group.visible ? this.hint.rect.y : this.controlsTop;
    const cy = above - 12 - 15;
    this.toast.place(W / 2, cy).setRect(W / 2 - w / 2, cy - 15, w, 30);
  }

  frame(dt: number): void {
    if (this.toastLeft > 0) {
      this.toastLeft -= dt;
      if (this.toastLeft <= 0) {
        this.toast.setVisible(false);
        this.toastText = '';
      }
    }
  }

  setCameraMode(mode: CameraMode): void {
    this.camera.setLook({ icon: mode === 'follow' ? 'overview' : 'follow' });
  }

  setMuted(muted: boolean): void {
    this.mute.setLook({ icon: muted ? 'soundOff' : 'soundOn' });
    this.mute.kick(0.3);
  }

  get planning(): boolean {
    return this.mode === 'planning';
  }

  dispose(): void {
    this.ui.removeLayoutable(this);
    for (const item of [this.back, this.mute, this.reset, this.go, this.camera, this.edit, this.play, this.title, this.card, this.info, this.scrubber, this.playhead, this.hint, this.toast, ...this.toys]) item.dispose();
  }
}
