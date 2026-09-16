import Phaser from 'phaser';
import { COLLISION, CRUSH_COOLDOWN_MS, CRUSH_MIN_VY, MAX_BODY_VELOCITY, STEPS_PER_SECOND } from '../utils/Constants';
import { ITEM_DEFINITIONS } from '../data/items';
import type { ItemDefinition, Material } from '../data/items';
import { runStore } from '../state/runStore';
import { crushDamage } from '../utils/Crush';
import { computeSupport } from './StructureSystem';
import { sfx } from './Audio';
import type { Effects } from './Effects';
import type { ItemType, SavedBuildObject, SavedChain } from '../types/game';
import type { Zombie } from '../entities/Zombie';

export interface StructureTarget {
  id: string;
  x: number;
  y: number;
  angle: number;
  width: number;
  height: number;
  material: Material;
}

export interface ChainSegment {
  id: string;
  ax: number;
  ay: number;
  bx: number;
  by: number;
}

export interface StructureInfo {
  id: string;
  type: ItemType;
  material: Material;
  hp: number;
  maxHp: number;
  x: number;
  y: number;
  rotation: number;
  dynamic: boolean;
}

export interface BuildObjectPlugin {
  id: string;
  def: ItemDefinition;
  hp: number;
  maxHp: number;
  sprite: Phaser.Physics.Matter.Image | null;
  body: MatterJS.BodyType;
}

/** Phaser's pair typings omit `collision`, but Matter fills it in for collision events. */
interface CollisionPair {
  bodyA: MatterJS.BodyType;
  bodyB: MatterJS.BodyType;
  collision: { normal: { x: number; y: number } };
}

interface BodyRuntime {
  def: ItemDefinition;
  img: Phaser.Physics.Matter.Image;
  body: MatterJS.BodyType;
  plugin: BuildObjectPlugin;
  overlay: Phaser.GameObjects.Image | null;
  /** Live geometry handed to the bullet sweep; values refresh in refreshLive(). */
  target: StructureTarget;
  hp: number;
  maxHp: number;
  lastX: number;
  lastY: number;
}

interface ChainRuntime {
  id: string;
  objectAId: string;
  objectBId: string;
  constraint: MatterJS.ConstraintType;
  bodyA: MatterJS.BodyType;
  bodyB: MatterJS.BodyType;
  localAx: number;
  localAy: number;
  localBx: number;
  localBy: number;
  /** Body angles when the constraint was created; Matter rotates anchors by the delta since. */
  angleA: number;
  angleB: number;
  hp: number;
  segment: ChainSegment;
}

const OBJECT_DEPTH = 5;
const OVERLAY_DEPTH = 5.5;
const CHAIN_DEPTH = 6;
/** Matter velocity is px per 16.67ms step; crush and clamp tuning is authored in px/sec. */
const PX_PER_SECOND = STEPS_PER_SECOND;
const CRUSH_MIN_STEP_VY = CRUSH_MIN_VY / PX_PER_SECOND;
const MAX_STEP_SPEED = MAX_BODY_VELOCITY / PX_PER_SECOND;
const OVERLAY_DAMAGE_RATIO = 0.6;
const OVERLAY_MAX_ALPHA = 0.7;
const CHAIN_STIFFNESS = 0.9;
const CHAIN_DAMPING = 0.02;
const CHAIN_MIN_LENGTH = 4;
const CHAIN_LINE_WIDTH = 6;
const CHAIN_INNER_WIDTH = 2;
const CHAIN_DARK_COLOR = 0x2b2d31;
const CHAIN_LIGHT_COLOR = 0x8b939c;
const CHAIN_TICK_SPACING = 15;
const CHAIN_TICK_HALF = 4;
const CHAIN_ANCHOR_RADIUS = 3;
const CHAIN_ANCHOR_COLOR = 0x4a4f57;
const CHAIN_SNAP_BURSTS = 3;
const CHAIN_SNAP_SPARKS = 5;
const CHAIN_SNAP_SHAKE = 3;
const WOOD_DEBRIS_COLOR = 0xa9803f;
const METAL_DEBRIS_COLOR = 0x9aa4ae;
const HIT_SPARKS = 4;
const HIT_SPLINTERS = 4;
/** Past this mass an object is "heavy": louder break, harder crush impact. */
const HEAVY_MASS_KG = 50;
const ANVIL_BREAK_SHAKE = 6;
const CRUSH_SHAKE = 8;
const CRUSH_SHAKE_MS = 160;
const CRUSH_DUST = 5;
/** Sub-pixel nudge that frees a released body from its old resting contact. */
const NUDGE = { x: 0, y: 0.5 };
/** Scratch vectors: the per-frame and per-hit paths must not allocate. */
const VELOCITY = { x: 0, y: 0 };
const ZERO_VELOCITY = { x: 0, y: 0 };
const POSITION = { x: 0, y: 0 };

