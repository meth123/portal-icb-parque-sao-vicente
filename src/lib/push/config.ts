import "server-only";

export type WebPushConfig = {
  publicKey: string;
  privateKey: string;
  subject: string;
};

const vapidKeyPattern = /^[A-Za-z0-9_-]+$/;

export function getWebPushConfig(): WebPushConfig {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() ?? "";
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim() ?? "";
  const subject = process.env.VAPID_SUBJECT?.trim() ?? "";

  if (
    !vapidKeyPattern.test(publicKey) ||
    !vapidKeyPattern.test(privateKey) ||
    (!subject.startsWith("mailto:") && !subject.startsWith("https://"))
  ) {
    throw new Error("WEB_PUSH_NOT_CONFIGURED");
  }

  return { publicKey, privateKey, subject };
}
