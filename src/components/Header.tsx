import React, { useEffect, useState, useRef } from "react";
import { Shield, Activity, Globe, Menu, Settings, LogOut, X, DollarSign } from "lucide-react";
import { cn } from "../lib/utils";
import { motion } from "motion/react";

import { COMPANIES } from "../data/companies";

interface HeaderProps {
  selectedStock?: any;
  onOpenSettings: () => void;
  onSelectStock?: (company: any) => void;
  riskScore?: number;
}

export const Header: React.FC<HeaderProps> = ({ 
  selectedStock, 
  onOpenSettings,
  onSelectStock,
  riskScore = 25,
}) => {
  const [time, setTime] = useState(new Date());
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  const [latency, setLatency] = useState(24);
  const handleIndexSelect = (symbol: string) => {
    if (onSelectStock) {
      const found = COMPANIES.find(c => c.symbol === symbol);
      if (found) onSelectStock(found);
    }
  };

  const [vix, setVix] = useState(() => {
    const base = 12.5 + (riskScore * 0.15) + (Math.random() * 1.5);
    return Number(base.toFixed(2));
  });
  const [vixTrend, setVixTrend] = useState<'↑' | '↓' | '-'>('-');
  const [pulseBars, setPulseBars] = useState<number[]>([40, 60, 50, 70, 35, 55]);
  const [linkStability, setLinkStability] = useState<number[]>([1, 1, 1, 1, 1, 1, 1, 0]);

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
    const waveTimer = setInterval(() => {
      setPulseBars(prev => prev.map(() => Math.floor(Math.random() * 70) + 15));
    }, 800);
    const linkTimer = setInterval(() => {
      setLinkStability(prev => {
        const next = [...prev];
        const idx = Math.floor(Math.random() * next.length);
        next[idx] = Math.random() > 0.15 ? 1 : 0;
        return next;
      });
    }, 2500);

    return () => {
      clearInterval(timer);
      clearInterval(latencyTimer);
      clearInterval(vixTimer);
      clearInterval(waveTimer);
      clearInterval(linkTimer);
    };
  }, []);


  useEffect(() => {
    // Dynamic feedback loop: shift VIX immediately based on global stress/riskScore spikes
    setVix(prev => {
      const targetVix = 11.5 + (riskScore * 0.45);
      const diff = targetVix - prev;
      const step = diff * 0.5; // step 50% closer for fluid transition
      const nextVal = prev + step + (Math.random() * 0.6 - 0.3);
      setVixTrend(diff > 0.05 ? '↑' : diff < -0.05 ? '↓' : '-');
      return Number(Math.max(9.0, Math.min(85.0, nextVal)).toFixed(2));
    });
  }, [riskScore]);

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
    <header className="h-12 border-b border-zinc-800 flex items-center bg-black shrink-0 relative z-[2000] px-3 md:px-6 justify-between">
      <div className="flex items-center gap-4">
        {/* Hamburger Dropdown Menu Container */}
        <div className="relative flex items-center" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1.5 hover:bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-emerald-500 transition-colors rounded-sm uppercase font-sans text-[9px] flex items-center gap-1 cursor-pointer z-50 relative"
            title="Menu"
          >
            {menuOpen ? <X className="w-4 h-4 text-emerald-500" /> : <Menu className="w-4 h-4" />}
          </button>
          
          {menuOpen && (
            <div className="absolute left-0 top-full mt-2 w-52 bg-black border border-emerald-800/40 shadow-[0_10px_50px_rgba(0,0,0,0.8)] rounded-sm z-[500] font-sans overflow-hidden">
              <div className="px-3 py-2 text-[8px] text-emerald-500/50 font-black border-b border-zinc-900 tracking-[0.2em] bg-zinc-950/50 uppercase">
                Terminal Infrastructure
              </div>
              
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onOpenSettings();
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
                  localStorage.removeItem('terminal_auth_token');
                  window.location.reload();
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
              <span className="shrink-0 text-emerald-400 font-extrabold uppercase tracking-widest">Global_Logistics_Core</span>
              <span className="text-zinc-500 font-mono font-medium tracking-normal normal-case ml-2 text-[6.5px] pl-1 border-l border-zinc-800 truncate select-all">
                <span className="hidden xl:inline">OWNER: /OPERATOR: / CORE DEVELOPER: // JEROME JACKSON</span>
                <span className="hidden md:inline xl:hidden">OWNER/DEV: JEROME JACKSON</span>
                <span className="inline md:hidden">JEROME JACKSON</span>
              </span>
            </span>
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
        <div className="flex items-center gap-1.5 bg-black px-2.5 py-0.5 border border-zinc-900 rounded-2xs font-bold font-mono text-[8.5px] shadow-sm select-none">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping shrink-0" />
          <span className="text-emerald-450 tracking-widest leading-none">
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
          </span>
        </div>
      </div>
    </header>
  );
};
