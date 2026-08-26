import "server-only";

import { getCurrentUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { normalizeTestimonyAuthorRoleLabel } from "@/lib/testimonies";

const TESTIMONY_PAGE_SIZE = 12;
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type TestimonyFeedItem = {
  id: string;
  content: string;
  createdAt: string;
  authorName: string;
  authorRoleLabel: string;
  authorCellName: string | null;
  amenCount: number;
  likeCount: number;
  viewerAmen: boolean;
  viewerLike: boolean;
};

export type TestimonyFeedPage = {
  items: TestimonyFeedItem[];
  canPublish: boolean;
  canModerate: boolean;
  currentWeekStart: string;
  hasMore: boolean;
  nextCursor: string | null;
  hasError: boolean;
};

type TestimonyCursor = {
  createdAt: string;
  id: string;
};

type RawTestimonyFeed = {
  items?: TestimonyFeedItem[];
  canPublish?: boolean;
  canModerate?: boolean;
  currentWeekStart?: string;
  hasMore?: boolean;
  nextCursorCreatedAt?: string | null;
  nextCursorId?: string | null;
};

export function encodeTestimonyCursor(cursor: TestimonyCursor) {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function decodeTestimonyCursor(value?: string): TestimonyCursor | null {
  if (!value || value.length > 300) return null;

  try {
    const parsed = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    ) as Partial<TestimonyCursor>;

    if (
      typeof parsed.createdAt !== "string" ||
      !Number.isFinite(new Date(parsed.createdAt).getTime()) ||
      typeof parsed.id !== "string" ||
      !uuidPattern.test(parsed.id)
    ) {
      return null;
    }

    return { createdAt: parsed.createdAt, id: parsed.id };
  } catch {
    return null;
  }
}

function emptyFeed(hasError: boolean): TestimonyFeedPage {
  return {
    items: [],
    canPublish: false,
    canModerate: false,
    currentWeekStart: "",
    hasMore: false,
    nextCursor: null,
    hasError,
  };
}

export async function getTestimonyFeed(
  cursorValue?: string,
  pageSize = TESTIMONY_PAGE_SIZE,
): Promise<TestimonyFeedPage | null> {
  const user = await getCurrentUser();
  if (!user?.isActive) return null;

  const cursor = decodeTestimonyCursor(cursorValue);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_testimonies_feed", {
    target_cursor_created_at: cursor?.createdAt ?? null,
    target_cursor_id: cursor?.id ?? null,
    target_page_size: pageSize,
  });

  if (error || !data || typeof data !== "object" || Array.isArray(data)) {
    return emptyFeed(true);
  }

  const raw = data as RawTestimonyFeed;
  const hasMore = raw.hasMore === true;
  const nextCursor =
    hasMore &&
    typeof raw.nextCursorCreatedAt === "string" &&
    typeof raw.nextCursorId === "string" &&
    uuidPattern.test(raw.nextCursorId)
      ? encodeTestimonyCursor({
          createdAt: raw.nextCursorCreatedAt,
          id: raw.nextCursorId,
        })
      : null;

  return {
    items: Array.isArray(raw.items)
      ? raw.items.map((item) => ({
          ...item,
          authorRoleLabel: normalizeTestimonyAuthorRoleLabel(
            item.authorRoleLabel,
          ),
        }))
      : [],
    canPublish: raw.canPublish === true,
    canModerate: raw.canModerate === true,
    currentWeekStart:
      typeof raw.currentWeekStart === "string" ? raw.currentWeekStart : "",
    hasMore,
    nextCursor,
    hasError: false,
  };
}

export async function getLatestTestimonyPreview() {
  const feed = await getTestimonyFeed(undefined, 1);
  if (!feed) return null;

  return {
    testimony: feed.items[0] ?? null,
    hasError: feed.hasError,
  };
}

export function formatTestimonyDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
