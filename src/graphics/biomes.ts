// Biome themes: palettes, lighting and the board's base material (spec FR-049, research R16).
import * as THREE from 'three';
import type { BiomeId } from '../engine/types';
import { feltTexture, floorTexture, rugTexture, sandTexture, starfieldTexture } from './textures';

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
  ice: {
    id: 'ice',
    background: '#9fb8d0',
    tableLight: '#dfeaf5',
    tableDark: '#a9c0d6',
    baseSide: '#7f9fbf',
    baseTop: () => floorTexture('snow'),
    baseRepeat: 3,
    trackBed: '#eef3f8',
    sleeper: '#c9d6e3',
    rail: '#5b7da8',
    railEmissive: null,
    sunColor: '#f2f8ff',
    sunIntensity: 2.4,
    hemiSky: '#eaf6ff',
    hemiGround: '#7a8fa8',
    hemiIntensity: 1.35,
    accent: '#7fd6ff',
    hill: '#eef3f8',
    pier: '#a9c0d6',
  },
  village: {
    id: 'village',
    background: '#2f4a22',
    tableLight: '#8fbf5a',
    tableDark: '#5f8f3a',
    baseSide: '#6b4a2a',
    baseTop: () => floorTexture('flock'),
    baseRepeat: 3,
    trackBed: '#8f877a',
    sleeper: '#5a4a3a',
    rail: '#d9dde6',
    railEmissive: null,
    sunColor: '#fff4dc',
    sunIntensity: 2.7,
    hemiSky: '#f6fbff',
    hemiGround: '#4f5f2a',
    hemiIntensity: 1.2,
    accent: '#c4473a',
    hill: '#7cb35a',
    pier: '#a08a6a',
  },
  shop: {
    id: 'shop',
    background: '#4a2a2a',
    tableLight: '#e9d2b8',
    tableDark: '#b98a65',
    baseSide: '#8a4a3a',
    baseTop: () => floorTexture('tiles'),
    baseRepeat: 3,
    trackBed: '#e3b97c',
    sleeper: '#b98a55',
    rail: '#8a5a2e',
    railEmissive: null,
    sunColor: '#fff0e0',
    sunIntensity: 2.5,
    hemiSky: '#fff4ea',
    hemiGround: '#6b3f2a',
    hemiIntensity: 1.3,
    accent: '#ef6fa5',
    hill: '#e9d2b8',
    pier: '#b98a65',
  },
  roads: {
    id: 'roads',
    background: '#3a3a46',
    tableLight: '#d9cdb8',
    tableDark: '#a89a80',
    baseSide: '#5a5a66',
    baseTop: () => floorTexture('carpet'),
    baseRepeat: 3,
    trackBed: '#e9c08a',
    sleeper: '#b07a46',
    rail: '#8a5a2e',
    railEmissive: null,
    sunColor: '#fff6e6',
    sunIntensity: 2.6,
    hemiSky: '#fff8ee',
    hemiGround: '#5a5040',
    hemiIntensity: 1.25,
    accent: '#4a90d9',
    hill: '#7cb35a',
    pier: '#a89a80',
  },
};

export function felt(color: string): THREE.Texture {
  return feltTexture(color);
}
