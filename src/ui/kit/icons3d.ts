// Interface icons as extrudable shapes in a unit box (−0.5 … 0.5, y up) (research R20).
// Each icon is a list of parts; tone 0 takes the main color, tone 1 the accent color and sits a
// little in front so overlapping parts never z-fight.
import * as THREE from 'three';

export type IconName =
  | 'back'
  | 'next'
  | 'pause'
  | 'soundOn'
  | 'soundOff'
  | 'restart'
  | 'follow'
  | 'overview'
  | 'close'
  | 'arrow'
  | 'check'
  | 'warn'
  | 'star'
  | 'lock'
  | 'rocket'
  | 'train'
  | 'burst'
  | 'swap';

export interface IconPart {
  shapes: THREE.Shape[];
  tone: 0 | 1;
}

const PI = Math.PI;

/** A rounded stroke from a to b (stadium shape). */
function capsule(ax: number, ay: number, bx: number, by: number, r: number): THREE.Shape {
  const t = Math.atan2(by - ay, bx - ax);
  const s = new THREE.Shape();
  s.absarc(bx, by, r, t + PI / 2, t - PI / 2, true);
  s.absarc(ax, ay, r, t - PI / 2, t - (3 * PI) / 2, true);
  return s;
}

function polyline(points: readonly [number, number][], r: number): THREE.Shape[] {
  const out: THREE.Shape[] = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1] as [number, number];
    const b = points[i] as [number, number];
    out.push(capsule(a[0], a[1], b[0], b[1], r));
  }
  return out;
}

function circle(cx: number, cy: number, r: number): THREE.Shape {
  return new THREE.Shape().absarc(cx, cy, r, 0, PI * 2, false);
}

function ring(cx: number, cy: number, outer: number, inner: number): THREE.Shape {
  const s = circle(cx, cy, outer);
  s.holes.push(new THREE.Path().absarc(cx, cy, inner, 0, PI * 2, true));
  return s;
}

export function roundRectShape(x0: number, y0: number, x1: number, y1: number, r: number): THREE.Shape {
  const s = new THREE.Shape();
  roundRectPath(s, x0, y0, x1, y1, r);
  return s;
}

function roundRectPath(p: THREE.Path, x0: number, y0: number, x1: number, y1: number, r: number): void {
  const rr = Math.max(0, Math.min(r, (x1 - x0) / 2, (y1 - y0) / 2));
  p.moveTo(x0 + rr, y0);
  p.lineTo(x1 - rr, y0);
  if (rr > 0) p.absarc(x1 - rr, y0 + rr, rr, -PI / 2, 0, false);
  p.lineTo(x1, y1 - rr);
  if (rr > 0) p.absarc(x1 - rr, y1 - rr, rr, 0, PI / 2, false);
  p.lineTo(x0 + rr, y1);
  if (rr > 0) p.absarc(x0 + rr, y1 - rr, rr, PI / 2, PI, false);
  p.lineTo(x0, y0 + rr);
  if (rr > 0) p.absarc(x0 + rr, y0 + rr, rr, PI, PI * 1.5, false);
}

function polygon(points: readonly [number, number][]): THREE.Shape {
  return new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
}

/** A thick arc band with round ends, from angle a0 to a1 (counter-clockwise). */
function arcBand(cx: number, cy: number, r: number, a0: number, a1: number, w: number): THREE.Shape {
  const h = w / 2;
  const s = new THREE.Shape();
  s.absarc(cx, cy, r + h, a0, a1, false);
  s.absarc(cx + Math.cos(a1) * r, cy + Math.sin(a1) * r, h, a1, a1 + PI, false);
  s.absarc(cx, cy, r - h, a1, a0, true);
  s.absarc(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r, h, a0 + PI, a0 + 2 * PI, false);
  return s;
}

export function starShape(outer = 0.5, inner = 0.215, points = 5, cx = 0, cy = 0): THREE.Shape {
  const pts: [number, number][] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = PI / 2 + (i * PI) / points;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return polygon(pts);
}

const speaker = (): THREE.Shape =>
  polygon([
    [-0.42, 0.13],
    [-0.2, 0.13],
    [0.03, 0.35],
    [0.03, -0.35],
    [-0.2, -0.13],
    [-0.42, -0.13],
  ]);

function arrowHead(px: number, py: number, angle: number, len: number, half: number): THREE.Shape {
  const tx = Math.cos(angle);
  const ty = Math.sin(angle);
  return polygon([
    [px + tx * len, py + ty * len],
    [px - ty * half - tx * len * 0.35, py + tx * half - ty * len * 0.35],
    [px + ty * half - tx * len * 0.35, py - tx * half - ty * len * 0.35],
  ]);
}

