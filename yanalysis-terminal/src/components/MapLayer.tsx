import React, {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  useMemo,
} from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
  GeoJSON,
  Tooltip,
  Circle,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";
import { COMPANIES, Company } from "../data/companies";
import { useCompanies } from "../context/CompaniesContext";
import {
  TrendingUp,
  MessageSquare,
  Cpu,
  Newspaper,
  Globe as GlobeIcon,
  Map as MapIcon,
  Zap,
  Network,
  Anchor,
  Shield,
  RefreshCcw,
  Star,
  Lock,
  Unlock,
  Crosshair,
  Target,
  Search,
  Satellite,
  VolumeX,
  Volume2,
} from "lucide-react";
import Markdown from "react-markdown";
import { cn, getApiBaseUrl } from "../lib/utils";
import {
  CORRIDORS,
  getCorridorHeadquartersLinks,
} from "./yield-terminal/TopologyMap";
import { analyzeSentimentAndImpact } from "../lib/sentiment";
import { AnimatePresence, motion } from "motion/react";
// Dynamic import for Globe to improve initial load performance (Three.js/react-globe.gl)
const Globe = lazy(() => import("./Globe").then((m) => ({ default: m.Globe })));

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
    </div>
  );
};

// Fix leaflet icon issue
// @ts-ignore
import icon from "leaflet/dist/images/marker-icon.png";
// @ts-ignore
import iconShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom Marker Creator
const createPulseIcon = (color: string) =>
  L.divIcon({
    className: "custom-pulsing-icon",
    html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; box-shadow: 0 0 10px ${color};"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });

const defaultIcon = createPulseIcon("#ffffff");
const activeIcon = createPulseIcon("#ffffff");

const HeatmapLayer = ({ data }: { data: [number, number, number][] }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !data || data.length === 0) return;

    // @ts-ignore
    const heatLayer = L.heatLayer(data, {
      radius: 35,
      blur: 20,
      maxZoom: 1,
      max: 1.0,
      gradient: {
        0.2: 'rgba(16, 185, 129, 0.2)',
        0.4: 'rgba(16, 185, 129, 0.4)',
        0.6: 'rgba(245, 158, 11, 0.6)',
        0.8: 'rgba(239, 68, 68, 0.8)',
        1.0: 'rgba(239, 68, 68, 1)'
      }
    }).addTo(map);

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, data]);

  return null;
};

// Utility to validate coordinates
const isValidCoord = (val: any): val is number =>
  typeof val === "number" && !isNaN(val) && Number.isFinite(val);

const isSafeLatLng = (lat: any, lng: any): boolean => {
  try {
    if (lat === null || lat === undefined || lng === null || lng === undefined)
      return false;

    // Check if it's already a number or can be converted
    const nLat = typeof lat === "number" ? lat : parseFloat(String(lat));
    const nLng = typeof lng === "number" ? lng : parseFloat(String(lng));

    // Explicit checks for NaN and Infinity using the most robust methods
    if (!Number.isFinite(nLat) || !Number.isFinite(nLng)) {
      return false;
    }

    // Valid coordinate ranges for Earth
    return nLat >= -90 && nLat <= 90 && nLng >= -180 && nLng <= 180;
  } catch {
    return false;
  }
};

// Safety wrapper for L.latLng to prevent crashes
const safeLatLng = (lat: any, lng: any): L.LatLng | null => {
  if (isSafeLatLng(lat, lng)) {
    try {
      return L.latLng(Number(lat), Number(lng));
    } catch {
      return null;
    }
  }
  return null;
};

