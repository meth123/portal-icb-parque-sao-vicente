import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function getSafeDestination(value: string | null) {
  return value === "/atualizar-senha" ? value : "/portal";
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  const flowId = request.nextUrl.searchParams.get("sb_flow_id");
  const supabase = await createClient();

  if (tokenHash && (type === "recovery" || type === "invite")) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });

    if (!error) {
      const destination = request.nextUrl.clone();
      destination.pathname = getSafeDestination(
        request.nextUrl.searchParams.get("next"),
      );
      destination.search = "";

      return NextResponse.redirect(destination);
    }
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(
      code,
      flowId ? { flowId } : undefined,
    );

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
