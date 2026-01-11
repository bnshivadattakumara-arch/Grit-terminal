import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { EnrichedTicker, MarketSector } from '../types';
import { Radar, Zap, BrainCircuit, Activity, Info, BarChart3, TrendingUp, TrendingDown, Target, Box, ZapIcon } from 'lucide-react';

interface NarrativePulseProps {
  tickers: EnrichedTicker[];
}

interface SectorNode {
  id: MarketSector;
  value: number; // Volume
  count: number;
  avgChange: number;
  sentiment: number; // -1 to 1
  dominance: number; // % of total market volume
  maxPerfAsset: string;
  maxPerfVal: number;
}

export const NarrativePulse: React.FC<NarrativePulseProps> = ({ tickers }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedSector, setSelectedSector] = useState<MarketSector | null>(null);

  const sectorData = useMemo(() => {
    const totalMarketVolume = tickers.reduce((acc, t) => acc + parseFloat(t.quoteVolume), 0);
    const sectors: Record<MarketSector, { volume: number, count: number, totalChange: number, bestAsset: string, bestVal: number }> = {
      'AI_AGENTS': { volume: 0, count: 0, totalChange: 0, bestAsset: '', bestVal: -Infinity },
      'AI_INFRA': { volume: 0, count: 0, totalChange: 0, bestAsset: '', bestVal: -Infinity },
      'DEPIN_COMPUTE': { volume: 0, count: 0, totalChange: 0, bestAsset: '', bestVal: -Infinity },
      'DEPIN_IOT': { volume: 0, count: 0, totalChange: 0, bestAsset: '', bestVal: -Infinity },
      'EVM_L1': { volume: 0, count: 0, totalChange: 0, bestAsset: '', bestVal: -Infinity },
      'ALT_L1': { volume: 0, count: 0, totalChange: 0, bestAsset: '', bestVal: -Infinity },
      'MODULAR_L1': { volume: 0, count: 0, totalChange: 0, bestAsset: '', bestVal: -Infinity },
      'ZK_L2': { volume: 0, count: 0, totalChange: 0, bestAsset: '', bestVal: -Infinity },
      'OP_L2': { volume: 0, count: 0, totalChange: 0, bestAsset: '', bestVal: -Infinity },
      'INTEROP_L2': { volume: 0, count: 0, totalChange: 0, bestAsset: '', bestVal: -Infinity },
      'ETH_MEME': { volume: 0, count: 0, totalChange: 0, bestAsset: '', bestVal: -Infinity },
      'SOL_MEME': { volume: 0, count: 0, totalChange: 0, bestAsset: '', bestVal: -Infinity },
      'RWA': { volume: 0, count: 0, totalChange: 0, bestAsset: '', bestVal: -Infinity },
      'LSD_DEFI': { volume: 0, count: 0, totalChange: 0, bestAsset: '', bestVal: -Infinity },
      'DEX_AMM': { volume: 0, count: 0, totalChange: 0, bestAsset: '', bestVal: -Infinity },
      'GAMING_INFRA': { volume: 0, count: 0, totalChange: 0, bestAsset: '', bestVal: -Infinity }
    };

    tickers.forEach(t => {
      const s = t.sector || 'ALT_L1';
      if (!sectors[s]) return;
      
      const vol = parseFloat(t.quoteVolume);
      const chg = parseFloat(t.priceChangePercent);
      
      sectors[s].volume += vol;
      sectors[s].count += 1;
      sectors[s].totalChange += chg;
      
      if (chg > sectors[s].bestVal) {
        sectors[s].bestVal = chg;
        sectors[s].bestAsset = t.baseAsset;
      }
    });

    return (Object.entries(sectors) as [MarketSector, any][]).map(([id, data]) => ({
      id: id,
      value: data.volume || 1, // Fallback for D3 circle pack
      count: data.count,
      avgChange: data.totalChange / (data.count || 1),
      sentiment: Math.min(1, Math.max(-1, (data.totalChange / (data.count || 1)) / 10)),
      dominance: (data.volume / totalMarketVolume) * 100,
      maxPerfAsset: data.bestAsset,
      maxPerfVal: data.bestVal
    })) as SectorNode[];
  }, [tickers]);

  useEffect(() => {
    if (!svgRef.current || sectorData.length === 0) return;

    const width = 800;
    const height = 550;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const root = d3.pack<SectorNode>()
      .size([width - 40, height - 40])
      .padding(8)(d3.hierarchy({ children: sectorData } as any).sum(d => Math.sqrt(d.value)));

    const colorScale = d3.scaleLinear<string>()
      .domain([-1.5, 0, 1.5])
      .range(['#ef4444', '#1f2937', '#4ade80']);

    const node = svg.selectAll(".node")
      .data(root.leaves())
      .enter().append("g")
      .attr("class", "node")
      .attr("transform", d => `translate(${d.x},${d.y})`)
      .style("cursor", "pointer")
      .on("click", (e, d) => setSelectedSector(d.data.id));

    // Glow Filter
    const defs = svg.append("defs");
    const filter = defs.append("filter").attr("id", "sectorGlow");
    filter.append("feGaussianBlur").attr("stdDeviation", "4").attr("result", "blur");
    filter.append("feComposite").attr("in", "SourceGraphic").attr("in2", "blur").attr("operator", "over");

    node.append("circle")
      .attr("r", d => d.r)
      .attr("fill", d => colorScale(d.data.sentiment))
      .attr("stroke", d => Math.abs(d.data.sentiment) > 0.4 ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.1)")
      .attr("stroke-width", 2)
      .attr("class", "transition-all duration-500 hover:stroke-white hover:stroke-[3px]")
      .style("filter", d => Math.abs(d.data.sentiment) > 0.6 ? "url(#sectorGlow)" : "none");

    node.append("text")
      .attr("dy", "-0.2em")
      .style("text-anchor", "middle")
      .style("font-size", d => Math.max(8, d.r / 3.5) + "px")
      .style("font-weight", "900")
      .style("fill", "white")
      .style("pointer-events", "none")
      .style("text-transform", "uppercase")
      .style("text-shadow", "0 2px 4px rgba(0,0,0,0.8)")
      .text(d => d.data.id.split('_')[0]);

    node.append("text")
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .style("font-size", d => Math.max(6, d.r / 5) + "px")
      .style("font-weight", "700")
      .style("fill", "rgba(255,255,255,0.6)")
      .style("pointer-events", "none")
      .text(d => d.data.id.split('_')[1] || '');

    node.append("text")
      .attr("dy", "2.8em")
      .style("text-anchor", "middle")
      .style("font-size", d => Math.max(5, d.r / 6) + "px")
      .style("font-weight", "900")
      .style("fill", d => d.data.avgChange >= 0 ? "#4ade80" : "#ef4444")
      .style("pointer-events", "none")
      .text(d => `${d.data.avgChange >= 0 ? '+' : ''}${d.data.avgChange.toFixed(1)}%`);

  }, [sectorData]);

  const selectedSectorStats = useMemo(() => {
    if (!selectedSector) return null;
    return sectorData.find(s => s.id === selectedSector);
  }, [selectedSector, sectorData]);

  return (
    <div className="flex flex-col h-full bg-[#020202] font-mono text-terminal-green overflow-hidden relative">
      <div className="p-4 border-b border-terminal-darkGreen/50 bg-black/80 flex justify-between items-center z-20 shrink-0">
        <div className="flex items-center gap-4">
          <Radar size={20} className="text-terminal-dim animate-pulse" />
          <h2 className="text-sm font-black text-terminal-contrast uppercase tracking-[0.4em]">GRANULAR_NARRATIVE_ENGINE_v6.0</h2>
        </div>
        <div className="flex items-center gap-6">
           <div className="flex items-center gap-2 bg-terminal-darkGreen/10 px-3 py-1 border border-terminal-darkGreen/40">
              <Activity size={14} className="text-terminal-green" />
              <span className="text-[9px] font-black uppercase tracking-widest">NARRATIVE_SYNC: 100%</span>
           </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* MAIN VISUALIZATION HUB */}
        <div className="flex-1 relative flex items-center justify-center p-4 bg-[#010101]">
          <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(#14532d 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
          <svg ref={svgRef} width="800" height="550" viewBox="0 0 800 550" className="max-w-full h-auto drop-shadow-2xl z-10"></svg>
          
          <div className="absolute bottom-6 left-6 p-4 bg-black/80 border border-terminal-darkGreen/20 backdrop-blur-md z-20 max-w-xs">
             <div className="text-[10px] font-black text-terminal-dim uppercase mb-2 flex items-center gap-2">
                <Info size={12} /> BUBBLE_PROTOCOL
             </div>
             <p className="text-[9px] text-gray-500 font-bold uppercase leading-relaxed">
                Bubble radius derived from square root of aggregate volume. Color intensity reflects average 24h delta. Select any node for forensic breakdown.
             </p>
          </div>
        </div>

        {/* INTELLIGENCE DRILL-DOWN */}
        <div className="w-full lg:w-[420px] border-l border-terminal-darkGreen/30 bg-black/60 flex flex-col shrink-0">
           <div className="p-4 bg-black/80 border-b border-terminal-darkGreen/20 flex justify-between items-center">
              <div className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                 <BrainCircuit size={16} className="text-terminal-green" /> NARRATIVE_FORENSICS
              </div>
              {selectedSectorStats && (
                <button onClick={() => setSelectedSector(null)} className="text-[8px] font-black text-gray-600 hover:text-white uppercase">{"[ Reset_Scan ]"}</button>
              )}
           </div>

           <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-8">
              {selectedSectorStats ? (
                <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-8">
                   <div className="flex justify-between items-start">
                      <div className="space-y-1">
                         <h3 className="text-2xl font-black text-white tracking-tighter uppercase leading-none">{selectedSectorStats.id.replace('_', ' ')}</h3>
                         <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest block">{selectedSectorStats.count} NETWORK_NODES</span>
                      </div>
                      <div className={`px-4 py-2 border font-black text-lg tabular-nums ${selectedSectorStats.avgChange >= 0 ? 'bg-green-950/20 text-green-500 border-green-500/30' : 'bg-red-950/20 text-red-500 border-red-500/30'}`}>
                        {selectedSectorStats.avgChange >= 0 ? '+' : ''}{selectedSectorStats.avgChange.toFixed(2)}%
                      </div>
                   </div>

                   <div className="space-y-6">
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase">
                           <span className="text-gray-600">SECTOR_VOLUME</span>
                           <span className="text-white">${(selectedSectorStats.value / 1e9).toFixed(2)}B</span>
                        </div>
                        <div className="h-1.5 bg-gray-900 overflow-hidden border border-terminal-darkGreen/10">
                           <div className="h-full bg-terminal-green shadow-[0_0_10px_rgba(74,222,128,0.4)]" style={{ width: `${Math.min(100, selectedSectorStats.dominance * 5)}%` }}></div>
                        </div>
                        <div className="flex justify-between text-[8px] font-black uppercase text-gray-700">
                          <span>MARKET_DOMINANCE</span>
                          <span>{selectedSectorStats.dominance.toFixed(2)}%</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-black/40 border border-terminal-darkGreen/20">
                           <div className="text-[8px] text-gray-600 font-black uppercase mb-1">TOP_OUTPERFORMER</div>
                           <div className="text-sm font-black text-terminal-dim uppercase">{selectedSectorStats.maxPerfAsset}</div>
                           <div className="text-[10px] font-bold text-green-500 tabular-nums">+{selectedSectorStats.maxPerfVal.toFixed(1)}%</div>
                        </div>
                        <div className="p-3 bg-black/40 border border-terminal-darkGreen/20">
                           <div className="text-[8px] text-gray-600 font-black uppercase mb-1">SENTIMENT_BIAS</div>
                           <div className={`text-sm font-black uppercase ${selectedSectorStats.sentiment >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {selectedSectorStats.sentiment >= 0.3 ? 'STRONG_BULL' : selectedSectorStats.sentiment >= 0 ? 'NEUTRAL_UP' : 'BEARISH'}
                           </div>
                           <div className="h-1 bg-gray-800 mt-1.5">
                              <div className={`h-full ${selectedSectorStats.sentiment >= 0 ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${Math.abs(selectedSectorStats.sentiment) * 100}%` }}></div>
                           </div>
                        </div>
                      </div>
                   </div>

                   <div className="pt-6 border-t border-terminal-darkGreen/20">
                      <div className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">
                        <Target size={14}/> HIGH_LIQUIDITY_CORRIDORS
                      </div>
                      <div className="space-y-2">
                        {tickers
                          .filter(t => t.sector === selectedSector)
                          .sort((a,b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
                          .slice(0, 8)
                          .map(t => (
                          <div key={t.symbol} className="flex justify-between items-center p-3 bg-black/60 border border-terminal-darkGreen/10 hover:border-terminal-dim/40 transition-all group">
                             <div className="flex flex-col">
                                <span className="text-[12px] font-black text-white group-hover:text-terminal-dim">{t.baseAsset}</span>
                                <span className="text-[8px] text-gray-600 font-bold uppercase tabular-nums tracking-tighter">VOLUME: ${(parseFloat(t.quoteVolume)/1e6).toFixed(1)}M</span>
                             </div>
                             <div className="text-right">
                               <div className={`text-[11px] font-black tabular-nums ${parseFloat(t.priceChangePercent) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                 {parseFloat(t.priceChangePercent) >= 0 ? '+' : ''}{t.priceChangePercent}%
                               </div>
                               <div className="text-[7px] text-gray-800 font-black uppercase">24H_DELTA</div>
                             </div>
                          </div>
                        ))}
                      </div>
                   </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-10 py-20">
                   <div className="relative">
                      <Radar size={64} className="text-terminal-darkGreen animate-ping opacity-20" />
                      <Box size={32} className="text-terminal-dim absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                   </div>
                   <div className="max-w-[240px]">
                      <h4 className="text-[12px] font-black text-white uppercase tracking-[0.4em] mb-4">Awaiting_Sector_Focus</h4>
                      <div className="space-y-4">
                        <p className="text-[10px] text-gray-600 font-black leading-relaxed uppercase">
                          Select a narrative node from the grid field to initiate forensic drill-down across 16 sub-sectors.
                        </p>
                        <div className="grid grid-cols-3 gap-2 opacity-30">
                           <div className="h-1 bg-terminal-darkGreen"></div>
                           <div className="h-1 bg-terminal-dim"></div>
                           <div className="h-1 bg-terminal-darkGreen"></div>
                        </div>
                      </div>
                   </div>
                </div>
              )}
           </div>
        </div>
      </div>

      <div className="h-10 bg-black border-t border-terminal-darkGreen/30 px-6 flex items-center justify-between text-[8px] text-gray-700 font-black uppercase tracking-[0.5em] shrink-0">
         <div className="flex items-center gap-8">
            <span className="flex items-center gap-2"><Target size={10} /> TARGETS: 16 SUB_SECTORS</span>
            <span className="flex items-center gap-2"><ZapIcon size={10} className="text-terminal-dim" /> LATEST_ROTATION: SOL_MEME_ACCELERATING</span>
         </div>
         <span className="animate-pulse">KERNEL_STABLE // NARRATIVE_PULSE_LINKED</span>
      </div>
    </div>
  );
};