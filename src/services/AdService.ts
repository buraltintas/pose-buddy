export interface InterstitialRequestContext {
  levelId?: number;
  completionCount?: number;
}

export interface AdService {
  initializeAds(): Promise<void>;
  preloadInterstitial(): Promise<void>;
  showInterstitialIfEligible(
    context?: InterstitialRequestContext,
  ): Promise<boolean>;
  preloadRewarded(): Promise<void>;
  showRewarded(onReward?: () => void): Promise<boolean>;
  setTestMode(enabled: boolean): void;
  isInterstitialReady(): boolean;
  isRewardedReady(): boolean;
}
