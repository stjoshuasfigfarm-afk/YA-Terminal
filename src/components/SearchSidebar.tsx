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

  return (
    <aside className="w-56 border-r border-zinc-800 flex flex-col bg-zinc-950 z-20 shrink-0">
      <div className="p-2 border-b border-zinc-800 bg-black">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="SEARCH_SYMBOLS_"
          className="w-full bg-black border border-zinc-700 px-2.5 py-1 text-[10px] font-mono outline-none focus:border-[#22ab94] text-[#22ab94]"
        />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-3 py-1.5 bg-zinc-900/50 border-b border-zinc-800 text-[9px] font-mono text-[#22ab94] font-bold tracking-widest uppercase">
          Global_Registry
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-zinc-900 font-mono text-[10px]">
          {filtered.map((company) => (
            <div
              key={company.symbol}
              onClick={() => onSelect(company)}
              className={cn(
                "px-3 py-2 hover:bg-zinc-900 cursor-pointer flex justify-between group transition-colors",
                selectedSymbol === company.symbol ? "bg-zinc-800 text-white border-l-2 border-[#22ab94]" : "text-zinc-500"
              )}
            >
              <span className={cn(selectedSymbol === company.symbol ? "text-[#22ab94]" : "group-hover:text-white")}>
                {company.symbol}
              </span>
              <span className="text-zinc-700 uppercase text-[8px] translate-y-0.5">{company.sector.split(' ')[0]}</span>
            </div>
          ))}
        </div>
      </div>

    </aside>
  );
};
