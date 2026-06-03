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
    
    let attempts = 0;
    let response;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
      response = await fetch(url);
      if (response.ok) break;
      
      if (response.status === 504 || response.status === 502) {
        attempts++;
        console.warn(`News fetch API: Received ${response.status} (attempt ${attempts}/${maxAttempts}). Retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }
      break;
    }

    if (!response || !response.ok) {
      const status = response ? response.status : 504;
      if (status === 403) {
        // silent fail for finnhub missing permissions
      } else {
        const contentType = response?.headers.get("content-type") || "";
        if (contentType.includes("text/html") || status === 504) {
          console.warn(`News fetch API error: ${status} (received HTML response, possibly Cloudflare/upstream gateway timeout)`);
        } else if (response) {
          try {
            const txt = await response.text();
            console.warn("News fetch API error:", status, txt.length > 200 ? txt.slice(0, 200) + "..." : txt);
          } catch (_) {
            console.warn("News fetch API error status:", status);
          }
        }
      }
      return res.status(status).json({ error: "Upstream news service timeout or error", status });
    }
    const data = await response.json();
    
    if (Array.isArray(data)) {
      const mappedNews = data.slice(0, 15).map((n: any) => ({
        title: n.headline || "",
        description: n.summary || "",
        published_at: n.datetime ? new Date(n.datetime * 1000).toISOString() : new Date().toISOString(),
        url: n.url || "",
        image: n.image || "",
        source: n.source || "FINNHUB",
        category: n.category || "General",
        related: n.related || ""
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
