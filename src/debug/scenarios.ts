import { ITEM_DEFINITIONS } from '../data/items';
import type { ItemDefinition } from '../data/items';
import { CHAIN_MAX_HP, GROUND_Y, ZOMBIE_SPAWN_X } from '../utils/Constants';
import { DEFAULT_SEED } from '../utils/rng';
import { runStore } from '../state/runStore';
import type { ItemType, SavedBuildObject, SavedChain } from '../types/game';

export interface ScenarioZombie {
 x: number;
 y: number;
 at: number;
 stationary?: boolean;
 aimAt?: { x: number; y: number };
}

export interface ScenarioTrigger {
 at: number;
 action: 'destroy' | 'break-chain';
 id: string;
}

export interface DebugScenario {
 name: string;
 hp?: { player?: number; core?: number };
 build?: { placedObjects: SavedBuildObject[]; chains?: SavedChain[] };
 zombies: ScenarioZombie[];
 triggers?: ScenarioTrigger[];
}

/** Zombie body is 34x54 (entities/Zombie.ts), so a standing zombie's center rides 27px above the ground. */
const ZOMBIE_REST_Y = GROUND_Y - 27;

/** Top edge of a plank stood on end: the highest point any post standing on the ground can reach. */
const POST_TOP_Y = GROUND_Y - ITEM_DEFINITIONS.plank.width;

const RICOCHET_SHOOTER_X = 1140;
const RICOCHET_AIM_DEG = 85;
const RICOCHET_AIM_DIST = 160;
const RICOCHET_OUT_DEG = 26;
const RICOCHET_LANDING_MIN = 560;
const RICOCHET_LANDING_MAX = 940;

/**
 * Anvil rig chain drop. A plank post tops out 160px over the ground, so the lintel underside sits
 * at y=500 and the whole hang has to fit between that and the zombie's head at y=606: the drop plus
 * the anvil's 45px height must leave a real fall, or the crush never reaches CRUSH_MIN_VY.
 */
const ANVIL_DROP = 20;

function buildObject(id: string, type: ItemType, x: number, y: number, rotation: number): SavedBuildObject {
 return { id, type, x, y, rotation, hp: ITEM_DEFINITIONS[type].maxHp };
}

/** A plank stood on end, its foot on the ground and its top at POST_TOP_Y. */
function standingPlank(id: string, x: number): SavedBuildObject {
 return buildObject(id, 'plank', x, GROUND_Y - ITEM_DEFINITIONS.plank.width / 2, 90);
}

function zombie(x: number, opts: Omit<ScenarioZombie, 'x' | 'y' | 'at'> = {}): ScenarioZombie {
 return { x, y: ZOMBIE_REST_Y, at: 0, ...opts };
}

/**
 * Midpoint of the x-window where a rotated slab crosses a horizontal line. Used to park the support
 * post under the plate at the one height a standing plank can actually touch.
 */
function slabCrossingX(center: { x: number; y: number }, axis: { x: number; y: number }, level: number, def: ItemDefinition): number {
 const normal = { x: -axis.y, y: axis.x };
 const hw = def.width / 2;
 const hh = def.height / 2;
 const corners = [
  { a: hw, b: hh },
  { a: hw, b: -hh },
  { a: -hw, b: hh },
  { a: -hw, b: -hh },
 ].map(({ a, b }) => ({
  x: center.x + a * axis.x + b * normal.x,
  y: center.y + a * axis.y + b * normal.y,
 }));

 let min = Number.POSITIVE_INFINITY;
 let max = Number.NEGATIVE_INFINITY;
 for (let i = 0; i < corners.length; i++) {
  const p = corners[i];
  const q = corners[(i + 1) % corners.length];
  if (p.y === q.y || (p.y - level) * (q.y - level) > 0) continue;
  const x = p.x + ((level - p.y) / (q.y - p.y)) * (q.x - p.x);
  if (x < min) min = x;
  if (x > max) max = x;
 }
 return min <= max ? (min + max) / 2 : center.x;
}

/**
 * Money shot rig: a real zombie fires a real bullet at a real static metal sheet, which bounces it
 * into a second real zombie. Chosen shot geometry is 85 degrees up over 160px, leaving the plate at
 * 26 degrees: that long shallow return is what makes the kill readable on screen.
 */
