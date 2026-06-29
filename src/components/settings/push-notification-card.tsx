"use client";

import { useEffect, useState } from "react";
import { SecondaryButton } from "@/components/ui/buttons";

type PushNotificationCardProps = {
  pushPreferenceEnabled: boolean;
  disabled?: boolean;
  onPushPreferenceSync: (enabled: boolean) => Promise<{
    ok: boolean;
    message?: string;
  }>;
};

type PushStatusResponse =
  | {
      ok: true;
      configured: boolean;
      activeSubscriptions: number;
      publicKey: string | null;
    }
  | {
      ok: false;
      message?: string;
    };

type DeviceState = {
  supported: boolean;
  notificationSupported: boolean;
  serviceWorkerSupported: boolean;
  pushManagerSupported: boolean;
  permission: NotificationPermission | "unsupported";
  isIos: boolean;
  isStandalone: boolean;
  configured: boolean;
  publicKey: string | null;
  deviceSubscribed: boolean;
  currentEndpoint: string | null;
  activeSubscriptions: number;
  statusError: string | null;
};

const initialDeviceState: DeviceState = {
  supported: false,
  notificationSupported: false,
  serviceWorkerSupported: false,
  pushManagerSupported: false,
  permission: "unsupported",
  isIos: false,
  isStandalone: false,
  configured: false,
  publicKey: null,
  deviceSubscribed: false,
  currentEndpoint: null,
  activeSubscriptions: 0,
  statusError: null,
};

function isIosDevice(userAgent: string) {
  return (
    /iPad|iPhone|iPod/.test(userAgent) ||
    (/Macintosh/.test(userAgent) &&
      typeof navigator !== "undefined" &&
      navigator.maxTouchPoints > 1)
  );
}

function isStandaloneDisplayMode() {
  if (typeof window === "undefined") {
    return false;
  }

  const standaloneNavigator =
    "standalone" in navigator && typeof navigator.standalone === "boolean"
      ? navigator.standalone
      : false;

  return standaloneNavigator || window.matchMedia("(display-mode: standalone)").matches;
}

function urlBase64ToArrayBuffer(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const bytes = new Uint8Array(buffer);

  for (let index = 0; index < raw.length; index += 1) {
    bytes[index] = raw.charCodeAt(index);
  }

  return buffer;
}

async function ensureServiceWorkerRegistration() {
  const existingRegistration = await navigator.serviceWorker.getRegistration();
  const expectedScriptUrl = new URL("/sw.js", window.location.origin).href;

  const existingScriptUrl =
    existingRegistration?.active?.scriptURL ??
    existingRegistration?.waiting?.scriptURL ??
    existingRegistration?.installing?.scriptURL ??
    null;

  if (existingRegistration && existingScriptUrl === expectedScriptUrl) {
    await navigator.serviceWorker.ready;
    return existingRegistration;
  }

  const registration = await navigator.serviceWorker.register("/sw.js", {
    scope: "/",
    updateViaCache: "none",
  });
  await navigator.serviceWorker.ready;

  return registration;
}

function getEnvPublicKey() {
  const envPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  return typeof envPublicKey === "string" && envPublicKey.trim().length > 0
    ? envPublicKey.trim()
    : null;
}

function getPreferredPublicKey(serverPublicKey: string | null) {
  if (typeof serverPublicKey === "string" && serverPublicKey.trim().length > 0) {
    return serverPublicKey.trim();
  }

  return getEnvPublicKey();
}

function sanitizeErrorMessage(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function formatTechnicalDetail(phase: string, error?: unknown) {
  if (process.env.NODE_ENV === "production") {
    return null;
  }

  if (!(error instanceof Error)) {
    return `fase: ${phase}`;
  }

  const detail = [error.name, error.message].filter((part) => part.trim().length > 0).join(": ");
  return detail.length > 0 ? `fase: ${phase} (${detail})` : `fase: ${phase}`;
}

async function readResponseMessage(response: Response) {
  const text = (await response.text()).trim();

  if (!text) {
    return null;
  }

  try {
    const data = JSON.parse(text) as { message?: string };
    return sanitizeErrorMessage(data.message) ?? text;
  } catch {
    return text;
  }
}

async function getPushStatus() {
  const response = await fetch("/api/push/status", { cache: "no-store" });
  const data = (await response.json()) as PushStatusResponse;

  if (!response.ok || !data.ok) {
    throw new Error(data.ok ? "PUSH_STATUS_HTTP_ERROR" : data.message ?? "PUSH_STATUS_ERROR");
  }

  return {
    configured: data.configured,
    publicKey: getPreferredPublicKey(data.publicKey),
    activeSubscriptions: data.activeSubscriptions,
  };
}

function getErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return null;
  }

  const parts = [error.name, error.message].filter((part) => part.trim().length > 0);
  return parts.length > 0 ? parts.join(": ") : "Unknown error";
}

