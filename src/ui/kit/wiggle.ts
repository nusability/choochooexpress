// Whimsical motion in the vertex shader (research R23, spec FR-066/FR-067): letters hop one after
// another and markers bob and wobble, driven by two per-vertex attributes, inside merged meshes,
// with no draw calls or per-frame CPU work of their own.
//
//   aWig   = (phase, hop height, roll amplitude in radians, speed in radians per second)
//   aPivot = (x, y) the letter or object rolls around, in the mesh's own coordinates
//
// A vertex with aWig = 0 does not move. Every mesh drawn with a wiggle material must carry both
// attributes (MeshBuilder always writes them).
import * as THREE from 'three';

/** Shared by every wiggle material: the clock and the reduced-motion switch. */
export const wiggleUniforms = {
  uWigTime: { value: 0 },
  uWigOn: { value: 1 },
};

const DECLARE = /* glsl */ `
attribute vec4 aWig;
attribute vec2 aPivot;
uniform float uWigTime;
uniform float uWigOn;
`;

const MOVE = /* glsl */ `
#include <begin_vertex>
{
  float wigT = uWigTime * aWig.w + aWig.x;
  float wigRoll = sin(wigT * 0.83 + 1.1) * aWig.z * uWigOn;
  vec2 wigD = transformed.xy - aPivot;
  float wigC = cos(wigRoll);
  float wigS = sin(wigRoll);
  transformed.xy = aPivot + vec2(wigD.x * wigC - wigD.y * wigS, wigD.x * wigS + wigD.y * wigC);
  transformed.y += abs(sin(wigT)) * aWig.y * uWigOn;
}
`;

/** Adds the wiggle to a material (any built-in lit material). */
export function makeWiggly<T extends THREE.Material>(material: T): T {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uWigTime = wiggleUniforms.uWigTime;
    shader.uniforms.uWigOn = wiggleUniforms.uWigOn;
    shader.vertexShader = DECLARE + shader.vertexShader.replace('#include <begin_vertex>', MOVE);
  };
  material.customProgramCacheKey = () => 'wiggle';
  return material;
}

/** Vertex-colored material for wiggly geometry in the world (tone-mapped like the scene). */
export function wigglyWorldMaterial(roughness = 0.6): THREE.MeshStandardMaterial {
  return makeWiggly(new THREE.MeshStandardMaterial({ vertexColors: true, roughness, metalness: 0.02 }));
}

/** How a run of letters hops: one letter after another, `step` radians apart. */
export interface Hop {
  /** Hop height (same units as the text size). */
  height: number;
  /** Roll amplitude in radians. */
  roll?: number;
  /** Radians per second. */
  speed?: number;
  /** Phase difference between neighbouring letters. */
  step?: number;
  /** Phase of the first letter. */
  phase?: number;
}

/** Object-level wiggle: everything added with it moves together around one pivot. */
export interface Wiggle {
  phase: number;
  hop: number;
  roll: number;
  speed: number;
  px: number;
  py: number;
}

/** A small stable number in [0, 2π) from a string, so neighbours do not move in lockstep. */
export function phaseOf(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  return ((h >>> 0) % 6283) / 1000;
}
