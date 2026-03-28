import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import {
  LocalNotifications,
  type PendingResult,
  type ScheduleOptions,
} from '@capacitor/local-notifications';
import { notificationConfig } from '../config/notifications';
import type { TranslationKey } from '../i18n/types';
import type { LocalizationService } from './LocalizationService';
import type { ProgressService } from './ProgressService';
import type { NotificationService } from './NotificationService';

const REMINDER_SCOPE = 'pose-buddy-reminder';
const REMINDER_CHANNEL_ID = 'pose-buddy-reminders';
const DAY_MS = 24 * 60 * 60 * 1000;

type ReminderMessage = {
  title: TranslationKey;
  body: TranslationKey;
};

const REMINDER_MESSAGES: ReminderMessage[] = [
  {
    title: 'notification.reminder.title1',
    body: 'notification.reminder.body1',
  },
  {
    title: 'notification.reminder.title2',
    body: 'notification.reminder.body2',
  },
  {
    title: 'notification.reminder.title3',
    body: 'notification.reminder.body3',
  },
  {
    title: 'notification.reminder.title4',
    body: 'notification.reminder.body4',
  },
];

export class LocalNotificationService implements NotificationService {
  private readonly progress: ProgressService;
  private readonly i18n: LocalizationService;
  private initialized: boolean;
  private initializing: Promise<void> | null;

  constructor(progress: ProgressService, i18n: LocalizationService) {
    this.progress = progress;
    this.i18n = i18n;
    this.initialized = false;
    this.initializing = null;
  }

