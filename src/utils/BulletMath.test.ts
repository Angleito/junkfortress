import { describe, expect, it } from 'vitest';
import { applyRicochet, jitteredAngle, reflectVelocity, velocityFromAngle } from './BulletMath';
import { seedRng } from './rng';

describe('velocityFromAngle', () => {
  it('fires horizontally at 0 radians', () => {
    expect(velocityFromAngle(0, 1100)).toEqual({ vx: 1100, vy: 0 });
  });

  it('fires straight down at PI/2', () => {
    const v = velocityFromAngle(Math.PI / 2, 750);
    expect(v.vx).toBeCloseTo(0);
    expect(v.vy).toBeCloseTo(750);
  });
});

describe('jitteredAngle', () => {
  it('stays within the spread cone', () => {
    seedRng(11);
    for (let i = 0; i < 200; i++) {
      const angle = jitteredAngle(0, 2);
      expect(Math.abs(angle)).toBeLessThanOrEqual((2 * Math.PI) / 180);
    }
  });

  it('is reproducible for a given rng seed', () => {
    seedRng(42);
    const first = [jitteredAngle(1, 6), jitteredAngle(1, 6)];
    seedRng(42);
    expect([jitteredAngle(1, 6), jitteredAngle(1, 6)]).toEqual(first);
  });
});

describe('reflectVelocity', () => {
  it('bounces a rightward bullet off a vertical wall', () => {
    const r = reflectVelocity(1000, 0, -1, 0);
    expect(r.vx).toBeCloseTo(-1000);
    expect(r.vy).toBeCloseTo(0);
  });

  it('reflects a bullet dropping onto a flat ceiling upward', () => {
    const r = reflectVelocity(0, -200, 0, 1);
    expect(r.vx).toBeCloseTo(0);
    expect(r.vy).toBeCloseTo(200);
  });

  it('matches r = v - 2(v.n)n and preserves speed on a 45-degree normal', () => {
    const nx = -Math.SQRT1_2;
    const ny = -Math.SQRT1_2;
    const r = reflectVelocity(1000, 0, nx, ny);
    const dot = 1000 * nx;
    expect(r.vx).toBeCloseTo(1000 - 2 * dot * nx);
    expect(r.vy).toBeCloseTo(0 - 2 * dot * ny);
    expect(r.vx).toBeCloseTo(0);
    expect(r.vy).toBeCloseTo(-1000);
    expect(Math.hypot(r.vx, r.vy)).toBeCloseTo(1000);
  });

  it('sends a bullet somewhere materially different off 45 degrees than off flat metal', () => {
    const flat = reflectVelocity(1000, 0, -1, 0);
    const angled = reflectVelocity(1000, 0, -Math.SQRT1_2, -Math.SQRT1_2);
    const cos = (flat.vx * angled.vx + flat.vy * angled.vy) /
      (Math.hypot(flat.vx, flat.vy) * Math.hypot(angled.vx, angled.vy));
    expect(Math.acos(cos)).toBeGreaterThan(Math.PI / 4);
  });
});

describe('applyRicochet', () => {
  it('damps speed to 80% and damage to 85% while counting the bounce', () => {
    const r = applyRicochet({
      vx: 1000,
      vy: 0,
      nx: -1,
      ny: 0,
      damage: 25,
      ricochetCount: 0,
      owner: 'player',
      canDamageZombies: true,
    });
    expect(r.reflected.vx).toBeCloseTo(-1000);
    expect(r.reflected.vy).toBeCloseTo(0);
    expect(r.speed).toBeCloseTo(800);
    expect(r.damage).toBeCloseTo(21.25);
    expect(r.ricochetCount).toBe(1);
    expect(r.canDamageZombies).toBe(true);
  });

  it('keeps damping on every later bounce', () => {
    const r = applyRicochet({
      vx: 800,
      vy: 0,
      nx: -1,
      ny: 0,
      damage: 21.25,
      ricochetCount: 2,
      owner: 'player',
      canDamageZombies: true,
    });
    expect(r.speed).toBeCloseTo(640);
    expect(r.damage).toBeCloseTo(21.25 * 0.85);
    expect(r.ricochetCount).toBe(3);
  });

  it('arms a zombie bullet for friendly fire once it ricochets', () => {
    const r = applyRicochet({
      vx: -750,
      vy: 0,
      nx: 1,
      ny: 0,
      damage: 10,
      ricochetCount: 0,
      owner: 'zombie',
      canDamageZombies: false,
    });
    expect(r.canDamageZombies).toBe(true);
    expect(r.reflected.vx).toBeCloseTo(750);
  });

  it('cannot arm a disarmed player bullet into a zombie killer', () => {
    const r = applyRicochet({
      vx: 1000,
      vy: 0,
      nx: -1,
      ny: 0,
      damage: 25,
      ricochetCount: 0,
      owner: 'player',
      canDamageZombies: false,
    });
    expect(r.canDamageZombies).toBe(false);
  });
});
