import Link from "next/link";
import { redirect } from "next/navigation";
import {
  canAccessPastoralDashboard,
  getCurrentUser,
} from "@/lib/auth/current-user";

export default async function SupervisionAccessPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!canAccessPastoralDashboard(user)) {
    redirect("/portal");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 py-10 sm:px-6">
      <section className="w-full max-w-lg rounded-3xl border border-zinc-200 bg-white p-6 text-center shadow-sm sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-600">
          Área pastoral
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950">
          Permissão validada
        </h1>
        <p className="mt-4 text-base leading-7 text-zinc-700">
          Esta página pode ser acessada por Supervisor, Pastor ou Administrador.
        </p>
        <Link
          href="/portal"
          className="mt-8 flex min-h-12 w-full items-center justify-center rounded-xl border border-zinc-300 bg-white px-5 text-base font-semibold text-zinc-900 transition-colors hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-900"
        >
          Voltar ao portal
        </Link>
      </section>
    </main>
  );
}
