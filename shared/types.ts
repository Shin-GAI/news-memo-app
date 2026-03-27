/**
 * Unified type exports
 * Import shared types from this single entry point.
 */

export type * from "../drizzle/schema";
export * from "./_core/errors";

// App-specific types
export type Platform = "linkedin" | "twitter" | "general";

export interface MemoContent {
  platform: Platform;
  text: string;
}

export interface MemoCategory {
  major: string;  // 대주제 (예: "기술", "경제", "사회")
  mid?: string;   // 중주제 (예: "AI·반도체", "부동산", "외교")
  minor?: string; // 소주제 (예: "생성AI", "금리인상", "대선후보")
}

export interface Memo {
  id: string;
  articleUrl: string;
  articleTitle: string;
  summary: string;
  memos: MemoContent[];
  category: MemoCategory;
  createdAt: string;
  updatedAt: string;
  userNotes?: string; // 사용자가 추가한 메모
}

export interface SummarizeRequest {
  url: string;
  language?: "ko" | "en";
}

export interface SummarizeResponse {
  articleTitle: string;
  summary: string;
  memos: MemoContent[];
  category: MemoCategory;
}

export type SummaryLength = "short" | "medium" | "long";
export type SummaryTone = "expert" | "casual";
export type AIEngineType = "cloud" | "google_edge" | "samsung_edge";
export type ThemeVariant = "default" | "mono" | "green" | "pink";
export type FontVariant = "system" | "serif" | "handwriting";

export interface AppSettings {
  summaryLength: SummaryLength;
  summaryTone: SummaryTone;
  aiEngine: AIEngineType;
  serverUrl?: string; // 안드로이드/iOS 네이티브용 서버 URL (예: https://3000-xxx.us-east5.run.app)
}
