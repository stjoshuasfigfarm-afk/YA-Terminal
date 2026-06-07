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
    
    let mappedNews: any[] = [];
    
    // 1. Fetch from Finnhub (if key present and ready)
    if (isKeyReady(FINNHUB_KEY)) {
      try {
        const url = `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${fromDate}&to=${today}&token=${FINNHUB_KEY}`;
        
        let attempts = 0;
        let response;
        const maxAttempts = 2;

        while (attempts < maxAttempts) {
          response = await fetch(url);
          if (response.ok) break;
          
          if (response.status === 504 || response.status === 502) {
            attempts++;
            console.warn(`Finnhub News fetch API: Received ${response.status} (attempt ${attempts}/${maxAttempts}). Retrying...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }
          break;
        }

        if (response && response.ok) {
          const data = await response.json();
          if (Array.isArray(data)) {
            mappedNews = data.slice(0, 15).map((n: any) => ({
              title: n.headline || "",
              description: n.summary || "",
              published_at: n.datetime ? new Date(n.datetime * 1000).toISOString() : new Date().toISOString(),
              url: n.url || "",
              image: n.image || "",
              source: n.source || "Finnhub",
              category: n.category || "General",
              related: n.related || ""
            }));
          }
        }
      } catch (err: any) {
        console.warn("Finnhub news fetch failed, skipping:", err.message);
      }
    }

    // 2. Fetch from Yahoo Finance News Search API
    let yahooNews: any[] = [];
    let yahooSymbol = symbol;
    if (symbol === "VIX") yahooSymbol = "^VIX";
    else if (symbol === "ARAMCO") yahooSymbol = "2222.SR";
    else if (symbol === "700" || symbol === "TCEHY") yahooSymbol = "0700.HK";
    else if (symbol === "9988" || symbol === "BABA") yahooSymbol = "9988.HK";
    else if (symbol === "005930") yahooSymbol = "005930.KS";
    else if (symbol === "SMC") yahooSymbol = "SMCI";

    try {
      const yahooUrl = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(yahooSymbol)}&newsCount=15`;
      const response = await fetch(yahooUrl, {
        headers: { "User-Agent": "Mozilla/5.0" }
      });
      if (response.ok) {
        const result = await response.json();
        if (result && Array.isArray(result.news)) {
          yahooNews = result.news.map((item: any) => {
            // Pick image URL from resolution list if available
            let imageUrl = "";
            if (item.thumbnail && item.thumbnail.resolutions && Array.isArray(item.thumbnail.resolutions)) {
              imageUrl = item.thumbnail.resolutions[0]?.url || "";
            }
            return {
              title: item.title || "",
              description: item.summary || "",
              published_at: item.providerPublishTime 
                ? new Date(item.providerPublishTime * 1000).toISOString() 
                : new Date().toISOString(),
              url: item.link || "",
              image: imageUrl,
              source: item.publisher || "Yahoo Finance",
              category: "Yahoo News",
              related: symbol
            };
          });
        }
      }
    } catch (e: any) {
      console.warn(`Yahoo news fetch failed for ${yahooSymbol}:`, e.message);
    }

    // Merge and Deduplicate by Title
    const seenTitles = new Set<string>();
    const combinedArr = [...mappedNews, ...yahooNews];
    const finalNews: any[] = [];

    for (const item of combinedArr) {
      const normalizedTitle = item.title.trim().toLowerCase();
      if (!normalizedTitle) continue;
      // Skip duplicate entries
      if (!seenTitles.has(normalizedTitle)) {
        seenTitles.add(normalizedTitle);
        finalNews.push(item);
      }
    }

    // Sort by publication time (most recent first)
    finalNews.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());

    // Slice to high-relevancy set (max 20 stories)
    res.json(finalNews.slice(0, 20));
  } catch (err: any) {
    console.error("News endpoint error:", err.message);
    res.json([]);
  }
});

export default router;
