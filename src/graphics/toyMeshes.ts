// Toy geometry for wagons, signs, the goal card and props (spec FR-113): models in toyModels.ts.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { ToyType } from '../engine/types';
import { toyParts } from './toyModels';

/** Uniform toy scale. */
export const TOY_SCALE = 1.15;

/** A new merged, vertex-colored geometry of the toy (the caller owns it). */
export function toyGeometry(type: ToyType): THREE.BufferGeometry {
  const parts = toyParts(type);
  for (const p of parts) for (const name of Object.keys(p.attributes)) if (!['position', 'normal', 'color'].includes(name)) p.deleteAttribute(name);
  const merged = mergeGeometries(parts, false);
  for (const p of parts) p.dispose();
  if (!merged) throw new Error(`toy geometry ${type}`);
  merged.scale(TOY_SCALE, TOY_SCALE, TOY_SCALE);
  merged.computeBoundingSphere();
  return merged;
}
