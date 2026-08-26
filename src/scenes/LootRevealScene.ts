import Phaser from 'phaser';
import { GAME_WIDTH } from '../utils/Constants';
import { generateLoot, ITEM_NAMES } from '../data/gameData';
import { runStore } from '../state/runStore';
import type { InventoryItem, LocationKey } from '../types/game';

let lootIdCounter = 0;

export class LootRevealScene extends Phaser.Scene {
  constructor() {
    super('LootRevealScene');
  }

  create(data: { location?: LocationKey }): void {
    const cx = GAME_WIDTH / 2;

    const items: InventoryItem[] = generateLoot(data?.location ?? 'hardware_store').map((type) => ({
      id: `loot-${++lootIdCounter}`,
      type,
      name: ITEM_NAMES[type],
    }));
    runStore.addLoot(items);

    this.add.text(cx, 140, 'YOU FOUND', {
      fontFamily: 'monospace',
      fontSize: '36px',
      color: '#e8e0d0',
    }).setOrigin(0.5);

    this.add.text(cx, 260, items.map((i) => i.name).join('\n'), {
      fontFamily: 'monospace',
      fontSize: '24px',
      color: '#c8c2b8',
      align: 'center',
      lineSpacing: 10,
    }).setOrigin(0.5);

    this.add
      .text(cx, 520, '[ BUILD DEFENSES ]', {
        fontFamily: 'monospace',
        fontSize: '26px',
        color: '#7fd07f',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('BuildScene'));
  }
}