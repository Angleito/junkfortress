import Phaser from 'phaser';
import { GAME_WIDTH } from '../utils/Constants';
import { runStore } from '../state/runStore';

export class VictoryScene extends Phaser.Scene {
  constructor() {
    super('VictoryScene');
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    const { stats } = runStore.get();

    this.add.text(cx, 150, 'YOU SURVIVED', {
      fontFamily: 'monospace',
      fontSize: '48px',
      color: '#7fd07f',
    }).setOrigin(0.5);

    this.add.text(cx, 280, 'All 5 waves cleared.', {
      fontFamily: 'monospace',
      fontSize: '22px',
      color: '#c8c2b8',
    }).setOrigin(0.5);

    this.add.text(cx, 370, [
      `Total zombies killed: ${stats.totalKills}`,
      `Ricochet kills: ${stats.ricochetKills}`,
      `Crush kills: ${stats.crushKills}`,
      `Explosion kills: ${stats.explosionKills}`,
    ], {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#9a948a',
      align: 'center',
      lineSpacing: 8,
    }).setOrigin(0.5);

    this.add
      .text(cx, 540, '[ NEW RUN ]', {
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