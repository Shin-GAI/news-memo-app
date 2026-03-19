import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Animated,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useSettings } from "@/hooks/use-settings";
import { trpc } from "@/lib/trpc";
import { useMemos } from "@/hooks/use-memos";
import { OnDeviceAI } from "@/modules/on-device-ai";
import {
  buildOnDevicePrompt,
  parseOnDeviceResponse,
} from "@/hooks/use-on-device-ai";
import type { Memo, SummarizeResponse } from "@/shared/types";

type ProcessStep = "fetching" | "analyzing" | "generating" | "done" | "error";

// Steps differ slightly for cloud vs on-device labeling
const CLOUD_STEPS: { key: ProcessStep; label: string; icon: string }[] = [
  { key: "fetching", label: "기사 불러오는 중...", icon: "link" },
  { key: "analyzing", label: "핵심 내용 분석 중...", icon: "brain.head.profile" },
  { key: "generating", label: "클라우드 AI 생성 중...", icon: "cloud" },
  { key: "done", label: "완료!", icon: "checkmark.circle.fill" },
];

const GOOGLE_STEPS: { key: ProcessStep; label: string; icon: string }[] = [
  { key: "fetching", label: "기사 불러오는 중...", icon: "link" },
  { key: "analyzing", label: "Gemini Nano 로딩 중...", icon: "brain.head.profile" },
  { key: "generating", label: "기기에서 AI 생성 중...", icon: "cpu" },
  { key: "done", label: "완료!", icon: "checkmark.circle.fill" },
];

const SAMSUNG_STEPS: { key: ProcessStep; label: string; icon: string }[] = [
  { key: "fetching", label: "기사 불러오는 중...", icon: "link" },
  { key: "analyzing", label: "Galaxy AI 로딩 중...", icon: "brain.head.profile" },
  { key: "generating", label: "Galaxy AI 생성 중...", icon: "cpu" },
  { key: "done", label: "완료!", icon: "checkmark.circle.fill" },
];

// Engine badge styles
const ENGINE_BADGE: Record<string, { label: string; color: string; icon: string }> = {
  cloud: { label: "클라우드 AI", color: "#4F86F7", icon: "cloud.fill" },
  google_edge: { label: "Google AI Edge", color: "#34A853", icon: "cpu" },
  samsung_edge: { label: "Samsung Galaxy AI", color: "#1428A0", icon: "cpu" },
};

