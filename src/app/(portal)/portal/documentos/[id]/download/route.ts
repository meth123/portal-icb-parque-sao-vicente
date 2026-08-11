import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createDocumentDownloadUrl } from "@/lib/data/document-library";

type DownloadRouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: DownloadRouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login?erro=perfil", request.url));
  }

  if (!user.isActive) {
    return NextResponse.redirect(new URL("/portal", request.url));
  }

  const { id } = await context.params;
  const signedUrl = await createDocumentDownloadUrl(id);

  if (!signedUrl) {
    return NextResponse.redirect(
      new URL("/portal/documentos?erro=download", request.url),
    );
  }

  return NextResponse.redirect(signedUrl, {
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
    },
  });
}
