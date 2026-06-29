"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PrimaryButton } from "@/components/ui/buttons";
import { SecondaryButton } from "@/components/ui/buttons";
import { ProfileCard } from "@/components/settings/profile-card";
import { PushNotificationCard } from "@/components/settings/push-notification-card";
import {
  USER_SETTINGS_AVATAR_ACCEPTED_TYPES,
  USER_SETTINGS_AVATAR_MAX_DATA_URL_LENGTH,
  USER_SETTINGS_AVATAR_MAX_DIMENSION,
  USER_SETTINGS_AVATAR_MAX_FILE_SIZE_BYTES,
  USER_SETTINGS_DISPLAY_NAME_MAX_LENGTH,
  USER_SETTINGS_TIMEZONE_FALLBACK,
  normalizePreferredReminderTime,
  normalizeTimezone,
  sanitizeUserSettingsDto,
  type UserSettingsDto,
} from "@/lib/settings/user-settings-shared";
import { getUserDisplayLabel } from "@/components/ui/user-avatar";

type SettingsFormProps = {
  initialSettings: UserSettingsDto;
  user: {
    name: string | null;
    email: string;
  };
};

type SettingsApiResponse =
  | {
      ok: true;
      settings: UserSettingsDto;
    }
  | {
      ok: false;
      message?: string;
    };

type SaveSettingsResult = {
  ok: boolean;
  message?: string;
};

type ToggleFieldName =
  | "workoutRemindersEnabled"
  | "nutritionRemindersEnabled"
  | "weeklyReviewEnabled"
  | "coachSuggestionsEnabled"
  | "emailNotificationsEnabled"
  | "pushNotificationsEnabled";

type FieldErrors = {
  preferredReminderTime: string | null;
  timezone: string | null;
};

function ToggleField({
  checked,
  description,
  disabled,
  label,
  onChange,
}: {
  checked: boolean;
  description: string;
  disabled: boolean;
  label: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-[20px] border border-white/10 bg-white/[0.03] px-4 py-4 transition hover:border-white/14 hover:bg-white/[0.045]">
      <span className="min-w-0">
        <span className="block text-sm font-medium text-[var(--app-text)]">
          {label}
        </span>
        <span className="mt-1 block text-sm text-[var(--app-muted)]">
          {description}
        </span>
      </span>
      <span className="relative inline-flex h-7 w-12 shrink-0 items-center">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.currentTarget.checked)}
          className="peer sr-only"
        />
        <span className="absolute inset-0 rounded-full border border-white/10 bg-white/8 transition peer-checked:border-[var(--app-primary-border)] peer-checked:bg-[rgba(208,216,43,0.22)] peer-disabled:opacity-50" />
        <span className="absolute left-1 h-5 w-5 rounded-full bg-white shadow-[0_4px_12px_rgba(0,0,0,0.3)] transition peer-checked:translate-x-5 peer-checked:bg-[var(--app-primary)]" />
      </span>
    </label>
  );
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("FILE_READ_FAILED"));
    };

    reader.onerror = () => reject(new Error("FILE_READ_FAILED"));
    reader.readAsDataURL(file);
  });
}

function loadImageElement(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("IMAGE_LOAD_FAILED"));
    image.src = src;
  });
}

