import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  ScrollView,
  Switch,
} from "react-native";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useSettings } from "@/hooks/use-settings";
import { useMemos } from "@/hooks/use-memos";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SETTINGS_KEY = "newsmemo_settings";

interface Settings {
  language: "ko" | "en";
  defaultPlatform: "linkedin" | "twitter" | "general";
}

const DEFAULT_SETTINGS: Settings = {
  language: "ko",
  defaultPlatform: "linkedin",
};

function SettingsRow({
  icon,
  label,
  value,
  onPress,
  colors,
  showChevron = true,
  danger = false,
}: {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  colors: ReturnType<typeof useColors>;
  showChevron?: boolean;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.settingsRow,
        { borderBottomColor: colors.border },
        pressed && onPress ? { backgroundColor: colors.border + "40" } : {},
      ]}
    >
      <View style={[styles.rowIcon, { backgroundColor: (danger ? colors.error : colors.primary) + "15" }]}>
        <IconSymbol name={icon as never} size={18} color={danger ? colors.error : colors.primary} />
      </View>
      <Text style={[styles.rowLabel, { color: danger ? colors.error : colors.foreground }]}>{label}</Text>
      <View style={styles.rowRight}>
        {value && <Text style={[styles.rowValue, { color: colors.muted }]}>{value}</Text>}
        {showChevron && onPress && (
          <IconSymbol name="chevron.right" size={16} color={colors.muted} />
        )}
      </View>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const { memos, clearAllMemos } = useMemos();
  const { settings: appSettings, updateSummaryLength, updateSummaryTone } = useSettings();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

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
    const newLang = settings.language === "ko" ? "en" : "ko";
    setSettings((prev) => ({ ...prev, language: newLang }));
    AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...settings, language: newLang }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <ScreenContainer containerClassName="bg-background">
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>설정</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* App Info Card */}
        <View style={[styles.appCard, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "30" }]}>
          <View style={[styles.appIconBg, { backgroundColor: colors.primary }]}>
            <IconSymbol name="sparkles" size={24} color="#fff" />
          </View>
          <View style={styles.appInfo}>
            <Text style={[styles.appName, { color: colors.foreground }]}>NewsMemo</Text>
            <Text style={[styles.appDesc, { color: colors.muted }]}>
              AI 뉴스 요약 & SNS 공유
            </Text>
          </View>
          <Text style={[styles.appVersion, { color: colors.muted }]}>v1.0.0</Text>
        </View>

        {/* 사용 현황 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>사용 현황</Text>
          <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.primary }]}>{memos.length}</Text>
                <Text style={[styles.statLabel, { color: colors.muted }]}>저장된 메모</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.primary }]}>
                  {memos.filter((m) => m.memos.some((mm) => mm.platform === "linkedin")).length}
                </Text>
                <Text style={[styles.statLabel, { color: colors.muted }]}>LinkedIn 메모</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.primary }]}>
                  {memos.filter((m) => m.memos.some((mm) => mm.platform === "twitter")).length}
                </Text>
                <Text style={[styles.statLabel, { color: colors.muted }]}>Twitter 메모</Text>
              </View>
            </View>
          </View>
        </View>

        {/* AI 설정 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>AI 설정</Text>
          <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.settingsRow, { borderBottomColor: colors.border }]}>
              <View style={[styles.rowIcon, { backgroundColor: colors.primary + "15" }]}>
                <IconSymbol name="text.bubble" size={18} color={colors.primary} />
              </View>
              <Text style={[styles.rowLabel, { color: colors.foreground }]}>요약 언어</Text>
              <View style={styles.rowRight}>
                <Text style={[styles.rowValue, { color: colors.muted }]}>
                  {settings.language === "ko" ? "한국어" : "English"}
                </Text>
                <Switch
                  value={settings.language === "en"}
                  onValueChange={handleLanguageToggle}
                  trackColor={{ false: colors.border, true: colors.primary + "80" }}
                  thumbColor={settings.language === "en" ? colors.primary : colors.muted}
                />
              </View>
            </View>
          </View>
        </View>

        {/* 사용 방법 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>사용 방법</Text>
          <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.guideContainer}>
              <Text style={[styles.guideTitle, { color: colors.foreground }]}>
                크롬에서 기사 공유하기
              </Text>
              <Text style={[styles.guideText, { color: colors.muted }]}>
                크롬 브라우저에서 뉴스 기사를 읽다가 주소창 옆의 공유 버튼(⋮)을 탭하세요.
                공유 시트에서 <Text style={{ color: colors.primary, fontWeight: "600" }}>NewsMemo</Text>를 선택하면
                AI가 자동으로 기사를 분석하고 LinkedIn, Twitter/X 등에 맞는 메모를 생성해드립니다.
              </Text>
              <View style={[styles.tipBox, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "30" }]}>
                <IconSymbol name="info.circle" size={14} color={colors.primary} />
                <Text style={[styles.tipText, { color: colors.primary }]}>
                  앱을 처음 사용할 때는 Android 공유 목록에서 NewsMemo를 찾아 선택하세요.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* 데이터 관리 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>데이터 관리</Text>
          <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <SettingsRow
              icon="trash.fill"
              label="모든 메모 삭제"
              onPress={handleClearMemos}
              colors={colors}
              showChevron={false}
              danger
            />
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
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 20,
  },
  appCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  appIconBg: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  appInfo: {
    flex: 1,
    gap: 2,
  },
  appName: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  appDesc: {
    fontSize: 13,
  },
  appVersion: {
    fontSize: 12,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    paddingHorizontal: 4,
  },
  sectionCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  statsRow: {
    flexDirection: "row",
    padding: 16,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    textAlign: "center",
  },
  statDivider: {
    width: 1,
    marginVertical: 4,
  },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 0.5,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rowValue: {
    fontSize: 14,
  },
  guideContainer: {
    padding: 14,
    gap: 10,
  },
  guideTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  guideText: {
    fontSize: 13,
    lineHeight: 20,
  },
  tipBox: {
    flexDirection: "row",
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "flex-start",
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
});
