import Phaser from 'phaser';
import { createControlHitArea } from './hitArea';

interface ButtonOptions {
  width: number;
  height: number;
  label: string;
  onPress: () => void;
  background?: number;
  textColor?: string;
}

export function createButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  options: ButtonOptions,
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);

  const bg = scene.add
    .rectangle(
      0,
      0,
      options.width,
      options.height,
      options.background ?? 0x2f5c7a,
    )
    .setOrigin(0.5)
    .setStrokeStyle(2, 0xffffff, 0.28);

  const label = scene.add
    .text(0, 0, options.label, {
      fontFamily: 'Avenir Next, Trebuchet MS, sans-serif',
      fontSize: '22px',
      color: options.textColor ?? '#f7f8fb',
      fontStyle: '700',
    })
    .setOrigin(0.5);

  container.add([bg, label]);
  container.setSize(options.width, options.height);
  const hitArea = createControlHitArea(scene, container, {
    x: 0,
    y: 0,
    width: options.width,
    height: options.height,
    centered: true,
  });

  hitArea.zone.on('pointerdown', () => {
    container.setScale(0.97);
    options.onPress();
  });

  hitArea.zone.on('pointerout', () => {
    container.setScale(1);
  });

  hitArea.zone.on('pointerup', () => {
    container.setScale(1);
  });

  return container;
}
