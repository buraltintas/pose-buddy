import Phaser from 'phaser';
import { Theme } from '../config/theme';
import { SCENES } from '../core/sceneKeys';
import { LANGUAGE_LABELS } from '../i18n';
import type { LanguageCode } from '../i18n/types';
import {
  LayoutService,
  type PaddedPageLayout,
  type PortraitLayout,
} from '../services/LayoutService';
import { createButton } from '../ui/button';
import { BaseScene } from './BaseScene';

export class SettingsScene extends BaseScene {
  private layout!: PortraitLayout;
  private page!: PaddedPageLayout;
  private backButton!: Phaser.GameObjects.Container;
  private titleText!: Phaser.GameObjects.Text;

  constructor(key: string) {
    super(key);
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
        this.ctx.i18n.t('common.settings'),
        {
          fontFamily: Theme.font,
          fontSize: '38px',
          color: '#28475e',
          fontStyle: '700',
        },
      )
      .setOrigin(0.5);
    this.titleText.setWordWrapWidth(
      this.layout.width - this.layout.safePadding * 2 - 110,
    );

    this.renderLanguageButtons();
    this.renderToggleButtons();

    this.createOrientationOverlay(this.layout);
    this.setOrientationOverlay(this.layout);

    this.scale.on(Phaser.Scale.Events.RESIZE, () => this.scene.restart(), this);
  }

  private renderLanguageButtons(): void {
    this.add
      .text(
        this.page.content.x + this.page.content.width * 0.5,
        this.page.content.y + 12,
        this.ctx.i18n.t('settings.language'),
        {
          fontFamily: Theme.font,
          fontSize: '24px',
          color: '#3e5e75',
          fontStyle: '700',
        },
      )
      .setOrigin(0.5);

    const languages = this.ctx.i18n.getLanguages();
    const current = this.ctx.i18n.getLanguage();
    const columns = this.page.content.width >= 340 ? 3 : 2;
    const gapX = Phaser.Math.Clamp(this.page.content.width * 0.038, 10, 14);
    const buttonWidth =
      (this.page.content.width - gapX * (columns - 1)) / columns;
    const buttonHeight = 56;
    const startY = this.page.content.y + 64;
    const stepY = 72;

    languages.forEach((lang, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      const x =
        this.page.content.x + buttonWidth * 0.5 + col * (buttonWidth + gapX);
      const y = startY + row * stepY;

      createButton(this, x, y, {
        width: buttonWidth,
        height: buttonHeight,
        label: LANGUAGE_LABELS[lang],
        background:
          current === lang ? Theme.palette.accent : Theme.palette.softInk,
        onPress: () => this.changeLanguage(lang),
      });
    });
  }

  private renderToggleButtons(): void {
    const languageRows = Math.ceil(
      this.ctx.i18n.getLanguages().length /
        (this.page.content.width >= 340 ? 3 : 2),
    );
    const baseY = this.page.content.y + 64 + languageRows * 72 + 24;
    const rowWidth = this.page.content.width;
    const centerX = this.page.content.x + rowWidth * 0.5;

    createButton(this, centerX, baseY, {
      width: rowWidth,
      height: 58,
      label: `${this.ctx.i18n.t('settings.music')}: ${this.onOff(this.ctx.progress.getSetting('musicEnabled'))}`,
      background: Theme.palette.ink,
      onPress: () => {
        const next = !this.ctx.progress.getSetting('musicEnabled');
        this.ctx.progress.setSetting('musicEnabled', next);
        this.ctx.music.setEnabled(next);
        this.scene.restart();
      },
    });

    createButton(this, centerX, baseY + 74, {
      width: rowWidth,
      height: 58,
      label: `${this.ctx.i18n.t('settings.mockAds')}: ${this.onOff(this.ctx.progress.getSetting('mockAdsEnabled'))}`,
      background: Theme.palette.softInk,
      onPress: () => {
        const next = !this.ctx.progress.getSetting('mockAdsEnabled');
        this.ctx.progress.setSetting('mockAdsEnabled', next);
        this.scene.restart();
      },
    });

    createButton(this, centerX, baseY + 148, {
      width: rowWidth,
      height: 58,
      label: `${this.ctx.i18n.t('settings.reminders')}: ${this.onOff(this.ctx.progress.getSetting('remindersEnabled'))}`,
      background: 0x6f8c68,
      onPress: () => {
        const next = !this.ctx.progress.getSetting('remindersEnabled');
        void this.ctx.notifications
          .setRemindersEnabled(next)
          .finally(() => this.scene.restart());
      },
    });

    const resetNotice = this.add
      .text(centerX, baseY + 248, '', {
        fontFamily: Theme.font,
        fontSize: '20px',
        color: '#805433',
      })
      .setOrigin(0.5);

    createButton(this, centerX, baseY + 222, {
      width: rowWidth,
      height: 58,
      label: this.ctx.i18n.t('settings.resetProgress'),
      background: 0xb56f45,
      onPress: () => {
        this.ctx.progress.resetProgress();
        resetNotice.setText(this.ctx.i18n.t('settings.resetConfirm'));
      },
    });
  }

  private changeLanguage(language: LanguageCode): void {
    this.ctx.i18n.setLanguage(language);
    this.scene.restart();
  }

  private onOff(enabled: boolean): string {
    return enabled
      ? this.ctx.i18n.t('common.on')
      : this.ctx.i18n.t('common.off');
  }
}
