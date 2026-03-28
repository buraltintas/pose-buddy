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

const isProd = import.meta.env.PROD;

const env = import.meta.env as Record<string, string | undefined>;

const TEST_DEVICE_IDS = (env.VITE_ADS_TEST_DEVICE_IDS ?? '')
  .split(',')
  .map((id) => id.trim())
  .filter((id) => id.length > 0);

const IOS_ADMOB_APP_ID =
  env.VITE_IOS_ADMOB_APP_ID?.trim() || 'ca-app-pub-7640689562014954~4647792874';
const IOS_INTERSTITIAL_UNIT_ID =
  env.VITE_IOS_INTERSTITIAL_UNIT_ID?.trim() ||
  'ca-app-pub-7640689562014954/1021473288';
const IOS_REWARDED_UNIT_ID = env.VITE_IOS_REWARDED_UNIT_ID ?? '';

const ANDROID_ADMOB_APP_ID = env.VITE_ANDROID_ADMOB_APP_ID ?? '';
const ANDROID_INTERSTITIAL_UNIT_ID =
  env.VITE_ANDROID_INTERSTITIAL_UNIT_ID ?? '';
const ANDROID_REWARDED_UNIT_ID = env.VITE_ANDROID_REWARDED_UNIT_ID ?? '';

export const adsConfig: AdsConfig = {
  // Native runtime should use real ads unless explicitly forced for debug.
  testMode: env.VITE_ADS_NATIVE_TEST_MODE === '1',
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
): string {
  const platformConfig = platform === 'ios' ? adsConfig.ios : adsConfig.android;
  return kind === 'interstitial'
    ? platformConfig.interstitialUnitId
    : platformConfig.rewardedUnitId;
}

export function getConfiguredAppId(platform: 'ios' | 'android'): string {
  return platform === 'ios' ? adsConfig.ios.appId : adsConfig.android.appId;
}
