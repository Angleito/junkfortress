import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../utils/Constants';
import { LOOT_LOCATIONS, waveCompositionFor } from '../data/gameData';
import { runStore } from '../state/runStore';
import type { LocationKey, LootLocation } from '../types/game';

const CATEGORY_COLORS: Record<string, string> = {
  Wood: '#c9a05f',
  Metal: '#a8b0b8',
  'Heavy Junk': '#b09a78',
  Explosives: '#d47a5a',
  Soft: '#cfc4ae',
};

const CARD_W = 400;
const CARD_H = 470;
const CARD_Y = 400;

export class ScavengeScene extends Phaser.Scene {
  constructor() {
    super('ScavengeScene');
  }

  create(): void {
    const wave = runStore.get().waveNumber;
    const cx = GAME_WIDTH / 2;

    this.add.text(cx, 40, `INCOMING WAVE ${wave}`, {
      fontFamily: 'monospace',
      fontSize: '26px',
      color: '#e8e0d0',
    }).setOrigin(0.5);

    const composition = waveCompositionFor(wave);
    this.add.text(cx, 76, composition.map((z) => `${z.count} ${z.type}`).join('   '), {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#8a857c',
    }).setOrigin(0.5);

    LOOT_LOCATIONS.forEach((location, i) => {
      this.renderCard(location, 225 + i * 415);
    });

    this.add.text(cx, GAME_HEIGHT - 16, 'TAP A LOCATION TO SCAVENGE', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#55524c',
    }).setOrigin(0.5);
  }

  private renderCard(location: LootLocation, x: number): void {
    const top = CARD_Y - CARD_H / 2;
    const panel = this.add.rectangle(x, CARD_Y, CARD_W, CARD_H, 0x151515, 1).setStrokeStyle(2, 0x333333);

    panel.setInteractive({ useHandCursor: true });
    panel.on('pointerover', () => panel.setStrokeStyle(2, 0x555555));
    panel.on('pointerout', () => panel.setStrokeStyle(2, 0x333333));
    panel.on('pointerdown', () => this.choose(location.key));

    this.add.text(x, top + 34, location.name, {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#e8e0d0',
    }).setOrigin(0.5);

    this.add.rectangle(x, top + 60, CARD_W - 40, 2, 0x2a2a2a);

    location.categories.forEach((category, i) => {
      const rowY = top + 92 + i * 66;
      const color = CATEGORY_COLORS[category.label] ?? '#c8c2b8';

      this.add.text(x - CARD_W / 2 + 24, rowY, category.label, {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#8a857c',
      }).setOrigin(0, 0.5);

      this.add
        .rectangle(x + 20, rowY, (category.chance / 100) * 150, 8, 0x2a2a2a)
        .setOrigin(0, 0.5);
      this.add
        .rectangle(x + 20, rowY, (category.chance / 100) * 150, 4, Phaser.Display.Color.HexStringToColor(color).color)
        .setOrigin(0, 0.5);

      this.add.text(x + CARD_W / 2 - 24, rowY, `${category.chance}%`, {
        fontFamily: 'monospace',
        fontSize: '15px',
        color,
      }).setOrigin(1, 0.5);
    });
  }

  private choose(key: LocationKey): void {
    runStore.setSeed(Math.floor(Math.random() * 0xffffffff));
    this.scene.start('LootRevealScene', { location: key });
  }
}