import type {
  InventoryItem,
  ItemType,
  KillSource,
  Outcome,
  Phase,
  RunState,
  SavedBuildObject,
  SavedChain,
} from '../types/game';
import { createInitialRunState, createInventoryItem } from '../data/gameData';
import { DEFAULT_SEED } from '../utils/rng';

let runState: RunState = createInitialRunState(DEFAULT_SEED);

export const runStore = {
  get(): RunState {
    return runState;
  },

  reset(seed: number = DEFAULT_SEED): RunState {
    runState = createInitialRunState(seed);
    return runState;
  },

  addInventoryItem(type: ItemType): InventoryItem {
    const item = createInventoryItem(type);
    runState.inventory.push(item);
    return item;
  },

  removeInventoryItem(id: string): void {
    runState.inventory = runState.inventory.filter((item) => item.id !== id);
  },

  setPlacedObjects(objects: SavedBuildObject[]): void {
    runState.placedObjects = objects;
  },

  updateObjectHp(id: string, hp: number): void {
    const obj = runState.placedObjects.find((p) => p.id === id);
    if (obj) obj.hp = Math.max(0, Math.floor(hp));
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

  damagePlayer(amount: number): void {
    runState.playerHp = Math.max(0, runState.playerHp - amount);
  },

  addKill(kind: KillSource): void {
    runState.stats.totalKills += 1;
    if (kind === 'player') runState.stats.playerKills += 1;
    else if (kind === 'ricochet') runState.stats.ricochetKills += 1;
    else runState.stats.crushKills += 1;
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

  setPhase(phase: Phase): void {
    runState.phase = phase;
  },

  setOutcome(outcome: Outcome): void {
    runState.outcome = outcome;
  },

  setWaveEnded(v: boolean): void {
    runState.waveEnded = v;
  },
};
