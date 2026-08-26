"use client";

import { LoaderCircle, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  deleteMemberRegistration,
  type MemberRegistrationManagementState,
} from "../actions";

const initialState: MemberRegistrationManagementState = {
  status: "idle",
  message: "",
};

export function DeleteMemberRegistrationForm({
  registrationId,
  memberName,
}: {
  registrationId: string;
  memberName: string;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    deleteMemberRegistration,
    initialState,
  );

  useEffect(() => {
    if (state.status === "success") router.refresh();
  }, [router, state]);

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!window.confirm(`Excluir a ficha de ${memberName}?`)) {
          event.preventDefault();
        }
      }}
      className="flex flex-col items-end gap-1"
    >
      <input type="hidden" name="registrationId" value={registrationId} />
      <Button type="submit" variant="danger" size="compact" disabled={pending}>
        {pending ? (
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        ) : (
          <Trash2 aria-hidden="true" className="size-4" />
        )}
        {pending ? "Excluindo..." : "Excluir"}
      </Button>
      {state.status === "error" ? (
        <span role="alert" className="max-w-xs text-right text-xs text-danger">
          {state.message}
        </span>
      ) : null}
    </form>
  );
}
