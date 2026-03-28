import { Capacitor } from '@capacitor/core';
import type { LocalizationService } from './LocalizationService';
import { LocalNotificationService } from './LocalNotificationService';
import { MockNotificationService } from './MockNotificationService';
import type { NotificationService } from './NotificationService';
import type { ProgressService } from './ProgressService';
import { notificationConfig } from '../config/notifications';

export function createNotificationService(
  progress: ProgressService,
  i18n: LocalizationService,
): NotificationService {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() === 'web') {
    if (notificationConfig.debugLogs) {
      console.log('[createNotificationService] Using MockNotificationService');
    }
    return new MockNotificationService();
  }

  if (notificationConfig.debugLogs) {
    console.log('[createNotificationService] Using LocalNotificationService');
  }
  return new LocalNotificationService(progress, i18n);
}
