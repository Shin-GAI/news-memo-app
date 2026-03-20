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
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useMemos } from "@/hooks/use-memos";
import { useShareIntent } from "@/hooks/use-share-intent";
import { useMemoSearch, useAvailableCategories } from "@/hooks/use-memo-search";
import type { Memo } from "@/shared/types";

type DateFilter = "all" | "today" | "week" | "month";

const DATE_FILTER_OPTIONS: { key: DateFilter; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "today", label: "오늘" },
  { key: "week", label: "이번 주" },
  { key: "month", label: "이번 달" },
];

function getDateRange(filter: DateFilter): { start?: Date; end?: Date } {
  const now = new Date();
  if (filter === "today") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return { start, end: now };
  }
  if (filter === "week") {
    const day = now.getDay();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
    return { start, end: now };
  }
  if (filter === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start, end: now };
  }
  return {};
}

const CATEGORY_COLORS: Record<string, string> = {
  기술: "#6366F1",
  경제: "#F59E0B",
  사회: "#10B981",
  정치: "#EF4444",
  문화: "#EC4899",
  과학: "#3B82F6",
  스포츠: "#F97316",
};

function getCategoryColor(major: string): string {
  return CATEGORY_COLORS[major] ?? "#6B7280";
}

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
        <Text style={{ color: colors.primary, fontWeight: "600" }}>뉴스쉐어</Text>를 선택하면{"\n"}
        AI가 핵심 내용을 요약해드립니다.
      </Text>

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
          { step: "3", text: "공유 시트에서 뉴스쉐어 선택" },
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
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const dateStr = isToday
    ? `오늘 ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`
    : `${date.getMonth() + 1}.${date.getDate()} ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;

  const domain = memo.articleUrl.replace(/^https?:\/\/(www\.)?/, "").split("/")[0];
  const categoryColor = memo.category?.major ? getCategoryColor(memo.category.major) : colors.muted;

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
        { backgroundColor: colors.card, borderColor: colors.border },
        pressed && { opacity: 0.88, transform: [{ scale: 0.99 }] },
      ]}
    >
      {/* Card top: category chip + date + delete */}
      <View style={styles.cardTopRow}>
        <View style={styles.cardTopLeft}>
          {memo.category?.major ? (
            <View style={[styles.categoryChip, { backgroundColor: categoryColor + "18" }]}>
              <View style={[styles.categoryDot, { backgroundColor: categoryColor }]} />
              <Text style={[styles.categoryChipText, { color: categoryColor }]}>
                {memo.category.major}
                {memo.category.minor ? ` · ${memo.category.minor}` : ""}
              </Text>
            </View>
          ) : null}
        </View>
        <View style={styles.cardTopRight}>
          <Text style={[styles.cardDate, { color: colors.muted }]}>{dateStr}</Text>
          <Pressable
            onPress={handleDelete}
            style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.5 }]}
            hitSlop={8}
          >
            <IconSymbol name="trash" size={14} color={colors.muted} />
          </Pressable>
        </View>
      </View>

      {/* Title */}
      <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={2}>
        {memo.articleTitle}
      </Text>

      {/* Summary */}
      <Text style={[styles.cardSummary, { color: colors.muted }]} numberOfLines={2}>
        {memo.summary}
      </Text>

      {/* Footer: source domain + platform badges */}
      <View style={styles.cardFooter}>
        <View style={styles.cardSourceRow}>
          <IconSymbol name="link" size={11} color={colors.muted} />
          <Text style={[styles.cardSource, { color: colors.muted }]} numberOfLines={1}>
            {domain}
          </Text>
        </View>
        <View style={styles.platformBadges}>
          {memo.memos?.map((m) => (
            <View
              key={m.platform}
              style={[
                styles.platformBadge,
                { backgroundColor: platformColors[m.platform] + "1A" },
              ]}
            >
              <Text style={[styles.platformBadgeText, { color: platformColors[m.platform] }]}>
                {platformLabels[m.platform]}
              </Text>
            </View>
          ))}
        </View>
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
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  // Extract unique major categories from memos
  const availableCategories = useAvailableCategories(memos);

  // Date range from preset filter
  const { start: filterStartDate, end: filterEndDate } = useMemo(
    () => getDateRange(dateFilter),
    [dateFilter]
  );

  // Search and filter memos
  const searchResults = useMemoSearch(memos, {
    query: searchQuery,
    startDate: filterStartDate,
    endDate: filterEndDate,
  });

  // Filter by selected category chip
  const filteredMemos = useMemo(() => {
    if (!selectedCategory) return searchResults;
    return searchResults.filter((memo) => memo.category?.major === selectedCategory);
  }, [searchResults, selectedCategory]);

  // Active filter count for indicator
  const activeFilterCount = (dateFilter !== "all" ? 1 : 0) + (selectedCategory ? 1 : 0);

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
            <IconSymbol name="sparkles" size={15} color="#fff" />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>뉴스쉐어</Text>
            {memos.length > 0 && (
              <Text style={[styles.headerSubtitle, { color: colors.muted }]}>
                메모 {memos.length}개
              </Text>
            )}
          </View>
        </View>
        <Pressable
          onPress={() => setShowUrlModal(true)}
          style={({ pressed }) => [
            styles.addBtn,
            { backgroundColor: colors.primary },
            pressed && { opacity: 0.8, transform: [{ scale: 0.96 }] },
          ]}
        >
          <IconSymbol name="plus" size={18} color="#fff" />
          <Text style={styles.addBtnText}>URL 추가</Text>
        </Pressable>
      </View>

      {memos.length > 0 && (
        <>
          {/* Search + Filter Row */}
          <View style={[styles.searchRow, { borderBottomColor: colors.border }]}>
            <View
              style={[
                styles.searchBar,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <IconSymbol name="magnifyingglass" size={15} color={colors.muted} />
              <TextInput
                placeholder="제목, 내용, 카테고리 검색"
                placeholderTextColor={colors.muted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={[styles.searchInput, { color: colors.foreground }]}
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
                  <IconSymbol name="xmark.circle.fill" size={15} color={colors.muted} />
                </Pressable>
              )}
            </View>
            <Pressable
              onPress={() => {
                setShowFilterPanel(!showFilterPanel);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              style={({ pressed }) => [
                styles.filterBtn,
                {
                  backgroundColor:
                    activeFilterCount > 0 ? colors.primary : colors.surface,
                  borderColor: activeFilterCount > 0 ? colors.primary : colors.border,
                },
                pressed && { opacity: 0.7 },
              ]}
            >
              <IconSymbol
                name="slider.horizontal.3"
                size={16}
                color={activeFilterCount > 0 ? "#fff" : colors.muted}
              />
              {activeFilterCount > 0 && (
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
                </View>
              )}
            </Pressable>
          </View>

          {/* Filter Panel */}
          {showFilterPanel && (
            <View style={[styles.filterPanel, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
              {/* Date Filter */}
              <View style={styles.filterSection}>
                <Text style={[styles.filterLabel, { color: colors.muted }]}>기간</Text>
                <View style={styles.filterChipRow}>
                  {DATE_FILTER_OPTIONS.map(({ key, label }) => (
                    <Pressable
                      key={key}
                      onPress={() => {
                        setDateFilter(key);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      style={({ pressed }) => [
                        styles.filterChip,
                        {
                          backgroundColor:
                            dateFilter === key ? colors.primary + "18" : colors.background,
                          borderColor: dateFilter === key ? colors.primary : colors.border,
                        },
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          { color: dateFilter === key ? colors.primary : colors.muted },
                        ]}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Reset button */}
              {activeFilterCount > 0 && (
                <Pressable
                  onPress={() => {
                    setDateFilter("all");
                    setSelectedCategory(null);
                    setShowFilterPanel(false);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  style={({ pressed }) => [
                    styles.resetBtn,
                    { borderColor: colors.border },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <IconSymbol name="xmark" size={12} color={colors.muted} />
                  <Text style={[styles.resetBtnText, { color: colors.muted }]}>필터 초기화</Text>
                </Pressable>
              )}
            </View>
          )}

          {/* Category Chips */}
          {availableCategories.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={[styles.categoryScroll, { borderBottomColor: colors.border }]}
              contentContainerStyle={styles.categoryScrollContent}
            >
              <Pressable
                onPress={() => setSelectedCategory(null)}
                style={({ pressed }) => [
                  styles.categoryPill,
                  {
                    backgroundColor: !selectedCategory ? colors.primary : colors.surface,
                    borderColor: !selectedCategory ? colors.primary : colors.border,
                  },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text
                  style={[
                    styles.categoryPillText,
                    { color: !selectedCategory ? "#fff" : colors.muted },
                  ]}
                >
                  전체
                </Text>
              </Pressable>
              {availableCategories.map((cat) => {
                const isSelected = selectedCategory === cat;
                const catColor = getCategoryColor(cat);
                return (
                  <Pressable
                    key={cat}
                    onPress={() => {
                      setSelectedCategory(isSelected ? null : cat);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    style={({ pressed }) => [
                      styles.categoryPill,
                      {
                        backgroundColor: isSelected ? catColor : colors.surface,
                        borderColor: isSelected ? catColor : colors.border,
                      },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryPillText,
                        { color: isSelected ? "#fff" : colors.muted },
                      ]}
                    >
                      {cat}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </>
      )}

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
          ListEmptyComponent={
            <View style={styles.noResultsContainer}>
              <IconSymbol name="magnifyingglass" size={36} color={colors.muted} />
              <Text style={[styles.noResultsText, { color: colors.muted }]}>
                검색 결과가 없습니다
              </Text>
              <Pressable
                onPress={() => {
                  setSearchQuery("");
                  setDateFilter("all");
                  setSelectedCategory(null);
                }}
              >
                <Text style={[styles.noResultsClear, { color: colors.primary }]}>필터 초기화</Text>
              </Pressable>
            </View>
          }
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
  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logoMark: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.5,
    lineHeight: 22,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: "400",
    lineHeight: 14,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  // Search Row
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  filterBtn: {
    width: 40,
    height: 38,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    position: "relative",
  },
  filterBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
  },
  filterBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
  },
  // Filter Panel
  filterPanel: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  filterSection: {
    gap: 8,
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  filterChipRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "500",
  },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    alignSelf: "flex-start",
  },
  resetBtnText: {
    fontSize: 12,
    fontWeight: "500",
  },
  // Category Chips
  categoryScroll: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  categoryScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryPillText: {
    fontSize: 13,
    fontWeight: "500",
  },
  // List
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 32,
    flexGrow: 1,
    gap: 10,
  },
  // No Results
  noResultsContainer: {
    flex: 1,
    alignItems: "center",
    paddingTop: 64,
    gap: 10,
  },
  noResultsText: {
    fontSize: 15,
    fontWeight: "500",
  },
  noResultsClear: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 4,
  },
  // Empty State
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
  // Card
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTopLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  cardTopRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginLeft: 8,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  categoryChipText: {
    fontSize: 11,
    fontWeight: "600",
  },
  cardDate: {
    fontSize: 11,
    fontWeight: "400",
  },
  deleteBtn: {
    padding: 2,
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
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  cardSourceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  cardSource: {
    fontSize: 11,
    flex: 1,
  },
  platformBadges: {
    flexDirection: "row",
    gap: 5,
  },
  platformBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
  },
  platformBadgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  // URL Input Modal
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
