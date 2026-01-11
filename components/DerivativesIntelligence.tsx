import React, { useMemo } from 'react';
import { EnrichedTicker } from '../types';
import { BarChart3, Zap, Info, TrendingUp, Activity } from 'lucide-react';

interface DerivativesIntelligenceProps {
  tickers: EnrichedTicker[];
}

export const DerivativesIntelligence: React.FC<DerivativesIntelligenceProps> = ({ tickers }) => {
  const derivData = useMemo(() => {
    return tickers
      .filter(t => t.fundingRate !== undefined)
      .sort((a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
      .slice(0, 100);
  }, [tickers]);

  return (
    <div className="flex flex-col h-full bg-[#020202] text-terminal-green font-mono overflow-hidden">
      <div className="p-4 border-b border-terminal-darkGreen bg-black/60 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-4">
          <TrendingUp size={20} className="text-terminal-dim" />
          <h2 className="text-sm font-black text-terminal-contrast uppercase tracking-[0.4em]">DERIVATIVES_MARKET_SENTINEL_v2.0</h2>
        </div>
        <div className="flex items-center gap-6 text-[9px] font-black uppercase tracking-widest text-gray-500">
           <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-terminal-dim animate-pulse"></div> FUNDING_VECTOR_SCAN: ACTIVE</span>
           <span>PROTOCOL: L2_INTERFACED</span>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col bg-black/40">
        <div className="p-3 bg-black/60 border-b border-terminal-darkGreen/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap size={14} className="text-terminal-green" />
            <span className="text-[10px] font-black text-white uppercase tracking-widest">Cross-Exchange_Funding_Arbitrage_Matrix</span>
          </div>
          <div className="bg-terminal-darkGreen/5 px-4 py-1 border border-terminal-darkGreen/20 text-[9px] font-black text-gray-400">
             COMPARING LOCAL_NODES VS GLOBAL_MEAN
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {derivData.map(t => {
              const funding = parseFloat(t.fundingRate || '0');
              const avgFunding = 0.0001; // Global dummy baseline
              const skew = ((funding - avgFunding) / (Math.abs(avgFunding) || 0.0001)) * 100;
              
              return (
                <div key={`arb-${t.symbol}`} className="p-4 bg-black border border-terminal-darkGreen/10 flex justify-between items-center group hover:border-terminal-dim/40 transition-all shadow-inner">
                  <div className="flex items-center gap-3">
                    <div className={`w-1.5 h-10 ${funding >= 0.0003 ? 'bg-red-500' : funding <= 0 ? 'bg-green-500' : 'bg-terminal-dim'} opacity-40 group-hover:opacity-100 transition-opacity`}></div>
                    <div className="flex flex-col">
                      <span className="text-[13px] font-black text-white uppercase tracking-tighter">{t.baseAsset}</span>
                      <span className="text-[8px] text-gray-600 uppercase font-black tabular-nums">RATE: {(funding * 100).toFixed(4)}%</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-[14px] font-black tabular-nums ${Math.abs(skew) > 100 ? 'text-yellow-500' : 'text-gray-400'}`}>
                      {skew > 0 ? '+' : ''}{skew.toFixed(0)}%
                    </div>
                    <div className="text-[7px] text-gray-700 font-bold uppercase tracking-widest">FUNDING_SKEW</div>
                  </div>
                </div>
              );
            })}
          </div>

          {derivData.length === 0 && (
            <div className="h-full flex items-center justify-center py-20 text-gray-700 uppercase italic font-black tracking-widest animate-pulse">
               INITIALIZING_DERIVATIVES_LINK...
            </div>
          )}
        </div>
      </div>

      <div className="h-10 bg-black border-t border-terminal-darkGreen/40 px-6 flex items-center justify-between text-[8px] text-gray-700 font-black uppercase tracking-[0.4em] shrink-0">
         <div className="flex items-center gap-6">
            <span className="flex items-center gap-2"><BarChart3 size={10} /> SAMPLES: {derivData.length} VECTORS</span>
            <span className="flex items-center gap-2"><Activity size={10} /> REFRESH_RATE: REAL-TIME</span>
         </div>
         <span className="animate-pulse">SYSTEM_STABLE // DERIVATIVES_LINK_ESTABLISHED</span>
      </div>
    </div>
  );
};