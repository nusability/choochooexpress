// Shared colors (toy types are also told apart by shape and icon — NFR-011).
import type { ToyType } from '../engine/types';

export const TOY_COLORS: Record<ToyType, string> = {
  block: '#e8574a',
  duck: '#f6c344',
  car: '#4a90d9',
  ball: '#5bb36a',
  star: '#9b6ad6',
};

export const TOY_NAMES: Record<ToyType, string> = {
  block: 'blocks',
  duck: 'ducks',
  car: 'cars',
  ball: 'balls',
  star: 'stars',
};

export const WOOD = '#c98a52';
export const WOOD_DARK = '#8f5a2e';
export const CARDBOARD = '#cfa56f';
export const CREAM = '#fff6e6';
export const INK = '#3b2a20';
