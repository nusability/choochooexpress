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

/** Text label (signs, level numbers). Not cached by default since labels vary. */
export function labelTexture(text: string, bg: string, fg: string, width = 256, height = 128, font = 'bold 72px'): THREE.CanvasTexture {
  const key = `label:${text}:${bg}:${fg}:${width}x${height}:${font}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  ctx.fillStyle = bg;
  roundRect(ctx, 4, 4, width - 8, height - 8, Math.min(width, height) * 0.2);
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.font = `${font} ui-rounded, "SF Pro Rounded", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, width / 2, height / 2 + 4);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  cache.set(key, tex);
  return tex;
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
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

/** Toy type icon (shape + color) on a cream disc, for 3D signs. */
export function toyIconTexture(type: string, color: string): THREE.CanvasTexture {
  const key = `icon:${type}:${color}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  ctx.fillStyle = '#fff6e6';
  ctx.strokeStyle = '#3b2a20';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(64, 64, 58, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  drawToyShape(ctx, type, color, 64, 66, 72);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, tex);
  return tex;
}

/** Draws a toy silhouette centered at (cx, cy) inside a box of `s` pixels. */
export function drawToyShape(ctx: CanvasRenderingContext2D, type: string, color: string, cx: number, cy: number, s: number): void {
  const ink = '#3b2a20';
  ctx.save();
  ctx.translate(cx, cy);
  ctx.lineWidth = s * 0.06;
  ctx.strokeStyle = ink;
  ctx.fillStyle = color;
  const h = s / 2;
  switch (type) {
    case 'block': {
      roundRect(ctx, -h * 0.75, -h * 0.75, h * 1.5, h * 1.5, h * 0.2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fff6e6';
      ctx.font = `bold ${Math.round(s * 0.55)}px ui-rounded, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('A', 0, h * 0.06);
      break;
    }
    case 'duck': {
      ctx.beginPath();
      ctx.ellipse(-h * 0.05, h * 0.25, h * 0.72, h * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(h * 0.28, -h * 0.35, h * 0.36, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#f08a2c';
      ctx.beginPath();
      ctx.moveTo(h * 0.6, -h * 0.4);
      ctx.lineTo(h * 0.95, -h * 0.28);
      ctx.lineTo(h * 0.6, -h * 0.18);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.arc(h * 0.35, -h * 0.45, h * 0.07, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'car': {
      roundRect(ctx, -h * 0.85, -h * 0.1, h * 1.7, h * 0.55, h * 0.18);
      ctx.fill();
      ctx.stroke();
      roundRect(ctx, -h * 0.45, -h * 0.5, h * 0.85, h * 0.45, h * 0.15);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = ink;
      for (const x of [-h * 0.48, h * 0.48]) {
        ctx.beginPath();
        ctx.arc(x, h * 0.48, h * 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'ball': {
      ctx.beginPath();
      ctx.arc(0, 0, h * 0.75, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = '#fff6e6';
      ctx.lineWidth = s * 0.08;
      ctx.beginPath();
      ctx.arc(0, 0, h * 0.75, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, h * 0.75, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
      break;
    }
    default: {
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? h * 0.85 : h * 0.38;
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** Round "flip me" button shown above every switch. */
export function switchButtonTexture(color = '#ffd23f'): THREE.CanvasTexture {
  const key = `switchButton:${color}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  ctx.fillStyle = color;
  ctx.strokeStyle = '#3b2a20';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(64, 64, 54, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#3b2a20';
  ctx.fillStyle = '#3b2a20';
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  const arrow = (y: number, dir: number) => {
    ctx.beginPath();
    ctx.moveTo(64 - 26 * dir, y);
    ctx.lineTo(64 + 22 * dir, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(64 + 32 * dir, y);
    ctx.lineTo(64 + 14 * dir, y - 13);
    ctx.lineTo(64 + 14 * dir, y + 13);
    ctx.closePath();
    ctx.fill();
  };
  arrow(48, 1);
  arrow(80, -1);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, tex);
  return tex;
}
