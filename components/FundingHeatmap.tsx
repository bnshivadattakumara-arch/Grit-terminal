import React from 'react';
import { FundingRateData } from '../types';
import { LayoutGrid, Zap, Info } from 'lucide-react';

interface FundingHeatmapProps {
  fundingRates: FundingRateData[];
}

export const FundingHeatmap: React.FC<FundingHeatmapProps> = ({ fundingRates }) => {
  // Sort by absolute value of funding rate to show most significant first
  const sortedRates = [...fundingRates].sort((a, b) => 
    Math.abs(parseFloat(b.lastFundingRate)) - Math.abs(parseFloat(a.lastFundingRate))
  ).slice(0, 100);

  const getCellStyles = (rate: number) => {
    const isSignificant = Math.abs(rate) >= 0.0003; // 0.03% is significant in funding

    if (rate > 0) {
      if (isSignificant) {
        return "bg-[#991b1b] text-white border-[#ef4444] shadow-[0_0_15px_rgba(239,68,68,0.2)]";
      }
      return "bg-black text-red-400 border-red-900/40 hover:border-red-500";
    } else if (rate < 0) {
      if (isSignificant) {
        return "bg-terminal-green text-black border-terminal-green shadow-[0_0_15px_rgba(74,222,128,0.2)]";
      }
      return "bg-black text-terminal-green border-terminal-darkGreen hover:border-terminal-green";
    }
    return "bg-black text-gray-600 border-terminal-darkGreen/30";
  };

  return (
    <div className="flex flex-col h-full bg-black border border-terminal-darkGreen font-mono select-none overflow-hidden">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-center p-4 border-b border-terminal-darkGreen bg-black/50 gap-4">
        <div className="flex items-center gap-3">
          <Zap size={18} className="text-terminal-green" />
          <h2 className="text-sm font-black text-terminal-green tracking-[0.2em] uppercase">
            [DERIVATIVES_FUNDING_HEATMAP]
          </h2>
        </div>
        
        <div className="flex items-center gap-6 text-[10px] font-black uppercase tracking-wider">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-[#991b1b] border border-white/20"></div>
            <span className="text-gray-400">RATE &gt; 0.03% (HOT)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-terminal-green border border-white/20"></div>
            <span className="text-gray-400">RATE &lt; -0.03% (COOL)</span>
          </div>
        </div>
      </div>

      {/* Grid Section */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-10 gap-2">
          {sortedRates.map((rate) => {
            const val = parseFloat(rate.lastFundingRate);
            const styleClass = getCellStyles(val);
            
            return (
              <div
                key={rate.symbol}
                className={`flex flex-col items-center justify-center p-4 border transition-all duration-200 group ${styleClass}`}
              >
                <span className="text-xs font-black mb-1 truncate w-full text-center">
                  {rate.symbol.replace('USDT', '')}
                </span>
                <span className={`text-[10px] font-bold`}>
                  {(val * 100).toFixed(4)}%
                </span>
              </div>
            );
          })}
        </div>
        
        {sortedRates.length === 0 && (
          <div className="h-64 flex flex-col items-center justify-center gap-4 text-terminal-darkGreen uppercase text-center">
            <div className="animate-spin border-2 border-terminal-darkGreen border-t-terminal-green rounded-full w-8 h-8 mb-2"></div>
            <span className="text-xs font-black tracking-widest">Awaiting_Funding_Feed...</span>
            <span className="text-[10px] text-gray-600">Ensure exchange supports derivatives</span>
          </div>
        )}
      </div>

      {/* Footer Section */}
      <div className="p-2 border-t border-terminal-darkGreen bg-black text-[9px] uppercase tracking-widest font-bold flex justify-between text-gray-600">
        <span>DERIVATIVES_VISUAL_LAYER_v1.0</span>
        <span>PAIRS_TRACKED: {sortedRates.length}</span>
      </div>
    </div>
  );
};
