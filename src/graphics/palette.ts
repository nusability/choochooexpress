// Shared colors (toy types are also told apart by shape and icon — NFR-011).
import type { ToyType } from '../engine/types';

/** Each toy's identity color: its crate at the station, its dot on the goal card (FR-113). */
export const TOY_COLORS: Record<ToyType, string> = {
  block: '#e8574a', duck: '#f6c344', car: '#4a90d9', ball: '#5bb36a', star: '#9b6ad6', teddy: '#b07a46', top: '#f39c34', drum: '#ef6fa5', robot: '#9aa3b5', kite: '#2bb3a6',
  lollipop: '#ff6fa5', cupcake: '#a98bf0', donut: '#f0a35a', candyCane: '#e8574a', gumdrop: '#5bb36a', iceCream: '#6fd6c0', cookie: '#a0703f', cherry: '#d0304a', sweet: '#f6c344', macaron: '#6fb7ff',
  apple: '#7cc35a', carrot: '#f39c34', toadstool: '#ff7fa8', flower: '#9b6ad6', ladybug: '#e8574a', snail: '#b98a55', acorn: '#8a5a2e', pail: '#4a90d9', wateringCan: '#2bb3a6', bee: '#f6c344',
  rocket: '#e8574a', planet: '#f39c34', ufo: '#5fd3c8', moon: '#f3dc7a', satellite: '#a9b1c2', alien: '#7cd35a', helmet: '#eef2f8',
  snowman: '#f4f8ff', penguin: '#3f6fb3', snowflake: '#7fd6ff', mitten: '#e8574a', iceCube: '#a8d8ff', sled: '#b07a46', bobbleHat: '#9b6ad6', cocoa: '#8a5a2e', polarBear: '#f0ece2', skate: '#ff8fb1',
  log: '#9a6a3a', milkCan: '#b9c0cc', hayBale: '#e8c35a', barrel: '#8a5a2e', crate: '#d99a4e', sheep: '#f2efe6', coal: '#4a4a52', fir: '#3f8a4a',
  gift: '#ef6fa5', dice: '#f4f4f4', yoyo: '#2bb3a6', soldier: '#d23b30',
  bus: '#f6c344', truck: '#f39c34', cone: '#ff8a3d', tire: '#4a4a52', fuelCan: '#e8574a', trafficLight: '#5bb36a', roadSign: '#4a90d9', wrench: '#9aa3b5',
};

export const WOOD = '#c98a52';
export const WOOD_DARK = '#8f5a2e';
export const CARDBOARD = '#cfa56f';
export const CREAM = '#fff6e6';
export const INK = '#3b2a20';
