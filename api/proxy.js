import url from "url";

// Server-side cache helper
const cacheStore = new Map();

function withCache(key, fetcher, ttlMs = 15000) {
  const cached = cacheStore.get(key);
  const now = Date.now();
  if (cached && (now - cached.timestamp < ttlMs)) {
    return Promise.resolve(cached.data);
  }
  return fetcher().then((data) => {
    cacheStore.set(key, { timestamp: now, data });
    return data;
  });
}

// REST call to Gemini model as standard stable service
async function callGemini(modelName, prompt, jsonResponse, apiKey) {
  const urlPath = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
  const response = await fetch(urlPath, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: jsonResponse ? { responseMimeType: "application/json" } : {}
    })
  });
  if (!response.ok) {
    throw new Error(`Gemini service returned failure status: ${response.status}`);
  }
  const result = await response.json();
  return result.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

export default async function handler(req, res) {
  // CORS configuration for client-side consumption
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader("Access-Control-Allow-Headers", "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const query = parsedUrl.query;
  const rawPath = query.path || "";
  
  // Reconstruct path matching Express endpoints
  const pathname = "/api/" + rawPath;
  const symbol = (query.symbol || "").toUpperCase();
  const country = (query.country || "").toUpperCase();

  // Route: /api/status - Operational Health Check
  if (pathname === "/api/status") {
    return res.status(200).json({
      status: "ONLINE",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      orchestration: "VERCEL_SERVERLESS_FLOW"
    });
  }

  // Route: /api/quote
  if (pathname === "/api/quote") {
    if (!symbol) return res.status(400).json({ error: "Missing symbol param" });
    const FMP_KEY = process.env.FMP_API_KEY || "";
    const FINNHUB_KEY = process.env.FINNHUB_API_KEY || "";
    const ITIC_KEY = process.env.ITIC_API_KEY || "";

    const isKeyReady = (k) => k && k.length > 5 && !k.includes("YOUR_");

    let data = {};
    let source = "NONE";

    // Try FMP
    if (isKeyReady(FMP_KEY)) {
      try {
        const urlStr = `https://financialmodelingprep.com/api/v3/quote/${symbol}?apikey=${FMP_KEY}`;
        const fmpData = await withCache(`fmp_${symbol}`, () => fetch(urlStr).then(r => r.json()), 10000);
        if (fmpData && fmpData[0]) {
          data = fmpData[0];
          source = "FMP";
        }
      } catch (e) {
        console.warn("FMP quote fetch error in serverless proxy:", e.message);
      }
    }

    // Try Finnhub
    if (source === "NONE" && isKeyReady(FINNHUB_KEY)) {
      try {
        const urlStr = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_KEY}`;
        const fhData = await withCache(`finnhub_${symbol}`, () => fetch(urlStr).then(r => r.json()), 10000);
        if (fhData && fhData.c) {
          data = {
            price: fhData.c,
            change: fhData.d,
            changesPercentage: fhData.dp,
            dayHigh: fhData.h,
            dayLow: fhData.l,
            open: fhData.o,
            previousClose: fhData.pc
          };
          source = "FINNHUB";
        }
      } catch (e) {
        console.warn("Finnhub quote fetch error in serverless proxy:", e.message);
      }
    }

    // Try ITIC
    if (source === "NONE" && isKeyReady(ITIC_KEY)) {
      try {
        const urlStr = `https://api.itick.io/v1/quote?symbol=${symbol}&token=${ITIC_KEY}`;
        const itkData = await withCache(`itk_${symbol}`, () => fetch(urlStr).then(r => r.json()), 10000);
        if (itkData && itkData.price) {
          data = {
            price: itkData.price,
            change: itkData.change,
            changesPercentage: itkData.changePercent || 0,
            dayHigh: itkData.high || itkData.price,
            dayLow: itkData.low || itkData.price,
            open: itkData.open || itkData.price,
            previousClose: itkData.prevClose || itkData.price
          };
          source = "ITICK";
        }
      } catch (e) {
        console.warn("ITICK quote fetch error in serverless proxy:", e.message);
      }
    }

    if (source === "NONE") {
      const price = 150 + Math.random() * 50;
      return res.status(200).json({
        price: price,
        changes: (Math.random() - 0.5) * 5,
        changesPercentage: (Math.random() - 0.5) * 2,
        high: price + 2,
        low: price - 2,
        open: price,
        previousClose: price - 1,
        symbol: symbol,
        mock: true,
        source: "FALLBACK_SYNTHESIS"
      });
    }

    return res.status(200).json({
      price: data.price,
      changes: data.change,
      changesPercentage: data.changesPercentage,
      high: data.dayHigh,
      low: data.dayLow,
      open: data.open,
      previousClose: data.previousClose,
      symbol,
      source
    });
  }

  // Route: /api/news
  if (pathname === "/api/news") {
    if (!symbol) return res.status(400).json({ error: "Missing symbol param" });
    const FINNHUB_KEY = process.env.FINNHUB_API_KEY || "";
    const isKeyReady = (k) => k && k.length > 5 && !k.includes("YOUR_");

    if (!isKeyReady(FINNHUB_KEY)) {
      return res.status(200).json([
        {
          title: `Telemetry validation protocols activated for ${symbol}`,
          description: `Strategic nodes across Asia and North America register high bandwidth optimization. Neural stream remains healthy.`,
          published_at: new Date().toISOString(),
          url: "https://finnhub.io",
          image: ""
        },
        {
          title: `Global semiconductor and logistics index updates for ${symbol}`,
          description: `Market parameters indicate low latency in routing. Macro telemetry values align with baseline expectations.`,
          published_at: new Date(Date.now() - 86400000).toISOString(),
          url: "https://finnhub.io",
          image: ""
        }
      ]);
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const fromDate = lastMonth.toISOString().split('T')[0];

      const urlPath = `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${fromDate}&to=${today}&token=${FINNHUB_KEY}`;
      const data = await withCache(`news_${symbol}`, () => fetch(urlPath).then(r => r.json()), 15000);
      
      if (Array.isArray(data)) {
        const mappedNews = data.slice(0, 15).map((n) => ({
          title: n.headline || "",
          description: n.summary || "",
          published_at: n.datetime ? new Date(n.datetime * 1000).toISOString() : new Date().toISOString(),
          url: n.url || "",
          image: n.image || ""
        }));
        return res.status(200).json(mappedNews);
      }
    } catch (err) {
      console.error("News serverless proxy fetch error:", err.message);
    }
    return res.status(200).json([]);
  }

  // Route: /api/profile
  if (pathname === "/api/profile") {
    if (!symbol) return res.status(400).json({ error: "Missing symbol param" });
    const FINNHUB_KEY = process.env.FINNHUB_API_KEY || "";
    const isKeyReady = (k) => k && k.length > 5 && !k.includes("YOUR_");

    if (isKeyReady(FINNHUB_KEY)) {
      try {
        const urlStr = `https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${FINNHUB_KEY}`;
        const data = await withCache(`profile_${symbol}`, () => fetch(urlStr).then(r => r.json()), 60000);
        if (data && data.name) {
          return res.status(200).json({
            mktCap: (data.marketCapitalization || 0) * 1000000,
            companyName: data.name,
            industry: data.finnhubIndustry || "General Industry",
            website: data.weburl || "",
            logo: data.logo || "",
            currency: data.currency || "USD"
          });
        }
      } catch (e) {
        console.error("Profile serverless proxy error:", e.message);
      }
    }

    const hash = symbol.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return res.status(200).json({
      mktCap: 1500000000000 + (hash * 9872341),
      companyName: `${symbol} Terminal Node`,
      industry: hash % 2 === 0 ? "Technology" : "Semiconductors",
      website: `https://www.${symbol.toLowerCase()}.com`,
      currency: "USD",
      mock: true
    });
  }

  // Route: /api/financials
  if (pathname === "/api/financials") {
    if (!symbol) return res.status(400).json({ error: "Missing symbol param" });
    const FINNHUB_KEY = process.env.FINNHUB_API_KEY || "";
    const isKeyReady = (k) => k && k.length > 5 && !k.includes("YOUR_");

    if (isKeyReady(FINNHUB_KEY)) {
      try {
        const urlStr = `https://finnhub.io/api/v1/stock/earnings?symbol=${symbol}&token=${FINNHUB_KEY}`;
        const data = await withCache(`financials_${symbol}`, () => fetch(urlStr).then(r => r.json()), 60000);
        if (Array.isArray(data)) {
          const mapped = data.map((e) => ({
            date: e.period || "N/A",
            netIncome: e.actual - e.estimate || 0
          }));
          return res.status(200).json(mapped);
        }
      } catch (err) {
        console.error("Financials serverless proxy error:", err.message);
      }
    }

    return res.status(200).json([
      { date: "2024-Q4", netIncome: 1.2 },
      { date: "2024-Q3", netIncome: 0.8 },
      { date: "2024-Q2", netIncome: 1.5 },
      { date: "2024-Q1", netIncome: -0.4 }
    ]);
  }

  // Route: /api/history
  if (pathname === "/api/history") {
    if (!symbol) return res.status(400).json({ error: "Missing symbol param" });
    const FINNHUB_KEY = process.env.FINNHUB_API_KEY || "";
    const isKeyReady = (k) => k && k.length > 5 && !k.includes("YOUR_");

    if (isKeyReady(FINNHUB_KEY)) {
      try {
        const to = Math.floor(Date.now() / 1000);
        const from = to - (60 * 24 * 60 * 60); // 60 days
        const urlStr = `https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=D&from=${from}&to=${to}&token=${FINNHUB_KEY}`;
        const data = await withCache(`history_${symbol}`, () => fetch(urlStr).then(r => r.json()), 30000);
        if (data && data.s === "ok" && Array.isArray(data.t)) {
          const historical = data.t.map((t, i) => ({
            time: t,
            open: data.o[i],
            high: data.h[i],
            low: data.l[i],
            close: data.c[i],
            volume: data.v[i]
          }));
          return res.status(200).json({ historical });
        }
      } catch (e) {
        console.error("History serverless proxy fetch error:", e);
      }
    }

    const mockHistorical = [];
    const now = Date.now();
    let lastPrice = 160 + (symbol.charCodeAt(0) % 15) * 6;
    for (let i = 45; i >= 0; i--) {
      const date = new Date(now - i * 24 * 60 * 60 * 1000);
      const open = lastPrice;
      const close = open + (Math.random() - 0.5) * 6;
      mockHistorical.push({
        time: Math.floor(date.getTime() / 1000),
        open,
        high: Math.max(open, close) + 2,
        low: Math.min(open, close) - 2,
        close,
        volume: Math.floor(600000 + Math.random() * 1500000)
      });
      lastPrice = close;
    }
    return res.status(200).json({ historical: mockHistorical, mock: true });
  }

  // Route: /api/relationships
  if (pathname === "/api/relationships" || pathname.startsWith("/api/relationships")) {
    const pathSymbol = pathname.split("/").pop();
    const effectiveSymbol = (pathSymbol && pathSymbol !== "relationships" ? pathSymbol : symbol || "AAPL").toUpperCase();

    const relationshipMap = {
      'AAPL': {
        suppliers: [
          { name: 'TSMC', symbol: 'TSM', city: 'Hsinchu', coords: [24.7736, 120.9436] },
          { name: 'Foxconn', symbol: '2317.TW', city: 'New Taipei', coords: [24.9983, 121.4842] },
          { name: 'Samsung Display', symbol: '005930.KS', city: 'Suwon', coords: [37.2636, 127.0286] }
        ],
        customers: [
          { name: 'Verizon', symbol: 'VZ', city: 'New York', coords: [40.7128, -74.0060] },
          { name: 'AT&T', symbol: 'T', city: 'Dallas', coords: [32.7767, -96.7970] }
        ]
      },
      'TSLA': {
        suppliers: [
          { name: 'Panasonic', symbol: '6752.T', city: 'Osaka', coords: [34.6937, 135.5023] },
          { name: 'CATL', symbol: '300750.SZ', city: 'Ningde', coords: [26.6655, 119.5479] }
        ],
        customers: [
          { name: 'US Government', symbol: 'USA', city: 'Washington', coords: [38.9072, -77.0369] },
          { name: 'Hertz', symbol: 'HTZ', city: 'Estero', coords: [26.4381, -81.8068] }
        ]
      },
      'NVDA': {
        suppliers: [
          { name: 'TSMC', symbol: 'TSM', city: 'Hsinchu', coords: [24.7736, 120.9436] },
          { name: 'SK Hynix', symbol: '000660.KS', city: 'Icheon', coords: [37.2723, 127.4435] }
        ],
        customers: [
          { name: 'Microsoft', symbol: 'MSFT', city: 'Redmond', coords: [47.6740, -122.1215] },
          { name: 'Google', symbol: 'GOOGL', city: 'Mountain View', coords: [37.3861, -122.0839] },
          { name: 'Meta', symbol: 'META', city: 'Menlo Park', coords: [37.4530, -122.1817] }
        ]
      }
    };

    const defaultRels = {
      suppliers: [
        { name: 'Logic_Silo_A', symbol: 'SUP_A', city: 'Shenzhen', coords: [22.5431, 114.0579] },
        { name: 'Logic_Silo_B', symbol: 'SUP_B', city: 'Bangalore', coords: [12.9716, 77.5946] }
      ],
      customers: [
        { name: 'Retail_Node_01', symbol: 'CON_01', city: 'London', coords: [51.5074, -0.1278] }
      ]
    };

    const result = relationshipMap[effectiveSymbol] || defaultRels;
    return res.status(200).json({
      source: "RELATIONAL_SYNTHESIS",
      relationships: result
    });
  }

  // Route: /api/yields
  if (pathname === "/api/yields") {
    const FMP_KEY = process.env.FMP_API_KEY || "";
    const isKeyReady = (k) => k && k.length > 5 && !k.includes("YOUR_");

    const treasuryMap = {
      '2Y': 4.82,
      '5Y': 4.45,
      '10Y': 4.42,
      '30Y': 4.56
    };

    const results = {
      treasuries: {},
      interestRate: 5.50,
      country: country || "USA",
      updatedAt: new Date().toISOString()
    };

    if (isKeyReady(FMP_KEY)) {
      try {
        const urlStr = `https://financialmodelingprep.com/api/v4/treasury?from=2024-01-01&apikey=${FMP_KEY}`;
        const data = await withCache("fmp_yield", () => fetch(urlStr).then(r => r.json()), 60000);
        if (Array.isArray(data) && data.length > 0) {
          const latest = data[0];
          results.treasuries = {
            '2Y': parseFloat(latest.twoYear) || 4.82,
            '5Y': parseFloat(latest.fiveYear) || 4.45,
            '10Y': parseFloat(latest.tenYear) || 4.42,
            '30Y': parseFloat(latest.thirtyYear) || 4.56
          };
        }
      } catch (e) {
        console.warn("FMP treasury fetch error in serverless proxy:", e.message);
      }
    }

    if (Object.keys(results.treasuries).length === 0) {
      Object.keys(treasuryMap).forEach(k => {
        results.treasuries[k] = treasuryMap[k] + (Math.random() - 0.5) * 0.05;
      });
    }

    const ratesMap = {
      'USA': 5.50, 'US': 5.50, 'CHN': 3.45, 'JPN': 0.10, 'DEU': 4.50,
      'GBR': 5.25, 'FRA': 4.50, 'CHE': 1.50, 'CAN': 5.00, 'KOR': 3.50, 'TWN': 2.00
    };

    results.interestRate = ratesMap[results.country] || 4.25;
    return res.status(200).json(results);
  }

  // Route: /api/ai/
  if (pathname.startsWith("/api/ai/")) {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
    if (!GEMINI_API_KEY || GEMINI_API_KEY.length < 5) {
      return res.status(503).json({ error: "AI_LINK_DISCONNECTED", message: "Gemini key is invalid or omitted on deployment." });
    }

    // Body parser fallback on serverless standard
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {}
    }
    body = body || {};

    try {
      if (pathname === "/api/ai/enrich-news") {
        const rawData = body.data || [];
        if (!Array.isArray(rawData)) {
          return res.status(400).json({ error: "Array expected" });
        }

        const prompt = `
          Analyze these news headlines/summaries.
          Translate to professional English if needed.
          Summarize into a concise "Neural Link" headline (max 80 chars).
          Return JSON array of objects: [{ "translatedTitle": string }]
          
          News Table:
          ${rawData.map((n, i) => `${i+1}. TITLE: ${n.title} | SUMMARY: ${n.description}`).join("\n")}
        `;

        const responseText = await callGemini("gemini-1.5-flash", prompt, true, GEMINI_API_KEY);
        let cleaned = responseText.trim();
        if (cleaned.startsWith("```json")) {
          cleaned = cleaned.substring(7, cleaned.length - 3).trim();
        } else if (cleaned.startsWith("```")) {
          cleaned = cleaned.substring(3, cleaned.length - 3).trim();
        }
        return res.status(200).json(JSON.parse(cleaned));
      }

      if (pathname === "/api/ai/briefing") {
        const activeSymbol = body.symbol || "AAPL";
        const prompt = `
          You are a strategic intelligence officer for a multi-national investment firm.
          Generate a highly concise, tactical "Intelligence Brief" for the company: ${activeSymbol}. 
          Use a technical, cyberpunk Terminal aesthetic (e.g., using terms like Nodes, Silos, Uplink, Vulnerabilities).
          
          Focus on 3 areas:
          1. Strategic Positioning (Current market dominance or threat)
          2. Supply Chain Integrity (Recent disruptions or key partners)
          3. Intelligence Alpha (A non-obvious tactical insight)

          Format: Keep it under 200 words total. Use short, punchy bullet points.
          Current Context Data: ${JSON.stringify(body.data || {})}
        `;

        const responseText = await callGemini("gemini-1.5-flash", prompt, false, GEMINI_API_KEY);
        return res.status(200).json({ briefing: responseText });
      }

      if (pathname === "/api/ai/sentiment") {
        const activeSymbol = body.symbol || "AAPL";
        const prompt = `
          Analyze the overall market sentiment for ${activeSymbol} based on this data: ${JSON.stringify(body.data || {})}.
          Return a JSON object with:
          - score: number between -1 (extremely bearish/dangerous) and 1 (extremely bullish/stable)
          - label: string (e.g., "NEURAL_STABLE", "VOLATILE_OUTFLOW", "BULLISH_SIGNAL")
          - reason: string (max 10 words)
        `;

        const responseText = await callGemini("gemini-1.5-flash", prompt, true, GEMINI_API_KEY);
        let cleaned = responseText.trim();
        if (cleaned.startsWith("```json")) {
          cleaned = cleaned.substring(7, cleaned.length - 3).trim();
        } else if (cleaned.startsWith("```")) {
          cleaned = cleaned.substring(3, cleaned.length - 3).trim();
        }
        return res.status(200).json(JSON.parse(cleaned));
      }
    } catch (err) {
      console.error("Gemini API Error under serverless execution:", err);
      return res.status(500).json({ error: "AI_SERVICE_ERROR", message: err.message });
    }
  }

  // Fallback 404
  return res.status(404).json({
    error: "NOT_FOUND",
    message: `API Router: path '${pathname}' is not mapped.`
  });
}