export class WaveStructureManager {
  private readonly scene: Phaser.Scene;
  private readonly effects: Effects;
  private readonly bodies = new Map<string, BodyRuntime>();
  private readonly chains = new Map<string, ChainRuntime>();
  private readonly crushCooldowns = new Map<string, number>();
  private readonly chainLayer: Phaser.GameObjects.Graphics;
  private readonly targetList: StructureTarget[] = [];
  private readonly segmentList: ChainSegment[] = [];
  private readonly detachedChainIds: string[] = [];
  private refreshedAt = Number.NaN;

  constructor(scene: Phaser.Scene, opts: { effects: Effects }) {
    this.scene = scene;
    this.effects = opts.effects;
    this.chainLayer = scene.add.graphics().setDepth(CHAIN_DEPTH);
    scene.matter.world.on(Phaser.Physics.Matter.Events.COLLISION_START, this.onCollisionStart, this);
  }

  spawn(): void {
    const state = runStore.get();

    // A chain with no hp or a missing anchor is a build leftover: drop it, do not count it as a loss.
    const liveChains: { chain: SavedChain; a: SavedBuildObject; b: SavedBuildObject }[] = [];
    for (const chain of state.chains) {
      const a = state.placedObjects.find((obj) => obj.id === chain.anchorA.objectId);
      const b = state.placedObjects.find((obj) => obj.id === chain.anchorB.objectId);
      if (chain.hp <= 0 || a === undefined || b === undefined) {
        runStore.removeChain(chain.id);
        continue;
      }
      liveChains.push({ chain, a, b });
    }

    // Support ignoring chains tells us what stands on its own. A live chain then pulls loose the
    // end that hangs below it, so a chained anvil swings instead of welding to whatever it happens
    // to touch; the end above it keeps its footing and anchors the chain.
    const grounded = computeSupport(state.placedObjects, [], ITEM_DEFINITIONS).supported;
    const hanging = new Set<string>();
    for (const { chain, a, b } of liveChains) {
      const anchorAy = a.y + chain.anchorA.y;
      const anchorBy = b.y + chain.anchorB.y;
      // Only the end that sits lower on screen is being borne; a level chain frees neither.
      if (anchorAy > anchorBy) hanging.add(a.id);
      else if (anchorBy > anchorAy) hanging.add(b.id);
    }

    for (const obj of state.placedObjects) {
      this.spawnObject(obj, grounded.has(obj.id) && !hanging.has(obj.id));
    }
    for (const { chain } of liveChains) {
      this.spawnChain(chain);
    }
    this.invalidateLive();
  }

  update(): void {
    this.refreshLive();
    this.renderChains();
    this.updateBodies();
  }

  damageObject(id: string, amount: number, hit?: { x: number; y: number }): boolean {
    const rt = this.bodies.get(id);
    if (rt === undefined || amount <= 0) return false;

    rt.hp = Math.max(0, rt.hp - amount);
    rt.plugin.hp = rt.hp;
    runStore.updateObjectHp(id, rt.hp);
    this.updateDamageVisual(rt);

    const x = hit ? hit.x : rt.body.position.x;
    const y = hit ? hit.y : rt.body.position.y;
    if (rt.def.material === 'wood') {
      this.effects.splinters(x, y, HIT_SPLINTERS);
      sfx.woodHit();
    } else {
      this.effects.sparks(x, y, 0, -1, HIT_SPARKS);
      sfx.metalHit();
    }

    if (rt.hp > 0) return false;
    this.destroyObject(id);
    return true;
  }