async function getDeviceState(): Promise<DeviceState> {
  if (typeof window === "undefined") {
    return { ...initialDeviceState };
  }

  const isIos =
    typeof navigator !== "undefined" ? isIosDevice(navigator.userAgent) : false;
  const isStandalone = isStandaloneDisplayMode();
  const notificationSupported = "Notification" in window;
  const serviceWorkerSupported = "serviceWorker" in navigator;
  const pushManagerSupported = "PushManager" in window;
  const supported =
    notificationSupported && serviceWorkerSupported && pushManagerSupported;

  if (!supported) {
    return {
      ...initialDeviceState,
      supported,
      notificationSupported,
      serviceWorkerSupported,
      pushManagerSupported,
      permission: "unsupported",
      isIos,
      isStandalone,
    };
  }

  let configured = false;
  let publicKey: string | null = null;
  let activeSubscriptions = 0;
  let statusError: string | null = null;

  try {
    const status = await getPushStatus();
    configured = status.configured;
    publicKey = status.publicKey;
    activeSubscriptions = status.activeSubscriptions;
  } catch (error) {
    publicKey = getPreferredPublicKey(null);
    statusError = getErrorMessage(error);
  }

  try {
    const registration = await ensureServiceWorkerRegistration();
    const subscription = await registration.pushManager.getSubscription();

    return {
      supported,
      notificationSupported,
      serviceWorkerSupported,
      pushManagerSupported,
      permission: Notification.permission,
      isIos,
      isStandalone,
      configured,
      publicKey,
      deviceSubscribed: Boolean(subscription),
      currentEndpoint: subscription?.endpoint ?? null,
      activeSubscriptions,
      statusError,
    };
  } catch {
    return {
      supported,
      notificationSupported,
      serviceWorkerSupported,
      pushManagerSupported,
      permission: Notification.permission,
      isIos,
      isStandalone,
      configured,
      publicKey,
      deviceSubscribed: false,
      currentEndpoint: null,
      activeSubscriptions,
      statusError,
    };
  }
}

function ToggleControl({
  checked,
  disabled,
  onClick,
}: {
  checked: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label="Notifiche push"
      disabled={disabled}
      onClick={onClick}
      className="peer relative inline-flex h-7 w-12 shrink-0 items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent disabled:cursor-not-allowed"
    >
      <span className="absolute inset-0 rounded-full border border-white/10 bg-white/8 transition peer-checked:border-[var(--app-primary-border)] peer-checked:bg-[rgba(208,216,43,0.22)] peer-disabled:opacity-50" />
      <span className="absolute left-1 h-5 w-5 rounded-full bg-white shadow-[0_4px_12px_rgba(0,0,0,0.3)] transition peer-checked:translate-x-5 peer-checked:bg-[var(--app-primary)]" />
    </button>
  );
}

