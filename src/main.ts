import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from './utils/Constants';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { BuildScene } from './scenes/BuildScene';
import { WaveScene } from './scenes/WaveScene';
import { ResultScene } from './scenes/ResultScene';
import { PauseOverlayScene } from './ui/PauseMenu';
import { installDebugApi } from './debug/DebugApi';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'app',
  backgroundColor: '#0d0d0d',
  // right-click is the build-phase cancel input, so the browser menu must never open
  disableContextMenu: true,
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
  scene: [BootScene, TitleScene, BuildScene, WaveScene, ResultScene, PauseOverlayScene],
});

if (import.meta.env.DEV || new URLSearchParams(location.search).has('debug')) {
  installDebugApi(game);
}
