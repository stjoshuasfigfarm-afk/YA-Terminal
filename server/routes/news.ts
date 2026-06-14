import { Router } from "express";
import axios from "axios";
import Parser from 'rss-parser';

const router = Router();
const FINNHUB_KEY = process.env.FINNHUB_API_KEY || "";
const parser = new Parser();

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
    
    // 0. Fetch Yahoo News via RSS
    try {
      const feed = await parser.parseURL(`https://feeds.finance.yahoo.com/rss/2.0/headline?s=${symbol}&region=US&lang=en-US`);
      if (feed && feed.items) {
        mappedNews = feed.items.slice(0, 10).map(item => ({
          title: item.title || "",
          description: item.contentSnippet || item.content || "",
          published_at: item.isoDate || item.pubDate || new Date().toISOString(),
          url: item.link || "",
          image: "", // Yahoo RSS doesn't reliably provide images via rss-parser without custom fields
          source: "Yahoo Finance",
          category: "Breaking",
          related: symbol
        }));
      }
    } catch (err: any) {
      console.warn("Yahoo RSS fetch failed, skipping:", err.message);
    }
    
    // 1. Fetch from Finnhub (if key present and ready)
    if (isKeyReady(FINNHUB_KEY) && mappedNews.length === 0) {

      try {
        const url = `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${fromDate}&to=${today}&token=${FINNHUB_KEY}`;
        const response = await axios.get(url, { timeout: 6000 });
        const data = response.data;

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
      const response = await axios.get(yahooUrl, {
        timeout: 5000,
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36" }
      });
      const result = response.data;
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
