import React, { useState } from "react";
import { Search, Compass, RefreshCcw, Layers } from "lucide-react";
import { COMPANIES, Company } from "../data/companies";
import { cn } from "../lib/utils";

interface SearchSidebarProps {
  onSelect: (company: Company) => void;
  selectedSymbol?: string;
  isAutopilot: boolean;
  toggleAutopilot: () => void;
}

export const SearchSidebar: React.FC<SearchSidebarProps> = ({ 
  onSelect, 
  selectedSymbol, 
  isAutopilot, 
  toggleAutopilot 
}) => {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<"STOCKS" | "ETFS">("STOCKS");

  const filtered = COMPANIES.filter(c => 
    c.symbol.toLowerCase().includes(query.toLowerCase()) || 
    c.name.toLowerCase().includes(query.toLowerCase())
  ).sort((a, b) => {
    // Exact symbol matches first
    const aSym = a.symbol.toLowerCase() === query.toLowerCase();
    const bSym = b.symbol.toLowerCase() === query.toLowerCase();
    if (aSym && !bSym) return -1;
    if (!aSym && bSym) return 1;
    return 0;
  });

  const finalFiltered = filtered.filter(c => {
    if (activeCategory === "ETFS") {
      return c.sector === "ETF";
    } else {
      return c.sector !== "ETF";
    }
  });

  const stockCount = filtered.filter(c => c.sector !== "ETF").length;
  const etfCount = filtered.filter(c => c.sector === "ETF").length;

  return (
    <aside className="w-44 h-full border-r border-zinc-800 flex flex-col bg-zinc-950 z-20 shrink-0 select-none">
      <div className="p-1 px-2 border-b border-zinc-800 bg-black">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="SEARCH_SYMBOLS_"
          className="w-full bg-black border border-zinc-700 px-2 py-0.5 text-[9px] font-mono outline-none focus:border-white text-white"
        />
      </div>

      {/* Tabs Row over the ticker list and under the searchbar */}
      <div className="grid grid-cols-2 border-b border-zinc-800 h-7 bg-black text-[8px] font-mono font-bold tracking-widest shrink-0">
        <button
          onClick={() => setActiveCategory("STOCKS")}
          className={cn(
            "flex items-center justify-center gap-1 border-r border-zinc-800 cursor-pointer transition-colors uppercase",
            activeCategory === "STOCKS" 
              ? "bg-zinc-900 text-white" 
              : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-950"
          )}
        >
          STOCKS
          <span className={cn(
            "text-[7px] font-mono px-1 rounded-sm",
            activeCategory === "STOCKS" ? "bg-zinc-800 text-zinc-400" : "bg-zinc-950 text-zinc-650"
          )}>
            {stockCount}
          </span>
        </button>
        <button
          onClick={() => setActiveCategory("ETFS")}
          className={cn(
            "flex items-center justify-center gap-1 cursor-pointer transition-colors uppercase",
            activeCategory === "ETFS" 
              ? "bg-zinc-900 text-white" 
              : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-950"
          )}
        >
          ETFS
          <span className={cn(
            "text-[7px] font-mono px-1 rounded-sm",
            activeCategory === "ETFS" ? "bg-zinc-800 text-emerald-400" : "bg-zinc-950 text-zinc-650"
          )}>
            {etfCount}
          </span>
        </button>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-2 py-1 bg-zinc-900/50 border-b border-zinc-800 text-[8px] font-mono text-white font-bold tracking-widest uppercase flex justify-between items-center shrink-0">
          <span>{activeCategory === "STOCKS" ? "Global_Registry" : "Indexed_Products"}</span>
          <span className="text-[7px] text-zinc-600">NODES</span>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-zinc-900 font-mono text-[9px]">
          {finalFiltered.length > 0 ? (
            finalFiltered.map((company) => (
              <div
                key={company.symbol}
                onClick={() => onSelect(company)}
                className={cn(
                  "px-2 py-1.5 hover:bg-zinc-900 cursor-pointer flex justify-between group transition-colors",
                  selectedSymbol === company.symbol ? "bg-zinc-800 text-white border-l-2 border-white" : "text-zinc-500"
                )}
              >
                <span className={cn(selectedSymbol === company.symbol ? "text-white font-bold" : "group-hover:text-white")}>
                  {company.symbol}
                </span>
                <span className="text-zinc-700 uppercase text-[8px] translate-y-0.5">
                  {company.sector === "ETF" ? "ETF" : company.sector.split(' ')[0]}
                </span>
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-[8px] text-zinc-600 italic uppercase">
              No matching {activeCategory.toLowerCase()} found
            </div>
          )}
        </div>
      </div>

    </aside>
  );
};
