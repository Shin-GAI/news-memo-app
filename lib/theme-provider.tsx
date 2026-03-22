import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Appearance, View, useColorScheme as useSystemColorScheme } from "react-native";
import { colorScheme as nativewindColorScheme, vars } from "nativewind";

import { SchemeColors, type ColorScheme } from "@/constants/theme";
import { getThemePalette } from "@/constants/color-themes";
import type { ThemeVariant, FontVariant } from "@/shared/types";

const THEME_PREFS_KEY = "app_theme_prefs";

type ThemeContextValue = {
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme) => void;
  themeVariant: ThemeVariant;
  setThemeVariant: (variant: ThemeVariant) => void;
  fontVariant: FontVariant;
  setFontVariant: (variant: FontVariant) => void;
};

const DEFAULT_CTX: ThemeContextValue = {
  colorScheme: "light",
  setColorScheme: () => {},
  themeVariant: "default",
  setThemeVariant: () => {},
  fontVariant: "system",
  setFontVariant: () => {},
};

const ThemeContext = createContext<ThemeContextValue>(DEFAULT_CTX);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useSystemColorScheme() ?? "light";
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>(systemScheme);
  const [themeVariant, setThemeVariantState] = useState<ThemeVariant>("default");
  const [fontVariant, setFontVariantState] = useState<FontVariant>("system");

  // Load persisted preferences on mount
  useEffect(() => {
    AsyncStorage.getItem(THEME_PREFS_KEY)
      .then((raw) => {
        if (!raw) return;
        const prefs = JSON.parse(raw) as Partial<{
          themeVariant: ThemeVariant;
          fontVariant: FontVariant;
        }>;
        if (prefs.themeVariant) setThemeVariantState(prefs.themeVariant);
        if (prefs.fontVariant) setFontVariantState(prefs.fontVariant);
      })
      .catch(() => {});
  }, []);

  const persistPrefs = useCallback(
    (tv: ThemeVariant, fv: FontVariant) => {
      AsyncStorage.setItem(THEME_PREFS_KEY, JSON.stringify({ themeVariant: tv, fontVariant: fv })).catch(
        () => {}
      );
    },
    []
  );

  const applyScheme = useCallback((scheme: ColorScheme) => {
    nativewindColorScheme.set(scheme);
    Appearance.setColorScheme?.(scheme);
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      root.dataset.theme = scheme;
      root.classList.toggle("dark", scheme === "dark");
      const palette = SchemeColors[scheme];
      Object.entries(palette).forEach(([token, value]) => {
        root.style.setProperty(`--color-${token}`, value);
      });
    }
  }, []);

  const setColorScheme = useCallback(
    (scheme: ColorScheme) => {
      setColorSchemeState(scheme);
      applyScheme(scheme);
    },
    [applyScheme]
  );

  const setThemeVariant = useCallback(
    (variant: ThemeVariant) => {
      setThemeVariantState(variant);
      persistPrefs(variant, fontVariant);
    },
    [fontVariant, persistPrefs]
  );

  const setFontVariant = useCallback(
    (variant: FontVariant) => {
      setFontVariantState(variant);
      persistPrefs(themeVariant, variant);
    },
    [themeVariant, persistPrefs]
  );

  useEffect(() => {
    applyScheme(colorScheme);
  }, [applyScheme, colorScheme]);

  // Use the active theme palette for NativeWind CSS vars
  const palette = useMemo(
    () => getThemePalette(themeVariant, colorScheme),
    [themeVariant, colorScheme]
  );

  const themeVariables = useMemo(
    () =>
      vars({
        "color-primary":    palette.primary,
        "color-background": palette.background,
        "color-surface":    palette.surface,
        "color-foreground": palette.foreground,
        "color-muted":      palette.muted,
        "color-border":     palette.border,
        "color-success":    palette.success,
        "color-warning":    palette.warning,
        "color-error":      palette.error,
      }),
    [palette]
  );

  const value = useMemo(
    () => ({
      colorScheme,
      setColorScheme,
      themeVariant,
      setThemeVariant,
      fontVariant,
      setFontVariant,
    }),
    [colorScheme, setColorScheme, themeVariant, setThemeVariant, fontVariant, setFontVariant]
  );

  return (
    <ThemeContext.Provider value={value}>
      <View style={[{ flex: 1 }, themeVariables]}>{children}</View>
    </ThemeContext.Provider>
  );
}

export function useThemeContext(): ThemeContextValue {
  return useContext(ThemeContext);
}
