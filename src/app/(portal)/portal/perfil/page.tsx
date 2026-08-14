import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "./profile-form";

const avatarBucket = "profile-avatars";

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!user.isActive) {
    redirect("/portal");
  }

  const expectedAvatarPath = `${user.id}/avatar`;
  const avatarPath =
    user.avatarPath === expectedAvatarPath ? user.avatarPath : null;
  let avatarUrl: string | null = null;

  if (avatarPath) {
    const supabase = await createClient();
    const { data } = await supabase.storage
      .from(avatarBucket)
      .createSignedUrl(avatarPath, 300);

    avatarUrl = data?.signedUrl ?? null;
  }

  return (
    <main className="min-h-screen bg-zinc-100 px-3 py-6 sm:px-6 sm:py-10">
      <section className="mx-auto w-full max-w-xl rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-600">
          Área interna
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950">
          Meu perfil
        </h1>
        <p className="mt-3 leading-7 text-zinc-700">
          Atualize seu nome e sua foto. Seu papel e suas permissões são
          administrados separadamente.
        </p>

        <ProfileForm
          userId={user.id}
          email={user.email}
          initialFullName={user.fullName ?? ""}
          initialAvatarPath={avatarPath}
          initialAvatarUrl={avatarUrl}
        />

        <Link
          href="/portal"
          className="mt-4 flex min-h-12 w-full items-center justify-center rounded-xl border border-zinc-300 bg-white px-5 text-base font-semibold text-zinc-900 transition-colors hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-900"
        >
          Voltar ao portal
        </Link>
      </section>
    </main>
  );
}
