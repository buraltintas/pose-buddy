import { notificationConfig } from '../config/notifications';
import type { NotificationService } from './NotificationService';

export class MockNotificationService implements NotificationService {
  public async initialize(): Promise<void> {
    this.log('Mock notifications initialized (web fallback)');
  }

  public async refreshReminderSchedule(): Promise<void> {
    this.log('Skipping reminder scheduling in web fallback');
  }

  public async setRemindersEnabled(enabled: boolean): Promise<boolean> {
    this.log('Mock reminders toggled', { enabled });
    return true;
  }

  public async cancelPoseBuddyReminders(): Promise<void> {
    this.log('Mock reminder cancel called');
  }

  private log(message: string, meta?: unknown): void {
    if (!notificationConfig.debugLogs) {
      return;
    }

    if (meta) {
      console.log('[MockNotificationService]', message, meta);
      return;
    }

    console.log('[MockNotificationService]', message);
  }
}
