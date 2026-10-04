// Merges slabs, lettering, icons and toy models into one vertex-colored geometry, so a widget is
// one draw call (research R18). Parts added while `movable` is set get a morph target that moves
// them like a pressed toy button.
import * as THREE from 'three';
import type { ToyType } from '../../engine/types';
import { activeHoliday } from '../../graphics/holiday';
import { toyGeometry } from '../../graphics/toyMeshes';
import { iconGeometry, roundRectShape, type IconName } from './icons3d';
import { CAP_HEIGHT, dropBackFaces, emitText, type TextLayout, type TextStyle } from './text3d';
import type { Hop, Wiggle } from './wiggle';

/** How far a pressed button's cap travels (CSS px): down and into its base. */
export const PRESS_DELTA = new THREE.Vector3(0, -3, -5);

const slabCache = new Map<string, { pos: Float32Array; nrm: Float32Array }>();

/** Corner smoothness: `low` for small, numerous slabs (map medallions). */
export type SlabQuality = 'high' | 'low';

/** A rounded, bevelled slab of w × h centered on the origin, back at z = 0, front at z = depth. */
function slabGeometry(w: number, h: number, r: number, depth: number, bevel: number, quality: SlabQuality = 'high'): { pos: Float32Array; nrm: Float32Array } {
  const key = `${w.toFixed(2)}|${h.toFixed(2)}|${r.toFixed(2)}|${depth.toFixed(2)}|${bevel}|${quality}`;
  const hit = slabCache.get(key);
  if (hit) return hit;
  const b = Math.max(0, Math.min(bevel, w / 4, h / 4, depth / 2.5));
  const shape = roundRectShape(-w / 2 + b, -h / 2 + b, w / 2 - b, h / 2 - b, Math.max(0, r - b));
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.01, depth - 2 * b),
    bevelEnabled: b > 0,
    bevelThickness: b,
    bevelSize: b,
    bevelSegments: quality === 'high' ? 2 : 1,
    curveSegments: quality === 'high' ? 5 : 3,
  });
  geo.translate(0, 0, b);
  const out = dropBackFaces(geo);
  geo.dispose();
  if (slabCache.size > 400) slabCache.clear();
  slabCache.set(key, out);
  return out;
}

const toyCache = new Map<string, THREE.BufferGeometry>();

/** A toy model centered on the origin whose largest side is 1 (FR-062). */
function unitToy(type: ToyType): THREE.BufferGeometry {
  // Holiday skins draw some toys as other models (F-015).
  const key = `${activeHoliday()?.skin.id ?? ''}:${type}`;
  const hit = toyCache.get(key);
  if (hit) return hit;
  const geo = toyGeometry(type);
  geo.computeBoundingBox();
  const box = geo.boundingBox as THREE.Box3;
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  geo.translate(-center.x, -center.y, -center.z);
  const s = 1 / Math.max(size.x, size.y, size.z);
  geo.scale(s, s, s);
  toyCache.set(key, geo);
  return geo;
}

export class MeshBuilder {
  private pos: number[] = [];
  private nrm: number[] = [];
  private col: number[] = [];
  private mov: number[] = [];
  private wig: number[] = [];
  private piv: number[] = [];
  /** Parts added while this is true move with the cap when the button is pressed. */
  movable = false;
  /** Parts added while this is set wiggle together (shader motion, research R23). */
  wiggle: Wiggle | null = null;
  /** Per-letter wiggle while lettering is emitted (overrides `wiggle`). */
  private letter: Wiggle | null = null;
  private readonly c = new THREE.Color();
  private readonly v = new THREE.Vector3();
  private readonly n = new THREE.Vector3();
  private readonly nm = new THREE.Matrix3();

  get vertexCount(): number {
    return this.pos.length / 3;
  }

