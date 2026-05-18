
import React from "react";
import { X } from "lucide-react";

interface NewsModalProps {
  story: any;
  onClose: () => void;
}

export const NewsModal = ({ story, onClose }: NewsModalProps) => {
  if (!story) return null;
  
  return (
    <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-black border border-emerald-900 w-full max-w-2xl shadow-[0_0_30px_rgba(0,100,0,0.3)]">
        <div className="flex justify-between items-center p-4 border-b border-zinc-800">
          <div className="text-[10px] font-mono text-emerald-500 uppercase tracking-widest">Neural_Uplink // Detail_View</div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">
            <X size={16} />
          </button>
        </div>
        <div className="p-6">
          <h2 className="text-xl text-white font-mono font-bold mb-4">
            {story.intelligence?.translatedTitle || story.title}
          </h2>
          {story.urlToImage && (
            <img 
              src={story.urlToImage} 
              alt={story.title}
              className="w-full h-auto mb-4 border border-zinc-800"
            />
          )}
          {story.intelligence?.intelligenceSummary && (
            <div className="mb-4 p-3 bg-emerald-950/20 border-l-2 border-emerald-500">
               <div className="text-[10px] font-mono text-emerald-500 uppercase tracking-widest mb-1">AI_STRATEGIC_BRIEFING:</div>
               <p className="text-zinc-300 font-mono text-[11px] leading-relaxed italic">
                 {story.intelligence.intelligenceSummary}
               </p>
            </div>
          )}
          <p className="text-zinc-300 font-mono text-sm leading-relaxed mb-4">
            {story.content || story.description || "No content available."}
          </p>
          <a                
            href={story.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-500 hover:text-emerald-400 text-xs font-mono underline"
          >
            Read_Full_Source...
          </a>
        </div>
      </div>
    </div>
  );
};
