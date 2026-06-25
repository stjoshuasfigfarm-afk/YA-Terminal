import { TerminalProvider, useTerminal } from "./context/TerminalContext";
import { useCompanies } from "./context/CompaniesContext";
import React, {
  lazy,
  Suspense,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  Globe,
  Search,
  Newspaper,
  TrendingUp,
  Layers,
  Filter,
  MapPin,
  Network,
  RefreshCcw,
  Compass,
  Mic,
  Zap,
  Target,
  Activity,
  Bot,
  Sparkles,
  MessageSquare,
} from "lucide-react";
import { analyzeSentimentAndImpact } from "./lib/sentiment";
import { cn } from "./lib/utils";
import { AccessWall } from "./components/AccessWall";
import { Header } from "./components/Header";
import { isWebGLSupported } from "./utils/webgl";
import { SettingsModal } from "./components/SettingsModal";
import { DataSidebar } from "./components/DataSidebar";
import { IntelligenceSidebar } from './components/IntelligenceSidebar';
import { LiveFlowMarquee } from './components/LiveFlowMarquee';
import { CommandPalette } from "./components/CommandPalette";
import { Company, COMPANIES } from "./data/companies";
import { motion, AnimatePresence } from "motion/react";

import { useSiloPrice } from "./firebase/useSiloPrice";
import { rehydrateSilo } from "./app/actions";
import { searchAndScoreCompanies } from "./lib/searchEngine";
import { getApiBaseUrl } from "./lib/utils";
import { generateCompanySpecificNews } from "./utils/mockNews";

import { MapLayer } from "./components/MapLayer";
import { YieldCurveMonitor } from "./components/YieldCurveMonitor";

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

import { TickerTape } from "./components/TickerTape";

const pulseFeed = [
  { tag: "IMTC", msg: "Immersive Logistics Telemetry Controller initiated", time: "Just now", color: "text-purple-400" },
  { tag: "SIGNAL", msg: "Whale alert: $42M USDT move detected in SOL ecosystem", time: "1m ago", color: "text-amber-500" },
  { tag: "MACRO", msg: "ECB indicates flexible rate path despite inflation sticky", time: "4m ago", color: "text-zinc-500" },
  { tag: "TRADE", msg: "High convergence detected on Semi-cap yield spreads", time: "8m ago", color: "text-emerald-500" },
  { tag: "ALERT", msg: "Unusual options activity detected in TSLA put chain", time: "12m ago", color: "text-rose-500" },
  { tag: "FLOW", msg: "Darkpool buy imbalance detected in energy sector ETFs", time: "15m ago", color: "text-blue-500" },
  { tag: "SIGNAL", msg: "Massive liquidation event triggered in BTC perps: -$12M", time: "20m ago", color: "text-rose-500" },
  { tag: "MACRO", msg: "BOJ Governor hints at yield curve control flexibility", time: "25m ago", color: "text-zinc-500" },
  { tag: "TRADE", msg: "Arbitrage opportunity: Cross-exchange spread on ETH/USDT > 0.4%", time: "30m ago", color: "text-emerald-500" },
  { tag: "ALERT", msg: "Systemic risk spike detected in EU sovereign debt spreads", time: "35m ago", color: "text-amber-500" },
  { tag: "INTEL", msg: "Geographic cluster of freight delays emerging in Southeast Asia", time: "40m ago", color: "text-blue-500" },
  { tag: "FLOW", msg: "Unusual institutional accumulation in mid-cap biotechs", time: "45m ago", color: "text-emerald-400" },
];