  /**
   * Appends triangles scaled by (s, s, sz) and moved to (x, y, z); normals stay valid. With
   * `frontOnly`, only faces looking at the viewer are kept (flat shadow copies).
   */
  addScaled(pos: ArrayLike<number>, nrm: ArrayLike<number>, color: THREE.ColorRepresentation, s: number, sz: number, x: number, y: number, z: number, frontOnly = false): void {
    this.c.set(color);
    const { r, g, b } = this.c;
    const m = this.movable ? 1 : 0;
    const w = this.letter ?? this.wiggle;
    for (let i = 0; i < pos.length; i += 3) {
      if (frontOnly && i % 9 === 0 && (nrm[i + 2] as number) < 0.5 && (nrm[i + 5] as number) < 0.5 && (nrm[i + 8] as number) < 0.5) {
        i += 6;
        continue;
      }
      this.pos.push(x + (pos[i] as number) * s, y + (pos[i + 1] as number) * s, z + (pos[i + 2] as number) * sz);
      this.nrm.push(nrm[i] as number, nrm[i + 1] as number, nrm[i + 2] as number);
      this.col.push(r, g, b);
      this.mov.push(m);
      this.pushWiggle(w);
    }
  }

  private pushWiggle(w: Wiggle | null): void {
    if (w) {
      this.wig.push(w.phase, w.hop, w.roll, w.speed);
      this.piv.push(w.px, w.py);
    } else {
      this.wig.push(0, 0, 0, 0);
      this.piv.push(0, 0);
    }
  }

  /** Appends a geometry through a matrix, with its own vertex colors when `color` is null. */
  addGeometry(geo: THREE.BufferGeometry, color: THREE.ColorRepresentation | null, matrix: THREE.Matrix4): void {
    const src = geo.index ? geo.toNonIndexed() : geo;
    const p = src.getAttribute('position');
    const nr = src.getAttribute('normal');
    const cl = src.getAttribute('color');
    if (color !== null) this.c.set(color);
    this.nm.getNormalMatrix(matrix);
    const m = this.movable ? 1 : 0;
    const w = this.letter ?? this.wiggle;
    for (let i = 0; i < p.count; i++) {
      this.pushWiggle(w);
      this.v.fromBufferAttribute(p, i).applyMatrix4(matrix);
      this.n.fromBufferAttribute(nr, i).applyMatrix3(this.nm).normalize();
      this.pos.push(this.v.x, this.v.y, this.v.z);
      this.nrm.push(this.n.x, this.n.y, this.n.z);
      if (color === null && cl) this.col.push(cl.getX(i), cl.getY(i), cl.getZ(i));
      else this.col.push(this.c.r, this.c.g, this.c.b);
      this.mov.push(m);
    }
    if (src !== geo) src.dispose();
  }

  /** Rounded slab centered at (x, y): back at z, front at z + depth. */
  slab(w: number, h: number, r: number, depth: number, color: THREE.ColorRepresentation, x: number, y: number, z: number, bevel = 2, quality: SlabQuality = 'high'): void {
    const g = slabGeometry(w, h, r, depth, bevel, quality);
    this.addScaled(g.pos, g.nrm, color, 1, 1, x, y, z);
  }

  disc(radius: number, depth: number, color: THREE.ColorRepresentation, x: number, y: number, z: number, bevel = 1.5, quality: SlabQuality = 'high'): void {
    this.slab(radius * 2, radius * 2, radius, depth, color, x, y, z, bevel, quality);
  }

  /**
   * The house style of every panel and button: an ink base (outline plus a thicker bottom edge)
   * under a colored cap. Returns the z of the cap's front face.
   */
  toyBlock(w: number, h: number, r: number, cap: THREE.ColorRepresentation, x: number, y: number, z: number, opts: { rim?: number; drop?: number; depth?: number; ink?: THREE.ColorRepresentation } = {}): number {
    const rim = opts.rim ?? 3;
    const drop = opts.drop ?? 4;
    const depth = opts.depth ?? 10;
    const wasMovable = this.movable;
    this.movable = false;
    this.slab(w + rim * 2, h + rim * 2 + drop, r + rim, depth * 0.7, opts.ink ?? '#3b2a20', x, y - drop / 2, z, 2);
    this.movable = wasMovable;
    this.slab(w, h, r, depth, cap, x, y, z + depth * 0.35, 2.5);
    return z + depth * 1.35;
  }

