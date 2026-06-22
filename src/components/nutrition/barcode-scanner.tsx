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
    return "Permesso fotocamera negato. Puoi inserire il prodotto manualmente.";
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error.name === "NotFoundError" ||
      error.name === "DevicesNotFoundError" ||
      error.name === "OverconstrainedError")
  ) {
    return "Fotocamera non disponibile su questo dispositivo.";
  }

  return "Impossibile avviare la fotocamera in questo momento.";
}

export function BarcodeScanner({
  active,
  disabled = false,
  onInsertManual,
  onUseProduct,
}: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const cooldownRef = useRef<{ barcode: string; at: number } | null>(null);
  const lookupAbortRef = useRef<AbortController | null>(null);

  const [scannerActive, setScannerActive] = useState(false);
  const [scannerStarting, setScannerStarting] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
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

  function stopScanner() {
    controlsRef.current?.stop();
    controlsRef.current = null;
    readerRef.current = null;
    setScannerActive(false);
    setScannerStarting(false);

    if (videoRef.current) {
      const stream = videoRef.current.srcObject;

      if (stream instanceof MediaStream) {
        for (const track of stream.getTracks()) {
          track.stop();
        }
      }

      videoRef.current.srcObject = null;
    }
  }

  useEffect(() => {
    if (active) {
      return;
    }

    lookupAbortRef.current?.abort();
    lookupAbortRef.current = null;
    stopScanner();
  }, [active]);

  useEffect(() => {
    return () => {
      lookupAbortRef.current?.abort();
      lookupAbortRef.current = null;
      stopScanner();
    };
  }, []);

  async function lookupBarcode(barcode: string) {
    lookupAbortRef.current?.abort();

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
      if (
        typeof error === "object" &&
        error !== null &&
        "name" in error &&
        error.name === "AbortError"
      ) {
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
    if (disabled || scannerActive || scannerStarting || !videoRef.current) {
      return;
    }

    setScannerError(null);
    setDetectedBarcode(null);
    setLookupState({ kind: "idle" });
    setScannerStarting(true);

    try {
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;

      const controls = await reader.decodeFromConstraints(
        {
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
          },
        },
        videoRef.current,
        (result, error) => {
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

          if (error && !(error instanceof NotFoundException)) {
            setScannerError("Scansione non disponibile in questo momento.");
          }
        }
      );

      controlsRef.current = controls;
      setScannerActive(true);
    } catch (error) {
      setScannerError(parseLookupError(error));
      stopScanner();
    } finally {
      setScannerStarting(false);
    }
  }

  function handleUseProduct() {
    if (!foundProduct || !computedNutrition || safeQuantity <= 0) {
      return;
    }

    const brand = foundProduct.brand?.trim() ?? "";
    const name = brand ? `${foundProduct.name} ${brand}` : foundProduct.name;

    onUseProduct({
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

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-[22px] font-semibold tracking-[-0.03em] text-[var(--app-text)]">
          Inquadra barcode
        </h2>
        <p className="mt-2 text-sm text-[var(--app-muted)]">
          Posiziona il codice a barre dentro il riquadro.
        </p>
      </div>

      <div className="rounded-[32px] border border-white/8 bg-[radial-gradient(circle_at_top,rgba(208,216,43,0.08),transparent_45%)] p-5">
        <div className="relative overflow-hidden rounded-[28px] border border-white/8 bg-black/35 px-4 py-10">
          <div className="absolute inset-x-8 top-1/2 h-px -translate-y-1/2 bg-[linear-gradient(90deg,transparent,rgba(208,216,43,0.65),transparent)]" />
          <div className="relative mx-auto h-52 max-w-[280px] overflow-hidden rounded-[28px] border border-[rgba(208,216,43,0.35)] bg-black/50">
            <video
              ref={videoRef}
              muted
              playsInline
              autoPlay
              className={`h-full w-full object-cover ${scannerActive ? "opacity-100" : "opacity-0"}`}
            />
            {!scannerActive ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <span className="text-sm text-[var(--app-muted)]">
                  {scannerStarting ? "Apertura fotocamera..." : "Scanner pronto"}
                </span>
              </div>
            ) : null}
            <span className="absolute left-4 top-4 h-8 w-8 rounded-tl-2xl border-l-2 border-t-2 border-[var(--app-primary)]" />
            <span className="absolute right-4 top-4 h-8 w-8 rounded-tr-2xl border-r-2 border-t-2 border-[var(--app-primary)]" />
            <span className="absolute bottom-4 left-4 h-8 w-8 rounded-bl-2xl border-b-2 border-l-2 border-[var(--app-primary)]" />
            <span className="absolute bottom-4 right-4 h-8 w-8 rounded-br-2xl border-b-2 border-r-2 border-[var(--app-primary)]" />
          </div>
        </div>
      </div>

      <div className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1 text-sm">
            <p className="font-semibold text-[var(--app-text)]">
              {scannerActive ? "Inquadra il codice a barre" : "Scansione da fotocamera"}
            </p>
            <p className="text-[var(--app-muted)]">
              {scannerStarting
                ? "Avvio in corso..."
                : scannerActive
                  ? "Mantieni fermo il telefono sul barcode."
                  : "Apri la fotocamera per leggere il prodotto."}
            </p>
          </div>

          {scannerActive ? (
            <button
              type="button"
              onClick={stopScanner}
              className="inline-flex min-h-[48px] items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-3 font-semibold text-[var(--app-text)] transition-colors hover:bg-white/[0.05]"
            >
              Ferma scansione
            </button>
          ) : (
            <button
              type="button"
              disabled={disabled || scannerStarting}
              onClick={startScanner}
              className="inline-flex min-h-[48px] items-center justify-center rounded-2xl bg-[var(--app-primary)] px-5 py-3 font-semibold text-[var(--app-bg)] shadow-[0_12px_28px_rgba(208,216,43,0.18)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              Avvia scansione
            </button>
          )}
        </div>

        {(scannerActive || scannerStarting) && !scannerError ? (
          <div className="mt-4 flex items-center gap-2 text-sm text-[var(--app-muted)]">
            <span className="h-2 w-2 rounded-full bg-[var(--app-primary)] animate-pulse" />
            <span>Inquadra il codice a barre</span>
          </div>
        ) : null}

        {detectedBarcode ? (
          <p className="mt-4 text-sm text-[var(--app-text)]">
            Barcode rilevato: <span className="font-metrics">{detectedBarcode}</span>
          </p>
        ) : null}

        {scannerError ? (
          <p className="mt-4 text-sm text-rose-200">{scannerError}</p>
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
            onClick={onInsertManual}
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
        onClick={onInsertManual}
        className="inline-flex min-h-[52px] w-full items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-3 font-semibold text-[var(--app-text)] transition-colors hover:bg-white/[0.05]"
      >
        Inserisci manualmente
      </button>
    </section>
  );
}
