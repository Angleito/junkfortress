import { describe, expect, it } from 'vitest';
import { crushDamage } from './Crush';
import { CRUSH_DAMAGE_MAX, CRUSH_SPEED_THRESHOLD } from './Constants';

describe('crushDamage', () => {
  it('is zero for drops at or below the speed threshold', () => {
    expect(crushDamage(100, 0)).toBe(0);
    expect(crushDamage(100, -300)).toBe(0);
    expect(crushDamage(100, CRUSH_SPEED_THRESHOLD)).toBe(0);
    expect(crushDamage(100, CRUSH_SPEED_THRESHOLD - 50)).toBe(0);
  });

  it('punishes a heavy fast landing', () => {
    // 100 kg anvil at 500 px/s => 100 * (500 - 150) * 0.05 = 1750
    expect(crushDamage(100, 500)).toBe(1750);
    expect(crushDamage(100, 500)).toBeGreaterThan(crushDamage(50, 500));
    expect(crushDamage(100, 500)).toBeGreaterThan(crushDamage(100, 250));
  });

  it('caps at CRUSH_DAMAGE_MAX', () => {
    expect(crushDamage(100, 100000)).toBe(CRUSH_DAMAGE_MAX);
    expect(crushDamage(1e6, 1e6)).toBe(CRUSH_DAMAGE_MAX);
  });
});
