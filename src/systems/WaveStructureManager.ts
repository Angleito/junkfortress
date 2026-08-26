import Phaser from 'phaser';
import {
  CHAIN_MAX_HP,
  COLLISION,
  CRUSH_COOLDOWN_MS,
  CRUSH_DAMAGE_FACTOR,
  CRUSH_DAMAGE_MAX,
  CRUSH_MIN_VY,
  CRUSH_SPEED_THRESHOLD,
  MAX_BODY_VELOCITY,
} from '../utils/Constants';
import { ITEM_DEFINITIONS } from '../data/items';
import { computeSupport } from './StructureSystem';
import { runStore } from '../state/runStore';
import type { SavedChain } from '../types/game';
import type { Zombie } from '../entities/Zombie';

export interface BuildObjectPlugin {
  id: string;
  def: { material: string; maxHp: number; shape: string; massKg: number };
  hp: number;
  maxHp: number;
  sprite: Phaser.Physics.Matter.Image | null;
  body: MatterJS.BodyType;
}

interface BodyRuntime {
  img: Phaser.Physics.Matter.Image;
  def: { shape: string; width: number; height: number; massKg: number };
}

interface ChainRuntime {
  constraint: MatterJS.ConstraintType;
  body: MatterJS.BodyType;
  bodyA: MatterJS.BodyType;
  bodyB: MatterJS.BodyType;
}

function pluginOf(body: MatterJS.BodyType): any {
  return (body as any).plugin ?? {};
}

function bodyOf(img: Phaser.Physics.Matter.Image): MatterJS.BodyType | null {
  return img.body as MatterJS.BodyType | null;
}

