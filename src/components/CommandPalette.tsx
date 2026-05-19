import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Command, Search, Globe, Activity, Terminal, X, Zap } from "lucide-react";
import { Company, COMPANIES } from "../data/companies";

interface CommandPaletteProps {
  onSelect: (company: Company) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ onSelect, isOpen, onClose }) => {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filtered = COMPANIES.filter(c => 
    c.symbol.toLowerCase().includes(query.toLowerCase()) || 
    c.name.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 8);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        isOpen ? onClose() : null; // This is handled by parent usually, but good for internal
      }
      if (!isOpen) return;

      if (e.key === "ArrowDown") {
        setSelectedIndex(prev => (prev + 1) % filtered.length);
      } else if (e.key === "ArrowUp") {
        setSelectedIndex(prev => (prev - 1 + filtered.length) % filtered.length);
      } else if (e.key === "Enter") {
        if (filtered[selectedIndex]) {
          onSelect(filtered[selectedIndex]);
          onClose();
        }
      } else if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filtered, selectedIndex, onSelect, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="relative w-full max-w-xl bg-zinc-950 border border-emerald-500/30 shadow-[0_0_50px_rgba(16,185,129,0.1)] overflow-hidden rounded-lg"
        >
          <div className="flex items-center gap-3 p-4 border-b border-zinc-800">
            <Terminal className="w-5 h-5 text-emerald-500" />
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              placeholder="ENTER_COMMAND_OR_NODE_ID..."
              className="flex-1 bg-transparent border-none outline-none text-emerald-500 font-mono text-sm placeholder:text-zinc-700"
            />
            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-[9px] font-mono text-zinc-500">
              <span className="text-[7px]">ESC</span>
            </div>
          </div>

          <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
            {filtered.length > 0 ? (
              <div className="p-2 space-y-1">
                {filtered.map((company, idx) => (
                  <div
                    key={company.symbol}
                    onClick={() => {
                      onSelect(company);
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`
                      flex items-center justify-between p-3 rounded cursor-pointer transition-colors
                      ${idx === selectedIndex ? "bg-emerald-500/10 border-emerald-500/20" : "hover:bg-zinc-900"}
                      border border-transparent
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`
                        w-8 h-8 rounded flex items-center justify-center font-bold text-[10px]
                        ${idx === selectedIndex ? "bg-emerald-500 text-black" : "bg-zinc-900 text-zinc-500"}
                      `}>
                        {company.symbol[0]}
                      </div>
                      <div>
                        <div className={`text-xs font-mono mb-0.5 ${idx === selectedIndex ? "text-white" : "text-zinc-300"}`}>
                          {company.name}
                        </div>
                        <div className="text-[10px] text-zinc-600 font-mono">{company.symbol} // {company.sector}</div>
                      </div>
                    </div>
                    {idx === selectedIndex && (
                      <motion.div layoutId="arrow" className="text-emerald-500">
                        <Zap className="w-3 h-3 fill-current" />
                      </motion.div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <Activity className="w-8 h-8 text-zinc-800 mx-auto mb-2 animate-pulse" />
                <div className="text-zinc-600 font-mono text-[10px]">NO_MATCHING_NODES_FOUND</div>
              </div>
            )}
          </div>

          <div className="bg-zinc-900/50 p-2 border-t border-zinc-800 flex items-center justify-between font-mono text-[8px] text-zinc-600">
            <div className="flex gap-4">
              <span className="flex items-center gap-1"><kbd className="bg-zinc-800 px-1 rounded text-zinc-400">↑↓</kbd> NAVIGATE</span>
              <span className="flex items-center gap-1"><kbd className="bg-zinc-800 px-1 rounded text-zinc-400">ENTER</kbd> EXECUTE</span>
            </div>
            <div className="flex items-center gap-1">
               <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
               SYSTEM_ACTIVE
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
