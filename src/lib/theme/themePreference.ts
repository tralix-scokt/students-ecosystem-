"use client";

export type EcosystemTheme = "default" | "dark" | "light";

export const THEME_STORAGE_KEY = "se-theme-preference";
export const THEME_CHANGE_EVENT = "se-theme-change";

export interface ThemeOptionMeta {
  id: EcosystemTheme;
  label: string;
  badge: string;
  description: string;
}

export const ECOSYSTEM_THEME_OPTIONS: ThemeOptionMeta[] = [
  {
    id: "default",
    label: "Default (Blue Neon)",
    badge: "Signature",
    description:
      "Deep obsidian-blue sanctuary with electric cyan and violet neon accents.",
  },
  {
    id: "dark",
    label: "Dark",
    badge: "Matte",
    description:
      "Calm neutral charcoal-graphite dark theme with soft low-glare contrast.",
  },
  {
    id: "light",
    label: "Light",
    badge: "Daylight",
    description:
      "Crisp daylight paper surfaces with high-contrast dark slate typography.",
  },
];

export function isValidEcosystemTheme(val: unknown): val is EcosystemTheme {
  return val === "default" || val === "dark" || val === "light";
}

export function getStoredEcosystemTheme(): EcosystemTheme {
  if (typeof window === "undefined") return "default";
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (isValidEcosystemTheme(raw)) return raw;
  } catch {
    // Storage restricted
  }
  return "default";
}

export function applyEcosystemTheme(theme: EcosystemTheme): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  if (theme === "light") {
    root.classList.remove("dark");
    root.style.colorScheme = "light";
  } else {
    root.classList.add("dark");
    root.style.colorScheme = "dark";
  }

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage restricted
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent<EcosystemTheme>(THEME_CHANGE_EVENT, { detail: theme })
    );
  }
}
