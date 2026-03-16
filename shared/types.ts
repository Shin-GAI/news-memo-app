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

export interface Memo {
  id: string;
  articleUrl: string;
  articleTitle: string;
  summary: string;
  memos: MemoContent[];
  createdAt: string;
  updatedAt: string;
}

export interface SummarizeRequest {
  url: string;
  language?: "ko" | "en";
}

export interface SummarizeResponse {
  articleTitle: string;
  summary: string;
  memos: MemoContent[];
}
