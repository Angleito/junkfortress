import Phaser from 'phaser';
import { COLLISION, BULLET_MAX_RICOCHETS, BULLET_LIFETIME_MS, BULLET_CLEANUP_MARGIN, GAME_WIDTH, GAME_HEIGHT, MAX_ACTIVE_BULLETS } from '../utils/Constants';
import { WEAPONS, type WeaponType } from '../data/gameData';
import { MATERIAL_DAMAGE_MULTIPLIER, type Material } from '../data/items';
import { runStore } from '../state/runStore';
import { applyRicochet, jitteredAngle, velocityFromAngle } from '../utils/BulletMath';
import type { Zombie } from './Zombie';

interface BulletData {
  owner: 'player' | 'zombie';
  sourceWeapon: WeaponType;
  damage: number;
  ricochetCount: number;
  maxRicochets: number;
  canDamageZombies: boolean;
}

interface BulletEntry {
  img: Phaser.Physics.Matter.Image;
  data: BulletData;
  alive: boolean;
  spawnTime: number;
}

interface BuildObjectPlugin {
  id: string;
  def: { material: string; maxHp: number; shape: string };
  hp: number;
  maxHp: number;
  sprite: Phaser.Physics.Matter.Image | null;
}

export interface BulletHandlers {
  onObjectDestroyed?: (id: string) => void;
  onChainDestroyed?: (id: string) => void;
}

function bodyOf(img: Phaser.Physics.Matter.Image): MatterJS.BodyType | null {
  return img.body as MatterJS.BodyType | null;
}

function pluginOf(body: MatterJS.BodyType): any {
  return (body as any).plugin ?? {};
}

export class BulletManager {
  private readonly scene: Phaser.Scene;
  private readonly pool: BulletEntry[] = [];
  private readonly handlers: BulletHandlers;

  constructor(scene: Phaser.Scene, handlers: BulletHandlers = {}) {
    this.scene = scene;
    this.handlers = handlers;
    scene.matter.world.on(Phaser.Physics.Matter.Events.COLLISION_START, this.onCollisionStart, this);
  }

  firePlayer(x: number, y: number, angle: number): void {
    this.fire(x, y, angle, 'player');
  }

  fireZombie(x: number, y: number, angle: number): void {
    this.fire(x, y, angle, 'zombie');
    runStore.recordBulletFired();
  }

  update(time: number): void {
    for (const b of this.pool) {
      if (!b.alive) continue;
      const img = b.img;
      if (time - b.spawnTime > BULLET_LIFETIME_MS) {
        this.kill(b);
        continue;
      }
      if (
        img.x < -BULLET_CLEANUP_MARGIN ||
        img.x > GAME_WIDTH + BULLET_CLEANUP_MARGIN ||
        img.y < -BULLET_CLEANUP_MARGIN ||
        img.y > GAME_HEIGHT + BULLET_CLEANUP_MARGIN
      ) {
        this.kill(b);
        continue;
      }
      const body = bodyOf(img);
      if (body && Math.hypot(body.velocity.x, body.velocity.y) < 10) this.kill(b);
    }
  }

  private fire(x: number, y: number, angle: number, owner: 'player' | 'zombie'): void {
    const stats = owner === 'player' ? WEAPONS.survivor_pistol : WEAPONS.zombie_pistol;
    const sourceWeapon: WeaponType = owner === 'player' ? 'survivor_pistol' : 'zombie_pistol';
    const a = jitteredAngle(angle, stats.spreadDeg);
    const { vx, vy } = velocityFromAngle(a, stats.bulletSpeed);
    const b = this.acquire();
    if (!b) return;

    b.data = {
      owner,
      sourceWeapon,
      damage: stats.damage,
      ricochetCount: 0,
      maxRicochets: BULLET_MAX_RICOCHETS,
      canDamageZombies: owner === 'player',
    };
    b.alive = true;
    b.spawnTime = this.scene.time.now;

    const img = b.img;
    const body = bodyOf(img);
    if (!body) return;
    img.setPosition(x, y);
    img.setRotation(a);
    img.setActive(true).setVisible(true);

    if (owner === 'player') {
      img.setCollisionCategory(COLLISION.PLAYER_BULLET);
      img.setCollidesWith(COLLISION.ZOMBIE | COLLISION.BUILD_OBJECT | COLLISION.GROUND);
    } else {
      img.setCollisionCategory(COLLISION.ZOMBIE_BULLET);
      img.setCollidesWith(COLLISION.PLAYER | COLLISION.ZOMBIE | COLLISION.BUILD_OBJECT | COLLISION.CORE | COLLISION.GROUND);
    }

    this.scene.matter.world.add(body);
    img.setVelocity(vx, vy);
  }

