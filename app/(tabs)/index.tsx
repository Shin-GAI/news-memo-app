import React, { useCallback, useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useMemos } from "@/hooks/use-memos";
import { useShareIntent } from "@/hooks/use-share-intent";
import type { Memo } from "@/shared/types";

function EmptyState({
  colors,
  onManualInput,
}: {
  colors: ReturnType<typeof useColors>;
  onManualInput: () => void;
}) {
  return (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconBg, { backgroundColor: colors.primary + "15" }]}>
        <IconSymbol name="newspaper.fill" size={48} color={colors.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>저장된 메모가 없습니다</Text>
      <Text style={[styles.emptyDesc, { color: colors.muted }]}>
        크롬에서 뉴스 기사를 읽다가{"\n"}
        공유 버튼을 눌러{" "}
        <Text style={{ color: colors.primary, fontWeight: "600" }}>NewsMemo</Text>를 선택하면{"\n"}
        AI가 핵심 내용을 요약해드립니다.
      </Text>

      {/* Manual URL input button */}
      <Pressable
        onPress={onManualInput}
        style={({ pressed }) => [
          styles.manualInputBtn,
          { backgroundColor: colors.primary },
          pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
        ]}
      >
        <IconSymbol name="link" size={18} color="#fff" />
        <Text style={styles.manualInputBtnText}>URL 직접 입력하기</Text>
      </Pressable>

      <View
        style={[
          styles.howToCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.howToTitle, { color: colors.foreground }]}>크롬에서 공유하는 방법</Text>
        {[
          { step: "1", text: "크롬에서 뉴스 기사 열기" },
          { step: "2", text: "주소창 옆 공유 버튼(⋮) 탭" },
          { step: "3", text: "공유 시트에서 NewsMemo 선택" },
          { step: "4", text: "AI 요약 확인 후 SNS 공유" },
        ].map(({ step, text }) => (
          <View key={step} style={styles.howToRow}>
            <View style={[styles.stepBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.stepText}>{step}</Text>
            </View>
            <Text style={[styles.howToText, { color: colors.foreground }]}>{text}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function MemoCard({
  memo,
  colors,
  onPress,
  onDelete,
}: {
  memo: Memo;
  colors: ReturnType<typeof useColors>;
  onPress: () => void;
  onDelete: () => void;
}) {
  const platformColors: Record<string, string> = {
    linkedin: "#0A66C2",
    twitter: "#1DA1F2",
    general: "#00C896",
  };
  const platformLabels: Record<string, string> = {
    linkedin: "LinkedIn",
    twitter: "Twitter/X",
    general: "일반",
  };

  const date = new Date(memo.createdAt);
  const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${date
    .getHours()
    .toString()
    .padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("메모 삭제", "이 메모를 삭제하시겠습니까?", [
      { text: "취소", style: "cancel" },
      { text: "삭제", style: "destructive", onPress: onDelete },
    ]);
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] },
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <IconSymbol name="link" size={13} color={colors.muted} />
          <Text style={[styles.cardUrl, { color: colors.muted }]} numberOfLines={1}>
            {memo.articleUrl.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]}
          </Text>
        </View>
        <Text style={[styles.cardDate, { color: colors.muted }]}>{dateStr}</Text>
      </View>

      <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={2}>
        {memo.articleTitle}
      </Text>

      <Text style={[styles.cardSummary, { color: colors.muted }]} numberOfLines={2}>
        {memo.summary}
      </Text>

      <View style={styles.cardFooter}>
        <View style={styles.platformBadges}>
          {memo.memos.map((m) => (
            <View
              key={m.platform}
              style={[
                styles.platformBadge,
                { backgroundColor: platformColors[m.platform] + "20" },
              ]}
            >
              <Text
                style={[
                  styles.platformBadgeText,
                  { color: platformColors[m.platform] },
                ]}
              >
                {platformLabels[m.platform]}
              </Text>
            </View>
          ))}
        </View>
        <Pressable
          onPress={handleDelete}
          style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.6 }]}
          hitSlop={8}
        >
          <IconSymbol name="trash" size={16} color={colors.error} />
        </Pressable>
      </View>
    </Pressable>
  );
}

