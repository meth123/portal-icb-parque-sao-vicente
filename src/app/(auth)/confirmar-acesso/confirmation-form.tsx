"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type ConfirmationFormProps = {
  tokenHash: string;
  type: "invite" | "recovery";
};

export function ConfirmationForm({ tokenHash, type }: ConfirmationFormProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [hasError, setHasError] = useState(false);

  async function confirmAccess() {
    if (isPending) return;

    setIsPending(true);
    setHasError(false);

    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });

    if (error) {
      setHasError(true);
      setIsPending(false);
      return;
    }

    router.replace("/atualizar-senha");
    router.refresh();
  }

  return (
    <div className="mt-8 space-y-4">
      {hasError ? (
        <Alert tone="danger">
          Este link não está mais válido. Solicite um novo link de acesso.
        </Alert>
      ) : null}

      <Button
        type="button"
        className="w-full"
        disabled={isPending}
        onClick={confirmAccess}
      >
        {isPending ? "Confirmando..." : "Continuar e criar minha senha"}
      </Button>
    </div>
  );
}
