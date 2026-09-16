import Phaser from 'phaser';
import { COLLISION, PLAYER_MAX_X, PLAYER_MIN_X, PLAYER_SPEED, STEPS_PER_SECOND } from '../utils/Constants';
import { WEAPONS } from '../data/gameData';

const HIT_FLASH_MS = 90;
/** Matter wants px/step; PLAYER_SPEED is px/sec. */
const PLAYER_STEP_SPEED = PLAYER_SPEED / STEPS_PER_SECOND;
/** ~125px of clearance: enough to hop onto a plank stack, not enough to leave the arena. */
const JUMP_SPEED = 500;
const JUMP_STEP_SPEED = JUMP_SPEED / STEPS_PER_SECOND;
/** Feet sit 22px below the sprite centre, so the probe stays short: mid-air jumps stay impossible. */
const FOOT_PROBE_FROM = 16;
const FOOT_PROBE_TO = 30;
const HIT_FLASH_TINT = 0xff6a5a;

export class Player {
  readonly sprite: Phaser.Physics.Matter.Image;
  private readonly scene: Phaser.Scene;
  private cursor: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyA: Phaser.Input.Keyboard.Key | undefined;
  private keyD: Phaser.Input.Keyboard.Key | undefined;
  private keyW: Phaser.Input.Keyboard.Key | undefined;
  private fireTimer = 0;
  private flashUntil = 0;
  private readonly onFire: (angle: number) => void;

  constructor(scene: Phaser.Scene, x: number, y: number, onFire: (angle: number) => void) {
    this.scene = scene;
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
    this.keyW = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W);
  }

  update(delta: number): void {
    if (this.flashUntil !== 0 && this.scene.time.now >= this.flashUntil) {
      this.flashUntil = 0;
      this.sprite.clearTint();
    }

    const left = this.cursor.left.isDown || this.keyA!.isDown;
    const right = this.cursor.right.isDown || this.keyD!.isDown;
    const dir = (right ? 1 : 0) - (left ? 1 : 0);
    this.sprite.setVelocityX(dir * PLAYER_STEP_SPEED);

    const x = Phaser.Math.Clamp(this.sprite.x, PLAYER_MIN_X, PLAYER_MAX_X);
    if (x !== this.sprite.x) this.sprite.setPosition(x, this.sprite.y);

    const jump = this.cursor.space.isDown || this.cursor.up.isDown || this.keyW!.isDown;
    if (jump && this.grounded()) this.sprite.setVelocityY(-JUMP_STEP_SPEED);

    const pointer = this.sprite.scene.input.activePointer;
    const angle = Math.atan2(pointer.y - this.sprite.y, pointer.x - this.sprite.x);
    this.sprite.setRotation(angle);

    this.fireTimer -= delta;
    if (pointer.isDown && this.fireTimer <= 0) {
      this.fireTimer = 1000 / WEAPONS.survivor_pistol.fireRate;
      this.onFire(angle);
    }
  }

  /** Matter's ray query over the world bodies: one 14px probe under the feet is the whole ground test. */
  private grounded(): boolean {
    const body = this.sprite.body as MatterJS.BodyType | null;
    if (body === null) return false;
    const world = this.scene.matter.world.localWorld as unknown as MatterJS.CompositeType;
    const x = this.sprite.x;
    // Matter's ray pushes { body } collisions; Phaser's CollisionData type does not describe them.
    const hits = this.scene.matter.query.ray(
      world.bodies,
      { x, y: this.sprite.y + FOOT_PROBE_FROM },
      { x, y: this.sprite.y + FOOT_PROBE_TO },
    ) as unknown as Array<{ body: MatterJS.BodyType }>;
    return hits.some((hit) => hit.body !== body);
  }

  /** Damage feedback for the owning scene; the tint clears itself in update(). */
  flashHit(): void {
    this.flashUntil = this.scene.time.now + HIT_FLASH_MS;
    this.sprite.setTint(HIT_FLASH_TINT);
  }
}
