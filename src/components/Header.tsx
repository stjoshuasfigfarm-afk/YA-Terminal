import React, { useEffect, useState } from "react";
import { Shield, Activity, Globe } from "lucide-react";
import { cn } from "../lib/utils";

interface HeaderProps {
  selectedStock?: any;
  spyPrice?: number;
  oilPrice?: number;
  yields?: any;
  systemStatus?: { status: string, keys_detected: string[] } | null;
}

export const Header: React.FC<HeaderProps> = ({ selectedStock, spyPrice, oilPrice, yields, systemStatus }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isLive = systemStatus?.keys_detected && systemStatus.keys_detected.length > 0;
  const detectedKeys = systemStatus?.keys_detected || [];

  return (
    <header className="h-7 border-b border-zinc-800 flex items-center bg-black shrink-0 relative overflow-hidden z-20">
      <div className="flex items-center px-3 h-full border-r border-zinc-800 bg-zinc-900 z-10 space-x-2 shrink-0">
        <img src="/logo.svg" alt="Logo" className="w-5 h-5 object-contain" />
        <span className="text-white font-black tracking-tighter text-xs whitespace-nowrap uppercase">YA_TERMINAL</span>
      </div>
      
      <div className="flex-1 flex items-center h-full px-0 overflow-hidden bg-zinc-950/50">
        <div className="flex h-full items-center overflow-hidden">
          <div className="ticker-scroll flex items-center space-x-6 px-3 whitespace-nowrap">
            <div className="flex items-center gap-1.5 grayscale opacity-60">
              <span className="text-white font-mono text-[8px] font-bold tracking-widest uppercase">INDICES</span>
              <div className="flex items-center gap-1">
                <span className="text-zinc-500 font-mono text-[7px]">SPY:</span>
                <span className="text-white font-mono text-[8px] font-bold">
                  {Number(spyPrice || 739.00).toFixed(2)}
                  <span className="ml-1 text-[6px] opacity-40 animate-pulse">
                    {Math.random() > 0.5 ? '▲' : '▼'}
                  </span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-zinc-600 font-mono text-[8px] tracking-widest uppercase">GLD</span>
              <span className="text-white font-mono text-[9px] font-bold">
                {(220.50 + (Math.random() - 0.5) * 0.1).toFixed(2)}
              </span>
              <span className="text-emerald-500 font-mono text-[7px]">+0.5%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-600 font-mono text-[8px] tracking-widest uppercase">TLT</span>
              <span className="text-white font-mono text-[9px] font-bold">
                {(95.20 + (Math.random() - 0.5) * 0.05).toFixed(2)}
              </span>
              <span className="text-rose-500 font-mono text-[7px]">-0.2%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-600 font-mono text-[8px] tracking-widest uppercase">OIL</span>
              <span className="text-white font-mono text-[9px] font-bold">
                {Number(oilPrice || 78.45).toFixed(2)}
              </span>
              <span className="text-rose-500 font-mono text-[7px]">-1.2%</span>
            </div>

            <div className="flex items-center gap-1.5 grayscale opacity-80">
              <span className="text-zinc-600 font-mono text-[8px] tracking-widest uppercase">10Y</span>
              <span className="text-white font-mono text-[9px] font-bold">
                {yields?.treasuries?.['10Y'] ? `${yields.treasuries['10Y']}%` : '4.42%'}
              </span>
              <span className="text-emerald-500 font-mono text-[7px]">YLD</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-zinc-500 font-mono text-[8px] font-black italic tracking-tighter opacity-20 uppercase">PROTOCOL_V9_CONNECTED</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-3 flex items-center space-x-2 border-l border-zinc-800 h-full bg-black/80">
        <div className={cn(
          "w-1.5 h-1.5 rounded-full animate-pulse",
          isLive ? "bg-emerald-500 shadow-[0_0_8px_#10b981]" : "bg-amber-500"
        )}></div>
        <div className="flex flex-col leading-[1]">
          <span className="text-[7px] font-mono text-white uppercase tracking-tighter opacity-80">
            {isLive ? 'LIVE_TELEMETRY' : 'SIMULATION_MODE'}
          </span>
          {isLive && (
             <span className="text-[5px] text-zinc-600 font-mono">
               PROVIDERS: {detectedKeys.join('|')}
             </span>
          )}
          {!isLive && (
             <span className="text-[5px] text-zinc-600 font-mono">
               CORE_OFFLINE // KEYS_REQD
             </span>
          )}
        </div>
      </div>
    </header>
  );
};
