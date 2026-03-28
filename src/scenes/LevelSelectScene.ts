import Phaser from 'phaser';
import { Theme } from '../config/theme';
import { SCENES } from '../core/sceneKeys';
import { LayoutService, type PortraitLayout } from '../services/LayoutService';
import { createControlHitArea } from '../ui/hitArea';
import { BaseScene } from './BaseScene';

export class LevelSelectScene extends BaseScene {
  private layout!: PortraitLayout;
  private backButton!: Phaser.GameObjects.Container;
  private title!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private gridViewport!: Phaser.GameObjects.Container;
  private gridContent!: Phaser.GameObjects.Container;
  private gridMaskGraphics!: Phaser.GameObjects.Graphics;
  private gridMask!: Phaser.Display.Masks.GeometryMask;
  private viewportRect!: Phaser.Geom.Rectangle;
  private activeScrollPointerId: number | null;
  private contentHeight: number;
  private scrollY: number;
  private minScrollY: number;
  private maxScrollY: number;
  private isDraggingScroll: boolean;
  private dragStartY: number;
  private dragStartScrollY: number;
  private dragDistance: number;
  private ignoreLevelInputUntilMs: number;
  private hasSeenPointerRelease: boolean;
  private readonly dragThreshold = 8;

  constructor(key: string) {
    super(key);
    this.contentHeight = 0;
    this.scrollY = 0;
    this.minScrollY = 0;
    this.maxScrollY = 0;
    this.activeScrollPointerId = null;
    this.isDraggingScroll = false;
    this.dragStartY = 0;
    this.dragStartScrollY = 0;
    this.dragDistance = 0;
    this.ignoreLevelInputUntilMs = 0;
    this.hasSeenPointerRelease = false;
  }

  create(): void {
    this.layout = LayoutService.createPortraitLayout(
      this.scale.gameSize.width,
      this.scale.gameSize.height,
    );
    this.drawBackground(this.layout.width, this.layout.height);

    const header = this.getHeaderAnchors(this.layout);
    this.backButton = this.createHeaderBackButton(() =>
      this.scene.start(SCENES.home),
    );
    this.backButton.setPosition(header.leftX, header.y);

    this.title = this.add
      .text(0, 0, this.ctx.i18n.t('common.levelSelect'), {
        fontFamily: Theme.font,
        fontSize: '38px',
        fontStyle: '700',
        color: '#27465c',
      })
      .setOrigin(0.5);
    this.title.setWordWrapWidth(
      this.layout.width - this.layout.safePadding * 2 - 110,
    );

    this.hint = this.add
      .text(0, 0, this.ctx.i18n.t('levelSelect.tapToPlay'), {
        fontFamily: Theme.font,
        fontSize: '20px',
        color: '#4f6a7d',
      })
      .setOrigin(0.5);

    this.gridViewport = this.add.container(0, 0);
    this.gridContent = this.add.container(0, 0);
    this.gridViewport.add(this.gridContent);

    this.gridMaskGraphics = this.add.graphics();
    this.gridMaskGraphics.setVisible(false);
    this.gridMask = new Phaser.Display.Masks.GeometryMask(
      this,
      this.gridMaskGraphics,
    );
    this.gridViewport.setMask(this.gridMask);
    this.viewportRect = new Phaser.Geom.Rectangle(0, 0, 1, 1);
    this.ignoreLevelInputUntilMs = this.time.now + 220;
    this.hasSeenPointerRelease = false;

    this.renderLevelGrid();
    this.registerScrollInput();
    this.createOrientationOverlay(this.layout);
    this.applyLayout();

    this.scale.on(Phaser.Scale.Events.RESIZE, this.onResize, this);
  }

