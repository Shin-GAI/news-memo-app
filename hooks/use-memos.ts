import AsyncStorage from "@react-native-async-storage/async-storage";
import { useState, useEffect, useCallback } from "react";
import type { Memo } from "@/shared/types";

const STORAGE_KEY = "newsmemo_memos";

export function useMemos() {
  const [memos, setMemos] = useState<Memo[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMemos = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Memo[];
        setMemos(parsed.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      }
    } catch (error) {
      console.error("[useMemos] Failed to load memos:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMemos();
  }, [loadMemos]);

  const saveMemo = useCallback(async (memo: Memo) => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const existing = stored ? (JSON.parse(stored) as Memo[]) : [];
      const updated = [memo, ...existing.filter((m) => m.id !== memo.id)];
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setMemos(updated);
      return true;
    } catch (error) {
      console.error("[useMemos] Failed to save memo:", error);
      return false;
    }
  }, []);

  const updateMemo = useCallback(async (id: string, updates: Partial<Memo>) => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const existing = stored ? (JSON.parse(stored) as Memo[]) : [];
      const updated = existing.map((m) =>
        m.id === id ? { ...m, ...updates, updatedAt: new Date().toISOString() } : m
      );
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setMemos(updated.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      return true;
    } catch (error) {
      console.error("[useMemos] Failed to update memo:", error);
      return false;
    }
  }, []);

  const deleteMemo = useCallback(async (id: string) => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const existing = stored ? (JSON.parse(stored) as Memo[]) : [];
      const updated = existing.filter((m) => m.id !== id);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setMemos(updated);
      return true;
    } catch (error) {
      console.error("[useMemos] Failed to delete memo:", error);
      return false;
    }
  }, []);

  const clearAllMemos = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      setMemos([]);
      return true;
    } catch (error) {
      console.error("[useMemos] Failed to clear memos:", error);
      return false;
    }
  }, []);

  return {
    memos,
    loading,
    loadMemos,
    saveMemo,
    updateMemo,
    deleteMemo,
    clearAllMemos,
  };
}
