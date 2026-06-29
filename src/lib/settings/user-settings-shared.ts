export const USER_SETTINGS_TIMEZONE_FALLBACK = "Europe/Rome";
export const USER_SETTINGS_DISPLAY_NAME_MAX_LENGTH = 60;
export const USER_SETTINGS_AVATAR_MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;
export const USER_SETTINGS_AVATAR_MAX_DIMENSION = 320;
export const USER_SETTINGS_AVATAR_MAX_DATA_URL_LENGTH = 350_000;
export const USER_SETTINGS_REMINDER_TIME_PATTERN =
  /^(?:[01]\d|2[0-3]):[0-5]\d$/;
export const USER_SETTINGS_AVATAR_ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type UserSettingsDto = {
  displayName: string | null;
  avatarDataUrl: string | null;
  workoutRemindersEnabled: boolean;
  nutritionRemindersEnabled: boolean;
  weeklyReviewEnabled: boolean;
  coachSuggestionsEnabled: boolean;
  emailNotificationsEnabled: boolean;
  pushNotificationsEnabled: boolean;
  preferredReminderTime: string | null;
  timezone: string | null;
};

export type UserSettingsUpdateInput = Partial<UserSettingsDto>;

export const defaultUserSettings: UserSettingsDto = {
  displayName: null,
  avatarDataUrl: null,
  workoutRemindersEnabled: false,
  nutritionRemindersEnabled: false,
  weeklyReviewEnabled: true,
  coachSuggestionsEnabled: true,
  emailNotificationsEnabled: false,
  pushNotificationsEnabled: false,
  preferredReminderTime: "08:00",
  timezone: USER_SETTINGS_TIMEZONE_FALLBACK,
};

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function normalizePreferredReminderTime(value: string | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return null;
  }

  if (!USER_SETTINGS_REMINDER_TIME_PATTERN.test(trimmed)) {
    return "__invalid__" as const;
  }

  return trimmed;
}

export function normalizeTimezone(value: string | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return null;
  }

  if (trimmed.length > 100) {
    return "__invalid__" as const;
  }

  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: trimmed,
    }).resolvedOptions().timeZone;
  } catch {
    return "__invalid__" as const;
  }
}

export function sanitizeUserSettingsDto(settings: UserSettingsDto): UserSettingsDto {
  const preferredReminderTime = normalizePreferredReminderTime(
    settings.preferredReminderTime,
  );
  const timezone = normalizeTimezone(settings.timezone);

  return {
    ...settings,
    preferredReminderTime:
      preferredReminderTime === "__invalid__" ? null : preferredReminderTime,
    timezone:
      timezone === "__invalid__" || timezone === null
        ? USER_SETTINGS_TIMEZONE_FALLBACK
        : timezone,
  };
}
