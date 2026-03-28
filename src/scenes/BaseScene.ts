import Phaser from 'phaser';
import { Theme } from '../config/theme';
import { getGameContext } from '../core/gameContext';
import type { GameContext } from '../core/gameContext';
import type { PortraitLayout } from '../services/LayoutService';
import { createControlHitArea } from '../ui/hitArea';

export class BaseScene extends Phaser.Scene {
  private orientationBlocker?: Phaser.GameObjects.Rectangle;
  private orientationText?: Phaser.GameObjects.Text;

  constructor(key: string) {
    super(key);
  }

  protected get ctx(): GameContext {
    return getGameContext();
  }

  protected drawBackground(width: number, height: number): void {
    const gfx = this.add.graphics();
    gfx.fillStyle(Theme.palette.background, 1);
    gfx.fillRect(0, 0, width, height);

    gfx.fillStyle(0xe7e2d3, 0.8);
    gfx.fillCircle(width * 0.18, height * 0.72, Math.min(width, height) * 0.22);

    gfx.fillStyle(0xf5dfd1, 0.7);
    gfx.fillCircle(width * 0.92, height * 0.18, Math.min(width, height) * 0.2);
  }

  protected createOrientationOverlay(layout: PortraitLayout): void {
    this.orientationBlocker = this.add
      .rectangle(0, 0, layout.width, layout.height, 0x1d2831, 0.9)
      .setOrigin(0)
      .setVisible(false)
      .setDepth(200);

    this.orientationText = this.add
      .text(
        layout.width * 0.5,
        layout.height * 0.5,
        this.ctx.i18n.t('game.rotate'),
        {
          fontFamily: Theme.font,
          fontSize: '42px',
          fontStyle: '700',
          color: '#f7fafc',
          align: 'center',
        },
      )
      .setOrigin(0.5)
      .setVisible(false)
      .setDepth(201);
  }

  protected setOrientationOverlay(layout: PortraitLayout): void {
    if (!this.orientationBlocker || !this.orientationText) {
      return;
    }

    this.orientationBlocker.setSize(layout.width, layout.height);
    this.orientationText.setPosition(layout.width * 0.5, layout.height * 0.5);

    const show = !layout.isPortrait;
    this.orientationBlocker.setVisible(show);
    this.orientationText.setVisible(show);
  }

  protected getHeaderAnchors(layout: PortraitLayout): {
    y: number;
    leftX: number;
    rightX: number;
    centerX: number;
    leftClearX: number;
    rightClearX: number;
  } {
    const y = layout.safeTop + 2;
    const leftX = layout.safePadding + 22;
    const rightX = layout.width - layout.safePadding;
    const centerX = layout.width * 0.5;

    return {
      y,
      leftX,
      rightX,
      centerX,
      leftClearX: leftX + 34,
      rightClearX: rightX - 34,
    };
  }

  protected createHeaderBackButton(
    onPress: () => void,
  ): Phaser.GameObjects.Container {
    const size = 44;
    const bg = this.add.graphics();
    bg.fillStyle(0x5f7d94, 1);
    bg.fillRoundedRect(-size * 0.5, -size * 0.5, size, size, 12);

    const icon = this.add
      .text(0, -1, '‹', {
        fontFamily: Theme.font,
        fontSize: '34px',
        color: '#f2f6f9',
        fontStyle: '700',
      })
      .setOrigin(0.5);

    const button = this.add.container(0, 0, [bg, icon]);
    button.setDepth(70);
    button.setSize(size, size);
    const hitArea = createControlHitArea(this, button, {
      x: 0,
      y: 0,
      width: size,
      height: size,
      centered: true,
    });

    hitArea.zone.on('pointerdown', () => {
      button.setScale(0.96);
      onPress();
    });

    hitArea.zone.on('pointerup', () => {
      button.setScale(1);
    });

    hitArea.zone.on('pointerout', () => {
      button.setScale(1);
    });

    return button;
  }
}
