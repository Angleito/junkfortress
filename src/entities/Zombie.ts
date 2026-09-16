import Phaser from 'phaser';
import { COLLISION, CORE_X, CORE_Y, STEPS_PER_SECOND, ZOMBIE_STOP_X } from '../utils/Constants';
import { WEAPONS, ZOMBIE_CORE_ATTACK_MS, ZOMBIE_HP, ZOMBIE_SPEED } from '../data/gameData';
import { sfx } from '../systems/Audio';
import type { Effects } from '../systems/Effects';
import type { KillSource } from '../types/game';

export interface ZombieOptions {
  effects: Effects;
  onDeath: (zombie: Zombie, source: KillSource) => void;
  onCoreAttack: (zombie: Zombie) => void;
  onFire: (x: number, y: number, angle: number) => void;
  aimAt?: { x: number; y: number };
  stationary?: boolean;
}

const BODY_WIDTH = 34;
const BODY_HEIGHT = 54;
const HALF_W = BODY_WIDTH / 2;
const HALF_H = BODY_HEIGHT / 2;
/** Zombies always face left, so the muzzle sits just past the front of the 44px sprite. */
const MUZZLE_DX = -22;
const MUZZLE_DY = -6;
const FLASH_MS = 70;
const FLASH_TINT = 0xff6a5a;
const STUN_MS = 140;
const DEATH_DEBRIS_COLOR = 0x5a2b2b;
/** Matter wants px/step; ZOMBIE_SPEED (and every other gameplay speed) is px/sec. */
const ZOMBIE_STEP_SPEED = ZOMBIE_SPEED / STEPS_PER_SECOND;
const CORE_TARGET = { x: CORE_X, y: CORE_Y };
/** Scratch vectors, so a hit costs no allocations. */
const IMPULSE = { x: 0, y: 0 };

export class Zombie {
  readonly sprite: Phaser.Physics.Matter.Image;
  /** Live hit box: values refresh in update(), the object itself is reused for every query. */
  readonly hitBox = { x: 0, y: 0, halfW: HALF_W, halfH: HALF_H };
  hp = ZOMBIE_HP;
  readonly maxHp = ZOMBIE_HP;

  private readonly scene: Phaser.Scene;
  private readonly effects: Effects;
  private readonly onDeath: (zombie: Zombie, source: KillSource) => void;
  private readonly onCoreAttack: (zombie: Zombie) => void;
  private readonly onFire: (x: number, y: number, angle: number) => void;
  private readonly aimAt: { x: number; y: number } | undefined;
  private readonly stationary: boolean;
  private aliveFlag = true;
  private nextFireAt = 0;
  private nextCoreAttackAt = 0;
  private flashUntil = 0;
  private stunUntil = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, opts: ZombieOptions) {
    this.scene = scene;
    this.effects = opts.effects;
    this.onDeath = opts.onDeath;
    this.onCoreAttack = opts.onCoreAttack;
    this.onFire = opts.onFire;
    this.aimAt = opts.aimAt;
    this.stationary = opts.stationary === true;

    this.sprite = scene.matter.add.image(x, y, 'zombie');
    this.sprite.setBody({ type: 'rectangle', width: BODY_WIDTH, height: BODY_HEIGHT });
    this.sprite.setFixedRotation();
    this.sprite.setCollisionCategory(COLLISION.ZOMBIE);
    this.sprite.setCollidesWith(COLLISION.GROUND | COLLISION.BUILD_OBJECT | COLLISION.ZOMBIE | COLLISION.CORE);
    this.sprite.setDepth(8);

    const body = this.sprite.body as MatterJS.BodyType;
    body.plugin.zombie = this;

    this.hitBox.x = x;
    this.hitBox.y = y;
    this.nextFireAt = scene.time.now + 1000 / WEAPONS.zombie_pistol.fireRate;
  }

  get alive(): boolean {
    return this.aliveFlag;
  }

  update(_timeMs: number, _deltaMs: number): void {
    if (!this.aliveFlag) return;

    const now = this.scene.time.now;
    if (this.flashUntil !== 0 && now >= this.flashUntil) {
      this.flashUntil = 0;
      this.sprite.clearTint();
    }

    const body = this.sprite.body as MatterJS.BodyType | null;
    if (!body) return;

    this.hitBox.x = body.position.x;
    this.hitBox.y = body.position.y;

    // While a knockback impulse plays out it owns the velocity, otherwise walking would swallow it.
    if (now >= this.stunUntil) this.advanceOrAttack(body, now);
    this.tryFire(body, now);
  }

  damage(amount: number, source: KillSource): void {
    if (!this.aliveFlag) return;

    const body = this.sprite.body as MatterJS.BodyType | null;
    if (this.hp > amount) {
      // Hits arrive from the front (zombies face left), so the recoil shoves them back and up.
      if (body) {
        const shove = Math.min(1, amount / 25);
        IMPULSE.x = body.velocity.x + 3.2 * shove;
        IMPULSE.y = body.velocity.y - 1.6 * shove;
        this.scene.matter.body.setVelocity(body, IMPULSE);
        this.stunUntil = this.scene.time.now + STUN_MS;
      }
      this.sprite.setTint(FLASH_TINT);
      this.flashUntil = this.scene.time.now + FLASH_MS;
    }

    this.hp = Math.max(0, this.hp - amount);
    if (this.hp === 0) this.die(source);
  }

  destroy(): void {
    this.aliveFlag = false;
    const body = this.sprite.body as MatterJS.BodyType | null;
    if (body) this.scene.matter.world.remove(body);
    this.sprite.destroy();
  }

  private advanceOrAttack(body: MatterJS.BodyType, now: number): void {
    if (this.stationary) {
      this.sprite.setVelocityX(0);
    } else if (body.position.x > ZOMBIE_STOP_X) {
      this.sprite.setVelocityX(-ZOMBIE_STEP_SPEED);
    } else {
      this.sprite.setVelocityX(0);
      // nextCoreAttackAt starts at 0, so the first attack lands the frame it reaches the core.
      if (now >= this.nextCoreAttackAt) {
        this.nextCoreAttackAt = now + ZOMBIE_CORE_ATTACK_MS;
        this.onCoreAttack(this);
      }
    }
  }

  private tryFire(body: MatterJS.BodyType, now: number): void {
    if (now < this.nextFireAt) return;
    this.nextFireAt = now + 1000 / WEAPONS.zombie_pistol.fireRate;
    const target = this.aimAt ?? CORE_TARGET;
    const muzzleX = body.position.x + MUZZLE_DX;
    const muzzleY = body.position.y + MUZZLE_DY;
    this.onFire(muzzleX, muzzleY, Math.atan2(target.y - muzzleY, target.x - muzzleX));
  }

  private die(source: KillSource): void {
    this.aliveFlag = false;
    const body = this.sprite.body as MatterJS.BodyType | null;
    const x = body ? body.position.x : this.hitBox.x;
    const y = body ? body.position.y : this.hitBox.y;

    if (body) {
      IMPULSE.x = body.velocity.x - 6;
      IMPULSE.y = body.velocity.y - 4;
      this.scene.matter.body.setVelocity(body, IMPULSE);
    }
    this.sprite.clearTint();
    this.flashUntil = 0;

    this.effects.debris(x, y, DEATH_DEBRIS_COLOR, 10);
    this.effects.dust(x, y, 6);
    sfx.zombieDeath();

    this.onDeath(this, source);
  }
}
