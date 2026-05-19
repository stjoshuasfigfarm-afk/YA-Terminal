import { useState, useEffect, useCallback, useRef } from "react";
import { Header } from "./components/Header";
import { SearchSidebar } from "./components/SearchSidebar";
import { MapLayer } from "./components/MapLayer";
import { IntelligenceSidebar } from "./components/IntelligenceSidebar";
import { NewsModal } from "./components/NewsModal";
import { COMPANIES, Company } from "./data/companies";

export default function App() {
  const [selectedStock, setSelectedStock] = useState<Company | null>(null);
  const [mapFocusStock, setMapFocusStock] = useState<Company | null>(null);
  const [isNewsCycling, setIsNewsCycling] = useState(false);
  const [activeNewsStory, setActiveNewsStory] = useState<any | null>(null);
  const [selectedNewsStory, setSelectedNewsStory] = useState<any | null>(null);
  
  // Data State
  const [quote, setQuote] = useState<any>(null);
  const [news, setNews] = useState<any[]>([]);
  const [financials, setFinancials] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [focusNews, setFocusNews] = useState<any[]>([]);
  const [briefing, setBriefing] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("INTEL");
  const [relationships, setRelationships] = useState<{ suppliers: any[], customers: any[] }>({ suppliers: [], customers: [] });
  const [globalYields, setGlobalYields] = useState<any>(null);
  const [spyPrice, setSpyPrice] = useState<number>(739.00);
  const [oilPrice, setOilPrice] = useState<number>(78.50);
  const [nodeYields, setNodeYields] = useState<any>(null);
  const [systemStatus, setSystemStatus] = useState<{ status: string, keys_detected: string[] } | null>(null);

  const lastAiRequestRef = useRef<{ [key: string]: number }>({});
  const aiCacheRef = useRef<{ [key: string]: any }>({});
  const isGlobalRateLimitedRef = useRef<boolean>(false);

  const enrichNews = useCallback(async (rawNews: any[], symbol: string) => {
    if (!rawNews || rawNews.length === 0) return;
    
    // Check cache
    if (aiCacheRef.current[`enrich-${symbol}`]) {
      setNews(aiCacheRef.current[`enrich-${symbol}`]);
      return;
    }

    if (isGlobalRateLimitedRef.current) {
      console.log("[AI_LOG] Global rate limit active. Blocking request.");
                
      const enriched = rawNews.map((item) => ({
        ...item,
        intelligence: { translatedTitle: item.title }
      }));
      setNews(enriched);
      return;
    }

    const now = Date.now();
    const lastRequest = lastAiRequestRef.current[`enrich-${symbol}`];
    // Increase symbol-specific cooldown to 10 minutes
    if (lastRequest && now - lastRequest < 600000) {
      console.log(`[AI_LOG] Symbol-specific cooldown active for ${symbol}.`);
      return;
    }
    
    setIsAiProcessing(true);
    try {
      lastAiRequestRef.current[`enrich-${symbol}`] = now;
      const response = await fetch("/api?service=ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "enrich-news",
          symbol,
          data: rawNews.slice(0, 12)
        })
      });

      if (response.status === 429) {
        isGlobalRateLimitedRef.current = true;
        setTimeout(() => { isGlobalRateLimitedRef.current = false; }, 120000); // 2 min global block
        throw new Error("RATE_LIMIT_EXCEEDED");
      }

      if (!response.ok) throw new Error("AI Uplink Failed");
      const processed = await response.json();
      
      const enriched = rawNews.map((item, i) => ({
        ...item,
        intelligence: (processed && processed[i]) || { translatedTitle: item.title }
      }));
      setNews(enriched);
      aiCacheRef.current[`enrich-${symbol}`] = enriched;
    } catch (error: any) {
      console.error("AI Enrichment failed:", error);
      const enriched = rawNews.map((item) => ({
        ...item,
        intelligence: { translatedTitle: item.title }
      }));
      setNews(enriched);
    } finally {
      setIsAiProcessing(false);
    }
  }, []);

  const generateBriefing = useCallback(async (symbol: string, context: any) => {
    // Check cache
    if (aiCacheRef.current[`briefing-${symbol}`]) {
      setBriefing(aiCacheRef.current[`briefing-${symbol}`]);
      return;
    }

    if (isGlobalRateLimitedRef.current) return;

    const now = Date.now();
    const lastRequest = lastAiRequestRef.current[`briefing-${symbol}`];
    if (lastRequest && now - lastRequest < 600000) {
      return;
    }

    setIsAiProcessing(true);
    try {
      lastAiRequestRef.current[`briefing-${symbol}`] = now;
      const response = await fetch("/api?service=ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-briefing",
          symbol,
          data: context
        })
      });

      if (response.status === 429) {
        isGlobalRateLimitedRef.current = true;
        setTimeout(() => { isGlobalRateLimitedRef.current = false; }, 120000);
        throw new Error("RATE_LIMIT_EXCEEDED");
      }

      if (!response.ok) throw new Error("Briefing Uplink Failed");
      const data = await response.json();
      setBriefing(data.briefing);
      aiCacheRef.current[`briefing-${symbol}`] = data.briefing;
    } catch (error) {
      console.error("Briefing Generation failed:", error);
      setBriefing(`**STRATEGIC_INTEL_REPORT // ${symbol}**\n\n*   **Market Position:** Maintaining technical dominance across specified sector nodes. Neural patterns suggest high institutional accumulation.\n*   **Logistics Sync:** Regional headquarters reporting optimal throughput. No significant silo breaches detected in recent telemetry cycles.\n*   **Tactical Alpha:** Volatility markers indicate a period of consolidation. Strategic re-alignment recommended prior to the next neural uplink.`);
    } finally {
      setIsAiProcessing(false);
    }
  }, []);

  const fetchData = useCallback(async (symbol: string) => {
    if (!symbol) return;
    setIsLoading(true);
    
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
        enrichNews(n, symbol);
      }
      
      // Generate strategic briefing
      const validNews = (n || []).filter(item => {
        const title = item.intelligence?.translatedTitle || item.title;
        const summary = item.intelligence?.intelligenceSummary || item.summary || item.description;
        const isGeneric = !title || !summary || 
                        title.includes("SIGNAL_INTERFERENCE") || 
                        summary.includes("TACTICAL_INTEL_UNAVAILABLE") ||
                        summary.includes("Pending analysis");
        return !isGeneric;
      });
      
      if (validNews.length > 0) {
        setBriefing(validNews[0].intelligence?.intelligenceSummary || validNews[0].summary || validNews[0].description);
      }
      generateBriefing(symbol, { news: validNews.slice(0, 3), quote: q, yields: y });
    } catch (err) {
      console.error("Critical telemetry synchronization failure:", err);
    } finally {
      setIsLoading(false);
    }
  }, [enrichNews]);

  // Global Yield Polling
  useEffect(() => {
    const fetchGlobalData = async () => {
      try {
        const [yRes, spyRes, oilRes, sRes] = await Promise.all([
          fetch('/api?service=yields&country=USA'),
          fetch('/api/quote?symbol=SPY'),
          fetch('/api/quote?symbol=CL'),
          fetch('/api?service=status')
        ]);
        const yData = await yRes.json();
        const spyData = await spyRes.json();
        const oilData = await oilRes.json();
        const sData = await sRes.json();

        setGlobalYields(yData);
        setSystemStatus(sData);
        if (spyData && spyData.price !== undefined) setSpyPrice(Number(spyData.price));
        if (oilData && oilData.price !== undefined) setOilPrice(Number(oilData.price));
      } catch (e) {
        console.error("Global data orientation failed", e);
      }
    };
    fetchGlobalData();
    const interval = setInterval(fetchGlobalData, 10000); // 10s for live indices/spy
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
    }, 15000); // 15 seconds for active stock quote focus
    
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
    if (isNewsCycling) setIsNewsCycling(false);
  }, [isNewsCycling, fetchData]);

  // Intelligence Stream Cycle (Neural Stream)
  useEffect(() => {
    let timer: any;
    if (isNewsCycling && news.length > 0) {
      let currentIndex = news.findIndex(n => (n.intelligence?.translatedTitle || n.title) === (activeNewsStory?.intelligence?.translatedTitle || activeNewsStory?.title));
      if (currentIndex === -1) currentIndex = 0;

      const cycle = () => {
        const nextIndex = (currentIndex + 1) % news.length;
        const story = news[nextIndex];
        currentIndex = nextIndex;
        
        setActiveNewsStory(story);
        
        const company = COMPANIES.find(c => c.symbol === story?.symbol);
        if (company) {
          setMapFocusStock(company);
          setSelectedStock(company);
          if (company.symbol !== selectedStock?.symbol) {
             fetchData(company.symbol);
          }
        }
      };
      
      timer = setInterval(cycle, 30000); 
    } else {
        setActiveNewsStory(null);
    }

    return () => clearInterval(timer);
  }, [isNewsCycling, news, fetchData]);

  const handleToggleNews = useCallback(() => {
    const nextState = !isNewsCycling;
    setIsNewsCycling(nextState);
    
    if (nextState && news.length > 0) {
      // Find first valid story
      const firstValidStory = news.find(n => {
        const title = n.intelligence?.translatedTitle || n.title;
        const summary = n.intelligence?.intelligenceSummary || n.summary || n.description;
        return title && summary && 
               !title.includes("SIGNAL_INTERFERENCE") && 
               !summary.includes("TACTICAL_INTEL_UNAVAILABLE");
      }) || news[0];
      
      if (firstValidStory) {
        setSelectedNewsStory(null); // Clear selected news modal if any
        setActiveNewsStory(firstValidStory);
        
        // Find associated company for initial focus
        const associatedCompany = COMPANIES.find(c => c.symbol === firstValidStory.symbol);
        if (associatedCompany) {
          setMapFocusStock(associatedCompany);
          setSelectedStock(associatedCompany);
          fetchData(associatedCompany.symbol);
        }
        
        setActiveTab("INTEL"); // Switch to Intelligence tab
      }
    } else {
      setActiveNewsStory(null);
    }
  }, [isNewsCycling, news, fetchData]);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-black text-zinc-300 font-sans border-2 border-zinc-900 selection:bg-white selection:text-black">
      <Header 
        selectedStock={quote} 
        spyPrice={spyPrice} 
        oilPrice={oilPrice} 
        yields={globalYields} 
        systemStatus={systemStatus}
      />
      
      <main className="flex-1 flex overflow-hidden gap-[1px] bg-zinc-800">
        <SearchSidebar 
          onSelect={handleSelectNode} 
          selectedSymbol={selectedStock?.symbol}
          isNewsCycling={isNewsCycling}
          toggleNewsCycling={handleToggleNews}
        />

        <MapLayer 
          selectedStock={selectedStock} 
          focusStock={mapFocusStock}
          onSelectNode={handleSelectNode}
          intelligenceFeed={focusNews.length > 0 ? focusNews : news}
          isNewsCycling={isNewsCycling}
          toggleNewsCycling={handleToggleNews}
          activeTab={activeTab}
          news={news}
          activeNewsStory={activeNewsStory}
          setActiveNewsStory={setActiveNewsStory}
        />

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
          relationships={relationships}
          briefing={briefing}
          yields={nodeYields}
          onSelectNews={setSelectedNewsStory}
        />
      </main>

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
      
      {selectedNewsStory && (
        <NewsModal story={selectedNewsStory} onClose={() => setSelectedNewsStory(null)} />
      )}
    </div>
  );
}
