export type PushSubscriptionInput = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

const base64UrlPattern = /^[A-Za-z0-9_-]+$/;

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function parsePushEndpoint(value: unknown) {
  const endpoint = readString(value);

  if (!endpoint || endpoint.length > 4096) return null;

  try {
    const parsed = new URL(endpoint);
    return parsed.protocol === "https:" ? parsed.href : null;
  } catch {
    return null;
  }
}

export function parsePushSubscriptionInput(
  value: unknown,
): PushSubscriptionInput | null {
  if (!value || typeof value !== "object") return null;

  const input = value as Record<string, unknown>;
  const endpoint = parsePushEndpoint(input.endpoint);
  const p256dh = readString(input.p256dh);
  const auth = readString(input.auth);

  if (
    !endpoint ||
    p256dh.length > 512 ||
    auth.length > 512 ||
    !base64UrlPattern.test(p256dh) ||
    !base64UrlPattern.test(auth)
  ) {
    return null;
  }

  return { endpoint, p256dh, auth };
}
