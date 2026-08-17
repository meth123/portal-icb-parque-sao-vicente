"use client";

import { Camera, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useState,
} from "react";
import { Alert } from "@/components/ui/alert";
import { Button, buttonClassName } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { UserAvatar } from "@/components/ui/user-avatar";
import { createClient } from "@/lib/supabase/client";
import { classNames } from "@/lib/ui/class-names";

const avatarBucket = "profile-avatars";
const maximumAvatarSize = 2 * 1024 * 1024;
const allowedAvatarTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

type ProfileFormProps = {
  userId: string;
  email: string | null;
  initialFullName: string;
  initialAvatarPath: string | null;
  initialAvatarUrl: string | null;
};

export function ProfileForm({
  userId,
  email,
  initialFullName,
  initialAvatarPath,
  initialAvatarUrl,
}: ProfileFormProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState(initialFullName);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [currentAvatarUrl, setCurrentAvatarUrl] =
    useState(initialAvatarUrl);
  const [currentAvatarPath, setCurrentAvatarPath] =
    useState(initialAvatarPath);
  const [message, setMessage] = useState("");
  const [hasError, setHasError] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function showError(nextMessage: string) {
    setHasError(true);
    setMessage(nextMessage);
  }

  function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      setAvatarFile(null);
      setPreviewUrl(null);
      return;
    }

    if (!allowedAvatarTypes.has(file.type)) {
      event.target.value = "";
      showError("Escolha uma imagem JPEG, PNG ou WebP.");
      return;
    }

    if (file.size > maximumAvatarSize) {
      event.target.value = "";
      showError("A foto deve ter no máximo 2 MB.");
      return;
    }

    setMessage("");
    setAvatarFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedName = fullName.trim().replace(/\s+/g, " ");

    if (normalizedName.length < 2 || normalizedName.length > 120) {
      showError("Informe um nome entre 2 e 120 caracteres.");
      return;
    }

    setPending(true);
    setMessage("");
    const supabase = createClient();
    const avatarPath = `${userId}/avatar`;
    let nextAvatarPath = currentAvatarPath;

    if (avatarFile) {
      const { error: uploadError } = await supabase.storage
        .from(avatarBucket)
        .upload(avatarPath, avatarFile, {
          cacheControl: "3600",
          contentType: avatarFile.type,
          upsert: true,
        });

      if (uploadError) {
        setPending(false);
        showError("Não foi possível enviar a foto. Tente novamente.");
        return;
      }

      nextAvatarPath = avatarPath;
    }

    const { data, error } = await supabase
      .from("profiles")
      .update({
        full_name: normalizedName,
        avatar_path: nextAvatarPath,
      })
      .eq("id", userId)
      .select("full_name, avatar_path")
      .maybeSingle();

    if (error || !data) {
      setPending(false);
      showError("Não foi possível atualizar o perfil. Tente novamente.");
      return;
    }

    setFullName(data.full_name ?? normalizedName);
    setCurrentAvatarPath(data.avatar_path);
    if (data.avatar_path) {
      const { data: signedAvatar } = await supabase.storage
        .from(avatarBucket)
        .createSignedUrl(data.avatar_path, 300);
      setCurrentAvatarUrl(signedAvatar?.signedUrl ?? null);
    }
    setAvatarFile(null);
    setPreviewUrl(null);
    setHasError(false);
    setMessage("Perfil atualizado.");
    setPending(false);
    router.refresh();
  }

  async function removeAvatar() {
    if (!currentAvatarPath) {
      return;
    }

    setPending(true);
    setMessage("");
    const supabase = createClient();
    const { data, error: profileError } = await supabase
      .from("profiles")
      .update({ avatar_path: null })
      .eq("id", userId)
      .select("id")
      .maybeSingle();

    if (profileError || !data) {
      setPending(false);
      showError("Não foi possível remover a foto. Tente novamente.");
      return;
    }

    await supabase.storage.from(avatarBucket).remove([currentAvatarPath]);
    setCurrentAvatarPath(null);
    setCurrentAvatarUrl(null);
    setAvatarFile(null);
    setPreviewUrl(null);
    setHasError(false);
    setMessage("Foto removida.");
    setPending(false);
    router.refresh();
  }

  const visibleAvatarUrl = previewUrl ?? currentAvatarUrl;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {message ? (
        <Alert
          tone={hasError ? "danger" : "success"}
          aria-live="polite"
        >
          {message}
        </Alert>
      ) : null}

      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <UserAvatar
          name={fullName || "Usuário"}
          src={visibleAvatarUrl}
          size="xlarge"
        />

        <div className="w-full min-w-0 text-center sm:text-left">
          <p className="font-semibold text-app-foreground">Foto do perfil</p>
          <p id="avatar-hint" className="mt-1 text-sm text-app-secondary">
            JPEG, PNG ou WebP, com no máximo 2 MB.
          </p>
          <input
            id="avatar"
            name="avatar"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={pending}
            aria-describedby="avatar-hint"
            onChange={handleAvatarChange}
            className="sr-only"
          />
          <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
            <label
              htmlFor="avatar"
              aria-disabled={pending}
              className={classNames(
                buttonClassName({ variant: "secondary", size: "compact" }),
                pending && "pointer-events-none opacity-50",
              )}
            >
              <Camera aria-hidden="true" size={18} strokeWidth={1.8} />
              Escolher foto
            </label>
            {currentAvatarPath ? (
              <Button
                type="button"
                variant="ghost"
                size="compact"
                disabled={pending}
                onClick={removeAvatar}
                className="text-danger hover:bg-danger-soft"
              >
                <Trash2 aria-hidden="true" size={18} strokeWidth={1.8} />
                Remover
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <FormField
        id="fullName"
        label="Nome completo"
        required
        hint="Este é o nome exibido para você e para lideranças autorizadas."
      >
        <input
          id="fullName"
          name="fullName"
          type="text"
          minLength={2}
          maxLength={120}
          required
          disabled={pending}
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          autoComplete="name"
          aria-describedby="fullName-hint"
          className="min-h-12 w-full rounded-xl border border-app-border bg-surface px-4 text-base text-app-foreground outline-none transition-colors placeholder:text-app-secondary focus:border-theme-primary focus:ring-2 focus:ring-theme-primary-soft disabled:cursor-wait disabled:bg-surface-muted"
        />
      </FormField>

      {email ? (
        <FormField id="profileEmail" label="E-mail">
          <input
            id="profileEmail"
            type="email"
            value={email}
            readOnly
            aria-readonly="true"
            className="min-h-12 break-all rounded-xl border border-app-border bg-surface-muted px-4 py-3 text-app-secondary"
          />
        </FormField>
      ) : null}

      <div className="flex justify-end border-t border-app-border pt-6">
        <Button
          type="submit"
          disabled={pending}
          className="w-full sm:w-auto"
        >
          <Save aria-hidden="true" size={19} strokeWidth={1.8} />
          {pending ? "Salvando..." : "Salvar perfil"}
        </Button>
      </div>
    </form>
  );
}
