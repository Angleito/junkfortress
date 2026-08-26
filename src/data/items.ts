import type { ItemType } from '../types/game';

export type Material = 'wood' | 'metal' | 'soft' | 'core';

export interface ItemDefinition {
  id: ItemType;
  name: string;
  material: Material;
  maxHp: number;
  massKg: number;
  width: number;
  height: number;
  shape: 'rectangle' | 'circle' | 'chain';
}

export const ITEM_DEFINITIONS: Record<ItemType, ItemDefinition> = {
  plank: { id: 'plank', name: 'Wooden Plank', material: 'wood', maxHp: 250, massKg: 8, width: 160, height: 22, shape: 'rectangle' },
  metal_sheet: { id: 'metal_sheet', name: 'Metal Sheet', material: 'metal', maxHp: 500, massKg: 25, width: 150, height: 18, shape: 'rectangle' },
  chain: { id: 'chain', name: 'Chain', material: 'metal', maxHp: 80, massKg: 2, width: 20, height: 20, shape: 'chain' },
  anvil: { id: 'anvil', name: 'Anvil', material: 'metal', maxHp: 1400, massKg: 100, width: 70, height: 45, shape: 'rectangle' },
  tire: { id: 'tire', name: 'Tire', material: 'soft', maxHp: 400, massKg: 15, width: 64, height: 64, shape: 'circle' },
  propane_tank: { id: 'propane_tank', name: 'Propane Tank', material: 'metal', maxHp: 180, massKg: 22, width: 42, height: 90, shape: 'rectangle' },
  refrigerator: { id: 'refrigerator', name: 'Refrigerator', material: 'metal', maxHp: 900, massKg: 45, width: 80, height: 130, shape: 'rectangle' },
  mattress: { id: 'mattress', name: 'Mattress', material: 'soft', maxHp: 500, massKg: 12, width: 150, height: 55, shape: 'rectangle' },
};

export const MATERIAL_DAMAGE_MULTIPLIER: Record<Material, number> = {
  wood: 1.0,
  metal: 0.25,
  soft: 0.35,
  core: 1.0,
};