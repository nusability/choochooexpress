// Modal overlays: pause, tap-to-continue, results, derailment, level card, notices (spec FR-026,
// FR-027, FR-028, FR-050, FR-058). All buttons are ≥ 44 × 44 pt (NFR-006).
import { levelLabel } from '../engine/campaign';
import type { RunResult } from '../engine/types';
import { button, el } from './dom';
import { ICONS, toyIcon } from './icons';

export interface OverlayHandle {
  close(): void;
}

/** Ignore clicks right after an overlay opens (guards against the tap that opened it). */
const GHOST_CLICK_MS = 350;

function modal(host: HTMLElement, className: string): { root: HTMLElement; card: HTMLElement; close(): void } {
  const root = el('div', `overlay ${className}`);
  const card = el('div', 'overlay-card');
  root.append(card);
  const openedAt = performance.now();
  root.addEventListener(
    'click',
    (e) => {
      if (performance.now() - openedAt < GHOST_CLICK_MS) {
        e.stopPropagation();
        e.preventDefault();
      }
    },
    { capture: true },
  );
  root.addEventListener('pointerdown', (e) => e.stopPropagation());
  host.append(root);
  requestAnimationFrame(() => root.classList.add('open'));
  return { root, card, close: () => root.remove() };
}

export function showPause(host: HTMLElement, cb: { onResume(): void; onRestart(): void; onMap(): void }): OverlayHandle {
  const m = modal(host, 'pause');
  m.card.append(el('h2', '', 'Paused'));
  const actions = el('div', 'actions');
  actions.append(
    button('primary', 'Resume', 'Resume', () => {
      m.close();
      cb.onResume();
    }),
    button('', `${ICONS.restart} Restart`, 'Restart level', () => {
      m.close();
      cb.onRestart();
    }),
    button('', `${ICONS.back} Map`, 'Back to the map', () => {
      m.close();
      cb.onMap();
    }),
  );
  m.card.append(actions);
  return { close: m.close };
}

export function showTapToContinue(host: HTMLElement, onContinue: () => void): OverlayHandle {
  const root = el('div', 'overlay tap-continue open');
  root.append(el('div', 'tap-continue-text', 'Paused<br><small>Tap to continue</small>'));
  const go = (e: Event) => {
    e.stopPropagation();
    root.remove();
    onContinue();
  };
  root.addEventListener('pointerdown', (e) => e.stopPropagation());
  root.addEventListener('click', go);
  host.append(root);
  return { close: () => root.remove() };
}

export interface ResultInfo {
  level: number;
  result: RunResult;
  best: number;
  newBest: boolean;
  nextUnlocked: boolean;
  hasNext: boolean;
}

function stars(count: number, total = 3): string {
  let html = '<div class="stars">';
  for (let i = 0; i < total; i++) html += `<span class="star ${i < count ? 'on' : ''}" style="--i:${i}">${ICONS.star}</span>`;
  return `${html}</div>`;
}

export function showResults(host: HTMLElement, info: ResultInfo, cb: { onRetry(): void; onMap(): void; onNext(): void }): OverlayHandle {
  const { result } = info;
  const m = modal(host, result.passed ? 'results' : 'results refused');
  m.card.append(el('div', 'overlay-kicker', levelLabel(info.level)));
  m.card.append(el('h2', '', result.passed ? (result.stars === 3 ? 'Perfect delivery!' : 'Delivered!') : 'Order refused'));
  if (result.secretRoute) m.card.append(el('div', 'secret-banner', `${ICONS.rocket} Secret route! +${result.bonus}`));
  m.card.insertAdjacentHTML('beforeend', stars(result.stars));
  const loaded = result.loadedLines.length
    ? result.loadedLines.map((l) => `<span class="mini-line">${toyIcon(l.type, 20)}${l.quantity}</span>`).join('<span class="order-arrow">➜</span>')
    : '<span class="muted">nothing</span>';
  const table = el(
    'div',
    'score-table',
    `<div><span>Correct toys</span><b>${result.nCorrect} / ${result.nTotal}</b></div>` +
      `<div><span>Delivered</span><b class="mini">${loaded}</b></div>` +
      `<div><span>Spilled toys</span><b>${result.nSpilled} × −5</b></div>` +
      (result.bonus ? `<div><span>Efficiency bonus</span><b>+${result.bonus}</b></div>` : '') +
      `<div class="total"><span>Score</span><b>${result.score}</b></div>` +
      `<div><span>Best</span><b>${info.best}${info.newBest ? ' <em>new!</em>' : ''}</b></div>`,
  );
  m.card.append(table);
  if (!result.passed) m.card.append(el('p', 'muted', 'The store needs at least 750 points. Try again!'));
  const actions = el('div', 'actions');
  actions.append(
    button('', `${ICONS.restart} Retry`, 'Retry level', () => {
      m.close();
      cb.onRetry();
    }),
    button('', `${ICONS.back} Map`, 'Back to the map', () => {
      m.close();
      cb.onMap();
    }),
  );
  if (info.hasNext) {
    const next = button('primary', 'Next ➜', 'Next level', () => {
      m.close();
      cb.onNext();
    });
    next.disabled = !info.nextUnlocked;
    actions.append(next);
  }
  m.card.append(actions);
  return { close: m.close };
}

