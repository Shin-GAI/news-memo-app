import { useThemeContext } from "@/lib/theme-provider";
import { getThemePalette, type AppColorPalette } from "@/constants/color-themes";
import type { ColorScheme } from "@/constants/theme";

/**
 * Returns the current theme's color palette (theme variant + light/dark scheme aware).
 * Usage: const colors = useColors();  → colors.primary, colors.background, etc.
 */
export function useColors(colorSchemeOverride?: ColorScheme): AppColorPalette {
  const { colorScheme, themeVariant } = useThemeContext();
  const scheme = (colorSchemeOverride ?? colorScheme ?? "light") as ColorScheme;
  return getThemePalette(themeVariant, scheme);
}
