import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return <OnboardingForm />;
}