// Controller component to handle fly-to
const MapController = ({
  selectedPosition,
  zoomLevel = 6,
  onAnimationEnd,
  networkAnchor,
  is3DMode,
}: {
  selectedPosition: [number, number] | null;
  zoomLevel?: number;
  onAnimationEnd?: () => void;
  networkAnchor?: any;
  is3DMode: boolean;
}) => {
  const map = useMap();
  
  useEffect(() => {
    if (map && !is3DMode) {
      const timer = setTimeout(() => {
        map.invalidateSize();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [map, is3DMode]);
  
  useEffect(() => {
    if (map && selectedPosition && Array.isArray(selectedPosition)) {
      const lat = selectedPosition[0];
      const lng = selectedPosition[1];

      const pos = safeLatLng(lat, lng);
      if (pos) {
        try {
          const handleMoveEnd = () => {
            if (onAnimationEnd) onAnimationEnd();
            map.off("moveend", handleMoveEnd);
          };
          map.on("moveend", handleMoveEnd);

          const targetZoom = networkAnchor ? 15 : zoomLevel;

          map.flyTo(pos, targetZoom, {
            duration: 1.8,
            easeLinearity: 0.25,
          });
        } catch (err) {
          console.error("Map flyTo critically failed:", err, pos);
        }
      }
    }
  }, [selectedPosition, zoomLevel, map, onAnimationEnd, networkAnchor]);

  return null;
};

interface MapLayerProps {
  selectedStock: Company | null;
  focusStock?: Company | null;
  onSelectNode: (c: Company, skipFetch?: boolean) => void;
  intelligenceFeed?: any[];
  isIntelligenceStream?: boolean;
  toggleIntelligenceStream?: () => void;
  showGlobalNetwork?: boolean;
  networkAnchor?: Company | null;
  toggleGlobalNetwork?: () => void;
  activeTab?: string;
  marketData?: Record<string, any>;
  allNewsData?: any[];
  sentiment?: any;
  onInjectLiveNews?: () => void;
  mapLayers: { hq: boolean; arcs: boolean; heatmap: boolean; satellite: boolean; borders: boolean };
  activeCorridorId?: string | null;
  onSelectCorridor?: (id: string | null) => void;
  agentFocus?: any | null;
  agentEntities?: any[];
  briefing?: any;
  setAgentFocus?: (focus: any | null) => void;
  isAgentSearching?: boolean;
  viewportLock: boolean;
  setViewportLock: (val: boolean) => void;
  autoRotateEnabled: boolean;
  setAutoRotateEnabled: (val: boolean) => void;
  searchQuery?: string;
  setSearchQuery?: (q: string) => void;
  onAgentSearch?: (q: string) => void;
  isVocalizerEnabled: boolean;
  onToggleVocalizer: (val: boolean) => void;
  riskScore?: number;
  relationships?: { suppliers: any[]; customers: any[] };
}

export const MapLayer: React.FC<MapLayerProps> = ({
  selectedStock,
  focusStock,
  onSelectNode,
  intelligenceFeed,
  isIntelligenceStream,
  toggleIntelligenceStream,
  showGlobalNetwork,
  networkAnchor,
  toggleGlobalNetwork,
  activeTab,
  marketData = {},
  allNewsData = [],
  sentiment,
  onInjectLiveNews,
  mapLayers,
  activeCorridorId = null,
  onSelectCorridor,
  agentFocus = null,
  agentEntities = [],
  briefing,
  setAgentFocus,
  isAgentSearching = false,
  viewportLock,
  setViewportLock,
  autoRotateEnabled,
  setAutoRotateEnabled,
  searchQuery = "",
  setSearchQuery,
  onAgentSearch,
  isVocalizerEnabled,
  onToggleVocalizer,
  riskScore = 25,
  relationships = { suppliers: [], customers: [] },
}) => {
  const setIsVocalizerEnabled = onToggleVocalizer;
  const { companies: contextCompanies } = useCompanies();
  const companies = useMemo(() => {
    return contextCompanies && contextCompanies.length > 0 ? contextCompanies : COMPANIES;
  }, [contextCompanies]);

  const companiesToRender = useMemo(() => {
    const set = new Set<string>();
    const list: Company[] = [];

    const addCo = (c: Company) => {
      if (!c || set.has(c.symbol)) return;
      set.add(c.symbol);
      list.push(c);
    };

    if (selectedStock) addCo(selectedStock);
    if (focusStock) addCo(focusStock);

    if (selectedStock && relationships) {
      if (Array.isArray(relationships.suppliers)) {
        relationships.suppliers.forEach(s => {
          const matched = companies.find(c => c.symbol === s.symbol);
          if (matched) addCo(matched);
        });
      }
      if (Array.isArray(relationships.customers)) {
        relationships.customers.forEach(cust => {
          const matched = companies.find(c => c.symbol === cust.symbol);
          if (matched) addCo(matched);
        });
      }
    }

    const anchor = networkAnchor || selectedStock;
    if (anchor) {
      if (anchor.partners) {
        anchor.partners.forEach(sym => {
          const matched = companies.find(c => c.symbol === sym);
          if (matched) addCo(matched);
        });
      }
      companies.forEach(fromStock => {
        if (fromStock.partners?.includes(anchor.symbol)) {
          addCo(fromStock);
        }
      });
    }

    if (searchQuery.trim()) {
      const queryLower = searchQuery.toLowerCase();
      const searchMatches = companies.filter(c => 
        c.symbol.toLowerCase().includes(queryLower) ||
        c.name.toLowerCase().includes(queryLower) ||
        c.sector?.toLowerCase().includes(queryLower)
      );
      searchMatches.slice(0, 50).forEach(addCo);
    } else {
      COMPANIES.forEach(addCo);
    }

    return list;
  }, [companies, selectedStock, focusStock, relationships, searchQuery, networkAnchor, showGlobalNetwork]);

  const [is3DMode, setIs3DMode] = useState(true);
  const [showNewsSummary, setShowNewsSummary] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ttsCooldownRef = useRef<number>(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSpeechLoading, setIsSpeechLoading] = useState(false);

  useEffect(() => {
    const handleTtsPlay = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.origin !== 'map') {
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

    window.addEventListener('app-tts-play', handleTtsPlay);

    return () => {
      if (audioRef.current) {
        try {
          audioRef.current.pause();
        } catch (err) {}
      }
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      window.removeEventListener('app-tts-play', handleTtsPlay);
    };
  }, []);

  // Generate heatmap data based on market activity
  const heatmapData = useMemo(() => {
    return companiesToRender.map(c => {
      if (!isSafeLatLng(c.lat, c.lng)) return null;
      const quote = marketData[c.symbol];
      const volatility = quote ? Math.abs(parseFloat(quote.dp) || 0) : 0;
      const companyNewsCount = allNewsData.filter(n => n.symbol === c.symbol).length;
      // Synthetic activity score 0.1 to 1.0
      const weight = Math.min(1, 0.1 + (volatility / 5) + (companyNewsCount / 8));
      return [Number(c.lat), Number(c.lng), weight] as [number, number, number];
    }).filter((x): x is [number, number, number] => x !== null);
  }, [companiesToRender, marketData, allNewsData]);

  // Global Keydown Hotkeys for HUD controls mapping
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (
        activeEl.tagName === "INPUT" || 
        activeEl.tagName === "TEXTAREA" || 
        activeEl.getAttribute("contenteditable") === "true"
      )) {
        return;
      }

      const key = e.key.toLowerCase();
      if (key === "g" || key === "3") {
        e.preventDefault();
        setIs3DMode((prev) => {
          const next = !prev;
          setViewportLock(next);
          return next;
        });
      } else if (key === "s") {
        e.preventDefault();
        setAutoRotateEnabled(true);
        setViewportLock(false);
      } else if (key === "f") {
        e.preventDefault();
        setAutoRotateEnabled(false);
        setViewportLock(false);
      } else if (key === "l" || key === "c") {
        e.preventDefault();
        setAutoRotateEnabled(false);
        setViewportLock(true);
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [setViewportLock, setAutoRotateEnabled]);
  const [newsActiveTab, setNewsActiveTab] = useState("FLASH_URGENT");
  const [eiaData, setEiaData] = useState<any>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    const updateVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
    };

    if (window.speechSynthesis) {
      updateVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = updateVoices;
      }
    }
  }, []);

  useEffect(() => {
    if (newsActiveTab === "02 // LOGISTICS_FEED" && !eiaData) {
      const baseUrl = getApiBaseUrl();
      fetch(`${baseUrl}/api/eia/stocks`)
        .then(async (res) => {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("text/html")) return null;
          return res.json();
        })
        .then((data) => {
          if (data) setEiaData(data);
        })
        .catch((err) => console.error("EIA Fetch Error", err));
    }
  }, [newsActiveTab, eiaData]);
  const [activeNewsIdx, setActiveNewsIdx] = useState(0);
  const [neuralBloom, setNeuralBloom] = useState<{ lat: number, lng: number, timestamp: number } | null>(null);
  
  useEffect(() => {
    const feed = isNewsCyclingActive && allNewsData.length > 0 ? allNewsData : filteredCompanyCache;
    const current = feed[activeNewsIdx % feed.length];
    const company = companies.find(c => c.symbol === (current?.symbol || current?.ticker));
    
    if (company && isSafeLatLng(company.lat, company.lng)) {
      setNeuralBloom({ 
        lat: Number(company.lat), 
        lng: Number(company.lng), 
        timestamp: Date.now() 
      });
      // Play tactical chime on bloom
      playTacticalUIAudio("beep");
    }
  }, [activeNewsIdx]);

  const isNewsCyclingActive = isIntelligenceStream;
  const setIsNewsCyclingActive = (val: boolean) => {
    if (toggleIntelligenceStream && val !== isNewsCyclingActive) {
      toggleIntelligenceStream();
    }
  };
  const [isCyclingTriggered, setIsCyclingTriggered] = useState(false); 
  const [lastTimerReset, setLastTimerReset] = useState(Date.now());
  const prevLatestNewsRef = useRef<any>(null);

  useEffect(() => {
    // Vocalize headline on startup - DISABLED per user request for sign-in page silence
    /*
    if (allNewsData.length > 0) {
      const latest = allNewsData[0];
      const utterance = new SpeechSynthesisUtterance(
        `Latest news: ${latest.title}`,
      );
      window.speechSynthesis.speak(utterance);
    }
    */
  }, []);

  useEffect(() => {
    if (isNewsCyclingActive && !isCyclingTriggered) {
      // If we are already in SPIN mode, don't force a lock.
      // Otherwise, default to LOCK mode for automated cycles.
      if (!autoRotateEnabled) {
        setViewportLock(true);
      }
    }
  }, [isNewsCyclingActive, isCyclingTriggered, autoRotateEnabled, setViewportLock]);
  const [mapSentimentFilter, setMapSentimentFilter] = useState<
    "ALL" | "BULLISH" | "BEARISH" | "NEUTRAL"
  >("ALL");
  const [liveNewsCache, setLiveNewsCache] = useState<Record<string, any[]>>({});
  const [isFetchingNews, setIsFetchingNews] = useState(false);
  const [hoveredCompany, setHoveredCompany] = useState<Company | null>(null);
  const [showAgentPanel, setShowAgentPanel] = useState(true);

  const audioContextRef = useRef<AudioContext | null>(null);

  // Tactical Audio Synthesizer Beeps/Pings
  const playTacticalUIAudio = (type: "beep" | "chime" | "warning") => {
    try {
      if (!audioContextRef.current) {
        const AudioContextClass =
          window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;
        audioContextRef.current = new AudioContextClass();
      }

      const ctx = audioContextRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "beep") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 pitch
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.12);
      } else if (type === "chime") {
        // High quality tactical chime double beep
        osc.type = "sine";
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08); // E5
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.setValueAtTime(0.03, ctx.currentTime + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.35);
      } else if (type === "warning") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(110, ctx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.25);
      }
    } catch (e) {
      console.warn("Blocked by browser audio rules", e);
    }
  };

  const speakWithEnhancedVoice = async (text: string) => {
    if (!isVocalizerEnabled) return;
    
    // Stop any current speaking
    if (window.speechSynthesis) window.speechSynthesis.cancel();
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

    // Stop other speakers like sidebar
    window.dispatchEvent(new CustomEvent('app-tts-play', { detail: { origin: 'map' } }));
    
    // Check for cooldown (rate limiting from server)
    if (Date.now() < ttsCooldownRef.current) {
      console.warn("[TTS] Server cooldown active. Using browser synthesis.");
      triggerBrowserFallback(text);
      return;
    }

    // Trigger double-pitch tactical briefing chime ping
    playTacticalUIAudio("chime");

    setIsSpeechLoading(true);
    try {
      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/api/ai/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice: "Zephyr" })
      });
      
      if (!response.ok) {
        if (response.status === 429) {
          // Engage cooldown for 10 minutes if quota hit
          ttsCooldownRef.current = Date.now() + 600000;
          throw new Error("QUOTA_EXHAUSTED");
        }
        throw new Error("Voice uplink failed");
      }
      
      const data = await response.json();
      if (data.audio) {
        // Handle Gemini TTS output: directly decode PCM for optimal stability
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
            if ((window as any)._activeTtsSourceMap === source) {
              (window as any)._activeTtsSourceMap = null;
            }
          };
          
          (window as any)._activeTtsSourceMap = source;
          setIsSpeaking(true);
          source.start();
        } catch (pcmErr) {
          console.warn("PCM Playback failed, trying standard HTML5 audio fallbacks:", pcmErr);
          const audio = new Audio("data:audio/wav;base64," + data.audio);
          audioRef.current = audio;
          audio.onended = () => {
            setIsSpeaking(false);
            audioRef.current = null;
          };
          audio.onerror = () => {
            setIsSpeaking(false);
            triggerBrowserFallback(text);
          };
          setIsSpeaking(true);
          await audio.play().catch((playErr) => {
            console.warn("Direct HTML5 audio play failed:", playErr);
            triggerBrowserFallback(text);
          });
        }
      }
    } catch (err: any) {
      if (err.message !== "QUOTA_EXHAUSTED" && err.message !== "Failed to fetch") {
        console.error("News vocalization failed:", err);
      }
      triggerBrowserFallback(text);
    } finally {
      setIsSpeechLoading(false);
    }
  };

  const triggerBrowserFallback = (text: string) => {
    if (!window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Attempt to find high-quality voices available in browser
    const voices = window.speechSynthesis.getVoices();
    let preferredVoice = voices.find(v => 
      v.lang.startsWith("en") && 
      (v.name.includes("Neural") || v.name.includes("Natural") || v.name.includes("Google") || v.name.includes("Premium"))
    );
    
    if (!preferredVoice) {
      preferredVoice = voices.find(v => v.lang.startsWith("en"));
    }
    
    if (preferredVoice) utterance.voice = preferredVoice;
    
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.volume = 0.9;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    window.speechSynthesis.speak(utterance);
  };

  // Navigation and Typewriter States
  const [isNavAnimationFinished, setIsNavAnimationFinished] = useState(false);
  const [typedBriefing, setTypedBriefing] = useState("");
  const [localIsSearching, setLocalIsSearching] = useState(false);

  // Typewriter stream and reset animation flag when navigation target updates
  useEffect(() => {
    if (!agentFocus) {
      setTypedBriefing("");
      setIsNavAnimationFinished(false);
      return;
    }

    setIsNavAnimationFinished(false);
    setTypedBriefing("");
    let index = 0;
    
    // Safely extract text to avoid [object Object] gibberish if the AI returned a nested structure
    let extractedText = "";
    if (typeof agentFocus.briefing === "string") {
      extractedText = agentFocus.briefing;
    } else if (Array.isArray(agentFocus.briefing)) {
      extractedText = agentFocus.briefing.join(" ");
    } else if (typeof agentFocus.briefing === "object" && agentFocus.briefing !== null) {
      extractedText = JSON.stringify(agentFocus.briefing);
    } else {
      extractedText = String(agentFocus.explanation || agentFocus.briefing || "");
    }
    
    const fullText = extractedText;
    if (!fullText) return;
    
    const chars = Array.from(fullText);

    const interval = setInterval(() => {
      index++;
      setTypedBriefing(chars.slice(0, index).join(""));
      if (index >= chars.length) {
        clearInterval(interval);
      }
    }, 15);

    return () => clearInterval(interval);
  }, [agentFocus]);

  const [countriesGeoJson, setCountriesGeoJson] = useState<any>(null);
  const [statesGeoJson, setStatesGeoJson] = useState<any>(null);

  // Fetch GeoJSON borders for 2D Map rendering
  useEffect(() => {
    let isMounted = true;

    const countryUrls = [
      "/ne_110m_admin_0_countries.geojson",
      "https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_110m_admin_0_countries.geojson",
      "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson"
    ];

    const stateUrls = [
      "/ne_110m_admin_1_states_provinces.geojson",
      "https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_110m_admin_1_states_provinces.geojson",
      "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_1_states_provinces.geojson"
    ];

    const loadCountries = async () => {
      for (const url of countryUrls) {
        try {
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            if (isMounted) setCountriesGeoJson(data);
            return;
          }
        } catch (e) {
          // try next mirror
        }
      }
      console.warn("Could not load 2D country boundaries from any mirror source.");
    };

    const loadStates = async () => {
      for (const url of stateUrls) {
        try {
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            if (isMounted) setStatesGeoJson(data);
            return;
          }
        } catch (e) {
          // try next mirror
        }
      }
      console.warn("Could not load 2D state boundaries from any mirror source.");
    };

    loadCountries();
    loadStates();

    return () => {
      isMounted = false;
    };
  }, []);

  const activeCompanyForCache = focusStock || selectedStock || companies[0];
  const companyCache = useMemo(() => {
    return liveNewsCache[activeCompanyForCache.symbol] || [];
  }, [liveNewsCache, activeCompanyForCache.symbol]);

  const filteredCompanyCache = useMemo(() => {
    let filtered = companyCache;
    if (mapSentimentFilter !== "ALL") {
      filtered = filtered.filter((item: any) => {
        const { sentiment } = analyzeSentimentAndImpact(item);
        return sentiment === mapSentimentFilter;
      });
    }
    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (item: any) =>
          (item.headline || item.title || "")
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          (item.summary || "")
            .toLowerCase()
            .includes(searchQuery.toLowerCase()),
      );
    }
    return filtered;
  }, [companyCache, mapSentimentFilter, searchQuery]);

  const activeNewsFeed = useMemo(() => {
    return isNewsCyclingActive && allNewsData.length > 0
      ? allNewsData.filter(
          (item: any) =>
            !searchQuery.trim() ||
            (item.headline || item.title || "")
              .toLowerCase()
              .includes(searchQuery.toLowerCase()) ||
            (item.summary || "")
              .toLowerCase()
              .includes(searchQuery.toLowerCase()),
        )
      : filteredCompanyCache;
  }, [isNewsCyclingActive, allNewsData, searchQuery, filteredCompanyCache]);

  const currentItem = useMemo(() => {
    return activeNewsFeed.length > 0
      ? activeNewsFeed[activeNewsIdx % activeNewsFeed.length]
      : null;
  }, [activeNewsFeed, activeNewsIdx]);

  // Listen for newly popped up news stories and immediately focus them + reset cycle timer
  useEffect(() => {
    if (!allNewsData || allNewsData.length === 0) return;
    const currentLatest = allNewsData[0];

    if (
      prevLatestNewsRef.current &&
      prevLatestNewsRef.current.title !== currentLatest.title
    ) {
      // A brand new story just popped up!
      if (isVocalizerEnabled) {
        const text = `Incoming intelligence: ${currentLatest.headline || currentLatest.title}.`;
        speakWithEnhancedVoice(text);
      }
      if (isNewsCyclingActive) {
        setActiveNewsIdx(0);
        setLastTimerReset(Date.now());
      }
      const company = companies.find(
        (c) => c.symbol === (currentLatest.symbol || currentLatest.ticker),
      );
      if (company && isNewsCyclingActive) {
        onSelectNode(company, true);
      }
    }

    prevLatestNewsRef.current = currentLatest;
  }, [allNewsData, isNewsCyclingActive, onSelectNode]);

  // Auto-cycle through news stories if active - State Updater (Following the stories being streamed on the globe/map)
  useEffect(() => {
    if (!isNewsCyclingActive) return;
    const storiesCount =
      allNewsData.length > 0 ? allNewsData.length : filteredCompanyCache.length;
    if (storiesCount === 0) return;

    const interval = setInterval(() => {
      setActiveNewsIdx((prev) => (prev + 1) % storiesCount);
    }, 30000); // 30-second cycle interval

    return () => clearInterval(interval);
  }, [
    isNewsCyclingActive,
    allNewsData.length,
    filteredCompanyCache.length,
    lastTimerReset,
  ]);

  // Handle focusing the node when activeNewsIdx changes in auto news cycle
  useEffect(() => {
    if (!isNewsCyclingActive) return;

    const feed = allNewsData.length > 0 ? allNewsData : filteredCompanyCache;
    if (feed.length === 0) return;

    const currentNews = feed[activeNewsIdx % feed.length];
    const company = companies.find(
      (c) => c.symbol === (currentNews?.symbol || currentNews?.ticker),
    );
    if (company && company.symbol !== selectedStock?.symbol) {
      // Small debounce to prevent rapid fire-storm of focus events during transitions
      const timer = setTimeout(() => {
        onSelectNode(company, true);
        if (viewportLock) {
          setAgentFocus?.({
            locationName: company.name,
            lat: company.lat,
            lng: company.lng,
            zoomLevel: 5,
          });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [
    activeNewsIdx,
    isNewsCyclingActive,
    onSelectNode,
    selectedStock,
    allNewsData,
    filteredCompanyCache,
    setAgentFocus,
  ]);

  const fetchLiveNews = async (ticker: string) => {
    setIsFetchingNews(true);
    const baseUrl = getApiBaseUrl();
    try {
      const res = await fetch(`${baseUrl}/api/ai/news`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ ticker }),
      });
      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("text/html")) {
          // Dev server is likely reloading, skip gracefully
          console.warn(
            "Received HTML instead of JSON for live news. Dev server might be restarting.",
          );
          return;
        }
        const payload = await res.json();
        setLiveNewsCache((prev) => {
          const updated = {
            ...prev,
            [ticker]: [
              ...(prev[ticker] || []).filter((n) => !n.isGenerating),
              payload,
            ],
          };
          const len = updated[ticker]?.length || 1;
          if (!isNewsCyclingActive) {
            setTimeout(() => {
              setActiveNewsIdx(len - 1);
            }, 0);
          }
          return updated;
        });
      }
    } catch (e: any) {
      // Silently catch common dev server transition errors to prevent console pollution
      if (
        e?.message?.includes("Failed to fetch") ||
        e instanceof SyntaxError ||
        e?.message?.includes("Unexpected token") ||
        e?.name === "SyntaxError"
      ) {
        return;
      }
      console.error("Failed to fetch live news:", e);
    } finally {
      setIsFetchingNews(false);
    }
  };

  // Zero-lag state snap for live news & fallback initiation
  useEffect(() => {
    const symbol = selectedStock?.symbol || focusStock?.symbol;
    if (symbol) {
      if (!liveNewsCache[symbol]) {
        // Instantiate a zero-lag fallback payload immediately without spinner
        const instantFallback = {
          ticker: symbol,
          headline: `SYS_INIT: UPLINK ESTABLISHED FOR ${symbol}`,
          summary: `Resolving market topologies and high-frequency sentiment pipelines for ${symbol}. Establishing local handshake. Expect latency until upstream payload resolves.`,
          marketLocation: "GLOBAL METRICS NODE",
          sentiment: "NEUTRAL",
          timestamp: new Date()
            .toISOString()
            .replace("T", " ")
            .substring(0, 19),
          isGenerating: true,
        };
        setLiveNewsCache((prev) => ({ ...prev, [symbol]: [instantFallback] }));
        if (!isNewsCyclingActive) {
          setActiveNewsIdx(0);
        }
        fetchLiveNews(symbol);
      } else {
        // Instantly snap to the end of the existing cached payloads
        if (!isNewsCyclingActive) {
          setActiveNewsIdx(liveNewsCache[symbol].length - 1);
        }
      }
    } else {
      if (!isNewsCyclingActive) {
        setActiveNewsIdx(0);
      }
    }
  }, [selectedStock, focusStock, isNewsCyclingActive]);

  const currentNewsItem = useMemo(() => {
    if (isNewsCyclingActive && allNewsData.length > 0) {
      return allNewsData[activeNewsIdx % allNewsData.length];
    }
    return filteredCompanyCache.length > 0
      ? filteredCompanyCache[activeNewsIdx % filteredCompanyCache.length]
      : null;
  }, [isNewsCyclingActive, allNewsData, activeNewsIdx, filteredCompanyCache]);

  const activePosition = React.useMemo((): [number, number] | null => {
    try {
      if (isNewsCyclingActive && currentNewsItem) {
        const company = companies.find(
          (c) =>
            c.symbol === (currentNewsItem?.symbol || currentNewsItem?.ticker),
        );
        if (company && isSafeLatLng(company.lat, company.lng)) {
          return [Number(company.lat), Number(company.lng)];
        }
      }
      const target = focusStock || selectedStock;
      if (target && isSafeLatLng(target.lat, target.lng)) {
        const lat = Number(target.lat);
        const lng = Number(target.lng);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          return [lat, lng];
        }
      }
      if (agentFocus && isSafeLatLng(agentFocus.lat, agentFocus.lng)) {
        const lat = Number(agentFocus.lat);
        const lng = Number(agentFocus.lng);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          return [lat, lng];
        }
      }
    } catch {
      return null;
    }
    return null;
  }, [
    focusStock,
    selectedStock,
    agentFocus,
    isNewsCyclingActive,
    currentNewsItem,
  ]);

  // Derive partner lines
  const getRelationshipDetails = (c1: Company, c2: Company) => {
    // Deterministic values based on characters of symbols
    const hash = (c1.symbol.charCodeAt(0) + c2.symbol.charCodeAt(0)) % 10;

    // Choose currency volume
    const volValue = (hash * 4.4 + 1.2).toFixed(2);
    let currencyVol = `USD $${volValue}M`;
    if (
      c1.country === "EU" ||
      c1.country === "DEU" ||
      c1.country === "FRA" ||
      c1.country === "NLD"
    ) {
      currencyVol = `EUR €${volValue}M`;
    } else if (c1.country === "JPN") {
      currencyVol = `JPY ¥${(parseFloat(volValue) * 150).toFixed(0)}M`;
    } else if (c1.country === "CHN") {
      currencyVol = `CNY ¥${(parseFloat(volValue) * 7).toFixed(1)}M`;
    } else if (c1.country === "KOR") {
      currencyVol = `KRW ₩${(parseFloat(volValue) * 1.3).toFixed(1)}B`;
    }

    // Choose relationship type and commodity
    let relType = "Logistics Distribution Hub";
    let commodity = "Industrial Commodities";
    let unit = "tons";
    let qty = (hash * 25 + 10) * 100;

    const combinedSectors = `${c1.sector}|${c2.sector}`;
    if (
      combinedSectors.includes("Semiconductors") ||
      combinedSectors.includes("Technology")
    ) {
      relType = "Semiconductor Supply Chain";
      commodity = "Semiconductor Materials";
      unit = "units";
      qty = (hash * 12 + 5) * 50;
    } else if (combinedSectors.includes("Energy")) {
      relType = "Energy Distribution Pipeline";
      commodity = "Crude Oil";
      unit = "bbl/day";
      qty = (hash * 80 + 15) * 200;
    } else if (combinedSectors.includes("Basic Materials")) {
      relType = "Mineral Processing Channel";
      commodity = "Iron Ore";
      unit = "tons";
      qty = (hash * 350 + 50) * 80;
    } else if (combinedSectors.includes("Automotive")) {
      relType = "Automotive Component Transit";
      commodity = "EV Battery Modules";
      unit = "modules";
      qty = (hash * 50 + 20) * 150;
    } else if (combinedSectors.includes("Financial Services")) {
      relType = "Financial Transaction Network";
      commodity = "Settlement Services";
      unit = "txns/sec";
      qty = hash * 400 + 250;
    } else if (
      combinedSectors.includes("Consumer Cyclical") ||
      combinedSectors.includes("Consumer Defensive")
    ) {
      relType = "Retail Supply Chain";
      commodity = "Consumer Goods";
      unit = "pallets";
      qty = (hash * 120 + 40) * 10;
    }

    return {
      relType,
      commodity,
      qty: `${qty.toLocaleString()} ${unit}`,
      currencyVol,
    };
  };

  const partnerLines = React.useMemo((): {
    coords: [[number, number], [number, number]];
    color: string;
    from: Company;
    to: Company;
  }[] => {
    const lines: {
      coords: [[number, number], [number, number]];
      color: string;
      from: Company;
      to: Company;
    }[] = [];

    const addLine = (c1: Company, c2: Company, color: string) => {
      if (isSafeLatLng(c1.lat, c1.lng) && isSafeLatLng(c2.lat, c2.lng)) {
        lines.push({
          coords: [
            [Number(c1.lat), Number(c1.lng)],
            [Number(c2.lat), Number(c2.lng)],
          ],
          color: color,
          from: c1,
          to: c2,
        });
      }
    };

    // 1. If hovered, show all its connections
    if (hoveredCompany && hoveredCompany.partners) {
      hoveredCompany.partners.forEach((pSymbol) => {
        const partner = companies.find((c) => c.symbol === pSymbol);
        if (partner) addLine(hoveredCompany, partner, "#34d399"); // emerald-400
      });
    }
    // 2. If Pinned Tab + selectedStock
    if (activeTab === "PINNED" && selectedStock && selectedStock.partners) {
      selectedStock.partners.forEach((pSymbol) => {
        const partner = companies.find((c) => c.symbol === pSymbol);
        if (partner) addLine(selectedStock, partner, "#ffffff"); // Highlight selected
      });
    }
    // 3. If Global
    const anchor = networkAnchor || selectedStock;
    if (showGlobalNetwork && anchor) {
      if (anchor.partners) {
        anchor.partners.forEach((pSymbol) => {
          const partner = companies.find((c) => c.symbol === pSymbol);
          if (partner) addLine(anchor, partner, "#10b981"); // emerald-500
        });
      }
      
      // Also show incoming connections
      companies.forEach(fromStock => {
        if (fromStock.partners?.includes(anchor.symbol)) {
          addLine(fromStock, anchor, "#eab308"); // yellow-500 for incoming
        }
      });
    }

    // 4. Draw dynamic supplier & customer stream nodes for selectedStock
    if (selectedStock && relationships) {
      if (Array.isArray(relationships.suppliers)) {
        relationships.suppliers.forEach((s) => {
          const partner = companies.find((c) => c.symbol === s.symbol);
          if (partner) {
            addLine(partner, selectedStock, "#38bdf8"); // sky-400 (Incoming supplier stream)
          }
        });
      }
      if (Array.isArray(relationships.customers)) {
        relationships.customers.forEach((c) => {
          const partner = companies.find((comp) => comp.symbol === c.symbol);
          if (partner) {
            addLine(selectedStock, partner, "#f97316"); // orange-500 (Outgoing customer stream)
          }
        });
      }
    }

    return lines;
  }, [selectedStock, activeTab, hoveredCompany, showGlobalNetwork, networkAnchor, relationships]);

  // Ref to store markers for programmatic popup opening
  const markerRefs = useRef<{ [key: string]: L.Marker | null }>({});

  useEffect(() => {
    if (is3DMode || !viewportLock) return;
    try {
      const target = focusStock || selectedStock;
      if (target && markerRefs.current[target.symbol]) {
        const marker = markerRefs.current[target.symbol];
        if (marker) {
          // Delay to allow flyTo to progress
          const timer = setTimeout(() => {
            try {
              if (marker && typeof marker.openPopup === "function") {
                marker.openPopup();
              }
            } catch (err) {
              console.warn(
                "Could not open popup for marker",
                target.symbol,
                err,
              );
            }
          }, 1200);
          return () => clearTimeout(timer);
        }
      }
    } catch (err) {
      console.warn("Popup effect failed gracefully", err);
    }
  }, [focusStock, selectedStock, is3DMode]);

  return (
    <div className="flex-1 relative bg-[#050505] overflow-hidden map-green-hued tactical-grid">
      <div className="absolute top-1 right-1 z-[1002] flex flex-col gap-1 pointer-events-auto items-end">
        {/* Main Control Cluster */}
        <div className="bg-black/90 backdrop-blur-xl border border-emerald-500/25 p-1.5 flex flex-col gap-1.5 shadow-2xl scale-[0.7] sm:scale-85 md:scale-90 lg:scale-100 origin-top-right w-[170px]">
          {/* Section: Projection Mode Segmented Picker */}
          <div className="flex flex-col gap-1 border-b border-emerald-500/15 pb-1.5">
            <span className="text-[7px] text-zinc-500 uppercase tracking-widest font-mono select-none px-1 text-left font-bold">
              PROJECTION SYSTEM
            </span>
            <div className="grid grid-cols-2 gap-0.5 bg-black/40 border border-zinc-900 p-0.5 rounded-none">
              <button
                onClick={() => {
                  setIs3DMode(true);
                  setViewportLock(true);
                }}
                className={cn(
                  "h-7 flex items-center justify-center gap-1 transition-all text-[8px] font-black uppercase tracking-wider border select-none cursor-pointer",
                  is3DMode
                    ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400"
                    : "bg-transparent border-transparent text-zinc-500 hover:text-zinc-400 hover:bg-zinc-900/30",
                )}
                title="Tactical 3D Globe Projection [G]"
              >
                <GlobeIcon className="w-3 h-3" />
                <span>3D GLOBE</span>
              </button>

              <button
                onClick={() => {
                  setIs3DMode(false);
                  setViewportLock(false);
                }}
                className={cn(
                  "h-7 flex items-center justify-center gap-1 transition-all text-[8px] font-black uppercase tracking-wider border select-none cursor-pointer",
                  !is3DMode
                    ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400"
                    : "bg-transparent border-transparent text-zinc-500 hover:text-zinc-400 hover:bg-zinc-900/30",
                )}
                title="Strategy 2D Map Projection [G]"
              >
                <MapIcon className="w-3 h-3" />
                <span>2D MAP</span>
              </button>
            </div>
          </div>

            <div className="grid grid-cols-1 gap-1">
            {selectedStock && (
              <div className="relative group/btn">
                <button
                  id="network-toggle-btn"
                  onClick={() => {
                    if (toggleGlobalNetwork) toggleGlobalNetwork();
                    if (!showGlobalNetwork) {
                      if (isNewsCyclingActive) {
                        setIsNewsCyclingActive(false);
                        setIsCyclingTriggered(false);
                      }
                      if (showNewsSummary) setShowNewsSummary(false);
                    }
                  }}
                  className={cn(
                    "w-full h-9 border flex items-center justify-center transition-all duration-200 group relative overflow-hidden cursor-pointer",
                    showGlobalNetwork
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.6)]"
                      : "bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:border-emerald-500/50 hover:text-emerald-500 hover:shadow-[0_0_10px_rgba(16,185,129,0.2)] hover:bg-emerald-950/40",
                  )}
                >
                  <div className="absolute inset-0 bg-emerald-500/10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <Network className={cn("w-4 h-4", showGlobalNetwork ? "drop-shadow-[0_0_5px_rgba(16,185,129,0.8)]" : "")} />
                </button>
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-0 group-hover/btn:opacity-100 transition-opacity whitespace-nowrap bg-zinc-950 border border-emerald-500/40 text-[9px] text-emerald-400 font-mono font-black py-1 px-2 tracking-widest uppercase shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                  {networkAnchor ? `LOCKED: ${networkAnchor.symbol} NETWORKS` : "SUPPLIERS & CUSTOMERS"}
                </div>
              </div>
            )}
          </div>

          {/* Section: Observation Mode Segmented Picker */}
          <div className="flex flex-col gap-1 border-t border-emerald-500/15 pt-1.5">
            <span className="text-[7px] text-zinc-500 uppercase tracking-widest font-mono select-none px-1 text-left font-bold">
              OBSERVATION PROFILE
            </span>
            <div className="grid grid-cols-3 gap-0.5 bg-black/40 border border-zinc-900 p-0.5 rounded-none">
              {/* SPIN button */}
              <button
                onClick={() => {
                  setAutoRotateEnabled(true);
                  setViewportLock(false);
                }}
                className={cn(
                  "h-[36px] flex flex-col items-center justify-center transition-all text-[7px] md:text-[8px] font-black uppercase tracking-tighter border select-none leading-none gap-1 cursor-pointer",
                  autoRotateEnabled && !viewportLock
                    ? "bg-emerald-500/25 border-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] ring-1 ring-emerald-500/50"
                    : "bg-zinc-900/60 border-zinc-800 text-zinc-500 hover:text-zinc-400 hover:bg-zinc-900/80",
                )}
                title="Continuous axis scan rotation [S]"
              >
                <div className="relative">
                  <RefreshCcw className={cn("w-3 h-3", autoRotateEnabled && !viewportLock ? "animate-[spin_3s_linear_infinite]" : "")} />
                </div>
                <span className="flex flex-col items-center gap-px">
                  <span>SPIN</span>
                  <span className="text-[6px] opacity-60 font-mono">[S]</span>
                </span>
              </button>

              {/* FREE button */}
              <button
                onClick={() => {
                  setAutoRotateEnabled(false);
                  setViewportLock(false);
                }}
                className={cn(
                  "h-[36px] flex flex-col items-center justify-center transition-all text-[7px] md:text-[8px] font-black uppercase tracking-tighter border select-none leading-none gap-1 cursor-pointer",
                  !autoRotateEnabled && !viewportLock
                    ? "bg-zinc-700 border-zinc-500 text-white shadow-[0_0_10px_rgba(255,255,255,0.1)]"
                    : "bg-zinc-900/60 border-zinc-800 text-zinc-500 hover:text-zinc-400 hover:bg-zinc-900/80",
                )}
                title="Unrestricted interactive manual orbit [F]"
              >
                <Crosshair className="w-3 h-3" />
                <span className="flex flex-col items-center gap-px">
                  <span>FREE</span>
                  <span className="text-[6px] opacity-60 font-mono">[F]</span>
                </span>
              </button>

              {/* LOCK button */}
              <button
                onClick={() => {
                  setAutoRotateEnabled(false);
                  if (viewportLock) {
                    setViewportLock(false);
                    setTimeout(() => setViewportLock(true), 50);
                  } else {
                    setViewportLock(true);
                  }
                }}
                className={cn(
                  "h-[36px] flex flex-col items-center justify-center transition-all text-[7px] md:text-[8px] font-black uppercase tracking-tighter border select-none leading-none gap-1 cursor-pointer",
                  viewportLock
                    ? "bg-blue-600/30 border-blue-400 text-blue-100 shadow-[0_0_15px_rgba(59,130,246,0.2)] ring-1 ring-blue-500/50"
                    : "bg-zinc-900/60 border-zinc-800 text-zinc-500 hover:text-zinc-400 hover:bg-zinc-900/80",
                )}
                title="Viewport tracking lock on active node [L]"
              >
                <Target className={cn("w-3 h-3", viewportLock ? "animate-pulse" : "")} />
                <span className="flex flex-col items-center gap-px">
                  <span>LOCK</span>
                  <span className="text-[6px] opacity-60 font-mono">[L]</span>
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute top-[210px] right-3 md:top-[220px] md:right-4 z-[1001] pointer-events-auto flex flex-col gap-2 w-[110px] md:w-[150px]">
        {!showNewsSummary && (
          <div className="bg-zinc-950/90 backdrop-blur-md border border-zinc-800/50 p-2.5 md:p-3 flex flex-col gap-1.5 rounded-none overflow-hidden relative shadow-[0_8px_32px_rgba(0,0,0,0.9)]">
            {/* Subtle visual accent */}
            <div
              className="absolute top-0 right-0 w-4 h-4 bg-emerald-500/10 pointer-events-none"
              style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%)" }}
            />

            <div className="flex items-center justify-between font-mono text-[8px] md:text-[9px] text-zinc-500 border-b border-zinc-900 pb-1.5 font-sans">
              <div
                className={cn(
                  "flex items-center gap-1.5 uppercase font-bold tracking-wider",
                  currentItem?.sentiment === "BULLISH"
                    ? "text-emerald-400"
                    : currentItem?.sentiment === "BEARISH"
                    ? "text-red-400"
                    : "text-amber-500/90",
                )}
              >
                <span className="w-1.5 h-1.5 bg-current rounded-full" />
                <span>FLASH INTEL STREAM</span>
              </div>
              <button
                onClick={() => {
                  const newState = !isNewsCyclingActive;
                  setIsNewsCyclingActive(newState);
                  setIsCyclingTriggered(newState);
                  if (newState) {
                    if (showGlobalNetwork && toggleGlobalNetwork) toggleGlobalNetwork();
                    setViewportLock(true);
                  }
                }}
                className={cn(
                  "p-0.5 border transition-all cursor-pointer rounded-px",
                  isNewsCyclingActive 
                    ? "bg-emerald-500 border-emerald-400 text-black shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                    : "bg-zinc-900 border-zinc-700 text-zinc-500"
                )}
                title="Toggle Auto Intelligence Stream"
              >
                <RefreshCcw className={cn("w-2.5 h-2.5", isNewsCyclingActive ? "animate-[spin_4s_linear_infinite]" : "")} />
              </button>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={
                  currentItem
                    ? currentItem.intelligence?.translatedTitle ||
                      currentItem.translatedTitle ||
                      currentItem.headline ||
                      currentItem.title ||
                      currentItem.name
                    : "empty-news"
                }
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 5 }}
                transition={{ duration: 0.15, ease: "linear" }}
                className="space-y-1 my-0.5"
              >
                {currentItem ? (
                  <>
                    <h4
                      className={cn(
                        "text-[10px] md:text-[12px] uppercase font-black leading-[1.1] tracking-tighter line-clamp-3 cursor-pointer hover:underline pl-2 border-l-2 border-zinc-700/50 mb-1",
                        currentItem?.sentiment === "BULLISH"
                          ? "text-emerald-400"
                          : currentItem?.sentiment === "BEARISH"
                          ? "text-red-400"
                          : "text-amber-500/90",
                      )}
                      onClick={() => {
                        setShowNewsSummary(true);
                        const company = companies.find((c) => c.symbol === (currentItem.symbol || currentItem.ticker));
                        if (company) onSelectNode(company, false);
                      }}
                    >
                      {currentItem.intelligence?.translatedTitle ||
                        currentItem.translatedTitle ||
                        currentItem.headline ||
                        currentItem.title ||
                        currentItem.name}
                    </h4>
                    <div className="text-[7px] text-zinc-500 font-mono tracking-widest pl-2 opacity-60 uppercase">
                      {currentItem.ticker || currentItem.symbol} //{" "}
                      {currentItem.country || "GLOBAL_FEED"}
                    </div>
                  </>
                ) : (
                  <div className="text-[8px] md:text-[9px] text-zinc-600 uppercase font-mono tracking-tighter flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-zinc-800 animate-pulse" />
                    WAIT_PACKET_QUEUE...
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            <div className="flex items-center justify-between pt-1.5 border-t border-zinc-900/80 gap-1.5">
              <div className="flex gap-1">
                <button
                  onClick={() => {
                    const count = activeNewsFeed.length;
                    if (count > 0) {
                      const nextIdx = (activeNewsIdx - 1 + count) % count;
                      setActiveNewsIdx(nextIdx);
                      const item = activeNewsFeed[nextIdx];
                      if (item) {
                        if (isVocalizerEnabled) {
                          const text = `${item.translatedTitle || item.headline || item.title || item.name}.`;
                          speakWithEnhancedVoice(text);
                        }
                        const company = companies.find((c) => c.symbol === (item.symbol || item.ticker));
                        if (company) onSelectNode(company, true);
                      }
                    }
                  }}
                  className="w-5 h-4.5 border border-zinc-800 text-[8px] flex items-center justify-center hover:bg-zinc-900 hover:text-white cursor-pointer text-zinc-500 rounded-none transition-colors"
                >
                  «
                </button>
                <button
                  onClick={() => {
                    const count = activeNewsFeed.length;
                    if (count > 0) {
                      const nextIdx = (activeNewsIdx + 1) % count;
                      setActiveNewsIdx(nextIdx);
                      const item = activeNewsFeed[nextIdx];
                      if (item) {
                        if (isVocalizerEnabled) {
                          const text = `${item.translatedTitle || item.headline || item.title || item.name}.`;
                          speakWithEnhancedVoice(text);
                        }
                        const company = companies.find((c) => c.symbol === (item.symbol || item.ticker));
                        if (company) onSelectNode(company, true);
                      }
                    }
                  }}
                  className="w-5 h-4.5 border border-zinc-800 text-[8px] flex items-center justify-center hover:bg-zinc-900 hover:text-white cursor-pointer text-zinc-500 rounded-none transition-colors"
                >
                  »
                </button>
                <button
                  onClick={() => {
                    setIsVocalizerEnabled(true);
                    const text = `${currentItem.translatedTitle || currentItem.headline || currentItem.title || currentItem.name}.`;
                    if (text) {
                      speakWithEnhancedVoice(text);
                    }
                  }}
                  className={cn(
                    "w-5 h-4.5 border border-zinc-800 text-[8px] flex items-center justify-center hover:bg-emerald-900/50 hover:text-emerald-400 cursor-pointer rounded-none transition-colors",
                    isVocalizerEnabled ? "text-emerald-400 bg-emerald-900/20 shadow-[0_0_5px_rgba(16,185,129,0.3)]" : "text-zinc-500"
                  )}
                >
                  🔊
                </button>
              </div>
              <button
                onClick={() => setShowNewsSummary(true)}
                className="uppercase font-black tracking-widest text-emerald-500 hover:text-emerald-300 cursor-pointer text-[6.5px] md:text-[7.5px] transition-colors flex items-center gap-1"
              >
                <span>DATA</span>
                <Newspaper className="w-2 h-2" />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className={cn("w-full h-full absolute inset-0 z-10 duration-200 transition-opacity", !is3DMode && "opacity-0 pointer-events-none")}>
        <Suspense
          fallback={
            <div className="absolute inset-0 bg-black flex flex-col items-center justify-center">
              <div className="w-12 h-12 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full" />
              <div className="mt-4 text-emerald-500/50 font-mono text-[10px] tracking-widest uppercase">
                INITIALIZING TACTICAL 3D...
              </div>
            </div>
          }
        >
          <Globe
            selectedStock={
              viewportLock || isNewsCyclingActive ? selectedStock : null
            }
            onSelectNode={onSelectNode}
            marketData={marketData}
            newsData={allNewsData}
            sentiment={sentiment}
            showAllConnections={showGlobalNetwork}
            networkAnchor={networkAnchor}
            onInjectLiveNews={onInjectLiveNews}
            activeCorridorId={activeCorridorId}
            agentFocus={viewportLock || isNewsCyclingActive ? agentFocus : null}
            agentEntities={agentEntities}
            viewportLock={viewportLock}
            setViewportLock={setViewportLock}
            autoRotateEnabled={autoRotateEnabled}
            setAutoRotateEnabled={setAutoRotateEnabled}
            isNewsCyclingActive={isNewsCyclingActive}
            mapLayers={mapLayers}
          />
        </Suspense>
      </div>

      <div className={cn("w-full h-full absolute inset-0 z-20 duration-200 transition-opacity", is3DMode && "opacity-0 pointer-events-none")}>
        <MapContainer
          center={[20, 0]}
          zoom={4}
          className="w-full h-full bg-[#13263a]"
          zoomControl={false}
          attributionControl={false}
          dragging={!viewportLock && !isNewsCyclingActive && !is3DMode}
          touchZoom={!viewportLock && !isNewsCyclingActive && !is3DMode}
          doubleClickZoom={!viewportLock && !isNewsCyclingActive && !is3DMode}
          scrollWheelZoom={!viewportLock && !isNewsCyclingActive && !is3DMode}
        >
          {mapLayers.satellite ? (
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              className="map-tile-layer"
            />
          ) : (
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}"
              className="map-tile-layer"
            />
          )}

          {mapLayers.borders && (
            <TileLayer
              url="https://stamen-tiles-{s}.a.ssl.fastly.net/toner-hybrid/{z}/{x}/{y}{r}.png"
              opacity={0.3}
              className="map-tile-layer-borders"
            />
          )}

          {countriesGeoJson && (
            <GeoJSON
              key={`map-countries-${countriesGeoJson.features?.length || 0}`}
              data={countriesGeoJson}
              style={{
                fillColor: "transparent",
                color: "#1e40af", // deep base blue outline for countries
                weight: 1.2,
                opacity: 0.5,
                fillOpacity: 0,
              }}
            />
          )}

          {statesGeoJson && (
            <GeoJSON
              key={`map-states-${statesGeoJson.features?.length || 0}`}
              data={statesGeoJson}
              style={{
                fillColor: "transparent",
                color: "#0369a1", // beautiful slate sky-blue state borders
                weight: 0.6,
                opacity: 0.5,
                fillOpacity: 0,
              }}
            />
          )}

          <MapController
            selectedPosition={
              viewportLock || isNewsCyclingActive ? activePosition : null
            }
            zoomLevel={isNewsCyclingActive ? 9 : agentFocus?.zoomLevel || 6}
            onAnimationEnd={() => setIsNavAnimationFinished(true)}
            networkAnchor={networkAnchor}
            is3DMode={is3DMode}
          />

          <div className="absolute bottom-4 left-4 z-[1002] flex flex-col gap-2 p-3 bg-black/90 backdrop-blur-xl border border-zinc-800 rounded-sm pointer-events-auto">
            <div className="text-[8px] font-black font-mono text-zinc-500 uppercase tracking-widest mb-2 border-b border-zinc-900 pb-1">Tactical Map Legend</div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                <span className="text-[7.5px] font-mono text-zinc-400 uppercase">Primary Node [HQ]</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-600/40 border border-red-500/50" />
                <span className="text-[7.5px] font-mono text-zinc-400 uppercase">Critical Activity Zone</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex gap-[0.5px]">
                  <div className="w-1.5 h-1.5 bg-emerald-500/20" />
                  <div className="w-1.5 h-1.5 bg-amber-500/40" />
                  <div className="w-1.5 h-1.5 bg-red-500/60" />
                </div>
                <span className="text-[7.5px] font-mono text-zinc-400 uppercase">Neural Heatmap [Volatility]</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full border border-emerald-500" />
                <span className="text-[7.5px] font-mono text-zinc-400 uppercase">Neural Bloom [Active Intel]</span>
              </div>
            </div>
          </div>

          {mapLayers.heatmap && <HeatmapLayer data={heatmapData} />}

          {neuralBloom && (
            <Marker
              key={`bloom-${neuralBloom.timestamp}`}
              position={[neuralBloom.lat, neuralBloom.lng]}
              icon={L.divIcon({
                className: "neural-bloom-marker",
                html: `<div style="position: relative; display: flex; align-items: center; justify-content: center;">
                  <div style="position: absolute; width: 30px; height: 30px; border-radius: 50%; background-color: rgba(16, 185, 129, 0.4);"></div>
                  <div style="position: absolute; width: 40px; height: 40px; border-radius: 50%; border: 1px solid rgba(16, 185, 129, 0.2);"></div>
                </div>`,
                iconSize: [0, 0],
                iconAnchor: [0, 0]
              })}
            />
          )}

          {mapLayers.hq && companiesToRender.map((company, index) => {
            if (!isSafeLatLng(company.lat, company.lng)) return null;

            const isSelected = selectedStock?.symbol === company.symbol;
            const anchor = networkAnchor || selectedStock;
            
            const isSupplier = anchor && company.partners?.includes(anchor.symbol);
            const isCustomer = anchor && anchor.partners?.includes(company.symbol);
            const isAnchor = anchor && anchor.symbol === company.symbol;
            
            // If in network mode, hide nodes that aren't connected
            if (showGlobalNetwork && anchor) {
              if (!isAnchor && !isSupplier && !isCustomer && !isSelected) {
                return null;
              }
            }

            const isFocus = focusStock?.symbol === company.symbol;
            const hasNews =
              isFocus && intelligenceFeed && intelligenceFeed.length > 0;
            const isHighlighted =
              hoveredCompany &&
              (hoveredCompany.symbol === company.symbol ||
                hoveredCompany.partners?.includes(company.symbol) ||
                company.partners?.includes(hoveredCompany.symbol));

            // Calculate activity score for 2D icons
            const quote = marketData[company.symbol];
            const volatility = quote ? Math.abs(parseFloat(quote.dp) || 0) : 0;
            const companyNewsCount = allNewsData.filter(
              (n) => n.symbol === company.symbol,
            ).length;
            const activityScore = Math.min(
              1,
              volatility / 5 + companyNewsCount / 10,
            );

            const iconColor =
              activityScore > 0.7
                ? "#f59e0b"
                : activityScore > 0.4
                  ? "#3b82f6"
                  : "#10b981";
            const pulseSpeed = 2 / (1 + activityScore * 3);

            const newsIndicator =
              companyNewsCount > 0
                ? `<div style="position: absolute; top: -10px; right: -10px; background: #ef4444; color: white; font-size: 7px; border-radius: 50%; width: 14px; height: 14px; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 1px solid #000; box-shadow: 0 0 5px #ef4444;">${companyNewsCount > 9 ? "9+" : companyNewsCount}</div>`
                : "";
            const logoHtml = `<div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; overflow: hidden; border-radius: 50%; background: #000; border: 1.5px solid ${isSelected || isHighlighted ? "#ffffff" : iconColor}; color: #fff; font-size: 8px; font-weight: 900;">${company.symbol.slice(0, 2)}</div>`;

            const customIcon = L.divIcon({
              className: "custom-tactical-icon",
              html: `<div style="position: relative; width: ${isSelected || isHighlighted ? "28px" : "20px"}; height: ${isSelected || isHighlighted ? "28px" : "20px"};">
                <div style="position: absolute; inset: -4px; border: 1.5px solid ${isSelected || isHighlighted ? "rgba(255,255,255,0.6)" : "rgba(16,185,129,0.1)"}; border-radius: 50%; opacity: 0.5;"></div>
                <div style="position: relative; width: 100%; height: 100%;">
                  ${logoHtml}
                  ${newsIndicator}
                  ${
                    isSelected
                      ? `
                    <div style="position: absolute; width: 42px; height: 42px; left: -7px; top: -7px; border: 1.5px dotted #ffffff; border-radius: 50%; opacity: 0.8; pointer-events: none; z-index: -1;"></div>
                    <div style="position: absolute; width: 56px; height: 56px; left: -14px; top: -14px; border: 2px dashed #ffffff; border-radius: 50%; box-sizing: border-box; pointer-events: none; z-index: -1;"></div>
                  `
                      : ""
                  }
                </div>
              </div>`,
              iconSize: [
                isSelected || isHighlighted ? 28 : 20,
                isSelected || isHighlighted ? 28 : 20,
              ],
              iconAnchor: [
                isSelected || isHighlighted ? 14 : 10,
                isSelected || isHighlighted ? 14 : 10,
              ],
            });

            const pos = safeLatLng(company.lat, company.lng);
            if (!pos) return null;

            return (
              <React.Fragment key={`${company.symbol}-${index}`}>
                <Marker
                  ref={(el) => {
                    markerRefs.current[company.symbol] = el;
                  }}
                  position={pos}
                  icon={customIcon}
                  eventHandlers={{
                    click: (e) => {
                      onSelectNode(company);
                      e.target.openPopup();
                    },
                    mouseover: () => setHoveredCompany(company),
                    mouseout: () => setHoveredCompany(null),
                  }}
                >
                  <Tooltip
                    direction="bottom"
                    offset={[0, 10]}
                    opacity={1}
                    permanent={showGlobalNetwork || isSupplier || isCustomer}
                    className="network-node-tooltip"
                  >
                    <div className={cn(
                      "px-1.5 py-0.5 text-[8px] font-black tracking-widest whitespace-nowrap flex flex-col shadow-[0_4px_12px_rgba(0,0,0,0.6)]",
                      isSupplier ? "bg-yellow-950/95 border border-yellow-500/50 text-yellow-400" :
                      isCustomer ? "bg-emerald-950/95 border border-emerald-500/50 text-emerald-400" :
                      "bg-black/95 border border-zinc-700 text-white"
                    )}>
                      <div className="flex items-center gap-1.5 border-b border-white/5 pb-0.5 mb-0.5">
                        {isSupplier && <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 border border-yellow-400" />}
                        {isCustomer && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 border border-emerald-400" />}
                        <span className="uppercase">{company.symbol}</span>
                        {isSupplier && <span className="px-1 py-0.5 bg-black/50 border border-white/10 rounded-[2px] text-[5.5px] font-black tracking-normal">SUPPLIER</span>}
                        {isCustomer && <span className="px-1 py-0.5 bg-black/50 border border-white/10 rounded-[2px] text-[5.5px] font-black tracking-normal">CUSTOMER</span>}
                      </div>
                      <div className="text-[7.5px] text-zinc-400 font-sans tracking-tight max-w-[130px] truncate normal-case font-medium">
                        {company.name}
                      </div>
                    </div>
                  </Tooltip>
                  <Popup className="custom-popup" offset={[0, -10]}>
                    <div className="bg-zinc-950 border border-emerald-500/30 text-white p-2 relative w-[200px] font-mono shadow-[0_0_15px_rgba(16,185,129,0.15)] overflow-hidden">
                      <div className="absolute inset-0 bg-[linear-gradient(to_right,#022c22_1px,transparent_1px),linear-gradient(to_bottom,#022c22_1px,transparent_1px)] bg-[size:5px_5px] opacity-10" />
                      <div className="relative z-10">
                        <div className="flex justify-between items-start mb-1.5">
                          <div className="flex items-center gap-2">
                            <div className="text-emerald-400 font-black text-lg tracking-wider leading-none">
                              {company.symbol}
                            </div>
                          </div>
                          <div className="text-[7px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-1 py-0.5 font-bold tracking-widest uppercase">
                            UPLINKED
                          </div>
                        </div>
                        <div className="text-[9px] text-zinc-300 font-sans mb-1.5 leading-tight">
                          {company.name}
                        </div>
                        <div className="h-[1px] bg-emerald-500/20 w-full mb-1.5" />
                        <div className="text-[7px] text-zinc-500 uppercase tracking-widest flex justify-between">
                          <span>HQ</span>
                          <span className="text-zinc-400">
                            {company.headquarters || "CLASSIFIED"}
                          </span>
                        </div>
                        
                        {(isSupplier || isCustomer || isAnchor) && (
                          <div className="mt-2">
                            {isSupplier && (
                              <div className="text-[8px] text-yellow-400 bg-yellow-400/10 border border-yellow-500/30 px-1.5 py-1 text-center truncate">
                                SUPPLIES <strong className="ml-1 text-yellow-300 font-bold">{anchor?.symbol}</strong>
                              </div>
                            )}
                            {isCustomer && (
                              <div className="text-[8px] text-emerald-400 bg-emerald-400/10 border border-emerald-500/30 px-1.5 py-1 text-center truncate">
                                BUYER FROM <strong className="ml-1 text-emerald-300 font-bold">{anchor?.symbol}</strong>
                              </div>
                            )}
                            {isAnchor && (
                              <div className="text-[8px] text-white bg-white/10 border border-white/20 px-1.5 py-1 uppercase tracking-widest text-center">
                                Active Node
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              </React.Fragment>
            );
          })}

          {mapLayers.arcs && partnerLines.map((line, idx) => {
            const details = getRelationshipDetails(line.from, line.to);
            const isCritical = riskScore >= 75 && (line.color.includes("red") || line.from.sector.includes("Semi") || line.to.sector.includes("Semi"));
            return (
              <Polyline
                key={`${idx}-${line.color}`}
                positions={line.coords}
                pathOptions={{
                  color: isCritical ? "#ef4444" : line.color,
                  weight: hoveredCompany || isCritical ? 2.5 : 1.5,
                  dashArray: isCritical ? "4, 4" : "5, 5",
                  opacity: hoveredCompany || isCritical ? 0.9 : 0.5,
                  className: cn("supply-chain-line", isCritical && "supply-chain-line-alert"),
                }}
              >
                <Tooltip sticky direction="top" className="custom-tooltip">
                  <div className="min-w-[200px] font-mono text-[9px] bg-black p-0 relative overflow-hidden">
                    {/* Corner Accents */}
                    <div className="absolute top-0 left-0 w-1.5 h-1.5 border-l border-t border-emerald-400" />
                    <div className="absolute top-0 right-0 w-1.5 h-1.5 border-r border-t border-emerald-400" />
                    <div className="absolute bottom-0 left-0 w-1.5 h-1.5 border-l border-b border-emerald-400" />
                    <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-r border-b border-emerald-400" />

                    <div className="bg-emerald-500/5 px-2 py-1.5 border-b border-emerald-500/20 flex items-center justify-between">
                      <span className="font-black text-emerald-400 tracking-widest uppercase">
                        CORRIDOR_LINK // {idx}
                      </span>
                      <span className="text-emerald-100 font-bold">
                        {line.from.symbol} » {line.to.symbol}
                      </span>
                    </div>
                    <div className="p-2 space-y-1.5">
                      <div className="text-zinc-200 font-bold uppercase truncate">
                        {details.relType}
                      </div>
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-zinc-400 font-mono text-[8px]">
                        <span className="text-emerald-900 uppercase font-black">
                          Volume
                        </span>
                        <span className="text-right text-emerald-300 font-bold">
                          {details.currencyVol}
                        </span>
                        <span className="text-emerald-900 uppercase font-black">
                          Commodity
                        </span>
                        <span
                          className="text-right text-zinc-100 truncate"
                          title={details.commodity}
                        >
                          {details.commodity}
                        </span>
                        <span className="text-emerald-900 uppercase font-black">
                          Quantity
                        </span>
                        <span className="text-right text-zinc-100 font-bold">
                          {details.qty}
                        </span>
                      </div>
                      {/* Scanning bar effect */}
                      <div className="h-[1px] bg-emerald-950 w-full overflow-hidden relative mt-1">
                        <div className="absolute inset-0 bg-emerald-500/40" />
                      </div>
                    </div>
                  </div>
                </Tooltip>
              </Polyline>
            );
          })}

          {/* Animated Glowing Corridors on 2D map */}
          {CORRIDORS.map((corridor) => {
            const isCorridorActive = corridor.id === activeCorridorId;
            const markerColor =
              corridor.baseRisk > 80
                ? "#ef4444"
                : corridor.baseRisk > 60
                  ? "#f59e0b"
                  : "#10b981";

            return (
              <Circle
                key={`corridor-marker-${corridor.id}`}
                center={corridor.coords}
                radius={isCorridorActive ? 220000 : 120000}
                pathOptions={{
                  color: markerColor,
                  fillColor: markerColor,
                  fillOpacity: isCorridorActive ? 0.35 : 0.15,
                  weight: isCorridorActive ? 3 : 1.5,
                  className: "corridor-circle",
                }}
                eventHandlers={{
                  click: () => {
                    if (onSelectCorridor) onSelectCorridor(corridor.id);
                  },
                }}
              >
                <Tooltip direction="top" className="custom-tooltip">
                  <div className="min-w-[180px] font-mono text-[9px] bg-black p-0 relative overflow-hidden">
                    {/* Corner Accents */}
                    <div className="absolute top-0 left-0 w-1.5 h-1.5 border-l border-t border-emerald-400" />
                    <div className="absolute top-0 right-0 w-1.5 h-1.5 border-r border-t border-emerald-400" />
                    <div className="absolute bottom-0 left-0 w-1.5 h-1.5 border-l border-b border-emerald-400" />
                    <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-r border-b border-emerald-400" />

                    <div className="bg-emerald-500/5 px-2 py-1.5 border-b border-emerald-900 uppercase flex items-center justify-between">
                      <span className="font-black text-emerald-400 tracking-widest truncate">
                        {corridor.name}
                      </span>
                      <span className="text-[7px] text-zinc-400 font-bold">
                        UID: {corridor.id.slice(0, 8)}
                      </span>
                    </div>
                    <div className="p-2 space-y-1.5">
                      <div className="flex justify-between items-center bg-emerald-950/20 px-1 py-0.5 rounded-sm">
                        <span className="text-emerald-900 uppercase font-bold text-[7px]">
                          Critical Risk
                        </span>
                        <span
                          className={cn(
                            "font-black",
                            corridor.baseRisk > 80
                              ? "text-red-500"
                              : corridor.baseRisk > 60
                                ? "text-amber-500"
                                : "text-emerald-500",
                          )}
                        >
                          {corridor.baseRisk}/100
                        </span>
                      </div>
                      <div className="text-zinc-200 font-bold uppercase italic text-[8px] leading-tight mt-1">
                        {corridor.commodityType}
                      </div>
                      <div className="flex justify-between text-[7px] text-zinc-500 mt-1 uppercase">
                        <span>LatRef</span>
                        <span>{corridor.coords[0].toFixed(2)}</span>
                      </div>
                      {/* Scanning bar effect */}
                      <div className="h-[1px] bg-emerald-950 w-full overflow-hidden relative mt-1.5">
                        <div className="absolute inset-0 bg-emerald-400/30" />
                      </div>
                    </div>
                  </div>
                </Tooltip>
              </Circle>
            );
          })}

          {/* If there's an active corridor, draw glowing lines connecting its origin to headquarter pins */}
          {(() => {
            const activeCorridor = CORRIDORS.find(
              (c) => c.id === activeCorridorId,
            );
            if (!activeCorridor) return null;

            const hqLinks = getCorridorHeadquartersLinks(activeCorridor);
            const pathColor =
              activeCorridor.baseRisk > 80
                ? "#ef4444"
                : activeCorridor.baseRisk > 60
                  ? "#f59e0b"
                  : "#10b981";

            return (
              <>
                <style
                  dangerouslySetInnerHTML={{
                    __html: `
                  .animated-corridor-path {
                    stroke-dasharray: 8, 12;
                    filter: drop-shadow(0 0 4px #10b981);
                  }
                  .animated-corridor-path-alert {
                    stroke-dasharray: 8, 12;
                    filter: drop-shadow(0 0 5px #f59e0b);
                  }
                  .animated-corridor-path-danger {
                    stroke-dasharray: 8, 12;
                    filter: drop-shadow(0 0 6px #ef4444);
                  }
                `,
                  }}
                />

                {hqLinks.map((link, idx) => {
                  const lineClass =
                    activeCorridor.baseRisk > 80
                      ? "animated-corridor-path-danger"
                      : activeCorridor.baseRisk > 60
                        ? "animated-corridor-path-alert"
                        : "animated-corridor-path";

                  return (
                    <Polyline
                      key={`hq-link-${activeCorridor.id}-${idx}`}
                      positions={[link.fromCoords, link.toCoords]}
                      pathOptions={{
                        color: pathColor,
                        weight: 4,
                        opacity: 0.9,
                        className: lineClass,
                      }}
                    >
                      <Tooltip
                        sticky
                        direction="top"
                        className="custom-tooltip"
                      >
                        <div className="min-w-[190px] font-mono text-[9px] bg-black border border-emerald-500/30 shadow-2xl">
                          <div className="bg-black/80 px-2 py-1.5 border-b border-emerald-500/20 flex items-center gap-1.5">
                            <span className="font-black text-emerald-400 tracking-widest uppercase truncate">
                              {link.ticker}
                            </span>
                            <span className="text-zinc-500 font-bold">
                              LINKAGE
                            </span>
                          </div>
                          <div className="p-2 space-y-1.5">
                            <div className="flex justify-between items-center text-zinc-400">
                              <span>FROM</span>
                              <span className="text-zinc-200 font-bold truncate max-w-[100px]">
                                {link.fromName}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-zinc-400">
                              <span>TO</span>
                              <span className="text-zinc-200 font-bold truncate max-w-[100px]">
                                {link.toName}
                              </span>
                            </div>
                          </div>
                        </div>
                      </Tooltip>
                    </Polyline>
                  );
                })}
              </>
            );
          })()}

          {agentFocus && isSafeLatLng(agentFocus.lat, agentFocus.lng) && (
            <Marker
              position={[agentFocus.lat, agentFocus.lng]}
              icon={L.divIcon({
                className: "agent-drone-marker-container",
                html: `
                  <div style="position: relative; width: 0; height: 0; display: flex; align-items: center; justify-content: center;">
                    <div style="position: absolute; width: 28px; height: 28px; border: 2px dashed #10b981; border-radius: 50%; box-shadow: 0 0 8px rgba(16,185,129,0.2);"></div>
                    <div style="position: absolute; width: 8px; height: 8px; background: #10b981; border-radius: 50%; box-shadow: 0 0 12px #10b981;"></div>
                    <div style="position: absolute; width: 1px; height: 20px; background: linear-gradient(to top, #10b981, transparent); bottom: 4px;"></div>
                    ${
                      isNavAnimationFinished
                        ? `
                      <div class="absolute w-2.5 h-2.5 bg-emerald-400 rounded-full" style="position: absolute; box-shadow: 0 0 15px #10b981;"></div>
                      <div style="position: absolute; width: 24px; height: 1px; background: #34d399; pointer-events: none;"></div>
                      <div style="position: absolute; height: 24px; width: 1px; background: #34d399; pointer-events: none;"></div>
                    `
                        : ""
                    }
                  </div>
                `,
                iconSize: [28, 28],
                iconAnchor: [0, 0],
              })}
            >
              <Popup>
                <div className="bg-black font-sans text-[9px] text-emerald-400 p-2 uppercase border border-emerald-500/30">
                  <span className="font-extrabold text-white block">
                    [ACTIVE ANALYSIS]
                  </span>
                  <div className="text-zinc-300 mt-1">
                    {agentFocus.locationName}
                  </div>
                  <div className="text-zinc-500 text-[8px] mt-0.5">
                    LOCATION: {Number(agentFocus.lat).toFixed(3)}N,{" "}
                    {Number(agentFocus.lng).toFixed(3)}E
                  </div>
                </div>
              </Popup>
            </Marker>
          )}

          {agentEntities.map((entity, idx) => (
            <Marker
              key={`entity-2d-${entity.id || idx}`}
              position={[entity.coordinates[0], entity.coordinates[1]]}
              icon={L.divIcon({
                className: "agent-entity-marker",
                html: `
                  <div style="position: relative; width: 12px; height: 12px; display: flex; align-items: center; justify-content: center;">
                    <div style="position: absolute; width: 8px; height: 8px; background: ${entity.type === "CONFLICT" ? "#ef4444" : entity.type === "CARGO" ? "#3b82f6" : "#10b981"}; border-radius: 50%; box-shadow: 0 0 8px currentColor;"></div>
                  </div>
                `,
                iconSize: [12, 12],
                iconAnchor: [6, 6],
              })}
            >
              <Tooltip sticky direction="top" className="custom-tooltip">
                <div className="min-w-[160px] font-mono text-[9px] bg-black border border-zinc-700 shadow-2xl">
                  <div className="bg-black px-2 py-1.5 border-b border-zinc-800 flex justify-between items-center">
                    <span className="font-bold text-zinc-300 uppercase truncate">
                      {entity.name}
                    </span>
                    <span
                      className={cn(
                        "text-[7px] uppercase px-1 rounded-sm",
                        entity.type === "CONFLICT"
                          ? "bg-red-950 text-red-400"
                          : entity.type === "CARGO"
                            ? "bg-blue-950 text-blue-400"
                            : "bg-emerald-950 text-emerald-400",
                      )}
                    >
                      {entity.type}
                    </span>
                  </div>
                  <div className="p-2 text-zinc-400 leading-tight">
                    {entity.description}
                  </div>
                </div>
              </Tooltip>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <AnimatePresence>
        {(agentFocus || briefing) && (
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="absolute top-4 left-4 z-[1000] w-[22rem] bg-black/90 backdrop-blur-xl border border-emerald-500/40 p-3.5 pointer-events-auto select-none font-mono shadow-[0_0_30px_rgba(0,0,0,0.8)] hover:border-emerald-500/60 transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-2 border-b border-emerald-900/50 pb-1.5 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className={cn("w-1.5 h-1.5 rounded-full shadow-[0_0_8px_#10b981]", isSpeaking ? "bg-cyan-400 animate-ping" : "bg-emerald-500 animate-pulse")} />
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-emerald-400 tracking-widest uppercase">
                    TACTICAL_BRIEFING
                  </span>
                  <span className="text-[7px] font-medium text-emerald-700 tracking-widest uppercase">
                    OPERATIONS STREAM
                  </span>
                </div>
                {isSpeechLoading && (
                  <div className="flex gap-0.5 items-center ml-1">
                    <div className="w-0.5 h-1 bg-emerald-500 animate-[bounce_0.6s_infinite]" />
                    <div className="w-0.5 h-1.5 bg-emerald-500 animate-[bounce_0.6s_infinite_0.1s]" />
                    <div className="w-0.5 h-1 bg-emerald-500 animate-[bounce_0.6s_infinite_0.2s]" />
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-1.5">
                {/* Voice integration via MapLayer's Enhanced TTS */}
                {(briefing || typedBriefing) && (
                  <button
                    onClick={() => {
                      if (isSpeaking) {
                        if (window.speechSynthesis) window.speechSynthesis.cancel();
                        if (audioRef.current) {
                          try {
                            audioRef.current.pause();
                          } catch (e) {}
                          audioRef.current = null;
                        }
                        if ((window as any)._activeTtsSourceMap) {
                          try {
                            (window as any)._activeTtsSourceMap.stop();
                          } catch (e) {}
                          (window as any)._activeTtsSourceMap = null;
                        }
                        setIsSpeaking(false);
                      } else {
                        speakWithEnhancedVoice(briefing ? (briefing.summary || briefing.text || "Analyzing...") : typedBriefing);
                      }
                    }}
                    disabled={isSpeechLoading}
                    className={cn(
                      "flex items-center gap-1.5 px-2 py-0.5 border text-[7px] font-mono tracking-wider font-bold transition-all cursor-pointer rounded-sm shrink-0",
                      isSpeaking 
                        ? "bg-red-950/20 border-red-500/40 text-red-400" 
                        : "bg-emerald-950/20 border-emerald-500/20 text-emerald-400 hover:border-emerald-500/40"
                    )}
                  >
                    {isSpeaking ? (
                      <VolumeX className="w-2.5 h-2.5" />
                    ) : (
                      <Volume2 className="w-2.5 h-2.5" />
                    )}
                    <span>{isSpeaking ? "TERMINATE" : "VOICE OVER"}</span>
                  </button>
                )}
                
                <button
                  onClick={() => {
                    const newState = !showNewsSummary;
                    setShowNewsSummary(newState);
                    if (newState) {
                      if (isNewsCyclingActive) {
                        setIsNewsCyclingActive(false);
                        setIsCyclingTriggered(false);
                      }
                      if (showGlobalNetwork && toggleGlobalNetwork) toggleGlobalNetwork();
                    }
                  }}
                  className={cn(
                    "p-1 border transition-all duration-200 cursor-pointer",
                    showNewsSummary
                      ? "bg-emerald-500 border-emerald-400 text-black shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                      : "bg-zinc-900 border-emerald-500/30 text-emerald-500 hover:border-emerald-500"
                  )}
                  title="Expand to Full News Deck"
                >
                  <Zap className="w-3 h-3" />
                </button>
              </div>
            </div>

            {briefing && Object.keys(briefing).length > 0 ? (
              <div className="space-y-4">
                <Typewriter
                  className="text-zinc-300 font-mono text-[9.5px]"
                  text={
                    briefing.summary ||
                    briefing.text ||
                    "Analyzing current operational strategy..."
                  }
                />
                
                {/* ENHANCED: TACTICAL RECOMMENDATIONS */}
                {briefing.tacticalRecommendations && (
                  <div className="p-2.5 bg-emerald-500/5 border border-emerald-500/20 rounded-sm space-y-2">
                     <div className="flex items-center gap-2 text-[8px] font-black text-emerald-400 uppercase tracking-widest font-mono">
                       <Shield className="w-3 h-3" />
                       OPERATIONAL_DIRECTIVES
                     </div>
                     <div className="space-y-1.5">
                       {briefing.tacticalRecommendations.map((rec: string, idx: number) => (
                         <div key={idx} className="flex gap-2 text-[8.5px] text-zinc-300 font-mono">
                           <span className="text-emerald-500 shrink-0">[{idx + 1}]</span>
                           <span>{rec}</span>
                         </div>
                       ))}
                     </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col bg-black p-2 rounded-sm border border-zinc-900">
                     <div className="text-[7px] text-zinc-600 uppercase font-mono mb-0.5">Vector</div>
                     <div className={cn(
                       "text-[9px] font-black font-mono truncate",
                       briefing.outlook === "ACCELERATING" ? "text-emerald-400" :
                       briefing.outlook === "VULNERABLE" || briefing.outlook === "COMPROMISED" ? "text-red-500" :
                       briefing.outlook === "STRETCHED" ? "text-amber-500" : "text-white"
                     )}>
                       {briefing.outlook || "STABLE"}
                     </div>
                  </div>
                  <div className="flex flex-col bg-black p-2 rounded-sm border border-zinc-900 col-span-2">
                     <div className="text-[7px] text-zinc-600 uppercase font-mono mb-0.5">Primary Threat</div>
                     <div className="text-[8.5px] font-bold text-red-400 font-mono truncate">
                       {briefing.riskFactors?.[0] || "None Detected"}
                     </div>
                  </div>
                </div>
              </div>
            ) : typedBriefing ? (
              <div className="text-[9px] text-zinc-300 leading-relaxed min-h-[40px]">
                {typedBriefing}
                <span className="inline-block w-1 h-3 bg-emerald-500 ml-1 animate-pulse" />
              </div>
            ) : (
                <div className="text-[9.5px] text-zinc-500 font-mono bg-zinc-900/30 p-2 border border-zinc-800 border-dashed rounded-sm">
                  No active briefing formulated. Request AI synthesis.
                </div>
            )}

            <div className="mt-3 flex justify-between items-center text-[7px] text-zinc-600">
               <span>TRANSIT_LOCK: {agentFocus ? `${Number(agentFocus.lat).toFixed(2)} / ${Number(agentFocus.lng).toFixed(2)}` : "STANDBY"}</span>
               <span>v4.2.0</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showNewsSummary && (
          <motion.div
            initial={{ y: 200, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 200, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute bottom-0 left-0 right-0 z-[20] h-[180px] bg-black/95 border-t border-emerald-950 font-mono text-[10px] overflow-hidden flex flex-col pointer-events-auto shadow-[0_-10px_40px_rgba(0,0,0,0.5)]"
          >
            {(() => {
              const tabs = [
                "FLASH_URGENT",
                "SECTOR_ROTATION",
                "MACRO_ALERTS",
                "02 // LOGISTICS_FEED",
              ];

              const activeCompany = activeCompanyForCache;
              // Mock random filtering based on tab selection so it doesn't look empty when changing tabs
              const currentTabFiltered = filteredCompanyCache.filter(
                (item, idx) => {
                  if (newsActiveTab === "SECTOR_ROTATION") return idx % 2 === 0;
                  if (newsActiveTab === "MACRO_ALERTS") return idx % 3 === 0;
                  return true;
                },
              );

              return (
                <>
                  {/* Tab Strip */}
                  <div className="flex border-b border-emerald-950 px-2 pt-2 items-end">
                    {tabs.map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setNewsActiveTab(tab)}
                        className={cn(
                          "text-[9px] border border-emerald-950 px-2 py-0.5 mr-1 bg-black transition-colors border-b-0 rounded-t-sm",
                          newsActiveTab === tab
                            ? "bg-emerald-600/20 text-emerald-400 font-black border-emerald-500/50"
                            : "text-emerald-700 hover:text-emerald-500 hover:bg-emerald-950/20",
                        )}
                      >
                        [ {tab.replace("_", " ")} ]
                      </button>
                    ))}
                    <button
                      onClick={() => setShowNewsSummary(false)}
                      className="ml-auto mb-1 text-emerald-800 hover:text-red-500 transition-colors bg-black border border-emerald-950 px-1.5 py-0.5 rounded-sm"
                    >
                      [ X CLOSE ]
                    </button>
                  </div>

                  {/* Content Area */}
                  <div className="flex-1 overflow-y-auto mt-2 space-y-2 px-4 pb-4 custom-scrollbar">
                    {newsActiveTab === "02 // LOGISTICS_FEED" ? (
                      <div className="p-1">
                        {!eiaData ? (
                          <div className="text-emerald-400/50">
                            QUERYING EIA UPSTREAM NODE...
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-4">
                            {[
                              {
                                label: "CUSHING INVENTORIES",
                                data: eiaData.cushing?.[0],
                                prev: eiaData.cushing?.[1],
                              },
                              {
                                label: "GLOBAL PROD (Ths_Bbl)",
                                data: eiaData.globalProduction?.[0],
                                prev: eiaData.globalProduction?.[1],
                              },
                            ].map((stream, idx) => {
                              const v = stream.data?.value;
                              const chg = stream.data?.netChange || 0;
                              const pct =
                                stream.prev && stream.prev.value
                                  ? (chg / stream.prev.value) * 100
                                  : 0;
                              return (
                                <div
                                  key={idx}
                                  className="border border-emerald-900/50 p-2 font-mono text-[10px] text-emerald-400 bg-emerald-950/10"
                                >
                                  <div className="text-[8px] text-emerald-600 mb-1 tracking-widest">
                                    {stream.label}
                                  </div>
                                  <div className="flex justify-between items-end">
                                    <div className="text-sm font-black">
                                      {v?.toLocaleString() || "---"}
                                    </div>
                                    <div
                                      className={cn(
                                        "text-[9px]",
                                        chg >= 0
                                          ? "text-emerald-300"
                                          : "text-amber-500",
                                      )}
                                    >
                                      {chg > 0 ? "+" : ""}
                                      {chg.toLocaleString()} (
                                      {pct > 0 ? "+" : ""}
                                      {pct.toFixed(2)}%)
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ) : currentTabFiltered.length > 0 ? (
                      currentTabFiltered.map((item, idx) => (
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          key={idx}
                          className="flex items-start gap-2 bg-zinc-950/40 p-2 rounded-sm border border-zinc-900 hover:border-emerald-900/50 transition-colors group cursor-pointer"
                        >
                          <span className="text-emerald-500 font-bold group-hover:text-emerald-400 mt-0.5">
                            »
                          </span>
                          <div className="flex-1 flex flex-col gap-1">
                            <div className="flex justify-between items-center text-[8.5px] text-zinc-500 font-black uppercase tracking-widest">
                              <span>{item.source || activeCompany.symbol}</span>
                              <span className="text-emerald-800">
                                {new Date(
                                  item.published_at ||
                                    item.timestamp ||
                                    Date.now(),
                                ).toLocaleTimeString()}
                              </span>
                            </div>
                            <div className="text-[11px] text-emerald-400/90 font-bold group-hover:text-emerald-300 transition-colors">
                              {item.intelligence?.translatedTitle ||
                                item.translatedTitle ||
                                item.headline ||
                                item.title ||
                                item.name}
                            </div>
                            <div className="text-[9px] text-zinc-500 truncate mt-0.5">
                              {item.summary ||
                                item.description ||
                                "No supplemental details provided for this bulletin."}
                            </div>
                          </div>
                        </motion.div>
                      ))
                    ) : (
                      <div className="h-full flex items-center justify-center flex-col gap-2 opacity-50">
                        <div className="w-8 h-8 rounded-full border border-dashed border-emerald-800 flex items-center justify-center">
                          <span className="w-1.5 h-1.5 bg-emerald-700 rounded-full" />
                        </div>
                        <div className="text-emerald-800 text-[10px] font-black tracking-widest uppercase">
                          AWAITING {newsActiveTab.replace("_", " ")} SIGNALS
                        </div>
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="popLayout">
        {isNewsCyclingActive && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-[1000] overflow-hidden">
            {/* Ambient vignette neon pulse */}
            <motion.div
              key={`hud-pulse-${activeNewsIdx}`}
              initial={{
                opacity: 0.1,
                background:
                  "radial-gradient(circle, rgba(16,185,129,0) 40%, rgba(16,185,129,0.15) 100%)",
              }}
              animate={{
                opacity: [0.1, 0.4, 0.1, 0.3, 0.1],
                background: [
                  "radial-gradient(circle, rgba(16,185,129,0) 40%, rgba(16,185,129,0.15) 100%)",
                  "radial-gradient(circle, rgba(16,185,129,0) 30%, rgba(16,185,129,0.25) 100%)",
                  "radial-gradient(circle, rgba(16,185,129,0) 40%, rgba(16,185,129,0.15) 100%)",
                ],
              }}
              transition={{ duration: 1.4 }}
              className="absolute inset-0"
            />

            <motion.div
              key={`target-cycle-ring-${activeNewsIdx}`}
              initial={{ scale: 2.8, opacity: 0, rotate: -35 }}
              animate={{
                scale: [2.8, 1, 1],
                opacity: [0, 1, 1, 0],
                rotate: [-35, 0, 2],
                filter: [
                  "brightness(2) contrast(1.5)",
                  "brightness(1) contrast(1)",
                  "brightness(1.5) contrast(1.2)",
                ],
              }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
              className="w-64 h-64 border border-emerald-500/40 rounded-full flex flex-col items-center justify-center relative shadow-[0_0_50px_rgba(16,185,129,0.1)] bg-zinc-950/30 backdrop-blur-[4px]"
            >
              {/* Tactical Scanline Sweep - REMOVED */}

              {/* Corner brackets - Enhanced */}
              <div className="absolute -top-2 -left-2 w-8 h-8 border-t-2 border-l-2 border-emerald-400" />
              <div className="absolute -top-2 -right-2 w-8 h-8 border-t-2 border-r-2 border-emerald-400" />
              <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-2 border-l-2 border-emerald-400" />
              <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-2 border-r-2 border-emerald-400" />

              {/* Outer spinning elements */}
              <div className="absolute inset-0 border-2 border-dotted border-emerald-500/10 rounded-full" />
              <div className="absolute inset-4 border border-dashed border-emerald-500/20 rounded-full" />

              <div className="text-center font-mono space-y-1">
                <div className="text-[10px] md:text-[11px] tracking-[0.25em] text-emerald-400 font-black uppercase">
                  ACTIVE_LOCK //{" "}
                  {currentItem?.symbol || currentItem?.ticker || "NODE_RESL"}
                </div>

                <div className="flex items-center justify-center gap-4 text-[7px] text-zinc-400 tracking-widest font-bold">
                  <span>ALT: 42.8KM</span>
                  <span className="text-emerald-500/40">|</span>
                  <span>VEL: 7.2KM/S</span>
                </div>

                <div className="text-[8px] text-emerald-500/80 mt-2 font-black tracking-widest flex items-center justify-center gap-1">
                  <span className="w-1 h-1 bg-emerald-500 rounded-full" />
                  UPLINK: 99.8% ESTABLISHED
                </div>

                <div className="text-[7.5px] text-zinc-500/90 mt-2 font-normal tracking-wider normal-case border-t border-emerald-500/10 pt-2 px-4 max-w-[150px] mx-auto">
                  {companies.find(
                    (c) =>
                      c.symbol === (currentItem?.symbol || currentItem?.ticker),
                  )?.headquarters ?? "QUANTUM_NODE_PRIMARY"}
                </div>
              </div>

              {/* Random tactical data bits */}
              <div className="absolute top-1/4 -right-12 text-[6px] font-mono text-zinc-600 flex flex-col items-start gap-1">
                <div>HDG: 042.8°</div>
                <div>SPD: 24.2M</div>
                <div className="text-emerald-500/40">SCAN: READY</div>
              </div>
              <div className="absolute bottom-1/4 -left-12 text-[6px] font-mono text-zinc-600 flex flex-col items-end gap-1">
                <div>PTC: -2.1°</div>
                <div>ROL: 0.0°</div>
                <div className="text-red-500/40">WARN: NONE</div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isNewsCyclingActive && (
          <motion.div
            key={`shutter-${activeNewsIdx}`}
            initial={{ opacity: 0.4 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 bg-white pointer-events-none z-[1100] mix-blend-overlay"
          />
        )}
      </AnimatePresence>

      {/* Scanline Overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-5 mix-blend-overlay z-[1001]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))",
          backgroundSize: "100% 2px, 3px 100%",
        }}
      ></div>
      {riskScore >= 75 && <div className="absolute inset-0 hazard-vignette pointer-events-none z-[1002]" />}
    </div>
  );
};
