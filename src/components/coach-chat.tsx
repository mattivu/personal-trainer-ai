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
  "Come sto andando?",
  "Cosa faccio oggi?",
  "Devo cambiare qualcosa?",
  "Come va la nutrizione?",
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
    <div className="flex min-h-0 flex-1 flex-col overflow-x-hidden">
      <div className="-mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {QUICK_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => void sendMessage(prompt)}
            disabled={loading}
            className="shrink-0 rounded-full border border-[rgba(208,216,43,0.28)] bg-[rgba(208,216,43,0.08)] px-3.5 py-2 text-sm font-medium text-[var(--app-primary)] transition hover:border-[rgba(208,216,43,0.48)] hover:bg-[rgba(208,216,43,0.14)] disabled:cursor-not-allowed disabled:border-white/8 disabled:bg-white/[0.03] disabled:text-neutral-500"
          >
            {prompt}
          </button>
        ))}
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[32px] border border-white/8 bg-[linear-gradient(180deg,rgba(17,19,19,0.96),rgba(10,13,13,0.98))]">
        <div className="pointer-events-none absolute inset-0 rounded-[32px] bg-[radial-gradient(circle_at_top,rgba(208,216,43,0.08),transparent_34%)]" />

        <div className="relative flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-3 pt-3 pb-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[88%] rounded-[24px] px-4 py-3.5 text-sm leading-6 shadow-[0_14px_40px_rgba(0,0,0,0.18)] sm:max-w-[75%] ${
                    message.role === "user"
                      ? "bg-[var(--app-primary)] text-[#0A0D0D]"
                      : "border border-white/8 bg-[rgba(17,19,19,0.88)] text-neutral-100"
                  }`}
                >
                  <p
                    className={`mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] ${
                      message.role === "user"
                        ? "text-[#0A0D0D]/60"
                        : "text-neutral-500"
                    }`}
                  >
                    {message.role === "user" ? "Tu" : "Coach"}
                  </p>
                  <p className="whitespace-pre-wrap break-words">{message.content}</p>
                  {message.role === "assistant" && message.actions?.length ? (
                    <div className="mt-4 border-t border-white/8 pt-4">
                      <div className="flex flex-wrap gap-2">
                        {message.actions.map((action) => (
                          <Link
                            key={action.id}
                            href={action.href}
                            className="inline-flex min-h-11 items-center rounded-full border border-[rgba(208,216,43,0.24)] bg-[rgba(208,216,43,0.08)] px-4 py-2 text-sm font-medium text-[var(--app-primary)] transition hover:border-[rgba(208,216,43,0.44)] hover:bg-[rgba(208,216,43,0.14)]"
                          >
                            {action.label}
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
                <div className="max-w-[88%] rounded-[24px] border border-white/8 bg-[rgba(17,19,19,0.88)] px-4 py-3.5 text-sm text-neutral-300 shadow-[0_14px_40px_rgba(0,0,0,0.18)] sm:max-w-[75%]">
                  Il coach sta preparando la risposta...
                </div>
              </div>
            ) : null}

            <div ref={scrollAnchorRef} />
          </div>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="pointer-events-auto sticky bottom-[calc(74px+env(safe-area-inset-bottom,0px))] z-20 mt-4"
      >
        <div className="w-full rounded-[28px] border border-white/8 bg-[rgba(10,13,13,0.9)] p-3 shadow-[0_18px_54px_rgba(0,0,0,0.42)] backdrop-blur-xl">
          {error ? (
            <div className="mb-3 rounded-2xl border border-rose-900/80 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          ) : null}

          <label htmlFor="coach-chat-input" className="sr-only">
            Messaggio al coach
          </label>

          <div className="flex items-end gap-3">
            <textarea
              id="coach-chat-input"
              ref={textareaRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={1}
              placeholder="Scrivi al coach..."
              disabled={loading}
              className="max-h-36 min-h-[52px] flex-1 resize-none rounded-[22px] border border-white/8 bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm text-white outline-none transition placeholder:text-neutral-500 focus:border-[rgba(208,216,43,0.4)] disabled:cursor-not-allowed disabled:text-neutral-500"
            />

            <button
              type="submit"
              disabled={loading || !draft.trim()}
              className="inline-flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl bg-[var(--app-primary)] text-[#0A0D0D] transition hover:brightness-105 disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-400"
              aria-label={loading ? "Invio in corso" : "Invia messaggio"}
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                <path
                  d="M5 12h12M13 6l6 6-6 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
