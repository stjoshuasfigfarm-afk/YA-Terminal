import { TerminalProvider, useTerminal } from "./context/TerminalContext";
import { useCompanies } from "./context/CompaniesContext";
import React, { lazy, Suspense, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Globe, Search, Newspaper, TrendingUp, Layers, Filter, MapPin } from "lucide-react";
import { cn } from "./lib/utils";
import { AccessWall } from "./components/AccessWall";
import { Header } from "./components/Header";
import { SettingsModal } from "./components/SettingsModal";
import { DataSidebar } from "./components/DataSidebar";
import { IntelligenceSidebar } from "./components/IntelligenceSidebar";
import { CommandPalette } from "./components/CommandPalette";
import { Company, COMPANIES } from "./data/companies";
import { motion, AnimatePresence } from "motion/react";

import { useSiloPrice } from "./firebase/useSiloPrice";
import { rehydrateSilo } from "./app/actions";
import { searchAndScoreCompanies } from "./lib/searchEngine";
import { getApiBaseUrl } from "./lib/utils";
import { generateCompanySpecificNews } from "./utils/mockNews";

const MapLayer = lazy(() => import("./components/MapLayer").then(m => ({ default: m.MapLayer })));

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



export default function App() {
  const { companies } = useCompanies();
  const { 
    selectedStock, 
    setSelectedStock, 
    marketData, 
    setMarketData, 
    isLoading, 
    setIsLoading 
  } = useTerminal();

  const [mapFocusStock, setMapFocusStock] = useState<Company | null>(null);
  const [isAutopilot, setIsAutopilot] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [mapLayers, setMapLayers] = useState({ hq: true, arcs: true, heatmap: true, satellite: false, borders: true });
  const [networkAnchor, setNetworkAnchor] = useState<Company | null>(null);
  const [isSearchSidebarMinimized, setIsSearchSidebarMinimized] = useState(false);
  const [isIntelSidebarMinimized, setIsIntelSidebarMinimized] = useState(false);
  const [isDataSidebarMinimized, setIsDataSidebarMinimized] = useState(false);
  const [pinnedTickers, setPinnedTickers] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("terminal_pinned_symbols");
      return saved ? JSON.parse(saved) : ["SPY", "AAPL", "NVDA", "ASML"];
    } catch {
      return ["SPY", "AAPL", "NVDA", "ASML"];
    }
  });

  const selectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const rehydrateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const togglePin = (symbol: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextList = pinnedTickers.includes(symbol)
      ? pinnedTickers.filter(s => s !== symbol)
      : [...pinnedTickers, symbol];
    setPinnedTickers(nextList);
    try {
      localStorage.setItem("terminal_pinned_symbols", JSON.stringify(nextList));
    } catch (err) {
      console.warn("Storage write failed", err);
    }
  };

  // Initialize sidebars - open by default if width >= 1024
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 1024) {
        setIsDataSidebarMinimized(true);
        setIsIntelSidebarMinimized(true);
      } else {
        setIsDataSidebarMinimized(false);
        setIsIntelSidebarMinimized(false);
      }
    };
    
    // Run once on mount
    handleResize();
    
    if (typeof window !== "undefined") {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);
  const [activeCorridorId, setActiveCorridorId] = useState<string | null>(null);
  const [agentFocus, setAgentFocus] = useState<any | null>(null);
  const [agentEntities, setAgentEntities] = useState<any[]>([]);
  const [isAgentSearching, setIsAgentSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewportLock, setViewportLock] = useState(false);
  const [autoRotateEnabled, setAutoRotateEnabled] = useState(true);
  
  // System-wide Global Risk Matrix (World Shocks)
  const [taiwanStraitBlocked, setTaiwanStraitBlocked] = useState(false);
  const [suezCanalBlocked, setSuezCanalBlocked] = useState(false);
  const [malaccaStraitBlocked, setMalaccaStraitBlocked] = useState(false);
  const [panamaCanalBlocked, setPanamaCanalBlocked] = useState(false);

  const [airFreightActive, setAirFreightActive] = useState(false);
  const [strategicStockpileActive, setStrategicStockpileActive] = useState(false);
  const [dualSourcingActive, setDualSourcingActive] = useState(false);

  const systemRiskScore = useMemo(() => {
    let score = 25;
    const sector = selectedStock?.sector?.toLowerCase() || "";
    if (taiwanStraitBlocked) score += (sector.includes("semi") || sector.includes("tech") ? 45 : 15);
    if (suezCanalBlocked) score += (sector.includes("energy") || sector.includes("oil") ? 50 : 20);
    if (malaccaStraitBlocked) score += 30;
    if (panamaCanalBlocked) score += (sector.includes("retail") ? 25 : 10);
    if (airFreightActive) score -= 12;
    if (strategicStockpileActive) score -= 15;
    if (dualSourcingActive) score -= 18;
    return Math.max(5, Math.min(100, score));
  }, [selectedStock, taiwanStraitBlocked, suezCanalBlocked, malaccaStraitBlocked, panamaCanalBlocked, airFreightActive, strategicStockpileActive, dualSourcingActive]);

  const threatLevelText = useMemo(() => {
    if (systemRiskScore >= 80) return "DEFCON 1: CRITICAL SHOCK";
    if (systemRiskScore >= 60) return "DEFCON 2: SEVERE THREAT";
    if (systemRiskScore >= 40) return "DEFCON 3: ELEVATED RISK";
    if (systemRiskScore >= 20) return "DEFCON 4: GUARDED STATUS";
    return "DEFCON 5: OPTIMAL SECURITY";
  }, [systemRiskScore]);


  
  const [mobileView, setMobileView] = useState<"MAP" | "INTEL" | "DATA">("MAP");
  
  const toggleMapLayer = (layer: string) => setMapLayers(prev => ({ ...prev, [layer]: !prev[layer as keyof typeof prev] }));
  
  // Synchronization Layer
  const { priceData: siloPrice } = useSiloPrice(selectedStock?.symbol || "");

  useEffect(() => {
    if (siloPrice) {
      setMarketData({ quote: siloPrice });
    }
  }, [siloPrice, setMarketData]);

  const [allMarketData, setAllMarketData] = useState<Record<string, any>>({});
  const [quotaExhausted, setQuotaExhausted] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("INTEL");
  const [searchCategory, setSearchCategory] = useState<"STOCKS" | "ETFS" | "AGENT">("AGENT");
  const [filterSector, setFilterSector] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"SYMBOL" | "SECTOR">("SYMBOL");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [focusNews, setFocusNews] = useState<any[]>([]);
  const [briefing, setBriefing] = useState<any | null>(null);
  const [sentiment, setSentiment] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>(["System initialized", "Data connection established"]);
  const [systemStatus, setSystemStatus] = useState<string>("System Active");

  const sectors = useMemo(() => {
    if (!companies || !Array.isArray(companies)) return [];
    
    // Ensure we only process non-null/undefined objects
    const s = new Set(companies.filter(c => c && c.sector).map(c => c.sector));
    s.delete("ETF");
    return Array.from(s).sort();
  }, [companies]);

  const searchedResults = useMemo(() => {
    return searchAndScoreCompanies(companies, searchQuery);
  }, [companies, searchQuery]);

  const finalFilteredMatches = useMemo(() => {
    let matches = searchedResults.filter(match => {
      const c = match.company;
      if (searchCategory === "ETFS") {
        return c.sector === "ETF";
      } else if (searchCategory === "STOCKS") {
        const matchesSector = !filterSector || c.sector === filterSector;
        return c.sector !== "ETF" && matchesSector;
      }
      return true;
    });

    if (!searchQuery.trim()) {
      matches = [...matches].sort((a, b) => {
        if (sortOrder === "SECTOR") {
          const sComp = a.company.sector.localeCompare(b.company.sector);
          if (sComp !== 0) return sComp;
        }
        return a.company.symbol.localeCompare(b.company.symbol);
      });
    }

    // Default ticker limit changed to 50 (was conceptually 100 or unrestricted raw matches)
    return matches.slice(0, 50);
  }, [searchedResults, searchQuery, searchCategory, filterSector, sortOrder]);

  // Sync left and right sidebar tabs
  useEffect(() => {
    if (searchCategory === "AGENT" && activeTab !== "INTEL") {
      setActiveTab("INTEL");
    }
  }, [searchCategory, activeTab]);

  useEffect(() => {
    if (activeTab === "INTEL" && searchCategory !== "AGENT") {
      setSearchCategory("AGENT");
    } else if (activeTab !== "INTEL" && searchCategory === "AGENT") {
      setSearchCategory("STOCKS");
    }
  }, [activeTab, searchCategory]);

  const [isVocalizerEnabled, setIsVocalizerEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem("terminal_vocalizer_enabled");
    return saved !== "false";
  });

  const toggleVocalizer = useCallback((val: boolean) => {
    setIsVocalizerEnabled(val);
    localStorage.setItem("terminal_vocalizer_enabled", String(val));
    if (!val && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const addLog = useCallback((msg: string) => {
    setLogs(prev => [msg, ...prev.slice(0, 19)]);
  }, []);

  // Robust Telemetry Fetch Interceptor
  const telemetryFetch = useCallback(async (input: RequestInfo, init?: RequestInit, retries = 3, delay = 1000): Promise<Response> => {
    let finalUrl = input;
    const baseUrl = getApiBaseUrl();
    if (typeof finalUrl === "string" && finalUrl.startsWith("/") && baseUrl) {
      finalUrl = baseUrl + finalUrl;
    }

    const openRouterKey = localStorage.getItem('openrouter_api_key') || '';
    const openRouterModel = localStorage.getItem('openrouter_model') || 'google/gemini-2.5-flash';

    const mergedInit = { ...init };
    const headers = { ...(mergedInit.headers || {}) } as Record<string, string>;
    
    if (openRouterKey) {
      headers['X-OpenRouter-API-Key'] = openRouterKey;
      headers['X-OpenRouter-Model'] = openRouterModel;
    }
    mergedInit.headers = headers;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(finalUrl, mergedInit);
        
        if (!response.ok) {
          if (response.status === 404) {
            console.error(`[TELEMETRY_FETCH_404] Failed to fetch: ${finalUrl} (attempt ${attempt}/${retries})`);
            try {
              const resClone = response.clone();
              const json = await resClone.json();
              if (json && json.error === "NOT_FOUND") {
                setSystemStatus("Connection Error: Route Unresolved");
              }
            } catch (e) {
              setSystemStatus("Connection Error: Route Unresolved");
            }
          } else if (response.status === 401 || response.status === 403) {
            setSystemStatus("Connection Error: Unauthorized");
          } else if (response.status >= 500 && attempt < retries) {
            await new Promise(resolve => setTimeout(resolve, delay * attempt));
            continue;
          }
        } else {
          setSystemStatus("System Active");
        }
        return response;
      } catch (err: any) {
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 1.5;
          continue;
        }
        setSystemStatus("Connection Error");
        throw err;
      }
    }
    throw new TypeError("Failed to fetch after retries");
  }, []);

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
      setMarketData({ news: enriched });
    } catch (error: any) {
      console.error("AI Enrichment failed:", error);
      // Fallback to original news titles if AI enrichment fails
      const fallbackNews = rawNews.map(item => ({
        ...item,
        intelligence: item.intelligence || { translatedTitle: item.title }
      }));
      setMarketData({ news: fallbackNews });
    } finally {
      setIsAiProcessing(false);
    }
  }, [quotaExhausted, telemetryFetch, setMarketData]);

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
        setBriefing(data);
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
      setBriefing(`Analysis Error: ${error.message || "Manual assessment required."}`);
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
      const company = companies.find(c => c.symbol === symbol);
      const countryCode = company?.country || 'USA';

      const [q, n, p, f, h, r, y] = await Promise.all([
        telemetryFetch(`/api/quote?symbol=${symbol}`, { headers }).then(res => {
          if (res.ok) return res.json();
          return null;
        }).catch(() => null),
        telemetryFetch(`/api/news?symbol=${symbol}`, { headers }).then(res => {
          if (res.ok) return res.json();
          return null;
        }).catch(() => null),
        telemetryFetch(`/api/profile?symbol=${symbol}`, { headers }).then(res => {
          if (res.ok) return res.json();
          return null;
        }).catch(() => null),
        telemetryFetch(`/api/financials?symbol=${symbol}`, { headers }).then(res => {
          if (res.ok) return res.json();
          return null;
        }).catch(() => null),
        telemetryFetch(`/api/history?symbol=${symbol}`, { headers }).then(res => {
          if (res.ok) return res.json();
          return null;
        }).catch(() => null),
        telemetryFetch(`/api/relationships/${symbol}`, { headers }).then(res => res.json()).catch(() => ({ relationships: { suppliers: [], customers: [] } })),
        telemetryFetch(`/api/yields?country=${countryCode}`, { headers }).then(res => res.json()).catch(() => (null)),
      ]);
      
      const finalNews = Array.isArray(n) && n.length > 0 
        ? n.map((item: any) => ({ ...item, symbol })) 
        : generateCompanySpecificNews(symbol, company?.name || symbol, company?.sector || "Technology");

      setMarketData({
        quote: q,
        news: finalNews,
        profile: p,
        financials: f,
        history: h?.processed || [],
        relationships: r.relationships || { suppliers: [], customers: [] },
        yields: y
      });
      
    } catch (err) {
      console.error("Critical telemetry synchronization failure:", err);
    } finally {
      setIsLoading(false);
    }
  }, [addLog, telemetryFetch, setMarketData, setIsLoading, companies]);

  const handleAgentSearch = useCallback(async (query: string) => {
    if (!query.trim() || isAgentSearching) return;
    
    setIsAgentSearching(true);
    addLog(`Searching for "${query.toUpperCase()}"...`);
    
    try {
      const response = await telemetryFetch("/api/ai/navigate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: query.trim() }),
      });

      if (!response.ok) {
        throw new Error(`Connection error: ${response.status}`);
      }

      const data = await response.json();
      if (data && data.coordinates && Array.isArray(data.coordinates)) {
        const result = {
          locationName: data.locationName || "Target location",
          lat: Number(data.coordinates[0]),
          lng: Number(data.coordinates[1]),
          zoomLevel: typeof data.zoomLevel === "number" ? data.zoomLevel : 6,
          briefing: data.briefing || "Location mapped.",
          facts: data.facts || [],
          ticker: data.ticker
        };
        
        setAgentFocus(result);
        setAgentEntities(data.entities || []);
        addLog(`Location found: ${result.locationName}`);
        
        if (data.aiStrategyAnalysis) {
          setBriefing(data.aiStrategyAnalysis);
        }
        
        setActiveTab("INTEL"); // Switch to Intelligence tab in sidebar
        
        if (data.ticker) {
          const matched = companies.find(c => c.symbol === data.ticker);
          if (matched) {
            setSelectedStock(matched);
            setMapFocusStock(matched);
            fetchData(matched.symbol);
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      addLog(`Search Error: ${err.message}`);
    } finally {
      setIsAgentSearching(false);
    }
  }, [isAgentSearching, addLog, telemetryFetch, fetchData]);

  // Global Key Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    if (typeof window !== "undefined") {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, []);

  // Centralized Quantitative Data Heartbeat
  useEffect(() => {
    const symbolsToPoll = ["SPY", "QQQ", "AAPL", "NVDA", "ASML", "TSLA", "MSFT", "GOOGL", "AMZN", "META"];
    
    const cycle = async () => {
      if (document.hidden) return;
      
      try {
        // 1. Batch Market Heatmap Polling
        const symbolsToFetch = companies.map(c => c.symbol);
        const results: Record<string, any> = {};
        const topSymbols = symbolsToFetch.slice(0, 15);
        
        await Promise.all(topSymbols.map(async (sym) => {
          try {
            const res = await telemetryFetch(`/api/quote?symbol=${sym}`);
            if (res.ok) results[sym] = await res.json();
          } catch (e) {}
        }));
        setAllMarketData(prev => ({ ...prev, ...results }));

        // 2. Global Yields Baseline
        const yRes = await telemetryFetch('/api/yields?country=USA');
        if (yRes.ok) setMarketData({ yields: await yRes.json() });

        // 3. Force Silo Rehydration for Active Context
        if (selectedStock?.symbol) {
          await rehydrateSilo(selectedStock.symbol);
        }
      } catch (err) {
        console.warn("[HEARTBEAT_CYCLE] Interrupted:", err);
      }
    };

    cycle();
    const intervalId = setInterval(cycle, 60000); // Unified 60s Frequency
    return () => clearInterval(intervalId);
  }, [selectedStock?.symbol, telemetryFetch, setMarketData]);

  // Initial Load Guard
  useEffect(() => {
    if (!selectedStock && companies.length > 0) {
      const defaultCompany = companies.find(c => c.symbol === "SPY") || companies[0];
      setSelectedStock(defaultCompany);
      fetchData(defaultCompany.symbol);
    }
  }, [fetchData, selectedStock]);

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
      } catch (e: any) {
        // Robust fallback news item
        const matched = companies.find(c => c.symbol === mapFocusStock.symbol) || mapFocusStock;
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

  const handleSelectNode = useCallback((company: Company, skipFetch = false, isSearch = false, activeStoryContext?: any) => {
    setSelectedStock(company);
    setMapFocusStock(company);
    setViewportLock(true);
    
    if (isSearch) {
      setNetworkAnchor(company);
    } else {
      setNetworkAnchor(prev => prev ? company : null);
    }

    if (isAutopilot) setIsAutopilot(false);

    // Debounced fetch to avoid overlapping requests on rapid switching
    if (selectionTimeoutRef.current) clearTimeout(selectionTimeoutRef.current);
    
    if (!skipFetch) {
      selectionTimeoutRef.current = setTimeout(() => {
        fetchData(company.symbol);
        if (activeStoryContext) {
          generateBriefing(company.symbol, { 
            news: [activeStoryContext], 
            quote: marketData.quote, 
            yields: marketData.yields,
            storyContext: activeStoryContext
          });
        } else {
          generateBriefing(company.symbol, { context: "manual selection" });
        }
      }, 300);
    }
  }, [isAutopilot, fetchData, setSelectedStock, generateBriefing, marketData.quote, marketData.yields]);

  // Live Simulated Break News Pipeline
  const injectLiveNews = useCallback(() => {
    const randomCompany = companies[Math.floor(Math.random() * companies.length)];
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
    const headline = `${randomCompany.name} // ${template}`;

    const liveStory = {
      symbol: randomCompany.symbol,
      title: headline,
      description: `Surveillance feed updated. ${randomCompany.name} is showing anomalous operational telemetry in the ${randomCompany.sector} division. Data packets suggest significant internal network restructuring.`,
      headline: headline,
      published_at: new Date().toISOString(),
      url: "https://example.com",
      image: "",
      intelligence: {
        translatedTitle: headline
      }
    };

    setMarketData(prev => ({ 
      news: [liveStory, ...(prev.news || [])].slice(0, 50) 
    }));
    addLog(`SIGNAL_DECODED: ${randomCompany.symbol} news injected into stream.`);

    // Center the location dynamically
    setAgentFocus({
       locationName: randomCompany.name,
       lat: randomCompany.lat,
       lng: randomCompany.lng,
       zoomLevel: 5,
       briefing: `URGENT_TELEMETRY: ${headline}`
    });

    // Reset center focus after 8 seconds to resume normal operation
    setTimeout(() => {
        setAgentFocus(prev => prev?.locationName === randomCompany.name ? null : prev);
        setViewportLock(false);
    }, 8000);

  }, [addLog, setMarketData, setAgentFocus, setViewportLock]);

  // Periodic News Injection Heartbeat
  useEffect(() => {
    // Initial delay so it doesn't fire immediately on mount
    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        if (!document.hidden && !isAiProcessing) {
          injectLiveNews();
        }
      }, 60000); // Increased frequency: Every 60 seconds for a more dynamic "intelligence stream"
      return () => clearInterval(interval);
    }, 10000); // Shorter initial delay (10s)
    return () => clearTimeout(timer);
  }, [injectLiveNews, isAiProcessing]);

  // Intelligence Stream Cycle (Neural Stream)
  useEffect(() => {
    let timer: any;
    if (isAutopilot) {
      const cycle = () => {
        const randomIndex = Math.floor(Math.random() * companies.length);
        const nextCompany = companies[randomIndex];
        setMapFocusStock(nextCompany);
      };

      // Run once immediately
      cycle();
      
      timer = setInterval(cycle, 30000); // 30 seconds per cycle
    }

    return () => clearInterval(timer);
  }, [isAutopilot]);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#050505] text-zinc-300 font-sans border-2 border-zinc-900 selection:bg-emerald-500/30 selection:text-emerald-100 relative shadow-[inset_0_0_150px_rgba(0,0,0,0.9)]">
        {/* CRT Scanline Overlay */}
        <div className="pointer-events-none absolute inset-0 z-50 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.05)_50%)] bg-[length:100%_3px] opacity-40 invisible" />
        <div className="pointer-events-none absolute inset-0 z-50 bg-scan-line opacity-10 invisible" />
        
        {/* Subtle technical grid background */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-20" style={{
          backgroundImage: 'linear-gradient(to right, rgba(16, 185, 129, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(16, 185, 129, 0.05) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />
        <Header 
          selectedStock={marketData.quote} 
          yields={marketData.yields} 
          onOpenSettings={() => setIsSettingsOpen(true)}
          onSelectStock={handleSelectNode}
          riskScore={systemRiskScore}
        />

        {/* Secondary Command Header */}
        <div className="flex flex-col border-b border-zinc-900 bg-black/60">
        <div className="hidden sm:flex h-8 items-center px-2 md:px-4 overflow-hidden divide-x divide-zinc-900 select-none">
          <div className="flex items-center gap-2 md:gap-3 pr-2 md:pr-4">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              <span className="text-[7.5px] font-mono text-emerald-500 font-black tracking-widest uppercase">Global_Logistics_Core</span>
            </div>
            <button
              onClick={() => toggleVocalizer(!isVocalizerEnabled)}
              className={cn(
                "ml-2 border px-2 py-0.5 transition-all flex items-center gap-1.5 cursor-pointer rounded-xs font-mono text-[6px] font-black tracking-widest uppercase h-4.5",
                isVocalizerEnabled
                  ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 shadow-[0_0_10px_rgba(16,185,129,0.1)]"
                  : "bg-zinc-950 border-zinc-900 text-zinc-500 hover:border-zinc-800 hover:text-zinc-300"
              )}
              title={isVocalizerEnabled ? "Mute Briefing Voice" : "Unmute Briefing Voice"}
            >
              <div className={cn("w-1 h-1 rounded-full", isVocalizerEnabled ? "bg-emerald-400" : "bg-zinc-700")} />
              <span>{isVocalizerEnabled ? "VOX_ACTV" : "VOX_STBY"}</span>
            </button>
          </div>
          <div className="px-2 md:px-4 flex items-center gap-4 md:gap-8 overflow-x-auto scrollbar-none h-full">
             {[
               { label: "NET_LATENCY", val: "24ms", color: "text-emerald-500", hideOnMobile: true },
               { label: "NODE_LOAD", val: "1.4TB/S", color: "text-zinc-300", hideOnMobile: false },
               { label: "THREAT_LVL", val: "MINIMAL", color: "text-emerald-400", hideOnMobile: false },
               { label: "SYST_UPTIME", val: "99.98%", color: "text-zinc-300", hideOnMobile: true },
               { label: "BREADTH", val: "68.4%", color: "text-emerald-400", hideOnMobile: true },
               { label: "GEOSPATIAL", val: "CALIBRATED", color: "text-zinc-500", hideOnMobile: false },
             ].map((item, i) => (
                <div key={i} className={cn(
                  "flex flex-col whitespace-nowrap group cursor-help shrink-0",
                  item.hideOnMobile ? "hidden md:flex" : "flex"
                )}>
                   <span className="text-[5.5px] text-zinc-700 font-black tracking-[0.15em] group-hover:text-emerald-500/50 transition-colors uppercase">{item.label}</span>
                   <span className={cn("text-[8px] font-mono font-black transition-colors", item.color || "text-zinc-300")}>{item.val}</span>
                </div>
             ))}
          </div>
          {/* Real-time Status Stream */}
          <div className="flex-1 overflow-hidden h-4 px-4 hidden lg:block">
            <div className="whitespace-nowrap text-[6.5px] font-mono text-zinc-650 flex items-center gap-8">
              {marketData.news && marketData.news.length > 0 ? (
                marketData.news.slice(0, 5).map((n: any, i: number) => (
                  <span key={i}>
                    <span className="text-emerald-500/50">[INTEL_{i}]</span> {n.title.toUpperCase()} ... [OK]
                  </span>
                ))
              ) : (
                <>
                  <span>[LOG] ATTEMPTING_HANDSHAKE_WITH_GLOBAL_RELAY_NODES... [OK]</span>
                  <span>[LOG] CROSS_BORDER_CAPITAL_FLOW_BUFFER_INDEXED... [OK]</span>
                  <span>[LOG] NEURAL_NETWORK_SYNAPSE_LOAD: 0.12ms... [NOMINAL]</span>
                  <span>[LOG] ESG_VULNERABILITY_VECTORS_CALCULATED... [STABLE]</span>
                  <span>[LOG] SENTIMENT_PIPELINE_ACTIVE: TOPIC_MODEL_V4... [OK]</span>
                  <span>[LOG] SYSTEM_UPTIME: 1442.22_HRS... [STABLE]</span>
                </>
              )}
            </div>
          </div>

          <div className="ml-auto pl-2 md:pl-4 flex items-center gap-3">
             <div className="flex items-center gap-1 text-[7px] text-zinc-500 font-mono">
                <span className="text-zinc-700 hidden lg:inline">KERNEL:</span>
                <span>v6.4.2-LOGISTICS</span>
             </div>
          </div>
        </div>
        
        {/* Pinned Tickers */}
        <div className="h-6 bg-zinc-950/50 flex items-center px-4 gap-4 border-t border-zinc-900 border-opacity-50">
          <div className="text-[7px] font-black text-zinc-600 uppercase tracking-widest">PINNED:</div>
          <div className="flex gap-4">
            {pinnedTickers.map(ticker => (
               <button 
                 key={ticker} 
                 onClick={() => {
                   const company = companies.find(c => c.symbol === ticker) || COMPANIES.find(c => c.symbol === ticker);
                   if (company) handleSelectNode(company);
                 }}
                 className="text-[9px] font-mono font-bold text-zinc-400 hover:text-emerald-400 uppercase tracking-wide cursor-pointer transition-colors"
               >
                 {ticker}
               </button>
            ))}
          </div>
        </div>

        {/* PANEL G: DATA_FLOW (ACROSS THE TOP) */}
        <div className="border-t border-zinc-900 bg-black py-1.5 px-4 flex flex-col md:flex-row md:items-center justify-between gap-2 md:gap-4 select-none shrink-0 relative z-30">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
            <span className="text-[8px] text-zinc-400 font-mono font-black uppercase tracking-[0.15em] whitespace-nowrap">PANEL G: SYSTEM_INDEX (PORT_3000)</span>
          </div>

          <div className="relative w-full md:max-w-xs xl:max-w-sm shrink-0">
            <div className="relative flex items-center">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && searchQuery) {
                    e.preventDefault();
                    if (finalFilteredMatches.length > 0) {
                      handleSelectNode(finalFilteredMatches[0].company, false, true);
                      setSearchQuery("");
                      setTimeout(() => setIsSearchFocused(false), 50);
                    } else if (handleAgentSearch) {
                      handleAgentSearch(searchQuery);
                    }
                  }
                }}
                placeholder="PROBE TICKER / SEARCH..."
                className="w-full bg-zinc-950 text-emerald-400 border border-zinc-900 pl-6 pr-3 py-0.5 text-[8.5px] font-mono outline-none rounded-xs focus:border-emerald-500/40 transition-all placeholder-zinc-800 uppercase tracking-widest focus:bg-black"
              />
              <Search className="w-2.5 h-2.5 text-zinc-700 absolute left-2" />
            </div>

            <AnimatePresence>
              {(isSearchFocused || searchQuery.trim().length > 0) && (
                <motion.div 
                  initial={{ opacity: 0, y: -2 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -2 }}
                  transition={{ duration: 0.1 }}
                  className="absolute top-full left-0 right-0 z-[200] mt-1 max-h-60 overflow-y-auto custom-scrollbar border border-emerald-500/30 bg-black/95 backdrop-blur-md rounded-xs shadow-[0_4px_20px_rgba(0,0,0,0.8)] p-px"
                >
                  <div className="absolute inset-x-0 h-[1px] bg-emerald-500/10 top-0 z-10 pointer-events-none" />
                  {finalFilteredMatches.length > 0 ? (
                    finalFilteredMatches.map(({ company, score, matchedFields }, idx) => {
                      const isSelected = selectedStock?.symbol === company.symbol;
                      const isPinned = pinnedTickers.includes(company.symbol);
                      return (
                        <div
                          key={`${company.symbol}-${idx}`}
                          onClick={() => handleSelectNode(company, false, true)}
                          className={cn(
                            "group flex items-center justify-between p-1.5 text-[10px] cursor-pointer transition-all hover:bg-emerald-500/10",
                            isSelected ? "bg-emerald-500/5 border-l-2 border-emerald-500" : ""
                          )}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-mono font-bold tracking-wider text-zinc-300 group-hover:text-emerald-400 transition-colors uppercase">
                              {company.symbol}
                            </span>
                            <div className="flex flex-col min-w-0">
                              <span className="text-zinc-650 truncate text-[9px] max-w-[120px] font-sans group-hover:text-zinc-400">
                                {company.name}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[7.5px] font-mono text-zinc-650 group-hover:text-zinc-400 uppercase">
                              {company.sector}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePin(company.symbol, e);
                              }}
                              className={cn(
                                "p-0.5 hover:bg-zinc-900 rounded-sm transition-transform active:scale-90",
                                isPinned ? "text-emerald-500" : "text-zinc-700 hover:text-emerald-400/50"
                              )}
                            >
                              <MapPin className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center p-3 text-[8px] font-mono text-zinc-700 uppercase">
                      [ 0 RADAR MATCHES ]
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1">
              {(["STOCKS", "ETFS", "AGENT"] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSearchCategory(cat)}
                  className={cn(
                    "px-2 py-0.5 text-[7px] font-mono font-black border transition-all rounded-xs uppercase tracking-widest",
                    searchCategory === cat
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
                      : "bg-transparent border-zinc-900 text-zinc-650 hover:border-zinc-800 hover:text-zinc-400"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>

            <button 
              onClick={() => setSortOrder(prev => prev === "SYMBOL" ? "SECTOR" : "SYMBOL")}
              className="p-1 px-2 border border-zinc-900 rounded-xs hover:bg-zinc-900 hover:border-zinc-800 transition-colors"
              title="Toggle Sort"
            >
              <span className="text-[7.5px] font-mono text-zinc-600">SORT</span>
            </button>

            <div className="hidden lg:flex items-center gap-1.5 bg-zinc-950 px-1.5 py-0.5 border border-zinc-900 rounded-xs">
              {[
                { label: "c:USA" },
                { label: "c:TWN" },
                { label: "s:Semi" },
                { label: "p:NVDA" },
                { label: "p:AAPL" },
              ].map((chip) => {
                const isActive = searchQuery.toLowerCase().includes(chip.label.toLowerCase());
                return (
                  <button
                    key={chip.label}
                    onClick={() => {
                      const trimmed = searchQuery.trim();
                      if (!trimmed) {
                        setSearchQuery(chip.label);
                      } else if (trimmed.toLowerCase().includes(chip.label.toLowerCase())) {
                        const words = trimmed.split(/\s+/);
                        setSearchQuery(words.filter(w => w.toLowerCase() !== chip.label.toLowerCase()).join(" "));
                      } else {
                        setSearchQuery(`${trimmed} ${chip.label}`);
                      }
                    }}
                    className={cn(
                      "text-[6.5px] font-mono font-black px-1.5 py-0.5 border cursor-pointer transition-all flex items-center select-none uppercase tracking-tighter",
                      isActive
                        ? "bg-emerald-500/15 border-emerald-500 text-emerald-400"
                        : "bg-transparent border-zinc-900 text-zinc-600 hover:text-zinc-400"
                    )}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>

            {searchCategory === "STOCKS" && (
              <div className="flex items-center gap-1 border-l border-zinc-900 pl-2">
                <button
                  onClick={() => setFilterSector(null)}
                  className={cn(
                    "text-[6px] font-mono uppercase px-1 py-0.5 border transition-all rounded-xs",
                    !filterSector ? "border-emerald-500/30 text-emerald-500 bg-emerald-500/5" : "border-zinc-900 text-zinc-655 hover:text-zinc-500"
                  )}
                >
                  ALL
                </button>
                {sectors.slice(0, 3).map(sec => (
                  <button
                    key={sec}
                    onClick={() => setFilterSector(sec)}
                    className={cn(
                      "text-[6px] font-mono uppercase px-1 py-0.5 border transition-all rounded-xs",
                      filterSector === sec ? "border-emerald-500/30 text-emerald-500 bg-emerald-500/5" : "border-zinc-900 text-zinc-655 hover:text-zinc-500"
                    )}
                  >
                    {sec.split(' ').pop() || sec}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        </div>
        
        <main className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden relative custom-scrollbar scroll-smooth">
          <div 
            id="mobile-sec-map"
            className="flex-1 flex flex-col min-w-0 shrink-0 h-[520px] md:h-full relative order-1 md:order-2"
          >
            <div className={cn(
              "flex-1 min-h-0 flex flex-col relative overflow-hidden border border-zinc-900 m-1 rounded-xs bg-black transition-all duration-150",
              "flex md:h-full"
            )}>
              <Suspense fallback={
                <div className="w-full h-full bg-zinc-950 flex flex-col items-center justify-center">
                  <div className="w-12 h-12 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full" />
                  <div className="mt-4 text-emerald-500/50 font-mono text-[10px] tracking-widest uppercase">INITIALIZING...</div>
                </div>
              }>
                <MapLayer 
                  selectedStock={selectedStock} 
                  focusStock={mapFocusStock}
                  onSelectNode={handleSelectNode}
                  isVocalizerEnabled={isVocalizerEnabled}
                  onToggleVocalizer={toggleVocalizer}
                  intelligenceFeed={focusNews.length > 0 ? focusNews : marketData.news}
                  isIntelligenceStream={isAutopilot}
                  toggleIntelligenceStream={() => {
                    const next = !isAutopilot;
                    setIsAutopilot(next);
                    if (next) {
                      setViewportLock(true);
                      // Do not force rotation off - let the user's SPIN/FREE/LOCK state persist
                    }
                  }}
                  showGlobalNetwork={!!networkAnchor}
                  networkAnchor={networkAnchor}
                  toggleGlobalNetwork={() => {
                    if (networkAnchor) {
                      setNetworkAnchor(null);
                    } else if (selectedStock) {
                      setNetworkAnchor(selectedStock);
                      setViewportLock(true);
                      // Do not force rotation off - allow user to SPIN while viewing network
                      setMapFocusStock(selectedStock);
                    }
                  }}
                  activeTab={activeTab}
                  marketData={allMarketData}
                  allNewsData={marketData.news}
                  sentiment={sentiment}
                  onInjectLiveNews={injectLiveNews}
                  mapLayers={mapLayers}
                  activeCorridorId={activeCorridorId}
                  onSelectCorridor={(id) => {
                    setActiveCorridorId(id);
                    if (id) {
                      addLog(`CORRIDOR_ALERT: tracking visual threat link vector for ${id}`);
                      setActiveTab("CORRIDOR");
                    }
                  }}
                  agentFocus={agentFocus}
                  agentEntities={agentEntities}
                  briefing={briefing}
                  setAgentFocus={setAgentFocus}
                  isAgentSearching={isAgentSearching}
                  viewportLock={viewportLock}
                  setViewportLock={setViewportLock}
                  autoRotateEnabled={autoRotateEnabled}
                  setAutoRotateEnabled={setAutoRotateEnabled}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  onAgentSearch={handleAgentSearch}
                  riskScore={systemRiskScore}
                  relationships={marketData.relationships}
                />
              </Suspense>
            </div>
          </div>

          {/* Left Sidebar (Data, Price, Chart, Technicals, Search Hub) */}
          <aside 
            id="mobile-sec-data"
            className={cn(
              "border-b md:border-b-0 md:border-r border-zinc-800 transition-all duration-150 shrink-0 order-2 md:order-1",
              isDataSidebarMinimized ? "h-12 md:w-8" : "w-full h-auto md:h-full md:w-[220px] lg:w-[260px] xl:w-[320px]",
              "flex"
            )}
          >
            <DataSidebar 
              selectedStock={selectedStock}
              quote={marketData.quote}
              sentiment={sentiment}
              history={marketData.history}
              financials={marketData.financials}
              profile={marketData.profile}
              isMinimized={isDataSidebarMinimized}
              onToggleMinimize={() => setIsDataSidebarMinimized(!isDataSidebarMinimized)}
              pinnedTickers={pinnedTickers}
              onTogglePin={togglePin}
            />
          </aside>

          {/* Right Sidebar (AI Strategic responses & news Market Intel 2 columns) */}
          <aside 
            id="mobile-sec-intel"
            className={cn(
              "border-t md:border-t-0 md:border-l border-zinc-800 transition-all duration-150 shrink-0 order-3",
              isIntelSidebarMinimized ? "h-12 md:w-8" : "w-full h-auto md:h-full md:w-[240px] lg:w-[330px] xl:w-[380px]",
              "flex"
            )}
          >
            <IntelligenceSidebar 
              selectedStock={selectedStock}
              quote={marketData.quote}
              news={marketData.news}
              financials={marketData.financials}
              profile={marketData.profile}
              history={marketData.history}
              isAiProcessing={isAiProcessing}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              onSelectNode={handleSelectNode}
              relationships={marketData.relationships}
              briefing={briefing}
              sentiment={sentiment}
              yields={marketData.yields}
              logs={logs}
              quotaExhausted={quotaExhausted}
              onEnrichNews={() => enrichNews(marketData.news)}
              onGenerateBriefing={() => {
                if (selectedStock?.symbol) {
                  generateBriefing(selectedStock.symbol, { 
                    news: marketData.news?.slice(0, 3), 
                    quote: marketData.quote, 
                    yields: marketData.yields 
                  });
                }
              }}
              isMinimized={isIntelSidebarMinimized}
              onToggleMinimize={() => setIsIntelSidebarMinimized(!isIntelSidebarMinimized)}
              activeCorridorId={activeCorridorId}
              onSelectCorridor={(id) => {
                setActiveCorridorId(id);
                if (id) {
                  addLog(`CORRIDOR_COMPILING: scanning physical choke vulnerabilities: ${id}`);
                } else {
                  setActiveCorridorId(null);
                }
              }}
              recentNewsContent={marketData.news.slice(0, 5).map(n => n.title).join("\n")}
              agentFocus={agentFocus}
              setAgentFocus={setAgentFocus}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              // System Risks Integration
              systemRiskScore={systemRiskScore}
              threatLevelText={threatLevelText}
              shocks={{ taiwanStraitBlocked, suezCanalBlocked, malaccaStraitBlocked, panamaCanalBlocked }}
              setShocks={{ setTaiwanStraitBlocked, setSuezCanalBlocked, setMalaccaStraitBlocked, setPanamaCanalBlocked }}
              mitigations={{ airFreightActive, strategicStockpileActive, dualSourcingActive }}
              setMitigations={{ setAirFreightActive, setStrategicStockpileActive, setDualSourcingActive }}
              isAutopilot={isAutopilot}
              setIsAutopilot={setIsAutopilot}
              viewportLock={viewportLock}
              setViewportLock={setViewportLock}
              autoRotateEnabled={autoRotateEnabled}
              setAutoRotateEnabled={setAutoRotateEnabled}
              isVocalizerEnabled={isVocalizerEnabled}
              setIsVocalizerEnabled={setIsVocalizerEnabled}
            />
          </aside>
        </main>

        <div className="md:hidden h-20 bg-black/95 border-t border-emerald-900/40 flex items-center justify-around px-2 z-[200] relative backdrop-blur-xl">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-emerald-500/20" />
          <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(rgba(16,185,129,0.02)_1px,transparent_1px)] bg-[size:100%_3px] pointer-events-none" />
          {(["MAP", "DATA", "INTEL"] as const).map((view) => {
            const isActive = mobileView === view;
            return (
              <button
                key={view}
                onClick={() => {
                  setMobileView(view);
                  const el = document.getElementById(`mobile-sec-${view.toLowerCase()}`);
                  if (el) {
                    el.scrollIntoView({ behavior: "smooth", block: "start" });
                  }
                }}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-1.5 py-2 transition-all duration-300 relative h-full",
                  isActive ? "text-emerald-400" : "text-zinc-700 hover:text-zinc-500"
                )}
              >
                <div className={cn(
                  "w-12 h-10 flex items-center justify-center rounded-none transition-all relative overflow-hidden",
                  isActive ? "bg-emerald-500/5 border border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.1)] scale-110" : "border border-transparent"
                )}>
                  {/* Subtle corner ticks for active button */}
                  {isActive && (
                    <>
                      <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-emerald-500" />
                      <div className="absolute top-0 right-0 w-1.5 h-1.5 border-t border-r border-emerald-500" />
                      <div className="absolute bottom-0 left-0 w-1.5 h-1.5 border-b border-l border-emerald-500" />
                      <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-emerald-500" />
                    </>
                  )}
                  
                  {view === "MAP" && <Globe className="w-5 h-5" />}
                  {view === "DATA" && <TrendingUp className="w-5 h-5" />}
                  {view === "INTEL" && <Newspaper className="w-5 h-5" />}
                </div>
                <span className={cn(
                  "text-[7px] font-black tracking-[0.2em] uppercase transition-all",
                  isActive ? "opacity-100 translate-y-0 text-emerald-300" : "opacity-40 translate-y-0.5"
                )}>{view}</span>
              </button>
            );
          })}
        </div>

        <CommandPalette 
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
          onSelect={(c) => handleSelectNode(c, false, true)}
        />

        <SettingsModal 
          isOpen={isSettingsOpen} 
          onClose={() => setIsSettingsOpen(false)} 
          mapLayers={mapLayers}
          toggleMapLayer={toggleMapLayer}
          viewportLock={networkAnchor ? true : viewportLock}
          setViewportLock={(val) => {
            if (networkAnchor) {
              setViewportLock(true);
            } else {
              setViewportLock(val);
            }
          }}
          autoRotateEnabled={networkAnchor ? false : autoRotateEnabled}
          setAutoRotateEnabled={(val) => {
            if (networkAnchor) {
              setAutoRotateEnabled(false);
            } else {
              setAutoRotateEnabled(val);
            }
          }}
          logs={logs}
        />

        <AccessWall />

        <footer className="h-6 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between px-3 text-[8.5px] font-sans text-zinc-600 z-30 uppercase tracking-[0.05em] relative">
          {/* Subtle grid on footer */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(16,185,129,0.02)_1px,transparent_1px)] bg-[size:20px_100%] pointer-events-none" />
          
          <div className="flex items-center space-x-4 relative">
            <div className="flex items-center gap-2">
               <div className={`w-1.5 h-1.5 rounded-full ${systemStatus === "System Active" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" : "bg-red-500"}`} />
               <span className={systemStatus === "System Active" ? "text-zinc-400 font-bold" : "text-red-500 font-black"}>{systemStatus}</span>
            </div>
            <div className="hidden lg:flex items-center gap-6 border-l border-zinc-900 pl-4 h-3 bg-zinc-950/20 px-4 rounded-full border border-emerald-500/10 active:scale-95 transition-transform cursor-pointer group">
              <div className="flex items-center gap-2">
                 <span className="text-[6px] text-zinc-650 font-black uppercase tracking-[0.2em] group-hover:text-emerald-500 transition-colors">Global_Network:</span>
                 <div className="flex gap-[1px]">
                    {[1,1,1,1,1,1,0,0,0,0].map((v, i) => (
                      <div key={i} className={cn("w-0.5 h-1.5 transition-all duration-500", v ? "bg-emerald-500/60 shadow-[0_0_4px_rgba(16,185,129,0.4)]" : "bg-zinc-800")} style={{ height: `${2 + Math.random() * 6}px` }} />
                    ))}
                 </div>
              </div>
              <div className="flex items-center gap-2 border-l border-zinc-900 pl-6 group-hover:border-emerald-500/30">
                 <span className="text-[6px] text-zinc-650 font-black uppercase tracking-[0.2em]">Flux_Stability:</span>
                 <span className="text-emerald-400 font-mono font-black">94.2%</span>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 border-l border-zinc-900 pl-4">
              <span className="text-zinc-700">Data Quality:</span>
              <span className="text-emerald-500 font-bold">98.4%</span>
            </div>
            <div className="hidden lg:flex items-center gap-1.5 border-l border-zinc-900 pl-4 text-[7px] text-zinc-500 tracking-widest uppercase font-mono">
              [ AI_ROUTER_LATENCY: 44ms // SILO_CACHE: HIT ]
            </div>
            

          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 bg-emerald-500/5 px-2 py-0.5 border border-emerald-500/10">
              <span className="text-emerald-500/60">Asset:</span>
              <span className="text-emerald-400 font-black">{selectedStock?.symbol || "Global"}</span>
            </div>
          </div>
        </footer>

        <AnimatePresence>
          {isLoading && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.15 }}
              className="fixed top-14 right-4 z-[3000] pointer-events-none"
            >
              <div className="border border-emerald-500/30 p-2 bg-black/80 backdrop-blur-md flex items-center gap-3 shadow-[0_0_20px_rgba(16,185,129,0.2)] rounded-xs">
                  <div className="w-3 h-3 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full" />
                  <div className="font-mono text-emerald-500 text-[8px] font-black tracking-[0.3em] uppercase">Syncing...</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
  );
}
