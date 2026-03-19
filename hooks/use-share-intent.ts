import { useShareIntentContext } from "expo-share-intent";

export interface ShareIntentData {
  url: string;
}

/**
 * Hook to receive shared URLs from Android share intent (ACTION_SEND).
 *
 * Uses expo-share-intent which properly reads Android intent extras
 * (Intent.EXTRA_TEXT) that Expo's Linking API cannot access.
 *
 * When Chrome shares a URL via Android's share sheet:
 * 1. Android sends ACTION_SEND intent with text/plain MIME type
 * 2. expo-share-intent native module intercepts the intent extras
 * 3. The shared text/URL is exposed via useShareIntentContext
 */
export function useShareIntent() {
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();

  const extractHttpUrl = (text: string): string | null => {
    if (!text) return null;
    if (text.startsWith("http://") || text.startsWith("https://")) {
      return text.trim();
    }
    const urlMatch = text.match(/https?:\/\/[^\s]+/);
    return urlMatch ? urlMatch[0].trim() : null;
  };

  let sharedData: ShareIntentData | null = null;

  if (hasShareIntent && shareIntent) {
    // webUrl is set when the shared content is a URL
    const url = shareIntent.webUrl || (shareIntent.text ? extractHttpUrl(shareIntent.text) : null);
    if (url) {
      sharedData = { url };
    }
  }

  const clearSharedData = () => {
    resetShareIntent();
  };

  return { sharedData, clearSharedData };
}
