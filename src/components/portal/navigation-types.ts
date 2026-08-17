export type PortalNavigationIcon =
  | "home"
  | "reports"
  | "cell"
  | "checklist"
  | "library"
  | "organization"
  | "pastoral"
  | "administration"
  | "profile";

export type PortalNavigationItem = {
  href: string;
  label: string;
  icon: PortalNavigationIcon;
  exact?: boolean;
};
