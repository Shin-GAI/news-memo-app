import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";
import { registerOAuthRoutes } from "../server/_core/oauth";
import { invokeLLM } from "../server/_core/llm";
import { ENV } from "../server/_core/env";

const app = express();

// CORS
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Credentials", "true");
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
    return;
  }
  next();
});

app.use(express.json());

// Register OAuth and auth routes
registerOAuthRoutes(app);

app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

app.get("/api/health", (_req, res) => {
  const env = {
    GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
    BUILT_IN_FORGE_API_KEY: !!process.env.BUILT_IN_FORGE_API_KEY,
    DATABASE_URL: !!process.env.DATABASE_URL,
    JWT_SECRET: !!process.env.JWT_SECRET,
    OAUTH_SERVER_URL: !!process.env.OAUTH_SERVER_URL,
    VITE_APP_ID: !!process.env.VITE_APP_ID,
  };
  const aiKeyOk = env.GEMINI_API_KEY || env.BUILT_IN_FORGE_API_KEY;
  res.json({ ok: aiKeyOk, timestamp: new Date().toISOString(), env });
});

// Diagnostic endpoint: tests the actual LLM call end-to-end
app.get("/api/test-ai", async (_req, res) => {
  const hasGemini = !!ENV.geminiApiKey;
  const hasForge = !!ENV.forgeApiKey;
  if (!hasGemini && !hasForge) {
    res.status(500).json({ ok: false, error: "No AI API key configured", hasGemini, hasForge });
    return;
  }
  try {
    const result = await invokeLLM({
      messages: [{ role: "user", content: [{ type: "text", text: "Say 'ok' in one word." }] }],
    });
    const text = result.choices?.[0]?.message?.content;
    res.json({ ok: true, response: text, model: result.model, hasGemini, hasForge });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[test-ai]", msg);
    res.status(500).json({ ok: false, error: msg, hasGemini, hasForge });
  }
});

app.get("/", (_req, res) => {
  res.json({ status: "ok", message: "NewShare API 서버" });
});

export default app;
