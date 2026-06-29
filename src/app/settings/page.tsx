import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/auth/logout-button";
import { SettingsForm } from "@/components/settings/settings-form";
import { AppCard } from "@/components/ui/app-card";
import { AppPage } from "@/components/ui/app-page";
import { prisma } from "@/lib/prisma";
import { getOrCreateUserSettings } from "@/lib/settings/user-settings";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value);
}

function getProfileValue(value: string | number | null | undefined) {
  if (value === null || value === undefined) {
    return "Non disponibile";
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : "Non disponibile";
}

export default async function SettingsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const [profile, settings] = await Promise.all([
    prisma.userProfile.findUnique({
      where: { userId: user.id },
      select: {
        mainGoal: true,
        experience: true,
        trainingPlace: true,
        availableDays: true,
      },
    }),
    getOrCreateUserSettings(user.id),
  ]);

  return (
    <AppPage contentClassName="space-y-4 pb-8 pt-[62px]">
      <header className="min-w-0 space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--app-muted-2)]">
          Profilo e impostazioni
        </p>
        <h1 className="text-[30px] font-bold leading-[1.02] tracking-[-0.03em] text-[var(--app-text)]">
          Il tuo account
        </h1>
        <p className="max-w-[44ch] text-sm text-[var(--app-muted)]">
          Gestisci il profilo, le preferenze e l'accesso all'app da un unico punto.
        </p>
      </header>

      <SettingsForm
        initialSettings={settings}
        user={{
          name: user.name,
          email: user.email,
        }}
      />

      <AppCard className="space-y-3 rounded-[24px]">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--app-muted-2)]">
            Percorso
          </p>
          <h2 className="mt-2 text-lg font-semibold text-[var(--app-text)]">
            Obiettivo e profilo corrente
          </h2>
        </div>
        <dl className="space-y-2 text-sm text-[var(--app-muted)]">
          <div className="flex items-center justify-between gap-4">
            <dt>Obiettivo principale</dt>
            <dd className="text-right text-[var(--app-text)]">
              {getProfileValue(profile?.mainGoal)}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt>Esperienza</dt>
            <dd className="text-right text-[var(--app-text)]">
              {getProfileValue(profile?.experience)}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt>Luogo allenamento</dt>
            <dd className="text-right text-[var(--app-text)]">
              {getProfileValue(profile?.trainingPlace)}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt>Disponibilita</dt>
            <dd className="text-right text-[var(--app-text)]">
              {getProfileValue(profile?.availableDays)}
            </dd>
          </div>
        </dl>
      </AppCard>

      <AppCard className="space-y-4 rounded-[24px]">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--app-muted-2)]">
            Accesso
          </p>
          <h2 className="mt-2 text-lg font-semibold text-[var(--app-text)]">
            Logout
          </h2>
          <p className="mt-1 text-sm text-[var(--app-muted)]">
            Tornerai alla pagina di accesso.
          </p>
        </div>
        <div className="pt-1">
          <LogoutButton className="w-full" />
        </div>
      </AppCard>
    </AppPage>
  );
}
