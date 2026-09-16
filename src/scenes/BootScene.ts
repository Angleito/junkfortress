import Phaser from 'phaser';
import { createTextures } from '../utils/Textures';
import { runStore } from '../state/runStore';
import { loadScenario } from '../debug/DebugApi';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    createTextures(this);

    // ?debug=<scenario> boots straight into a rig, skipping the title for the harness.
    const scenario = new URLSearchParams(location.search).get('debug');
    if (scenario && loadScenario(scenario)) return;

    runStore.reset();
    this.scene.start('TitleScene');
  }
}
