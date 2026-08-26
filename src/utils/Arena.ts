import Phaser from 'phaser';
import { COLLISION, CORE_X, CORE_Y, GAME_HEIGHT, GAME_WIDTH, GROUND_Y } from '../utils/Constants';

export function drawArena(scene: Phaser.Scene): void {
  scene.add.tileSprite(GAME_WIDTH / 2, GROUND_Y + (GAME_HEIGHT - GROUND_Y) / 2, GAME_WIDTH, GAME_HEIGHT - GROUND_Y, 'ground');

  scene.add.image(CORE_X, CORE_Y, 'core').setDepth(10);

  scene.add.text(CORE_X, CORE_Y - 70, 'CORE', {
    fontFamily: 'monospace',
    fontSize: '14px',
    color: '#e8e0d0',
  }).setOrigin(0.5);
}

export function createArenaPhysics(scene: Phaser.Scene): void {
  const ground = scene.matter.add.rectangle(GAME_WIDTH / 2, GROUND_Y + 30, GAME_WIDTH + 800, 60, { isStatic: true });
  ground.collisionFilter.category = COLLISION.GROUND;
  ground.collisionFilter.mask = COLLISION.ALL;
  ground.plugin.ground = true;

  const core = scene.matter.add.rectangle(CORE_X, CORE_Y, 90, 90, { isStatic: true });
  core.collisionFilter.category = COLLISION.CORE;
  core.collisionFilter.mask = COLLISION.ALL;
  core.plugin.core = true;
}

export function drawBuildZone(scene: Phaser.Scene): void {
  scene.add
    .rectangle(390, 370, 620, 580, 0x141414, 0.5)
    .setStrokeStyle(1, 0x333333, 0.8)
    .setDepth(-1);
}