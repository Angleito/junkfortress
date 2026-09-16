export const DEFAULT_SEED = 0x4a554e4b;

/** mulberry32 state. Every random decision in the game draws from this one stream. */
let state = DEFAULT_SEED;

export function seedRng(seed: number): void {
  state = seed >>> 0;
}

export function nextRng(): number {
  state = (state + 0x6d2b79f5) >>> 0;
  let t = state;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function randRange(min: number, max: number): number {
  return min + nextRng() * (max - min);
}

export function randInt(min: number, maxExclusive: number): number {
  return min + Math.floor(nextRng() * (maxExclusive - min));
}
