// Pointer routing for the 3D interface (research R21, spec FR-063, FR-064). Listens on `window` in
// the capture phase, so it sees every pointer before the board's gesture recognizer. A pointer
// that goes down on a button — or anywhere while a card is open — is claimed and never reaches the
// board; everything else passes through untouched.
import type { UiItem } from './items';
import type { UiLayer } from './uiLayer';

export class UiInput {
  /** Claimed pointers → the button they pressed (null: an open card's backdrop). */
  private readonly claims = new Map<number, UiItem | null>();
  private readonly cleanup: (() => void)[] = [];

  constructor(
    private readonly ui: UiLayer,
    private readonly surface: HTMLElement,
  ) {
    const on = (type: 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel', fn: (e: PointerEvent) => void) => {
      window.addEventListener(type, fn, { capture: true });
      this.cleanup.push(() => window.removeEventListener(type, fn, { capture: true }));
    };
    on('pointerdown', (e) => this.down(e));
    on('pointermove', (e) => this.move(e));
    on('pointerup', (e) => this.up(e));
    on('pointercancel', (e) => this.cancel(e));
  }

  dispose(): void {
    for (const fn of this.cleanup) fn();
    this.cleanup.length = 0;
    this.claims.clear();
  }

  private local(e: PointerEvent): { x: number; y: number } {
    const r = this.surface.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private down(e: PointerEvent): void {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const p = this.local(e);
    const item = this.ui.hitTest(p.x, p.y);
    if (!item && !this.ui.modal) return;
    e.stopPropagation();
    this.claims.set(e.pointerId, item);
    if (item?.enabled && item.onDrag) item.onDrag(p.x, p.y, 'start');
    else if (item?.enabled) item.setPressed(true);
  }

  private move(e: PointerEvent): void {
    const p = this.local(e);
    if (this.claims.has(e.pointerId)) {
      e.stopPropagation();
      const item = this.claims.get(e.pointerId);
      if (item?.enabled && item.onDrag) item.onDrag(p.x, p.y, 'move');
      else if (item?.enabled) item.setPressed(item.contains(p.x, p.y));
      return;
    }
    if (e.pointerType === 'mouse') {
      const hover = this.ui.hitTest(p.x, p.y);
      this.surface.style.cursor = hover?.enabled ? 'pointer' : '';
    }
  }

  private up(e: PointerEvent): void {
    if (!this.claims.has(e.pointerId)) return;
    e.stopPropagation();
    const item = this.claims.get(e.pointerId) ?? null;
    this.claims.delete(e.pointerId);
    const p = this.local(e);
    if (item?.onDrag) {
      if (item.enabled) item.onDrag(p.x, p.y, 'end');
      return;
    }
    if (item) {
      item.setPressed(false);
      if (item.enabled && item.shown && item.contains(p.x, p.y)) {
        this.ui.onButton?.();
        item.onTap?.();
      }
      return;
    }
    this.ui.modal?.onBackdropTap?.();
  }

  private cancel(e: PointerEvent): void {
    if (!this.claims.has(e.pointerId)) return;
    e.stopPropagation();
    this.claims.get(e.pointerId)?.setPressed(false);
    this.claims.delete(e.pointerId);
  }
}
