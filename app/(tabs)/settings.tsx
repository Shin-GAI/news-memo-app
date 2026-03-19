import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  ScrollView,
  Switch,
  ActivityIndicator,
} from "react-native";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useSettings } from "@/hooks/use-settings";
import { useMemos } from "@/hooks/use-memos";
import { useOnDeviceAIAvailability } from "@/hooks/use-on-device-ai";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AIEngineType } from "@/shared/types";

const SETTINGS_KEY = "newsmemo_settings";

interface LocalSettings {
  language: "ko" | "en";
}

const DEFAULT_LOCAL: LocalSettings = { language: "ko" };

// ── Engine option definition ────────────────────────────────────────────────

interface EngineOption {
  id: AIEngineType;
  label: string;
  desc: string;
  requirement: string;
  color: string;
  icon: string;
}

const ENGINE_OPTIONS: EngineOption[] = [
  {
    id: "cloud",
    label: "클라우드 AI",
    desc: "Gemini 2.5 Flash (원격 서버)",
    requirement: "인터넷 연결 필요",
    color: "#4F86F7",
    icon: "cloud.fill",
  },
  {
    id: "google_edge",
    label: "Google AI Edge",
    desc: "Gemini Nano (기기 내 처리)",
    requirement: "Pixel 8+ · Android 14+",
    color: "#34A853",
    icon: "cpu",
  },
  {
    id: "samsung_edge",
    label: "Samsung Galaxy AI",
    desc: "Galaxy AI (기기 내 처리)",
    requirement: "Galaxy S24+ · One UI 6.1+",
    color: "#1428A0",
    icon: "cpu",
  },
];

// ── Sub-components ───────────────────────────────────────────────────────────

