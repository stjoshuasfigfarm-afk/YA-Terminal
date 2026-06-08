import React, { useMemo, useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import { Company, COMPANIES } from "../data/companies";
import { useCompanies } from "../context/CompaniesContext";
import { formatSafeTime } from "../utils/date";
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
  Compass,
  Filter,
} from "lucide-react";
import { formatCurrency, cn, getApiBaseUrl } from "../lib/utils";
import { analyzeSentimentAndImpact } from "../lib/sentiment";
import { YieldCurveMonitor } from "./YieldCurveMonitor";
import { SupplyChainPanel } from "./SupplyChainPanel";
import { MacroCorridor } from "./yield-terminal/MacroCorridor";
import { playTacticalAudio } from "../utils/audio";

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
      }, 15);
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

const SpectralVoiceVisualizer = ({ isSpeaking }: { isSpeaking: boolean }) => {
  return (
    <div className="flex items-center gap-[1px] h-3 px-1.5">
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          animate={isSpeaking ? {
            height: [2, 10, 4, 8, 2],
            backgroundColor: ["#10b981", "#34d399", "#10b981"],
          } : {
            height: 2,
            backgroundColor: "#3f3f46",
          }}
          transition={{
            duration: 0.5 + Math.random() * 0.5,
            repeat: Infinity,
            delay: i * 0.05,
          }}
          className="w-[2px] rounded-full"
        />
      ))}
    </div>
  );
};

