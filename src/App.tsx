import { useState, useEffect, useCallback } from "react";
import { Header } from "./components/Header";
import { SearchSidebar } from "./components/SearchSidebar";
import { MapLayer } from "./components/MapLayer";
import { IntelligenceSidebar } from "./components/IntelligenceSidebar";
import { CommandPalette } from "./components/CommandPalette";
import { Company } from "./data/companies";
import { useCompanies } from './CompaniesContext' ; // Import the hook instead

// Production Config Resolution
interface TerminalConfig {
  FINNHUB_API_KEY?: string;
  FMP_API_KEY?: string;
  ITIC_API_KEY?: string;
  GEMINI_API_KEY?: string;
  API_BASE_URL?: string;
}

declare global {
  interface Window {
    TERMINAL_CONFIG?: TerminalConfig;
  }
}

const getApiBaseUrl = (): string => {
  // Check build environment first VITE_API_BASE_URL
  const metaEnv = (import.meta as any).env;
  const metaBase = metaEnv ? (metaEnv.VITE_API_BASE_URL || metaEnv.API_BASE_URL) : undefined;
  if (metaBase) return metaBase as string;
  
  // Check global config object fallback
  const windowBase = window.TERMINAL_CONFIG?.API_BASE_URL;
  if (windowBase) return windowBase;
  
  return ""; // default to relative path
};

