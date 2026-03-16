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
  major: string; // 대분류 (예: "기술", "경제", "사회")
  minor: string; // 중분류 (예: "AI", "주식", "정책")
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

export interface AppSettings {
  summaryLength: SummaryLength;
  summaryTone: SummaryTone;
}
