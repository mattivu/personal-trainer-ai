"use client";

import { useEffect, useId, useRef, useState } from "react";

type RecoveryTimerOverlayProps = {
  durationSeconds: number;
  exerciseName?: string | null;
  onClose: () => void;
};

const CIRCLE_RADIUS = 132;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

function readReducedMotionPreference() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function RecoveryTimerOverlay({
  durationSeconds,
  exerciseName,
  onClose,
}: RecoveryTimerOverlayProps) {
  const titleId = useId();
  const descriptionId = useId();
  const totalMilliseconds = Math.max(durationSeconds, 0) * 1000;
  const [remainingMilliseconds, setRemainingMilliseconds] = useState(totalMilliseconds);
  const [isComplete, setIsComplete] = useState(totalMilliseconds === 0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(readReducedMotionPreference);
  const audioContextRef = useRef<AudioContext | null>(null);
  const alarmOscillatorRef = useRef<OscillatorNode | null>(null);
  const alarmGainRef = useRef<GainNode | null>(null);
  const alarmIntervalRef = useRef<number | null>(null);
  const vibrationIntervalRef = useRef<number | null>(null);
  const isAlarmRunningRef = useRef(false);

  function stopAlarmSound() {
    if (alarmIntervalRef.current !== null) {
      window.clearInterval(alarmIntervalRef.current);
      alarmIntervalRef.current = null;
    }

    if (vibrationIntervalRef.current !== null) {
      window.clearInterval(vibrationIntervalRef.current);
      vibrationIntervalRef.current = null;
    }

    try {
      navigator.vibrate?.(0);
    } catch {}

    const gainNode = alarmGainRef.current;
    const audioContext = audioContextRef.current;
    const oscillator = alarmOscillatorRef.current;

    if (gainNode && audioContext) {
      try {
        const now = audioContext.currentTime;
        gainNode.gain.cancelScheduledValues(now);
        gainNode.gain.setValueAtTime(gainNode.gain.value, now);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
      } catch {}
    }

    if (oscillator && audioContext) {
      try {
        oscillator.stop(audioContext.currentTime + 0.05);
      } catch {}
    }

    if (audioContext) {
      void audioContext.close().catch(() => undefined);
    }

    alarmOscillatorRef.current = null;
    alarmGainRef.current = null;
    audioContextRef.current = null;
    isAlarmRunningRef.current = false;
  }

  function startAlarmSound() {
    if (typeof window === "undefined" || isAlarmRunningRef.current) {
      return;
    }

    stopAlarmSound();

    try {
      const AudioContextCtor =
        window.AudioContext ??
        (window as typeof window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;

      if (!AudioContextCtor) {
        return;
      }

      const audioContext = new AudioContextCtor();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(784, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.0001, audioContext.currentTime);

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.start();

      audioContextRef.current = audioContext;
      alarmOscillatorRef.current = oscillator;
      alarmGainRef.current = gainNode;
      isAlarmRunningRef.current = true;

      const triggerAlarmPulse = () => {
        const currentAudioContext = audioContextRef.current;
        const currentGainNode = alarmGainRef.current;
        const currentOscillator = alarmOscillatorRef.current;

        if (!currentAudioContext || !currentGainNode || !currentOscillator) {
          return;
        }

        const now = currentAudioContext.currentTime;
        const accentFrequency =
          Math.round(now * 10) % 2 === 0
            ? 784
            : 880;

        currentOscillator.frequency.cancelScheduledValues(now);
        currentOscillator.frequency.setValueAtTime(accentFrequency, now);
        currentOscillator.frequency.setValueAtTime(880, now + 0.22);
        currentOscillator.frequency.setValueAtTime(784, now + 0.46);

        currentGainNode.gain.cancelScheduledValues(now);
        currentGainNode.gain.setValueAtTime(0.0001, now);
        currentGainNode.gain.exponentialRampToValueAtTime(0.09, now + 0.02);
        currentGainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
        currentGainNode.gain.exponentialRampToValueAtTime(0.085, now + 0.3);
        currentGainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
      };

      void audioContext.resume().then(triggerAlarmPulse).catch(() => undefined);

      alarmIntervalRef.current = window.setInterval(triggerAlarmPulse, 760);

      try {
        navigator.vibrate?.([250, 120, 250]);
        vibrationIntervalRef.current = window.setInterval(() => {
          try {
            navigator.vibrate?.([250, 120, 250]);
          } catch {}
        }, 1300);
      } catch {}
    } catch {
      stopAlarmSound();
    }
  }

  function handleClose() {
    stopAlarmSound();
    onClose();
  }

  useEffect(() => {
    stopAlarmSound();
    setRemainingMilliseconds(totalMilliseconds);
    setIsComplete(totalMilliseconds === 0);
  }, [totalMilliseconds]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = () => setPrefersReducedMotion(mediaQuery.matches);

    handleChange();
    mediaQuery.addEventListener("change", handleChange);

    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        handleClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (isComplete) {
      return;
    }

    const startedAt = Date.now();
    const intervalId = window.setInterval(() => {
      const elapsedMilliseconds = Date.now() - startedAt;
      const nextRemainingMilliseconds = Math.max(
        totalMilliseconds - elapsedMilliseconds,
        0,
      );

      setRemainingMilliseconds(nextRemainingMilliseconds);

      if (nextRemainingMilliseconds === 0) {
        setIsComplete(true);
      }
    }, 100);

    return () => window.clearInterval(intervalId);
  }, [isComplete, totalMilliseconds]);

  useEffect(() => {
    if (!isComplete) {
      stopAlarmSound();
      return;
    }

    startAlarmSound();
  }, [isComplete]);

  useEffect(() => stopAlarmSound, []);

  const remainingSeconds =
    remainingMilliseconds > 0 ? Math.ceil(remainingMilliseconds / 1000) : 0;
  const progress = totalMilliseconds === 0 ? 0 : remainingMilliseconds / totalMilliseconds;
  const strokeDashoffset = CIRCLE_CIRCUMFERENCE * (1 - progress);
  const progressStroke = isComplete ? "#FF7A7A" : "#D0D82B";
  const pulseAnimation = prefersReducedMotion
    ? undefined
    : "recoveryTimerCompletePulse 820ms ease-out 3";

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-[#0A0D0D] px-5 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
    >
      <style>{`
        @keyframes recoveryTimerCompletePulse {
          0% { box-shadow: 0 0 0 0 rgba(255, 122, 122, 0.22); }
          60% { box-shadow: 0 0 0 22px rgba(255, 122, 122, 0); }
          100% { box-shadow: 0 0 0 0 rgba(255, 122, 122, 0); }
        }
      `}</style>

      <div className="w-full max-w-[402px]">
        <div
          className="rounded-[32px] border border-white/8 bg-[radial-gradient(circle_at_top,rgba(208,216,43,0.1),transparent_34%),linear-gradient(180deg,#101415_0%,#0A0D0D_100%)] px-5 pb-[calc(24px+env(safe-area-inset-bottom,0px))] pt-6 text-center shadow-[0_26px_80px_rgba(0,0,0,0.45)]"
          style={isComplete ? { animation: pulseAnimation, borderColor: "rgba(255, 122, 122, 0.42)" } : undefined}
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--app-primary)]">
            Recupero
          </p>
          <h2
            id={titleId}
            className="mt-3 text-[28px] font-semibold tracking-[-0.04em] text-[var(--app-text)]"
          >
            {exerciseName?.trim() || "Prossima serie"}
          </h2>

          <div className="mt-8 flex justify-center">
            <div className="relative h-[320px] w-[320px]">
              <svg
                viewBox="0 0 320 320"
                className="h-full w-full -rotate-90"
                aria-hidden="true"
              >
                <circle
                  cx="160"
                  cy="160"
                  r={CIRCLE_RADIUS}
                  fill="none"
                  stroke="rgba(247, 249, 250, 0.12)"
                  strokeWidth="14"
                />
                <circle
                  cx="160"
                  cy="160"
                  r={CIRCLE_RADIUS}
                  fill="none"
                  stroke={progressStroke}
                  strokeWidth="14"
                  strokeLinecap="round"
                  strokeDasharray={CIRCLE_CIRCUMFERENCE}
                  strokeDashoffset={strokeDashoffset}
                  className={prefersReducedMotion ? "" : "transition-[stroke-dashoffset,stroke] duration-100 ease-linear"}
                />
              </svg>

              <div className="absolute inset-0 flex items-center justify-center">
                {isComplete ? (
                  <button
                    type="button"
                    onClick={handleClose}
                    aria-label="Chiudi timer recupero"
                    className="font-metrics flex h-36 w-36 items-center justify-center rounded-full border border-[#FF7A7A]/40 bg-[#FF7A7A]/10 text-[92px] font-semibold leading-none tracking-[-0.08em] text-[#FF7A7A] outline-none transition hover:bg-[#FF7A7A]/14 focus-visible:border-[#FF7A7A] focus-visible:ring-2 focus-visible:ring-[#FF7A7A]/35"
                  >
                    X
                  </button>
                ) : (
                  <div className="text-center">
                    <p className="font-metrics text-[96px] font-semibold leading-none tracking-[-0.08em] text-[var(--app-text)]">
                      {remainingSeconds}
                    </p>
                    <p className="mt-3 text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--app-muted-2)]">
                      secondi
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <p
            id={descriptionId}
            className="mx-auto mt-4 max-w-[260px] text-sm leading-6 text-[var(--app-muted)]"
          >
            {isComplete
              ? "Recupero terminato. Tocca la X per tornare all'esercizio."
              : "Respira e preparati alla prossima serie."}
          </p>

          {!isComplete ? (
            <button
              type="button"
              onClick={handleClose}
              className="mt-6 inline-flex min-h-[52px] w-full items-center justify-center rounded-[18px] border border-white/10 bg-white/[0.035] px-4 py-3 text-sm font-semibold text-[var(--app-text)] transition hover:border-white/16 hover:bg-white/[0.05]"
            >
              Chiudi timer
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
