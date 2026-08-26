export type ItemType =
  | 'plank'
  | 'metal_sheet'
  | 'chain'
  | 'anvil'
  | 'tire'
  | 'propane_tank'
  | 'refrigerator'
  | 'mattress';

export type LocationKey = 'hardware_store' | 'restaurant' | 'junkyard';

export interface InventoryItem {
  id: string;
  type: ItemType;
  name: string;
}

export interface SavedBuildObject {
  id: string;
  type: ItemType;
  x: number;
  y: number;
  rotation: number;
  hp: number;
}

export interface ChainAnchor {
  objectId: string;
  x: number;
  y: number;
}

export interface SavedChain {
  id: string;
  anchorA: ChainAnchor;
  anchorB: ChainAnchor;
  hp: number;
}

export interface RunStats {
  totalKills: number;
  playerKills: number;
  ricochetKills: number;
  crushKills: number;
  explosionKills: number;
  bulletsFiredByZombies: number;
  bulletsRicocheted: number;
  structuresLost: number;
}

export interface RunState {
  seed: number;
  waveNumber: number;
  inventory: InventoryItem[];
  placedObjects: SavedBuildObject[];
  chains: SavedChain[];
  playerHp: number;
  coreHp: number;
  stats: RunStats;
}

export interface LootCategory {
  label: string;
  chance: number;
}

export interface LootLocation {
  key: LocationKey;
  name: string;
  categories: LootCategory[];
}

export interface WaveComposition {
  zombieCounts: { type: string; count: number }[];
}