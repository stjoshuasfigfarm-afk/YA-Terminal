import React, {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  useMemo,
} from "react";
// Tactically re-saving file to clear potential fetch issues
import { Typewriter } from "./Typewriter";
import { OrbitalMap } from "./OrbitalMap";
import { COMPANIES, Company } from "../data/companies";
import { useCompanies } from "../context/CompaniesContext";
import { formatSafeTime } from "../utils/date";
import { isWebGLSupported } from "../utils/webgl";
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
  Compass,
  Minus,
  ChevronUp,
  ChevronDown,
  X,
  Loader2,
} from "lucide-react";
import Markdown from "react-markdown";
import { cn, getApiBaseUrl } from "../lib/utils";
import {
  CORRIDORS,
  getCorridorHeadquartersLinks,
} from "./yield-terminal/TopologyMap";
import { analyzeSentimentAndImpact } from "../lib/sentiment";
import { searchAndScoreCompanies } from "../lib/searchEngine";
import { AnimatePresence, motion } from "motion/react";

// Utility to validate coordinates
const isSafeLatLng = (lat: any, lng: any): boolean => {
  try {
    if (lat === null || lat === undefined || lng === null || lng === undefined)
      return false;
    const nLat = typeof lat === "number" ? lat : parseFloat(String(lat));
    const nLng = typeof lng === "number" ? lng : parseFloat(String(lng));
    if (!Number.isFinite(nLat) || !Number.isFinite(nLng)) return false;
    return nLat >= -90 && nLat <= 90 && nLng >= -180 && nLng <= 180;
  } catch {
    return false;
  }
};



