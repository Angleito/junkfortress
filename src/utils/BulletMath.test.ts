import { describe, expect, it } from 'vitest';
import { applyRicochet, jitteredAngle, reflectVelocity, velocityFromAngle } from './BulletMath';

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
    for (let i = 0; i < 200; i++) {
      const a = jitteredAngle(0, 2);
      expect(Math.abs(a)).toBeLessThanOrEqual((2 * Math.PI) / 180);
    }
  });
});

describe('reflectVelocity', () => {
  it('bounces a rightward bullet off a vertical wall', () => {
    const r = reflectVelocity(100, 0, -1, 0);
    expect(r.vx).toBeCloseTo(-100);
    expect(r.vy).toBeCloseTo(0);
  });

  it('reflects a bullet hitting a flat ceiling downward', () => {
    const r = reflectVelocity(0, -200, 0, 1);
    expect(r.vx).toBeCloseTo(0);
    expect(r.vy).toBeCloseTo(200);
  });
});

describe('applyRicochet', () => {
  it('slows speed to 80% and reduces damage to 85%', () => {
    const r = applyRicochet({
      vx: 1000,
      vy: 0,
      nx: -1,
      ny: 0,
      damage: 25,
      ricochetCount: 0,
      maxRicochets: 3,
      owner: 'player',
      canDamageZombies: true,
    });
    expect(r.reflected.vx).toBeCloseTo(-1000);
    expect(r.speed).toBeCloseTo(800);
    expect(r.damage).toBeCloseTo(21.25);
    expect(r.ricochetCount).toBe(1);
  });

  it('counts up without passing the maximum ricochet limit', () => {
    const r = applyRicochet({
      vx: 1000,
      vy: 0,
      nx: -1,
      ny: 0,
      damage: 25,
      ricochetCount: 2,
      maxRicochets: 3,
      owner: 'player',
      canDamageZombies: true,
    });
    expect(r.ricochetCount).toBe(3);
  });

  it('arms zombie bullets for friendly fire after the first ricochet', () => {
    const r = applyRicochet({
      vx: -750,
      vy: 0,
      nx: 1,
      ny: 0,
      damage: 12,
      ricochetCount: 0,
      maxRicochets: 3,
      owner: 'zombie',
      canDamageZombies: false,
    });
    expect(r.canDamageZombies).toBe(true);
  });
});