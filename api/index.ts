import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";
import { registerOAuthRoutes } from "../server/_core/oauth";

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

app.get("/", (_req, res) => {
  res.json({ status: "ok", message: "뉴스쉐어 API 서버" });
});

export default app;
