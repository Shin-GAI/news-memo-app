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
        url: async () => {
          // 사용자가 설정에서 서버 URL을 지정했으면 우선 사용 (안드로이드/iOS용)
          try {
            const stored = await AsyncStorage.getItem("app_settings");
            if (stored) {
              const settings = JSON.parse(stored);
              if (settings.serverUrl && settings.serverUrl.trim().length > 0) {
                return `${settings.serverUrl.trim().replace(/\/$/, "")}/api/trpc`;
              }
            }
          } catch {
            // AsyncStorage 실패 시 기본값으로 폴백
          }
          return `${baseUrl}/api/trpc`;
        },
        // tRPC v11: transformer MUST be inside httpBatchLink, not at root
        transformer: superjson,
        async headers() {
          const token = await Auth.getSessionToken();
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
        // Custom fetch to include credentials for cookie-based auth
        fetch(url, options) {
          return fetch(url, {
            ...options,
            credentials: "include",
          });
        },
      }),
    ],
  });
}
