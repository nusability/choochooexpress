// 3D lettering from the bundled font outlines (research R19, spec FR-061).
// Each glyph is extruded once at unit size and cached; strings are composed by copying the cached
// vertices, scaled, into the caller's geometry arrays (see GeoArrays in builder.ts).
import * as THREE from 'three';
import fontFile from '../fonts/fredoka.json';

interface FontFile {
  unitsPerEm: number;
  ascender: number;
  descender: number;
  glyphs: Record<string, [number, string]>;
}

const FONT = fontFile as unknown as FontFile;
const UPM = FONT.unitsPerEm;

/** Height of capital letters, as a fraction of the font size (used to center text). */
export const CAP_HEIGHT = 0.7;
/** Distance between baselines, as a fraction of the font size. */
export const LINE_HEIGHT = 1.22;

/** Characters the font lacks are drawn with a near equivalent. */
const FALLBACK: Record<string, string> = { '‘': "'", '“': '"', '”': '"', '•': '·', '➜': '>', '→': '>' };

export interface Glyph {
  /** Advance width at size 1. */
  advance: number;
  /** Triangles (front faces and walls; the unseen back is dropped), size 1, depth 0…1. */
  pos: Float32Array;
  nrm: Float32Array;
}

const cache = new Map<string, Glyph>();

function parseOutline(path: string): THREE.Shape[] {
  const sp = new THREE.ShapePath();
  const t = path.split(' ');
  let i = 0;
  const n = () => Number(t[i++]);
  while (i < t.length) {
    const cmd = t[i++];
    if (cmd === 'M') sp.moveTo(n(), n());
    else if (cmd === 'L') sp.lineTo(n(), n());
    else if (cmd === 'Q') {
      const cx = n();
      const cy = n();
      sp.quadraticCurveTo(cx, cy, n(), n());
    }
    // 'Z': subpaths are closed when they are triangulated.
  }
  return sp.toShapes();
}

/** Front-facing triangles and walls of an extruded geometry (back faces removed). */
export function dropBackFaces(geo: THREE.BufferGeometry): { pos: Float32Array; nrm: Float32Array } {
  const src = geo.index ? geo.toNonIndexed() : geo;
  const p = src.getAttribute('position');
  const nr = src.getAttribute('normal');
  const keep: number[] = [];
  for (let t = 0; t < p.count; t += 3) {
    if (nr.getZ(t) < -0.9 && nr.getZ(t + 1) < -0.9 && nr.getZ(t + 2) < -0.9) continue;
    keep.push(t);
  }
  const pos = new Float32Array(keep.length * 9);
  const nrm = new Float32Array(keep.length * 9);
  keep.forEach((t, k) => {
    for (let v = 0; v < 3; v++) {
      const o = k * 9 + v * 3;
      pos[o] = p.getX(t + v);
      pos[o + 1] = p.getY(t + v);
      pos[o + 2] = p.getZ(t + v);
      nrm[o] = nr.getX(t + v);
      nrm[o + 1] = nr.getY(t + v);
      nrm[o + 2] = nr.getZ(t + v);
    }
  });
  if (src !== geo) src.dispose();
  return { pos, nrm };
}

export function glyph(ch: string): Glyph {
  const hit = cache.get(ch);
  if (hit) return hit;
  const entry = FONT.glyphs[ch] ?? FONT.glyphs[FALLBACK[ch] ?? '?'] ?? [UPM / 2, ''];
  let pos: Float32Array = new Float32Array(0);
  let nrm: Float32Array = new Float32Array(0);
  const shapes = entry[1] ? parseOutline(entry[1]) : [];
  if (shapes.length > 0) {
    // Two segments per quadratic: the outlines already have many short curves.
    const geo = new THREE.ExtrudeGeometry(shapes, { depth: UPM, bevelEnabled: false, curveSegments: 2 });
    geo.scale(1 / UPM, 1 / UPM, 1 / UPM);
    ({ pos, nrm } = dropBackFaces(geo));
    geo.dispose();
  }
  const g: Glyph = { advance: entry[0] / UPM, pos, nrm };
  cache.set(ch, g);
  return g;
}

/** True when the font (or a fallback) can draw the character. */
export function hasGlyph(ch: string): boolean {
  return ch in FONT.glyphs || (ch in FALLBACK && (FALLBACK[ch] as string) in FONT.glyphs);
}

