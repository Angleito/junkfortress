import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../utils/Constants';
import { runStore } from '../state/runStore';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  create(): void {
    const cx = GAME_WIDTH / 2;

    this.add
      .text(cx, 190, 'ARMED ZOMBIE\nJUNK FORTRESS', {
        fontFamily: 'monospace',
        fontSize: '48px',
        color: '#e8e0d0',
        align: 'center',
      })
      .setOrigin(0.5);

    this.add.text(cx, 300, 'The zombies bring the ammunition.\nYou build the machine that turns their own fire against them.', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#9a948a',
      align: 'center',
    }).setOrigin(0.5);

    this.add
      .text(cx, 420, '[ START RUN ]', {
        fontFamily: 'monospace',
        fontSize: '28px',
        color: '#7fd07f',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.startRun());

    this.add
      .text(cx, 500, '[ HOW TO PLAY ]', {
        fontFamily: 'monospace',
        fontSize: '22px',
        color: '#c8c2b8',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.showHowToPlay());

    this.add
      .text(GAME_WIDTH - 12, GAME_HEIGHT - 12, 'Scavenge junk. Build defenses. Survive 5 waves.', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#55524c',
      })
      .setOrigin(1);
  }

  private startRun(): void {
    runStore.reset();
    this.scene.start('ScavengeScene');
  }

  private showHowToPlay(): void {
    this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 800, 460, 0x111111, 0.96)
      .setStrokeStyle(2, 0x555555);
    this.add
      .text(GAME_WIDTH / 2, 200, 'HOW TO PLAY', {
        fontFamily: 'monospace',
        fontSize: '28px',
        color: '#e8e0d0',
      })
      .setOrigin(0.5);
    this.add
      .text(GAME_WIDTH / 2, 340, [
        'Each wave begins with a scavenge trip.',
        'You receive 6 random pieces of junk.',
        '',
        'Arrange them into defenses in the BUILD phase.',
        'Zombies advance from the right and fire nonstop.',
        '',
        'Wood absorbs bullets. Metal ricochets them.',
        'Heavy objects crush. Propane tanks explode.',
        'Let the horde destroy itself with friendly fire.',
      ], {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#c8c2b8',
        align: 'center',
        lineSpacing: 6,
      })
      .setOrigin(0.5);
    this.add
      .text(GAME_WIDTH / 2, 560, '[ CLOSE ]', {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: '#7fd07f',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.restart());
  }
}