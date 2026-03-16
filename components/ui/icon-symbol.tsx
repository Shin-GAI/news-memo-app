// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<SymbolViewProps["name"], ComponentProps<typeof MaterialIcons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * SF Symbols to Material Icons mappings for NewsMemo app.
 */
const MAPPING = {
  // Navigation
  "house.fill": "home",
  "gearshape.fill": "settings",
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  "chevron.left": "chevron-left",
  // Actions
  "square.and.arrow.up": "share",
  "doc.on.doc": "content-copy",
  "bookmark.fill": "bookmark",
  "bookmark": "bookmark-border",
  "trash": "delete",
  "trash.fill": "delete",
  "pencil": "edit",
  "plus": "add",
  "xmark": "close",
  "xmark.circle.fill": "cancel",
  "checkmark": "check",
  "checkmark.circle.fill": "check-circle",
  // Content
  "newspaper": "article",
  "newspaper.fill": "article",
  "link": "link",
  "magnifyingglass": "search",
  "sparkles": "auto-awesome",
  "brain.head.profile": "psychology",
  "text.bubble": "chat-bubble-outline",
  "clock": "schedule",
  "clock.fill": "schedule",
  // Status
  "info.circle": "info",
  "exclamationmark.triangle": "warning",
  "arrow.clockwise": "refresh",
  "arrow.left": "arrow-back",
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
