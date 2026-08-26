import Phaser from 'phaser';
import { COLLISION, PLAYER_MAX_X, PLAYER_MIN_X, PLAYER_SPEED } from '../utils/Constants';
import { WEAPONS } from '../data/gameData';

export class Player {
  readonly sprite: Phaser.Physics.Matter.Image;
  private cursor: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyA: Phaser.Input.Keyboard.Key | undefined;
  private keyD: Phaser.Input.Keyboard.Key | undefined;
  private fireTimer = 0;
  private readonly onFire: (angle: number) => void;

  constructor(scene: Phaser.Scene, x: number, y: number, onFire: (angle: number) => void) {
    this.onFire = onFire;
    this.sprite = scene.matter.add.image(x, y, 'player');
    this.sprite.setBody({ type: 'rectangle', width: 24, height: 44 });
    this.sprite.setFixedRotation();
    this.sprite.setCollisionCategory(COLLISION.PLAYER);
    this.sprite.setCollidesWith(COLLISION.ALL);
    this.sprite.setDepth(10);
    (this.sprite.body as MatterJS.BodyType).plugin.player = true;

    this.cursor = scene.input.keyboard!.createCursorKeys();
    this.keyA = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyD = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D);
  }

  update(delta: number): void {
    const left = this.cursor.left.isDown || this.keyA!.isDown;
    const right = this.cursor.right.isDown || this.keyD!.isDown;
    const dir = (right ? 1 : 0) - (left ? 1 : 0);
    this.sprite.setVelocityX(dir * PLAYER_SPEED);

    const x = Phaser.Math.Clamp(this.sprite.x, PLAYER_MIN_X, PLAYER_MAX_X);
    if (x !== this.sprite.x) this.sprite.setPosition(x, this.sprite.y);

    const pointer = this.sprite.scene.input.activePointer;
    const angle = Math.atan2(pointer.y - this.sprite.y, pointer.x - this.sprite.x);
    this.sprite.setRotation(angle);

    this.fireTimer -= delta;
    if (pointer.isDown && this.fireTimer <= 0) {
      this.fireTimer = 1000 / WEAPONS.survivor_pistol.fireRate;
      this.onFire(angle);
    }
  }
}