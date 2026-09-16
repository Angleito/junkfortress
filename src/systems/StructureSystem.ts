import type { ItemDefinition } from '../data/items';
import { ITEM_DEFINITIONS } from '../data/items';
import type { ItemType, SavedBuildObject, SavedChain } from '../types/game';
import {
 BUILD_ZONE,
 CHAIN_MAX_LENGTH,
 CORE_RECT,
 GROUND_Y,
 SUPPORT_EPSILON,
} from '../utils/Constants';

export interface Rect {
 x: number;
 y: number;
 width: number;
 height: number;
}

export const STRUCTURAL_TYPES: ItemType[] = ['plank', 'metal_sheet'];

/**
 * Objects must be able to REST on each other: support is a rect intersection, so a beam laid on a
 * post only needs to touch it, and demanding sub-pixel precision there makes stacking miserable.
 * Penetrations up to this many pixels are treated as contact, not interpenetration.
 */
export const PLACEMENT_OVERLAP_TOLERANCE = 4;

/** A piece as an oriented rectangle: a rotated plank is a thin diagonal, nothing like its box. */
export interface OrientedRect {
 x: number; y: number; halfW: number; halfH: number; ux: number; uy: number;
}

export function orientedRect(
 obj: Pick<SavedBuildObject, 'x' | 'y' | 'rotation' | 'type'>,
 def: ItemDefinition,
): OrientedRect {
 const rad = (obj.rotation * Math.PI) / 180;
 return {
  x: obj.x, y: obj.y, halfW: def.width / 2, halfH: def.height / 2,
  ux: Math.cos(rad), uy: Math.sin(rad),
 };
}

/**
 * Penetration depth of two oriented rectangles (separating axis test, exact for rectangles).
 * Comparing rotated bounding boxes instead refuses leaning plates that never touch each other,
 * because a 45° plate's box bulges ~25px past its corners.
 * Returns <= 0 when the shapes are apart.
 */
export function orientedPenetration(a: OrientedRect, b: OrientedRect): number {
 const axes = [a.ux, a.uy, -a.uy, a.ux, b.ux, b.uy, -b.uy, b.ux];
 const dx = b.x - a.x;
 const dy = b.y - a.y;
 let min = Number.POSITIVE_INFINITY;
 for (let i = 0; i < axes.length; i += 2) {
  const nx = axes[i];
  const ny = axes[i + 1];
  const radiusA = a.halfW * Math.abs(nx * a.ux + ny * a.uy) + a.halfH * Math.abs(ny * a.ux - nx * a.uy);
  const radiusB = b.halfW * Math.abs(nx * b.ux + ny * b.uy) + b.halfH * Math.abs(ny * b.ux - nx * b.uy);
  const overlap = radiusA + radiusB - Math.abs(dx * nx + dy * ny);
  if (overlap <= 0) return overlap;
  if (overlap < min) min = overlap;
 }
 return min;
}

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

 for (const other of placedObjects) {
  if (other.id === candidate.id) continue;
  const penetration = orientedPenetration(orientedRect(other, defs[other.type]), orientedRect(candidate, defs[candidate.type]));
  if (penetration > PLACEMENT_OVERLAP_TOLERANCE) {
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