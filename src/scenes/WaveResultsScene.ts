import Phaser from 'phaser';
import { GAME_WIDTH } from '../utils/Constants';
import { CORE_MAX_HP } from '../data/gameData';
import { runStore } from '../state/runStore';

export class WaveResultsScene extends Phaser.Scene {
  constructor() {
    super('WaveResultsScene');
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    runStore.healCore(300);
    runStore.restorePlayer();
    const { waveNumber, stats, coreHp } = runStore.get();

    this.add.text(cx, 140, 'WAVE COMPLETE', {
      fontFamily: 'monospace',
      fontSize: '40px',
      color: '#e8e0d0',
    }).setOrigin(0.5);

    this.add.text(cx, 260, [
      `Zombies killed:   ${stats.totalKills}`,
      `Player kills:     ${stats.playerKills}`,
      `Ricochet kills:   ${stats.ricochetKills}`,
      `Crush kills:      ${stats.crushKills}`,
      `Explosion kills:  ${stats.explosionKills}`,
      '',
      `Core HP: ${coreHp} / ${CORE_MAX_HP}`,
    ], {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#c8c2b8',
      align: 'left',
      lineSpacing: 8,
    }).setOrigin(0.5);

    const isFinalWave = waveNumber >= 5;
    this.add
      .text(cx, 520, isFinalWave ? '[ CONTINUE ]' : '[ SCAVENGE FOR NEXT WAVE ]', {
        fontFamily: 'monospace',
        fontSize: '24px',
        color: '#7fd07f',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        if (isFinalWave) {
          this.scene.start('VictoryScene');
        } else {
          runStore.nextWave();
          this.scene.start('ScavengeScene');
        }
      });
  }
}