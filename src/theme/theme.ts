export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = Exclude<ThemePreference, "system">;

export const THEME_STORAGE_KEY = "pdf-pair-theme";

export function isThemePreference(value: string | null): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

export function readThemePreference(
  storage: Pick<Storage, "getItem"> | null =
    typeof window === "undefined" ? null : window.localStorage,
): ThemePreference {
  if (!storage) return "system";

  try {
    const storedPreference = storage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(storedPreference) ? storedPreference : "system";
  } catch {
    return "system";
  }
}

export function saveThemePreference(
  preference: ThemePreference,
  storage: Pick<Storage, "setItem"> | null =
    typeof window === "undefined" ? null : window.localStorage,
) {
  if (!storage) return;

  try {
    storage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // The app remains usable when storage is unavailable or disabled.
  }
}

export function systemPrefersDark(): boolean {
  return typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function resolveTheme(
  preference: ThemePreference,
  prefersDark: boolean,
): ResolvedTheme {
  return preference === "system" ? (prefersDark ? "dark" : "light") : preference;
}
