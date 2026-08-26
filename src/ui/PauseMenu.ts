import Phaser from 'phaser';
import { runStore } from '../state/runStore';

let pausedSceneKey: string | null = null;

export function showPauseMenu(scene: Phaser.Scene): void {
  pausedSceneKey = scene.scene.key;
  scene.scene.pause();
  scene.scene.launch('PauseOverlayScene');
}

export class PauseOverlayScene extends Phaser.Scene {
  constructor() {
    super('PauseOverlayScene');
  }

  create(): void {
    const { width, height } = this.scale;

    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.65).setDepth(50);
    this.add.rectangle(width / 2, height / 2, 480, 420, 0x161616, 1).setStrokeStyle(2, 0x444444).setDepth(51);

    this.add
      .text(width / 2, 170, 'PAUSED', {
        fontFamily: 'monospace',
        fontSize: '34px',
        color: '#e8e0d0',
      })
      .setOrigin(0.5)
      .setDepth(52);

    this.addMenuButton(width / 2, 260, '[ RESUME ]', () => this.close());
    this.addMenuButton(width / 2, 340, '[ RESTART RUN ]', () => this.restartRun());
    this.addMenuButton(width / 2, 420, '[ MAIN MENU ]', () => this.mainMenu());
    this.addMenuButton(width / 2, 500, '[ FULLSCREEN ]', () => this.toggleFullscreen());

    this.input.keyboard?.on('keydown-ESC', () => this.close());
  }

  private addMenuButton(x: number, y: number, label: string, onClick: () => void): void {
    this.add
      .text(x, y, label, {
        fontFamily: 'monospace',
        fontSize: '22px',
        color: '#7fd07f',
      })
      .setOrigin(0.5)
      .setDepth(52)
      .setPadding(24, 14)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', onClick);
  }

  private close(): void {
    this.scene.stop();
    if (pausedSceneKey) {
      const paused = this.scene.manager.getScene(pausedSceneKey);
      if (paused && paused.scene.isPaused()) paused.scene.resume();
      pausedSceneKey = null;
    }
  }

  private restartRun(): void {
    const key = pausedSceneKey;
    pausedSceneKey = null;
    runStore.reset();
    if (key) {
      const paused = this.scene.manager.getScene(key);
      if (paused) paused.scene.stop();
    }
    this.scene.start('ScavengeScene');
  }

  private mainMenu(): void {
    const key = pausedSceneKey;
    pausedSceneKey = null;
    runStore.reset();
    if (key) {
      const paused = this.scene.manager.getScene(key);
      if (paused) paused.scene.stop();
    }
    this.scene.start('TitleScene');
  }

  private toggleFullscreen(): void {
    if (this.scale.isFullscreen) {
      this.scale.stopFullscreen();
    } else {
      this.scale.startFullscreen();
    }
  }
}