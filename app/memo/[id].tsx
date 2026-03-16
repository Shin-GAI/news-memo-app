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
import type { Memo, Platform as MemoPlat, MemoContent } from "@/shared/types";

const PLATFORM_CONFIG: Record<MemoPlat, { label: string; color: string; icon: string; maxChars: number }> = {
  linkedin: { label: "LinkedIn", color: "#0A66C2", icon: "text.bubble", maxChars: 3000 },
  twitter: { label: "Twitter/X", color: "#1DA1F2", icon: "paperplane.fill", maxChars: 280 },
  general: { label: "일반", color: "#00C896", icon: "doc.on.doc", maxChars: 1000 },
};

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

  useEffect(() => {
    const found = memos.find((m) => m.id === id);
    if (found) {
      setMemo(found);
      const firstPlatform = found.memos[0]?.platform ?? "linkedin";
      setSelectedPlatform(firstPlatform);
      setEditingText(found.memos.find((m) => m.platform === firstPlatform)?.text ?? "");
    }
  }, [id, memos]);

  const getCurrentMemoText = useCallback((): string => {
    if (!memo) return "";
    return memo.memos.find((m) => m.platform === selectedPlatform)?.text ?? "";
  }, [memo, selectedPlatform]);

  const handlePlatformChange = (platform: MemoPlat) => {
    if (isEditing && memo) {
      // Save current edits before switching
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
    if (memo?.articleUrl) {
      Linking.openURL(memo.articleUrl);
    }
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

  return (
    <ScreenContainer containerClassName="bg-background">
      {/* Navigation Header */}
      <View style={[styles.navHeader, { borderBottomColor: colors.border }]}>
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
          style={({ pressed }) => [styles.navBtn, pressed && { opacity: 0.6 }]}
        >
          <IconSymbol name="chevron.left" size={22} color={colors.primary} />
          <Text style={[styles.navBtnText, { color: colors.primary }]}>뒤로</Text>
        </Pressable>

        <Text style={[styles.navTitle, { color: colors.foreground }]}>
          {isNew === "true" ? "새 메모" : "메모"}
        </Text>

        <View style={styles.navActions}>
          {isEditing ? (
            <Pressable
              onPress={handleSaveEdit}
              style={({ pressed }) => [styles.navBtn, pressed && { opacity: 0.6 }]}
            >
              <Text style={[styles.navBtnText, { color: colors.primary, fontWeight: "700" }]}>저장</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={handleDelete}
              style={({ pressed }) => [styles.navBtn, pressed && { opacity: 0.6 }]}
            >
              <IconSymbol name="trash" size={20} color={colors.error} />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Article Info */}
        <Pressable
          onPress={handleOpenUrl}
          style={({ pressed }) => [
            styles.articleCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
            pressed && { opacity: 0.8 },
          ]}
        >
          <View style={styles.articleCardContent}>
            <Text style={[styles.articleTitle, { color: colors.foreground }]} numberOfLines={2}>
              {memo.articleTitle}
            </Text>
            <View style={styles.articleUrlRow}>
              <IconSymbol name="link" size={12} color={colors.primary} />
              <Text style={[styles.articleUrl, { color: colors.primary }]} numberOfLines={1}>
                {memo.articleUrl.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]}
              </Text>
              <IconSymbol name="chevron.right" size={12} color={colors.primary} />
            </View>
          </View>
        </Pressable>

        {/* Summary */}
        <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.summaryHeader}>
            <IconSymbol name="sparkles" size={16} color={colors.primary} />
            <Text style={[styles.summaryLabel, { color: colors.primary }]}>AI 핵심 요약</Text>
          </View>
          <Text style={[styles.summaryText, { color: colors.foreground }]}>{memo.summary}</Text>
        </View>

        {/* Platform Selector */}
        <View style={styles.platformSelector}>
          {(Object.keys(PLATFORM_CONFIG) as MemoPlat[]).map((platform) => {
            const pConfig = PLATFORM_CONFIG[platform];
            const isSelected = selectedPlatform === platform;
            return (
              <Pressable
                key={platform}
                onPress={() => handlePlatformChange(platform)}
                style={({ pressed }) => [
                  styles.platformTab,
                  {
                    backgroundColor: isSelected ? pConfig.color : colors.surface,
                    borderColor: isSelected ? pConfig.color : colors.border,
                  },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text
                  style={[
                    styles.platformTabText,
                    { color: isSelected ? "#fff" : colors.muted },
                  ]}
                >
                  {pConfig.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Memo Text */}
        <View style={[styles.memoContainer, { backgroundColor: colors.surface, borderColor: isOverLimit ? colors.error : colors.border }]}>
          <View style={styles.memoHeader}>
            <Text style={[styles.memoLabel, { color: colors.muted }]}>
              {config.label} 메모
            </Text>
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
              style={({ pressed }) => [styles.editToggle, pressed && { opacity: 0.6 }]}
            >
              <IconSymbol name={isEditing ? "xmark" : "pencil"} size={14} color={colors.primary} />
              <Text style={[styles.editToggleText, { color: colors.primary }]}>
                {isEditing ? "취소" : "편집"}
              </Text>
            </Pressable>
          </View>

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
            <Text style={[styles.memoText, { color: colors.foreground }]}>{currentText}</Text>
          )}

          <View style={styles.memoFooter}>
            <Text style={[styles.charCount, { color: isOverLimit ? colors.error : colors.muted }]}>
              {charCount} / {config.maxChars}자
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <Pressable
            onPress={handleCopy}
            style={({ pressed }) => [
              styles.actionBtn,
              {
                backgroundColor: copySuccess ? colors.success : colors.surface,
                borderColor: copySuccess ? colors.success : colors.border,
              },
              pressed && { opacity: 0.8 },
            ]}
          >
            <IconSymbol
              name={copySuccess ? "checkmark" : "doc.on.doc"}
              size={18}
              color={copySuccess ? "#fff" : colors.foreground}
            />
            <Text style={[styles.actionBtnText, { color: copySuccess ? "#fff" : colors.foreground }]}>
              {copySuccess ? "복사됨!" : "복사"}
            </Text>
          </Pressable>

          <Pressable
            onPress={handleShare}
            style={({ pressed }) => [
              styles.actionBtnPrimary,
              { backgroundColor: config.color },
              pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
            ]}
          >
            <IconSymbol name="square.and.arrow.up" size={18} color="#fff" />
            <Text style={styles.actionBtnPrimaryText}>{config.label}에 공유</Text>
          </Pressable>
        </View>
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
  notFoundText: {
    fontSize: 16,
  },
  backLink: {
    fontSize: 16,
    fontWeight: "600",
  },
  navHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  navBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minWidth: 60,
  },
  navBtnText: {
    fontSize: 16,
    fontWeight: "500",
  },
  navTitle: {
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.3,
  },
  navActions: {
    minWidth: 60,
    alignItems: "flex-end",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 14,
  },
  articleCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  articleCardContent: {
    gap: 6,
  },
  articleTitle: {
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  articleUrlRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  articleUrl: {
    fontSize: 12,
    flex: 1,
  },
  summaryCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    gap: 10,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  summaryText: {
    fontSize: 14,
    lineHeight: 22,
  },
  platformSelector: {
    flexDirection: "row",
    gap: 8,
  },
  platformTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
  },
  platformTabText: {
    fontSize: 13,
    fontWeight: "600",
  },
  memoContainer: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    gap: 10,
  },
  memoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  memoLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  editToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  editToggleText: {
    fontSize: 13,
    fontWeight: "500",
  },
  memoText: {
    fontSize: 14,
    lineHeight: 22,
    minHeight: 80,
  },
  textInput: {
    fontSize: 14,
    lineHeight: 22,
    minHeight: 120,
    textAlignVertical: "top",
    padding: 0,
  },
  memoFooter: {
    alignItems: "flex-end",
  },
  charCount: {
    fontSize: 11,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: "600",
  },
  actionBtnPrimary: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  actionBtnPrimaryText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});
