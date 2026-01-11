import React, { useState, useEffect, useMemo, useRef } from 'react';
import { EnrichedTicker } from '../types';
import { LayoutGrid, Info, Cpu } from 'lucide-react';

interface MarketHeatmapProps {
  tickers: EnrichedTicker[];
  onAssetClick: (ticker: EnrichedTicker) => void;
}

export const MarketHeatmap: React.FC<MarketHeatmapProps> = ({ tickers, onAssetClick }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [cols, setCols] = useState(10);

  // Dynamic column detection based on tailwind breakpoints
  useEffect(() => {
    const updateLayout = () => {
      const width = window.innerWidth;
      if (width < 640) setCols(2);
      else if (width < 768) setCols(4);
      else if (width < 1024) setCols(6);
      else if (width < 1280) setCols(8);
      else setCols(10);

      if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight);
      }
    };

    updateLayout();
    window.addEventListener('resize', updateLayout);
    return () => window.removeEventListener('resize', updateLayout);
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  // Virtualization constants
  const itemHeight = 90; // Height + Gap
  const gap = 8;
  const rowHeight = itemHeight + gap;

  const { visibleItems, totalHeight, offsetY } = useMemo(() => {
    const rowCount = Math.ceil(tickers.length / cols);
    const totalHeight = rowCount * rowHeight;
    
    // Calculate visible range
    const startRow = Math.max(0, Math.floor(scrollTop / rowHeight));
    const endRow = Math.min(rowCount, Math.ceil((scrollTop + containerHeight) / rowHeight) + 1);
    
    const startIndex = startRow * cols;
    const endIndex = Math.min(tickers.length, endRow * cols);
    
    return {
      visibleItems: tickers.slice(startIndex, endIndex),
      totalHeight,
      offsetY: startRow * rowHeight,
      startIndex
    };
  }, [tickers, scrollTop, containerHeight, cols, rowHeight]);

  const getCellStyles = (change: number) => {
    const isPositive = change >= 0;
    const isSignificant = Math.abs(change) >= 3;

    if (isPositive) {
      if (isSignificant) {
        return "bg-terminal-green text-black border-terminal-green shadow-[0_0_15px_rgba(74,222,128,0.3)]";
      }
      return "bg-black text-terminal-green border-terminal-darkGreen hover:border-terminal-green";
    } else {
      if (isSignificant) {
        return "bg-[#991b1b] text-white border-[#ef4444] shadow-[0_0_15px_rgba(239,68,68,0.3)]";
      }
      return "bg-black text-red-500 border-red-900/50 hover:border-red-500";
    }
  };

  return (
    <div className="flex flex-col h-full bg-black border border-terminal-darkGreen font-mono select-none overflow-hidden">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-center p-4 border-b border-terminal-darkGreen bg-black/50 gap-4 z-20">
        <div className="flex items-center gap-3">
          <LayoutGrid size={18} className="text-terminal-green" />
          <h2 className="text-sm font-black text-terminal-green tracking-[0.2em] uppercase">
            [MARKET_HEATMAP_VIRTUAL_GRID]
          </h2>
        </div>
        
        <div className="flex items-center gap-6 text-[10px] font-black uppercase tracking-wider">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-terminal-green border border-white/20"></div>
            <span className="text-gray-400">GAIN &gt; 3%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-[#991b1b] border border-white/20"></div>
            <span className="text-gray-400">LOSS &gt; 3%</span>
          </div>
          <div className="flex items-center gap-2 text-terminal-dim animate-pulse">
            <Info size={12} />
            <span>[SCROLL_ENABLED_WINDOWING]</span>
          </div>
        </div>
      </div>

      {/* Virtualized Grid Section */}
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto custom-scrollbar relative bg-[#020202]"
      >
        {/* Total height placeholder to enable scrolling */}
        <div style={{ height: `${totalHeight}px`, width: '100%' }} />

        {/* Visible window */}
        <div 
          className="absolute top-0 left-0 w-full p-4 grid gap-2"
          style={{ 
            transform: `translate3d(0, ${offsetY}px, 0)`,
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`
          }}
        >
          {visibleItems.map((ticker) => {
            const change = parseFloat(ticker.priceChangePercent);
            const styleClass = getCellStyles(change);
            
            return (
              <button
                key={ticker.symbol}
                onClick={() => onAssetClick(ticker)}
                className={`flex flex-col items-center justify-center p-4 border transition-all duration-150 active:scale-95 group h-[82px] ${styleClass}`}
              >
                <span className="text-[10px] font-black mb-1 truncate w-full text-center">
                  {ticker.baseAsset}
                </span>
                <span className={`text-[11px] font-bold tabular-nums ${Math.abs(change) < 3 ? 'opacity-70' : 'opacity-100'}`}>
                  {change >= 0 ? '+' : ''}{change.toFixed(1)}%
                </span>
                
                {/* Visual hover effect line */}
                <div className="w-0 group-hover:w-full h-[2px] bg-current mt-2 transition-all duration-300 opacity-30"></div>
              </button>
            );
          })}
        </div>
        
        {tickers.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-terminal-darkGreen uppercase bg-black/80 z-30">
            <div className="animate-spin border-2 border-terminal-darkGreen border-t-terminal-green rounded-full w-8 h-8"></div>
            <span className="text-xs font-black tracking-widest">Awaiting_Data_Feed...</span>
          </div>
        )}
      </div>

      {/* Footer Section */}
      <div className="p-2 border-t border-terminal-darkGreen bg-black text-[9px] uppercase tracking-widest font-black flex justify-between items-center text-gray-600 px-4">
        <div className="flex items-center gap-4">
           <span className="flex items-center gap-1.5"><Cpu size={12} className="text-terminal-green" /> VIRTUAL_ENGINE: ACTIVE</span>
           <span>COLS: {cols}</span>
        </div>
        <span>BUFFERED_NODES: {tickers.length} // RENDERED: {visibleItems.length}</span>
      </div>
    </div>
  );
};