import { redirect } from "next/navigation";
import { AppBottomNav } from "@/components/app-bottom-nav";
import { CoachChat } from "@/components/coach-chat";
import { AppPage } from "@/components/ui/app-page";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

function CoachPageIcon() {
  return (
    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--app-primary)] text-[#0A0D0D] shadow-[0_10px_30px_rgba(208,216,43,0.24)]">
      <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7">
        <path
          d="M7 6.25h10A2.75 2.75 0 0 1 19.75 9v5A2.75 2.75 0 0 1 17 16.75h-5.2l-3.87 2.9c-.45.34-1.08.02-1.08-.54v-2.36H7A2.75 2.75 0 0 1 4.25 14V9A2.75 2.75 0 0 1 7 6.25Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M8.75 11.5h6.5M8.75 8.9h4.25"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

type CoachPageProps = {
  searchParams?: Promise<{
    workoutId?: string | string[];
  }>;
};

function getSingleSearchParam(
  value: string | string[] | undefined
): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function parseWorkoutId(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return undefined;
  }

  return parsed;
}

export default async function CoachPage(props: CoachPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.onboardingStatus !== "completed") {
    redirect("/onboarding");
  }

  const searchParams = (await props.searchParams) ?? {};
  const currentWorkoutId = parseWorkoutId(getSingleSearchParam(searchParams.workoutId));

  return (
    <AppPage className="bg-neutral-950 pt-5" contentClassName="flex min-h-[100dvh] flex-col">
      <section className="flex min-h-0 flex-1 flex-col pb-4">
        <header className="mb-4 flex items-start gap-4">
          <CoachPageIcon />
          <div className="min-w-0 pt-1">
            <h1 className="text-3xl font-semibold tracking-[-0.03em] text-white">
              Coach
            </h1>
            <p className="mt-2 text-sm text-neutral-400">
              Conosce i tuoi dati · solo consigli
            </p>
          </div>
        </header>

        <CoachChat currentWorkoutId={currentWorkoutId} />
      </section>

      <AppBottomNav />
    </AppPage>
  );
}
