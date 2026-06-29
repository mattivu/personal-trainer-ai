import "server-only";
import type { UserSettings } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  defaultUserSettings,
  isRecord,
  normalizePreferredReminderTime,
  normalizeTimezone,
  sanitizeUserSettingsDto,
  USER_SETTINGS_AVATAR_ACCEPTED_TYPES,
  USER_SETTINGS_AVATAR_MAX_DATA_URL_LENGTH,
  USER_SETTINGS_DISPLAY_NAME_MAX_LENGTH,
  USER_SETTINGS_TIMEZONE_FALLBACK,
  type UserSettingsDto,
  type UserSettingsUpdateInput,
} from "./user-settings-shared";

const allowedBooleanFields = [
  "workoutRemindersEnabled",
  "nutritionRemindersEnabled",
  "weeklyReviewEnabled",
  "coachSuggestionsEnabled",
  "emailNotificationsEnabled",
  "pushNotificationsEnabled",
] as const;

const allowedFields = [
  "displayName",
  "avatarDataUrl",
  ...allowedBooleanFields,
  "preferredReminderTime",
  "timezone",
] as const;

type ValidationResult =
  | { ok: true; value: UserSettingsUpdateInput }
  | { ok: false; message: string };

function normalizeDisplayName(value: string) {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return null;
  }

  if (trimmed.length > USER_SETTINGS_DISPLAY_NAME_MAX_LENGTH) {
    return "__invalid__";
  }

  return trimmed;
}

function normalizeAvatarDataUrl(value: string) {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return null;
  }

  if (trimmed.length > USER_SETTINGS_AVATAR_MAX_DATA_URL_LENGTH) {
    return "__invalid__";
  }

  const mimeGroup = USER_SETTINGS_AVATAR_ACCEPTED_TYPES
    .map((mimeType) => mimeType.replace("/", "\\/"))
    .join("|");
  const dataUrlPattern = new RegExp(
    `^data:(${mimeGroup});base64,[A-Za-z0-9+/]+={0,2}$`,
  );

  if (!dataUrlPattern.test(trimmed)) {
    return "__invalid__";
  }

  return trimmed;
}

function toUserSettingsDto(settings: UserSettings): UserSettingsDto {
  return sanitizeUserSettingsDto({
    displayName: settings.displayName,
    avatarDataUrl: settings.avatarDataUrl,
    workoutRemindersEnabled: settings.workoutRemindersEnabled,
    nutritionRemindersEnabled: settings.nutritionRemindersEnabled,
    weeklyReviewEnabled: settings.weeklyReviewEnabled,
    coachSuggestionsEnabled: settings.coachSuggestionsEnabled,
    emailNotificationsEnabled: settings.emailNotificationsEnabled,
    pushNotificationsEnabled: settings.pushNotificationsEnabled,
    preferredReminderTime: settings.preferredReminderTime,
    timezone: settings.timezone,
  });
}

export function validateUserSettingsInput(input: unknown): ValidationResult {
  if (!isRecord(input)) {
    return {
      ok: false,
      message: "Dati non validi. Controlla le preferenze e riprova.",
    };
  }

  const unsupportedFields = Object.keys(input).filter(
    (key) => !(allowedFields as readonly string[]).includes(key),
  );

  if (unsupportedFields.length > 0) {
    return {
      ok: false,
      message: "Sono presenti campi impostazioni non supportati.",
    };
  }

  const updates: UserSettingsUpdateInput = {};

  if ("displayName" in input) {
    if (input.displayName !== null && typeof input.displayName !== "string") {
      return {
        ok: false,
        message: "Il nome visualizzato non e valido.",
      };
    }

    const normalizedDisplayName =
      input.displayName === null ? null : normalizeDisplayName(input.displayName);

    if (normalizedDisplayName === "__invalid__") {
      return {
        ok: false,
        message: `Il nome visualizzato deve avere al massimo ${USER_SETTINGS_DISPLAY_NAME_MAX_LENGTH} caratteri.`,
      };
    }

    updates.displayName = normalizedDisplayName;
  }

  if ("avatarDataUrl" in input) {
    if (input.avatarDataUrl !== null && typeof input.avatarDataUrl !== "string") {
      return {
        ok: false,
        message: "La foto profilo non e valida.",
      };
    }

    const normalizedAvatar =
      input.avatarDataUrl === null ? null : normalizeAvatarDataUrl(input.avatarDataUrl);

    if (normalizedAvatar === "__invalid__") {
      return {
        ok: false,
        message: "La foto profilo deve essere un'immagine valida e leggera.",
      };
    }

    updates.avatarDataUrl = normalizedAvatar;
  }

  for (const field of allowedBooleanFields) {
    if (field in input) {
      if (typeof input[field] !== "boolean") {
        return {
          ok: false,
          message: "Alcune preferenze non sono nel formato corretto.",
        };
      }

      updates[field] = input[field];
    }
  }

  if ("preferredReminderTime" in input) {
    if (
      input.preferredReminderTime !== null &&
      typeof input.preferredReminderTime !== "string"
    ) {
      return {
        ok: false,
        message: "L'orario promemoria non e valido.",
      };
    }

    const normalizedTime =
      input.preferredReminderTime === null
        ? null
        : normalizePreferredReminderTime(input.preferredReminderTime);

    if (normalizedTime === "__invalid__") {
      return {
        ok: false,
        message: "Inserisci un orario nel formato HH:mm.",
      };
    }

    updates.preferredReminderTime = normalizedTime;
  }

  if ("timezone" in input) {
    if (input.timezone !== null && typeof input.timezone !== "string") {
      return {
        ok: false,
        message: "Il fuso orario non e valido.",
      };
    }

    const normalizedTimezone =
      input.timezone === null ? null : normalizeTimezone(input.timezone);

    if (normalizedTimezone === "__invalid__") {
      return {
        ok: false,
        message: "Il fuso orario inserito non e valido.",
      };
    }

    updates.timezone =
      normalizedTimezone === null
        ? USER_SETTINGS_TIMEZONE_FALLBACK
        : normalizedTimezone;
  }

  return {
    ok: true,
    value: updates,
  };
}

export async function getOrCreateUserSettings(userId: number) {
  const settings = await prisma.userSettings.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      ...defaultUserSettings,
    },
  });

  return toUserSettingsDto(settings);
}

export async function updateUserSettings(
  userId: number,
  input: unknown,
) {
  const validation = validateUserSettingsInput(input);

  if (!validation.ok) {
    return validation;
  }

  const settings = await prisma.userSettings.upsert({
    where: { userId },
    update: validation.value,
    create: {
      userId,
      ...defaultUserSettings,
      ...validation.value,
    },
  });

  return {
    ok: true as const,
    value: toUserSettingsDto(settings),
  };
}
