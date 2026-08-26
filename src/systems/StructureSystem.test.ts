import { describe, expect, it } from 'vitest';
import type { ItemType, SavedBuildObject, SavedChain } from '../types/game';
import {
  chainParticipates,
  chainPlacementCheck,
  computeSupport,
  objectRect,
  placementCheck,
  rectIntersects,
} from './StructureSystem';
import { ITEM_DEFINITIONS } from '../data/items';
import { CHAIN_MAX_LENGTH, CORE_RECT, GROUND_Y } from '../utils/Constants';

function obj(id: string, type: ItemType, x: number, y: number, rotation = 0, hp = 1000): SavedBuildObject {
  return { id, type, x, y, rotation, hp };
}

function chain(
  id: string,
  a: string,
  b: string,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  hp = 80,
): SavedChain {
  return { id, anchorA: { objectId: a, x: ax, y: ay }, anchorB: { objectId: b, x: bx, y: by }, hp };
}

function ids(set: Set<string>): string[] {
  return [...set].sort();
}

describe('objectRect', () => {
  it('computes an axis-aligned bounding box for a rotated rectangle', () => {
    const r = objectRect(obj('a', 'plank', 400, 300, 90), ITEM_DEFINITIONS.plank);
    expect(r.x).toBe(400 - 11);
    expect(r.y).toBe(300 - 80);
    expect(r.width).toBeCloseTo(22, 5);
    expect(r.height).toBeCloseTo(160, 5);
  });
});

describe('computeSupport', () => {
  it('supports a tower that reaches the ground', () => {
    const wood1 = obj('w1', 'plank', 400, 649);
    const wood2 = obj('w2', 'plank', 400, 627);
    const metal = obj('m', 'metal_sheet', 400, 605);
    const result = computeSupport([wood1, wood2, metal], [], ITEM_DEFINITIONS);
    expect(ids(result.supported)).toEqual(['m', 'w1', 'w2']);
  });

  it('declares a detached stack unsupported', () => {
    const wood2 = obj('w2', 'plank', 400, 627);
    const metal = obj('m', 'metal_sheet', 400, 605);
    const result = computeSupport([wood2, metal], [], ITEM_DEFINITIONS);
    expect(ids(result.supported)).toEqual([]);
  });

  it('supports an anvil hanging from a chained, grounded beam', () => {
    const wood = obj('w', 'plank', 400, 649);
    const anvil = obj('a', 'anvil', 400, 520);
    const link = chain('c1', 'w', 'a', 0, -11, 0, -22);
    const result = computeSupport([wood, anvil], [link], ITEM_DEFINITIONS);
    expect(result.supported.has('w')).toBe(true);
    expect(result.supported.has('c1')).toBe(true);
    expect(result.supported.has('a')).toBe(true);
    expect(result.deadChains).toEqual([]);
  });

  it('drops the anvil when the supporting beam is destroyed', () => {
    const anvil = obj('a', 'anvil', 400, 520);
    const link = chain('c1', 'w', 'a', 0, -11, 0, -22);
    const result = computeSupport([anvil], [link], ITEM_DEFINITIONS);
    expect(result.supported.has('a')).toBe(false);
    expect(result.deadChains.map((c) => c.id)).toEqual(['c1']);
  });

  it('drops the anvil when the chain reaches zero HP', () => {
    const wood = obj('w', 'plank', 400, 649);
    const anvil = obj('a', 'anvil', 400, 520);
    const link = chain('c1', 'w', 'a', 0, -11, 0, -22, 0);
    const result = computeSupport([wood, anvil], [link], ITEM_DEFINITIONS);
    expect(result.supported.has('a')).toBe(false);
    expect(result.deadChains.map((c) => c.id)).toEqual(['c1']);
  });

  it('chains are supported when either anchor is supported', () => {
    const wood = obj('w', 'plank', 400, 649);
    const floating = obj('f', 'anvil', 400, 520);
    const link = chain('c1', 'w', 'f', 0, -11, 0, -22);
    const result = computeSupport([wood, floating], [link], ITEM_DEFINITIONS);
    expect(result.supported.has('c1')).toBe(true);
    expect(result.supported.has('f')).toBe(true);
  });

  it('chainParticipates requires both anchors to exist', () => {
    expect(chainParticipates(chain('c', 'a', 'b', 0, 0, 0, 0), new Set(['a']))).toBe(false);
    expect(chainParticipates(chain('c', 'a', 'a', 0, 0, 0, 0), new Set(['a']))).toBe(false);
  });
});

