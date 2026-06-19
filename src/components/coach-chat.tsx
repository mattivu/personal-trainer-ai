"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { CoachAction } from "@/lib/ai/coach-action-types";

type CoachChatProps = {
  currentWorkoutId?: number;
};

type CoachChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  actions?: CoachAction[];
};

type CoachChatApiResponse =
  | {
      ok: true;
      message: {
        role: "assistant";
        content: string;
      };
      actions: CoachAction[];
    }
  | {
      ok: false;
      message: string;
    };

const QUICK_PROMPTS = [
  "Come sto andando con alimentazione e allenamento?",
  "Devo cambiare calorie?",
  "Sto recuperando bene?",
  "Il cardio e sufficiente?",
] as const;

const INITIAL_MESSAGE =
  "Scrivimi cosa vuoi capire su allenamento, alimentazione, peso, cardio o recupero. Usero solo il tuo contesto reale per risponderti, senza applicare modifiche.";

function createMessageId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function parseApiResponse(response: Response) {
  const rawBody = await response.text();
  const trimmedBody = rawBody.trim();

  if (!trimmedBody) {
    return {
      ok: false,
      message: "Risposta vuota dal server.",
    } satisfies CoachChatApiResponse;
  }

  try {
    return JSON.parse(trimmedBody) as CoachChatApiResponse;
  } catch {
    return {
      ok: false,
      message: trimmedBody,
    } satisfies CoachChatApiResponse;
  }
}

export function CoachChat({ currentWorkoutId }: CoachChatProps) {
  const [messages, setMessages] = useState<CoachChatMessage[]>([
    {
      id: createMessageId(),
      role: "assistant",
      content: INITIAL_MESSAGE,
    },
  ]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollAnchorRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  async function sendMessage(content: string) {
    const normalizedContent = content.trim();

    if (!normalizedContent || loading) {
      return;
    }

    const userMessage: CoachChatMessage = {
      id: createMessageId(),
      role: "user",
      content: normalizedContent,
    };
    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setDraft("");
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: nextMessages.map(({ role, content: messageContent }) => ({
            role,
            content: messageContent,
          })),
          currentWorkoutId,
        }),
      });
      const payload = await parseApiResponse(response);

      if (!response.ok || !payload.ok) {
        setError(
          payload.ok ? "Errore durante la risposta del coach." : payload.message
        );
        setMessages(messages);
        return;
      }

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: createMessageId(),
          role: "assistant",
          content: payload.message.content,
          actions: payload.actions,
        },
      ]);
    } catch {
      setError("Errore di rete durante la risposta del coach.");
      setMessages(messages);
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(draft);
  }

  return (
    <div className="flex min-h-[70vh] flex-col rounded-3xl border border-neutral-800 bg-neutral-900">
      <div className="border-b border-neutral-800 px-5 py-4 sm:px-6">
        <p className="text-sm uppercase tracking-[0.28em] text-neutral-500">
          Coach AI
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-white">Chat coach</h2>
        <p className="mt-2 max-w-2xl text-sm text-neutral-400">
          Domande su programma, sedute, progressi, alimentazione, peso, cardio e recupero.
          Nessuna modifica viene applicata.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-neutral-800 px-5 py-4 sm:px-6">
        {QUICK_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => void sendMessage(prompt)}
            disabled={loading}
            className="rounded-full border border-neutral-700 px-3 py-2 text-left text-sm text-neutral-200 transition hover:border-neutral-500 hover:bg-neutral-800 disabled:cursor-not-allowed disabled:border-neutral-800 disabled:text-neutral-500"
          >
            {prompt}
          </button>
        ))}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-6 sm:max-w-[75%] ${
                message.role === "user"
                  ? "bg-white text-neutral-950"
                  : "border border-neutral-800 bg-neutral-950 text-neutral-100"
              }`}
            >
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
                {message.role === "user" ? "Tu" : "Coach"}
              </p>
              <p className="whitespace-pre-wrap">{message.content}</p>
              {message.role === "assistant" && message.actions?.length ? (
                <div className="mt-4 border-t border-neutral-800 pt-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
                    Azioni consigliate
                  </p>
                  <div className="mt-3 space-y-2">
                    {message.actions.map((action) => (
                      <Link
                        key={action.id}
                        href={action.href}
                        className="block rounded-2xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-left transition hover:border-neutral-500 hover:bg-neutral-800"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-semibold text-white">
                            {action.label}
                          </span>
                          <span className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                            {action.kind === "guided" ? "Guidata" : "Apri"}
                          </span>
                        </div>
                        {action.description ? (
                          <p className="mt-2 text-sm text-neutral-300">
                            {action.description}
                          </p>
                        ) : null}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ))}

        {loading ? (
          <div className="flex justify-start">
            <div className="max-w-[88%] rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-300 sm:max-w-[75%]">
              Il coach sta preparando la risposta...
            </div>
          </div>
        ) : null}

        <div ref={scrollAnchorRef} />
      </div>

      <form onSubmit={handleSubmit} className="border-t border-neutral-800 px-5 py-4 sm:px-6">
        {error ? (
          <div className="mb-3 rounded-2xl border border-rose-800 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        <label htmlFor="coach-chat-input" className="sr-only">
          Messaggio al coach
        </label>
        <textarea
          id="coach-chat-input"
          ref={textareaRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={4}
          placeholder="Scrivi una domanda sul tuo allenamento..."
          disabled={loading}
          className="w-full resize-none rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-neutral-500 focus:border-neutral-500 disabled:cursor-not-allowed disabled:border-neutral-800 disabled:text-neutral-500"
        />

        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs text-neutral-500">Invio solo dal bottone. Enter va a capo.</p>
          <button
            type="submit"
            disabled={loading || !draft.trim()}
            className="inline-flex min-w-24 justify-center rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-neutral-950 transition disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-300"
          >
            {loading ? "Invio..." : "Invia"}
          </button>
        </div>
      </form>
    </div>
  );
}
