import { Router } from "express";

const router = Router();
const FINNHUB_KEY = process.env.FINNHUB_API_KEY || "";

const isKeyReady = (k: string) => k && k.length > 5 && !k.includes("YOUR_");

router.get("/:symbol?", async (req, res) => {
  try {
    const symbol = (req.params.symbol || req.query.symbol as string || "").toUpperCase();
    if (!symbol) return res.status(400).json({ error: "Missing symbol" });
    
    const today = new Date().toISOString().split('T')[0];
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const fromDate = lastMonth.toISOString().split('T')[0];
    
    if (!isKeyReady(FINNHUB_KEY)) {
      return res.json([]);
    }

    const url = `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${fromDate}&to=${today}&token=${FINNHUB_KEY}`;
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 403) {
        console.warn("News fetch API: Access forbidden (403). Check Finnhub API key permissions.");
      } else {
        console.error("News fetch API error:", response.status, await response.text());
      }
      return res.json([]);
    }
    const data = await response.json();
    
    if (Array.isArray(data)) {
      const mappedNews = data.slice(0, 15).map((n: any) => ({
        title: n.headline || "",
        description: n.summary || "",
        published_at: n.datetime ? new Date(n.datetime * 1000).toISOString() : new Date().toISOString(),
        url: n.url || "",
        image: n.image || ""
      }));
      return res.json(mappedNews);
    }
    
    res.json([]);
  } catch (err: any) {
    console.error("News fetch error:", err.message);
    res.json([]);
  }
});

export default router;
