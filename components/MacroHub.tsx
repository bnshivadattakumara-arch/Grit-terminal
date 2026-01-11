import React, { useState, useEffect, useRef } from 'react';
import { 
  LineChart, Activity, Globe, RefreshCw, TrendingUp, TrendingDown, 
  Cpu, Zap, Landmark, ShieldCheck, ChevronRight, FileText, BarChart3,
  Scale, PieChart, Sparkles, Send, Terminal, Search, Database,
  ArrowRight, Download, BrainCircuit, Box, Table, List, HelpCircle,
  ShieldAlert
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid 
} from 'recharts';
import { fetchMacroData, MacroIndicator, resolveMacroPrompt, MacroSeries } from '../services/macroService';

export const MacroHub: React.FC = () => {
  const [usData, setUsData] = useState<MacroIndicator[]>([]);
  const [inData, setInData] = useState<MacroIndicator[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSeries, setActiveSeries] = useState<MacroSeries | null>(null);
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDocs, setShowDocs] = useState(false);

  const refreshBase = async () => {
    setLoading(true);
    try {
      const [us, ind] = await Promise.all([
        fetchMacroData('USA'),
        fetchMacroData('IND')
      ]);
      setUsData(us);
      setInData(ind);
    } catch (e) {
      setError("BASE_SYNC_FAILED");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshBase();
  }, []);

  const handlePrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || generating) return;

    setGenerating(true);
    setError(null);
    try {
      const series = await resolveMacroPrompt(prompt.trim());
      if (series && (series.data.length > 0 || series.latestValue)) {
        setActiveSeries(series);
        setPrompt('');
      } else {
        setError("DATABASE_ENTRY_NOT_RESOLVED: Verify parameters or wait for node sync.");
      }
    } catch (e) {
      setError("CRITICAL_DATABASE_ERROR: NODE_UNREACHABLE");
    } finally {
      setGenerating(false);
    }
  };

  // Helper to render macro indicator summary cards
  const renderIndicatorCard = (item: MacroIndicator) => (
    <div key={item.id} className="p-4 bg-black border border-terminal-darkGreen/40 hover:border-terminal-green/50 transition-all group relative overflow-hidden">
      <div className="absolute top-0 right-0 w-12 h-12 bg-terminal-green/5 -mr-6 -mt-6 rotate-45 pointer-events-none group-hover:bg-terminal-green/10"></div>
      <div className="flex justify-between items-start mb-2">
        <span className="text-[8px] text-gray-500 font-black uppercase tracking-widest">{item.name}</span>
        {item.trend === 'up' ? <TrendingUp size={10} className="text-green-500" /> : <TrendingDown size={10} className="text-red-500" />}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-xl font-black text-white tabular-nums">{item.value.toFixed(2)}</span>
        <span className="text-[10px] font-bold text-terminal-dim">{item.unit}</span>
      </div>
      <div className="mt-2 flex justify-between items-center border-t border-terminal-darkGreen/10 pt-2">
        <span className="text-[7px] text-gray-600 font-black uppercase">REF_DATE: {item.date}</span>
        <span className={`text-[8px] font-black ${item.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
          {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)}%
        </span>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-[#020202] font-mono text-terminal-green animate-in fade-in duration-500 overflow-hidden relative">
      {/* HUD HEADER */}
      <div className="p-6 border-b border-terminal-darkGreen bg-black/95 flex flex-col md:flex-row justify-between items-center gap-6 shrink-0 relative z-40 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="p-3 border-2 border-terminal-green shadow-[0_0_20px_rgba(74,222,128,0.2)] bg-terminal-darkGreen/10">
            <Database size={28} className="text-terminal-green animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-[0.2em] flex items-center gap-3">
              MACRO_DB_SENTINEL_PRO
              <span className="bg-blue-600 text-white px-2 py-0.5 text-[8px] font-black tracking-widest uppercase">LIVE_FRED_RBI_ENGINE</span>
            </h2>
            <div className="flex items-center gap-3 mt-1.5">
               <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Macro-Economic_Cluster_Alpha</span>
               <div className="w-1 h-1 rounded-full bg-terminal-darkGreen"></div>
               <span className="text-[9px] text-terminal-dim font-black uppercase">ACTIVE_QUERIES: 341,202</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
           <button 
             onClick={() => setShowDocs(!showDocs)}
             className={`px-4 py-3 border border-terminal-darkGreen transition-all flex items-center gap-2 text-[10px] font-black uppercase ${showDocs ? 'bg-terminal-green text-black border-terminal-green' : 'text-gray-500 hover:text-white'}`}
           >
             <HelpCircle size={16} /> {showDocs ? 'HIDE_SCHEMA' : 'DB_SCHEMA'}
           </button>
           <button onClick={refreshBase} className="p-3 border border-terminal-darkGreen hover:bg-terminal-green hover:text-black transition-all">
             <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
           </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex">
        {/* SIDEBAR: DB SCHEMA & DOCS */}
        {showDocs && (
          <div className="w-80 bg-black/80 border-r border-terminal-darkGreen/40 p-6 overflow-y-auto custom-scrollbar animate-in slide-in-from-left duration-300">
             <div className="space-y-8">
                <div>
                   <h4 className="text-[10px] font-black text-terminal-green uppercase tracking-widest border-b border-terminal-darkGreen/40 pb-2 mb-4">FRED_USA_DATABASE</h4>
                   <ul className="space-y-3">
                      {['US_GDP', 'US_CPI', 'US_UNRATE', 'US_FED_FUNDS', 'US_M2', 'US_HOUSING'].map(s => (
                        <li key={s} className="flex justify-between items-center group cursor-help">
                           <span className="text-[11px] text-white font-bold group-hover:text-terminal-green">{s}</span>
                           <span className="text-[9px] text-gray-600 font-black">ST_LOUIS_L1</span>
                        </li>
                      ))}
                   </ul>
                </div>
                <div>
                   <h4 className="text-[10px] font-black text-terminal-green uppercase tracking-widest border-b border-terminal-darkGreen/40 pb-2 mb-4">RBI_INDIA_DATABASE</h4>
                   <ul className="space-y-3">
                      {['IN_REPO', 'IN_GDP', 'IN_CPI', 'IN_FX_RES', 'IN_WPI', 'IN_LIQUIDITY'].map(s => (
                        <li key={s} className="flex justify-between items-center group cursor-help">
                           <span className="text-[11px] text-white font-bold group-hover:text-terminal-green">{s}</span>
                           <span className="text-[9px] text-gray-600 font-black">DBIE_MUMBAI</span>
                        </li>
                      ))}
                   </ul>
                </div>
                <div className="bg-terminal-darkGreen/5 p-4 border border-terminal-darkGreen/20">
                   <div className="text-[9px] text-gray-500 font-black uppercase mb-2">QUICK_COMMANDS</div>
                   <div className="text-[10px] text-white leading-relaxed italic">
                     "What is the current India Repo Rate?"<br/>
                     "US Inflation trend 2024"<br/>
                     "Latest RBI FX Reserves status"
                   </div>
                </div>
             </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-[#010101] space-y-8 relative">
          
          {/* INTERACTIVE DB CLI */}
          <div className="bg-black border-2 border-terminal-darkGreen shadow-[0_0_40px_rgba(74,222,128,0.1)] overflow-hidden flex flex-col min-h-[450px]">
            <div className="bg-[#050505] p-4 border-b border-terminal-darkGreen/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Terminal size={18} className="text-terminal-green" />
                  <span className="text-xs font-black text-white uppercase tracking-[0.4em]">DATABASE_INTERROGATION_CLI</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                  <span className="text-[9px] text-gray-600 font-black uppercase tracking-widest">Grounding_Engine: Active</span>
                </div>
            </div>

            <div className="p-4 bg-black/60 border-b border-terminal-darkGreen/20">
                <form onSubmit={handlePrompt} className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-terminal-green font-black">{" > "}</div>
                  <input 
                    type="text" 
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="QUERY THE ENTIRE FRED/RBI DATASET..."
                    className="w-full bg-[#050505] border border-terminal-darkGreen/40 p-4 pl-10 pr-20 text-terminal-green outline-none focus:border-terminal-green transition-all font-mono font-bold uppercase placeholder-gray-800 text-xs"
                  />
                  <button 
                    type="submit" 
                    disabled={generating}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-terminal-green text-black px-4 py-2 text-[10px] font-black uppercase hover:bg-white transition-all disabled:opacity-30 flex items-center gap-2"
                  >
                      {generating ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />} {generating ? 'INTERROGATING...' : 'EXEC_QUERY'}
                  </button>
                </form>
                {error && <div className="mt-2 text-[9px] text-red-500 font-black uppercase tracking-widest flex items-center gap-2 animate-pulse"><ShieldAlert size={10}/> ERR: {error}</div>}
            </div>

            <div className="flex-1 p-6 relative flex flex-col lg:flex-row gap-8">
                {activeSeries ? (
                  <>
                    <div className="flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-2xl font-black text-white tracking-widest uppercase mb-1">{activeSeries.title}</h3>
                            <div className="flex items-center gap-3">
                              <span className="px-2 py-0.5 bg-blue-600 text-white text-[8px] font-black uppercase">{activeSeries.source}_DATABASE</span>
                              <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">{activeSeries.description}</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-[10px] text-gray-600 font-black uppercase block mb-1">OFFICIAL_READING</span>
                            <span className="text-3xl font-black text-terminal-green tabular-nums">
                              {activeSeries.latestValue || (activeSeries.data[activeSeries.data.length - 1]?.value.toFixed(2) + (activeSeries.unit === '%' ? '%' : ''))}
                            </span>
                        </div>
                      </div>

                      <div className="flex-1 min-h-[250px] border border-terminal-darkGreen/20 bg-black/40 p-4 relative">
                        <div className="absolute top-2 right-2 z-10 text-[8px] text-terminal-darkGreen font-black uppercase">Visual_Proxy_Chart</div>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={activeSeries.data}>
                              <defs>
                                <linearGradient id="colorMacro" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#4ade80" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="#4ade80" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#14532d33" />
                              <XAxis 
                                dataKey="date" 
                                type="number" 
                                domain={['dataMin', 'dataMax']} 
                                tickFormatter={(t) => new Date(t).toLocaleDateString([], { month: 'short', year: '2-digit' })}
                                stroke="#14532d"
                                tick={{fontSize: 9, fill: '#666'}}
                              />
                              <YAxis 
                                orientation="right" 
                                stroke="#14532d" 
                                tick={{fontSize: 10, fill: '#4ade80'}}
                                domain={['auto', 'auto']}
                              />
                              <Tooltip 
                                contentStyle={{ backgroundColor: '#000', border: '1px solid #14532d', borderRadius: '0', fontSize: '10px' }}
                                labelFormatter={(label) => new Date(label).toLocaleString()}
                                formatter={(val: number) => [`${val.toFixed(3)} ${activeSeries.unit}`, 'VALUE']}
                              />
                              <Area 
                                type="monotone" 
                                dataKey="value" 
                                stroke="#4ade80" 
                                fillOpacity={1} 
                                fill="url(#colorMacro)" 
                                isAnimationActive={false}
                              />
                            </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    
                    <div className="w-full lg:w-80 space-y-6">
                      <div className="bg-[#050505] border border-terminal-darkGreen/30 p-5 space-y-4 shadow-xl">
                          <div className="flex items-center gap-2 text-[10px] text-white font-black uppercase tracking-widest border-b border-terminal-darkGreen/20 pb-2">
                            <BrainCircuit size={14} className="text-terminal-green" /> NEURAL_INTEL_STREAM
                          </div>
                          <div className="text-[11px] text-white/80 leading-relaxed italic whitespace-pre-wrap">
                            {activeSeries.intel || "System analysis in progress... Interrogating global liquidity corridors."}
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-black border border-terminal-darkGreen/10 p-3 text-center">
                           <span className="text-[8px] text-gray-600 font-bold uppercase block">DATA_CONF</span>
                           <span className="text-xs font-black text-white">98.4%</span>
                        </div>
                        <div className="bg-black border border-terminal-darkGreen/10 p-3 text-center">
                           <span className="text-[8px] text-gray-600 font-bold uppercase block">LATENCY</span>
                           <span className="text-xs font-black text-white">124MS</span>
                        </div>
                      </div>

                      <button className="w-full py-4 bg-terminal-darkGreen/10 border border-terminal-green/30 text-terminal-green text-[10px] font-black uppercase hover:bg-terminal-green hover:text-black transition-all flex items-center justify-center gap-2">
                          <Download size={14} /> EXPORT_MACRO_ENTRY
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center py-20 text-center space-y-8">
                    <div className="relative">
                       <div className="w-24 h-24 border-2 border-terminal-darkGreen border-dashed rounded-full flex items-center justify-center animate-spin-slow">
                          <Globe size={40} className="text-terminal-darkGreen" />
                       </div>
                       <div className="absolute inset-0 flex items-center justify-center">
                          <BrainCircuit size={32} className="text-terminal-green animate-pulse" />
                       </div>
                    </div>
                    <div className="max-w-md">
                        <h4 className="text-lg font-black text-white uppercase tracking-[0.4em] mb-3">Interrogate Global Macro</h4>
                        <p className="text-[10px] text-gray-500 leading-relaxed uppercase font-black tracking-widest px-10">
                          Direct conduit to 500,000+ time-series vectors from FRED (Federal Reserve) and DBIE (Reserve Bank of India). Enter natural language queries to extract live datasets and institutional intel.
                        </p>
                    </div>
                    <div className="grid grid-cols-3 gap-4 w-full max-w-sm opacity-40">
                       <div className="h-1 bg-terminal-darkGreen"></div>
                       <div className="h-1 bg-terminal-darkGreen"></div>
                       <div className="h-1 bg-terminal-darkGreen"></div>
                    </div>
                  </div>
                )}
            </div>
          </div>

          {/* BENCHMARK OVERVIEW */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-terminal-darkGreen/40 pb-2">
                  <div className="flex items-center gap-3">
                      <div className="w-5 h-4 bg-blue-600 rounded-sm"></div>
                      <h3 className="text-xs font-black text-white uppercase tracking-widest">FEDERAL_RESERVE_PRIMARY_HUD</h3>
                  </div>
                  <span className="text-[8px] text-gray-600 font-black uppercase">REF: ST_LOUIS_HUB</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {loading ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 bg-terminal-darkGreen/5 animate-pulse border border-terminal-darkGreen/20"></div>) : usData.map(renderIndicatorCard)}
                </div>
            </div>

            <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-terminal-darkGreen/40 pb-2">
                  <div className="flex items-center gap-3">
                      <div className="w-5 h-4 bg-orange-600 rounded-sm"></div>
                      <h3 className="text-xs font-black text-white uppercase tracking-widest">RBI_DBIE_BENCHMARK_STATUS</h3>
                  </div>
                  <span className="text-[8px] text-gray-600 font-black uppercase">REF: RBI_MUMBAI_CENTRAL</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {loading ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 bg-terminal-darkGreen/5 animate-pulse border border-terminal-darkGreen/20"></div>) : inData.map(renderIndicatorCard)}
                </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* HUD FOOTER */}
      <div className="h-10 bg-black border-t border-terminal-darkGreen/40 px-6 flex items-center justify-between text-[8px] text-gray-700 font-black uppercase tracking-[0.4em] shrink-0">
         <div className="flex items-center gap-8">
            <span className="flex items-center gap-2"><Globe size={10} /> SOURCES: FRED.STLOUISFED.ORG // RBI.ORG.IN</span>
            <span className="flex items-center gap-2"><RefreshCw size={10} /> KERNEL_SYNC: 300S</span>
            <span className="flex items-center gap-2"><ShieldCheck size={10} /> AUTH: SECURE_QUANT</span>
         </div>
         <div className="flex items-center gap-2 text-terminal-green">
            <div className="w-1.5 h-1.5 rounded-full bg-terminal-green animate-ping"></div>
            <span>SENTINEL_PRO_v3.6.8_STABLE</span>
         </div>
      </div>
      <style>{`
        .animate-spin-slow { animation: spin 20s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};