import Phaser from 'phaser';
import {
  BUILD_ZONE,
  COLLISION,
  CORE_SIZE,
  CORE_X,
  CORE_Y,
  GAME_HEIGHT,
  GAME_WIDTH,
  GROUND_HEIGHT,
  GROUND_Y,
  ZOMBIE_SPAWN_X,
} from './Constants';

const LABEL_STYLE = {
  fontFamily: 'monospace',
  fontSize: '13px',
  color: '#55534d',
} as const;

export function drawArena(scene: Phaser.Scene): void {
  scene.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'bg').setDepth(-10);

  scene.add
    .tileSprite(GAME_WIDTH / 2, GROUND_Y + GROUND_HEIGHT / 2, GAME_WIDTH, GROUND_HEIGHT, 'ground')
    .setDepth(-5);

  scene.add.image(CORE_X, CORE_Y, 'core').setDepth(4);
  scene.add.text(CORE_X, CORE_Y - CORE_SIZE / 2 - 10, 'CORE', LABEL_STYLE).setOrigin(0.5, 1).setDepth(4);

  scene.add
    .text(ZOMBIE_SPAWN_X, GROUND_Y - 26, 'ZOMBIE ENTRY >>>', LABEL_STYLE)
    .setOrigin(1, 1)
    .setDepth(-4);

  scene.add
    .text(BUILD_ZONE.x + 8, BUILD_ZONE.y + 8, 'BUILD AREA', LABEL_STYLE)
    .setOrigin(0, 0)
    .setDepth(-4);
}

export function createArenaPhysics(scene: Phaser.Scene): void {
  const ground = scene.matter.add.rectangle(
    GAME_WIDTH / 2,
    GROUND_Y + GROUND_HEIGHT / 2,
    GAME_WIDTH + 800,
    GROUND_HEIGHT,
    { isStatic: true },
  );
  ground.collisionFilter.category = COLLISION.GROUND;
  ground.collisionFilter.mask = COLLISION.ALL;
  ground.plugin.ground = true;

  const core = scene.matter.add.rectangle(CORE_X, CORE_Y, CORE_SIZE, CORE_SIZE, { isStatic: true });
  core.collisionFilter.category = COLLISION.CORE;
  core.collisionFilter.mask = COLLISION.ALL;
  core.plugin.core = true;
}

export function drawBuildZone(scene: Phaser.Scene): void {
  scene.add
    .rectangle(
      BUILD_ZONE.x + BUILD_ZONE.width / 2,
      BUILD_ZONE.y + BUILD_ZONE.height / 2,
      BUILD_ZONE.width,
      BUILD_ZONE.height,
      0x141414,
      0.4,
    )
    .setStrokeStyle(1, 0x2e2e2a, 0.8)
    .setDepth(-1);
}