  /**
   * 3D lettering; `flat` keeps only the letters' faces (for shadow copies behind other text), and
   * `hop` makes the letters hop one after another (FR-067).
   */
  text(text: string, style: TextStyle, x: number, y: number, z: number, color: THREE.ColorRepresentation, flat = false, hop?: Hop): TextLayout {
    let index = 0;
    const layout = emitText(text, style, x, y, z, (g, gx, gy, gz, s, d) => {
      if (hop) {
        this.letter = {
          phase: (hop.phase ?? 0) + index * (hop.step ?? 0.55),
          hop: hop.height,
          roll: hop.roll ?? 0.08,
          speed: hop.speed ?? 3.4,
          px: gx + (g.advance * s) / 2,
          py: gy + (CAP_HEIGHT * s) / 2,
        };
      }
      this.addScaled(g.pos, g.nrm, color, s, d, gx, gy, gz, flat);
      index++;
    });
    this.letter = null;
    return layout;
  }

  icon(name: IconName, size: number, x: number, y: number, z: number, depth: number, main: THREE.ColorRepresentation, accent: THREE.ColorRepresentation = '#ffffff'): void {
    for (const part of iconGeometry(name, dropBackFaces)) {
      const d = part.tone === 1 ? depth * 1.25 : depth;
      this.addScaled(part.pos, part.nrm, part.tone === 1 ? accent : main, size, d, x, y, z);
    }
  }

  /** A toy model of the given size, seen from slightly above and to the side. */
  toy(type: ToyType, size: number, x: number, y: number, z: number, rx = 0.5, ry = -0.65): void {
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, z + size * 0.5),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, 0, 'XYZ')),
      new THREE.Vector3(size, size, size),
    );
    this.addGeometry(unitToy(type), null, m);
  }

  box(w: number, h: number, depth: number, color: THREE.ColorRepresentation, x: number, y: number, z: number): void {
    const g = slabGeometry(w, h, 0, depth, 0);
    this.addScaled(g.pos, g.nrm, color, 1, 1, x, y, z);
  }

  /** The merged geometry; `matrix` moves it (and its wiggle pivots) into another space. */
  build(matrix?: THREE.Matrix4): THREE.BufferGeometry {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(this.nrm, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    geo.setAttribute('aWig', new THREE.Float32BufferAttribute(this.wig, 4));
    const piv = new THREE.Float32BufferAttribute(this.piv, 2);
    geo.setAttribute('aPivot', piv);
    if (matrix) {
      geo.applyMatrix4(matrix);
      const v = new THREE.Vector3();
      for (let i = 0; i < piv.count; i++) {
        v.set(piv.getX(i), piv.getY(i), 0).applyMatrix4(matrix);
        piv.setXY(i, v.x, v.y);
      }
    }
    if (this.mov.some((m) => m === 1)) {
      const d = new Float32Array(this.pos.length);
      this.mov.forEach((m, i) => {
        if (!m) return;
        d[i * 3] = PRESS_DELTA.x;
        d[i * 3 + 1] = PRESS_DELTA.y;
        d[i * 3 + 2] = PRESS_DELTA.z;
      });
      geo.morphAttributes.position = [new THREE.BufferAttribute(d, 3)];
      geo.morphTargetsRelative = true;
    }
    geo.computeBoundingSphere();
    return geo;
  }

  /**
   * Writes the triangles into a mesh whose geometry is rebuilt often (live counters), reusing its
   * buffers while they are big enough.
   */
  writeTo(mesh: THREE.Mesh): void {
    const n = this.vertexCount;
    let geo = mesh.geometry;
    const pa = geo.getAttribute('position') as THREE.BufferAttribute | undefined;
    if (!pa || pa.count < n) {
      geo.dispose();
      const cap = Math.max(256, Math.ceil(n * 1.5));
      geo = new THREE.BufferGeometry();
      for (const [name, size] of [['position', 3], ['normal', 3], ['color', 3], ['aWig', 4], ['aPivot', 2]] as const) {
        geo.setAttribute(name, new THREE.BufferAttribute(new Float32Array(cap * size), size).setUsage(THREE.DynamicDrawUsage));
      }
      mesh.geometry = geo;
    }
    const write = (name: string, data: number[]) => {
      const attr = geo.getAttribute(name) as THREE.BufferAttribute;
      (attr.array as Float32Array).set(data);
      attr.clearUpdateRanges();
      attr.addUpdateRange(0, data.length);
      attr.needsUpdate = true;
    };
    write('position', this.pos);
    write('normal', this.nrm);
    write('color', this.col);
    write('aWig', this.wig);
    write('aPivot', this.piv);
    geo.setDrawRange(0, n);
  }
}
