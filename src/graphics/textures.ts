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
