export interface NotificationService {
  initialize(): Promise<void>;
  refreshReminderSchedule(): Promise<void>;
  setRemindersEnabled(enabled: boolean): Promise<boolean>;
  cancelPoseBuddyReminders(): Promise<void>;
}
