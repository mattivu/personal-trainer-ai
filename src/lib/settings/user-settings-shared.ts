export const USER_SETTINGS_TIMEZONE_FALLBACK = "Europe/Rome";
export const USER_SETTINGS_DISPLAY_NAME_MAX_LENGTH = 60;
export const USER_SETTINGS_AVATAR_MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;
export const USER_SETTINGS_AVATAR_MAX_DIMENSION = 320;
export const USER_SETTINGS_AVATAR_MAX_DATA_URL_LENGTH = 350_000;
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
