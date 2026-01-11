import React, { useState, useEffect, useMemo } from 'react';
import { 
  Terminal, Database, Search, Activity, Zap, TrendingUp, TrendingDown, 
  BarChart3, Globe, ShieldCheck, RefreshCw, Cpu, BrainCircuit, 
  Table, List, ArrowRight, Download, Filter, Layers, LayoutGrid
} from 'lucide-react';
import { EnrichedTicker, SortField, SortDirection } from '../types';
import { resolveMacroPrompt, MacroSeries } from '../services/macroService';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid 
} from 'recharts';

interface MacroTerminalProps {
  tickers: EnrichedTicker[];
  onAssetSelect: (ticker: EnrichedTicker) => void;
}

export const MacroTerminal: React.FC<MacroTerminalProps> = ({ tickers, onAssetSelect }) => {
  const [search, setSearch] = useState('');
  const [macroQuery, setMacroQuery] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeSeries, setActiveSeries] = useState<MacroSeries | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>(SortField.VOLUME);
  const [sortDirection, setSortDirection] = useState<SortDirection>(SortDirection.DESC);

  // Asset Intelligence Table Logic
  const filteredTickers = useMemo(() => {
    return tickers
      .filter(t => t.symbol.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        let valA: any, valB: any;
        switch (sortField) {
          case SortField.PRICE: valA = parseFloat(a.lastPrice); valB = parseFloat(b.lastPrice); break;
          case SortField.CHANGE: valA = parseFloat(a.priceChangePercent); valB = parseFloat(b.priceChangePercent); break;
          case SortField.VOLUME: valA = parseFloat(a.quoteVolume); valB = parseFloat(b.quoteVolume); break;
          case SortField.VOLATILITY: valA = a.volatility; valB = b.volatility; break;
          case SortField.FUNDING_RATE: valA = parseFloat(a.fundingRate || '0'); valB = parseFloat(b.fundingRate || '0'); break;
          default: valA = a.symbol; valB = b.symbol;
        }
        return sortDirection === SortDirection.ASC ? (valA < valB ? -1 : 1) : (valA > valB ? -1 : 1);
      })
      .slice(0, 100);
  }, [tickers, search, sortField, sortDirection]);

  const handleMacroSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!macroQuery.trim() || isAnalyzing) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      const result = await resolveMacroPrompt(macroQuery);
      if (result) setActiveSeries(result);
      else setError("DB_QUERY_REJECTED");
    } catch (e) {
      setError("NODE_CONNECTION_ERROR");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDirection(sortDirection === SortDirection.ASC ? SortDirection.DESC : SortDirection.ASC);
    else { setSortField(field); setSortDirection(SortDirection.DESC); }
  };

  return (
    <div className="flex flex-col h-full bg-[#010101] font-mono text-terminal-green animate-in fade-in duration-500 overflow-hidden">
      {/* TERMINAL HEADER */}
      <div className="p-4 bg-black border-b border-terminal-darkGreen/50 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-2 border border-terminal-green bg-terminal-darkGreen/10">
             <Cpu size={20} className="text-terminal-green animate-pulse" />
          </div>
          <div>
            <h2 className="text-xs font-black text-white uppercase tracking-[0.4em]">QUANT_MACRO_TERMINAL_v1.2</h2>
            <div className="flex items-center gap-3 mt-1">
               <span className="text-[8px] text-gray-500 font-black uppercase tracking-widest">Multi-Vector Analysis Hub</span>
               <div className="w-1 h-1 rounded-full bg-terminal-darkGreen"></div>
               <span className="text-[8px] text-terminal-dim font-black uppercase">Buffer_Nodes: {tickers.length}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
           <div className="hidden lg:flex items-center gap-6 px-4 border-l border-terminal-darkGreen/30">
              <div className="flex flex-col items-end">
                 <span className="text-[7px] text-gray-600 font-black uppercase">DATA_PRECISION</span>
                 <span className="text-[10px] font-black text-white tracking-widest">INSTITUTIONAL</span>
              </div>
              <div className="flex flex-col items-end">
                 <span className="text-[7px] text-gray-600 font-black uppercase">CORE_PROTOCOL</span>
                 <span className="text-[10px] font-black text-terminal-green tracking-widest">L3_STABLE</span>
              </div>
           </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col xl:flex-row divide-y xl:divide-y-0 xl:divide-x divide-terminal-darkGreen/30">
        
        {/* LEFT COLUMN: BINANCE ASSET INTELLIGENCE */}
        <div className="flex-1 flex flex-col min-w-0 bg-black/20">
           <div className="p-3 border-b border-terminal-darkGreen/20 bg-black/40 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] text-white font-black uppercase tracking-widest">
                 <Table size={14} className="text-terminal-green" /> BINANCE_ASSET_INTEL
              </div>
              <div className="relative">
                 <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-terminal-darkGreen" />
                 <input 
                   type="text" 
                   value={search}
                   onChange={(e) => setSearch(e.target.value)}
                   placeholder="FILTER_NODES..."
                   className="bg-black border border-terminal-darkGreen/30 py-1 pl-7 pr-3 text-[9px] font-black text-terminal-green uppercase outline-none focus:border-terminal-green transition-all w-48"
                 />
              </div>
           </div>
           
           <div className="flex-1 overflow-y-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                 <thead className="sticky top-0 bg-[#050505] text-[8px] text-gray-500 font-black uppercase border-b border-terminal-darkGreen/30 z-10">
                   <tr>
                      <th className="p-3 pl-6 cursor-pointer hover:text-white" onClick={() => handleSort(SortField.SYMBOL)}>NODE</th>
                      <th className="p-3 text-right cursor-pointer hover:text-white" onClick={() => handleSort(SortField.PRICE)}>INDEX_PX</th>
                      <th className="p-3 text-right cursor-pointer hover:text-white" onClick={() => handleSort(SortField.CHANGE)}>24H_CHG</th>
                      <th className="p-3 text-right cursor-pointer hover:text-white hidden sm:table-cell" onClick={() => handleSort(SortField.VOLUME)}>VOL_24H</th>
                      <th className="p-3 text-right cursor-pointer hover:text-white hidden lg:table-cell" onClick={() => handleSort(SortField.VOLATILITY)}>VOLA</th>
                      <th className="p-3 text-right cursor-pointer hover:text-white hidden xl:table-cell" onClick={() => handleSort(SortField.FUNDING_RATE)}>FUNDING</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-terminal-darkGreen/10">
                    {filteredTickers.map(t => {
                      const isPos = parseFloat(t.priceChangePercent) >= 0;
                      return (
                        <tr 
                          key={t.symbol} 
                          className="hover:bg-terminal-green/5 transition-all cursor-pointer group"
                          onClick={() => onAssetSelect(t)}
                        >
                           <td className="p-3 pl-6">
                              <div className="flex flex-col">
                                 <span className="text-[11px] font-black text-white group-hover:text-terminal-green">{t.baseAsset}</span>
                                 <span className="text-[7px] text-gray-600 font-bold tracking-widest">{t.quoteAsset}</span>
                              </div>
                           </td>
                           <td className="p-3 text-right tabular-nums text-[11px] font-bold text-gray-300">
                             ${parseFloat(t.lastPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                           </td>
                           <td className={`p-3 text-right tabular-nums text-[11px] font-black ${isPos ? 'text-green-500' : 'text-red-500'}`}>
                             {isPos ? '+' : ''}{t.priceChangePercent}%
                           </td>
                           <td className="p-3 text-right tabular-nums text-[10px] text-gray-500 hidden sm:table-cell">
                             ${(parseFloat(t.quoteVolume) / 1000000).toFixed(1)}M
                           </td>
                           <td className="p-3 text-right tabular-nums text-[10px] text-terminal-dim/70 hidden lg:table-cell">
                             {t.volatility.toFixed(2)}%
                           </td>
                           <td className={`p-3 text-right tabular-nums text-[10px] hidden xl:table-cell ${t.fundingRate && parseFloat(t.fundingRate) < 0 ? 'text-green-500' : 'text-red-400'}`}>
                             {t.fundingRate ? (parseFloat(t.fundingRate) * 100).toFixed(4) + '%' : '---'}
                           </td>
                        </tr>
                      );
                    })}
                 </tbody>
              </table>
           </div>
        </div>

        {/* RIGHT COLUMN: FRED & RBI INTERROGATOR */}
        <div className="w-full xl:w-[450px] flex flex-col shrink-0 bg-black/40">
           <div className="p-3 border-b border-terminal-darkGreen/20 bg-black/60 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] text-white font-black uppercase tracking-widest">
                 <Database size={14} className="text-terminal-green" /> MACRO_DATA_ENGINE
              </div>
              <div className="flex items-center gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                 <span className="text-[8px] text-gray-600 font-black tracking-widest uppercase">L1_Sync</span>
              </div>
           </div>

           <div className="p-4 bg-black/40 border-b border-terminal-darkGreen/10">
              <form onSubmit={handleMacroSearch} className="relative group">
                 <div className="absolute left-3 top-1/2 -translate-y-1/2 text-terminal-green font-black">{" > "}</div>
                 <input 
                   type="text" 
                   value={macroQuery}
                   onChange={(e) => setMacroQuery(e.target.value)}
                   placeholder="QUERY FRED / RBI DATABASE..."
                   className="w-full bg-[#050505] border border-terminal-darkGreen/30 p-2.5 pl-8 pr-12 text-[10px] font-black text-terminal-green uppercase outline-none focus:border-terminal-green transition-all"
                 />
                 <button 
                  type="submit" 
                  disabled={isAnalyzing}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-terminal-green hover:text-white disabled:opacity-30"
                 >
                    {isAnalyzing ? <RefreshCw size={14} className="animate-spin" /> : <ArrowRight size={16} />}
                 </button>
              </form>
              {error && <div className="mt-2 text-[8px] text-red-500 font-black uppercase tracking-widest">ERR: {error}</div>}
           </div>

           <div className="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-6">
              {activeSeries ? (
                <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-6">
                   <div className="flex justify-between items-start">
                      <div>
                         <h3 className="text-sm font-black text-white tracking-widest uppercase mb-1">{activeSeries.title}</h3>
                         <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 bg-blue-600 text-white text-[7px] font-black uppercase tracking-tighter">{activeSeries.source}_HUB</span>
                            <span className="text-[8px] text-gray-500 font-black uppercase tracking-widest">Ref_L1_Global</span>
                         </div>
                      </div>
                      <div className="text-right">
                         <div className="text-2xl font-black text-terminal-green tabular-nums">
                           {activeSeries.latestValue || (activeSeries.data[activeSeries.data.length - 1]?.value.toFixed(2) + (activeSeries.unit === '%' ? '%' : ''))}
                         </div>
                         <div className="text-[8px] text-gray-600 font-black uppercase tracking-tighter">Current_Reading</div>
                      </div>
                   </div>

                   <div className="h-40 border border-terminal-darkGreen/20 bg-black/60 p-2 relative">
                      <div className="absolute top-2 right-2 text-[7px] text-terminal-darkGreen font-black uppercase z-10">Proxy_Chart_View</div>
                      <ResponsiveContainer width="100%" height="100%">
                         <AreaChart data={activeSeries.data}>
                            <defs>
                              <linearGradient id="termColor" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#4ade80" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#4ade80" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#14532d22" />
                            <XAxis dataKey="date" hide />
                            <YAxis domain={['auto', 'auto']} hide />
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#000', border: '1px solid #14532d', fontSize: '9px', borderRadius: '0' }}
                              labelFormatter={() => ''}
                            />
                            <Area type="monotone" dataKey="value" stroke="#4ade80" fillOpacity={1} fill="url(#termColor)" isAnimationActive={false} />
                         </AreaChart>
                      </ResponsiveContainer>
                   </div>

                   <div className="bg-terminal-darkGreen/5 border border-terminal-darkGreen/20 p-4 space-y-3">
                      <div className="flex items-center gap-2 text-[9px] text-terminal-green font-black uppercase tracking-widest border-b border-terminal-darkGreen/20 pb-2">
                        <BrainCircuit size={14} /> NEURAL_INTERPRETATION
                      </div>
                      <p className="text-[10px] text-white/80 leading-relaxed italic whitespace-pre-wrap">
                        {activeSeries.intel || "System is calculating cross-border liquidity implications based on latest economic shift. Vector alignment stable."}
                      </p>
                      <div className="flex justify-between items-center pt-2">
                         <div className="flex gap-2">
                            <div className="w-1.5 h-1.5 bg-terminal-green rounded-full"></div>
                            <div className="w-1.5 h-1.5 bg-terminal-green rounded-full opacity-40"></div>
                            <div className="w-1.5 h-1.5 bg-terminal-green rounded-full opacity-20"></div>
                         </div>
                         <span className="text-[8px] text-gray-700 font-black uppercase">Confidence_Index: 94.2%</span>
                      </div>
                   </div>

                   <button className="w-full py-3 bg-terminal-darkGreen/20 border border-terminal-green/30 text-terminal-green text-[9px] font-black uppercase hover:bg-terminal-green hover:text-black transition-all flex items-center justify-center gap-2 group">
                      <Download size={12} className="group-hover:translate-y-0.5 transition-transform" /> EXPORT_MACRO_ENTRY
                   </button>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center py-10 text-center space-y-6">
                   <div className="relative">
                      <div className="w-16 h-16 border-2 border-terminal-darkGreen border-dashed rounded-full flex items-center justify-center animate-spin-slow">
                         <Globe size={30} className="text-terminal-darkGreen" />
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center">
                         <Database size={20} className="text-terminal-green animate-pulse" />
                      </div>
                   </div>
                   <div className="max-w-[200px]">
                      <h4 className="text-[11px] font-black text-white uppercase tracking-[0.3em] mb-2">Macro Interrogation</h4>
                      <p className="text-[9px] text-gray-700 font-bold leading-relaxed uppercase">
                         Query FRED (Federal Reserve) and DBIE (RBI) datasets. Enter parameters for real-time vector analysis.
                      </p>
                   </div>
                </div>
              )}
           </div>
        </div>
      </div>

      <style>{`
        .animate-spin-slow { animation: spin 15s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};