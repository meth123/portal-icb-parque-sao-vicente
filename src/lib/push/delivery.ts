import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  sendWebPush,
  type PushMessage,
  type StoredPushSubscription,
} from "@/lib/push/sender";

export type PushDeliverySummary = {
  sent: number;
  failed: number;
  invalid: number;
  errors: string[];
};

export async function getActivePushSubscriptions(
  admin: SupabaseClient,
  userId?: string,
) {
  let query = admin
    .from("push_subscriptions")
    .select(
      "id, user_id, endpoint, p256dh, auth, failure_count, profiles!inner(is_active)",
    )
    .eq("is_active", true)
    .eq("profiles.is_active", true);

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error("PUSH_SUBSCRIPTIONS_READ_FAILED");
  }

  return (data ?? []) as unknown as StoredPushSubscription[];
}

async function updateSubscriptionAfterDelivery(
  admin: SupabaseClient,
  subscription: StoredPushSubscription,
  result: Awaited<ReturnType<typeof sendWebPush>>,
) {
  const deliveredAt = new Date().toISOString();
  const values =
    result.status === "sent"
      ? {
          failure_count: 0,
          last_failure_at: null,
          last_success_at: deliveredAt,
        }
      : {
          failure_count: subscription.failure_count + 1,
          is_active: result.status === "invalid" ? false : true,
          last_failure_at: deliveredAt,
        };

  const { error } = await admin
    .from("push_subscriptions")
    .update(values)
    .eq("id", subscription.id);

  return error ? "Não foi possível atualizar o estado de uma subscription." : null;
}

export async function deliverPushMessage(
  admin: SupabaseClient,
  subscriptions: StoredPushSubscription[],
  message: PushMessage,
): Promise<PushDeliverySummary> {
  const summary: PushDeliverySummary = {
    sent: 0,
    failed: 0,
    invalid: 0,
    errors: [],
  };
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < subscriptions.length) {
      const subscription = subscriptions[nextIndex];
      nextIndex += 1;

      const result = await sendWebPush(subscription, message);

      if (result.status === "sent") summary.sent += 1;
      if (result.status === "failed") {
        summary.failed += 1;
        summary.errors.push(result.error);
      }
      if (result.status === "invalid") summary.invalid += 1;

      const updateError = await updateSubscriptionAfterDelivery(
        admin,
        subscription,
        result,
      );

      if (updateError) summary.errors.push(updateError);
    }
  }

  const workerCount = Math.min(10, subscriptions.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  return summary;
}
