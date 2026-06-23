import { AppCard } from "@/components/ui/app-card";
import { SecondaryButton } from "@/components/ui/buttons";

type ChangeGoalCardProps = {
  body: string;
  href?: string;
};

export function ChangeGoalCard({
  body,
  href = "/onboarding",
}: ChangeGoalCardProps) {
  return (
    <AppCard
      soft
      className="rounded-[24px] border-[var(--app-primary-border)] bg-[linear-gradient(135deg,rgba(15,16,18,0.96),rgba(208,216,43,0.08))] px-4 py-4 shadow-none"
    >
      <div className="flex flex-col gap-4">
        <div className="min-w-0 space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--app-primary)]">
            VUOI CAMBIARE OBIETTIVO?
          </p>
          <p className="max-w-[34ch] text-[13px] leading-5 text-[var(--app-muted)]">
            {body}
          </p>
        </div>
        <SecondaryButton
          href={href}
          className="min-h-11 rounded-full border-[var(--app-primary-border)] text-[var(--app-primary)] hover:border-[rgba(208,216,43,0.42)] hover:bg-[rgba(208,216,43,0.08)]"
        >
          Cambia obiettivo
        </SecondaryButton>
      </div>
    </AppCard>
  );
}
