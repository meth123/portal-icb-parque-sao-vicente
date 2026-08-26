"use client";

import { BellRing, CheckCircle2, Share } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { registerServiceWorker } from "@/lib/pwa/register-service-worker";

type Capability = {
  checked: boolean;
  isIOS: boolean;
  isStandalone: boolean;
  isSecure: boolean;
  notifications: boolean;
  push: boolean;
  serviceWorker: boolean;
};

const initialCapability: Capability = {
  checked: false,
  isIOS: false,
  isStandalone: false,
  isSecure: false,
  notifications: false,
  push: false,
  serviceWorker: false,
};

function detectIOS() {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function detectStandalone() {
  const navigatorWithStandalone = navigator as Navigator & {
    standalone?: boolean;
  };

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    navigatorWithStandalone.standalone === true
  );
}

function subscribeToClientReady() {
  return () => undefined;
}

function detectCapability(): Capability {
  const notifications = "Notification" in window;

  return {
    checked: true,
    isIOS: detectIOS(),
    isStandalone: detectStandalone(),
    isSecure: window.isSecureContext,
    notifications,
    push: "PushManager" in window,
    serviceWorker: "serviceWorker" in navigator,
  };
}

export function NotificationSettings() {
  const isClientReady = useSyncExternalStore(
    subscribeToClientReady,
    () => true,
    () => false,
  );
  const capability = isClientReady ? detectCapability() : initialCapability;
  const [permission, setPermission] = useState<NotificationPermission | null>(
    null,
  );
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<
    "info" | "success" | "warning" | "danger"
  >("info");

  const currentPermission =
    permission ??
    (capability.checked && capability.notifications
      ? Notification.permission
      : null);

  const fullySupported =
    capability.isSecure &&
    capability.notifications &&
    capability.push &&
    capability.serviceWorker;
  const needsIOSInstallation = capability.isIOS && !capability.isStandalone;
  const permissionGranted = currentPermission === "granted";
  const permissionDenied = currentPermission === "denied";

  async function enableNotifications() {
    if (needsIOSInstallation) {
      setMessageTone("info");
      setMessage(
        "No iPhone, abra este portal no Safari, toque em Compartilhar e depois em Adicionar à Tela de Início. Abra o ICB Conecta instalado e volte a esta opção.",
      );
      return;
    }

    if (!fullySupported) {
      setMessageTone("warning");
      setMessage(
        "Este navegador ou dispositivo ainda não oferece todos os recursos necessários para notificações.",
      );
      return;
    }

    if (permissionDenied) {
      setMessageTone("warning");
      setMessage(
        "As notificações estão bloqueadas. Libere a permissão nas configurações do navegador ou do dispositivo e tente novamente.",
      );
      return;
    }

    setPending(true);
    setMessage("");

    try {
      const nextPermission = await Notification.requestPermission();
      setPermission(nextPermission);

      if (nextPermission === "granted") {
        await registerServiceWorker();
        setMessageTone("success");
        setMessage(
          "Permissão concedida neste dispositivo. O recebimento será habilitado quando o envio de notificações for integrado.",
        );
      } else {
        setMessageTone("warning");
        setMessage(
          "A permissão não foi concedida. Você pode alterar essa escolha nas configurações do navegador.",
        );
      }
    } catch (error) {
      console.warn("Não foi possível preparar as notificações.", error);
      setMessageTone("danger");
      setMessage(
        "Não foi possível preparar as notificações agora. Tente novamente mais tarde.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 rounded-xl bg-theme-primary-soft p-2.5 text-theme-primary">
          <BellRing aria-hidden="true" size={21} strokeWidth={1.8} />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-app-foreground">
            Notificações
          </h2>
          <p className="mt-1 text-sm leading-6 text-app-secondary">
            Prepare este aparelho para receber avisos do ICB Conecta. Nenhuma
            permissão será solicitada sem o seu toque no botão abaixo.
          </p>
        </div>
      </div>

      {message ? (
        <Alert tone={messageTone} aria-live="polite" className="mt-5">
          {needsIOSInstallation ? (
            <Share
              aria-hidden="true"
              className="mr-2 inline-block align-text-bottom"
              size={17}
            />
          ) : null}
          {message}
        </Alert>
      ) : null}

      <div className="mt-5 flex flex-col gap-3 border-t border-app-border pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-app-secondary" aria-live="polite">
          {!capability.checked
            ? "Verificando compatibilidade..."
            : permissionGranted
              ? "Permissão concedida neste dispositivo."
              : needsIOSInstallation
                ? "No iPhone, instale o app antes de ativar o Push."
                : fullySupported
                  ? "Este dispositivo é compatível."
                  : "Recurso indisponível neste navegador."}
        </p>

        <Button
          type="button"
          variant="secondary"
          size="compact"
          disabled={!capability.checked || pending || permissionGranted}
          onClick={enableNotifications}
          className="w-full shrink-0 sm:w-auto"
        >
          {permissionGranted ? (
            <CheckCircle2 aria-hidden="true" size={18} strokeWidth={1.8} />
          ) : (
            <BellRing aria-hidden="true" size={18} strokeWidth={1.8} />
          )}
          {pending
            ? "Ativando..."
            : permissionGranted
              ? "Notificações permitidas"
              : "Ativar notificações neste dispositivo"}
        </Button>
      </div>
    </div>
  );
}
