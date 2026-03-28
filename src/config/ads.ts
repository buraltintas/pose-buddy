export interface AdCadenceConfig {
  interstitialEveryNCompletions: number;
  skipInterstitialUntilLevel: number;
  interstitialCooldownMs: number;
}

export interface AdsPlatformConfig {
  appId: string;
  interstitialUnitId: string;
  rewardedUnitId: string;
}

export interface AdsConfig {
  testMode: boolean;
  debugLogs: boolean;
  enableRewarded: boolean;
  testingDevices: string[];
  npa: boolean;
  cadence: AdCadenceConfig;
  ios: AdsPlatformConfig;
  android: AdsPlatformConfig;
}

const IOS_TEST_APP_ID = 'ca-app-pub-3940256099942544~1458002511';
const IOS_TEST_INTERSTITIAL = 'ca-app-pub-3940256099942544/4411468910';
const IOS_TEST_REWARDED = 'ca-app-pub-3940256099942544/1712485313';

const ANDROID_TEST_APP_ID = 'ca-app-pub-3940256099942544~3347511713';
const ANDROID_TEST_INTERSTITIAL = 'ca-app-pub-3940256099942544/1033173712';
const ANDROID_TEST_REWARDED = 'ca-app-pub-3940256099942544/5224354917';

const isProd = import.meta.env.PROD;

const env = import.meta.env as Record<string, string | undefined>;

const TEST_DEVICE_IDS = (env.VITE_ADS_TEST_DEVICE_IDS ?? '')
  .split(',')
  .map((id) => id.trim())
  .filter((id) => id.length > 0);

const IOS_ADMOB_APP_ID = env.VITE_IOS_ADMOB_APP_ID ?? '';
const IOS_INTERSTITIAL_UNIT_ID = env.VITE_IOS_INTERSTITIAL_UNIT_ID ?? '';
const IOS_REWARDED_UNIT_ID = env.VITE_IOS_REWARDED_UNIT_ID ?? '';

const ANDROID_ADMOB_APP_ID = env.VITE_ANDROID_ADMOB_APP_ID ?? '';
const ANDROID_INTERSTITIAL_UNIT_ID =
  env.VITE_ANDROID_INTERSTITIAL_UNIT_ID ?? '';
const ANDROID_REWARDED_UNIT_ID = env.VITE_ANDROID_REWARDED_UNIT_ID ?? '';

export const adsConfig: AdsConfig = {
  testMode: isProd ? env.VITE_ADS_TEST_MODE === '1' : true,
  debugLogs: !isProd || env.VITE_ADS_DEBUG === '1',
  enableRewarded: env.VITE_ADS_ENABLE_REWARDED !== '0',
  testingDevices: TEST_DEVICE_IDS,
  npa: true,
  cadence: {
    interstitialEveryNCompletions: 3,
    skipInterstitialUntilLevel: 3,
    interstitialCooldownMs: 45_000,
  },
  ios: {
    appId: IOS_ADMOB_APP_ID,
    interstitialUnitId: IOS_INTERSTITIAL_UNIT_ID,
    rewardedUnitId: IOS_REWARDED_UNIT_ID,
  },
  android: {
    appId: ANDROID_ADMOB_APP_ID,
    interstitialUnitId: ANDROID_INTERSTITIAL_UNIT_ID,
    rewardedUnitId: ANDROID_REWARDED_UNIT_ID,
  },
};

export function getEffectiveAdUnitId(
  platform: 'ios' | 'android',
  kind: 'interstitial' | 'rewarded',
  testMode: boolean,
): string {
  if (testMode) {
    if (platform === 'ios') {
      return kind === 'interstitial'
        ? IOS_TEST_INTERSTITIAL
        : IOS_TEST_REWARDED;
    }

    return kind === 'interstitial'
      ? ANDROID_TEST_INTERSTITIAL
      : ANDROID_TEST_REWARDED;
  }

  const platformConfig = platform === 'ios' ? adsConfig.ios : adsConfig.android;
  const configured =
    kind === 'interstitial'
      ? platformConfig.interstitialUnitId
      : platformConfig.rewardedUnitId;

  if (configured) {
    return configured;
  }

  // Safety fallback: never request a production ad without explicit unit IDs.
  if (platform === 'ios') {
    return kind === 'interstitial' ? IOS_TEST_INTERSTITIAL : IOS_TEST_REWARDED;
  }

  return kind === 'interstitial'
    ? ANDROID_TEST_INTERSTITIAL
    : ANDROID_TEST_REWARDED;
}

export function getConfiguredAppId(platform: 'ios' | 'android'): string {
  if (platform === 'ios') {
    return adsConfig.ios.appId || IOS_TEST_APP_ID;
  }

  return adsConfig.android.appId || ANDROID_TEST_APP_ID;
}