  destroyObject(id: string): void {
    const rt = this.bodies.get(id);
    if (rt === undefined) return;

    // Chains die with their anchors, so detach them first and let the hanging load go.
    const detached = this.detachedChainIds;
    detached.length = 0;
    for (const [chainId, cr] of this.chains) {
      if (cr.objectAId === id || cr.objectBId === id) detached.push(chainId);
    }
    for (let i = 0; i < detached.length; i++) this.destroyChain(detached[i]);

    this.scene.matter.world.remove(rt.body);
    rt.img.destroy();
    if (rt.overlay !== null) rt.overlay.destroy();
    this.bodies.delete(id);
    const targetIndex = this.targetList.indexOf(rt.target);
    if (targetIndex !== -1) this.targetList.splice(targetIndex, 1);
    this.dropCrushCooldowns(id);
    runStore.recordStructureLost(id);

    const x = rt.body.position.x;
    const y = rt.body.position.y;
    const heavy = rt.def.massKg >= HEAVY_MASS_KG;
    if (rt.def.material === 'wood') {
      this.effects.debris(x, y, WOOD_DEBRIS_COLOR, heavy ? 16 : 10);
      this.effects.splinters(x, y, heavy ? 12 : 8);
      sfx.woodBreak();
    } else {
      this.effects.debris(x, y, METAL_DEBRIS_COLOR, heavy ? 14 : 8);
      this.effects.sparks(x, y, 0, -1, heavy ? 14 : 10);
      if (heavy) this.effects.shake(ANVIL_BREAK_SHAKE);
      sfx.metalBreak();
    }

    this.recalculate();
    this.invalidateLive();
  }

  damageChain(id: string, amount: number, hit?: { x: number; y: number }): boolean {
    const cr = this.chains.get(id);
    if (cr === undefined || amount <= 0) return false;

    cr.hp = Math.max(0, cr.hp - amount);
    runStore.updateChainHp(id, cr.hp);

    const x = hit ? hit.x : (cr.segment.ax + cr.segment.bx) / 2;
    const y = hit ? hit.y : (cr.segment.ay + cr.segment.by) / 2;
    this.effects.sparks(x, y, 0, -1, HIT_SPARKS);
    sfx.metalHit();

    if (cr.hp > 0) return false;
    this.destroyChain(id);
    return true;
  }

  destroyChain(id: string): void {
    const cr = this.chains.get(id);
    if (cr === undefined) return;

    this.scene.matter.world.removeConstraint(cr.constraint);
    this.chains.delete(id);
    const segmentIndex = this.segmentList.indexOf(cr.segment);
    if (segmentIndex !== -1) this.segmentList.splice(segmentIndex, 1);
    runStore.removeChain(id);
    runStore.recordStructureLost(id);

    sfx.chainSnap();
    // Sparks along the whole length so the snap reads even when the chain is off centre.
    const { ax, ay, bx, by } = cr.segment;
    for (let i = 0; i < CHAIN_SNAP_BURSTS; i++) {
      const t = (i + 1) / (CHAIN_SNAP_BURSTS + 1);
      this.effects.sparks(ax + (bx - ax) * t, ay + (by - ay) * t, 0, -1, CHAIN_SNAP_SPARKS);
    }
    this.effects.shake(CHAIN_SNAP_SHAKE);

    this.recalculate();
    this.invalidateLive();
  }

  getTargets(): readonly StructureTarget[] {
    this.refreshLive();
    return this.targetList;
  }

  getChainSegments(): readonly ChainSegment[] {
    this.refreshLive();
    return this.segmentList;
  }

  dynamicCount(): number {
    let count = 0;
    for (const rt of this.bodies.values()) {
      if (!rt.body.isStatic) count += 1;
    }
    return count;
  }

  chainCount(): number {
    return this.chains.size;
  }

