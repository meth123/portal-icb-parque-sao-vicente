import { createClient } from "@/lib/supabase/server";
import { canAccessMemberRegistrations } from "@/lib/data/member-registrations";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!uuidPattern.test(id) || !(await canAccessMemberRegistrations())) {
    return new Response(null, { status: 404 });
  }

  const supabase = await createClient();
  const { data: registration, error: registrationError } = await supabase
    .from("member_registrations")
    .select("photo_bucket_id, photo_object_path")
    .eq("id", id)
    .maybeSingle();

  if (registrationError || !registration) {
    return new Response(null, { status: 404 });
  }

  const { data, error } = await supabase.storage
    .from(registration.photo_bucket_id)
    .download(registration.photo_object_path);

  if (error || !data) {
    return new Response(null, { status: 404 });
  }

  return new Response(await data.arrayBuffer(), {
    headers: {
      "Content-Type": data.type || "application/octet-stream",
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
