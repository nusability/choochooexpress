// 3D cards (spec F-008 FR-059/FR-064; F-003 FR-026/FR-027; F-006 FR-050; F-007 FR-058): pause,
// tap to continue, results, derailment, level card, notices and celebrations. A card dims the scene
// behind it and takes every touch until it closes. All buttons are ≥ 44 × 44 pt (NFR-006).
import * as THREE from 'three';
import { levelLabel } from '../engine/campaign';
import type { OrderLine, RunResult, ToyType } from '../engine/types';
import { embossedText } from './hud';
import type { MeshBuilder } from './kit/builder';
import type { IconName } from './kit/icons3d';
import { Button, UiItem } from './kit/items';
import { UI } from './kit/palette';
import { layoutText, measure } from './kit/text3d';
import type { Layoutable, ModalHandle, UiLayer } from './kit/uiLayer';

export interface OverlayHandle {
  close(): void;
}

interface ActionSpec {
  id: string;
  label: string;
  text?: string;
  icon?: IconName;
  primary?: boolean;
  enabled?: boolean;
  onTap(): void;
}

interface Loaded {
  type: ToyType;
  quantity: number;
}

interface TableRow {
  label: string;
  value?: string;
  total?: boolean;
  note?: string;
  loaded?: readonly Loaded[];
}

type Row =
  | { kind: 'kicker'; text: string }
  | { kind: 'title'; text: string; size?: number }
  | { kind: 'text'; text: string; size?: number; color?: string; icon?: IconName }
  | { kind: 'banner'; text: string; icon: IconName; found: boolean }
  | { kind: 'stars'; count: number; size: number }
  | { kind: 'order'; lines: readonly Loaded[] }
  | { kind: 'table'; rows: TableRow[] }
  | { kind: 'icon'; icon: IconName; size: number; main: string; accent: string };

interface CardSpec {
  id: string;
  /** Left column in the wide (phone sideways) layout, otherwise the top of the card. */
  head: Row[];
  /** Right column in the wide layout, otherwise below the head. */
  body?: Row[];
  /** Full width, below both columns. */
  foot?: Row[];
  actions: ActionSpec[];
  /** Use two columns when the phone is held sideways. */
  wide?: boolean;
  /** No card: the rows float over the dimmed scene (tap to continue). */
  bare?: boolean;
  dim?: number;
  onBackdropTap?: () => void;
}

const PAD = 18;
const GAP = 8;
const BTN_H = 46;
const CARD_Z = 0;

function rowText(row: Row): string {
  switch (row.kind) {
    case 'kicker':
    case 'title':
    case 'text':
    case 'banner':
      return row.text;
    case 'table':
      return row.rows.map((r) => `${r.label} ${r.value ?? ''}${r.note ? ` ${r.note}` : ''}`).join('\n');
    default:
      return '';
  }
}

function rowHeight(row: Row, w: number): number {
  switch (row.kind) {
    case 'kicker':
      return 12;
    case 'title': {
      const size = row.size ?? 26;
      return layoutText(row.text, { size, maxWidth: w, wrap: true }).height + 8;
    }
    case 'text': {
      const size = row.size ?? 15;
      if (row.icon) return size + 6;
      return layoutText(row.text, { size, maxWidth: w, wrap: true }).height + 6;
    }
    case 'banner':
      return 30;
    case 'stars':
      return row.size + 8;
    case 'order':
      return 32;
    case 'table':
      return row.rows.reduce((h, r) => h + (r.total ? 34 : 28) + 4, -4);
    case 'icon':
      return row.size + 4;
  }
}

function orderWidth(lines: readonly Loaded[], toy: number, size: number): number {
  return lines.reduce((w, l, i) => w + toy + 3 + measure(String(l.quantity), size) + (i > 0 ? 16 : 0), 0);
}

