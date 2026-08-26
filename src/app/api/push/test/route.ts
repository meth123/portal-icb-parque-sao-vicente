import { getCurrentUser } from "@/lib/auth/current-user";
import {
  deliverPushMessage,
  getActivePushSubscriptions,
} from "@/lib/push/delivery";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const responseHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
};

export async function POST() {
  const user = await getCurrentUser();

  if (!user?.isActive) {
    return Response.json(
      { error: "UNAUTHORIZED" },
      { status: 401, headers: responseHeaders },
    );
  }

  const admin = createAdminClient();
  const subscriptions = await getActivePushSubscriptions(admin, user.id);

  if (subscriptions.length === 0) {
    return Response.json(
      { error: "NO_ACTIVE_SUBSCRIPTION" },
      { status: 409, headers: responseHeaders },
    );
  }

  const delivery = await deliverPushMessage(admin, subscriptions, {
    title: "🔔 Notificação de teste",
    message: "O Web Push do ICB Conecta está funcionando neste dispositivo.",
    destination: "/portal",
    tag: `manual-test:${user.id}`,
  });

  return Response.json(
    {
      success: delivery.sent > 0,
      subscriptions: subscriptions.length,
      sent: delivery.sent,
      failed: delivery.failed,
      invalid: delivery.invalid,
    },
    {
      status: delivery.sent > 0 ? 200 : 502,
      headers: responseHeaders,
    },
  );
}
