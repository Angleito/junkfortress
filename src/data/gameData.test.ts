import { describe, expect, it } from 'vitest';
import { CATEGORY_ORDER, generateLoot, LOOT_LOCATIONS, LOOT_TABLES } from './gameData';
import { ITEMS_PER_LOOT } from '../utils/Constants';

describe('loot tables', () => {
  it('has three locations with matching tables', () => {
    expect(LOOT_LOCATIONS.map((l) => l.key).sort()).toEqual(['hardware_store', 'junkyard', 'restaurant']);
    for (const location of LOOT_LOCATIONS) {
      expect(LOOT_TABLES[location.key]).toBeDefined();
    }
  });

  it('every table totals exactly 100 weight', () => {
    for (const table of Object.values(LOOT_TABLES)) {
      const total = table.reduce((sum, entry) => sum + entry.weight, 0);
      expect(total).toBe(100);
    }
  });

  it('category percentages sum to 100 and match table order', () => {
    for (const location of LOOT_LOCATIONS) {
      expect(location.categories.map((c) => c.label)).toEqual([...CATEGORY_ORDER]);
      const total = location.categories.reduce((sum, c) => sum + c.chance, 0);
      expect(total).toBe(100);
    }
  });

  it('generates six items with a guaranteed structural first slot', () => {
    for (const location of LOOT_LOCATIONS) {
      for (let i = 0; i < 20; i++) {
        const loot = generateLoot(location.key);
        expect(loot).toHaveLength(ITEMS_PER_LOOT);
        expect(['plank', 'metal_sheet']).toContain(loot[0]);
      }
    }
  });
});