/** Toy, count, arrow, toy, count …, centered on x (right-aligned when `right` is set). */
function drawOrder(b: MeshBuilder, lines: readonly Loaded[], x: number, y: number, z: number, toy: number, size: number, right = false): void {
  const total = orderWidth(lines, toy, size);
  let pen = right ? x - total : x - total / 2;
  lines.forEach((l, i) => {
    if (i > 0) {
      b.icon('arrow', 10, pen + 8, y, z, 1.5, UI.inkSoft);
      pen += 16;
    }
    b.toy(l.type, toy, pen + toy / 2, y, z);
    pen += toy + 3;
    const label = String(l.quantity);
    b.text(label, { size, depth: 2, align: 'left' }, pen, y, z, UI.ink);
    pen += measure(label, size);
  });
}

class Card implements ModalHandle, Layoutable, OverlayHandle {
  private readonly holder = new THREE.Group();
  private items: UiItem[] = [];
  private backdrop: THREE.Mesh | null = null;
  private readonly backdropMat: THREE.MeshBasicMaterial;
  private openedAt: number;
  private fit = 1;
  private closed = false;
  onBackdropTap?: () => void;

  constructor(
    private readonly ui: UiLayer,
    private readonly spec: CardSpec,
  ) {
    this.onBackdropTap = spec.onBackdropTap;
    this.backdropMat = new THREE.MeshBasicMaterial({ color: '#1e140c', transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
    ui.scene('cards').add(this.holder);
    this.openedAt = ui.time;
    ui.pushModal(this);
    ui.addLayoutable(this);
    this.layout();
  }

  owns(item: UiItem): boolean {
    return this.items.includes(item);
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.ui.popModal(this);
    this.ui.removeLayoutable(this);
    this.clear();
    this.holder.removeFromParent();
    this.backdropMat.dispose();
  }

  private clear(): void {
    for (const item of this.items) item.dispose();
    this.items = [];
    if (this.backdrop) {
      this.backdrop.geometry.dispose();
      this.backdrop.removeFromParent();
      this.backdrop = null;
    }
  }

  layout(): void {
    if (this.closed) return;
    this.clear();
    const { width: W, height: H, safe } = this.ui;
    const spec = this.spec;
    const dim = spec.dim ?? 0.5;
    // Dim, input-blocking backdrop.
    this.backdrop = new THREE.Mesh(new THREE.PlaneGeometry(W + 40, H + 40), this.backdropMat);
    this.backdrop.position.set(W / 2, -H / 2, -80);
    this.ui.scene('cards').add(this.backdrop);

    const wide = !!spec.wide && this.ui.side;
    const cardW = wide ? Math.min(620, W * 0.92) : Math.min(360, W * 0.92);
    const innerW = cardW - PAD * 2;
    const colGap = 16;
    const leftW = wide ? (innerW - colGap) * 0.46 : innerW;
    const rightW = wide ? innerW - colGap - leftW : innerW;
    const stack = (rows: Row[], w: number) => rows.reduce((h, r, i) => h + rowHeight(r, w) + (i > 0 ? GAP : 0), 0);
    const head = spec.head;
    const body = spec.body ?? [];
    const foot = spec.foot ?? [];
    const headH = stack(head, leftW);
    const bodyH = stack(body, rightW);
    const footH = stack(foot, innerW);
    const actionRows = this.actionRows(innerW);
    const actionsH = actionRows.length ? actionRows.length * (BTN_H + 7) + (actionRows.length - 1) * 10 : 0;
    const columnsH = wide ? Math.max(headH, bodyH) : headH + (body.length ? GAP + bodyH : 0);
    const cardH = PAD + columnsH + (foot.length ? GAP + footH : 0) + (actionsH ? 14 + actionsH : 0) + PAD;
    const availH = H - safe.top - safe.bottom - 24;
    this.fit = Math.min(1, availH / (cardH + 12), (W - 16) / (cardW + 8));
    const cx = W / 2;
    const cy = safe.top + 12 + (H - safe.top - safe.bottom - 24) / 2;
    this.holder.position.set(cx, -cy, CARD_Z);
    const toScreen = (lx: number, ly: number) => ({ x: cx + lx * this.fit, y: cy - ly * this.fit });

    // The card and its static content: one mesh.
    const root = new UiItem(this.ui, { id: spec.id, parent: this.holder, layer: 'cards' });
    root.text = [...head, ...body, ...foot].map(rowText).filter(Boolean).join('\n');
    const tl = toScreen(-cardW / 2, cardH / 2);
    root.setRect(tl.x, tl.y, cardW * this.fit, cardH * this.fit);
    this.items.push(root);
    const stars: { x: number; y: number; on: boolean; size: number; i: number }[] = [];
    root.build((b) => {
      const front = spec.bare ? 0 : b.toyBlock(cardW, cardH, 26, UI.cream, 0, 0, 0, { rim: 4, drop: 8, depth: 12 });
      const top = cardH / 2 - PAD;
      const drawRows = (rows: Row[], x: number, y0: number, w: number) => {
        let y = y0;
        rows.forEach((row, i) => {
          if (i > 0) y -= GAP;
          const h = rowHeight(row, w);
          this.drawRow(b, row, x, y, w, h, front, stars);
          y -= h;
        });
        return y;
      };
      let y: number;
      if (wide) {
        const lx = -innerW / 2 + leftW / 2;
        const rx = innerW / 2 - rightW / 2;
        const hy = drawRows(head, lx, top - (columnsH - headH) / 2, leftW);
        const by = drawRows(body, rx, top - (columnsH - bodyH) / 2, rightW);
        y = Math.min(hy, by);
      } else {
        y = drawRows(head, 0, top, innerW);
        if (body.length) y = drawRows(body, 0, y - GAP, innerW);
      }
      if (foot.length) drawRows(foot, 0, y - GAP, innerW);
    });

    // Stars pop in one after another.
    for (const s of stars) {
      const star = new UiItem(this.ui, { parent: this.holder, layer: 'cards' });
      star.build((b) => {
        b.icon('star', s.size * 1.14, 0, -s.size * 0.02, 0, 6, UI.ink);
        b.icon('star', s.size, 0, 0, 4, 8, s.on ? UI.yellow : UI.starOff);
      });
      star.place(s.x, -s.y, 14);
      if (s.on) star.pop(0.2 + s.i * 0.25);
      this.items.push(star);
    }

    // Buttons, in rows centered at the bottom of the card.
    let rowY = -cardH / 2 + PAD + actionsH - BTN_H / 2;
    for (const row of actionRows) {
      const totalW = row.reduce((w, a) => w + a.w, 0) + (row.length - 1) * 10;
      let x = -totalW / 2;
      for (const a of row) {
        const btn = new Button(this.ui, {
          id: a.spec.id,
          label: a.spec.label,
          parent: this.holder,
          layer: 'cards',
          look: { w: a.w, h: BTN_H, cap: a.spec.primary ? UI.green : UI.cream, ink: a.spec.primary ? UI.white : UI.ink, text: a.spec.text, icon: a.spec.icon, textSize: 17, iconSize: 20 },
          onTap: () => a.spec.onTap(),
        });
        btn.setEnabled(a.spec.enabled ?? true);
        const lx = x + a.w / 2;
        btn.place(lx, -rowY, 14);
        const c = toScreen(lx, rowY);
        btn.setRect(c.x - (a.w / 2) * this.fit, c.y - (BTN_H / 2) * this.fit, a.w * this.fit, BTN_H * this.fit);
        this.items.push(btn);
        x += a.w + 10;
      }
      rowY -= BTN_H + 7 + 10;
    }

    // Swing in (FR-066): scale and tilt settle; the backdrop fades in.
    const reduced = this.ui.reducedMotion;
    const age = this.ui.time - this.openedAt;
    const settle = (t: number) => {
      const k = Math.min(1, t / 0.28);
      const e = 1 + 2.2 * Math.pow(k - 1, 3) + 1.2 * Math.pow(k - 1, 2);
      this.holder.scale.setScalar(this.fit * Math.max(0.001, e));
      this.holder.rotation.x = (1 - Math.min(1, t / 0.3)) * 0.35;
      this.backdropMat.opacity = dim * Math.min(1, t / 0.18);
    };
    settle(reduced ? 1 : age);
    root.animate = () => settle(this.ui.time - this.openedAt);
    if (reduced) this.backdropMat.opacity = dim;
  }

  private actionRows(innerW: number): { spec: ActionSpec; w: number }[][] {
    const sized = this.spec.actions.map((a) => {
      const textW = a.text ? measure(a.text, 17) : 0;
      const iconW = a.icon ? 20 + (a.text ? 6 : 0) : 0;
      return { spec: a, w: Math.max(BTN_H, Math.ceil(textW + iconW + 36)) };
    });
    const rows: { spec: ActionSpec; w: number }[][] = [];
    let row: { spec: ActionSpec; w: number }[] = [];
    let w = 0;
    for (const s of sized) {
      if (row.length && w + 10 + s.w > innerW) {
        rows.push(row);
        row = [];
        w = 0;
      }
      w += (row.length ? 10 : 0) + s.w;
      row.push(s);
    }
    if (row.length) rows.push(row);
    return rows;
  }

  private drawRow(b: MeshBuilder, row: Row, x: number, yTop: number, w: number, h: number, z: number, stars: { x: number; y: number; on: boolean; size: number; i: number }[]): void {
    const yMid = yTop - h / 2;
    const bare = !!this.spec.bare;
    switch (row.kind) {
      case 'kicker':
        b.text(row.text.toUpperCase(), { size: 12, depth: 1.5, tracking: 0.08, maxWidth: w }, x, yMid, z, UI.inkSoft);
        break;
      case 'title': {
        const size = row.size ?? 26;
        if (bare) embossedText(b, row.text, size, x, yMid, z, UI.cream, { maxWidth: w });
        else b.text(row.text, { size, depth: 4, maxWidth: w, wrap: true }, x, yMid, z, UI.ink);
        break;
      }
      case 'text': {
        const size = row.size ?? 15;
        const color = row.color ?? UI.inkSoft;
        if (bare) {
          embossedText(b, row.text, size, x, yMid, z, UI.cream, { maxWidth: w });
        } else if (row.icon) {
          const tw = measure(row.text, size);
          const total = size + 6 + tw;
          b.icon(row.icon, size, x - total / 2 + size / 2, yMid, z, 2.5, color, UI.cream);
          b.text(row.text, { size, depth: 2, align: 'left' }, x - total / 2 + size + 6, yMid, z, color);
        } else b.text(row.text, { size, depth: 2, maxWidth: w, wrap: true }, x, yMid, z, color);
        break;
      }
      case 'banner': {
        const tw = measure(row.text, 15);
        const bw = Math.min(w, tw + 16 + 24);
        b.slab(bw, 28, 12, 3, row.found ? UI.navy : '#c6eef2', x, yMid, z, 1.2);
        b.icon(row.icon, 16, x - bw / 2 + 12 + 8, yMid, z + 3, 2, row.found ? UI.cyan : UI.navy, row.found ? UI.navy : '#c6eef2');
        b.text(row.text, { size: 15, depth: 2, align: 'left', maxWidth: bw - 44 }, x - bw / 2 + 32, yMid, z + 3, row.found ? UI.cyan : UI.navy);
        break;
      }
      case 'stars': {
        for (let i = 0; i < 3; i++) stars.push({ x: x + (i - 1) * (row.size + 8), y: yMid, on: i < row.count, size: row.size, i });
        break;
      }
      case 'order':
        drawOrder(b, row.lines, x, yMid, z, 24, 16);
        break;
      case 'table': {
        let y = yTop;
        row.rows.forEach((r) => {
          const rh = r.total ? 34 : 28;
          const cyr = y - rh / 2;
          const size = r.total ? 19 : 15;
          b.slab(w, rh, 10, 2.5, r.total ? UI.rowTotal : UI.row, x, cyr, z, 1);
          b.text(r.label, { size, depth: 2, align: 'left' }, x - w / 2 + 10, cyr, z + 2.5, UI.ink);
          let right = x + w / 2 - 10;
          if (r.note) {
            b.text(r.note, { size: 14, depth: 2, align: 'right' }, right, cyr, z + 2.5, UI.good);
            right -= measure(r.note, 14) + 5;
          }
          if (r.loaded) {
            if (r.loaded.length) drawOrder(b, r.loaded, right, cyr, z + 2.5, 18, 14, true);
            else b.text('nothing', { size: 14, depth: 2, align: 'right' }, right, cyr, z + 2.5, UI.inkSoft);
          } else if (r.value) b.text(r.value, { size, depth: 2.5, align: 'right' }, right, cyr, z + 2.5, UI.ink);
          y -= rh + 4;
        });
        break;
      }
      case 'icon':
        b.icon(row.icon, row.size, x, yMid, z, row.size * 0.2, row.main, row.accent);
        break;
    }
  }
}

function open(ui: UiLayer, spec: CardSpec): Card {
  return new Card(ui, spec);
}

export function showPause(ui: UiLayer, cb: { onResume(): void; onRestart(): void; onMap(): void }): OverlayHandle {
  const card: Card = open(ui, {
    id: 'pause',
    head: [{ kind: 'title', text: 'Paused' }],
    actions: [
      { id: 'pause.resume', label: 'Resume', text: 'Resume', primary: true, onTap: () => (card.close(), cb.onResume()) },
      { id: 'pause.restart', label: 'Restart level', text: 'Restart', icon: 'restart', onTap: () => (card.close(), cb.onRestart()) },
      { id: 'pause.map', label: 'Back to the map', text: 'Map', icon: 'back', onTap: () => (card.close(), cb.onMap()) },
    ],
  });
  return card;
}

export function showTapToContinue(ui: UiLayer, onContinue: () => void): OverlayHandle {
  const card: Card = open(ui, {
    id: 'tap-continue',
    bare: true,
    dim: 0.6,
    head: [
      { kind: 'title', text: 'Paused', size: 34 },
      { kind: 'text', text: 'Tap to continue', size: 18 },
    ],
    actions: [],
    onBackdropTap: () => {
      card.close();
      onContinue();
    },
  });
  return card;
}

export interface ResultInfo {
  level: number;
  result: RunResult;
  best: number;
  newBest: boolean;
  nextUnlocked: boolean;
  hasNext: boolean;
}

export function showResults(ui: UiLayer, info: ResultInfo, cb: { onRetry(): void; onMap(): void; onNext(): void }): OverlayHandle {
  const { result } = info;
  const head: Row[] = [
    { kind: 'kicker', text: levelLabel(info.level) },
    { kind: 'title', text: result.passed ? (result.stars === 3 ? 'Perfect delivery!' : 'Delivered!') : 'Order refused', size: ui.side ? 22 : 26 },
  ];
  if (result.secretRoute) head.push({ kind: 'banner', text: `Secret route! +${result.bonus}`, icon: 'rocket', found: true });
  head.push({ kind: 'stars', count: result.stars, size: ui.side ? 44 : 50 });
  const rows: TableRow[] = [
    { label: 'Correct toys', value: `${result.nCorrect} / ${result.nTotal}` },
    { label: 'Delivered', loaded: result.loadedLines },
    { label: 'Spilled toys', value: `${result.nSpilled} × −5` },
  ];
  if (result.bonus) rows.push({ label: 'Efficiency bonus', value: `+${result.bonus}` });
  rows.push({ label: 'Score', value: String(result.score), total: true });
  rows.push({ label: 'Best', value: String(info.best), note: info.newBest ? 'new!' : undefined });
  const actions: ActionSpec[] = [
    { id: 'results.retry', label: 'Retry level', text: 'Retry', icon: 'restart', onTap: () => (card.close(), cb.onRetry()) },
    { id: 'results.map', label: 'Back to the map', text: 'Map', icon: 'back', onTap: () => (card.close(), cb.onMap()) },
  ];
  if (info.hasNext) {
    actions.push({ id: 'results.next', label: 'Next level', text: 'Next', icon: 'arrow', primary: true, enabled: info.nextUnlocked, onTap: () => (card.close(), cb.onNext()) });
  }
  const card: Card = open(ui, {
    id: 'results',
    wide: true,
    head,
    body: [{ kind: 'table', rows }],
    foot: result.passed ? [] : [{ kind: 'text', text: 'The store needs at least 750 points. Try again!' }],
    actions,
  });
  return card;
}

export function showDerailed(ui: UiLayer, cb: { onRetry(): void; onMap(): void }): OverlayHandle {
  const card: Card = open(ui, {
    id: 'derailed',
    head: [
      { kind: 'icon', icon: 'burst', size: 64, main: UI.accentOrange, accent: UI.yellow },
      { kind: 'title', text: 'Toy explosion!' },
      { kind: 'text', text: 'The engine ran into a pile of spilled toys. Don’t overfill the wagons!' },
    ],
    actions: [
      { id: 'derailed.retry', label: 'Retry level', text: 'Retry', icon: 'restart', primary: true, onTap: () => (card.close(), cb.onRetry()) },
      { id: 'derailed.map', label: 'Back to the map', text: 'Map', icon: 'back', onTap: () => (card.close(), cb.onMap()) },
    ],
  });
  return card;
}

export interface LevelCardInfo {
  level: number;
  unlocked: boolean;
  stars: number;
  best: number;
  secretAvailable: boolean;
  secretFound: boolean;
  order: readonly OrderLine[];
}

export function showLevelCard(ui: UiLayer, info: LevelCardInfo, cb: { onPlay(): void; onClose(): void }): OverlayHandle {
  const close = () => {
    card.close();
    cb.onClose();
  };
  const head: Row[] = [
    { kind: 'kicker', text: `Level ${info.level}` },
    { kind: 'title', text: levelLabel(info.level), size: 22 },
    { kind: 'stars', count: info.stars, size: 40 },
  ];
  if (info.unlocked) {
    head.push({ kind: 'order', lines: info.order });
    head.push({ kind: 'text', text: info.best > 0 ? `Best score: ${info.best}` : 'Not played yet' });
    if (info.secretAvailable) {
      head.push({ kind: 'banner', text: info.secretFound ? 'Secret route found!' : 'A faster route exists…', icon: 'rocket', found: info.secretFound });
    }
  } else {
    head.push({ kind: 'text', text: `Pass level ${info.level - 1} to unlock`, icon: 'lock' });
  }
  const actions: ActionSpec[] = [{ id: 'card.close', label: 'Close', text: 'Close', onTap: close }];
  if (info.unlocked) {
    actions.push({ id: 'card.play', label: `Play level ${info.level}`, text: 'Play', icon: 'arrow', primary: true, onTap: () => (card.close(), cb.onPlay()) });
  }
  const card: Card = open(ui, { id: 'level-card', head, actions, onBackdropTap: close });
  return card;
}

export function showNotice(ui: UiLayer, title: string, text: string): OverlayHandle {
  const card: Card = open(ui, {
    id: 'notice',
    head: [
      { kind: 'title', text: title, size: 22 },
      { kind: 'text', text },
    ],
    actions: [{ id: 'notice.ok', label: 'OK', text: 'OK', primary: true, onTap: () => card.close() }],
  });
  return card;
}

/** A yellow banner that pops up, floats a little and goes away (not modal). */
export function showCelebration(ui: UiLayer, text: string, icon: IconName = 'star', ms = 2200): void {
  const item = new UiItem(ui, { id: 'celebration', text, layer: 'top' });
  const size = 26;
  const tw = measure(text, size);
  const w = tw + 34 + 30;
  item.build((b) => {
    const front = b.toyBlock(w, 52, 20, UI.yellow, 0, 0, 0, { rim: 4, drop: 6, depth: 12 });
    b.icon(icon, 26, -w / 2 + 17 + 13, 0, front, 4, icon === 'rocket' ? UI.navy : UI.red, UI.cyan);
    b.text(text, { size, depth: 4, align: 'left' }, -w / 2 + 17 + 30, 0, front, UI.ink);
  });
  const x = ui.width / 2;
  const y = ui.height * 0.4;
  item.place(x, y, 40).setRect(x - w / 2, y - 26, w, 52);
  item.pop();
  item.animate = (it, dt) => {
    it.group.position.y += dt * 10;
  };
  window.setTimeout(() => item.dispose(), ms);
}