export default function ProcessScreen() {
  const colors = useColors();
  const router = useRouter();
  const { url } = useLocalSearchParams<{ url: string }>();
  const { saveMemo } = useMemos();
  const { settings } = useSettings();

  const [step, setStep] = useState<ProcessStep>("fetching");
  const [error, setError] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  // Both mutations declared unconditionally (hook rules)
  const summarizeMutation = trpc.news.summarize.useMutation();
  const fetchArticleMutation = trpc.news.fetchArticle.useMutation();

  const engine = settings.aiEngine ?? "cloud";
  const STEPS =
    engine === "google_edge"
      ? GOOGLE_STEPS
      : engine === "samsung_edge"
      ? SAMSUNG_STEPS
      : CLOUD_STEPS;

  const badge = ENGINE_BADGE[engine];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, damping: 15, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (!url) {
      setError("공유된 URL이 없습니다.");
      setStep("error");
      return;
    }

    const process = async () => {
      try {
        if (engine === "cloud") {
          await runCloudPath();
        } else {
          await runOnDevicePath();
        }
      } catch (err) {
        console.error("[ProcessScreen] Error:", err);
        setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
        setStep("error");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    };

    process();
  }, [url]);

  // ── Cloud path (original behavior) ──────────────────────────────────────────
  const runCloudPath = async () => {
    setStep("fetching");
    await new Promise((r) => setTimeout(r, 600));
    setStep("analyzing");
    await new Promise((r) => setTimeout(r, 400));
    setStep("generating");

    const data = await summarizeMutation.mutateAsync({
      url: url!,
      summaryLength: settings.summaryLength,
      summaryTone: settings.summaryTone,
    });

    await finishWithResult(data);
  };

  // ── On-device path ───────────────────────────────────────────────────────────
  const runOnDevicePath = async () => {
    // Step 1: Fetch article via server (needs network)
    setStep("fetching");
    const { title, content } = await fetchArticleMutation.mutateAsync({ url: url! });

    // Step 2: Load on-device model
    setStep("analyzing");
    await new Promise((r) => setTimeout(r, 300));

    // Step 3: Generate on-device
    setStep("generating");
    const nativeEngine = engine === "google_edge" ? "google" : "samsung";
    const prompt = buildOnDevicePrompt(title, content, url!, settings);

    let responseText: string;
    try {
      responseText = await OnDeviceAI.generateText(prompt, nativeEngine);
    } catch (nativeErr) {
      // On-device call failed — fall back to cloud with user-visible info
      console.warn("[ProcessScreen] On-device AI failed, falling back to cloud:", nativeErr);
      const engineLabel = engine === "google_edge" ? "Google AI Edge" : "Samsung Galaxy AI";
      throw new Error(
        `${engineLabel}를 사용할 수 없습니다.\n\n` +
        `설정에서 '클라우드 AI'로 변경하거나, ` +
        `지원 기기인지 확인해주세요.\n\n` +
        `(${nativeErr instanceof Error ? nativeErr.message : String(nativeErr)})`
      );
    }

    const data = parseOnDeviceResponse(responseText, title, url!);
    await finishWithResult(data);
  };

  // ── Shared finish ────────────────────────────────────────────────────────────
  const finishWithResult = async (data: SummarizeResponse) => {
    setStep("done");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const memo: Memo = {
      id: `memo_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      articleUrl: url!,
      articleTitle: data.articleTitle,
      summary: data.summary,
      memos: data.memos,
      category: data.category,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveMemo(memo);

    setTimeout(() => {
      router.replace({
        pathname: "/memo/[id]" as never,
        params: { id: memo.id, isNew: "true" },
      });
    }, 800);
  };

  const currentStepIndex = STEPS.findIndex((s) => s.key === step);

  return (
    <ScreenContainer containerClassName="bg-background">
      <Animated.View
        style={[styles.container, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
          >
            <IconSymbol name="xmark" size={20} color={colors.muted} />
          </Pressable>
        </View>

        {/* Engine badge */}
        <View style={[styles.engineBadge, { backgroundColor: badge.color + "18", borderColor: badge.color + "40" }]}>
          <IconSymbol name={badge.icon as never} size={13} color={badge.color} />
          <Text style={[styles.engineBadgeText, { color: badge.color }]}>{badge.label}</Text>
        </View>

        {/* URL Preview */}
        <View style={[styles.urlCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <IconSymbol name="link" size={16} color={colors.primary} />
          <Text style={[styles.urlText, { color: colors.muted }]} numberOfLines={2}>
            {url}
          </Text>
        </View>

        {/* Processing State */}
        {step !== "error" ? (
          <View style={styles.processingContainer}>
            <View style={[styles.iconContainer, { backgroundColor: colors.primary + "15" }]}>
              {step === "done" ? (
                <IconSymbol name="checkmark.circle.fill" size={56} color={colors.success} />
              ) : (
                <ActivityIndicator size="large" color={colors.primary} />
              )}
            </View>

            <Text style={[styles.processingTitle, { color: colors.foreground }]}>
              {step === "done" ? "메모 생성 완료!" : "AI가 분석 중입니다"}
            </Text>

            <View style={styles.stepsContainer}>
              {STEPS.filter((s) => s.key !== "done").map((s, index) => {
                const isCompleted = currentStepIndex > index;
                const isActive = currentStepIndex === index;
                return (
                  <View key={s.key} style={styles.stepRow}>
                    <View
                      style={[
                        styles.stepDot,
                        {
                          backgroundColor: isCompleted
                            ? colors.success
                            : isActive
                            ? colors.primary
                            : colors.border,
                        },
                      ]}
                    >
                      {isCompleted ? (
                        <IconSymbol name="checkmark" size={10} color="#fff" />
                      ) : isActive ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : null}
                    </View>
                    <Text
                      style={[
                        styles.stepLabel,
                        {
                          color: isCompleted
                            ? colors.success
                            : isActive
                            ? colors.foreground
                            : colors.muted,
                          fontWeight: isActive ? "600" : "400",
                        },
                      ]}
                    >
                      {s.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        ) : (
          <View style={styles.errorContainer}>
            <View style={[styles.iconContainer, { backgroundColor: colors.error + "15" }]}>
              <IconSymbol name="exclamationmark.triangle" size={48} color={colors.error} />
            </View>
            <Text style={[styles.errorTitle, { color: colors.foreground }]}>오류가 발생했습니다</Text>
            <Text style={[styles.errorDesc, { color: colors.muted }]}>{error}</Text>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.retryBtn,
                { backgroundColor: colors.primary },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={styles.retryBtnText}>돌아가기</Text>
            </Pressable>
          </View>
        )}
      </Animated.View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  header: { paddingTop: 12, paddingBottom: 8, alignItems: "flex-end" },
  backBtn: { padding: 8 },
  engineBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 10,
  },
  engineBadgeText: { fontSize: 12, fontWeight: "600" },
  urlCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 32,
  },
  urlText: { flex: 1, fontSize: 13, lineHeight: 19 },
  processingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    paddingBottom: 60,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  processingTitle: { fontSize: 20, fontWeight: "700", letterSpacing: -0.5 },
  stepsContainer: {
    width: "100%",
    gap: 14,
    paddingHorizontal: 20,
    marginTop: 8,
  },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  stepLabel: { fontSize: 14, lineHeight: 20 },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingBottom: 60,
    paddingHorizontal: 20,
  },
  errorTitle: { fontSize: 20, fontWeight: "700" },
  errorDesc: { fontSize: 14, lineHeight: 21, textAlign: "center" },
  retryBtn: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14, marginTop: 8 },
  retryBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