const DEFS: Record<IconName, () => IconPart[]> = {
  back: () => [{ shapes: polyline([[0.13, 0.31], [-0.17, 0], [0.13, -0.31]], 0.085), tone: 0 }],
  next: () => [{ shapes: polyline([[-0.13, 0.31], [0.17, 0], [-0.13, -0.31]], 0.085), tone: 0 }],
  pause: () => [{ shapes: [roundRectShape(-0.27, -0.33, -0.07, 0.33, 0.06), roundRectShape(0.07, -0.33, 0.27, 0.33, 0.06)], tone: 0 }],
  soundOn: () => [{ shapes: [speaker(), arcBand(0.05, 0, 0.19, -0.8, 0.8, 0.08), arcBand(0.05, 0, 0.35, -0.8, 0.8, 0.08)], tone: 0 }],
  soundOff: () => [{ shapes: [speaker(), capsule(0.17, 0.15, 0.43, -0.15, 0.055), capsule(0.17, -0.15, 0.43, 0.15, 0.055)], tone: 0 }],
  restart: () => {
    const a1 = PI + 2 * PI * 0.86;
    const r = 0.29;
    return [
      {
        shapes: [arcBand(0, -0.02, r, PI, a1, 0.1), arrowHead(Math.cos(a1) * r, -0.02 + Math.sin(a1) * r, a1 + PI / 2, 0.2, 0.17)],
        tone: 0,
      },
    ];
  },
  follow: () => [{ shapes: [ring(0, 0, 0.37, 0.25), circle(0, 0, 0.12)], tone: 0 }],
  overview: () => {
    const frame = roundRectShape(-0.43, -0.32, 0.43, 0.32, 0.09);
    const hole = new THREE.Path();
    roundRectPath(hole, -0.32, -0.21, 0.32, 0.21, 0.03);
    frame.holes.push(hole);
    return [{ shapes: [frame, ...polyline([[-0.17, -0.12], [-0.04, 0.04], [0.04, -0.04], [0.17, 0.12]], 0.045)], tone: 0 }];
  },
  close: () => [{ shapes: [capsule(-0.25, 0.25, 0.25, -0.25, 0.08), capsule(-0.25, -0.25, 0.25, 0.25, 0.08)], tone: 0 }],
  arrow: () => [{ shapes: [capsule(-0.33, 0, 0.24, 0, 0.075), ...polyline([[0.04, 0.22], [0.3, 0], [0.04, -0.22]], 0.075)], tone: 0 }],
  check: () => [{ shapes: polyline([[-0.31, 0.02], [-0.08, -0.22], [0.32, 0.24]], 0.085), tone: 0 }],
  warn: () => [
    { shapes: [polygon([[0, 0.45], [0.5, -0.4], [-0.5, -0.4]])], tone: 0 },
    { shapes: [roundRectShape(-0.055, -0.13, 0.055, 0.2, 0.045), circle(0, -0.26, 0.06)], tone: 1 },
  ],
  star: () => [{ shapes: [starShape()], tone: 0 }],
  lock: () => [
    { shapes: [roundRectShape(-0.31, -0.42, 0.31, 0.06, 0.08), arcBand(0, 0.06, 0.18, 0, PI, 0.1)], tone: 0 },
    { shapes: [circle(0, -0.14, 0.065)], tone: 1 },
  ],
  rocket: () => {
    const body = new THREE.Shape();
    body.moveTo(0, 0.48);
    body.quadraticCurveTo(0.25, 0.28, 0.17, -0.2);
    body.lineTo(-0.17, -0.2);
    body.quadraticCurveTo(-0.25, 0.28, 0, 0.48);
    return [
      {
        shapes: [
          body,
          polygon([[0.15, 0.0], [0.34, -0.36], [0.12, -0.24]]),
          polygon([[-0.15, 0.0], [-0.12, -0.24], [-0.34, -0.36]]),
        ],
        tone: 0,
      },
      { shapes: [circle(0, 0.12, 0.085), polygon([[-0.1, -0.22], [0.1, -0.22], [0, -0.46]])], tone: 1 },
    ];
  },
  train: () => [
    {
      shapes: [
        roundRectShape(-0.46, -0.16, 0.16, 0.12, 0.05),
        roundRectShape(0.06, -0.16, 0.46, 0.34, 0.06),
        roundRectShape(-0.36, 0.08, -0.2, 0.34, 0.04),
      ],
      tone: 0,
    },
    { shapes: [circle(-0.3, -0.22, 0.12), circle(0.0, -0.22, 0.12), circle(0.3, -0.22, 0.12)], tone: 1 },
  ],
  burst: () => {
    const pts: [number, number][] = [];
    const radii = [0.5, 0.27, 0.44, 0.25, 0.5, 0.29, 0.42, 0.24, 0.48, 0.27, 0.45, 0.26];
    radii.forEach((r, i) => {
      const a = PI / 2 + (i * 2 * PI) / radii.length;
      pts.push([Math.cos(a) * r, Math.sin(a) * r]);
    });
    return [
      { shapes: [polygon(pts)], tone: 0 },
      { shapes: [starShape(0.24, 0.12, 6)], tone: 1 },
    ];
  },
  swap: () => [
    {
      shapes: [
        capsule(-0.3, 0.14, 0.24, 0.14, 0.065),
        ...polyline([[0.08, 0.3], [0.29, 0.14], [0.08, -0.02]], 0.065),
        capsule(0.3, -0.14, -0.24, -0.14, 0.065),
        ...polyline([[-0.08, 0.02], [-0.29, -0.14], [-0.08, -0.3]], 0.065),
      ],
      tone: 0,
    },
  ],
};

export interface IconGeometry {
  tone: 0 | 1;
  pos: Float32Array;
  nrm: Float32Array;
}

const cache = new Map<IconName, IconGeometry[]>();

/** Unit-size extruded icon parts (depth 0 … 1, front faces and walls only). */
export function iconGeometry(name: IconName, dropBack: (g: THREE.BufferGeometry) => { pos: Float32Array; nrm: Float32Array }): IconGeometry[] {
  const hit = cache.get(name);
  if (hit) return hit;
  const parts = DEFS[name]().map((part) => {
    const geo = new THREE.ExtrudeGeometry(part.shapes, { depth: 1, bevelEnabled: false, curveSegments: 8 });
    const { pos, nrm } = dropBack(geo);
    geo.dispose();
    return { tone: part.tone, pos, nrm };
  });
  cache.set(name, parts);
  return parts;
}
