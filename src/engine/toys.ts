// Toys per biome (spec FR-113). A level draws its few toys from its biome's set, each of a
// different hue so the station's crates and the goal card tell them apart at a glance.
import type { BiomeId, ToyType } from './types';

export type Hue = 'red' | 'orange' | 'yellow' | 'green' | 'teal' | 'blue' | 'purple' | 'pink' | 'brown' | 'white' | 'gray';

/** Each toy's main hue (its colors live in graphics/palette.ts). */
export const TOY_HUE: Record<ToyType, Hue> = {
  block: 'red', duck: 'yellow', car: 'blue', ball: 'green', star: 'purple', teddy: 'brown', top: 'orange', drum: 'pink', robot: 'gray', kite: 'teal',
  lollipop: 'pink', cupcake: 'purple', donut: 'orange', candyCane: 'red', gumdrop: 'green', iceCream: 'teal', cookie: 'brown', cherry: 'red', sweet: 'yellow', macaron: 'blue',
  apple: 'green', carrot: 'orange', toadstool: 'pink', flower: 'purple', ladybug: 'red', snail: 'brown', acorn: 'brown', pail: 'blue', wateringCan: 'teal', bee: 'yellow',
  rocket: 'red', planet: 'orange', ufo: 'teal', moon: 'yellow', satellite: 'gray', alien: 'green', helmet: 'white',
  snowman: 'white', penguin: 'blue', snowflake: 'teal', mitten: 'red', iceCube: 'blue', sled: 'brown', bobbleHat: 'purple', cocoa: 'brown', polarBear: 'white', skate: 'pink',
  log: 'brown', milkCan: 'gray', hayBale: 'yellow', barrel: 'brown', crate: 'orange', sheep: 'white', coal: 'gray', fir: 'green',
  gift: 'pink', dice: 'white', yoyo: 'teal', soldier: 'red',
  bus: 'yellow', truck: 'orange', cone: 'orange', tire: 'gray', fuelCan: 'red', trafficLight: 'green', roadSign: 'blue', wrench: 'gray',
};

/** About ten toys per biome; not every level uses all of them. */
export const BIOME_TOYS: Record<BiomeId, readonly ToyType[]> = {
  rug: ['block', 'duck', 'car', 'ball', 'star', 'teddy', 'top', 'drum', 'robot', 'kite'],
  candy: ['lollipop', 'cupcake', 'donut', 'candyCane', 'gumdrop', 'iceCream', 'cookie', 'cherry', 'sweet', 'macaron'],
  garden: ['apple', 'carrot', 'toadstool', 'flower', 'ladybug', 'snail', 'acorn', 'pail', 'wateringCan', 'bee'],
  space: ['rocket', 'planet', 'ufo', 'moon', 'satellite', 'alien', 'helmet', 'star', 'robot', 'ball'],
  ice: ['snowman', 'penguin', 'snowflake', 'mitten', 'iceCube', 'sled', 'bobbleHat', 'cocoa', 'polarBear', 'skate'],
  village: ['log', 'milkCan', 'hayBale', 'barrel', 'crate', 'sheep', 'coal', 'fir', 'apple', 'carrot'],
  shop: ['gift', 'dice', 'yoyo', 'soldier', 'teddy', 'robot', 'kite', 'ball', 'duck', 'block'],
  roads: ['car', 'bus', 'truck', 'cone', 'tire', 'fuelCan', 'trafficLight', 'roadSign', 'wrench', 'helmet'],
};

/** Picks `count` toys of the biome, all of different hues, from a shuffled set. */
export function pickToys(biome: BiomeId, count: number, shuffled: (list: ToyType[]) => ToyType[]): ToyType[] {
  const out: ToyType[] = [];
  const hues = new Set<Hue>();
  for (const toy of shuffled([...BIOME_TOYS[biome]])) {
    if (out.length >= count) break;
    if (hues.has(TOY_HUE[toy])) continue;
    hues.add(TOY_HUE[toy]);
    out.push(toy);
  }
  return out;
}
