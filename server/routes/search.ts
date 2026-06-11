import { Router } from "express";
import { COMPANIES } from "../../src/data/companies.js";

const router = Router();
const FMP_KEY = process.env.FMP_API_KEY || "";

const isKeyReady = (k: string) => k && k.length > 5 && !k.includes("YOUR_");

router.get("/", async (req, res) => {
  try {
    const query = (req.query.q as string || "").toUpperCase();
    if (!query) return res.json([]);
    
    if (isKeyReady(FMP_KEY)) {
      const response = await fetch(`https://financialmodelingprep.com/api/v3/search?query=${query}&limit=10&apikey=${FMP_KEY}`);
      if (response.ok) {
        const data = await response.json();
        return res.json(data.map((item: any) => ({
          symbol: item.symbol,
          name: item.name
        })));
      }
    }
    
    const mockTickers = COMPANIES.filter(t => t.symbol.includes(query) || t.name.toUpperCase().includes(query))
      .map(t => ({ symbol: t.symbol, name: t.name }));
    res.json(mockTickers.slice(0, 10));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
