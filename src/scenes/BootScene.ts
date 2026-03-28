import Phaser from 'phaser';
import { adsConfig } from '../config/ads';
import { LocalizationService } from '../services/LocalizationService';
import { LevelService } from '../services/LevelService';
import { MusicService } from '../services/MusicService';
import { ProgressService } from '../services/ProgressService';
import { createAdService } from '../services/createAdService';
import { createNotificationService } from '../services/createNotificationService';
import { BrowserStorageAdapter } from '../storage/StorageAdapter';
import { setGameContext } from '../core/gameContext';
import { SCENES } from '../core/sceneKeys';
import logoImageUrl from '../assets/logo.svg';

export class BootScene extends Phaser.Scene {
  constructor(key: string) {
    super(key);
  }

  preload(): void {
    this.load.svg('app-logo', logoImageUrl, { scale: 3 });
  }

  create(): void {
    void this.bootstrap();
  }

  private async bootstrap(): Promise<void> {
    const progress = new ProgressService(new BrowserStorageAdapter());
    const levels = new LevelService();
    const i18n = new LocalizationService(progress);
    const ads = createAdService(progress);
    const notifications = createNotificationService(progress, i18n);
    ads.setTestMode(adsConfig.testMode);
    const music = new MusicService(
      '/music/main-theme.mp3',
      progress.getSetting('musicEnabled'),
    );

    setGameContext({ progress, levels, i18n, ads, music, notifications });

    try {
      await ads.initializeAds();
      await Promise.all([ads.preloadInterstitial(), ads.preloadRewarded()]);
    } catch {
      // Ads are optional at runtime; gameplay should continue if init fails.
    }

    try {
      await notifications.initialize();
      await notifications.refreshReminderSchedule();
    } catch {
      // Notifications are optional at runtime; gameplay should continue if init fails.
    }

    const logo = this.add
      .image(
        this.scale.gameSize.width * 0.5,
        this.scale.gameSize.height * 0.5,
        'app-logo',
      )
      .setOrigin(0.5);

    const maxWidth = this.scale.gameSize.width * 0.56;
    const maxHeight = this.scale.gameSize.height * 0.22;
    const scaleByWidth = logo.width > 0 ? maxWidth / logo.width : 1;
    const scaleByHeight = logo.height > 0 ? maxHeight / logo.height : 1;
    const logoScale = Math.min(scaleByWidth, scaleByHeight);
    logo.setScale(Phaser.Math.Clamp(logoScale, 0.1, 0.9));

    this.time.delayedCall(320, () => {
      this.scene.start(SCENES.home);
    });
  }
}
