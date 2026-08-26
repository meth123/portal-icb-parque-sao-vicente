"use client";

import { useEffect } from "react";
import { registerServiceWorker } from "@/lib/pwa/register-service-worker";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    function register() {
      void registerServiceWorker().catch((error: unknown) => {
        console.warn("Não foi possível registrar o Service Worker.", error);
      });
    }

    if (document.readyState === "complete") {
      register();
      return;
    }

    window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
