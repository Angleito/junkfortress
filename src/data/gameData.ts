import type { ItemType, LocationKey, LootLocation, RunState } from '../types/game';
import { ITEMS_PER_LOOT, MAX_WAVES } from '../utils/Constants';

export const PLAYER_MAX_HP = 100;
export const CORE_MAX_HP = 1500;

export const ZOMBIE_HP = 60;
export const ZOMBIE_SPEED = 60;
export const ZOMBIE_CORE_DAMAGE = 25;

export type WeaponType = 'survivor_pistol' | 'zombie_pistol';

export interface WeaponStats {
  damage: number;
  fireRate: number;
  bulletSpeed: number;
  spreadDeg: number;
}

export const WEAPONS: Record<WeaponType, WeaponStats> = {
  survivor_pistol: { damage: 25, fireRate: 4, bulletSpeed: 1100, spreadDeg: 2 },
  zombie_pistol: { damage: 12, fireRate: 1.25, bulletSpeed: 750, spreadDeg: 8 },
};

export const ITEM_NAMES: Record<ItemType, string> = {
  plank: 'Wooden Plank',
  metal_sheet: 'Metal Sheet',
  chain: 'Chain',
  anvil: 'Anvil',
  tire: 'Tire',
  propane_tank: 'Propane Tank',
  refrigerator: 'Refrigerator',
  mattress: 'Mattress',
};

export const LOCATION_NAMES: Record<LocationKey, string> = {
  hardware_store: 'HARDWARE STORE',
  restaurant: 'RESTAURANT',
  junkyard: 'JUNKYARD',
};

const ITEM_CATEGORIES: Record<ItemType, string> = {
  plank: 'Wood',
  metal_sheet: 'Metal',
  chain: 'Metal',
  tire: 'Heavy Junk',
  propane_tank: 'Explosives',
  refrigerator: 'Heavy Junk',
  mattress: 'Soft',
  anvil: 'Heavy Junk',
};

export const CATEGORY_ORDER = ['Wood', 'Metal', 'Heavy Junk', 'Explosives', 'Soft'] as const;

export const LOOT_TABLES: Record<LocationKey, { item: ItemType; weight: number }[]> = {
  hardware_store: [
    { item: 'plank', weight: 35 },
    { item: 'metal_sheet', weight: 20 },
    { item: 'chain', weight: 15 },
    { item: 'tire', weight: 5 },
    { item: 'propane_tank', weight: 5 },
    { item: 'refrigerator', weight: 5 },
    { item: 'mattress', weight: 10 },
    { item: 'anvil', weight: 5 },
  ],
  restaurant: [
    { item: 'plank', weight: 15 },
    { item: 'metal_sheet', weight: 10 },
    { item: 'chain', weight: 5 },
    { item: 'tire', weight: 5 },
    { item: 'propane_tank', weight: 25 },
    { item: 'refrigerator', weight: 25 },
    { item: 'mattress', weight: 10 },
    { item: 'anvil', weight: 5 },
  ],
  junkyard: [
    { item: 'plank', weight: 10 },
    { item: 'metal_sheet', weight: 25 },
    { item: 'chain', weight: 15 },
    { item: 'tire', weight: 20 },
    { item: 'propane_tank', weight: 10 },
    { item: 'refrigerator', weight: 10 },
    { item: 'mattress', weight: 2 },
    { item: 'anvil', weight: 8 },
  ],
};

export const LOOT_LOCATIONS: LootLocation[] = (Object.keys(LOOT_TABLES) as LocationKey[]).map((key) => ({
  key,
  name: LOCATION_NAMES[key],
  categories: CATEGORY_ORDER.map((label) => ({
    label,
    chance: LOOT_TABLES[key].reduce(
      (sum, entry) => sum + (ITEM_CATEGORIES[entry.item] === label ? entry.weight : 0),
      0,
    ),
  })),
}));

export function generateLoot(locationKey: LocationKey): ItemType[] {
  const table = LOOT_TABLES[locationKey];
  const items: ItemType[] = [Math.random() < 0.7 ? 'plank' : 'metal_sheet'];
  for (let i = 0; i < ITEMS_PER_LOOT - 1; i++) {
    items.push(weightedPick(table));
  }
  return items;
}

function weightedPick(table: { item: ItemType; weight: number }[]): ItemType {
  const total = table.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = Math.random() * total;
  for (const entry of table) {
    roll -= entry.weight;
    if (roll <= 0) return entry.item;
  }
  return table[table.length - 1].item;
}

export function createInitialRunState(): RunState {
  return {
    seed: Math.floor(Math.random() * 0xffffffff),
    waveNumber: 1,
    inventory: [],
    placedObjects: [],
    chains: [],
    playerHp: PLAYER_MAX_HP,
    coreHp: CORE_MAX_HP,
    stats: {
      totalKills: 0,
      playerKills: 0,
      ricochetKills: 0,
      crushKills: 0,
      explosionKills: 0,
      bulletsFiredByZombies: 0,
      bulletsRicocheted: 0,
      structuresLost: 0,
    },
  };
}

export function waveCompositionFor(waveNumber: number): { type: string; count: number }[] {
  return STUB_WAVES[Math.min(waveNumber, MAX_WAVES) - 1] ?? [];
}

const STUB_WAVES: { type: string; count: number }[][] = [
  [{ type: 'Pistol Zombie', count: 4 }],
  [{ type: 'Pistol Zombie', count: 6 }, { type: 'Rifle Zombie', count: 2 }],
  [{ type: 'Pistol Zombie', count: 8 }, { type: 'Rifle Zombie', count: 4 }, { type: 'Shotgun Zombie', count: 2 }],
  [{ type: 'Pistol Zombie', count: 10 }, { type: 'Rifle Zombie', count: 5 }, { type: 'Shotgun Zombie', count: 3 }],
  [{ type: 'Pistol Zombie', count: 12 }, { type: 'Rifle Zombie', count: 6 }, { type: 'Shotgun Zombie', count: 4 }, { type: 'Boss', count: 1 }],
];