export default function App() {
  const { companies, allCompanies } = useCompanies();
  const {
    selectedStock,
    setSelectedStock,
    marketData,
    setMarketData,
    isLoading,
    setIsLoading,
  } = useTerminal();

  const [mapFocusStock, setMapFocusStock] = useState<Company | null>(null);
  const [isAutopilot, setIsAutopilot] = useState(false);
  const [isAutopilotTransitioning, setIsAutopilotTransitioning] = useState(false);
  const [autopilotNewsIndex, setAutopilotNewsIndex] = useState(0);
  const [isLiveNewsEnabled, setIsLiveNewsEnabled] = useState(false);
  const [isLiveNewsZoomEnabled, setIsLiveNewsZoomEnabled] = useState(false);
  const [isManualScanActive, setIsManualScanActive] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [activeNewsPopup, setActiveNewsPopup] = useState<{ lat: number; lng: number; title: string; symbol: string } | null>(null);
  const [isFocusMode, setIsFocusMode] = useState(true);
  
  const stateRefs = useRef({ isFocusMode, isLiveNewsZoomEnabled });
  useEffect(() => {
    stateRefs.current = { isFocusMode, isLiveNewsZoomEnabled };
  }, [isFocusMode, isLiveNewsZoomEnabled]);

  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [terminalScale, setTerminalScale] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("terminal_scale");
      return saved ? parseFloat(saved) : 1.0;
    } catch {
      return 1.0;
    }
  });

  const handleSetTerminalScale = (scale: number) => {
    setTerminalScale(scale);
    try {
      localStorage.setItem("terminal_scale", String(scale));
    } catch (err) {
      console.warn("Storage write failed", err);
    }
  };

  const [mapLayers, setMapLayers] = useState({
    hq: true,
    arcs: true,
    satellite: false,
    borders: true,
  });
  // heatmapMetric state removed
  const [networkAnchor, setNetworkAnchor] = useState<Company | null>(() => {
    return COMPANIES.find((c) => c.symbol === "SPY") || COMPANIES[0] || null;
  });
  const [isSearchSidebarMinimized, setIsSearchSidebarMinimized] =
    useState(false);
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
      ? pinnedTickers.filter((s) => s !== symbol)
      : [...pinnedTickers, symbol];
    setPinnedTickers(nextList);
    try {
      localStorage.setItem("terminal_pinned_symbols", JSON.stringify(nextList));
    } catch (err) {
      console.warn("Storage write failed", err);
    }
  };

  // Initialize sidebars - open by default
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      // Removed auto-minimize logic for mobile to respect user request for default expansion
      if (width >= 1024) {
        setIsDataSidebarMinimized(false);
        setIsIntelSidebarMinimized(false);
      }
    };

    // Run once on mount
    handleResize();

    if (typeof window !== "undefined") {
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);
  const [activeCorridorId, setActiveCorridorId] = useState<string | null>(null);
  const [agentFocus, setAgentFocus] = useState<any | null>(null);
  const [agentEntities, setAgentEntities] = useState<any[]>([]);
  const [isAgentSearching, setIsAgentSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchCursor, setSearchCursor] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSearchCursor(-1);
  }, [searchQuery]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Don't hijack if an input/textarea is already focused
      const active = document.activeElement;
      const isInput =
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        (active as HTMLElement)?.isContentEditable;

      if (isInput) return;

      // Handle Escape to clear and blur
      if (e.key === "Escape") {
        setSearchQuery("");
        searchInputRef.current?.blur();
        return;
      }

      // Ignore if meta keys are pressed or functional keys
      if (e.metaKey || e.ctrlKey || e.altKey || e.key.length !== 1) return;

      // Alphanumeric keys trigger focus
      if (/[a-zA-Z0-9]/.test(e.key)) {
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);
  const [viewportLock, setViewportLock] = useState(true);
  const [resetOrientationTrigger, setResetOrientationTrigger] = useState(0);
  const [autoRotateEnabled, setAutoRotateEnabled] = useState(false);
  const [activeStoryIdx, setActiveStoryIdx] = useState(0);
  const [whaleNews, setWhaleNews] = useState<any[]>([]);
  const [accumulatedNews, setAccumulatedNews] = useState<any[]>([]);

  // Accumulate and deduplicate news
  useEffect(() => {
    if (!marketData?.news || marketData.news.length === 0) return;
    setAccumulatedNews((prev) => {
      const forbidden = ["wwe", "television", "tv show", "wrestling"];
      const filtered = marketData?.news?.filter(item => {
          const title = (item.title || "").toLowerCase();
          const desc = (item.description || "").toLowerCase();
          return !forbidden.some(word => title.includes(word) || desc.includes(word));
      });
      const combined = [...filtered, ...prev];
      const uniqueNews = Array.from(new Map(combined.map(item => [item.title, item])).values());
      return uniqueNews.slice(0, 500);
    });
  }, [marketData.news]);

  // Fetch WTI news on mount
  useEffect(() => {
    fetchData("WTI");
  }, []);

  useEffect(() => {
    const fetchWhale = async () => {
      try {
        const response = await fetch('/api/partners/whale-alert');
        const data = await response.json();
        if (data && data.transactions) {
          setWhaleNews(data.transactions.map((t: any) => ({
            id: Math.random().toString(),
            title: `Whale Alert: ${t.amount.toLocaleString()} ${t.symbol} moved`,
            published_at: new Date().toISOString()
          })));
        }
      } catch (err) {
        console.warn("Whale alert fetch failed", err);
      }
    };
    fetchWhale();
    const interval = setInterval(fetchWhale, 60000);
    return () => clearInterval(interval);
  }, []);

  // System-wide Global Risk Matrix (World Shocks)
  const [taiwanStraitBlocked, setTaiwanStraitBlocked] = useState(false);
  const [suezCanalBlocked, setSuezCanalBlocked] = useState(false);
  const [malaccaStraitBlocked, setMalaccaStraitBlocked] = useState(false);
  const [panamaCanalBlocked, setPanamaCanalBlocked] = useState(false);
  const [hormuzStraitBlocked, setHormuzStraitBlocked] = useState(false);

  const [airFreightActive, setAirFreightActive] = useState(false);
  const [strategicStockpileActive, setStrategicStockpileActive] =
    useState(false);
  const [dualSourcingActive, setDualSourcingActive] = useState(false);

  const systemRiskScore = useMemo(() => {
    let score = 25;
    const sector = selectedStock?.sector?.toLowerCase() || "";
    if (taiwanStraitBlocked)
      score += sector.includes("semi") || sector.includes("tech") ? 45 : 15;
    if (suezCanalBlocked)
      score += sector.includes("energy") || sector.includes("oil") ? 50 : 20;
    if (hormuzStraitBlocked)
      score += sector.includes("energy") || sector.includes("oil") ? 65 : 25;
    if (malaccaStraitBlocked) score += 30;
    if (panamaCanalBlocked) score += sector.includes("retail") ? 25 : 10;
    if (airFreightActive) score -= 12;
    if (strategicStockpileActive) score -= 15;
    if (dualSourcingActive) score -= 18;
    return Math.max(5, Math.min(100, score));
  }, [
    selectedStock,
    taiwanStraitBlocked,
    suezCanalBlocked,
    malaccaStraitBlocked,
    panamaCanalBlocked,
    hormuzStraitBlocked,
    airFreightActive,
    strategicStockpileActive,
    dualSourcingActive,
  ]);

  const threatLevelText = useMemo(() => {
    if (systemRiskScore >= 80) return "DEFCON 1: CRITICAL SHOCK";
    if (systemRiskScore >= 60) return "DEFCON 2: SEVERE THREAT";
    if (systemRiskScore >= 40) return "DEFCON 3: ELEVATED RISK";
    if (systemRiskScore >= 20) return "DEFCON 4: GUARDED STATUS";
    return "DEFCON 5: OPTIMAL SECURITY";
  }, [systemRiskScore]);

  const [mobileView, setMobileView] = useState<"INTEL" | "DATA">("INTEL");
  const [mobileMapCollapsed, setMobileMapCollapsed] = useState(false);

  const toggleMapLayer = (layer: string) =>
    setMapLayers((prev) => ({
      ...prev,
      [layer]: !prev[layer as keyof typeof prev],
    }));

  // Synchronization Layer
  const { priceData: siloPrice } = useSiloPrice(selectedStock?.symbol || "");

  useEffect(() => {
    if (siloPrice) {
      // Strict sanitation guard for WTI: block price updates < $10
      if (selectedStock?.symbol === 'WTI' && siloPrice.price !== null && siloPrice.price < 10) {
        console.warn("[WTI SANITATION] Blocked low-price update:", siloPrice.price);
        return;
      }
      setMarketData({ quote: siloPrice });
    }
  }, [siloPrice, setMarketData, selectedStock?.symbol]);

  const [allMarketData, setAllMarketData] = useState<Record<string, any>>({});
  const [quotaExhausted, setQuotaExhausted] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("INTEL");
  const [searchCategory, setSearchCategory] = useState<
    "STOCKS" | "ETFS" | "AGENT"
  >("AGENT");

  const agentSuggestions = useMemo(() => [
    "Analyze Middle East energy corridors and data centers",
    "Trace multi-node supply connections for Apple Inc.",
    "What straits are at risk of being blocked currently?",
    "Identify high-risk logistics hubs in Southeast Asia",
    "U.S. Home energy cost predictions and Fed policy",
    "Strategic impact of political news in Israel",
    "Show critical shipping lane blockades in the Red Sea",
    "Locate major semiconductor factory clusters worldwide"
  ], []);
  const [filterSector, setFilterSector] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"SYMBOL" | "SECTOR">("SYMBOL");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [focusNews, setFocusNews] = useState<any[]>([]);
  const [briefing, setBriefing] = useState<any | null>(null);
  const [sentiment, setSentiment] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([
    "System initialized",
    "Data connection established",
  ]);
  const [systemStatus, setSystemStatus] = useState<string>("System Active");

  const sectors = useMemo(() => {
    if (!companies || !Array.isArray(companies)) return [];

    // Ensure we only process non-null/undefined objects
    const s = new Set(
      companies.filter((c) => c && c.sector).map((c) => c.sector),
    );
    s.delete("ETF");
    return Array.from(s).sort();
  }, [companies]);

  const searchedResults = useMemo(() => {
    return searchAndScoreCompanies(allCompanies || companies, searchQuery);
  }, [allCompanies, companies, searchQuery]);

  // --- Cognitive Synthesis Agent Logic (Transplanted from Sidebar) ---
  const cognitiveSynthesis = useMemo(() => {
    if (marketData?.news?.length === 0) return null;
    
    const sentimentCounts = { BULLISH: 0, BEARISH: 0, NEUTRAL: 0 };
    let criticalImpactCount = 0;
    
    marketData?.news?.slice(0, 10).forEach(item => {
      const { sentiment: s, impact: i } = analyzeSentimentAndImpact(item);
      sentimentCounts[s]++;
      if (i === "CRITICAL") criticalImpactCount++;
    });

    const total = marketData?.news?.length || 0;
    const primarySentiment = Object.entries(sentimentCounts).sort((a, b) => b[1] - (a[1] as any))[0][0];
    
    let synthesis = "";
    if (primarySentiment === "BULLISH") {
      synthesis = `Consensus: BULLISH bias [${total} signals]. Strengthening accumulation.`;
    } else if (primarySentiment === "BEARISH") {
      synthesis = `Consensus: BEARISH pressure. Partner liquidation risk elevated.`;
    } else {
      synthesis = `Consensus: EQUILIBRIUM. Volatility within baseline.`;
    }

    return {
      text: synthesis,
      primarySentiment,
      riskLevel: criticalImpactCount > 1 ? "HIGH" : criticalImpactCount > 0 ? "ELEVATED" : "OPTIMAL"
    };
  }, [marketData.news]);

  const finalFilteredMatches = useMemo(() => {
    let matches = searchedResults.filter((match) => {
      const c = match.company;
      if (searchQuery.trim().toUpperCase() === "SPCX" || (c.symbol && c.symbol.toUpperCase() === searchQuery.trim().toUpperCase())) {
        return true;
      }
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

  const [isSpeechPlaying, setIsSpeechPlaying] = useState(false);

  useEffect(() => {
    const handleSpeechStart = () => setIsSpeechPlaying(true);
    const handleSpeechEnd = () => setIsSpeechPlaying(false);

    window.addEventListener("app-speech-start", handleSpeechStart);
    window.addEventListener("app-speech-end", handleSpeechEnd);

    return () => {
      window.removeEventListener("app-speech-start", handleSpeechStart);
      window.removeEventListener("app-speech-end", handleSpeechEnd);
    };
  }, []);

  const [isVocalizerEnabled, setIsVocalizerEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem("terminal_vocalizer_enabled");
    return saved === "true";
  });

  // Since live fetch being disabled means live vocalization should also be disabled
  useEffect(() => {
    if (!isLiveNewsZoomEnabled) {
      setIsVocalizerEnabled(false);
      localStorage.setItem("terminal_vocalizer_enabled", "false");
    }
  }, [isLiveNewsZoomEnabled]);

  const toggleVocalizer = useCallback((val: boolean) => {
    setIsVocalizerEnabled(val);
    localStorage.setItem("terminal_vocalizer_enabled", String(val));
    if (!val && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const addLog = useCallback((msg: string) => {
    setLogs((prev) => [msg, ...prev.slice(0, 19)]);
  }, []);

  // Robust Telemetry Fetch Interceptor
  const telemetryFetch = useCallback(
    async (
      input: RequestInfo,
      init?: RequestInit,
      retries = 3,
      delay = 1000,
    ): Promise<Response> => {
      let finalUrl = input;
      const baseUrl = getApiBaseUrl();
      if (typeof finalUrl === "string" && finalUrl.startsWith("/") && baseUrl) {
        finalUrl = baseUrl + finalUrl;
      }

      const openRouterKey = localStorage.getItem("openrouter_api_key") || "";
      const openRouterModel =
        localStorage.getItem("openrouter_model") || "google/gemini-2.5-flash";

      const mergedInit = { ...init };
      const headers = { ...(mergedInit.headers || {}) } as Record<
        string,
        string
      >;

      if (openRouterKey) {
        headers["X-OpenRouter-API-Key"] = openRouterKey;
        headers["X-OpenRouter-Model"] = openRouterModel;
      }
      mergedInit.headers = headers;

      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          const response = await fetch(finalUrl, mergedInit);

          if (!response.ok) {
            if (response.status === 404) {
              console.error(
                `[TELEMETRY_FETCH_404] Failed to fetch: ${finalUrl} (attempt ${attempt}/${retries})`,
              );
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
              await new Promise((resolve) =>
                setTimeout(resolve, delay * attempt),
              );
              continue;
            }
          } else {
            setSystemStatus("System Active");
          }
          return response;
        } catch (err: any) {
          if (attempt < retries) {
            await new Promise((resolve) => setTimeout(resolve, delay));
            delay *= 1.5;
            continue;
          }
          setSystemStatus("Connection Error");
          throw err;
        }
      }
      throw new TypeError("Failed to fetch after retries");
    },
    [],
  );

  const enrichNews = useCallback(
    async (rawNews: any[]) => {
      if (!rawNews || rawNews.length === 0 || quotaExhausted) return;

      setIsAiProcessing(true);
      try {
        const response = await telemetryFetch("/api/ai/enrich-news", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            data: rawNews.slice(0, 5), // Limit to top 5 news for performance
          }),
        });

        if (!response.ok) {
          if (response.status === 429) setQuotaExhausted(true);
          const errData = await response.json().catch(() => ({}));
          throw new Error(
            errData.message || `AI Uplink Failed: ${response.status}`,
          );
        }

        const processed = await response.json();

        const enriched = rawNews.map((item, i) => ({
          ...item,
          intelligence: (processed && processed[i]) || {
            translatedTitle: item.title,
          },
        }));
        setMarketData({ news: enriched });
      } catch (error: any) {
        console.error("AI Enrichment failed:", error);
        // Fallback to original news titles if AI enrichment fails
        const fallbackNews = rawNews.map((item) => ({
          ...item,
          intelligence: item.intelligence || { translatedTitle: item.title },
        }));
        setMarketData({ news: fallbackNews });
      } finally {
        setIsAiProcessing(false);
      }
    },
    [quotaExhausted, telemetryFetch, setMarketData],
  );

  const generateBriefing = useCallback(
    async (symbol: string, context: any) => {
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
            data: context,
          }),
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
            data: context,
          }),
        });

        if (sentimentResponse.status === 429) setQuotaExhausted(true);

        if (sentimentResponse.ok) {
          const data = await sentimentResponse.json();
          setSentiment(data);
          addLog(
            `SENTIMENT_ACQUIRED: ${data.label} (${(data.score * 100).toFixed(0)}%)`,
          );
        }
      } catch (error: any) {
        console.error("AI Analysis failed:", error);
        setBriefing(
          `Analysis Error: ${error.message || "Manual assessment required."}`,
        );
      } finally {
        setIsAiProcessing(false);
      }
    },
    [addLog],
  );

  const fetchData = useCallback(
    async (symbol: string) => {
      if (!symbol) return;
      setIsLoading(true);
      addLog(`INITIALIZING_TELEMETRY: ${symbol}`);

      const headers = { "Content-Type": "application/json" };

      try {
        const company = companies.find((c) => c.symbol === symbol);
        const countryCode = company?.country || "USA";

        const [q, n, p, f, h, r, y] = await Promise.all([
          telemetryFetch(`/api/quote?symbol=${symbol}`, { headers })
            .then((res) => {
              if (res.ok) return res.json();
              return null;
            })
            .catch(() => null),
          telemetryFetch(`/api/news?symbol=${symbol}`, { headers })
            .then((res) => {
              if (res.ok) return res.json();
              return null;
            })
            .catch(() => null),
          telemetryFetch(`/api/profile?symbol=${symbol}`, { headers })
            .then((res) => {
              if (res.ok) return res.json();
              return null;
            })
            .catch(() => null),
          telemetryFetch(`/api/financials?symbol=${symbol}`, { headers })
            .then((res) => {
              if (res.ok) return res.json();
              return null;
            })
            .catch(() => null),
          telemetryFetch(`/api/history?symbol=${symbol}`, { headers })
            .then((res) => {
              if (res.ok) return res.json();
              return null;
            })
            .catch(() => null),
          telemetryFetch(`/api/relationships/${symbol}`, { headers })
            .then((res) => res.json())
            .catch(() => ({ relationships: { suppliers: [], customers: [] } })),
          telemetryFetch(`/api/yields?country=${countryCode}`, { headers })
            .then((res) => res.json())
            .catch(() => null),
        ]);

        const finalNews =
          Array.isArray(n) && n.length > 0
            ? n.map((item: any) => ({ ...item, symbol }))
            : generateCompanySpecificNews(
                symbol,
                company?.name || symbol,
                company?.sector || "Technology",
              );

        setMarketData((prev) => {
          // Merge company news into global news instead of replacing
          const combined = [...finalNews, ...(prev.news || [])];
          // Deduplicate by title to avoid growing indefinitely with same stories
          const unique = Array.from(new Map(combined.map(item => [item.title, item])).values());
          
          return {
            quote: q,
            news: unique.slice(0, 75), // Increase capacity slightly for better history
            profile: p,
            financials: f,
            history: h?.processed || [],
            relationships: r.relationships || { suppliers: [], customers: [] },
            yields: y,
          };
        });
      } catch (err) {
        console.error("Critical telemetry synchronization failure:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [addLog, telemetryFetch, setMarketData, setIsLoading, companies],
  );

  const handleAgentSearch = useCallback(
    async (query: string) => {
      if (!query.trim() || isAgentSearching) return null;

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
        if (data) {
          const rawLat = data.lat !== undefined ? data.lat : data.latitude;
          const rawLng = data.lng !== undefined ? data.lng : (data.longitude !== undefined ? data.longitude : data.lng);

          const parsedLat = typeof rawLat === "number" ? rawLat : Number(rawLat);
          const parsedLng = typeof rawLng === "number" ? rawLng : Number(rawLng);

          const hasCoords = !isNaN(parsedLat) && !isNaN(parsedLng);

          const result = {
            locationName: data.locationName || "Target location",
            lat: hasCoords ? parsedLat : 37.3349,
            lng: hasCoords ? parsedLng : -122.0091,
            zoomLevel: typeof data.zoomLevel === "number" ? data.zoomLevel : 6,
            briefing: data.briefing || data.aiStrategyAnalysis || data.explanation || "Location mapped.",
            facts: data.facts || [],
            ticker: data.ticker,
            queryText: query,
          };

          setAgentFocus(result);
          setAgentEntities(data.entities || []);
          addLog(`Location found: ${result.locationName}`);

          if (data.briefing || data.aiStrategyAnalysis || data.explanation) {
            setBriefing(data.briefing || data.aiStrategyAnalysis || data.explanation);
          }

          setActiveTab("INTEL"); // Switch to Intelligence tab in sidebar

          if (data.ticker) {
            const matched = companies.find((c) => c.symbol === data.ticker);
            if (matched) {
              setSelectedStock(matched);
              setMapFocusStock(matched);
              fetchData(matched.symbol);
            }
          }
          return {
            ...data,
            lat: result.lat,
            lng: result.lng,
            briefing: result.briefing
          };
        }
        return null;
      } catch (err: any) {
        console.error(err);
        addLog(`Search Error: ${err.message}`);
        throw err;
      } finally {
        setIsAgentSearching(false);
      }
    },
    [isAgentSearching, addLog, telemetryFetch, fetchData, companies],
  );

  // Global Key Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    if (typeof window !== "undefined") {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, []);

  // Centralized Quantitative Data Heartbeat
  useEffect(() => {
    const symbolsToPoll = [
      "SPY",
      "QQQ",
      "AAPL",
      "NVDA",
      "ASML",
      "TSLA",
      "MSFT",
      "GOOGL",
      "AMZN",
      "META",
    ];

    const cycle = async () => {
      if (document.hidden) return;

      try {
        // 1. Batch Market Heatmap Polling
        const symbolsToFetch = companies.map((c) => c.symbol);
        const results: Record<string, any> = {};
        const topSymbols = symbolsToFetch.slice(0, 15);

        await Promise.all(
          topSymbols.map(async (sym) => {
            try {
              const res = await telemetryFetch(`/api/quote?symbol=${sym}`);
              if (res.ok) results[sym] = await res.json();
            } catch (e) {}
          }),
        );
        setAllMarketData((prev) => ({ ...prev, ...results }));

        // 2. Global Yields Baseline
        const country = selectedStock?.country || "USA";
        const yRes = await telemetryFetch(`/api/yields?country=${country}`);
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
      const defaultCompany =
        companies.find((c) => c.symbol === "SPY") || companies[0];
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
        const res = await telemetryFetch(
          `/api/news?symbol=${mapFocusStock.symbol}`,
          {
            headers: { "Content-Type": "application/json" },
          },
        );

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
        const matched =
          companies.find((c) => c.symbol === mapFocusStock.symbol) ||
          mapFocusStock;
        setFocusNews([
          {
            title: `Intelligence pipeline optimized for ${matched.name || mapFocusStock.symbol}`,
            description: `Global network nodes for ${matched.symbol} are processing secondary signals and workforce metrics at peak operational capacities. Local caching engaged.`,
            published_at: new Date().toISOString(),
            url: "https://example.com",
            image: "",
            summary:
              "Secondary backup telemetry link established. Processing live nodes.",
          },
        ]);
      }
    };
    fetchFocusNews();
  }, [mapFocusStock]);

  const handleSelectNode = useCallback(
    (
      company: Company,
      skipFetch = false,
      isSearch = false,
      activeStoryContext?: any,
    ) => {
      setSelectedStock(company);
      setMapFocusStock(company);
      
      // Do not force-lock if in autopilot mode
      if (!isAutopilot) {
        setViewportLock(true);
      }

      if (isSearch) {
        setNetworkAnchor(company);
      } else {
        setNetworkAnchor((prev) => (prev ? company : null));
      }

      // Keep isAutopilot enabled so the autopilot stays active even when nodes are selected manually or automatically.

      // Debounced fetch to avoid overlapping requests on rapid switching
      if (selectionTimeoutRef.current)
        clearTimeout(selectionTimeoutRef.current);

      if (!skipFetch) {
        selectionTimeoutRef.current = setTimeout(() => {
          fetchData(company.symbol);
          if (activeStoryContext) {
            generateBriefing(company.symbol, {
              news: [activeStoryContext],
              quote: marketData.quote,
              yields: marketData.yields,
              storyContext: activeStoryContext,
            });
          } else {
            generateBriefing(company.symbol, { context: "manual selection" });
          }
        }, 300);
      }
    },
    [
      isAutopilot,
      fetchData,
      setSelectedStock,
      generateBriefing,
      marketData?.quote,
      marketData?.yields,
    ],
  );

  // Live Simulated Break News Pipeline
  const injectLiveNews = useCallback(() => {
    const randomCompany =
      companies[Math.floor(Math.random() * companies.length)];
    const templatesBySector: Record<string, string[]> = {
      Technology: [
        "deploys high-volume optical switches at primary data node.",
        "announces next-generation quantum key exchange deployment.",
        "integrates multi-regional mesh clusters to optimize latency.",
        "completes backup server architecture uplink at coordinate nodes.",
      ],
      Semiconductors: [
        "completes mass production trial of 2nm high-precision neuromorphic dies.",
        "registers peak extreme ultraviolet lithography yield metrics.",
        "secures long-term silicon base material sourcing agreements.",
        "ships primary enterprise-level AI accelerator nodes to suppliers.",
      ],
      "Financial Services": [
        "verifies secure settlement protocol for high-volume trade pipelines.",
        "clears ultra-high velocity liquidity buffer pool optimization.",
        "launches algorithmic cross-regional bond sync matching node.",
        "secures sovereign infrastructure clearance for digital clearance hub.",
      ],
      Automotive: [
        "completes hardware stress tests on automated guidance microkernels.",
        "deploys solid-state power buffer backups across primary fleets.",
        "secures raw cobalt and lithium supply chain corridor routing.",
      ],
      Energy: [
        "unveils hydrogen-fueled grid buffer array to combat transmission leaks.",
        "starts dynamic grid-tier supply synchronization for corporate nodes.",
        "re-routes deep-sea active undersea conduits following safety review.",
        "reports critical maritime security escalation near Strait of Hormuz.",
        "detects systematic tanker delays at primary energy gate bottleneck.",
      ],
      "Consumer Cyclical": [
        "streamlines next-gen real-time logistical tracking across central nodes.",
        "partners with high-speed automated sorting suppliers to lower latency.",
        "implements carbon-neutral high-security freight corridors in EU.",
      ],
    };

    const sectorTemplates = templatesBySector[randomCompany.sector] || [
      "initiates system-wide optimization of business relationships.",
      "achieves localized peak processing telemetry at main offices.",
      "establishes alternative satellite-backed communication channels.",
    ];

    const template =
      sectorTemplates[Math.floor(Math.random() * sectorTemplates.length)];
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
        translatedTitle: headline,
      },
    };

    setMarketData((prev) => ({
      news: [liveStory, ...(prev.news || [])].slice(0, 50),
    }));
    addLog(
      `SIGNAL_DECODED: ${randomCompany.symbol} news injected into stream.`,
    );

    // Active news alert window pointing to headline coordinates, enabled if news feed or live fetch is on
    if (isLiveNewsEnabled || isLiveNewsZoomEnabled) {
      setActiveNewsPopup({
        lat: Number(randomCompany.lat),
        lng: Number(randomCompany.lng),
        title: headline,
        symbol: randomCompany.symbol
      });
    }

    // Auto-clear popups after 15 seconds to keep map clean
    setTimeout(() => {
      setActiveNewsPopup((prev) => prev?.title === headline ? null : prev);
    }, 15000);

    // Zoom and position camera to live news location dynamically only if enabled AND focus mode is on
    if (isLiveNewsZoomEnabled && stateRefs.current.isFocusMode) {
      setAgentFocus({
        locationName: randomCompany.name,
        lat: randomCompany.lat,
        lng: randomCompany.lng,
        zoomLevel: 5,
      });

      // Reset center focus after 8 seconds to resume ONLY IF not in live news zoom mode
      setTimeout(() => {
        setAgentFocus((prev) => {
          // If we're not in live news zoom, or if the focus we're clearing is specifically the news location, clear it.
          // The request implies NOT returning to the previously selected ticker location.
          // Just set focus to null to stop focusing on this headline, but don't force returning to the previous selection.
          return prev?.locationName === randomCompany.name ? null : prev;
        });
        setViewportLock(false);
      }, 8000);
    }
  }, [addLog, setMarketData, setAgentFocus, setViewportLock, isLiveNewsZoomEnabled, isLiveNewsEnabled, companies]);

  // Web Audio Synthesizer for News Feed intercepts & sweeps
  const playTacticalAudio = useCallback((type: "scan" | "success" | "click") => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      if (type === "click") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        gain.gain.setValueAtTime(0.015, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.05);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
      } else if (type === "scan") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(250, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(950, ctx.currentTime + 1.2);
        gain.gain.setValueAtTime(0.02, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2);
        osc.start();
        osc.stop(ctx.currentTime + 1.2);
      } else if (type === "success") {
        const now = ctx.currentTime;
        const playChimeNode = (freq: number, delay: number, dur: number) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, now + delay);
          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(0.025, now + delay + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + dur);
          osc.start(now + delay);
          osc.stop(now + delay + dur);
        };
        playChimeNode(523.25, 0, 0.25); // C5
        playChimeNode(783.99, 0.08, 0.35); // G5
      }
    } catch (e) {
      console.warn("Audio synthesis block error:", e);
    }
  }, []);

  // Trigger on-demand satellite scan & decrypt event injection
  const triggerManualScan = useCallback(() => {
    if (isManualScanActive) return;
    
    setIsManualScanActive(true);
    setScanProgress(0);
    playTacticalAudio("scan");
    addLog("INTEL_LINK: Initializing passive satellite signal intercept...");
    
    let currentProgress = 0;
    const intervalRef = setInterval(() => {
      currentProgress += 10;
      if (currentProgress < 100) {
        setScanProgress(currentProgress);
        if (currentProgress === 30) {
          addLog("INTEL_LINK: Signal vector located across coordinate cluster...");
        } else if (currentProgress === 60) {
          addLog("INTEL_LINK: Decoding security packets. Quantum bypass active...");
        } else if (currentProgress === 80) {
          addLog("INTEL_LINK: Extracting encrypted operational feeds...");
        }
      } else {
        clearInterval(intervalRef);
        setScanProgress(100);
        
        setTimeout(() => {
          injectLiveNews();
          playTacticalAudio("success");
          addLog("SIGNAL_STREAM: Decrypt success! Live intelligence node mapped.");
          setIsManualScanActive(false);
          setScanProgress(0);
        }, 150);
      }
    }, 120);
  }, [isManualScanActive, injectLiveNews, addLog, playTacticalAudio]);

  // Periodic News Injection Heartbeat
  useEffect(() => {
    // Initial delay so it doesn't fire immediately on mount
    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        if (!document.hidden && !isAiProcessing) {
          injectLiveNews();
        }
      }, 30000); // Increased frequency: Every 30 seconds for a more dynamic "intelligence stream"
      return () => clearInterval(interval);
    }, 10000); // Shorter initial delay (10s)
    return () => clearTimeout(timer);
  }, [injectLiveNews, isAiProcessing]);

  // Automatically update shock states based on incoming intelligence
  const straitStates = useRef({
    hormuzStraitBlocked,
    taiwanStraitBlocked,
    malaccaStraitBlocked,
    suezCanalBlocked,
    panamaCanalBlocked,
  });

  const straitBlockTimers = useRef<Record<string, number>>({});

  useEffect(() => {
    straitStates.current = {
      hormuzStraitBlocked,
      taiwanStraitBlocked,
      malaccaStraitBlocked,
      suezCanalBlocked,
      panamaCanalBlocked,
    };
  }, [hormuzStraitBlocked, taiwanStraitBlocked, malaccaStraitBlocked, suezCanalBlocked, panamaCanalBlocked]);

  useEffect(() => {
    if (!marketData) return;
    const newsFeed = marketData.news || [];
    if (newsFeed.length === 0) return;

    const checkSignal = (keywords: string[]) => newsFeed.some(item => {
      if (!item) return false;
      const text = `${item.title || ""} ${item.description || ""} ${item.summary || ""}`.toLowerCase();
      return keywords.some(k => text.includes(k)) && (text.includes("closed") || text.includes("blocked") || text.includes("incident") || text.includes("attack") || text.includes("tension"));
    });

    const checkNormalization = (keywords: string[]) => newsFeed.some(item => {
      if (!item) return false;
      const text = `${item.title || ""} ${item.description || ""} ${item.summary || ""}`.toLowerCase();
      return keywords.some(k => text.includes(k)) && (text.includes("resolved") || text.includes("clear") || text.includes("open") || text.includes("normal") || text.includes("safe"));
    });

    // Strait of Hormuz
    if (checkSignal(["hormuz"]) && !straitStates.current.hormuzStraitBlocked) {
      setHormuzStraitBlocked(true);
      straitBlockTimers.current["hormuz"] = Date.now();
      addLog("DETECTIONS_SYNC: Signal detected regarding Strait of Hormuz. AUTO_BLOCK enabled.");
    } else if (straitStates.current.hormuzStraitBlocked && (checkNormalization(["hormuz"]) || Date.now() - (straitBlockTimers.current["hormuz"] || 0) > 1800000)) {
        setHormuzStraitBlocked(false);
        delete straitBlockTimers.current["hormuz"];
        addLog("DETECTIONS_SYNC: Normalization signal or timeout detected for Strait of Hormuz. AUTO_UNBLOCK.");
    }
    
    // Taiwan Strait
    if (checkSignal(["taiwan"]) && !straitStates.current.taiwanStraitBlocked) {
      setTaiwanStraitBlocked(true);
      straitBlockTimers.current["taiwan"] = Date.now();
      addLog("DETECTIONS_SYNC: Signal detected regarding Taiwan Strait. AUTO_BLOCK enabled.");
    } else if (straitStates.current.taiwanStraitBlocked && (checkNormalization(["taiwan"]) || Date.now() - (straitBlockTimers.current["taiwan"] || 0) > 1800000)) {
        setTaiwanStraitBlocked(false);
        delete straitBlockTimers.current["taiwan"];
        addLog("DETECTIONS_SYNC: Normalization signal or timeout detected for Taiwan Strait. AUTO_UNBLOCK.");
    }

    // Malacca Strait
    if (checkSignal(["malacca"]) && !straitStates.current.malaccaStraitBlocked) {
      setMalaccaStraitBlocked(true);
      straitBlockTimers.current["malacca"] = Date.now();
      addLog("DETECTIONS_SYNC: Signal detected regarding Malacca Strait. AUTO_BLOCK enabled.");
    } else if (straitStates.current.malaccaStraitBlocked && (checkNormalization(["malacca"]) || Date.now() - (straitBlockTimers.current["malacca"] || 0) > 1800000)) {
        setMalaccaStraitBlocked(false);
        delete straitBlockTimers.current["malacca"];
        addLog("DETECTIONS_SYNC: Normalization signal or timeout detected for Malacca Strait. AUTO_UNBLOCK.");
    }

    // Suez Canal
    if (checkSignal(["suez"]) && !straitStates.current.suezCanalBlocked) {
      setSuezCanalBlocked(true);
      straitBlockTimers.current["suez"] = Date.now();
      addLog("DETECTIONS_SYNC: Signal detected regarding Suez Canal. AUTO_BLOCK enabled.");
    } else if (straitStates.current.suezCanalBlocked && (checkNormalization(["suez"]) || Date.now() - (straitBlockTimers.current["suez"] || 0) > 1800000)) {
        setSuezCanalBlocked(false);
        delete straitBlockTimers.current["suez"];
        addLog("DETECTIONS_SYNC: Normalization signal or timeout detected for Suez Canal. AUTO_UNBLOCK.");
    }

    // Panama Canal
    if (checkSignal(["panama"]) && !straitStates.current.panamaCanalBlocked) {
      setPanamaCanalBlocked(true);
      straitBlockTimers.current["panama"] = Date.now();
      addLog("DETECTIONS_SYNC: Signal detected regarding Panama Canal. AUTO_BLOCK enabled.");
    } else if (straitStates.current.panamaCanalBlocked && (checkNormalization(["panama"]) || Date.now() - (straitBlockTimers.current["panama"] || 0) > 1800000)) {
        setPanamaCanalBlocked(false);
        delete straitBlockTimers.current["panama"];
        addLog("DETECTIONS_SYNC: Normalization signal or timeout detected for Panama Canal. AUTO_UNBLOCK.");
    }
  }, [marketData.news, addLog]);

  // Intelligence Stream Cycle (Neural Stream)
  const latestNewsRef = useRef(marketData.news);
  useEffect(() => {
    latestNewsRef.current = marketData.news;
  }, [marketData.news]);

  useEffect(() => {
    let timer: any;
    if (isAutopilot) {
      const cycle = () => {
        // Step 1: Zoom Out
        setIsAutopilotTransitioning(true);
        setSelectedStock(null);
        
        // Step 2: Next Story & Zoom In (after a delay for zoom out)
        setTimeout(() => {
          const stories = latestNewsRef.current || [];
          if (stories.length > 0) {
            setAutopilotNewsIndex((prevIndex) => (prevIndex + 1) % stories.length);
          } else {
            const randomIndex = Math.floor(Math.random() * companies.length);
            const nextCompany = companies[randomIndex];
            if (nextCompany) {
              handleSelectNode(nextCompany, false, false);
            }
          }
          setIsAutopilotTransitioning(false);
        }, 4000); // 4 seconds for a broad zoom out and pause before next story
      };

      // Run once immediately if not already set (skip dependency on index to avoid rerun triggers)
      cycle();

      timer = setInterval(cycle, 35000); // 35 seconds total per cycle (30s stay + 5s transition)
    }

    return () => clearInterval(timer);
  }, [isAutopilot, companies, handleSelectNode, setSelectedStock]);

  // Handle focusing nodes when autopilot news index changes
  useEffect(() => {
    if (!isAutopilot || isAutopilotTransitioning) return;
    const stories = marketData.news || [];
    if (stories.length > 0 && autopilotNewsIndex >= 0) {
      const story = stories[autopilotNewsIndex % stories.length];
      if (story) {
        const company = companies.find(
          (c) => c.symbol === (story.symbol || story.ticker)
        );
        if (company) {
          handleSelectNode(company, false, false, story);
        }
      }
    }
  }, [autopilotNewsIndex, isAutopilot, marketData.news, companies, handleSelectNode, isAutopilotTransitioning]);

  const handleHeadlineClick = useCallback((news: any) => {
    if (!news) return;
    
    // 1. Identification of target entity
    const targetSymbol = news.symbol || news.ticker;
    const company = companies.find((c) => c.symbol === targetSymbol);
    
    if (company) {
      // 2. Execution of node selection (triggers telemetry + briefing)
      handleSelectNode(company, false, true, news);
      setActiveTab("INTEL");
    } else {
      // 3. Fallback: Generic location briefing
      setBriefing(news.description || news.title);
      setActiveTab("INTEL");
    }
    
    addLog(`MANUAL_OVERRIDE: Node briefing initiated for ${targetSymbol || 'unidentified_node'}`);
    playTacticalAudio("click");
  }, [companies, handleSelectNode, setActiveTab, addLog, playTacticalAudio]);

  useEffect(() => {
    // Dynamically adjust root document scale to scale the entire terminal UI cleanly
  }, [terminalScale]);

  const appSearchBarNode = (
    <div className={cn(
      "relative w-full flex items-center overflow-visible transition-all duration-300",
      searchCategory === "AGENT" ? "ring-1 ring-emerald-500/20 rounded-xs" : ""
    )}>
      <input
        ref={searchInputRef}
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onFocus={() => setIsSearchFocused(true)}
        onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            const listLen = searchCategory === "AGENT" && !searchQuery.trim() ? agentSuggestions.length : finalFilteredMatches.length;
            setSearchCursor((prev) =>
              prev < listLen - 1 ? prev + 1 : 0
            );
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            const listLen = searchCategory === "AGENT" && !searchQuery.trim() ? agentSuggestions.length : finalFilteredMatches.length;
            setSearchCursor((prev) =>
              prev > 0 ? prev - 1 : listLen - 1
            );
          } else if (e.key === "Escape") {
            e.preventDefault();
            setIsSearchFocused(false);
            searchInputRef.current?.blur();
          } else if (e.key === "Enter" && searchQuery) {
            e.preventDefault();
            if (searchCategory === "AGENT" && !searchQuery.includes(":") && finalFilteredMatches.length === 0) {
              handleAgentSearch(searchQuery);
              setSearchQuery("");
              setIsSearchFocused(false);
              searchInputRef.current?.blur();
            } else {
              const activeIdx = searchCursor >= 0 && searchCursor < finalFilteredMatches.length ? searchCursor : 0;
              if (finalFilteredMatches.length > activeIdx) {
                const matched = finalFilteredMatches[activeIdx].company;
                handleSelectNode(matched, false, true);
                setSearchQuery("");
                setIsSearchFocused(false);
                searchInputRef.current?.blur();
              } else if (handleAgentSearch) {
                handleAgentSearch(searchQuery);
                setSearchQuery("");
                setIsSearchFocused(false);
                searchInputRef.current?.blur();
              }
            }
          }
        }}
        placeholder={searchCategory === "AGENT" ? "ASK GLOBE AGENT ANYTHING..." : "ENTER TICKER SYMBOL..."}
        className={cn(
          "w-full bg-zinc-950 text-emerald-400 border border-zinc-900 pl-7 pr-8 py-1.5 text-[9px] font-mono outline-none rounded-xs transition-all placeholder-zinc-800 uppercase tracking-widest focus:bg-black",
          searchCategory === "AGENT" ? "border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.05)]" : "focus:border-emerald-500/40"
        )}
      />
      {searchCategory === "AGENT" ? (
        <Bot className={cn("w-3 h-3 absolute left-2 transition-colors", isAgentSearching ? "text-emerald-400 animate-pulse" : "text-zinc-600")} />
      ) : (
        <Search className="w-2.5 h-2.5 text-zinc-700 absolute left-2" />
      )}

      {isAgentSearching && (
        <RefreshCcw className="w-2.5 h-2.5 text-emerald-500 absolute right-10 animate-spin" />
      )}
      
      <AnimatePresence>
        {isSearchFocused && (
          <motion.div
            initial={{ opacity: 0, y: -2 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -2 }}
            transition={{ duration: 0.1 }}
            className="absolute top-full left-0 right-0 z-[1000] mt-1 max-h-60 overflow-y-auto custom-scrollbar border border-emerald-500/40 bg-black/95 backdrop-blur-md rounded-xs shadow-[0_10px_30px_rgba(0,0,0,0.9)] p-px"
          >
            {searchCategory === "AGENT" && !searchQuery.trim() && (
              <div className="p-1">
                <div className="px-2 py-1.5 text-[6.5px] font-mono text-zinc-600 uppercase tracking-[0.2em] border-b border-zinc-900/50 mb-1 flex items-center gap-2">
                  <Sparkles className="w-2 h-2" />
                  Suggested AI Queries
                </div>
                {agentSuggestions.map((suggestion, idx) => (
                  <div
                    key={suggestion}
                    onClick={() => {
                      setSearchQuery(suggestion);
                      handleAgentSearch(suggestion);
                      setSearchQuery("");
                      setIsSearchFocused(false);
                      searchInputRef.current?.blur();
                    }}
                    className={cn(
                      "group flex items-center gap-2 p-1.5 text-[8.5px] cursor-pointer transition-all hover:bg-emerald-500/10 rounded-xs font-mono",
                      searchCursor === idx ? "bg-emerald-500/15 text-emerald-400" : "text-zinc-500"
                    )}
                  >
                    <MessageSquare className="w-2.5 h-2.5 opacity-40 group-hover:opacity-100 group-hover:text-emerald-500 transition-all" />
                    {suggestion.toUpperCase()}
                  </div>
                ))}
              </div>
            )}

            {finalFilteredMatches.length > 0 ? (
              finalFilteredMatches.map(({ company, matchedFields }, idx) => {
                const isSelected = selectedStock?.symbol === company.symbol;
                const isPinned = pinnedTickers.includes(company.symbol);
                const isHoveredByCursor = searchCursor === idx;
                
                // Get the most relevant match reason
                const matchReason = matchedFields && matchedFields.length > 0 ? matchedFields[0].field : "";

                return (
                  <div
                    key={`${company.symbol}-${idx}`}
                    onClick={() => {
                      handleSelectNode(company, false, true);
                      setSearchQuery(company.symbol);
                      setIsSearchFocused(false);
                      searchInputRef.current?.blur();
                    }}
                    className={cn(
                      "group flex flex-col p-2 gap-1 cursor-pointer transition-all border-b border-white/[0.03] last:border-0",
                      isSelected ? "bg-emerald-500/5 border-l-2 border-emerald-500" : "hover:bg-emerald-500/10",
                      isHoveredByCursor ? "bg-emerald-500/15 text-emerald-400 border-l-2 border-emerald-400" : ""
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-mono font-bold tracking-wider text-zinc-300 group-hover:text-emerald-400 transition-colors uppercase">
                          {company.symbol}
                        </span>
                        <span className="text-zinc-500 truncate text-[9px] font-sans group-hover:text-zinc-300">
                          {company.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[7.5px] font-mono text-zinc-650 group-hover:text-zinc-500 uppercase">
                            {company.sector}
                          </span>
                          <MapPin 
                            className={cn("w-2.5 h-2.5", isPinned ? "text-emerald-500" : "text-zinc-700")} 
                          />
                      </div>
                    </div>
                    
                    {matchReason && matchReason !== "Ticker" && matchReason !== "Name" && (
                      <div className="flex items-center gap-1 text-[6.5px] font-mono text-zinc-650 italic uppercase tracking-widest pl-0.5">
                        <Search className="w-2 h-2 opacity-30" />
                        Matched via {matchReason}
                      </div>
                    )}
                  </div>
                );
              })
            ) : searchQuery.trim() ? (
              <div className="flex flex-col items-center justify-center p-6 text-center gap-2">
                {searchCategory === "AGENT" ? (
                  <Sparkles className="w-5 h-5 text-emerald-500/40" />
                ) : (
                  <Search className="w-5 h-5 text-zinc-800" />
                )}
                <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                  [ {searchCategory === "AGENT" ? "AGENT QUERY READY" : "0 RADAR MATCHES"} ]
                </div>
                <p className="text-[8px] text-zinc-700 max-w-[160px] font-mono uppercase leading-relaxed">
                  {searchCategory === "AGENT" 
                    ? `TAP ENTER TO SUBMIT "${searchQuery}" TO GLOBE AGENT.`
                    : 'System scan found no direct matches. Try ticker (AAPL) or location (c:USA).'}
                </p>
                {searchCategory !== "AGENT" && (
                  <button 
                    onClick={() => {
                      setSearchCategory("AGENT");
                      handleAgentSearch(searchQuery);
                    }}
                    className="mt-2 px-3 py-1 border border-emerald-500/30 text-emerald-500 text-[8px] font-mono hover:bg-emerald-500/10 rounded-xs uppercase tracking-tighter"
                  >
                    SUBMIT TO GLOBE AGENT
                  </button>
                )}
              </div>
            ) : (
              <div className="text-center p-3 text-[8px] font-mono text-zinc-700 uppercase">
                [ 0 SEARCH RESULTS ]
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <div className="w-screen h-screen overflow-hidden bg-black relative">
      <div 
        className="flex flex-col w-screen h-screen overflow-hidden bg-[#050505] text-zinc-300 font-sans border-2 border-zinc-900 selection:bg-emerald-500/30 selection:text-emerald-100 relative shadow-[inset_0_0_150px_rgba(0,0,0,0.9)]"
        style={{
          transform: `scale(${terminalScale})`,
          transformOrigin: 'top left',
          width: `${100 / terminalScale}%`,
          height: `${100 / terminalScale}%`
        }}
      >
        {/* HUD Corner Accents */}
      <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-emerald-500/30 m-2 pointer-events-none z-50 rounded-tl-sm" />
      <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-emerald-500/30 m-2 pointer-events-none z-50 rounded-tr-sm" />
      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-emerald-500/10 m-2 pointer-events-none z-50 rounded-bl-sm" />
      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-emerald-500/10 m-2 pointer-events-none z-50 rounded-br-sm" />

      {/* System Status Ticker (Top Left) */}
      <div className="absolute top-1 left-12 z-[100] pointer-events-none hidden lg:flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <div className="w-1 h-1 bg-emerald-500 animate-pulse" />
          <span className="text-[6px] font-mono text-zinc-500 font-black uppercase tracking-[0.2em]">BOOT::SECURE_INIT</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[6px] font-mono text-zinc-700 font-black uppercase tracking-[0.2em]">LATENCY::24MS</span>
        </div>
      </div>
      {/* CRT Scanline Overlay */}
      <div className="pointer-events-none absolute inset-0 z-50 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.05)_50%)] bg-[length:100%_3px] opacity-40 invisible" />
      <div className="pointer-events-none absolute inset-0 z-50 bg-scan-line opacity-10 invisible" />

      {/* Subtle technical grid background */}
      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-20"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(16, 185, 129, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(16, 185, 129, 0.05) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      {/* Header section relocated to root */}
      <Header
        selectedStock={marketData.quote}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onSelectStock={handleSelectNode}
        riskScore={systemRiskScore}
      />

      {/* Secondary Command Header */}
      <div className="border-b border-zinc-900 bg-black/60 p-2 md:p-4">
        <div className="flex flex-col xl:flex-row items-start justify-between gap-4 w-full">
          <div className="flex flex-col w-full xl:w-full">
            {/* Macro Risk Dashboard */}
            <div className="flex flex-col xl:flex-row items-stretch xl:items-start gap-4 w-full justify-end">
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-zinc-950 border border-zinc-900 rounded text-xs tracking-wider font-mono flex-wrap xl:flex-nowrap shadow-[0_0_10px_rgba(0,0,0,0.5)] h-fit mt-0">
                {/* SEGMENT A (VOLATILITY) */}
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                  <span className="text-zinc-500 uppercase tracking-tight text-[10px]">VIX:</span>
                  <span className="text-amber-500 font-extrabold text-[10px]">21.37</span>
                </div>
                {/* SEGMENT B (YIELDS MATRIX) */}
                <div className="flex items-center gap-2 border-l border-zinc-900 pl-2 whitespace-nowrap">
                  <div className="flex gap-1 items-center">
                    <span className="text-zinc-500 uppercase tracking-tight text-[10px]">US2Y:</span>
                    <span className="text-emerald-400 font-extrabold text-[10px]">
                      {marketData.yields?.treasuries?.['2Y'] ? `${marketData.yields.treasuries['2Y'].toFixed(2)}%` : "4.82%"}
                    </span>
                  </div>
                  <div className="flex gap-1 items-center">
                    <span className="text-zinc-500 uppercase tracking-tight text-[10px]">US10Y:</span>
                    <span className="text-emerald-400 font-extrabold text-[10px]">
                      {marketData.yields?.treasuries?.['10Y'] ? `${marketData.yields.treasuries['10Y'].toFixed(2)}%` : "4.44%"}
                    </span>
                  </div>
                </div>
                {/* SEGMENT C (THE YIELD CURVE SPREAD) */}
                <div className="flex items-center gap-1.5 border-l border-zinc-900 pl-2 whitespace-nowrap">
                  <span className="text-zinc-500 uppercase tracking-tight text-[10px]">SPREAD(10Y-2Y):</span>
                  {(() => {
                    const y2 = marketData.yields?.treasuries?.['2Y'] ?? 4.82;
                    const y10 = marketData.yields?.treasuries?.['10Y'] ?? 4.44;
                    const spread = y10 - y2;
                    const isInverted = y2 > y10;
                    return (
                      <>
                        <span className={cn(
                          "font-extrabold text-[10px]",
                          isInverted ? "text-amber-500" : "text-emerald-400"
                        )}>
                          {spread > 0 ? "+" : ""}{spread.toFixed(2)}%
                        </span>
                        <span className={cn(
                          "text-[8px] font-black px-1.5 py-px border rounded-xs uppercase tracking-widest leading-none",
                          isInverted 
                            ? "bg-amber-950/20 border-amber-500/30 text-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.15)] animate-pulse" 
                            : "bg-emerald-950/20 border-emerald-500/30 text-emerald-450"
                        )}>
                          {isInverted ? "INVERTED" : "NORMAL"}
                        </span>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pinned Tickers */}
        <div className="h-6 bg-zinc-950/50 flex items-center px-4 gap-4 border-t border-zinc-900 border-opacity-50">
          <div className="text-[7px] font-black text-zinc-600 uppercase tracking-widest">
            PINNED:
          </div>
          <div className="flex gap-4">
            {pinnedTickers.map((ticker) => (
              <button
                key={ticker}
                onClick={() => {
                  const company =
                    companies.find((c) => c.symbol === ticker) ||
                    COMPANIES.find((c) => c.symbol === ticker);
                  if (company) handleSelectNode(company);
                }}
                className="text-[9px] font-mono font-bold text-zinc-400 hover:text-emerald-400 uppercase tracking-wide cursor-pointer transition-colors"
              >
                {ticker}
              </button>
            ))}
          </div>
        </div>
      </div>

        {/* PANEL G: DATA_FLOW (ACROSS THE TOP) */}
        <div className="border-t border-zinc-900 bg-black py-2 px-4 flex flex-col md:flex-row items-stretch md:items-center gap-2.5 md:gap-4 select-none shrink-0 relative z-[500] w-full">
          {/* Row 2: Control Strip (Focus, Buttons, Filters, yield compact monitor, sorting) */}
          <div className="flex items-center gap-4 overflow-x-auto md:overflow-visible scrollbar-none w-full min-w-0 py-1 md:py-0">
            {/* Scrollable Interaction Strip */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setAutoRotateEnabled(!autoRotateEnabled)}
                className={cn(
                  "px-1.5 py-0.5 text-[6px] font-mono font-black tracking-widest uppercase transition-all flex items-center gap-1 cursor-pointer rounded-xs h-5 border",
                  autoRotateEnabled ? "bg-emerald-500/10 border-emerald-500 text-emerald-400" : "border-zinc-900 text-zinc-650 hover:border-zinc-800"
                )}
              >
                <RefreshCcw className="w-2.5 h-2.5" />
                <span className="hidden xl:inline">ORBIT_ROTATION</span>
              </button>

              <button
                onClick={() => {
                  if (isLiveNewsZoomEnabled) {
                    toggleVocalizer(!isVocalizerEnabled);
                  } else {
                    if (isSpeechPlaying) {
                      // Stop speaking
                      if (window.speechSynthesis) window.speechSynthesis.cancel();
                      window.dispatchEvent(new CustomEvent("app-tts-play", { detail: { origin: "app-btn" } }));
                    } else {
                      // Trigger reading
                      window.dispatchEvent(new CustomEvent("app-vocalize-news"));
                    }
                  }
                }}
                className={cn(
                  "px-1.5 py-0.5 text-[6px] font-mono font-black tracking-widest uppercase transition-all flex items-center gap-1 cursor-pointer rounded-xs h-5 border",
                  isLiveNewsZoomEnabled 
                    ? (isVocalizerEnabled ? "bg-cyan-500/10 border-cyan-500 text-cyan-400" : "border-zinc-900 text-zinc-650 hover:border-zinc-800")
                    : (isSpeechPlaying ? "bg-cyan-500/10 border-cyan-500 text-cyan-400 animate-pulse" : "border-zinc-900 text-zinc-650 hover:border-zinc-800")
                )}
                title={isLiveNewsZoomEnabled ? "Toggle Live News Vocalization" : (isSpeechPlaying ? "Stop Vocalizer Reading" : "Vocalize Curated News List")}
              >
                <Mic className={cn("w-2.5 h-2.5", !isLiveNewsZoomEnabled && isSpeechPlaying ? "animate-bounce" : "")} />
                <span className="hidden xl:inline">{!isLiveNewsZoomEnabled && isSpeechPlaying ? "SPEAKING..." : "VOCALIZER_AI"}</span>
              </button>

              <button
                onClick={() => {
                  if (networkAnchor) setNetworkAnchor(null);
                  else if (selectedStock) { setNetworkAnchor(selectedStock); setViewportLock(true); setMapFocusStock(selectedStock); }
                }}
                className={cn(
                  "px-1.5 py-0.5 text-[6px] font-mono font-black tracking-widest uppercase h-5 flex items-center transition-all rounded-xs gap-1 cursor-pointer border",
                  networkAnchor ? "bg-emerald-500/10 border-emerald-500 text-emerald-450 hover:bg-emerald-500/20" : "border-zinc-900 text-zinc-650 hover:border-zinc-800 hover:bg-zinc-900"
                )}
              >
                <Network className="w-2.5 h-2.5" />
                <span className="hidden xl:inline">NETWORK</span>
              </button>

              <button
                onClick={() => setIsLiveNewsZoomEnabled(!isLiveNewsZoomEnabled)}
                className={cn(
                  "px-1.5 py-0.5 text-[6px] font-mono font-black tracking-widest uppercase transition-all flex items-center gap-1 cursor-pointer rounded-xs h-5 border",
                  isLiveNewsZoomEnabled ? "bg-emerald-500/10 border-emerald-500 text-emerald-400" : "border-zinc-900 text-zinc-650 hover:border-zinc-800"
                )}
              >
                <MapPin className="w-2.5 h-2.5" />
                <span className="hidden xl:inline">LIVE_FETCH</span>
              </button>

              <button
                onClick={() => setIsFocusMode(!isFocusMode)}
                className={cn(
                  "px-1.5 py-0.5 text-[6px] font-mono font-black tracking-widest uppercase transition-all flex items-center gap-1 cursor-pointer rounded-xs h-5 border",
                  isFocusMode ? "bg-emerald-500/10 border-emerald-500 text-emerald-400" : "border-zinc-900 text-zinc-650 hover:border-zinc-800"
                )}
              >
                <Target className="w-2.5 h-2.5" />
                <span className="hidden xl:inline">FOCUS</span>
              </button>

            </div>

            {/* Cognitive Synthesis Indicator (Moved from Sidebar) */}
            {cognitiveSynthesis && (
              <div className="hidden min-[1400px]:flex items-center gap-2 px-3 border-l border-zinc-900 shrink-0">
                <div className="relative">
                  <Zap className={cn(
                    "w-3 h-3",
                    cognitiveSynthesis.riskLevel === "HIGH" ? "text-red-500" : "text-emerald-500"
                  )} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[7px] font-black text-zinc-400 uppercase tracking-widest font-mono leading-none">
                    COG_SYNTHESIS
                  </span>
                  <span className="text-[6.5px] font-mono text-zinc-650 truncate max-w-[150px]">
                    {cognitiveSynthesis.text}
                  </span>
                </div>
              </div>
            )}



            {/* Category Filters */}
            <div className="flex items-center gap-1 shrink-0 border-l border-zinc-900 pl-3">
              {(["STOCKS", "ETFS", "AGENT"] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSearchCategory(cat)}
                  className={cn(
                    "px-2 py-0.5 text-[7px] font-mono font-black border transition-all rounded-xs uppercase tracking-widest h-5",
                    searchCategory === cat ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500" : "bg-transparent border-zinc-900 text-zinc-650 hover:border-zinc-800"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Sort/Chips */}
            <div className="flex items-center gap-2 shrink-0 border-l border-zinc-900 pl-3">
              <button
                onClick={() => setSortOrder((prev) => prev === "SYMBOL" ? "SECTOR" : "SYMBOL")}
                className="h-5 px-2 border border-zinc-900 rounded-xs hover:bg-zinc-900 text-[7px] font-mono text-zinc-600 uppercase"
              >
                SORT
              </button>
              
              <div className="hidden lg:flex items-center gap-1">
                {["c:USA", "s:Semi", "p:NVDA", "WTI"].map((chip) => (
                  <button
                    key={chip}
                    onClick={() => setSearchQuery(chip)}
                    className="text-[6.5px] font-mono font-black px-1.5 py-0.5 border border-zinc-900 text-zinc-650 hover:text-zinc-400 uppercase h-5"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

      <main className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden relative custom-scrollbar scroll-smooth">
        <div
          id="mobile-sec-map"
          className={cn(
            "w-full flex-col min-w-0 shrink-0 relative order-1 md:order-2 transition-all duration-300 border-b border-zinc-900 md:border-b-0",
            mobileMapCollapsed ? "h-12" : "h-[45vh]",
            "flex md:h-full md:flex-1"
          )}
        >
          {mobileMapCollapsed ? (
            <button
              id="mobile-map-restore"
              onClick={() => setMobileMapCollapsed(false)}
              className="md:hidden flex items-center justify-between px-4 w-full h-full bg-zinc-950 text-emerald-500 font-mono text-[9px] tracking-[0.2em] font-black group"
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-2 h-2 bg-emerald-500/20 rounded-full animate-ping absolute inset-0" />
                  <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                </div>
                <div className="flex flex-col items-start leading-none gap-1">
                  <span className="text-zinc-600 text-[6px] tracking-tight uppercase">Primary Visualization Hub</span>
                  <span className="text-emerald-500/80 group-hover:text-emerald-400 transition-colors">GLOBE_VIEWPORT // MINIMIZED</span>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[8px] tracking-[0.2em] rounded-xs group-hover:bg-emerald-500/20 transition-all">
                RESTORE_VIEW
              </div>
            </button>
          ) : (
            <div
              className={cn(
                "flex-1 flex flex-col items-center justify-center relative w-full h-full min-h-0 overflow-hidden border border-zinc-900 m-1 rounded-xs bg-black transition-all duration-150",
                "md:h-full"
              )}
            >
              {/* Collapse Map Button (Visible only on Mobile) */}
              <button
                onClick={() => setMobileMapCollapsed(true)}
                className="md:hidden absolute top-4 left-4 z-[100] px-3 py-1.5 bg-black/95 border border-emerald-500/30 text-emerald-400 font-mono text-[8px] tracking-[0.2em] rounded-md shadow-[0_0_20px_rgba(0,0,0,0.8)] flex items-center gap-2 cursor-pointer active:scale-95 transition-all hover:border-emerald-400 backdrop-blur-md"
              >
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <span>MINIMIZE_HUB</span>
              </button>

              <Suspense
                fallback={
                  <div className="w-full h-full bg-zinc-950 flex flex-col items-center justify-center">
                    <div className="w-12 h-12 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full" />
                    <div className="mt-4 text-emerald-500/50 font-mono text-[10px] tracking-widest uppercase">
                      INITIALIZING...
                    </div>
                  </div>
                }
              >
                <MapLayer
                  selectedStock={selectedStock}
                  focusStock={mapFocusStock}
                  onSelectNode={handleSelectNode}
                  isVocalizerEnabled={isVocalizerEnabled}
                  onToggleVocalizer={toggleVocalizer}
                  intelligenceFeed={
                    focusNews.length > 0 ? focusNews : marketData.news || []
                  }
                  isIntelligenceStream={isAutopilot}
                  isTransitioning={isAutopilotTransitioning}
                  activeNewsIdx={autopilotNewsIndex}
                  activeNewsPopup={activeNewsPopup}
                  onHeadlineClick={handleHeadlineClick}
                  isLiveNewsZoomEnabled={isLiveNewsZoomEnabled}
                  isFocusMode={isFocusMode}
                  toggleLiveNewsZoom={() => setIsLiveNewsZoomEnabled(!isLiveNewsZoomEnabled)}
                  toggleFocusMode={() => setIsFocusMode(!isFocusMode)}
                  isAutopilot={isAutopilot}
                  toggleIntelligenceStream={() => {
                    const next = !isAutopilot;
                    setIsAutopilot(next);
                    if (next) {
                      setViewportLock(true);
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
                      setMapFocusStock(selectedStock);
                    } else if (companies && companies.length > 0) {
                      setSelectedStock(companies[0]);
                      setNetworkAnchor(companies[0]);
                      setViewportLock(true);
                      setMapFocusStock(companies[0]);
                    }
                  }}
                  activeTab={activeTab}
                  marketData={allMarketData}
                  allNewsData={marketData?.news || []}
                  sentiment={sentiment}
                  onInjectLiveNews={injectLiveNews}
                  mapLayers={mapLayers}
                  activeCorridorId={activeCorridorId}
                  onSelectCorridor={(id) => {
                    setActiveCorridorId(id);
                    if (id) {
                      addLog(
                        `CORRIDOR_ALERT: tracking visual threat link vector for ${id}`,
                      );
                      setActiveTab("CORRIDOR");
                    }
                  }}
                  agentFocus={agentFocus}
                  agentEntities={agentEntities}
                  resetOrientationTrigger={resetOrientationTrigger}
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
                  relationships={marketData?.relationships}
                  isSidebarMinimized={isDataSidebarMinimized}
                />
              </Suspense>
            </div>
          )}
        </div>

        {/* Left Sidebar (Data, Price, Chart, Technicals, Search Hub) */}
        <aside
          id="mobile-sec-data"
          className={cn(
            "border-b md:border-b-0 md:border-r md:border-zinc-800/80 transition-all duration-300 shrink-0 order-2 md:order-none flex overflow-hidden",
            mobileView === "DATA" ? "flex" : "hidden md:flex",
            !isFocusMode && "shadow-[0_0_30px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/10",
            "md:absolute md:top-0 md:left-0 md:z-40 md:bg-black/90 md:backdrop-blur-md",
            isDataSidebarMinimized
              ? "h-12 md:w-8"
              : "w-full h-auto md:h-full md:w-[220px] lg:w-[260px] xl:w-[320px]"
          )}
        >
          <DataSidebar
            selectedStock={selectedStock}
            quote={marketData?.quote}
            sentiment={sentiment}
            history={marketData?.history}
            financials={marketData?.financials}
            profile={marketData?.profile}
            isMinimized={isDataSidebarMinimized}
            onToggleMinimize={() =>
              setIsDataSidebarMinimized(!isDataSidebarMinimized)
            }
            isFocusMode={isFocusMode}
            pinnedTickers={pinnedTickers}
            onTogglePin={togglePin}
            searchBarNode={appSearchBarNode}
          />
        </aside>

        {/* Right Sidebar (AI Strategic responses & news Market Intel 2 columns) */}
        <aside
          id="mobile-sec-intel"
          className={cn(
            "border-t md:border-t-0 md:border-l border-zinc-800 transition-all duration-150 shrink-0 order-3 flex",
            mobileView === "INTEL" ? "flex" : "hidden md:flex",
            !isFocusMode && "shadow-[0_0_30px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/10",
            isIntelSidebarMinimized
              ? "h-12 md:w-8"
              : "w-full h-auto md:h-full md:w-[240px] lg:w-[330px] xl:w-[380px]"
          )}
        >
          <IntelligenceSidebar
            selectedStock={selectedStock}
            quote={marketData?.quote}
            accumulatedNews={accumulatedNews}
            financials={marketData?.financials}
            profile={marketData?.profile}
            history={marketData?.history}
            isAiProcessing={isAiProcessing || isAgentSearching}
            onAgentSearch={handleAgentSearch}
            isAgentSearching={isAgentSearching}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onSelectNode={handleSelectNode}
            relationships={marketData?.relationships}
            briefing={briefing}
            sentiment={sentiment}
            yields={marketData?.yields}
            logs={logs}
            quotaExhausted={quotaExhausted}
            onEnrichNews={() => enrichNews(marketData?.news)}
            onGenerateBriefing={() => {
              if (selectedStock?.symbol) {
                generateBriefing(selectedStock.symbol, {
                  news: marketData?.news?.slice(0, 3),
                  quote: marketData?.quote,
                  yields: marketData?.yields,
                });
              }
            }}
            isMinimized={isIntelSidebarMinimized}
            onToggleMinimize={() =>
              setIsIntelSidebarMinimized(!isIntelSidebarMinimized)
            }
            toggleFocusMode={() => setIsFocusMode(!isFocusMode)}
            isFocusMode={isFocusMode}
            activeCorridorId={activeCorridorId}
            onSelectCorridor={(id) => {
              setActiveCorridorId(id);
              if (id) {
                addLog(
                  `CORRIDOR_COMPILING: scanning physical choke vulnerabilities: ${id}`,
                );
              } else {
                setActiveCorridorId(null);
              }
            }}
            recentNewsContent={(marketData?.news || [])
              .slice(0, 5)
              .map((n) => n.title)
              .join("\n")}
            agentFocus={agentFocus}
            setAgentFocus={setAgentFocus}
            // System Risks Integration
            systemRiskScore={systemRiskScore}
            threatLevelText={threatLevelText}
            shocks={{
              taiwanStraitBlocked,
              suezCanalBlocked,
              malaccaStraitBlocked,
              panamaCanalBlocked,
              hormuzStraitBlocked,
            }}
            setShocks={{
              setTaiwanStraitBlocked,
              setSuezCanalBlocked,
              setMalaccaStraitBlocked,
              setPanamaCanalBlocked,
              setHormuzStraitBlocked,
            }}
            mitigations={{
              airFreightActive,
              strategicStockpileActive,
              dualSourcingActive,
            }}
            setMitigations={{
              setAirFreightActive,
              setStrategicStockpileActive,
              setDualSourcingActive,
            }}
            isAutopilot={isAutopilot}
            setIsAutopilot={setIsAutopilot}
            viewportLock={viewportLock}
            setViewportLock={setViewportLock}
            autoRotateEnabled={autoRotateEnabled}
            setAutoRotateEnabled={setAutoRotateEnabled}
            isVocalizerEnabled={isVocalizerEnabled}
            setIsVocalizerEnabled={setIsVocalizerEnabled}
            isLiveNewsZoomEnabled={isLiveNewsZoomEnabled}
          />
        </aside>
      </main>

      <div className="md:hidden h-20 bg-black/95 border-t border-emerald-900/40 flex items-center justify-around px-2 z-[200] relative backdrop-blur-xl">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-emerald-500/20" />
        <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(rgba(16,185,129,0.02)_1px,transparent_1px)] bg-[size:100%_3px] pointer-events-none" />
        {(["DATA", "INTEL"] as const).map((view) => {
          const isActive = mobileView === view;
          return (
            <button
              key={view}
              onClick={() => {
                if (isActive) return;
                setMobileView(view);
                const el = document.getElementById(
                  `mobile-sec-${(view || "").toLowerCase()}`,
                );
                if (el) {
                  el.scrollIntoView({ behavior: "smooth", block: "start" });
                }
              }}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1.5 py-2 transition-all duration-300 relative h-full",
                isActive
                  ? "text-emerald-400"
                  : "text-zinc-700 hover:text-zinc-500",
              )}
            >
              <div
                className={cn(
                  "w-12 h-10 flex items-center justify-center rounded-none transition-all relative overflow-hidden",
                  isActive
                    ? "bg-emerald-500/5 border border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.1)] scale-110"
                    : "border border-transparent",
                )}
              >
                {/* Subtle corner ticks for active button */}
                {isActive && (
                  <>
                    <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-emerald-500" />
                    <div className="absolute top-0 right-0 w-1.5 h-1.5 border-t border-r border-emerald-500" />
                    <div className="absolute bottom-0 left-0 w-1.5 h-1.5 border-b border-l border-emerald-500" />
                    <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-emerald-500" />
                  </>
                )}

                {view === "DATA" && <TrendingUp className="w-5 h-5" />}
                {view === "INTEL" && <Newspaper className="w-5 h-5" />}
              </div>
              <span
                className={cn(
                  "text-[7px] font-black tracking-[0.2em] uppercase transition-all",
                  isActive
                    ? "opacity-100 translate-y-0 text-emerald-300"
                    : "opacity-40 translate-y-0.5",
                )}
              >
                {view === "DATA" ? "DATA_STREAM" : "INTEL_HUB"}
              </span>
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
        terminalScale={terminalScale}
        setTerminalScale={handleSetTerminalScale}
      />

      <AccessWall />

      <footer className="h-6 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between px-3 text-[8.5px] font-sans text-zinc-600 z-30 uppercase tracking-[0.05em] relative">
        {/* Subtle grid on footer */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(16,185,129,0.02)_1px,transparent_1px)] bg-[size:20px_100%] pointer-events-none" />

        <div className="flex items-center space-x-4 relative">
          <div className="flex items-center gap-2">
            <div
              className={`w-1.5 h-1.5 rounded-full ${systemStatus === "System Active" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" : "bg-red-500"}`}
            />
            <span
              className={
                systemStatus === "System Active"
                  ? "text-zinc-400 font-bold"
                  : "text-red-500 font-black"
              }
            >
              {systemStatus}
            </span>
          </div>
          <div className="hidden lg:flex items-center gap-6 border-l border-zinc-900 pl-4 h-3 bg-zinc-950/20 px-4 rounded-full border border-emerald-500/10 active:scale-95 transition-transform cursor-pointer group">
            <div className="flex items-center gap-2">
              <span className="text-[6px] text-zinc-650 font-black uppercase tracking-[0.2em] group-hover:text-emerald-500 transition-colors">
                Global_Network:
              </span>
              <div className="flex gap-[1px]">
                {[1, 1, 1, 1, 1, 1, 0, 0, 0, 0].map((v, i) => (
                  <div
                    key={i}
                    className={cn(
                      "w-0.5 h-1.5 transition-all duration-500",
                      v
                        ? "bg-emerald-500/60 shadow-[0_0_4px_rgba(16,185,129,0.4)]"
                        : "bg-zinc-800",
                    )}
                    style={{ height: `${2 + Math.random() * 6}px` }}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 border-l border-zinc-900 pl-6 group-hover:border-emerald-500/30">
              <span className="text-[6px] text-zinc-650 font-black uppercase tracking-[0.2em]">
                Flux_Stability:
              </span>
              <span className="text-emerald-400 font-mono font-black">
                94.2%
              </span>
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
            <span className="text-emerald-400 font-black">
              {selectedStock?.symbol || "Global"}
            </span>
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
              <div className="font-mono text-emerald-500 text-[8px] font-black tracking-[0.3em] uppercase">
                Syncing...
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
 
      {/* Live Flow relocated to bottom above Ticker Tape */}
      <LiveFlowMarquee incomingNews={[...(marketData?.news || []), ...whaleNews].map(news => ({
        id: news.id || Math.random().toString(),
        title: news.title || news.headline || news.msg || "News Item",
        timestamp: ""
      }))} />
 
      <TickerTape onSelectStock={handleSelectNode} />
      </div>
    </div>
  );
}
