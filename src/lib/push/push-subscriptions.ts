import "server-only";

import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export type PushSubscriptionInput = {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
};

export type PushSubscriptionMetadata = {
  userAgent?: string | null;
  platform?: string | null;
};

type ValidationResult =
  | { ok: true; value: PushSubscriptionInput }
  | { ok: false; message: string };

type RevokeResult =
  | { ok: true; revokedCount: number }
  | { ok: false; message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeText(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function hashPushEndpoint(endpoint: string) {
  return crypto.createHash("sha256").update(endpoint).digest("hex");
}

export function validatePushSubscription(input: unknown): ValidationResult {
  if (!isRecord(input)) {
    return { ok: false, message: "Subscription push non valida." };
  }

  const endpoint = normalizeText(
    typeof input.endpoint === "string" ? input.endpoint : null,
  );

  if (!endpoint) {
    return { ok: false, message: "Endpoint push mancante." };
  }

  try {
    const parsed = new URL(endpoint);

    if (parsed.protocol !== "https:") {
      return { ok: false, message: "Endpoint push non valido." };
    }
  } catch {
    return { ok: false, message: "Endpoint push non valido." };
  }

  if (!isRecord(input.keys)) {
    return { ok: false, message: "Chiavi push mancanti." };
  }

  const p256dh = normalizeText(
    typeof input.keys.p256dh === "string" ? input.keys.p256dh : null,
  );
  const auth = normalizeText(
    typeof input.keys.auth === "string" ? input.keys.auth : null,
  );

  if (!p256dh || !auth) {
    return { ok: false, message: "Chiavi push non valide." };
  }

  return {
    ok: true,
    value: {
      endpoint,
      expirationTime:
        typeof input.expirationTime === "number" ? input.expirationTime : null,
      keys: {
        p256dh,
        auth,
      },
    },
  };
}

export async function saveUserPushSubscription(
  userId: number,
  subscription: unknown,
  metadata: PushSubscriptionMetadata = {},
) {
  const validation = validatePushSubscription(subscription);

  if (!validation.ok) {
    return validation;
  }

  const endpointHash = hashPushEndpoint(validation.value.endpoint);
  const now = new Date();

  await prisma.userPushSubscription.upsert({
    where: { endpointHash },
    update: {
      userId,
      endpoint: validation.value.endpoint,
      p256dh: validation.value.keys.p256dh,
      auth: validation.value.keys.auth,
      userAgent: normalizeText(metadata.userAgent),
      platform: normalizeText(metadata.platform),
      revokedAt: null,
      lastSeenAt: now,
    },
    create: {
      userId,
      endpoint: validation.value.endpoint,
      endpointHash,
      p256dh: validation.value.keys.p256dh,
      auth: validation.value.keys.auth,
      userAgent: normalizeText(metadata.userAgent),
      platform: normalizeText(metadata.platform),
      revokedAt: null,
      lastSeenAt: now,
    },
  });

  return { ok: true as const };
}

export async function revokeUserPushSubscription(
  userId: number,
  endpoint?: string | null,
): Promise<RevokeResult> {
  const normalizedEndpoint = normalizeText(endpoint);
  const where = normalizedEndpoint
    ? {
        userId,
        endpointHash: hashPushEndpoint(normalizedEndpoint),
        revokedAt: null,
      }
    : {
        userId,
        revokedAt: null,
      };

  const result = await prisma.userPushSubscription.updateMany({
    where,
    data: {
      revokedAt: new Date(),
    },
  });

  return {
    ok: true,
    revokedCount: result.count,
  };
}
