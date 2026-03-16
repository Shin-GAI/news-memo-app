import { useEffect, useState, useRef } from "react";
import * as Linking from "expo-linking";

export interface ShareIntentData {
  url: string;
}

/**
 * Hook to receive shared URLs from Android share intent (ACTION_SEND).
 *
 * When Chrome shares a URL via Android's share sheet:
 * 1. Android sends ACTION_SEND intent with text/plain MIME type
 * 2. Expo Router receives this as a deep link URL
 * 3. The shared text/URL is passed as a query parameter
 *
 * URL format from Expo: manus{timestamp}://share?text=https://...
 * or the raw shared text may be the URL itself
 */
export function useShareIntent() {
  const [sharedData, setSharedData] = useState<ShareIntentData | null>(null);
  const processedUrls = useRef(new Set<string>());

  const extractHttpUrl = (text: string): string | null => {
    if (!text) return null;
    // If text itself is a URL
    if (text.startsWith("http://") || text.startsWith("https://")) {
      return text.trim();
    }
    // Extract URL from text that may contain other content
    const urlMatch = text.match(/https?:\/\/[^\s]+/);
    return urlMatch ? urlMatch[0].trim() : null;
  };

  const parseShareIntent = (rawUrl: string): ShareIntentData | null => {
    if (!rawUrl) return null;

    // Avoid processing the same URL twice
    if (processedUrls.current.has(rawUrl)) return null;

    try {
      const parsed = new URL(rawUrl);

      // Check for shared text in query params (Expo Router passes shared text as params)
      const sharedText =
        parsed.searchParams.get("text") ||
        parsed.searchParams.get("url") ||
        parsed.searchParams.get("shared_text") ||
        parsed.searchParams.get("subject");

      if (sharedText) {
        const httpUrl = extractHttpUrl(sharedText);
        if (httpUrl) {
          processedUrls.current.add(rawUrl);
          return { url: httpUrl };
        }
      }

      // If the URL itself is an HTTP URL (direct share)
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        processedUrls.current.add(rawUrl);
        return { url: rawUrl };
      }

      // Handle path-based share: scheme://share?... or scheme://...
      // Sometimes the full URL is encoded in the path
      const fullPath = parsed.pathname + parsed.search + parsed.hash;
      const httpUrl = extractHttpUrl(decodeURIComponent(fullPath));
      if (httpUrl) {
        processedUrls.current.add(rawUrl);
        return { url: httpUrl };
      }
    } catch {
      // If URL parsing fails, try to extract HTTP URL directly
      const httpUrl = extractHttpUrl(rawUrl);
      if (httpUrl && !processedUrls.current.has(httpUrl)) {
        processedUrls.current.add(httpUrl);
        return { url: httpUrl };
      }
    }

    return null;
  };

  useEffect(() => {
    // Check initial URL (app launched via share intent)
    const checkInitialUrl = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        const data = parseShareIntent(initialUrl);
        if (data) {
          setSharedData(data);
        }
      }
    };

    checkInitialUrl();

    // Listen for URL changes (app already running, share intent received)
    const subscription = Linking.addEventListener("url", ({ url }) => {
      const data = parseShareIntent(url);
      if (data) {
        setSharedData(data);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const clearSharedData = () => setSharedData(null);

  return { sharedData, clearSharedData };
}
