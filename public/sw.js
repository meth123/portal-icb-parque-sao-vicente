/* ICB Conecta Service Worker: sem cache de páginas ou APIs. */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

function getInternalUrl(value) {
  try {
    const targetUrl = new URL(
      typeof value === "string" ? value : "/portal",
      self.location.origin,
    );

    if (targetUrl.origin === self.location.origin) {
      return targetUrl;
    }
  } catch {
    // Usa o destino seguro abaixo quando o payload contém uma URL inválida.
  }

  return new URL("/portal", self.location.origin);
}

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;

  try {
    payload = event.data.json();
  } catch {
    payload = { body: event.data.text() };
  }

  const notificationData =
    payload && typeof payload === "object" ? payload : { body: payload };

  const title =
    typeof notificationData.title === "string"
      ? notificationData.title
      : "ICB Conecta";
  const body =
    typeof notificationData.body === "string" ? notificationData.body : "";
  const tag =
    typeof notificationData.tag === "string"
      ? notificationData.tag.slice(0, 80)
      : undefined;
  const targetUrl = getInternalUrl(notificationData.url);

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-192x192.png",
      tag,
      renotify: false,
      data: {
        url: `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`,
      },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = getInternalUrl(event.notification.data?.url);

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(async (clientList) => {
        const sameOriginClient = clientList.find((client) => {
          return new URL(client.url).origin === self.location.origin;
        });

        if (sameOriginClient) {
          await sameOriginClient.navigate(targetUrl.href);
          return sameOriginClient.focus();
        }

        return self.clients.openWindow(targetUrl.href);
      }),
  );
});
