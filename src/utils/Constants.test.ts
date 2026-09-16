import { describe, expect, it } from 'vitest';
import {
  BUILD_ZONE,
  CHAIN_MAX_HP,
  COLLISION,
  CORE_RECT,
  CORE_SIZE,
  CORE_X,
  CORE_Y,
  GAME_WIDTH,
  GROUND_Y,
  MAX_ACTIVE_BULLETS,
  PLAYER_MAX_X,
  PLAYER_MIN_X,
  PLAYER_SPAWN_X,
  PLAYER_SPEED,
  RICOCHET_DAMAGE_DECAY,
  RICOCHET_SPEED_DECAY,
  ZOMBIE_SPAWN_X,
  ZOMBIE_STOP_X,
} from './Constants';

describe('arena layout invariants', () => {
  it('centers the core rect on the core position', () => {
    expect(CORE_RECT.x + CORE_RECT.width / 2).toBe(CORE_X);
    expect(CORE_RECT.y + CORE_RECT.height / 2).toBe(CORE_Y);
    expect(CORE_RECT.width).toBe(CORE_SIZE);
    expect(CORE_RECT.height).toBe(CORE_SIZE);
  });

  it('keeps the build zone inside the arena and above the ground line', () => {
    expect(BUILD_ZONE.x).toBeGreaterThanOrEqual(0);
    expect(BUILD_ZONE.y).toBeGreaterThanOrEqual(0);
    expect(BUILD_ZONE.x + BUILD_ZONE.width).toBeLessThanOrEqual(GAME_WIDTH);
    expect(BUILD_ZONE.y + BUILD_ZONE.height).toBeLessThanOrEqual(GROUND_Y);
  });

  it('spawns the player inside the walkable band', () => {
    expect(PLAYER_MIN_X).toBeLessThan(PLAYER_SPAWN_X);
    expect(PLAYER_SPAWN_X).toBeLessThan(PLAYER_MAX_X);
    expect(PLAYER_SPEED).toBeGreaterThan(0);
  });

  it('spawns zombies beyond the build zone and stops them right of the core', () => {
    expect(ZOMBIE_SPAWN_X).toBeGreaterThan(BUILD_ZONE.x + BUILD_ZONE.width);
    expect(ZOMBIE_SPAWN_X).toBeGreaterThan(PLAYER_MAX_X);
    expect(ZOMBIE_STOP_X).toBeGreaterThan(CORE_X);
    expect(ZOMBIE_STOP_X).toBeLessThan(PLAYER_MAX_X);
  });

  it('gives every collision category its own single bit', () => {
    const categories = [
      COLLISION.PLAYER,
      COLLISION.ZOMBIE,
      COLLISION.PLAYER_BULLET,
      COLLISION.ZOMBIE_BULLET,
      COLLISION.BUILD_OBJECT,
      COLLISION.CORE,
      COLLISION.GROUND,
    ];
    expect(new Set(categories).size).toBe(categories.length);
    for (const bit of categories) expect(bit & (bit - 1)).toBe(0);
    expect(COLLISION.ALL).toBe(0xffffffff);
  });

  it('keeps the bullet budget and ricochet decay usable', () => {
    expect(MAX_ACTIVE_BULLETS).toBeGreaterThan(0);
    expect(RICOCHET_SPEED_DECAY).toBeGreaterThan(0);
    expect(RICOCHET_SPEED_DECAY).toBeLessThan(1);
    expect(RICOCHET_DAMAGE_DECAY).toBeGreaterThan(0);
    expect(RICOCHET_DAMAGE_DECAY).toBeLessThanOrEqual(1);
    expect(CHAIN_MAX_HP).toBeGreaterThan(0);
  });
});
