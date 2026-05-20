import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

// Create Express instance
const app = express();
app.use(express.json());

const PORT = 3000;

// Import modular routing definitions
import quoteRouter from "./server/routes/quote";
import newsRouter from "./server/routes/news";
import profileRouter from "./server/routes/profile";
import financialsRouter from "./server/routes/financials";
import historyRouter from "./server/routes/history";
import relationshipsRouter from "./server/routes/relationships";
import yieldsRouter from "./server/routes/yields";
import aiRouter from "./server/routes/ai";
import searchRouter from "./server/routes/search";

// Register modular REST API endpoints
app.use("/api/quote", quoteRouter);
app.use("/api/news", newsRouter);
app.use("/api/profile", profileRouter);
app.use("/api/financials", financialsRouter);
app.use("/api/history", historyRouter);
app.use("/api/relationships", relationshipsRouter);
app.use("/api/yields", yieldsRouter);
app.use("/api/ai", aiRouter);
app.use("/api/search", searchRouter);

// Service status endpoint
app.get("/api/status", (req, res) => {
  res.json({
    status: "ONLINE",
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
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
