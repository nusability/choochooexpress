// Procedural canvas textures: no image downloads (research R10).
import * as THREE from 'three';

type Draw = (ctx: CanvasRenderingContext2D, size: number, rand: () => number) => void;

const cache = new Map<string, THREE.CanvasTexture>();

/** Small deterministic PRNG for texture noise (mulberry32). */
function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function make(key: string, size: number, draw: Draw, repeat = 1): THREE.CanvasTexture {
  const hit = cache.get(key);
  if (hit) return hit;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  draw(ctx, size, mulberry(key.length * 7919 + size));
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = 4;
  cache.set(key, tex);
  return tex;
}

function speckle(ctx: CanvasRenderingContext2D, size: number, rand: () => number, count: number, color: string, maxR: number): void {
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const r = rand() * maxR + 0.4;
    ctx.globalAlpha = 0.15 + rand() * 0.35;
    ctx.beginPath();
    ctx.arc(rand() * size, rand() * size, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export function woodTexture(light = '#d79a5e', dark = '#a4683a'): THREE.CanvasTexture {
  return make(`wood:${light}:${dark}`, 512, (ctx, size, rand) => {
    const plank = size / 4;
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = i % 2 ? light : shade(light, -8);
      ctx.fillRect(0, i * plank, size, plank);
      ctx.strokeStyle = dark;
      for (let g = 0; g < 26; g++) {
        ctx.globalAlpha = 0.12 + rand() * 0.25;
        ctx.lineWidth = 0.6 + rand() * 1.8;
        const y = i * plank + rand() * plank;
        ctx.beginPath();
        ctx.moveTo(0, y);
        for (let x = 0; x <= size; x += 32) ctx.lineTo(x, y + Math.sin(x * 0.02 + g) * 3 + (rand() - 0.5) * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = dark;
      ctx.fillRect(0, i * plank, size, 2);
      ctx.globalAlpha = 1;
    }
  });
}

export function cardboardTexture(base = '#c9a170'): THREE.CanvasTexture {
  return make(`cardboard:${base}`, 256, (ctx, size, rand) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = shade(base, -18);
    for (let x = 0; x < size; x += 8) {
      ctx.globalAlpha = 0.18;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    speckle(ctx, size, rand, 900, shade(base, -35), 1.2);
    speckle(ctx, size, rand, 300, shade(base, 25), 1.0);
  });
}

export function feltTexture(base: string): THREE.CanvasTexture {
  return make(`felt:${base}`, 256, (ctx, size, rand) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 2600; i++) {
      ctx.strokeStyle = rand() > 0.5 ? shade(base, 16) : shade(base, -16);
      ctx.globalAlpha = 0.25 + rand() * 0.3;
      ctx.lineWidth = 0.7;
      const x = rand() * size;
      const y = rand() * size;
      const a = rand() * Math.PI;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * 4, y + Math.sin(a) * 4);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  });
}

export function rugTexture(colors: readonly string[]): THREE.CanvasTexture {
  return make(`rug:${colors.join(',')}`, 512, (ctx, size, rand) => {
    const band = size / 16;
    for (let i = 0; i < 16; i++) {
      ctx.fillStyle = colors[i % colors.length] as string;
      ctx.fillRect(0, i * band, size, band);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    for (let y = 0; y < 16; y += 4) {
      for (let x = 0; x < size; x += band * 2) {
        ctx.beginPath();
        ctx.moveTo(x, y * band + band * 2);
        ctx.lineTo(x + band, y * band + band);
        ctx.lineTo(x + band * 2, y * band + band * 2);
        ctx.lineTo(x + band, y * band + band * 3);
        ctx.closePath();
        ctx.fill();
      }
    }
    speckle(ctx, size, rand, 1500, 'rgba(0,0,0,0.5)', 0.9);
  });
}

export function stripeTexture(a: string, b: string): THREE.CanvasTexture {
  return make(`stripe:${a}:${b}`, 128, (ctx, size) => {
    ctx.fillStyle = a;
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = b;
    for (let i = -size; i < size * 2; i += 32) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 16, 0);
      ctx.lineTo(i + 16 + size, size);
      ctx.lineTo(i + size, size);
      ctx.closePath();
      ctx.fill();
    }
  });
}