async function fileToCanvas(file: File) {
  const sourceUrl = await readFileAsDataUrl(file);
  const source =
    typeof window !== "undefined" && "createImageBitmap" in window
      ? await createImageBitmap(file)
      : await loadImageElement(sourceUrl);

  const sourceWidth =
    source instanceof HTMLImageElement ? source.naturalWidth : source.width;
  const sourceHeight =
    source instanceof HTMLImageElement ? source.naturalHeight : source.height;
  const cropSize = Math.min(sourceWidth, sourceHeight);
  const sx = Math.max(0, (sourceWidth - cropSize) / 2);
  const sy = Math.max(0, (sourceHeight - cropSize) / 2);

  const canvas = document.createElement("canvas");
  canvas.width = USER_SETTINGS_AVATAR_MAX_DIMENSION;
  canvas.height = USER_SETTINGS_AVATAR_MAX_DIMENSION;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("CANVAS_CONTEXT_UNAVAILABLE");
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(
    source,
    sx,
    sy,
    cropSize,
    cropSize,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  if ("close" in source && typeof source.close === "function") {
    source.close();
  }

  return canvas;
}

async function compressAvatarFile(file: File) {
  const canvas = await fileToCanvas(file);
  const exportAttempts: Array<[string, number | undefined]> = [
    ["image/webp", 0.82],
    ["image/jpeg", 0.8],
    ["image/jpeg", 0.68],
  ];

  for (const [type, quality] of exportAttempts) {
    const dataUrl = canvas.toDataURL(type, quality);

    if (
      dataUrl.startsWith(`data:${type};base64,`) &&
      dataUrl.length <= USER_SETTINGS_AVATAR_MAX_DATA_URL_LENGTH
    ) {
      return dataUrl;
    }
  }

  const fallbackDataUrl = canvas.toDataURL("image/png");

  if (fallbackDataUrl.length <= USER_SETTINGS_AVATAR_MAX_DATA_URL_LENGTH) {
    return fallbackDataUrl;
  }

  throw new Error("AVATAR_TOO_LARGE");
}

function areSettingsEqual(left: UserSettingsDto, right: UserSettingsDto) {
  return (
    left.displayName === right.displayName &&
    left.avatarDataUrl === right.avatarDataUrl &&
    left.workoutRemindersEnabled === right.workoutRemindersEnabled &&
    left.nutritionRemindersEnabled === right.nutritionRemindersEnabled &&
    left.weeklyReviewEnabled === right.weeklyReviewEnabled &&
    left.coachSuggestionsEnabled === right.coachSuggestionsEnabled &&
    left.emailNotificationsEnabled === right.emailNotificationsEnabled &&
    left.pushNotificationsEnabled === right.pushNotificationsEnabled &&
    left.preferredReminderTime === right.preferredReminderTime &&
    left.timezone === right.timezone
  );
}

export function SettingsForm({ initialSettings, user }: SettingsFormProps) {
  const router = useRouter();
  const sanitizedInitialSettings = sanitizeUserSettingsDto(initialSettings);
  const [form, setForm] = useState<UserSettingsDto>(sanitizedInitialSettings);
  const [savedForm, setSavedForm] = useState<UserSettingsDto>(sanitizedInitialSettings);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({
    preferredReminderTime: null,
    timezone: null,
  });
  const fileInputResetKeyRef = useRef(0);
  const isDirty = !areSettingsEqual(form, savedForm);

  function getClientTimezone() {
    if (typeof Intl === "undefined" || typeof Intl.DateTimeFormat !== "function") {
      return USER_SETTINGS_TIMEZONE_FALLBACK;
    }

    const detectedTimezone = normalizeTimezone(
      Intl.DateTimeFormat().resolvedOptions().timeZone,
    );

    if (detectedTimezone === "__invalid__" || detectedTimezone === null) {
      return USER_SETTINGS_TIMEZONE_FALLBACK;
    }

    return detectedTimezone;
  }

  function validateForm(nextForm: UserSettingsDto) {
    const nextFieldErrors: FieldErrors = {
      preferredReminderTime: null,
      timezone: null,
    };

    const normalizedReminderTime = normalizePreferredReminderTime(
      nextForm.preferredReminderTime,
    );

    if (normalizedReminderTime === "__invalid__") {
      nextFieldErrors.preferredReminderTime =
        "Inserisci un orario valido nel formato HH:mm.";
    }

    const normalizedTimezone = normalizeTimezone(nextForm.timezone);

    if (normalizedTimezone === "__invalid__") {
      nextFieldErrors.timezone = "Inserisci un fuso orario valido, ad esempio Europe/Rome.";
    }

    return nextFieldErrors;
  }

  function buildPayload(currentForm: UserSettingsDto) {
    const normalizedReminderTime = normalizePreferredReminderTime(
      currentForm.preferredReminderTime,
    );
    const normalizedTimezone = normalizeTimezone(currentForm.timezone);
    const timezone =
      normalizedTimezone === null ? getClientTimezone() : normalizedTimezone;

    const payload: UserSettingsDto = {
      ...currentForm,
      preferredReminderTime:
        normalizedReminderTime === "__invalid__" ? currentForm.preferredReminderTime : normalizedReminderTime,
      timezone:
        normalizedTimezone === "__invalid__" ? currentForm.timezone : timezone,
    };

    return {
      payload,
      fieldErrors: validateForm(payload),
    };
  }

  function updateBooleanField(name: ToggleFieldName, value: boolean) {
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function saveSettingsPatch(
    partial: Partial<UserSettingsDto>,
  ): Promise<SaveSettingsResult> {
    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(partial),
      });

      const data = (await response.json()) as SettingsApiResponse;

      if (!response.ok || !data.ok) {
        return {
          ok: false,
          message: data.ok
            ? "Impossibile salvare le impostazioni."
            : data.message ?? "Impossibile salvare le impostazioni.",
        };
      }

      const sanitizedSettings = sanitizeUserSettingsDto(data.settings);

      setForm((current) => ({
        ...current,
        ...partial,
        pushNotificationsEnabled: sanitizedSettings.pushNotificationsEnabled,
      }));
      setSavedForm((current) => ({
        ...current,
        ...partial,
        pushNotificationsEnabled: sanitizedSettings.pushNotificationsEnabled,
      }));

      return { ok: true };
    } catch {
      return {
        ok: false,
        message: "Impossibile salvare le impostazioni. Riprova.",
      };
    }
  }

  async function handleAvatarChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";

    if (!file) {
      return;
    }

    if (!USER_SETTINGS_AVATAR_ACCEPTED_TYPES.includes(file.type as (typeof USER_SETTINGS_AVATAR_ACCEPTED_TYPES)[number])) {
      setError("Usa un file JPG, PNG o WebP.");
      setMessage(null);
      return;
    }

    if (file.size > USER_SETTINGS_AVATAR_MAX_FILE_SIZE_BYTES) {
      setError("La foto deve pesare al massimo 2 MB.");
      setMessage(null);
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const avatarDataUrl = await compressAvatarFile(file);

      setForm((current) => ({
        ...current,
        avatarDataUrl,
      }));
    } catch {
      setError("Impossibile preparare la foto. Riprova con un'immagine piu leggera.");
    } finally {
      setLoading(false);
      fileInputResetKeyRef.current += 1;
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);
    const { payload, fieldErrors: nextFieldErrors } = buildPayload(form);
    setFieldErrors(nextFieldErrors);

    if (nextFieldErrors.preferredReminderTime || nextFieldErrors.timezone) {
      setLoading(false);
      setError("Controlla i campi evidenziati e riprova.");
      return;
    }

    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as SettingsApiResponse;

      if (!response.ok || !data.ok) {
        setError(data.ok ? "Impossibile salvare le impostazioni." : data.message ?? "Impossibile salvare le impostazioni.");
        return;
      }

      const sanitizedSettings = sanitizeUserSettingsDto(data.settings);

      setForm(sanitizedSettings);
      setSavedForm(sanitizedSettings);
      setMessage("Impostazioni salvate.");
    } catch {
      setError("Impossibile salvare le impostazioni. Riprova.");
    } finally {
      setLoading(false);
    }
  }

  function handleBackToDashboard() {
    if (
      isDirty &&
      !window.confirm("Hai modifiche non salvate. Vuoi uscire senza salvarle?")
    ) {
      return;
    }

    router.push("/dashboard");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <ProfileCard
        key={fileInputResetKeyRef.current}
        avatarDataUrl={form.avatarDataUrl}
        displayName={getUserDisplayLabel({
          displayName: form.displayName,
          name: user.name,
          email: user.email,
        })}
        email={user.email}
        nameFieldValue={form.displayName ?? ""}
        disabled={loading}
        onNameChange={(value) =>
          setForm((current) => ({
            ...current,
            displayName: value.slice(0, USER_SETTINGS_DISPLAY_NAME_MAX_LENGTH),
          }))
        }
        onAvatarChange={handleAvatarChange}
        onAvatarRemove={() =>
          setForm((current) => ({
            ...current,
            avatarDataUrl: null,
          }))
        }
      />

      <section className="app-card space-y-4 rounded-[28px] px-5 py-5 sm:px-6">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--app-muted-2)]">
            Preferenze
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--app-text)]">
            Notifiche e app
          </h2>
          <p className="mt-1 text-sm text-[var(--app-muted)]">
            Scegli quali promemoria vuoi ricevere e quando.
          </p>
        </div>

        <div className="space-y-3">
          <ToggleField
            label="Promemoria allenamenti"
            description="Ti ricordano le sedute previste nel momento giusto."
            checked={form.workoutRemindersEnabled}
            disabled={loading}
            onChange={(value) => updateBooleanField("workoutRemindersEnabled", value)}
          />
          <ToggleField
            label="Promemoria nutrizione"
            description="Tieni il ritmo con i check-in dei pasti e della giornata."
            checked={form.nutritionRemindersEnabled}
            disabled={loading}
            onChange={(value) => updateBooleanField("nutritionRemindersEnabled", value)}
          />
          <ToggleField
            label="Riepilogo settimanale"
            description="Ricevi un riepilogo rapido dei progressi della settimana."
            checked={form.weeklyReviewEnabled}
            disabled={loading}
            onChange={(value) => updateBooleanField("weeklyReviewEnabled", value)}
          />
          <ToggleField
            label="Suggerimenti del coach"
            description="Mostra consigli contestuali dentro l'app."
            checked={form.coachSuggestionsEnabled}
            disabled={loading}
            onChange={(value) => updateBooleanField("coachSuggestionsEnabled", value)}
          />
          <ToggleField
            label="Notifiche email"
            description="Usate solo quando abilitate per gli avvisi principali."
            checked={form.emailNotificationsEnabled}
            disabled={loading}
            onChange={(value) => updateBooleanField("emailNotificationsEnabled", value)}
          />
          <PushNotificationCard
            pushPreferenceEnabled={form.pushNotificationsEnabled}
            disabled={loading}
            onPushPreferenceSync={async (enabled) => {
              const result = await saveSettingsPatch({
                pushNotificationsEnabled: enabled,
              });

              if (result.ok) {
                setMessage(null);
                setError(null);
              }

              return result;
            }}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-[var(--app-text)]">
              Orario preferito
            </span>
            <input
              type="time"
              value={form.preferredReminderTime ?? ""}
              disabled={loading}
              onChange={(event) => {
                const preferredReminderTime = event.currentTarget.value || null;
                setForm((current) => ({
                  ...current,
                  preferredReminderTime,
                }));
                setFieldErrors((current) => ({
                  ...current,
                  preferredReminderTime:
                    normalizePreferredReminderTime(preferredReminderTime) === "__invalid__"
                      ? "Inserisci un orario valido nel formato HH:mm."
                      : null,
                }));
                setError(null);
              }}
              className="w-full rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-[var(--app-text)] outline-none transition focus:border-white/18 focus:bg-white/[0.045]"
            />
            {fieldErrors.preferredReminderTime ? (
              <span className="block text-sm text-[#ff8c8c]">
                {fieldErrors.preferredReminderTime}
              </span>
            ) : null}
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-[var(--app-text)]">
              Fuso orario
            </span>
            <input
              type="text"
              value={form.timezone ?? ""}
              disabled={loading}
              onChange={(event) => {
                const timezone = event.currentTarget.value;
                setForm((current) => ({
                  ...current,
                  timezone,
                }));
                setFieldErrors((current) => ({
                  ...current,
                  timezone:
                    normalizeTimezone(timezone) === "__invalid__"
                      ? "Inserisci un fuso orario valido, ad esempio Europe/Rome."
                      : null,
                }));
                setError(null);
              }}
              onBlur={() =>
                setForm((current) => ({
                  ...current,
                  timezone:
                    normalizeTimezone(current.timezone) === null
                      ? getClientTimezone()
                      : current.timezone,
                }))
              }
              placeholder="Europe/Rome"
              className="w-full rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-[var(--app-text)] outline-none transition focus:border-white/18 focus:bg-white/[0.045]"
            />
            {fieldErrors.timezone ? (
              <span className="block text-sm text-[#ff8c8c]">
                {fieldErrors.timezone}
              </span>
            ) : null}
          </label>
        </div>
      </section>

      {error ? (
        <p className="text-sm text-[#ff8c8c]">{error}</p>
      ) : message ? (
        <p className="text-sm text-[var(--app-primary)]">{message}</p>
      ) : null}

      <div className="space-y-3">
        <PrimaryButton type="submit" disabled={loading}>
          {loading ? "Salvataggio..." : "Salva modifiche"}
        </PrimaryButton>
        <SecondaryButton type="button" disabled={loading} onClick={handleBackToDashboard}>
          Torna alla dashboard
        </SecondaryButton>
      </div>
    </form>
  );
}
