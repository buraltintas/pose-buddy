import Phaser from 'phaser';
import { Theme } from '../config/theme';
import { SCENES } from '../core/sceneKeys';
import {
  LayoutService,
  type PaddedPageLayout,
  type PortraitLayout,
} from '../services/LayoutService';
import { createControlHitArea } from '../ui/hitArea';
import { BaseScene } from './BaseScene';

export class GalleryScene extends BaseScene {
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
  private dragDistance: number;
  private didScrollDuringPointer: boolean;
  private ignoreCardInputUntilMs: number;
  private readonly dragThreshold = 8;

  constructor(key: string) {
    super(key);
    this.contentHeight = 0;
    this.scrollY = 0;
    this.minScrollY = 0;
    this.maxScrollY = 0;
    this.activeScrollPointerId = null;
    this.dragStartY = 0;
    this.dragStartScrollY = 0;
    this.dragDistance = 0;
    this.didScrollDuringPointer = false;
    this.ignoreCardInputUntilMs = 0;
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
      .text(
        this.layout.width * 0.5,
        header.y,
        this.ctx.i18n.t('common.history'),
        {
          fontFamily: Theme.font,
          fontSize: '38px',
          fontStyle: '700',
          color: '#27465c',
        },
      )
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
    this.ignoreCardInputUntilMs = this.time.now + 220;

    this.renderCards();
    this.applyScrollLayout();
    this.registerScrollInput();
    this.createOrientationOverlay(this.layout);
    this.setOrientationOverlay(this.layout);

    this.scale.on(Phaser.Scale.Events.RESIZE, () => this.scene.restart(), this);
  }

  private renderCards(): void {
    const levels = this.ctx.levels.getAll();
    const completed = levels.filter((level) =>
      this.ctx.progress.isCompleted(level.id),
    );

    if (completed.length === 0) {
      const empty = this.add
        .text(
          this.page.content.width * 0.5,
          92,
          this.ctx.i18n.t('history.empty'),
          {
            fontFamily: Theme.font,
            fontSize: '22px',
            color: '#607a8d',
            align: 'center',
          },
        )
        .setWordWrapWidth(this.page.content.width - 16, true)
        .setOrigin(0.5);

      this.scrollContent.add(empty);
      this.contentHeight = Math.max(160, empty.y + empty.height * 0.5 + 28);
      return;
    }

    const columns = this.page.content.width >= 336 ? 2 : 1;
    const gapX = Phaser.Math.Clamp(this.page.content.width * 0.04, 12, 18);
    const gapY = 16;
    const width = (this.page.content.width - gapX * (columns - 1)) / columns;
    const height = Phaser.Math.Clamp(width * 0.56, 114, 138);
    const startY = 24;

    completed.forEach((level, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      const cardX = col * (width + gapX);
      const cardY = startY + row * (height + gapY);
      const score = Math.round(this.ctx.progress.getBestScore(level.id) * 100);

      const card = this.add.container(cardX, cardY);

      const bg = this.add
        .rectangle(width * 0.5, height * 0.5, width, height, 0xffffff)
        .setStrokeStyle(2, Theme.palette.boardStroke)
        .setOrigin(0.5);

      const title = this.add
        .text(
          width * 0.5,
          height * 0.5 - 26,
          this.ctx.i18n.t('common.level', { id: level.id }),
          {
            fontFamily: Theme.font,
            fontSize: '24px',
            color: '#2d4e64',
            fontStyle: '700',
          },
        )
        .setOrigin(0.5);

      const subtitle = this.add
        .text(
          width * 0.5,
          height * 0.5 + 6,
          this.ctx.i18n.t('history.best', { value: score }),
          {
            fontFamily: Theme.font,
            fontSize: '20px',
            color: '#507083',
          },
        )
        .setOrigin(0.5);

      card.add([bg, title, subtitle]);

      const hitArea = createControlHitArea(this, card, {
        x: 0,
        y: 0,
        width,
        height,
        centered: false,
      });

      let armedPointerId: number | null = null;

      hitArea.zone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        if (this.time.now < this.ignoreCardInputUntilMs) {
          armedPointerId = null;
          return;
        }

        armedPointerId = pointer.id;
      });

      hitArea.zone.on('pointerout', () => {
        armedPointerId = null;
      });

      hitArea.zone.on('pointerup', (pointer: Phaser.Input.Pointer) => {
        const isArmedTap = armedPointerId === pointer.id;
        armedPointerId = null;

        if (!isArmedTap || this.time.now < this.ignoreCardInputUntilMs) {
          return;
        }

        if (
          this.didScrollDuringPointer ||
          this.dragDistance > this.dragThreshold
        ) {
          return;
        }
        this.scene.start(SCENES.game, { levelId: level.id, source: 'history' });
      });

      this.scrollContent.add(card);
    });

    const rows = Math.ceil(completed.length / columns);
    const gridBottom = startY + rows * height + (rows - 1) * gapY;
    const summaryY = gridBottom + 28;

    const summary = this.add
      .text(
        this.page.content.width * 0.5,
        summaryY,
        this.ctx.i18n.t('history.solved', { value: completed.length }),
        {
          fontFamily: Theme.font,
          fontSize: '22px',
          color: '#486679',
        },
      )
      .setOrigin(0.5);

    this.scrollContent.add(summary);
    this.contentHeight = summaryY + summary.height * 0.5 + 24;
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
      this.dragDistance = 0;
      this.didScrollDuringPointer = false;
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
      this.dragDistance = Math.max(this.dragDistance, Math.abs(deltaY));
      if (this.dragDistance > this.dragThreshold) {
        this.didScrollDuringPointer = true;
      }
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
