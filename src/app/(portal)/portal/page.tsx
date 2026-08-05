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

  const email = typeof claims.email === "string" ? claims.email : null;

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
          Acesso autenticado
        </h1>
        <p className="mt-4 text-base leading-7 text-zinc-700">
          O login individual está funcionando. O painel será construído nas
          próximas etapas.
        </p>

        {email ? (
          <p className="mt-4 break-all text-sm text-zinc-600">{email}</p>
        ) : null}

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
