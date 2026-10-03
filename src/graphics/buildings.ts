// Shared helpers for buildings and signs in the world (research R10, R20).
import * as THREE from 'three';
import { MeshBuilder } from '../ui/kit/builder';
import { measure } from '../ui/kit/text3d';

export function tileCenter(def: { cols: number; rows: number }, tile: number): THREE.Vector3 {
  const c = tile % def.cols;
  const r = Math.floor(tile / def.cols);
  return new THREE.Vector3(c + 0.5 - def.cols / 2, 0, r + 0.5 - def.rows / 2);
}

/** Yaw that turns local +X toward world direction (dx, dz). */
export function yawOf(dx: number, dz: number): number {
  return -Math.atan2(dz, dx);
}



/** Signs face the viewer (+z) and lean back this far so they read from the raised camera. */
export const SIGN_LEAN = -0.45;

/** A sign in the world (FR-060): drawn by the board as its own mesh so it can sway (FR-067 g). */
export interface SignSpec {
  text: string;
  bg: string;
  fg: string;
  position: THREE.Vector3;
  size: number;
  /** Minimum board width (e.g. room for toys beside the text). */
  width?: number;
}

/**
 * Sign board with 3D letters that hop one after another; the board sways around its foot in the
 * shader (FR-067 g). Built straight into world space (`matrix`) so all signs share one mesh.
 */
export function signGeometry(sign: Pick<SignSpec, 'text' | 'bg' | 'fg' | 'size' | 'width'>, matrix?: THREE.Matrix4, phase = 0): THREE.BufferGeometry {
  const { text, bg, fg, size } = sign;
  const b = new MeshBuilder();
  const w = Math.max(sign.width ?? 0, measure(text, size) + size * 1.1);
  const h = size * 1.75;
  b.wiggle = { phase, hop: 0, roll: 0.07, speed: 1.5, px: 0, py: -h / 2 };
  const front = b.toyBlock(w, h, h * 0.3, bg, 0, 0, 0, { rim: size * 0.12, drop: size * 0.14, depth: size * 0.3 });
  b.wiggle = null;
  b.text(text, { size, depth: size * 0.25 }, 0, 0, front, fg, false, { height: size * 0.12, step: 0.6, speed: 3.2, roll: 0.08, phase });
  return b.build(matrix);
}
