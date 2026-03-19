package expo.modules.ondeviceai

import android.content.pm.PackageManager
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/**
 * OnDeviceAIModule
 *
 * Exposes on-device AI inference to React Native for two engines:
 *  1. Google AI Edge  – Gemini Nano via AICore / MediaPipe LLM Inference API
 *     Supported on: Pixel 8+, Android 14+, AICore package installed
 *  2. Samsung Galaxy AI – via Samsung Intelligence Service
 *     Supported on: Galaxy S24+ running One UI 6.1+
 *
 * Both engines fall back gracefully when hardware/software requirements
 * are not met. The JS layer checks availability before calling generateText.
 */
class OnDeviceAIModule : Module() {

    override fun definition() = ModuleDefinition {

        Name("OnDeviceAIModule")

        // ─── Google AI Edge availability ─────────────────────────────────────

        AsyncFunction("isGoogleEdgeAvailable") { promise: Promise ->
            try {
                promise.resolve(checkGoogleEdgeAvailability())
            } catch (e: Exception) {
                promise.resolve(false)
            }
        }

        // ─── Samsung Galaxy AI availability ──────────────────────────────────

        AsyncFunction("isSamsungEdgeAvailable") { promise: Promise ->
            try {
                promise.resolve(checkSamsungEdgeAvailability())
            } catch (e: Exception) {
                promise.resolve(false)
            }
        }

        // ─── Text generation ─────────────────────────────────────────────────

        AsyncFunction("generateText") { prompt: String, engine: String, promise: Promise ->
            CoroutineScope(Dispatchers.IO).launch {
                try {
                    val result = when (engine) {
                        "google" -> generateWithGoogleEdge(prompt)
                        "samsung" -> generateWithSamsungEdge(prompt)
                        else -> throw IllegalArgumentException("Unknown engine: $engine")
                    }
                    promise.resolve(result)
                } catch (e: Exception) {
                    promise.reject("GENERATE_ERROR", e.message ?: "Generation failed", e)
                }
            }
        }
    }

    // ─── Google AI Edge ───────────────────────────────────────────────────────

    /**
     * Check if Google AI Edge (Gemini Nano) is available.
     *
     * Gemini Nano requires:
     *  - Android 14+ (API 34+)
     *  - AICore system package (com.google.android.aicore) installed
     *  - Compatible hardware (Pixel 8 / Pixel 8 Pro or newer)
     */
    private fun checkGoogleEdgeAvailability(): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE) return false
        return try {
            appContext.reactContext?.packageManager
                ?.getApplicationInfo("com.google.android.aicore", 0) != null
        } catch (e: PackageManager.NameNotFoundException) {
            false
        }
    }

    /**
     * Generate text using Google AI Edge (Gemini Nano).
     *
     * Uses MediaPipe LLM Inference API to call Gemini Nano on-device.
     * The model file is managed by the AICore system service – no manual
     * download required on supported devices.
     *
     * Implementation note:
     *   Uncomment and configure the MediaPipe block below once you have
     *   confirmed device support. The current implementation returns a
     *   structured placeholder so the JS parsing pipeline can be tested.
     *
     *   val options = LlmInference.LlmInferenceOptions.builder()
     *       .setModelPath("/data/local/tmp/gemini-nano.bin")  // or model from AICore
     *       .setMaxTokens(1024)
     *       .build()
     *   val llm = LlmInference.createFromOptions(appContext.reactContext!!, options)
     *   return llm.generateResponse(prompt)
     */
    private suspend fun generateWithGoogleEdge(prompt: String): String {
        if (!checkGoogleEdgeAvailability()) {
            throw IllegalStateException("Google AI Edge is not available on this device")
        }

        // TODO: Replace with actual MediaPipe LLM Inference API call
        // Reference: https://ai.google.dev/edge/mediapipe/solutions/genai/llm_inference/android
        //
        // val options = LlmInference.LlmInferenceOptions.builder()
        //     .setModelPath(getGeminiNanoModelPath())
        //     .setMaxTokens(1024)
        //     .setTopK(40)
        //     .setTemperature(0.8f)
        //     .build()
        // val llm = LlmInference.createFromOptions(context, options)
        // return llm.generateResponse(prompt)

        throw UnsupportedOperationException(
            "Google AI Edge: MediaPipe LLM implementation pending. " +
            "See OnDeviceAIModule.kt generateWithGoogleEdge() for setup instructions."
        )
    }

    // ─── Samsung Galaxy AI ────────────────────────────────────────────────────

    /**
     * Check if Samsung Galaxy AI is available.
     *
     * Galaxy AI requires:
     *  - Samsung Galaxy S24 / S24+ / S24 Ultra or newer (SM-S92x / SM-S91x)
     *  - One UI 6.1+
     *  - Samsung Intelligence Service active
     */
    private fun checkSamsungEdgeAvailability(): Boolean {
        val manufacturer = Build.MANUFACTURER.lowercase()
        if (manufacturer != "samsung") return false

        // Galaxy S24 series model prefixes (SM-S921, SM-S926, SM-S928)
        // Galaxy S25 series: SM-S931, SM-S936, SM-S938
        val supportedPrefixes = listOf(
            "SM-S921", "SM-S926", "SM-S928",  // S24
            "SM-S931", "SM-S936", "SM-S938",  // S25
            "SM-F956", "SM-F946",              // Z Fold 6
            "SM-F721",                         // Z Flip 4 (One UI 8.0+)
        )
        val model = Build.MODEL.uppercase()
        return supportedPrefixes.any { model.startsWith(it) }
    }

    /**
     * Generate text using Samsung Galaxy AI.
     *
     * Samsung's on-device AI is accessible via the Samsung Intelligence
     * Service (One UI 6.1+). The public SDK is available through Samsung's
     * developer portal: https://developer.samsung.com/galaxy-ai
     *
     * Implementation note:
     *   Samsung's SDK requires registration at developer.samsung.com.
     *   Once the SDK AAR is added to the project, replace the TODO block:
     *
     *   val config = IntelligenceServiceConfig.Builder()
     *       .setFeature(IntelligenceFeature.TEXT_GENERATION)
     *       .build()
     *   val service = SamsungIntelligenceService.getInstance(context, config)
     *   return service.generateText(prompt).await()
     */
    private suspend fun generateWithSamsungEdge(prompt: String): String {
        if (!checkSamsungEdgeAvailability()) {
            throw IllegalStateException("Samsung Galaxy AI is not available on this device")
        }

        // TODO: Replace with Samsung Intelligence Service API call
        // SDK: https://developer.samsung.com/galaxy-ai
        //
        // val service = SamsungIntelligenceService.getInstance(context)
        // val request = TextGenerationRequest.Builder()
        //     .setPrompt(prompt)
        //     .setMaxTokens(1024)
        //     .build()
        // return service.generateText(request).text

        throw UnsupportedOperationException(
            "Samsung Galaxy AI: Intelligence Service SDK implementation pending. " +
            "See OnDeviceAIModule.kt generateWithSamsungEdge() for setup instructions."
        )
    }
}
