import React, { useMemo, useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import { Company } from "../data/companies";
import { useCompanies } from "../context/CompaniesContext";
import {
  TrendingUp,
  Newspaper,
  Activity,
  Zap,
  Globe as GlobeIcon,
  RefreshCcw,
  Link2,
  Box,
  ShieldAlert,
  MapPin,
  ChevronsLeft,
  ChevronsRight,
  Volume2,
  VolumeX,
  Play,
  Heart,
  Ship,
  Plane,
  Truck,
  Warehouse,
  Sliders,
  Flame,
  Network,
  Shield,
} from "lucide-react";
import { formatCurrency, cn, getApiBaseUrl } from "../lib/utils";
import { analyzeSentimentAndImpact } from "../lib/sentiment";
import { YieldCurveMonitor } from "./YieldCurveMonitor";
import { SupplyChainPanel } from "./SupplyChainPanel";
import { MacroCorridor } from "./yield-terminal/MacroCorridor";
import { TopologyMapLayout } from "./yield-terminal/TopologyMap";
import { motion, AnimatePresence } from "motion/react";

interface IntelligenceSidebarProps {
  selectedStock: Company | null;
  quote: any;
  news: any[];
  financials: any[];
  profile: any;
  history: any[];
  isAiProcessing: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onSelectNode: (c: Company, skipFetch?: boolean, isSearch?: boolean, activeStoryContext?: any) => void;
  relationships?: { suppliers: any[]; customers: any[] };
  briefing?: any;
  sentiment?: any;
  yields?: any;
  logs?: string[];
  quotaExhausted: boolean;
  onEnrichNews: () => void;
  onGenerateBriefing: () => void;
  isMinimized: boolean;
  onToggleMinimize: () => void;
  activeCorridorId?: string | null;
  onSelectCorridor?: (id: string | null) => void;
  recentNewsContent?: string;
  agentFocus?: any | null;
  setAgentFocus?: (focus: any | null) => void;
  searchQuery?: string;
  setSearchQuery?: (query: string) => void;
  // System Risks
  systemRiskScore?: number;
  threatLevelText?: string;
  shocks?: { taiwanStraitBlocked: boolean, suezCanalBlocked: boolean, malaccaStraitBlocked: boolean, panamaCanalBlocked: boolean };
  setShocks?: { setTaiwanStraitBlocked: (v: boolean) => void, setSuezCanalBlocked: (v: boolean) => void, setMalaccaStraitBlocked: (v: boolean) => void, setPanamaCanalBlocked: (v: boolean) => void };
  mitigations?: { airFreightActive: boolean, strategicStockpileActive: boolean, dualSourcingActive: boolean };
  setMitigations?: { setAirFreightActive: (v: boolean) => void, setStrategicStockpileActive: (v: boolean) => void, setDualSourcingActive: (v: boolean) => void };
  isAutopilot?: boolean;
  setIsAutopilot?: (v: boolean) => void;
  viewportLock?: boolean;
  setViewportLock?: (v: boolean) => void;
  autoRotateEnabled?: boolean;
  setAutoRotateEnabled?: (v: boolean) => void;
  isVocalizerEnabled?: boolean;
  setIsVocalizerEnabled?: (v: boolean) => void;
}

const Typewriter = ({
  text,
  className = "text-emerald-500/80",
}: {
  text: string;
  className?: string;
}) => {
  const [displayedText, setDisplayedText] = useState("");
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setDisplayedText("");
    setIndex(0);
  }, [text]);

  useEffect(() => {
    if (index < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText((prev) => prev + text[index]);
        setIndex((prev) => prev + 1);
      }, 5);
      return () => clearTimeout(timeout);
    }
  }, [index, text]);

  return (
    <div
      className={cn(
        "markdown-body font-sans text-[9.5px] leading-relaxed space-y-1.5 relative",
        className,
      )}
    >
      <Markdown>{displayedText}</Markdown>
      {index < text.length && (
        <span
          className="inline-block w-1.5 h-3 bg-emerald-500 ml-1 translate-y-0.5 opacity-80"
        />
      )}
    </div>
  );
};

const NeuralStreamHeader = ({ riskScore }: { riskScore: number }) => {
  const colorStyle = riskScore >= 75 ? "text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]" : riskScore >= 45 ? "text-amber-500" : "text-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]";
  const jitter = "";

  return (
    <div className="flex flex-col border-b border-zinc-900 bg-black">
      <div className="flex items-center gap-3 px-3 py-1.5 overflow-hidden select-none relative group border-b border-zinc-900/50">
        <div className={cn("text-[7px] font-mono tracking-[0.3em] font-black uppercase whitespace-nowrap overflow-hidden flex gap-8", colorStyle, jitter)}>
          <span className="flex gap-4">
            <span>RISK_LEVEL::{riskScore}%</span>
            <span>SYSTEM_ENTROPY::[{(riskScore * 0.12).toFixed(2)}]</span>
          </span>
          <span className="flex gap-4">
            <span>RISK_LEVEL::{riskScore}%</span>
            <span>SYSTEM_ENTROPY::[{(riskScore * 0.12).toFixed(2)}]</span>
          </span>
        </div>
      </div>
      
      {/* Dynamic DEFCON Segments */}
      <div className="flex h-1 px-1 gap-[1px]">
        {[...Array(20)].map((_, i) => (
          <div 
            key={i} 
            className={cn(
              "flex-1 transition-all duration-500",
              (i / 20) * 100 < riskScore 
                ? (riskScore >= 75 ? "bg-red-500" : riskScore >= 45 ? "bg-amber-500" : "bg-emerald-500") 
                : "bg-zinc-900"
            )} 
          />
        ))}
      </div>
    </div>
  );
};

