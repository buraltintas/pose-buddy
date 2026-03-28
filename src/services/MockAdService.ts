import type { ProgressService } from './ProgressService';
import { adsConfig } from '../config/ads';
import type { InterstitialRequestContext, AdService } from './AdService';

export class MockAdService implements AdService {
  private completionCounter: number;
  private interstitialReady: boolean;
  private rewardedReady: boolean;
  private lastInterstitialAt: number;
  private testMode: boolean;
  private progress: ProgressService;

  constructor(progress: ProgressService) {
    this.progress = progress;
    this.completionCounter = 0;
    this.interstitialReady = false;
    this.rewardedReady = false;
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
    this.log('Mock ads initialized', { testMode: this.testMode });
  }

  public async preloadInterstitial(): Promise<void> {
    await wait(100);
    this.interstitialReady = true;
    this.log('Mock interstitial preloaded');
  }

  public async showInterstitialIfEligible(
    context: InterstitialRequestContext = {},
  ): Promise<boolean> {
    if (!this.progress.getSetting('mockAdsEnabled')) {
      return false;
    }

    const levelId = context.levelId ?? 0;
    if (levelId > 0 && levelId < adsConfig.cadence.skipInterstitialUntilLevel) {
      return false;
    }

    const completions = context.completionCount ?? ++this.completionCounter;
    if (completions % adsConfig.cadence.interstitialEveryNCompletions !== 0) {
      return false;
    }

    const now = Date.now();
    if (
      now - this.lastInterstitialAt <
      adsConfig.cadence.interstitialCooldownMs
    ) {
      return false;
    }

    if (!this.interstitialReady) {
      await this.preloadInterstitial();
    }

    this.lastInterstitialAt = now;
    this.interstitialReady = false;
    this.log('Mock interstitial shown');

    await wait(250);
    void this.preloadInterstitial();
    return true;
  }

  public async preloadRewarded(): Promise<void> {
    if (!adsConfig.enableRewarded) {
      return;
    }

    await wait(120);
    this.rewardedReady = true;
    this.log('Mock rewarded preloaded');
  }

  public async showRewarded(onReward?: () => void): Promise<boolean> {
    if (!this.progress.getSetting('mockAdsEnabled')) {
      return false;
    }

    if (!adsConfig.enableRewarded) {
      return false;
    }

    if (!this.rewardedReady) {
      await this.preloadRewarded();
    }

    this.rewardedReady = false;
    this.log('Mock rewarded shown');

    await wait(350);
    onReward?.();
    void this.preloadRewarded();
    return true;
  }

  private log(message: string, meta?: unknown): void {
    if (!adsConfig.debugLogs) {
      return;
    }

    if (meta) {
      console.log('[MockAdService]', message, meta);
      return;
    }

    console.log('[MockAdService]', message);
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
