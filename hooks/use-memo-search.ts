import { useMemo } from "react";
import type { Memo } from "@/shared/types";

export interface SearchFilters {
  query: string;
  startDate?: Date;
  endDate?: Date;
  categories?: string[]; // 대분류 카테고리
}

/**
 * 메모 검색 및 필터링 훅
 * 제목, 내용, 카테고리로 검색하고 날짜 범위로 필터링
 */
export function useMemoSearch(memos: Memo[], filters: SearchFilters) {
  const results = useMemo(() => {
    let filtered = [...memos];

    // 텍스트 검색 (제목, 내용, 카테고리)
    if (filters.query && filters.query.trim()) {
      const query = filters.query.toLowerCase();
      filtered = filtered.filter((memo) => {
        const titleMatch = memo.articleTitle?.toLowerCase().includes(query) ?? false;
        const contentMatch = memo.summary?.toLowerCase().includes(query) ?? false;
        const categoryMatch =
          (memo.category?.major?.toLowerCase().includes(query) ?? false) ||
          (memo.category?.minor?.toLowerCase().includes(query) ?? false);
        const memoTextMatch = memo.memos?.some((m) =>
          m.text?.toLowerCase().includes(query)
        ) ?? false;

        return titleMatch || contentMatch || categoryMatch || memoTextMatch;
      });
    }

    // 날짜 범위 필터
    if (filters.startDate || filters.endDate) {
      filtered = filtered.filter((memo) => {
        const memoDate = new Date(memo.createdAt);

        if (filters.startDate && memoDate < filters.startDate) {
          return false;
        }

        if (filters.endDate) {
          const endOfDay = new Date(filters.endDate);
          endOfDay.setHours(23, 59, 59, 999);
          if (memoDate > endOfDay) {
            return false;
          }
        }

        return true;
      });
    }

    // 카테고리 필터
    if (filters.categories && filters.categories.length > 0) {
      filtered = filtered.filter((memo) =>
        filters.categories!.includes(memo.category.major)
      );
    }

    // 최신순 정렬
    filtered.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return filtered;
  }, [memos, filters]);

  return results;
}

/**
 * 메모에서 모든 고유한 카테고리 추출
 */
export function useAvailableCategories(memos: Memo[]): string[] {
  return useMemo(() => {
    const categories = new Set(
      memos
        .filter((m) => m.category && m.category.major)
        .map((m) => m.category.major)
    );
    return Array.from(categories).sort();
  }, [memos]);
}