export class WaveStructureManager {
  private readonly scene: Phaser.Scene;
  private readonly bodies = new Map<string, BodyRuntime>();
  private readonly chains = new Map<string, ChainRuntime>();
  private readonly destroyedIds = new Set<string>();
  private readonly crushCooldowns = new Map<string, number>();
  private readonly chainLayer: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.chainLayer = scene.add.graphics().setDepth(5);
    scene.matter.world.on(Phaser.Physics.Matter.Events.COLLISION_START, this.onCollisionStart, this);
    scene.matter.world.on(Phaser.Physics.Matter.Events.AFTER_UPDATE, this.onAfterUpdate, this);
  }

  spawn(): void {
    const state = runStore.get();
    const { supported, deadChains } = computeSupport(state.placedObjects, state.chains, ITEM_DEFINITIONS);

    for (const obj of state.placedObjects) {
      const def = ITEM_DEFINITIONS[obj.type];
      const isSupported = supported.has(obj.id);
      const img = this.scene.matter.add.image(obj.x, obj.y, obj.type, undefined, {
        isStatic: isSupported,
        shape:
          def.shape === 'circle'
            ? { type: 'circle', radius: def.width / 2 }
            : { type: 'rectangle', width: def.width, height: def.height },
        friction: 0.5,
        frictionStatic: 0.8,
        restitution: 0.05,
        density: isSupported ? undefined : densityFor(def.massKg, def),
      });
      img.setRotation(Phaser.Math.DegToRad(obj.rotation));
      img.setCollisionCategory(COLLISION.BUILD_OBJECT);
      img.setCollidesWith(COLLISION.ALL);
      img.setDepth(5);
      const body = bodyOf(img);
      if (!body) continue;
      (body as any).plugin.buildObject = {
        id: obj.id,
        def,
        hp: obj.hp,
        maxHp: def.maxHp,
        sprite: img,
        body,
      } satisfies BuildObjectPlugin;
      this.bodies.set(obj.id, { img, def });
    }

    for (const chain of deadChains) {
      runStore.removeChain(chain.id);
      runStore.recordStructureLost(chain.id);
    }
    for (const chain of state.chains) {
      this.spawnChain(chain);
    }
  }

  destroyObject(id: string): void {
    if (this.destroyedIds.has(id)) return;
    this.destroyedIds.add(id);
    for (const [chainId, runtime] of this.chains) {
      const chain = runStore.get().chains.find((c) => c.id === chainId);
      if (chain && (chain.anchorA.objectId === id || chain.anchorB.objectId === id)) {
        this.scene.matter.world.removeConstraint(runtime.constraint);
        this.scene.matter.world.remove(runtime.body);
        this.chains.delete(chainId);
      }
    }
    const runtime = this.bodies.get(id);
    if (runtime) {
      const body = bodyOf(runtime.img);
      if (body) this.scene.matter.world.remove(body);
      runtime.img.destroy();
      this.bodies.delete(id);
    }
    runStore.recordStructureLost(id);
    this.recalculate();
  }

  destroyChain(id: string): void {
    if (this.destroyedIds.has(id)) return;
    this.destroyedIds.add(id);
    this.removeChainRuntime(id);
    runStore.removeChain(id);
    runStore.recordStructureLost(id);
    this.recalculate();
  }

  private spawnChain(chain: SavedChain): void {
    const runtimeA = this.bodies.get(chain.anchorA.objectId);
    const runtimeB = this.bodies.get(chain.anchorB.objectId);
    const bodyA = runtimeA ? bodyOf(runtimeA.img) : null;
    const bodyB = runtimeB ? bodyOf(runtimeB.img) : null;
    if (!bodyA || !bodyB) {
      runStore.removeChain(chain.id);
      return;
    }

    const anchorAx = bodyA.position.x + chain.anchorA.x;
    const anchorAy = bodyA.position.y + chain.anchorA.y;
    const anchorBx = bodyB.position.x + chain.anchorB.x;
    const anchorBy = bodyB.position.y + chain.anchorB.y;
    const length = Math.max(Phaser.Math.Distance.Between(anchorAx, anchorAy, anchorBx, anchorBy), 4);

    const constraint = this.scene.matter.add.constraint(bodyA, bodyB, length, 0.6, {
      pointA: { x: chain.anchorA.x, y: chain.anchorA.y },
      pointB: { x: chain.anchorB.x, y: chain.anchorB.y },
    });

    const midX = (anchorAx + anchorBx) / 2;
    const midY = (anchorAy + anchorBy) / 2;
    const angle = Math.atan2(anchorBy - anchorAy, anchorBx - anchorAx);
    const lineBody = this.scene.matter.add.rectangle(midX, midY, length, 6, { isStatic: true });
    this.scene.matter.body.setAngle(lineBody, angle);
    lineBody.collisionFilter.category = COLLISION.BUILD_OBJECT;
    lineBody.collisionFilter.mask = COLLISION.PLAYER_BULLET | COLLISION.ZOMBIE_BULLET;
    (lineBody as any).plugin.buildObject = {
      id: chain.id,
      def: ITEM_DEFINITIONS.chain,
      hp: chain.hp,
      maxHp: CHAIN_MAX_HP,
      sprite: null,
      body: lineBody,
    } satisfies BuildObjectPlugin;

    this.chains.set(chain.id, { constraint, body: lineBody, bodyA, bodyB });
  }

  private removeChainRuntime(id: string): void {
    const chain = this.chains.get(id);
    if (!chain) return;
    this.scene.matter.world.removeConstraint(chain.constraint);
    this.scene.matter.world.remove(chain.body);
    this.chains.delete(id);
  }

  private recalculate(): void {
    const state = runStore.get();
    const first = computeSupport(state.placedObjects, state.chains, ITEM_DEFINITIONS);
    for (const chain of first.deadChains) {
      this.destroyedIds.add(chain.id);
      this.removeChainRuntime(chain.id);
      runStore.removeChain(chain.id);
      runStore.recordStructureLost(chain.id);
    }
    const { supported } = computeSupport(runStore.get().placedObjects, runStore.get().chains, ITEM_DEFINITIONS);
    for (const [id, runtime] of this.bodies) {
      if (supported.has(id)) continue;
      const body = bodyOf(runtime.img);
      if (body && body.isStatic) {
        this.scene.matter.body.setStatic(body, false);
        this.scene.matter.body.setDensity(body, densityFor(runtime.def.massKg, runtime.def));
      }
    }
  }

  private onAfterUpdate(): void {
    for (const { img } of this.bodies.values()) {
      const body = bodyOf(img);
      if (!body || body.isStatic) continue;
      const v = body.velocity;
      const speed = Math.hypot(v.x, v.y);
      if (speed > MAX_BODY_VELOCITY) {
        const scale = MAX_BODY_VELOCITY / speed;
        this.scene.matter.body.setVelocity(body, { x: v.x * scale, y: v.y * scale });
      }
    }
    this.renderChainLines();
  }

  private renderChainLines(): void {
    const g = this.chainLayer;
    g.clear();
    for (const [chainId, runtime] of this.chains) {
      const chain = runStore.get().chains.find((c) => c.id === chainId);
      if (!chain) continue;
      const ax = runtime.bodyA.position.x + chain.anchorA.x;
      const ay = runtime.bodyA.position.y + chain.anchorA.y;
      const bx = runtime.bodyB.position.x + chain.anchorB.x;
      const by = runtime.bodyB.position.y + chain.anchorB.y;
      g.lineStyle(7, 0x8a8a8a, 0.9);
      g.lineBetween(ax, ay, bx, by);
    }
  }

  private onCollisionStart(event: MatterJS.IEventCollision<unknown>): void {
    for (const pair of event.pairs) {
      const { bodyA, bodyB } = pair;
      const normal = (pair as any).collision?.normal ?? { x: 0, y: 0 };
      this.resolveCrush(bodyA as MatterJS.BodyType, bodyB as MatterJS.BodyType, normal.x, normal.y);
      this.resolveCrush(bodyB as MatterJS.BodyType, bodyA as MatterJS.BodyType, -normal.x, -normal.y);
    }
  }

  private resolveCrush(falling: MatterJS.BodyType, other: MatterJS.BodyType, _nx: number, ny: number): void {
    if (ny <= 0) return;
    const zombie = pluginOf(other).zombie as Zombie | undefined;
    const bo = pluginOf(falling).buildObject as BuildObjectPlugin | undefined;
    if (!zombie || !bo || !zombie.sprite.active) return;
    if (bo.def.shape === 'chain') return;
    if (falling.isStatic || falling.velocity.y < CRUSH_MIN_VY) return;

    const key = `${bo.id}:${other.id}`;
    const now = this.scene.time.now;
    if ((this.crushCooldowns.get(key) ?? 0) > now) return;

    const damage = Math.min(
      CRUSH_DAMAGE_MAX,
      Math.max(0, bo.def.massKg * Math.max(0, falling.velocity.y - CRUSH_SPEED_THRESHOLD) * CRUSH_DAMAGE_FACTOR),
    );
    if (damage <= 0) return;
    this.crushCooldowns.set(key, now + CRUSH_COOLDOWN_MS);
    zombie.damage(damage, 'crush');
  }
}

function densityFor(massKg: number, def: { shape: string; width: number; height: number }): number {
  const area = def.shape === 'circle' ? Math.PI * (def.width / 2) ** 2 : def.width * def.height;
  return area > 0 ? massKg / area : 0.001;
}