import Phaser from 'phaser';
import { Theme } from '../config/theme';
import { SCENES } from '../core/sceneKeys';
import { LayoutService, type PortraitLayout } from '../services/LayoutService';
import { createButton } from '../ui/button';
import { BaseScene } from './BaseScene';

export class HomeScene extends BaseScene {
  private layout!: PortraitLayout;

  private logoImage!: Phaser.GameObjects.Image;
  private subtitle!: Phaser.GameObjects.Text;
  private playButton!: Phaser.GameObjects.Container;
  private levelSelectButton!: Phaser.GameObjects.Container;
  private historyButton!: Phaser.GameObjects.Container;
  private poseLibraryButton!: Phaser.GameObjects.Container;
  private settingsButton!: Phaser.GameObjects.Container;

  constructor(key: string) {
    super(key);
  }

  create(): void {
    this.layout = LayoutService.createPortraitLayout(
      this.scale.gameSize.width,
      this.scale.gameSize.height,
    );

    this.ctx.music.attachAutoplayUnlock(this);
    void this.ctx.music.play();

    this.drawBackground(this.layout.width, this.layout.height);

    this.logoImage = this.add.image(0, 0, 'app-logo').setOrigin(0.5);

    this.subtitle = this.add
      .text(0, 0, this.ctx.i18n.t('home.subtitle'), {
        fontFamily: Theme.font,
        fontSize: '22px',
        color: '#516f82',
        align: 'center',
      })
      .setOrigin(0.5);

    this.playButton = createButton(this, 0, 0, {
      width: 280,
      height: 72,
      label: this.ctx.i18n.t('common.play'),
      background: Theme.palette.accent,
      onPress: () => {
        const levelId = this.resolveHomePlayLevelId();
        this.scene.start(SCENES.game, { levelId });
      },
    });

    this.levelSelectButton = createButton(this, 0, 0, {
      width: 280,
      height: 68,
      label: this.ctx.i18n.t('common.levelSelect'),
      background: Theme.palette.ink,
      onPress: () => this.scene.start(SCENES.levelSelect),
    });

    this.historyButton = createButton(this, 0, 0, {
      width: 280,
      height: 68,
      label: this.ctx.i18n.t('common.history'),
      background: Theme.palette.softInk,
      onPress: () => this.scene.start(SCENES.gallery),
    });

    this.poseLibraryButton = createButton(this, 0, 0, {
      width: 280,
      height: 68,
      label: this.ctx.i18n.t('common.poseLibrary'),
      background: 0x6f8c68,
      onPress: () => this.scene.start(SCENES.poseLibrary),
    });

    this.settingsButton = createButton(this, 0, 0, {
      width: 280,
      height: 68,
      label: this.ctx.i18n.t('common.settings'),
      background: 0x6b7f90,
      onPress: () => this.scene.start(SCENES.settings),
    });

    this.createOrientationOverlay(this.layout);
    this.applyLayout();

    this.scale.on(Phaser.Scale.Events.RESIZE, this.onResize, this);
  }

  private onResize(gameSize: Phaser.Structs.Size): void {
    this.layout = LayoutService.createPortraitLayout(
      gameSize.width,
      gameSize.height,
    );
    this.scene.restart();
  }

  private applyLayout(): void {
    const centerX = this.layout.width * 0.5;
    const availableWidth = this.layout.width - this.layout.safePadding * 2;
    const buttonScale = Phaser.Math.Clamp(availableWidth / 320, 0.82, 1);

    this.playButton.setScale(buttonScale);
    this.levelSelectButton.setScale(buttonScale);
    this.historyButton.setScale(buttonScale);
    this.poseLibraryButton.setScale(buttonScale);
    this.settingsButton.setScale(buttonScale);

    const subtitleFontSize = Math.round(
      Phaser.Math.Clamp(this.layout.width * 0.052, 18, 26),
    );
    const logoWidth = Phaser.Math.Clamp(this.layout.width * 0.34, 104, 188);
    const logoScale =
      this.logoImage.width > 0 ? logoWidth / this.logoImage.width : 1;
    this.logoImage.setScale(logoScale);
    const logoHeight = this.logoImage.displayHeight;

    this.subtitle.setWordWrapWidth(availableWidth * 0.84);
    this.subtitle.setFontSize(subtitleFontSize);

    const contentTop = this.layout.safeTop + 8;
    const contentBottom = this.layout.height - this.layout.safePadding - 12;

    const logoToSubtitleGap = Phaser.Math.Clamp(
      this.layout.height * 0.008,
      4,
      8,
    );
    const titleBlockHeight = logoHeight + logoToSubtitleGap + subtitleFontSize;
    const buttonHeights = (72 + 68 + 68 + 68 + 68) * buttonScale;
    const dynamicGap = Phaser.Math.Clamp(this.layout.height * 0.03, 16, 26);
    const buttonsBlockHeight = buttonHeights + dynamicGap * 4;

    const titleToButtonsGap = Phaser.Math.Clamp(
      this.layout.height * 0.034,
      20,
      34,
    );
    const totalContentHeight =
      titleBlockHeight + titleToButtonsGap + buttonsBlockHeight;
    const yStart = Phaser.Math.Clamp(
      contentTop + (contentBottom - contentTop - totalContentHeight) * 0.38,
      contentTop,
      contentBottom - totalContentHeight,
    );

    const logoY = yStart + logoHeight * 0.5;
    this.logoImage.setPosition(centerX, logoY);

    this.subtitle.setPosition(
      centerX,
      logoY + logoHeight * 0.5 + logoToSubtitleGap + subtitleFontSize * 0.5,
    );

    const buttonsStart = yStart + titleBlockHeight + titleToButtonsGap;

    const playY = buttonsStart + 72 * buttonScale * 0.5;
    const levelY =
      playY + 72 * buttonScale * 0.5 + dynamicGap + 68 * buttonScale * 0.5;
    const historyY =
      levelY + 68 * buttonScale * 0.5 + dynamicGap + 68 * buttonScale * 0.5;
    const libraryY =
      historyY + 68 * buttonScale * 0.5 + dynamicGap + 68 * buttonScale * 0.5;
    const settingsY =
      libraryY + 68 * buttonScale * 0.5 + dynamicGap + 68 * buttonScale * 0.5;

    this.playButton.setPosition(centerX, playY);
    this.levelSelectButton.setPosition(centerX, levelY);
    this.historyButton.setPosition(centerX, historyY);
    this.poseLibraryButton.setPosition(centerX, libraryY);
    this.settingsButton.setPosition(centerX, settingsY);

    this.setOrientationOverlay(this.layout);
  }
  private resolveHomePlayLevelId(): number {
    return this.ctx.levels.getNextProgressionLevel({
      unlockedLevel: this.ctx.progress.getUnlockedLevel(),
      isCompleted: (levelId) => this.ctx.progress.isCompleted(levelId),
    });
  }
}
