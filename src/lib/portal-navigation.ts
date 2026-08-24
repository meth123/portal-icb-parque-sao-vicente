import type { PortalNavigationItem } from "@/components/portal/navigation-types";

type PortalNavigationOptions = {
  cellId: string | null;
  hasDocumentLibraryAccess: boolean;
  hasPastoralAccess: boolean;
  hasAdministrationAccess: boolean;
};

export function buildPortalNavigation({
  cellId,
  hasDocumentLibraryAccess,
  hasPastoralAccess,
  hasAdministrationAccess,
}: PortalNavigationOptions) {
  const homeItem: PortalNavigationItem = {
    href: "/portal",
    label: "Início",
    icon: "home",
    exact: true,
  };
  const reportsItem: PortalNavigationItem = {
    href: "/portal/relatorios",
    label: "Fichas",
    icon: "reports",
  };
  const cellItem: PortalNavigationItem | null = cellId
    ? {
        href: `/portal/celulas/${cellId}`,
        label: "Célula",
        icon: "cell",
      }
    : null;
  const checklistItem: PortalNavigationItem = {
    href: "/portal/checklist",
    label: "Checklist",
    icon: "checklist",
  };
  const profileItem: PortalNavigationItem = {
    href: "/portal/perfil",
    label: "Meu perfil",
    icon: "profile",
  };
  const hasReportsAccess = Boolean(cellId) || hasPastoralAccess;
  const hasChecklistAccess = Boolean(cellId) || hasPastoralAccess;

  const primaryItems: PortalNavigationItem[] = [
    homeItem,
    ...(hasReportsAccess ? [reportsItem] : []),
    ...(cellItem ? [cellItem] : []),
    ...(hasChecklistAccess ? [checklistItem] : []),
  ];
  const secondaryItems: PortalNavigationItem[] = [
    ...(hasDocumentLibraryAccess
      ? [
          {
            href: "/portal/documentos",
            label: "Biblioteca",
            icon: "library" as const,
          },
        ]
      : []),
    ...(hasPastoralAccess
      ? [
          {
            href: "/portal/organizacao",
            label: "Organização",
            icon: "organization" as const,
          },
          {
            href: "/portal/supervisao",
            label: "Painel pastoral",
            icon: "pastoral" as const,
            exact: true,
          },
          {
            href: "/portal/supervisao/chamada",
            label: "Chamada da Supervisão",
            icon: "attendance" as const,
          },
        ]
      : []),
    ...(hasAdministrationAccess
      ? [
          {
            href: "/portal/admin",
            label: "Administração",
            icon: "administration" as const,
          },
        ]
      : []),
  ];
  const bottomItems = [
    homeItem,
    ...(hasReportsAccess ? [reportsItem] : []),
    ...(cellItem ? [cellItem] : []),
  ];
  const moreItems = [
    ...(hasChecklistAccess ? [checklistItem] : []),
    ...secondaryItems,
    profileItem,
  ];

  return { primaryItems, secondaryItems, bottomItems, moreItems };
}
