// Inline SVG icons: toy types are told apart by shape and color (NFR-011).
import type { ToyType } from '../engine/types';
import { TOY_COLORS } from '../graphics/palette';

const INK = '#3b2a20';

const SHAPES: Record<ToyType, (c: string) => string> = {
  block: (c) =>
    `<rect x="10" y="10" width="44" height="44" rx="8" fill="${c}" stroke="${INK}" stroke-width="4"/>` +
    `<text x="32" y="42" text-anchor="middle" font-size="28" font-weight="800" fill="#fff6e6" font-family="ui-rounded,system-ui,sans-serif">A</text>`,
  duck: (c) =>
    `<ellipse cx="30" cy="40" rx="21" ry="13" fill="${c}" stroke="${INK}" stroke-width="4"/>` +
    `<circle cx="40" cy="22" r="11" fill="${c}" stroke="${INK}" stroke-width="4"/>` +
    `<path d="M50 20 L60 24 L50 28 Z" fill="#f08a2c" stroke="${INK}" stroke-width="2"/>` +
    `<circle cx="42" cy="19" r="2.5" fill="${INK}"/>`,
  car: (c) =>
    `<rect x="7" y="29" width="50" height="16" rx="6" fill="${c}" stroke="${INK}" stroke-width="4"/>` +
    `<rect x="19" y="17" width="25" height="15" rx="5" fill="${c}" stroke="${INK}" stroke-width="4"/>` +
    `<circle cx="19" cy="47" r="6" fill="${INK}"/><circle cx="45" cy="47" r="6" fill="${INK}"/>`,
  ball: (c) =>
    `<circle cx="32" cy="32" r="22" fill="${c}" stroke="${INK}" stroke-width="4"/>` +
    `<path d="M14 24 Q32 34 50 24" fill="none" stroke="#fff6e6" stroke-width="5"/>` +
    `<path d="M14 40 Q32 30 50 40" fill="none" stroke="#fff6e6" stroke-width="5"/>`,
  star: (c) =>
    `<path d="M32 6 L39 24 L58 24 L43 36 L49 55 L32 44 L15 55 L21 36 L6 24 L25 24 Z" fill="${c}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`,
};

export function toyIcon(type: ToyType, size = 28): string {
  return `<svg class="toy-icon" width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true">${SHAPES[type](TOY_COLORS[type])}</svg>`;
}

export const ICONS = {
  back: `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M15 4 L7 12 L15 20" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  pause: `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1.5" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1.5" fill="currentColor"/></svg>`,
  restart: `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M5 12 A7 7 0 1 0 8 6.3" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M8 2 L8 7 L3 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  soundOn: `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M4 9 H8 L13 5 V19 L8 15 H4 Z" fill="currentColor"/><path d="M16 8.5 Q19 12 16 15.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>`,
  soundOff: `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M4 9 H8 L13 5 V19 L8 15 H4 Z" fill="currentColor"/><path d="M16 9 L21 14 M21 9 L16 14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>`,
  overview: `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3" fill="none" stroke="currentColor" stroke-width="2.6"/><path d="M8 15 L11 11 L13 13 L16 9" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>`,
  follow: `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" stroke-width="2.6"/><circle cx="12" cy="12" r="2.6" fill="currentColor"/></svg>`,
  star: `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 4 L40 23 L60 24 L44 37 L50 57 L32 46 L14 57 L20 37 L4 24 L24 23 Z" fill="currentColor" stroke="#3b2a20" stroke-width="4" stroke-linejoin="round"/></svg>`,
  lock: `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2.5" fill="currentColor"/><path d="M8 10 V7 A4 4 0 0 1 16 7 V10" fill="none" stroke="currentColor" stroke-width="2.6"/></svg>`,
  rocket: `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M12 2 C16 5 17 10 15 15 H9 C7 10 8 5 12 2 Z" fill="currentColor"/><path d="M9 15 L6 19 L9 18 Z M15 15 L18 19 L15 18 Z" fill="currentColor"/><circle cx="12" cy="9" r="2" fill="#fff"/></svg>`,
  warn: `<svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true"><path d="M12 3 L22 20 H2 Z" fill="currentColor"/><rect x="11" y="9" width="2" height="6" fill="#fff"/><rect x="11" y="16.5" width="2" height="2" fill="#fff"/></svg>`,
};
