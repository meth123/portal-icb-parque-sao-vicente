import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function getSafeDestination(value: string | null) {
  return value === "/atualizar-senha" ? value : "/portal";
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const destination = request.nextUrl.clone();
      destination.pathname = getSafeDestination(
        request.nextUrl.searchParams.get("next"),
      );
      destination.search = "";

      return NextResponse.redirect(destination);
    }
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "?erro=link";

  return NextResponse.redirect(loginUrl);
}
