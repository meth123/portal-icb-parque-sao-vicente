import type { Metadata } from "next";
import { login } from "./actions";

export const metadata: Metadata = {
  title: "Login | Portal ICB Parque São Vicente",
  description: "Acesso ao portal interno.",
  robots: {
    index: false,
    follow: false,
  },
};

const errorMessages: Record<string, string> = {
  campos: "Preencha o e-mail e a senha.",
  credenciais: "E-mail ou senha inválidos.",
  perfil: "Seu perfil ainda não está disponível. Procure um administrador.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { erro } = await searchParams;
  const errorCode = typeof erro === "string" ? erro : "";
  const errorMessage = errorMessages[errorCode];

  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-600">
          Área interna
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950">
          Entrar no portal
        </h1>
        <p className="mt-3 text-base leading-7 text-zinc-700">
          Use sua conta individual para acessar a área interna.
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

      <form action={login} className="mt-8 space-y-5">
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
            placeholder="seuemail@exemplo.com"
            className="min-h-12 w-full rounded-xl border border-zinc-300 bg-white px-4 text-base text-zinc-900 placeholder:text-zinc-500 focus:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-300"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-2 block text-base font-medium text-zinc-900"
          >
            Senha
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="Sua senha"
            className="min-h-12 w-full rounded-xl border border-zinc-300 bg-white px-4 text-base text-zinc-900 placeholder:text-zinc-500 focus:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-300"
          />
        </div>

        <button
          type="submit"
          className="min-h-12 w-full rounded-xl bg-zinc-950 px-5 text-base font-semibold text-white transition-colors hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-900"
        >
          Entrar
        </button>
      </form>

      <p className="mt-5 text-center text-sm leading-6 text-zinc-600">
        O acesso é exclusivo para contas autorizadas.
      </p>
    </div>
  );
}
