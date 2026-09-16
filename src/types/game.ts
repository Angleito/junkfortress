export type ItemType = 'plank' | 'metal_sheet' | 'chain' | 'anvil';

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
  /** Offset from that object's center, in world axes. */
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
  bulletsFiredByZombies: number;
  bulletsRicocheted: number;
  structuresLost: number;
}

export type Phase = 'build' | 'wave' | 'result';

export type Outcome = 'none' | 'victory' | 'defeat';

export interface RunState {
  seed: number;
  phase: Phase;
  outcome: Outcome;
  waveEnded: boolean;
  inventory: InventoryItem[];
  placedObjects: SavedBuildObject[];
  chains: SavedChain[];
  playerHp: number;
  coreHp: number;
  stats: RunStats;
}

export type KillSource = 'player' | 'ricochet' | 'crush';