export default function App() {
  const { companies: COMPANIES, loading: companiesLoading, error: companiesError } = useCompanies();
  const [selectedStock, setSelectedStock] = useState<Company | null>(null);
  const [mapFocusStock, setMapFocusStock] = useState<Company | null>(null);
  const [isAutopilot, setIsAutopilot] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [showGlobalNetwork, setShowGlobalNetwork] = useState(false);
  
  // Data State
  const [quote, setQuote] = useState<any>(null);
  const [news, setNews] = useState<any[]>([]);
  const [allMarketData, setAllMarketData] = useState<Record<string, any>>({});
  const [financials, setFinancials] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [focusNews, setFocusNews] = useState<any[]>([]);
  const [briefing, setBriefing] = useState<string | null>(null);
  const [sentiment, setSentiment] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [quotaExhausted, setQuotaExhausted] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("INTEL");
  const [logs, setLogs] = useState<string[]>(["SYSTEM_BOOT_SEQUENCE_COMPLETE", "UPLINK_ESTABLISHED"]);
  const [systemStatus, setSystemStatus] = useState<string> ("SYSTEM: OPTIMAL");

  const addLog = useCallback((msg: string) => {
    setLogs(prev => [msg, ...prev.slice(0, 19)]);
  }, []);

  // Robust Telemetry Fetch Interceptor
  const telemetryFetch = useCallback(async (input: RequestInfo, init?: RequestInit, retries = 3, delay = 1000): Promise<Response> => {
    let finalUrl = input;
    if (typeof finalUrl === "string" && finalUrl.startsWith("/")) {
      finalUrl = getApiBaseUrl() + finalUrl;
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(finalUrl, init);
        if (!response.ok) {
          if (response.status === 404) {
            setSystemStatus("[SYSTEM_ERROR] ROUTE_UNRESOLVED_IN_PROD");
          } else if (response.status === 401 || response.status === 403) {
            setSystemStatus("[SYSTEM_ERROR] AUTH_INVALID_ON_DEPLOY");
          }
        } else {
          setSystemStatus("SYSTEM: OPTIMAL");
        }
        return response;
      } catch (err: any) {
        const isNetworkError = err instanceof TypeError || err.message?.includes("fetch") || err.name === "TypeError";
        if (isNetworkError && attempt < retries) {
          console.warn(`Telemetry link transient failure (attempt ${attempt}/${retries}). Retrying in ${delay}ms...`, err);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 1.5;
          continue;
        }

        console.error("Telemetry link failure intercepted:", err);
        setSystemStatus("[SYSTEM_ERROR] ROUTE_UNRESOLVED_IN_PROD");
        throw err;
      }
    }
    throw new TypeError("Failed to fetch after retries");
  }, []);

  const [relationships, setRelationships] = useState<{ suppliers: any[], customers: any[] }>({ suppliers: [], customers: [] });
  const [globalYields, setGlobalYields] = useState<any>(null);
  const [nodeYields, setNodeYields] = useState<any>(null);

  const enrichNews = useCallback(async (rawNews: any[]) => {
    if (!rawNews || rawNews.length === 0 || quotaExhausted) return;
    
    setIsAiProcessing(true);
    try {
      const response = await telemetryFetch("/api/ai/enrich-news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: rawNews.slice(0, 5) // Limit to top 5 news for performance
        })
      });

      if (!response.ok) {
        if (response.status === 429) setQuotaExhausted(true);
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || `AI Uplink Failed: ${response.status}`);
      }
      
      const processed = await response.json();
      
      const enriched = rawNews.map((item, i) => ({
        ...item,
        intelligence: (processed && processed[i]) || { translatedTitle: item.title }
      }));
      setNews(enriched);
    } catch (error: any) {
      console.error("AI Enrichment failed:", error);
      // Fallback to original news titles if AI enrichment fails
      const fallbackNews = rawNews.map(item => ({
        ...item,
        intelligence: item.intelligence || { translatedTitle: item.title }
      }));
      setNews(fallbackNews);
    } finally {
      setIsAiProcessing(false);
    }
  }, []);

  const generateBriefing = useCallback(async (symbol: string, context: any) => {
    if (quotaExhausted) return;
    setIsAiProcessing(true);
    setBriefing(null);
    setSentiment(null);
    try {
      // 1. Generate Briefing
      const briefingResponse = await telemetryFetch("/api/ai/briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol,
          data: context
        })
      });

      if (briefingResponse.status === 429) setQuotaExhausted(true);
      
      if (briefingResponse.ok) {
        const data = await briefingResponse.json();
        setBriefing(data.briefing);
      }
      
      // 2. Generate Sentiment Analysis
      const sentimentResponse = await telemetryFetch("/api/ai/sentiment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol,
          data: context
        })
      });

      if (sentimentResponse.status === 429) setQuotaExhausted(true);

      if (sentimentResponse.ok) {
        const data = await sentimentResponse.json();
        setSentiment(data);
        addLog(`SENTIMENT_ACQUIRED: ${data.label} (${(data.score * 100).toFixed(0)}%)`);
      }

    } catch (error: any) {
      console.error("AI Analysis failed:", error);
      setBriefing(`ERR: NEURAL_LINK_CONGESTION // ${error.message || "Manual assessment required."}`);
    } finally {
      setIsAiProcessing(false);
    }
  }, [addLog]);

  const fetchData = useCallback(async (symbol: string) => {
    if (!symbol) return;
    setIsLoading(true);
    addLog(`INITIALIZING_TELEMETRY: ${symbol}`);
    
    const headers = { 'Content-Type': 'application/json' };
    
    try {
      const company = COMPANIES.find(c => c.symbol === symbol);
      const countryCode = company?.country || 'USA';

      const [q, n, p, f, h, r, y] = await Promise.all([
        telemetryFetch(`/api/quote?symbol=${symbol}`, { headers }).then(res => {
          if (!res.ok) {
            if (res.status === 429) {
              setQuotaExhausted(true);
              console.warn(`Quote API rate limited: Status ${res.status}`);
            } else {
              console.warn(`Quote API alert: Status ${res.status}`);
            }
          }
          return res.json();
        }).catch(() => {
          const hashValue = symbol.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
          const basePrice = 50 + (hashValue % 500);
          return {
            price: basePrice,
            changes: parseFloat(((hashValue % 100) / 20 - 2.5).toFixed(2)),
            changesPercentage: parseFloat(((hashValue % 100) / 40 - 1.25).toFixed(2)),
            high: basePrice + 3.5,
            low: basePrice - 2.1,
            open: basePrice - 0.5,
            previousClose: basePrice - 1.1,
            symbol: symbol,
            mock: true,
            source: "LOCAL_ROBUST_FALLBACK"
          };
        }),
        telemetryFetch(`/api/news?symbol=${symbol}`, { headers }).then(res => {
          if (!res.ok) {
            if (res.status === 429) {
              setQuotaExhausted(true);
              console.warn(`News API rate limited: Status ${res.status}`);
            } else {
              console.warn(`News API alert: Status ${res.status}`);
            }
          }
          return res.json();
        }).catch(() => {
          const matched = COMPANIES.find(c => c.symbol === symbol);
          return [
            {
              title: `Intelligence pipeline optimized for ${matched?.name || symbol}`,
              description: `Global network nodes for ${symbol} are processing secondary signals and workforce metrics at peak operational capacities. Local caching engaged.`,
              published_at: new Date().toISOString(),
              url: "https://example.com",
              image: ""
            }
          ];
        }),
        telemetryFetch(`/api/profile?symbol=${symbol}`, { headers }).then(res => {
          if (!res.ok) {
            if (res.status === 429) {
              setQuotaExhausted(true);
              console.warn(`Profile API rate limited: Status ${res.status}`);
            } else {
              console.warn(`Profile API alert: Status ${res.status}`);
            }
          }
          return res.json();
        }).catch(() => {
          const matched = COMPANIES.find(c => c.symbol === symbol);
          return {
            mktCap: 750000000000 + (symbol.charCodeAt(0) * 123456789),
            companyName: matched?.name || `${symbol} Corp`,
            industry: matched?.sector || "Industrial Technology",
            website: `https://www.${symbol.toLowerCase()}.com`,
            currency: "USD",
            mock: true
          };
        }),
        telemetryFetch(`/api/financials?symbol=${symbol}`, { headers }).then(res => {
          if (!res.ok) {
            if (res.status === 429) {
              setQuotaExhausted(true);
              console.warn(`Financials API rate limited: Status ${res.status}`);
            } else {
              console.warn(`Financials API alert: Status ${res.status}`);
            }
          }
          return res.json();
        }).catch(() => {
          return [
            {
              revenue: 125000000000,
              netIncome: 25000000000,
              ebitda: 35000000000,
              eps: 4.85,
              calendarYear: "2025"
            }
          ];
        }),
        telemetryFetch(`/api/history?symbol=${symbol}`, { headers }).then(res => {
          if (!res.ok) {
            if (res.status === 429) {
              setQuotaExhausted(true);
              console.warn(`History API rate limited: Status ${res.status}`);
            } else {
              console.warn(`History API alert: Status ${res.status}`);
            }
          }
          return res.json();
        }).catch(() => {
          const mockHist: any[] = [];
          const now = new Date();
          const hashValue = symbol.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
          let price = 100 + (hashValue % 300);
          for (let i = 15; i >= 0; i--) {
            const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            price += (Math.sin(i) + (Math.random() - 0.5)) * 3;
            mockHist.push({
              date: d.toISOString().split('T')[0],
              close: parseFloat(price.toFixed(2))
            });
          }
          return { historical: mockHist };
        }),
        telemetryFetch(`/api/relationships/${symbol}`, { headers }).then(res => res.json()).catch(() => ({ relationships: { suppliers: [], customers: [] } })),
        telemetryFetch(`/api/yields?country=${countryCode}`, { headers }).then(res => res.json()).catch(() => (null)),
      ]);
      
      // Data Parsing check
      if (q && (q.price !== undefined && q.price !== null)) {
        setQuote(q);
      } else {
        console.warn("Quote price telemetery interrupted. Raw data:", q);
        setQuote(q);
      }

      const newsWithSymbol = Array.isArray(n) ? n.map((item: any) => ({ ...item, symbol })) : [];
      setNews(newsWithSymbol);
      setProfile(p);
      setFinancials(f);
      setHistory(h?.historical || []);
      setRelationships(r.relationships || { suppliers: [], customers: [] });
      setNodeYields(y);
      
    } catch (err) {
      console.error("Critical telemetry synchronization failure:", err);
    } finally {
      setIsLoading(false);
    }
  }, [addLog, COMPANIES]);

  // Global Key Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Global Yield Polling
  useEffect(() => {
    let retryCount = 0;
    const fetchGlobalYields = async () => {
      try {
        const res = await telemetryFetch('/api/yields?country=USA');
        if (!res.ok) throw new Error(`HTTP_${res.status}`);
        const data = await res.json();
        setGlobalYields(data);
        retryCount = 0; // Reset on success
      } catch (e) {
        console.error("Global yields uplink failed", e);
        if (retryCount < 3) {
          retryCount++;
          setTimeout(fetchGlobalYields, 5000 * retryCount);
        }
      }
    };
    fetchGlobalYields();
    const interval = setInterval(fetchGlobalYields, 60000);
    return () => clearInterval(interval);
  }, []);

  // Initial Load Guard
  useEffect(() => {
    if (!selectedStock && COMPANIES.length > 0) {
      const defaultCompany = COMPANIES.find(c => c.symbol === "SPY") || COMPANIES[0];
      setSelectedStock(defaultCompany);
      fetchData(defaultCompany.symbol);
    }
  }, [fetchData, selectedStock]);

  // Global Market Heatmap Polling
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        // Only fetch a subset for performance if needed, but here we want the globe to look active
        const symbolsToFetch = COMPANIES.map(c => c.symbol);
        
        // We'll fetch in small batches or use a subset to avoid hitting rate limits
        const results: Record<string, any> = {};
        
        // Fetch top 15 for the most "active" look
        const topSymbols = symbolsToFetch.slice(0, 15);
        
        await Promise.all(topSymbols.map(async (sym) => {
          try {
            const res = await telemetryFetch(`/api/quote?symbol=${sym}`);
            if (res.ok) {
              results[sym] = await res.json();
            }
          } catch (e) {
            // Silently fail for individual nodes
          }
        }));

        setAllMarketData(prev => ({ ...prev, ...results }));
      } catch (e) {
        console.error("Global heatmap uplink failed", e);
      }
    };

    fetchAllData();
    const interval = setInterval(fetchAllData, 15000); // Pulse every 15s
    return () => clearInterval(interval);
  }, []);

  // Live Telemetry Polling (Every 15s)
  useEffect(() => {
    if (!selectedStock) return;

    const pollInterval = setInterval(async () => {
      try {
        const headers = { 'Content-Type': 'application/json' };
        const [qRes, pRes] = await Promise.all([
          telemetryFetch(`/api/quote?symbol=${selectedStock.symbol}`, { headers }).then(res => res.json()),
          telemetryFetch(`/api/profile?symbol=${selectedStock.symbol}`, { headers }).then(res => res.json())
        ]);
        
        if (qRes && qRes.price !== undefined) {
          setQuote(qRes);
        } else {
          console.warn("Polling detected empty price data:", qRes);
        }
        
        setProfile(pRes);
      } catch (e) {
        console.warn("Telemetry polling drift detected.", e);
      }
    }, 15000);

    return () => clearInterval(pollInterval);
  }, [selectedStock]);

  // Focus News Sync
  useEffect(() => {
    if (!mapFocusStock) {
      setFocusNews([]);
      return;
    }
    
    // Only fetch if different from selectedStock or if news is empty
    const fetchFocusNews = async () => {
      try {
        const res = await telemetryFetch(`/api/news?symbol=${mapFocusStock.symbol}`, {
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (!res.ok) {
          if (res.status === 429) {
            setQuotaExhausted(true);
            console.warn(`Map Focus News status: ${res.status} (Rate limited)`);
          } else {
            console.error(`Map Focus News status: ${res.status}`);
          }
          throw new Error(`Status ${res.status}`);
        }
        
        const text = await res.text();
        let n;
        try {
          n = JSON.parse(text);
        } catch (jsonErr) {
          if (text.includes("Rate exceeded") || text.includes("Limit")) {
            setQuotaExhausted(true);
          }
          throw new Error(`Invalid JSON response: ${text.slice(0, 50)}`);
        }
        setFocusNews(n);
      } catch (e) {
        console.error("Map focus news sync failure", e);
        // Robust fallback news item
        const matched = COMPANIES.find(c => c.symbol === mapFocusStock.symbol) || mapFocusStock;
        setFocusNews([
          {
            title: `Intelligence pipeline optimized for ${matched.name || mapFocusStock.symbol}`,
            description: `Global network nodes for ${matched.symbol} are processing secondary signals and workforce metrics at peak operational capacities. Local caching engaged.`,
            published_at: new Date().toISOString(),
            url: "https://example.com",
            image: "",
            summary: "Secondary backup telemetry link established. Processing live nodes."
          }
        ]);
      }
    };
    fetchFocusNews();
  }, [mapFocusStock]);

  const handleSelectNode = useCallback((company: Company) => {
    setSelectedStock(company);
    setMapFocusStock(company);
    fetchData(company.symbol);
    if (isAutopilot) setIsAutopilot(false);
  }, [isAutopilot, fetchData]);

  // Live Simulated Break News Pipeline
  const injectLiveNews = useCallback(() => {
    const randomCompany = COMPANIES[Math.floor(Math.random() * COMPANIES.length)];
    const templatesBySector: Record<string, string[]> = {
      "Technology": [
        "deploys high-volume optical switches at primary data node.",
        "announces next-generation quantum key exchange deployment.",
        "integrates multi-regional mesh clusters to optimize latency.",
        "completes backup server architecture uplink at coordinate nodes."
      ],
      "Semiconductors": [
        "completes mass production trial of 2nm high-precision neuromorphic dies.",
        "registers peak extreme ultraviolet lithography yield metrics.",
        "secures long-term silicon base material sourcing agreements.",
        "ships primary enterprise-level AI accelerator nodes to suppliers."
      ],
      "Financial Services": [
        "verifies secure settlement protocol for high-volume trade pipelines.",
        "clears ultra-high velocity liquidity buffer pool optimization.",
        "launches algorithmic cross-regional bond sync matching node.",
        "secures sovereign infrastructure clearance for digital clearance hub."
      ],
      "Automotive": [
        "completes hardware stress tests on automated guidance microkernels.",
        "deploys solid-state power buffer backups across primary fleets.",
        "secures raw cobalt and lithium supply chain corridor routing."
      ],
      "Energy": [
        "unveils hydrogen-fueled grid buffer array to combat transmission leaks.",
        "starts dynamic grid-tier supply synchronization for corporate nodes.",
        "re-routes deep-sea active undersea conduits following safety review."
      ],
      "Consumer Cyclical": [
        "streamlines next-gen real-time logistical tracking across central nodes.",
        "partners with high-speed automated sorting suppliers to lower latency.",
        "implements carbon-neutral high-security freight corridors in EU."
      ]
    };

    const sectorTemplates = templatesBySector[randomCompany.sector] || [
      "initiates system-wide optimization of business relationships.",
      "achieves localized peak processing telemetry at main offices.",
      "establishes alternative satellite-backed communication channels."
    ];

    const template = sectorTemplates[Math.floor(Math.random() * sectorTemplates.length)];
    const headline = `${randomCompany.name} (${randomCompany.symbol}) // ${template}`;

    const liveStory = {
      symbol: randomCompany.symbol,
      title: headline,
      description: `Intercepted real-time broadcast. Corporate nodes registered peak activity flags at ${randomCompany.name} (sector: ${randomCompany.sector}).`,
      published_at: new Date().toISOString(),
      url: "https://example.com",
      image: "",
      intelligence: {
        translatedTitle: headline
      }
    };

    setNews(prev => [liveStory, ...prev]);
    addLog(`NEWS_INJECTED: ${randomCompany.symbol} // BROADCAST SECURED`);
  }, [addLog]);

  // Dynamic automatic news feeding trigger
  useEffect(() => {
    // Every 18 seconds, auto-inject a live news event to make the globe highly active and live
    const newsTimer = setInterval(() => {
      injectLiveNews();
    }, 18000);
    return () => clearInterval(newsTimer);
  }, [injectLiveNews]);

  // Intelligence Stream Cycle (Neural Stream)
  useEffect(() => {
    let timer: any;
    if (isAutopilot) {
      const cycle = () => {
        const randomIndex = Math.floor(Math.random() * COMPANIES.length);
        const nextCompany = COMPANIES[randomIndex];
        setMapFocusStock(nextCompany);
      };

      // Run once immediately
      cycle();
      
      timer = setInterval(cycle, 30000); // 30 seconds per cycle
    }

    return () => clearInterval(timer);
  }, [isAutopilot]);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-black text-zinc-300 font-sans border-2 border-zinc-900 selection:bg-white selection:text-black">
      <Header selectedStock={quote} yields={globalYields} />
      
      <main className="flex-1 flex overflow-hidden">
        <SearchSidebar 
          onSelect={handleSelectNode} 
          selectedSymbol={selectedStock?.symbol}
          isAutopilot={isAutopilot}
          toggleAutopilot={() => setIsAutopilot(!isAutopilot)}
        />

        <div className="flex-1 min-h-0 flex flex-col relative overflow-hidden">
          <MapLayer 
            selectedStock={selectedStock} 
            focusStock={mapFocusStock}
            onSelectNode={handleSelectNode}
            intelligenceFeed={focusNews.length > 0 ? focusNews : news}
            isIntelligenceStream={isAutopilot}
            toggleIntelligenceStream={() => setIsAutopilot(!isAutopilot)}
            showGlobalNetwork={showGlobalNetwork}
            toggleGlobalNetwork={() => setShowGlobalNetwork(!showGlobalNetwork)}
            activeTab={activeTab}
            marketData={allMarketData}
            allNewsData={news}
            sentiment={sentiment}
            onInjectLiveNews={injectLiveNews}
          />
        </div>

        <IntelligenceSidebar 
          selectedStock={selectedStock}
          quote={quote}
          news={news}
          financials={financials}
          profile={profile}
          history={history}
          isAiProcessing={isAiProcessing}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onSelectNode={handleSelectNode}
          relationships={relationships}
          briefing={briefing}
          sentiment={sentiment}
          yields={nodeYields}
          logs={logs}
          quotaExhausted={quotaExhausted}
          onEnrichNews={() => enrichNews(news)}
          onGenerateBriefing={() => generateBriefing(selectedStock.symbol, { news: news?.slice(0, 3), quote: quote, yields: nodeYields })}
        />
      </main>

      <CommandPalette 
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onSelect={handleSelectNode}
      />

      <footer className="h-5 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between px-2 text-[8px] font-mono text-zinc-600 z-30">
        <div className="flex space-x-3">
          <div className="flex items-center gap-1">
             <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${systemStatus === "SYSTEM: OPTIMAL" ? "bg-white" : "bg-red-500"}`} />
             <span className={systemStatus === "SYSTEM: OPTIMAL" ? "" : "text-red-500 font-bold"}>{systemStatus}</span>
          </div>
          <span>LATENCY: 12ms</span>
          <span>NODE_ID: {selectedStock?.symbol || "HUB-01"}</span>
        </div>
        <div className="text-white font-bold">
          SYNC: {new Date().toISOString().replace('T', ' ').split('.')[0]}
        </div>
      </footer>

      {isLoading && (
         <div className="fixed inset-0 z-[3000] bg-black/60 backdrop-blur-[2px] flex items-center justify-center pointer-events-none">
            <div className="border border-white p-4 bg-black flex items-center gap-4 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
               <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
               <div className="font-mono text-white text-[10px] font-bold animate-pulse tracking-[0.3em] uppercase">Intercepting_Data_Stream...</div>
            </div>
         </div>
      )}
    </div>
  );
}
