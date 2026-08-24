export const annualTheme = {
  year: 2026,
  name: "Caminhando em Unidade",
  artwork: {
    desktop: {
      src: "/images/themes/caminhando-em-unidade-2026-desktop.webp",
      width: 1672,
      height: 941,
    },
    mobile: {
      src: "/images/themes/caminhando-em-unidade-2026-mobile.webp",
      width: 2172,
      height: 724,
    },
    alt: "Arte do tema Caminhando em Unidade, de 2026",
    focalPosition: "50% 50%",
  },
  colors: {
    primary: "#72158F",
    primaryHover: "#64117E",
    primaryActive: "#541067",
    primarySoft: "#F4EAF7",
    primarySubtle: "#FBF7FC",
    primaryBorder: "#E2CAE9",
    primaryForeground: "#FFFFFF",
    artworkBackground: "#380848",
    background: "#F8F6F9",
    surface: "#FFFFFF",
    surfaceMuted: "#F3F0F4",
    foreground: "#231D27",
    textSecondary: "#675E6B",
    border: "#E6E0E8",
    focus: "#8A249B",
    success: "#167A52",
    successSoft: "#EAF7F1",
    warning: "#8A5D00",
    warningSoft: "#FFF5D9",
    danger: "#A93445",
    dangerSoft: "#FDECEF",
  },
} as const;

export type AnnualTheme = typeof annualTheme;
