
import React, { useEffect, useState } from 'react';
import { 
  Flame, Zap, Coins, Droplets, Leaf, Activity, RefreshCw, TrendingUp, TrendingDown, Clock, Search, Globe
} from 'lucide-react';
import { fetchStockQuote, LiveStockData, COMMODITY_TICKERS, CURRENCY_SYMBOLS } from '../services/stockService';
import { StockChartModal } from './StockChartModal';

type Category = 'ENERGY' | 'METALS' | 'OIL' | 'CROPS';

const CATEGORY_META: Record<Category, { icon: React.ReactNode, label: string, color: string }> = {
  ENERGY: { icon: <Zap size={16} />, label: 'ENERGY_SECTOR', color: 'text-blue-400' },
  METALS: { icon: <Coins size={16} />, label: 'PRECIOUS_METALS', color: 'text-yellow-500' },
  OIL: { icon: <Droplets size={16} />, label: 'CRUDE_RESOURCES', color: 'text-terminal-dim' },
  CROPS: { icon: <Leaf size={16} />, label: 'AGRICULTURE_CASH_CROPS', color: 'text-green-500' }
};

export const CommoditiesHub: React.FC = () => {
  const [data, setData] = useState<Record<string, LiveStockData | null>>({});
  const [loading, setLoading] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState<LiveStockData | null>(null);

  const refreshData = async () => {
    setLoading(true);
    const allTickers = Object.values(COMMODITY_TICKERS).flat();
    const results: Record<string, LiveStockData | null> = {};
    
    // Batch fetch with small delay to avoid rate limiting
    for (const t of allTickers) {
      try {
        const quote = await fetchStockQuote(t.symbol);
        results[t.symbol] = quote;
        await new Promise(r => setTimeout(r, 300));
      } catch (e) {
        results[t.symbol] = null;
      }
    }
    
    setData(results);
    setLoading(false);
  };

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 300000); // 5 mins
    return () => clearInterval(interval);
  }, []);

  const renderCategory = (cat: Category) => {
    const tickers = COMMODITY_TICKERS[cat];
    const meta = CATEGORY_META[cat];

    return (
      <div className="bg-[#050505] border border-terminal-darkGreen/40 flex flex-col h-full shadow-lg">
        <div className="bg-black/80 p-3 border-b border-terminal-darkGreen/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={meta.color}>{meta.icon}</span>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">{meta.label}</span>
          </div>
          <div className="text-[8px] text-gray-600 font-bold uppercase">SEC: {cat.toLowerCase()}</div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead className="bg-[#0a0a0a] text-[8px] text-gray-600 font-black uppercase border-b border-terminal-darkGreen/10 sticky top-0 z-10">
              <tr>
                <th className="p-3 pl-4">COMMODITY</th>
                <th className="p-3">PRICE</th>
                <th className="p-3 text-right pr-4">24H_CHG</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-terminal-darkGreen/10">
              {tickers.map((t) => {
                const item = data[t.symbol];
                if (!item) return (
                  <tr key={t.symbol}>
                    <td className="p-3 pl-4 text-[10px] text-gray-700 font-bold">{t.name}</td>
                    <td colSpan={2} className="p-3 text-right text-[10px] text-gray-800 italic uppercase">Syncing...</td>
                  </tr>
                );

                const isPos = item.changePercent >= 0;
                return (
                  <tr 
                    key={t.symbol} 
                    className="hover:bg-terminal-green/5 cursor-pointer group transition-all"
                    onClick={() => setSelectedAsset(item)}
                  >
                    <td className="p-3 pl-4">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-white group-hover:text-terminal-green">{t.name}</span>
                        <span className="text-[8px] text-gray-600 font-bold uppercase">{item.symbol}</span>
                      </div>
                    </td>
                    <td className="p-3 font-mono text-xs font-bold text-terminal-dim">
                      {CURRENCY_SYMBOLS[item.currency] || '$'}{item.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className={`p-3 text-right pr-4 font-black tabular-nums text-xs ${isPos ? 'text-green-500' : 'text-red-500'}`}>
                      {isPos ? '+' : ''}{item.changePercent.toFixed(2)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#020202] font-mono text-terminal-green animate-in fade-in duration-300">
      {selectedAsset && (
        <StockChartModal 
          symbol={selectedAsset.symbol}
          name={Object.values(COMMODITY_TICKERS).flat().find(t => t.symbol === selectedAsset.symbol)?.name}
          currentPrice={selectedAsset.price}
          currency={selectedAsset.currency}
          changePercent={selectedAsset.changePercent}
          onClose={() => setSelectedAsset(null)}
        />
      )}

      {/* HUB HEADER */}
      <div className="p-6 border-b border-terminal-darkGreen/50 bg-black/95 flex flex-col md:flex-row justify-between items-center gap-6 shrink-0 relative z-10">
        <div className="flex items-center gap-4">
          <div className="p-3 border-2 border-terminal-green shadow-[0_0_20px_rgba(74,222,128,0.2)] bg-terminal-darkGreen/10">
            <Flame size={28} className="text-terminal-green animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-[0.2em] flex items-center gap-3">
              COMMODITY_SENTINEL_v1.0
              <span className="bg-terminal-green text-black px-2 py-0.5 text-[8px] font-black tracking-widest">LIVE_FEED_ACTIVE</span>
            </h2>
            <div className="flex items-center gap-3 mt-1.5">
               <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Global_Futures_Network</span>
               <div className="w-1 h-1 rounded-full bg-terminal-darkGreen"></div>
               <span className="text-[9px] text-terminal-dim font-black uppercase">Buffer_Nodes: 16</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
           <div className="flex flex-col items-end">
              <span className="text-[8px] text-gray-600 font-black uppercase mb-1">NETWORK_LATENCY</span>
              <div className="flex items-center gap-2">
                 <Activity size={12} className="text-terminal-green" />
                 <span className="text-sm font-black text-white tabular-nums">12MS_EST</span>
              </div>
           </div>
           <button 
             onClick={refreshData}
             className="p-3 border border-terminal-darkGreen hover:border-terminal-green hover:bg-terminal-green hover:text-black transition-all text-terminal-green"
           >
             <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
           </button>
        </div>
      </div>

      {/* TOP TICKER TAPE */}
      <div className="h-14 border-b border-terminal-darkGreen/20 flex overflow-x-auto no-scrollbar bg-black/40 divide-x divide-terminal-darkGreen/10">
        {['GC=F', 'CL=F', 'NG=F', 'SI=F'].map(sym => {
          const item = data[sym];
          const meta = Object.values(COMMODITY_TICKERS).flat().find(t => t.symbol === sym);
          return (
            <div key={sym} className="px-8 flex flex-col justify-center min-w-[180px] shrink-0 hover:bg-white/5 transition-all cursor-pointer" onClick={() => item && setSelectedAsset(item)}>
              <span className="text-[8px] text-gray-600 font-black uppercase">{meta?.name || sym}</span>
              <div className="flex justify-between items-baseline gap-4">
                 <span className="text-sm font-black text-white tabular-nums">
                   {item ? `${CURRENCY_SYMBOLS[item.currency] || '$'}${item.price.toLocaleString()}` : '---'}
                 </span>
                 {item && (
                   <span className={`text-[9px] font-black ${item.changePercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                     {item.changePercent >= 0 ? '+' : ''}{item.changePercent.toFixed(1)}%
                   </span>
                 )}
              </div>
            </div>
          );
        })}
      </div>

      {/* MAIN GRID */}
      <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 h-fit">
          {renderCategory('ENERGY')}
          {renderCategory('METALS')}
          {renderCategory('OIL')}
          {renderCategory('CROPS')}
        </div>
        
        {/* BOTTOM INTEL PANEL */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="bg-[#050505] border border-terminal-darkGreen/30 p-5 space-y-4">
              <div className="flex items-center gap-2 text-[10px] text-white font-black uppercase tracking-widest border-b border-terminal-darkGreen/20 pb-2">
                 <Clock size={14} className="text-terminal-green" /> SESSION_INTELLIGENCE
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="bg-black p-3 border border-terminal-darkGreen/10">
                    <span className="text-[8px] text-gray-600 font-bold uppercase">MARKET_STATUS</span>
                    <div className="text-[11px] font-black text-terminal-green">GLOBAL_OPEN</div>
                 </div>
                 <div className="bg-black p-3 border border-terminal-darkGreen/10">
                    <span className="text-[8px] text-gray-600 font-bold uppercase">DATA_PRECISION</span>
                    <div className="text-[11px] font-black text-white">HIGH_RES_v2</div>
                 </div>
              </div>
           </div>

           <div className="bg-[#050505] border border-terminal-darkGreen/30 p-5 space-y-4">
              <div className="flex items-center gap-2 text-[10px] text-white font-black uppercase tracking-widest border-b border-terminal-darkGreen/20 pb-2">
                 <TrendingUp size={14} className="text-terminal-green" /> AGGREGATE_PULSE
              </div>
              <div className="flex items-center gap-4">
                 <div className="flex-1 h-3 bg-gray-900 border border-terminal-darkGreen/20 overflow-hidden">
                    <div className="h-full bg-terminal-green shadow-[0_0_10px_rgba(74,222,128,0.5)]" style={{ width: '58%' }}></div>
                 </div>
                 <span className="text-[11px] font-black text-terminal-green uppercase">58%_BULL</span>
              </div>
              <p className="text-[9px] text-gray-600 leading-relaxed font-medium">
                Sustained momentum in Precious Metals is offsetting volatility in the Energy sector. Infrastructure nodes reporting stable flow across all major delivery hubs.
              </p>
           </div>

           <div className="bg-terminal-green/5 border border-terminal-green/30 p-5 flex flex-col justify-center items-center text-center group">
              <div className="w-12 h-12 border-2 border-terminal-green rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                 <Activity size={24} className="text-terminal-green" />
              </div>
              <h4 className="text-[11px] font-black text-white uppercase tracking-widest mb-1">ANALYTICS_CONDUIT</h4>
              <p className="text-[9px] text-gray-600 uppercase font-black tracking-tighter">System_Sentinel Monitoring Global Commodities Flow</p>
           </div>
        </div>
      </div>
      
      {/* HUD FOOTER */}
      <div className="h-10 bg-black border-t border-terminal-darkGreen/40 px-6 flex items-center justify-between text-[8px] text-gray-700 font-black uppercase tracking-[0.4em] shrink-0">
         <div className="flex items-center gap-8">
            <span className="flex items-center gap-2"><RefreshCw size={10} /> SYNC_RATE: 300S</span>
            <span className="flex items-center gap-2"><Globe size={10} /> DATA_SOURCE: YAHOO_FINANCE_v8</span>
         </div>
         <span className="animate-pulse">KERNEL_STABLE :: READY_FOR_COMMAND</span>
      </div>
    </div>
  );
};
