import { NativeModules, Platform } from "react-native";

export interface OnDeviceAIInterface {
  /**
   * Returns true if Google AI Edge (Gemini Nano via AICore) is available.
   * Requires: Pixel 8+, Android 14+, AICore system service installed.
   */
  isGoogleEdgeAvailable(): Promise<boolean>;

  /**
   * Returns true if Samsung Galaxy AI is available.
   * Requires: Galaxy S24+ (SM-S92x / SM-S91x) running One UI 6.1+.
   */
  isSamsungEdgeAvailable(): Promise<boolean>;

  /**
   * Run text generation on-device.
   * @param prompt  Full prompt to send to the model
   * @param engine  "google" or "samsung"
   * @returns Generated text response
   */
  generateText(prompt: string, engine: "google" | "samsung"): Promise<string>;
}

const nativeModule = NativeModules.OnDeviceAIModule as OnDeviceAIInterface | undefined;

// Fallback stubs for unsupported platforms / module not yet linked
const unavailableStub: OnDeviceAIInterface = {
  isGoogleEdgeAvailable: () => Promise.resolve(false),
  isSamsungEdgeAvailable: () => Promise.resolve(false),
  generateText: () =>
    Promise.reject(new Error("On-device AI is not available on this platform")),
};

export const OnDeviceAI: OnDeviceAIInterface =
  Platform.OS === "android" && nativeModule ? nativeModule : unavailableStub;
