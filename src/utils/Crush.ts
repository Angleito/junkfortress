import { CRUSH_DAMAGE_FACTOR, CRUSH_DAMAGE_MAX, CRUSH_SPEED_THRESHOLD } from './Constants';

/**
 * Damage a falling object deals on impact. Only downward speed beyond the
 * threshold counts, and even an anvil at terminal velocity tops out at
 * CRUSH_DAMAGE_MAX so no single drop can delete a half-built fort.
 */
export function crushDamage(massKg: number, vy: number): number {
 const impact = massKg * Math.max(0, vy - CRUSH_SPEED_THRESHOLD) * CRUSH_DAMAGE_FACTOR;
 return Math.min(CRUSH_DAMAGE_MAX, Math.max(0, impact));
}
