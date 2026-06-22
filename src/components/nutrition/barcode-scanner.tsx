"use client";

import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { NotFoundException } from "@zxing/library";
import { useEffect, useRef, useState } from "react";
import { formatNutritionNumber } from "@/lib/nutrition/meals";
import type { FoodProductSummary } from "@/lib/nutrition/barcode";

type BarcodeLookupResponse =
  | {
      status: "found";
      source: "local" | "open_food_facts";
      product: FoodProductSummary;
    }
  | {
      status: "not_found";
      barcode: string;
    }
  | {
      status: "invalid_barcode" | "external_error" | "error";
    };

type BarcodeLookupState =
  | { kind: "idle" }
  | { kind: "loading"; barcode: string }
  | { kind: "found"; barcode: string; product: FoodProductSummary; sourceLabel: string }
  | { kind: "not_found"; barcode: string }
  | { kind: "invalid_barcode"; barcode: string }
  | { kind: "external_error"; barcode: string }
  | { kind: "error"; barcode: string; message: string };

type CameraIssue = "permission_denied" | "not_available" | "error";

type BarcodeScannerProps = {
  active: boolean;
  disabled?: boolean;
  onInsertManual: () => void;
  onUseProduct: (payload: {
    name: string;
    brand: string;
    quantityValue: string;
    quantityUnit: string;
    calories: string;
    protein: string;
    carbs: string;
    fat: string;
    notes: string;
  }) => void;
};

const SCAN_COOLDOWN_MS = 2500;
const SCANNER_START_DELAY_MS = 300;

function buildSourceLabel(source: "local" | "open_food_facts") {
  return source === "local" ? "Archivio prodotti" : "Database alimenti";
}

function parseLookupError(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === "NotAllowedError"
  ) {
    return "Permesso fotocamera negato";
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error.name === "NotFoundError" ||
      error.name === "DevicesNotFoundError" ||
      error.name === "OverconstrainedError")
  ) {
    return "Fotocamera non disponibile";
  }

  return "Fotocamera non disponibile";
}

function getCameraIssue(error: unknown): CameraIssue {
  if (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === "NotAllowedError"
  ) {
    return "permission_denied";
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error.name === "NotFoundError" ||
      error.name === "DevicesNotFoundError" ||
      error.name === "OverconstrainedError")
  ) {
    return "not_available";
  }

  return "error";
}

function isAbortError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === "AbortError"
  );
}

