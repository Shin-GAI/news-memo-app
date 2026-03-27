import { Platform } from "react-native";
import type { ThemeVariant, FontVariant } from "@/shared/types";

export type ColorScheme = "light" | "dark";

export interface AppColorPalette {
  primary: string;
  accent: string;
  background: string;
  surface: string;
  foreground: string;
  muted: string;
  border: string;
  success: string;
  warning: string;
  error: string;
  card: string;
  // runtime extras (convenience aliases)
  text: string;
  tint: string;
  icon: string;
  tabIconDefault: string;
  tabIconSelected: string;
}

// ── Semantic colours (consistent across all themes) ────────────────────────
const SEMANTIC = {
  light: { success: "#00C896", warning: "#F59E0B", error: "#EF4444" },
  dark:  { success: "#00E6AA", warning: "#FBBF24", error: "#F87171" },
};

// ── Raw palette builder ────────────────────────────────────────────────────
type RawEntry = {
  primary: string; accent: string;
  background: string; surface: string; card: string;
  foreground: string; muted: string; border: string;
};

function build(scheme: ColorScheme, raw: RawEntry): AppColorPalette {
  return {
    ...raw,
    ...SEMANTIC[scheme],
    text: raw.foreground,
    tint: raw.primary,
    icon: raw.muted,
    tabIconDefault: raw.muted,
    tabIconSelected: raw.primary,
  };
}

// ── Theme palette definitions ──────────────────────────────────────────────
const RAW: Record<ThemeVariant, Record<ColorScheme, RawEntry>> = {
  // ── Default (blue) ────────────────────────────────────────────────────
  default: {
    light: {
      primary:    "#1A6BFF",
      accent:     "#00C896",
      background: "#F8FAFF",
      surface:    "#FFFFFF",
      card:       "#FFFFFF",
      foreground: "#0D1117",
      muted:      "#6B7280",
      border:     "#E2E8F0",
    },
    dark: {
      primary:    "#4D8FFF",
      accent:     "#00E6AA",
      background: "#0F1117",
      surface:    "#1A1D27",
      card:       "#1E2235",
      foreground: "#E8ECF4",
      muted:      "#9CA3AF",
      border:     "#2D3348",
    },
  },

  // ── Mono (black & white) ──────────────────────────────────────────────
  mono: {
    light: {
      primary:    "#111111",
      accent:     "#444444",
      background: "#F5F5F5",
      surface:    "#FFFFFF",
      card:       "#FFFFFF",
      foreground: "#0A0A0A",
      muted:      "#888888",
      border:     "#DEDEDE",
    },
    dark: {
      primary:    "#EFEFEF",
      accent:     "#AAAAAA",
      background: "#0C0C0C",
      surface:    "#1C1C1C",
      card:       "#222222",
      foreground: "#F2F2F2",
      muted:      "#888888",
      border:     "#2E2E2E",
    },
  },

  // ── Green (pastel green) ──────────────────────────────────────────────
  green: {
    light: {
      primary:    "#3A9B72",
      accent:     "#52C98A",
      background: "#F0FAF5",
      surface:    "#FFFFFF",
      card:       "#FFFFFF",
      foreground: "#0D2B1A",
      muted:      "#5C7D68",
      border:     "#C3E6D4",
    },
    dark: {
      primary:    "#4DC98A",
      accent:     "#2D9E6B",
      background: "#031A0E",
      surface:    "#082015",
      card:       "#0C2B1C",
      foreground: "#D4F4E3",
      muted:      "#5C8F72",
      border:     "#0F3320",
    },
  },

  // ── Pink (rose) ───────────────────────────────────────────────────────
  pink: {
    light: {
      primary:    "#CC0066",
      accent:     "#FF4499",
      background: "#FFF4F8",
      surface:    "#FFFFFF",
      card:       "#FFFFFF",
      foreground: "#1A0510",
      muted:      "#956080",
      border:     "#F5C8DC",
    },
    dark: {
      primary:    "#FF80BB",
      accent:     "#FF44AA",
      background: "#170410",
      surface:    "#25091C",
      card:       "#2D0E22",
      foreground: "#FFE0EF",
      muted:      "#B07090",
      border:     "#3D1230",
    },
  },
};

// ── Exported palette map ───────────────────────────────────────────────────
export const THEME_PALETTES: Record<ThemeVariant, Record<ColorScheme, AppColorPalette>> = {
  default: {
    light: build("light", RAW.default.light),
    dark:  build("dark",  RAW.default.dark),
  },
  mono: {
    light: build("light", RAW.mono.light),
    dark:  build("dark",  RAW.mono.dark),
  },
  green: {
    light: build("light", RAW.green.light),
    dark:  build("dark",  RAW.green.dark),
  },
  pink: {
    light: build("light", RAW.pink.light),
    dark:  build("dark",  RAW.pink.dark),
  },
};

export function getThemePalette(
  variant: ThemeVariant,
  scheme: ColorScheme
): AppColorPalette {
  return THEME_PALETTES[variant][scheme];
}

// ── Theme metadata (for settings UI) ──────────────────────────────────────
export interface ThemeInfo {
  id: ThemeVariant;
  label: string;
  desc: string;
  previewColors: { bg: string; primary: string; card: string };
}

export const THEME_OPTIONS: ThemeInfo[] = [
  {
    id: "default",
    label: "기본",
    desc: "블루 계열의 기본 테마",
    previewColors: { bg: "#F8FAFF", primary: "#1A6BFF", card: "#FFFFFF" },
  },
  {
    id: "mono",
    label: "흑백",
    desc: "심플한 흑백 모노크롬",
    previewColors: { bg: "#F5F5F5", primary: "#111111", card: "#FFFFFF" },
  },
  {
    id: "green",
    label: "파스텔 그린",
    desc: "부드러운 그린 계열 테마",
    previewColors: { bg: "#F0FAF5", primary: "#3A9B72", card: "#FFFFFF" },
  },
  {
    id: "pink",
    label: "핑크",
    desc: "로즈 핑크 컬러 컨셉",
    previewColors: { bg: "#FFF4F8", primary: "#CC0066", card: "#FFFFFF" },
  },
];

// ── Font definitions ───────────────────────────────────────────────────────
export interface FontInfo {
  id: FontVariant;
  label: string;
  desc: string;
  fontFamily: string | undefined;
}

export const FONT_OPTIONS: FontInfo[] = [
  {
    id: "system",
    label: "기본체",
    desc: "Roboto / SF Pro — 깔끔하고 모던한 시스템 폰트",
    fontFamily: undefined,
  },
  {
    id: "serif",
    label: "세리프체",
    desc: "Noto Serif / Georgia — 가독성 높은 명조 계열",
    fontFamily: Platform.select({ ios: "Georgia", android: "serif", default: "serif" }),
  },
  {
    id: "handwriting",
    label: "손글씨체",
    desc: "Nanum Pen Script — 가독성 좋은 손글씨 느낌",
    fontFamily: Platform.select({
      ios: "Noteworthy",
      android: "casual",
      default: "cursive",
    }),
  },
];

export function getFontFamily(variant: FontVariant): string | undefined {
  return FONT_OPTIONS.find((f) => f.id === variant)?.fontFamily;
}