  public async initialize(): Promise<void> {
    if (!this.isNativeMobile()) {
      this.log('Skipping local notifications init on web platform');
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

  public async refreshReminderSchedule(): Promise<void> {
    if (!this.isNativeMobile()) {
      return;
    }

    await this.initialize();

    if (!this.progress.getSetting('remindersEnabled')) {
      await this.cancelPoseBuddyReminders();
      return;
    }

    const allowed = await this.ensurePermission();
    if (!allowed) {
      this.progress.setSetting('remindersEnabled', false);
      await this.cancelPoseBuddyReminders();
      return;
    }

    await this.scheduleRollingReminders();
  }

  public async setRemindersEnabled(enabled: boolean): Promise<boolean> {
    if (!this.isNativeMobile()) {
      this.progress.setSetting('remindersEnabled', enabled);
      return enabled;
    }

    await this.initialize();

    if (!enabled) {
      this.progress.setSetting('remindersEnabled', false);
      await this.cancelPoseBuddyReminders();
      return true;
    }

    const allowed = await this.ensurePermission({ openSettingsOnDeny: true });
    if (!allowed) {
      this.log('Notification permission denied while enabling reminders');
      this.progress.setSetting('remindersEnabled', false);
      await this.cancelPoseBuddyReminders();
      return false;
    }

    this.progress.setSetting('remindersEnabled', true);
    await this.scheduleRollingReminders();
    return true;
  }

  public async cancelPoseBuddyReminders(): Promise<void> {
    if (!this.isNativeMobile()) {
      return;
    }

    await this.initialize();

    const pending = await LocalNotifications.getPending();
    const ids = this.extractPoseBuddyIds(pending);
    if (ids.length === 0) {
      return;
    }

    await LocalNotifications.cancel({
      notifications: ids.map((id) => ({ id })),
    });
    this.log('Cancelled Pose Buddy reminders', { count: ids.length });
  }

  public async ensureInitialPermissionChoice(): Promise<void> {
    if (!this.isNativeMobile()) {
      this.progress.setSetting('notificationPermissionHandled', true);
      return;
    }

    await this.initialize();

    if (this.progress.getSetting('notificationPermissionHandled')) {
      return;
    }

    const allowed = await this.ensurePermission();
    this.progress.setSetting('notificationPermissionHandled', true);
    this.progress.setSetting('remindersEnabled', allowed);

    if (!allowed) {
      await this.cancelPoseBuddyReminders();
      this.log('Initial notification permission denied');
      return;
    }

    await this.scheduleRollingReminders();
    this.log('Initial notification permission granted; reminders enabled');
  }

  private async initializeInternal(): Promise<void> {
    try {
      await App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) {
          void this.refreshReminderSchedule();
        }
      });

      await App.addListener('appUrlOpen', () => {
        this.log('App opened from external source/notification');
      });

      await LocalNotifications.addListener(
        'localNotificationActionPerformed',
        () => {
          this.log('Local notification tapped');
        },
      );

      if (Capacitor.getPlatform() === 'android') {
        await LocalNotifications.createChannel({
          id: REMINDER_CHANNEL_ID,
          name: 'Pose Buddy Reminders',
          importance: 3,
          description: 'Pose Buddy reminder notifications',
        });
      }

      this.initialized = true;
      this.log('Local notifications initialized', {
        platform: Capacitor.getPlatform(),
      });
    } catch (error) {
      this.log('Local notifications initialization failed', error);
    } finally {
      this.initializing = null;
    }
  }

  private async ensurePermission(options?: {
    openSettingsOnDeny?: boolean;
  }): Promise<boolean> {
    const current = await LocalNotifications.checkPermissions();
    if (current.display === 'granted') {
      return true;
    }

    const requested = await LocalNotifications.requestPermissions();
    const granted = requested.display === 'granted';

    if (!granted && options?.openSettingsOnDeny) {
      await this.openAppSettings();
    }

    return granted;
  }

  private async openAppSettings(): Promise<void> {
    try {
      if (Capacitor.getPlatform() === 'ios') {
        window.location.href = 'app-settings:';
      } else {
        this.log('Open settings fallback is only implemented for iOS');
      }
      this.log('Opened system settings for notification permission');
    } catch (error) {
      this.log('Failed to open system settings', error);
    }
  }

  private async scheduleRollingReminders(): Promise<void> {
    const pending = await LocalNotifications.getPending();
    const pendingIds = new Set(this.extractPoseBuddyIds(pending));
    const now = Date.now();
    const hour = this.progress.getSetting('reminderHour');
    const anchor = this.getAnchorTimestamp(hour);
    const intervalMs = notificationConfig.reminderIntervalDays * DAY_MS;

    let slot = Math.max(0, Math.ceil((now - anchor) / intervalMs));
    if (anchor + slot * intervalMs <= now + 60_000) {
      slot += 1;
    }

    const notifications: NonNullable<ScheduleOptions['notifications']> = [];

    for (let i = 0; i < notificationConfig.reminderBatchSize; i += 1) {
      const currentSlot = slot + i;
      const id = notificationConfig.reminderIdBase + currentSlot;
      if (pendingIds.has(id)) {
        continue;
      }

      const when = new Date(anchor + currentSlot * intervalMs);
      const message = REMINDER_MESSAGES[currentSlot % REMINDER_MESSAGES.length];

      notifications.push({
        id,
        title: this.i18n.t(message.title),
        body: this.i18n.t(message.body),
        schedule: { at: when },
        extra: {
          scope: REMINDER_SCOPE,
          slot: currentSlot,
        },
        ...(Capacitor.getPlatform() === 'android'
          ? { channelId: REMINDER_CHANNEL_ID }
          : {}),
      });
    }

    if (notifications.length === 0) {
      this.log('Reminder schedule already full');
      return;
    }

    await LocalNotifications.schedule({ notifications });
    this.log('Scheduled rolling reminders', { count: notifications.length });
  }

  private getAnchorTimestamp(hour: number): number {
    const anchor = new Date(2026, 0, 1, hour, 0, 0, 0);
    return anchor.getTime();
  }

  private extractPoseBuddyIds(pending: PendingResult): number[] {
    return pending.notifications
      .filter((item) => item.extra?.scope === REMINDER_SCOPE)
      .map((item) => item.id);
  }

  private isNativeMobile(): boolean {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() !== 'web';
  }

  private log(message: string, meta?: unknown): void {
    if (!notificationConfig.debugLogs) {
      return;
    }

    if (meta) {
      console.log('[LocalNotificationService]', message, meta);
      return;
    }

    console.log('[LocalNotificationService]', message);
  }
}
