import Phaser from 'phaser';
import type { NormalizedPose } from '../models/pose';
import {
  createControlHitArea,
  resizeControlHitArea,
  type ControlHitArea,
} from './hitArea';
import { drawTargetSilhouette } from './targetSilhouette';

interface PoseCardBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PoseCardOptions {
  drawFrame?: boolean;
  innerPadding?: number;
  interactive?: boolean;
}

export class PoseCard {
  private container: Phaser.GameObjects.Container;
  private bg: Phaser.GameObjects.Graphics;
  private lineGfx: Phaser.GameObjects.Graphics;
  private hitArea: ControlHitArea | null;
  private pose: NormalizedPose;
  private drawFrame: boolean;
  private innerPadding: number;
  private interactive: boolean;

  constructor(
    scene: Phaser.Scene,
    pose: NormalizedPose,
    _title = '',
    options: PoseCardOptions = {},
  ) {
    this.pose = pose;
    this.drawFrame = options.drawFrame ?? true;
    this.innerPadding = options.innerPadding ?? 8;
    this.interactive = options.interactive ?? true;
    this.container = scene.add.container(0, 0);
    this.bg = scene.add.graphics();
    this.lineGfx = scene.add.graphics();

    this.container.add([this.bg, this.lineGfx]);
    this.hitArea = this.interactive
      ? createControlHitArea(scene, this.container, {
          x: 0,
          y: 0,
          width: 1,
          height: 1,
          centered: false,
        })
      : null;
  }

  public setPose(pose: NormalizedPose, _title = ''): void {
    this.pose = pose;
  }

  public setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }

  public setDepth(depth: number): void {
    this.container.setDepth(depth);
  }

  public onPress(handler: () => void): void {
    if (!this.interactive) {
      return;
    }
    this.hitArea?.zone.on('pointerdown', handler);
  }

  public getBoundsRect(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(
      this.container.x,
      this.container.y,
      this.container.width,
      this.container.height,
    );
  }

  public layout(bounds: PoseCardBounds): void {
    this.container.setPosition(bounds.x, bounds.y);
    this.container.setSize(bounds.width, bounds.height);
    if (this.interactive && this.hitArea) {
      resizeControlHitArea(this.hitArea, {
        x: 0,
        y: 0,
        width: bounds.width,
        height: bounds.height,
        centered: false,
      });
    }
    this.drawCard(bounds.width, bounds.height);
  }

  private drawCard(width: number, height: number): void {
    this.bg.clear();
    if (this.drawFrame) {
      this.bg.fillStyle(0xfbf7ee, 1);
      this.bg.lineStyle(1, 0xe6d9bd, 0.75);
      this.bg.fillRoundedRect(0, 0, width, height, 26);
      this.bg.strokeRoundedRect(0, 0, width, height, 26);
    }

    const drawArea = {
      x: this.innerPadding,
      y: this.innerPadding,
      width: Math.max(1, width - this.innerPadding * 2),
      height: Math.max(1, height - this.innerPadding * 2),
    };

    this.drawMiniPose(drawArea);
  }

  private drawMiniPose(area: {
    x: number;
    y: number;
    width: number;
    height: number;
  }): void {
    this.lineGfx.clear();
    drawTargetSilhouette(this.lineGfx, this.pose, area);
  }
}