const RiskMatrixHeatmap = React.memo(({ correlationMatrix }: { correlationMatrix: number[][] }) => {
  const labels = ["LIQ", "GEO", "SUP", "FX", "CRD"];
  return (
    <div className="grid grid-cols-6 gap-[2px] font-mono select-none">
      <div className="h-4" />
      {labels.map(l => (
        <div key={l} className="text-[6px] text-zinc-650 flex items-center justify-center font-black">{l}</div>
      ))}
      {correlationMatrix.map((row, i) => (
        <React.Fragment key={i}>
          <div className="text-[6px] text-zinc-650 flex items-center justify-start font-black pr-1">{labels[i]}</div>
          {row.map((val, j) => (
            <div
              key={j}
              className="group relative"
            >
              <div 
                className="h-3.5 w-full transition-colors border border-black/20"
                style={{ 
                  backgroundColor: `rgba(16, 185, 129, ${val * 0.6})`,
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/90 text-[5.5px] text-emerald-400 font-bold z-10 p-0.5">
                {(val * 100).toFixed(0)}
              </div>
            </div>
          ))}
        </React.Fragment>
      ))}
    </div>
  );
});

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

    const [activeDockTab, setActiveDockTab] = useState<
      "LOGISTICS" | "LOGS" | "PARTNERS"
    >("LOGISTICS");
    const [auditStatus, setAuditStatus] = useState<
      "idle" | "running" | "completed"
    >("idle");
    const [partnerData, setPartnerData] = useState<any>({
      usgs: [],
      gdelt: {},
      whaleAlert: [],
    });

    useEffect(() => {
      if (activeDockTab === "PARTNERS") {
        const baseUrl = getApiBaseUrl();
        Promise.all([
          fetch(`${baseUrl}/api/partners/usgs`).then((r) => r.json()),
          fetch(`${baseUrl}/api/partners/gdelt`).then((r) => r.json()),
          fetch(`${baseUrl}/api/partners/whale-alert`).then((r) => r.json()),
        ])
          .then(([usgs, gdelt, whaleAlert]) => {
            setPartnerData({
              usgs: usgs?.features?.slice(0, 5) || [],
              gdelt: gdelt || {},
              whaleAlert: whaleAlert?.transactions?.slice(0, 5) || [],
            });
          })
          .catch(console.error);
      }
    }, [activeDockTab]);
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
          throw new Error("Voice uplink failed");
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

    if (!selectedStock) {
      return (
        <aside className="w-52 border-l border-zinc-800 flex flex-col bg-black z-20 shrink-0 select-none overflow-hidden">
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
            <h3 className="font-mono text-zinc-500 uppercase tracking-widest font-black text-[9.5px] border border-zinc-900 px-2 py-1 bg-black">
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
          "h-full border-l border-zinc-800 flex flex-col bg-black z-20 shrink-0 select-none transition-all duration-150 relative",
          "w-full",
        )}
      >
        {/* PANEL HEADER - FIXED */}
        <div className="h-10 border-b border-zinc-800 bg-zinc-950/90 flex items-center justify-between px-3 shrink-0 z-50">
          {!isMinimized && (
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_#10b981]" />
              <span className="text-[10px] font-black uppercase text-white tracking-[0.2em] font-mono">
                INTEL_COCKPIT_V4
              </span>
            </div>
          )}
          <button onClick={onToggleMinimize} className="text-zinc-500 hover:text-white transition-colors">
            {isMinimized ? <ChevronsLeft /> : <ChevronsRight />}
          </button>
        </div>

        {!isMinimized && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* TACTICAL NAVIGATION TABS - FIXED TOP */}
            <div className="flex bg-black shrink-0 border-b border-zinc-900 h-10 p-1 gap-1 select-none z-40">
              {[
                {
                  id: "STRATEGY",
                  label: "NEWS FEEDS",
                  icon: <Newspaper className="w-3.5 h-3.5" />,
                },
                {
                  id: "LOGISTICS_COCKPIT",
                  label: "LOGISTICS & MATRIX",
                  icon: <Network className="w-3.5 h-3.5" />,
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

            {/* MAIN SCROLLABLE CONTENT */}
            <div className="flex-1 overflow-y-auto scrollbar-tactical scroll-smooth">
              {/* NEWS FEED SUB-NAVI - TOP LEVEL WHEN ACTIVE */}
              {innerLeftTab === "STRATEGY" && (
                <div className="border-b border-zinc-900 bg-black/60 p-3 pt-4 sticky top-0 z-30 shadow-2xl">
                   {/* Search Control */}
                   <div className="relative group mb-3">
                    <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-600 group-focus-within:text-emerald-500 transition-colors" />
                    <input
                      type="text"
                      placeholder="SEARCH_NEWS_NODES..."
                      value={newsSearch}
                      onChange={(e) => setNewsSearch(e.target.value)}
                      className="w-full bg-zinc-950/80 border border-zinc-900 rounded-sm py-1.5 pl-8 pr-3 text-[9px] font-mono text-zinc-300 placeholder:text-zinc-700 focus:outline-none focus:border-emerald-500/50 transition-all shadow-inner tracking-wider"
                    />
                  </div>

                  {/* Sub-tabs for feeds */}
                  <div className="flex border border-zinc-900 bg-zinc-950/80 p-0.5 rounded-sm select-none gap-0.5">
                    <button
                      onClick={() => setStrategySubTab("detailed")}
                      className={cn(
                        "flex-1 py-1 px-1.5 text-[8.5px] font-mono font-black tracking-wider uppercase text-center transition-all bg-transparent border-0 cursor-pointer rounded-2xs flex items-center justify-center gap-1.5",
                        strategySubTab === "detailed"
                          ? "bg-emerald-950/40 text-emerald-400 font-extrabold border border-emerald-900/40 shadow-[0_0_8px_rgba(16,185,129,0.1)]"
                          : "text-zinc-500 hover:text-zinc-350",
                      )}
                    >
                      <Newspaper className="w-2.5 h-2.5" />
                      Detailed Feed
                    </button>
                    <button
                      onClick={() => setStrategySubTab("filtered")}
                      className={cn(
                        "flex-1 py-1 px-1.5 text-[8.5px] font-mono font-black tracking-wider uppercase text-center transition-all bg-transparent border-0 cursor-pointer rounded-2xs flex items-center justify-center gap-1.5",
                        strategySubTab === "filtered"
                          ? "bg-emerald-950/40 text-emerald-400 font-extrabold border border-emerald-900/40 shadow-[0_0_8px_rgba(16,185,129,0.1)]"
                          : "text-zinc-500 hover:text-zinc-350",
                      )}
                    >
                      <Filter className="w-2.5 h-2.5" />
                      Filtered Feed
                    </button>
                  </div>
                </div>
              )}

              {/* PERMANENT YIELD STRUCTURE MONITOR */}
              <div className="border-b border-zinc-900 p-3 bg-zinc-950/20">
                <div className="text-[9px] font-black text-emerald-450 font-mono tracking-widest uppercase mb-1.5 flex items-center justify-between select-none">
                  <span className="flex items-center gap-1 text-emerald-500">
                    <TrendingUp className="w-3.5 h-3.5" />
                    YIELD STRUCTURE: {yields?.country || "US TREASURIES"}
                  </span>
                  <span className="text-[7.5px] text-zinc-500 font-normal">
                    Trajectories & risk spreads
                  </span>
                </div>
                <div className="h-[170px] overflow-hidden">
                  <YieldCurveMonitor yields={yields} />
                </div>
                
                <div className="mt-3 pt-3 border-t border-zinc-900/60">
                  <div className="text-[8px] font-black text-emerald-500/60 font-mono tracking-widest uppercase mb-2 flex items-center gap-1.5">
                    <Network className="w-3 h-3" />
                    Cross-Asset Stress Correlation
                  </div>
                  <RiskMatrixHeatmap correlationMatrix={correlationMatrix} />
                </div>
              </div>

              {/* STRATEGIC MACRO INDICATORS */}
              <div className="flex divide-x divide-zinc-900 border-b border-zinc-900/40 bg-black/40 h-8 shrink-0">
                {[
                  { label: "VIX", val: "14.22", chg: "-2.4%", color: "text-emerald-500" },
                  { label: "DXY", val: "103.45", chg: "+0.15%", color: "text-zinc-400" },
                  { label: "GOLD", val: "2350.2", chg: "+0.8%", color: "text-amber-500" },
                  { label: "BTC", val: "68.4k", chg: "-1.2%", color: "text-orange-500" },
                ].map((m, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center justify-center font-mono">
                    <span className="text-[6px] text-zinc-600 font-black">{m.label}</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-[8px] text-zinc-300 font-bold">{m.val}</span>
                      <span className={cn("text-[6px] font-bold", m.color)}>{m.chg}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* STRATEGIC MACRO INDICATORS */}

              {/* TAB CONTENT */}
              <div className="p-3.5">
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
                          <span className="text-zinc-500 uppercase">
                            MATRIX STRESS INDEX
                          </span>
                          <span
                            className={cn(
                              "font-bold text-[10.5px]",
                              calculatedRiskScore >= 75
                                ? "text-red-500"
                                : calculatedRiskScore >= 45
                                  ? "text-amber-500"
                                  : "text-emerald-500",
                            )}
                          >
                            {calculatedRiskScore}% RISK
                          </span>
                        </div>
                        <div className="h-1.5 bg-zinc-900 overflow-hidden rounded-full">
                          <div
                            className={cn(
                              "h-full transition-all duration-300",
                              calculatedRiskScore >= 75
                                ? "bg-red-600"
                                : calculatedRiskScore >= 45
                                  ? "bg-amber-500"
                                  : "bg-emerald-500",
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

                    {/* SYSTEM RISK INJECTION CONTROLS */}
                    <div className="p-3 border border-zinc-900 bg-black rounded-sm space-y-3.5">
                      <div className="flex justify-between items-center border-b border-zinc-900/60 pb-2 font-mono">
                        <div className="text-zinc-400 font-extrabold flex items-center gap-1.5 uppercase text-[9px] tracking-wider">
                          <Sliders className="w-3.5 h-3.5 text-zinc-500" />
                          TACTICAL RISK INJECTOR
                        </div>
                        <span className="text-[6.5px] text-zinc-650 font-bold uppercase select-none">
                          SIM_CONTROL_SYS
                        </span>
                      </div>

                      <div className="space-y-2.5">
                        {/* Macro Shocks Group */}
                        <div className="space-y-1.5">
                          <div className="text-[8px] font-mono font-black text-red-500/80 uppercase tracking-widest flex items-center gap-1 mb-1">
                            <Flame className="w-3 h-3" />
                            Macroeconomic Port & Strait Blockades
                          </div>
                          <div className="grid grid-cols-2 gap-1.5 font-mono">
                            {[
                              { id: "taiwanStrait", label: "Taiwan Strait Blockade", val: taiwanStraitBlocked, set: setTaiwanStraitBlocked },
                              { id: "suezCanal", label: "Suez Canal Closure", val: suezCanalBlocked, set: setSuezCanalBlocked },
                              { id: "malaccaStrait", label: "Malacca Strait Bottleneck", val: malaccaStraitBlocked, set: setMalaccaStraitBlocked },
                              { id: "panamaCanal", label: "Panama Canal Draft Limits", val: panamaCanalBlocked, set: setPanamaCanalBlocked },
                            ].map((shock) => (
                              <button
                                key={shock.id}
                                onClick={() => {
                                  if (shock.set) {
                                    const nextVal = !shock.val;
                                    shock.set(nextVal);
                                    playTacticalAudio(nextVal ? "warning" : "click");
                                    dispatchLog(
                                      `RISK_INJECTOR: ${shock.label} is now ${nextVal ? "ARMED" : "NOMINAL"}.`
                                    );
                                  }
                                }}
                                className={cn(
                                  "text-[7.5px] px-2 py-1.5 text-left transition-all border flex flex-col justify-between h-11 relative rounded-2xs cursor-pointer select-none",
                                  shock.val
                                    ? "bg-red-950/20 border-red-500/50 text-red-400 font-black shadow-[0_0_8px_rgba(239,68,68,0.1)]"
                                    : "bg-black border-zinc-900 text-zinc-500 hover:border-zinc-800 hover:text-zinc-400"
                                )}
                              >
                                <span>{shock.label.toUpperCase()}</span>
                                <span className={cn("text-[6px] font-black tracking-widest", shock.val ? "text-red-500 animate-pulse" : "text-zinc-650")}>
                                  {shock.val ? "● ARMED" : "○ OFFLINE"}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Mitigations Group */}
                        <div className="space-y-1.5">
                          <div className="text-[8px] font-mono font-black text-emerald-500/80 uppercase tracking-widest flex items-center gap-1 mb-1">
                            <Shield className="w-3 h-3 text-emerald-500" />
                            Strategic Defensive Mitigations
                          </div>
                          <div className="grid grid-cols-3 gap-1 px-0.5 font-mono">
                            {[
                              { id: "airFreight", label: "Priority Air Bridge", val: airFreightActive, set: setAirFreightActive },
                              { id: "stockpile", label: "Strategic Stockpile", val: strategicStockpileActive, set: setStrategicStockpileActive },
                              { id: "dualSource", label: "Dual Sourcing", val: dualSourcingActive, set: setDualSourcingActive },
                            ].map((mit) => (
                              <button
                                key={mit.id}
                                onClick={() => {
                                  if (mit.set) {
                                    const nextVal = !mit.val;
                                    mit.set(nextVal);
                                    playTacticalAudio(nextVal ? "success" : "click");
                                    dispatchLog(
                                      `RISK_INJECTOR: ${mit.label} is now ${nextVal ? "ACTIVATED" : "OFFLINE"}.`
                                    );
                                  }
                                }}
                                className={cn(
                                  "text-[7px] px-1.5 py-1 text-center transition-all border flex flex-col items-center justify-center gap-0.5 rounded-2xs cursor-pointer select-none h-11",
                                  mit.val
                                    ? "bg-emerald-950/25 border-emerald-500/50 text-emerald-400 font-black"
                                    : "bg-black border-zinc-900 text-zinc-500 hover:border-zinc-800 hover:text-zinc-450"
                                )}
                              >
                                <span className="line-clamp-2 uppercase font-semibold text-center">{mit.label}</span>
                                <span className={cn("text-[6px] font-semibold text-[5.5px]", mit.val ? "text-emerald-400" : "text-zinc-600")}>
                                  {mit.val ? "ACTIVE" : "OFFLINE"}
                                </span>
                              </button>
                            ))}
                          </div>
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
                        <div className="space-y-1.5 pr-1">
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
                          <div className="text-[9px] text-emerald-400 font-black tracking-widest uppercase flex items-center gap-1.5">
                            <Box className="w-3.5 h-3.5 text-emerald-500" />
                            SOURCED_MATERIAL_INVENTORY
                          </div>
                          <span className="text-[7.5px] bg-emerald-950/30 text-emerald-400 px-1.5 py-0.5 border border-emerald-900/30 font-bold uppercase">
                            TIER_3_VULN
                          </span>
                        </div>

                        <div className="space-y-2 pr-1">
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
                {innerLeftTab === "STRATEGY" && selectedStock && (
                  <div className="space-y-4">
                    {/* FEEDS AT THE TOP OF COCKPIT - HANDLED AT TOP LEVEL */}
                    <div className="mt-0">
                      {strategySubTab === "detailed" ? (
                        <>
                          <h4 className="text-[10px] font-black uppercase text-emerald-400 tracking-widest mb-2.5 font-mono border-b border-emerald-900/50 pb-1.5 flex justify-between items-center select-none">
                            <span>Detailed Analysis Feed</span>
                            <span className="text-[7.5px] text-zinc-500 font-normal normal-case">
                              Global intelligence stream
                            </span>
                          </h4>
                          <div className="space-y-2.5 pr-1">
                            {news && news.length > 0 ? (
                              news.slice(0, 8).map((n: any, i: number) => {
                                const tDate = formatSafeTime(n.published_at);
                                const tTitle = (n.title || "").toUpperCase();
                                const company = companies.find(
                                  (c) => c.symbol === (n.symbol || n.ticker),
                                );
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
                                      selectedStock?.symbol ===
                                        (n.symbol || n.ticker)
                                        ? "bg-emerald-950/10 border-emerald-500/30 border-l-2 border-l-emerald-500"
                                        : "bg-black/20",
                                    )}
                                  >
                                    <div className="flex items-center justify-between text-[7.5px] font-mono tracking-widest uppercase mb-1">
                                      <span className="text-emerald-500/80">
                                        [{tDate}]
                                      </span>
                                      <div className="flex items-center gap-1.5">
                                        {(() => {
                                          const { sentiment: s, impact: im } = analyzeSentimentAndImpact(n);
                                          return (
                                            <>
                                              <span className={cn(
                                                "px-1 border font-black text-[6px]",
                                                im === "CRITICAL" ? "bg-red-500/10 border-red-500 text-red-400" :
                                                im === "MODERATE" ? "bg-amber-500/10 border-amber-500 text-amber-400" :
                                                "bg-zinc-800 border-zinc-700 text-zinc-500"
                                              )}>
                                                {im}
                                              </span>
                                              <span className={cn(
                                                "px-1 border font-black text-[6px]",
                                                s === "BULLISH" ? "bg-emerald-500/10 border-emerald-500 text-emerald-400" :
                                                s === "BEARISH" ? "bg-rose-500/10 border-rose-500 text-rose-400" :
                                                "bg-zinc-800 border-zinc-700 text-zinc-500"
                                              )}>
                                                {s}
                                              </span>
                                            </>
                                          );
                                        })()}
                                      </div>
                                    </div>
                                    <div className="leading-snug font-bold text-zinc-100 text-[9.5px] mb-1 tracking-tight group-hover:text-emerald-300 transition-colors">
                                      {tTitle}
                                    </div>
                                    {n.description && (
                                      <p className="text-[8px] text-zinc-500 line-clamp-2 leading-relaxed font-sans mt-0.5">
                                        {n.description}
                                      </p>
                                    )}
                                  </div>
                                );
                              })
                            ) : (
                              <div className="text-[9px] text-zinc-600 italic font-mono py-4 text-center border border-dashed border-zinc-900">
                                NO DETAILED NEWS DATA DETECTED
                              </div>
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          <h4 className="text-[10px] font-black uppercase text-emerald-400 tracking-widest mb-2.5 font-mono border-b border-emerald-900/50 pb-1.5 flex justify-between items-center select-none">
                            <span>Filtered Analysis Feed</span>
                            <span className="text-[7.5px] text-zinc-500 font-normal normal-case">
                              Select story to analyze
                            </span>
                          </h4>

                          {/* NEURAL INTELLIGENCE PULSE FEED - MOVED UNDER FILTERED INTEL HEADER */}
                          <div className="mb-4 bg-zinc-950/40 p-2 border border-zinc-900/60 rounded-sm">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-1 text-[7.5px] font-black text-zinc-500 font-mono tracking-[0.2em] uppercase">
                                <Zap className="w-2.5 h-2.5 text-amber-500" />
                                NEURAL_INTELLIGENCE_PULSE
                              </div>
                              <span className="text-[5.5px] text-zinc-700 font-mono">BETA_V1.2</span>
                            </div>
                            <div className="space-y-1.5 h-20 overflow-hidden mask-fade-bottom">
                              <AnimatePresence mode="popLayout">
                                {pulseFeed.slice(0, 4).map((n, i) => (
                                  <motion.div 
                                    key={`${n.msg}-${i}`}
                                    initial={{ opacity: 0, x: -10, filter: "blur(4px)" }}
                                    animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                                    exit={{ opacity: 0, x: 10, filter: "blur(4px)" }}
                                    transition={{ duration: 0.4, ease: "easeOut" }}
                                    className="flex gap-2 group cursor-default"
                                  >
                                    <span className={cn("text-[6.5px] font-black px-1 border border-current bg-current/5 shrink-0 h-3 flex items-center min-w-[38px] justify-center", n.color)}>{n.tag}</span>
                                    <div className="flex flex-col min-w-0 font-mono">
                                      <p className="text-[7.5px] text-zinc-400 line-clamp-2 leading-tight group-hover:text-white transition-colors">{n.msg}</p>
                                    </div>
                                  </motion.div>
                                ))}
                              </AnimatePresence>
                            </div>
                          </div>

                          <div className="space-y-2.5 pr-1">
                            {filteredNews.length > 0 ? (
                              filteredNews.map((n, i) => {
                                const company = companies.find(
                                  (c) => c.symbol === (n.symbol || n.ticker),
                                );
                                const isCurrentAsset =
                                  selectedStock?.symbol === n.symbol;
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
                                      isCurrentAsset
                                        ? "bg-emerald-950/10 border-emerald-500/30 border-l-2 border-l-emerald-500"
                                        : "bg-black/20",
                                    )}
                                  >
                                    <div className="flex justify-between items-center mb-1">
                                      <span className="text-emerald-500 font-bold font-mono tracking-wider flex items-center gap-1.5 line-clamp-1">
                                        <span>[{n.symbol || n.ticker}]</span>
                                        {n.source && (
                                          <span className="text-zinc-650 font-normal text-[7px] uppercase truncate max-w-[60px]">
                                            ({n.source})
                                          </span>
                                        )}
                                      </span>
                                      <div className="flex items-center gap-1">
                                        {(() => {
                                          const { sentiment: s, impact: im } = analyzeSentimentAndImpact(n);
                                          return (
                                            <>
                                              <span className={cn(
                                                "px-1 border font-black text-[6px]",
                                                im === "CRITICAL" ? "bg-red-500/10 border-red-500 text-red-400" :
                                                im === "MODERATE" ? "bg-amber-500/10 border-amber-500 text-amber-400" :
                                                "bg-zinc-800 border-zinc-700 text-zinc-500"
                                              )}>
                                                {im}
                                              </span>
                                              <span className={cn(
                                                "px-1 border font-black text-[6px]",
                                                s === "BULLISH" ? "bg-emerald-500/10 border-emerald-500 text-emerald-400" :
                                                s === "BEARISH" ? "bg-rose-500/10 border-rose-500 text-rose-400" :
                                                "bg-zinc-800 border-zinc-700 text-zinc-500"
                                              )}>
                                                {s}
                                              </span>
                                            </>
                                          );
                                        })()}
                                      </div>
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
                                      <Zap className="w-2.5 h-2.5 animate-pulse" />{" "}
                                      TARGET_SYSTEM_BRIEFING &gt;
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
                        </>
                      )}
                    </div>

                    {/* Briefing and Trends - moved down */}
                    <div className="space-y-4">
                      {/* TACTICAL BRIEFING BLOCK */}
                      {(briefing || isAiProcessing) && (
                        <div className="p-3 border border-emerald-500/20 bg-emerald-500/5 rounded-sm relative overflow-hidden group">
                          <div className="absolute top-0 right-0 p-1">
                            <SpectralVoiceVisualizer isSpeaking={isSpeaking} />
                          </div>
                          <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2 mb-2.5 select-none font-mono">
                            <div className="text-[10px] text-emerald-400 font-black tracking-widest uppercase flex items-center gap-2">
                              <Shield className="w-3.5 h-3.5" />
                              TACTICAL_AGENCY_BRIEFING
                            </div>
                            <button 
                              onClick={() => briefing && handleSpeak(typeof briefing === 'string' ? briefing : JSON.stringify(briefing))}
                              disabled={isSpeechLoading}
                              className={cn(
                                "flex items-center gap-1 text-[8px] font-black px-1.5 py-0.5 border transition-all cursor-pointer",
                                isSpeaking 
                                  ? "bg-emerald-500 border-emerald-400 text-black shadow-[0_0_10px_rgba(16,185,129,0.5)]" 
                                  : "bg-black border-emerald-500/40 text-emerald-500 hover:bg-emerald-500/10"
                              )}
                            >
                              {isSpeechLoading ? <RefreshCcw className="w-2.5 h-2.5 animate-spin" /> : isSpeaking ? <VolumeX className="w-2.5 h-2.5" /> : <Volume2 className="w-2.5 h-2.5" />}
                              {isSpeaking ? "MUTE" : "PLAY AUDIO"}
                            </button>
                          </div>
                          
                          {isAiProcessing ? (
                            <div className="space-y-2 py-2">
                              <div className="h-1.5 w-full bg-emerald-500/10 overflow-hidden">
                                <motion.div 
                                  animate={{ x: ["-100%", "100%"] }}
                                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                                  className="h-full w-1/3 bg-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                                />
                              </div>
                              <div className="text-[8px] font-mono text-emerald-500/60 animate-pulse tracking-widest uppercase">
                                Synthesizing intelligence vectors...
                              </div>
                            </div>
                          ) : (
                            <Typewriter 
                              text={typeof briefing === 'string' ? briefing : JSON.stringify(briefing, null, 2)} 
                              className="text-emerald-400/90"
                            />
                          )}
                          
                          <div className="mt-3 pt-2.5 border-t border-emerald-500/10 flex items-center justify-between">
                            <div className="flex gap-2">
                              <div className="text-[7px] text-zinc-600 font-mono uppercase bg-black px-1 border border-zinc-900">REL: 0.98</div>
                              <div className="text-[7px] text-zinc-600 font-mono uppercase bg-black px-1 border border-zinc-900">CONF: HIGH</div>
                            </div>
                            <span className="text-[6.5px] text-emerald-500/40 font-mono italic">GENERATED_BY_GEMINI_V3</span>
                          </div>
                        </div>
                      )}

                      {/* SVG 10-Day Trend Sparkline Matrix */}
                      {sentiment?.forecast &&
                        Array.isArray(sentiment.forecast) && (
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
                                {sentiment.forecast.map(
                                  (val: number, i: number) => {
                                    const heightPct = Math.max(
                                      10,
                                      Math.min(100, Math.abs(val) * 100 + 10),
                                    );
                                    const isPositive = val >= 0;
                                    return (
                                      <div
                                        key={i}
                                        className="flex-1 h-full flex flex-col justify-end group relative"
                                      >
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block bg-zinc-950 border border-zinc-800 text-[6.5px] text-zinc-300 px-1 py-0.5 rounded-sm whitespace-nowrap z-50 font-mono">
                                          Day {i + 1}: {val > 0 ? "+" : ""}
                                          {(val * 100).toFixed(1)}%
                                        </div>
                                        <div
                                          className={cn(
                                            "w-full rounded-2xs transition-all duration-300 opacity-80 hover:opacity-100",
                                            isPositive
                                              ? "bg-emerald-500/50 hover:bg-emerald-400"
                                              : "bg-red-500/50 hover:bg-red-400",
                                          )}
                                          style={{ height: `${heightPct}%` }}
                                        />
                                      </div>
                                    );
                                  },
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                    </div>
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
                      <span className="text-zinc-500 font-bold uppercase">
                        USGS Hazards:
                      </span>
                      {(partnerData.usgs || []).map((h: any, i: number) => (
                        <div key={i} className="text-emerald-400">
                          {h.properties?.title || "Seismic Event"}
                        </div>
                      ))}
                    </div>
                    <div>
                      <span className="text-zinc-500 font-bold uppercase">
                        Whale Alert:
                      </span>
                      {(partnerData.whaleAlert || []).map(
                        (t: any, i: number) => (
                          <div key={i} className="text-blue-400">
                            {t.amount} {t.symbol}
                          </div>
                        ),
                      )}
                    </div>
                    <div>
                      <span className="text-zinc-500 font-bold uppercase">
                        GDELT Global Monitor:
                      </span>
                      {(partnerData.gdelt?.articles || [])
                        .slice(0, 3)
                        .map((a: any, i: number) => (
                          <div key={i} className="text-zinc-400">
                            {a.title}
                          </div>
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
