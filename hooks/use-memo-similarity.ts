import { useMemo } from "react";
import type { Memo } from "@/shared/types";

/**
 * 간단한 코사인 유사도 계산
 * 두 문자열의 단어 빈도를 기반으로 유사도 계산 (0~1)
 */
function calculateSimilarity(text1: string, text2: string): number {
  const normalize = (text: string) =>
    text
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 2);

  const words1 = normalize(text1);
  const words2 = normalize(text2);

  if (words1.length === 0 || words2.length === 0) return 0;

  const freq1 = new Map<string, number>();
  const freq2 = new Map<string, number>();

  words1.forEach((word) => freq1.set(word, (freq1.get(word) || 0) + 1));
  words2.forEach((word) => freq2.set(word, (freq2.get(word) || 0) + 1));

  let dotProduct = 0;
  let magnitude1 = 0;
  let magnitude2 = 0;

  // Dot product and magnitudes
  freq1.forEach((count1, word) => {
    const count2 = freq2.get(word) || 0;
    dotProduct += count1 * count2;
    magnitude1 += count1 * count1;
  });

  freq2.forEach((count2) => {
    magnitude2 += count2 * count2;
  });

  magnitude1 = Math.sqrt(magnitude1);
  magnitude2 = Math.sqrt(magnitude2);

  if (magnitude1 === 0 || magnitude2 === 0) return 0;

  return dotProduct / (magnitude1 * magnitude2);
}

/**
 * 메모 유사도 기반 그룹화 및 추천
 */
export function useMemoSimilarity(memos: Memo[], currentMemoId?: string) {
  // 유사 메모 찾기 (현재 메모와 유사도 높은 메모들)
  const relatedMemos = useMemo(() => {
    if (!currentMemoId || memos.length < 2) return [];

    const current = memos.find((m) => m.id === currentMemoId);
    if (!current) return [];

    const similarities = memos
      .filter((m) => m.id !== currentMemoId)
      .map((memo) => {
        // 카테고리 일치도 (같은 카테고리면 가중치 높음)
        const categoryMatch =
          memo.category.major === current.category.major ? 0.3 : 0;

        // 텍스트 유사도
        const textSimilarity = calculateSimilarity(current.summary, memo.summary);

        // 종합 유사도 (카테고리 30%, 텍스트 70%)
        const totalSimilarity = categoryMatch + textSimilarity * 0.7;

        return { memo, similarity: totalSimilarity };
      })
      .filter((item) => item.similarity > 0.2) // 유사도 0.2 이상만 필터링
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3); // 상위 3개만 반환

    return similarities.map((item) => item.memo);
  }, [memos, currentMemoId]);

  // 메모 그룹화 (유사한 메모들을 그룹으로 묶기)
  const groupedMemos = useMemo(() => {
    if (memos.length < 2) return [];

    const groups: Memo[][] = [];
    const visited = new Set<string>();

    memos.forEach((memo) => {
      if (visited.has(memo.id)) return;

      const group = [memo];
      visited.add(memo.id);

      // 현재 메모와 유사한 메모들 찾기
      memos.forEach((otherMemo) => {
        if (visited.has(otherMemo.id)) return;

        const similarity = calculateSimilarity(memo.summary, otherMemo.summary);
        const categoryMatch = memo.category.major === otherMemo.category.major;

        // 유사도 0.3 이상이고 카테고리가 같으면 그룹에 추가
        if (similarity > 0.3 && categoryMatch) {
          group.push(otherMemo);
          visited.add(otherMemo.id);
        }
      });

      if (group.length > 1) {
        groups.push(group);
      }
    });

    return groups;
  }, [memos]);

  return {
    relatedMemos,
    groupedMemos,
  };
}