  forEachObject(cb: (info: StructureInfo) => void): void {
    for (const rt of this.bodies.values()) {
      cb({
        id: rt.target.id,
        type: rt.def.id,
        material: rt.def.material,
        hp: rt.hp,
        maxHp: rt.maxHp,
        x: rt.body.position.x,
        y: rt.body.position.y,
        rotation: rt.body.angle,
        dynamic: !rt.body.isStatic,
      });
    }
  }

  private spawnObject(obj: SavedBuildObject, supported: boolean): void {
    const def = ITEM_DEFINITIONS[obj.type];
    const img = this.scene.matter.add.image(obj.x, obj.y, obj.type, undefined, {
      shape: { type: 'rectangle', width: def.width, height: def.height },
      density: densityFor(def),
      friction: 0.6,
      frictionStatic: 0.9,
      restitution: 0.04,
    });
    // Matter only snapshots the mass/inertia it later restores when a *dynamic* body is made
    // static, so a body created static could never be released again without turning into
    // Infinity mass (and NaN geometry). Spawn dynamic, then freeze if the build supports it.
    if (supported) this.scene.matter.body.setStatic(img.body as MatterJS.BodyType, true);
    img.setRotation(Phaser.Math.DegToRad(obj.rotation));
    img.setCollisionCategory(COLLISION.BUILD_OBJECT);
    img.setCollidesWith(COLLISION.ALL);
    img.setDepth(OBJECT_DEPTH);

    const body = img.body as MatterJS.BodyType;
    const plugin: BuildObjectPlugin = { id: obj.id, def, hp: obj.hp, maxHp: def.maxHp, sprite: img, body };
    body.plugin.buildObject = plugin;

    // Overlay art matches plank and metal sheet 1:1; the anvil stretches the dent tile.
    const overlay = this.scene.add
      .image(obj.x, obj.y, def.material === 'wood' ? 'crack' : 'dent')
      .setDisplaySize(def.width, def.height)
      .setRotation(Phaser.Math.DegToRad(obj.rotation))
      .setDepth(OVERLAY_DEPTH)
      .setAlpha(0)
      .setVisible(false);

    const target: StructureTarget = {
      id: obj.id,
      x: obj.x,
      y: obj.y,
      angle: body.angle,
      width: def.width,
      height: def.height,
      material: def.material,
    };
    const rt: BodyRuntime = {
      def,
      img,
      body,
      plugin,
      overlay,
      target,
      hp: obj.hp,
      maxHp: def.maxHp,
      lastX: obj.x,
      lastY: obj.y,
    };
    this.bodies.set(obj.id, rt);
    this.targetList.push(target);
    this.updateDamageVisual(rt);
  }

  private spawnChain(chain: SavedChain): void {
    const runtimeA = this.bodies.get(chain.anchorA.objectId);
    const runtimeB = this.bodies.get(chain.anchorB.objectId);
    if (runtimeA === undefined || runtimeB === undefined) {
      runStore.removeChain(chain.id);
      return;
    }

    const localAx = chain.anchorA.x;
    const localAy = chain.anchorA.y;
    const localBx = chain.anchorB.x;
    const localBy = chain.anchorB.y;
    const ax = runtimeA.body.position.x + localAx;
    const ay = runtimeA.body.position.y + localAy;
    const bx = runtimeB.body.position.x + localBx;
    const by = runtimeB.body.position.y + localBy;
    const length = Math.max(Math.hypot(bx - ax, by - ay), CHAIN_MIN_LENGTH);

    const constraint = this.scene.matter.add.constraint(runtimeA.body, runtimeB.body, length, CHAIN_STIFFNESS, {
      pointA: { x: localAx, y: localAy },
      pointB: { x: localBx, y: localBy },
      damping: CHAIN_DAMPING,
    });

    const segment: ChainSegment = { id: chain.id, ax, ay, bx, by };
    this.chains.set(chain.id, {
      id: chain.id,
      objectAId: chain.anchorA.objectId,
      objectBId: chain.anchorB.objectId,
      constraint,
      bodyA: runtimeA.body,
      bodyB: runtimeB.body,
      localAx,
      localAy,
      localBx,
      localBy,
      angleA: runtimeA.body.angle,
      angleB: runtimeB.body.angle,
      hp: chain.hp,
      segment,
    });
    this.segmentList.push(segment);
  }

