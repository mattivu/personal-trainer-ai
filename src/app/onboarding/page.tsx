import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { OnboardingForm } from "./onboarding-form";

type SavedAnswersByStep = Record<string, Record<string, string | string[]>>;

function normalizeAnswers(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.entries(value).reduce<Record<string, string | string[]>>(
    (answers, [key, rawValue]) => {
      if (
        typeof rawValue === "string" ||
        typeof rawValue === "number" ||
        typeof rawValue === "boolean"
      ) {
        answers[key] = String(rawValue);
      } else if (Array.isArray(rawValue)) {
        answers[key] = rawValue
          .filter((entry): entry is string => typeof entry === "string")
          .map((entry) => entry.trim())
          .filter(Boolean);
      }

      return answers;
    },
    {}
  );
}

export default async function OnboardingPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const savedAnswers = await prisma.onboardingAnswer.findMany({
    where: {
      userId: user.id,
    },
    select: {
      step: true,
      answersJson: true,
    },
  });

  const initialAnswersByStep = savedAnswers.reduce<SavedAnswersByStep>(
    (answersByStep, answer) => {
      answersByStep[answer.step] = normalizeAnswers(answer.answersJson);
      return answersByStep;
    },
    {}
  );

  return (
    <OnboardingForm
      initialAnswersByStep={initialAnswersByStep}
      onboardingStatus={user.onboardingStatus}
      userName={user.name}
    />
  );
}
