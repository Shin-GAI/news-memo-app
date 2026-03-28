import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  Linking,
  Share,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useMemos } from "@/hooks/use-memos";
import { useMemoSimilarity } from "@/hooks/use-memo-similarity";
import type { Memo, Platform as MemoPlat } from "@/shared/types";

const PLATFORM_CONFIG: Record<MemoPlat, { label: string; color: string; icon: string; maxChars: number; desc: string }> = {
  linkedin: { label: "LinkedIn", color: "#0A66C2", icon: "text.bubble", maxChars: 3000, desc: "전문적 네트워크" },
  twitter: { label: "Twitter / X", color: "#1DA1F2", icon: "paperplane.fill", maxChars: 280, desc: "짧고 임팩트 있게" },
  general: { label: "일반 메모", color: "#34C759", icon: "doc.on.doc", maxChars: 1000, desc: "자유로운 메모" },
};

const CATEGORY_COLORS: Record<string, string> = {
  기술: "#5856D6",
  경제: "#FF9500",
  사회: "#34C759",
  정치: "#FF3B30",
  문화: "#FF2D55",
  과학: "#007AFF",
  스포츠: "#FF6B00",
};

function getCategoryColor(major: string): string {
  return CATEGORY_COLORS[major] ?? "#8E8E93";
}

function SectionLabel({ icon, label, color, colors }: {
  icon: string;
  label: string;
  color?: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={sectionStyles.row}>
      <IconSymbol name={icon as never} size={14} color={color ?? colors.primary} />
      <Text style={[sectionStyles.label, { color: color ?? colors.primary }]}>{label}</Text>
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  label: { fontSize: 13, fontWeight: "600", letterSpacing: -0.1 },
});

