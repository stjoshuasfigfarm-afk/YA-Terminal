import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Proxy Handlers
  app.get("/api/quote", async (req, res) => {
    const { symbol } = req.query;
    const apiKey = process.env.FINANCIAL_API_KEY;
    const mock = { 
      symbol: symbol?.toString().toUpperCase(), 
      price: (150 + Math.random() * 20).toFixed(2), 
      change: (Math.random() * 4 - 2).toFixed(2), 
      changePercent: (Math.random() * 2 - 1).toFixed(2) 
    };

    if (!apiKey) return res.json(mock);
    try {
      const response = await axios.get(`https://financialmodelingprep.com/api/v3/quote/${symbol}?apikey=${apiKey}`);
      if (response.data && response.data.length > 0) {
        const q = response.data[0];
        return res.json({ symbol: q.symbol, price: q.price, change: q.change, changePercent: q.changesPercentage });
      }
      res.json(mock);
    } catch (e) { res.json(mock); }
  });

  app.get("/api/company", async (req, res) => {
    const { symbol } = req.query;
    const apiKey = process.env.FINANCIAL_API_KEY;
    const mock = { symbol, name: symbol + " Corp", sector: "Technology", employees: "120,000", marketCap: "2.5T", hq: "United States" };
    
    if (!apiKey) return res.json(mock);
    try {
      const response = await axios.get(`https://financialmodelingprep.com/api/v3/profile/${symbol}?apikey=${apiKey}`);
      if (response.data && response.data.length > 0) {
        const p = response.data[0];
        return res.json({ symbol: p.symbol, name: p.companyName, sector: p.sector, employees: p.fullTimeEmployees, marketCap: (p.mktCap/1e12).toFixed(2)+"T", hq: p.city + ", " + p.country });
      }
      res.json(mock);
    } catch (e) { res.json(mock); }
  });

  app.get("/api/income", async (req, res) => {
    const { symbol } = req.query;
    const apiKey = process.env.FINANCIAL_API_KEY;
    const mock = [{ date: "2023-12-31", netIncome: "25.2B" }, { date: "2023-09-30", netIncome: "22.1B" }];
    
    if (!apiKey) return res.json(mock);
    try {
      const response = await axios.get(`https://financialmodelingprep.com/api/v3/income-statement/${symbol}?limit=4&apikey=${apiKey}`);
      if (response.data && Array.isArray(response.data)) {
        return res.json(response.data.map((i: any) => ({ date: i.date, netIncome: (i.netIncome/1e9).toFixed(1)+"B" })));
      }
      res.json(mock);
    } catch (e) { res.json(mock); }
  });

  app.get("/api/balance", async (req, res) => {
    const { symbol } = req.query;
    const apiKey = process.env.FINANCIAL_API_KEY;
    const mock = { totalAssets: "350B", totalDebt: "150B", cash: "80B", equity: "200B" };
    
    if (!apiKey) return res.json(mock);
    try {
      const response = await axios.get(`https://financialmodelingprep.com/api/v3/balance-sheet-statement/${symbol}?limit=1&apikey=${apiKey}`);
      if (response.data && response.data.length > 0) {
        const b = response.data[0];
        return res.json({ totalAssets: (b.totalAssets/1e9).toFixed(1)+"B", totalDebt: (b.totalTotalDebt/1e9).toFixed(1)+"B", cash: (b.cashAndCashEquivalents/1e9).toFixed(1)+"B", equity: (b.totalStockholdersEquity/1e9).toFixed(1)+"B" });
      }
      res.json(mock);
    } catch (e) { res.json(mock); }
  });

  // Serve the index.html from root
  app.get("/", (req, res) => {
    res.sendFile(path.join(process.cwd(), "index.html"));
  });

  // Static Assets
  app.use(express.static(process.cwd()));

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[TERMINAL] HY Analysts Terminal Online: http://localhost:${PORT}`);
  });
}

startServer();
