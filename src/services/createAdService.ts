import { Capacitor } from '@capacitor/core';
import type { AdService } from './AdService';
import { AdMobAdService } from './AdMobAdService';
import { MockAdService } from './MockAdService';
import { adsConfig } from '../config/ads';

export function createAdService(): AdService {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() === 'web') {
    if (adsConfig.debugLogs) {
      console.log('[createAdService] Using MockAdService on web platform');
    }
    return new MockAdService();
  }

  if (adsConfig.debugLogs) {
    console.log('[createAdService] Using AdMobAdService on native platform');
  }
  return new AdMobAdService();
}