function ricochetScenario(): DebugScenario {
 const shooter = { x: RICOCHET_SHOOTER_X, y: ZOMBIE_REST_Y };
 const inRad = (RICOCHET_AIM_DEG * Math.PI) / 180;
 const outRad = (RICOCHET_OUT_DEG * Math.PI) / 180;
 const contact = {
  x: shooter.x - RICOCHET_AIM_DIST * Math.cos(inRad),
  y: shooter.y - RICOCHET_AIM_DIST * Math.sin(inRad),
 };
 const out = { x: -Math.cos(outRad), y: Math.sin(outRad) };

 const dLen = Math.hypot(contact.x - shooter.x, contact.y - shooter.y);
 const d = { x: (contact.x - shooter.x) / dLen, y: (contact.y - shooter.y) / dLen };
 const nLen = Math.hypot(d.x - out.x, d.y - out.y);
 const n = { x: (d.x - out.x) / nLen, y: (d.y - out.y) / nLen };
 const face = { x: -n.x, y: -n.y };

 // The mirror normal n = normalize(d - out) is the slab face that turns the incoming shot onto the
 // outgoing ray, so the rotation is derived - atan2(n.y, n.x) + 90 degrees - never authored by hand.
 const rotation = (Math.atan2(n.y, n.x) * (180 / Math.PI) + 90 + 180) % 180;
 const axis = { x: Math.cos((rotation * Math.PI) / 180), y: Math.sin((rotation * Math.PI) / 180) };

 const sheet = ITEM_DEFINITIONS.metal_sheet;
 // The bullet meets the face pointing back at the shooter, so the slab center sits half a
 // thickness behind the contact point along that face normal.
 const center = {
  x: contact.x - (sheet.height / 2) * face.x,
  y: contact.y - (sheet.height / 2) * face.y,
 };
 const landing = Math.min(
  RICOCHET_LANDING_MAX,
  Math.max(RICOCHET_LANDING_MIN, contact.x + (out.x / out.y) * (ZOMBIE_REST_Y - contact.y)),
 );

 // A vertical post under the plate's face would stand in the incoming shot, so it goes where the
 // slab crosses the post's own top height: past the contact, clear of the bullet's flight path.
 const postX = slabCrossingX(center, axis, POST_TOP_Y, sheet);

 return {
  name: 'ricochet',
  build: {
   placedObjects: [
    standingPlank('ricochet-post', postX),
    buildObject('ricochet-plate', 'metal_sheet', center.x, center.y, rotation),
   ],
  },
  zombies: [
   zombie(shooter.x, {
    stationary: true,
    // Aiming past the plate keeps the shot direction stable no matter where the zombie's muzzle
    // sits: both a muzzle-relative and a body-relative angle land within a few pixels.
    aimAt: { x: contact.x + (contact.x - shooter.x), y: contact.y + (contact.y - shooter.y) },
   }),
   zombie(landing, { stationary: true }),
  ],
 };
}

/** Post breaks at 1500ms; the sheet above loses support and has to fall. */
function collapseScenario(): DebugScenario {
 const postId = 'collapse-post';
 const postX = 700;
 const sheet = ITEM_DEFINITIONS.metal_sheet;
 return {
  name: 'collapse',
  build: {
   placedObjects: [
    standingPlank(postId, postX),
    buildObject('collapse-sheet', 'metal_sheet', postX, POST_TOP_Y - sheet.height / 2, 0),
   ],
  },
  zombies: [zombie(ZOMBIE_SPAWN_X, { stationary: true })],
  triggers: [{ at: 1500, action: 'destroy', id: postId }],
 };
}

/**
 * Anvil rig: lintel on two posts, chain hanging from mid-span, anvil swinging on the chain above a
 * zombie at the same x, chain cut at 1500ms. Every y is derived from ITEM_DEFINITIONS so the drop
 * stays clear of the posts (689..711 and 849..871) and lands on the zombie's head.
 */
function anvilScenario(): DebugScenario {
 const postLeft = 700;
 const postRight = 860;
 const mid = (postLeft + postRight) / 2;
 const plank = ITEM_DEFINITIONS.plank;
 const anvil = ITEM_DEFINITIONS.anvil;
 const lintelId = 'anvil-lintel';
 const anvilId = 'anvil-body';
 const chainId = 'anvil-chain';

 const lintelY = POST_TOP_Y - plank.height / 2;
 // The anvil hangs ANVIL_DROP below the lintel's underside: its top face is the chain's lower anchor,
 // so the anvil's center sits a further half-height down.
 const anvilY = POST_TOP_Y + ANVIL_DROP + anvil.height / 2;

 return {
  name: 'anvil',
  build: {
   placedObjects: [
    standingPlank('anvil-post-left', postLeft),
    standingPlank('anvil-post-right', postRight),
    buildObject(lintelId, 'plank', mid, lintelY, 0),
    buildObject(anvilId, 'anvil', mid, anvilY, 0),
   ],
   chains: [
    {
     id: chainId,
     anchorA: { objectId: lintelId, x: 0, y: plank.height / 2 },
     anchorB: { objectId: anvilId, x: 0, y: -anvil.height / 2 },
     hp: CHAIN_MAX_HP,
    },
   ],
  },
  zombies: [zombie(mid, { stationary: true })],
  triggers: [{ at: 1500, action: 'break-chain', id: chainId }],
 };
}

/** Harness kills these two with real clicks; nothing else spawns and nothing attacks the core. */
function victoryScenario(): DebugScenario {
 return {
  name: 'victory',
  zombies: [zombie(760, { stationary: true }), zombie(900, { stationary: true })],
 };
}

/**
 * A stationary zombie halts short of ZOMBIE_STOP_X and never swings at the core, so the attacker
 * walks the last stretch itself: two swings empty an 80 hp core within seconds.
 */
function defeatScenario(): DebugScenario {
 return {
  name: 'defeat',
  hp: { core: 80 },
  zombies: [zombie(310), zombie(ZOMBIE_SPAWN_X, { stationary: true })],
 };
}

export const SCENARIOS: Record<string, DebugScenario> = {
 ricochet: ricochetScenario(),
 collapse: collapseScenario(),
 anvil: anvilScenario(),
 victory: victoryScenario(),
 defeat: defeatScenario(),
};

/** Writes a rig into the run store: fresh seeded run, the rig's build, hp overrides, wave phase. */
export function applyScenario(scenario: DebugScenario): void {
 const state = runStore.reset(DEFAULT_SEED);
 const build = scenario.build;
 if (build) {
  runStore.setPlacedObjects(build.placedObjects);
  for (const chain of build.chains ?? []) runStore.addChain(chain);
 }
 // The store only exposes damage helpers, so rig hp overrides write the live state directly.
 if (scenario.hp?.player !== undefined) state.playerHp = scenario.hp.player;
 if (scenario.hp?.core !== undefined) state.coreHp = scenario.hp.core;
 runStore.setPhase('wave');
}