  private renderLevelGrid(): void {
    const levels = this.ctx.levels.getAll();
    const columns = 2;
    const tileWidth = Math.floor(
      Phaser.Math.Clamp(this.layout.width * 0.34, 132, 162),
    );
    const tileHeight = Math.floor(tileWidth * 0.86);
    const gap = Math.floor(Phaser.Math.Clamp(this.layout.width * 0.03, 14, 20));
    const gridWidth = columns * tileWidth + (columns - 1) * gap;
    const viewportWidth = this.layout.width - this.layout.safePadding * 2;
    const startX = (viewportWidth - gridWidth) * 0.5;
    let maxBottom = 0;

    levels.forEach((level, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);

      const unlocked = this.ctx.progress.isUnlocked(level.id);
      const completed = this.ctx.progress.isCompleted(level.id);
      const score = Math.round(this.ctx.progress.getBestScore(level.id) * 100);

      const x = startX + col * (tileWidth + gap);
      const y = row * (tileHeight + gap);

      const card = this.add.container(x, y);

      const bg = this.add
        .rectangle(
          tileWidth * 0.5,
          tileHeight * 0.5,
          tileWidth,
          tileHeight,
          unlocked ? 0xffffff : Theme.palette.disabled,
        )
        .setStrokeStyle(2, unlocked ? Theme.palette.boardStroke : 0x9ea7af)
        .setOrigin(0.5);

      const title = this.add
        .text(
          tileWidth * 0.5,
          tileHeight * 0.5 - 30,
          this.ctx.i18n.t('common.level', { id: level.id }),
          {
            fontFamily: Theme.font,
            fontSize: '22px',
            fontStyle: '700',
            color: unlocked ? '#2d4e64' : '#6b757e',
          },
        )
        .setOrigin(0.5);

      const subtitle = this.add
        .text(
          tileWidth * 0.5,
          tileHeight * 0.5 + 20,
          unlocked
            ? completed
              ? this.ctx.i18n.t('history.best', { value: score })
              : this.ctx.i18n.t('levelSelect.unlocked')
            : this.ctx.i18n.t('common.locked'),
          {
            fontFamily: Theme.font,
            fontSize: '18px',
            color: unlocked ? '#547083' : '#75808a',
          },
        )
        .setOrigin(0.5);

      card.add([bg, title, subtitle]);
      this.gridContent.add(card);
      maxBottom = Math.max(maxBottom, y + tileHeight);

      if (!unlocked) {
        return;
      }

      const hitArea = createControlHitArea(this, card, {
        x: 0,
        y: 0,
        width: tileWidth,
        height: tileHeight,
        centered: false,
      });

      let armedPointerId: number | null = null;

      hitArea.zone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        if (
          this.time.now < this.ignoreLevelInputUntilMs ||
          !this.hasSeenPointerRelease
        ) {
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

        if (
          !isArmedTap ||
          this.time.now < this.ignoreLevelInputUntilMs ||
          !this.hasSeenPointerRelease
        ) {
          return;
        }

        if (this.dragDistance > this.dragThreshold) {
          return;
        }
        this.scene.start(SCENES.game, { levelId: level.id });
      });
    });

    const rows = Math.ceil(levels.length / columns);
    this.contentHeight = Math.max(maxBottom, rows * (tileHeight + gap) - gap);
  }

  private registerScrollInput(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (
        !Phaser.Geom.Rectangle.Contains(this.viewportRect, pointer.x, pointer.y)
      ) {
        return;
      }

      this.activeScrollPointerId = pointer.id;
      this.isDraggingScroll = true;
      this.dragStartY = pointer.y;
      this.dragStartScrollY = this.scrollY;
      this.dragDistance = 0;
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (
        !this.isDraggingScroll ||
        !pointer.isDown ||
        this.activeScrollPointerId !== pointer.id
      ) {
        return;
      }

      const deltaY = pointer.y - this.dragStartY;
      this.dragDistance = Math.max(this.dragDistance, Math.abs(deltaY));
      this.setScroll(this.dragStartScrollY + deltaY);
    });

    const stopDrag = () => {
      this.isDraggingScroll = false;
      this.activeScrollPointerId = null;
      this.hasSeenPointerRelease = true;
    };

    this.input.on('pointerup', stopDrag);
    this.input.on('pointerupoutside', stopDrag);

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
            this.viewportRect,
            pointer.x,
            pointer.y,
          )
        ) {
          return;
        }

        this.setScroll(this.scrollY - dy);
      },
    );
  }

  private setScroll(nextY: number): void {
    this.scrollY = Phaser.Math.Clamp(nextY, this.minScrollY, this.maxScrollY);
    this.gridContent.setY(this.scrollY);
  }

  private updateScrollMetrics(): void {
    const viewportHeight = this.viewportRect.height;
    const maxOffset = Math.max(0, this.contentHeight - viewportHeight);
    this.maxScrollY = 0;
    this.minScrollY = -maxOffset;
    this.setScroll(this.scrollY);
  }

  private onResize(gameSize: Phaser.Structs.Size): void {
    this.scene.restart();
    this.layout = LayoutService.createPortraitLayout(
      gameSize.width,
      gameSize.height,
    );
  }

  private applyLayout(): void {
    const header = this.getHeaderAnchors(this.layout);
    this.backButton.setPosition(header.leftX, header.y);
    this.title.setPosition(this.layout.width * 0.5, header.y);
    this.hint.setPosition(this.layout.width * 0.5, header.y + 40);

    const top = this.hint.y + 26;
    const left = this.layout.safePadding;
    const width = this.layout.width - this.layout.safePadding * 2;
    const height = Math.max(
      120,
      this.layout.height - top - this.layout.safePadding,
    );

    this.viewportRect.setTo(left, top, width, height);

    this.gridViewport.setPosition(left, top);

    this.gridMaskGraphics.clear();
    this.gridMaskGraphics.fillStyle(0xffffff, 1);
    this.gridMaskGraphics.fillRect(left, top, width, height);

    this.updateScrollMetrics();
    this.setOrientationOverlay(this.layout);
  }
}
