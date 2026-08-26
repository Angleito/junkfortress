import Phaser from 'phaser';
import { GAME_WIDTH } from '../utils/Constants';
import { runStore } from '../state/runStore';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    const { waveNumber, stats } = runStore.get();

    this.add.text(cx, 160, 'GAME OVER', {
      fontFamily: 'monospace',
      fontSize: '48px',
      color: '#c84545',
    }).setOrigin(0.5);

    this.add.text(cx, 300, [
      `Reached Wave: ${waveNumber}`,
      '',
      `Total zombies killed: ${stats.totalKills}`,
      `Ricochet kills: ${stats.ricochetKills}`,
      `Crush kills: ${stats.crushKills}`,
    ], {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#c8c2b8',
      align: 'center',
      lineSpacing: 8,
    }).setOrigin(0.5);

    this.add
      .text(cx, 520, '[ NEW RUN ]', {
        fontFamily: 'monospace',
        fontSize: '26px',
        color: '#7fd07f',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        runStore.reset();
        this.scene.start('ScavengeScene');
      });
  }
}