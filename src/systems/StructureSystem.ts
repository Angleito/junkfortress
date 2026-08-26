import type { ItemDefinition } from '../data/items';
import { ITEM_DEFINITIONS } from '../data/items';
import type { ItemType, SavedBuildObject, SavedChain } from '../types/game';
import {
  BUILD_ZONE,
  CHAIN_MAX_LENGTH,
  CORE_RECT,
  GROUND_Y,
  PLAYER_SPAWN_ZONE,
  SUPPORT_EPSILON,
} from '../utils/Constants';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const STRUCTURAL_TYPES: ItemType[] = ['plank', 'metal_sheet'];

export function objectRect(obj: Pick<SavedBuildObject, 'x' | 'y' | 'rotation' | 'type'>, def: ItemDefinition): Rect {
  const rad = (obj.rotation * Math.PI) / 180;
  const c = Math.abs(Math.cos(rad));
  const s = Math.abs(Math.sin(rad));
  const halfW = (def.width * c + def.height * s) / 2;
  const halfH = (def.width * s + def.height * c) / 2;
  return { x: obj.x - halfW, y: obj.y - halfH, width: halfW * 2, height: halfH * 2 };
}

export function rectIntersects(a: Rect, b: Rect, epsilon = 0): boolean {
  return (
    a.x <= b.x + b.width + epsilon &&
    a.x + a.width >= b.x - epsilon &&
    a.y <= b.y + b.height + epsilon &&
    a.y + a.height >= b.y - epsilon
  );
}

export function rectOverlaps(a: Rect, b: Rect, epsilon = 0): boolean {
  return (
    a.x < b.x + b.width - epsilon &&
    a.x + a.width > b.x + epsilon &&
    a.y < b.y + b.height - epsilon &&
    a.y + a.height > b.y + epsilon
  );
}

export function insideRect(r: Rect, outer: Rect, epsilon = 0): boolean {
  return (
    r.x >= outer.x - epsilon &&
    r.y >= outer.y - epsilon &&
    r.x + r.width <= outer.x + outer.width + epsilon &&
    r.y + r.height <= outer.y + outer.height + epsilon
  );
}

export function rectTouchesRoot(r: Rect): boolean {
  if (r.y + r.height >= GROUND_Y - SUPPORT_EPSILON) return true;
  return rectIntersects(r, CORE_RECT, SUPPORT_EPSILON);
}

export function chainParticipates(chain: SavedChain, objectIds: Set<string>): boolean {
  return (
    chain.hp > 0 &&
    chain.anchorA.objectId !== chain.anchorB.objectId &&
    objectIds.has(chain.anchorA.objectId) &&
    objectIds.has(chain.anchorB.objectId)
  );
}

export interface SupportResult {
  supported: Set<string>;
  aliveChains: SavedChain[];
  deadChains: SavedChain[];
}

export function computeSupport(
  placedObjects: SavedBuildObject[],
  chains: SavedChain[],
  defs: Record<ItemType, ItemDefinition> = ITEM_DEFINITIONS,
): SupportResult {
  const objectIds = new Set(placedObjects.map((o) => o.id));
  const edges = new Map<string, string[]>();
  const addEdge = (a: string, b: string): void => {
    if (!edges.has(a)) edges.set(a, []);
    if (!edges.has(b)) edges.set(b, []);
    edges.get(a)!.push(b);
    edges.get(b)!.push(a);
  };

  for (const a of placedObjects) {
    for (const b of placedObjects) {
      if (a.id >= b.id) continue;
      if (rectIntersects(objectRect(a, defs[a.type]), objectRect(b, defs[b.type]), SUPPORT_EPSILON)) {
        addEdge(a.id, b.id);
      }
    }
  }

  for (const chain of chains) {
    if (!chainParticipates(chain, objectIds)) continue;
    edges.set(chain.id, []);
    addEdge(chain.id, chain.anchorA.objectId);
    addEdge(chain.id, chain.anchorB.objectId);
  }

  const supported = new Set<string>();
  const queue: string[] = [];
  for (const o of placedObjects) {
    if (rectTouchesRoot(objectRect(o, defs[o.type]))) {
      supported.add(o.id);
      queue.push(o.id);
    }
  }
  while (queue.length > 0) {
    const cur = queue.pop()!;
    for (const next of edges.get(cur) ?? []) {
      if (!supported.has(next)) {
        supported.add(next);
        queue.push(next);
      }
    }
  }

  const aliveChains = chains.filter((c) => chainParticipates(c, objectIds) && supported.has(c.id));
  const deadChains = chains.filter((c) => !(chainParticipates(c, objectIds) && supported.has(c.id)));
  return { supported, aliveChains, deadChains };
}

export type PlacementViolation =
  | 'outside-zone'
  | 'overlaps-core'
  | 'overlaps-spawn'
  | 'overlaps-object'
  | 'unsupported';

export interface PlacementResult {
  valid: boolean;
  violations: PlacementViolation[];
}

export function placementCheck(
  candidate: SavedBuildObject,
  placedObjects: SavedBuildObject[],
  chains: SavedChain[],
  defs: Record<ItemType, ItemDefinition> = ITEM_DEFINITIONS,
): PlacementResult {
  const violations: PlacementViolation[] = [];
  const rect = objectRect(candidate, defs[candidate.type]);

  if (!insideRect(rect, BUILD_ZONE)) violations.push('outside-zone');
  if (rectOverlaps(rect, CORE_RECT)) violations.push('overlaps-core');
  if (rectOverlaps(rect, PLAYER_SPAWN_ZONE)) violations.push('overlaps-spawn');

  for (const other of placedObjects) {
    if (other.id === candidate.id) continue;
    if (rectOverlaps(objectRect(other, defs[other.type]), rect)) {
      violations.push('overlaps-object');
      break;
    }
  }

  if (STRUCTURAL_TYPES.includes(candidate.type)) {
    const simulated = placedObjects.filter((o) => o.id !== candidate.id).concat(candidate);
    const { supported } = computeSupport(simulated, chains, defs);
    if (!supported.has(candidate.id)) violations.push('unsupported');
  }

  return { valid: violations.length === 0, violations };
}

export type ChainViolation = 'same-object' | 'too-long' | 'missing-object';

export function chainPlacementCheck(
  a: { objectId: string; x: number; y: number },
  b: { objectId: string; x: number; y: number },
  placedObjects: SavedBuildObject[],
): { valid: boolean; violation: ChainViolation | null } {
  if (a.objectId === b.objectId) return { valid: false, violation: 'same-object' };
  const exists = (id: string): boolean => placedObjects.some((o) => o.id === id);
  if (!exists(a.objectId) || !exists(b.objectId)) return { valid: false, violation: 'missing-object' };
  if (Math.hypot(b.x - a.x, b.y - a.y) > CHAIN_MAX_LENGTH) return { valid: false, violation: 'too-long' };
  return { valid: true, violation: null };
}