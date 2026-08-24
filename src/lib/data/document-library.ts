import "server-only";

import { cache } from "react";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createSafePdfFileName } from "@/lib/documents/file-name";
import { createClient } from "@/lib/supabase/server";

export type DocumentCategorySummary = {
  id: string;
  code: string;
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

  return user?.hasDocumentLibraryAccess === true;
});

export const canManageDocumentLibrary = cache(async () => {
  const user = await getCurrentUser();

  return user?.canManageDocumentLibrary === true;
});

export async function getActiveDocumentCategories() {
  if (!(await canManageDocumentLibrary())) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("document_categories")
    .select("id, code, name")
    .eq("is_active", true)
    .order("sort_order")
    .order("name");

  return {
    categories: (data ?? []) satisfies DocumentCategorySummary[],
    hasError: Boolean(error),
  };
}

export async function getDocumentLibraryOverview(categoryId?: string) {
  if (!(await canAccessDocumentLibrary())) {
    return null;
  }

  const supabase = await createClient();
  const categoriesResult = await supabase
    .from("document_categories")
    .select("id, code, name, sort_order")
    .eq("is_active", true)
    .order("sort_order")
    .order("name");

  const categories = (categoriesResult.data ?? []).map((category) => ({
    id: category.id,
    code: category.code,
    name: category.name,
  })) satisfies DocumentCategorySummary[];

  const selectedCategoryId =
    categoryId &&
    uuidPattern.test(categoryId) &&
    categories.some((category) => category.id === categoryId)
      ? categoryId
      : "";
  const publicationsResult = await supabase
    .from("document_publications")
    .select("id, category_id, title, published_at")
    .eq("status", "published")
    .order("published_at", { ascending: false });
  const allPublications = (
    (publicationsResult.data ?? []) as RawDocumentPublication[]
  ).map((publication) => ({
    id: publication.id,
    categoryId: publication.category_id,
    title: publication.title,
    publishedAt: publication.published_at,
  })) satisfies DocumentPublicationSummary[];
  const publications = selectedCategoryId
    ? allPublications.filter(
        (publication) => publication.categoryId === selectedCategoryId,
      )
    : [];
  const categoryCounts = Object.fromEntries(
    categories.map((category) => [
      category.id,
      allPublications.filter(
        (publication) => publication.categoryId === category.id,
      ).length,
    ]),
  ) as Record<string, number>;

  return {
    categories,
    publications,
    categoryCounts,
    totalPublicationCount: allPublications.length,
    selectedCategoryId,
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
      download: createSafePdfFileName(publication.original_file_name),
    });

  if (error || !data?.signedUrl) {
    return null;
  }

  return data.signedUrl;
}
