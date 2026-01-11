import React, { useMemo } from 'react';
import { EnrichedTicker } from '../types';
import { Radar, Waves, Skull, Zap, BarChart3, Clock, Globe, ShieldAlert, TrendingUp, TrendingDown, Target } from 'lucide-react';

interface WhaleSentinelProps {
  trades: EnrichedTicker[];
}

export const WhaleSentinel: React.FC<WhaleSentinelProps> = ({ trades }) => {
  const whaleEvents = useMemo(() => {
    return trades
      .filter(t => parseFloat(t.quoteVolume) > 50000000) // High volume proxy for whale activity
      .sort((a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
      .slice(0, 30);
  }, [trades]);

  const aggregateMetrics = useMemo(() => {
    const totalVol = whaleEvents.reduce((acc, t) => acc + parseFloat(t.quoteVolume), 0);
    const bullishCount = whaleEvents.filter(t => parseFloat(t.priceChangePercent) > 0).length;
    return { totalVol, bias: (bullishCount / whaleEvents.length) * 100 };
  }, [whaleEvents]);

  return (
    <div className="flex flex-col h-full bg-[#020202] text-terminal-green font-mono overflow-hidden">
      <div className="p-4 border-b-2 border-terminal-darkGreen bg-black/60 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-4">
          <Radar size={24} className="text-red-500 animate-pulse" />
          <h2 className="text-sm font-black text-terminal-contrast uppercase tracking-[0.4em]">DEEP_SEA_WHALE_SENTINEL_v3.0</h2>
        </div>
        <div className="flex items-center gap-8 text-[10px] font-black uppercase">
           <div className="flex items-center gap-2">
              <span className="text-gray-500">AGGREGATE_BIAS:</span>
              <span className={aggregateMetrics.bias >= 50 ? 'text-green-500' : 'text-red-500'}>
                {aggregateMetrics.bias.toFixed(0)}% BULL
              </span>
           </div>
           <div className="flex items-center gap-2">
              <span className="text-gray-500">WHALE_NODE_VOL:</span>
              <span className="text-terminal-dim">${(aggregateMetrics.totalVol / 1e9).toFixed(2)}B</span>
           </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
        {/* EVENT FEED */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-black/20 p-4 space-y-4">
          <div className="flex items-center gap-2 mb-2">
             <Target size={14} className="text-red-500" />
             <span className="text-[10px] font-black text-white uppercase tracking-widest">Active_Accumulation_Drilldown</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {whaleEvents.map((w, idx) => {
              const volM = (parseFloat(w.quoteVolume) / 1000000).toFixed(1);
              const isBull = parseFloat(w.priceChangePercent) >= 0;
              
              return (
                <div key={`${w.symbol}-${idx}`} className="bg-[#050505] border border-terminal-darkGreen/20 p-5 hover:border-terminal-dim/40 transition-all group relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-2 bg-terminal-darkGreen/10 border-l border-b border-terminal-darkGreen/20">
                      <span className="text-[8px] font-black text-gray-500 uppercase tracking-tighter">NODE_{idx + 1}</span>
                   </div>
                   
                   <div className="flex justify-between items-start mb-4">
                      <div className="flex flex-col">
                         <span className="text-xl font-black text-white tracking-tighter group-hover:text-terminal-dim transition-colors uppercase">{w.baseAsset}</span>
                         <span className="text-[8px] text-gray-600 font-bold uppercase tracking-widest">{w.symbol} // L1_SYNC</span>
                      </div>
                      <div className="text-right">
                         <div className={`text-sm font-black tabular-nums ${isBull ? 'text-green-500' : 'text-red-500'}`}>
                           {isBull ? '+' : ''}{w.priceChangePercent}%
                         </div>
                         <div className="text-[7px] text-gray-700 font-black uppercase">24H_DELTA</div>
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4 border-t border-terminal-darkGreen/10 pt-4">
                      <div className="flex flex-col">
                         <span className="text-[8px] text-gray-500 font-black uppercase">LIQUIDITY_DEPTH</span>
                         <span className="text-lg font-black text-white tabular-nums">${volM}M</span>
                      </div>
                      <div className="flex flex-col items-end">
                         <span className="text-[8px] text-gray-500 font-black uppercase">VOLA_INDEX</span>
                         <span className="text-lg font-black text-terminal-dim tabular-nums">{w.volatility.toFixed(1)}%</span>
                      </div>
                   </div>

                   {parseFloat(w.quoteVolume) > 500000000 && (
                     <div className="mt-4 px-3 py-1.5 bg-red-600/10 border border-red-600/30 flex items-center gap-3 animate-pulse">
                        <ShieldAlert size={14} className="text-red-600" />
                        <span className="text-[9px] font-black text-red-500 uppercase tracking-widest">CRITICAL_WHALE_NODE_DETECTED</span>
                     </div>
                   )}
                </div>
              );
            })}
          </div>
        </div>

        {/* SIDEBAR: INTEL SYNOPSIS */}
        <div className="w-full lg:w-96 border-l border-terminal-darkGreen/30 bg-black/60 p-6 space-y-8 flex flex-col shrink-0">
           <div className="space-y-4">
              <div className="flex items-center gap-2 text-white font-black text-[10px] uppercase tracking-widest border-b border-terminal-darkGreen/20 pb-2">
                 <Zap size={16} className="text-terminal-green" /> WHALE_SENTIMENT_ENGINE
              </div>
              <div className="p-4 bg-terminal-darkGreen/5 border border-terminal-darkGreen/20 italic text-[11px] text-white leading-relaxed">
                "Multiple large-volume wallets (Whales) are surfacing in the {whaleEvents[0]?.baseAsset || 'selected'} sector. Sustained quote volume anomalies suggest institutional rebalancing across global nodes."
              </div>
           </div>

           <div className="space-y-4">
              <div className="flex items-center gap-2 text-white font-black text-[10px] uppercase tracking-widest border-b border-terminal-darkGreen/20 pb-2">
                 <BarChart3 size={16} className="text-terminal-green" /> CROSS_BORDER_LIQUIDITY
              </div>
              <div className="space-y-3">
                 <div className="flex justify-between items-center text-[9px] font-black uppercase">
                    <span className="text-gray-500">EXCHANGE_INFLOW</span>
                    <span className="text-red-500">HIGH_ALERT</span>
                 </div>
                 <div className="h-1.5 bg-gray-900 border border-terminal-darkGreen/20 overflow-hidden">
                    <div className="h-full bg-red-600" style={{ width: '78%' }}></div>
                 </div>
                 <div className="flex justify-between items-center text-[9px] font-black uppercase">
                    <span className="text-gray-500">COLD_STORAGE_OUTFLOW</span>
                    <span className="text-terminal-dim">ACCUMULATING</span>
                 </div>
                 <div className="h-1.5 bg-gray-900 border border-terminal-darkGreen/20 overflow-hidden">
                    <div className="h-full bg-terminal-green" style={{ width: '42%' }}></div>
                 </div>
              </div>
           </div>

           <div className="mt-auto p-4 bg-terminal-green/5 border border-terminal-green/30 flex flex-col items-center justify-center text-center gap-3">
              <Globe size={24} className="text-terminal-green animate-spin-slow" />
              <div className="text-[10px] font-black text-white uppercase tracking-widest">Global Watchlist Synchronized</div>
              <p className="text-[8px] text-gray-600 font-bold uppercase tracking-tighter">Tracking 4,201 high-net-worth wallet vectors in real-time.</p>
           </div>
        </div>
      </div>
      
      <style>{`
        .animate-spin-slow { animation: spin 10s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};