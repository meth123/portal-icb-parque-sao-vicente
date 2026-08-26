"use client";

import {
  Camera,
  CheckCheck,
  CheckCircle2,
  LoaderCircle,
  Upload,
} from "lucide-react";
import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";
import { Alert } from "@/components/ui/alert";
import { BrazilianDateInput } from "@/components/ui/brazilian-date-input";
import { Button } from "@/components/ui/button";
import {
  choiceClassName,
  controlClassName,
} from "@/components/ui/control-styles";
import { FormField } from "@/components/ui/form-field";
import { FormSection } from "@/components/ui/form-section";
import {
  allowedMemberPhotoTypes,
  maximumMemberPhotoSize,
  memberNetworks,
  memberPhotoExtension,
} from "@/lib/member-registration";
import { createClient } from "@/lib/supabase/client";
import { classNames } from "@/lib/ui/class-names";
import {
  submitMemberRegistration,
  type MemberRegistrationState,
} from "./actions";

type MemberRegistrationFormProps = {
  currentUserId: string;
  currentDate: string;
  defaultDisciplerName: string;
};

const initialState: MemberRegistrationState = {
  status: "idle",
  message: "",
};

export function MemberRegistrationForm({
  currentUserId,
  currentDate,
  defaultDisciplerName,
}: MemberRegistrationFormProps) {
  const [state, formAction, actionPending] = useActionState(
    submitMemberRegistration,
    initialState,
  );
  const [uploading, setUploading] = useState(false);
  const [clientMessage, setClientMessage] = useState("");
  const [selectedFileName, setSelectedFileName] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [formVersion, setFormVersion] = useState(0);
  const lastSuccessId = useRef<string | null>(null);
  const isPending = uploading || actionPending;

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (
      state.status !== "success" ||
      !state.submissionId ||
      state.submissionId === lastSuccessId.current
    ) {
      return;
    }

    lastSuccessId.current = state.submissionId;
    setSelectedFileName("");
    setPreviewUrl(null);
    setFormVersion((version) => version + 1);
  }, [state]);

  function selectPhoto(file: File | undefined, input: HTMLInputElement) {
    setClientMessage("");

    if (!file) {
      setSelectedFileName("");
      setPreviewUrl(null);
      return;
    }
    if (!allowedMemberPhotoTypes.has(file.type)) {
      input.value = "";
      setSelectedFileName("");
      setPreviewUrl(null);
      setClientMessage("Escolha uma foto JPEG, PNG ou WebP.");
      return;
    }
    if (file.size < 1 || file.size > maximumMemberPhotoSize) {
      input.value = "";
      setSelectedFileName("");
      setPreviewUrl(null);
      setClientMessage("A foto deve possuir no máximo 10 MB.");
      return;
    }

    setSelectedFileName(file.name);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;

    const form = event.currentTarget;
    const fileInput = form.elements.namedItem("photoFile");
    const file =
      fileInput instanceof HTMLInputElement ? fileInput.files?.[0] : undefined;

    if (!file) {
      setClientMessage("Selecione uma foto 3x4 do membro.");
      return;
    }
    if (!allowedMemberPhotoTypes.has(file.type)) {
      setClientMessage("Escolha uma foto JPEG, PNG ou WebP.");
      return;
    }
    if (file.size < 1 || file.size > maximumMemberPhotoSize) {
      setClientMessage("A foto deve possuir no máximo 10 MB.");
      return;
    }

    const formData = new FormData(form);
    formData.delete("photoFile");
    setClientMessage("");
    setUploading(true);
    const photoObjectPath = `${currentUserId}/${crypto.randomUUID()}.${memberPhotoExtension(file)}`;
    const supabase = createClient();
    const { error } = await supabase.storage
      .from("member-photos")
      .upload(photoObjectPath, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      setUploading(false);
      setClientMessage(
        "Não foi possível enviar a foto. Confirme sua sessão e tente novamente.",
      );
      return;
    }

    formData.set("photoObjectPath", photoObjectPath);
    setUploading(false);
    startTransition(() => formAction(formData));
  }

  const message = clientMessage || (!isPending ? state.message : "");
  const messageTone = clientMessage || state.status === "error" ? "danger" : "success";

  return (
    <form
      key={formVersion}
      onSubmit={handleSubmit}
      className="space-y-8"
    >
      {message ? (
        <Alert tone={messageTone} aria-live="polite">
          <span className="flex items-center gap-2">
            {messageTone === "success" ? (
              <CheckCircle2 aria-hidden="true" className="size-5 shrink-0" />
            ) : null}
            {message}
          </span>
        </Alert>
      ) : null}

      <FormSection title="Identificação">
        <div className="grid gap-5 md:grid-cols-2">
          <FormField
            id="fullName"
            label="Nome completo"
            required
            className="md:col-span-2"
          >
            <input
              id="fullName"
              name="fullName"
              type="text"
              minLength={2}
              maxLength={160}
              autoComplete="off"
              required
              disabled={isPending}
              className={controlClassName}
            />
          </FormField>

          <FormField id="birthDate" label="Data de nascimento" required>
            <BrazilianDateInput
              id="birthDate"
              name="birthDate"
              defaultValue=""
              min="1900-01-01"
              max={currentDate}
              required
              disabled={isPending}
              className={controlClassName}
            />
          </FormField>

          <FormField id="rg" label="RG" required>
            <input
              id="rg"
              name="rg"
              type="text"
              minLength={4}
              maxLength={30}
              required
              disabled={isPending}
              className={controlClassName}
            />
          </FormField>
        </div>
      </FormSection>

      <FormSection title="Foto 3x4">
        <FormField
          id="photoFile"
          label="Arquivo"
          hint="JPEG, PNG ou WebP, até 10 MB."
          required
        >
          <div className="grid gap-4 rounded-2xl border border-dashed border-theme-primary-border bg-theme-primary-subtle p-4 sm:grid-cols-[7rem_minmax(0,1fr)] sm:items-center sm:p-5">
            <div className="mx-auto flex aspect-[3/4] w-28 items-center justify-center overflow-hidden rounded-xl border border-app-border bg-surface text-theme-primary sm:mx-0">
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt="Prévia da foto selecionada"
                  className="h-full w-full object-cover"
                />
              ) : (
                <Camera aria-hidden="true" className="size-8" strokeWidth={1.6} />
              )}
            </div>
            <div className="min-w-0 text-center sm:text-left">
              <p className="font-semibold text-app-foreground">
                {selectedFileName || "Nenhuma foto selecionada"}
              </p>
              <input
                id="photoFile"
                name="photoFile"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                required
                disabled={isPending}
                className="peer sr-only"
                onChange={(event) =>
                  selectPhoto(event.target.files?.[0], event.target)
                }
              />
              <label
                htmlFor="photoFile"
                aria-disabled={isPending}
                className={classNames(
                  "mt-4 inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-[0.875rem] border border-app-border bg-surface px-4 py-2 text-sm font-semibold text-app-foreground shadow-[var(--shadow-subtle)] transition-[background-color,border-color,transform] hover:border-theme-primary-border hover:bg-theme-primary-soft active:scale-[0.98] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus",
                  isPending && "pointer-events-none opacity-55",
                )}
              >
                <Upload aria-hidden="true" className="size-4" />
                Escolher foto
              </label>
            </div>
          </div>
        </FormField>
      </FormSection>

      <FormSection title="Endereço">
        <div className="grid gap-5 md:grid-cols-6">
          <FormField
            id="addressStreet"
            label="ENDEREÇO (rua, av.)"
            required
            className="md:col-span-4"
          >
            <input
              id="addressStreet"
              name="addressStreet"
              type="text"
              maxLength={180}
              autoComplete="address-line1"
              required
              disabled={isPending}
              className={controlClassName}
            />
          </FormField>
          <FormField
            id="addressNumber"
            label="NÚMERO (casa, apt.º)"
            required
            className="md:col-span-2"
          >
            <input
              id="addressNumber"
              name="addressNumber"
              type="text"
              maxLength={30}
              autoComplete="address-line2"
              required
              disabled={isPending}
              className={controlClassName}
            />
          </FormField>
          <FormField
            id="neighborhood"
            label="Bairro"
            required
            className="md:col-span-2"
          >
            <input
              id="neighborhood"
              name="neighborhood"
              type="text"
              maxLength={100}
              required
              disabled={isPending}
              className={controlClassName}
            />
          </FormField>
          <FormField
            id="city"
            label="Cidade"
            required
            className="md:col-span-2"
          >
            <input
              id="city"
              name="city"
              type="text"
              maxLength={100}
              autoComplete="address-level2"
              required
              disabled={isPending}
              className={controlClassName}
            />
          </FormField>
          <FormField
            id="postalCode"
            label="CEP"
            hint="Ex.: 09210-000"
            required
            className="md:col-span-2"
          >
            <input
              id="postalCode"
              name="postalCode"
              type="text"
              inputMode="numeric"
              maxLength={10}
              autoComplete="postal-code"
              required
              disabled={isPending}
              className={controlClassName}
            />
          </FormField>
        </div>
      </FormSection>

      <FormSection
        title="Vida na igreja"
        description="Complete as informações de acompanhamento e pertencimento."
      >
        <div className="grid gap-5 md:grid-cols-2">
          <FormField id="baptismDate" label="Data de batismo" required>
            <BrazilianDateInput
              id="baptismDate"
              name="baptismDate"
              defaultValue=""
              min="1900-01-01"
              max={currentDate}
              required
              disabled={isPending}
              className={controlClassName}
            />
          </FormField>
          <FormField id="disciplerName" label="Discipulador(a)" required>
            <input
              id="disciplerName"
              name="disciplerName"
              type="text"
              defaultValue={defaultDisciplerName}
              minLength={2}
              maxLength={160}
              required
              disabled={isPending}
              className={controlClassName}
            />
          </FormField>
          <fieldset className="min-w-0 md:col-span-2">
            <legend className="text-sm font-semibold text-app-foreground sm:text-[0.9375rem]">
              Rede <span className="ml-1 text-danger" aria-hidden="true">*</span>
            </legend>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {memberNetworks.map((network, index) => (
                <label
                  key={network.value}
                  className={`${choiceClassName} flex min-h-12 items-center gap-3 px-4 py-3 text-sm font-semibold text-app-foreground`}
                >
                  <input
                    type="radio"
                    name="network"
                    value={network.value}
                    required={index === 0}
                    disabled={isPending}
                    className="size-4 accent-[var(--theme-primary)]"
                  />
                  {network.label}
                </label>
              ))}
            </div>
          </fieldset>
          <FormField
            id="whatsapp"
            label="Contato (WhatsApp)"
            hint="Inclua o DDD."
            required
            className="md:col-span-2"
          >
            <input
              id="whatsapp"
              name="whatsapp"
              type="tel"
              inputMode="tel"
              maxLength={20}
              autoComplete="tel"
              placeholder="(11) 99999-9999"
              required
              disabled={isPending}
              className={controlClassName}
            />
          </FormField>
        </div>
      </FormSection>

      <div className="flex flex-col-reverse gap-3 border-t border-app-border pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-6 text-app-secondary">
          Todos os campos são obrigatórios.
        </p>
        <Button
          type="submit"
          disabled={isPending}
          aria-busy={isPending}
          className="w-full sm:w-auto"
        >
          {isPending ? (
            <LoaderCircle aria-hidden="true" className="size-5 animate-spin" />
          ) : (
            <CheckCheck aria-hidden="true" className="size-5" />
          )}
          {uploading ? "Enviando foto..." : actionPending ? "Enviando ficha..." : "Enviar ficha"}
        </Button>
      </div>
    </form>
  );
}
