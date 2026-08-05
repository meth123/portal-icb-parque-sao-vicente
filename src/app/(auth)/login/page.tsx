import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login | Portal ICB Parque São Vicente",
  description: "Acesso ao portal interno.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginPage() {
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
          O acesso individual será disponibilizado em uma próxima fase.
        </p>
      </div>

      <form className="mt-8 space-y-5" aria-describedby="login-status">
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
            disabled
            placeholder="seuemail@exemplo.com"
            className="min-h-12 w-full rounded-xl border border-zinc-300 bg-zinc-100 px-4 text-base text-zinc-700 placeholder:text-zinc-500 disabled:cursor-not-allowed"
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
            disabled
            placeholder="Sua senha"
            className="min-h-12 w-full rounded-xl border border-zinc-300 bg-zinc-100 px-4 text-base text-zinc-700 placeholder:text-zinc-500 disabled:cursor-not-allowed"
          />
        </div>

        <button
          type="submit"
          disabled
          className="min-h-12 w-full cursor-not-allowed rounded-xl bg-zinc-300 px-5 text-base font-semibold text-zinc-600"
        >
          Entrar
        </button>
      </form>

      <p
        id="login-status"
        role="status"
        className="mt-5 rounded-xl bg-zinc-100 px-4 py-3 text-center text-sm leading-6 text-zinc-700"
      >
        Login ainda não ativado. Nenhum dado será enviado nesta página.
      </p>
    </div>
  );
}