export function BarcodeScanner({
  active,
  disabled = false,
  onInsertManual,
  onUseProduct,
}: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const cooldownRef = useRef<{ barcode: string; at: number } | null>(null);
  const lookupAbortRef = useRef<AbortController | null>(null);
  const startTimerRef = useRef<number | null>(null);
  const isMountedRef = useRef(false);
  const isStartingRef = useRef(false);
  const isActiveRef = useRef(false);
  const startTokenRef = useRef(0);
  const activeRef = useRef(active);
  const disabledRef = useRef(disabled);
  const onInsertManualRef = useRef(onInsertManual);
  const onUseProductRef = useRef(onUseProduct);

  const [scannerActive, setScannerActive] = useState(false);
  const [scannerStarting, setScannerStarting] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [cameraIssue, setCameraIssue] = useState<CameraIssue | null>(null);
  const [detectedBarcode, setDetectedBarcode] = useState<string | null>(null);
  const [lookupState, setLookupState] = useState<BarcodeLookupState>({ kind: "idle" });
  const [quantity, setQuantity] = useState("100");

  const foundProduct = lookupState.kind === "found" ? lookupState.product : null;
  const parsedQuantity = Number(quantity.replace(",", "."));
  const safeQuantity =
    Number.isFinite(parsedQuantity) && parsedQuantity > 0 ? parsedQuantity : 0;

  const computedNutrition = foundProduct
    ? {
        calories: ((foundProduct.caloriesPer100g ?? 0) * safeQuantity) / 100,
        protein: ((foundProduct.proteinPer100g ?? 0) * safeQuantity) / 100,
        carbs: ((foundProduct.carbsPer100g ?? 0) * safeQuantity) / 100,
        fat: ((foundProduct.fatPer100g ?? 0) * safeQuantity) / 100,
      }
    : null;

  function clearStartTimer() {
    if (startTimerRef.current === null) {
      return;
    }

    window.clearTimeout(startTimerRef.current);
    startTimerRef.current = null;
  }

  function abortLookup() {
    lookupAbortRef.current?.abort();
    lookupAbortRef.current = null;
  }

  function cleanupVideoStream(videoElement: HTMLVideoElement | null) {
    if (!videoElement) {
      return;
    }

    const stream = videoElement.srcObject;

    if (stream instanceof MediaStream) {
      for (const track of stream.getTracks()) {
        track.stop();
      }
    }

    videoElement.srcObject = null;
  }

  function isStartStale(startToken: number) {
    return (
      !isMountedRef.current ||
      !activeRef.current ||
      disabledRef.current ||
      startTokenRef.current !== startToken
    );
  }

  function isIgnorableScannerError(error: unknown, startToken: number) {
    if (isAbortError(error)) {
      return true;
    }

    return isStartStale(startToken);
  }

  function stopScanner() {
    clearStartTimer();
    startTokenRef.current += 1;
    isStartingRef.current = false;
    isActiveRef.current = false;
    controlsRef.current?.stop();
    controlsRef.current = null;

    cleanupVideoStream(videoRef.current);

    if (isMountedRef.current) {
      setScannerActive(false);
      setScannerStarting(false);
    }
  }

  async function lookupBarcode(barcode: string) {
    abortLookup();

    const controller = new AbortController();
    lookupAbortRef.current = controller;

    setLookupState({ kind: "loading", barcode });
    setQuantity("100");

    try {
      const response = await fetch(`/api/nutrition/products/barcode/${barcode}`, {
        signal: controller.signal,
      });
      const payload = (await response.json()) as BarcodeLookupResponse;

      if (controller.signal.aborted) {
        return;
      }

      if (payload.status === "found") {
        setLookupState({
          kind: "found",
          barcode,
          product: payload.product,
          sourceLabel: buildSourceLabel(payload.source),
        });
        return;
      }

      if (payload.status === "not_found") {
        setLookupState({ kind: "not_found", barcode });
        return;
      }

      if (payload.status === "invalid_barcode") {
        setLookupState({ kind: "invalid_barcode", barcode });
        return;
      }

      if (payload.status === "external_error") {
        setLookupState({ kind: "external_error", barcode });
        return;
      }

      setLookupState({
        kind: "error",
        barcode,
        message: "Archivio prodotti momentaneamente non disponibile.",
      });
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }

      setLookupState({
        kind: "error",
        barcode,
        message: "Archivio prodotti momentaneamente non disponibile.",
      });
    } finally {
      if (lookupAbortRef.current === controller) {
        lookupAbortRef.current = null;
      }
    }
  }

  async function startScanner() {
    if (
      !activeRef.current ||
      disabledRef.current ||
      isActiveRef.current ||
      isStartingRef.current ||
      controlsRef.current ||
      !videoRef.current
    ) {
      return;
    }

    const videoElement = videoRef.current;
    const startToken = startTokenRef.current + 1;

    startTokenRef.current = startToken;
    isStartingRef.current = true;
    setScannerError(null);
    setCameraIssue(null);
    setDetectedBarcode(null);
    setLookupState({ kind: "idle" });
    setScannerStarting(true);

    try {
      const reader = new BrowserMultiFormatReader();

      const controls = await reader.decodeFromConstraints(
        {
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
          },
        },
        videoElement,
        (result, error) => {
          if (startTokenRef.current !== startToken) {
            return;
          }

          if (result) {
            const barcode = result.getText().trim();
            const now = Date.now();
            const cooldown = cooldownRef.current;

            if (
              cooldown &&
              cooldown.barcode === barcode &&
              now - cooldown.at < SCAN_COOLDOWN_MS
            ) {
              return;
            }

            cooldownRef.current = {
              barcode,
              at: now,
            };
            setDetectedBarcode(barcode);
            stopScanner();
            void lookupBarcode(barcode);
            return;
          }

          if (
            error &&
            !(error instanceof NotFoundException) &&
            !isIgnorableScannerError(error, startToken)
          ) {
            setCameraIssue("error");
            setScannerError("Scansione non disponibile in questo momento.");
            stopScanner();
          }
        }
      );

      if (isStartStale(startToken)) {
        controls.stop();
        cleanupVideoStream(videoElement);
        return;
      }

      controlsRef.current = controls;
      isActiveRef.current = true;
      setScannerActive(true);
    } catch (error) {
      if (isIgnorableScannerError(error, startToken)) {
        cleanupVideoStream(videoElement);
        return;
      }

      setCameraIssue(getCameraIssue(error));
      setScannerError(parseLookupError(error));
      stopScanner();
    } finally {
      if (startTokenRef.current === startToken) {
        isStartingRef.current = false;
        if (isMountedRef.current) {
          setScannerStarting(false);
        }
      }
    }
  }

  function handleInsertManual() {
    onInsertManualRef.current();
  }

  function handleUseProduct() {
    if (!foundProduct || !computedNutrition || safeQuantity <= 0) {
      return;
    }

    const brand = foundProduct.brand?.trim() ?? "";
    const name = brand ? `${foundProduct.name} ${brand}` : foundProduct.name;

    onUseProductRef.current({
      name,
      brand,
      quantityValue: String(safeQuantity),
      quantityUnit: "g",
      calories: String(Number(computedNutrition.calories.toFixed(1))),
      protein: String(Number(computedNutrition.protein.toFixed(1))),
      carbs: String(Number(computedNutrition.carbs.toFixed(1))),
      fat: String(Number(computedNutrition.fat.toFixed(1))),
      notes: `Barcode: ${foundProduct.barcode}`,
    });
  }

  useEffect(() => {
    activeRef.current = active;
    disabledRef.current = disabled;
  }, [active, disabled]);

  useEffect(() => {
    onInsertManualRef.current = onInsertManual;
  }, [onInsertManual]);

  useEffect(() => {
    onUseProductRef.current = onUseProduct;
  }, [onUseProduct]);

  useEffect(() => {
    if (!active || disabled) {
      abortLookup();
      stopScanner();
      return;
    }

    clearStartTimer();
    startTimerRef.current = window.setTimeout(() => {
      startTimerRef.current = null;
      void startScanner();
    }, SCANNER_START_DELAY_MS);

    return () => {
      abortLookup();
      stopScanner();
    };
  }, [active, disabled]);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      abortLookup();
      stopScanner();
    };
  }, []);

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-[22px] font-semibold tracking-[-0.03em] text-[var(--app-text)]">
          Inquadra barcode
        </h2>
        <p className="mt-2 text-sm text-[var(--app-muted)]">
          Inquadra il codice a barre.
        </p>
      </div>

      <div className="space-y-3">
        <div className="relative mx-auto aspect-[4/3] w-full max-w-[320px] overflow-hidden rounded-[28px] border border-white/10 bg-black/45">
          <video
            ref={videoRef}
            muted
            playsInline
            autoPlay
            className={`h-full w-full object-cover transition-opacity ${
              scannerActive ? "opacity-100" : "opacity-0"
            }`}
          />

          {scannerStarting ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/45">
              <span className="text-sm text-[var(--app-muted)]">
                Attivazione fotocamera...
              </span>
            </div>
          ) : null}

          {!scannerActive && !scannerStarting ? (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(208,216,43,0.08),transparent_52%)]" />
          ) : null}

          <span className="absolute left-4 top-4 h-8 w-8 rounded-tl-2xl border-l-2 border-t-2 border-[var(--app-primary)]" />
          <span className="absolute right-4 top-4 h-8 w-8 rounded-tr-2xl border-r-2 border-t-2 border-[var(--app-primary)]" />
          <span className="absolute bottom-4 left-4 h-8 w-8 rounded-bl-2xl border-b-2 border-l-2 border-[var(--app-primary)]" />
          <span className="absolute bottom-4 right-4 h-8 w-8 rounded-br-2xl border-b-2 border-r-2 border-[var(--app-primary)]" />
        </div>

        {scannerActive ? (
          <div className="flex items-center justify-between gap-3 text-sm">
            <p className="text-[var(--app-muted)]">Inquadra il codice a barre</p>
            <button
              type="button"
              onClick={stopScanner}
              className="inline-flex min-h-[40px] items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2 font-semibold text-[var(--app-text)] transition-colors hover:bg-white/[0.05]"
            >
              Ferma scansione
            </button>
          </div>
        ) : null}

        {detectedBarcode ? (
          <p className="text-sm text-[var(--app-text)]">
            Barcode rilevato: <span className="font-metrics">{detectedBarcode}</span>
          </p>
        ) : null}

        {scannerError ? (
          <div className="space-y-3 rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4">
            <p
              className={`text-sm ${
                cameraIssue === "error" ? "text-rose-200" : "text-[var(--app-muted)]"
              }`}
            >
              {scannerError}
            </p>
            {(cameraIssue === "permission_denied" || cameraIssue === "not_available") && (
              <button
                type="button"
                onClick={handleInsertManual}
                className="inline-flex min-h-[48px] w-full items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-3 font-semibold text-[var(--app-text)] transition-colors hover:bg-white/[0.05]"
              >
                Inserisci manualmente
              </button>
            )}
          </div>
        ) : null}
      </div>

      {lookupState.kind === "loading" ? (
        <div className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm text-[var(--app-muted)]">
          Ricerca prodotto in corso...
        </div>
      ) : null}

      {lookupState.kind === "found" && foundProduct && computedNutrition ? (
        <div className="space-y-4 rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-base font-semibold text-[var(--app-text)]">
                {foundProduct.name}
              </p>
              <p className="mt-1 text-sm text-[var(--app-muted)]">
                {foundProduct.brand ? `${foundProduct.brand} · ` : ""}
                {lookupState.sourceLabel}
              </p>
            </div>
            <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-semibold text-[var(--app-text)]">
              {lookupState.barcode}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="min-w-0 rounded-2xl border border-white/8 bg-black/20 p-3">
              <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--app-muted-2)]">
                Calorie 100 g
              </p>
              <p className="mt-2 text-lg font-semibold text-[var(--app-text)]">
                {formatNutritionNumber(foundProduct.caloriesPer100g ?? 0)}
              </p>
            </div>
            <div className="min-w-0 rounded-2xl border border-white/8 bg-black/20 p-3">
              <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--app-muted-2)]">
                Proteine 100 g
              </p>
              <p className="mt-2 text-lg font-semibold text-[var(--app-text)]">
                {formatNutritionNumber(foundProduct.proteinPer100g ?? 0)} g
              </p>
            </div>
            <div className="min-w-0 rounded-2xl border border-white/8 bg-black/20 p-3">
              <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--app-muted-2)]">
                Carboidrati 100 g
              </p>
              <p className="mt-2 text-lg font-semibold text-[var(--app-text)]">
                {formatNutritionNumber(foundProduct.carbsPer100g ?? 0)} g
              </p>
            </div>
            <div className="min-w-0 rounded-2xl border border-white/8 bg-black/20 p-3">
              <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--app-muted-2)]">
                Grassi 100 g
              </p>
              <p className="mt-2 text-lg font-semibold text-[var(--app-text)]">
                {formatNutritionNumber(foundProduct.fatPer100g ?? 0)} g
              </p>
            </div>
          </div>

          <label className="space-y-2 text-sm text-[var(--app-text)]">
            <span className="font-medium text-[var(--app-muted)]">Quantità</span>
            <div className="flex items-center gap-3">
              <input
                inputMode="decimal"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-[var(--app-text)] outline-none transition-colors placeholder:text-[var(--app-muted-2)] focus:border-[var(--app-primary-border)]"
                placeholder="100"
              />
              <span className="text-sm font-semibold text-[var(--app-muted)]">g</span>
            </div>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <div className="min-w-0 rounded-2xl border border-[var(--app-primary-border)] bg-[rgba(208,216,43,0.08)] p-3">
              <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--app-muted-2)]">
                Kcal
              </p>
              <p className="mt-2 text-lg font-semibold text-[var(--app-text)]">
                {formatNutritionNumber(computedNutrition.calories)}
              </p>
            </div>
            <div className="min-w-0 rounded-2xl border border-white/8 bg-black/20 p-3">
              <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--app-muted-2)]">
                Proteine
              </p>
              <p className="mt-2 text-lg font-semibold text-[var(--app-text)]">
                {formatNutritionNumber(computedNutrition.protein)} g
              </p>
            </div>
            <div className="min-w-0 rounded-2xl border border-white/8 bg-black/20 p-3">
              <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--app-muted-2)]">
                Carboidrati
              </p>
              <p className="mt-2 text-lg font-semibold text-[var(--app-text)]">
                {formatNutritionNumber(computedNutrition.carbs)} g
              </p>
            </div>
            <div className="min-w-0 rounded-2xl border border-white/8 bg-black/20 p-3">
              <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--app-muted-2)]">
                Grassi
              </p>
              <p className="mt-2 text-lg font-semibold text-[var(--app-text)]">
                {formatNutritionNumber(computedNutrition.fat)} g
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={safeQuantity <= 0}
            onClick={handleUseProduct}
            className="inline-flex min-h-[52px] w-full items-center justify-center rounded-2xl bg-[var(--app-primary)] px-5 py-3 font-semibold text-[var(--app-bg)] shadow-[0_14px_32px_rgba(208,216,43,0.18)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            Usa questo prodotto
          </button>
        </div>
      ) : null}

      {lookupState.kind === "not_found" ? (
        <div className="space-y-4 rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
          <div>
            <p className="font-semibold text-[var(--app-text)]">Prodotto non in database</p>
            <p className="mt-1 text-sm text-[var(--app-muted)]">
              Puoi aggiungerlo manualmente inserendo i valori nutrizionali.
            </p>
          </div>
          <button
            type="button"
            onClick={handleInsertManual}
            className="inline-flex min-h-[52px] w-full items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-3 font-semibold text-[var(--app-text)] transition-colors hover:bg-white/[0.05]"
          >
            Inserisci manualmente
          </button>
        </div>
      ) : null}

      {lookupState.kind === "invalid_barcode" ? (
        <div className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm text-[var(--app-muted)]">
          Barcode non valido. Puoi inserire il prodotto manualmente.
        </div>
      ) : null}

      {lookupState.kind === "external_error" ? (
        <div className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm text-[var(--app-muted)]">
          Archivio prodotti momentaneamente non disponibile.
        </div>
      ) : null}

      {lookupState.kind === "error" ? (
        <div className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm text-[var(--app-muted)]">
          {lookupState.message}
        </div>
      ) : null}

      <button
        type="button"
        onClick={handleInsertManual}
        className="inline-flex min-h-[52px] w-full items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-3 font-semibold text-[var(--app-text)] transition-colors hover:bg-white/[0.05]"
      >
        Inserisci manualmente
      </button>
    </section>
  );
}
