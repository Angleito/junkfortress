import Phaser from 'phaser';
import { runStore } from '../state/runStore';

export function showPauseMenu(scene: Phaser.Scene): void {
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
    this.add.rectangle(width / 2, height / 2, 460, 400, 0x161616, 1).setStrokeStyle(2, 0x444444).setDepth(51);

    this.add
      .text(width / 2, 190, 'PAUSED', {
        fontFamily: 'monospace',
        fontSize: '34px',
        color: '#e8e0d0',
      })
      .setOrigin(0.5)
      .setDepth(52);

    this.addMenuButton(width / 2, 290, '[ RESUME ]', () => this.resumeGame());
    this.addMenuButton(width / 2, 370, '[ RESTART ]', () => this.restartScene());
    this.addMenuButton(width / 2, 450, '[ MAIN MENU ]', () => this.mainMenu());

    this.input.keyboard?.on('keydown-ESC', () => this.resumeGame());
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

  /** Read from the live scene list so the key never survives between pause menu opens. */
  private pausedScene(): Phaser.Scene | null {
    for (const scene of this.scene.manager.scenes) {
      if (scene.sys.isPaused()) return scene;
    }
    return null;
  }

  private resumeGame(): void {
    const paused = this.pausedScene();
    this.scene.stop();
    paused?.scene.resume();
  }

  /** Restart, not start: create() re-reads runStore, so the wave restarts against the standing build. */
  private restartScene(): void {
    const paused = this.pausedScene();
    this.scene.stop();
    paused?.scene.restart();
  }

  private mainMenu(): void {
    this.pausedScene()?.scene.stop();
    runStore.reset();
    this.scene.start('TitleScene');
  }
}
