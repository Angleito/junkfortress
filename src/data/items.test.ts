import { describe, expect, it } from 'vitest';
import { ITEM_DEFINITIONS, MATERIAL_DAMAGE_MULTIPLIER } from './items';
import type { ItemType } from '../types/game';

const ALL_ITEMS: ItemType[] = ['plank', 'metal_sheet', 'chain', 'anvil', 'tire', 'propane_tank', 'refrigerator', 'mattress'];

describe('item definitions', () => {
  it('defines exactly the eight MVP items', () => {
    expect(Object.keys(ITEM_DEFINITIONS).sort()).toEqual([...ALL_ITEMS].sort());
  });

  it('every item has valid material, HP, mass and size', () => {
    for (const def of Object.values(ITEM_DEFINITIONS)) {
      expect(['wood', 'metal', 'soft']).toContain(def.material);
      expect(def.maxHp).toBeGreaterThan(0);
      expect(def.massKg).toBeGreaterThan(0);
      expect(def.width).toBeGreaterThan(0);
      expect(def.height).toBeGreaterThan(0);
      expect(['rectangle', 'circle', 'chain']).toContain(def.shape);
    }
  });

  it('matches the plan 06 stat table', () => {
    expect(ITEM_DEFINITIONS.plank).toMatchObject({ material: 'wood', maxHp: 250, massKg: 8, width: 160, height: 22 });
    expect(ITEM_DEFINITIONS.metal_sheet).toMatchObject({ material: 'metal', maxHp: 500, massKg: 25, width: 150, height: 18 });
    expect(ITEM_DEFINITIONS.chain).toMatchObject({ material: 'metal', maxHp: 80, shape: 'chain' });
    expect(ITEM_DEFINITIONS.anvil).toMatchObject({ material: 'metal', maxHp: 1400, massKg: 100 });
    expect(ITEM_DEFINITIONS.tire).toMatchObject({ material: 'soft', maxHp: 400, massKg: 15, shape: 'circle' });
    expect(ITEM_DEFINITIONS.propane_tank).toMatchObject({ material: 'metal', maxHp: 180, massKg: 22 });
    expect(ITEM_DEFINITIONS.refrigerator).toMatchObject({ material: 'metal', maxHp: 900, massKg: 45, width: 80, height: 130 });
    expect(ITEM_DEFINITIONS.mattress).toMatchObject({ material: 'soft', maxHp: 500, massKg: 12 });
  });

  it('applies the plan damage multipliers', () => {
    expect(MATERIAL_DAMAGE_MULTIPLIER).toEqual({ wood: 1.0, metal: 0.25, soft: 0.35, core: 1.0 });
  });
});