export function sandTexture(base = '#e9cf98'): THREE.CanvasTexture {
  return make(`sand:${base}`, 256, (ctx, size, rand) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, size, size);
    speckle(ctx, size, rand, 3500, shade(base, -30), 0.9);
    speckle(ctx, size, rand, 1500, shade(base, 25), 0.8);
    ctx.strokeStyle = shade(base, -14);
    ctx.globalAlpha = 0.25;
    for (let i = 0; i < 12; i++) {
      ctx.beginPath();
      const y = rand() * size;
      ctx.moveTo(0, y);
      for (let x = 0; x <= size; x += 16) ctx.lineTo(x, y + Math.sin(x * 0.05 + i) * 4);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  });
}

export function starfieldTexture(): THREE.CanvasTexture {
  return make('starfield', 512, (ctx, size, rand) => {
    const g = ctx.createLinearGradient(0, 0, 0, size);
    g.addColorStop(0, '#141a3a');
    g.addColorStop(1, '#2a2160');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 420; i++) {
      ctx.globalAlpha = 0.3 + rand() * 0.7;
      ctx.fillStyle = rand() > 0.8 ? '#ffe9a8' : '#ffffff';
      ctx.beginPath();
      ctx.arc(rand() * size, rand() * size, rand() * 1.4 + 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  });
}

/** Lighten (+) or darken (−) a #rrggbb color by `amount` (0–255 scale). */
export function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  const r = clamp((n >> 16) + amount);
  const g = clamp(((n >> 8) & 0xff) + amount);
  const b = clamp((n & 0xff) + amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

// ---------------------------------------------------------------------------------------------
// Richer generated textures (spec FR-111): detail maps that tint with vertex colors, the wooden toy
// track, floors around the yard and the play mat under it. All drawn on canvases at load time.

function canvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function grainLines(ctx: CanvasRenderingContext2D, x0: number, y0: number, w: number, h: number, rand: () => number, color: string, count: number, alpha = 0.22): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0, w, h);
  ctx.clip();
  ctx.strokeStyle = color;
  for (let g = 0; g < count; g++) {
    ctx.globalAlpha = alpha * (0.4 + rand());
    ctx.lineWidth = 0.6 + rand() * 1.6;
    const y = y0 + rand() * h;
    const amp = 1 + rand() * 3;
    const f = 0.01 + rand() * 0.03;
    const ph = rand() * 10;
    ctx.beginPath();
    ctx.moveTo(x0, y);
    for (let x = 0; x <= w; x += 8) ctx.lineTo(x0 + x, y + Math.sin(x * f + ph) * amp);
    ctx.stroke();
  }
  // A knot now and then.
  if (rand() < 0.5) {
    ctx.globalAlpha = alpha * 1.4;
    ctx.lineWidth = 1;
    const kx = x0 + rand() * w;
    const ky = y0 + rand() * h;
    for (let r = 2; r < 9; r += 2.2) {
      ctx.beginPath();
      ctx.ellipse(kx, ky, r * 2.2, r, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

export type DetailKind = 'paint' | 'planks' | 'bricks' | 'shingles' | 'fabric' | 'panels';

/**
 * Light grayscale detail maps (mean near white) that multiply vertex colors, so one material
 * textures many differently colored parts (GeoBatch projects the UVs).
 */
export function detailTexture(kind: DetailKind): THREE.CanvasTexture {
  return make(`detail:${kind}`, 256, (ctx, size, rand) => {
    ctx.fillStyle = '#f2f2f2';
    ctx.fillRect(0, 0, size, size);
    switch (kind) {
      case 'paint':
        grainLines(ctx, 0, 0, size, size, rand, '#9a9a9a', 40, 0.12);
        speckle(ctx, size, rand, 500, '#c8c8c8', 1.2);
        break;
      case 'planks': {
        const n = 6;
        const ph = size / n;
        for (let i = 0; i < n; i++) {
          ctx.fillStyle = i % 2 ? '#ececec' : '#dedede';
          ctx.fillRect(0, i * ph, size, ph);
          grainLines(ctx, 0, i * ph, size, ph, rand, '#8a8a8a', 10, 0.25);
          ctx.fillStyle = '#7d7d7d';
          ctx.fillRect(0, i * ph, size, 2);
          const cut = rand() * size;
          ctx.fillRect(cut, i * ph, 2, ph);
          ctx.fillStyle = '#9a9a9a';
          for (const x of [cut - 8, cut + 8]) {
            ctx.beginPath();
            ctx.arc(x, i * ph + ph / 2, 1.6, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        break;
      }
      case 'bricks': {
        const bh = size / 8;
        const bw = size / 4;
        ctx.fillStyle = '#bdbdbd';
        ctx.fillRect(0, 0, size, size);
        for (let r = 0; r < 8; r++) {
          for (let c = -1; c < 5; c++) {
            const x = c * bw + (r % 2 ? bw / 2 : 0);
            const v = 225 + Math.floor(rand() * 30);
            ctx.fillStyle = `rgb(${v},${v},${v})`;
            ctx.beginPath();
            ctx.roundRect(x + 2, r * bh + 2, bw - 4, bh - 4, 3);
            ctx.fill();
          }
        }
        speckle(ctx, size, rand, 600, '#9a9a9a', 1);
        break;
      }
      case 'shingles': {
        const rh = size / 8;
        const sw = size / 8;
        for (let r = 0; r < 9; r++) {
          for (let c = -1; c < 9; c++) {
            const x = c * sw + (r % 2 ? sw / 2 : 0);
            const y = r * rh;
            const v = 220 + Math.floor(rand() * 35);
            ctx.fillStyle = `rgb(${v},${v},${v})`;
            ctx.strokeStyle = '#8c8c8c';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x, y - rh * 0.2);
            ctx.lineTo(x, y + rh * 0.55);
            ctx.arc(x + sw / 2, y + rh * 0.55, sw / 2, Math.PI, 0, true);
            ctx.lineTo(x + sw, y - rh * 0.2);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          }
        }
        break;
      }
      case 'fabric':
        for (let y = 0; y < size; y += 4) {
          for (let x = 0; x < size; x += 4) {
            const v = ((x + y) / 4) % 2 ? 232 : 248;
            ctx.fillStyle = `rgb(${v},${v},${v})`;
            ctx.fillRect(x, y, 4, 4);
          }
        }
        speckle(ctx, size, rand, 800, '#bcbcbc', 0.8);
        break;
      case 'panels': {
        const p = size / 2;
        ctx.strokeStyle = '#a0a0a0';
        ctx.lineWidth = 3;
        for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) ctx.strokeRect(c * p + 3, r * p + 3, p - 6, p - 6);
        ctx.fillStyle = '#8a8a8a';
        for (let r = 0; r < 2; r++) {
          for (let c = 0; c < 2; c++) {
            for (const [dx, dy] of [[10, 10], [p - 10, 10], [10, p - 10], [p - 10, p - 10]] as const) {
              ctx.beginPath();
              ctx.arc(c * p + dx, r * p + dy, 3, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
        speckle(ctx, size, rand, 300, '#c0c0c0', 1);
        break;
      }
    }
  });
}

export interface TrackLook {
  wood: string;
  groove: string;
  edge: string;
  glow?: boolean;
}

/**
 * Wooden toy track seen from above: u runs along the track (one repeat per tile), v across it,
 * with two grooves for the wheels at the rail gauge (FR-111).
 */
export function trackTexture(look: TrackLook, grooveV: readonly [number, number], grooveW: number): THREE.CanvasTexture {
  return make(`track:${look.wood}:${look.groove}:${look.edge}:${grooveV.join(',')}:${grooveW}`, 256, (ctx, size, rand) => {
    ctx.fillStyle = look.wood;
    ctx.fillRect(0, 0, size, size);
    grainLines(ctx, 0, 0, size, size, rand, shade(look.wood, -55), 46, 0.28);
    speckle(ctx, size, rand, 300, shade(look.wood, 30), 1.2);
    // Rounded edges.
    const edge = size * 0.05;
    for (const [y, dir] of [[0, 1], [size, -1]] as const) {
      const g = ctx.createLinearGradient(0, y, 0, y + dir * edge);
      g.addColorStop(0, look.edge);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, Math.min(y, y + dir * edge), size, edge);
    }
    for (const v of grooveV) {
      const c = v * size;
      const hw = (grooveW * size) / 2;
      const g = ctx.createLinearGradient(0, c - hw, 0, c + hw);
      g.addColorStop(0, shade(look.groove, -40));
      g.addColorStop(0.3, look.groove);
      g.addColorStop(0.8, shade(look.groove, 18));
      g.addColorStop(1, shade(look.wood, 35));
      ctx.fillStyle = g;
      ctx.fillRect(0, c - hw, size, hw * 2);
      if (look.glow) {
        ctx.fillStyle = 'rgba(160,250,255,0.85)';
        ctx.fillRect(0, c - 1.5, size, 3);
      }
    }
  });
}

export type FloorKind = 'parquet' | 'gingham' | 'grass' | 'spaceCarpet';

/** The floor around the play mat (repeats). */
export function floorTexture(kind: FloorKind): THREE.CanvasTexture {
  return make(`floor:${kind}`, 512, (ctx, size, rand) => {
    switch (kind) {
      case 'parquet': {
        const bw = size / 4;
        const bh = size / 16;
        for (let r = 0; r < 16; r++) {
          const off = (r % 2) * bw * 0.5 + (r % 3) * 17;
          for (let c = -1; c < 5; c++) {
            const x = c * bw + off;
            const tone = ['#b9844f', '#a8733f', '#c38f58', '#9c6a3a'][Math.floor(rand() * 4)] as string;
            ctx.fillStyle = tone;
            ctx.fillRect(x, r * bh, bw, bh);
            grainLines(ctx, x, r * bh, bw, bh, rand, '#6b4423', 5, 0.3);
            ctx.fillStyle = 'rgba(60,35,15,0.55)';
            ctx.fillRect(x, r * bh, 1.5, bh);
          }
          ctx.fillStyle = 'rgba(60,35,15,0.6)';
          ctx.fillRect(0, r * bh, size, 1.5);
        }
        break;
      }
      case 'gingham': {
        const n = 8;
        const cs = size / n;
        ctx.fillStyle = '#fff4f8';
        ctx.fillRect(0, 0, size, size);
        ctx.fillStyle = 'rgba(240,110,160,0.45)';
        for (let i = 0; i < n; i += 2) {
          ctx.fillRect(i * cs, 0, cs, size);
          ctx.fillRect(0, i * cs, size, cs);
        }
        const fabric = ctx.getImageData(0, 0, size, size);
        for (let i = 0; i < fabric.data.length; i += 4) {
          const v = (rand() - 0.5) * 16;
          fabric.data[i] = (fabric.data[i] as number) + v;
          fabric.data[i + 1] = (fabric.data[i + 1] as number) + v;
          fabric.data[i + 2] = (fabric.data[i + 2] as number) + v;
        }
        ctx.putImageData(fabric, 0, 0);
        break;
      }
      case 'grass': {
        ctx.fillStyle = '#6aa84f';
        ctx.fillRect(0, 0, size, size);
        for (let i = 0; i < 40; i++) {
          ctx.fillStyle = rand() > 0.5 ? 'rgba(90,150,60,0.35)' : 'rgba(130,190,80,0.3)';
          ctx.beginPath();
          ctx.arc(rand() * size, rand() * size, 20 + rand() * 50, 0, Math.PI * 2);
          ctx.fill();
        }
        for (let i = 0; i < 9000; i++) {
          const x = rand() * size;
          const y = rand() * size;
          const l = 3 + rand() * 6;
          ctx.strokeStyle = ['#4e8f3a', '#7cc35a', '#5fa045', '#93d16b', '#3f7a2f'][Math.floor(rand() * 5)] as string;
          ctx.globalAlpha = 0.6 + rand() * 0.4;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + (rand() - 0.5) * 3, y - l);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        for (let i = 0; i < 26; i++) {
          const x = rand() * size;
          const y = rand() * size;
          const col = ['#ffffff', '#ffe066', '#ff8fb1', '#b9a3ff'][Math.floor(rand() * 4)] as string;
          for (let p = 0; p < 5; p++) {
            const a = (p / 5) * Math.PI * 2;
            ctx.fillStyle = col;
            ctx.beginPath();
            ctx.arc(x + Math.cos(a) * 3, y + Math.sin(a) * 3, 2.4, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = '#f6b93b';
          ctx.beginPath();
          ctx.arc(x, y, 1.8, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case 'spaceCarpet': {
        ctx.fillStyle = '#1b1f4a';
        ctx.fillRect(0, 0, size, size);
        for (let i = 0; i < 9000; i++) {
          ctx.fillStyle = rand() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.12)';
          ctx.fillRect(rand() * size, rand() * size, 2, 2);
        }
        for (let i = 0; i < 6; i++) {
          const x = rand() * size;
          const y = rand() * size;
          const r = 10 + rand() * 22;
          const col = ['#ff9d5c', '#7fd6ff', '#c9a0ff', '#ffd166', '#ff7eb3'][i % 5] as string;
          const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.2, x, y, r);
          g.addColorStop(0, shade(col, 40));
          g.addColorStop(1, shade(col, -40));
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
          if (i % 2 === 0) {
            ctx.strokeStyle = shade(col, 60);
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.ellipse(x, y, r * 1.6, r * 0.4, -0.4, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
        for (let i = 0; i < 160; i++) {
          ctx.fillStyle = rand() > 0.7 ? '#ffe9a8' : '#ffffff';
          ctx.globalAlpha = 0.4 + rand() * 0.6;
          const x = rand() * size;
          const y = rand() * size;
          const r = rand() * 1.8 + 0.4;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        break;
      }
    }
  });
}

/**
 * The play mat under the yard, drawn for its exact size (`cols` × `rows` tiles plus a border):
 * patterned field, border bands and corner motifs per biome (FR-111).
 */
export function matTexture(biome: string, cols: number, rows: number, border: number): THREE.CanvasTexture {
  const ppt = 96;
  const W = Math.round((cols + border * 2) * ppt);
  const H = Math.round((rows + border * 2) * ppt);
  let seed = cols * 131 + rows * 17 + biome.length;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  return canvasTexture(W, H, (ctx) => {
    const b = border * ppt;
    const inner = (pad: number) => [b * pad, b * pad, W - 2 * b * pad, H - 2 * b * pad] as const;
    switch (biome) {
      case 'rug': {
        ctx.fillStyle = '#8c2f2a';
        ctx.fillRect(0, 0, W, H);
        const bands = ['#e8b04b', '#2f5f8f', '#f3e3c3', '#c75b4a'];
        bands.forEach((c, i) => {
          ctx.fillStyle = c;
          const [x, y, w, h] = inner(0.18 + i * 0.16);
          ctx.fillRect(x, y, w, h);
        });
        // Field: soft red with a diamond lattice and little flowers.
        const [fx, fy, fw, fh] = inner(0.82);
        ctx.fillStyle = '#b8473c';
        ctx.fillRect(fx, fy, fw, fh);
        ctx.save();
        ctx.beginPath();
        ctx.rect(fx, fy, fw, fh);
        ctx.clip();
        const step = ppt;
        for (let y = fy - step; y < fy + fh + step; y += step) {
          for (let x = fx - step; x < fx + fw + step; x += step) {
            ctx.fillStyle = 'rgba(243,227,195,0.18)';
            ctx.beginPath();
            ctx.moveTo(x + step / 2, y);
            ctx.lineTo(x + step, y + step / 2);
            ctx.lineTo(x + step / 2, y + step);
            ctx.lineTo(x, y + step / 2);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = 'rgba(232,176,75,0.55)';
            for (let p = 0; p < 4; p++) {
              const a = (p / 4) * Math.PI * 2 + Math.PI / 4;
              ctx.beginPath();
              ctx.arc(x + step / 2 + Math.cos(a) * 6, y + step / 2 + Math.sin(a) * 6, 4, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
        // Medallion.
        const cx = W / 2;
        const cy = H / 2;
        const mr = Math.min(fw, fh);
        for (const [r, c] of [[mr * 0.36, '#f3e3c3'], [mr * 0.33, '#2f5f8f'], [mr * 0.27, '#e8b04b'], [mr * 0.21, '#c75b4a'], [mr * 0.14, '#f3e3c3'], [mr * 0.07, '#5b9e6a']] as const) {
          ctx.fillStyle = c;
          ctx.beginPath();
          for (let i = 0; i <= 16; i++) {
            const a = (i / 16) * Math.PI * 2;
            const rr = i % 2 ? r * 0.82 : r;
            if (i === 0) ctx.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
            else ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
          }
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.restore();
        break;
      }
      case 'candy': {
        // A frosted sheet cake: mint icing with sprinkles and a piped border.
        ctx.fillStyle = '#f7a8c9';
        ctx.fillRect(0, 0, W, H);
        const [x, y, w, h] = inner(0.45);
        ctx.fillStyle = '#c9f2e3';
        ctx.fillRect(x, y, w, h);
        for (let i = 0; i < (W * H) / 900; i++) {
          ctx.save();
          ctx.translate(x + rand() * w, y + rand() * h);
          ctx.rotate(rand() * Math.PI);
          ctx.fillStyle = ['#ff6fa5', '#ffd23f', '#6fc3ff', '#ffffff', '#b38cff', '#ff9a3d'][Math.floor(rand() * 6)] as string;
          ctx.beginPath();
          ctx.roundRect(-5, -1.6, 10, 3.2, 1.6);
          ctx.fill();
          ctx.restore();
        }
        // Piped dots along the border.
        ctx.fillStyle = '#fff4f8';
        const r = b * 0.16;
        for (let px = r; px < W; px += r * 2.1) {
          for (const py of [b * 0.25, H - b * 0.25]) {
            ctx.beginPath();
            ctx.arc(px, py, r, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        for (let py = r; py < H; py += r * 2.1) {
          for (const px of [b * 0.25, W - b * 0.25]) {
            ctx.beginPath();
            ctx.arc(px, py, r, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        break;
      }
      case 'garden': {
        // A sandbox: wooden frame, raked sand with pebbles and shells.
        ctx.fillStyle = '#9a6a3a';
        ctx.fillRect(0, 0, W, H);
        for (let i = 0; i < 4; i++) grainLines(ctx, 0, 0, W, H, rand, '#6b4423', 30, 0.18);
        const [x, y, w, h] = inner(0.5);
        ctx.fillStyle = '#ecd39e';
        ctx.fillRect(x, y, w, h);
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.clip();
        for (let i = 0; i < (W * H) / 60; i++) {
          ctx.fillStyle = rand() > 0.5 ? 'rgba(160,120,60,0.35)' : 'rgba(255,245,215,0.45)';
          ctx.fillRect(x + rand() * w, y + rand() * h, 1.5, 1.5);
        }
        ctx.strokeStyle = 'rgba(170,130,70,0.25)';
        ctx.lineWidth = 2;
        for (let yy = y; yy < y + h; yy += 14) {
          ctx.beginPath();
          ctx.moveTo(x, yy);
          for (let xx = 0; xx <= w; xx += 20) ctx.lineTo(x + xx, yy + Math.sin(xx * 0.02 + yy) * 3);
          ctx.stroke();
        }
        for (let i = 0; i < (W * H) / 20000; i++) {
          ctx.fillStyle = ['#b9b2a6', '#8f8a80', '#d8d0c4', '#f2c6b4'][Math.floor(rand() * 4)] as string;
          ctx.beginPath();
          ctx.ellipse(x + rand() * w, y + rand() * h, 3 + rand() * 6, 2 + rand() * 4, rand() * 3, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
        ctx.strokeStyle = 'rgba(60,35,15,0.6)';
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, w, h);
        break;
      }
      default: {
        // Space play mat: deep blue with a glowing grid, nebulae and constellations.
        const g = ctx.createLinearGradient(0, 0, W, H);
        g.addColorStop(0, '#20265e');
        g.addColorStop(1, '#3a2470');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        for (let i = 0; i < 5; i++) {
          const nx = rand() * W;
          const ny = rand() * H;
          const r = 120 + rand() * 260;
          const ng = ctx.createRadialGradient(nx, ny, 0, nx, ny, r);
          ng.addColorStop(0, ['rgba(255,120,200,0.35)', 'rgba(120,200,255,0.35)', 'rgba(180,140,255,0.35)'][i % 3] as string);
          ng.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = ng;
          ctx.fillRect(0, 0, W, H);
        }
        ctx.strokeStyle = 'rgba(127,246,255,0.12)';
        ctx.lineWidth = 2;
        for (let gx = b; gx <= W - b + 1; gx += ppt) {
          ctx.beginPath();
          ctx.moveTo(gx, b);
          ctx.lineTo(gx, H - b);
          ctx.stroke();
        }
        for (let gy = b; gy <= H - b + 1; gy += ppt) {
          ctx.beginPath();
          ctx.moveTo(b, gy);
          ctx.lineTo(W - b, gy);
          ctx.stroke();
        }
        for (let i = 0; i < (W * H) / 1500; i++) {
          ctx.fillStyle = rand() > 0.8 ? '#ffe9a8' : '#ffffff';
          ctx.globalAlpha = 0.3 + rand() * 0.7;
          ctx.beginPath();
          ctx.arc(rand() * W, rand() * H, rand() * 1.8 + 0.4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#7ff6ff';
        ctx.lineWidth = 6;
        ctx.strokeRect(b * 0.4, b * 0.4, W - b * 0.8, H - b * 0.8);
      }
    }
  });
}

/** Radial falloff for soft contact shadows (white in the middle, alpha to the rim). */
export function blobTexture(): THREE.CanvasTexture {
  return make('blob', 64, (ctx, size) => {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.55, 'rgba(255,255,255,0.6)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  });
}
