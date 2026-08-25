export type PortalNavigationIcon =
  | "home"
  | "reports"
  | "cell"
  | "checklist"
  | "library"
  | "organization"
  | "pastoral"
  | "attendance"
  | "administration"
  | "testimonies"
  | "profile";

export type PortalNavigationItem = {
  href: string;
  label: string;
  icon: PortalNavigationIcon;
  exact?: boolean;
};
