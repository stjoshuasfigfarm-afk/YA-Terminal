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
        console.warn("FMP quote fetch fail in serverless proxy:", e.message);
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
        if (!e.message?.includes("403")) {
          console.warn("Finnhub quote fetch fail in serverless proxy:", e.message);
        }
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
        console.warn("ITICK quote fetch fail in serverless proxy:", e.message);
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
      const data = await withCache(`news_${symbol}`, async () => {
        const r = await fetch(urlPath);
        if (!r.ok) {
          throw new Error(`HTTP_${r.status}`);
        }
        const contentType = r.headers.get("content-type") || "";
        if (!contentType.includes("application/json") || r.status === 504) {
          throw new Error(`Invalid content type or timeout status ${r.status}`);
        }
        return r.json();
      }, 15000);
      
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
      if (!err.message?.includes("403")) {
        console.warn("News serverless proxy fetch fail (falling back):", err.message);
      }
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
        if (!e.message?.includes("403")) {
          console.warn("Profile serverless proxy fail:", e.message);
        }
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
        if (!err.message?.includes("403")) {
          console.warn("Financials serverless proxy fail:", err.message);
        }
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

    const to = Math.floor(Date.now() / 1000);
    const from = to - (60 * 24 * 60 * 60); // 60 days
    let processed = [];
    let source = "NONE";

    let yahooSymbol = symbol;
    if (symbol === "VIX") yahooSymbol = "^VIX";
    else if (symbol === "SPCX") yahooSymbol = "ARKX";

    // 1. Try Finnhub
    if (source === "NONE" && isKeyReady(FINNHUB_KEY)) {
      try {
        const urlStr = `https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=D&from=${from}&to=${to}&token=${FINNHUB_KEY}`;
        const data = await withCache(`history_fh_${symbol}`, () => fetch(urlStr).then(r => r.json()), 30000);
        if (data && data.s === 'ok' && Array.isArray(data.t)) {
          processed = data.t.map((t, i) => ({
            timestamp: t * 1000,
            price: data.c[i]
          })).filter(d => d.price > 0);
          if (processed.length > 0) source = "FINNHUB";
        }
      } catch (e) { console.warn("Finnhub history fetch failed in proxy:", e.message); }
    }

    // 2. Try Yahoo Finance
    if (source === "NONE") {
      try {
        const response = await fetch(`https://query2.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`, {
          headers: { "User-Agent": "Mozilla/5.0" }
        });
        if (response.ok) {
          const data = await response.json();
          if (data?.chart?.result?.[0]) {
            const result = data.chart.result[0];
            const timestamps = result.timestamp;
            const quoteData = result.indicators.quote[0];
            const adjData = result.indicators.adjclose ? result.indicators.adjclose[0] : null;
            const prices = quoteData.close || (adjData ? adjData.adjclose : null);
            
            if (timestamps && prices) {
              processed = timestamps.map((t, i) => ({
                timestamp: t * 1000,
                price: prices[i]
              })).filter(d => d.price != null && d.price > 0);
              if (processed.length > 0) source = "YAHOO";
            }
          }
        }
      } catch (e) { console.warn("Yahoo history fetch failed in proxy:", e.message); }
    }

    // 3. Fallback to Simulation
    if (source === "NONE") {
      let hash = 0;
      for (let i = 0; i < symbol.length; i++) hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
      const seed = Math.abs(hash);
      let price = 50 + (seed % 200);
      for (let i = 0; i < 60; i++) {
        processed.push({
          timestamp: Date.now() - (60 - i) * 24 * 60 * 60 * 1000,
          price: price
        });
        price += (Math.random() - 0.5) * 5;
      }
      source = "SIMULATION";
    }

    return res.status(200).json({ processed, source });
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
        console.warn("FMP treasury fetch fail in serverless proxy:", e.message);
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

    // Clean raw JSON response from markdown wrappers and any extra non-whitespace leading/trailing characters
    function cleanJSONResponse(text) {
      let cleaned = text.trim();
      
      const firstBrace = cleaned.indexOf('{');
      const firstBracket = cleaned.indexOf('[');
      
      let startIdx = -1;
      let isObject = true;
      if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
        startIdx = firstBrace;
        isObject = true;
      } else if (firstBracket !== -1) {
        startIdx = firstBracket;
        isObject = false;
      }
      
      if (startIdx !== -1) {
        let stack = [];
        let inString = false;
        let escape = false;
        let endIdx = -1;
        
        for (let i = startIdx; i < cleaned.length; i++) {
          const char = cleaned[i];
          if (escape) {
            escape = false;
            continue;
          }
          if (char === '\\') {
            escape = true;
            continue;
          }
          if (char === '"') {
            inString = !inString;
            continue;
          }
          if (!inString) {
            if (char === '{') {
              stack.push('}');
            } else if (char === '[') {
              stack.push(']');
            } else if (char === '}' || char === ']') {
              stack.pop();
              if (stack.length === 0) {
                endIdx = i;
                break;
              }
            }
          }
        }
        
        if (endIdx !== -1) {
          cleaned = cleaned.substring(startIdx, endIdx + 1);
        } else {
          const endChar = isObject ? '}' : ']';
          const lastIdx = cleaned.lastIndexOf(endChar);
          if (lastIdx !== -1 && lastIdx > startIdx) {
            cleaned = cleaned.substring(startIdx, lastIdx + 1);
          }
        }
      } else {
        if (cleaned.startsWith("```")) {
          cleaned = cleaned.replace(/^```[a-zA-Z]*\n/, "");
          cleaned = cleaned.replace(/\n```$/, "");
        }
      }

      let sanitized = "";
      let inStr = false;
      let esc = false;
      for (let i = 0; i < cleaned.length; i++) {
        const char = cleaned[i];
        if (esc) {
          sanitized += char;
          esc = false;
          continue;
        }
        if (char === '\\') {
          sanitized += char;
          esc = true;
          continue;
        }
        if (char === '"') {
          inStr = !inStr;
          sanitized += char;
          continue;
        }
        if (inStr) {
          if (char === '\n') {
            sanitized += '\\n';
          } else if (char === '\r') {
            sanitized += '\\r';
          } else if (char === '\t') {
            sanitized += '\\t';
          } else {
            sanitized += char;
          }
        } else {
          sanitized += char;
        }
      }
      
      sanitized = sanitized.trim();
      sanitized = sanitized.replace(/,\s*([}\]])/g, '$1');
      return sanitized;
    }

    // Body parser fallback on serverless standard
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {}
    }
    body = body || {};

    // Compact fallback data fallback engines for Serverless mode
    function getFallbackEnrichedNews(data = []) {
      return data.map((item) => {
        const title = (item.title || "").toUpperCase();
        let sentiment = "NEUTRAL";
        let impact = "ROUTINE";

        if (title.includes("SHUTDOWN") || title.includes("FAIL") || title.includes("DISRUPT") || title.includes("DELAY") || title.includes("VULNERABLE") || title.includes("RISK") || title.includes("EXHAUSTED") || title.includes("LIMIT")) {
          sentiment = "BEARISH";
          impact = "CRITICAL";
        } else if (title.includes("ACCELERATE") || title.includes("GROW") || title.includes("STABLE") || title.includes("INNOVATE") || title.includes("DEPLOY") || title.includes("EXPAND")) {
          sentiment = "BULLISH";
          impact = "MODERATE";
        }

        return {
          translatedTitle: `NEURAL ACCESS: ${item.title ? item.title.toUpperCase() : "TELEMETRY SIGNAL UPLINK ACTIVE"}`,
          sentiment,
          impact
        };
      });
    }

    function getFallbackBriefing(symbol = "AAPL") {
      const norm = symbol.toUpperCase();
      if (norm === "AAPL") {
        return {
          briefing: "Apple is maintaining critical ecosystem execution with significant advancements in core custom silicon. Supply structures in Southeast Asia are buffering traditional mainland assembly reliance.\n\n• In-house Neural Engine architectural enhancements\n• Diversification of final packaging to Chennai and Vietnam\n• High margin services subscription growth offset"
        };
      }
      if (norm === "TSM") {
        return {
          briefing: "TSMC retains a complete logic manufacturing premium with high capital barriers. They are scaling multi-continent production facilities to meet geographic security mandates.\n\n• N2 (2nm) technology scaling triggering record demand\n• Arizona Phase 2 fabrication expansion matching domestic computing needs\n• CoWoS packaging capacity doubling to ease high-performance compute delays"
        };
      }
      if (norm === "NVDA") {
        return {
          briefing: "NVIDIA accelerates high-performance computing node market dominance via proprietary architecture. High software integration limits competitive substrate switching vectors.\n\n• Next-generation unified layout deployments\n• Sovereign enterprise compute nodes expanding cloud limits\n• Custom hyperscaler co-development locking pipeline capacity"
        };
      }
      return {
        briefing: `${symbol} remains in a secure operating envelope. Telemetry indicators track within healthy baseline margins.\n\n• Process optimization reducing localized operating expenditures\n• Diversified logistics partnerships mitigating single-point maritime failures\n• High-density system integration buffering labor market inflation rates`
      };
    }

    function getFallbackSentiment(symbol = "AAPL") {
      const norm = symbol.toUpperCase();
      let score = 0.45;
      let label = "SYS.STABLE";
      let reason = "Baseline metrics maintain healthy operational spreads.";

      if (norm === "TSM") {
        score = 0.85;
        label = "UPLINK_SECURE";
        reason = "Wafer allocation demand exceeds capacity.";
      } else if (norm === "NVDA") {
        score = 0.90;
        label = "BULLISH_UPLINK";
        reason = "AI custom substrate packaging allocations doubled.";
      } else if (norm === "ASML") {
        score = 0.30;
        label = "NEURAL_STABLE";
        reason = "Precision optics lead times remain stable.";
      } else if (norm === "AAPL") {
        score = 0.55;
        label = "SYS.OPTIMIZED";
        reason = "Mobile pipeline fabrication diversified to India.";
      }

      return {
        score,
        label,
        reason
      };
    }

    try {
      if (pathname === "/api/ai/tts") {
        const text = body.text || "";
        if (!text) return res.status(400).json({ error: "Missing parameter: text" });
        const voice = body.voice || "Zephyr";

        const enhancedText = `Speak naturally and authoritatively: ${text}`;
        const urlPath = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-tts-preview:generateContent?key=${GEMINI_API_KEY}`;
        
        try {
          const ttsResponse = await fetch(urlPath, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: enhancedText }] }],
              generationConfig: {
                responseModalities: ["AUDIO"],
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: {
                      voiceName: voice === "Zephyr" ? "Zephyr" : voice
                    }
                  }
                }
              }
            })
          });

          if (!ttsResponse.ok) {
            throw new Error(`Gemini TTS returned status ${ttsResponse.status}`);
          }

          const result = await ttsResponse.json();
          const base64Audio = result.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
          if (!base64Audio) {
            throw new Error("No audio generated from Google Gemini API");
          }

          return res.status(200).json({ audio: base64Audio });
        } catch (err) {
          console.warn("Gemini TTS Fail in serverless proxy:", err);
          return res.status(500).json({ error: "AI_TTS_ERROR", message: err.message });
        }
      }

      if (pathname === "/api/ai/enrich-news") {
        const rawData = body.data || [];
        if (!Array.isArray(rawData)) {
          return res.status(400).json({ error: "Array expected" });
        }

        const prompt = `
          Analyze these news headlines/summaries.
          Translate to professional English if needed.
          
          CRITICAL MANDATE: You MUST write the results strictly in professional, standard English. Do NOT use non-English or foreign language terms under any circumstances.

          Summarize into a concise "Neural Link" headline (max 80 chars).
          Return JSON array of objects: [{ "translatedTitle": string }]
          
          News Table:
          ${rawData.map((n, i) => `${i+1}. TITLE: ${n.title} | SUMMARY: ${n.description}`).join("\n")}
        `;

        try {
          const responseText = await callGemini("gemini-1.5-flash", prompt, true, GEMINI_API_KEY);
          const cleaned = cleanJSONResponse(responseText);
          return res.status(200).json(JSON.parse(cleaned));
        } catch (e) {
          console.warn("Serverless news enrichment error (falling back):", e);
          const fallback = getFallbackEnrichedNews(rawData);
          return res.status(200).json(fallback);
        }
      }

      if (pathname === "/api/ai/briefing") {
        const activeSymbol = body.symbol || "AAPL";
        const prompt = `
          You are a strategic intelligence officer for a multi-national investment firm.
          Generate a highly concise, tactical "Intelligence Brief" for the company: ${activeSymbol}. 
          Use a technical, cyberpunk Terminal aesthetic (e.g., using terms like Nodes, Silos, Uplink, Vulnerabilities).
          
          CRITICAL MANDATE: You MUST write the entire briefing and all text strictly in professional, standard English. Do NOT use non-English, foreign language terms, or translate into other languages under any circumstances.

          Focus on 3 areas:
          1. Strategic Positioning (Current market dominance or threat)
          2. Supply Chain Integrity (Recent disruptions or key partners)
          3. Intelligence Alpha (A non-obvious tactical insight)

          Format: Keep it under 200 words total. Use short, punchy bullet points.
          Current Context Data: ${JSON.stringify(body.data || {})}
        `;

        try {
          const responseText = await callGemini("gemini-1.5-flash", prompt, false, GEMINI_API_KEY);
          return res.status(200).json({ briefing: responseText });
        } catch (e) {
          console.warn("Serverless briefing generation error (falling back):", e);
          const fallback = getFallbackBriefing(activeSymbol);
          return res.status(200).json(fallback);
        }
      }

      if (pathname === "/api/ai/sentiment") {
        const activeSymbol = body.symbol || "AAPL";
        const prompt = `
          Analyze the overall market sentiment for ${activeSymbol} based on this data: ${JSON.stringify(body.data || {})}.
          
          CRITICAL MANDATE: You MUST write any text labels or reasons strictly in professional, standard English. Do NOT use non-English or foreign language terms under any circumstances.

          Return a JSON object with:
          - score: number between -1 (extremely bearish/dangerous) and 1 (extremely bullish/stable)
          - label: string (e.g., "NEURAL_STABLE", "VOLATILE_OUTFLOW", "BULLISH_SIGNAL")
          - reason: string (max 10 words)
        `;

        try {
          const responseText = await callGemini("gemini-1.5-flash", prompt, true, GEMINI_API_KEY);
          const cleaned = cleanJSONResponse(responseText);
          return res.status(200).json(JSON.parse(cleaned));
        } catch (e) {
          console.warn("Serverless sentiment generation error (falling back):", e);
          const fallback = getFallbackSentiment(activeSymbol);
          return res.status(200).json(fallback);
        }
      }

      if (pathname === "/api/ai/corridor") {
        const targetId = body.corridorId || "MALACCA_STRAIT";
        const targetType = body.commodityType || "General Cargo / Freight";
        const newsText = body.newsText || "";

        const prompt = `
          You are an elite geopolitical and supply chain intelligence officer for the Yield Analysts Terminal.
          Analyze the current intercepted telemetry/news for this critical corridor or commodity swap:
          Corridor/Route ID: ${targetId}
          Commodity/Silo Type: ${targetType}
          Optional News Context: ${newsText || "Recent shipping delays, security bottlenecks, and regional tensions are impacting strategic supply corridors."}

          CRITICAL MANDATE: You MUST write all textual descriptions, port names, briefings, and telemetry insights strictly in professional, standard English. Even if the topic involves foreign regions, foreign entities, or non-English queries, do NOT reply in a foreign language under any circumstances.

          Task: Synthesize a highly strategic threat assessment.
          You MUST return a clean, valid and structured JSON object (do NOT wrap it in any extra text).
          Ensure the schema matches this EXACT structure:
          {
            "corridorId": "string reflecting the ID",
            "commodityType": "string reflecting commodity analysed",
            "riskVelocityScore": number (strictly between 12 and 94 reflecting current risk/choke bottlenecks),
            "transitLatencyPrediction": "string like '+3.5 Days delay' or '+1.2 Weeks routing queue'",
            "originNode": {
              "name": "string naming the precise port or logistics hub (e.g., Port of Singapore, Bab-el-Mandeb Strait, Shenzhen Hub, Taiwan Strait, Port of Rotterdam)",
              "coords": [lat_number, lng_number] (latitude & longitude as decimals. E.g. Bab-el-Mandeb: [12.6, 43.3] or Singapore: [1.35, 103.8])
            },
            "impactedTickers": string[] (array of 2-4 actual stock symbols from this list: AAPL, TSLA, NVDA, ASML, AMZN, TSM),
            "briefing": string[] (MUST be an array of EXACTLY 3 technical, punchy, terminal bullet points describing supply vulnerabilities, mitigation buffers, and carrier reroutings)
          }
        `;

        try {
          const responseText = await callGemini("gemini-1.5-flash", prompt, true, GEMINI_API_KEY);
          const cleaned = cleanJSONResponse(responseText);
          return res.status(200).json(JSON.parse(cleaned));
        } catch (e) {
          let fallback = {
            corridorId: targetId,
            commodityType: targetType,
            riskVelocityScore: 48,
            transitLatencyPrediction: "+2.4 Days delay",
            originNode: { name: "Singapore Gateway", coords: [1.3521, 103.8198] },
            impactedTickers: ["TSM", "AAPL", "NVDA"],
            briefing: [
              "Baseline maritime crossing times elevated across critical hubs.",
              "Vulnerability profile remains within standard operational limits.",
              "Alternate route deviations mapped for early carrier diversions."
            ]
          };
          return res.status(200).json(fallback);
        }
      }

      if (pathname === "/api/ai/agent-tour") {
        const query = body.query || "";
        if (!query) return res.status(400).json({ error: "Missing query" });

        const prompt = `
          You are an expert global macro and corporate intelligence officer for the Yield Analysts Terminal.
          The user is asking a question: "${query}"

          CRITICAL MANDATE: You MUST write all coordinates, locationNames, explanations, and facts strictly in professional, standard English. Even if the query mentions a foreign country, foreign entity, or is written in another language, translate everything and reply ONLY in English.

          Task: Decide a logical geographic coordinates (latitude and longitude decimal values) of a company headquarters, shipping corridor, resource hub, or central city related to the user's question, and formulate a teaching lesson.

          Your output MUST be a clean, valid and structured JSON object (do NOT wrap it in any extra text).
          Match this EXACT structure:
          {
            "locationName": "string representing the destination name (e.g. Cupertino, California (Apple HQ) or Ningde, China)",
            "lat": number (decimal latitude, e.g. 37.3349),
            "lng": number (decimal longitude, e.g. -122.0091),
            "ticker": "string representing a relevant stock ticker if applicable (e.g., AAPL), otherwise null",
            "explanation": "A complete, informative and engaging explanation (3-4 sentences in a direct, tactical, professional intelligence analyst voice) teaching them about this topic at this specific location.",
            "facts": ["Fact Bullet 1", "Fact Bullet 2", "Fact Bullet 3"]
          }
        `;

        try {
          const responseText = await callGemini("gemini-1.5-flash", prompt, true, GEMINI_API_KEY);
          const cleaned = cleanJSONResponse(responseText);
          return res.status(200).json(JSON.parse(cleaned));
        } catch (e) {
          const lowerQuery = query.toLowerCase();
          let mockData = {
            locationName: "Cupertino, California (Apple HQ)",
            lat: 37.3349,
            lng: -122.0091,
            ticker: "AAPL",
            explanation: "Apple sits at the direct center of global consumer electronics supply chains. Their silicon is fabbed in Taiwan, packaged across Southeast Asia, and assembled at Foxconn clusters. This geographical dispersion puts Apple at high risk during maritime bottlenecks.",
            facts: [
              "CoWoS packaging bottlenecks constrain custom SoC availability",
              "Air freight latency remains the principal vector for product launch logistics",
              "Alternative assembly diversification in India and Vietnam currently underway"
            ]
          };

          if (lowerQuery.includes("semi") || lowerQuery.includes("chip") || lowerQuery.includes("tsmc") || lowerQuery.includes("taiwan")) {
            mockData = {
              locationName: "Hsinchu, Taiwan (TSMC Phase 3)",
              lat: 24.7816,
              lng: 121.0153,
              ticker: "TSM",
              explanation: "Hsinchu Science Park generates over 90% of the world's leading-edge microchips. This immense concentration of silicon manufacturing represents both a massive geopolitical pressure point and a key bottleneck in the worldwide automotive and technology sectors.",
              facts: [
                "Advanced EUV exposure arrays consume massive baseline local grid power",
                "Slight shifts in sub-station stability trigger auto-shutdown routines",
                "Alternative fab corridors are being scaled in Arizona and Kumamoto"
              ]
            };
          } else if (lowerQuery.includes("oil") || lowerQuery.includes("energy") || lowerQuery.includes("suez") || lowerQuery.includes("fuel") || lowerQuery.includes("gas")) {
            mockData = {
              locationName: "Bab-el-Mandeb Choke point (Suez gateway)",
              lat: 12.6000,
              lng: 43.3300,
              ticker: "XOM",
              explanation: "The Bab-el-Mandeb is the narrow channel controlling access to the Red Sea and Suez Canal. Any maritime disturbance here forces container carriers and tankers to reroute around the Cape of Good Hope, adding nine days of transit and spiking logistics indexes.",
              facts: [
                "Dwell time deviations currently cluster at +9 days for European deliveries",
                "Freight insurance premiums spike over 120% during active warning flags",
                "Crude tankers choose alternative bunkering in Muscat or Salalah"
              ]
            };
          } else if (lowerQuery.includes("battery") || lowerQuery.includes("catl") || lowerQuery.includes("lithium") || lowerQuery.includes("tesla") || lowerQuery.includes("ev")) {
            mockData = {
              locationName: "Ningde, China (CATL Megafactory)",
              lat: 26.6655,
              lng: 119.5479,
              ticker: "CATL",
              explanation: "Ningde hosts the largest battery supply cluster on the globe. Access to mineral refinements including lithium wafers, battery cells, and cobalt substrates are centered right here, dictating the manufacturing tempo of EV giants nationwide.",
              facts: [
                "Global cell prices closely track the Ningde spot index rates",
                "Refined materials undergo inland logistics pathways with high security clearance",
                "Upstream integrations span South American lithium pans to African cobalt mines"
              ]
            };
          } else if (lowerQuery.includes("asml") || lowerQuery.includes("netherland") || lowerQuery.includes("euv")) {
            mockData = {
              locationName: "Veldhoven, Netherlands (ASML Advanced Lab)",
              lat: 51.4035,
              lng: 5.4081,
              ticker: "ASML",
              explanation: "ASML is the sole global builder of Extreme Ultraviolet (EUV) lithography equipment. Each machine requires thousands of global suppliers and shipping containers, making ASML's Veldhoven campus highly dependent on frictionless global transport.",
              facts: [
                "Optics supply chain routes from Zeiss in Germany are highly specialized",
                "Total machine weight exceeds 180 tonnes, requiring specialized cargo planes",
                "Lead times on new orders frequently exceed 18-24 months"
              ]
            };
          }
          return res.status(200).json(mockData);
        }
      }

      if (pathname === "/api/ai/navigate") {
        const userPrompt = body.prompt || "";
        if (!userPrompt) return res.status(400).json({ error: "Missing parameter: prompt" });

        const prompt = `
          You are an elite geopolitical and supply chain intelligence officer for the Yield Analysts Terminal.
          The user is requesting navigation coordinates and research on this topic/location: "${userPrompt}"

          CRITICAL MANDATE: You MUST write all textual descriptions, location names, briefings, and telemetry insights strictly in professional, standard English. Even if the topic involves foreign regions, foreign entities, or non-English queries, do NOT reply in a foreign language under any circumstances.

          Task: Decide a logical geographic target location name, coordinates, and map zoom level to educate the user.
          Provide a highly precise terminal-style operational briefing explaining the micro/macro/financial supply chain significance of this location.

          You MUST return a clean, valid and structured JSON object (do NOT wrap it in any extra text).
          Ensure the schema matches this EXACT structure:
          {
            "locationName": "string representing the city/country or specific facility/hub (e.g., Cupertino, California)",
            "coordinates": [latitude_number, longitude_number],
            "zoomLevel": number,
            "briefing": "string representing a 3-sentence terminal-style operational briefing teaching the user about the macro/financial topic at that location. Use authoritative supply chain terminology."
          }
        `;

        try {
          const responseText = await callGemini("gemini-1.5-flash", prompt, true, GEMINI_API_KEY);
          const cleaned = cleanJSONResponse(responseText);
          return res.status(200).json(JSON.parse(cleaned));
        } catch (e) {
          const q = userPrompt.toLowerCase();
          let mockData = {
            locationName: "New York, USA (Financial Core)",
            coordinates: [40.7128, -74.006],
            zoomLevel: 5,
            briefing: "Wall Street acts as the clearing house for international logistics financing and yield spreads. Volatility is derived from sovereign debt ratings and policy shifts. Physical node telemetry from overseas suppliers is processed here to hedge equity assets."
          };

          if (q.includes("semi") || q.includes("chip") || q.includes("tsmc") || q.includes("taiwan")) {
            mockData = {
              locationName: "Hsinchu, Taiwan (TSMC Fab 18)",
              coordinates: [24.7816, 121.0153],
              zoomLevel: 8,
              briefing: "Hsinchu Science Park represents the center of global sub-7nm foundry capacity. Localized seismic risks and specialized power infrastructure requirements create an high fragility index. Disruption here triggers automated shutdowns of high-performance computing supply lines."
            };
          } else if (q.includes("oil") || q.includes("energy") || q.includes("suez") || q.includes("bab") || q.includes("strait")) {
            mockData = {
              locationName: "Suez Canal / Bab-el-Mandeb Strait",
              coordinates: [12.6, 43.33],
              zoomLevel: 4,
              briefing: "The Bab-el-Mandeb represents a primary global energy transit vulnerability vector. Geopolitical blockades force alternative container routing around the Cape of Good Hope, adding nine days dry-bulk transit. This structural rerouting spikes the Shanghai Containerized Freight Index."
            };
          } else if (q.includes("battery") || q.includes("lithium") || q.includes("ev") || q.includes("catl") || q.includes("china")) {
            mockData = {
              locationName: "Ningde, China (CATL Headquarters)",
              coordinates: [26.6655, 119.5479],
              zoomLevel: 7,
              briefing: "Ningde represents the epicenter of worldwide lithium-iron-phosphate (LFP) cell fabrication. Access to raw material refinement corridors determines downstream automotive margins. Grid supply metrics are analyzed as direct leading indicators of global industrial inventory levels."
            };
          } else if (q.includes("asml") || q.includes("netherland") || q.includes("litho") || q.includes("euv")) {
            mockData = {
              locationName: "Veldhoven, Netherlands (ASML Headquarters)",
              coordinates: [51.4035, 5.4081],
              zoomLevel: 9,
              briefing: "ASML Holding NV maintains a global monopoly on high-NA EUV lithography equipment. Each tool relies on a highly specialized subsystem supply tier that cannot be replicated. Air-cargo routes for finished equipment remain under strict regulatory monitoring."
            };
          }
          return res.status(200).json(mockData);
        }
      }
    } catch (err) {
      console.warn("Gemini API Fail under serverless execution:", err);
      return res.status(500).json({ error: "AI_SERVICE_ERROR", message: err.message });
    }
  }

  // Fallback 404
  return res.status(404).json({
    error: "NOT_FOUND",
    message: `API Router: path '${pathname}' is not mapped.`
  });
}
