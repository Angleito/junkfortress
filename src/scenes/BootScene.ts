import Phaser from 'phaser';
import { createPlaceholderTextures } from '../utils/PlaceholderTextures';
import { runStore } from '../state/runStore';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    createPlaceholderTextures(this);
    runStore.reset();
    this.scene.start('TitleScene');
  }
}