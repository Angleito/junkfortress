import type { InventoryItem, RunState, SavedBuildObject, SavedChain } from '../types/game';
import { CORE_MAX_HP, PLAYER_MAX_HP, createInitialRunState } from '../data/gameData';

let runState: RunState = createInitialRunState();

export const runStore = {
  get(): RunState {
    return runState;
  },

  reset(): RunState {
    runState = createInitialRunState();
    return runState;
  },

  setSeed(seed: number): void {
    runState.seed = seed;
  },

  nextWave(): void {
    runState.waveNumber += 1;
  },

  addLoot(items: InventoryItem[]): void {
    runState.inventory.push(...items);
  },

  clearInventory(): void {
    runState.inventory = [];
  },

  setPlacedObjects(objects: SavedBuildObject[]): void {
    runState.placedObjects = objects;
  },

  updateObjectHp(id: string, hp: number): void {
    const obj = runState.placedObjects.find((p) => p.id === id);
    if (obj) obj.hp = Math.max(0, Math.floor(hp));
  },

  setChains(chains: SavedChain[]): void {
    runState.chains = chains;
  },

  addChain(chain: SavedChain): void {
    runState.chains.push(chain);
  },

  removeChain(id: string): void {
    runState.chains = runState.chains.filter((c) => c.id !== id);
  },

  updateChainHp(id: string, hp: number): void {
    const chain = runState.chains.find((c) => c.id === id);
    if (chain) chain.hp = Math.max(0, Math.floor(hp));
  },

  damageCore(amount: number): void {
    runState.coreHp = Math.max(0, runState.coreHp - amount);
  },

  healCore(amount: number): void {
    runState.coreHp = Math.min(CORE_MAX_HP, runState.coreHp + amount);
  },

  damagePlayer(amount: number): void {
    runState.playerHp = Math.max(0, runState.playerHp - amount);
  },

  restorePlayer(): void {
    runState.playerHp = PLAYER_MAX_HP;
  },

  addKill(kind: 'player' | 'ricochet' | 'crush' | 'explosion'): void {
    runState.stats.totalKills += 1;
    if (kind === 'player') runState.stats.playerKills += 1;
    else if (kind === 'ricochet') runState.stats.ricochetKills += 1;
    else if (kind === 'crush') runState.stats.crushKills += 1;
    else runState.stats.explosionKills += 1;
  },

  recordBulletFired(): void {
    runState.stats.bulletsFiredByZombies += 1;
  },

  recordRicochet(): void {
    runState.stats.bulletsRicocheted += 1;
  },

  recordStructureLost(id: string): void {
    runState.stats.structuresLost += 1;
    runState.placedObjects = runState.placedObjects.filter((p) => p.id !== id);
  },
};