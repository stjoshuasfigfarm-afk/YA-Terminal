import { useState, useEffect, useCallback } from "react";
import { Header } from "./components/Header";
import { SearchSidebar } from "./components/SearchSidebar";
import { MapLayer } from "./components/MapLayer";
import { IntelligenceSidebar } from "./components/IntelligenceSidebar";
import { Ticker } from "./components/Ticker";
import { CommandPalette } from "./components/CommandPalette";
import { COMPANIES, Company } from "./data/companies";

export default function App() {
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
  const [activeTab, setActiveTab] = useState<string>("INTEL");
  const [logs, setLogs] = useState<string[]>(["SYSTEM_BOOT_SEQUENCE_COMPLETE", "UPLINK_ESTABLISHED"]);

  const addLog = useCallback((msg: string) => {
    setLogs(prev => [msg, ...prev.slice(0, 19)]);
  }, []);

  const [relationships, setRelationships] = useState<{ suppliers: any[], customers: any[] }>({ suppliers: [], customers: [] });
  const [globalYields, setGlobalYields] = useState<any>(null);
  const [nodeYields, setNodeYields] = useState<any>(null);

  const enrichNews = useCallback(async (rawNews: any[]) => {
    if (!rawNews || rawNews.length === 0) return;
    
    setIsAiProcessing(true);
    try {
      const response = await fetch("/api?service=ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "enrich-news",
          data: rawNews.slice(0, 5) // Limit to top 5 news for performance
        })
      });

      if (!response.ok) {
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
    setIsAiProcessing(true);
    setBriefing(null);
    setSentiment(null);
    try {
      // 1. Generate Briefing
      const briefingResponse = await fetch("/api?service=ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-briefing",
          symbol,
          data: context
        })
      });

      if (briefingResponse.ok) {
        const data = await briefingResponse.json();
        setBriefing(data.briefing);
      }
      
      // 2. Generate Sentiment Analysis
      const sentimentResponse = await fetch("/api?service=ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "analyze-sentiment",
          symbol,
          data: context
        })
      });

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
        fetch(`/api/quote?symbol=${symbol}`, { headers }).then(res => {
          if (!res.ok) console.error(`Quote API alert: Status ${res.status}`);
          return res.json();
        }).catch((e) => {
          console.error("Quote fetch error:", e);
          return {};
        }),
        fetch(`/api/news?symbol=${symbol}`, { headers }).then(res => {
          if (!res.ok) console.error(`News API alert: Status ${res.status}`);
          return res.json();
        }).catch(() => ([])),
        fetch(`/api/profile?symbol=${symbol}`, { headers }).then(res => {
          if (!res.ok) console.error(`Profile API alert: Status ${res.status}`);
          return res.json();
        }).catch(() => ({})),
        fetch(`/api/financials?symbol=${symbol}`, { headers }).then(res => {
          if (!res.ok) console.error(`Financials API alert: Status ${res.status}`);
          return res.json();
        }).catch(() => ([])),
        fetch(`/api/history?symbol=${symbol}`, { headers }).then(res => {
          if (!res.ok) console.error(`History API alert: Status ${res.status}`);
          return res.json();
        }).catch(() => ({ historical: [] })),
        fetch(`/api?service=relationships&symbol=${symbol}`, { headers }).then(res => res.json()).catch(() => ({ relationships: { suppliers: [], customers: [] } })),
        fetch(`/api?service=yields&country=${countryCode}`, { headers }).then(res => res.json()).catch(() => (null)),
      ]);
      
      // Data Parsing check
      if (q && (q.price !== undefined && q.price !== null)) {
        setQuote(q);
      } else {
        console.warn("Quote price telemetery interrupted. Raw data:", q);
        setQuote(q);
      }

      setNews(n);
      setProfile(p);
      setFinancials(f);
      setHistory(h?.historical || []);
      setRelationships(r.relationships || { suppliers: [], customers: [] });
      setNodeYields(y);
      
      if (n && n.length > 0) {
        enrichNews(n);
      }
      
      // Generate strategic briefing if not already processing
      if (!isAiProcessing) {
        addLog(`REQUESTING_STRATEGIC_SYNTHESIS: ${symbol}`);
        generateBriefing(symbol, { news: n?.slice(0, 3), quote: q, yields: y });
      }
    } catch (err) {
      console.error("Critical telemetry synchronization failure:", err);
    } finally {
      setIsLoading(false);
    }
  }, [enrichNews]);

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
        const res = await fetch('/api?service=yields&country=USA');
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
            const res = await fetch(`/api/quote?symbol=${sym}`);
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
    const interval = setInterval(fetchAllData, 45000); // Pulse every 45s
    return () => clearInterval(interval);
  }, []);

  // Live Telemetry Polling (Every 15s)
  useEffect(() => {
    if (!selectedStock) return;

    const pollInterval = setInterval(async () => {
      try {
        const headers = { 'Content-Type': 'application/json' };
        const [qRes, pRes] = await Promise.all([
          fetch(`/api/quote?symbol=${selectedStock.symbol}`, { headers }).then(res => res.json()),
          fetch(`/api/profile?symbol=${selectedStock.symbol}`, { headers }).then(res => res.json())
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
        const res = await fetch(`/api/news?symbol=${mapFocusStock.symbol}`, {
          headers: { 'Content-Type': 'application/json' }
        });
        if (!res.ok) console.error(`Map Focus News status: ${res.status}`);
        const n = await res.json();
        setFocusNews(n);
      } catch (e) {
        console.error("Map focus news sync failure", e);
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
          />
          <Ticker marketData={allMarketData} onSelect={handleSelectNode} />
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
             <div className="w-1 h-1 rounded-full bg-white animate-pulse" />
             <span>SYSTEM: OPTIMAL</span>
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
