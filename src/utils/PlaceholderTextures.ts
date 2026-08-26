import Phaser from 'phaser';

export function createPlaceholderTextures(scene: Phaser.Scene): void {
  const g = scene.add.graphics();

  g.fillStyle(0x1a1a1a, 1);
  g.fillRect(0, 0, 64, 64);
  g.lineStyle(2, 0x555555, 1);
  g.strokeRect(1, 1, 62, 62);
  g.generateTexture('ui-panel', 64, 64);

  g.clear();
  g.fillStyle(0x5b4a2f, 1);
  g.fillRect(0, 0, 32, 32);
  g.lineStyle(2, 0x3a2f1e, 1);
  g.strokeRect(1, 1, 30, 30);
  g.generateTexture('plank', 32, 32);

  g.clear();
  g.fillStyle(0x8d9196, 1);
  g.fillRect(0, 0, 48, 48);
  g.lineStyle(2, 0x5c6066, 1);
  g.strokeRect(1, 1, 46, 46);
  g.generateTexture('metal_sheet', 48, 48);

  g.clear();
  g.fillStyle(0x717171, 1);
  g.fillRect(0, 0, 20, 20);
  g.generateTexture('chain', 20, 20);

  g.clear();
  g.fillStyle(0x2e2e33, 1);
  g.fillRect(0, 0, 40, 52);
  g.generateTexture('anvil', 40, 52);

  g.clear();
  g.fillStyle(0x111111, 1);
  g.fillCircle(16, 16, 14);
  g.lineStyle(2, 0x333333, 1);
  g.strokeCircle(16, 16, 14);
  g.generateTexture('tire', 32, 32);

  g.clear();
  g.fillStyle(0xb23a3a, 1);
  g.fillRect(0, 0, 40, 56);
  g.lineStyle(2, 0x8a2a2a, 1);
  g.strokeRect(1, 1, 38, 54);
  g.generateTexture('propane_tank', 40, 56);

  g.clear();
  g.fillStyle(0x9aa0a8, 1);
  g.fillRect(0, 0, 64, 88);
  g.generateTexture('refrigerator', 64, 88);

  g.clear();
  g.fillStyle(0xdfd7c4, 1);
  g.fillRect(0, 0, 56, 32);
  g.lineStyle(2, 0xc4b89c, 1);
  g.strokeRect(1, 1, 54, 30);
  g.generateTexture('mattress', 56, 32);

  g.clear();
  g.fillStyle(0x3d8b37, 1);
  g.fillRect(0, 0, 96, 60);
  g.lineStyle(2, 0x2c6627, 1);
  g.strokeRect(1, 1, 94, 58);
  g.generateTexture('zombie', 96, 60);

  g.clear();
  g.fillStyle(0x2b7ec2, 1);
  g.fillRect(0, 0, 32, 48);
  g.generateTexture('player', 32, 48);

  g.clear();
  g.fillStyle(0x7a4f2a, 1);
  g.fillRect(0, 0, 100, 100);
  g.lineStyle(4, 0x55361c, 1);
  g.strokeRect(2, 2, 96, 96);
  g.generateTexture('core', 100, 100);

  g.clear();
  g.fillStyle(0xf2e07a, 1);
  g.fillCircle(3, 3, 3);
  g.generateTexture('bullet', 6, 6);

  g.clear();
  g.fillStyle(0x7a7a7a, 1);
  g.fillRect(0, 0, GROUND_TEX_W, GROUND_TEX_H);
  g.lineStyle(1, 0x8f8f8f, 1);
  g.lineBetween(0, 4, GROUND_TEX_W, 4);
  g.generateTexture('ground', GROUND_TEX_W, GROUND_TEX_H);

  g.destroy();
}

const GROUND_TEX_W = 32;
const GROUND_TEX_H = 64;