describe('placementCheck', () => {
  it('rejects a floating structural object', () => {
    const result = placementCheck(obj('c', 'plank', 400, 300), [], [], ITEM_DEFINITIONS);
    expect(result.valid).toBe(false);
    expect(result.violations).toContain('unsupported');
  });

  it('accepts a structural object standing on the ground', () => {
    const result = placementCheck(obj('c', 'plank', 400, 649), [], [], ITEM_DEFINITIONS);
    expect(result.valid).toBe(true);
  });

  it('accepts a structural object touching a supported structure', () => {
    const wood1 = obj('w1', 'plank', 400, 649);
    const result = placementCheck(obj('w2', 'plank', 400, 627), [wood1], [], ITEM_DEFINITIONS);
    expect(result.valid).toBe(true);
  });

  it('rejects structural objects touching only unsupported objects', () => {
    const wood2 = obj('w2', 'plank', 400, 627);
    const result = placementCheck(obj('w3', 'plank', 400, 605), [wood2], [], ITEM_DEFINITIONS);
    expect(result.valid).toBe(false);
    expect(result.violations).toContain('unsupported');
  });

  it('allows a heavy object to hang in the air (for chains)', () => {
    const result = placementCheck(obj('a', 'anvil', 400, 300), [], [], ITEM_DEFINITIONS);
    expect(result.valid).toBe(true);
  });

  it('rejects objects outside the build zone', () => {
    const result = placementCheck(obj('c', 'anvil', 1200, 300), [], [], ITEM_DEFINITIONS);
    expect(result.valid).toBe(false);
    expect(result.violations).toContain('outside-zone');
  });

  it('rejects objects overlapping the core', () => {
    const result = placementCheck(obj('c', 'anvil', CORE_RECT.x + CORE_RECT.width / 2, CORE_RECT.y + CORE_RECT.height / 2), [], [], ITEM_DEFINITIONS);
    expect(result.valid).toBe(false);
    expect(result.violations).toContain('overlaps-core');
  });

  it('rejects objects overlapping the player spawn zone', () => {
    const result = placementCheck(obj('c', 'plank', 250, 580, 90), [], [], ITEM_DEFINITIONS);
    expect(result.valid).toBe(false);
    expect(result.violations).toContain('overlaps-spawn');
  });

  it('rejects objects overlapping another placed object', () => {
    const existing = obj('e', 'plank', 400, 649);
    const result = placementCheck(obj('c', 'plank', 401, 649), [existing], [], ITEM_DEFINITIONS);
    expect(result.valid).toBe(false);
    expect(result.violations).toContain('overlaps-object');
  });

  it('ignores the candidate itself when checking overlap (moving)', () => {
    const candidate = obj('c', 'plank', 400, 649);
    const result = placementCheck(candidate, [candidate], [], ITEM_DEFINITIONS);
    expect(result.valid).toBe(true);
  });
});

describe('chainPlacementCheck', () => {
  const wood = obj('w', 'plank', 400, 649);
  const anvil = obj('a', 'anvil', 400, 520);

  it('rejects chaining an object to itself', () => {
    const result = chainPlacementCheck(
      { objectId: 'w', x: 400, y: 638 },
      { objectId: 'w', x: 400, y: 630 },
      [wood],
    );
    expect(result.valid).toBe(false);
    expect(result.violation).toBe('same-object');
  });

  it('rejects chains longer than the maximum', () => {
    const result = chainPlacementCheck(
      { objectId: 'w', x: 400, y: 638 },
      { objectId: 'a', x: 400, y: 100 },
      [wood, anvil],
    );
    expect(result.valid).toBe(false);
    expect(result.violation).toBe('too-long');
  });

  it('rejects anchors on missing objects', () => {
    const result = chainPlacementCheck(
      { objectId: 'nope', x: 400, y: 638 },
      { objectId: 'a', x: 400, y: 498 },
      [wood, anvil],
    );
    expect(result.valid).toBe(false);
    expect(result.violation).toBe('missing-object');
  });

  it('accepts a chain between two placed objects within range', () => {
    const result = chainPlacementCheck(
      { objectId: 'w', x: 400, y: 638 },
      { objectId: 'a', x: 400, y: 498 },
      [wood, anvil],
    );
    expect(result.valid).toBe(true);
  });

  it('defines the maximum chain length at 220 px', () => {
    expect(CHAIN_MAX_LENGTH).toBe(220);
  });
});

describe('rect helpers', () => {
  it('grounded objects touch the ground line', () => {
    const r = objectRect(obj('w', 'plank', 400, 649), ITEM_DEFINITIONS.plank);
    expect(r.y + r.height).toBeGreaterThanOrEqual(GROUND_Y - 4);
  });

  it('detects touching rectangles as intersecting', () => {
    const a = { x: 0, y: 0, width: 100, height: 10 };
    const b = { x: 0, y: 10, width: 100, height: 10 };
    expect(rectIntersects(a, b, 4)).toBe(true);
  });
});