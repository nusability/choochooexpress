// The level as a diorama (spec FR-116, research R41): the play mat sits on a raised, sculpted base
// whose sides tell where it stands — a rug draped over a play table, a layer cake, a sandbox over
// soil and stones, a block of ice with icicles, a model-railway baseboard, a shop's display table.
import * as THREE from 'three';
import { Pcg32, hashSeed } from '../engine/prng';
import { GeoBatch, detailMaterial } from './batch';
import { detailTexture } from './textures';
import { addOutline } from './toon';

/** How far below the yard the room's floor lies, per biome. */
export const DIORAMA_DEPTH: Record<string, number> = {
  rug: 1.1,
  candy: 0.9,
  garden: 0.9,
  space: 0.8,
  ice: 1.0,
  village: 1.0,
  shop: 1.2,
  roads: 0.14,
};

interface Layer {
  color: string;
  height: number;
  /** Grows (+) or shrinks (−) the outline of this layer. */
  inset: number;
  round?: number;
}

function slabShape(w: number, d: number, r: number): THREE.Shape {
  const s = new THREE.Shape();
  const x0 = -w / 2;
  const z0 = -d / 2;
  r = Math.min(r, w / 2 - 0.01, d / 2 - 0.01);
  s.moveTo(x0 + r, z0);
  s.lineTo(x0 + w - r, z0);
  s.quadraticCurveTo(x0 + w, z0, x0 + w, z0 + r);
  s.lineTo(x0 + w, z0 + d - r);
  s.quadraticCurveTo(x0 + w, z0 + d, x0 + w - r, z0 + d);
  s.lineTo(x0 + r, z0 + d);
  s.quadraticCurveTo(x0, z0 + d, x0, z0 + d - r);
  s.lineTo(x0, z0 + r);
  s.quadraticCurveTo(x0, z0, x0 + r, z0);
  return s;
}

/** A rounded slab from y = top − height to top. */
function slab(b: GeoBatch, w: number, d: number, top: number, layer: Layer): void {
  const lw = w + layer.inset * 2;
  const ld = d + layer.inset * 2;
  const bevel = Math.min(0.04, layer.height * 0.3);
  const g = new THREE.ExtrudeGeometry(slabShape(lw - bevel * 2, ld - bevel * 2, layer.round ?? 0.15), {
    depth: Math.max(0.001, layer.height - bevel * 2),
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 4,
  });
  // Shape lies in XY; turn it so it lies in XZ and spans y from top − height to top.
  g.rotateX(Math.PI / 2);
  g.translate(0, top - bevel, 0);
  b.add(g, layer.color);
}

/** Stacks layers downward from y = 0 and returns the bottom. */
function stack(b: GeoBatch, w: number, d: number, layers: Layer[]): number {
  let y = -0.004;
  for (const l of layers) {
    slab(b, w, d, y, l);
    y -= l.height;
  }
  return y;
}

/** Points spaced along the rectangle's edge (x, z, outward normal). */
function around(w: number, d: number, step: number, rng: Pcg32, jitter = 0.3): { x: number; z: number; nx: number; nz: number }[] {
  const out: { x: number; z: number; nx: number; nz: number }[] = [];
  for (let x = -w / 2 + step / 2; x < w / 2; x += step) {
    out.push({ x: x + rng.float(-jitter, jitter) * step, z: -d / 2, nx: 0, nz: -1 });
    out.push({ x: x + rng.float(-jitter, jitter) * step, z: d / 2, nx: 0, nz: 1 });
  }
  for (let z = -d / 2 + step / 2; z < d / 2; z += step) {
    out.push({ x: -w / 2, z: z + rng.float(-jitter, jitter) * step, nx: -1, nz: 0 });
    out.push({ x: w / 2, z: z + rng.float(-jitter, jitter) * step, nx: 1, nz: 0 });
  }
  return out;
}

export interface Diorama {
  group: THREE.Group;
  depth: number;
  dispose(): void;
}

/**
 * The base under a play mat of `w` × `d` world units (its top at y = 0). Sides are built from a
 * few rounded layers plus per-biome trimmings, in one outlined mesh.
 */
