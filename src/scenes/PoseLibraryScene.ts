import Phaser from 'phaser';
import { Theme } from '../config/theme';
import { SCENES } from '../core/sceneKeys';
import {
  LayoutService,
  type PaddedPageLayout,
  type PortraitLayout,
} from '../services/LayoutService';
import { drawTargetSilhouette } from '../ui/targetSilhouette';
import { BaseScene } from './BaseScene';

export class PoseLibraryScene extends BaseScene {
  private layout!: PortraitLayout;
  private page!: PaddedPageLayout;
  private backButton!: Phaser.GameObjects.Container;
  private titleText!: Phaser.GameObjects.Text;
  private scrollViewport!: Phaser.GameObjects.Container;
  private scrollContent!: Phaser.GameObjects.Container;
  private scrollMaskGraphics!: Phaser.GameObjects.Graphics;
  private scrollMask!: Phaser.Display.Masks.GeometryMask;
  private scrollViewportRect!: Phaser.Geom.Rectangle;
  private contentHeight: number;
  private scrollY: number;
  private minScrollY: number;
  private maxScrollY: number;
  private activeScrollPointerId: number | null;
  private dragStartY: number;
  private dragStartScrollY: number;

  constructor(key: string) {
    super(key);
    this.contentHeight = 0;
    this.scrollY = 0;
    this.minScrollY = 0;
    this.maxScrollY = 0;
    this.activeScrollPointerId = null;
    this.dragStartY = 0;
    this.dragStartScrollY = 0;
  }

  create(): void {
    this.layout = LayoutService.createPortraitLayout(
      this.scale.gameSize.width,
      this.scale.gameSize.height,
    );
    this.page = LayoutService.createPaddedPageLayout(this.layout);
    this.drawBackground(this.layout.width, this.layout.height);

    const header = this.getHeaderAnchors(this.layout);

    this.backButton = this.createHeaderBackButton(() =>
      this.scene.start(SCENES.home),
    );
    this.backButton.setPosition(header.leftX, header.y);

    this.titleText = this.add
      .text(this.layout.width * 0.5, header.y, this.ctx.i18n.t('common.poseLibrary'), {
        fontFamily: Theme.font,
        fontSize: '38px',
        fontStyle: '700',
        color: '#27465c',
      })
      .setOrigin(0.5);
    this.titleText.setWordWrapWidth(
      this.layout.width - this.layout.safePadding * 2 - 110,
    );

    this.scrollViewport = this.add.container(0, 0);
    this.scrollContent = this.add.container(0, 0);
    this.scrollViewport.add(this.scrollContent);

    this.scrollMaskGraphics = this.add.graphics();
    this.scrollMaskGraphics.setVisible(false);
    this.scrollMask = new Phaser.Display.Masks.GeometryMask(
      this,
      this.scrollMaskGraphics,
    );
    this.scrollViewport.setMask(this.scrollMask);
    this.scrollViewportRect = new Phaser.Geom.Rectangle(0, 0, 1, 1);

    this.renderPoseCards();
    this.applyScrollLayout();
    this.registerScrollInput();
    this.createOrientationOverlay(this.layout);
    this.setOrientationOverlay(this.layout);

    this.scale.on(Phaser.Scale.Events.RESIZE, () => this.scene.restart(), this);
  }

  private renderPoseCards(): void {
    const levels = this.ctx.levels.getAll();
    const columns = this.page.content.width >= 336 ? 2 : 1;
    const gapX = Phaser.Math.Clamp(this.page.content.width * 0.04, 12, 18);
    const gapY = 16;
    const width = (this.page.content.width - gapX * (columns - 1)) / columns;
    const height = Phaser.Math.Clamp(width * 0.92, 150, 220);
    const startY = 16;

    levels.forEach((level, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      const cardX = col * (width + gapX);
      const cardY = startY + row * (height + gapY);

      const card = this.add.container(cardX, cardY);

      const bg = this.add.graphics();
      bg.fillStyle(0xffffff, 1);
      bg.lineStyle(2, Theme.palette.boardStroke);
      bg.fillRoundedRect(0, 0, width, height, 18);
      bg.strokeRoundedRect(0, 0, width, height, 18);

      const label = this.add
        .text(width * 0.5, 22, this.ctx.i18n.t('common.level', { id: level.id }), {
          fontFamily: Theme.font,
          fontSize: '20px',
          color: '#2d4e64',
          fontStyle: '700',
        })
        .setOrigin(0.5);

      const silhouette = this.add.graphics();
      drawTargetSilhouette(silhouette, level.targetPose, {
        x: 8,
        y: 40,
        width: width - 16,
        height: height - 48,
      });

      card.add([bg, label, silhouette]);
      this.scrollContent.add(card);
    });

    const rows = Math.ceil(levels.length / columns);
    this.contentHeight = startY + rows * height + (rows - 1) * gapY + 12;
  }

  private applyScrollLayout(): void {
    this.scrollViewportRect.setTo(
      this.page.content.x,
      this.page.content.y,
      this.page.content.width,
      this.page.content.height,
    );

    this.scrollViewport.setPosition(
      this.scrollViewportRect.x,
      this.scrollViewportRect.y,
    );

    this.scrollMaskGraphics.clear();
    this.scrollMaskGraphics.fillStyle(0xffffff, 1);
    this.scrollMaskGraphics.fillRect(
      this.scrollViewportRect.x,
      this.scrollViewportRect.y,
      this.scrollViewportRect.width,
      this.scrollViewportRect.height,
    );

    this.updateScrollMetrics();
  }

  private registerScrollInput(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (
        !Phaser.Geom.Rectangle.Contains(
          this.scrollViewportRect,
          pointer.x,
          pointer.y,
        )
      ) {
        return;
      }

      this.activeScrollPointerId = pointer.id;
      this.dragStartY = pointer.y;
      this.dragStartScrollY = this.scrollY;
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (
        this.activeScrollPointerId === null ||
        pointer.id !== this.activeScrollPointerId ||
        !pointer.isDown ||
        this.minScrollY === this.maxScrollY
      ) {
        return;
      }

      const deltaY = pointer.y - this.dragStartY;
      this.setScroll(this.dragStartScrollY + deltaY);
    });

    const stopScroll = () => {
      this.activeScrollPointerId = null;
    };

    this.input.on('pointerup', stopScroll);
    this.input.on('pointerupoutside', stopScroll);

    this.input.on(
      'wheel',
      (
        pointer: Phaser.Input.Pointer,
        _go: Phaser.GameObjects.GameObject[],
        _dx: number,
        dy: number,
      ) => {
        if (
          !Phaser.Geom.Rectangle.Contains(
            this.scrollViewportRect,
            pointer.x,
            pointer.y,
          )
        ) {
          return;
        }

        if (this.minScrollY === this.maxScrollY) {
          return;
        }

        this.setScroll(this.scrollY - dy);
      },
    );
  }

  private updateScrollMetrics(): void {
    const overflow = Math.max(
      0,
      this.contentHeight - this.scrollViewportRect.height,
    );
    this.maxScrollY = 0;
    this.minScrollY = -overflow;
    this.setScroll(this.scrollY);
  }

  private setScroll(nextY: number): void {
    this.scrollY = Phaser.Math.Clamp(nextY, this.minScrollY, this.maxScrollY);
    this.scrollContent.setY(this.scrollY);
  }
}
