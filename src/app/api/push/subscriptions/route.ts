import { getCurrentUser } from "@/lib/auth/current-user";
import {
  parsePushEndpoint,
  parsePushSubscriptionInput,
} from "@/lib/push/subscription-input";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const responseHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
};

async function getActiveUser() {
  const user = await getCurrentUser();
  return user?.isActive ? user : null;
}

export async function POST(request: Request) {
  const user = await getActiveUser();

  if (!user) {
    return Response.json(
      { error: "UNAUTHORIZED" },
      { status: 401, headers: responseHeaders },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "INVALID_SUBSCRIPTION" },
      { status: 400, headers: responseHeaders },
    );
  }

  const subscription = parsePushSubscriptionInput(body);

  if (!subscription) {
    return Response.json(
      { error: "INVALID_SUBSCRIPTION" },
      { status: 400, headers: responseHeaders },
    );
  }

  const userAgent = request.headers.get("user-agent")?.slice(0, 512) ?? null;
  const admin = createAdminClient();
  const { error } = await admin.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.p256dh,
      auth: subscription.auth,
      user_agent: userAgent,
      is_active: true,
      failure_count: 0,
      last_failure_at: null,
    },
    { onConflict: "endpoint" },
  );

  if (error) {
    return Response.json(
      { error: "SUBSCRIPTION_SAVE_FAILED" },
      { status: 500, headers: responseHeaders },
    );
  }

  return Response.json(
    { success: true },
    { status: 201, headers: responseHeaders },
  );
}

export async function DELETE(request: Request) {
  const user = await getActiveUser();

  if (!user) {
    return Response.json(
      { error: "UNAUTHORIZED" },
      { status: 401, headers: responseHeaders },
    );
  }

  let endpoint: string | null = null;

  try {
    const body = (await request.json()) as { endpoint?: unknown };
    endpoint = parsePushEndpoint(body.endpoint);
  } catch {
    endpoint = null;
  }

  if (!endpoint) {
    return Response.json(
      { error: "INVALID_ENDPOINT" },
      { status: 400, headers: responseHeaders },
    );
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", endpoint);

  if (error) {
    return Response.json(
      { error: "SUBSCRIPTION_DELETE_FAILED" },
      { status: 500, headers: responseHeaders },
    );
  }

  return Response.json(
    { success: true },
    { headers: responseHeaders },
  );
}
