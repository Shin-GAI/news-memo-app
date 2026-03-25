import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AppRouter } from "@/server/routers";
import { getApiBaseUrl } from "@/constants/oauth";
import * as Auth from "@/lib/_core/auth";

/**
 * tRPC React client for type-safe API calls.
 *
 * IMPORTANT (tRPC v11): The `transformer` must be inside `httpBatchLink`,
 * NOT at the root createClient level. This ensures client and server
 * use the same serialization format (superjson).
 */
export const trpc = createTRPCReact<AppRouter>();

/**
 * Creates the tRPC client with proper configuration.
 * Call this once in your app's root layout.
 */
export function createTRPCClient() {
  let baseUrl: string;
  try {
    baseUrl = getApiBaseUrl();
  } catch (e) {
    // EXPO_PUBLIC_API_BASE_URL not set — use empty string so the error
    // surfaces as a clear network error per request rather than crashing on startup.
    console.error("[tRPC]", e instanceof Error ? e.message : e);
    baseUrl = "";
  }

  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${baseUrl}/api/trpc`,
        // tRPC v11: transformer MUST be inside httpBatchLink, not at root
        transformer: superjson,
        async headers() {
          const token = await Auth.getSessionToken();
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
        // Resolve dynamic server URL from AsyncStorage per request (for custom server settings)
        async fetch(url, options) {
          let finalUrl = url.toString();
          try {
            const stored = await AsyncStorage.getItem("app_settings");
            if (stored) {
              const settings = JSON.parse(stored);
              if (settings.serverUrl && settings.serverUrl.trim().length > 0) {
                const base = settings.serverUrl.trim().replace(/\/$/, "");
                const parsed = new URL(finalUrl);
                finalUrl = `${base}${parsed.pathname}${parsed.search}`;
              }
            }
          } catch {
            // AsyncStorage 실패 시 기본 URL로 폴백
          }
          return fetch(finalUrl, {
            ...options,
            credentials: "include",
          });
        },
      }),
    ],
  });
}
