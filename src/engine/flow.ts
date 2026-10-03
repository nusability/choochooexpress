// Train, batch and pile constants and formulas (specs/data-model.md §Constants, §Formulas).

/** Fixed simulation tick (seconds). */
export const DT = 1 / 60;

export const ENGINE_LEN = 0.62;
export const WAGON_LEN = 0.5;
export const COUPLING_GAP = 0.08;

export const WHEEL_HEIGHT = 0.1;
/** H_threshold = 0.5 × wheel height. */
export const H_THRESHOLD = 0.5 * WHEEL_HEIGHT;

export const W_TRACK = 0.4;
/** Length of track a factory's pile covers (centred on the hopper). */
export const L_PILE = 0.8;
/** Toy packing density, toys per tile³. */
export const RHO_TOY = 2500;

/** Spilled toys at one factory at which the pile reaches H_threshold (= 40). */
export const DERAIL_PILE = Math.round(H_THRESHOLD * W_TRACK * L_PILE * RHO_TOY);

/** Speed factors (FR-077). */
export const SPEED_UPHILL = 0.6;
export const SPEED_DOWNHILL = 1.5;
export const SPEED_PLATFORM = 0.6;

/** World height of a bridge deck (tiles). */
export const DECK_HEIGHT = 0.42;

/** Score thresholds (FR-075). */
export const STAR_2_RATIO = 0.85;
export const STAR_1_RATIO = 0.6;

export function trainLength(wagons: number): number {
  return ENGINE_LEN + wagons * (COUPLING_GAP + WAGON_LEN);
}

/** Distance from the engine front to the front of wagon k (1-based). */
export function wagonOffset(k: number): number {
  return ENGINE_LEN + COUPLING_GAP + (k - 1) * (WAGON_LEN + COUPLING_GAP);
}

/** Distance from the engine front to the centre of wagon k. */
export function wagonCenter(k: number): number {
  return wagonOffset(k) + WAGON_LEN / 2;
}

/**
 * The car under a point `behind` the engine front (FR-070): 0 = engine, k = wagon k, -1 = none.
 * Each car owns half of the coupling gap on either side.
 */
export function carAt(behind: number, wagons: number): number {
  if (behind < 0) return -1;
  if (behind < ENGINE_LEN + COUPLING_GAP / 2) return 0;
  const k = Math.floor((behind - ENGINE_LEN - COUPLING_GAP / 2) / (WAGON_LEN + COUPLING_GAP)) + 1;
  if (k > wagons) return -1;
  if (k === wagons && behind > trainLength(wagons)) return -1;
  return k;
}

/** H_spill = S / (W_track · L_pile · ρ_toy). */
export function pileHeight(spilled: number): number {
  return spilled / (W_TRACK * L_PILE * RHO_TOY);
}

export function isDangerousPile(spilled: number): boolean {
  return spilled >= DERAIL_PILE;
}