  private updateDamageVisual(rt: BodyRuntime): void {
    const overlay = rt.overlay;
    if (overlay === null) return;
    const ratio = rt.maxHp > 0 ? rt.hp / rt.maxHp : 0;
    if (ratio >= OVERLAY_DAMAGE_RATIO) {
      overlay.setVisible(false);
      return;
    }
    overlay.setAlpha(OVERLAY_MAX_ALPHA * (1 - ratio / OVERLAY_DAMAGE_RATIO));
    overlay.setVisible(true);
  }

  /** Recomputes support and releases anything that just lost its footing. */
  private recalculate(): void {
    const state = runStore.get();
    const { supported } = computeSupport(state.placedObjects, state.chains, ITEM_DEFINITIONS);

    for (const rt of this.bodies.values()) {
      if (supported.has(rt.target.id) || !rt.body.isStatic) continue;
      // K5: a released body keeps its pose and gets no velocity, just a sub-pixel nudge so the
      // solver sees it as free instead of still resting on the neighbour that just went away.
      this.scene.matter.body.setStatic(rt.body, false);
      this.scene.matter.body.setDensity(rt.body, densityFor(rt.def));
      this.scene.matter.body.translate(rt.body, NUDGE);
    }
  }

  /** Clamp and repair dynamic bodies, then keep damage overlays glued to their objects. */
  private updateBodies(): void {
    for (const rt of this.bodies.values()) {
      const body = rt.body;
      const x = body.position.x;
      const y = body.position.y;

      if (Number.isFinite(x) && Number.isFinite(y)) {
        rt.lastX = x;
        rt.lastY = y;
        const vx = body.velocity.x;
        const vy = body.velocity.y;
        if (!Number.isFinite(vx) || !Number.isFinite(vy)) {
          this.scene.matter.body.setVelocity(body, ZERO_VELOCITY);
        } else {
          const speed = Math.hypot(vx, vy);
          if (speed > MAX_STEP_SPEED) {
            // Scale instead of zeroing: a slowed heavy body still reads as weight, a frozen one as a bug.
            const k = MAX_STEP_SPEED / speed;
            VELOCITY.x = vx * k;
            VELOCITY.y = vy * k;
            this.scene.matter.body.setVelocity(body, VELOCITY);
          }
        }
      } else {
        POSITION.x = rt.lastX;
        POSITION.y = rt.lastY;
        this.scene.matter.body.setPosition(body, POSITION);
        this.scene.matter.body.setVelocity(body, ZERO_VELOCITY);
        if (!Number.isFinite(body.angle)) this.scene.matter.body.setAngle(body, 0);
      }

      const overlay = rt.overlay;
      if (overlay !== null && overlay.visible) {
        overlay.setPosition(body.position.x, body.position.y);
        overlay.setRotation(body.angle);
      }
    }
  }

  private refreshLive(): void {
    const stamp = this.scene.time.now;
    if (stamp === this.refreshedAt) return;
    this.refreshedAt = stamp;

    for (const rt of this.bodies.values()) {
      const target = rt.target;
      target.x = rt.body.position.x;
      target.y = rt.body.position.y;
      target.angle = rt.body.angle;
    }

    for (const cr of this.chains.values()) {
      const segment = cr.segment;
      const bodyA = cr.bodyA;
      const deltaA = bodyA.angle - cr.angleA;
      if (deltaA === 0) {
        segment.ax = bodyA.position.x + cr.localAx;
        segment.ay = bodyA.position.y + cr.localAy;
      } else {
        const cos = Math.cos(deltaA);
        const sin = Math.sin(deltaA);
        segment.ax = bodyA.position.x + cr.localAx * cos - cr.localAy * sin;
        segment.ay = bodyA.position.y + cr.localAx * sin + cr.localAy * cos;
      }

      const bodyB = cr.bodyB;
      const deltaB = bodyB.angle - cr.angleB;
      if (deltaB === 0) {
        segment.bx = bodyB.position.x + cr.localBx;
        segment.by = bodyB.position.y + cr.localBy;
      } else {
        const cos = Math.cos(deltaB);
        const sin = Math.sin(deltaB);
        segment.bx = bodyB.position.x + cr.localBx * cos - cr.localBy * sin;
        segment.by = bodyB.position.y + cr.localBx * sin + cr.localBy * cos;
      }
    }
  }

