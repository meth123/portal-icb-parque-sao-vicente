import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error("As variáveis públicas do Supabase não foram configuradas.");
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = NextResponse.next({ request });

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data: claimsData } = await supabase.auth.getClaims();

  if (
    request.nextUrl.pathname.startsWith("/portal") &&
    typeof claimsData?.claims?.sub === "string"
  ) {
    const { data: sessionContext } = await supabase.rpc(
      "get_portal_session_context",
    );
    const mustChangePassword = Boolean(
      sessionContext &&
        typeof sessionContext === "object" &&
        "mustChangePassword" in sessionContext &&
        sessionContext.mustChangePassword,
    );

    if (mustChangePassword) {
      const destination = request.nextUrl.clone();
      destination.pathname = "/atualizar-senha";
      destination.search = "?primeiro_acesso=1";
      const redirectResponse = NextResponse.redirect(destination);

      response.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie);
      });

      return redirectResponse;
    }
  }

  return response;
}
