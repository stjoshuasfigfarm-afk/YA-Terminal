import dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { COMPANIES } from "./src/data/companies";
import handler from "./api/index.js";

const app = express();
app.use(express.json());
export default app;
const PORT = 3000;

const FMP_KEY = process.env.FMP_API_KEY || "";
const FINNHUB_KEY = process.env.FINNHUB_API_KEY || "";

const isKeyReady = (k: string) => {
  if (!k) return false;
  if (k.length < 5) return false;
  if (k.includes('YOUR_')) return false;
  return true;
};

if (!isKeyReady(FMP_KEY)) console.warn(">>> [DEPLOYMENT_WARN] FMP_API_KEY not configured. Falling back to simulations.");
if (!isKeyReady(FINNHUB_KEY)) console.warn(">>> [DEPLOYMENT_WARN] FINNHUB_API_KEY not configured. Falling back to simulations.");

// API Routes - Delegate all /api requests to the unified API engine
app.all("/api*", async (req, res) => {
  try {
    // Inject service parameter if path-based route is used (Express doesn't always populate req.query as Vercel does)
    await handler(req, res);
  } catch (err) {
    console.error("API Engine Error:", err);
    res.status(500).json({ error: "Intelligence Terminal Engine Fault", details: err.message });
  }
});


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
    console.log(`Intelligence Terminal Server active on port ${PORT}`);
  });
}

startServer();