interface MapLayerProps {
  selectedStock: Company | null;
  focusStock?: Company | null;
  onSelectNode: (
    c: Company,
    skipFetch?: boolean,
    isSearch?: boolean,
    activeStoryContext?: any,
  ) => void;
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
  mapLayers: { hq: boolean; arcs: boolean; satellite: boolean; borders: boolean };
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
  isTransitioning?: boolean;
  activeNewsIdx?: number;
  activeNewsPopup?: { lat: number; lng: number; title: string; symbol: string } | null;
  isLiveNewsZoomEnabled?: boolean;
  isFocusMode?: boolean;
  isAutopilot?: boolean;
  toggleLiveNewsZoom?: () => void;
  toggleFocusMode?: () => void;
  resetOrientationTrigger?: number;
  onHeadlineClick?: (news: any) => void;
  isSidebarMinimized?: boolean;
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
  isTransitioning = false,
  activeNewsIdx: propActiveNewsIdx = 0,
  activeNewsPopup = null,
  isLiveNewsZoomEnabled = false,
  isFocusMode = true,
  isAutopilot = false,
  toggleLiveNewsZoom,
  toggleFocusMode,
  resetOrientationTrigger = 0,
  onHeadlineClick,
  isSidebarMinimized = false,
}) => {
  const setIsVocalizerEnabled = onToggleVocalizer;
  const [isSwapped, setIsSwapped] = useState(false);
  const { companies: contextCompanies } = useCompanies();

  // State for broad center globe search
  const [broadSearchQuery, setBroadSearchQuery] = useState("");
  const [isBroadSearchFocused, setIsBroadSearchFocused] = useState(false);
  const [broadSearchCursor, setBroadSearchCursor] = useState(-1);
  const broadSearchInputRef = useRef<HTMLInputElement>(null);

  // Focus broad search bar with / or Ctrl+K / Cmd+K shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is already typing in an input/textarea
      const target = e.target as HTMLElement;
      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable
      ) {
        return;
      }

      if (e.key === "/" || (e.key === "k" && (e.ctrlKey || e.metaKey))) {
        e.preventDefault();
        broadSearchInputRef.current?.focus();
        setIsBroadSearchFocused(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const companies = useMemo(() => {
    return contextCompanies && contextCompanies.length > 0 ? contextCompanies : COMPANIES;
  }, [contextCompanies]);

  const finalBroadMatches = useMemo(() => {
    if (!broadSearchQuery.trim()) return [];
    
    // Use enhanced search engine instead of basic filtering
    return searchAndScoreCompanies(companies, broadSearchQuery).map(match => ({
      company: match.company,
      matchedFields: match.matchedFields
    })).slice(0, 8);
  }, [broadSearchQuery, companies]);

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

  const companiesToRender = useMemo(() => {
    const set = new Set<string>();
    const list: Company[] = [];

    const addCo = (c: Company) => {
      if (!c || set.has(c.symbol)) return;
      set.add(c.symbol);
      list.push(c);
    };

    if (selectedStock && !isTransitioning) addCo(selectedStock);
    if (focusStock && !isTransitioning) addCo(focusStock);

    if (selectedStock && relationships && !isTransitioning) {
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

    const anchor = (networkAnchor || selectedStock) && !isTransitioning ? (networkAnchor || selectedStock) : null;
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

    if (!isTransitioning) {
      if ((searchQuery || "").trim()) {
        const queryLower = (searchQuery || "").toLowerCase();
        const searchMatches = companies.filter(c => 
          (c.symbol || "").toLowerCase().includes(queryLower) ||
          (c.name || "").toLowerCase().includes(queryLower) ||
          (c.sector || "").toLowerCase().includes(queryLower)
        );
        searchMatches.slice(0, 50).forEach(addCo);
      } else {
        COMPANIES.forEach(addCo);
      }
    }

    return list;
  }, [companies, selectedStock, focusStock, relationships, searchQuery, networkAnchor, showGlobalNetwork, isTransitioning]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ttsCooldownRef = useRef<number>(0);
  const ttsRequestIdRef = useRef<number>(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSpeechLoading, setIsSpeechLoading] = useState(false);

  // Synchronize MapLayer local isSpeaking state to global app level via custom events
  useEffect(() => {
    if (isSpeaking) {
      window.dispatchEvent(new CustomEvent("app-speech-start"));
    } else {
      window.dispatchEvent(new CustomEvent("app-speech-end"));
    }
  }, [isSpeaking]);

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
      if (customEvent.detail && customEvent.detail.origin !== 'map') {
        stopAllAudio();
      }
    };

    if (typeof window !== "undefined") window.addEventListener('app-tts-play', handleTtsPlay);

    return () => {
      stopAllAudio();
      if (typeof window !== "undefined") window.removeEventListener('app-tts-play', handleTtsPlay);
    };
  }, []);

  // Heatmap disabled
  const heatmapData: [number, number, number][] = [];

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

      const key = (e.key || "").toLowerCase();
      if (false) {
        // ... (removed)
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

  // Gracefully fallback to 2D Planar projection dynamically if WebGL is unavailable or fails context creation
  useEffect(() => {
    const handleWebGLFailure = () => {
      console.warn("WebGL Context Failure Detected. Switching projection to 2D Map Container...");
    };

    if (typeof window !== "undefined") {
      window.addEventListener("webgl-context-failed", handleWebGLFailure);
      return () => window.removeEventListener("webgl-context-failed", handleWebGLFailure);
    }
  }, []);

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

  const [activeNewsIdx, setActiveNewsIdx] = useState(0);
  
  // Sync local activeNewsIdx with prop if provided
  useEffect(() => {
    setActiveNewsIdx(propActiveNewsIdx);
  }, [propActiveNewsIdx]);
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

  const speakWithEnhancedVoice = async (text: string, force = false) => {
    if (!isVocalizerEnabled && !force) return;
    
    // Increment request ID to supersede any active loading/fetch
    ttsRequestIdRef.current += 1;
    const currentRequestId = ttsRequestIdRef.current;

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
      
      // If superseded during fetch, bail immediately!
      if (currentRequestId !== ttsRequestIdRef.current) {
        return;
      }

      if (!response.ok) {
        if (response.status === 429) {
          // Engage cooldown for 10 minutes if quota hit
          ttsCooldownRef.current = Date.now() + 600000;
          throw new Error("QUOTA_EXHAUSTED");
        }
        throw new Error("Voice uplink failed");
      }
      
      const data = await response.json();

      // Check again if superseded before playing
      if (currentRequestId !== ttsRequestIdRef.current) {
        return;
      }

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
          
          // One final check before setting and starting standard source!
          if (currentRequestId !== ttsRequestIdRef.current) {
            return;
          }

          (window as any)._activeTtsSourceMap = source;
          setIsSpeaking(true);
          source.start();
        } catch (pcmErr) {
          console.warn("PCM Playback failed, trying standard HTML5 audio fallbacks:", pcmErr);
          
          if (currentRequestId !== ttsRequestIdRef.current) return;

          const audio = new Audio("data:audio/wav;base64," + data.audio);
          audioRef.current = audio;
          audio.onended = () => {
            setIsSpeaking(false);
            audioRef.current = null;
          };
          audio.onerror = () => {
            setIsSpeaking(false);
            if (currentRequestId === ttsRequestIdRef.current) {
              triggerBrowserFallback(text);
            }
          };
          setIsSpeaking(true);
          await audio.play().catch((playErr) => {
            console.warn("Direct HTML5 audio play failed:", playErr);
            if (currentRequestId === ttsRequestIdRef.current) {
              triggerBrowserFallback(text);
            }
          });
        }
      }
    } catch (err: any) {
      if (currentRequestId === ttsRequestIdRef.current) {
        if (err.message !== "QUOTA_EXHAUSTED" && err.message !== "Failed to fetch") {
          console.error("News vocalization failed:", err);
        }
        triggerBrowserFallback(text);
      }
    } finally {
      if (currentRequestId === ttsRequestIdRef.current) {
        setIsSpeechLoading(false);
      }
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

  // Persistent briefing states to stay open and support minimize functionality
  const [preservedBriefing, setPreservedBriefing] = useState<any | null>(null);
  const [isBriefingMinimized, setIsBriefingMinimized] = useState(false);

  // State for clickable entities (Detailed Summary)
  const [expandedEntityIdx, setExpandedEntityIdx] = useState<number | null>(null);
  const [entityDetails, setEntityDetails] = useState<Record<string, any>>({});
  const [loadingEntityIdx, setLoadingEntityIdx] = useState<number | null>(null);

  // Reset expanded entity index when the selected stock or briefing changes
  useEffect(() => {
    setExpandedEntityIdx(null);
  }, [preservedBriefing]);

  const handleEntityClick = async (rec: string, idx: number) => {
    if (expandedEntityIdx === idx) {
      setExpandedEntityIdx(null);
      return;
    }

    setExpandedEntityIdx(idx);

    if (entityDetails[rec]) {
      const detail = entityDetails[rec];
      if (setAgentFocus && detail.coordinates) {
        setAgentFocus({
          lat: detail.coordinates[0],
          lng: detail.coordinates[1],
          locationName: detail.locationName,
          briefing: detail.briefing,
          facts: detail.facts,
          queryText: rec,
        });
      }
      return;
    }

    setLoadingEntityIdx(idx);
    try {
      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/api/ai/navigate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: rec }),
      });

      if (response.ok) {
        const data = await response.json();
        setEntityDetails((prev) => ({ ...prev, [rec]: data }));
        
        if (setAgentFocus && data.coordinates) {
          setAgentFocus({
            lat: data.coordinates[0],
            lng: data.coordinates[1],
            locationName: data.locationName,
            briefing: data.briefing,
            facts: data.facts,
            queryText: rec,
          });
        }
      } else {
        console.warn("Failed to fetch entity details");
      }
    } catch (err) {
      console.error("Error fetching entity details", err);
    } finally {
      setLoadingEntityIdx(null);
    }
  };

  // Sync state: capture briefing updates when they happen
  useEffect(() => {
    if (briefing && Object.keys(briefing).length > 0) {
      setPreservedBriefing({
        type: "briefing",
        data: briefing,
        title: selectedStock ? `${selectedStock.symbol} _INTEL_DECK` : "TACTICAL_BRIEFING",
        subTitle: selectedStock ? selectedStock.name : "OPERATIONS STREAM"
      });
      setIsBriefingMinimized(false);
    }
  }, [briefing, selectedStock]);

  // Auto-expand tactical briefing when AI search becomes active
  useEffect(() => {
    if (isAgentSearching) {
      setIsBriefingMinimized(false);
    }
  }, [isAgentSearching]);

  // Sync state: capture agentFocus updates when they happen
  useEffect(() => {
    if (agentFocus && agentFocus.briefing) {
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
      
      setPreservedBriefing({
        type: "agentFocus",
        text: extractedText,
        title: "AI AGENT REPORT",
        subTitle: agentFocus.locationName ? agentFocus.locationName.toUpperCase() : "TARGET REGION",
        queryText: agentFocus.queryText || ""
      });
      setIsBriefingMinimized(false);
    }
  }, [agentFocus]);

  // Typewriter effect watching preserved briefing content rather than transient agentFocus focus state
  useEffect(() => {
    if (!preservedBriefing || preservedBriefing.type !== "agentFocus") {
      setTypedBriefing("");
      setIsNavAnimationFinished(false);
      return;
    }

    setIsNavAnimationFinished(false);
    setTypedBriefing("");
    let index = 0;
    
    const fullText = preservedBriefing.text || "";
    if (!fullText) return;
    
    const chars = Array.from(fullText);

    const interval = setInterval(() => {
      index++;
      setTypedBriefing(chars.slice(0, index).join(""));
      if (index >= chars.length) {
        clearInterval(interval);
        setIsNavAnimationFinished(true);
      }
    }, 15);

    return () => clearInterval(interval);
  }, [preservedBriefing]);

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
    if ((searchQuery || "").trim()) {
      filtered = filtered.filter(
        (item: any) =>
          (item.headline || item.title || "")
            .toLowerCase()
            .includes((searchQuery || "").toLowerCase()) ||
          (item.summary || "")
            .toLowerCase()
            .includes((searchQuery || "").toLowerCase()),
      );
    }
    return filtered;
  }, [companyCache, mapSentimentFilter, searchQuery]);

  const activeNewsFeed = useMemo(() => {
    return isNewsCyclingActive && allNewsData.length > 0
      ? allNewsData.filter(
          (item: any) =>
            !(searchQuery || "").trim() ||
            (item.headline || item.title || "")
              .toLowerCase()
              .includes((searchQuery || "").toLowerCase()) ||
            (item.summary || "")
              .toLowerCase()
              .includes((searchQuery || "").toLowerCase()),
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
      if (isVocalizerEnabled && isLiveNewsZoomEnabled) {
        const storySymbol = (currentLatest.symbol || currentLatest.ticker || currentLatest.related || "").toUpperCase();
        const selectedSymbol = (selectedStock?.symbol || "").toUpperCase();
        const isForSelectedTicker = selectedSymbol && storySymbol === selectedSymbol;

        if (isForSelectedTicker) {
          // Get prior existing news items (reports) for the selected stock
          const otherReports = (allNewsData || [])
            .filter(item => {
              const itemSym = (item.symbol || item.ticker || item.related || "").toUpperCase();
              return itemSym === selectedSymbol && item.title !== currentLatest.title;
            })
            .slice(0, 3); // Keep only top 3 reports for brevity
          
          let text = "";
          if (otherReports.length > 0) {
            const reportsText = otherReports
              .map((r, i) => `Report ${i + 1}: ${r.title || r.headline}`)
              .join(". ");
            text = `Intelligence briefing for selected ticker ${selectedStock.symbol}. Existing reports are: ${reportsText}. Finally, newly arrived news headline: ${currentLatest.headline || currentLatest.title}.`;
          } else {
            text = `Incoming intelligence for selected ticker ${selectedStock.symbol}: ${currentLatest.headline || currentLatest.title}.`;
          }
          speakWithEnhancedVoice(text);
        } else {
          // Normal headline reading for non-selected/other tickers
          const text = `Incoming intelligence: ${currentLatest.headline || currentLatest.title}.`;
          speakWithEnhancedVoice(text);
        }
      }
      if (isNewsCyclingActive) {
        // App-level cycle timer will handle this
      }
      const company = companies.find(
        (c) => c.symbol === (currentLatest.symbol || currentLatest.ticker),
      );
      if (company && isNewsCyclingActive) {
        onSelectNode(company, true);
      }
    }

    prevLatestNewsRef.current = currentLatest;
  }, [allNewsData, isNewsCyclingActive, onSelectNode, isVocalizerEnabled, isLiveNewsZoomEnabled, selectedStock]);

  // Local cycling effects removed in favor of App-level cycle control

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
      if (isTransitioning) return null;
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

  return (
    <div className="w-full h-full absolute inset-0 m-auto flex-1 bg-[#050505] overflow-hidden map-green-hued tactical-grid">
      <div className="absolute top-1 right-1 z-[1002] flex flex-col gap-1 pointer-events-auto items-end">
        {/* GlobeMinimap is handled via separate component */}
      </div>

      <div className="w-full h-full absolute inset-0 z-20 opacity-100 pointer-events-auto">
        <Suspense
          fallback={
            <div className="absolute inset-0 bg-black flex flex-col items-center justify-center">
              <div className="w-12 h-12 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full" />
              <div className="mt-4 text-emerald-500/50 font-mono text-[10px] tracking-widest uppercase">
                INITIALIZING ORBITAL ENGINE...
              </div>
            </div>
          }
        >
          <OrbitalMap 
            selectedStock={selectedStock as any}
            agentFocus={agentFocus}
            autoRotate={autoRotateEnabled}
            entities={companiesToRender}
            onSelectNode={(entity) => {
              if (entity && onSelectNode) {
                onSelectNode(entity);
              }
            }}
            onHeadlineClick={onHeadlineClick}
            activeNewsPopup={activeNewsPopup}
            isLiveNewsZoomEnabled={isLiveNewsZoomEnabled}
            isFocusMode={isFocusMode}
            isAutopilot={isAutopilot}
            toggleGlobalNetwork={toggleGlobalNetwork}
            toggleLiveNewsZoom={toggleLiveNewsZoom}
            toggleFocusMode={toggleFocusMode}
            resetOrientationTrigger={resetOrientationTrigger}
            partnerLines={partnerLines}
            mapLayers={mapLayers}
            isSidebarMinimized={isSidebarMinimized}
          />
        </Suspense>
      </div>

      {/* Broad Center Globe Search Bar */}
      <div className={cn(
        "absolute z-[1001] w-[20rem] md:w-[220px] lg:w-[260px] xl:w-[320px] max-w-[calc(100vw-2rem)] select-none pointer-events-auto transition-all duration-300 top-4",
        isSidebarMinimized
          ? "left-4 md:left-[48px]"
          : "left-4 md:left-[236px] lg:left-[276px] xl:left-[336px]"
      )}>
        <div className="relative flex items-center bg-black/85 backdrop-blur-md border border-emerald-500/30 p-1 px-2.5 rounded-sm shadow-[0_0_20px_rgba(0,0,0,0.8)] focus-within:border-emerald-500/80 transition-all duration-300">
          <Search className="w-3.5 h-3.5 text-emerald-500/50 mr-2 shrink-0" />
          <input
            ref={broadSearchInputRef}
            type="text"
            value={broadSearchQuery}
            onChange={(e) => {
              setBroadSearchQuery(e.target.value);
              setBroadSearchCursor(-1);
            }}
            onFocus={() => setIsBroadSearchFocused(true)}
            onBlur={() => setTimeout(() => setIsBroadSearchFocused(false), 200)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setBroadSearchCursor((prev) =>
                  prev < finalBroadMatches.length - 1 ? prev + 1 : 0
                );
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setBroadSearchCursor((prev) =>
                  prev > 0 ? prev - 1 : finalBroadMatches.length - 1
                );
              } else if (e.key === "Escape") {
                e.preventDefault();
                setIsBroadSearchFocused(false);
                broadSearchInputRef.current?.blur();
              } else if (e.key === "Enter" && broadSearchQuery) {
                e.preventDefault();
                e.stopPropagation();
                
                const activeIdx = broadSearchCursor >= 0 && broadSearchCursor < finalBroadMatches.length ? broadSearchCursor : -1;
                if (activeIdx >= 0) {
                  const matched = finalBroadMatches[activeIdx].company;
                  if (onSelectNode) {
                    onSelectNode(matched, false, true);
                  }
                  setBroadSearchQuery("");
                  setIsBroadSearchFocused(false);
                  broadSearchInputRef.current?.blur();
                } else {
                  const queryTerm = broadSearchQuery.toLowerCase().trim();
                  // Check if there's an exact case-insensitive match for the symbol or close match
                  const exactMatch = finalBroadMatches.find(
                    (m) =>
                      m.company.symbol.toLowerCase() === queryTerm ||
                      m.company.name.toLowerCase() === queryTerm
                  );
                  
                  if (exactMatch) {
                    if (onSelectNode) {
                      onSelectNode(exactMatch.company, false, true);
                    }
                    setBroadSearchQuery("");
                    setIsBroadSearchFocused(false);
                    broadSearchInputRef.current?.blur();
                  } else if (onAgentSearch) {
                    onAgentSearch(broadSearchQuery);
                    setBroadSearchQuery("");
                    setIsBroadSearchFocused(false);
                    broadSearchInputRef.current?.blur();
                  } else if (finalBroadMatches.length > 0) {
                    const matched = finalBroadMatches[0].company;
                    if (onSelectNode) {
                      onSelectNode(matched, false, true);
                    }
                    setBroadSearchQuery("");
                    setIsBroadSearchFocused(false);
                    broadSearchInputRef.current?.blur();
                  }
                }
              }
            }}
            placeholder="BROAD ORBITAL ENGINE SEARCH..."
            className="w-full bg-transparent border-0 ring-0 focus:ring-0 focus:outline-none font-mono text-[9px] text-emerald-400 placeholder-zinc-700 uppercase tracking-widest leading-none py-1.5"
          />
          {broadSearchQuery && (
            <button
              onClick={() => {
                setBroadSearchQuery("");
                setBroadSearchCursor(-1);
              }}
              className="text-zinc-650 hover:text-emerald-400 transition-colors p-1 text-[10px]"
            >
              ✕
            </button>
          )}
        </div>

        <AnimatePresence>
          {isBroadSearchFocused && (
            <motion.div
              initial={{ opacity: 0, y: -2 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -2 }}
              transition={{ duration: 0.1 }}
              className="absolute top-full left-0 right-0 z-[1002] mt-1 max-h-60 overflow-y-auto custom-scrollbar border border-emerald-500/30 bg-black/95 backdrop-blur-md rounded-sm shadow-[0_10px_30px_rgba(0,0,0,0.9)] p-px font-mono"
            >
              {!broadSearchQuery.trim() && (
                <div className="p-1">
                  <div className="px-2 py-1.5 text-[6.5px] font-mono text-zinc-650 uppercase tracking-[0.2em] border-b border-zinc-900/50 mb-1 flex items-center gap-2">
                    <Zap className="w-2 h-2 text-emerald-500" />
                    Globe Agent Intelligence Hub
                  </div>
                  {agentSuggestions.map((suggestion, idx) => (
                    <div
                      key={`suggest-${idx}`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setBroadSearchQuery(suggestion);
                        if (onAgentSearch) onAgentSearch(suggestion);
                        setBroadSearchQuery("");
                        setIsBroadSearchFocused(false);
                        broadSearchInputRef.current?.blur();
                      }}
                      className={cn(
                        "flex items-center gap-2 p-1.5 text-[8px] cursor-pointer transition-all hover:bg-emerald-500/10 rounded-xs",
                        broadSearchCursor === idx ? "bg-emerald-500/15 text-emerald-400" : "text-zinc-500"
                      )}
                    >
                      <MessageSquare className="w-2.5 h-2.5 opacity-40" />
                      {suggestion.toUpperCase()}
                    </div>
                  ))}
                </div>
              )}
              {finalBroadMatches.length > 0 ? (
                finalBroadMatches.map(({ company, matchedFields }, idx) => {
                  const isSelected = selectedStock?.symbol === company.symbol;
                  const isHoveredByCursor = broadSearchCursor === idx;
                  
                  // Get most relevant match label
                  const matchTag = matchedFields && matchedFields.length > 0 ? matchedFields[0].field : "";

                  return (
                    <div
                      key={`broad-${company.symbol}-${idx}`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                      }}
                      onClick={() => {
                        if (onSelectNode) {
                          onSelectNode(company, false, true);
                        }
                        setBroadSearchQuery("");
                        setIsBroadSearchFocused(false);
                        broadSearchInputRef.current?.blur();
                      }}
                      className={cn(
                        "flex items-center justify-between px-3 py-2 text-[9px] cursor-pointer border-b border-zinc-900/40 last:border-0 transition-colors duration-150",
                        isHoveredByCursor || isSelected
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "text-zinc-400 hover:bg-zinc-900/50 hover:text-white"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white shrink-0 tracking-wider">
                          {company.symbol}
                        </span>
                        <span className="text-zinc-500 truncate max-w-[110px] md:max-w-[130px]">
                          {company.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 select-none">
                        {matchTag && matchTag !== "Ticker" && matchTag !== "Name" && (
                          <span className="text-[7.2px] px-1 bg-emerald-950/40 border border-emerald-900/30 text-emerald-500/80 rounded-xs uppercase tracking-tight scale-90 origin-right italic">
                            Via {matchTag}
                          </span>
                        )}
                        <span className="text-[7.5px] px-1 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-zinc-500 uppercase">
                          {company.sector}
                        </span>
                        <span className="text-[7.5px] text-zinc-650">
                          {company.country}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : broadSearchQuery.trim() ? (
                <div className="p-4 text-center">
                  <div className="text-[9px] font-mono text-zinc-650 uppercase tracking-[0.2em] mb-1">
                    [ NO_DIRECT_MATCHES ]
                  </div>
                  <div className="text-[7.5px] font-mono text-zinc-700 uppercase leading-relaxed max-w-[200px] mx-auto mb-3">
                    Global registry scan completed. No deterministic matches for "{broadSearchQuery.toUpperCase()}".
                  </div>
                  <button 
                    onClick={() => {
                        // Submit as agent query
                        if (onAgentSearch) onAgentSearch(broadSearchQuery);
                        setBroadSearchQuery("");
                        setIsBroadSearchFocused(false);
                    }}
                    className="px-3 py-1 border border-emerald-500/30 text-emerald-500 text-[8.5px] font-mono hover:bg-emerald-500/10 rounded-xs uppercase tracking-tight"
                  >
                    INITIATE AGENT INTELLIGENCE SCAN
                  </button>
                </div>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

        <AnimatePresence>
        {preservedBriefing && isBriefingMinimized && (
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            onClick={() => setIsBriefingMinimized(false)}
            className={cn(
              "absolute z-[1000] flex items-center gap-2 bg-black/95 border border-emerald-500/40 px-3.5 py-2.5 cursor-pointer pointer-events-auto rounded-sm select-none font-mono text-[9px] text-emerald-400 hover:border-emerald-400 hover:shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all duration-300 shadow-[0_0_20px_rgba(0,0,0,0.8)] top-[52px]",
              isSidebarMinimized
                ? "left-4 md:left-[48px]"
                : "left-4 md:left-[236px] lg:left-[276px] xl:left-[336px]"
            )}
            title="Click to restore Strategic Briefing"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
            <span className="font-bold tracking-widest text-[8.5px] uppercase">
              {preservedBriefing.title || "TACTICAL_BRIEFING"} [MINIMIZED]
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-emerald-400 font-bold ml-1 animate-bounce" />
          </motion.div>
        )}

        {(preservedBriefing || isAgentSearching) && !isBriefingMinimized && (
          <motion.div 
            id="tactical-briefing-panel"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className={cn(
              "absolute z-[1000] w-[20rem] md:w-[220px] lg:w-[260px] xl:w-[320px] max-w-[calc(100vw-2rem)] bg-black/90 backdrop-blur-xl border border-emerald-500/40 p-3.5 pointer-events-auto select-none font-mono shadow-[0_0_30px_rgba(0,0,0,0.8)] hover:border-emerald-500/60 transition-all duration-300 animate-none top-[52px]",
              isSidebarMinimized
                ? "left-4 md:left-[48px]"
                : "left-4 md:left-[236px] lg:left-[276px] xl:left-[336px]"
            )}
          >
            <div className="flex items-center justify-between mb-2 border-b border-emerald-900/50 pb-1.5 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className={cn("w-1.5 h-1.5 rounded-full shadow-[0_0_8px_#10b981]", isSpeaking ? "bg-cyan-400 animate-ping" : "bg-emerald-500 animate-pulse")} />
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-emerald-400 tracking-widest uppercase">
                    {isAgentSearching ? "AGENT SEARCH RUNNING" : (preservedBriefing?.title || "TACTICAL_BRIEFING")}
                  </span>
                  <span className="text-[7px] font-medium text-emerald-700 tracking-widest uppercase flex items-center gap-1.5">
                    {isAgentSearching ? "COGNITIVE SYNTHESIS" : (preservedBriefing?.subTitle || "OPERATIONS STREAM")}
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
                      const textToSpeak = preservedBriefing?.type === "briefing"
                        ? (typeof preservedBriefing.data === "string" ? preservedBriefing.data : (preservedBriefing.data?.summary || preservedBriefing.data?.text || "Analyzing..."))
                        : (preservedBriefing?.text || "Analyzing...");
                      speakWithEnhancedVoice(textToSpeak, true);
                    }
                  }}
                  disabled={isSpeechLoading || isAgentSearching}
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-0.5 border text-[7px] font-mono tracking-wider font-bold transition-all cursor-pointer rounded-sm shrink-0",
                    isSpeaking 
                      ? "bg-red-950/20 border-red-500/40 text-red-400" 
                      : "bg-emerald-950/20 border-emerald-500/20 text-emerald-400 hover:border-emerald-500/40 disabled:opacity-40"
                  )}
                >
                  {isSpeaking ? (
                    <VolumeX className="w-2.5 h-2.5" />
                  ) : (
                    <Volume2 className="w-2.5 h-2.5" />
                  )}
                  <span>{isSpeaking ? "TERMINATE" : "VOICE OVER"}</span>
                </button>
                
                {/* Minimize Action */}
                <button
                  onClick={() => setIsBriefingMinimized(true)}
                  className="p-1 border border-emerald-500/20 bg-zinc-900/50 text-emerald-500 hover:border-emerald-500 hover:text-emerald-400 font-mono transition-all duration-200 cursor-pointer"
                  title="Minimize Strategic Briefing"
                >
                  <Minus className="w-3 h-3" />
                </button>
              </div>
            </div>

            <div className="max-h-[300px] overflow-y-auto custom-scrollbar pr-1.5 space-y-4">
              {isAgentSearching ? (
                <div className="space-y-4 font-mono py-2">
                  <div className="flex items-center gap-2 text-[10px] text-emerald-400 font-bold tracking-widest animate-pulse">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" />
                    <span>AGENT_SYNTHESIS_ACTIVE</span>
                  </div>
                  <div className="text-[9px] text-zinc-400 leading-relaxed bg-zinc-950/60 border border-zinc-900/80 p-2.5 rounded-sm">
                    Negotiating strategic AI uplink. Querying secure supply chain nodes, macro lithography corridors, and cross-border tech chokepoints...
                  </div>
                </div>
              ) : preservedBriefing?.type === "briefing" ? (
                <div className="space-y-4">
                  <div className="p-2 bg-zinc-900/50 border border-emerald-500/10 rounded-sm">
                     <div className="text-[7.5px] font-black text-emerald-400/70 uppercase tracking-[0.2em] mb-1.5 border-b border-emerald-500/10 pb-0.5">
                       DECK_AGENT_SUMMARY
                     </div>
                     <Typewriter
                       className="text-zinc-300 font-mono text-[9px]"
                       text={
                         typeof preservedBriefing.data === "string" ? preservedBriefing.data :
                         (preservedBriefing.data?.summary ||
                         preservedBriefing.data?.text ||
                         "Analyzing current operational strategy...")
                       }
                     />
                  </div>
                  
                  {/* ENHANCED: ASSOCIATED ENTITIES -> ENTITY */}
                  {preservedBriefing.data && typeof preservedBriefing.data !== "string" && preservedBriefing.data.relatedEntities && (
                    <div className="p-2.5 bg-emerald-500/5 border border-emerald-500/20 rounded-sm space-y-2">
                       <div className="flex items-center gap-2 text-[8.5px] font-black text-emerald-400 uppercase tracking-widest font-mono">
                         <Shield className="w-3 h-3 text-emerald-500" />
                         ENTITY
                       </div>
                       <div className="space-y-2 max-h-[220px] overflow-y-auto custom-scrollbar pr-0.5">
                         {(preservedBriefing.data.relatedEntities || []).map((rec: string, idx: number) => {
                            const isExpanded = expandedEntityIdx === idx;
                            const isLoading = loadingEntityIdx === idx;
                            const details = entityDetails[rec];

                            return (
                              <div key={idx} className="border-b border-emerald-500/5 pb-1.5 last:border-0 last:pb-0">
                                <button
                                  onClick={() => handleEntityClick(rec, idx)}
                                  className="w-full text-left flex items-start gap-1.5 text-[8.5px] text-zinc-300 font-mono hover:text-emerald-400 transition-colors duration-150 cursor-pointer group"
                                >
                                  <span className="text-emerald-500 shrink-0 group-hover:scale-115 transition-transform">
                                    [{idx + 1}]
                                  </span>
                                  <span className="flex-1 font-bold tracking-tight">{rec}</span>
                                  {isLoading ? (
                                    <Loader2 className="w-2.5 h-2.5 animate-spin text-emerald-500 self-center shrink-0" />
                                  ) : (
                                    <span className="text-[7px] text-emerald-600/60 uppercase self-center shrink-0 group-hover:text-emerald-400 font-black tracking-widest">
                                      {isExpanded ? "▲ HIDE" : "▼ INFO"}
                                    </span>
                                  )}
                                </button>

                                {isExpanded && (
                                  <div className="mt-1.5 pl-2.5 border-l border-emerald-500/30 space-y-1.5 text-[7.5px] font-mono">
                                    {isLoading ? (
                                      <div className="text-zinc-500 italic animate-pulse">
                                        Synthesizing entity telemetry...
                                      </div>
                                    ) : details ? (
                                      <div className="space-y-1.5 animate-none">
                                        <div className="text-zinc-300 leading-relaxed bg-black/50 p-2 rounded border border-zinc-900">
                                          {details.briefing || details.aiStrategyAnalysis?.summary || "No active intelligence briefing formulated."}
                                        </div>
                                        {details.locationName && (
                                          <div className="flex items-center gap-1 text-[7px] text-emerald-400 font-black tracking-widest uppercase">
                                            <span className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                                            <span>NODE: {details.locationName}</span>
                                          </div>
                                        )}
                                        {details.aiStrategyAnalysis?.outlook && (
                                          <div className="flex items-center gap-1.5 text-[7px]">
                                            <span className="text-zinc-500 font-bold uppercase tracking-wider">VECTOR OUTLOOK:</span>
                                            <span className={cn(
                                              "font-black uppercase tracking-wider",
                                              details.aiStrategyAnalysis.outlook === "ACCELERATING" ? "text-emerald-400" :
                                              details.aiStrategyAnalysis.outlook === "VULNERABLE" || details.aiStrategyAnalysis.outlook === "COMPROMISED" ? "text-red-500" :
                                              details.aiStrategyAnalysis.outlook === "STRETCHED" ? "text-amber-500" : "text-white"
                                            )}>
                                              {details.aiStrategyAnalysis.outlook}
                                            </span>
                                          </div>
                                        )}
                                        {details.facts && details.facts.length > 0 && (
                                          <div className="space-y-1 pt-1 border-t border-emerald-500/10">
                                            <div className="text-[7px] font-black text-emerald-500/80 uppercase tracking-widest">
                                              INTELLIGENCE DOSSIER:
                                            </div>
                                            {details.facts.slice(0, 2).map((fact: string, fIdx: number) => (
                                              <div key={fIdx} className="flex items-start gap-1 text-zinc-400 leading-relaxed">
                                                <span className="text-emerald-500 font-bold">•</span>
                                                <span>{fact}</span>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="text-red-400/80 italic">
                                        Unable to establish secure telemetry uplink.
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                         })}
                       </div>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2">
                    <div className="flex flex-col bg-black p-2 rounded-sm border border-zinc-900">
                       <div className="text-[7px] text-zinc-600 uppercase font-mono mb-0.5">Vector</div>
                       <div className={cn(
                         "text-[9px] font-black font-mono truncate",
                         preservedBriefing.data?.outlook === "ACCELERATING" ? "text-emerald-400" :
                         preservedBriefing.data?.outlook === "VULNERABLE" || preservedBriefing.data?.outlook === "COMPROMISED" ? "text-red-500" :
                         preservedBriefing.data?.outlook === "STRETCHED" ? "text-amber-500" : "text-white"
                       )}>
                         {preservedBriefing.data?.outlook || "STABLE"}
                       </div>
                    </div>
                    <div className="flex flex-col bg-black p-2 rounded-sm border border-zinc-900 col-span-2">
                       <div className="text-[7px] text-zinc-600 uppercase font-mono mb-0.5">Primary Threat</div>
                       <div className="text-[8.5px] font-bold text-red-400 font-mono truncate">
                         {preservedBriefing.data?.riskFactors?.[0] || "None Detected"}
                       </div>
                    </div>
                  </div>
                </div>
              ) : typedBriefing ? (
                <div className="space-y-3.5 font-mono">
                  {preservedBriefing?.queryText && (
                    <div className="text-[8px] font-bold text-emerald-400 border border-emerald-900/30 bg-emerald-950/20 px-2 py-1 rounded-sm tracking-wide">
                      <span className="text-emerald-500/75 mr-1.5">[QUERY]</span>
                      <span className="text-zinc-350">{preservedBriefing.queryText}</span>
                    </div>
                  )}

                  <div className="text-[9px] text-zinc-300 leading-relaxed min-h-[40px] whitespace-pre-line bg-zinc-950/40 p-2 rounded-sm border border-zinc-900/60 font-mono">
                    {typedBriefing}
                    {!isNavAnimationFinished && (
                      <span className="inline-block w-1 h-3.5 bg-emerald-500 ml-0.5 animate-pulse" />
                    )}
                  </div>

                  {isNavAnimationFinished && agentFocus && agentFocus.facts && agentFocus.facts.length > 0 && (
                    <div className="pt-2.5 border-t border-emerald-500/20 space-y-2">
                      <div className="text-[8.5px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5 font-mono">
                        <span className="w-1 h-2.5 bg-emerald-500 inline-block" />
                        SPECIFIC NAMES, LOCATIONS & ORGANIZATIONS
                      </div>
                      <div className="space-y-1.5 max-h-[140px] overflow-y-auto custom-scrollbar pr-1">
                        {agentFocus.facts.map((fact: string, idx: number) => (
                          <div key={idx} className="bg-zinc-950/80 border border-zinc-900 rounded p-2 text-[8.5px] text-zinc-300 flex items-start gap-2 leading-relaxed font-mono">
                            <span className="text-emerald-500 font-bold shrink-0">·</span>
                            <span>{fact}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                  <div className="text-[9.5px] text-zinc-500 font-mono bg-zinc-900/30 p-2 border border-zinc-800 border-dashed rounded-sm">
                    No active briefing formulated. Request AI synthesis.
                  </div>
              )}
            </div>

            <div className="mt-3 flex justify-between items-center text-[7px] text-zinc-600 border-t border-zinc-900/40 pt-2">
               <span>TRANSIT_LOCK: {agentFocus ? `${Number(agentFocus.lat).toFixed(2)} / ${Number(agentFocus.lng).toFixed(2)}` : "STANDBY"}</span>
               <span>v4.2.0</span>
            </div>
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