export function PushNotificationCard({
  pushPreferenceEnabled,
  disabled = false,
  onPushPreferenceSync,
}: PushNotificationCardProps) {
  const [deviceState, setDeviceState] = useState<DeviceState>(initialDeviceState);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<"enable" | "disable" | "test" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [technicalDetail, setTechnicalDetail] = useState<string | null>(null);

  async function refreshState() {
    setLoading(true);

    try {
      const nextState = await getDeviceState();
      setDeviceState(nextState);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshState();
  }, []);

  const activeOnDevice =
    pushPreferenceEnabled &&
    deviceState.permission === "granted" &&
    deviceState.deviceSubscribed &&
    deviceState.configured &&
    Boolean(deviceState.publicKey);
  const iosNeedsHomeScreen = deviceState.isIos && !deviceState.isStandalone;
  const serverConfigured = deviceState.configured && Boolean(deviceState.publicKey);

  async function syncPreference(enabled: boolean) {
    const result = await onPushPreferenceSync(enabled);

    if (!result.ok) {
      throw new Error(result.message ?? "Impossibile aggiornare la preferenza push.");
    }
  }

  async function handleEnable() {
    if (busyAction || disabled) {
      return;
    }

    setBusyAction("enable");
    setMessage("Verifico questo dispositivo...");
    setError(null);
    setTechnicalDetail(formatTechnicalDetail("click ricevuto"));

    try {
      if (typeof window === "undefined") {
        setError("Questo dispositivo non supporta le notifiche push.");
        setTechnicalDetail(formatTechnicalDetail("window-check"));
        return;
      }

      setTechnicalDetail(formatTechnicalDetail("controllo supporto"));
      const nextState = await getDeviceState();
      setDeviceState(nextState);

      if (!nextState.notificationSupported) {
        setError("Questo dispositivo non supporta le notifiche push.");
        setTechnicalDetail(formatTechnicalDetail("notification-support"));
        return;
      }

      if (!nextState.serviceWorkerSupported) {
        setError("Questo dispositivo non supporta le notifiche push.");
        setTechnicalDetail(formatTechnicalDetail("service-worker-support"));
        return;
      }

      if (!nextState.pushManagerSupported) {
        setError("Questo dispositivo non supporta le notifiche push.");
        setTechnicalDetail(formatTechnicalDetail("push-manager-support"));
        return;
      }

      if (nextState.isIos && !nextState.isStandalone) {
        setError(
          "Su iPhone aggiungi l’app alla schermata Home, poi riaprila da lì per attivare le notifiche.",
        );
        setTechnicalDetail(formatTechnicalDetail("ios-home-screen"));
        return;
      }

      if (!nextState.configured) {
        setError("Le notifiche non sono ancora configurate sul server.");
        setTechnicalDetail(
          nextState.statusError
            ? process.env.NODE_ENV === "production"
              ? null
              : `fase: push-status (${nextState.statusError})`
            : formatTechnicalDetail("status-configured"),
        );
        return;
      }

      const publicKey = nextState.publicKey;

      if (!publicKey) {
        setError("Manca la chiave pubblica per attivare le notifiche.");
        setTechnicalDetail(formatTechnicalDetail("public-key-missing"));
        return;
      }

      setMessage("Attivazione in corso...");
      let applicationServerKey: ArrayBuffer;

      try {
        applicationServerKey = urlBase64ToArrayBuffer(publicKey);
      } catch (conversionError) {
        setError("La chiave pubblica delle notifiche non e valida.");
        setTechnicalDetail(formatTechnicalDetail("public-key-conversion", conversionError));
        return;
      }

      let registration: ServiceWorkerRegistration;

      try {
        registration = await ensureServiceWorkerRegistration();
      } catch (registrationError) {
        setError("Il dispositivo non riesce a preparare le notifiche. Ricarica la pagina e riprova.");
        setTechnicalDetail(
          formatTechnicalDetail("service-worker-registration", registrationError),
        );
        return;
      }

      let readyRegistration: ServiceWorkerRegistration;

      try {
        readyRegistration = await navigator.serviceWorker.ready;
      } catch (readyError) {
        setError("Il dispositivo non riesce a preparare le notifiche. Ricarica la pagina e riprova.");
        setTechnicalDetail(formatTechnicalDetail("service-worker-ready", readyError));
        return;
      }

      const pushManager = readyRegistration.pushManager ?? registration.pushManager;

      if (!pushManager) {
        setError("Il dispositivo non riesce a preparare le notifiche. Ricarica la pagina e riprova.");
        setTechnicalDetail(formatTechnicalDetail("push-manager-registration"));
        return;
      }

      let subscription = await pushManager.getSubscription();

      if (!subscription) {
        setTechnicalDetail(formatTechnicalDetail("richiesta permesso"));
        const permission = await Notification.requestPermission();

        setDeviceState((current) => ({
          ...current,
          permission,
          deviceSubscribed: permission === "granted" ? current.deviceSubscribed : false,
        }));

        if (permission === "denied") {
          setError(
            "Le notifiche sono bloccate nel browser. Riattivale dalle impostazioni del sito.",
          );
          setTechnicalDetail(formatTechnicalDetail("permission-denied"));
          await refreshState();
          return;
        }

        if (permission !== "granted") {
          setError("Le notifiche sono bloccate nel browser. Riattivale dalle impostazioni del sito.");
          setTechnicalDetail(formatTechnicalDetail("permission-default"));
          await refreshState();
          return;
        }

        try {
          setTechnicalDetail(formatTechnicalDetail("iscrizione dispositivo"));
          subscription = await pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey,
          });
        } catch (subscribeError) {
          setError("Non sono riuscito ad attivare le notifiche su questo dispositivo.");
          setTechnicalDetail(formatTechnicalDetail("push-subscribe", subscribeError));
          await refreshState();
          return;
        }
      }

      setTechnicalDetail(formatTechnicalDetail("salvataggio server"));
      const subscribeResponse = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(subscription.toJSON()),
      });

      if (!subscribeResponse.ok) {
        const responseMessage = await readResponseMessage(subscribeResponse);
        setError(
          "Il dispositivo ha dato il permesso, ma il server non ha salvato l'attivazione.",
        );
        setTechnicalDetail(
          process.env.NODE_ENV === "production"
            ? null
            : `fase: subscribe-post (status ${subscribeResponse.status}${responseMessage ? `: ${responseMessage}` : ""})`,
        );
        await refreshState();
        return;
      }

      const subscribeData = (await subscribeResponse.json()) as {
        ok: boolean;
        message?: string;
      };

      if (!subscribeData.ok) {
        setError(
          "Il dispositivo ha dato il permesso, ma il server non ha salvato l'attivazione.",
        );
        setTechnicalDetail(
          process.env.NODE_ENV === "production"
            ? null
            : `fase: subscribe-post-body${subscribeData.message ? ` (${subscribeData.message})` : ""}`,
        );
        await refreshState();
        return;
      }

      try {
        await syncPreference(true);
      } catch (syncError) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        }).catch(() => undefined);
        await subscription.unsubscribe().catch(() => false);
        await refreshState();
        setError(
          syncError instanceof Error
            ? syncError.message
            : "Impossibile aggiornare la preferenza push.",
        );
        setTechnicalDetail(formatTechnicalDetail("settings-sync", syncError));
        return;
      }

      await refreshState();
      setMessage("Notifiche attive su questo dispositivo.");
    } catch (error) {
      setError("Non sono riuscito ad attivare le notifiche su questo dispositivo.");
      setTechnicalDetail(formatTechnicalDetail("enable-unknown", error));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleDisable() {
    if (busyAction || disabled) {
      return;
    }

    setBusyAction("disable");
    setMessage("Verifico questo dispositivo...");
    setError(null);
    setTechnicalDetail(formatTechnicalDetail("click ricevuto"));

    try {
      let endpoint = deviceState.currentEndpoint;
      let subscription: PushSubscription | null = null;

      if ("serviceWorker" in navigator) {
        const registration = await ensureServiceWorkerRegistration();
        subscription = await registration.pushManager.getSubscription();
        endpoint = subscription?.endpoint ?? endpoint;
      }

      const response = await fetch("/api/push/subscribe", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(endpoint ? { endpoint } : {}),
      });
      const data = (await response.json()) as { ok: boolean; message?: string };

      if (!response.ok || !data.ok) {
        setError(data.message ?? "Impossibile disattivare le notifiche push.");
        await refreshState();
        return;
      }

      if (subscription) {
        const unsubscribed = await subscription.unsubscribe().catch(() => false);

        if (!unsubscribed) {
          setError("Impossibile disattivare le notifiche push su questo dispositivo.");
          await refreshState();
          return;
        }
      }

      try {
        setMessage("Disattivazione in corso...");
        setTechnicalDetail(formatTechnicalDetail("salvataggio server"));
        await syncPreference(false);
      } catch (syncError) {
        await refreshState();
        setError(
          syncError instanceof Error
            ? syncError.message
            : "Impossibile aggiornare la preferenza push.",
        );
        setTechnicalDetail(formatTechnicalDetail("settings-sync-disable", syncError));
        return;
      }

      await refreshState();
      setMessage("Notifiche disattivate su questo dispositivo.");
    } catch (error) {
      setError("Impossibile disattivare le notifiche push su questo dispositivo.");
      setTechnicalDetail(formatTechnicalDetail("disable-unknown", error));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleTest() {
    if (busyAction || disabled) {
      return;
    }

    setBusyAction("test");
    setMessage(null);
    setError(null);
    setTechnicalDetail(null);

    try {
      const response = await fetch("/api/push/test", {
        method: "POST",
      });
      const data = (await response.json()) as {
        ok: boolean;
        message?: string;
        deliveredCount?: number;
      };

      if (!response.ok || !data.ok) {
        setError(data.message ?? "Impossibile inviare la notifica di prova.");
        return;
      }

      setMessage(
        data.deliveredCount && data.deliveredCount > 1
          ? `Notifica di prova inviata a ${data.deliveredCount} dispositivi attivi.`
          : "Notifica di prova inviata.",
      );
      await refreshState();
    } catch (error) {
      setError("Impossibile inviare la notifica di prova.");
      setTechnicalDetail(formatTechnicalDetail("test-unknown", error));
    } finally {
      setBusyAction(null);
    }
  }

  function handleToggleChange(nextValue: boolean) {
    if (nextValue) {
      void handleEnable();
      return;
    }

    void handleDisable();
  }

  function handlePushToggleClick() {
    if (busyAction || disabled || loading) {
      return;
    }

    handleToggleChange(!activeOnDevice);
  }

  let statusText = "Non attive su questo dispositivo";

  if (loading) {
    statusText = "Verifica disponibilita notifiche...";
  } else if (
    !deviceState.notificationSupported ||
    !deviceState.pushManagerSupported ||
    !deviceState.serviceWorkerSupported
  ) {
    statusText = "Questo dispositivo non supporta le notifiche push.";
  } else if (iosNeedsHomeScreen) {
    statusText =
      "Su iPhone aggiungi l’app alla schermata Home, poi riaprila da lì per attivare le notifiche.";
  } else if (!serverConfigured) {
    statusText = "Le notifiche non sono ancora configurate sul server.";
  } else if (deviceState.permission === "denied") {
    statusText =
      "Le notifiche sono bloccate nel browser. Riattivale dalle impostazioni del sito.";
  } else if (activeOnDevice) {
    statusText = "Attive su questo dispositivo";
  }

  const canSendTest =
    !disabled &&
    !loading &&
    serverConfigured &&
    deviceState.permission === "granted" &&
    deviceState.deviceSubscribed;
  const toggleDisabled = disabled || busyAction !== null || loading;

  return (
    <div className="rounded-[20px] border border-white/10 bg-white/[0.03] px-4 py-4 transition hover:border-white/14 hover:bg-white/[0.045]">
      <div className="flex items-center justify-between gap-4">
        <span className="min-w-0">
          <span className="block text-sm font-medium text-[var(--app-text)]">
            Notifiche push
          </span>
          <span className="mt-1 block text-sm text-[var(--app-muted)]">
            Attiva o disattiva le notifiche push su questo dispositivo.
          </span>
        </span>
        <ToggleControl
          checked={activeOnDevice}
          disabled={toggleDisabled}
          onClick={handlePushToggleClick}
        />
      </div>

      <div className="mt-3 space-y-2">
        <p className="flex items-center gap-2 text-xs text-[var(--app-muted)]">
          {activeOnDevice ? (
            <span
              aria-hidden="true"
              className="h-2 w-2 rounded-full bg-[var(--app-primary)] shadow-[0_0_0_4px_rgba(208,216,43,0.12)]"
            />
          ) : null}
          <span>{statusText}</span>
        </p>

        {error ? <p className="text-xs text-[#ff8c8c]">{error}</p> : null}
        {message ? <p className="text-xs text-[var(--app-primary)]">{message}</p> : null}
        {technicalDetail ? (
          <p className="text-xs text-[var(--app-muted)]">{technicalDetail}</p>
        ) : null}

        {canSendTest ? (
          <SecondaryButton disabled={busyAction !== null} onClick={handleTest}>
            {busyAction === "test" ? "Invio..." : "Invia notifica di prova"}
          </SecondaryButton>
        ) : null}
      </div>
    </div>
  );
}
