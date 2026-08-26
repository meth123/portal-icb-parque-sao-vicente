import "server-only";

import { createHash } from "node:crypto";
import webPush from "web-push";
import { getWebPushConfig } from "@/lib/push/config";

export type StoredPushSubscription = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  failure_count: number;
};

export type PushMessage = {
  title: string;
  message: string;
  destination: string;
  tag: string;
};

export type PushSendResult =
  | { status: "sent" }
  | { status: "invalid"; statusCode: number }
  | { status: "failed"; error: string; statusCode: number | null };

export function createPushTopic(value: string) {
  return createHash("sha256").update(value).digest("base64url").slice(0, 32);
}

export async function sendWebPush(
  subscription: StoredPushSubscription,
  message: PushMessage,
): Promise<PushSendResult> {
  const vapid = getWebPushConfig();

  try {
    await webPush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      },
      JSON.stringify({
        title: message.title,
        body: message.message,
        url: message.destination,
        tag: message.tag,
      }),
      {
        TTL: 86_400,
        urgency: "normal",
        topic: createPushTopic(message.tag),
        vapidDetails: {
          subject: vapid.subject,
          publicKey: vapid.publicKey,
          privateKey: vapid.privateKey,
        },
      },
    );

    return { status: "sent" };
  } catch (error) {
    const statusCode =
      error && typeof error === "object" && "statusCode" in error
        ? Number(error.statusCode)
        : null;

    if (statusCode === 404 || statusCode === 410) {
      return { status: "invalid", statusCode };
    }

    return {
      status: "failed",
      statusCode: Number.isFinite(statusCode) ? statusCode : null,
      error: statusCode
        ? `Push service respondeu com status ${statusCode}.`
        : "Falha ao enviar a notificação ao push service.",
    };
  }
}
