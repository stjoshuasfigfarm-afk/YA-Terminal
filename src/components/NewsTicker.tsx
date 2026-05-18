import React, { useState, useEffect } from 'react';

interface NewsTickerProps {
  news: any[];
  isActive: boolean;
  onNewsItemChange: (item: any) => void;
}

export const NewsTicker: React.FC<NewsTickerProps> = ({ news, isActive, onNewsItemChange }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!isActive || news.length === 0) return;
    const interval = setInterval(() => {
      const nextIndex = (currentIndex + 1) % news.length;
      setCurrentIndex(nextIndex);
      onNewsItemChange(news[nextIndex]);
    }, 30000); // 30 seconds per headline
    return () => clearInterval(interval);
  }, [isActive, news, currentIndex, onNewsItemChange]);

  if (!isActive || news.length === 0) return null;

  const currentNews = news[currentIndex];

  return (
    <div className="absolute bottom-4 left-4 right-4 z-[1001] bg-black/80 border border-zinc-800 p-3 backdrop-blur-md shadow-2xl">
      <div className="text-[10px] font-mono uppercase tracking-widest text-emerald-500 mb-1 flex justify-between">
        <span>LIVE_NEWS_FEED_CYCLER</span>
        <span>{currentIndex + 1} / {news.length}</span>
      </div>
      <div className="text-white font-mono text-sm font-bold mb-1">{currentNews.title}</div>
      <div className="text-zinc-400 font-mono text-[11px] line-clamp-2">{currentNews.description || currentNews.summary}</div>
    </div>
  );
};
