"use client";

import {
  BellOff,
  BellRing,
  CheckCircle2,
  Send,
  Share,
} from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
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

type SubscriptionState = "checking" | "active" | "inactive";
type Operation = "enabling" | "disabling" | "testing" | null;

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

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);

  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

function serializeSubscription(subscription: PushSubscription) {
  const serialized = subscription.toJSON();
  const p256dh = serialized.keys?.p256dh;
  const auth = serialized.keys?.auth;

  if (!p256dh || !auth) {
    throw new Error("PUSH_KEYS_MISSING");
  }

  return { endpoint: subscription.endpoint, p256dh, auth };
}

async function saveSubscription(subscription: PushSubscription) {
  const response = await fetch("/api/push/subscriptions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(serializeSubscription(subscription)),
  });

  if (!response.ok) throw new Error("SUBSCRIPTION_SAVE_FAILED");
}

async function removeSubscription(subscription: PushSubscription) {
  const response = await fetch("/api/push/subscriptions", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  });

  if (!response.ok) throw new Error("SUBSCRIPTION_DELETE_FAILED");
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
  const [subscriptionState, setSubscriptionState] =
    useState<SubscriptionState>("checking");
  const [operation, setOperation] = useState<Operation>(null);
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
  const permissionDenied = currentPermission === "denied";
  const isSubscribed = subscriptionState === "active";
  const isPending = operation !== null;

  useEffect(() => {
    if (!isClientReady || !fullySupported || needsIOSInstallation) {
      return;
    }

    let cancelled = false;

    async function inspectSubscription() {
      try {
        const registration = await registerServiceWorker();
        const subscription = await registration?.pushManager.getSubscription();

        const subscriptionIsActive = Boolean(
          subscription && Notification.permission === "granted",
        );

        if (subscriptionIsActive && subscription) {
          await saveSubscription(subscription);
        }

        if (!cancelled) {
          setSubscriptionState(subscriptionIsActive ? "active" : "inactive");
        }
      } catch (error) {
        console.warn("Não foi possível verificar a subscription Push.", error);
        if (!cancelled) setSubscriptionState("inactive");
      }
    }

    void inspectSubscription();
    return () => {
      cancelled = true;
    };
  }, [fullySupported, isClientReady, needsIOSInstallation]);

  function showCompatibilityMessage() {
    if (needsIOSInstallation) {
      setMessageTone("info");
      setMessage(
        "No iPhone, abra este portal no Safari, toque em Compartilhar e depois em Adicionar à Tela de Início. Abra o ICB Conecta instalado e volte a esta opção.",
      );
      return true;
    }

    if (!fullySupported) {
      setMessageTone("warning");
      setMessage(
        "Este navegador ou dispositivo ainda não oferece todos os recursos necessários para notificações.",
      );
      return true;
    }

    if (permissionDenied) {
      setMessageTone("warning");
      setMessage(
        "As notificações estão bloqueadas. Libere a permissão nas configurações do navegador ou do dispositivo e tente novamente.",
      );
      return true;
    }

    return false;
  }

  async function enableNotifications() {
    if (showCompatibilityMessage()) return;

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

    if (!vapidPublicKey) {
      setMessageTone("danger");
      setMessage("O Web Push ainda não foi configurado neste ambiente.");
      return;
    }

    setOperation("enabling");
    setMessage("");
    let createdSubscription: PushSubscription | null = null;

    try {
      const nextPermission = await Notification.requestPermission();
      setPermission(nextPermission);

      if (nextPermission !== "granted") {
        setMessageTone("warning");
        setMessage(
          "A permissão não foi concedida. Você pode alterar essa escolha nas configurações do navegador.",
        );
        return;
      }

      const registration = await registerServiceWorker();

      if (!registration) throw new Error("SERVICE_WORKER_UNAVAILABLE");

      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
        createdSubscription = subscription;
      }

      await saveSubscription(subscription);
      setSubscriptionState("active");
      setMessageTone("success");
      setMessage("Notificações ativadas neste dispositivo.");
    } catch (error) {
      if (createdSubscription) {
        await createdSubscription.unsubscribe().catch(() => false);
      }
      console.warn("Não foi possível ativar as notificações.", error);
      setSubscriptionState("inactive");
      setMessageTone("danger");
      setMessage(
        "Não foi possível ativar as notificações agora. Tente novamente mais tarde.",
      );
    } finally {
      setOperation(null);
    }
  }

  async function disableNotifications() {
    setOperation("disabling");
    setMessage("");

    try {
      const registration = await registerServiceWorker();
      const subscription = await registration?.pushManager.getSubscription();

      if (subscription) {
        await removeSubscription(subscription);
        await subscription.unsubscribe();
      }

      setSubscriptionState("inactive");
      setMessageTone("success");
      setMessage("Notificações desativadas neste dispositivo.");
    } catch (error) {
      console.warn("Não foi possível desativar as notificações.", error);
      setMessageTone("danger");
      setMessage(
        "Não foi possível desativar as notificações agora. Tente novamente.",
      );
    } finally {
      setOperation(null);
    }
  }

  async function sendTestNotification() {
    setOperation("testing");
    setMessage("");

    try {
      const response = await fetch("/api/push/test", { method: "POST" });

      if (!response.ok) throw new Error("PUSH_TEST_FAILED");

      setMessageTone("success");
      setMessage("Notificação de teste enviada aos seus dispositivos ativos.");
    } catch (error) {
      console.warn("Não foi possível enviar a notificação de teste.", error);
      setMessageTone("danger");
      setMessage("Não foi possível enviar a notificação de teste.");
    } finally {
      setOperation(null);
    }
  }

  const statusText = !capability.checked
    ? "Verificando compatibilidade..."
    : needsIOSInstallation
      ? "No iPhone, instale o app antes de ativar o Push."
      : !fullySupported
        ? "Recurso indisponível neste navegador."
        : subscriptionState === "checking"
          ? "Verificando este dispositivo..."
          : isSubscribed
            ? "Notificações ativas neste dispositivo."
            : currentPermission === "granted"
              ? "Push desativado neste dispositivo."
              : "Este dispositivo é compatível.";

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
            Receba os lembretes semanais do ICB Conecta neste aparelho. Nenhuma
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

      <div className="mt-5 border-t border-app-border pt-5">
        <p className="text-sm text-app-secondary" aria-live="polite">
          {statusText}
        </p>

        <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
          <Button
            type="button"
            variant={isSubscribed ? "ghost" : "secondary"}
            size="compact"
            disabled={
              !capability.checked ||
              isPending ||
              (subscriptionState === "checking" &&
                fullySupported &&
                !needsIOSInstallation)
            }
            onClick={
              isSubscribed ? disableNotifications : enableNotifications
            }
            className="w-full sm:w-auto"
          >
            {isSubscribed ? (
              <BellOff aria-hidden="true" size={18} strokeWidth={1.8} />
            ) : (
              <BellRing aria-hidden="true" size={18} strokeWidth={1.8} />
            )}
            {operation === "enabling"
              ? "Ativando..."
              : operation === "disabling"
                ? "Desativando..."
                : isSubscribed
                  ? "Desativar neste dispositivo"
                  : "Ativar notificações neste dispositivo"}
          </Button>

          {isSubscribed ? (
            <Button
              type="button"
              variant="secondary"
              size="compact"
              disabled={isPending}
              onClick={sendTestNotification}
              className="w-full sm:w-auto"
            >
              {operation === "testing" ? (
                <CheckCircle2 aria-hidden="true" size={18} strokeWidth={1.8} />
              ) : (
                <Send aria-hidden="true" size={18} strokeWidth={1.8} />
              )}
              {operation === "testing" ? "Enviando..." : "Enviar teste"}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