export function buildDiorama(biome: string, w: number, d: number, seed: number): Diorama {
  const rng = new Pcg32(hashSeed(seed, 'diorama'));
  const b = new GeoBatch();
  const depth = DIORAMA_DEPTH[biome] ?? 1;
  const legs = (color: string, inset: number, radius: number, from: number) => {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.cylinder(radius * 0.8, radius, depth + from, color, sx * (w / 2 - inset), (-depth + from) / 2 - 0.002, sz * (d / 2 - inset), 12);
  };
  switch (biome) {
    case 'rug': {
      // The rug lies on a wooden play table; its fringe hangs over the short sides.
      const bottom = stack(b, w, d, [
        { color: '#c98a52', height: 0.14, inset: 0.12, round: 0.08 },
        { color: '#a8703c', height: 0.16, inset: 0.02, round: 0.05 },
      ]);
      legs('#a8703c', 0.35, 0.16, bottom);
      for (const sz of [-1, 1]) {
        for (let x = -w / 2 + 0.12; x < w / 2; x += 0.16) b.cylinder(0.022, 0.03, 0.22, ['#f3e3c3', '#e8b04b'][Math.floor(x * 6.25 + 50) % 2] as string, x, -0.11, sz * (d / 2 + 0.02), 6);
      }
      break;
    }
    case 'candy': {
      // A layer cake on a golden cake board, frosting dripping over the edge.
      stack(b, w, d, [
        { color: '#fff0f6', height: 0.1, inset: 0.04, round: 0.4 },
        { color: '#f2c98a', height: 0.24, inset: 0.0, round: 0.4 },
        { color: '#e8476a', height: 0.06, inset: -0.03, round: 0.4 },
        { color: '#f2c98a', height: 0.24, inset: 0.0, round: 0.4 },
        { color: '#ffffff', height: 0.08, inset: 0.02, round: 0.4 },
        { color: '#e7b53a', height: 0.04, inset: 0.35, round: 0.2 },
      ]);
      for (const p of around(w + 0.08, d + 0.08, 0.28, rng)) {
        const len = rng.float(0.06, 0.2);
        b.add(new THREE.CapsuleGeometry(0.045, len, 3, 8), '#fff0f6', new THREE.Matrix4().makeTranslation(p.x, -0.1 - len / 2, p.z));
      }
      for (const p of around(w + 0.12, d + 0.12, 0.5, rng)) b.sphere(0.07, '#d0304a', p.x, -0.84, p.z, 1, 1, 1, 8);
      break;
    }
    case 'garden': {
      // The sandbox stands in the garden: turf, dark soil with pebbles, clay, stone.
      stack(b, w, d, [
        { color: '#7fbf5a', height: 0.08, inset: 0.18, round: 0.3 },
        { color: '#6b4a2a', height: 0.32, inset: 0.15, round: 0.3 },
        { color: '#a0703f', height: 0.24, inset: 0.12, round: 0.35 },
        { color: '#8a8f9c', height: 0.26, inset: 0.08, round: 0.4 },
      ]);
      for (const p of around(w + 0.32, d + 0.32, 0.22, rng)) {
        if (rng.chance(0.5)) b.add(new THREE.DodecahedronGeometry(rng.float(0.03, 0.07), 0), ['#b9b2a6', '#d8d0c4', '#8f8a80'][rng.int(0, 2)] as string, new THREE.Matrix4().makeTranslation(p.x, rng.float(-0.38, -0.12), p.z));
        b.add(new THREE.ConeGeometry(0.035, rng.float(0.08, 0.16), 4), '#5fae45', new THREE.Matrix4().makeRotationZ(rng.float(-0.3, 0.3)).setPosition(p.x + p.nx * 0.02, 0.02, p.z + p.nz * 0.02));
      }
      break;
    }
    case 'space': {
      // A toy space-station deck: metal plates with a glowing band and bolts.
      stack(b, w, d, [
        { color: '#4a5180', height: 0.12, inset: 0.06, round: 0.1 },
        { color: '#7ff6ff', height: 0.05, inset: 0.04, round: 0.1 },
        { color: '#2c3168', height: 0.3, inset: 0.0, round: 0.1 },
        { color: '#1b2257', height: 0.3, inset: -0.1, round: 0.1 },
      ]);
      for (const p of around(w + 0.13, d + 0.13, 0.5, rng, 0)) b.sphere(0.03, '#c9ccd4', p.x, -0.33, p.z, 1, 1, 1, 6);
      break;
    }
    case 'ice': {
      // A block of ice under a snow cap, icicles hanging off it.
      stack(b, w, d, [
        { color: '#ffffff', height: 0.12, inset: 0.08, round: 0.45 },
        { color: '#cfeefa', height: 0.4, inset: 0.0, round: 0.3 },
        { color: '#a9d8f0', height: 0.48, inset: -0.06, round: 0.25 },
      ]);
      for (const p of around(w + 0.04, d + 0.04, 0.18, rng)) {
        const len = rng.float(0.1, 0.32);
        b.add(new THREE.ConeGeometry(rng.float(0.025, 0.05), len, 6).rotateX(Math.PI), '#e8f8ff', new THREE.Matrix4().makeTranslation(p.x, -0.12 - len / 2, p.z));
      }
      break;
    }
    case 'village': {
      // A model-railway baseboard: landscape cut open (turf, soil, rock) on a plywood fascia.
      stack(b, w, d, [
        { color: '#6f9f45', height: 0.06, inset: 0.0, round: 0.05 },
        { color: '#7a5230', height: 0.16, inset: -0.02, round: 0.05 },
        { color: '#9a9488', height: 0.12, inset: -0.03, round: 0.05 },
        { color: '#e3c49a', height: 0.26, inset: 0.05, round: 0.03 },
      ]);
      legs('#b98a55', 0.3, 0.1, -0.6);
      break;
    }
    case 'shop': {
      // A shop's display table: polished top, a drawer front with brass knobs, sturdy legs.
      const bottom = stack(b, w, d, [
        { color: '#8a5a3a', height: 0.1, inset: 0.1, round: 0.08 },
        { color: '#6b3f28', height: 0.28, inset: -0.05, round: 0.05 },
      ]);
      for (const p of around(w - 0.1, d - 0.1, 1.2, rng, 0)) b.sphere(0.05, '#e7b53a', p.x + p.nx * 0.02, -0.24, p.z + p.nz * 0.02, 1, 1, 1, 8);
      legs('#6b3f28', 0.3, 0.14, bottom);
      break;
    }
    default: {
      // A thick foam play mat with jigsaw edges, lying on the carpet.
      stack(b, w, d, [{ color: '#5bb36a', height: 0.13, inset: 0.0, round: 0.05 }]);
      for (const p of around(w, d, 0.7, rng, 0)) b.cylinder(0.12, 0.12, 0.13, '#5bb36a', p.x + p.nx * 0.08, -0.07, p.z + p.nz * 0.08, 12);
    }
  }
  const material = detailMaterial(detailTexture(biome === 'rug' || biome === 'shop' || biome === 'village' ? 'planks' : 'paint'));
  const mesh = b.build(material, 2.5) as THREE.Mesh;
  mesh.receiveShadow = true;
  addOutline(mesh);
  const group = new THREE.Group();
  group.add(mesh);
  return {
    group,
    depth,
    dispose() {
      mesh.geometry.dispose();
      material.dispose();
    },
  };
}
