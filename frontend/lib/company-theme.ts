export type CompanyTheme = {
  sidebarColour: string;
  sidebarColourSecondary: string;
  sidebarTextColour: string;
  sidebarAccentColour: string;
  sidebarStyle: "solid" | "gradient";
};

export const DEFAULT_COMPANY_THEME: CompanyTheme = {
  sidebarColour: "#0B4331",
  sidebarColourSecondary: "#073023",
  sidebarTextColour: "#F4FFF9",
  sidebarAccentColour: "#6EE7B7",
  sidebarStyle: "gradient",
};

export function applyCompanyTheme(theme: CompanyTheme) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  const secondary =
    theme.sidebarStyle === "solid"
      ? theme.sidebarColour
      : theme.sidebarColourSecondary;

  root.style.setProperty("--sidebar", theme.sidebarColour);
  root.style.setProperty("--sidebar-strong", secondary);
  root.style.setProperty("--sidebar-text", theme.sidebarTextColour);
  root.style.setProperty(
    "--sidebar-muted",
    `color-mix(in srgb, ${theme.sidebarTextColour} 78%, transparent)`,
  );
  root.style.setProperty("--sidebar-accent", theme.sidebarAccentColour);
  root.style.setProperty(
    "--sidebar-active",
    `color-mix(in srgb, ${theme.sidebarAccentColour} 20%, transparent)`,
  );
  root.style.setProperty(
    "--sidebar-active-border",
    `color-mix(in srgb, ${theme.sidebarAccentColour} 38%, transparent)`,
  );
}

export function resetCompanyTheme() {
  applyCompanyTheme(DEFAULT_COMPANY_THEME);
}
