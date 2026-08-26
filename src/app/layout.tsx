import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import type { CSSProperties } from "react";
import { ServiceWorkerRegistration } from "@/components/pwa/service-worker-registration";
import { annualTheme } from "@/config/annual-theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ICB Conecta | Parque São Vicente",
  description: "Acesso e gestão da ICB Parque São Vicente.",
  applicationName: "ICB Conecta",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ICB Conecta",
  },
  icons: {
    icon: [
      {
        url: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: annualTheme.colors.primary,
  viewportFit: "cover",
};

type ThemeStyle = CSSProperties & Record<`--${string}`, string>;

const themeStyle: ThemeStyle = {
  "--theme-primary": annualTheme.colors.primary,
  "--theme-primary-hover": annualTheme.colors.primaryHover,
  "--theme-primary-active": annualTheme.colors.primaryActive,
  "--theme-primary-soft": annualTheme.colors.primarySoft,
  "--theme-primary-subtle": annualTheme.colors.primarySubtle,
  "--theme-primary-border": annualTheme.colors.primaryBorder,
  "--theme-primary-foreground": annualTheme.colors.primaryForeground,
  "--theme-artwork-background": annualTheme.colors.artworkBackground,
  "--app-background": annualTheme.colors.background,
  "--surface": annualTheme.colors.surface,
  "--surface-muted": annualTheme.colors.surfaceMuted,
  "--app-foreground": annualTheme.colors.foreground,
  "--text-secondary": annualTheme.colors.textSecondary,
  "--app-border": annualTheme.colors.border,
  "--focus": annualTheme.colors.focus,
  "--success": annualTheme.colors.success,
  "--success-soft": annualTheme.colors.successSoft,
  "--warning": annualTheme.colors.warning,
  "--warning-soft": annualTheme.colors.warningSoft,
  "--danger": annualTheme.colors.danger,
  "--danger-soft": annualTheme.colors.dangerSoft,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      data-annual-theme={annualTheme.year}
      style={themeStyle}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
