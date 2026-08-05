import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updatePassword } from "./actions";

export const metadata: Metadata = {
  title: "Nova senha | Portal ICB Parque São Vicente",
  description: "Definição de uma nova senha para o portal interno.",
  robots: {
    index: false,
    follow: false,
  },
};

const errorMessages: Record<string, string> = {
  senha: "A senha deve ter entre 8 e 128 caracteres.",
  confirmacao: "As senhas informadas não são iguais.",
  atualizacao: "Não foi possível atualizar a senha. Solicite um novo link.",
};

export default async function UpdatePasswordPage({
  searchParams,
}: PageProps<"/atualizar-senha">) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims?.sub) {
    redirect("/login?erro=link");
  }

  const { erro } = await searchParams;
  const errorCode = typeof erro === "string" ? erro : "";
  const errorMessage = errorMessages[errorCode];

  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-600">
          Recuperação de acesso
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950">
          Crie uma nova senha
        </h1>
        <p className="mt-3 text-base leading-7 text-zinc-700">
          Use pelo menos 8 caracteres e guarde a senha em um local seguro.
        </p>
      </div>

      {errorMessage ? (
        <p
          role="alert"
          className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-medium text-red-800"
        >
          {errorMessage}
        </p>
      ) : null}

      <form action={updatePassword} className="mt-8 space-y-5">
        <div>
          <label
            htmlFor="password"
            className="mb-2 block text-base font-medium text-zinc-900"
          >
            Nova senha
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={128}
            className="min-h-12 w-full rounded-xl border border-zinc-300 bg-white px-4 text-base text-zinc-900 focus:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-300"
          />
        </div>

        <div>
          <label
            htmlFor="passwordConfirmation"
            className="mb-2 block text-base font-medium text-zinc-900"
          >
            Confirmar nova senha
          </label>
          <input
            id="passwordConfirmation"
            name="passwordConfirmation"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={128}
            className="min-h-12 w-full rounded-xl border border-zinc-300 bg-white px-4 text-base text-zinc-900 focus:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-300"
          />
        </div>

        <button
          type="submit"
          className="min-h-12 w-full rounded-xl bg-zinc-950 px-5 text-base font-semibold text-white transition-colors hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-900"
        >
          Atualizar senha
        </button>
      </form>
    </div>
  );
}
