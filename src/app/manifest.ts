import type { MetadataRoute } from "next";
import { annualTheme } from "@/config/annual-theme";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/portal",
    name: "ICB Conecta",
    short_name: "ICB Conecta",
    description: "Acesso e gestão da ICB Parque São Vicente.",
    start_url: "/portal",
    scope: "/",
    display: "standalone",
    background_color: annualTheme.colors.background,
    theme_color: annualTheme.colors.primary,
    lang: "pt-BR",
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
