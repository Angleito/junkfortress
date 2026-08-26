import { describe, expect, it } from 'vitest';
import { BUILD_ZONE, COLLISION, CORE_X, CORE_Y, GAME_HEIGHT, GAME_WIDTH, GROUND_Y, MAX_WAVES, PLAYER_MAX_X, PLAYER_MIN_X, PLAYER_SPAWN_X, PLAYER_SPAWN_Y, PLAYER_SPEED, ZOMBIE_SPAWN_X } from './Constants';
import { WEAPONS, ZOMBIE_CORE_DAMAGE, ZOMBIE_HP, ZOMBIE_SPEED, createInitialRunState, waveCompositionFor } from '../data/gameData';
import { runStore } from '../state/runStore';

describe('arena constants', () => {
  it('matches the spec layout', () => {
    expect(GAME_WIDTH).toBe(1280);
    expect(GAME_HEIGHT).toBe(720);
    expect(GROUND_Y).toBe(660);
    expect(CORE_X).toBe(150);
    expect(CORE_Y).toBe(610);
    expect(PLAYER_SPAWN_X).toBe(230);
    expect(PLAYER_SPAWN_Y).toBe(620);
    expect(ZOMBIE_SPAWN_X).toBe(1220);
    expect(BUILD_ZONE).toEqual({ x: 80, y: 80, width: 620, height: 580 });
  });
});

describe('run state', () => {
  it('starts a fresh run at wave 1 with full HP', () => {
    const state = createInitialRunState();
    expect(state.waveNumber).toBe(1);
    expect(state.inventory).toEqual([]);
    expect(state.placedObjects).toEqual([]);
    expect(state.playerHp).toBe(100);
    expect(state.coreHp).toBe(1500);
    expect(state.stats.totalKills).toBe(0);
  });

  it('reset() produces a clean state', () => {
    runStore.damageCore(500);
    runStore.nextWave();
    runStore.reset();
    const state = runStore.get();
    expect(state.waveNumber).toBe(1);
    expect(state.coreHp).toBe(1500);
    expect(state.playerHp).toBe(100);
  });

  it('restorePlayer() fully heals the player', () => {
    runStore.reset();
    runStore.damagePlayer(40);
    runStore.restorePlayer();
    expect(runStore.get().playerHp).toBe(100);
  });

  it('addKill() attributes kills to the correct stat bucket', () => {
    runStore.reset();
    runStore.addKill('player');
    runStore.addKill('ricochet');
    runStore.addKill('crush');
    runStore.addKill('explosion');
    const { stats } = runStore.get();
    expect(stats.totalKills).toBe(4);
    expect(stats.playerKills).toBe(1);
    expect(stats.ricochetKills).toBe(1);
    expect(stats.crushKills).toBe(1);
    expect(stats.explosionKills).toBe(1);
  });

  it('recordStructureLost() removes the object and counts the loss', () => {
    runStore.reset();
    runStore.setPlacedObjects([{ id: 'a', type: 'plank', x: 100, y: 100, rotation: 0, hp: 250 }]);
    runStore.recordStructureLost('a');
    expect(runStore.get().placedObjects).toEqual([]);
    expect(runStore.get().stats.structuresLost).toBe(1);
  });
});

describe('player and weapon spec', () => {
  it('constrains the player to X = 60 to 720', () => {
    expect(PLAYER_MIN_X).toBe(60);
    expect(PLAYER_MAX_X).toBe(720);
  });

  it('sets the movement speed to 220 px/sec', () => {
    expect(PLAYER_SPEED).toBe(220);
  });

  it('defines the survivor pistol per plan 03', () => {
    expect(WEAPONS.survivor_pistol).toEqual({ damage: 25, fireRate: 4, bulletSpeed: 1100, spreadDeg: 2 });
  });

  it('defines the zombie pistol per plan 08', () => {
    expect(WEAPONS.zombie_pistol).toEqual({ damage: 12, fireRate: 1.25, bulletSpeed: 750, spreadDeg: 8 });
  });

  it('defines zombie base stats per plan 08', () => {
    expect(ZOMBIE_HP).toBe(60);
    expect(ZOMBIE_SPEED).toBe(60);
    expect(ZOMBIE_CORE_DAMAGE).toBe(25);
  });

  it('assigns every collision category a distinct bit', () => {
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
  });
});

describe('wave composition', () => {
  it('defines exactly five waves', () => {
    expect(MAX_WAVES).toBe(5);
    for (let w = 1; w <= MAX_WAVES; w++) {
      expect(waveCompositionFor(w).length).toBeGreaterThan(0);
    }
  });

  it('caps at the final wave', () => {
    expect(waveCompositionFor(99)).toEqual(waveCompositionFor(MAX_WAVES));
  });
});