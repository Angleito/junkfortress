import Phaser from 'phaser';
import { GAME_WIDTH, GROUND_Y, PLAYER_SPAWN_X, PLAYER_SPAWN_Y, ZOMBIE_SPAWN_X } from '../utils/Constants';
import { createArenaPhysics, drawArena } from '../utils/Arena';
import { runStore } from '../state/runStore';
import { waveCompositionFor, ZOMBIE_CORE_DAMAGE } from '../data/gameData';
import { showPauseMenu } from '../ui/PauseMenu';
import { Player } from '../entities/Player';
import { Zombie, type KillSource } from '../entities/Zombie';
import { BulletManager } from '../entities/Bullets';
import { WaveStructureManager } from '../systems/WaveStructureManager';

export class WaveScene extends Phaser.Scene {
  private player: Player | null = null;
  private bullets: BulletManager | null = null;
  private structures: WaveStructureManager | null = null;
  private zombies: Zombie[] = [];
  private activeZombies = 0;
  private waveEnded = false;
  private hudHp: Phaser.GameObjects.Text | null = null;
  private hudCore: Phaser.GameObjects.Text | null = null;

  constructor() {
    super('WaveScene');
  }

  create(): void {
    drawArena(this);
    createArenaPhysics(this);

    this.add.text(GAME_WIDTH - 12, 12, `WAVE ${runStore.get().waveNumber}`, {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#e8e0d0',
    }).setOrigin(1, 0);

    const menuBtn = this.add.rectangle(GAME_WIDTH - 36, 56, 56, 40, 0x1c1c1c, 1).setStrokeStyle(2, 0x3a3a3a);
    this.add.text(GAME_WIDTH - 36, 56, 'MENU', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#e8e0d0',
    }).setOrigin(0.5);
    menuBtn.setInteractive({ useHandCursor: true });
    menuBtn.on('pointerdown', () => showPauseMenu(this));

    this.input.keyboard?.on('keydown-ESC', () => showPauseMenu(this));

    this.hudHp = this.add.text(12, 12, '', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#e8e0d0',
    });
    this.hudCore = this.add.text(12, 34, '', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#e8e0d0',
    });

    this.structures = new WaveStructureManager(this);
    this.structures.spawn();

    this.bullets = new BulletManager(this, {
      onObjectDestroyed: (id) => this.structures?.destroyObject(id),
      onChainDestroyed: (id) => this.structures?.destroyChain(id),
    });
    this.events.on('zombie-fire', (x: number, y: number, angle: number) => this.bullets?.fireZombie(x, y, angle));

    this.player = new Player(this, PLAYER_SPAWN_X, PLAYER_SPAWN_Y, (angle) => {
      const muzzleX = this.player!.sprite.x + Math.cos(angle) * 26;
      const muzzleY = this.player!.sprite.y + Math.sin(angle) * 26;
      this.bullets!.firePlayer(muzzleX, muzzleY, angle);
    });

    this.zombies = [];
    this.activeZombies = 0;
    this.waveEnded = false;
    const composition = waveCompositionFor(runStore.get().waveNumber);
    this.spawnWave(composition.map((z) => z.type));
  }

  update(time: number, delta: number): void {
    if (this.waveEnded) return;
    this.player?.update(delta);
    this.bullets?.update(time);

    for (const zombie of this.zombies) {
      if (zombie.sprite.active) zombie.update(delta);
    }

    this.hudHp?.setText(`HP   ${runStore.get().playerHp}`);
    this.hudCore?.setText(`CORE ${runStore.get().coreHp}`);
  }

  private spawnWave(types: string[]): void {
    const spacing = 90;
    types.forEach((_, i) => {
      const x = ZOMBIE_SPAWN_X + i * spacing;
      this.time.delayedCall(i * 400, () => {
        if (this.waveEnded) return;
        const zombie = new Zombie(
          this,
          x,
          GROUND_Y - 30,
          (z, source) => this.onZombieKilled(z, source),
          (z) => this.onZombieReachedCore(z),
        );
        this.zombies.push(zombie);
        this.activeZombies += 1;
      });
    });
  }

  private onZombieKilled(zombie: Zombie, source: KillSource): void {
    if (this.waveEnded || !zombie.sprite.active) return;
    this.activeZombies -= 1;
    runStore.addKill(source);
    zombie.destroy();
    this.checkWaveEnd();
  }

  private onZombieReachedCore(zombie: Zombie): void {
    if (this.waveEnded) return;
    runStore.damageCore(ZOMBIE_CORE_DAMAGE);
    this.activeZombies -= 1;
    zombie.destroy();
    if (runStore.get().coreHp <= 0) {
      this.waveEnded = true;
      this.scene.start('GameOverScene');
      return;
    }
    this.checkWaveEnd();
  }

  private checkWaveEnd(): void {
    if (this.waveEnded) return;
    if (this.activeZombies <= 0) this.endWave();
  }

  private endWave(): void {
    if (this.waveEnded) return;
    this.waveEnded = true;
    this.scene.start('WaveResultsScene');
  }
}