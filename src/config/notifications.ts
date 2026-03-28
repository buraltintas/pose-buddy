const env = import.meta.env as Record<string, string | undefined>;

function parseEnabled(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) {
    return fallback;
  }

  return value === '1' || value.toLowerCase() === 'true';
}

function parseNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return parsed;
}

const reminderHour = Math.max(
  0,
  Math.min(23, parseNumber(env.VITE_REMINDER_DEFAULT_HOUR, 18)),
);

const batchSize = Math.max(
  10,
  Math.min(30, parseNumber(env.VITE_REMINDER_BATCH_SIZE, 12)),
);

export const notificationConfig = {
  debugLogs: !import.meta.env.PROD || env.VITE_NOTIFICATION_DEBUG === '1',
  defaultReminderEnabled: parseEnabled(
    env.VITE_REMINDER_DEFAULT_ENABLED,
    false,
  ),
  defaultReminderHour: reminderHour,
  reminderBatchSize: batchSize,
  reminderIntervalDays: 3,
  reminderIdBase: 730000,
} as const;