  private acquire(): BulletEntry | null {
    const existing = this.pool.find((b) => !b.alive);
    if (existing) return existing;
    if (this.pool.length >= MAX_ACTIVE_BULLETS) return null;

    const img = this.scene.matter.add.image(0, 0, 'bullet');
    img.setBody({ type: 'circle', radius: 4 });
    img.setSensor(true);
    img.setIgnoreGravity(true);
    img.setDepth(30);
    img.setActive(false).setVisible(false);

    const entry: BulletEntry = { img, data: { owner: 'player', sourceWeapon: 'survivor_pistol', damage: 0, ricochetCount: 0, maxRicochets: 0, canDamageZombies: false }, alive: false, spawnTime: 0 };
    const body = bodyOf(img);
    if (body) (body as any).plugin.bullet = entry;
    this.pool.push(entry);
    return entry;
  }

  private kill(b: BulletEntry): void {
    if (!b.alive) return;
    b.alive = false;
    const body = bodyOf(b.img);
    if (body) this.scene.matter.world.remove(body);
    b.img.setActive(false).setVisible(false);
  }

  private onCollisionStart(event: MatterJS.IEventCollision<unknown>): void {
    for (const pair of event.pairs) {
      const { bodyA, bodyB } = pair;
      const normal = (pair as any).collision?.normal ?? { x: 0, y: 0 };
      this.resolveBullet(bodyA as MatterJS.BodyType, bodyB as MatterJS.BodyType, normal.x, normal.y);
      this.resolveBullet(bodyB as MatterJS.BodyType, bodyA as MatterJS.BodyType, -normal.x, -normal.y);
    }
  }

  private resolveBullet(bulletBody: MatterJS.BodyType, other: MatterJS.BodyType, nx: number, ny: number): void {
    const b = pluginOf(bulletBody).bullet as BulletEntry | undefined;
    if (!b || !b.alive) return;

    const plugin = pluginOf(other) as {
      buildObject?: BuildObjectPlugin;
      zombie?: Zombie;
      player?: boolean;
      core?: boolean;
      ground?: boolean;
    };

    if (plugin.buildObject) this.hitBuildObject(b, plugin.buildObject, nx, ny);
    else if (plugin.zombie) this.hitZombie(b, plugin.zombie);
    else if (plugin.player) this.hitPlayer(b);
    else if (plugin.core) this.hitCore(b);
    else if (plugin.ground) this.kill(b);
  }

  private hitBuildObject(b: BulletEntry, bo: BuildObjectPlugin, nx: number, ny: number): void {
    const material = bo.def.material as Material;
    if (material === 'metal') {
      if (b.data.ricochetCount >= b.data.maxRicochets) {
        this.kill(b);
        return;
      }
      bo.hp -= b.data.damage * MATERIAL_DAMAGE_MULTIPLIER.metal;
      this.ricochet(b, nx, ny);
    } else {
      bo.hp -= b.data.damage * MATERIAL_DAMAGE_MULTIPLIER[material];
      this.kill(b);
    }
    if (bo.def.shape === 'chain') runStore.updateChainHp(bo.id, bo.hp);
    else runStore.updateObjectHp(bo.id, bo.hp);
    if (bo.hp <= 0) this.destroyBuildObject(bo);
  }

  private destroyBuildObject(bo: BuildObjectPlugin): void {
    if (bo.def.shape === 'chain') this.handlers.onChainDestroyed?.(bo.id);
    else this.handlers.onObjectDestroyed?.(bo.id);
  }

  private hitZombie(b: BulletEntry, zombie: Zombie): void {
    if (!b.data.canDamageZombies) return;
    zombie.damage(b.data.damage, b.data.owner === 'player' ? 'player' : 'ricochet');
    this.kill(b);
  }

  private hitPlayer(b: BulletEntry): void {
    if (b.data.owner !== 'zombie') return;
    runStore.damagePlayer(b.data.damage);
    this.kill(b);
    if (runStore.get().playerHp <= 0) this.scene.scene.start('GameOverScene');
  }

  private hitCore(b: BulletEntry): void {
    if (b.data.owner !== 'zombie') return;
    runStore.damageCore(b.data.damage);
    this.kill(b);
    if (runStore.get().coreHp <= 0) this.scene.scene.start('GameOverScene');
  }

  private ricochet(b: BulletEntry, nx: number, ny: number): void {
    const body = bodyOf(b.img);
    if (!body) return;
    const v = body.velocity;
    const result = applyRicochet({
      vx: v.x,
      vy: v.y,
      nx,
      ny,
      damage: b.data.damage,
      ricochetCount: b.data.ricochetCount,
      maxRicochets: b.data.maxRicochets,
      owner: b.data.owner,
      canDamageZombies: b.data.canDamageZombies,
    });
    const h = Math.hypot(result.reflected.vx, result.reflected.vy);
    if (h < 1) {
      this.kill(b);
      return;
    }
    const dirX = result.reflected.vx / h;
    const dirY = result.reflected.vy / h;

    b.data.damage = result.damage;
    b.data.ricochetCount = result.ricochetCount;
    b.data.canDamageZombies = result.canDamageZombies;

    b.img.setVelocity(dirX * result.speed, dirY * result.speed);
    b.img.setPosition(b.img.x + dirX * 10, b.img.y + dirY * 10);
    b.img.setRotation(Math.atan2(dirY, dirX));
    runStore.recordRicochet();
  }
}