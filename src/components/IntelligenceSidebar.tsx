import React, { useMemo, useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import { Company, COMPANIES } from "../data/companies";
import { useCompanies } from "../context/CompaniesContext";
import { formatSafeTime } from "../utils/date";
import {
  Newspaper,
  Activity,
  Zap,
  Globe as GlobeIcon,
  RefreshCcw,
  Link2,
  Box,
  ShieldAlert,
  MapPin,
  ChevronLeft,
  ChevronRight,
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
  Compass,
  Filter,
  Users,
  TrendingUp,
  Bot,
  Send,
  MessageSquare,
  Sparkles,
  Lock,
} from "lucide-react";
import { formatCurrency, cn, getApiBaseUrl } from "../lib/utils";
import { analyzeSentimentAndImpact } from "../lib/sentiment";
import { SupplyChainPanel } from "./SupplyChainPanel";
import { MacroCorridor } from "./yield-terminal/MacroCorridor";
import { YieldCurveMonitor } from "./YieldCurveMonitor";

import { SectorRotation } from "./SectorRotation";

import { motion, AnimatePresence } from "motion/react";

interface IntelligenceSidebarProps {
  selectedStock: Company | null;
  quote: any;
  accumulatedNews: any[];
  financials: any[];
  profile: any;
  history: any[];
  isAiProcessing: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onSelectNode: (
    c: Company,
    skipFetch?: boolean,
    isSearch?: boolean,
    activeStoryContext?: any,
  ) => void;
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
  toggleFocusMode?: () => void;
  isFocusMode: boolean;
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
  shocks?: {
    taiwanStraitBlocked: boolean;
    suezCanalBlocked: boolean;
    malaccaStraitBlocked: boolean;
    panamaCanalBlocked: boolean;
    hormuzStraitBlocked: boolean;
  };
  setShocks?: {
    setTaiwanStraitBlocked: (v: boolean) => void;
    setSuezCanalBlocked: (v: boolean) => void;
    setMalaccaStraitBlocked: (v: boolean) => void;
    setPanamaCanalBlocked: (v: boolean) => void;
    setHormuzStraitBlocked: (v: boolean) => void;
  };
  mitigations?: {
    airFreightActive: boolean;
    strategicStockpileActive: boolean;
    dualSourcingActive: boolean;
  };
  setMitigations?: {
    setAirFreightActive: (v: boolean) => void;
    setStrategicStockpileActive: (v: boolean) => void;
    setDualSourcingActive: (v: boolean) => void;
  };
  isAutopilot?: boolean;
  setIsAutopilot?: (v: boolean) => void;
  viewportLock?: boolean;
  setViewportLock?: (v: boolean) => void;
  autoRotateEnabled?: boolean;
  setAutoRotateEnabled?: (v: boolean) => void;
  isVocalizerEnabled?: boolean;
  setIsVocalizerEnabled?: (v: boolean) => void;
  isLiveNewsZoomEnabled?: boolean;
  onAgentSearch?: (query: string) => Promise<any>;
  isAgentSearching?: boolean;
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
        <span className="inline-block w-1.5 h-3 bg-emerald-500 ml-1 translate-y-0.5 opacity-80" />
      )}
    </div>
  );
};