export default function MemoDetailScreen() {
  const colors = useColors();
  const router = useRouter();
  const { id, isNew } = useLocalSearchParams<{ id: string; isNew?: string }>();
  const { memos, updateMemo, deleteMemo } = useMemos();

  const [memo, setMemo] = useState<Memo | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<MemoPlat>("linkedin");
  const [editingText, setEditingText] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [userNotes, setUserNotes] = useState<string>("");
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const { relatedMemos } = useMemoSimilarity(memos, id);

  useEffect(() => {
    const found = memos.find((m) => m.id === id);
    if (found) {
      setMemo(found);
      const firstPlatform = found.memos[0]?.platform ?? "linkedin";
      setSelectedPlatform(firstPlatform);
      setEditingText(found.memos.find((m) => m.platform === firstPlatform)?.text ?? "");
      setUserNotes(found.userNotes ?? "");
    }
  }, [id, memos]);

  const getCurrentMemoText = useCallback((): string => {
    if (!memo) return "";
    return memo.memos.find((m) => m.platform === selectedPlatform)?.text ?? "";
  }, [memo, selectedPlatform]);

  const handleSaveUserNotes = async () => {
    if (!memo) return;
    const updated = { ...memo, userNotes };
    setMemo(updated);
    await updateMemo(memo.id, updated);
    setIsEditingNotes(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handlePlatformChange = (platform: MemoPlat) => {
    if (isEditing && memo) {
      const updatedMemos = memo.memos.map((m) =>
        m.platform === selectedPlatform ? { ...m, text: editingText } : m
      );
      const updatedMemo = { ...memo, memos: updatedMemos };
      setMemo(updatedMemo);
      updateMemo(memo.id, { memos: updatedMemos });
    }
    setSelectedPlatform(platform);
    setEditingText(memo?.memos.find((m) => m.platform === platform)?.text ?? "");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleCopy = async () => {
    const text = isEditing ? editingText : getCurrentMemoText();
    await Clipboard.setStringAsync(text);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleShare = async () => {
    const text = isEditing ? editingText : getCurrentMemoText();
    try {
      await Share.share({ message: text });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.error("[MemoDetail] Share error:", error);
    }
  };

  const handleSaveEdit = async () => {
    if (!memo) return;
    const updatedMemos = memo.memos.map((m) =>
      m.platform === selectedPlatform ? { ...m, text: editingText } : m
    );
    const success = await updateMemo(memo.id, { memos: updatedMemos });
    if (success) {
      setMemo({ ...memo, memos: updatedMemos });
      setIsEditing(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleDelete = () => {
    Alert.alert("메모 삭제", "이 메모를 삭제하시겠습니까?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          if (memo) {
            await deleteMemo(memo.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.back();
          }
        },
      },
    ]);
  };

  const handleOpenUrl = () => {
    if (memo?.articleUrl) Linking.openURL(memo.articleUrl);
  };

  if (!memo) {
    return (
      <ScreenContainer>
        <View style={styles.notFound}>
          <Text style={[styles.notFoundText, { color: colors.muted }]}>메모를 찾을 수 없습니다.</Text>
          <Pressable onPress={() => router.back()}>
            <Text style={[styles.backLink, { color: colors.primary }]}>돌아가기</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  const config = PLATFORM_CONFIG[selectedPlatform];
  const currentText = isEditing ? editingText : getCurrentMemoText();
  const charCount = currentText.length;
  const isOverLimit = charCount > config.maxChars;
  const categoryColor = memo.category?.major ? getCategoryColor(memo.category.major) : colors.muted;

  const createdDate = new Date(memo.createdAt);
  const dateStr = `${createdDate.getFullYear()}.${String(createdDate.getMonth() + 1).padStart(2, "0")}.${String(createdDate.getDate()).padStart(2, "0")} ${String(createdDate.getHours()).padStart(2, "0")}:${String(createdDate.getMinutes()).padStart(2, "0")}`;

  return (
    <ScreenContainer containerClassName="bg-background">
      {/* Navigation Header */}
      <View style={[styles.navHeader, { borderBottomColor: colors.border + "80" }]}>
        <Pressable
          onPress={() => {
            if (isEditing) {
              Alert.alert("편집 취소", "변경사항을 저장하지 않고 나가시겠습니까?", [
                { text: "계속 편집", style: "cancel" },
                { text: "나가기", onPress: () => { setIsEditing(false); router.back(); } },
              ]);
            } else {
              router.back();
            }
          }}
          style={({ pressed }) => [styles.navBackBtn, pressed && { opacity: 0.5 }]}
        >
          <IconSymbol name="chevron.left" size={18} color={colors.primary} />
          <Text style={[styles.navBackText, { color: colors.primary }]}>뒤로</Text>
        </Pressable>

        <Text style={[styles.navTitle, { color: colors.foreground }]}>
          {isNew === "true" ? "새 메모" : "메모 상세"}
        </Text>

        <View style={styles.navActions}>
          {isEditing ? (
            <Pressable
              onPress={handleSaveEdit}
              style={({ pressed }) => [
                styles.navSaveBtn,
                { backgroundColor: colors.primary },
                pressed && { opacity: 0.8 },
              ]}
            >
              <Text style={styles.navSaveBtnText}>저장</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={handleDelete}
              style={({ pressed }) => [styles.navIconBtn, pressed && { opacity: 0.5 }]}
            >
              <IconSymbol name="trash" size={17} color={colors.error} />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Meta row: category + date */}
        <View style={styles.metaRow}>
          {memo.category?.major && (
            <View style={[styles.categoryChip, { backgroundColor: categoryColor + "15" }]}>
              <View style={[styles.categoryDot, { backgroundColor: categoryColor }]} />
              <Text style={[styles.categoryChipText, { color: categoryColor }]}>
                {memo.category.major}
                {memo.category.mid ? ` · ${memo.category.mid}` : ""}
                {memo.category.minor ? ` · ${memo.category.minor}` : ""}
              </Text>
            </View>
          )}
          <Text style={[styles.metaDate, { color: colors.muted }]}>{dateStr}</Text>
        </View>

        {/* ── 뉴스 출처 ── */}
        <View style={styles.section}>
          <SectionLabel icon="link" label="뉴스 출처" colors={colors} />
          <Pressable
            onPress={handleOpenUrl}
            style={({ pressed }) => [
              styles.articleCard,
              { backgroundColor: colors.surface },
              pressed && { opacity: 0.78 },
            ]}
          >
            <Text style={[styles.articleTitle, { color: colors.foreground }]} numberOfLines={3}>
              {memo.articleTitle}
            </Text>
            <View style={styles.articleDomainRow}>
              <View style={[styles.domainIconBg, { backgroundColor: colors.primary + "15" }]}>
                <IconSymbol name="globe" size={11} color={colors.primary} />
              </View>
              <Text style={[styles.articleDomain, { color: colors.primary }]} numberOfLines={1}>
                {memo.articleUrl.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]}
              </Text>
              <IconSymbol name="arrow.up.right" size={11} color={colors.primary} />
            </View>
          </Pressable>
        </View>

        {/* ── AI 핵심 요약 ── */}
        <View style={styles.section}>
          <SectionLabel icon="sparkles" label="AI 핵심 요약" colors={colors} />
          <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.summaryText, { color: colors.foreground }]}>{memo.summary}</Text>
          </View>
        </View>

        {/* ── 소셜미디어 드래프트 ── */}
        <View style={styles.section}>
          <SectionLabel icon="square.and.arrow.up" label="소셜미디어 드래프트" colors={colors} />

          {/* Platform Tabs — iOS Segmented Control 스타일 */}
          <View style={[styles.segmentedControl, { backgroundColor: colors.border + "80" }]}>
            {(Object.keys(PLATFORM_CONFIG) as MemoPlat[]).map((platform) => {
              const pc = PLATFORM_CONFIG[platform];
              const isSelected = selectedPlatform === platform;
              return (
                <Pressable
                  key={platform}
                  onPress={() => handlePlatformChange(platform)}
                  style={({ pressed }) => [
                    styles.segmentTab,
                    isSelected && [
                      styles.segmentTabActive,
                      { backgroundColor: colors.surface },
                    ],
                    pressed && !isSelected && { opacity: 0.7 },
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentTabText,
                      { color: isSelected ? colors.foreground : colors.muted },
                      isSelected && { fontWeight: "600" },
                    ]}
                    numberOfLines={1}
                  >
                    {pc.label}
                  </Text>
                  {isSelected && (
                    <Text style={[styles.segmentTabDesc, { color: colors.muted }]}>
                      {pc.desc}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>

          {/* Draft Card */}
          <View
            style={[
              styles.draftCard,
              {
                backgroundColor: colors.surface,
                borderColor: isOverLimit ? colors.error : isEditing ? config.color : "transparent",
                borderWidth: isEditing || isOverLimit ? 1.5 : 0,
              },
            ]}
          >
            {/* Draft Header */}
            <View style={styles.draftHeader}>
              <View style={styles.draftHeaderLeft}>
                <View style={[styles.platformDot, { backgroundColor: config.color }]} />
                <Text style={[styles.draftPlatformLabel, { color: colors.muted }]}>
                  {config.label}
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  if (!isEditing) {
                    setEditingText(getCurrentMemoText());
                    setIsEditing(true);
                  } else {
                    setIsEditing(false);
                    setEditingText(getCurrentMemoText());
                  }
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={({ pressed }) => [
                  styles.editToggleBtn,
                  {
                    backgroundColor: isEditing
                      ? colors.error + "12"
                      : colors.primary + "12",
                  },
                  pressed && { opacity: 0.6 },
                ]}
              >
                <IconSymbol
                  name={isEditing ? "xmark" : "pencil"}
                  size={11}
                  color={isEditing ? colors.error : colors.primary}
                />
                <Text
                  style={[
                    styles.editToggleBtnText,
                    { color: isEditing ? colors.error : colors.primary },
                  ]}
                >
                  {isEditing ? "취소" : "편집"}
                </Text>
              </Pressable>
            </View>

            {/* Text area */}
            {isEditing ? (
              <TextInput
                value={editingText}
                onChangeText={setEditingText}
                multiline
                style={[styles.textInput, { color: colors.foreground }]}
                placeholderTextColor={colors.muted}
                autoFocus
                returnKeyType="default"
              />
            ) : (
              <Text style={[styles.draftText, { color: colors.foreground }]}>{currentText}</Text>
            )}

            {/* Char count */}
            <View style={styles.draftFooter}>
              <View style={[styles.charBar, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.charBarFill,
                    {
                      width: `${Math.min((charCount / config.maxChars) * 100, 100)}%` as any,
                      backgroundColor: isOverLimit ? colors.error : config.color,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.charCount, { color: isOverLimit ? colors.error : colors.muted }]}>
                {charCount.toLocaleString()} / {config.maxChars.toLocaleString()}자
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <Pressable
              onPress={handleCopy}
              style={({ pressed }) => [
                styles.actionBtnSecondary,
                {
                  backgroundColor: copySuccess ? colors.success : colors.surface,
                },
                pressed && { opacity: 0.8 },
              ]}
            >
              <IconSymbol
                name={copySuccess ? "checkmark" : "doc.on.doc"}
                size={15}
                color={copySuccess ? "#fff" : colors.foreground}
              />
              <Text
                style={[
                  styles.actionBtnSecondaryText,
                  { color: copySuccess ? "#fff" : colors.foreground },
                ]}
              >
                {copySuccess ? "복사됨!" : "복사"}
              </Text>
            </Pressable>

            <Pressable
              onPress={handleShare}
              style={({ pressed }) => [
                styles.actionBtnPrimary,
                { backgroundColor: config.color },
                pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
              ]}
            >
              <IconSymbol name="square.and.arrow.up" size={15} color="#fff" />
              <Text style={styles.actionBtnPrimaryText}>{config.label}에 공유</Text>
            </Pressable>
          </View>
        </View>

        {/* ── 내 노트 ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <SectionLabel icon="note.text" label="내 노트" color={colors.muted} colors={colors} />
            {!isEditingNotes ? (
              <Pressable
                onPress={() => setIsEditingNotes(true)}
                style={({ pressed }) => [styles.smallEditBtn, pressed && { opacity: 0.5 }]}
              >
                <IconSymbol name="pencil" size={11} color={colors.primary} />
                <Text style={[styles.smallEditBtnText, { color: colors.primary }]}>편집</Text>
              </Pressable>
            ) : (
              <View style={styles.notesEditActions}>
                <Pressable
                  onPress={() => {
                    setIsEditingNotes(false);
                    setUserNotes(memo.userNotes ?? "");
                  }}
                  style={({ pressed }) => [styles.smallEditBtn, pressed && { opacity: 0.5 }]}
                >
                  <Text style={[styles.smallEditBtnText, { color: colors.muted }]}>취소</Text>
                </Pressable>
                <Pressable
                  onPress={handleSaveUserNotes}
                  style={({ pressed }) => [styles.smallEditBtn, pressed && { opacity: 0.5 }]}
                >
                  <Text style={[styles.smallEditBtnText, { color: colors.primary, fontWeight: "700" }]}>
                    저장
                  </Text>
                </Pressable>
              </View>
            )}
          </View>

          <View
            style={[
              styles.notesCard,
              {
                backgroundColor: colors.surface,
                borderColor: isEditingNotes ? colors.primary : "transparent",
                borderWidth: isEditingNotes ? 1.5 : 0,
              },
            ]}
          >
            {isEditingNotes ? (
              <TextInput
                value={userNotes}
                onChangeText={setUserNotes}
                multiline
                placeholder="메모를 추가하세요..."
                placeholderTextColor={colors.muted}
                style={[styles.notesInput, { color: colors.foreground }]}
                autoFocus
              />
            ) : (
              <Text
                style={[
                  styles.notesText,
                  { color: userNotes ? colors.foreground : colors.muted },
                ]}
              >
                {userNotes || "메모를 추가하려면 편집을 눌러주세요"}
              </Text>
            )}
          </View>
        </View>

        {/* ── 연관 메모 ── */}
        {relatedMemos.length > 0 && (
          <View style={styles.section}>
            <SectionLabel icon="link.circle" label="연관 메모" color={colors.muted} colors={colors} />
            <View style={styles.relatedList}>
              {relatedMemos.map((related) => (
                <Pressable
                  key={related.id}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push({ pathname: "/memo/[id]" as never, params: { id: related.id } });
                  }}
                  style={({ pressed }) => [
                    styles.relatedCard,
                    { backgroundColor: colors.surface },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text style={[styles.relatedTitle, { color: colors.foreground }]} numberOfLines={2}>
                    {related.articleTitle}
                  </Text>
                  {related.category?.major && (
                    <Text style={[styles.relatedCategory, { color: getCategoryColor(related.category.major) }]}>
                      {related.category.major}
                    </Text>
                  )}
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  notFound: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  notFoundText: { fontSize: 16 },
  backLink: { fontSize: 16, fontWeight: "600" },

  // ── Nav Header ────────────────────────────────────────────────────────────
  navHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navBackBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    minWidth: 64,
  },
  navBackText: {
    fontSize: 16,
    fontWeight: "500",
  },
  navTitle: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.3,
  },
  navActions: {
    minWidth: 64,
    alignItems: "flex-end",
  },
  navSaveBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  navSaveBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  navIconBtn: {
    padding: 4,
  },

  // ── Scroll Content ────────────────────────────────────────────────────────
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 52,
    gap: 24,
  },

  // ── Meta Row ──────────────────────────────────────────────────────────────
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  categoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  metaDate: {
    fontSize: 12,
    fontWeight: "400",
  },

  // ── Section ───────────────────────────────────────────────────────────────
  section: {
    gap: 10,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  // ── Article Card ──────────────────────────────────────────────────────────
  articleCard: {
    borderRadius: 14,
    padding: 16,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  articleTitle: {
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 23,
    letterSpacing: -0.3,
  },
  articleDomainRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  domainIconBg: {
    width: 20,
    height: 20,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  articleDomain: {
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },

  // ── Summary Card ──────────────────────────────────────────────────────────
  summaryCard: {
    borderRadius: 14,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  summaryText: {
    fontSize: 15,
    lineHeight: 24,
  },

  // ── Segmented Control ─────────────────────────────────────────────────────
  segmentedControl: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 3,
    gap: 2,
  },
  segmentTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 9,
    alignItems: "center",
    gap: 2,
  },
  segmentTabActive: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentTabText: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
  },
  segmentTabDesc: {
    fontSize: 9,
    textAlign: "center",
  },

  // ── Draft Card ────────────────────────────────────────────────────────────
  draftCard: {
    borderRadius: 14,
    padding: 16,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  draftHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  draftHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  platformDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  draftPlatformLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  editToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  editToggleBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },
  draftText: {
    fontSize: 15,
    lineHeight: 23,
    minHeight: 80,
  },
  textInput: {
    fontSize: 15,
    lineHeight: 23,
    minHeight: 120,
    textAlignVertical: "top",
    padding: 0,
  },
  draftFooter: {
    gap: 6,
  },
  charBar: {
    height: 2,
    borderRadius: 1,
    overflow: "hidden",
  },
  charBarFill: {
    height: 2,
    borderRadius: 1,
  },
  charCount: {
    fontSize: 11,
    textAlign: "right",
  },

  // ── Action Buttons ────────────────────────────────────────────────────────
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionBtnSecondary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  actionBtnSecondaryText: {
    fontSize: 14,
    fontWeight: "600",
  },
  actionBtnPrimary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 15,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  actionBtnPrimaryText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },

  // ── Notes ─────────────────────────────────────────────────────────────────
  smallEditBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  smallEditBtnText: {
    fontSize: 13,
    fontWeight: "500",
  },
  notesEditActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  notesCard: {
    borderRadius: 14,
    padding: 16,
    minHeight: 72,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  notesText: {
    fontSize: 15,
    lineHeight: 23,
  },
  notesInput: {
    fontSize: 15,
    lineHeight: 23,
    minHeight: 80,
    textAlignVertical: "top",
    padding: 0,
  },

  // ── Related Memos ─────────────────────────────────────────────────────────
  relatedList: {
    gap: 8,
  },
  relatedCard: {
    borderRadius: 12,
    padding: 14,
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  relatedTitle: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
  },
  relatedCategory: {
    fontSize: 11,
    fontWeight: "600",
  },
});
