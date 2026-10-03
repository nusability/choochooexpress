// Pointer gesture recognizer: tap, double tap, pan, pinch, wheel (research R9, spec FR-042).

export interface GestureHandlers {
  /** Any pointer went down (used to unlock audio). */
  onPointerDown?(): void;
  /** A short touch that barely moved. Delivered immediately on release. */
  onTap?(x: number, y: number): void;
  /** Second tap within 300 ms and 30 px of the previous one (the first tap was delivered too). */
  onDoubleTap?(x: number, y: number): void;
  onPanStart?(x: number, y: number): void;
  onPan?(dx: number, dy: number, x: number, y: number): void;
  onPanEnd?(): void;
  /** Two-finger pinch: `scale` is relative to the previous event; (dx, dy) moves the center. */
  onPinch?(scale: number, cx: number, cy: number, dx: number, dy: number): void;
  onWheel?(deltaY: number, x: number, y: number): void;
}

export const TAP_MAX_MOVE = 10;
export const TAP_MAX_MS = 350;
export const DOUBLE_TAP_MS = 300;
export const DOUBLE_TAP_DIST = 30;

interface Track {
  x: number;
  y: number;
  startX: number;
  startY: number;
  startT: number;
}

export class GestureRecognizer {
  private readonly pointers = new Map<number, Track>();
  private tapCandidate = false;
  private panning = false;
  private pinchDist = 0;
  private pinchCx = 0;
  private pinchCy = 0;
  private lastTapT = -Infinity;
  private lastTapX = 0;
  private lastTapY = 0;
  private readonly cleanup: (() => void)[] = [];

  constructor(
    private readonly el: HTMLElement,
    private readonly handlers: GestureHandlers,
  ) {
    const on = <K extends keyof HTMLElementEventMap>(
      target: HTMLElement | Document,
      type: K,
      fn: (e: HTMLElementEventMap[K]) => void,
      opts?: AddEventListenerOptions,
    ) => {
      target.addEventListener(type, fn as EventListener, opts);
      this.cleanup.push(() => target.removeEventListener(type, fn as EventListener, opts));
    };
    on(el, 'pointerdown', (e) => this.down(e));
    on(el, 'pointermove', (e) => this.move(e));
    on(el, 'pointerup', (e) => this.up(e));
    on(el, 'pointercancel', (e) => this.cancel(e));
    on(el, 'wheel', (e) => this.wheel(e), { passive: false });
    on(el, 'contextmenu', (e) => e.preventDefault());
    on(el, 'dblclick', (e) => e.preventDefault());
    // iOS Safari: block page pinch-zoom and scroll while playing.
    const prevent = (e: Event) => e.preventDefault();
    for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
      document.addEventListener(type, prevent, { passive: false });
      this.cleanup.push(() => document.removeEventListener(type, prevent));
    }
    on(el, 'touchmove', (e) => e.preventDefault(), { passive: false });
  }

  dispose(): void {
    for (const fn of this.cleanup) fn();
    this.cleanup.length = 0;
    this.pointers.clear();
  }

  private local(e: PointerEvent | WheelEvent): { x: number; y: number } {
    const rect = this.el.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  private down(e: PointerEvent): void {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    this.handlers.onPointerDown?.();
    try {
      this.el.setPointerCapture(e.pointerId);
    } catch {
      /* synthetic events cannot be captured */
    }
    const p = this.local(e);
    this.pointers.set(e.pointerId, { x: p.x, y: p.y, startX: p.x, startY: p.y, startT: e.timeStamp });
    if (this.pointers.size === 1) {
      this.tapCandidate = true;
      this.panning = false;
    } else if (this.pointers.size === 2) {
      this.tapCandidate = false;
      if (this.panning) {
        this.panning = false;
        this.handlers.onPanEnd?.();
      }
      this.startPinch();
    }
  }

  private move(e: PointerEvent): void {
    const track = this.pointers.get(e.pointerId);
    if (!track) return;
    const p = this.local(e);
    const dx = p.x - track.x;
    const dy = p.y - track.y;
    track.x = p.x;
    track.y = p.y;
    if (this.pointers.size >= 2) {
      this.updatePinch();
      return;
    }
    if (!this.panning) {
      if (Math.hypot(p.x - track.startX, p.y - track.startY) < TAP_MAX_MOVE) return;
      this.tapCandidate = false;
      this.panning = true;
      this.handlers.onPanStart?.(p.x, p.y);
      this.handlers.onPan?.(p.x - track.startX, p.y - track.startY, p.x, p.y);
      return;
    }
    this.handlers.onPan?.(dx, dy, p.x, p.y);
  }

  private up(e: PointerEvent): void {
    const track = this.pointers.get(e.pointerId);
    if (!track) return;
    this.pointers.delete(e.pointerId);
    const p = this.local(e);
    if (this.pointers.size === 0) {
      if (this.panning) {
        this.panning = false;
        this.handlers.onPanEnd?.();
      } else if (
        this.tapCandidate &&
        e.timeStamp - track.startT < TAP_MAX_MS &&
        Math.hypot(p.x - track.startX, p.y - track.startY) < TAP_MAX_MOVE
      ) {
        this.handlers.onTap?.(p.x, p.y);
        if (
          e.timeStamp - this.lastTapT < DOUBLE_TAP_MS &&
          Math.hypot(p.x - this.lastTapX, p.y - this.lastTapY) < DOUBLE_TAP_DIST
        ) {
          this.handlers.onDoubleTap?.(p.x, p.y);
          this.lastTapT = -Infinity;
        } else {
          this.lastTapT = e.timeStamp;
          this.lastTapX = p.x;
          this.lastTapY = p.y;
        }
      }
      this.tapCandidate = false;
    } else if (this.pointers.size === 1) {
      // Pinch ended with one finger left: continue as a pan from here, never as a tap.
      const [rest] = [...this.pointers.values()];
      if (rest) {
        rest.startX = rest.x;
        rest.startY = rest.y;
        this.panning = true;
        this.handlers.onPanStart?.(rest.x, rest.y);
      }
    }
  }

  private cancel(e: PointerEvent): void {
    this.pointers.delete(e.pointerId);
    if (this.pointers.size === 0) {
      if (this.panning) this.handlers.onPanEnd?.();
      this.panning = false;
      this.tapCandidate = false;
    }
  }

  private wheel(e: WheelEvent): void {
    e.preventDefault();
    const p = this.local(e);
    const scale = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
    this.handlers.onWheel?.(e.deltaY * scale, p.x, p.y);
  }

  private pinchPair(): [Track, Track] | null {
    const values = [...this.pointers.values()];
    if (values.length < 2) return null;
    return [values[0] as Track, values[1] as Track];
  }

  private startPinch(): void {
    const pair = this.pinchPair();
    if (!pair) return;
    const [a, b] = pair;
    this.pinchDist = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
    this.pinchCx = (a.x + b.x) / 2;
    this.pinchCy = (a.y + b.y) / 2;
  }

  private updatePinch(): void {
    const pair = this.pinchPair();
    if (!pair) return;
    const [a, b] = pair;
    const dist = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
    const cx = (a.x + b.x) / 2;
    const cy = (a.y + b.y) / 2;
    this.handlers.onPinch?.(dist / this.pinchDist, cx, cy, cx - this.pinchCx, cy - this.pinchCy);
    this.pinchDist = dist;
    this.pinchCx = cx;
    this.pinchCy = cy;
  }
}
