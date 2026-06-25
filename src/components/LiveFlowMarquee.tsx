import React, { useState, useEffect, useRef } from 'react';

interface Story {
  id: string;
  title: string;
  timestamp: string;
}

export const LiveFlowMarquee = ({ incomingNews }: { incomingNews: Story[] }) => {
  // Initialize with the current batch of stories
  const [currentCycleStories, setCurrentCycleStories] = useState<Story[]>(incomingNews);
  const [pendingNewsQueue, setPendingNewsQueue] = useState<Story[]>([]);
  const contentRef = useRef<HTMLDivElement>(null);
  const [duration, setDuration] = useState(240);

  // Capture incoming network/telemetry updates without breaking the current visual loop
  useEffect(() => {
    if (incomingNews.length > 0) {
      setPendingNewsQueue(incomingNews);
      
      // FALLBACK: If the ticker is completely blank (e.g., initial boot or stale state),
      // hydrate it immediately so the DOM registers content and starts animating.
      if (currentCycleStories.length === 0) {
        setCurrentCycleStories(incomingNews);
      }
    }
  }, [incomingNews, currentCycleStories.length]);

  useEffect(() => {
    if (contentRef.current) {
      // The physical width of one cycle is roughly half the scroll width if duplicated
      const w = contentRef.current.scrollWidth / 2;
      // We set a constant speed of 40 pixels per second (same as TickerTape)
      setDuration(w / 40);
    }
  }, [currentCycleStories]);

  // Triggered ONLY when the entire DOM marquee element completes its visual scroll cycle
  const handleCycleComplete = () => {
    if (pendingNewsQueue.length > 0) {
      // The old cycle finished fully. We now load the entire new list safely.
      setCurrentCycleStories(pendingNewsQueue);
    }
  };

  return (
    <div className="w-full bg-black text-[#00ff00] border-y border-zinc-800 overflow-hidden flex h-10 relative">
      <div className="h-full flex items-center bg-black z-20 pl-4 pr-4 border-r border-zinc-800 shrink-0">
        <span className="text-emerald-500 font-bold tracking-widest text-xs">LIVE_FLOW</span>
      </div>
      
      {/* The marquee container uses 'onAnimationIteration' to detect 
        exactly when the CSS keyframes finish cycling the whole list.
      */}
      <div 
        ref={contentRef}
        style={{ animationDuration: `${duration}s` }}
        className="flex whitespace-nowrap animate-marquee-flow gap-8 items-center pl-8"
        onAnimationIteration={handleCycleComplete}
      >
        {currentCycleStories.map((story, idx) => (
          <div key={`${story.id}-${idx}`} className="flex items-center gap-2 text-xs font-mono">
            <span className="text-zinc-500 font-bold">NEWS //</span>
            <span className="text-zinc-100">{story.title}</span>
          </div>
        ))}
        {currentCycleStories.map((story, idx) => (
          <div key={`dup-${story.id}-${idx}`} className="flex items-center gap-2 text-xs font-mono">
            <span className="text-zinc-500 font-bold">NEWS //</span>
            <span className="text-zinc-100">{story.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
