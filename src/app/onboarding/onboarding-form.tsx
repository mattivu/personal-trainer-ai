"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Field =
  | {
      name: string;
      label: string;
      type: "text" | "date" | "number" | "textarea";
      placeholder?: string;
    }
  | {
      name: string;
      label: string;
      type: "select";
      options: string[];
    };

type Step = {
  id: string;
  title: string;
  description: string;
  fields: Field[];
};

type Answers = Record<string, string>;
type AnswersByStep = Record<string, Answers>;
type ApiResponse = {
  ok: boolean;
  message?: string;
};

const steps: Step[] = [
  {
    id: "dati-base",
    title: "Dati base",
    description: "Informazioni iniziali per stimare il punto di partenza.",
    fields: [
      {
        name: "sesso",
        label: "Sesso",
        type: "select",
        options: ["Donna", "Uomo", "Altro", "Preferisco non indicarlo"],
      },
      {
        name: "dataNascita",
        label: "Data nascita",
        type: "date",
      },
      {
        name: "altezzaCm",
        label: "Altezza",
        type: "number",
        placeholder: "cm",
      },
      {
        name: "pesoKg",
        label: "Peso",
        type: "number",
        placeholder: "kg",
      },
    ],
  },
  {
    id: "obiettivo",
    title: "Obiettivo",
    description: "La priorita principale del programma.",
    fields: [
      {
        name: "obiettivo",
        label: "Obiettivo",
        type: "select",
        options: [
          "Dimagrimento",
          "Massa",
          "Forza",
          "Ricomposizione",
          "Benessere",
        ],
      },
    ],
  },
  {
    id: "esperienza",
    title: "Esperienza",
    description: "Livello attuale con allenamento e tecnica.",
    fields: [
      {
        name: "esperienza",
        label: "Esperienza",
        type: "select",
        options: ["Principiante", "Intermedio", "Avanzato"],
      },
    ],
  },
  {
    id: "disponibilita",
    title: "Disponibilita",
    description: "Tempo realistico da dedicare agli allenamenti.",
    fields: [
      {
        name: "giorni",
        label: "Giorni a settimana",
        type: "number",
        placeholder: "3",
      },
      {
        name: "tempoAllenamento",
        label: "Tempo per allenamento",
        type: "text",
        placeholder: "45 minuti",
      },
    ],
  },
  {
    id: "luogo-attrezzatura",
    title: "Luogo e attrezzatura",
    description: "Dove ti alleni e cosa hai a disposizione.",
    fields: [
      {
        name: "luogo",
        label: "Luogo",
        type: "select",
        options: ["Casa", "Palestra", "Outdoor"],
      },
      {
        name: "attrezzatura",
        label: "Attrezzatura disponibile",
        type: "textarea",
        placeholder: "Manubri, elastici, bilanciere, macchine...",
      },
    ],
  },
  {
    id: "limitazioni",
    title: "Limitazioni",
    description: "Dolori, infortuni o movimenti da evitare.",
    fields: [
      {
        name: "doloriInfortuni",
        label: "Dolori o infortuni",
        type: "textarea",
        placeholder: "Ginocchio, schiena, spalla...",
      },
      {
        name: "eserciziDaEvitare",
        label: "Esercizi da evitare",
        type: "textarea",
        placeholder: "Squat, corsa, spinte sopra la testa...",
      },
    ],
  },
  {
    id: "stile-vita",
    title: "Stile di vita",
    description: "Contesto quotidiano che influenza recupero e carico.",
    fields: [
      {
        name: "lavoro",
        label: "Lavoro",
        type: "select",
        options: ["Sedentario", "Attivo"],
      },
      {
        name: "sonno",
        label: "Sonno",
        type: "text",
        placeholder: "7 ore, qualita buona",
      },
      {
        name: "stress",
        label: "Stress",
        type: "text",
        placeholder: "Basso, medio, alto",
      },
    ],
  },
  {
    id: "motivazione",
    title: "Motivazione",
    description: "La ragione personale e il risultato desiderato.",
    fields: [
      {
        name: "perche",
        label: "Perche vuoi allenarti",
        type: "textarea",
        placeholder: "Energia, salute, estetica, performance...",
      },
      {
        name: "risultatoDesiderato",
        label: "Risultato desiderato",
        type: "textarea",
        placeholder: "Cosa vorresti ottenere nei prossimi mesi",
      },
    ],
  },
];

