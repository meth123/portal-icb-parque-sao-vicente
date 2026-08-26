const serviceWorkerPath = "/sw.js";

export function canRegisterServiceWorker() {
  return (
    typeof window !== "undefined" &&
    window.isSecureContext &&
    "serviceWorker" in navigator
  );
}

export async function registerServiceWorker() {
  if (!canRegisterServiceWorker()) {
    return null;
  }

  return navigator.serviceWorker.register(serviceWorkerPath, {
    scope: "/",
    updateViaCache: "none",
  });
}
