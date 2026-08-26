import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from './utils/Constants';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { ScavengeScene } from './scenes/ScavengeScene';
import { LootRevealScene } from './scenes/LootRevealScene';
import { BuildScene } from './scenes/BuildScene';
import { WaveScene } from './scenes/WaveScene';
import { WaveResultsScene } from './scenes/WaveResultsScene';
import { GameOverScene } from './scenes/GameOverScene';
import { VictoryScene } from './scenes/VictoryScene';
import { PauseOverlayScene } from './ui/PauseMenu';

new Phaser.Game({
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'app',
  backgroundColor: '#0d0d0d',
  input: {
    activePointers: 3,
    touch: {
      capture: true,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'matter',
    matter: {
      gravity: { x: 0, y: 1 },
      debug: false,
    },
  },
  scene: [
    BootScene,
    TitleScene,
    ScavengeScene,
    LootRevealScene,
    BuildScene,
    WaveScene,
    WaveResultsScene,
    GameOverScene,
    VictoryScene,
    PauseOverlayScene,
  ],
});