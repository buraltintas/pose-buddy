import { Capacitor } from '@capacitor/core';
import {
  AdMob,
  type AdMobInitializationOptions,
  InterstitialAdPluginEvents,
  RewardAdPluginEvents,
} from '@capacitor-community/admob';
import { adsConfig, getEffectiveAdUnitId } from '../config/ads';
import type { InterstitialRequestContext, AdService } from './AdService';

export class AdMobAdService implements AdService {
  private initialized: boolean;
  private initializing: Promise<void> | null;
  private interstitialReady: boolean;
  private rewardedReady: boolean;
  private completionCounter: number;
  private lastInterstitialAt: number;
  private testMode: boolean;

  constructor() {
    this.initialized = false;
    this.initializing = null;
    this.interstitialReady = false;
    this.rewardedReady = false;
    this.completionCounter = 0;
    this.lastInterstitialAt = 0;
    this.testMode = adsConfig.testMode;
  }

  public setTestMode(enabled: boolean): void {
    this.testMode = enabled;
  }

  public isInterstitialReady(): boolean {
    return this.interstitialReady;
  }

  public isRewardedReady(): boolean {
    return this.rewardedReady;
  }

  public async initializeAds(): Promise<void> {
    if (!this.isNativeMobile()) {
      this.log('Skipping AdMob init on web platform');
      return;
    }

    if (this.initialized) {
      return;
    }

    if (this.initializing) {
      return this.initializing;
    }

    this.initializing = this.initializeInternal();
    return this.initializing;
  }

  public async preloadInterstitial(): Promise<void> {
    if (!this.isNativeMobile()) {
      return;
    }

    await this.initializeAds();

    try {
      const adId = this.resolveAdUnit('interstitial');
      await AdMob.prepareInterstitial({
        adId,
        isTesting: this.testMode,
        npa: adsConfig.npa,
      });
      this.interstitialReady = true;
      this.log('Interstitial preloaded');
    } catch (error) {
      this.interstitialReady = false;
      this.log('Interstitial preload failed', error);
    }
  }

  public async showInterstitialIfEligible(
    context: InterstitialRequestContext = {},
  ): Promise<boolean> {
    if (!this.isNativeMobile()) {
      return false;
    }

    await this.initializeAds();

    const levelId = context.levelId ?? 0;
    if (levelId > 0 && levelId < adsConfig.cadence.skipInterstitialUntilLevel) {
      this.log('Interstitial skipped due to onboarding level', { levelId });
      return false;
    }

    const completions = context.completionCount ?? ++this.completionCounter;

    if (completions % adsConfig.cadence.interstitialEveryNCompletions !== 0) {
      this.log('Interstitial skipped by cadence', { completions });
      return false;
    }

    const now = Date.now();
    if (
      now - this.lastInterstitialAt <
      adsConfig.cadence.interstitialCooldownMs
    ) {
      this.log('Interstitial skipped by cooldown');
      return false;
    }

    if (!this.interstitialReady) {
      await this.preloadInterstitial();
    }

    if (!this.interstitialReady) {
      this.log('Interstitial unavailable to show');
      return false;
    }

    try {
      await AdMob.showInterstitial();
      this.interstitialReady = false;
      this.lastInterstitialAt = now;
      this.log('Interstitial showed');
      void this.preloadInterstitial();
      return true;
    } catch (error) {
      this.interstitialReady = false;
      this.log('Interstitial show failed', error);
      void this.preloadInterstitial();
      return false;
    }
  }

  public async preloadRewarded(): Promise<void> {
    if (!adsConfig.enableRewarded || !this.isNativeMobile()) {
      return;
    }

    await this.initializeAds();

    try {
      const adId = this.resolveAdUnit('rewarded');
      await AdMob.prepareRewardVideoAd({
        adId,
        isTesting: this.testMode,
        npa: adsConfig.npa,
      });
      this.rewardedReady = true;
      this.log('Rewarded preloaded');
    } catch (error) {
      this.rewardedReady = false;
      this.log('Rewarded preload failed', error);
    }
  }

  public async showRewarded(onReward?: () => void): Promise<boolean> {
    if (!adsConfig.enableRewarded || !this.isNativeMobile()) {
      return false;
    }

    await this.initializeAds();

    if (!this.rewardedReady) {
      await this.preloadRewarded();
    }

    if (!this.rewardedReady) {
      this.log('Rewarded unavailable to show');
      return false;
    }

    try {
      await AdMob.showRewardVideoAd();
      this.rewardedReady = false;
      this.log('Rewarded showed');
      if (onReward) {
        onReward();
      }
      void this.preloadRewarded();
      return true;
    } catch (error) {
      this.rewardedReady = false;
      this.log('Rewarded show failed', error);
      void this.preloadRewarded();
      return false;
    }
  }

  private async initializeInternal(): Promise<void> {
    try {
      const options: AdMobInitializationOptions = {
        initializeForTesting: this.testMode,
        testingDevices: adsConfig.testingDevices,
        tagForChildDirectedTreatment: false,
        tagForUnderAgeOfConsent: false,
      };

      await AdMob.initialize(options);

      await AdMob.addListener(InterstitialAdPluginEvents.Loaded, () => {
        this.interstitialReady = true;
      });
      await AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
        this.interstitialReady = false;
      });
      await AdMob.addListener(InterstitialAdPluginEvents.FailedToLoad, () => {
        this.interstitialReady = false;
      });
      await AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, () => {
        this.interstitialReady = false;
      });

      await AdMob.addListener(RewardAdPluginEvents.Loaded, () => {
        this.rewardedReady = true;
      });
      await AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
        this.rewardedReady = false;
      });
      await AdMob.addListener(RewardAdPluginEvents.FailedToLoad, () => {
        this.rewardedReady = false;
      });
      await AdMob.addListener(RewardAdPluginEvents.FailedToShow, () => {
        this.rewardedReady = false;
      });

      this.initialized = true;
      this.log('AdMob initialized', {
        platform: Capacitor.getPlatform(),
        testMode: this.testMode,
      });
    } catch (error) {
      this.log('AdMob initialization failed', error);
    } finally {
      this.initializing = null;
    }
  }

  private resolveAdUnit(kind: 'interstitial' | 'rewarded'): string {
    const platform = Capacitor.getPlatform() === 'ios' ? 'ios' : 'android';
    return getEffectiveAdUnitId(platform, kind, this.testMode);
  }

  private isNativeMobile(): boolean {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() !== 'web';
  }

  private log(message: string, meta?: unknown): void {
    if (!adsConfig.debugLogs) {
      return;
    }

    if (meta) {
      console.log('[AdMobAdService]', message, meta);
      return;
    }

    console.log('[AdMobAdService]', message);
  }
}
