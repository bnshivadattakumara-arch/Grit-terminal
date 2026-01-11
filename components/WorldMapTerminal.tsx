import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { feature } from 'topojson-client';
import { 
  Globe, Map as MapIcon, TrendingUp, Activity,
  Search, RefreshCw, Layers, Landmark, Home, Wallet, ChevronRight, Briefcase
} from 'lucide-react';
import { fetchStockQuote, GLOBAL_INDEX_MAP, MACRO_TICKERS, LiveStockData, CURRENCY_SYMBOLS } from '../services/stockService';
import { StockChartModal } from './StockChartModal';

export interface CountryData {
  id: string;
  name: string;
  index: string;
  price: string;
  rawPrice: number;
  currency: string;
  change: number; 
  changeStr: string;
  performanceScore: number;
}

const BASE_META: Record<string, any> = {
  'USA': { name: 'UNITED STATES', index: 'S&P 500' },
  'CHN': { name: 'CHINA', index: 'SHANGHAI COMP' },
  'JPN': { name: 'JAPAN', index: 'NIKKEI 225' },
  'GBR': { name: 'UNITED KINGDOM', index: 'FTSE 100' },
  'DEU': { name: 'GERMANY', index: 'DAX' },
  'IND': { name: 'INDIA', index: 'NIFTY 50' },
  'BRA': { name: 'BRAZIL', index: 'BOVESPA' },
  'CAN': { name: 'CANADA', index: 'TSX COMPOSITE' },
  'FRA': { name: 'FRANCE', index: 'CAC 40' },
  'AUS': { name: 'AUSTRALIA', index: 'S&P/ASX 200' },
  'KOR': { name: 'SOUTH KOREA', index: 'KOSPI' },
  'HKG': { name: 'HONG KONG', index: 'HANG SENG' },
  'ITA': { name: 'ITALY', index: 'FTSE MIB' },
  'ESP': { name: 'SPAIN', index: 'IBEX 35' },
  'RUS': { name: 'RUSSIA', index: 'MOEX INDEX' },
  'MEX': { name: 'MEXICO', index: 'S&P/BMV IPC' },
  'IDN': { name: 'INDONESIA', index: 'IDX COMPOSITE' },
  'TUR': { name: 'TURKEY', index: 'BIST 100' },
  'ISR': { name: 'ISRAEL', index: 'TA-125' },
  'VEN': { name: 'VENEZUELA', index: 'IBVC CARACAS' }
};

