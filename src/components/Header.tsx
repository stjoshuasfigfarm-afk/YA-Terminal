import React, { useEffect, useState } from "react";
import { Shield, Activity, Globe } from "lucide-react";
import { cn } from "../lib/utils";

interface HeaderProps {
  selectedStock?: any;
  yields?: any;
}

export const Header: React.FC<HeaderProps> = ({ selectedStock, yields }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const treasuryData = yields?.treasuries || { '2Y': 4.82, '10Y': 4.42, '30Y': 4.56 };

  return (
    <header className="h-12 border-b border-zinc-800 flex items-center bg-black shrink-0 relative overflow-hidden z-20 px-6 justify-between">
      <div className="flex items-center gap-4">
        <img src="/logo.svg" alt="Logo" className="w-8 h-8 object-contain" referrerPolicy="no-referrer" />
        <div className="h-4 w-[1px] bg-zinc-800" />
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-zinc-400 font-mono text-[9px] font-bold tracking-widest uppercase">US TREASURIES</span>
          </div>
          <div className="flex items-center gap-3">
            {Object.entries(treasuryData).map(([key, val]: [string, any]) => (
              <div key={key} className="flex items-center gap-1 bg-zinc-950 px-2 py-0.5 border border-zinc-900 rounded-sm">
                <span className="text-zinc-500 font-mono text-[8px]">{key}:</span>
                <span className="text-white font-mono text-[9px] font-bold">{val}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4 font-mono text-[9px]">
        {selectedStock && (
          <div className="hidden sm:flex items-center gap-1 bg-zinc-950 px-2 py-0.5 border border-zinc-900 rounded-sm">
            <span className="text-zinc-600">SELECTED NODE:</span>
            <span className="text-white font-bold">{selectedStock.symbol}</span>
          </div>
        )}
        <div className="text-zinc-500 bg-zinc-950 px-2 py-0.5 border border-zinc-900 rounded-sm">
          <span>{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
        </div>
      </div>
    </header>
  );
};
