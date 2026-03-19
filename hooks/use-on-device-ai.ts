import { useEffect, useState } from "react";
import { OnDeviceAI } from "@/modules/on-device-ai";
import type { AIEngineType, AppSettings, SummarizeResponse, MemoContent } from "@/shared/types";

export interface EngineAvailability {
  google_edge: boolean | null; // null = checking
  samsung_edge: boolean | null;
}

/**
 * Checks on-device AI engine availability at mount time.
 * Results are null while the native check is in progress.
 */
export function useOnDeviceAIAvailability(): EngineAvailability {
  const [availability, setAvailability] = useState<EngineAvailability>({
    google_edge: null,
    samsung_edge: null,
  });

  useEffect(() => {
    OnDeviceAI.isGoogleEdgeAvailable().then((v) =>
      setAvailability((prev) => ({ ...prev, google_edge: v }))
    );
    OnDeviceAI.isSamsungEdgeAvailable().then((v) =>
      setAvailability((prev) => ({ ...prev, samsung_edge: v }))
    );
  }, []);

  return availability;
}

/**
 * Returns true if the selected engine is available.
 * "cloud" is always available.
 */
export function engineIsAvailable(
  engine: AIEngineType,
  availability: EngineAvailability
): boolean {
  if (engine === "cloud") return true;
  return availability[engine] === true;
}

/**
 * Build the prompt sent to the on-device model.
 * Uses a simpler structure than the cloud prompt so smaller models can handle it.
 */
export function buildOnDevicePrompt(
  title: string,
  content: string,
  url: string,
  settings: AppSettings
): string {
  const lengthGuide =
    settings.summaryLength === "short"
      ? "3개 핵심 포인트, 각 50자 이내"
      : settings.summaryLength === "long"
      ? "5개 핵심 포인트, 각 100자 이내"
      : "4개 핵심 포인트, 각 80자 이내";

  const toneGuide =
    settings.summaryTone === "expert"
      ? "전문가 어조, ~함. 형식 사용"
      : "친근한 어조, ~해요 형식 사용";

  return `다음 뉴스 기사를 분석해서 JSON 형식으로 응답하세요.

기사 제목: ${title}
기사 URL: ${url}
기사 내용:
${content.slice(0, 2000)}

응답 형식 (JSON만, 마크다운 없이):
{
  "articleTitle": "기사 제목 (최대 80자)",
  "summary": "핵심 내용 요약 (${lengthGuide}, 번호 목록 형식: 1. ... 2. ... )",
  "category": {
    "major": "기술|경제|사회|정치|문화|과학|스포츠 중 하나",
    "minor": "세부 카테고리"
  },
  "memos": [
    {
      "platform": "linkedin",
      "text": "LinkedIn용 전문 포스트 (${toneGuide}), 출처: ${url}"
    },
    {
      "platform": "twitter",
      "text": "Twitter/X용 짧은 포스트 (최대 280자), ${url}"
    },
    {
      "platform": "general",
      "text": "일반 메모 (상세 요약 + 출처: ${url})"
    }
  ]
}`;
}

/**
 * Parse the on-device model's JSON response into SummarizeResponse.
 * Falls back to a minimal structure if parsing fails.
 */
export function parseOnDeviceResponse(
  responseText: string,
  title: string,
  url: string
): SummarizeResponse {
  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found");
    return JSON.parse(jsonMatch[0]) as SummarizeResponse;
  } catch {
    // Minimal fallback
    return {
      articleTitle: title,
      summary: `1. ${title}\n2. 기사 내용을 분석했습니다.\n3. 원문을 확인해주세요.`,
      category: { major: "기타", minor: "미분류" },
      memos: [
        { platform: "linkedin", text: `${title}\n\n${url}\n\n#뉴스` },
        { platform: "twitter", text: `${title.slice(0, 100)}\n\n${url}` },
        { platform: "general", text: `${title}\n\n출처: ${url}` },
      ] as MemoContent[],
    };
  }
}
