import React, { useEffect, useState, useMemo, useRef } from "react";
import { Company, COMPANIES } from "../data/companies";
import { cn } from "../lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

interface TickerTapeProps {
  onSelectStock?: (company: Company) => void;
}

export const TickerTape: React.FC<TickerTapeProps> = ({ onSelectStock }) => {
  const [prices, setPrices] = useState<Record<string, { price: number; change: number }>>({});
  const contentRef = useRef<HTMLDivElement>(null);
  const [duration, setDuration] = useState(240);

  const tickerItems = useMemo(() => {
    // Pick a diverse set of companies for the ticker
    return COMPANIES.slice(0, 15).map(c => ({
      symbol: c.symbol,
      name: c.name,
    }));
  }, []);

  useEffect(() => {
    if (contentRef.current) {
      // The physical width of one cycle is half the scroll width
      const w = contentRef.current.scrollWidth / 2;
      // We set a constant speed of 40 pixels per second
      setDuration(w / 40);
    }
  }, [tickerItems, prices]);

  useEffect(() => {
    const fetchRealPrices = async () => {
      try {
        const symbolsStr = tickerItems.map(item => item.symbol).join(",");
        const response = await fetch(`/api/quote?symbols=${symbolsStr}`);
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Server returned ${response.status}: ${errorText.substring(0, 50)}`);
        }

        const dataList = await response.json();
        const updatedPrices: Record<string, { price: number; change: number }> = {};
        
        if (Array.isArray(dataList)) {
          dataList.forEach((item: any) => {
            if (item && item.symbol) {
              updatedPrices[item.symbol] = {
                price: item.price || 100,
                change: item.changesPercentage || item.changes || item.change || 0
              };
            }
          });
          setPrices(updatedPrices);
        }
      } catch (err: any) {
        console.warn("TickerTape: Telemetry stream interrupted. Retrying in cycle.", err.message);
      }
    };

    // Initial real fetch
    fetchRealPrices();

    // Regular interval fetch to keep it fresh
    const interval = setInterval(fetchRealPrices, 15000);

    return () => clearInterval(interval);
  }, [tickerItems]);

  return (
    <div className="h-7 border-t border-zinc-900 bg-black flex items-center overflow-hidden w-full select-none">
      <div className="flex items-center gap-1 px-3 border-r border-zinc-900 h-full shrink-0 bg-zinc-950 z-10">
        <span className="text-[7.5px] font-black text-emerald-500 font-mono tracking-widest uppercase">INTEL_TICKER</span>
        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
      </div>
      
      <div className="flex-1 relative overflow-hidden h-full">
        <div 
          ref={contentRef}
          style={{ animationDuration: `${duration}s` }}
          className="flex items-center whitespace-nowrap animate-[marquee_240s_linear_infinite] hover:[animation-play-state:paused] h-full"
        >
          {[...tickerItems, ...tickerItems].map((item, idx) => {
            const data = prices[item.symbol];
            if (!data) return null;
            const isPositive = data.change >= 0;
            
            return (
              <button 
                key={`${item.symbol}-${idx}`} 
                onClick={() => {
                  const company = COMPANIES.find(c => c.symbol === item.symbol);
                  if (company && onSelectStock) onSelectStock(company);
                }}
                className="flex items-center gap-1.5 md:gap-2 px-4 md:px-6 border-r border-zinc-900/30 h-full group hover:bg-emerald-500/5 transition-all cursor-pointer active:scale-95"
              >
                <span className="text-[8.5px] md:text-[10px] font-black text-zinc-300 font-mono tracking-wider group-hover:text-emerald-400 transition-colors">{item.symbol}</span>
                <span className="text-[8px] md:text-[9px] font-mono text-zinc-500 tabular-nums tracking-wide">${data.price.toFixed(2)}</span>
                <div className={cn("flex items-center gap-0.5 font-mono text-[7px] md:text-[8px] font-bold tracking-wide", isPositive ? "text-emerald-500" : "text-rose-500")}>
                  {isPositive ? <TrendingUp className="w-2 h-2" /> : <TrendingDown className="w-2 h-2" />}
                  <span>{isPositive ? "+" : ""}{data.change.toFixed(2)}%</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}} />
    </div>
  );
};
