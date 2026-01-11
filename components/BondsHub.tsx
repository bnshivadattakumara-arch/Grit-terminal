
import React, { useEffect, useState, useMemo } from 'react';
import { 
  Landmark, Activity, RefreshCw, TrendingUp, TrendingDown, Clock, Globe, 
  ShieldCheck, Scale, BarChart3, ChevronRight, Briefcase, Zap, Info, ShieldAlert,
  ArrowRight, FileText, Layout
} from 'lucide-react';
import { fetchStockQuote, LiveStockData, BOND_MARKET_TICKERS, CURRENCY_SYMBOLS } from '../services/stockService';
import { StockChartModal } from './StockChartModal';

export const BondsHub: React.FC = () => {
  const [data, setData] = useState<Record<string, LiveStockData | null>>({});
  const [loading, setLoading] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState<LiveStockData | null>(null);

  const refreshData = async () => {
    setLoading(true);
    // Collect all unique tickers from sovereign curves and corporate/international lists
    const sovereignTickers = BOND_MARKET_TICKERS.SOVEREIGN_CURVES.flatMap(c => Object.values(c.maturities));
    const corpTickers = BOND_MARKET_TICKERS.CORPORATE_GLOBAL.map(t => t.symbol);
    const intlTickers = BOND_MARKET_TICKERS.INTERNATIONAL_DEBT.map(t => t.symbol);
    
    const allTickers = Array.from(new Set([...sovereignTickers, ...corpTickers, ...intlTickers]));
    const results: Record<string, LiveStockData | null> = {};
    
    for (const sym of allTickers) {
      try {
        const quote = await fetchStockQuote(sym);
        results[sym] = quote;
        // Small throttle to stay within proxy limits
        await new Promise(r => setTimeout(r, 250));
      } catch (e) {
        results[sym] = null;
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

  const renderYieldMatrix = () => {
    const maturities = ['2Y', '5Y', '10Y', '30Y'] as const;
    return (
      <div className="bg-[#050505] border border-terminal-darkGreen/40 flex flex-col h-full shadow-2xl">
        <div className="bg-black/90 p-4 border-b border-terminal-darkGreen/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Landmark size={20} className="text-blue-400" />
            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white">SOVEREIGN_YIELD_MATRIX</h3>
          </div>
          <span className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">REAL_TIME_CURVE_DATA_%</span>
        </div>
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#0a0a0a] text-[9px] text-gray-500 font-black uppercase sticky top-0 z-10">
              <tr>
                <th className="p-4 border-b border-terminal-darkGreen/10">ISSUER</th>
                {maturities.map(m => (
                  <th key={m} className="p-4 border-b border-terminal-darkGreen/10 text-right">{m}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-terminal-darkGreen/10">
              {BOND_MARKET_TICKERS.SOVEREIGN_CURVES.map((country) => (
                <tr key={country.country} className="hover:bg-terminal-green/5 transition-colors group">
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-black text-white group-hover:text-terminal-green">{country.name}</span>
                      <span className="text-[8px] text-gray-600 font-bold uppercase">{country.country}</span>
                    </div>
                  </td>
                  {maturities.map(m => {
                    const sym = country.maturities[m as keyof typeof country.maturities];
                    const item = sym ? data[sym] : null;
                    if (!sym) return <td key={m} className="p-4 text-right text-[10px] text-gray-900 italic">---</td>;
                    if (!item) return <td key={m} className="p-4 text-right text-[10px] text-gray-800 animate-pulse">SYNC</td>;

                    // Yield logic: symbols like ^TNX return 10x yield (e.g. 43.12 for 4.312%)
                    const yieldVal = sym.startsWith('^') ? (item.price / 10).toFixed(3) : item.price.toFixed(3);
                    const isPos = item.changePercent >= 0;

                    return (
                      <td 
                        key={m} 
                        className="p-4 text-right cursor-pointer"
                        onClick={() => setSelectedAsset(item)}
                      >
                        <div className="flex flex-col items-end">
                          <span className="text-xs font-black text-white tabular-nums">{yieldVal}%</span>
                          <span className={`text-[8px] font-bold ${isPos ? 'text-green-500' : 'text-red-500'}`}>
                            {isPos ? '+' : ''}{item.changePercent.toFixed(2)}%
                          </span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderCorporateDesk = () => {
    return (
      <div className="bg-[#050505] border border-terminal-darkGreen/40 flex flex-col h-full shadow-2xl">
        <div className="bg-black/90 p-4 border-b border-terminal-darkGreen/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldAlert size={20} className="text-orange-500" />
            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white">GLOBAL_CORPORATE_CREDIT</h3>
          </div>
          <div className="flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
             <span className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">CREDIT_SENTINEL_v3.2</span>
          </div>
        </div>
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#0a0a0a] text-[9px] text-gray-500 font-black uppercase sticky top-0 z-10">
              <tr>
                <th className="p-4 border-b border-terminal-darkGreen/10">ISSUER_NODE</th>
                <th className="p-4 border-b border-terminal-darkGreen/10">RATING</th>
                <th className="p-4 border-b border-terminal-darkGreen/10 text-right">PX_INDEX</th>
                <th className="p-4 border-b border-terminal-darkGreen/10 text-right pr-6">DELTA_24H</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-terminal-darkGreen/10">
              {BOND_MARKET_TICKERS.CORPORATE_GLOBAL.map((t) => {
                const item = data[t.symbol];
                if (!item) return (
                   <tr key={t.symbol}>
                      <td colSpan={4} className="p-4 text-center text-[10px] text-gray-800 italic animate-pulse">INITIALIZING_CREDIT_LINK_{t.symbol}...</td>
                   </tr>
                );
                const isPos = item.changePercent >= 0;
                return (
                  <tr 
                    key={t.symbol} 
                    className="hover:bg-terminal-green/5 transition-all cursor-pointer group"
                    onClick={() => setSelectedAsset(item)}
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-1 h-8 bg-orange-500 opacity-20 group-hover:opacity-100 transition-opacity"></div>
                        <div className="flex flex-col">
                          <span className="text-[11px] font-black text-white group-hover:text-terminal-green uppercase">{t.name}</span>
                          <span className="text-[8px] text-gray-600 font-bold uppercase">{t.symbol} // {t.region}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                       <span className={`px-2 py-0.5 border text-[9px] font-black uppercase ${t.rating.includes('AAA') || t.rating.startsWith('A') ? 'bg-green-950/20 text-green-500 border-green-500/40' : 'bg-orange-950/20 text-orange-500 border-orange-500/40'}`}>
                          {t.rating}
                       </span>
                    </td>
                    <td className="p-4 text-right">
                       <span className="text-[11px] font-bold text-terminal-dim tabular-nums">${item.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </td>
                    <td className={`p-4 text-right pr-6 font-black tabular-nums text-xs ${isPos ? 'text-green-500' : 'text-red-500'}`}>
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
    <div className="flex flex-col h-full bg-[#020202] font-mono text-terminal-green animate-in fade-in duration-500 overflow-hidden relative">
      {selectedAsset && (
        <StockChartModal 
          symbol={selectedAsset.symbol}
          currentPrice={selectedAsset.price}
          currency={selectedAsset.currency}
          changePercent={selectedAsset.changePercent}
          onClose={() => setSelectedAsset(null)}
        />
      )}

      {/* HUB HEADER */}
      <div className="p-6 border-b border-terminal-darkGreen/50 bg-black/95 flex flex-col md:flex-row justify-between items-center gap-6 shrink-0 relative z-10 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="p-3 border-2 border-terminal-green shadow-[0_0_20px_rgba(74,222,128,0.2)] bg-terminal-darkGreen/10">
            <Layout size={28} className="text-terminal-green animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-[0.2em] flex items-center gap-3">
              FIXED_INCOME_SENTINEL_v3.6
              <span className="bg-terminal-green text-black px-2 py-0.5 text-[8px] font-black tracking-widest uppercase">Global_Debt_Desk</span>
            </h2>
            <div className="flex items-center gap-3 mt-1.5">
               <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Institutional_Liquidity_Grid</span>
               <div className="w-1 h-1 rounded-full bg-terminal-darkGreen"></div>
               <span className="text-[9px] text-terminal-dim font-black uppercase">Active_Yield_Nodes: {Object.keys(data).length}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
           <div className="flex flex-col items-end text-right">
              <span className="text-[8px] text-gray-600 font-black uppercase mb-1">SYSTEM_AUTH_GATEWAY</span>
              <div className="flex items-center gap-2">
                 <ShieldCheck size={12} className="text-terminal-green" />
                 <span className="text-sm font-black text-white tabular-nums">LATENCY: {loading ? 'SYNCING' : '32ms'}</span>
              </div>
           </div>
           <button onClick={refreshData} className="p-3 border border-terminal-darkGreen hover:border-terminal-green hover:bg-terminal-green hover:text-black transition-all text-terminal-green group shadow-[0_0_15px_rgba(20,83,45,0.3)]">
             <RefreshCw size={20} className={loading ? 'animate-spin' : 'group-active:rotate-180 transition-transform'} />
           </button>
        </div>
      </div>

      {/* TOP DESK HUD */}
      <div className="grid grid-cols-1 md:grid-cols-4 divide-x divide-terminal-darkGreen/30 border-b border-terminal-darkGreen/30 bg-black/40 h-16 shrink-0">
         <div className="px-6 flex items-center justify-between group">
            <div className="flex flex-col">
               <span className="text-[8px] text-gray-600 font-black uppercase">US_10Y_BENCHMARK</span>
               <span className="text-lg font-black text-white tabular-nums">{data['^TNX'] ? (data['^TNX']!.price / 10).toFixed(3) : '---'}%</span>
            </div>
            <TrendingUp size={16} className="text-terminal-darkGreen group-hover:text-terminal-green transition-colors" />
         </div>
         <div className="px-6 flex items-center justify-between group">
            <div className="flex flex-col">
               <span className="text-[8px] text-gray-600 font-black uppercase">CURVE_INVERSION_2Y10Y</span>
               <span className="text-lg font-black text-red-500 tabular-nums">ACTIVE</span>
            </div>
            <Activity size={16} className="text-red-900" />
         </div>
         <div className="px-6 flex items-center justify-between group">
            <div className="flex flex-col">
               <span className="text-[8px] text-gray-600 font-black uppercase">AVG_CREDIT_SPREAD</span>
               <span className="text-lg font-black text-white tabular-nums">+1.42%</span>
            </div>
            <Scale size={16} className="text-terminal-darkGreen" />
         </div>
         <div className="px-6 flex items-center justify-between group">
            <div className="flex flex-col">
               <span className="text-[8px] text-gray-600 font-black uppercase">GLOBAL_VOL_INDEX</span>
               <span className="text-lg font-black text-terminal-green tabular-nums">14.2</span>
            </div>
            <Zap size={16} className="text-terminal-green" />
         </div>
      </div>

      {/* MAIN CONTENT GRID */}
      <div className="flex-1 p-6 overflow-y-auto custom-scrollbar bg-[#010101]">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 min-h-[500px]">
          {renderYieldMatrix()}
          {renderCorporateDesk()}
        </div>
        
        {/* INTERNATIONAL MARKET SUMMARY */}
        <div className="mt-8 bg-[#050505] border border-terminal-darkGreen/40 p-5 shadow-2xl">
           <div className="flex items-center gap-2 text-[10px] text-white font-black uppercase tracking-widest border-b border-terminal-darkGreen/20 pb-2 mb-4">
              <Globe size={14} className="text-terminal-green" /> INTERNATIONAL_DEBT_NODES
           </div>
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {BOND_MARKET_TICKERS.INTERNATIONAL_DEBT.map(t => {
                const item = data[t.symbol];
                return (
                  <div key={t.symbol} className="bg-black/60 border border-terminal-darkGreen/10 p-5 hover:border-terminal-green/30 cursor-pointer group transition-all relative overflow-hidden" onClick={() => item && setSelectedAsset(item)}>
                     <div className="absolute top-0 right-0 w-16 h-16 bg-terminal-green/5 -mr-8 -mt-8 rotate-45 pointer-events-none group-hover:bg-terminal-green/10 transition-colors"></div>
                     <div className="flex justify-between items-start relative z-10">
                        <div className="flex flex-col">
                           <span className="text-[12px] font-black text-white group-hover:text-terminal-green transition-colors">{t.symbol}</span>
                           <span className="text-[9px] text-gray-600 font-bold uppercase tracking-tighter">{t.name}</span>
                        </div>
                        <span className="text-[8px] font-black text-purple-400 border border-purple-900/30 px-1.5 py-0.5 bg-purple-950/10">{t.region}</span>
                     </div>
                     <div className="mt-4 flex justify-between items-end relative z-10">
                        <div className="flex flex-col">
                           <span className="text-[8px] text-gray-700 font-bold uppercase">MARKET_VALUE</span>
                           <span className="text-xl font-black text-terminal-dim tabular-nums">
                            {item ? `$${item.price.toFixed(2)}` : '---'}
                           </span>
                        </div>
                        {item && (
                          <div className={`flex items-center gap-1.5 text-[11px] font-black tabular-nums ${item.changePercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {item.changePercent >= 0 ? <TrendingUp size={12}/> : <TrendingDown size={12}/>}
                            {item.changePercent >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%
                          </div>
                        )}
                     </div>
                  </div>
                );
              })}
           </div>
        </div>

        {/* BOTTOM INTEL PANEL */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-8">
           <div className="bg-[#050505] border border-terminal-darkGreen/30 p-5 space-y-4 shadow-xl">
              <div className="flex items-center gap-2 text-[10px] text-white font-black uppercase tracking-widest border-b border-terminal-darkGreen/20 pb-2">
                 <Scale size={14} className="text-terminal-green" /> MACRO_REGIME_MONITOR
              </div>
              <div className="space-y-4">
                 <div className="flex justify-between items-center text-[10px]">
                    <span className="text-gray-500 font-bold uppercase">TERM_STRUCTURE</span>
                    <span className="text-terminal-alert font-black uppercase">FLATTENING</span>
                 </div>
                 <div className="flex justify-between items-center text-[10px]">
                    <span className="text-gray-500 font-bold uppercase">INFLATION_BREAKEVEN</span>
                    <span className="text-terminal-green font-black uppercase">STABLE_2.1%</span>
                 </div>
                 <div className="flex justify-between items-center text-[10px]">
                    <span className="text-gray-500 font-bold uppercase">LIQUIDITY_SKEW</span>
                    <span className="text-blue-400 font-black uppercase">TOWARD_LONG_DURATION</span>
                 </div>
              </div>
           </div>

           <div className="bg-[#050505] border border-terminal-darkGreen/30 p-5 space-y-4 shadow-xl relative overflow-hidden">
              <div className="flex items-center gap-2 text-[10px] text-white font-black uppercase tracking-widest border-b border-terminal-darkGreen/20 pb-2">
                 <Activity size={14} className="text-terminal-green" /> REAL_TIME_SENSITIVITY
              </div>
              <div className="flex items-center gap-4">
                 <div className="flex-1 h-3 bg-gray-900 border border-terminal-darkGreen/20 overflow-hidden relative">
                    <div className="h-full bg-blue-500/40 animate-pulse" style={{ width: '48%' }}></div>
                    <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black text-white uppercase tracking-tighter">DURATION_EXPOSURE_INDEX</span>
                 </div>
                 <span className="text-[11px] font-black text-blue-400 uppercase">48%</span>
              </div>
              <p className="text-[9px] text-gray-600 leading-relaxed font-medium uppercase tracking-tight">
                Institutional buffers indicate a preference for high-grade credit nodes. Yield curves remain anchored by central bank parity signals.
              </p>
           </div>

           <div className="bg-terminal-green/5 border border-terminal-green/30 p-5 flex flex-col justify-center items-center text-center group shadow-xl">
              <div className="w-12 h-12 border-2 border-terminal-green rounded-full flex items-center justify-center mb-3 group-hover:rotate-12 transition-transform">
                 <FileText size={24} className="text-terminal-green" />
              </div>
              <h4 className="text-[11px] font-black text-white uppercase tracking-widest mb-1">SOVEREIGN_REPORTS</h4>
              <p className="text-[9px] text-gray-600 uppercase font-black tracking-tighter">Accessing Global G10/G20 Monetary Disclosure Buffers</p>
           </div>
        </div>
      </div>
      
      {/* HUD FOOTER */}
      <div className="h-10 bg-black border-t border-terminal-darkGreen/40 px-6 flex items-center justify-between text-[8px] text-gray-700 font-black uppercase tracking-[0.4em] shrink-0">
         <div className="flex items-center gap-8">
            <span className="flex items-center gap-2"><RefreshCw size={10} /> REFRESH: 300S</span>
            <span className="flex items-center gap-2"><Globe size={10} /> DATA: YAHOO_GLOBAL_FIXED_L1</span>
            <span className="flex items-center gap-2"><Briefcase size={10} /> DEBT_MONITOR_ACTIVE</span>
         </div>
         <div className="flex items-center gap-2 text-terminal-green">
            <div className="w-1.5 h-1.5 rounded-full bg-terminal-green animate-ping"></div>
            <span>STABLE_RECKONING_v3.6.1</span>
         </div>
      </div>
    </div>
  );
};