export const WorldMapTerminal: React.FC<{ onCountryClick: (id: string) => void }> = ({ onCountryClick }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const mapLoadedRef = useRef(false);
  const [hoveredCountry, setHoveredCountry] = useState<CountryData | null>(null);
  const [liveData, setLiveData] = useState<Record<string, CountryData>>({});
  const [macroStats, setMacroStats] = useState<Record<string, LiveStockData[]>>({ EQUITIES: [], ETFS: [], BONDS: [], REAL_ESTATE: [] });
  const [loading, setLoading] = useState(true);
  const [activeLayer, setActiveLayer] = useState<'INDICES' | 'EQUITIES' | 'ETFS' | 'BONDS' | 'REIT'>('INDICES');
  const [activeChart, setActiveChart] = useState<{ symbol: string; name: string; price: number; currency: string; change: number } | null>(null);

  const fetchGlobalData = async (initial = false) => {
    if (initial) setLoading(true);
    const results: Record<string, CountryData> = { ...liveData };
    
    // Sequential Fetch for Indices
    const indexEntries = Object.entries(GLOBAL_INDEX_MAP);
    for (const [id, symbol] of indexEntries) {
      try {
        const data = await fetchStockQuote(symbol);
        if (data) {
          results[id] = {
            id,
            name: BASE_META[id]?.name || id,
            index: BASE_META[id]?.index || 'INDEX',
            price: data.price.toLocaleString(undefined, { minimumFractionDigits: 2 }),
            rawPrice: data.price,
            currency: data.currency,
            change: data.changePercent,
            changeStr: `${data.changePercent >= 0 ? '+' : ''}${data.changePercent.toFixed(2)}%`,
            performanceScore: Math.max(-1, Math.min(1, data.changePercent / 2))
          };
          setLiveData(prev => ({ ...prev, [id]: results[id] }));
        }
        await new Promise(r => setTimeout(r, 450));
      } catch (e) {
        console.error(`Fetch error index ${id}`);
      }
    }

    // Macro Categories (Equities, ETFs, Bonds, REITs)
    const categories = [
      { key: 'EQUITIES', tickers: MACRO_TICKERS.EQUITIES },
      { key: 'ETFS', tickers: MACRO_TICKERS.ETFS },
      { key: 'BONDS', tickers: MACRO_TICKERS.BONDS },
      { key: 'REAL_ESTATE', tickers: MACRO_TICKERS.REAL_ESTATE }
    ];

    for (const cat of categories) {
      const catResults: LiveStockData[] = [];
      for (const s of cat.tickers) {
        try {
          const d = await fetchStockQuote(s);
          if (d) catResults.push(d);
          await new Promise(r => setTimeout(r, 350));
        } catch (e) {
          console.error(`Fetch error macro ${s}`);
        }
      }
      setMacroStats(prev => ({ ...prev, [cat.key]: catResults }));
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchGlobalData(true);
    const interval = setInterval(() => fetchGlobalData(false), 300000);
    return () => clearInterval(interval);
  }, []);

  const getISO = (name: string) => {
    if (name === 'United States of America' || name === 'United States') return 'USA';
    if (name === 'China') return 'CHN';
    if (name === 'Japan') return 'JPN';
    if (name === 'United Kingdom') return 'GBR';
    if (name === 'Germany') return 'DEU';
    if (name === 'India') return 'IND';
    if (name === 'Brazil') return 'BRA';
    if (name === 'Canada') return 'CAN';
    if (name === 'France') return 'FRA';
    if (name === 'Australia') return 'AUS';
    if (name === 'South Korea') return 'KOR';
    if (name === 'Hong Kong') return 'HKG';
    if (name === 'Italy') return 'ITA';
    if (name === 'Spain') return 'ESP';
    if (name === 'Russia') return 'RUS';
    if (name === 'Mexico') return 'MEX';
    if (name === 'Indonesia') return 'IDN';
    if (name === 'Turkey') return 'TUR';
    if (name === 'Israel') return 'ISR';
    if (name === 'Venezuela') return 'VEN';
    return '';
  };

  useEffect(() => {
    if (!svgRef.current || mapLoadedRef.current) return;
    
    const svg = d3.select(svgRef.current);
    const width = 1000;
    const height = 500;
    const projection = d3.geoNaturalEarth1().scale(175).translate([width / 2, height / 2]);
    const path = d3.geoPath().projection(projection);

    const defs = svg.append("defs");
    const filter = defs.append("filter").attr("id", "neonGlow").attr("x", "-50%").attr("y", "-50%").attr("width", "200%").attr("height", "200%");
    filter.append("feGaussianBlur").attr("stdDeviation", "2.5").attr("result", "blur");
    filter.append("feComposite").attr("in", "SourceGraphic").attr("in2", "blur").attr("operator", "over");

    d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json').then((topoData: any) => {
      const countries = feature(topoData, topoData.objects.countries);
      const mapG = svg.append('g').attr('class', 'map-layer');

      mapG.selectAll('path')
        .data((countries as any).features)
        .enter()
        .append('path')
        .attr('d', path as any)
        .attr('class', 'country-path')
        .attr('fill', '#0a0a0a')
        .attr('stroke', '#1a1a1a')
        .attr('stroke-width', 0.5);

      mapLoadedRef.current = true;
    });
  }, []);

  useEffect(() => {
    if (!mapLoadedRef.current || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const colorScale = d3.scaleLinear<string>().domain([-1, 0, 1]).range(['#ef4444', '#0c0c0c', '#4ade80']); 

    svg.selectAll('.country-path')
      .transition().duration(500)
      .attr('fill', (d: any) => {
        const iso = getISO(d.properties.name);
        const cData = liveData[iso];
        return cData ? colorScale(cData.performanceScore) : '#0a0a0a';
      })
      .attr('stroke', (d: any) => {
        const iso = getISO(d.properties.name);
        return liveData[iso] ? '#4ade80' : '#1a1a1a';
      });

    svg.selectAll('.country-path')
      .style('cursor', (d: any) => liveData[getISO(d.properties.name)] ? 'pointer' : 'default')
      .on('mouseover', function(event, d: any) {
        const iso = getISO(d.properties.name);
        const cData = liveData[iso];
        if (cData) {
          d3.select(this)
            .raise() 
            .attr('stroke', '#ffffff')
            .attr('stroke-width', 1.5)
            .style('filter', 'url(#neonGlow)');
          setHoveredCountry(cData);
        }
      })
      .on('mouseout', function(event, d: any) {
        const iso = getISO(d.properties.name);
        const cData = liveData[iso];
        d3.select(this)
          .attr('stroke', cData ? '#4ade80' : '#1a1a1a')
          .attr('stroke-width', 0.5)
          .style('filter', null);
        setHoveredCountry(null);
      })
      .on('click', (event, d: any) => {
         const iso = getISO(d.properties.name);
         if (liveData[iso]) onCountryClick(iso);
      });

  }, [liveData]);

  const sortedTickers = useMemo(() => {
    return (Object.values(liveData) as CountryData[]).sort((a,b) => {
      const priority = ['IND', 'USA', 'CHN', 'RUS', 'ISR', 'VEN'];
      const aIdx = priority.indexOf(a.id);
      const bIdx = priority.indexOf(b.id);
      if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
      if (aIdx !== -1) return -1;
      if (bIdx !== -1) return 1;
      return b.rawPrice - a.rawPrice;
    });
  }, [liveData]);

  const sidebarContent = useMemo(() => {
    if (activeLayer === 'INDICES') {
      return sortedTickers.map(c => ({
        id: c.id,
        name: c.name,
        symbol: GLOBAL_INDEX_MAP[c.id],
        price: c.price,
        rawPrice: c.rawPrice,
        currency: c.currency,
        change: c.change,
        changeStr: c.changeStr
      }));
    }
    
    const key = activeLayer === 'REIT' ? 'REAL_ESTATE' : activeLayer;
    const stats = macroStats[key as keyof typeof macroStats] || [];
    
    return stats.map(s => ({
      id: s.symbol,
      name: s.symbol,
      symbol: s.symbol,
      price: s.price.toLocaleString(undefined, { minimumFractionDigits: 2 }),
      rawPrice: s.price,
      currency: s.currency,
      change: s.changePercent,
      changeStr: `${s.changePercent >= 0 ? '+' : ''}${s.changePercent.toFixed(2)}%`
    }));
  }, [activeLayer, sortedTickers, macroStats]);

  return (
    <div className="flex flex-col h-full bg-[#020202] font-mono text-terminal-green relative">
      {activeChart && (
        <StockChartModal 
          symbol={activeChart.symbol} 
          name={activeChart.name}
          currentPrice={activeChart.price}
          currency={activeChart.currency}
          changePercent={activeChart.change}
          onClose={() => setActiveChart(null)}
        />
      )}

      <div className="p-4 flex justify-between items-center border-b border-terminal-darkGreen/50 bg-black/90 z-10 shrink-0">
        <div className="flex items-center gap-3">
          <MapIcon size={20} className="text-terminal-green" />
          <h2 className="text-[10px] font-black tracking-[0.4em] uppercase">Global_Asset_Sentinel_v6.5</h2>
        </div>
        
        <div className="flex bg-[#0a0a0a] border border-terminal-darkGreen/30 p-1">
          {[
            { id: 'INDICES', icon: <Activity size={12}/> },
            { id: 'EQUITIES', icon: <Briefcase size={12}/> },
            { id: 'ETFS', icon: <Layers size={12}/> },
            { id: 'BONDS', icon: <Landmark size={12}/> },
            { id: 'REIT', icon: <Home size={12}/> }
          ].map(layer => (
            <button 
              key={layer.id}
              onClick={() => setActiveLayer(layer.id as any)}
              className={`px-3 py-1 text-[9px] font-black flex items-center gap-2 border transition-all ${activeLayer === layer.id ? 'bg-terminal-green text-black border-terminal-green' : 'text-gray-500 border-transparent hover:text-white'}`}
            >
              {layer.icon} {layer.id}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-6 text-[9px] font-black uppercase tracking-widest">
          {loading && <div className="flex items-center gap-2 text-terminal-dim animate-pulse"><RefreshCw size={12} className="animate-spin" /> SYNCING_GLOBAL_NODES...</div>}
        </div>
      </div>

      <div className="flex-1 relative flex overflow-hidden">
        <div className="flex-1 flex flex-col">
          {/* Ticker Tape */}
          <div className="h-14 border-b border-terminal-darkGreen/20 flex divide-x divide-terminal-darkGreen/20 overflow-x-auto no-scrollbar bg-black/40">
            {macroStats.ETFS.map(s => (
              <div key={s.symbol} className="px-6 flex flex-col justify-center min-w-[140px] border-r border-terminal-darkGreen/10">
                <span className="text-[8px] text-gray-500 font-black uppercase">{s.symbol}</span>
                <div className="flex justify-between items-baseline gap-2">
                  <span className="text-xs font-bold text-white">{CURRENCY_SYMBOLS[s.currency] || '$'}{s.price.toFixed(2)}</span>
                  <span className={`text-[9px] font-black ${s.changePercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>{s.changePercent >= 0 ? '+' : ''}{s.changePercent.toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex-1 flex items-center justify-center p-4 bg-[#010101] overflow-hidden">
            <svg ref={svgRef} viewBox="0 0 1000 500" className="w-full h-auto max-h-full"></svg>
          </div>
        </div>

        {/* Unified Right Panel */}
        <div className="w-96 bg-black/95 border-l border-terminal-darkGreen/50 flex flex-col p-6 space-y-6 backdrop-blur-sm relative z-50 overflow-hidden">
           <div className="border-2 border-terminal-green/20 p-5 bg-black relative shrink-0">
              <div className="absolute top-0 right-0 bg-terminal-green/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-tighter border-l border-b border-terminal-green/20 text-terminal-dim">NODE_L2</div>
              <h3 className="text-[10px] font-black text-terminal-green mb-5 uppercase tracking-[0.2em] flex items-center gap-2 border-b border-terminal-darkGreen/20 pb-2">
                <Globe size={14}/> GEOSPATIAL_INTEL
              </h3>
              {hoveredCountry ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
                  <div>
                    <div className="text-[8px] text-gray-600 font-black uppercase tracking-tighter">Country_Authority</div>
                    <div className="text-xl font-black text-white terminal-glow">{hoveredCountry.name}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-terminal-darkGreen/5 p-2 border border-terminal-darkGreen/20">
                      <div className="text-[7px] text-gray-500 font-black uppercase">Primary_Idx</div>
                      <div className="text-[11px] font-bold text-terminal-green truncate">{hoveredCountry.index}</div>
                    </div>
                    <div className="bg-terminal-darkGreen/5 p-2 border border-terminal-darkGreen/20">
                      <div className="text-[7px] text-gray-500 font-black uppercase">24h_Delta</div>
                      <div className={`text-[11px] font-black flex items-center gap-1 ${hoveredCountry.change >= 0 ? 'text-green-400' : 'text-red-500'}`}>
                        {hoveredCountry.changeStr}
                      </div>
                    </div>
                  </div>
                  <div className="p-3 bg-terminal-green/5 border border-terminal-green/20">
                    <div className="text-[7px] text-gray-600 font-black uppercase mb-1">CURRENT_PX</div>
                    <div className="text-lg font-black text-white tabular-nums">{CURRENCY_SYMBOLS[hoveredCountry.currency] || '$'}{hoveredCountry.price}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => onCountryClick(hoveredCountry.id)} className="flex-1 py-2 bg-terminal-green text-black text-[10px] font-black uppercase hover:bg-white transition-all shadow-[0_0_15px_rgba(74,222,128,0.2)]">
                      REGION_SCAN
                    </button>
                    <button onClick={() => setActiveChart({ symbol: GLOBAL_INDEX_MAP[hoveredCountry.id], name: hoveredCountry.index, price: hoveredCountry.rawPrice, currency: hoveredCountry.currency, change: hoveredCountry.change })} className="p-2 border border-terminal-green text-terminal-green hover:bg-terminal-green hover:text-black transition-all">
                      <Activity size={16} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center py-6 gap-4">
                  <div className="w-10 h-10 border border-dashed border-terminal-darkGreen rounded-full flex items-center justify-center animate-pulse">
                    <Search size={18} className="text-terminal-darkGreen" />
                  </div>
                  <div className="text-[9px] text-gray-700 italic text-center uppercase font-black tracking-[0.3em]">
                    [ AWAITING_NODE_SELECTION ]
                  </div>
                </div>
              )}
           </div>

           <div className="flex-1 overflow-hidden flex flex-col min-h-0">
              <div className="text-[9px] font-black uppercase tracking-widest text-gray-600 border-b border-terminal-darkGreen/20 pb-2 mb-2 flex justify-between items-center">
                <span>GLOBAL_{activeLayer}_SENTINEL</span>
                <span className="text-[8px] opacity-40">{sidebarContent.length} NODES_SYNCED</span>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2">
                 {sidebarContent.map((item: any) => (
                   <div 
                    key={item.id} 
                    className="flex justify-between items-center p-3 bg-black border border-terminal-darkGreen/10 hover:border-terminal-green/30 transition-all cursor-pointer group" 
                    onClick={() => setActiveChart({ symbol: item.symbol, name: item.name, price: item.rawPrice, currency: item.currency, change: item.change })}
                   >
                      <div className="flex items-center gap-3">
                        <div className={`w-1 h-8 ${item.change >= 0 ? 'bg-green-500' : 'bg-red-500'} opacity-20 group-hover:opacity-100 transition-opacity`}></div>
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black text-gray-600">{item.id.slice(0, 5)}</span>
                          <span className={`text-[11px] font-bold uppercase truncate w-32 ${['IND', 'ISR', 'VEN'].includes(item.id) ? 'text-terminal-green' : 'text-white'}`}>{item.name}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[11px] font-bold text-white tabular-nums">{CURRENCY_SYMBOLS[item.currency] || '$'}{item.price}</span>
                        <span className={`text-[9px] font-black tabular-nums flex items-center gap-1 ${item.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                           {item.changeStr}
                        </span>
                      </div>
                   </div>
                 ))}
                 {sidebarContent.length === 0 && !loading && (
                    <div className="text-[9px] text-center text-gray-800 uppercase font-black py-20 italic">No_Assets_In_Buffer</div>
                 )}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};