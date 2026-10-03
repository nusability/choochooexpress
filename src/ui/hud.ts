// In-level HUD: title bar, order card with live counts, wagon fill bars, Go / restart / camera
// buttons and hint bubbles (spec FR-003, FR-019, FR-021, research R11/R17).
import type { CameraMode, Insets } from '../graphics/cameraController';
import type { OrderLine, Phase, ToyType } from '../engine/types';
import { button, el, setText } from './dom';
import { ICONS, toyIcon } from './icons';

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

/** Short landscape screens (phones held sideways): order card on the left, controls on the right. */
export const SIDE_LAYOUT_QUERY = '(orientation: landscape) and (max-height: 540px)';

export class Hud {
  readonly root: HTMLElement;
  private readonly top: HTMLElement;
  private readonly bar: HTMLElement;
  private readonly card: HTMLElement;
  private readonly strip: HTMLElement;
  private readonly bottom: HTMLElement;
  private readonly controls: HTMLElement;
  private readonly go: HTMLButtonElement;
  private readonly camBtn: HTMLButtonElement;
  private readonly muteBtn: HTMLButtonElement;
  private readonly counts: HTMLElement[] = [];
  private readonly lines: HTMLElement[] = [];
  private readonly bars: { fill: HTMLElement; label: HTMLElement; wagon: HTMLElement }[] = [];
  private readonly hint: HTMLElement;
  private readonly toast: HTMLElement;
  private toastTimer = 0;

  constructor(
    host: HTMLElement,
    private readonly opts: HudOptions,
    cb: HudCallbacks,
  ) {
    this.root = el('div', 'hud');
    this.top = el('div', 'hud-top');
    const bar = (this.bar = el('div', 'hud-bar'));
    bar.append(
      button('icon', ICONS.back, 'Back to the map', cb.onMap),
      el('div', 'hud-title', opts.title),
      button('icon', ICONS.pause, 'Pause', cb.onPause),
    );
    this.muteBtn = button('icon', opts.muted ? ICONS.soundOff : ICONS.soundOn, 'Sound on or off', cb.onMute);
    bar.append(this.muteBtn);

    const card = (this.card = el('div', 'order-card'));
    card.append(el('div', 'order-label', 'Toy Store order'));
    const row = el('div', 'order-row');
    opts.order.forEach((line, i) => {
      if (i > 0) row.append(el('span', 'order-arrow', '➜'));
      const item = el('div', 'order-line');
      const count = el('span', 'order-count', `0/${line.quantity}`);
      item.append(el('span', 'order-icon', toyIcon(line.type, 30)), count);
      item.dataset.type = line.type;
      this.lines.push(item);
      this.counts.push(count);
      row.append(item);
    });
    card.append(row);

    const train = (this.strip = el('div', 'wagon-strip passthrough'));
    train.append(el('span', 'wagon-engine', '🚂'));
    for (let k = 0; k < opts.wagons; k++) {
      const wagon = el('div', 'wagon-bar');
      const fill = el('div', 'wagon-fill');
      const label = el('span', 'wagon-label', '0%');
      wagon.append(fill, label);
      train.append(wagon);
      this.bars.push({ fill, label, wagon });
    }
    this.top.append(bar, card, train);

    this.bottom = el('div', 'hud-bottom');
    this.hint = el('div', 'hint passthrough');
    this.hint.hidden = true;
    this.toast = el('div', 'toast passthrough');
    this.toast.hidden = true;
    const controls = (this.controls = el('div', 'hud-controls'));
    this.go = button('go', 'GO!', 'Start the train', cb.onGo);
    this.camBtn = button('icon', ICONS.follow, 'Follow the train or show the whole board', cb.onCamera);
    controls.append(button('icon', ICONS.restart, 'Restart level', cb.onRestart), this.go, this.camBtn);
    this.bottom.append(this.hint, this.toast, controls);

    this.root.append(this.top, this.bottom);
    host.append(this.root);
  }

  /** Screen areas covered by the HUD, for camera framing. */
  get insets(): Insets {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const controls = this.controls.getBoundingClientRect();
    const hint = this.hint.hidden ? null : this.hint.getBoundingClientRect();
    if (window.matchMedia(SIDE_LAYOUT_QUERY).matches) {
      const left = Math.max(this.card.getBoundingClientRect().right, this.strip.getBoundingClientRect().right);
      return {
        top: this.bar.getBoundingClientRect().bottom + 6,
        bottom: hint ? vh - hint.top + 6 : 8,
        left: left + 6,
        right: vw - controls.left + 6,
      };
    }
    const bottomTop = Math.min(controls.top, hint?.top ?? Infinity);
    return { top: this.top.getBoundingClientRect().bottom + 6, bottom: vh - bottomTop + 6, left: 8, right: 8 };
  }

  setPhase(phase: Phase): void {
    this.go.hidden = phase !== 'planning';
    this.root.dataset.phase = phase;
  }

  setLoaded(byType: Partial<Record<ToyType, number>>): void {
    // Lines with the same type share their count, assigned to lines in order.
    const remaining: Partial<Record<ToyType, number>> = { ...byType };
    this.opts.order.forEach((line, i) => {
      const have = Math.min(line.quantity, remaining[line.type] ?? 0);
      remaining[line.type] = (remaining[line.type] ?? 0) - have;
      const count = this.counts[i];
      const item = this.lines[i];
      if (count) setText(count, `${have}/${line.quantity}`);
      item?.classList.toggle('done', have >= line.quantity);
    });
  }

  setWagons(loads: readonly { total: number }[], capacity: number): void {
    loads.forEach((load, k) => {
      const bar = this.bars[k];
      if (!bar) return;
      const pct = Math.min(100, Math.round((load.total / capacity) * 100));
      bar.fill.style.width = `${pct}%`;
      const warn = pct >= 90;
      bar.wagon.classList.toggle('warn', warn);
      bar.label.innerHTML = warn ? `${ICONS.warn}${pct}%` : `${pct}%`;
    });
  }

  setCameraMode(mode: CameraMode): void {
    this.camBtn.innerHTML = mode === 'follow' ? ICONS.overview : ICONS.follow;
  }

  setMuted(muted: boolean): void {
    this.muteBtn.innerHTML = muted ? ICONS.soundOff : ICONS.soundOn;
  }

  showHint(text: string | null): void {
    this.hint.hidden = !text;
    if (text) this.hint.textContent = text;
  }

  showToast(text: string, ms = 1400): void {
    this.toast.textContent = text;
    this.toast.hidden = false;
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => {
      this.toast.hidden = true;
    }, ms);
  }

  dispose(): void {
    window.clearTimeout(this.toastTimer);
    this.root.remove();
  }
}
