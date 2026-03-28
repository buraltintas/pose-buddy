import Phaser from 'phaser';
import { SCENES } from '../core/sceneKeys';
import { BootScene } from '../scenes/BootScene';
import { GameScene } from '../scenes/GameScene';
import { GalleryScene } from '../scenes/GalleryScene';
import { HomeScene } from '../scenes/HomeScene';
import { LevelSelectScene } from '../scenes/LevelSelectScene';
import { PoseLibraryScene } from '../scenes/PoseLibraryScene';
import { SettingsScene } from '../scenes/SettingsScene';

export const BASE_GAME_WIDTH = 720;
export const BASE_GAME_HEIGHT = 1280;

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  backgroundColor: '#ede8da',
  scene: [
    new BootScene(SCENES.boot),
    new HomeScene(SCENES.home),
    new GameScene(SCENES.game),
    new LevelSelectScene(SCENES.levelSelect),
    new GalleryScene(SCENES.gallery),
    new PoseLibraryScene(SCENES.poseLibrary),
    new SettingsScene(SCENES.settings),
  ],
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: BASE_GAME_WIDTH,
    height: BASE_GAME_HEIGHT,
  },
  input: {
    activePointers: 3,
    touch: {
      capture: true,
    },
  },
  render: {
    antialias: true,
  },
};
