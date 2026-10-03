// Addendum A1 constants and formulas (specs/data-model.md §Constants, §Formulas).

/** Fixed simulation tick (seconds). */
export const DT = 1 / 60;

export const ENGINE_LEN = 0.62;
export const WAGON_LEN = 0.5;
export const COUPLING_GAP = 0.08;

export const WHEEL_HEIGHT = 0.1;
/** H_threshold = 0.5 × wheel height. */
export const H_THRESHOLD = 0.5 * WHEEL_HEIGHT;

export const W_TRACK = 0.4;
export const L_FUNNEL = 0.8;
export const FUNNEL_SPAN_START = 0.1;
export const FUNNEL_SPAN_END = FUNNEL_SPAN_START + L_FUNNEL;
/** Toy packing density, toys per tile³. */
export const RHO_TOY = 2500;

/** Spilled toys at one funnel at which the pile reaches H_threshold (= 40). */
export const DERAIL_PILE = Math.round(H_THRESHOLD * W_TRACK * L_FUNNEL * RHO_TOY);

export const WAGON_CAPACITY = 80;
/** Cost term per facing switch traversal (A2), in tiles. */
export const SWITCH_DELAY = 0.5;

export function trainLength(wagons: number): number {
  return ENGINE_LEN + wagons * (COUPLING_GAP + WAGON_LEN);
}

/** Distance from the engine front to the front of wagon k (1-based). */
export function wagonOffset(k: number): number {
  return ENGINE_LEN + COUPLING_GAP + (k - 1) * (WAGON_LEN + COUPLING_GAP);
}

/** Q_pump such that Q · L_funnel / v = dose (A1 fill condition). */
export function pourRate(dose: number, speed: number): number {
  return (dose * speed) / L_FUNNEL;
}

/** Toys a wagon receives per pass: Q · (L_funnel / v). */
export function dosePerPass(rate: number, speed: number): number {
  return rate * (L_FUNNEL / speed);
}

/** H_spill = S / (W_track · L_funnel · ρ_toy). */
export function pileHeight(spilled: number): number {
  return spilled / (W_TRACK * L_FUNNEL * RHO_TOY);
}

/** Integer form of H_spill ≥ H_threshold. */
export function isDangerousPile(spilled: number): boolean {
  return spilled >= DERAIL_PILE;
}

/** Δt = (C − switch lane length − train length) / v. */
export function switchWindow(circuit: number, switchLaneLength: number, trainLen: number, speed: number): number {
  return (circuit - switchLaneLength - trainLen) / speed;
}
