import React, { useState } from "react";
import { Terminal, Send, HelpCircle } from "lucide-react";
import { getApiBaseUrl } from "../../lib/utils";

export interface NavigationResult {
  locationName: string;
  coordinates: [number, number]; // [lat, lng]
  zoomLevel: number;
  briefing: string;
  facts?: string[];
  ticker?: string | null;
}

interface AgentNavigatorProps {
  onNavigationComplete: (result: NavigationResult) => void;
  isProcessing?: boolean;
  setIsProcessing?: (processing: boolean) => void;
}

export const AgentNavigator: React.FC<AgentNavigatorProps> = ({
  onNavigationComplete,
  isProcessing: externalIsProcessing,
  setIsProcessing: externalSetIsProcessing,
}) => {
  const [query, setQuery] = useState("");
  const [localIsProcessing, setLocalIsProcessing] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const isProcessing = externalIsProcessing !== undefined ? externalIsProcessing : localIsProcessing;
  const setIsProcessing = externalSetIsProcessing || setLocalIsProcessing;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isProcessing) return;

    setIsProcessing(true);
    setErrorText(null);

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/ai/navigate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: query.trim() }),
      });

      if (!response.ok) {
        throw new Error(`Uplink interruption: server responded with ${response.status}`);
      }

      const data = await response.json();
      if (data && data.coordinates && Array.isArray(data.coordinates)) {
        onNavigationComplete({
          locationName: data.locationName || "Analyzed Location",
          coordinates: [Number(data.coordinates[0]), Number(data.coordinates[1])],
          zoomLevel: typeof data.zoomLevel === "number" ? data.zoomLevel : 6,
          briefing: data.briefing || "Market intelligence report generated for this location.",
          facts: data.facts,
          ticker: data.ticker
        });
        setQuery(""); // Clear on successful dispatch
      } else {
        throw new Error("Invalid coordinate matrices received from routing engine.");
      }
    } catch (err: any) {
      console.error("[NAVIGATOR_ERROR]", err);
      setErrorText(err.message || "Cognitive uplink timeout");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePresetSelect = (preset: string) => {
    setQuery(preset);
  };

  return (
    <div className="w-full bg-black/90 border border-emerald-900/60 shadow-[0_4px_30px_rgba(0,0,0,0.85)] rounded-sm p-1.5 focus-within:border-emerald-500/40 transition-colors pointer-events-auto select-none">
      <form onSubmit={handleSubmit} className="flex gap-2.5 items-center w-full">
        {/* Sleek monospaced terminal segment prefix */}
        <div className="flex items-center gap-2 px-2.5 py-1 text-[9px] font-sans text-emerald-500/60 font-black tracking-wider border-r border-emerald-950 select-none shrink-0">
          <Terminal className="w-3 h-3 text-emerald-500" />
          <span className="hidden sm:inline">Search Market Node:</span>
          <span className="sm:hidden">Search:</span>
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={isProcessing}
          placeholder={isProcessing ? "Analyzing request..." : "Ask about a company, resource, or trade route..."}
          className="bg-transparent text-emerald-400 placeholder-emerald-900/70 font-sans text-xs w-full focus:outline-none focus:ring-0 selection:bg-emerald-950 font-bold tracking-wide uppercase disabled:opacity-50 py-1"
        />

        {query.trim() && (
          <button
            type="submit"
            disabled={isProcessing}
            className="text-black bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-600 p-1.5 rounded-sm transition-all focus:outline-none focus:ring-0 shrink-0 cursor-pointer shadow-[0_0_10px_rgba(16,185,129,0.3)]"
            title="Search Market"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        )}
      </form>

      {/* Preset Suggestions Area */}
      <div className="flex flex-wrap gap-x-2.5 gap-y-1 mt-1.5 px-2 border-t border-zinc-950 pt-1 text-[8px] font-sans text-zinc-500 items-center">
        <span className="flex items-center gap-0.5 text-zinc-700 select-none"><HelpCircle className="w-2.5 h-2.5" /> SUGGESTED:</span>
        <button
          onClick={() => handlePresetSelect("Taiwan Semiconductor Bottlenecks")}
          disabled={isProcessing}
          className="hover:text-emerald-500 transition-colors cursor-pointer mr-0.5"
        >
          [Taiwan Foundries]
        </button>
        <span className="text-zinc-800 select-none">•</span>
        <button
          onClick={() => handlePresetSelect("Suez Canal Maritime Chokepoint")}
          disabled={isProcessing}
          className="hover:text-emerald-500 transition-colors cursor-pointer mr-0.5"
        >
          [Suez Canal]
        </button>
        <span className="text-zinc-800 select-none">•</span>
        <button
          onClick={() => handlePresetSelect("ASML EUV Lithography Production")}
          disabled={isProcessing}
          className="hover:text-emerald-500 transition-colors cursor-pointer mr-0.5"
        >
          [ASML EUV]
        </button>
        <span className="text-zinc-800 select-none">•</span>
        <button
          onClick={() => handlePresetSelect("Ningde CATL Battery Megafactory")}
          disabled={isProcessing}
          className="hover:text-emerald-500 transition-colors cursor-pointer mr-0.5"
        >
          [Ningde Batteries]
        </button>
      </div>

      {errorText && (
        <div className="mx-2 mt-1 px-2 py-0.5 bg-red-950/20 border border-red-900/30 text-red-500 font-sans text-[8.5px] uppercase rounded-sm">
          ERROR: {errorText}
        </div>
      )}
    </div>
  );
};
