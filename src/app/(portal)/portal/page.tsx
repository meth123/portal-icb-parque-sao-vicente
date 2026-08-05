import Image from "next/image";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logout } from "./actions";

export default async function PortalPage() {
  await connection();

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (!claims) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, global_role, is_supervisor, is_active")
    .eq("id", claims.sub)
    .maybeSingle();

  if (profileError || !profile) {
    redirect("/login?erro=perfil");
  }

  const email = typeof claims.email === "string" ? claims.email : null;
  const roleLabels: Record<string, string> = {
    user: "Usuário",
    pastor: "Pastor",
    administrator: "Administrador",
  };
  const roleLabel = roleLabels[profile.global_role] ?? "Usuário";

  if (!profile.is_active) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 py-10 sm:px-6">
        <section className="w-full max-w-lg rounded-3xl border border-zinc-200 bg-white p-6 text-center shadow-sm sm:p-10">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
            Acesso desativado
          </h1>
          <p className="mt-4 text-base leading-7 text-zinc-700">
            Esta conta está temporariamente sem acesso ao portal. Procure um
            administrador.
          </p>
          <form action={logout} className="mt-8">
            <button
              type="submit"
              className="min-h-12 w-full rounded-xl border border-zinc-300 bg-white px-5 text-base font-semibold text-zinc-900 transition-colors hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-900"
            >
              Sair
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 py-10 sm:px-6">
      <section className="w-full max-w-lg rounded-3xl border border-zinc-200 bg-white p-6 text-center shadow-sm sm:p-10">
        <Image
          src="/images/icb-parque-sao-vicente.png"
          alt="ICB Parque São Vicente"
          width={857}
          height={576}
          priority
          className="mx-auto h-24 w-auto brightness-0"
        />

        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-zinc-600">
          Área interna
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950">
          Olá, {profile.full_name ?? "usuário"}
        </h1>
        <p className="mt-4 text-base leading-7 text-zinc-700">
          Seu perfil está conectado. O painel será construído nas próximas
          etapas.
        </p>

        <dl className="mt-6 rounded-2xl bg-zinc-100 px-5 py-4 text-left text-sm text-zinc-700">
          {email ? (
            <div className="flex flex-col gap-1 py-2 sm:flex-row sm:justify-between sm:gap-4">
              <dt className="font-medium text-zinc-900">E-mail</dt>
              <dd className="break-all sm:text-right">{email}</dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-4 border-t border-zinc-200 py-2">
            <dt className="font-medium text-zinc-900">Papel</dt>
            <dd>{roleLabel}</dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-zinc-200 py-2">
            <dt className="font-medium text-zinc-900">Supervisor</dt>
            <dd>{profile.is_supervisor ? "Sim" : "Não"}</dd>
          </div>
        </dl>

        <form action={logout} className="mt-8">
          <button
            type="submit"
            className="min-h-12 w-full rounded-xl border border-zinc-300 bg-white px-5 text-base font-semibold text-zinc-900 transition-colors hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-900"
          >
            Sair
          </button>
        </form>
      </section>
    </main>
  );
}
