import React, { useEffect, useState, useRef } from "react";
import { Shield, Activity, Globe, Menu, Settings, LogOut, X, DollarSign } from "lucide-react";
import { cn } from "../lib/utils";
import { motion } from "motion/react";

import { COMPANIES } from "../data/companies";
import { playTacticalAudio } from "../utils/audio";

interface HeaderProps {
  selectedStock?: any;
  yields?: any;
  onOpenSettings: () => void;
  onSelectStock?: (company: any) => void;
  riskScore?: number;
}

export const Header: React.FC<HeaderProps> = ({ 
  selectedStock, 
  yields, 
  onOpenSettings,
  onSelectStock,
  riskScore = 25,
}) => {
  const [time, setTime] = useState(new Date());
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const prevTreasuryData = useRef<Record<string, number>>({});
  const treasuryData = yields?.treasuries || null;

  // Helper to trigger selection for index/pinned assets
  const handleIndexSelect = (symbol: string) => {
    if (onSelectStock) {
      const found = COMPANIES.find(c => c.symbol === symbol);
      if (found) onSelectStock(found);
    }
  };

  const [latency, setLatency] = useState(24);
  const [vix, setVix] = useState(() => {
    const base = 12.5 + (riskScore * 0.15) + (Math.random() * 1.5);
    return Number(base.toFixed(2));
  });
  const [vixTrend, setVixTrend] = useState<'↑' | '↓' | '-'>('-');

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    const latencyTimer = setInterval(() => {
      setLatency(prev => {
        const delta = Math.floor(Math.random() * 5) - 2;
        return Math.max(10, Math.min(99, prev + delta));
      });
    }, 3000);
    const vixTimer = setInterval(() => {
      setVix(prev => {
        const change = (Math.random() * 0.4 - 0.2);
        const next = Math.max(9.0, Math.min(45.0, prev + change));
        setVixTrend(change > 0 ? '↑' : change < 0 ? '↓' : '-');
        return Number(next.toFixed(2));
      });
    }, 4000);
    return () => {
      clearInterval(timer);
      clearInterval(latencyTimer);
      clearInterval(vixTimer);
    };
  }, []);

  useEffect(() => {
    if (treasuryData) {
      prevTreasuryData.current = treasuryData;
    }
  }, [treasuryData]);

  // Handle click outside to close the drawer
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (typeof document !== "undefined") {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, []);

  return (
    <header className="h-12 border-b border-zinc-800 flex items-center bg-black shrink-0 relative z-[100] px-3 md:px-6 justify-between">
      <div className="flex items-center gap-4">
        {/* Hamburger Dropdown Menu Container */}
        <div className="relative flex items-center" ref={menuRef}>
          <button
            onClick={() => {
              setMenuOpen(!menuOpen);
              playTacticalAudio("click");
            }}
            className="p-1.5 hover:bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-emerald-500 transition-colors rounded-sm uppercase font-sans text-[9px] flex items-center gap-1 cursor-pointer z-50 relative"
            title="Menu"
          >
            {menuOpen ? <X className="w-4 h-4 text-emerald-500" /> : <Menu className="w-4 h-4" />}
          </button>
          
          {menuOpen && (
            <div className="absolute left-0 top-full mt-2 w-52 bg-black border border-emerald-800/40 shadow-[0_10px_50px_rgba(0,0,0,0.8)] rounded-sm z-[200] font-sans overflow-hidden">
              <div className="px-3 py-2 text-[8px] text-emerald-500/50 font-black border-b border-zinc-900 tracking-[0.2em] bg-zinc-950/50 uppercase">
                Terminal Infrastructure
              </div>
              
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onOpenSettings();
                  playTacticalAudio("confirm");
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-[10px] text-zinc-300 hover:text-emerald-400 hover:bg-emerald-500/5 transition-all uppercase text-left font-bold cursor-pointer group"
              >
                <Settings className="w-4 h-4 text-zinc-500 group-hover:text-emerald-500 transition-colors" />
                <span>Terminal Settings</span>
              </button>

              <div className="h-[1px] bg-zinc-900 mx-2" />

              <button
                onClick={() => {
                  setMenuOpen(false);
                  playTacticalAudio("warning");
                  setTimeout(() => {
                    localStorage.removeItem('terminal_auth_token');
                    window.location.reload();
                  }, 400);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-[10px] text-zinc-500 hover:text-red-400 hover:bg-red-500/5 transition-all uppercase text-left font-bold cursor-pointer group"
              >
                <LogOut className="w-4 h-4 text-zinc-700 group-hover:text-red-500 transition-colors" />
                <span>Terminate Session</span>
              </button>

              <div className="px-3 py-1.5 text-[6px] text-zinc-700 border-t border-zinc-900/50 bg-zinc-950/30">
                UPLINK_SECURE // AES-256-GCM
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2.5 select-none relative group">
          <button 
            onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
            className="absolute -right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-900 border border-zinc-800 text-[8px] font-mono text-zinc-500 px-1 py-0.5 rounded-xs pointer-events-none"
          >
            ⌘K
          </button>
          <div className="relative flex items-center justify-center">
            <img 
              src="/logo.svg" 
              className="w-6 h-6 object-contain shrink-0" 
              alt="Company Logo" 
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-emerald-400 font-mono font-black text-[11px] tracking-[0.25em] uppercase text-glow leading-none flex items-center gap-2">
              <span className="hidden sm:inline">YIELD ANALYSIS TERMINAL</span>
              <span className="sm:hidden font-black">TERMINAL</span>
            </span>
            <span className="text-[6.5px] text-zinc-650 font-mono font-bold tracking-[0.4em] uppercase leading-none mt-1.5 hidden sm:flex items-center gap-1.5 overflow-hidden">
              <span className="w-1.5 h-1.5 bg-emerald-500 inline-block opacity-40 rounded-full shrink-0"></span>
              <span className="shrink-0">CORE_NODE_UPLINK</span>
              <span className="text-zinc-500 font-mono font-medium tracking-normal normal-case ml-2 text-[6.5px] pl-1 border-l border-zinc-800 truncate select-all">
                <span className="hidden xl:inline">OWNER: /OPERATOR: / CORE DEVELOPER: // JEROME JACKSON</span>
                <span className="hidden md:inline xl:hidden">OWNER/DEV: JEROME JACKSON</span>
                <span className="inline md:hidden">JEROME JACKSON</span>
              </span>
            </span>
          </div>
        </div>
        <div className="h-4 w-[1px] bg-emerald-500/10 mx-2 hidden lg:block" />
        <div className="hidden lg:flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="flex gap-[1px] h-2 items-end">
               {[...Array(6)].map((_, i) => (
                 <div 
                   key={i} 
                   className="w-[2px] bg-emerald-500 h-1/2" 
                 />
               ))}
            </div>
            <span className="text-zinc-650 font-mono text-[8px] font-black tracking-widest uppercase">SYST_PULSE</span>
            <div className="ml-2 px-1 border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-[6.5px] font-mono font-bold tracking-widest">
              {latency}MS
            </div>
          </div>
          
          <div className="flex items-center gap-2 border-l border-zinc-900 pl-4">
             <div className="text-[6.5px] text-zinc-700 font-bold uppercase tracking-widest">NEURAL_LOAD</div>
             <div className="h-1.5 w-16 bg-zinc-900 rounded-full overflow-hidden flex gap-[1px] p-[1px]">
               {[...Array(12)].map((_, i) => {
                 const isActive = (i / 12) * 100 < riskScore;
                 const isCrit = riskScore >= 75;
                 const isWarn = riskScore >= 45;
                 return (
                   <div
                     key={i}
                     className={cn(
                       "flex-1 h-full", 
                       isActive 
                         ? (isCrit ? "bg-red-500" : isWarn ? "bg-amber-500" : "bg-emerald-500") 
                         : "bg-zinc-800"
                     )}
                   />
                 );
               })}
             </div>
          </div>
          
          <div className="hidden xl:flex items-center gap-6 font-mono border-l border-zinc-900 px-6 h-8 bg-zinc-950/30 text-[9px]">
            <div className="hidden 2xl:flex flex-col pl-6">
              <span className="text-[6px] text-zinc-650 font-bold uppercase tracking-widest">LINK_STABILITY</span>
              <div className="flex gap-[1px] mt-0.5">
                {[1,1,1,1,1,1,1,0].map((v, i) => <div key={i} className={`w-1 h-1.5 ${v ? "bg-emerald-500/60" : "bg-zinc-800"}`} />)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 font-mono">
            {treasuryData && Object.entries(treasuryData).map(([key, val]: [string, any], idx) => {
              const prevVal = prevTreasuryData.current[key] || val;
              const trend = val > prevVal ? '↑' : val < prevVal ? '↓' : '-';
              const trendColor = val > prevVal ? 'text-emerald-500' : val < prevVal ? 'text-red-500' : 'text-zinc-600';
              
              // Only show idx 0 (03M), 5 (10Y), 6 (30Y) on lg:flex, and show all on xl:flex to prevent overflow
              const isResponsiveVisible = idx === 0 || idx === 5 || idx === 6;
              
              return (
                <div 
                  key={key} 
                  className={cn(
                    "hidden sm:flex items-center gap-1.5 bg-zinc-950/50 px-2 py-0.5 border border-zinc-800/50 group hover:border-emerald-500/30 transition-colors",
                    !isResponsiveVisible && "hidden xl:flex"
                  )}
                >
                  <Activity className="w-2.5 h-2.5 text-zinc-600 group-hover:text-emerald-500" />
                  <span className="text-zinc-500 text-[8px] font-bold uppercase tracking-tighter">M.{key}</span>
                  <span className="text-cyan-400/90 text-[9px] font-black tabular-nums tracking-wider">
                    {Number(val).toFixed(3)}
                  </span>
                  <span className={cn("text-[8px] font-black", trendColor)}>
                    {trend}
                  </span>
                </div>
              );
            })}
            {!treasuryData && (
              <div className="text-[8px] font-mono text-zinc-700 tracking-widest">SYNCHRONIZING_YIELD_CURVE...</div>
            )}
          </div>

          {/* MACRO TICKER OVERLAY */}
          <div className="hidden 2xl:flex items-center w-64 h-6 border-x border-zinc-900 bg-zinc-950/50 relative overflow-hidden group">
            <div className="flex whitespace-nowrap animate-marquee px-4 gap-8">
              {[...Array(2)].map((_, groupIdx) => (
                <div key={groupIdx} className="flex gap-8">
                  {[
                    { label: "VIX_VOLATILITY", val: vix, trend: vixTrend },
                    { label: "SYSTEM_RISK_INDEX", val: riskScore, trend: riskScore > 50 ? '↑' : '↓' },
                    { label: "BRENT_CRUDE_NEAR", val: "84.22", trend: "↑" },
                    { label: "SOX_SEMICON_IDX", val: "4,622", trend: "↓" }
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 font-mono text-[8.5px] font-black">
                      <span className="text-zinc-500 tracking-widest">{item.label}</span>
                      <span className={cn("tracking-tighter px-1", item.trend === '↑' ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-400")}>
                        {item.val} {item.trend}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-black to-transparent z-10" />
            <div className="absolute inset-y-0 right-0 w-4 bg-gradient-to-l from-black to-transparent z-10" />
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 md:gap-5 font-mono text-[9px]">
        {selectedStock && (
          <div className="hidden xl:flex items-center gap-2 bg-zinc-950 px-2 py-0.5 border border-emerald-500/20 text-emerald-400 uppercase tracking-[0.2em] font-black text-[8px]">
            <Shield className="w-2.5 h-2.5 text-emerald-500/50" />
            <span className="text-zinc-600 mr-1 opacity-50">TRACKING_LOCK:</span>
            {selectedStock.symbol}
          </div>
        )}
        {selectedStock && (
          <div className="hidden sm:flex xl:hidden items-center gap-1 bg-zinc-950 px-2 py-0.5 border border-emerald-500/20 text-emerald-400 uppercase tracking-widest font-black text-[8px]">
            <span className="text-zinc-600 mr-1">TGT:</span>
            {selectedStock.symbol}
          </div>
        )}
        <a 
          href={import.meta.env.VITE_CASHAPP_URL || "https://cash.app/$omiahj"} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="bg-emerald-950/40 border border-emerald-500/40 px-2 py-1 hover:bg-emerald-500 hover:text-black transition-all flex items-center gap-1 group"
          title="Donate via Cash App"
        >
          <DollarSign className="w-3.5 h-3.5 text-emerald-400 group-hover:text-black" />
          <span className="text-[8px] font-black tracking-widest hidden lg:inline">DONATE</span>
        </a>
        <a href="https://www.youtube.com/@YieldAnalysts" target="_blank" rel="noopener noreferrer" className="bg-zinc-950 border border-zinc-800 p-1 hover:border-red-500 hover:bg-red-500/10 transition-colors">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-zinc-500 hover:text-red-500 transition-colors duration-200 cursor-pointer">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
          </svg>
        </a>
        <div className="text-emerald-500/50 bg-black px-2 py-0.5 border border-zinc-900 font-bold tracking-widest font-mono">
          {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
        </div>
      </div>
    </header>
  );
};
