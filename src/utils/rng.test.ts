import { describe, expect, it } from 'vitest';
import { DEFAULT_SEED, nextRng, randInt, randRange, seedRng } from './rng';

describe('mulberry32 rng', () => {
  it('replays the same stream for the same seed', () => {
    seedRng(1234);
    const first = [nextRng(), nextRng(), nextRng()];
    seedRng(1234);
    expect([nextRng(), nextRng(), nextRng()]).toEqual(first);
  });

  it('produces a different stream for a different seed', () => {
    seedRng(1);
    const first = nextRng();
    seedRng(2);
    expect(nextRng()).not.toBe(first);
  });

  it('stays inside [0, 1)', () => {
    seedRng(DEFAULT_SEED);
    for (let i = 0; i < 1000; i++) {
      const value = nextRng();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('randInt returns only integers in [min, maxExclusive)', () => {
    seedRng(7);
    const seen = new Set<number>();
    for (let i = 0; i < 300; i++) {
      const value = randInt(3, 5);
      expect(Number.isInteger(value)).toBe(true);
      seen.add(value);
    }
    expect([...seen].sort()).toEqual([3, 4]);
  });

  it('randRange stays in bounds', () => {
    seedRng(DEFAULT_SEED);
    for (let i = 0; i < 200; i++) {
      const value = randRange(-5, 5);
      expect(value).toBeGreaterThanOrEqual(-5);
      expect(value).toBeLessThan(5);
    }
  });
});
