import { Router } from "express";
import { COMPANIES } from "../../src/data/companies";

const router = Router();
const FINNHUB_KEY = process.env.FINNHUB_API_KEY || "";

const isKeyReady = (k: string) => k && k.length > 5 && !k.includes("YOUR_");

router.get("/:symbol?", async (req, res) => {
  try {
    const symbol = (req.params.symbol || req.query.symbol as string || "").toUpperCase();
    if (!symbol) return res.status(400).json({ error: "Missing symbol" });
    
    if (!isKeyReady(FINNHUB_KEY)) throw new Error("Finnhub key missing");
    
    const response = await fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${FINNHUB_KEY}`);
    if (!response.ok) throw new Error(`HTTP_${response.status}`);
    const data = await response.json();
    
    if (data && data.name) {
      return res.json({
        mktCap: (data.marketCapitalization || 0) * 1000000,
        companyName: data.name,
        industry: data.finnhubIndustry || "General Industry",
        website: data.weburl || "",
        logo: data.logo || "",
        currency: data.currency || "USD"
      });
    } else {
      throw new Error("No display profile found in response");
    }
  } catch (err: any) {
    const symbol = (req.params.symbol || req.query.symbol as string || "AAPL").toUpperCase();
    const fallbackCompanyName = COMPANIES.find(c => c.symbol === symbol)?.name || symbol;
    res.json({
      mktCap: 1500000000000 + Math.random() * 100000000000,
      companyName: fallbackCompanyName,
      industry: "Technology",
      website: "https://example.com",
      currency: "USD",
      mock: true,
      error: err.message
    });
  }
});

export default router;