  private invalidateLive(): void {
    this.refreshedAt = Number.NaN;
  }

  private renderChains(): void {
    const g = this.chainLayer;
    g.clear();
    if (this.chains.size === 0) return;

    for (const cr of this.chains.values()) {
      const { ax, ay, bx, by } = cr.segment;
      g.lineStyle(CHAIN_LINE_WIDTH, CHAIN_DARK_COLOR, 1);
      g.lineBetween(ax, ay, bx, by);
      g.lineStyle(CHAIN_INNER_WIDTH, CHAIN_LIGHT_COLOR, 1);
      g.lineBetween(ax, ay, bx, by);

      const dx = bx - ax;
      const dy = by - ay;
      const length = Math.hypot(dx, dy);
      if (length > CHAIN_TICK_SPACING) {
        const ux = dx / length;
        const uy = dy / length;
        for (let d = CHAIN_TICK_SPACING * 0.5; d < length; d += CHAIN_TICK_SPACING) {
          const px = ax + ux * d;
          const py = ay + uy * d;
          g.lineBetween(px - uy * CHAIN_TICK_HALF, py + ux * CHAIN_TICK_HALF, px + uy * CHAIN_TICK_HALF, py - ux * CHAIN_TICK_HALF);
        }
      }

      g.fillStyle(CHAIN_ANCHOR_COLOR, 1);
      g.fillCircle(ax, ay, CHAIN_ANCHOR_RADIUS);
      g.fillCircle(bx, by, CHAIN_ANCHOR_RADIUS);
    }
  }

  private dropCrushCooldowns(objectId: string): void {
    const prefix = `${objectId}:`;
    for (const key of this.crushCooldowns.keys()) {
      if (key.startsWith(prefix)) this.crushCooldowns.delete(key);
    }
  }

  private onCollisionStart(event: MatterJS.IEventCollision<MatterJS.BodyType>): void {
    const pairs = event.pairs as unknown as CollisionPair[];
    for (let i = 0; i < pairs.length; i++) {
      const pair = pairs[i];
      this.resolveCrush(pair.bodyA, pair.bodyB, pair.collision.normal.x, pair.collision.normal.y);
      this.resolveCrush(pair.bodyB, pair.bodyA, pair.collision.normal.x, pair.collision.normal.y);
    }
  }

  private resolveCrush(falling: MatterJS.BodyType, other: MatterJS.BodyType, nx: number, ny: number): void {
    const buildObject = falling.plugin.buildObject as BuildObjectPlugin | undefined;
    const zombie = other.plugin.zombie as Zombie | undefined;
    if (buildObject === undefined || zombie === undefined) return;

    // Matter's normal direction depends on pair ordering, so orient it faller -> other ourselves.
    const dx = other.position.x - falling.position.x;
    const dy = other.position.y - falling.position.y;
    if (nx * dx + ny * dy < 0) {
      nx = -nx;
      ny = -ny;
    }
    if (ny <= 0 || falling.isStatic || falling.velocity.y < CRUSH_MIN_STEP_VY) return;

    const key = `${buildObject.id}:${other.id}`;
    const now = this.scene.time.now;
    if ((this.crushCooldowns.get(key) ?? 0) > now) return;

    const damage = crushDamage(buildObject.def.massKg, falling.velocity.y * PX_PER_SECOND);
    if (damage <= 0) return;
    this.crushCooldowns.set(key, now + CRUSH_COOLDOWN_MS);

    zombie.damage(damage, 'crush');
    this.effects.dust(falling.position.x, falling.position.y, CRUSH_DUST);
    this.effects.shake(CRUSH_SHAKE, CRUSH_SHAKE_MS);
    if (buildObject.def.massKg >= HEAVY_MASS_KG) sfx.anvilImpact();
    else sfx.crush();
  }
}

function densityFor(def: ItemDefinition): number {
  const area = def.width * def.height;
  return area > 0 ? def.massKg / area : 0.001;
}
