import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/login",
    "/recuperar-senha",
    "/confirmar-acesso",
    "/atualizar-senha",
    "/auth/confirm",
    "/portal/:path*",
  ],
};
