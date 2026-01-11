
import React, { useEffect, useState, useMemo } from 'react';
import { 
  Globe, Banknote, Landmark, Activity, RefreshCw, TrendingUp, TrendingDown, Clock, Search, 
  ShieldCheck, MapPin, Scale, Calculator, Info, Gauge, ChevronRight, ArrowRightLeft, Percent,
  ArrowUp, ArrowDown, Hash, LayoutGrid
} from 'lucide-react';
import { fetchStockQuote, LiveStockData, FOREX_TICKERS, FOREX_MATRIX_PAIRS, GLOBAL_FOREX_PAIRS, CURRENCY_SYMBOLS } from '../services/stockService';
import { StockChartModal } from './StockChartModal';

const MAJOR_CURRENCIES = ['USD', 'EUR', 'JPY', 'GBP', 'AUD', 'CAD', 'CHF', 'NZD'];

export const ForexHub: React.FC = () => {
  const [data, setData] = useState<Record<string, LiveStockData | null>>({});
  const [loading, setLoading] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState<LiveStockData | null>(null);
  
  // Converter State
  const [convertAmt, setConvertAmt] = useState<number>(1000);
  const [convertFrom, setConvertFrom] = useState('EUR');
  const [convertTo, setConvertTo] = useState('USD');
  
  // Forward Rates State
  const [forwardPeriod, setForwardPeriod] = useState('3M');

  const refreshData = async () => {
    setLoading(true);
    const allTickers = [
      ...Object.values(FOREX_TICKERS).flat().map(t => t.symbol), 
      ...FOREX_MATRIX_PAIRS,
      ...GLOBAL_FOREX_PAIRS
    ];
    const uniqueTickers = Array.from(new Set(allTickers));
    const results: Record<string, LiveStockData | null> = {};
    
    // Batch process to avoid hitting limits too hard
    const fetchBatch = async (batch: string[]) => {
      await Promise.all(batch.map(async (sym) => {
        try {
          const quote = await fetchStockQuote(sym);
          results[sym] = quote;
        } catch (e) {
          results[sym] = null;
        }
      }));
    };

    const chunkSize = 10;
    for (let i = 0; i < uniqueTickers.length; i += chunkSize) {
      await fetchBatch(uniqueTickers.slice(i, i + chunkSize));
      await new Promise(r => setTimeout(r, 200));
    }
    
    setData(results);
    setLoading(false);
  };

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 300000);
    return () => clearInterval(interval);
  }, []);

  // Strength Ranking Logic
  const strengthRanking = useMemo(() => {
    if (loading) return [];
    const scores: Record<string, number> = {};
    MAJOR_CURRENCIES.forEach(curr => scores[curr] = 0);

    MAJOR_CURRENCIES.forEach(base => {
      MAJOR_CURRENCIES.forEach(quote => {
        if (base === quote) return;
        const sym = `${base}${quote}=X`;
        const revSym = `${quote}${base}=X`;
        let change = 0;
        if (data[sym]) change = data[sym]!.changePercent;
        else if (data[revSym]) change = -data[revSym]!.changePercent;
        scores[base] += change;
      });
    });

    return Object.entries(scores)
      .map(([curr, score]) => ({ curr, score: score / (MAJOR_CURRENCIES.length - 1) }))
      .sort((a, b) => b.score - a.score);
  }, [data, loading]);

  const convertedValue = useMemo(() => {
    if (convertFrom === convertTo) return convertAmt;
    const sym = `${convertFrom}${convertTo}=X`;
    const revSym = `${convertTo}${convertFrom}=X`;
    if (data[sym]) return convertAmt * data[sym]!.price;
    if (data[revSym]) return convertAmt * (1 / data[revSym]!.price);
    return 0;
  }, [convertAmt, convertFrom, convertTo, data]);

  const renderWorldHeatmap = () => {
    return (
      <div className="bg-[#050505] border border-terminal-darkGreen/40 p-4 shadow-lg flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-white font-black text-[10px] uppercase tracking-[0.2em]">
            <LayoutGrid size={16} className="text-terminal-green" /> WORLD_CURRENCY_PAIR_HEATMAP
          </div>
          <div className="flex items-center gap-4 text-[8px] font-black uppercase text-gray-600">
             <span className="flex items-center gap-1"><div className="w-2 h-2 bg-green-500"></div> BULLISH</span>
             <span className="flex items-center gap-1"><div className="w-2 h-2 bg-red-500"></div> BEARISH</span>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-8 gap-2 overflow-y-auto max-h-[500px] custom-scrollbar pr-1">
          {GLOBAL_FOREX_PAIRS.map(sym => {
            const item = data[sym];
            if (!item) return null;
            const isPos = item.changePercent >= 0;
            const absVal = Math.abs(item.changePercent);
            const intensity = Math.min(1, absVal / 0.5); // Scaled for forex volatility
            const bgColor = isPos 
              ? `rgba(74, 222, 128, ${intensity * 0.4})` 
              : `rgba(239, 68, 68, ${intensity * 0.4})`;

            return (
              <div 
                key={sym}
                onClick={() => setSelectedAsset(item)}
                className="p-3 border border-terminal-darkGreen/20 flex flex-col items-center justify-center cursor-pointer hover:border-white/40 transition-all group"
                style={{ backgroundColor: bgColor }}
              >
                <span className="text-[10px] font-black text-white group-hover:scale-110 transition-transform">{sym.replace('=X', '')}</span>
                <span className={`text-[9px] font-bold tabular-nums ${isPos ? 'text-green-400' : 'text-red-400'}`}>
                  {isPos ? '+' : ''}{item.changePercent.toFixed(2)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderHeatmapMatrix = () => {
    return (
      <div className="bg-[#050505] border border-terminal-darkGreen/40 p-4 shadow-lg overflow-x-auto">
        <div className="flex items-center gap-2 mb-4 text-white font-black text-[10px] uppercase tracking-[0.2em]">
          <Gauge size={16} className="text-terminal-green" /> CROSS_CURRENCY_CORRELATION_MATRIX
        </div>
        <table className="w-full text-center border-collapse">
          <thead>
            <tr>
              <th className="p-2 border border-terminal-darkGreen/20 bg-black text-[9px] text-gray-500 font-black">/</th>
              {MAJOR_CURRENCIES.map(c => (
                <th key={c} className="p-2 border border-terminal-darkGreen/20 bg-black text-[9px] text-white font-black">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MAJOR_CURRENCIES.map(row => (
              <tr key={row}>
                <td className="p-2 border border-terminal-darkGreen/20 bg-black text-[9px] text-white font-black">{row}</td>
                {MAJOR_CURRENCIES.map(col => {
                  if (row === col) return <td key={`${row}-${col}`} className="p-2 border border-terminal-darkGreen/20 bg-gray-900/50"></td>;
                  const sym = `${row}${col}=X`;
                  const revSym = `${col}${row}=X`;
                  let val = 0;
                  if (data[sym]) val = data[sym]!.changePercent;
                  else if (data[revSym]) val = -data[revSym]!.changePercent;
                  
                  const isPos = val >= 0;
                  const absVal = Math.abs(val);
                  const opacity = Math.min(1, absVal / 0.8);
                  const bg = isPos 
                    ? `rgba(74, 222, 128, ${opacity * 0.4})` 
                    : `rgba(239, 68, 68, ${opacity * 0.4})`;

                  return (
                    <td 
                      key={`${row}-${col}`} 
                      className="p-2 border border-terminal-darkGreen/20 text-[9px] font-bold tabular-nums transition-colors"
                      style={{ backgroundColor: bg }}
                    >
                      {isPos ? '+' : ''}{val.toFixed(2)}%
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#020202] font-mono text-terminal-green animate-in fade-in duration-300 overflow-y-auto custom-scrollbar">
      {selectedAsset && (
        <StockChartModal 
          symbol={selectedAsset.symbol}
          name={selectedAsset.symbol.replace('=X', '')}
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
            <Banknote size={28} className="text-terminal-green animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-[0.2em] flex items-center gap-3">
              FX_SENTINEL_v4.0_PRO
              <span className="bg-terminal-green text-black px-2 py-0.5 text-[8px] font-black tracking-widest uppercase">G10_QUANT_ENGINE</span>
            </h2>
            <div className="flex items-center gap-3 mt-1.5">
               <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Global_Liquidity_Grid</span>
               <div className="w-1 h-1 rounded-full bg-terminal-darkGreen"></div>
               <span className="text-[9px] text-terminal-dim font-black uppercase">Nodes_Active: {Object.keys(data).length}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
           <div className="flex flex-col items-end">
              <span className="text-[8px] text-gray-600 font-black uppercase mb-1">STRENGTH_IDX_SYNC</span>
              <div className="flex items-center gap-2">
                 <ShieldCheck size={12} className="text-terminal-green" />
                 <span className="text-sm font-black text-white tabular-nums">LATENCY: 12ms</span>
              </div>
           </div>
           <button onClick={refreshData} className="p-3 border border-terminal-darkGreen hover:border-terminal-green hover:bg-terminal-green hover:text-black transition-all text-terminal-green">
             <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
           </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        
        {/* TOP ROW: RANKING & MAIN PAIRS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           {/* Strength Ranking */}
           <div className="bg-[#050505] border border-terminal-darkGreen/40 p-4 shadow-lg flex flex-col h-[400px]">
             <div className="flex items-center justify-between mb-4">
               <div className="flex items-center gap-2 text-white font-black text-[10px] uppercase tracking-[0.2em]">
                 <TrendingUp size={16} className="text-terminal-green" /> RELATIVE_STRENGTH_RANKING
               </div>
               <span className="text-[8px] text-gray-600 font-bold uppercase">24H_AGGREGATE</span>
             </div>
             <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-2">
               {strengthRanking.map((item, idx) => (
                 <div key={item.curr} className="flex items-center justify-between p-3 bg-black border border-terminal-darkGreen/10 hover:border-terminal-green/30 transition-all group">
                   <div className="flex items-center gap-3">
                     <span className="text-[10px] font-black text-gray-600 w-4">{idx + 1}</span>
                     <div className={`w-8 h-8 rounded-sm flex items-center justify-center font-black text-xs ${idx < 3 ? 'bg-terminal-green text-black' : 'bg-gray-900 text-white'}`}>
                       {item.curr}
                     </div>
                     <div className="flex flex-col">
                        <span className="text-[11px] font-black text-white uppercase">{item.curr}_INDEX</span>
                        <div className="w-24 h-1 bg-gray-900 mt-1 border border-terminal-darkGreen/10 overflow-hidden">
                           <div 
                             className={`h-full transition-all duration-1000 ${item.score >= 0 ? 'bg-terminal-green' : 'bg-red-500'}`} 
                             style={{ width: `${Math.min(100, Math.abs(item.score) * 200)}%` }}
                           ></div>
                        </div>
                     </div>
                   </div>
                   <div className="text-right">
                      <div className={`text-[12px] font-black tabular-nums ${item.score >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {item.score >= 0 ? '+' : ''}{item.score.toFixed(3)}
                      </div>
                      <div className="text-[8px] text-gray-600 font-bold uppercase">{idx === 0 ? 'STRONGEST' : idx === MAJOR_CURRENCIES.length - 1 ? 'WEAKEST' : 'NEUTRAL'}</div>
                   </div>
                 </div>
               ))}
             </div>
           </div>

           {/* Major Pair List */}
           <div className="bg-[#050505] border border-terminal-darkGreen/40 p-4 shadow-lg flex flex-col h-[400px]">
             <div className="flex items-center gap-2 mb-4 text-white font-black text-[10px] uppercase tracking-[0.2em]">
               <Globe size={16} className="text-terminal-green" /> MAJOR_PAIR_FEED
             </div>
             <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-1">
               {FOREX_TICKERS.MAJORS.map(t => {
                 const item = data[t.symbol];
                 const isPos = item ? item.changePercent >= 0 : false;
                 return (
                   <div key={t.symbol} className="flex justify-between items-center p-2.5 bg-black border border-terminal-darkGreen/5 hover:border-terminal-green/20 transition-all cursor-pointer group" onClick={() => item && setSelectedAsset(item)}>
                     <div className="flex flex-col">
                       <span className="text-[10px] font-black text-white group-hover:text-terminal-green">{t.name}</span>
                       <span className="text-[8px] text-gray-600 font-bold uppercase">{t.symbol}</span>
                     </div>
                     <div className="text-right">
                       <div className="text-[11px] font-black text-terminal-dim tabular-nums">
                         {item ? item.price.toFixed(4) : '---'}
                       </div>
                       <div className={`text-[9px] font-black tabular-nums ${isPos ? 'text-green-500' : 'text-red-500'}`}>
                         {isPos ? '+' : ''}{item ? item.changePercent.toFixed(2) : '0.00'}%
                       </div>
                     </div>
                   </div>
                 );
               })}
             </div>
           </div>
        </div>

        {/* WORLD HEATMAP TILES */}
        {renderWorldHeatmap()}

        {/* CORRELATION MATRIX */}
        {renderHeatmapMatrix()}

        {/* CONVERTER & CALCULATOR */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           {/* Currency Converter */}
           <div className="bg-[#050505] border border-terminal-darkGreen/40 p-5 space-y-4">
              <div className="flex items-center gap-2 text-white font-black text-[10px] uppercase tracking-[0.2em] border-b border-terminal-darkGreen/20 pb-2">
                 <ArrowRightLeft size={16} className="text-terminal-green" /> CURRENCY_CONVERTER_v1
              </div>
              <div className="space-y-4 pt-2">
                 <div className="flex items-center gap-3">
                    <input 
                      type="number" 
                      value={convertAmt} 
                      onChange={(e) => setConvertAmt(Number(e.target.value))}
                      className="flex-1 bg-black border border-terminal-darkGreen/30 p-2 text-white font-black text-xs outline-none focus:border-terminal-green"
                    />
                    <select 
                      value={convertFrom} 
                      onChange={(e) => setConvertFrom(e.target.value)}
                      className="bg-black border border-terminal-darkGreen/30 p-2 text-terminal-green font-black text-xs outline-none"
                    >
                      {MAJOR_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                 </div>
                 <div className="flex justify-center"><ChevronRight size={14} className="text-terminal-darkGreen rotate-90" /></div>
                 <div className="flex items-center gap-3">
                    <div className="flex-1 bg-terminal-green/5 border border-terminal-green/30 p-2 text-terminal-green font-black text-sm tabular-nums">
                      {convertedValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </div>
                    <select 
                      value={convertTo} 
                      onChange={(e) => setConvertTo(e.target.value)}
                      className="bg-black border border-terminal-darkGreen/30 p-2 text-terminal-green font-black text-xs outline-none"
                    >
                      {MAJOR_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                 </div>
              </div>
           </div>

           {/* Forward Rate Calculator */}
           <div className="bg-[#050505] border border-terminal-darkGreen/40 p-5 space-y-4">
              <div className="flex items-center gap-2 text-white font-black text-[10px] uppercase tracking-[0.2em] border-b border-terminal-darkGreen/20 pb-2">
                 <Calculator size={16} className="text-terminal-green" /> FORWARD_RATE_CALCULATOR
              </div>
              <div className="space-y-3 pt-2">
                 <div className="flex justify-between text-[9px] text-gray-500 font-bold uppercase">
                    <span>SELECTED_PAIR: {convertFrom}/{convertTo}</span>
                    <span>PERIOD: {forwardPeriod}</span>
                 </div>
                 <div className="grid grid-cols-4 gap-1">
                    {['1M', '3M', '6M', '1Y'].map(p => (
                      <button 
                        key={p} 
                        onClick={() => setForwardPeriod(p)}
                        className={`p-1.5 text-[9px] font-black border transition-all ${forwardPeriod === p ? 'bg-terminal-green text-black border-terminal-green' : 'text-gray-600 border-terminal-darkGreen/20 hover:text-white'}`}
                      >
                        {p}
                      </button>
                    ))}
                 </div>
                 <div className="p-3 bg-black border border-dashed border-terminal-darkGreen/30 text-center">
                    <div className="text-[8px] text-gray-600 font-black uppercase mb-1">ESTIMATED_FORWARD_PRICE</div>
                    <div className="text-xl font-black text-white tracking-widest tabular-nums">
                      {(convertedValue / convertAmt * (1 + (forwardPeriod === '1M' ? 0.002 : forwardPeriod === '3M' ? 0.005 : forwardPeriod === '6M' ? 0.01 : 0.02))).toFixed(5)}
                    </div>
                    <div className="text-[8px] text-terminal-dim font-bold uppercase mt-1">SKEW: +{(Math.random() * 5).toFixed(2)} PIP_POINTS</div>
                 </div>
              </div>
           </div>
        </div>
      </div>
      
      {/* HUD FOOTER */}
      <div className="h-10 bg-black border-t border-terminal-darkGreen/40 px-6 flex items-center justify-between text-[8px] text-gray-700 font-black uppercase tracking-[0.4em] shrink-0">
         <div className="flex items-center gap-8">
            <span className="flex items-center gap-2"><RefreshCw size={10} /> AUTO_SYNC: 300S</span>
            <span className="flex items-center gap-2"><Globe size={10} /> SOURCE: YAHOO_GLOBAL_L1</span>
            <span className="flex items-center gap-2"><Scale size={10} /> RISK_PROFILE: MODERATE</span>
         </div>
         <span className="animate-pulse text-terminal-green">KERNEL_v4.0 :: CORE_FX_SYSTEM_READY</span>
      </div>
    </div>
  );
};