export const IntelligenceSidebar = React.memo(
  ({
    selectedStock,
    quote,
    news = [],
    financials = [],
    profile,
    history = [],
    isAiProcessing,
    activeTab,
    setActiveTab,
    onSelectNode,
    relationships = { suppliers: [], customers: [] },
    briefing,
    sentiment,
    yields,
    logs = [],
    quotaExhausted,
    onEnrichNews,
    onGenerateBriefing,
    isMinimized,
    onToggleMinimize,
    activeCorridorId = null,
    onSelectCorridor,
    recentNewsContent = "",
    agentFocus = null,
    setAgentFocus,
    searchQuery,
    setSearchQuery,
    systemRiskScore = 25,
    threatLevelText = "DEFCON 5: OPTIMAL SECURITY",
    shocks = { taiwanStraitBlocked: false, suezCanalBlocked: false, malaccaStraitBlocked: false, panamaCanalBlocked: false },
    setShocks,
    mitigations = { airFreightActive: false, strategicStockpileActive: false, dualSourcingActive: false },
    setMitigations,
    isAutopilot = false,
    setIsAutopilot,
    viewportLock = false,
    setViewportLock,
    autoRotateEnabled = true,
    setAutoRotateEnabled,
    isVocalizerEnabled = false,
    setIsVocalizerEnabled,
  }: IntelligenceSidebarProps) => {
    const { companies } = useCompanies();
    const { taiwanStraitBlocked, suezCanalBlocked, malaccaStraitBlocked, panamaCanalBlocked } = shocks;
    const { airFreightActive, strategicStockpileActive, dualSourcingActive } = mitigations;
    const { setTaiwanStraitBlocked, setSuezCanalBlocked, setMalaccaStraitBlocked, setPanamaCanalBlocked } = setShocks || {};
    const { setAirFreightActive, setStrategicStockpileActive, setDualSourcingActive } = setMitigations || {};

    const [localNewsSearch, setLocalNewsSearch] = useState("");
    const newsSearch =
      searchQuery !== undefined ? searchQuery : localNewsSearch;
    const setNewsSearch =
      setSearchQuery !== undefined ? setSearchQuery : setLocalNewsSearch;

    const [activeDockTab, setActiveDockTab] = useState<
      "LOGISTICS" | "LOGS" | "PARTNERS"
    >("LOGISTICS");
    const [auditStatus, setAuditStatus] = useState<
      "idle" | "running" | "completed"
    >("idle");
    const [partnerData, setPartnerData] = useState<any>({ usgs: [], gdelt: {}, whaleAlert: [] });

    useEffect(() => {
        if (activeDockTab === "PARTNERS") {
            const baseUrl = getApiBaseUrl();
            Promise.all([
                fetch(`${baseUrl}/api/partners/usgs`).then(r => r.json()),
                fetch(`${baseUrl}/api/partners/gdelt`).then(r => r.json()),
                fetch(`${baseUrl}/api/partners/whale-alert`).then(r => r.json())
            ]).then(([usgs, gdelt, whaleAlert]) => {
                setPartnerData({ usgs: usgs?.features?.slice(0, 5) || [], gdelt: gdelt || {}, whaleAlert: whaleAlert?.transactions?.slice(0, 5) || [] });
            }).catch(console.error);
        }
    }, [activeDockTab]);
    const [auditedItems, setAuditedItems] = useState<
      Record<string, "VERIFIED" | "FAILED">
    >({});
    const [innerLeftTab, setInnerLeftTab] = useState<
      "STRATEGY" | "LOGISTICS_COCKPIT" | "YIELD" | "SUPPLY_CHAIN" | "HEATMAP"
    >("STRATEGY");

    const [isSpeaking, setIsSpeaking] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const ttsCooldownRef = useRef<number>(0);
    const [isSpeechLoading, setIsSpeechLoading] = useState(false);

    useEffect(() => {
      const handleTtsPlay = (e: Event) => {
        const customEvent = e as CustomEvent;
        if (customEvent.detail && customEvent.detail.origin !== 'sidebar') {
          if (audioRef.current) {
            try {
              audioRef.current.pause();
            } catch (err) {}
            audioRef.current = null;
          }
          if ((window as any)._activeTtsSource) {
            try {
              (window as any)._activeTtsSource.stop();
            } catch (err) {}
            (window as any)._activeTtsSource = null;
          }
          if ((window as any)._activeTtsSourceMap) {
            try {
              (window as any)._activeTtsSourceMap.stop();
            } catch (err) {}
            (window as any)._activeTtsSourceMap = null;
          }
          if (window.speechSynthesis) window.speechSynthesis.cancel();
          setIsSpeaking(false);
        }
      };

      if (typeof window !== "undefined") window.addEventListener('app-tts-play', handleTtsPlay);

      return () => {
        if (audioRef.current) {
          try {
            audioRef.current.pause();
          } catch (err) {}
        }
        if (window && window.speechSynthesis) window.speechSynthesis.cancel();
        if (typeof window !== "undefined") window.removeEventListener('app-tts-play', handleTtsPlay);
      };
    }, []);

    useEffect(() => {
      if (audioRef.current) {
        try {
          audioRef.current.pause();
        } catch (err) {}
        audioRef.current = null;
        setIsSpeaking(false);
      }
      if ((window as any)._activeTtsSource) {
        try { (window as any)._activeTtsSource.stop(); } catch (e) {}
        (window as any)._activeTtsSource = null;
      }
      if ((window as any)._activeTtsSourceMap) {
        try { (window as any)._activeTtsSourceMap.stop(); } catch (e) {}
        (window as any)._activeTtsSourceMap = null;
      }
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    }, [innerLeftTab, selectedStock]);

    const triggerBrowserFallback = (text: string) => {
      if (!window.speechSynthesis) return;

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      let preferredVoice = voices.find(v => 
        v.lang.startsWith("en") && 
        (v.name.includes("Neural") || v.name.includes("Natural") || v.name.includes("Google"))
      );
      if (!preferredVoice) preferredVoice = voices.find(v => v.lang.startsWith("en"));
      if (preferredVoice) utterance.voice = preferredVoice;
      utterance.rate = 1.05;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    };

    const handleSpeak = async (textToSpeak: string) => {
      if (isSpeaking) {
        if (audioRef.current) {
          try {
            audioRef.current.pause();
          } catch (e) {}
          audioRef.current = null;
        }
        if ((window as any)._activeTtsSource) {
          try {
            (window as any)._activeTtsSource.stop();
          } catch (e) {}
          (window as any)._activeTtsSource = null;
        }
        if ((window as any)._activeTtsSourceMap) {
          try {
            (window as any)._activeTtsSourceMap.stop();
          } catch (e) {}
          (window as any)._activeTtsSourceMap = null;
        }
        if (window.speechSynthesis) window.speechSynthesis.cancel();
        setIsSpeaking(false);
        return;
      }

      // Stop other speakers like MapLayer
      window.dispatchEvent(new CustomEvent('app-tts-play', { detail: { origin: 'sidebar' } }));
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      if ((window as any)._activeTtsSource) {
        try { (window as any)._activeTtsSource.stop(); } catch (e) {}
        (window as any)._activeTtsSource = null;
      }
      if ((window as any)._activeTtsSourceMap) {
        try { (window as any)._activeTtsSourceMap.stop(); } catch (e) {}
        (window as any)._activeTtsSourceMap = null;
      }

      if (Date.now() < ttsCooldownRef.current) {
        triggerBrowserFallback(textToSpeak);
        return;
      }

      setIsSpeechLoading(true);
      try {
        const baseUrl = getApiBaseUrl();
        const response = await fetch(`${baseUrl}/api/ai/tts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: textToSpeak, voice: "Charon" })
        });
        
        if (!response.ok) {
          if (response.status === 429) {
            ttsCooldownRef.current = Date.now() + 600000; // 10 minutes cooldown
            throw new Error("QUOTA_EXHAUSTED");
          }
          throw new Error("Voice uplink failed");
        }
        
        const data = await response.json();
        if (data.audio) {
          try {
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            const binaryString = atob(data.audio);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            const pcmData = new Int16Array(bytes.buffer);
            const float32Data = new Float32Array(pcmData.length);
            for (let i = 0; i < pcmData.length; i++) {
              float32Data[i] = pcmData[i] / 32768.0;
            }
            
            const buffer = audioCtx.createBuffer(1, float32Data.length, 24000);
            buffer.getChannelData(0).set(float32Data);
            
            const source = audioCtx.createBufferSource();
            source.buffer = buffer;
            source.connect(audioCtx.destination);
            source.onended = () => {
              setIsSpeaking(false);
              if ((window as any)._activeTtsSource === source) {
                (window as any)._activeTtsSource = null;
              }
            };
            
            (window as any)._activeTtsSource = source;
            setIsSpeaking(true);
            source.start();
          } catch (pcmErr) {
            console.warn("Direct PCM Decode/Playback failed, trying HTML5 Audio node", pcmErr);
            const audio = new Audio("data:audio/mp3;base64," + data.audio);
            audioRef.current = audio;
            audio.onended = () => {
              setIsSpeaking(false);
              audioRef.current = null;
            };
            audio.onerror = () => {
              setIsSpeaking(false);
              triggerBrowserFallback(textToSpeak);
            };
            setIsSpeaking(true);
            await audio.play().catch((playErr) => {
              console.warn("Direct audio play failed", playErr);
              triggerBrowserFallback(textToSpeak);
            });
          }
        }
      } catch (err: any) {
        if (err.message !== "QUOTA_EXHAUSTED" && err.message !== "Failed to fetch") {
          console.error("Speech playback failed:", err);
        }
        triggerBrowserFallback(textToSpeak);
      } finally {
        setIsSpeechLoading(false);
      }
    };

    // Dynamic Logistics Stream Logs
    const [localLogisticsLogs, setLocalLogisticsLogs] = useState<string[]>([
      "SYSTEM: Logistics monitoring pipeline initialized.",
      "SYSTEM: Dynamic chokepoint threat vectors linked.",
      "SYSTEM: Multi-tier material dependencies indexed."
    ]);

    const dispatchLog = (msg: string) => {
      const timestamp = new Date().toISOString().slice(11, 19);
      setLocalLogisticsLogs((prev) => [`[${timestamp}] ${msg}`, ...prev.slice(0, 14)]);
    };

    const calculatedRiskScore = systemRiskScore;

    // Material supply catalog based on stock sector
    const SOURCED_MATERIALS = useMemo(() => {
      if (!selectedStock) return [];
      const sector = selectedStock.sector.toLowerCase();
      if (sector.includes("semi") || sector.includes("chips")) {
        return [
          { name: "Monolithic Silicon Wafers (3nm/4nm)", type: "Critical Substrate", vulnerability: "Critical Taiwan Strait", quantity: "45,000 Pcs/mo" },
          { name: "EUV Reflex Optics Lens Assemblies", type: "Key Capital Machinery", vulnerability: "Sole-Source Netherlands", quantity: "2 Pcs/qtr" },
          { name: "Ultra-pure Photoresists & Cleansers", type: "Process Consumables", vulnerability: "High-beta Japan", quantity: "240 Tons/mo" },
          { name: "Liquid Neon Chalcogenide Gas", type: "Atmospheric Laser Gas", vulnerability: "High-beta Eastern Union", quantity: "4,500 Liters/mo" }
        ];
      }
      if (sector.includes("energy") || sector.includes("oil") || sector.includes("gas")) {
        return [
          { name: "Raw Crude Light-Sweet feedstock", type: "Direct Refinery Input", vulnerability: "High Suez transit gate", quantity: "1.2M Bbl/day" },
          { name: "Bituminous Heavy Diluents", type: "Blend Modifier", vulnerability: "Regional Pipeline block", quantity: "400k Bbl/day" },
          { name: "Crystalline drilling catalyst powders", type: "Extraction catalyst", vulnerability: "Sole-source China", quantity: "18 Tons/mo" },
          { name: "Liquefied cryogenic ethane feedstocks", type: "Gas cracker input", vulnerability: "Critical Hormuz Strait", quantity: "850k Metric Tons" }
        ];
      }
      if (sector.includes("auto") || sector.includes("vehicle") || sector.includes("indust")) {
        return [
          { name: "Lithium carbonate chemical brine", type: "Battery anode cells", vulnerability: "High Chile/Argentina", quantity: "8,500 Tons/mo" },
          { name: "Class-1 High-purity Nickel plates", type: "Battery cathode casing", vulnerability: "Medium Southeast Asia", quantity: "14k Tons/mo" },
          { name: "Neodymium-iron-boron rare magnets", type: "Brushless motor rotor", vulnerability: "Critical China Import", quantity: "35k Units/mo" },
          { name: "Cold-rolled structural steel coils", type: "Chassis structural frame", vulnerability: "Standard domestic", quantity: "120k Tons/mo" }
        ];
      }
      if (sector.includes("consum") || sector.includes("retail") || sector.includes("lux")) {
        return [
          { name: "Organic long-staple cotton bales", type: "Primary textile material", vulnerability: "Sea shipping delays", quantity: "450k Bales/mo" },
          { name: "Ethylene-vinyl acetate copolymers", type: "Footwear sole mold", vulnerability: "Standard logistics", quantity: "3,800 Tons/mo" },
          { name: "Uncoated sulfate wood pulp board", type: "Retail product packaging", vulnerability: "Panama Canal queue", quantity: "18k Tons/mo" }
        ];
      }
      return [
        { name: "Refined copper alloy connector pins", type: "Electronic subassemblies", vulnerability: "Standard Global", quantity: "3.2M Units/mo" },
        { name: "Recycled thermoplastic granulates", type: "Instrument enclosures", vulnerability: "Low", quantity: "420 Tons/mo" },
        { name: "Packaging protective structural foam", type: "Logistics buffer material", vulnerability: "Low", quantity: "50k Cases/mo" }
      ];
    }, [selectedStock]);

    // Dynamic, interactive chokepoint simulation audit results
    const dynamicAuditedItems = useMemo(() => {
      const items: Record<string, { status: "VERIFIED" | "FAILED" | "WARN"; reason: string }> = {};
      const list = [
        ...(relationships.suppliers || []),
        ...(relationships.customers || []),
      ];
      
      list.forEach((item) => {
        const itemSector = item.sector?.toLowerCase() || "";
        let failed = false;
        let warning = false;
        let reason = "All supply handshakes verified within nominal bounds.";

        if (taiwanStraitBlocked && (itemSector.includes("semi") || item.symbol === "TSM" || item.symbol === "AAPL" || item.symbol === "NVDA")) {
          failed = true;
          reason = "Taiwan Air-Sea airspace restrictions block high-beta silicon wafer flows.";
        } else if (suezCanalBlocked && (itemSector.includes("energy") || item.symbol === "ARAMCO" || item.symbol === "SHEL" || item.symbol === "XOM")) {
          failed = true;
          reason = "Maritime blockages at Suez mandate detour around Cape of Good Hope (+12 days detour delay).";
        } else if (malaccaStraitBlocked && (item.symbol === "TSM" || item.symbol === "AMZN")) {
          warning = true;
          reason = "Malacca Strait demurrage bottleneck limits logistics throughput.";
        } else if (panamaCanalBlocked && (itemSector.includes("consum") || item.symbol === "AMZN")) {
          warning = true;
          reason = "Panama draft constraints create transit queues and shipping scheduling locks.";
        }

        // Adjust based on active mitigations
        let finalStatus: "VERIFIED" | "FAILED" | "WARN" = failed ? "FAILED" : (warning ? "WARN" : "VERIFIED");
        
        if (finalStatus === "FAILED" && (dualSourcingActive || strategicStockpileActive)) {
          finalStatus = "WARN";
          reason += " [MITIGATED: Sourced via dual-channel backup lines]";
        } else if (finalStatus === "WARN" && airFreightActive) {
          finalStatus = "VERIFIED";
          reason += " [RESOLVED: Secured priority Air Bridge enabled]";
        }

        items[item.symbol] = { status: finalStatus, reason };
      });
      
      return items;
    }, [
      relationships,
      taiwanStraitBlocked,
      suezCanalBlocked,
      malaccaStraitBlocked,
      panamaCanalBlocked,
      airFreightActive,
      strategicStockpileActive,
      dualSourcingActive,
    ]);



    // Dynamic correlation matrix data simulation
    const correlationMatrix = useMemo(() => {
      const stressors = ["LIQUIDITY", "GEOPOLITICAL", "SUPPLY_CHAIN", "CURRENCY", "CREDIT"];
      return stressors.map(s1 => stressors.map(s2 => {
        if (s1 === s2) return 1.0;
        // Synthetic correlations that react slightly to stressors
        let val = 0.3 + Math.random() * 0.4;
        if ((s1 === "GEOPOLITICAL" || s2 === "GEOPOLITICAL") && taiwanStraitBlocked) val += 0.2;
        if ((s1 === "SUPPLY_CHAIN" || s2 === "SUPPLY_CHAIN") && suezCanalBlocked) val += 0.25;
        return Math.min(0.99, val);
      }));
    }, [taiwanStraitBlocked, suezCanalBlocked, malaccaStraitBlocked, panamaCanalBlocked]);

    const [sentimentFilter, setSentimentFilter] = useState<
      "ALL" | "BULLISH" | "BEARISH" | "NEUTRAL"
    >("ALL");
    const [impactFilter, setImpactFilter] = useState<
      "ALL" | "CRITICAL" | "MODERATE" | "ROUTINE"
    >("ALL");

    const runSupplyChainAudit = (symbol: string) => {
      setAuditStatus("running");
      setTimeout(() => {
        const items: Record<string, "VERIFIED" | "FAILED"> = {};
        const list = [
          ...(relationships.suppliers || []),
          ...(relationships.customers || []),
        ];
        list.forEach((item) => {
          items[item.symbol] = Math.random() > 0.15 ? "VERIFIED" : "FAILED";
        });
        setAuditedItems(items);
        setAuditStatus("completed");
      }, 1000);
    };

    const filteredNews = useMemo(() => {
      return news.filter((item) => {
        const matchesSearch =
          item.title.toLowerCase().includes(newsSearch.toLowerCase()) ||
          (item.summary &&
            item.summary.toLowerCase().includes(newsSearch.toLowerCase()));

        if (!matchesSearch) return false;

        const { sentiment: compSentiment, impact: compImpact } =
          analyzeSentimentAndImpact(item);

        if (sentimentFilter !== "ALL" && compSentiment !== sentimentFilter)
          return false;
        if (impactFilter !== "ALL" && compImpact !== impactFilter) return false;

        return true;
      });
    }, [news, newsSearch, sentimentFilter, impactFilter]);

    if (!selectedStock) {
      return (
    <aside
      className="w-52 border-l border-zinc-800 flex flex-col bg-black z-20 shrink-0 select-none overflow-hidden"
    >
          <div className="p-3 border-b border-zinc-805 bg-black flex flex-col mb-1 shrink-0">
            <div className="text-[7.5px] text-zinc-650 font-mono font-black tracking-widest uppercase">
              AI INTEL MATRIX
            </div>
            <div className="flex items-center gap-1.5 bg-black/50 px-1 py-0.5 border border-zinc-900 w-fit mt-1">
              <span className="w-1.5 h-1.5 bg-red-500" />
              <span className="text-[8px] text-zinc-400 font-mono tracking-widest uppercase font-black">
                SYS.IDLE
              </span>
            </div>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center p-4 text-center bg-black relative overflow-hidden">
            <div>
              <Activity className="w-8 h-8 text-zinc-855 mb-3" />
            </div>
            <h3
              className="font-mono text-zinc-500 uppercase tracking-widest font-black text-[9.5px] border border-zinc-900 px-2 py-1 bg-black"
            >
              TARGET REQUIRED
            </h3>
            <p className="text-zinc-650 font-mono uppercase tracking-wider text-[7px] mt-4 leading-relaxed max-w-[155px]">
              Select a target asset from the left panel to synthesize AI
              intelligence coordinates.
            </p>
          </div>
        </aside>
      );
    }

    return (
      <aside
        className={cn(
        "h-full border-l border-zinc-800 flex flex-col bg-black z-20 shrink-0 select-none overflow-hidden relative transition-all duration-150",
        "w-full",
      )}
      >
        <div className="h-10 border-b border-zinc-800 bg-zinc-950/90 flex items-center justify-between px-3">
          {!isMinimized && (
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_#10b981]" />
              <span className="text-[10px] font-black uppercase text-white tracking-[0.2em] font-mono">
                INTEL_COCKPIT_V4
              </span>
            </div>
          )}
          <button onClick={onToggleMinimize} className="text-zinc-500">
            {isMinimized ? <ChevronsLeft /> : <ChevronsRight />}
          </button>
        </div>

        {!isMinimized && (
          <div className="flex-1 flex flex-col min-h-0">
            <NeuralStreamHeader riskScore={calculatedRiskScore} />
            
            {/* PERSISTENT NEWS ALERT TICKER */}
            <div className="h-7 bg-emerald-500/5 border-b border-zinc-900 flex items-center px-3 relative overflow-hidden shrink-0 group">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] z-10" />
              <div className="flex items-center gap-2 text-[7.5px] font-mono tracking-widest uppercase font-black text-emerald-500/60 shrink-0 mr-4 z-10 bg-zinc-950/20 backdrop-blur-md pr-2">
                <Newspaper className="w-3 h-3" />
                LIVE_SIGNALS:
              </div>
              <div className="flex-1 overflow-x-auto scrollbar-none relative">
                <div 
                  className="whitespace-nowrap flex gap-12 text-[8px] font-mono font-bold text-zinc-400 py-1"
                >
                  {news && news.length > 0 ? (
                    news.slice(0, 8).map((n: any, i: number) => (
                      <span key={i} className="flex items-center gap-2">
                        <span className="text-emerald-500/80">[{new Date(n.published_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}]</span>
                        {n.title.toUpperCase()}
                        <span className="text-zinc-800">///</span>
                      </span>
                    ))
                  ) : (
                    <span>[ SIGNAL_SEARCH_IN_PROGRESS: MONITORING_GLOBAL_SATELLITE_UPLINK ]</span>
                  )}
                </div>
              </div>
            </div>

            {/* SYSTEM MODE CONTROLS */}
            <div className="bg-black/40 border-b border-zinc-900 px-3 py-1.5 flex flex-wrap gap-2 shrink-0">
              <button 
                onClick={() => setIsAutopilot?.(!isAutopilot)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-1 px-2 border text-[7px] font-black tracking-widest uppercase transition-all rounded-xs active:scale-95",
                  isAutopilot ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.1)]" : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300"
                )}
              >
                <div className={cn("w-1 h-1 rounded-full", isAutopilot ? "bg-emerald-400 animate-pulse" : "bg-zinc-700")} />
                AUTOPILOT_CYCLE
              </button>
              <button 
                onClick={() => {
                  if (viewportLock) {
                    setViewportLock?.(false);
                    setTimeout(() => setViewportLock?.(true), 50);
                  } else {
                    setViewportLock?.(true);
                  }
                }}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-1 px-2 border text-[7px] font-black tracking-widest uppercase transition-all rounded-xs active:scale-95",
                  viewportLock ? "bg-amber-500/15 border-amber-500/50 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.1)]" : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300"
                )}
              >
                <MapPin className="w-2.5 h-2.5" />
                VIEWPORT_LOCK
              </button>
              <button 
                onClick={() => setAutoRotateEnabled?.(!autoRotateEnabled)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-1 px-2 border text-[7px] font-black tracking-widest uppercase transition-all rounded-xs active:scale-95",
                  autoRotateEnabled ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.1)]" : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300"
                )}
              >
                <RefreshCcw className="w-2.5 h-2.5" />
                ORBIT_ROTATION
              </button>
              <button 
                onClick={() => setIsVocalizerEnabled?.(!isVocalizerEnabled)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-1 px-2 border text-[7px] font-black tracking-widest uppercase transition-all rounded-xs active:scale-95",
                  isVocalizerEnabled ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.1)]" : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300"
                )}
              >
                <Shield className="w-2.5 h-2.5" />
                VOCALIZER_AI
              </button>
            </div>

            {/* Top Main Workspace */}
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
              {/* Inner Switch Row */}
              <div className="flex bg-black shrink-0 border-b border-zinc-900 h-10 p-1 gap-1 select-none overflow-x-auto scrollbar-none transition-all duration-150">
                {[
                  {
                    id: "STRATEGY",
                    label: "STRATEGY",
                    icon: <MapPin className="w-3.5 h-3.5" />,
                  },
                  {
                    id: "LOGISTICS_COCKPIT",
                    label: "LOGISTICS & MATRIX",
                    icon: <Network className="w-3.5 h-3.5" />,
                  },
                  {
                    id: "HEATMAP",
                    label: "HEATMAP",
                    icon: <Activity className="w-3.5 h-3.5" />,
                  },
                  {
                    id: "YIELD",
                    label: "YIELDS",
                    icon: <TrendingUp className="w-3.5 h-3.5" />,
                  },
                ].map((sub) => (
                  <button
                    key={sub.id}
                    id={`btn-tab-${sub.id}`}
                    onClick={() => {
                      setInnerLeftTab(sub.id as any);
                    }}
                    className={cn(
                       "flex-1 flex items-center justify-center gap-1.5 text-[8px] font-mono font-black transition-all border rounded-sm px-2 shrink-0 active:scale-95",
                      innerLeftTab === sub.id
                        ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400 font-black shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                        : "border-zinc-900 text-zinc-600 hover:text-zinc-400 hover:bg-zinc-900",
                    )}
                  >
                    {sub.icon}
                    <span className="truncate">{sub.label}</span>
                  </button>
                ))}
              </div>

              <div className="p-3.5 flex-1 overflow-y-auto">
                {innerLeftTab === "LOGISTICS_COCKPIT" && selectedStock && (
                  <div className="space-y-4">
                    {/* Stress Monitor HUD */}
                    <div className="p-3 border border-red-900/30 bg-red-950/5 rounded-sm space-y-2">
                      <div className="flex justify-between items-center border-b border-red-910/20 pb-1.5 font-mono">
                        <div className="text-red-500 font-black flex items-center gap-1.5 uppercase text-[10px]">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          Geopolitical Risk Matrix
                        </div>
                        <span className="text-[7.5px] bg-red-950 text-red-400 px-1.5 py-0.5 border border-red-900/40 font-extrabold uppercase select-none">
                          Stress HUD
                        </span>
                      </div>

                      {/* Concentric-style Risk Meter */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center font-mono text-[9px]">
                          <span className="text-zinc-500 uppercase">MATRIX STRESS INDEX</span>
                          <span className={cn(
                            "font-bold text-[10.5px]",
                            calculatedRiskScore >= 75 ? "text-red-500" : calculatedRiskScore >= 45 ? "text-amber-500" : "text-emerald-500"
                          )}>
                            {calculatedRiskScore}% RISK
                          </span>
                        </div>
                        <div className="h-1.5 bg-zinc-900 overflow-hidden rounded-full">
                          <div 
                            className={cn(
                              "h-full transition-all duration-300",
                              calculatedRiskScore >= 75 ? "bg-red-600" : calculatedRiskScore >= 45 ? "bg-amber-500" : "bg-emerald-500"
                            )} 
                            style={{ width: `${calculatedRiskScore}%` }} 
                            id="risk-meter-bar"
                          />
                        </div>
                        <div className="text-[8px] text-zinc-400 leading-normal border-l border-zinc-700 pl-1.5 italic font-mono">
                          STATUS // {threatLevelText}
                        </div>
                      </div>
                    </div>

                    {/* Geopolitical Bottleneck Swatters (Interactive Stressors) */}
                    <div className="p-3 border border-zinc-900 bg-zinc-950 rounded-sm space-y-2.5">
                      <div className="text-[8.5px] font-black uppercase text-zinc-500 border-b border-zinc-900 pb-1 flex justify-between items-center select-none font-mono">
                        <span>LIVE CHOKEPOINT SHOCK SIMULATOR</span>
                        <span className="text-[7px] text-zinc-600 font-bold">TOGGLE STRESSORS</span>
                      </div>

                      <div className="space-y-2 font-mono">
                        {/* Taiwan Strait Blockade */}
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex flex-col text-[8.5px]">
                            <span className="font-bold text-zinc-300">Taiwan Strait Vector</span>
                            <span className="text-[7px] text-zinc-500 uppercase font-sans">Threat: PLA airspace seal (+48 Hours)</span>
                          </div>
                          <button 
                            id="btn-sidebar-taiwan"
                            onClick={() => {
                              const next = !taiwanStraitBlocked;
                              setTaiwanStraitBlocked(next);
                              dispatchLog(next ? "SHOCK TRIGGERED: Taiwan Air-Sea Corridor is restricted. Critical delays expected for Semiconductors." : "SHOCK RESOLVED: Taiwan Strait clear. Vessel flow resumes.");
                            }}
                            className={cn(
                              "px-2 py-1 text-[8px] border transition-all font-bold tracking-tight shrink-0 cursor-pointer active:scale-95",
                              taiwanStraitBlocked 
                                ? "bg-red-950/30 border-red-500 text-red-500 font-extrabold" 
                                : "bg-zinc-900 border-zinc-800 text-zinc-650 hover:text-zinc-400 hover:border-zinc-700"
                            )}
                          >
                            {taiwanStraitBlocked ? "BLOCKED" : "STABLE"}
                          </button>
                        </div>

                        {/* Suez Canal Blockade */}
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex flex-col text-[8.5px]">
                            <span className="font-bold text-zinc-300">Suez Canal Transit Gate</span>
                            <span className="text-[7px] text-zinc-500 uppercase font-sans font-medium">Threat: Houthi Drone Haz (+12 Days)</span>
                          </div>
                          <button 
                            id="btn-sidebar-suez"
                            onClick={() => {
                              const next = !suezCanalBlocked;
                              setSuezCanalBlocked(next);
                              dispatchLog(next ? "SHOCK TRIGGERED: Bab-el-Mandeb closure forces maritime detours via Cape of Good Hope." : "SHOCK RESOLVED: Suez shipping routing certified safe by regional guards.");
                            }}
                            className={cn(
                              "px-2 py-1 text-[8px] border transition-all font-bold tracking-tight shrink-0 cursor-pointer active:scale-95",
                              suezCanalBlocked 
                                ? "bg-red-950/30 border-red-500 text-red-500 font-extrabold" 
                                : "bg-zinc-900 border-zinc-800 text-zinc-650 hover:text-zinc-400 hover:border-zinc-700"
                            )}
                          >
                            {suezCanalBlocked ? "BLOCKED" : "STABLE"}
                          </button>
                        </div>

                        {/* Malacca Strait Congestion */}
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex flex-col text-[8.5px]">
                            <span className="font-bold text-zinc-300">Strait of Malacca Passage</span>
                            <span className="text-[7px] text-zinc-500 uppercase font-sans">Threat: Tanker saturation and high wait times</span>
                          </div>
                          <button 
                            id="btn-sidebar-malacca"
                            onClick={() => {
                              const next = !malaccaStraitBlocked;
                              setMalaccaStraitBlocked(next);
                              dispatchLog(next ? "SHOCK TRIGGERED: Malacca Strait saturation spikes demurrage charges and logistical friction." : "SHOCK RESOLVED: Malacca Passage clear. Dwell times back to normal.");
                            }}
                            className={cn(
                              "px-2 py-1 text-[8px] border transition-all font-bold tracking-tight shrink-0 cursor-pointer active:scale-95",
                              malaccaStraitBlocked 
                                ? "bg-red-950/30 border-red-500 text-red-500 font-extrabold" 
                                : "bg-zinc-900 border-zinc-800 text-zinc-650 hover:text-zinc-400 hover:border-zinc-700"
                            )}
                          >
                            {malaccaStraitBlocked ? "BLOCKED" : "STABLE"}
                          </button>
                        </div>

                        {/* Panama Canal Drought */}
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex flex-col text-[8.5px]">
                            <span className="font-bold text-zinc-300">Panama Canal Sector</span>
                            <span className="text-[7px] text-zinc-500 uppercase font-sans text-emerald-400/90 font-medium">Threat: Draft limits / lock queue backlog</span>
                          </div>
                          <button 
                            id="btn-sidebar-panama"
                            onClick={() => {
                              const next = !panamaCanalBlocked;
                              setPanamaCanalBlocked(next);
                              dispatchLog(next ? "SHOCK TRIGGERED: Panama Canal dry restrictions reduce transit drafts. Multi-day line queue activated." : "SHOCK RESOLVED: Panama Canal draft limitations lifted. Clear passage.");
                            }}
                            className={cn(
                              "px-2 py-1 text-[8px] border transition-all font-bold tracking-tight shrink-0 cursor-pointer active:scale-95",
                              panamaCanalBlocked 
                                ? "bg-red-950/30 border-red-500 text-red-500 font-extrabold" 
                                : "bg-zinc-900 border-zinc-800 text-zinc-650 hover:text-zinc-400 hover:border-zinc-700"
                            )}
                          >
                            {panamaCanalBlocked ? "BLOCKED" : "STABLE"}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Stream Vectors with vertical presentation */}
                    <SupplyChainPanel company={selectedStock} onSelectNode={onSelectNode} />

                    {/* TOPOLOGY AUDIT LOGS INTERACTIVE VIEW */}
                    <div className="space-y-2">
                      <div className="text-[9.5px] font-black uppercase text-zinc-500 flex items-center justify-between mb-1.5 select-none font-mono">
                        <span className="flex items-center gap-1.5"><ShieldAlert className="w-3.5 h-3.5 text-zinc-500" /> MULTI-POINT AUDIT PATHS</span>
                      </div>

                      {auditStatus === "completed" ? (
                        <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                          {Object.entries(dynamicAuditedItems).map(([sym, report], idx) => (
                            <div
                              key={`${sym}-${idx}`}
                              className="p-1.5 bg-black border border-zinc-900 flex flex-col gap-1 rounded-sm font-mono"
                            >
                              <div className="flex justify-between items-center text-[9px]">
                                <span className="text-zinc-200 font-black">{sym}</span>
                                <span className={cn(
                                  "font-black tracking-wider text-[7.5px] px-1 rounded-2xs uppercase border",
                                  report.status === "VERIFIED" 
                                    ? "bg-emerald-950/30 border-emerald-500/20 text-emerald-450" 
                                    : report.status === "WARN"
                                      ? "bg-amber-950/30 border-amber-500/20 text-amber-500"
                                      : "bg-red-950/30 border-red-500/20 text-red-500"
                                )}>
                                  {report.status}
                                </span>
                              </div>
                              <p className="text-[7.5px] leading-tight text-zinc-500 italic">
                                {report.reason}
                              </p>
                            </div>
                          ))}
                          <button 
                            id="btn-sidebar-reset"
                            onClick={() => {
                              setAuditStatus("idle");
                              dispatchLog("SYSTEM: Reset current topology audits. Ready for re-screening.");
                            }}
                            className="w-full text-center py-1 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:bg-zinc-850 hover:text-white transition-colors cursor-pointer text-[7.5px] font-bold uppercase rounded-sm"
                          >
                            Reset System Audits
                          </button>
                        </div>
                      ) : (
                        <button
                          id="btn-sidebar-audit"
                          onClick={() => {
                            runSupplyChainAudit(selectedStock.symbol);
                            dispatchLog(`SYSTEM: Scanning multi-node supply connections for ${selectedStock.symbol}...`);
                          }}
                          disabled={auditStatus === "running"}
                          className="w-full py-2.5 bg-red-950/20 text-red-500 border border-red-900/40 hover:bg-red-900/30 transition-colors uppercase font-black text-[8px] tracking-widest disabled:opacity-50 cursor-pointer rounded-sm"
                        >
                          {auditStatus === "running"
                            ? "SCANNING VENDOR CONNECTIONS..."
                            : "INITIATE TOPOLOGY SCAN"}
                        </button>
                      )}
                    </div>

                    <div className="pt-2 border-t border-zinc-900">
                      <div className="text-[8.5px] text-zinc-500 uppercase tracking-widest font-mono mb-2">
                        Topographic Routing Links
                      </div>
                      <TopologyMapLayout 
                        activeCorridorId={activeCorridorId} 
                        onSelectNode={onSelectNode} 
                        onSelectCorridor={onSelectCorridor} 
                        selectedStock={selectedStock}
                      />
                    </div>
                    
                    {/* Sourced Critical Material Inventory */}
                    {SOURCED_MATERIALS && SOURCED_MATERIALS.length > 0 && (
                      <div className="p-3 bg-black border border-zinc-900 rounded-sm space-y-3">
                        <div className="flex items-center justify-between border-b border-zinc-900 pb-2 select-none font-mono">
                          <div className="text-[9px] text-emerald-400 font-black tracking-widest uppercase flex items-center gap-1.5">
                            <Box className="w-3.5 h-3.5 text-emerald-500" />
                            SOURCED_MATERIAL_INVENTORY
                          </div>
                          <span className="text-[7.5px] bg-emerald-950/30 text-emerald-400 px-1.5 py-0.5 border border-emerald-900/30 font-bold uppercase">
                            TIER_3_VULN
                          </span>
                        </div>
                        
                        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                          {SOURCED_MATERIALS.map((mat, idx) => {
                            const isHighRisk = mat.vulnerability.toLowerCase().includes("critical") || mat.vulnerability.toLowerCase().includes("high");
                            return (
                              <div key={idx} className="p-2 bg-black/60 border border-zinc-900/40 rounded-sm flex flex-col gap-1 hover:border-emerald-500/25 transition-colors">
                                <div className="flex items-start justify-between gap-2">
                                  <span className="font-bold text-zinc-200 text-[9px] leading-tight font-sans">
                                    {mat.name}
                                  </span>
                                  <span className={cn(
                                    "font-mono text-[7px] font-black px-1 py-0.5 uppercase border shrink-0",
                                    isHighRisk 
                                      ? "bg-red-950/30 border-red-900/30 text-red-400" 
                                      : "bg-zinc-900 border-zinc-800 text-zinc-500"
                                  )}>
                                    {mat.quantity}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between gap-1 mt-0.5 text-[7.5px]">
                                  <span className="text-zinc-500 font-mono italic">
                                    {mat.type}
                                  </span>
                                  <span className={cn(
                                    "font-mono font-bold uppercase flex items-center gap-0.5",
                                    isHighRisk ? "text-amber-500" : "text-zinc-500"
                                  )}>
                                    ⚠️ {mat.vulnerability}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <MacroCorridor 
                      activeCorridorId={activeCorridorId} 
                      recentNewsContent={recentNewsContent}
                      onSelectTicker={(symbol) => {
                        const comp = companies.find((c) => c.symbol === symbol);
                        if (comp) onSelectNode(comp);
                      }}
                    />
                  </div>
                )}
                    {innerLeftTab === "STRATEGY" && (
                      <div className="space-y-4">
                        <div className="mb-4">
                        </div>

                    {/* SVG 10-Day Trend Sparkline Matrix */}
                    {sentiment?.forecast && Array.isArray(sentiment.forecast) && (
                      <div className="p-2.5 border border-zinc-900 bg-black/45 rounded-sm space-y-2 select-none">
                        <div className="flex justify-between items-center border-b border-zinc-900/40 pb-1.5">
                          <span className="text-[7.5px] text-zinc-500 font-mono font-black tracking-widest uppercase">
                            10-Day Projected Delta Forecast
                          </span>
                          <span className="text-[7px] text-emerald-400 font-mono uppercase bg-emerald-950/20 px-1 border border-emerald-900/30">
                            NEURAL PREDICTOR
                          </span>
                        </div>
                        
                        <div className="h-10 w-full flex items-center justify-between gap-2.5 pt-1.5">
                          <div className="flex-1 h-full flex items-end gap-[2px]">
                            {sentiment.forecast.map((val: number, i: number) => {
                              // range values are usually small deltas, let's normalize nicely
                              const heightPct = Math.max(10, Math.min(100, (Math.abs(val) * 100) + 10));
                              const isPositive = val >= 0;
                              return (
                                <div key={i} className="flex-1 h-full flex flex-col justify-end group relative">
                                  {/* Tooltip on hover */}
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block bg-zinc-950 border border-zinc-800 text-[6.5px] text-zinc-300 px-1 py-0.5 rounded-sm whitespace-nowrap z-50 font-mono">
                                    Day {i+1}: {val > 0 ? "+" : ""}{(val * 100).toFixed(1)}%
                                  </div>
                                  <div 
                                    className={cn(
                                      "w-full rounded-2xs transition-all duration-300 opacity-80 hover:opacity-100",
                                      isPositive ? "bg-emerald-500/50 hover:bg-emerald-400" : "bg-red-500/50 hover:bg-red-400"
                                    )}
                                    style={{ height: `${heightPct}%` }}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="mt-4">
                      <h4 className="text-[11px] font-black uppercase text-emerald-400 tracking-widest mb-2 font-mono border-b border-emerald-900/50 pb-1.5 flex justify-between items-center select-none">
                        <span>Filtered Intelligence Feed</span>
                        <span className="text-[7.5px] text-zinc-500 font-normal normal-case">Select story to analyze</span>
                      </h4>
                      <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                        {filteredNews.length > 0 ? (
                           filteredNews.map((n, i) => {
                             const company = companies.find(c => c.symbol === (n.symbol || n.ticker));
                             const isCurrentAsset = selectedStock?.symbol === n.symbol;
                             return (
                               <div 
                                 key={i} 
                                 onClick={() => {
                                   if (company) {
                                     onSelectNode(company, false, false, n);
                                   }
                                 }}
                                 className={cn(
                                   "text-[9px] text-zinc-350 font-sans border border-zinc-900 rounded-sm pb-2 p-2 hover:bg-zinc-900/40 hover:border-emerald-500/30 cursor-pointer transition-all relative block group",
                                   isCurrentAsset ? "bg-emerald-950/10 border-emerald-500/30 border-l-2 border-l-emerald-500" : "bg-black/20"
                                 )}
                               >
                                 <div className="flex justify-between items-center mb-1">
                                   <span className="text-emerald-500 font-bold font-mono tracking-wider">[{n.symbol}]</span>
                                   {n.published_at && (
                                     <span className="text-zinc-500 font-mono text-[7.5px]">
                                       {new Date(n.published_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                                     </span>
                                   )}
                                 </div>
                                 <div className="leading-snug font-bold text-zinc-100 text-[9.5px] mb-1 tracking-tight group-hover:text-emerald-300 transition-colors">
                                   {n.translatedTitle || n.title}
                                 </div>
                                 {n.description && (
                                   <p className="text-[8px] text-zinc-500 line-clamp-2 leading-relaxed font-sans mt-1">
                                     {n.description}
                                   </p>
                                 )}
                                 <div className="text-[7px] text-emerald-500/70 font-mono tracking-widest mt-2 uppercase font-black flex items-center gap-1 group-hover:text-emerald-400 transition-all">
                                   <Zap className="w-2.5 h-2.5 animate-pulse" /> TARGET_SYSTEM_BRIEFING &gt;
                                 </div>
                               </div>
                             );
                           })
                        ) : (
                          <div className="text-[9px] text-zinc-600 italic font-mono py-4 text-center border border-dashed border-zinc-900">
                            NO REAL-TIME COGNITIVE SIGNALS DETECTED
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {innerLeftTab === "HEATMAP" && (
                  <div className="space-y-4">
                    <div className="p-3 bg-black border border-zinc-900 rounded-sm">
                      <div className="flex items-center justify-between mb-3 border-b border-zinc-800 pb-2">
                         <div className="text-[10px] font-black font-mono text-emerald-500 flex items-center gap-2 tracking-widest">
                           <Activity className="w-3.5 h-3.5" />
                           NEURAL VOLATILITY HEATMAP
                         </div>
                         <div className="flex items-center gap-1">
                           <div className="w-1 h-1 bg-emerald-500 rounded-full" />
                           <div className="text-[7px] text-zinc-600 font-mono">LIVE_SCAN</div>
                         </div>
                      </div>
                      
                      <div className="h-16 mb-4 relative flex items-end gap-1 px-1 overflow-hidden border-b border-zinc-900/50">
                        <div className={cn(
                          "absolute inset-0 pointer-events-none transition-colors duration-1000",
                          calculatedRiskScore >= 75 ? "bg-red-950/10" : 
                          calculatedRiskScore >= 45 ? "bg-amber-950/10" :
                          "bg-emerald-950/10"
                        )} />
                        {[...Array(40)].map((_, i) => {
                          const baseHeight = 20 + (calculatedRiskScore * 0.4);
                          const variance = 20 + (calculatedRiskScore * 0.5);
                          return (
                            <div
                              key={i}
                              style={{
                                height: `${baseHeight + Math.random() * variance}%`,
                                opacity: calculatedRiskScore >= 75 ? 0.6 : 0.3
                              }}
                              className={cn(
                                "w-1 rounded-t-xs transition-colors duration-1000",
                                calculatedRiskScore >= 75 ? "bg-red-500/50" : 
                                calculatedRiskScore >= 45 ? "bg-amber-500/40" :
                                "bg-emerald-500/30"
                              )}
                            />
                          );
                        })}
                      </div>

                      <div className="grid grid-cols-5 gap-[1px] bg-zinc-900/50 p-[px] mb-2 border border-zinc-900/80">
                        {correlationMatrix.map((row, i) => (
                          row.map((val, j) => (
                            <div 
                              key={`${i}-${j}`}
                              className="aspect-square flex items-center justify-center relative group"
                              style={{ 
                                backgroundColor: i === j 
                                  ? "rgba(16, 185, 129, 0.5)" 
                                  : val > 0.8 
                                    ? `rgba(239, 68, 68, ${val})` 
                                    : val > 0.6 
                                      ? `rgba(245, 158, 11, ${val})` 
                                      : `rgba(16, 185, 129, ${val * 0.6})` 
                              }}
                            >
                              <span className="text-[5px] font-mono text-white opacity-0 group-hover:opacity-100 z-10 font-bold">
                                {(val * 100).toFixed(0)}
                              </span>
                              {/* Glitch overlay for high risk cells */}
                              {val > 0.8 && (
                                <div className="absolute inset-0 bg-red-500/10 pointer-events-none" />
                              )}
                            </div>
                          ))
                        ))}
                      </div>
                      
                      <div className="flex justify-between text-[6.5px] font-mono text-zinc-500 uppercase tracking-tighter">
                        <span>LIQ</span>
                        <span>GEO</span>
                        <span>SUP</span>
                        <span>CUR</span>
                        <span>CRE</span>
                      </div>
                    </div>
                    <div className="p-3 bg-zinc-900/20 border border-zinc-900 rounded-sm">
                      <div className="text-[8px] text-zinc-500 font-mono uppercase tracking-widest mb-2">Entropy Distribution Metrics</div>
                      <div className="flex items-center gap-3 mb-3 border-b border-zinc-900 pb-2">
                         <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 bg-emerald-500/60 rounded-2xs" />
                            <span className="text-[7px] text-zinc-500 font-bold uppercase">STABLE</span>
                         </div>
                         <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 bg-amber-500/80 rounded-2xs" />
                            <span className="text-[7px] text-zinc-500 font-bold uppercase">STRESS</span>
                         </div>
                         <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 bg-red-500 rounded-2xs" />
                            <span className="text-[7px] text-zinc-500 font-bold uppercase">CRITICAL</span>
                         </div>
                      </div>
                      <p className="text-[9px] text-zinc-400 font-mono leading-tight">
                        Neural correlation matrix calculates cross-asset entropy flows. Hot zones (Amber/Red) indicate synchronized volatility clusters triggered by chokepoint shocks.
                      </p>
                    </div>
                  </div>
                )}
                {innerLeftTab === "YIELD" && (
                  <div className="space-y-3">
                    <div className="p-2 border border-zinc-900/60 bg-zinc-900/10 flex flex-col rounded-sm">
                      <div className="text-[9px] font-black text-emerald-450 font-mono tracking-widest uppercase mb-1 flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                        Yield Curve: {yields?.country || "US TREASURIES"}
                      </div>
                      <p className="text-[8.5px] text-zinc-500 font-mono leading-normal">
                        Visualizing active term matrix spreads for system risk evaluation and interest trajectory calibration.
                      </p>
                    </div>
                    <YieldCurveMonitor yields={yields} />
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Dock */}
            <div className="h-[120px] border-t border-emerald-950 bg-black/90 flex flex-col">
              <div className="flex border-b border-emerald-950 text-[9px] font-mono">
                {["LOGISTICS", "LOGS", "PARTNERS"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveDockTab(tab as any)}
                    className={cn(
                      "flex-1 p-1.5",
                      activeDockTab === tab
                        ? "text-emerald-400"
                        : "text-emerald-700",
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <div className="flex-1 p-2 font-mono overflow-y-auto">
                {activeDockTab === "PARTNERS" && (
                  <div className="space-y-3 text-[8.5px]">
                    <div>
                      <span className="text-zinc-500 font-bold uppercase">USGS Hazards:</span>
                      {partnerData.usgs.map((h: any, i: number) => (
                        <div key={i} className="text-emerald-400">{h.properties.title}</div>
                      ))}
                    </div>
                    <div>
                      <span className="text-zinc-500 font-bold uppercase">Whale Alert:</span>
                      {partnerData.whaleAlert.map((t: any, i: number) => (
                        <div key={i} className="text-blue-400">{t.amount} {t.symbol}</div>
                      ))}
                    </div>
                    <div>
                      <span className="text-zinc-500 font-bold uppercase">GDELT Global Monitor:</span>
                      {partnerData.gdelt?.articles?.slice(0, 3).map((a: any, i: number) => (
                        <div key={i} className="text-zinc-400">{a.title}</div>
                      ))}
                    </div>
                  </div>
                )}
                {activeDockTab === "LOGISTICS" && (
                  <div className="space-y-1.5 text-[8.5px]">
                    <div className="flex items-center gap-1.5 bg-zinc-900/50 p-1 border border-zinc-900">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                      <span className="text-zinc-400">NODE STATUS: ACTIVE</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <div className="p-1 border border-zinc-900/50 bg-black">
                        <span className="text-zinc-600 block mb-0.5">
                          LATENCY (MS)
                        </span>
                        <span className="text-emerald-400 font-black">
                          12.4
                        </span>
                      </div>
                      <div className="p-1 border border-zinc-900/50 bg-black">
                        <span className="text-zinc-600 block mb-0.5">
                          UPLINK CAP
                        </span>
                        <span className="text-emerald-400 font-black">
                          99.8%
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                {activeDockTab === "LOGS" && (
                  <div className="space-y-0.5 text-[8px] leading-tight flex flex-col-reverse justify-end h-full">
                    {logs && logs.length > 0 ? (
                      logs
                        .slice(-6)
                        .reverse()
                        .map((log, i) => (
                          <div key={i} className="flex gap-1.5">
                            <span className="text-emerald-800 shrink-0">
                              [{new Date().toISOString().slice(11, 19)}]
                            </span>
                            <span className="text-emerald-400 break-all">
                              {log}
                            </span>
                          </div>
                        ))
                        .reverse()
                    ) : (
                      <div className="text-zinc-600 italic">
                        No system logs available
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </aside>
    );
  },
);
