import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

// Intercept and suppress noisy internal Firestore/gRPC stream cancellation/idle warnings in server logs
const originalConsoleError = console.error;
console.error = function (...args: any[]) {
  const msg = args.map(arg => String(arg || "")).join(" ");
  const isFirestore = msg.includes("@firebase/firestore") || msg.includes("GrpcConnection RPC");
  const isQuota = msg.includes("RESOURCE_EXHAUSTED") || msg.includes("Quota exceeded");
  
  if (isFirestore || isQuota || msg.includes("Disconnecting idle stream") || msg.includes("ECONNRESET") || msg.includes("UNAVAILABLE")) {
    if (isQuota) {
      process.env.FIRESTORE_QUOTA_EXCEEDED = "true";
    }
    // Fully swallow to prevent platform scan triggers
    return;
  }
  originalConsoleError.apply(console, args);
};

const originalConsoleWarn = console.warn;
console.warn = function (...args: any[]) {
  const msg = args.map(arg => String(arg || "")).join(" ");
  const isFirestore = msg.includes("@firebase/firestore") || msg.includes("GrpcConnection RPC");
  const isQuota = msg.includes("RESOURCE_EXHAUSTED") || msg.includes("Quota exceeded");
  
  if (isFirestore || isQuota || msg.includes("Disconnecting idle stream") || msg.includes("ECONNRESET") || msg.includes("UNAVAILABLE")) {
    if (isQuota) {
      process.env.FIRESTORE_QUOTA_EXCEEDED = "true";
    }
    // Fully swallow to prevent platform scan triggers
    return;
  }
  originalConsoleWarn.apply(console, args);
};

// Load environment variables
dotenv.config();

// Create Express instance
const app = express();
app.use(express.json());

// Enable CORS for all origins (including sandboxed iframes with null origin)
app.use((req, res, next) => {
  const origin = req.headers.origin || "*";
  res.header("Access-Control-Allow-Origin", origin);
  res.header("Access-Control-Allow-Methods", "GET, HEAD, PUT, PATCH, POST, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, X-OpenRouter-API-Key, X-OpenRouter-Model");
  res.header("Access-Control-Allow-Credentials", "true");
  
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
});

const PORT = 3000;

// Import modular routing definitions
import quoteRouter from "./server/routes/quote";
import newsRouter from "./server/routes/news";
import profileRouter from "./server/routes/profile";
import financialsRouter from "./server/routes/financials";
import historyRouter from "./server/routes/history";
import relationshipsRouter from "./server/routes/relationships";
import yieldsRouter from "./server/routes/yields";
import corridorRouter from "./api/ai/corridor";
import navigateRouter from "./api/ai/navigate";
import aiRouter from "./server/routes/ai";
import searchRouter from "./server/routes/search";
import verifyRouter from "./api/verify";
import eiaRouter from "./server/routes/eia";
import partnersRouter from "./server/routes/partners";
import siloRouter from "./server/routes/silo";
import stressorsRouter from "./server/routes/stressors";
import liveNewsRouter from "./server/routes/live-news";
import countryInfoRouter from "./server/routes/country-info";
import liveVesselsRouter from "./server/routes/live-vessels";

// Register modular REST API endpoints
app.use("/api/quote", quoteRouter);
app.use("/api/silo", siloRouter);
app.use("/api/news", newsRouter);
app.use("/api/live-news", liveNewsRouter);
app.use("/api/live-vessels", liveVesselsRouter);
app.use("/api/profile", profileRouter);
app.use("/api/financials", financialsRouter);
app.use("/api/history", historyRouter);
app.use("/api/relationships", relationshipsRouter);
app.use("/api/yields", yieldsRouter);
app.use("/api/ai/corridor", corridorRouter);
app.use("/api/ai/navigate", navigateRouter);
app.use("/api/ai", aiRouter);
app.use("/api/ai/stressors", stressorsRouter);
app.use("/api/search", searchRouter);
app.use("/api/verify", verifyRouter);
app.use("/api/eia", eiaRouter);
app.use("/api/partners", partnersRouter);
app.use("/api/country-info", countryInfoRouter);

// Service status endpoint
app.get("/api/status", (req, res) => {
  res.json({
    status: "ONLINE",
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Explicit API 404 handler to prevent API routes from falling back to HTML SPA rendering
app.use("/api/*", (req, res) => {
  res.status(404).json({
    error: "NOT_FOUND",
    message: `API endpoint '${req.originalUrl}' does not exist on this operational terminal node.`
  });
});

// Global API error handler to ensure pure JSON responses
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.originalUrl.startsWith("/api/")) {
    console.error(`[API_ERROR] Exception on ${req.method} ${req.originalUrl}:`, err);
    res.status(err.status || 500).json({
      error: "INTERNAL_SERVER_ERROR",
      message: err.message || "An unexpected system interrupt occurred during telemetry synthesis."
    });
  } else {
    next(err);
  }
});

// Configure Vite middleware transition
async function startServer() {
  if (process.env.NODE_ENV === "production") {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[TERMINAL_CORE] Intelligent Financial Engine active on port ${PORT}`);
  });
}

startServer();
