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
  permission: NotificationPermission | "unsupported";
  isIos: boolean;
  isStandalone: boolean;
  configured: boolean;
  publicKey: string | null;
  deviceSubscribed: boolean;
  currentEndpoint: string | null;
  activeSubscriptions: number;
};

const initialDeviceState: DeviceState = {
  supported: false,
  permission: "unsupported",
  isIos: false,
  isStandalone: false,
  configured: false,
  publicKey: null,
  deviceSubscribed: false,
  currentEndpoint: null,
  activeSubscriptions: 0,
};

function isIosDevice(userAgent: string) {
  return /iPad|iPhone|iPod/.test(userAgent);
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

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);

  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

async function ensureServiceWorkerRegistration() {
  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  return registration;
}

async function getDeviceState(): Promise<DeviceState> {
  const isIos =
    typeof navigator !== "undefined" ? isIosDevice(navigator.userAgent) : false;
  const isStandalone = isStandaloneDisplayMode();

  if (
    typeof window === "undefined" ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !("Notification" in window)
  ) {
    return {
      ...initialDeviceState,
      supported: false,
      permission: "unsupported",
      isIos,
      isStandalone,
    };
  }

  let configured = false;
  let publicKey: string | null = null;
  let activeSubscriptions = 0;

  try {
    const response = await fetch("/api/push/status", { cache: "no-store" });
    const data = (await response.json()) as PushStatusResponse;

    if (response.ok && data.ok) {
      configured = data.configured;
      publicKey = data.publicKey;
      activeSubscriptions = data.activeSubscriptions;
    }
  } catch {
    return {
      supported: true,
      permission: Notification.permission,
      isIos,
      isStandalone,
      configured: false,
      publicKey: null,
      deviceSubscribed: false,
      currentEndpoint: null,
      activeSubscriptions: 0,
    };
  }

  const registration = await ensureServiceWorkerRegistration();
  const subscription = await registration.pushManager.getSubscription();

  return {
    supported: true,
    permission: Notification.permission,
    isIos,
    isStandalone,
    configured,
    publicKey,
    deviceSubscribed: Boolean(subscription),
    currentEndpoint: subscription?.endpoint ?? null,
    activeSubscriptions,
  };
}

function ToggleControl({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <span className="relative inline-flex h-7 w-12 shrink-0 items-center">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.currentTarget.checked)}
        className="peer sr-only"
      />
      <span className="absolute inset-0 rounded-full border border-white/10 bg-white/8 transition peer-checked:border-[var(--app-primary-border)] peer-checked:bg-[rgba(208,216,43,0.22)] peer-disabled:opacity-50" />
      <span className="absolute left-1 h-5 w-5 rounded-full bg-white shadow-[0_4px_12px_rgba(0,0,0,0.3)] transition peer-checked:translate-x-5 peer-checked:bg-[var(--app-primary)]" />
    </span>
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
    setMessage(null);
    setError(null);

    try {
      const nextState = await getDeviceState();
      setDeviceState(nextState);

      if (!nextState.supported) {
        setError("Questo dispositivo non supporta le notifiche push.");
        return;
      }

      if (nextState.isIos && !nextState.isStandalone) {
        return;
      }

      if (!nextState.configured || !nextState.publicKey) {
        setError("Le notifiche non sono ancora configurate sul server.");
        return;
      }

      const registration = await ensureServiceWorkerRegistration();
      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        setDeviceState((current) => ({
          ...current,
          permission,
          deviceSubscribed: permission === "denied" ? false : current.deviceSubscribed,
        }));

        if (permission === "denied") {
          if (pushPreferenceEnabled) {
            try {
              await syncPreference(false);
            } catch (syncError) {
              setError(
                syncError instanceof Error
                  ? syncError.message
                  : "Impossibile aggiornare la preferenza push.",
              );
              return;
            }
          }

          setError(
            "Le notifiche sono bloccate nel browser. Riattivale dalle impostazioni del sito.",
          );
          await refreshState();
          return;
        }

        setError("Concedi il permesso notifiche per attivarle su questo dispositivo.");
        await refreshState();
        return;
      }

      const existingSubscription = await registration.pushManager.getSubscription();
      const subscription =
        existingSubscription ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(nextState.publicKey),
        }));

      const subscribeResponse = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(subscription.toJSON()),
      });
      const subscribeData = (await subscribeResponse.json()) as {
        ok: boolean;
        message?: string;
      };

      if (!subscribeResponse.ok || !subscribeData.ok) {
        setError(subscribeData.message ?? "Impossibile attivare le notifiche push.");
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
        return;
      }

      await refreshState();
      setMessage("Notifiche attive su questo dispositivo.");
    } catch {
      setError("Impossibile attivare le notifiche push su questo dispositivo.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleDisable() {
    if (busyAction || disabled) {
      return;
    }

    setBusyAction("disable");
    setMessage(null);
    setError(null);

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
        await syncPreference(false);
      } catch (syncError) {
        await refreshState();
        setError(
          syncError instanceof Error
            ? syncError.message
            : "Impossibile aggiornare la preferenza push.",
        );
        return;
      }

      await refreshState();
      setMessage("Notifiche disattivate su questo dispositivo.");
    } catch {
      setError("Impossibile disattivare le notifiche push su questo dispositivo.");
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
    } catch {
      setError("Impossibile inviare la notifica di prova.");
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

  let statusText = "Non attive su questo dispositivo";

  if (loading) {
    statusText = "Verifica disponibilita notifiche...";
  } else if (!deviceState.supported) {
    statusText = "Questo dispositivo non supporta le notifiche push.";
  } else if (iosNeedsHomeScreen) {
    statusText =
      "Su iPhone aggiungi l'app alla schermata Home, poi riaprila da li per attivare le notifiche.";
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
  const toggleDisabled =
    disabled ||
    busyAction !== null ||
    loading ||
    (!activeOnDevice &&
      (!deviceState.supported ||
        iosNeedsHomeScreen ||
        !serverConfigured ||
        deviceState.permission === "denied"));

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
          onChange={handleToggleChange}
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

        {canSendTest ? (
          <SecondaryButton disabled={busyAction !== null} onClick={handleTest}>
            {busyAction === "test" ? "Invio..." : "Invia notifica di prova"}
          </SecondaryButton>
        ) : null}
      </div>
    </div>
  );
}