function UrlInputModal({
  visible,
  colors,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  colors: ReturnType<typeof useColors>;
  onClose: () => void;
  onSubmit: (url: string) => void;
}) {
  const [url, setUrl] = useState("");

  const handleSubmit = () => {
    const trimmed = url.trim();
    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
      Alert.alert("올바른 URL을 입력해주세요", "http:// 또는 https://로 시작하는 URL을 입력해주세요.");
      return;
    }
    onSubmit(trimmed);
    setUrl("");
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalOverlay}
      >
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
          <View style={styles.modalHandle} />
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>URL 직접 입력</Text>
          <Text style={[styles.modalDesc, { color: colors.muted }]}>
            분석할 뉴스 기사의 URL을 입력해주세요
          </Text>
          <View
            style={[
              styles.urlInputContainer,
              { backgroundColor: colors.background, borderColor: colors.border },
            ]}
          >
            <IconSymbol name="link" size={16} color={colors.muted} />
            <TextInput
              value={url}
              onChangeText={setUrl}
              placeholder="https://..."
              placeholderTextColor={colors.muted}
              style={[styles.urlInput, { color: colors.foreground }]}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              autoFocus
            />
            {url.length > 0 && (
              <Pressable onPress={() => setUrl("")} hitSlop={8}>
                <IconSymbol name="xmark.circle.fill" size={16} color={colors.muted} />
              </Pressable>
            )}
          </View>
          <View style={styles.modalActions}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.modalCancelBtn,
                { borderColor: colors.border },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={[styles.modalCancelText, { color: colors.muted }]}>취소</Text>
            </Pressable>
            <Pressable
              onPress={handleSubmit}
              style={({ pressed }) => [
                styles.modalSubmitBtn,
                { backgroundColor: url.trim() ? colors.primary : colors.border },
                pressed && { opacity: 0.85 },
              ]}
              disabled={!url.trim()}
            >
              <IconSymbol name="sparkles" size={16} color="#fff" />
              <Text style={styles.modalSubmitText}>AI 요약하기</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const { memos, loading, deleteMemo, loadMemos } = useMemos();
  const { sharedData, clearSharedData } = useShareIntent();
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Extract unique categories from memos
  const categories = useMemo(() => {
    const cats = new Map<string, string>();
    memos.forEach((memo) => {
      // Safely handle missing category
      if (memo.category && memo.category.major && memo.category.minor) {
        const key = `${memo.category.major}|${memo.category.minor}`;
        if (!cats.has(key)) {
          cats.set(key, memo.category.major);
        }
      }
    });
    return Array.from(cats.keys());
  }, [memos]);

  // Filter memos by selected category
  const filteredMemos = useMemo(() => {
    if (!selectedCategory) return memos;
    return memos.filter((memo) => {
      if (!memo.category || !memo.category.major || !memo.category.minor) return false;
      return `${memo.category.major}|${memo.category.minor}` === selectedCategory;
    });
  }, [memos, selectedCategory]);

  // Handle incoming share intent
  useEffect(() => {
    if (sharedData?.url) {
      clearSharedData();
      router.push({
        pathname: "/process" as never,
        params: { url: sharedData.url },
      });
    }
  }, [sharedData]);

  const handleMemoPress = useCallback(
    (memo: Memo) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push({
        pathname: "/memo/[id]" as never,
        params: { id: memo.id },
      });
    },
    [router]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteMemo(id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    [deleteMemo]
  );

  const handleUrlSubmit = (url: string) => {
    setShowUrlModal(false);
    router.push({
      pathname: "/process" as never,
      params: { url },
    });
  };

  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer containerClassName="bg-background">
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <View style={[styles.logoMark, { backgroundColor: colors.primary }]}>
            <IconSymbol name="sparkles" size={16} color="#fff" />
          </View>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>NewsMemo</Text>
        </View>
        <View style={styles.headerRight}>
          {memos.length > 0 && (
            <Text style={[styles.headerCount, { color: colors.muted }]}>
              {memos.length}개의 메모
            </Text>
          )}
          <Pressable
            onPress={() => setShowUrlModal(true)}
            style={({ pressed }) => [
              styles.addBtn,
              { backgroundColor: colors.primary + "15" },
              pressed && { opacity: 0.7 },
            ]}
            hitSlop={8}
          >
            <IconSymbol name="plus" size={20} color={colors.primary} />
          </Pressable>
        </View>
      </View>

      {memos.length === 0 ? (
        <FlatList
          data={[]}
          renderItem={null}
          ListEmptyComponent={
            <EmptyState colors={colors} onManualInput={() => setShowUrlModal(true)} />
          }
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <FlatList
          data={filteredMemos}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MemoCard
              memo={item}
              colors={colors}
              onPress={() => handleMemoPress(item)}
              onDelete={() => handleDelete(item.id)}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onRefresh={loadMemos}
          refreshing={loading}
        />
      )}

      <UrlInputModal
        visible={showUrlModal}
        colors={colors}
        onClose={() => setShowUrlModal(false)}
        onSubmit={handleUrlSubmit}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logoMark: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerCount: {
    fontSize: 13,
    fontWeight: "500",
  },
  addBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    paddingTop: 32,
    paddingHorizontal: 24,
    gap: 16,
  },
  emptyIconBg: {
    width: 96,
    height: 96,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  emptyDesc: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
  },
  manualInputBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 4,
  },
  manualInputBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  howToCard: {
    width: "100%",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    gap: 12,
  },
  howToTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  howToRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  stepText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  howToText: {
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    gap: 8,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  cardUrl: {
    fontSize: 12,
    flex: 1,
  },
  cardDate: {
    fontSize: 11,
    marginLeft: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  cardSummary: {
    fontSize: 13,
    lineHeight: 19,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  platformBadges: {
    flexDirection: "row",
    gap: 6,
  },
  platformBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  platformBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  deleteBtn: {
    padding: 4,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    gap: 14,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#ccc",
    alignSelf: "center",
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  modalDesc: {
    fontSize: 14,
    lineHeight: 20,
  },
  urlInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  urlInput: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: "600",
  },
  modalSubmitBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  modalSubmitText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});