export function showDerailed(host: HTMLElement, cb: { onRetry(): void; onMap(): void }): OverlayHandle {
  const m = modal(host, 'derailed');
  m.card.append(el('div', 'boom', '💥'));
  m.card.append(el('h2', '', 'Toy explosion!'));
  m.card.append(el('p', 'muted', 'The engine ran into a pile of spilled toys. Don’t overfill the wagons!'));
  const actions = el('div', 'actions');
  actions.append(
    button('primary', `${ICONS.restart} Retry`, 'Retry level', () => {
      m.close();
      cb.onRetry();
    }),
    button('', `${ICONS.back} Map`, 'Back to the map', () => {
      m.close();
      cb.onMap();
    }),
  );
  m.card.append(actions);
  return { close: m.close };
}

export interface LevelCardInfo {
  level: number;
  unlocked: boolean;
  stars: number;
  best: number;
  secretAvailable: boolean;
  secretFound: boolean;
  orderPreview: string;
}

export function showLevelCard(host: HTMLElement, info: LevelCardInfo, cb: { onPlay(): void; onClose(): void }): OverlayHandle {
  const m = modal(host, 'level-card');
  const close = () => {
    m.close();
    cb.onClose();
  };
  m.root.addEventListener('click', (e) => {
    if (e.target === m.root) close();
  });
  m.card.append(el('div', 'overlay-kicker', `Level ${info.level}`));
  m.card.append(el('h2', '', levelLabel(info.level)));
  m.card.insertAdjacentHTML('beforeend', stars(info.stars));
  if (info.unlocked) {
    m.card.append(el('div', 'level-order', info.orderPreview));
    m.card.append(el('p', 'muted', info.best > 0 ? `Best score: ${info.best}` : 'Not played yet'));
    if (info.secretAvailable) {
      m.card.append(el('p', info.secretFound ? 'secret-found' : 'secret-hint', info.secretFound ? `${ICONS.rocket} Secret route found!` : `${ICONS.rocket} A faster route exists…`));
    }
  } else {
    m.card.append(el('p', 'muted', `${ICONS.lock} Pass level ${info.level - 1} to unlock`));
  }
  const actions = el('div', 'actions');
  actions.append(button('', 'Close', 'Close', close));
  if (info.unlocked) {
    actions.append(
      button('primary', 'Play ➜', `Play level ${info.level}`, () => {
        m.close();
        cb.onPlay();
      }),
    );
  }
  m.card.append(actions);
  return { close: m.close };
}

export function showNotice(host: HTMLElement, title: string, text: string): OverlayHandle {
  const m = modal(host, 'notice');
  m.card.append(el('h2', '', title), el('p', 'muted', text));
  const actions = el('div', 'actions');
  actions.append(button('primary', 'OK', 'OK', () => m.close()));
  m.card.append(actions);
  return { close: m.close };
}

export function showCelebration(host: HTMLElement, text: string, ms = 2200): void {
  const node = el('div', 'celebration passthrough', text);
  host.append(node);
  window.setTimeout(() => node.remove(), ms);
}
