import "server-only";

import webpush from "web-push";
import { prisma } from "@/lib/prisma";
import { revokeUserPushSubscription } from "./push-subscriptions";

export type PushNotificationPayload = {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  badge?: string;
};

type PushConfigResult =
  | { ok: true; publicKey: string; privateKey: string; subject: string }
  | { ok: false; message: string };

type SendPushResult =
  | { ok: true; deliveredCount: number; failedCount: number }
  | { ok: false; message: string };

function getPushConfig(): PushConfigResult {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim();

  if (!publicKey || !privateKey || !subject) {
    return {
      ok: false,
      message: "Le chiavi push non sono configurate sul server.",
    };
  }

  return {
    ok: true,
    publicKey,
    privateKey,
    subject,
  };
}

export function getPushStatus() {
  const config = getPushConfig();

  return {
    configured: config.ok,
    publicKey: config.ok ? config.publicKey : null,
  };
}

function validatePayload(payload: PushNotificationPayload) {
  if (!payload.title.trim() || !payload.body.trim()) {
    return { ok: false as const, message: "Payload push non valido." };
  }

  if (payload.url && !payload.url.startsWith("/")) {
    return { ok: false as const, message: "URL push non valido." };
  }

  return { ok: true as const };
}

function configureWebPush() {
  const config = getPushConfig();

  if (!config.ok) {
    return config;
  }

  webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);

  return config;
}

export async function sendPushToUser(
  userId: number,
  payload: PushNotificationPayload,
): Promise<SendPushResult> {
  const payloadValidation = validatePayload(payload);

  if (!payloadValidation.ok) {
    return payloadValidation;
  }

  const config = configureWebPush();

  if (!config.ok) {
    return config;
  }

  const subscriptions = await prisma.userPushSubscription.findMany({
    where: {
      userId,
      revokedAt: null,
    },
    select: {
      endpoint: true,
      p256dh: true,
      auth: true,
    },
  });

  if (subscriptions.length === 0) {
    return {
      ok: false,
      message: "Nessun dispositivo attivo per le notifiche push.",
    };
  }

  let deliveredCount = 0;
  let failedCount = 0;
  const body = JSON.stringify({
    title: payload.title.trim(),
    body: payload.body.trim(),
    url: payload.url ?? "/dashboard",
    icon: payload.icon ?? "/icon",
    badge: payload.badge ?? "/icon",
  });

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          body,
        );
        deliveredCount += 1;
      } catch (error) {
        failedCount += 1;

        const statusCode =
          typeof error === "object" &&
          error !== null &&
          "statusCode" in error &&
          typeof error.statusCode === "number"
            ? error.statusCode
            : null;

        if (statusCode === 404 || statusCode === 410) {
          await revokeUserPushSubscription(userId, subscription.endpoint);
          return;
        }

        console.error("PUSH_SEND_ERROR", error);
      }
    }),
  );

  if (deliveredCount === 0) {
    return {
      ok: false,
      message: failedCount
        ? "Impossibile inviare la notifica di prova ai dispositivi attivi."
        : "Nessun dispositivo attivo per le notifiche push.",
    };
  }

  return {
    ok: true,
    deliveredCount,
    failedCount,
  };
}
