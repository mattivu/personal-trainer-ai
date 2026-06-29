"use client";

import type { ChangeEvent } from "react";
import { AppCard } from "@/components/ui/app-card";
import { UserAvatar } from "@/components/ui/user-avatar";

type ProfileCardProps = {
  avatarDataUrl: string | null;
  displayName: string;
  email: string;
  nameFieldValue: string;
  disabled: boolean;
  onNameChange: (value: string) => void;
  onAvatarChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onAvatarRemove: () => void;
};

export function ProfileCard({
  avatarDataUrl,
  displayName,
  email,
  nameFieldValue,
  disabled,
  onNameChange,
  onAvatarChange,
  onAvatarRemove,
}: ProfileCardProps) {
  return (
    <AppCard className="rounded-[28px] px-5 py-5 sm:px-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div className="relative">
            {avatarDataUrl ? (
              <button
                type="button"
                onClick={onAvatarRemove}
                disabled={disabled}
                aria-label="Rimuovi foto"
                className="absolute -left-2 -top-2 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full border border-[rgba(208,216,43,0.32)] bg-[var(--app-primary)] text-sm font-bold leading-none text-[rgba(15,18,12,0.92)] shadow-[0_8px_18px_rgba(0,0,0,0.28)] transition hover:scale-[1.03] hover:border-[rgba(208,216,43,0.45)] disabled:opacity-50"
              >
                <span aria-hidden="true">×</span>
              </button>
            ) : null}
            <UserAvatar
              email={email}
              displayName={displayName}
              avatarDataUrl={avatarDataUrl}
              className="h-22 w-22 border-white/12 sm:h-24 sm:w-24"
              initialsClassName="text-xl"
            />
            <label className="absolute inset-x-0 bottom-0 cursor-pointer rounded-full border border-white/10 bg-black/55 px-3 py-1 text-center text-[11px] font-semibold text-white backdrop-blur-sm transition hover:border-white/16">
              Cambia foto
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={disabled}
                onChange={onAvatarChange}
                className="sr-only"
              />
            </label>
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--app-muted-2)]">
              Profilo
            </p>
            <h2 className="mt-2 truncate text-[26px] font-bold tracking-[-0.04em] text-[var(--app-text)]">
              {displayName}
            </h2>
            <div className="mt-3 h-px w-full bg-white/8" />
            <p className="mt-3 truncate text-sm text-[var(--app-muted)]">{email}</p>
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-2">
        <label htmlFor="display-name" className="text-sm font-medium text-[var(--app-text)]">
          Nome visualizzato
        </label>
        <input
          id="display-name"
          type="text"
          value={nameFieldValue}
          disabled={disabled}
          onChange={(event) => onNameChange(event.currentTarget.value)}
          placeholder="Come vuoi comparire nell'app"
          maxLength={60}
          className="w-full rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-[var(--app-text)] outline-none transition focus:border-white/18 focus:bg-white/[0.045]"
        />
      </div>
    </AppCard>
  );
}
