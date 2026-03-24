import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AppSettings, SummaryLength, SummaryTone, AIEngineType } from "@/shared/types";

const SETTINGS_KEY = "app_settings";

const DEFAULT_SETTINGS: AppSettings = {
  summaryLength: "medium",
  summaryTone: "expert",
  aiEngine: "cloud",
};

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem(SETTINGS_KEY);
      if (stored) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) });
      }
    } catch (error) {
      console.error("[useSettings] Failed to load settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const persist = async (updated: AppSettings) => {
    setSettings(updated);
    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error("[useSettings] Failed to save settings:", error);
    }
  };

  const updateSummaryLength = (length: SummaryLength) =>
    persist({ ...settings, summaryLength: length });

  const updateSummaryTone = (tone: SummaryTone) =>
    persist({ ...settings, summaryTone: tone });

  const updateAIEngine = (engine: AIEngineType) =>
    persist({ ...settings, aiEngine: engine });

  const updateServerUrl = (url: string) => {
    let normalized = url.trim();
    if (normalized) {
      // Auto-add https:// if no protocol specified
      if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
        normalized = `https://${normalized}`;
      }
      // Upgrade http:// to https:// (Vercel and most deployments require HTTPS)
      normalized = normalized.replace(/^http:\/\//i, "https://");
      // Remove trailing slash
      normalized = normalized.replace(/\/$/, "");
    }
    return persist({ ...settings, serverUrl: normalized });
  };

  return { settings, loading, updateSummaryLength, updateSummaryTone, updateAIEngine, updateServerUrl };
}
