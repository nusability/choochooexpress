// Biome themes: palettes, lighting and the board's base material (spec FR-049, research R16).
import * as THREE from 'three';
import type { BiomeId } from '../engine/types';
import { feltTexture, rugTexture, sandTexture, starfieldTexture } from './textures';

export interface BiomeTheme {
  id: BiomeId;
  background: string;
  tableLight: string;
  tableDark: string;
  baseSide: string;
  baseTop(): THREE.Texture;
  baseRepeat: number;
  trackBed: string;
  sleeper: string;
  rail: string;
  railEmissive: string | null;
  sunColor: string;
  sunIntensity: number;
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  accent: string;
  /** Tunnel hills (F-011). */
  hill: string;
  /** Bridge ramps and piers (F-011). */
  pier: string;
}

export const THEMES: Record<BiomeId, BiomeTheme> = {
  rug: {
    id: 'rug',
    background: '#3a2618',
    tableLight: '#c98a52',
    tableDark: '#8f5a2e',
    baseSide: '#8c3b2f',
    baseTop: () => rugTexture(['#c75b4a', '#e8b04b', '#3e7cb1', '#f3e3c3', '#c75b4a', '#5b9e6a']),
    baseRepeat: 1,
    trackBed: '#5aa0d8',
    sleeper: '#3f7fb8',
    rail: '#eef0f6',
    railEmissive: null,
    sunColor: '#fff0d4',
    sunIntensity: 2.6,
    hemiSky: '#fff4e2',
    hemiGround: '#6b4426',
    hemiIntensity: 1.25,
    accent: '#f6c344',
    hill: '#d9b98c',
    pier: '#b07a46',
  },
  candy: {
    id: 'candy',
    background: '#4d1f3d',
    tableLight: '#e9b9cf',
    tableDark: '#c48aa6',
    baseSide: '#e05d8f',
    baseTop: () => feltTexture('#f7b3cf'),
    baseRepeat: 3,
    trackBed: '#fff3f8',
    sleeper: '#f0c2d6',
    rail: '#e3477d',
    railEmissive: null,
    sunColor: '#fff0f6',
    sunIntensity: 2.5,
    hemiSky: '#ffe6f2',
    hemiGround: '#7a3a5a',
    hemiIntensity: 1.3,
    accent: '#ff7eb3',
    hill: '#ffc4dc',
    pier: '#f5e1ea',
  },
  garden: {
    id: 'garden',
    background: '#27401f',
    tableLight: '#a7c97a',
    tableDark: '#6f9447',
    baseSide: '#b7894f',
    baseTop: () => sandTexture('#ecd39e'),
    baseRepeat: 3,
    trackBed: '#6fbf5a',
    sleeper: '#4f9a40',
    rail: '#f7f7f2',
    railEmissive: null,
    sunColor: '#fffbe6',
    sunIntensity: 2.8,
    hemiSky: '#f2fbff',
    hemiGround: '#5e6b2f',
    hemiIntensity: 1.25,
    accent: '#7bd36a',
    hill: '#7cb35a',
    pier: '#c99a5b',
  },
  space: {
    id: 'space',
    background: '#070a1f',
    tableLight: '#2c3168',
    tableDark: '#1b1f48',
    baseSide: '#1b2257',
    baseTop: () => starfieldTexture(),
    baseRepeat: 2,
    trackBed: '#2d3466',
    sleeper: '#232a57',
    rail: '#7ff6ff',
    railEmissive: '#3fe9ff',
    sunColor: '#c9d6ff',
    sunIntensity: 1.9,
    hemiSky: '#8fa2ff',
    hemiGround: '#20123e',
    hemiIntensity: 1.1,
    accent: '#7ff6ff',
    hill: '#5d6391',
    pier: '#3a4176',
  },
};

export function felt(color: string): THREE.Texture {
  return feltTexture(color);
}
