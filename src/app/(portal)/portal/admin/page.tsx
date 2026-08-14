import Link from "next/link";
import { redirect } from "next/navigation";
import { canAccessAdministration, getCurrentUser } from "@/lib/auth/current-user";
import { getAdministrationOverview } from "@/lib/data/cell-administration";
import { AccountDirectory } from "./account-directory";

export default async function AdminAccessPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canAccessAdministration(user)) redirect("/portal");

  const overview = await getAdministrationOverview();
  if (!overview || overview.hasError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 py-10">
        <section className="w-full max-w-lg rounded-3xl border border-zinc-200 bg-white p-6 text-center shadow-sm sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-600">Área administrativa · Fase 8</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950">Dados indisponíveis</h1>
          <p className="mt-4 leading-7 text-zinc-700">Não foi possível carregar o resumo administrativo. Tente novamente mais tarde.</p>
        </section>
      </main>
    );
  }

  const activeProfiles = overview.profiles.filter((profile) => profile.is_active);
  const administrativeAccessCount = activeProfiles.filter(
    (profile) =>
      profile.global_role === "administrator" ||
      profile.global_role === "pastor",
  ).length;
  const inactiveCount = overview.profiles.length - activeProfiles.length;
  const metrics = [
    ["Contas", overview.profiles.length],
    ["Ativas", activeProfiles.length],
    ["Inativas", inactiveCount],
    ["Acessos administrativos", administrativeAccessCount],
  ] as const;

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-10 sm:px-6">
      <section className="mx-auto w-full max-w-6xl rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-600">Área administrativa · Fase 8</p>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">Administração</h1>
            <p className="mt-3 max-w-2xl leading-7 text-zinc-700">Gerencie o acesso das contas existentes e os recursos administrativos já disponíveis.</p>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-800">Acesso protegido</span>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
              <p className="text-sm text-zinc-600">{label}</p>
              <p className="mt-2 text-3xl font-semibold text-zinc-950">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
          <section className="rounded-2xl border border-zinc-200 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-zinc-950">Contas</h2>
                <p className="mt-1 text-sm text-zinc-600">Abra uma conta para revisar papel, status e permissões.</p>
              </div>
              <span className="text-sm font-medium text-zinc-500">{overview.profiles.length}</span>
            </div>
            <AccountDirectory
              profiles={overview.profiles}
              currentUserId={user.id}
            />
          </section>

          <aside className="rounded-2xl border border-zinc-200 p-5">
            <h2 className="text-xl font-semibold text-zinc-950">Ações disponíveis</h2>
            <p className="mt-1 text-sm leading-6 text-zinc-600">Operações já protegidas no servidor.</p>
            <Link href="/portal/admin/celulas" className="mt-5 flex min-h-12 w-full items-center justify-center rounded-xl bg-zinc-950 px-5 text-center font-semibold text-white hover:bg-zinc-800">Gerenciar células</Link>
            <Link href="/portal/documentos" className="mt-3 flex min-h-12 w-full items-center justify-center rounded-xl border border-zinc-300 px-5 text-center font-semibold text-zinc-900 hover:bg-zinc-100">Gerenciar publicações</Link>
            <div className="mt-5 rounded-xl bg-zinc-50 p-4 text-sm text-zinc-700"><span className="font-semibold text-zinc-950">Células ativas:</span> {overview.activeCellCount}</div>
          </aside>
        </div>

        <Link href="/portal" className="mt-8 flex min-h-12 w-full items-center justify-center rounded-xl border border-zinc-300 bg-white px-5 font-semibold text-zinc-900 hover:bg-zinc-100 sm:w-auto sm:min-w-52">Voltar ao portal</Link>
      </section>
    </main>
  );
}
