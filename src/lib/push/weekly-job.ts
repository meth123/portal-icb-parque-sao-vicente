import "server-only";

import { getSaoPauloDate } from "@/lib/dates/sao-paulo";
import { getWeeklyPushEvent } from "@/lib/push/events";
import { getWebPushConfig } from "@/lib/push/config";
import {
  deliverPushMessage,
  getActivePushSubscriptions,
} from "@/lib/push/delivery";
import { createAdminClient } from "@/lib/supabase/admin";

export type WeeklyPushJobResult =
  | { status: "no_event"; date: string }
  | { status: "already_processed"; eventKey: string }
  | {
      status: "completed";
      eventKey: string;
      subscriptions: number;
      sent: number;
      failed: number;
      invalid: number;
    };

export function isDuplicatePushEventReservation(error: { code?: string } | null) {
  return error?.code === "23505";
}

export async function runWeeklyPushJob(
  date = new Date(),
): Promise<WeeklyPushJobResult> {
  const event = getWeeklyPushEvent(date);

  if (!event) {
    return { status: "no_event", date: getSaoPauloDate(date) };
  }

  getWebPushConfig();
  const admin = createAdminClient();
  const subscriptions = await getActivePushSubscriptions(admin);
  const { error: reservationError } = await admin
    .from("push_notification_events")
    .insert({
      event_key: event.key,
      event_type: event.type,
      event_date: event.date,
      week_ends_on: event.weekEndsOn,
      title: event.title,
      message: event.message,
      destination: event.destination,
      status: "processing",
    });

  if (isDuplicatePushEventReservation(reservationError)) {
    return { status: "already_processed", eventKey: event.key };
  }

  if (reservationError) {
    throw new Error("PUSH_EVENT_RESERVATION_FAILED");
  }

  try {
    const delivery = await deliverPushMessage(admin, subscriptions, {
      title: event.title,
      message: event.message,
      destination: event.destination,
      tag: event.key,
    });
    const lastError = delivery.errors.length
      ? delivery.errors.slice(0, 5).join(" ").slice(0, 2_000)
      : null;
    const { error: completionError } = await admin
      .from("push_notification_events")
      .update({
        status: "completed",
        sent_count: delivery.sent,
        failed_count: delivery.failed,
        invalid_count: delivery.invalid,
        last_error: lastError,
        completed_at: new Date().toISOString(),
      })
      .eq("event_key", event.key);

    if (completionError) {
      throw new Error("PUSH_EVENT_COMPLETION_FAILED");
    }

    return {
      status: "completed",
      eventKey: event.key,
      subscriptions: subscriptions.length,
      sent: delivery.sent,
      failed: delivery.failed,
      invalid: delivery.invalid,
    };
  } catch (error) {
    await admin
      .from("push_notification_events")
      .update({
        status: "failed",
        last_error:
          error instanceof Error
            ? error.message.slice(0, 2_000)
            : "Falha inesperada no processamento do evento.",
        completed_at: new Date().toISOString(),
      })
      .eq("event_key", event.key);
    throw error;
  }
}
