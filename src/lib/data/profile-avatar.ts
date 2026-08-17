import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

const avatarBucket = "profile-avatars";

export const getProfileAvatarUrl = cache(
  async (userId: string, avatarPath: string | null) => {
    const expectedPath = `${userId}/avatar`;

    if (avatarPath !== expectedPath) return null;

    const supabase = await createClient();
    const { data } = await supabase.storage
      .from(avatarBucket)
      .createSignedUrl(expectedPath, 300);

    return data?.signedUrl ?? null;
  },
);
