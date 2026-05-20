import { Router } from "express";

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
    
    const mockTickers = [
      { symbol: 'AAPL', name: 'Apple Inc.' },
      { symbol: 'MSFT', name: 'Microsoft Corp.' },
      { symbol: 'GOOGL', name: 'Alphabet Inc.' },
      { symbol: 'TSLA', name: 'Tesla Inc.' },
      { symbol: 'NVDA', name: 'Nvidia Corp.' }
    ].filter(t => t.symbol.includes(query));
    res.json(mockTickers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
