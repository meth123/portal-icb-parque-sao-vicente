"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";

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
    <form onSubmit={handleSubmit} className="mt-8 space-y-6">
      {message ? (
        <p
          role={hasError ? "alert" : "status"}
          aria-live="polite"
          className={`rounded-xl border px-4 py-3 text-sm ${
            hasError
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-green-200 bg-green-50 text-green-900"
          }`}
        >
          {message}
        </p>
      ) : null}

      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-200 bg-zinc-100 text-3xl font-semibold text-zinc-500">
          {visibleAvatarUrl ? (
            <Image
              src={visibleAvatarUrl}
              alt="Foto do perfil"
              width={112}
              height={112}
              unoptimized
              className="h-full w-full object-cover"
            />
          ) : (
            <span aria-hidden="true">
              {fullName.trim().charAt(0).toUpperCase() || "?"}
            </span>
          )}
        </div>

        <div className="w-full">
          <label htmlFor="avatar" className="font-semibold text-zinc-950">
            Foto do perfil
          </label>
          <input
            id="avatar"
            name="avatar"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={pending}
            onChange={handleAvatarChange}
            className="mt-2 block w-full rounded-xl border border-zinc-300 bg-white px-3 py-3 text-sm text-zinc-800 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-950 file:px-3 file:py-2 file:font-semibold file:text-white"
          />
          <p className="mt-2 text-sm text-zinc-600">
            JPEG, PNG ou WebP, com no máximo 2 MB.
          </p>
          {currentAvatarPath ? (
            <button
              type="button"
              disabled={pending}
              onClick={removeAvatar}
              className="mt-3 min-h-11 rounded-xl border border-red-200 bg-white px-4 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-wait disabled:opacity-60"
            >
              Remover foto
            </button>
          ) : null}
        </div>
      </div>

      <div>
        <label htmlFor="fullName" className="font-semibold text-zinc-950">
          Nome completo <span className="text-red-700">*</span>
        </label>
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
          className="mt-2 min-h-12 w-full rounded-xl border border-zinc-300 bg-white px-4 text-base text-zinc-950 outline-none focus:border-zinc-700 focus:ring-2 focus:ring-zinc-200"
        />
      </div>

      {email ? (
        <div>
          <p className="font-semibold text-zinc-950">E-mail</p>
          <p className="mt-2 min-h-12 break-all rounded-xl border border-zinc-200 bg-zinc-100 px-4 py-3 text-zinc-700">
            {email}
          </p>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="min-h-12 w-full rounded-xl bg-zinc-950 px-5 text-base font-semibold text-white transition-colors hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-900 disabled:cursor-wait disabled:bg-zinc-500"
      >
        {pending ? "Salvando..." : "Salvar perfil"}
      </button>
    </form>
  );
}
