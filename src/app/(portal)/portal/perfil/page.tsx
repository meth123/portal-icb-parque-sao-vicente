import { redirect } from "next/navigation";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { Surface } from "@/components/ui/surface";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getProfileAvatarUrl } from "@/lib/data/profile-avatar";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) redirect("/login");
  if (!user.isActive) redirect("/portal");

  const expectedAvatarPath = `${user.id}/avatar`;
  const avatarPath =
    user.avatarPath === expectedAvatarPath ? user.avatarPath : null;
  const avatarUrl = await getProfileAvatarUrl(user.id, avatarPath);

  return (
    <main>
      <PageContainer width="narrow" className="py-6 sm:py-8 lg:py-10">
        <PageHeader
          title="Meu perfil"
          description="Atualize seu nome e sua foto."
        />

        <Surface className="mt-6 p-5 sm:p-8">
          <ProfileForm
            userId={user.id}
            email={user.email}
            initialFullName={user.fullName ?? ""}
            initialAvatarPath={avatarPath}
            initialAvatarUrl={avatarUrl}
          />
        </Surface>
      </PageContainer>
    </main>
  );
}
