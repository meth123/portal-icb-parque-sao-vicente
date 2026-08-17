export const annualTheme = {
  year: 2026,
  name: "Caminhando em Unidade",
  artwork: {
    desktop: {
      src: "/images/themes/caminhando-em-unidade-2026-desktop.png",
      width: 1672,
      height: 941,
    },
    mobile: {
      src: "/images/themes/caminhando-em-unidade-2026-mobile.png",
      width: 2172,
      height: 724,
    },
    alt: "Arte do tema Caminhando em Unidade, de 2026",
    focalPosition: "50% 50%",
  },
  colors: {
    primary: "#7B1FA2",
    primaryHover: "#6F1D85",
    primaryActive: "#5A1768",
    primarySoft: "#F5EAF8",
    primarySubtle: "#FBF7FC",
    primaryBorder: "#DFC3E7",
    primaryForeground: "#FFFFFF",
    artworkBackground: "#380848",
    background: "#F8F7FA",
    surface: "#FFFFFF",
    surfaceMuted: "#F2EFF4",
    foreground: "#211B23",
    textSecondary: "#625966",
    border: "#DED7E1",
    focus: "#8A249B",
    success: "#16794B",
    successSoft: "#EAF7F0",
    warning: "#8B5E00",
    warningSoft: "#FFF7DC",
    danger: "#B42318",
    dangerSoft: "#FFF0EE",
  },
} as const;

export type AnnualTheme = typeof annualTheme;