function EngineCard({
  option,
  selected,
  available,
  checking,
  onSelect,
  colors,
}: {
  option: EngineOption;
  selected: boolean;
  available: boolean;
  checking: boolean;
  onSelect: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const isCloud = option.id === "cloud";
  const canSelect = isCloud || available;

  const statusBadge = () => {
    if (isCloud) return null;
    if (checking) {
      return (
        <View style={[styles.statusBadge, { backgroundColor: colors.border }]}>
          <ActivityIndicator size={10} color={colors.muted} />
          <Text style={[styles.statusBadgeText, { color: colors.muted }]}>확인 중</Text>
        </View>
      );
    }
    return (
      <View
        style={[
          styles.statusBadge,
          { backgroundColor: available ? "#34A85322" : colors.error + "18" },
        ]}
      >
        <View
          style={[
            styles.statusDot,
            { backgroundColor: available ? "#34A853" : colors.error },
          ]}
        />
        <Text
          style={[
            styles.statusBadgeText,
            { color: available ? "#34A853" : colors.error },
          ]}
        >
          {available ? "사용 가능" : "지원 안 됨"}
        </Text>
      </View>
    );
  };

  return (
    <Pressable
      onPress={() => {
        if (!canSelect) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          Alert.alert(
            `${option.label} 사용 불가`,
            `이 기기는 ${option.label}를 지원하지 않습니다.\n\n필요 조건: ${option.requirement}`,
            [{ text: "확인" }]
          );
          return;
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onSelect();
      }}
      style={({ pressed }) => [
        styles.engineCard,
        {
          backgroundColor: selected
            ? option.color + "12"
            : colors.surface,
          borderColor: selected ? option.color : colors.border,
          opacity: !canSelect && !checking ? 0.55 : pressed ? 0.8 : 1,
        },
      ]}
    >
      {/* Left icon */}
      <View style={[styles.engineIconBg, { backgroundColor: option.color + "20" }]}>
        <IconSymbol name={option.icon as never} size={22} color={option.color} />
      </View>

      {/* Text */}
      <View style={styles.engineTextBlock}>
        <View style={styles.engineLabelRow}>
          <Text style={[styles.engineLabel, { color: colors.foreground }]}>{option.label}</Text>
          {statusBadge()}
        </View>
        <Text style={[styles.engineDesc, { color: colors.muted }]}>{option.desc}</Text>
        <Text style={[styles.engineReq, { color: colors.muted }]}>{option.requirement}</Text>
      </View>

      {/* Radio */}
      <View
        style={[
          styles.radioOuter,
          { borderColor: selected ? option.color : colors.border },
        ]}
      >
        {selected && (
          <View style={[styles.radioInner, { backgroundColor: option.color }]} />
        )}
      </View>
    </Pressable>
  );
}

// ── Main screen ──────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const colors = useColors();
  const { memos, clearAllMemos } = useMemos();
  const { settings, updateSummaryLength, updateSummaryTone, updateAIEngine } = useSettings();
  const availability = useOnDeviceAIAvailability();
  const [localSettings, setLocalSettings] = useState<LocalSettings>(DEFAULT_LOCAL);

  const handleClearMemos = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "모든 메모 삭제",
      `저장된 메모 ${memos.length}개를 모두 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`,
      [
        { text: "취소", style: "cancel" },
        {
          text: "모두 삭제",
          style: "destructive",
          onPress: async () => {
            await clearAllMemos();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const handleLanguageToggle = () => {
    const newLang = localSettings.language === "ko" ? "en" : "ko";
    setLocalSettings((prev) => ({ ...prev, language: newLang }));
    AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...localSettings, language: newLang }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const engineAvailable = (id: AIEngineType): boolean => {
    if (id === "cloud") return true;
    return availability[id] === true;
  };

  const engineChecking = (id: AIEngineType): boolean => {
    if (id === "cloud") return false;
    return availability[id] === null;
  };

  const currentEngine = settings.aiEngine ?? "cloud";

  return (
    <ScreenContainer containerClassName="bg-background">
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>설정</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* App info */}
        <View style={[styles.appCard, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "30" }]}>
          <View style={[styles.appIconBg, { backgroundColor: colors.primary }]}>
            <IconSymbol name="sparkles" size={24} color="#fff" />
          </View>
          <View style={styles.appInfo}>
            <Text style={[styles.appName, { color: colors.foreground }]}>뉴스쉐어</Text>
            <Text style={[styles.appDesc, { color: colors.muted }]}>AI 뉴스 요약 & SNS 공유</Text>
          </View>
          <Text style={[styles.appVersion, { color: colors.muted }]}>v1.0.0</Text>
        </View>

        {/* 사용 현황 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>사용 현황</Text>
          <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.statsRow}>
              {[
                { value: memos.length, label: "저장된 메모" },
                { value: memos.filter((m) => m.memos.some((mm) => mm.platform === "linkedin")).length, label: "LinkedIn" },
                { value: memos.filter((m) => m.memos.some((mm) => mm.platform === "twitter")).length, label: "Twitter" },
              ].map((stat, i) => (
                <React.Fragment key={stat.label}>
                  {i > 0 && <View style={[styles.statDivider, { backgroundColor: colors.border }]} />}
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: colors.primary }]}>{stat.value}</Text>
                    <Text style={[styles.statLabel, { color: colors.muted }]}>{stat.label}</Text>
                  </View>
                </React.Fragment>
              ))}
            </View>
          </View>
        </View>

        {/* ── AI 엔진 선택 ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>AI 엔진</Text>
          <Text style={[styles.sectionDesc, { color: colors.muted }]}>
            요약에 사용할 AI 엔진을 선택하세요. 온디바이스 AI는 인터넷 없이 기기 내에서 처리되며
            개인정보 보호에 유리합니다.
          </Text>
          <View style={styles.engineList}>
            {ENGINE_OPTIONS.map((opt) => (
              <EngineCard
                key={opt.id}
                option={opt}
                selected={currentEngine === opt.id}
                available={engineAvailable(opt.id)}
                checking={engineChecking(opt.id)}
                onSelect={() => updateAIEngine(opt.id)}
                colors={colors}
              />
            ))}
          </View>

          {/* On-device AI note */}
          {currentEngine !== "cloud" && (
            <View style={[styles.infoBox, { backgroundColor: colors.primary + "0D", borderColor: colors.primary + "30" }]}>
              <IconSymbol name="info.circle.fill" size={14} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.primary }]}>
                온디바이스 AI는 첫 실행 시 모델 로딩에 시간이 걸릴 수 있습니다.
                지원 기기에서 실제 사용하려면 앱 재빌드가 필요합니다.
              </Text>
            </View>
          )}
        </View>

        {/* AI 설정 (요약 길이·어조) */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>요약 설정</Text>
          <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>

            {/* 요약 길이 */}
            <View style={[styles.settingsRow, { borderBottomColor: colors.border }]}>
              <View style={[styles.rowIcon, { backgroundColor: colors.primary + "15" }]}>
                <IconSymbol name="text.alignleft" size={18} color={colors.primary} />
              </View>
              <Text style={[styles.rowLabel, { color: colors.foreground }]}>요약 길이</Text>
              <View style={styles.segmentGroup}>
                {(["short", "medium", "long"] as const).map((len) => (
                  <Pressable
                    key={len}
                    onPress={() => { updateSummaryLength(len); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                    style={[
                      styles.segment,
                      { borderColor: colors.border },
                      settings.summaryLength === len && { backgroundColor: colors.primary, borderColor: colors.primary },
                    ]}
                  >
                    <Text style={[styles.segmentText, { color: settings.summaryLength === len ? "#fff" : colors.muted }]}>
                      {len === "short" ? "짧게" : len === "medium" ? "보통" : "길게"}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* 요약 어조 */}
            <View style={[styles.settingsRow, { borderBottomColor: colors.border }]}>
              <View style={[styles.rowIcon, { backgroundColor: colors.primary + "15" }]}>
                <IconSymbol name="person.fill" size={18} color={colors.primary} />
              </View>
              <Text style={[styles.rowLabel, { color: colors.foreground }]}>어조</Text>
              <View style={styles.segmentGroup}>
                {(["expert", "casual"] as const).map((tone) => (
                  <Pressable
                    key={tone}
                    onPress={() => { updateSummaryTone(tone); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                    style={[
                      styles.segment,
                      { borderColor: colors.border },
                      settings.summaryTone === tone && { backgroundColor: colors.primary, borderColor: colors.primary },
                    ]}
                  >
                    <Text style={[styles.segmentText, { color: settings.summaryTone === tone ? "#fff" : colors.muted }]}>
                      {tone === "expert" ? "전문가" : "친근하게"}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* 언어 */}
            <View style={[styles.settingsRow, { borderBottomColor: "transparent" }]}>
              <View style={[styles.rowIcon, { backgroundColor: colors.primary + "15" }]}>
                <IconSymbol name="text.bubble" size={18} color={colors.primary} />
              </View>
              <Text style={[styles.rowLabel, { color: colors.foreground }]}>요약 언어</Text>
              <View style={styles.rowRight}>
                <Text style={[styles.rowValue, { color: colors.muted }]}>
                  {localSettings.language === "ko" ? "한국어" : "English"}
                </Text>
                <Switch
                  value={localSettings.language === "en"}
                  onValueChange={handleLanguageToggle}
                  trackColor={{ false: colors.border, true: colors.primary + "80" }}
                  thumbColor={localSettings.language === "en" ? colors.primary : colors.muted}
                />
              </View>
            </View>
          </View>
        </View>

        {/* 데이터 관리 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>데이터 관리</Text>
          <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Pressable
              onPress={handleClearMemos}
              style={({ pressed }) => [
                styles.settingsRow,
                { borderBottomColor: "transparent" },
                pressed && { backgroundColor: colors.error + "10" },
              ]}
            >
              <View style={[styles.rowIcon, { backgroundColor: colors.error + "15" }]}>
                <IconSymbol name="trash.fill" size={18} color={colors.error} />
              </View>
              <Text style={[styles.rowLabel, { color: colors.error }]}>모든 메모 삭제</Text>
            </Pressable>
          </View>
        </View>

      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  headerTitle: { fontSize: 20, fontWeight: "700", letterSpacing: -0.5 },
  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40, gap: 20 },

  // App card
  appCard: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 16, borderWidth: 1 },
  appIconBg: { width: 48, height: 48, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  appInfo: { flex: 1, gap: 2 },
  appName: { fontSize: 17, fontWeight: "700", letterSpacing: -0.3 },
  appDesc: { fontSize: 13 },
  appVersion: { fontSize: 12 },

  // Sections
  section: { gap: 8 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    paddingHorizontal: 4,
  },
  sectionDesc: { fontSize: 12, lineHeight: 18, paddingHorizontal: 4 },
  sectionCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },

  // Stats
  statsRow: { flexDirection: "row", padding: 16 },
  statItem: { flex: 1, alignItems: "center", gap: 4 },
  statValue: { fontSize: 24, fontWeight: "700", letterSpacing: -0.5 },
  statLabel: { fontSize: 11, textAlign: "center" },
  statDivider: { width: 1, marginVertical: 4 },

  // Engine list
  engineList: { gap: 10 },
  engineCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  engineIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  engineTextBlock: { flex: 1, gap: 2 },
  engineLabelRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  engineLabel: { fontSize: 15, fontWeight: "600", letterSpacing: -0.2 },
  engineDesc: { fontSize: 12 },
  engineReq: { fontSize: 11, marginTop: 1 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusBadgeText: { fontSize: 10, fontWeight: "600" },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  radioInner: { width: 10, height: 10, borderRadius: 5 },

  // Info box
  infoBox: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "flex-start",
    marginTop: 4,
  },
  infoText: { flex: 1, fontSize: 12, lineHeight: 18 },

  // Settings rows
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 0.5,
  },
  rowIcon: { width: 32, height: 32, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: "500" },
  rowRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  rowValue: { fontSize: 14 },

  // Segment control
  segmentGroup: { flexDirection: "row", gap: 4 },
  segment: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 7,
    borderWidth: 1,
  },
  segmentText: { fontSize: 12, fontWeight: "600" },
});
