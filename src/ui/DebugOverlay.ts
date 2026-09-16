import type Phaser from 'phaser';

/** Overlay is a debug readout: 4 Hz is plenty and keeps its string building off the frame budget. */
const REFRESH_MS = 250;

function rounded(value: unknown): string {
  return typeof value === 'number' && Number.isFinite(value) ? String(Math.round(value)) : '-';
}

/** Monospace readout of the DebugApi state object, parked under the HUD. */
export class DebugOverlay {
  private readonly scene: Phaser.Scene;
  private readonly panel: Phaser.GameObjects.Rectangle;
  private readonly label: Phaser.GameObjects.Text;
  private nextRefreshAt = 0;
  private rendered = '';
  private shown: boolean;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.shown = typeof location !== 'undefined' && location.search.includes('debug');
    this.panel = scene.add
      .rectangle(8, 56, 262, 88, 0x000000, 0.55)
      .setOrigin(0, 0)
      .setDepth(1000)
      .setVisible(this.shown);
    this.label = scene.add
      .text(14, 60, '', { fontFamily: 'monospace', fontSize: '12px', color: '#9aa4ae', lineSpacing: 2 })
      .setDepth(1001)
      .setVisible(this.shown);
  }

  setVisible(v: boolean): void {
    this.shown = v;
    this.panel.setVisible(v);
    this.label.setVisible(v);
  }

  update(state: Record<string, unknown>): void {
    if (!this.shown) return;
    const now = this.scene.time.now;
    if (now < this.nextRefreshAt) return;
    this.nextRefreshAt = now + REFRESH_MS;

    const seed = typeof state.seed === 'number' ? state.seed.toString(16).toUpperCase() : '-';
    const line = [
      `FPS ${rounded(state.fps)}  FRAME ${rounded(state.frameMs)}ms`,
      `BULLETS ${rounded(state.activeBullets)}/${rounded(state.pooledBullets)}`,
      `ZOMBIES ${rounded(state.zombiesAlive)}  PENDING ${rounded(state.zombiesPending)}`,
      `BODIES ${rounded(state.dynamicStructures)}  CHAINS ${rounded(state.activeChains)}`,
      `SEED ${seed}`,
    ].join('\n');

    if (line === this.rendered) return;
    this.rendered = line;
    this.label.setText(line);
  }
}