function getInitialAnswers() {
  return steps.reduce<AnswersByStep>((accumulator, step) => {
    accumulator[step.id] = step.fields.reduce<Answers>((fields, field) => {
      fields[field.name] = "";
      return fields;
    }, {});

    return accumulator;
  }, {});
}

export function OnboardingForm() {
  const router = useRouter();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [answersByStep, setAnswersByStep] = useState<AnswersByStep>(() =>
    getInitialAnswers()
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const currentStep = steps[currentStepIndex];
  const currentAnswers = answersByStep[currentStep.id];
  const isLastStep = currentStepIndex === steps.length - 1;
  const progress = useMemo(
    () => Math.round(((currentStepIndex + 1) / steps.length) * 100),
    [currentStepIndex]
  );

  function updateAnswer(fieldName: string, value: string) {
    setAnswersByStep((current) => ({
      ...current,
      [currentStep.id]: {
        ...current[currentStep.id],
        [fieldName]: value,
      },
    }));
  }

  async function saveCurrentStep() {
    const response = await fetch("/api/onboarding/save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        step: currentStep.id,
        answers: currentAnswers,
      }),
    });

    const data = (await response.json()) as ApiResponse;

    if (!response.ok || !data.ok) {
      throw new Error(data.message ?? "Errore durante il salvataggio.");
    }
  }

  async function completeOnboarding() {
    const response = await fetch("/api/onboarding/complete", {
      method: "POST",
    });

    const data = (await response.json()) as ApiResponse;

    if (!response.ok || !data.ok) {
      throw new Error(data.message ?? "Errore durante il completamento.");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      await saveCurrentStep();

      if (isLastStep) {
        await completeOnboarding();
        router.push("/dashboard");
        router.refresh();
        return;
      }

      setCurrentStepIndex((index) => index + 1);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Errore di connessione. Riprova."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-10 text-white">
      <section className="mx-auto w-full max-w-4xl">
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-3 text-sm uppercase tracking-[0.3em] text-neutral-500">
              Personal Trainer AI
            </p>
            <h1 className="text-3xl font-bold">Questionario onboarding</h1>
          </div>

          <div className="text-sm text-neutral-400">
            Step {currentStepIndex + 1} di {steps.length}
          </div>
        </div>

        <div className="mb-8 h-2 overflow-hidden rounded-full bg-neutral-800">
          <div
            className="h-full rounded-full bg-white transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold">{currentStep.title}</h2>
            <p className="mt-2 text-neutral-400">{currentStep.description}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              {currentStep.fields.map((field) => (
                <label
                  key={field.name}
                  className={field.type === "textarea" ? "sm:col-span-2" : ""}
                >
                  <span className="mb-2 block text-sm text-neutral-300">
                    {field.label}
                  </span>

                  {field.type === "select" ? (
                    <select
                      value={currentAnswers[field.name]}
                      onChange={(event) =>
                        updateAnswer(field.name, event.target.value)
                      }
                      className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-white outline-none focus:border-white"
                    >
                      <option value="">Seleziona</option>
                      {field.options.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : field.type === "textarea" ? (
                    <textarea
                      value={currentAnswers[field.name]}
                      onChange={(event) =>
                        updateAnswer(field.name, event.target.value)
                      }
                      className="min-h-32 w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-white outline-none focus:border-white"
                      placeholder={field.placeholder}
                    />
                  ) : (
                    <input
                      value={currentAnswers[field.name]}
                      onChange={(event) =>
                        updateAnswer(field.name, event.target.value)
                      }
                      className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-white outline-none focus:border-white"
                      placeholder={field.placeholder}
                      type={field.type}
                    />
                  )}
                </label>
              ))}
            </div>

            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                disabled={loading || currentStepIndex === 0}
                onClick={() => setCurrentStepIndex((index) => index - 1)}
                className="rounded-xl border border-neutral-700 px-5 py-3 font-semibold text-neutral-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Indietro
              </button>

              <button
                disabled={loading}
                className="rounded-xl bg-white px-5 py-3 font-semibold text-neutral-950 disabled:opacity-50"
              >
                {loading
                  ? "Salvataggio..."
                  : isLastStep
                    ? "Completa e vai alla dashboard"
                    : "Salva e continua"}
              </button>
            </div>
          </form>

          {message && (
            <div className="mt-6 rounded-xl border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-200">
              {message}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