const NeuralStreamHeader = ({ riskScore }: { riskScore: number }) => {
  const colorStyle =
    riskScore >= 75
      ? "text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]"
      : riskScore >= 45
        ? "text-amber-500"
        : "text-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]";
  const jitter = "";

  return (
    <div className="flex flex-col border-b border-zinc-900 bg-black">
      <div className="flex items-center gap-3 px-3 py-1.5 overflow-hidden select-none relative group border-b border-zinc-900/50">
        <div
          className={cn(
            "text-[7px] font-mono tracking-[0.3em] font-black uppercase whitespace-nowrap overflow-hidden flex gap-8",
            colorStyle,
            jitter,
          )}
        >
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
                ? riskScore >= 75
                  ? "bg-red-500"
                  : riskScore >= 45
                    ? "bg-amber-500"
                    : "bg-emerald-500"
                : "bg-zinc-900",
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
    accumulatedNews = [],
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
    toggleFocusMode,
    isFocusMode = true,
    activeCorridorId = null,
    onSelectCorridor,
    recentNewsContent = "",
    agentFocus = null,
    setAgentFocus,
    searchQuery,
    setSearchQuery,
    systemRiskScore = 25,
    threatLevelText = "DEFCON 5: OPTIMAL SECURITY",
    shocks = {
      taiwanStraitBlocked: false,
      suezCanalBlocked: false,
      malaccaStraitBlocked: false,
      panamaCanalBlocked: false,
      hormuzStraitBlocked: false,
    },
    setShocks,
    mitigations = {
      airFreightActive: false,
      strategicStockpileActive: false,
      dualSourcingActive: false,
    },
    setMitigations,
    isAutopilot = false,
    setIsAutopilot,
    viewportLock = false,
    setViewportLock,
    autoRotateEnabled = true,
    setAutoRotateEnabled,
    isVocalizerEnabled = false,
    setIsVocalizerEnabled,
    isLiveNewsZoomEnabled = false,
    onAgentSearch,
    isAgentSearching = false,
  }: IntelligenceSidebarProps) => {
    const { companies } = useCompanies();
    const {
      taiwanStraitBlocked,
      suezCanalBlocked,
      malaccaStraitBlocked,
      panamaCanalBlocked,
      hormuzStraitBlocked,
    } = shocks;
    const { airFreightActive, strategicStockpileActive, dualSourcingActive } =
      mitigations;
    const {
      setTaiwanStraitBlocked,
      setSuezCanalBlocked,
      setMalaccaStraitBlocked,
      setPanamaCanalBlocked,
      setHormuzStraitBlocked,
    } = setShocks || {};
    const {
      setAirFreightActive,
      setStrategicStockpileActive,
      setDualSourcingActive,
    } = setMitigations || {};

    const [localNewsSearch, setLocalNewsSearch] = useState("");
    const [isNewsLocked, setIsNewsLocked] = useState(false);
    
    const newsSearch =
      searchQuery !== undefined ? searchQuery : localNewsSearch;
    const setNewsSearch =
      setSearchQuery !== undefined ? setSearchQuery : setLocalNewsSearch;

    const [auditStatus, setAuditStatus] = useState<
      "idle" | "running" | "completed"
    >("idle");
    const [auditedItems, setAuditedItems] = useState<
      Record<string, "VERIFIED" | "FAILED">
    >({});
    const [innerLeftTab, setInnerLeftTab] = useState<
      "STRATEGY" | "LOGISTICS_COCKPIT" | "YIELD" | "SUPPLY_CHAIN" | "AI_AGENT" | "MACRO"
    >("STRATEGY");
    const [chatHistory, setChatHistory] = useState<Array<{
      role: 'user' | 'assistant';
      text: string;
      coordinates?: [number, number];
      locationName?: string;
      ticker?: string;
      facts?: string[];
    }>>([
      {
        role: 'assistant',
        text: "SECURE COGNITIVE UPLINK ESTABLISHED. I am your AI Market Intelligence Assistant. Ask me about custom supply chains, logistics chokepoints, upcoming IPOs, lithography key corridors, or sovereign trade lanes."
      }
    ]);
    const [aiInput, setAiInput] = useState("");
    const [isChatLoading, setIsChatLoading] = useState(false);
    
    const [stressors, setStressors] = useState<string[]>([
      "LIQUIDITY",
      "GEOPOLITICAL",
      "SUPPLY_CHAIN",
      "CURRENCY",
      "CREDIT",
    ]);

    const updateStressors = async () => {
      try {
        const response = await fetch("/api/ai/stressors", { method: "POST" });
        if (response.ok) {
          const data = await response.json();
          setStressors(data.stressors);
        }
      } catch (err) {
        console.error("Failed to update stressors:", err);
      }
    };

    const [strategySubTab, setStrategySubTab] = useState<
      "detailed" | "filtered"
    >("filtered");

    const [isSpeaking, setIsSpeaking] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const ttsCooldownRef = useRef<number>(0);
    const [isSpeechLoading, setIsSpeechLoading] = useState(false);



    const stopAllAudio = () => {
      // 1. Stop HTMLAudioElement
      if (audioRef.current) {
        try { audioRef.current.pause(); audioRef.current.currentTime = 0; } catch (err) {}
        audioRef.current = null;
      }
      
      // 2. Stop AudioContext Sources
      if ((window as any)._activeTtsSource) {
        try { (window as any)._activeTtsSource.stop(); } catch (e) {}
        (window as any)._activeTtsSource = null;
      }
      if ((window as any)._activeTtsSourceMap) {
        try { (window as any)._activeTtsSourceMap.stop(); } catch (e) {}
        (window as any)._activeTtsSourceMap = null;
      }
      
      // 3. Stop SpeechSynthesis
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      
      setIsSpeaking(false);
    };

    useEffect(() => {
      const handleTtsPlay = (e: Event) => {
        const customEvent = e as CustomEvent;
        if (customEvent.detail && customEvent.detail.origin !== "sidebar") {
          stopAllAudio();
        }
      };

      if (typeof window !== "undefined")
        window.addEventListener("app-tts-play", handleTtsPlay);

      return () => {
        stopAllAudio();
        if (typeof window !== "undefined")
          window.removeEventListener("app-tts-play", handleTtsPlay);
      };
    }, []);

    useEffect(() => {
      stopAllAudio();
    }, [innerLeftTab, selectedStock]);

    const triggerBrowserFallback = (text: string) => {
      if (!window.speechSynthesis) return;

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      let preferredVoice = voices.find(
        (v) =>
          v.lang.startsWith("en") &&
          (v.name.includes("Neural") ||
            v.name.includes("Natural") ||
            v.name.includes("Google")),
      );
      if (!preferredVoice)
        preferredVoice = voices.find((v) => v.lang.startsWith("en"));
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
      window.dispatchEvent(
        new CustomEvent("app-tts-play", { detail: { origin: "sidebar" } }),
      );
      if (window.speechSynthesis) window.speechSynthesis.cancel();
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
          body: JSON.stringify({ text: textToSpeak, voice: "Zephyr" }),
        });

        if (!response.ok) {
          if (response.status === 429) {
            ttsCooldownRef.current = Date.now() + 600000; // 10 minutes cooldown
            throw new Error("QUOTA_EXHAUSTED");
          }
          throw new Error("Voice transmission failed");
        }

        const data = await response.json();
        if (data.audio) {
          try {
            const audioCtx = new (
              window.AudioContext || (window as any).webkitAudioContext
            )({ sampleRate: 24000 });
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
            console.warn(
              "Direct PCM Decode/Playback failed, trying HTML5 Audio node",
              pcmErr,
            );
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
        if (
          err.message !== "QUOTA_EXHAUSTED" &&
          err.message !== "Failed to fetch"
        ) {
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
      "SYSTEM: Multi-tier material dependencies indexed.",
    ]);

    const dispatchLog = (msg: string) => {
      const timestamp = new Date().toISOString().slice(11, 19);
      setLocalLogisticsLogs((prev) => [
        `[${timestamp}] ${msg}`,
        ...prev.slice(0, 14),
      ]);
    };

    const calculatedRiskScore = systemRiskScore;

    // Material supply catalog based on stock sector
    const SOURCED_MATERIALS = useMemo(() => {
      if (!selectedStock || !selectedStock.sector) return [];
      const sector = (selectedStock.sector || "").toLowerCase();
      if (sector.includes("semi") || sector.includes("chips")) {
        return [
          {
            name: "Monolithic Silicon Wafers (3nm/4nm)",
            type: "Critical Substrate",
            vulnerability: "Critical Taiwan Strait",
            quantity: "45,000 Pcs/mo",
          },
          {
            name: "EUV Reflex Optics Lens Assemblies",
            type: "Key Capital Machinery",
            vulnerability: "Sole-Source Netherlands",
            quantity: "2 Pcs/qtr",
          },
          {
            name: "Ultra-pure Photoresists & Cleansers",
            type: "Process Consumables",
            vulnerability: "High-beta Japan",
            quantity: "240 Tons/mo",
          },
          {
            name: "Liquid Neon Chalcogenide Gas",
            type: "Atmospheric Laser Gas",
            vulnerability: "High-beta Eastern Union",
            quantity: "4,500 Liters/mo",
          },
        ];
      }
      if (
        sector.includes("energy") ||
        sector.includes("oil") ||
        sector.includes("gas")
      ) {
        return [
          {
            name: "Raw Crude Light-Sweet feedstock",
            type: "Direct Refinery Input",
            vulnerability: "High Suez transit gate",
            quantity: "1.2M Bbl/day",
          },
          {
            name: "Bituminous Heavy Diluents",
            type: "Blend Modifier",
            vulnerability: "Regional Pipeline block",
            quantity: "400k Bbl/day",
          },
          {
            name: "Crystalline drilling catalyst powders",
            type: "Extraction catalyst",
            vulnerability: "Sole-source China",
            quantity: "18 Tons/mo",
          },
          {
            name: "Liquefied cryogenic ethane feedstocks",
            type: "Gas cracker input",
            vulnerability: "Critical Hormuz Strait",
            quantity: "850k Metric Tons",
          },
        ];
      }
      if (
        sector.includes("auto") ||
        sector.includes("vehicle") ||
        sector.includes("indust")
      ) {
        return [
          {
            name: "Lithium carbonate chemical brine",
            type: "Battery anode cells",
            vulnerability: "High Chile/Argentina",
            quantity: "8,500 Tons/mo",
          },
          {
            name: "Class-1 High-purity Nickel plates",
            type: "Battery cathode casing",
            vulnerability: "Medium Southeast Asia",
            quantity: "14k Tons/mo",
          },
          {
            name: "Neodymium-iron-boron rare magnets",
            type: "Brushless motor rotor",
            vulnerability: "Critical China Import",
            quantity: "35k Units/mo",
          },
          {
            name: "Cold-rolled structural steel coils",
            type: "Chassis structural frame",
            vulnerability: "Standard domestic",
            quantity: "120k Tons/mo",
          },
        ];
      }
      if (
        sector.includes("consum") ||
        sector.includes("retail") ||
        sector.includes("lux")
      ) {
        return [
          {
            name: "Organic long-staple cotton bales",
            type: "Primary textile material",
            vulnerability: "Sea shipping delays",
            quantity: "450k Bales/mo",
          },
          {
            name: "Ethylene-vinyl acetate copolymers",
            type: "Footwear sole mold",
            vulnerability: "Standard logistics",
            quantity: "3,800 Tons/mo",
          },
          {
            name: "Uncoated sulfate wood pulp board",
            type: "Retail product packaging",
            vulnerability: "Panama Canal queue",
            quantity: "18k Tons/mo",
          },
        ];
      }
      return [
        {
          name: "Refined copper alloy connector pins",
          type: "Electronic subassemblies",
          vulnerability: "Standard Global",
          quantity: "3.2M Units/mo",
        },
        {
          name: "Recycled thermoplastic granulates",
          type: "Instrument enclosures",
          vulnerability: "Low",
          quantity: "420 Tons/mo",
        },
        {
          name: "Packaging protective structural foam",
          type: "Logistics buffer material",
          vulnerability: "Low",
          quantity: "50k Cases/mo",
        },
      ];
    }, [selectedStock]);

    // Dynamic, interactive chokepoint simulation audit results
    const dynamicAuditedItems = useMemo(() => {
      const items: Record<
        string,
        { status: "VERIFIED" | "FAILED" | "WARN"; reason: string }
      > = {};
      const list = [
        ...(relationships.suppliers || []),
        ...(relationships.customers || []),
      ];

      list.forEach((item) => {
        const itemSector = item.sector?.toLowerCase() || "";
        let failed = false;
        let warning = false;
        let reason = "All supply handshakes verified within nominal bounds.";

        if (
          taiwanStraitBlocked &&
          (itemSector.includes("semi") ||
            item.symbol === "TSM" ||
            item.symbol === "AAPL" ||
            item.symbol === "NVDA")
        ) {
          failed = true;
          reason =
            "Taiwan Air-Sea airspace restrictions block high-beta silicon wafer flows.";
        } else if (
          hormuzStraitBlocked &&
          (itemSector.includes("energy") ||
            item.symbol === "ARAMCO" ||
            item.symbol === "XOM" ||
            item.symbol === "CVX" ||
            item.symbol === "SHEL")
        ) {
          failed = true;
          reason =
            "Strait of Hormuz closure blocks primary global energy transit corridor (21 million bpd risk).";
        } else if (
          suezCanalBlocked &&
          (itemSector.includes("energy") ||
            item.symbol === "ARAMCO" ||
            item.symbol === "SHEL" ||
            item.symbol === "XOM")
        ) {
          failed = true;
          reason =
            "Maritime blockages at Suez mandate detour around Cape of Good Hope (+12 days detour delay).";
        } else if (
          malaccaStraitBlocked &&
          (item.symbol === "TSM" || item.symbol === "AMZN")
        ) {
          warning = true;
          reason =
            "Malacca Strait demurrage bottleneck limits logistics throughput.";
        } else if (
          panamaCanalBlocked &&
          (itemSector.includes("consum") || item.symbol === "AMZN")
        ) {
          warning = true;
          reason =
            "Panama draft constraints create transit queues and shipping scheduling locks.";
        }

        // Adjust based on active mitigations
        let finalStatus: "VERIFIED" | "FAILED" | "WARN" = failed
          ? "FAILED"
          : warning
            ? "WARN"
            : "VERIFIED";

        if (
          finalStatus === "FAILED" &&
          (dualSourcingActive || strategicStockpileActive)
        ) {
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
      return stressors.map((s1) =>
        stressors.map((s2) => {
          if (s1 === s2) return 1.0;
          // Synthetic correlations that react slightly to stressors
          let val = 0.3 + Math.random() * 0.4;
          if (
            (s1 === "GEOPOLITICAL" || s2 === "GEOPOLITICAL") &&
            taiwanStraitBlocked
          )
            val += 0.2;
          if (
            (s1 === "SUPPLY_CHAIN" || s2 === "SUPPLY_CHAIN") &&
            suezCanalBlocked
          )
            val += 0.25;
          return Math.min(0.99, val);
        }),
      );
    }, [
      taiwanStraitBlocked,
      suezCanalBlocked,
      malaccaStraitBlocked,
      panamaCanalBlocked,
      hormuzStraitBlocked,
      stressors,
    ]);

    const [sentimentFilter, setSentimentFilter] = useState<
      "ALL" | "BULLISH" | "BEARISH" | "NEUTRAL"
    >("ALL");
    const [impactFilter, setImpactFilter] = useState<
      "ALL" | "CRITICAL" | "MODERATE" | "ROUTINE"
    >("ALL");
    const [selectedSourceFilter, setSelectedSourceFilter] = useState<
      "ALL" | "YAHOO" | "FINNHUB"
    >("ALL");
    const [selectedSectorFilter, setSelectedSectorFilter] = useState<string>("ALL");

    const distinctSectors = useMemo(() => {
      const sectors = new Set<string>();
      accumulatedNews.forEach((item) => {
        const compSym = item.symbol || item.ticker || "";
        const found = COMPANIES.find((c) => c.symbol === compSym);
        if (found && found.sector) {
          sectors.add(found.sector);
        }
      });
      return Array.from(sectors);
    }, [accumulatedNews]);

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
      return accumulatedNews.filter((item) => {
        // Filter by the selected ticker under Data Tel Stream in the left sidebar
        if (!isNewsLocked && selectedStock?.symbol) {
          const compSym = (item.symbol || item.ticker || item.related || "").toUpperCase();
          if (compSym !== selectedStock.symbol.toUpperCase()) return false;
        }

        const titleSafe = String(item.title || "");
        const summarySafe = String(item.summary || item.description || "");
        
        // Strict movie and entertainment filter for high-integrity news
        const textLower = (titleSafe + " " + summarySafe).toLowerCase();
        const movieKeywords = [
          "movie", "cinema", "hollywood", "celebrity", "gossip", "album", "music",
          "tv show", "television", "netflix", "box office", "pop star", "red carpet",
          "sports", "championship", "hbo", "concert", "film", "actor", "actress",
          "trailer", "starring", "hulu", "disney+", "streaming", "premiere", "cast",
          "screenplay", "director", "directed", "co-star", "co-stars", "oscar", "oscars",
          "golden globe", "golden globes", "theatre", "theater", "showtime", "apple tv",
          "paramount+", "peacock tv"
        ];
        if (movieKeywords.some(kw => textLower.includes(kw))) {
          return false;
        }

        const matchesSearch =
          titleSafe.toLowerCase().includes((newsSearch || "").toLowerCase()) ||
          summarySafe.toLowerCase().includes((newsSearch || "").toLowerCase());

        if (!matchesSearch) return false;

        const { sentiment: compSentiment, impact: compImpact } =
          analyzeSentimentAndImpact(item);

        if (sentimentFilter !== "ALL" && compSentiment !== sentimentFilter)
          return false;
        if (impactFilter !== "ALL" && compImpact !== impactFilter) return false;

        // Source Filter
        const s = (item.source || "").toLowerCase();
        if (selectedSourceFilter === "YAHOO" && !s.includes("yahoo")) return false;
        if (selectedSourceFilter === "FINNHUB" && (s.includes("yahoo") || s === "")) return false;

        // Sector Filter
        if (selectedSectorFilter !== "ALL") {
          const compSym = item.symbol || item.ticker || "";
          const foundCompany = COMPANIES.find(c => c.symbol === compSym);
          const itemSector = foundCompany ? foundCompany.sector : "Other";
          if (itemSector !== selectedSectorFilter) return false;
        }

        return true;
      });
    }, [accumulatedNews, newsSearch, sentimentFilter, impactFilter, selectedSourceFilter, selectedSectorFilter, selectedStock?.symbol, isNewsLocked]);

    // Synchronize local isSpeaking state to global app level via custom events
    useEffect(() => {
      if (isSpeaking) {
        window.dispatchEvent(new CustomEvent("app-speech-start"));
      } else {
        window.dispatchEvent(new CustomEvent("app-speech-end"));
      }
    }, [isSpeaking]);

    // Read down the filtered news list for the selected ticker on VOCALIZER button push (app-vocalize-news event)
    useEffect(() => {
      const handleTriggerVocalizer = () => {
        const symbol = selectedStock?.symbol || "";
        const targetLabel = symbol ? `selected ticker ${symbol}` : "filtered assets";
        
        // Filter by selectedStock just to be absolutely sure we read the selected ticker
        const relevantNews = filteredNews.filter(item => {
          if (!symbol) return true;
          const sym = (item.symbol || item.ticker || "").toUpperCase();
          return sym === symbol.toUpperCase();
        });

        if (relevantNews.length > 0) {
          // Separate the newest headline from the list of reports
          const currentLatest = relevantNews[0];
          const priorReports = relevantNews.slice(1, 4);

          let speechText = "";
          if (priorReports.length > 0) {
            const reportsText = priorReports
              .map((r, i) => `Report ${i + 1}: ${r.headline || r.title}`)
              .join(". ");
            
            speechText = `Intelligence briefing for ${targetLabel}. Curated reports are: ${reportsText}. Finally, newly arrived news headline: ${currentLatest.headline || currentLatest.title}.`;
          } else {
            speechText = `Intelligence briefing for ${targetLabel}. Curated report is: ${currentLatest.headline || currentLatest.title}.`;
          }
          handleSpeak(speechText);
        } else {
          handleSpeak(`No curated intelligence reports found for ${targetLabel}.`);
        }
      };

      window.addEventListener("app-vocalize-news", handleTriggerVocalizer);
      return () => {
        window.removeEventListener("app-vocalize-news", handleTriggerVocalizer);
      };
    }, [filteredNews, selectedStock?.symbol]);

    // Keep chat history synchronized with global agentFocus updates
    useEffect(() => {
      if (agentFocus && (agentFocus.briefing || agentFocus.explanation)) {
        const text = agentFocus.briefing || agentFocus.explanation;
        setChatHistory(prev => {
          const lastMsg = prev[prev.length - 1];
          if (lastMsg && lastMsg.text === text && lastMsg.role === "assistant") {
            return prev;
          }
          return [
            ...prev,
            {
              role: "assistant",
              text: text,
              coordinates: [agentFocus.lat, agentFocus.lng],
              locationName: agentFocus.locationName || "GROUNDED TARGET",
              ticker: agentFocus.ticker,
              facts: agentFocus.facts,
            }
          ];
        });
      }
    }, [agentFocus]);

    // --- Cognitive Synthesis Agent Logic REMOVED (Moved to Deck) ---

    const hasIntelData = true;

    if (false) {
      return (
        <aside className="w-52 border-l border-zinc-800 flex flex-col bg-black z-20 shrink-0 select-none overflow-hidden font-mono">
          <div className="p-3 border-b border-zinc-900 bg-black flex flex-col mb-1 shrink-0 font-mono">
            <div className="text-[7.5px] text-zinc-550 font-mono font-black tracking-widest uppercase">
              AI INTEL MATRIX
            </div>
            <div className="flex items-center gap-1.5 bg-black/50 px-1 py-0.5 border border-zinc-900 w-fit mt-1">
              <span className="w-1.5 h-1.5 bg-red-500 animate-pulse" />
              <span className="text-[8px] text-zinc-400 font-mono tracking-widest uppercase font-black">
                SYS.IDLE
              </span>
            </div>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center p-4 text-center bg-black relative overflow-hidden font-mono">
            <div>
              <Activity className="w-8 h-8 text-zinc-800 mb-3" />
            </div>
            <h3 className="font-mono text-zinc-500 uppercase tracking-widest font-black text-[9.5px] border border-zinc-900 px-2 py-1 bg-black">
              TARGET REQUIRED
            </h3>
            <p className="text-zinc-650 font-mono uppercase tracking-wider text-[7px] mt-4 leading-relaxed max-w-[155px]">
              Select a target asset from the left panel to synthesize AI
              intelligence coordinates, or search using the intel bar.
            </p>
          </div>
        </aside>
      );
    }

    return (
      <aside
        className={cn(
          "h-full border-l border-zinc-800 flex flex-col bg-black z-20 shrink-0 select-none overflow-hidden relative transition-all duration-150",
          "w-full shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] border-r border-zinc-900",
        )}
      >
        {isFocusMode && <div className="scanline-overlay" />}
      <div 
        className={cn(
          "h-11 border-b border-zinc-900 bg-zinc-950/95 flex items-center shrink-0 relative overflow-hidden group cursor-pointer hover:bg-zinc-900/40 transition-colors",
          isMinimized ? "justify-center px-0" : "justify-between px-3"
        )}
        onClick={isMinimized ? onToggleMinimize : undefined}
      >
        {/* Hardware Markers */}
        <div className="absolute top-0 left-0 w-[2px] h-[2px] bg-zinc-700 m-1 rounded-full opacity-60" />
        <div className="absolute top-0 right-0 w-[2px] h-[2px] bg-zinc-700 m-1 rounded-full opacity-60" />
        <div className="absolute bottom-0 left-0 w-[2px] h-[2px] bg-zinc-700 m-1 rounded-full opacity-60" />
        <div className="absolute bottom-0 right-0 w-[2px] h-[2px] bg-zinc-700 m-1 rounded-full opacity-60" />
        
        {/* Bezel Accents */}
        <div className="absolute top-0 left-0 w-8 h-[1px] bg-emerald-500/10" />
        <div className="absolute top-0 left-0 w-[1px] h-8 bg-emerald-500/10" />
        <div className="absolute top-0 right-0 w-8 h-[1px] bg-emerald-500/10" />
        <div className="absolute top-0 right-0 w-[1px] h-8 bg-emerald-500/10" />
        
        <div className={cn("flex items-center z-10 w-full", isMinimized ? "justify-center" : "gap-2.5")}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleMinimize();
            }}
            className="hidden md:flex relative w-5 h-5 items-center justify-center transition-all duration-200 active:scale-95 group/btn cursor-pointer"
            title={isMinimized ? "Expand Intelligence" : "Minimize Intelligence"}
          >
            <div className="absolute inset-0 bg-emerald-500/5 rotate-45 border border-emerald-500/30 group-hover/btn:bg-emerald-500/15 group-hover/btn:border-emerald-500/50 transition-all duration-200" />
            <div className="relative z-10 text-emerald-400 group-hover/btn:text-emerald-300 transition-colors flex items-center justify-center">
              {isMinimized ? (
                <ChevronLeft className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </div>
          </button>

          {!isMinimized && (
            <div className="flex items-center gap-2.5">
              <div className="relative flex items-center justify-center">
                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-[0_0_8px_#10b981]" />
                <div className="absolute w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping opacity-40" />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white font-mono truncate leading-none">
                  INTEL_COCKPIT_V4
                </span>
                {!isFocusMode && (
                  <span className="text-[6px] text-emerald-400 font-mono font-black tracking-widest mt-0.5 animate-pulse">
                    [SYSTEM_ENHANCED_MODE]
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {!isMinimized && (
        <div className="px-3.5 pt-3 flex-shrink-0 bg-transparent">
          <div className="flex gap-1.5 items-center bg-zinc-950 p-1.5 border border-zinc-900 rounded-sm select-none">
            <Filter className="w-3.5 h-3.5 text-zinc-500 ml-1 shrink-0" />
            <input
              type="text"
              value={newsSearch}
              onChange={(e) => setNewsSearch(e.target.value)}
              placeholder="Filter intel signals..."
              className="bg-transparent border-0 ring-0 focus:ring-0 focus:outline-none font-mono text-[8.5px] text-zinc-300 placeholder-zinc-700 flex-1 min-w-0"
            />
          </div>
        </div>
      )}

             <div className="flex-1 flex flex-col min-h-0">
              {/* Inner Switch Row */}
              <div className="flex bg-black shrink-0 border-b border-zinc-900 h-11 p-1.5 gap-px select-none overflow-x-auto scrollbar-none transition-all duration-150">
                {[
                  ...(selectedStock ? [
                    {
                      id: "LOGISTICS_COCKPIT",
                      label: "LOGISTICS_V3",
                      icon: <Network className="w-3 h-3" />,
                    }
                  ] : []),
                  {
                    id: "STRATEGY",
                    label: selectedStock ? "NEWS_FEED" : "TACTICAL_FEED",
                    icon: <MapPin className="w-3 h-3" />,
                  },
                  {
                    id: "AI_AGENT",
                    label: "AI_AGENT",
                    icon: <Bot className="w-3 h-3" />,
                  },
                  {
                    id: "MACRO",
                    label: "MACRO",
                    icon: <GlobeIcon className="w-3 h-3" />,
                  },
                ].map((sub) => (
                  <button
                    key={sub.id}
                    id={`btn-tab-${sub.id}`}
                    onClick={() => {
                      setInnerLeftTab(sub.id as any);
                    }}
                    className={cn(
                      "flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 text-[7.5px] font-mono transition-all border shrink-0 active:scale-95",
                      innerLeftTab === sub.id
                        ? "bg-zinc-900 border-zinc-700 text-emerald-400 font-black"
                        : "bg-black border-zinc-900 text-zinc-600 hover:text-zinc-500 hover:bg-zinc-950",
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      {sub.icon}
                      <span className="truncate tracking-widest">{sub.label}</span>
                    </div>
                    {innerLeftTab === sub.id && <div className="h-[2px] w-4 bg-emerald-500/80 mt-0.5" />}
                  </button>
                ))}
              </div>

              {/* PERMANENT YIELD STRUCTURE MONITOR REMOVED */}

               <div className={cn("p-3.5 flex-1 flex flex-col h-full custom-scrollbar min-h-0", (innerLeftTab === "MACRO" || innerLeftTab === "AI_AGENT") ? "overflow-hidden" : "overflow-y-auto")}>
                {/* STRATEGY TAB CONTENT */}
                {innerLeftTab === "STRATEGY" && (
                   <div className="space-y-4">
                     {/* LABOR INTELLIGENCE ASSESSMENT - Requested to highlight hiring likelihood */}
                     {selectedStock && (selectedStock.turnover || selectedStock.hiringLikelihood) && (
                       <div className="bg-zinc-950/50 border border-emerald-500/10 rounded-sm p-3 relative overflow-hidden group">
                         <div className="absolute top-0 right-0 p-1">
                           <Users className="w-2 h-2 text-emerald-500/20" />
                         </div>
                         <div className="flex items-center gap-2 mb-3">
                           <div className="w-1 h-3 bg-emerald-500" />
                           <span className="text-[8px] font-black tracking-widest text-emerald-500 uppercase font-mono">LABOR_MARKET_INTEL</span>
                         </div>

                         <div className="grid grid-cols-2 gap-4 mb-3">
                           <div>
                             <div className="text-[6px] text-zinc-650 uppercase font-bold mb-1">Systemic Turnover</div>
                             <div className="text-xs font-mono font-black text-rose-400">{selectedStock.turnover || "12.4%"}</div>
                           </div>
                           <div>
                             <div className="text-[6px] text-zinc-650 uppercase font-bold mb-1">Hiring Outlook</div>
                             <div className={cn(
                               "text-xs font-mono font-black",
                               selectedStock.hiringLikelihood === "High" ? "text-emerald-400" : 
                               selectedStock.hiringLikelihood === "Moderate" ? "text-blue-400" : "text-zinc-500"
                             )}>
                               {(selectedStock.hiringLikelihood || "STABLE").toUpperCase()}
                             </div>
                           </div>
                         </div>

                         <div className="text-[7px] text-zinc-500 leading-relaxed font-mono border-t border-zinc-900 pt-2">
                           <span className="text-zinc-300 font-bold">BRIEFING:</span> Workforce churn in the {selectedStock.sector} sector remains {parseFloat(selectedStock.turnover || "12") > 20 ? "Elevated" : "Nominal"}. 
                           {selectedStock.hiringLikelihood === "High" 
                             ? " Recruitment velocity suggests upcoming capital projects or infrastructure scaling."
                             : " Talent retention protocols are currently prioritized over aggressive headcount expansion."}
                         </div>
                       </div>
                     )}

                     <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <div className="w-1 h-3 bg-emerald-500/50 rounded-full" />
                            <motion.div 
                              animate={{ opacity: [0.2, 1, 0.2] }}
                              transition={{ duration: 1.5, repeat: Infinity }}
                              className="absolute inset-0 bg-emerald-400 blur-[2px] rounded-full" 
                            />
                          </div>
                          <span className="text-[9px] text-zinc-400 font-black tracking-[0.15em] uppercase font-mono">
                            {selectedStock ? `LIVE_COGNITIVE_FEED: ${selectedStock.symbol}` : "GLOBAL_INTELLIGENCE_STREAM"}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          {isAiProcessing && (
                            <div className="flex items-center gap-1.5 border border-emerald-500/30 px-1.5 py-0.5 bg-emerald-500/5">
                              <RefreshCcw className="w-2 h-2 text-emerald-500 animate-spin" />
                              <span className="text-[6px] text-emerald-500 font-black font-mono animate-pulse uppercase">Syncing_Nodes</span>
                            </div>
                          )}
                          {quotaExhausted && (
                            <span className="text-[7px] text-amber-500 border border-amber-500/30 px-1 py-0.5 font-bold animate-pulse">
                              LIMIT_EXCLUSION_ACTIVE
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Filter Bar Controls - Moved to top above Tabs */}

                      <div className="flex flex-wrap gap-1">
                        {/* Sentiment filter quick buttons */}
                        {["ALL", "BULLISH", "BEARISH", "NEUTRAL"].map((f) => (
                          <button
                            key={f}
                            onClick={() => setSentimentFilter(f as any)}
                            className={cn(
                              "text-[6.5px] font-mono px-1.5 py-0.5 border cursor-pointer uppercase transition-all rounded-2xs",
                              sentimentFilter === f
                                ? "bg-emerald-950/25 border-emerald-500/50 text-emerald-400 font-bold"
                                : "border-zinc-900 text-zinc-650 hover:text-zinc-400"
                            )}
                          >
                            {f}
                          </button>
                        ))}
                      </div>



                      {/* Sector filter quick buttons */}
                      <div className="flex flex-col gap-1.5 border-t border-zinc-900/60 pt-2 mt-1">
                        <span className="text-[6.5px] font-bold text-zinc-600 font-mono tracking-wider uppercase">SECTOR:</span>
                        <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto custom-scrollbar">
                          {["ALL", ...distinctSectors].map((sector) => {
                            const count = accumulatedNews.filter((item) => {
                              if (sector === "ALL") return true;
                              const compSym = item.symbol || item.ticker || "";
                              const found = COMPANIES.find((c) => c.symbol === compSym);
                              return found && found.sector === sector;
                            }).length;

                            return (
                              <button
                                key={sector}
                                onClick={() => setSelectedSectorFilter(sector)}
                                className={cn(
                                  "text-[6px] font-mono px-1.5 py-0.5 border cursor-pointer uppercase transition-all rounded-2xs flex items-center gap-1",
                                  selectedSectorFilter === sector
                                    ? "bg-amber-950/35 border-amber-500/50 text-amber-500 font-extrabold shadow-[0_0_8px_rgba(245,158,11,0.15)]"
                                    : "border-zinc-900 text-zinc-650 hover:text-zinc-400"
                                )}
                              >
                                {sector}
                                <span className={cn(
                                  "text-[5px] font-mono font-black border rounded-xs px-0.5",
                                  selectedSectorFilter === sector ? "bg-amber-500/20 text-amber-300 border-amber-500/30" : "bg-black text-zinc-600 border-zinc-900"
                                )}>
                                  {count}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* News List */}
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[6.5px] font-bold text-zinc-600 font-mono tracking-wider uppercase">NEWS_FEED:</span>
                        <button
                          onClick={() => setIsNewsLocked(!isNewsLocked)}
                          className={cn("p-0.5 rounded-xs hover:bg-zinc-900 transition-colors", isNewsLocked ? "text-amber-500" : "text-zinc-600")}
                          title={isNewsLocked ? "Unlock feed" : "Lock feed"}
                        >
                          <Lock className={cn("w-3 h-3", isNewsLocked ? "fill-current" : "")} />
                        </button>
                      </div>
                      {filteredNews.length > 0 ? (
                        <div className="space-y-3 pr-0.5">
                          {filteredNews.slice(0, 10).map((item: any, idx: number) => {
                            const { sentiment: compSentiment, impact: compImpact, strength: compStrength } =
                              analyzeSentimentAndImpact(item);
                            return (
                              <div
                                key={idx}
                                onClick={() => {
                                  const compSym = item.symbol || item.ticker || "";
                                  const foundCompany = COMPANIES.find(c => c.symbol === compSym);
                                  if (foundCompany) {
                                    onSelectNode(foundCompany, false, false, item);
                                    setInnerLeftTab("STRATEGY");
                                    
                                    if (isVocalizerEnabled) {
                                      handleSpeak(item.title + (item.summary || item.description ? ". " + (item.summary || item.description) : ""));
                                    }
                                  }
                                }}
                                className={cn(
                                  "group border bg-black/40 backdrop-blur-sm cursor-pointer active:scale-[0.99] transition-all rounded-xs font-mono overflow-hidden flex flex-col relative",
                                  (item.source || "").toLowerCase().includes("yahoo")
                                    ? "border-zinc-800 hover:border-purple-900/50"
                                    : "border-zinc-800 hover:border-emerald-900/50"
                                )}
                              >
                                {compImpact === "CRITICAL" && (
                                  <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none overflow-hidden">
                                    <div className="absolute top-0 right-0 bg-red-500/10 text-red-500 text-[5px] font-black rotate-45 translate-x-6 translate-y-3 py-0.5 px-6 uppercase tracking-widest border-y border-red-500/20">
                                      SHOCK
                                    </div>
                                  </div>
                                )}
                                
                                <div className="flex justify-between items-center px-2 py-1 bg-zinc-900/40 border-b border-zinc-900/60 select-none group-hover:bg-zinc-900/60 transition-colors">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[6.5px] text-zinc-500 font-bold tracking-widest uppercase flex items-center gap-1.5">
                                      <span className="w-1 h-1 bg-zinc-600 rounded-full" />
                                      PKT_{idx.toString().padStart(3, '0')}
                                    </span>
                                  </div>
                                  <div className="flex gap-2 shrink-0 items-center">
                                    <div className="w-16 h-1 bg-zinc-900 rounded-full overflow-hidden">
                                       <div 
                                         className={cn(
                                           "h-full transition-all duration-1000",
                                           compSentiment === "BULLISH" ? "bg-emerald-500" : compSentiment === "BEARISH" ? "bg-red-500" : "bg-zinc-600"
                                         )} 
                                         style={{ width: `${compStrength}%` }}
                                       />
                                    </div>
                                    <span
                                      className={cn(
                                        "font-black uppercase text-[6px] tracking-widest",
                                        compSentiment === "BULLISH"
                                          ? "text-emerald-500"
                                          : compSentiment === "BEARISH"
                                            ? "text-rose-500"
                                            : "text-zinc-500"
                                      )}
                                    >
                                      {compSentiment}
                                    </span>
                                  </div>
                                </div>
                                <div className="p-2.5 space-y-2">
                                  <h4 className="text-[9.5px] font-sans font-bold leading-snug text-white/90 group-hover:text-white transition-colors">
                                    {item.intelligence?.translatedTitle || item.title}
                                  </h4>
                                  
                                  {item.intelligence?.relationshipImplications && (
                                    <div className="text-[7.5px] text-emerald-500/60 font-mono italic leading-tight pl-2 border-l border-emerald-500/20 py-0.5">
                                      Neural Projection: {item.intelligence.relationshipImplications}
                                    </div>
                                  )}

                                  <div className="flex items-center justify-between pt-1">
                                    <div className="flex items-center gap-3">
                                      <span className="text-[6.5px] text-zinc-600 font-bold uppercase">{formatSafeTime(item.datetime)}</span>
                                      <div className="flex items-center gap-1 text-[6.5px] text-zinc-700 font-mono">
                                        <GlobeIcon className="w-2.5 h-2.5" />
                                        <span>LOC::GLOBAL</span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleSpeak(item.title + (item.summary || item.description ? ". " + (item.summary || item.description) : ""));
                                        }}
                                        className="text-emerald-500/55 hover:text-emerald-400 focus:outline-none transition-colors border border-emerald-500/30 rounded-2xs px-1.5 py-0.5 bg-emerald-500/5 hover:bg-emerald-500/20 flex items-center gap-1"
                                        title="Play Synthesis"
                                      >
                                        <Play className="w-2 h-2" />
                                        <span className="text-[5.5px] uppercase font-black tracking-widest leading-none">AUDIO</span>
                                      </button>
                                      <span className={cn(
                                        "text-[6.5px] font-black uppercase tracking-tighter px-1 rounded-2xs border",
                                        compImpact === "CRITICAL" ? "text-red-500 border-red-500/30 bg-red-500/5 animate-pulse" : "text-zinc-700 border-zinc-900"
                                      )}>
                                        IMPACT::{compImpact}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-6 text-zinc-600 text-[8px] font-mono border border-zinc-900/60">
                          NO ACTIVE NEWS SIGNALS FOUND
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* LOGISTICS COCKPIT TAB CONTENT */}
                {innerLeftTab === "LOGISTICS_COCKPIT" && selectedStock && (
                  <div className="space-y-4">
                    {/* Sourced Critical Material Inventory */}
                    {SOURCED_MATERIALS && SOURCED_MATERIALS.length > 0 && (
                      <div className="p-3 bg-black border border-zinc-900 rounded-sm space-y-3">
                        <div className="flex items-center justify-between border-b border-zinc-900 pb-2 select-none font-mono">
                          <div className="flex items-center gap-2">
                            <div className="w-1 h-3 bg-emerald-500/50 rounded-full" />
                            <span className="text-[9px] text-zinc-400 font-black tracking-[0.15em] uppercase">MATERIAL_INVENTORY_ROOT</span>
                          </div>
                          <span className="text-[7.5px] bg-emerald-950/30 text-emerald-400 px-1.5 py-0.5 border border-emerald-900/30 font-bold uppercase">
                            VULN_SCAN_ACTIVE
                          </span>
                        </div>

                        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                          {SOURCED_MATERIALS.map((mat, idx) => {
                            const isHighRisk =
                              (mat.vulnerability || "")
                                .toLowerCase()
                                .includes("critical") ||
                              (mat.vulnerability || "")
                                .toLowerCase()
                                .includes("high");
                            return (
                              <div
                                key={idx}
                                className="p-2 bg-black/60 border border-zinc-900/40 rounded-sm flex flex-col gap-1 hover:border-emerald-500/25 transition-colors"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <span className="font-bold text-zinc-200 text-[9px] leading-tight font-sans">
                                    {mat.name}
                                  </span>
                                  <span
                                    className={cn(
                                      "font-mono text-[7px] font-black px-1 py-0.5 uppercase border shrink-0",
                                      isHighRisk
                                        ? "bg-red-950/30 border-red-900/30 text-red-400"
                                        : "bg-zinc-900 border-zinc-800 text-zinc-500",
                                    )}
                                  >
                                    {mat.quantity}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between gap-1 mt-0.5 text-[7.5px]">
                                  <span className="text-zinc-500 font-mono italic">
                                    {mat.type}
                                  </span>
                                  <span
                                    className={cn(
                                      "font-mono font-bold uppercase flex items-center gap-0.5",
                                      isHighRisk
                                        ? "text-amber-500"
                                        : "text-zinc-500",
                                    )}
                                  >
                                    ⚠️ {mat.vulnerability}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {/* Stress Monitor HUD */}
                    <div id="stress-chokepoint-mitigation-hud" className="p-3 border border-red-955/25 bg-red-955/2 rounded-sm space-y-3.5">
                      <div className="flex items-center justify-between border-b border-red-955/15 pb-2">
                        <div className="flex items-center gap-2">
                          <Sliders className="w-3 h-3 text-red-500 animate-pulse" />
                          <span className="text-[9px] text-red-400 font-mono font-black uppercase tracking-[0.15em]">STRESS_CHOKEPOINT_VECTORS</span>
                          <button onClick={updateStressors} className="text-zinc-600 hover:text-emerald-500 transition-colors">
                            <RefreshCcw className="w-3 h-3" />
                          </button>
                        </div>
                        <span className={cn(
                          "text-[7px] border px-1.5 py-0.5 rounded-2xs font-extrabold font-mono",
                          (taiwanStraitBlocked || suezCanalBlocked || malaccaStraitBlocked || panamaCanalBlocked || hormuzStraitBlocked)
                            ? "bg-red-500/10 border-red-500/30 text-red-400 animate-pulse"
                            : "bg-emerald-500/10 border-emerald-500/30 text-emerald-450"
                        )}>
                          {(taiwanStraitBlocked || suezCanalBlocked || malaccaStraitBlocked || panamaCanalBlocked || hormuzStraitBlocked) ? "SHOCK_LIVE" : "OPTIMAL_FLOW"}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div className="text-[7.5px] text-zinc-500 font-mono tracking-widest uppercase font-black flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-red-500 rounded-px"></span>
                          <span>[1] Global Shipping Lane Blockades</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[8px] font-mono">
                          {/* Taiwan Blockade */}
                          <div className="p-1.5 bg-black/40 border border-zinc-900 rounded-sm flex flex-col justify-between gap-1.5">
                            <span className="text-zinc-400 text-[6.5px] uppercase tracking-wide truncate">Taiwan Air-Sea Space</span>
                            <div className="flex gap-1.5 mt-1">
                              <button
                                onClick={() => setTaiwanStraitBlocked?.(true)}
                                className={cn(
                                  "flex-1 py-1 text-[7px] font-bold border transition-all cursor-pointer rounded-2xs font-mono",
                                  taiwanStraitBlocked
                                    ? "bg-red-950/40 text-red-400 border-red-500/35 shadow-[0_0_8px_rgba(239,68,68,0.25)]"
                                    : "bg-zinc-950 text-zinc-650 border-zinc-900/60 hover:border-zinc-800 hover:text-zinc-400"
                                )}
                              >
                                BLOCK
                              </button>
                              <button
                                onClick={() => setTaiwanStraitBlocked?.(false)}
                                className={cn(
                                  "flex-1 py-1 text-[7px] font-bold border transition-all cursor-pointer rounded-2xs font-mono",
                                  !taiwanStraitBlocked
                                    ? "bg-emerald-950/30 text-emerald-450 border-emerald-500/35"
                                    : "bg-zinc-950 text-zinc-650 border-zinc-900/60 hover:border-zinc-800 hover:text-zinc-400"
                                )}
                              >
                                CLEAR
                              </button>
                            </div>
                          </div>

                           {/* Suez Canal */}
                          <div className="p-1.5 bg-black/40 border border-zinc-900 rounded-sm flex flex-col justify-between gap-1.5">
                            <span className="text-zinc-400 text-[6.5px] uppercase tracking-wide truncate">Suez Maritime Transit</span>
                            <div className="flex gap-1.5 mt-1">
                              <button
                                onClick={() => setSuezCanalBlocked?.(true)}
                                className={cn(
                                  "flex-1 py-1 text-[7px] font-bold border transition-all cursor-pointer rounded-2xs font-mono",
                                  suezCanalBlocked
                                    ? "bg-red-950/40 text-red-400 border-red-500/35 shadow-[0_0_8px_rgba(239,68,68,0.25)]"
                                    : "bg-zinc-950 text-zinc-650 border-zinc-900/60 hover:border-zinc-800 hover:text-zinc-400"
                                )}
                              >
                                BLOCK
                              </button>
                              <button
                                onClick={() => setSuezCanalBlocked?.(false)}
                                className={cn(
                                  "flex-1 py-1 text-[7px] font-bold border transition-all cursor-pointer rounded-2xs font-mono",
                                  !suezCanalBlocked
                                    ? "bg-emerald-950/30 text-emerald-450 border-emerald-500/35"
                                    : "bg-zinc-950 text-zinc-650 border-zinc-900/60 hover:border-zinc-800 hover:text-zinc-400"
                                )}
                              >
                                CLEAR
                              </button>
                            </div>
                          </div>

                          {/* Hormuz Strait */}
                          <div className="p-1.5 bg-black/40 border border-zinc-900 rounded-sm flex flex-col justify-between gap-1.5">
                            <span className="text-zinc-400 text-[6.5px] uppercase tracking-wide truncate">Hormuz Energy Gate</span>
                            <div className="flex gap-1.5 mt-1">
                              <button
                                onClick={() => setHormuzStraitBlocked?.(true)}
                                className={cn(
                                  "flex-1 py-1 text-[7px] font-bold border transition-all cursor-pointer rounded-2xs font-mono",
                                  hormuzStraitBlocked
                                    ? "bg-red-950/40 text-red-400 border-red-500/35 shadow-[0_0_8px_rgba(239,68,68,0.25)]"
                                    : "bg-zinc-950 text-zinc-650 border-zinc-900/60 hover:border-zinc-800 hover:text-zinc-400"
                                )}
                              >
                                BLOCK
                              </button>
                              <button
                                onClick={() => setHormuzStraitBlocked?.(false)}
                                className={cn(
                                  "flex-1 py-1 text-[7px] font-bold border transition-all cursor-pointer rounded-2xs font-mono",
                                  !hormuzStraitBlocked
                                    ? "bg-emerald-950/30 text-emerald-450 border-emerald-500/35"
                                    : "bg-zinc-950 text-zinc-650 border-zinc-900/60 hover:border-zinc-800 hover:text-zinc-400"
                                )}
                              >
                                CLEAR
                              </button>
                            </div>
                          </div>

                          {/* Malacca Strait */}
                          <div className="p-1.5 bg-black/40 border border-zinc-900 rounded-sm flex flex-col justify-between gap-1.5">
                            <span className="text-zinc-400 text-[6.5px] uppercase tracking-wide truncate">Malacca Demurrage</span>
                            <div className="flex gap-1.5 mt-1">
                              <button
                                onClick={() => setMalaccaStraitBlocked?.(true)}
                                className={cn(
                                  "flex-1 py-1 text-[7px] font-bold border transition-all cursor-pointer rounded-2xs font-mono",
                                  malaccaStraitBlocked
                                    ? "bg-red-950/40 text-red-400 border-red-500/35 shadow-[0_0_8px_rgba(239,68,68,0.25)]"
                                    : "bg-zinc-950 text-zinc-650 border-zinc-900/60 hover:border-zinc-800 hover:text-zinc-400"
                                )}
                              >
                                BLOCK
                              </button>
                              <button
                                onClick={() => setMalaccaStraitBlocked?.(false)}
                                className={cn(
                                  "flex-1 py-1 text-[7px] font-bold border transition-all cursor-pointer rounded-2xs font-mono",
                                  !malaccaStraitBlocked
                                    ? "bg-emerald-950/30 text-emerald-450 border-emerald-500/35"
                                    : "bg-zinc-950 text-zinc-650 border-zinc-900/60 hover:border-zinc-800 hover:text-zinc-400"
                                )}
                              >
                                CLEAR
                              </button>
                            </div>
                          </div>

                          {/* Panama Canal */}
                          <div className="p-1.5 bg-black/40 border border-zinc-900 rounded-sm flex flex-col justify-between gap-1.5">
                            <span className="text-zinc-400 text-[6.5px] uppercase tracking-wide truncate">Panama Draft Limit</span>
                            <div className="flex gap-1.5 mt-1">
                              <button
                                onClick={() => setPanamaCanalBlocked?.(true)}
                                className={cn(
                                  "flex-1 py-1 text-[7px] font-bold border transition-all cursor-pointer rounded-2xs font-mono",
                                  panamaCanalBlocked
                                    ? "bg-red-950/40 text-red-400 border-red-500/35 shadow-[0_0_8px_rgba(239,68,68,0.25)]"
                                    : "bg-zinc-950 text-zinc-650 border-zinc-900/60 hover:border-zinc-800 hover:text-zinc-400"
                                )}
                              >
                                BLOCK
                              </button>
                              <button
                                onClick={() => setPanamaCanalBlocked?.(false)}
                                className={cn(
                                  "flex-1 py-1 text-[7px] font-bold border transition-all cursor-pointer rounded-2xs font-mono",
                                  !panamaCanalBlocked
                                    ? "bg-emerald-950/30 text-emerald-450 border-emerald-500/35"
                                    : "bg-zinc-950 text-zinc-650 border-zinc-900/60 hover:border-zinc-800 hover:text-zinc-400"
                                )}
                              >
                                CLEAR
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Mitigations */}
                      <div className="space-y-2 border-t border-zinc-900/60 pt-2.5">
                        <div className="text-[7.5px] text-zinc-500 font-mono tracking-widest uppercase font-black flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-px"></span>
                          <span>[2] Mitigation Response Tactics</span>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5 text-[8px] font-mono">
                          {/* Air Freight */}
                          <button
                            onClick={() => setAirFreightActive?.(!airFreightActive)}
                            className={cn(
                              "p-1 border transition-all cursor-pointer rounded-sm flex flex-col items-center justify-center gap-1.5 text-center min-h-[36px]",
                              airFreightActive
                                ? "bg-emerald-950/40 text-emerald-400 border-emerald-500/35 shadow-[0_0_8px_rgba(16,185,129,0.2)]"
                                : "bg-black/40 border-zinc-900 text-zinc-650 hover:border-zinc-800 hover:text-zinc-400"
                            )}
                          >
                            <span className="text-[6.5px] uppercase truncate w-full">Priority Air</span>
                            <span className="text-[6.5px] font-black">{airFreightActive ? "ACTIVE" : "STANDBY"}</span>
                          </button>

                          {/* Strategic Stockpile */}
                          <button
                            onClick={() => setStrategicStockpileActive?.(!strategicStockpileActive)}
                            className={cn(
                              "p-1 border transition-all cursor-pointer rounded-sm flex flex-col items-center justify-center gap-1.5 text-center min-h-[36px]",
                              strategicStockpileActive
                                ? "bg-emerald-950/40 text-emerald-400 border-emerald-500/35 shadow-[0_0_8px_rgba(16,185,129,0.2)]"
                                : "bg-black/40 border-zinc-900 text-zinc-650 hover:border-zinc-800 hover:text-zinc-400"
                            )}
                          >
                            <span className="text-[6.5px] uppercase truncate w-full">Stockpiling</span>
                            <span className="text-[6.5px] font-black">{strategicStockpileActive ? "ACTIVE" : "STANDBY"}</span>
                          </button>

                          {/* Dual Sourcing */}
                          <button
                            onClick={() => setDualSourcingActive?.(!dualSourcingActive)}
                            className={cn(
                              "p-1 border transition-all cursor-pointer rounded-sm flex flex-col items-center justify-center gap-1.5 text-center min-h-[36px]",
                              dualSourcingActive
                                ? "bg-emerald-950/40 text-emerald-400 border-emerald-500/35 shadow-[0_0_8px_rgba(16,185,129,0.2)]"
                                : "bg-black/40 border-zinc-900 text-zinc-650 hover:border-zinc-800 hover:text-zinc-400"
                            )}
                          >
                            <span className="text-[6.5px] uppercase truncate w-full">Dual Sourcing</span>
                            <span className="text-[6.5px] font-black">{dualSourcingActive ? "ACTIVE" : "STANDBY"}</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Stream Vectors with vertical presentation */}
                    <SupplyChainPanel
                      company={selectedStock}
                      onSelectNode={onSelectNode}
                    />

                    {/* TOPOLOGY AUDIT LOGS INTERACTIVE VIEW */}
                    <div className="space-y-2">
                      <div className="text-[9.5px] font-black uppercase text-zinc-500 flex items-center justify-between mb-1.5 select-none font-mono">
                        <span className="flex items-center gap-1.5">
                          <ShieldAlert className="w-3.5 h-3.5 text-zinc-500" />{" "}
                          MULTI-POINT AUDIT PATHS
                        </span>
                      </div>

                      {auditStatus === "completed" ? (
                        <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                          {Object.entries(dynamicAuditedItems).map(
                            ([sym, report], idx) => (
                              <div
                                key={`${sym}-${idx}`}
                                className="p-1.5 bg-black border border-zinc-900 flex flex-col gap-1 rounded-sm font-mono"
                              >
                                <div className="flex justify-between items-center text-[9px]">
                                  <span className="text-zinc-200 font-black">
                                    {sym}
                                  </span>
                                  <span
                                    className={cn(
                                      "font-black tracking-wider text-[7.5px] px-1 rounded-2xs uppercase border",
                                      report.status === "VERIFIED"
                                        ? "bg-emerald-950/30 border-emerald-500/20 text-emerald-450"
                                        : report.status === "WARN"
                                          ? "bg-amber-950/30 border-amber-500/20 text-amber-500"
                                          : "bg-red-950/30 border-red-500/20 text-red-500",
                                    )}
                                  >
                                    {report.status}
                                  </span>
                                </div>
                                <p className="text-[7.5px] leading-tight text-zinc-500 italic">
                                  {report.reason}
                                </p>
                              </div>
                            ),
                          )}
                          <button
                            id="btn-sidebar-reset"
                            onClick={() => {
                              setAuditStatus("idle");
                              dispatchLog(
                                "SYSTEM: Reset current topology audits. Ready for re-screening.",
                              );
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
                            dispatchLog(
                              `SYSTEM: Scanning multi-node supply connections for ${selectedStock.symbol}...`,
                            );
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

                {/* AI COGNITIVE AGENT TAB CONTENT */}
                {innerLeftTab === "AI_AGENT" && (
                  <div className="flex-grow flex flex-col h-full min-h-0 space-y-3.5 select-none relative overflow-hidden">
                    {/* Chat Logs Window */}
                    <div className="flex-1 bg-black/60 border border-zinc-900 rounded-sm p-3 font-mono text-[9px] flex flex-col min-h-[300px] overflow-hidden">
                      <div className="flex items-center justify-between border-b border-zinc-900/60 pb-2 mb-2 select-none shrink-0">
                        <div className="flex items-center gap-1.5">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                          </span>
                          <span className="text-[8px] text-zinc-400 font-black tracking-[0.2em] uppercase">COGNITIVE_STREAM_V4</span>
                        </div>
                        <button
                          onClick={() => setChatHistory([{
                            role: 'assistant',
                            text: "SECURE COGNITIVE UPLINK ESTABLISHED. I am your AI Market Intelligence Assistant. Ask me about custom supply chains, logistics chokepoints, upcoming IPOs, lithography key corridors, or sovereign trade lanes."
                          }])}
                          className="text-[7px] text-zinc-650 hover:text-emerald-400 uppercase tracking-widest bg-transparent border border-zinc-900 hover:border-zinc-800 px-1.5 py-0.5 rounded-sm transition-colors cursor-pointer"
                        >
                          [RESET_UPLINK]
                        </button>
                      </div>

                      {/* Messages scroll section */}
                      <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar min-h-0 pb-2">
                        {chatHistory.map((msg, i) => (
                          <div
                            key={i}
                            className={cn(
                              "p-2.5 rounded-sm border transition-all duration-150",
                              msg.role === 'assistant'
                                ? "bg-zinc-950/40 border-emerald-950/30 text-emerald-400/90 hover:border-emerald-500/15"
                                : "bg-zinc-900/10 border-zinc-900/50 text-zinc-300 hover:border-zinc-800"
                            )}
                          >
                            <div className="flex items-center justify-between text-[7px] text-zinc-500 mb-1.5 select-none font-bold tracking-wider">
                              <span className={cn(msg.role === 'assistant' ? "text-emerald-500/70" : "text-zinc-400")}>
                                {msg.role === 'assistant' ? "SYS::INTELLIGENCE_CORE" : "USER::QUERY_VECTOR"}
                              </span>
                              {msg.locationName && (
                                <span className="flex items-center gap-1 text-emerald-600 font-black tracking-wide bg-emerald-950/10 border border-emerald-900/20 px-1 py-0.2 rounded-[2px]">
                                  <MapPin className="w-2 h-2 text-emerald-500" /> {msg.locationName.toUpperCase()}
                                </span>
                              )}
                            </div>

                            <div className="leading-relaxed whitespace-pre-wrap select-text selection:bg-emerald-950 selection:text-emerald-200">
                              {msg.role === 'assistant' && i === chatHistory.length - 1 ? (
                                <Typewriter text={msg.text} className="text-emerald-400/95 font-sans" />
                              ) : (
                                <div className="markdown-body font-sans text-[9px] leading-relaxed text-zinc-300">
                                  <Markdown>{msg.text}</Markdown>
                                </div>
                              )}
                            </div>

                            {msg.facts && msg.facts.length > 0 && (
                              <div className="mt-3 pt-2.5 border-t border-zinc-900/60">
                                <div className="text-[6.5px] text-emerald-600 font-black tracking-widest uppercase mb-1.5">Grounded Entity Registry</div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                  {msg.facts.map((fact, idx) => (
                                    <div key={idx} className="flex items-center gap-1.5 text-[7px] text-emerald-400/80 font-bold bg-emerald-950/20 px-2 py-1 rounded-sm border border-emerald-900/20">
                                      <span className="w-1 h-1 bg-emerald-400 rounded-full" />
                                      <span className="truncate">{fact}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {msg.role === 'assistant' && (
                              <div className="mt-2.5 pt-2 border-t border-zinc-900/40 flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex gap-1.5">
                                  {msg.coordinates && (
                                    <button
                                      onClick={() => {
                                        if (msg.coordinates) {
                                          if (setAgentFocus) {
                                            setAgentFocus({
                                              lat: msg.coordinates[0],
                                              lng: msg.coordinates[1],
                                              zoomLevel: 6,
                                              locationName: msg.locationName,
                                              facts: msg.facts,
                                              ticker: msg.ticker,
                                              briefing: msg.text
                                            });
                                          }
                                          if (msg.ticker) {
                                            const foundComp = COMPANIES.find(c => c.symbol.toUpperCase() === msg.ticker?.toUpperCase());
                                            if (foundComp) onSelectNode(foundComp);
                                          }
                                        }
                                      }}
                                      className="text-[6.5px] bg-emerald-950/40 hover:bg-emerald-900/30 text-emerald-400 border border-emerald-900/50 px-1.5 py-0.5 rounded-sm transition-all uppercase font-black tracking-widest flex items-center gap-1 cursor-pointer"
                                    >
                                      <Compass className="w-2.5 h-2.5" /> [LAUNCH_GPS_FLYOVER]
                                    </button>
                                  )}
                                  
                                  {msg.ticker && (
                                    <button
                                      onClick={() => {
                                        const foundComp = COMPANIES.find(c => c.symbol.toUpperCase() === msg.ticker?.toUpperCase());
                                        if (foundComp) onSelectNode(foundComp);
                                      }}
                                      className="text-[6.5px] bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 px-1.5 py-0.5 rounded-sm transition-all uppercase font-black tracking-widest flex items-center gap-1 cursor-pointer"
                                    >
                                      [OPEN_NODE_DETAILS: {msg.ticker}]
                                    </button>
                                  )}
                                </div>

                                <button
                                  onClick={() => handleSpeak(msg.text)}
                                  disabled={isSpeechLoading}
                                  className={cn(
                                    "text-[6.5px] border px-1.5 py-0.5 rounded-sm transition-all uppercase font-black tracking-widest flex items-center gap-1 cursor-pointer",
                                    isSpeaking 
                                      ? "bg-rose-950/40 border-rose-900/60 text-rose-400 animate-pulse" 
                                      : "bg-emerald-950/40 border-emerald-900/50 text-emerald-400 hover:bg-emerald-900/30"
                                  )}
                                  title="Read Aloud via Neural TTS"
                                >
                                  {isSpeaking ? (
                                    <>
                                      <VolumeX className="w-2.5 h-2.5" /> [MUTE_VOCALIZER]
                                    </>
                                  ) : (
                                    <>
                                      <Volume2 className="w-2.5 h-2.5" /> [VOCALIZE_REPORT]
                                    </>
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Presets segment */}
                      <div className="border-t border-zinc-900/60 pt-2 shrink-0">
                        <span className="text-[6px] text-zinc-650 font-black tracking-[0.25em] uppercase block mb-1.5 select-none">AI VECTOR SEEDS</span>
                        <div className="flex flex-wrap gap-1">
                          {[
                            { label: "Suez Canal", text: "Analyze Suez Canal Maritime Chokepoint logistics risk vectors" },
                            { label: "ASML EUV", text: "ASML EUV Lithography Production bottlenecks and suppliers" },
                            { label: "Taiwan Foundries", text: "Taiwan Semiconductor Foundries geopolitical bottlenecks" },
                            { label: "Ningde Batteries", text: "CATL Lithium Battery supply-chain resilience" }
                          ].map((preset, idx) => (
                            <button
                              key={idx}
                              onClick={() => setAiInput(preset.text)}
                              className="text-[7px] bg-zinc-950/50 hover:bg-zinc-900/80 border border-zinc-900 hover:border-zinc-800 text-zinc-500 hover:text-emerald-400 px-1.5 py-0.5 rounded-sm transition-colors cursor-pointer"
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Chat Form Input */}
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const queryVal = aiInput.trim();
                        if (!queryVal || isChatLoading || isAiProcessing) return;

                        setAiInput("");
                        setIsChatLoading(true);
                        setChatHistory(prev => [...prev, { role: 'user', text: queryVal }]);

                        try {
                          const baseUrl = getApiBaseUrl();
                          const response = await fetch(`${baseUrl}/api/ai/navigate`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ prompt: queryVal }),
                          });

                          if (!response.ok) {
                            throw new Error(`Uplink error: ${response.status}`);
                          }

                          const data = await response.json();
                          if (data) {
                            const rawLat = data.lat !== undefined ? data.lat : data.latitude;
                            const rawLng = data.lng !== undefined ? data.lng : (data.longitude !== undefined ? data.longitude : data.lng);
                            const parsedLat = typeof rawLat === "number" ? rawLat : Number(rawLat);
                            const parsedLng = typeof rawLng === "number" ? rawLng : Number(rawLng);
                            const hasCoords = !isNaN(parsedLat) && !isNaN(parsedLng);
                            const latVal = hasCoords ? parsedLat : 37.3349;
                            const lngVal = hasCoords ? parsedLng : -122.0091;

                            const aiReply = {
                              role: 'assistant' as const,
                              text: data.briefing || data.explanation || "Cognitive report summarized.",
                              coordinates: [latVal, lngVal] as [number, number],
                              locationName: data.locationName || "GROUNDED TARGET",
                              ticker: data.ticker || null,
                              facts: data.facts || []
                            };

                            setChatHistory(prev => [...prev, aiReply]);

                            if (setAgentFocus) {
                              setAgentFocus({
                                lat: latVal,
                                lng: lngVal,
                                zoomLevel: typeof data.zoomLevel === "number" ? data.zoomLevel : 6,
                                locationName: data.locationName || "GROUNDED TARGET",
                                facts: data.facts || [],
                                ticker: data.ticker || null,
                                briefing: data.briefing || data.explanation
                              });
                            }

                            if (data.ticker) {
                              const match = COMPANIES.find(c => c.symbol.toUpperCase() === data.ticker.toUpperCase());
                              if (match) onSelectNode(match);
                            }
                          }
                        } catch (err: any) {
                          console.error("AI Assistant Chat Error:", err);
                          setChatHistory(prev => [...prev, {
                            role: 'assistant',
                            text: `ERROR: Cognitive stream offline. ${err.message || "Timeout."}`
                          }]);
                        } finally {
                          setIsChatLoading(false);
                        }
                      }}
                      className="flex gap-2 shrink-0 relative"
                    >
                      <input
                        type="text"
                        value={aiInput}
                        onChange={(e) => setAiInput(e.target.value)}
                        placeholder={(isChatLoading || isAiProcessing) ? "SYNTHESIZING SYSTEM RESPONSES..." : "SUBMIT TACTICAL QUERY TO COGNITIVE MATRIX..."}
                        disabled={isChatLoading || isAiProcessing}
                        className="flex-1 bg-zinc-950/90 border border-zinc-900 rounded-sm px-2.5 py-1.5 font-sans text-[9px] text-emerald-400 placeholder-emerald-950 focus:outline-none focus:border-emerald-500/40 uppercase font-bold tracking-wide"
                      />
                      <button
                        type="submit"
                        disabled={isChatLoading || isAiProcessing || !aiInput.trim()}
                        className="bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-950 text-black disabled:text-zinc-700 border border-emerald-600/50 disabled:border-zinc-900 px-3 py-1.5 rounded-sm font-mono text-[8px] uppercase font-black tracking-widest cursor-pointer transition-all duration-150 active:scale-95 shadow-[0_0_10px_rgba(16,185,129,0.15)] disabled:shadow-none shrink-0"
                      >
                        {(isChatLoading || isAiProcessing) ? "UP-LINKING" : "TRANSMIT"}
                      </button>
                    </form>
                  </div>
                )}

                {/* MACRO TAB CONTENT */}
                {innerLeftTab === "MACRO" && (
                  <div className="space-y-4 flex-1 flex flex-col h-full min-h-0">
                    {/* Yield Curve Monitor Section */}
                    <div className="p-3 bg-zinc-950 border border-zinc-900 rounded-sm flex-1 flex flex-col min-h-[350px]">
                       <YieldCurveMonitor yields={yields} />
                    </div>

                    <div className="p-3 bg-zinc-950 border border-zinc-900 rounded-sm flex-1 flex flex-col min-h-[350px]">
                      <div className="flex items-center gap-2 mb-3 border-b border-zinc-900/60 pb-2 shrink-0">
                        <GlobeIcon className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-[9px] font-black tracking-widest uppercase font-mono text-emerald-500">
                          Sector Rotation Alpha
                        </span>
                      </div>
                      <div className="flex-1 relative min-h-0">
                        <SectorRotation />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>


        </aside>
    );
  },
);
