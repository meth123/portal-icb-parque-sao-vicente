import type { Metadata } from "next";
import Link from "next/link";
import { requestPasswordRecovery } from "./actions";

export const metadata: Metadata = {
  title: "Recuperar senha | Portal ICB Parque São Vicente",
  description: "Recuperação de acesso ao portal interno.",
  robots: {
    index: false,
    follow: false,
  },
};

const errorMessages: Record<string, string> = {
  campos: "Informe um endereço de e-mail válido.",
  envio: "Não foi possível iniciar a recuperação agora. Tente novamente.",
};

export default async function RecoverPasswordPage({
  searchParams,
}: PageProps<"/recuperar-senha">) {
  const { erro, status } = await searchParams;
  const errorCode = typeof erro === "string" ? erro : "";
  const sent = status === "enviado";

  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-600">
          Recuperação de acesso
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950">
          Esqueci minha senha
        </h1>
        <p className="mt-3 text-base leading-7 text-zinc-700">
          Informe o e-mail da sua conta para receber as instruções.
        </p>
      </div>

      {sent ? (
        <div
          role="status"
          className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm leading-6 text-emerald-900"
        >
          Se existir uma conta autorizada para esse e-mail, enviaremos um link
          para criar uma nova senha. Verifique também a caixa de spam.
        </div>
      ) : (
        <>
          {errorMessages[errorCode] ? (
            <p
              role="alert"
              className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-medium text-red-800"
            >
              {errorMessages[errorCode]}
            </p>
          ) : null}

          <form action={requestPasswordRecovery} className="mt-8 space-y-5">
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-base font-medium text-zinc-900"
              >
                E-mail
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={254}
                placeholder="seuemail@exemplo.com"
                className="min-h-12 w-full rounded-xl border border-zinc-300 bg-white px-4 text-base text-zinc-900 placeholder:text-zinc-500 focus:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-300"
              />
            </div>

            <button
              type="submit"
              className="min-h-12 w-full rounded-xl bg-zinc-950 px-5 text-base font-semibold text-white transition-colors hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-900"
            >
              Enviar link de recuperação
            </button>
          </form>
        </>
      )}

      <div className="mt-6 text-center">
        <Link
          href="/login"
          className="rounded-md text-sm font-medium text-zinc-700 underline-offset-4 hover:text-zinc-950 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-900"
        >
          Voltar para o login
        </Link>
      </div>
    </div>
  );
}
