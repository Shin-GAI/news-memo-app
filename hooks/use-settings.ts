import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AppSettings, SummaryLength, SummaryTone } from "@/shared/types";

const SETTINGS_KEY = "app_settings";

const DEFAULT_SETTINGS: AppSettings = {
  summaryLength: "medium",
  summaryTone: "expert",
};

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem(SETTINGS_KEY);
      if (stored) {
        setSettings(JSON.parse(stored));
      }
    } catch (error) {
      console.error("[useSettings] Failed to load settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateSummaryLength = async (length: SummaryLength) => {
    const updated = { ...settings, summaryLength: length };
    setSettings(updated);
    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error("[useSettings] Failed to save summaryLength:", error);
    }
  };

  const updateSummaryTone = async (tone: SummaryTone) => {
    const updated = { ...settings, summaryTone: tone };
    setSettings(updated);
    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error("[useSettings] Failed to save summaryTone:", error);
    }
  };

  return {
    settings,
    loading,
    updateSummaryLength,
    updateSummaryTone,
  };
}
