import { useThemeContext } from "@/lib/theme-provider";
import { getFontFamily } from "@/constants/color-themes";

/**
 * Returns the fontFamily string for the user's selected font variant.
 * Usage:
 *   const { fontFamily } = useAppFont();
 *   <Text style={{ fontFamily }}>...</Text>
 *
 * fontFamily is `undefined` for the system default font (no override needed).
 */
export function useAppFont(): { fontFamily: string | undefined } {
  const { fontVariant } = useThemeContext();
  return { fontFamily: getFontFamily(fontVariant) };
}
