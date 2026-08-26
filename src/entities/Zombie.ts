import Phaser from 'phaser';
import { COLLISION, CORE_X, CORE_Y } from '../utils/Constants';
import { WEAPONS, ZOMBIE_HP, ZOMBIE_SPEED } from '../data/gameData';

export type KillSource = 'player' | 'ricochet' | 'crush' | 'explosion';

export class Zombie {
  readonly sprite: Phaser.Physics.Matter.Image;
  hp = ZOMBIE_HP;
  private nextFireAt = 0;
  private readonly scene: Phaser.Scene;
  private readonly onDeath: (zombie: Zombie, source: KillSource) => void;
  private readonly onReachCore: (zombie: Zombie) => void;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    onDeath: (zombie: Zombie, source: KillSource) => void,
    onReachCore: (zombie: Zombie) => void,
  ) {
    this.scene = scene;
    this.onDeath = onDeath;
    this.onReachCore = onReachCore;

    this.sprite = scene.matter.add.image(x, y, 'zombie');
    this.sprite.setBody({ type: 'rectangle', width: 80, height: 50 });
    this.sprite.setFixedRotation();
    this.sprite.setCollisionCategory(COLLISION.ZOMBIE);
    this.sprite.setCollidesWith(COLLISION.GROUND | COLLISION.BUILD_OBJECT | COLLISION.CORE);
    this.sprite.setDepth(8);
    (this.sprite.body as MatterJS.BodyType).plugin.zombie = this;

    this.nextFireAt = scene.time.now + 300 + Math.random() * 500;
  }

  update(_delta: number): void {
    if (this.sprite.x < CORE_X + 80) {
      this.onReachCore(this);
      return;
    }
    this.sprite.setVelocityX(-ZOMBIE_SPEED);

    const now = this.scene.time.now;
    if (now >= this.nextFireAt) {
      this.nextFireAt = now + 1000 / WEAPONS.zombie_pistol.fireRate;
      const angle = Math.atan2(CORE_Y - this.sprite.y, CORE_X - this.sprite.x);
      this.onFire(angle);
    }
  }

  damage(amount: number, source: KillSource): void {
    this.hp -= amount;
    if (this.hp <= 0) this.onDeath(this, source);
  }

  destroy(): void {
    const body = this.sprite.body as MatterJS.BodyType | null;
    if (body) this.sprite.scene.matter.world.remove(body);
    this.sprite.destroy();
  }

  private onFire(angle: number): void {
    const muzzleX = this.sprite.x - 45;
    const muzzleY = this.sprite.y - 5;
    this.scene.events.emit('zombie-fire', muzzleX, muzzleY, angle);
  }
}