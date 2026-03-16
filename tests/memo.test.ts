import { describe, expect, it } from "vitest";
import type { Memo, MemoContent, Platform } from "../shared/types";

// Test memo data structure
describe("Memo types", () => {
  it("should create a valid memo object", () => {
    const memos: MemoContent[] = [
      {
        platform: "linkedin",
        text: "테스트 LinkedIn 메모 #뉴스 #인사이트",
      },
      {
        platform: "twitter",
        text: "테스트 Twitter 메모 #뉴스",
      },
      {
        platform: "general",
        text: "테스트 일반 메모",
      },
    ];

    const memo: Memo = {
      id: "memo_test_001",
      articleUrl: "https://example.com/news/article",
      articleTitle: "테스트 기사 제목",
      summary: "• 핵심 내용 1\n• 핵심 내용 2\n• 핵심 내용 3",
      memos,
      category: {
        major: "기술",
        minor: "AI",
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    expect(memo.id).toBe("memo_test_001");
    expect(memo.memos).toHaveLength(3);
    expect(memo.memos[0].platform).toBe("linkedin");
    expect(memo.memos[1].platform).toBe("twitter");
    expect(memo.memos[2].platform).toBe("general");
  });

  it("should validate platform types", () => {
    const validPlatforms: Platform[] = ["linkedin", "twitter", "general"];
    expect(validPlatforms).toContain("linkedin");
    expect(validPlatforms).toContain("twitter");
    expect(validPlatforms).toContain("general");
  });
});

// Test URL extraction logic (mirrors use-share-intent.ts logic)
describe("URL extraction", () => {
  const extractHttpUrl = (text: string): string | null => {
    if (!text) return null;
    if (text.startsWith("http://") || text.startsWith("https://")) {
      return text.trim();
    }
    const urlMatch = text.match(/https?:\/\/[^\s]+/);
    return urlMatch ? urlMatch[0].trim() : null;
  };

  it("should extract URL from plain URL string", () => {
    const url = "https://www.example.com/news/article-123";
    expect(extractHttpUrl(url)).toBe(url);
  });

  it("should extract URL from text with surrounding content", () => {
    const text = "Check out this article: https://www.example.com/news/article-123 - very interesting!";
    expect(extractHttpUrl(text)).toBe("https://www.example.com/news/article-123");
  });

  it("should return null for non-URL text", () => {
    expect(extractHttpUrl("Just some plain text")).toBeNull();
    expect(extractHttpUrl("")).toBeNull();
  });

  it("should handle http URLs", () => {
    const url = "http://example.com/article";
    expect(extractHttpUrl(url)).toBe(url);
  });
});

// Test character limit logic
describe("Character limits", () => {
  const PLATFORM_LIMITS = {
    linkedin: 3000,
    twitter: 280,
    general: 1000,
  };

  it("should have correct character limits", () => {
    expect(PLATFORM_LIMITS.linkedin).toBe(3000);
    expect(PLATFORM_LIMITS.twitter).toBe(280);
    expect(PLATFORM_LIMITS.general).toBe(1000);
  });

  it("should detect over-limit text", () => {
    const twitterText = "A".repeat(281);
    expect(twitterText.length > PLATFORM_LIMITS.twitter).toBe(true);

    const linkedinText = "A".repeat(200);
    expect(linkedinText.length > PLATFORM_LIMITS.linkedin).toBe(false);
  });
});
