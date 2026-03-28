import type { LanguageCode } from '../i18n/types';
import type { NormalizedPose } from './pose';
import { notificationConfig } from '../config/notifications';

export interface UserSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  remindersEnabled: boolean;
  reminderHour: number;
  notificationPermissionHandled: boolean;
}

export interface ProgressState {
  unlockedLevel: number;
  completedLevelIds: number[];
  bestScoreByLevel: Record<string, number>;
  attemptsByLevel: Record<string, number>;
  savedPoseByLevel: Record<string, NormalizedPose>;
  completionCount: number;
  lastLanguage: LanguageCode;
  settings: UserSettings;
}

export const DEFAULT_PROGRESS: ProgressState = {
  unlockedLevel: 1,
  completedLevelIds: [],
  bestScoreByLevel: {},
  attemptsByLevel: {},
  savedPoseByLevel: {},
  completionCount: 0,
  lastLanguage: 'en',
  settings: {
    soundEnabled: true,
    musicEnabled: true,
    remindersEnabled: notificationConfig.defaultReminderEnabled,
    reminderHour: notificationConfig.defaultReminderHour,
    notificationPermissionHandled: false,
  },
};
