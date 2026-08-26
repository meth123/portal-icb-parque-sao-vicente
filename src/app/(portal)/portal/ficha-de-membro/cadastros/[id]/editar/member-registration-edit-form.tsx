"use client";

import { CheckCheck, LoaderCircle, Upload } from "lucide-react";
import {
  startTransition,
  useActionState,
  useEffect,
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
import type { MemberRegistrationSummary } from "@/lib/data/member-registrations";
import {
  allowedMemberPhotoTypes,
  maximumMemberPhotoSize,
  memberNetworks,
  memberPhotoExtension,
} from "@/lib/member-registration";
import { createClient } from "@/lib/supabase/client";
import { classNames } from "@/lib/ui/class-names";
import {
  type MemberRegistrationManagementState,
  updateMemberRegistration,
} from "../../../actions";

const initialState: MemberRegistrationManagementState = {
  status: "idle",
  message: "",
};

export function MemberRegistrationEditForm({
  registration,
  currentUserId,
  currentDate,
}: {
  registration: MemberRegistrationSummary;
  currentUserId: string;
  currentDate: string;
}) {
  const [state, formAction, actionPending] = useActionState(
    updateMemberRegistration,
    initialState,
  );
  const [uploading, setUploading] = useState(false);
  const [clientMessage, setClientMessage] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState("");
  const isPending = uploading || actionPending;

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function selectPhoto(file: File | undefined, input: HTMLInputElement) {
    setClientMessage("");
    if (!file) {
      setPreviewUrl(null);
      setSelectedFileName("");
      return;
    }
    if (!allowedMemberPhotoTypes.has(file.type)) {
      input.value = "";
      setClientMessage("Escolha uma foto JPEG, PNG ou WebP.");
      return;
    }
    if (file.size < 1 || file.size > maximumMemberPhotoSize) {
      input.value = "";
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
    const formData = new FormData(form);
    const fileInput = form.elements.namedItem("photoFile");
    const file =
      fileInput instanceof HTMLInputElement ? fileInput.files?.[0] : undefined;
    formData.delete("photoFile");
    setClientMessage("");

    if (file) {
      if (!allowedMemberPhotoTypes.has(file.type)) {
        setClientMessage("Escolha uma foto JPEG, PNG ou WebP.");
        return;
      }
      if (file.size < 1 || file.size > maximumMemberPhotoSize) {
        setClientMessage("A foto deve possuir no máximo 10 MB.");
        return;
      }

      setUploading(true);
      const photoObjectPath = `${currentUserId}/${crypto.randomUUID()}.${memberPhotoExtension(file)}`;
      const { error } = await createClient()
        .storage.from("member-photos")
        .upload(photoObjectPath, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: false,
        });

      if (error) {
        setUploading(false);
        setClientMessage("Não foi possível enviar a nova foto. Tente novamente.");
        return;
      }
      formData.set("photoObjectPath", photoObjectPath);
      setUploading(false);
    }

    startTransition(() => formAction(formData));
  }

  const message = clientMessage || (!isPending ? state.message : "");
  const isError = Boolean(clientMessage) || state.status === "error";

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <input type="hidden" name="registrationId" value={registration.id} />
      {message ? (
        <Alert tone={isError ? "danger" : "success"} aria-live="polite">
          {message}
        </Alert>
      ) : null}

      <FormSection title="Identificação">
        <div className="grid gap-5 md:grid-cols-2">
          <FormField id="fullName" label="Nome completo" required className="md:col-span-2">
            <input id="fullName" name="fullName" type="text" defaultValue={registration.fullName} minLength={2} maxLength={160} required disabled={isPending} className={controlClassName} />
          </FormField>
          <FormField id="birthDate" label="Data de nascimento" required>
            <BrazilianDateInput id="birthDate" name="birthDate" defaultValue={registration.birthDate} min="1900-01-01" max={currentDate} required disabled={isPending} className={controlClassName} />
          </FormField>
          <FormField id="rg" label="RG" required>
            <input id="rg" name="rg" type="text" defaultValue={registration.rg} minLength={4} maxLength={30} required disabled={isPending} className={controlClassName} />
          </FormField>
        </div>
      </FormSection>

      <FormSection title="Foto 3x4">
        <div className="flex flex-col gap-4 rounded-2xl border border-app-border bg-surface-muted p-4 sm:flex-row sm:items-center">
          <div className="mx-auto flex aspect-[3/4] w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-app-border bg-surface sm:mx-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl ?? `/portal/ficha-de-membro/cadastros/${registration.id}/foto`} alt={`Foto de ${registration.fullName}`} className="h-full w-full object-cover" />
          </div>
          <div className="min-w-0 text-center sm:text-left">
            <p className="text-sm text-app-secondary">{selectedFileName || "A foto atual será mantida."}</p>
            <input id="photoFile" name="photoFile" type="file" accept="image/jpeg,image/png,image/webp" disabled={isPending} className="peer sr-only" onChange={(event) => selectPhoto(event.target.files?.[0], event.target)} />
            <label htmlFor="photoFile" className={classNames("mt-3 inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-[0.875rem] border border-app-border bg-surface px-4 text-sm font-semibold text-app-foreground peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus", isPending && "pointer-events-none opacity-55")}>
              <Upload aria-hidden="true" className="size-4" />
              Trocar foto
            </label>
          </div>
        </div>
      </FormSection>

      <FormSection title="Endereço">
        <div className="grid gap-5 md:grid-cols-6">
          <FormField id="addressStreet" label="ENDEREÇO (rua, av.)" required className="md:col-span-4">
            <input id="addressStreet" name="addressStreet" type="text" defaultValue={registration.addressStreet} maxLength={180} required disabled={isPending} className={controlClassName} />
          </FormField>
          <FormField id="addressNumber" label="NÚMERO (casa, apt.º)" required className="md:col-span-2">
            <input id="addressNumber" name="addressNumber" type="text" defaultValue={registration.addressNumber} maxLength={30} required disabled={isPending} className={controlClassName} />
          </FormField>
          <FormField id="neighborhood" label="Bairro" required className="md:col-span-2">
            <input id="neighborhood" name="neighborhood" type="text" defaultValue={registration.neighborhood} maxLength={100} required disabled={isPending} className={controlClassName} />
          </FormField>
          <FormField id="city" label="Cidade" required className="md:col-span-2">
            <input id="city" name="city" type="text" defaultValue={registration.city} maxLength={100} required disabled={isPending} className={controlClassName} />
          </FormField>
          <FormField id="postalCode" label="CEP" required className="md:col-span-2">
            <input id="postalCode" name="postalCode" type="text" defaultValue={registration.postalCode} inputMode="numeric" maxLength={10} required disabled={isPending} className={controlClassName} />
          </FormField>
        </div>
      </FormSection>

      <FormSection title="Vida na igreja">
        <div className="grid gap-5 md:grid-cols-2">
          <FormField id="baptismDate" label="Data de batismo" required>
            <BrazilianDateInput id="baptismDate" name="baptismDate" defaultValue={registration.baptismDate} min="1900-01-01" max={currentDate} required disabled={isPending} className={controlClassName} />
          </FormField>
          <FormField id="disciplerName" label="Discipulador(a)" required>
            <input id="disciplerName" name="disciplerName" type="text" defaultValue={registration.disciplerName} minLength={2} maxLength={160} required disabled={isPending} className={controlClassName} />
          </FormField>
          <fieldset className="md:col-span-2">
            <legend className="text-sm font-semibold text-app-foreground">Rede <span className="text-danger" aria-hidden="true">*</span></legend>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {memberNetworks.map((network) => (
                <label key={network.value} className={`${choiceClassName} flex min-h-12 items-center gap-3 px-4 py-3 text-sm font-semibold text-app-foreground`}>
                  <input type="radio" name="network" value={network.value} defaultChecked={network.value === registration.network} required disabled={isPending} className="size-4 accent-[var(--theme-primary)]" />
                  {network.label}
                </label>
              ))}
            </div>
          </fieldset>
          <FormField id="whatsapp" label="Contato (WhatsApp)" required className="md:col-span-2">
            <input id="whatsapp" name="whatsapp" type="tel" defaultValue={registration.whatsapp} maxLength={20} required disabled={isPending} className={controlClassName} />
          </FormField>
        </div>
      </FormSection>

      <div className="flex justify-end border-t border-app-border pt-6">
        <Button type="submit" disabled={isPending} aria-busy={isPending} className="w-full sm:w-auto">
          {isPending ? <LoaderCircle aria-hidden="true" className="size-5 animate-spin" /> : <CheckCheck aria-hidden="true" className="size-5" />}
          {uploading ? "Enviando foto..." : actionPending ? "Salvando..." : "Salvar alterações"}
        </Button>
      </div>
    </form>
  );
}
