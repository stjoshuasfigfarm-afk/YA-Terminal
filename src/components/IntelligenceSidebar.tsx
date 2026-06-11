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
} from "lucide-react";
import { formatCurrency, cn, getApiBaseUrl } from "../lib/utils";
import { analyzeSentimentAndImpact } from "../lib/sentiment";
import { SupplyChainPanel } from "./SupplyChainPanel";
import { MacroCorridor } from "./yield-terminal/MacroCorridor";

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
  };
  setShocks?: {
    setTaiwanStraitBlocked: (v: boolean) => void;
    setSuezCanalBlocked: (v: boolean) => void;
    setMalaccaStraitBlocked: (v: boolean) => void;
    setPanamaCanalBlocked: (v: boolean) => void;
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
    shocks = {
      taiwanStraitBlocked: false,
      suezCanalBlocked: false,
      malaccaStraitBlocked: false,
      panamaCanalBlocked: false,
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
  }: IntelligenceSidebarProps) => {
    const { companies } = useCompanies();
    const {
      taiwanStraitBlocked,
      suezCanalBlocked,
      malaccaStraitBlocked,
      panamaCanalBlocked,
    } = shocks;
    const { airFreightActive, strategicStockpileActive, dualSourcingActive } =
      mitigations;
    const {
      setTaiwanStraitBlocked,
      setSuezCanalBlocked,
      setMalaccaStraitBlocked,
      setPanamaCanalBlocked,
    } = setShocks || {};
    const {
      setAirFreightActive,
      setStrategicStockpileActive,
      setDualSourcingActive,
    } = setMitigations || {};

    const [localNewsSearch, setLocalNewsSearch] = useState("");
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
      "STRATEGY" | "LOGISTICS_COCKPIT" | "YIELD" | "SUPPLY_CHAIN"
    >("STRATEGY");
    const [strategySubTab, setStrategySubTab] = useState<
      "detailed" | "filtered"
    >("filtered");

    const [isSpeaking, setIsSpeaking] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const ttsCooldownRef = useRef<number>(0);
    const [isSpeechLoading, setIsSpeechLoading] = useState(false);

    // --- Neural Intelligence Pulse Feed State ---
    const [pulseFeed, setPulseFeed] = useState([
      { tag: "IMTC", msg: "Immersive Logistics Telemetry Controller initiated", time: "Just now", color: "text-purple-400" },
      { tag: "SIGNAL", msg: "Whale alert: $42M USDT move detected in SOL ecosystem", time: "1m ago", color: "text-amber-500" },
      { tag: "MACRO", msg: "ECB indicates flexible rate path despite inflation sticky", time: "4m ago", color: "text-zinc-500" },
      { tag: "TRADE", msg: "High convergence detected on Semi-cap yield spreads", time: "8m ago", color: "text-emerald-500" },
      { tag: "ALERT", msg: "Unusual options activity detected in TSLA put chain", time: "12m ago", color: "text-rose-500" },
      { tag: "FLOW", msg: "Darkpool buy imbalance detected in energy sector ETFs", time: "15m ago", color: "text-blue-500" },
    ]);

    useEffect(() => {
      const scenarios = [
        { tag: "SIGNAL", msg: "Massive liquidation event triggered in BTC perps: -$12M", color: "text-rose-500" },
        { tag: "MACRO", msg: "BOJ Governor hints at yield curve control flexibility", color: "text-zinc-500" },
        { tag: "TRADE", msg: "Arbitrage opportunity: Cross-exchange spread on ETH/USDT > 0.4%", color: "text-emerald-500" },
        { tag: "ALERT", msg: "Systemic risk spike detected in EU sovereign debt spreads", color: "text-amber-500" },
        { tag: "INTEL", msg: "Geographic cluster of freight delays emerging in Southeast Asia", color: "text-blue-500" },
        { tag: "FLOW", msg: "Unusual institutional accumulation in mid-cap biotechs", color: "text-emerald-400" },
      ];

      const interval = setInterval(() => {
        const next = scenarios[Math.floor(Math.random() * scenarios.length)];
        setPulseFeed(prev => [
          { ...next, time: "Just now" },
          ...prev.map(p => ({ ...p, time: p.time === "Just now" ? "1m ago" : p.time.includes("m") ? (parseInt(p.time) + 1) + "m ago" : p.time })),
        ].slice(0, 6));
      }, 10000);

      return () => clearInterval(interval);
    }, []);
    // ---------------------------------------------

    const stopAllAudio = () => {
      if (audioRef.current) {
        try {
          audioRef.current.pause();
        } catch (err) {}
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
      const stressors = [
        "LIQUIDITY",
        "GEOPOLITICAL",
        "SUPPLY_CHAIN",
        "CURRENCY",
        "CREDIT",
      ];
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
    ]);

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
        const titleSafe = String(item.title || "");
        const summarySafe = String(item.summary || "");
        const matchesSearch =
          titleSafe.toLowerCase().includes((newsSearch || "").toLowerCase()) ||
          summarySafe.toLowerCase().includes((newsSearch || "").toLowerCase());

        if (!matchesSearch) return false;

        const { sentiment: compSentiment, impact: compImpact } =
          analyzeSentimentAndImpact(item);

        if (sentimentFilter !== "ALL" && compSentiment !== sentimentFilter)
          return false;
        if (impactFilter !== "ALL" && compImpact !== impactFilter) return false;

        return true;
      });
    }, [news, newsSearch, sentimentFilter, impactFilter]);

    // --- Cognitive Synthesis Agent Logic REMOVED (Moved to Deck) ---

    const hasIntelData = !!selectedStock || !!briefing || (agentFocus && !!agentFocus.briefing);

    if (!hasIntelData) {
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
          "h-full border-l border-zinc-800 flex flex-col bg-black z-20 shrink-0 select-none overflow-hidden relative transition-all duration-150 animate-crt-flicker",
          "w-full shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] border-r border-zinc-900",
        )}
      >
        <div className="scanline-overlay" />
      <div className="h-11 border-b border-zinc-800 bg-zinc-950/95 flex items-center justify-between px-3 shrink-0 relative overflow-hidden group">
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
            </div>
          </div>
        )}
        <div className="flex items-center gap-1.5 z-10">
          <button
            onClick={onToggleMinimize}
            className="hidden md:flex text-zinc-500 hover:text-white transition-colors p-1 rounded-sm hover:bg-white/5 active:scale-95"
            title={isMinimized ? "Expand Intelligence" : "Minimize Intelligence"}
          >
            {isMinimized ? (
              <ChevronsLeft className="w-4 h-4" />
            ) : (
              <ChevronsRight className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>


             <div className="flex-1 flex flex-col min-h-0">
              {/* Inner Switch Row */}
              <div className="flex bg-black shrink-0 border-b border-zinc-900 h-11 p-1.5 gap-px select-none overflow-x-auto scrollbar-none transition-all duration-150">
                {[
                  {
                    id: "STRATEGY",
                    label: selectedStock ? "NEWS_FEED" : "INTEL_DECK",
                    icon: <MapPin className="w-3 h-3" />,
                  },
                  ...(selectedStock ? [
                    {
                      id: "LOGISTICS_COCKPIT",
                      label: "LOGISTICS_V3",
                      icon: <Network className="w-3 h-3" />,
                    }
                  ] : []),
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

              <div className="p-3.5 flex-1 overflow-y-auto custom-scrollbar min-h-0">
                {/* STRATEGY TAB CONTENT */}
                {innerLeftTab === "STRATEGY" && (
                   <div className="space-y-4">
                     {/* 1. AGENT BRIEFING / COGNITIVE REPORT DECK */}
                     {(briefing || (agentFocus && agentFocus.briefing)) && (
                       <div className="border border-emerald-500/35 bg-black/80 rounded-sm p-3 font-mono space-y-3 relative shadow-[0_0_15px_rgba(16,185,129,0.05)] font-mono">
                         {/* Title of the Report */}
                         <div className="flex items-center justify-between border-b border-emerald-500/20 pb-1.5 select-none font-mono">
                           <span className="text-[8.5px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1.5 font-mono">
                             <ShieldAlert className="w-3 h-3 text-emerald-400 animate-pulse" />
                             {selectedStock ? `INTEL_DECK::${selectedStock.symbol}` : "TACTICAL_INTEL_DECK"}
                           </span>
                           <span className="text-[6.5px] text-zinc-500 font-bold font-mono">
                             {agentFocus?.locationName ? agentFocus.locationName.slice(0, 24).toUpperCase() : "COGNITIVE_GRID"}
                           </span>
                         </div>

                         {/* Content text */}
                         <div className="space-y-2.5 font-mono">
                           {/* Main Summary Text */}
                           <div className="p-2 bg-zinc-950/80 border border-zinc-900 border-dashed rounded-xs font-mono">
                             <div className="text-[6.5px] font-extrabold text-zinc-500 uppercase tracking-widest mb-1.5 font-mono">
                               DIRECTIVE_SUMMARY
                             </div>
                             <Typewriter
                               className="text-zinc-300 font-mono text-[9px] leading-relaxed"
                               text={
                                 typeof briefing === "string" ? briefing :
                                 (briefing?.summary ||
                                  briefing?.text ||
                                  (typeof agentFocus?.briefing === "string" ? agentFocus.briefing : "") ||
                                  "Analyzing target assets...")
                               }
                             />
                           </div>

                           {/* If structured company briefing: Recommendations */}
                           {briefing && typeof briefing !== "string" && briefing.tacticalRecommendations && (
                             <div className="space-y-1.5 p-2 bg-emerald-950/10 border border-emerald-500/10 rounded-xs font-mono">
                               <div className="text-[6.5px] font-black text-emerald-400 uppercase tracking-wider font-mono flex items-center gap-1 font-mono">
                                 <Zap className="w-2.5 h-2.5" /> STRATEGIC_DIRECTIVES
                               </div>
                               <div className="space-y-1 font-mono">
                                 {briefing.tacticalRecommendations.map((rec: string, idx: number) => (
                                   <div key={idx} className="text-[8px] text-zinc-300 flex gap-1.5 leading-tight font-mono">
                                     <span className="text-emerald-500 font-bold shrink-0 font-mono">[{idx+1}]</span>
                                     <span>{rec}</span>
                                   </div>
                                 ))}
                               </div>
                             </div>
                           )}

                           {/* If structured company briefing: Risk Factors */}
                           {briefing && typeof briefing !== "string" && briefing.riskFactors && (
                             <div className="space-y-1.5 p-2 bg-red-950/10 border border-red-500/10 rounded-xs font-mono">
                               <div className="text-[6.5px] font-black text-red-400 uppercase tracking-wider font-mono flex items-center gap-1 font-mono">
                                 <ShieldAlert className="w-2.5 h-2.5" /> THREAT_FACTORS
                               </div>
                               <div className="space-y-1 font-mono font-mono">
                                 {briefing.riskFactors.map((rf: string, idx: number) => (
                                   <div key={idx} className="text-[8px] text-zinc-300 flex gap-1.5 leading-tight font-mono">
                                     <span className="text-red-500 font-bold shrink-0 font-mono">[{idx+1}]</span>
                                     <span>{rf}</span>
                                   </div>
                                 ))}
                               </div>
                             </div>
                           )}

                           {/* If general search briefing: Facts List */}
                           {agentFocus && agentFocus.facts && agentFocus.facts.length > 0 && (
                             <div className="space-y-1.5 p-2 bg-blue-950/10 border border-blue-500/15 rounded-xs font-mono">
                               <div className="text-[6.5px] font-black text-blue-400 uppercase tracking-wider font-mono flex items-center gap-1 font-mono">
                                 <GlobeIcon className="w-2.5 h-2.5" /> INTELLIGENCE_FACTS
                               </div>
                               <div className="space-y-1 font-mono">
                                 {agentFocus.facts.map((fact: string, idx: number) => (
                                   <div key={idx} className="text-[8px] text-zinc-300 flex gap-1.5 leading-tight font-mono">
                                     <span className="text-blue-500 font-bold shrink-0 font-mono">[{idx+1}]</span>
                                     <span>{fact}</span>
                                   </div>
                                 ))}
                               </div>
                             </div>
                           )}

                           {/* Outlook details for structured company */}
                           {briefing && typeof briefing !== "string" && briefing.outlook && (
                             <div className="flex justify-between items-center text-[7.5px] bg-black p-1.5 border border-zinc-900 rounded-2xs font-mono font-mono">
                               <span className="text-zinc-650 font-bold uppercase font-mono">OUTLOOK_VECTOR:</span>
                               <span className={cn(
                                 "font-black tracking-widest px-1.5 py-0.5 rounded-2xs border uppercase font-mono text-[7px]",
                                 briefing.outlook === "ACCELERATING" ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-400" :
                                 briefing.outlook === "VULNERABLE" || briefing.outlook === "COMPROMISED" ? "bg-red-950/20 border-red-500/30 text-red-500 animate-pulse" :
                                 "bg-zinc-900 border-zinc-800 text-zinc-400"
                               )}>
                                 {briefing.outlook}
                               </span>
                             </div>
                           )}
                         </div>
                       </div>
                     )}

                     {/* 2. LIVE COGNITIVE FEED & NEWS (Only if selectedStock is defined) */}
                     {selectedStock && (
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
                          <span className="text-[9px] text-zinc-400 font-black tracking-[0.15em] uppercase font-mono">LIVE_COGNITIVE_FEED</span>
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

                      {/* Filter Bar Controls */}
                      <div className="flex gap-1 items-center bg-black p-1 border border-zinc-900 rounded-sm select-none">
                        <Filter className="w-3 h-3 text-zinc-600 ml-1 shrink-0" />
                        <input
                          type="text"
                          value={newsSearch}
                          onChange={(e) => setNewsSearch(e.target.value)}
                          placeholder="Filter intel signals..."
                          className="bg-transparent border-0 ring-0 focus:ring-0 focus:outline-none font-mono text-[8.5px] text-zinc-300 placeholder-zinc-750 flex-1 min-w-0"
                        />
                      </div>

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
                                : "border-zinc-900 text-zinc-600 hover:text-zinc-400"
                            )}
                          >
                            {f}
                          </button>
                        ))}
                      </div>

                      {/* News List */}
                      {filteredNews.length > 0 ? (
                        <div className="space-y-3 pr-0.5">
                          {filteredNews.slice(0, 10).map((item: any, idx: number) => {
                            const { sentiment: compSentiment, impact: compImpact, strength: compStrength } =
                              analyzeSentimentAndImpact(item);
                            return (
                              <div
                                key={idx}
                                className="group border border-zinc-900 bg-zinc-950/20 hover:border-emerald-500/40 hover:bg-zinc-900/10 transition-all rounded-xs font-mono overflow-hidden flex flex-col relative"
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
                                    <span className="text-[6.5px] text-zinc-500 font-bold tracking-widest uppercase">
                                      PKT_{idx.toString().padStart(3, '0')} // {item.source ? item.source.slice(0, 12).toUpperCase() : "SIGNAL_GATE"}
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
                                        onClick={() => handleSpeak(item.title + (item.summary ? ". " + item.summary : ""))}
                                        className="text-emerald-500/50 hover:text-emerald-400 focus:outline-none transition-colors border border-emerald-500/30 rounded-2xs px-1.5 py-0.5 bg-emerald-500/5 hover:bg-emerald-500/20 flex items-center gap-1"
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
                    )}
                  </div>
                )}

                {/* LOGISTICS COCKPIT TAB CONTENT */}
                {innerLeftTab === "LOGISTICS_COCKPIT" && selectedStock && (
                  <div className="space-y-4">
                    {/* Stress Monitor HUD */}
                    <div className="p-3 border border-red-900/30 bg-red-950/5 rounded-sm space-y-3">
                      <div className="flex items-center justify-between border-b border-red-950/30 pb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-3 bg-red-500/50 rounded-full" />
                          <span className="text-[9px] text-red-400 font-mono font-black uppercase tracking-[0.15em]">STRESS_CHOKEPOINT_VECTORS</span>
                        </div>
                        <span className="text-[7px] bg-red-950/40 border border-red-900/30 px-1 py-0.5 rounded-2xs text-red-500 animate-pulse font-bold">
                          THREAT_DETECTION
                        </span>
                      </div>
                      <div className="space-y-1 font-mono text-[8px] text-zinc-400">
                        <div className="flex justify-between items-center border-b border-zinc-900/30 py-0.5">
                          <span>TAIWAN AIR-SEA SPACE RESTRICTIONS:</span>
                          <span className={cn("font-bold uppercase", taiwanStraitBlocked ? "text-red-500" : "text-emerald-500")}>
                            {taiwanStraitBlocked ? "BLOCKED" : "CLEAR"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center border-b border-zinc-900/30 py-0.5">
                          <span>SUEZ CANAL MARITIME TRANSIT GATE:</span>
                          <span className={cn("font-bold uppercase", suezCanalBlocked ? "text-red-500" : "text-emerald-500")}>
                            {suezCanalBlocked ? "BLOCKED" : "CLEAR"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center border-b border-zinc-900/30 py-0.5">
                          <span>MALACCA STRAIT DEMURRAGE bottlenecks:</span>
                          <span className={cn("font-bold uppercase", malaccaStraitBlocked ? "text-yellow-500" : "text-emerald-500")}>
                            {malaccaStraitBlocked ? "BLOCKED" : "CLEAR"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center border-b border-zinc-900/30 py-0.5">
                          <span>PANAMA draft constraints:</span>
                          <span className={cn("font-bold uppercase", panamaCanalBlocked ? "text-yellow-500" : "text-emerald-500")}>
                            {panamaCanalBlocked ? "BLOCKED" : "CLEAR"}
                          </span>
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

                    <div className="pt-2 border-t border-zinc-900"></div>

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
              </div>
            </div>

            {/* Neural Pulse Feed Segment */}
            <div className="h-10 border-t border-zinc-900 bg-black flex items-center px-3 overflow-hidden select-none whitespace-nowrap gap-6">
              <div className="flex items-center gap-1.5 shrink-0 border-r border-zinc-900 pr-3">
                <Activity className="w-3 h-3 text-emerald-500 animate-pulse" />
                <span className="text-[8px] font-mono font-black text-emerald-500 uppercase tracking-widest">LIVE_FLOW</span>
              </div>
              <div className="flex-1 flex gap-8 items-center animate-[marquee_60s_linear_infinite]">
                 {pulseFeed.map((pulse, i) => (
                   <div key={i} className="flex items-center gap-2 text-[7.5px] font-mono">
                     <span className={cn("font-black px-1 border border-current rounded-xs", pulse.color.replace('text', 'bg').replace('-500', '-500/10').replace('-400', '-400/10'))}>{pulse.tag}</span>
                     <span className="text-zinc-400 font-medium">{pulse.msg}</span>
                     <span className="text-zinc-600 font-bold">{pulse.time}</span>
                   </div>
                 ))}
                 {/* Duplicated for smooth loop */}
                 {pulseFeed.map((pulse, i) => (
                   <div key={`${i}-dup`} className="flex items-center gap-2 text-[7.5px] font-mono">
                     <span className={cn("font-black px-1 border border-current rounded-xs", pulse.color.replace('text', 'bg').replace('-500', '-500/10').replace('-400', '-400/10'))}>{pulse.tag}</span>
                     <span className="text-zinc-400 font-medium">{pulse.msg}</span>
                     <span className="text-zinc-600 font-bold">{pulse.time}</span>
                   </div>
                 ))}
              </div>
            </div>
        </aside>
    );
  },
);
