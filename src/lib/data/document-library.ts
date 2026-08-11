import "server-only";

import { cache } from "react";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

export type DocumentCategorySummary = {
  id: string;
  name: string;
};

export type DocumentPublicationSummary = {
  id: string;
  categoryId: string;
  title: string;
  publishedAt: string;
};

type RawDocumentPublication = {
  id: string;
  category_id: string;
  title: string;
  published_at: string;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const canAccessDocumentLibrary = cache(async () => {
  const user = await getCurrentUser();

  if (!user?.isActive) {
    return false;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("can_access_document_library");

  return !error && data === true;
});

export const canManageDocumentLibrary = cache(async () => {
  const user = await getCurrentUser();

  if (!user?.isActive) {
    return false;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("can_manage_document_library");

  return !error && data === true;
});

export async function getActiveDocumentCategories() {
  if (!(await canManageDocumentLibrary())) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("document_categories")
    .select("id, name")
    .eq("is_active", true)
    .order("sort_order")
    .order("name");

  return {
    categories: (data ?? []) satisfies DocumentCategorySummary[],
    hasError: Boolean(error),
  };
}

export async function getDocumentLibraryOverview() {
  if (!(await canAccessDocumentLibrary())) {
    return null;
  }

  const supabase = await createClient();
  const [categoriesResult, publicationsResult] = await Promise.all([
    supabase
      .from("document_categories")
      .select("id, name, sort_order")
      .eq("is_active", true)
      .order("sort_order")
      .order("name"),
    supabase
      .from("document_publications")
      .select("id, category_id, title, published_at")
      .eq("status", "published")
      .order("published_at", { ascending: false }),
  ]);

  const categories = (categoriesResult.data ?? []).map((category) => ({
    id: category.id,
    name: category.name,
  })) satisfies DocumentCategorySummary[];

  const publications = (
    (publicationsResult.data ?? []) as RawDocumentPublication[]
  ).map((publication) => ({
    id: publication.id,
    categoryId: publication.category_id,
    title: publication.title,
    publishedAt: publication.published_at,
  })) satisfies DocumentPublicationSummary[];

  return {
    categories,
    publications,
    hasError: Boolean(categoriesResult.error || publicationsResult.error),
  };
}

export async function createDocumentDownloadUrl(publicationId: string) {
  if (
    !uuidPattern.test(publicationId) ||
    !(await canAccessDocumentLibrary())
  ) {
    return null;
  }

  const supabase = await createClient();
  const { data: publication, error: publicationError } = await supabase
    .from("document_publications")
    .select("storage_bucket_id, storage_object_path, original_file_name")
    .eq("id", publicationId)
    .eq("status", "published")
    .maybeSingle();

  if (publicationError || !publication) {
    return null;
  }

  const { data, error } = await supabase.storage
    .from(publication.storage_bucket_id)
    .createSignedUrl(publication.storage_object_path, 60, {
      download: publication.original_file_name,
    });

  if (error || !data?.signedUrl) {
    return null;
  }

  return data.signedUrl;
}