export interface TextStyle {
  /** Font size in units (CSS px in the interface, world units in the scene). */
  size: number;
  /** Extrusion depth in the same units (default 18% of the size). */
  depth?: number;
  align?: 'left' | 'center' | 'right';
  /** Wrap (or, without `wrap`, shrink) to this width. */
  maxWidth?: number;
  wrap?: boolean;
  /** Smallest size shrinking may reach (default 70% of `size`). */
  minSize?: number;
  /** Extra space between letters, as a fraction of the size. */
  tracking?: number;
  lineHeight?: number;
}

export function measure(text: string, size: number, tracking = 0): number {
  let w = 0;
  for (const ch of text) w += glyph(ch).advance + tracking;
  if (text.length > 0) w -= tracking;
  return w * size;
}

export interface TextLayout {
  lines: string[];
  size: number;
  width: number;
  height: number;
}

/** Fits text into `maxWidth`: wraps at spaces when `wrap`, otherwise shrinks, then truncates. */
export function layoutText(text: string, style: TextStyle): TextLayout {
  const tracking = style.tracking ?? 0;
  const lh = style.lineHeight ?? LINE_HEIGHT;
  let size = style.size;
  let lines = text.split('\n');
  const max = style.maxWidth;
  if (max !== undefined && max > 0) {
    if (style.wrap) {
      lines = lines.flatMap((para) => wrapLine(para, size, max, tracking));
    } else {
      const widest = Math.max(...lines.map((l) => measure(l, size, tracking)));
      if (widest > max) size = Math.max(style.minSize ?? size * 0.7, (size * max) / widest);
      lines = lines.map((l) => truncate(l, size, max, tracking));
    }
  }
  const width = Math.max(0, ...lines.map((l) => measure(l, size, tracking)));
  const height = size * (CAP_HEIGHT + (lines.length - 1) * lh);
  return { lines, size, width, height };
}

function wrapLine(para: string, size: number, max: number, tracking: number): string[] {
  const words = para.split(' ');
  const out: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && measure(next, size, tracking) > max) {
      out.push(line);
      line = word;
    } else line = next;
  }
  out.push(line);
  return out;
}

function truncate(line: string, size: number, max: number, tracking: number): string {
  if (measure(line, size, tracking) <= max) return line;
  let s = line;
  while (s.length > 1 && measure(`${s}…`, size, tracking) > max) s = s.slice(0, -1);
  return `${s.trimEnd()}…`;
}

/** Receives the triangles of laid-out text; (x, y, z) is the glyph origin, `s` its size. */
export type GlyphSink = (g: Glyph, x: number, y: number, z: number, s: number, depth: number) => void;

/**
 * Lays out text centered vertically on `y` (cap height) and aligned on `x`, front face at
 * `z + depth`. Returns the layout used.
 */
export function emitText(text: string, style: TextStyle, x: number, y: number, z: number, sink: GlyphSink): TextLayout {
  const layout = layoutText(text, style);
  const { size } = layout;
  const depth = style.depth ?? size * 0.18;
  const tracking = style.tracking ?? 0;
  const lh = (style.lineHeight ?? LINE_HEIGHT) * size;
  let baseline = y + layout.height / 2 - CAP_HEIGHT * size;
  for (const line of layout.lines) {
    const w = measure(line, size, tracking);
    let pen = style.align === 'left' ? x : style.align === 'right' ? x - w : x - w / 2;
    for (const ch of line) {
      const g = glyph(ch);
      if (g.pos.length) sink(g, pen, baseline, z, size, depth);
      pen += (g.advance + tracking) * size;
    }
    baseline -= lh;
  }
  return layout;
}

/** Stand-alone text geometry (position + normal), e.g. for signs in the world. */
export function textGeometry(text: string, style: TextStyle): THREE.BufferGeometry {
  const pos: number[] = [];
  const nrm: number[] = [];
  emitText(text, style, 0, 0, 0, (g, gx, gy, gz, s, d) => {
    for (let i = 0; i < g.pos.length; i += 3) {
      pos.push(gx + (g.pos[i] as number) * s, gy + (g.pos[i + 1] as number) * s, gz + (g.pos[i + 2] as number) * d);
      nrm.push(g.nrm[i] as number, g.nrm[i + 1] as number, g.nrm[i + 2] as number);
    }
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  return geo;
}
