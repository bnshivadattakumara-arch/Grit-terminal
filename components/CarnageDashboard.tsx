import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Liquidation } from '../types';
import { Activity, Zap, Skull, TrendingDown, Crosshair, BarChart3, List, Globe, Box, Info, Radiation } from 'lucide-react';

interface CarnageDashboardProps {
  liquidations: Liquidation[];
  sessionTotalUsd: number;
  sessionCount: number;
}

type CarnageSubTab = 'LIVE_FEED' | 'SPATIAL_MAP';

/**
 * Threshold color mapping logic for the Feed
 */
const getIntensityMetrics = (value: number) => {
  if (value >= 1000000) return { color: 'text-white', bg: 'bg-white/20', border: 'border-white', label: 'GODZILLA', glow: 'shadow-[0_0_30px_rgba(255,255,255,0.6)]', anim: 'animate-pulse' };
  if (value >= 100000) return { color: 'text-orange-500', bg: 'bg-orange-950/40', border: 'border-orange-600', label: 'LEVIATHAN', glow: 'shadow-[0_0_20px_rgba(234,88,12,0.4)]', anim: 'animate-bounce' };
  if (value >= 50000) return { color: 'text-yellow-400', bg: 'bg-yellow-950/30', border: 'border-yellow-500', label: 'WHALE', glow: 'shadow-[0_0_15px_rgba(234,179,8,0.3)]', anim: '' };
  if (value >= 10000) return { color: 'text-red-400', bg: 'bg-red-950/20', border: 'border-red-500', label: 'SIGNIFICANT', glow: '', anim: '' };
  return { color: 'text-terminal-dim', bg: 'bg-transparent', border: 'border-transparent', label: 'MINOR', glow: '', anim: '' };
};

export const CarnageDashboard: React.FC<CarnageDashboardProps> = ({ liquidations, sessionTotalUsd, sessionCount }) => {
  const [activeSubTab, setActiveSubTab] = useState<CarnageSubTab>('SPATIAL_MAP');
  const scrollRef = useRef<HTMLDivElement>(null);

  const assetCarnage = useMemo(() => {
    const assets: Record<string, number> = {};
    liquidations.forEach(l => {
      assets[l.symbol] = (assets[l.symbol] || 0) + l.usdValue;
    });
    return Object.entries(assets)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 18);
  }, [liquidations]);

  const densityIndex = useMemo(() => {
    const now = Date.now();
    const recent = liquidations.filter(l => now - l.time < 60000);
    const sum = recent.reduce((acc, l) => acc + l.usdValue, 0);
    const score = (sum / 200000) * 10;
    return Math.min(100, Math.max(0, score)); 
  }, [liquidations]);

  const maxAssetVal = Math.max(...assetCarnage.map(([,v]) => v as number), 1);

  // Intensity Mapping Utility
  const getIntensityColor = (value: number) => {
    // Gradient: Green (10k) -> Yellow (100k) -> Orange (500k) -> Red (1M+)
    if (value < 20000) return { border: '#10b981', glow: 'rgba(16, 185, 129, 0.3)', text: '#10b981' };
    if (value < 100000) return { border: '#f59e0b', glow: 'rgba(245, 158, 11, 0.3)', text: '#f59e0b' };
    if (value < 500000) return { border: '#ef4444', glow: 'rgba(239, 68, 68, 0.4)', text: '#ef4444' };
    return { border: '#ffffff', glow: 'rgba(255, 255, 255, 0.6)', text: '#ffffff' };
  };

  const spatialData = useMemo(() => {
    const data: Record<string, { total: number, buyValue: number, sellValue: number, symbol: string }> = {};
    const now = Date.now();
    liquidations.filter(l => now - l.time < 900000).forEach(l => {
      if (!data[l.symbol]) {
        data[l.symbol] = { total: 0, buyValue: 0, sellValue: 0, symbol: l.symbol };
      }
      data[l.symbol].total += l.usdValue;
      if (l.side === 'BUY') data[l.symbol].buyValue += l.usdValue;
      else data[l.symbol].sellValue += l.usdValue;
    });
    return Object.values(data).sort((a, b) => b.total - a.total);
  }, [liquidations]);

  return (
    <div className="flex flex-col h-full bg-[#020202] text-terminal-green font-mono overflow-hidden relative">
      {/* CRT SCANLINES EFFECT */}
      <div className="absolute inset-0 pointer-events-none z-50 opacity-[0.03] bg-[linear-gradient(to_bottom,transparent_50%,black_50%)] bg-[length:100%_4px]"></div>
      
      {/* HUD HEADER */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border-b-2 border-terminal-darkGreen bg-black/50 z-10 shrink-0">
        <div className="p-4 border-r border-terminal-darkGreen flex justify-between items-center group">
          <div className="space-y-0.5">
             <div className="text-[9px] text-gray-500 uppercase tracking-[0.4em] font-black">CARNAGE_DENSITY_INDEX</div>
             <div className={`text-3xl font-black transition-colors flex items-baseline gap-2 tabular-nums terminal-glow ${densityIndex > 5 ? 'text-red-500' : 'text-terminal-green'}`}>
               {densityIndex.toFixed(1)} <span className="text-[10px] text-terminal-dim">CDX</span>
             </div>
          </div>
          <Activity size={32} className={`text-terminal-darkGreen transition-all duration-300 ${densityIndex > 5 ? 'text-red-600 animate-pulse scale-110' : 'group-hover:text-terminal-green'}`} />
        </div>
        
        <div className="p-4 border-r border-terminal-darkGreen flex justify-between items-center bg-black">
          <div className="space-y-0.5">
            <div className="text-[9px] text-gray-500 uppercase tracking-[0.4em] font-black">SESSION_RECKONING</div>
            <div className={`text-3xl font-black tabular-nums transition-all ${sessionTotalUsd > 100000 ? 'text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'text-terminal-green'}`}>
              ${(sessionTotalUsd / 1000).toFixed(1)}K
            </div>
          </div>
          <div className="text-right">
            <div className="text-[8px] text-gray-600 font-bold tracking-widest uppercase">EVENT_COUNT</div>
            <div className="text-xl font-black text-white tabular-nums">{sessionCount}</div>
          </div>
        </div>

        <div className="p-4 flex justify-between items-center bg-black/30">
          <div className="w-full">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[9px] text-gray-500 font-black uppercase tracking-[0.4em]">THRESHOLD_ACTIVITY</span>
              <div className="flex items-center gap-2">
                 <div className={`h-1.5 w-1.5 rounded-full ${densityIndex > 15 ? 'bg-red-500 animate-ping' : 'bg-terminal-darkGreen'}`}></div>
                 <span className={`text-[9px] font-black ${densityIndex > 15 ? 'text-red-500' : 'text-terminal-darkGreen'}`}>
                    {densityIndex > 15 ? 'CRITICAL' : 'STABLE'}
                 </span>
              </div>
            </div>
            <div className="flex gap-0.5 h-8 items-end">
               {Array.from({ length: 60 }).map((_, i) => {
                 const sliceSize = Math.ceil(liquidations.length / 60) || 1;
                 const slice = liquidations.slice(i * sliceSize, (i + 1) * sliceSize);
                 const vol = slice.reduce((acc, l) => acc + l.usdValue, 0);
                 const height = Math.min(100, (vol / 40000) * 100);
                 return (
                   <div 
                     key={i} 
                     className={`flex-1 transition-all duration-300 ${height > 40 ? 'bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.5)]' : 'bg-terminal-green/20'}`}
                     style={{ height: `${Math.max(5, height)}%` }}
                   ></div>
                 );
               })}
            </div>
          </div>
        </div>
      </div>

      {/* SUB-NAVIGATION TAB BAR */}
      <div className="bg-[#080808] border-b border-terminal-darkGreen flex items-center px-4 shrink-0 z-20">
         <button 
           onClick={() => setActiveSubTab('LIVE_FEED')}
           className={`px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 border-b-2 ${activeSubTab === 'LIVE_FEED' ? 'border-terminal-green text-terminal-green bg-terminal-green/5' : 'border-transparent text-gray-600 hover:text-white'}`}
         >
           <List size={14} /> LIVE_FEED
         </button>
         <button 
           onClick={() => setActiveSubTab('SPATIAL_MAP')}
           className={`px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 border-b-2 ${activeSubTab === 'SPATIAL_MAP' ? 'border-terminal-green text-terminal-green bg-terminal-green/5' : 'border-transparent text-gray-600 hover:text-white'}`}
         >
           <Globe size={14} /> SPATIAL_MAP
         </button>
         <div className="ml-auto flex items-center gap-4">
            <span className="text-[9px] text-gray-700 font-bold uppercase tracking-widest hidden sm:inline">ENTROPY_FIELD_STABLE</span>
         </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {activeSubTab === 'LIVE_FEED' ? (
          <div className="flex-1 bg-black flex flex-col overflow-hidden relative border-b border-terminal-darkGreen">
            <div className="p-2 border-b border-terminal-darkGreen flex justify-between items-center bg-[#050505]">
              <div className="flex items-center gap-3">
                 <Crosshair size={14} className="text-red-600 animate-pulse" />
                 <div className="flex flex-col">
                    <span className="text-[10px] font-black tracking-[0.4em] text-white">LIVE_LIQUIDATION_CONDUIT</span>
                    <span className="text-[8px] text-gray-600 font-bold uppercase">SECURE_SYNC_STABLE // COLOR_CODED_INTENSITY</span>
                 </div>
              </div>
            </div>
            
            <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar bg-[#010101] relative">
              <table className="w-full text-left border-collapse">
                 <thead className="sticky top-0 bg-black/95 text-[9px] text-gray-500 font-black uppercase tracking-[0.4em] border-b border-terminal-darkGreen/40 z-20">
                   <tr>
                      <th className="p-3 pl-6">ASSET_NODE</th>
                      <th className="p-3">VENUE_ORIGIN</th>
                      <th className="p-3">RECKONING_TYPE</th>
                      <th className="p-3">PRICE_INDEX</th>
                      <th className="p-3 text-right pr-6">VALUE_USD</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-terminal-darkGreen/10 font-mono">
                   {liquidations.map((liq, idx) => {
                     const metrics = getIntensityMetrics(liq.usdValue);
                     return (
                       <tr 
                        key={`${liq.time}-${idx}`} 
                        className={`
                          ${metrics.bg} transition-all duration-150 border-l-2 
                          ${metrics.border !== 'border-transparent' ? metrics.border : (liq.side === 'BUY' ? 'hover:border-red-600' : 'hover:border-green-600')}
                          ${metrics.glow} group relative
                        `}
                      >
                          <td className="p-2 pl-6">
                            <div className={`font-black text-sm tracking-tight flex items-center gap-2 ${metrics.color}`}>
                              {metrics.anim === 'animate-pulse' && <Skull size={12} className="shrink-0" />}
                              {liq.symbol}
                            </div>
                          </td>
                          <td className="p-2">
                            <div className={`text-[9px] font-bold tracking-wider uppercase ${metrics.color.includes('terminal-dim') ? 'text-gray-600' : metrics.color}`}>
                              {liq.exchange}
                            </div>
                          </td>
                          <td className="p-2">
                            <span className={`font-black text-[9px] px-2 py-0.5 border ${liq.side === 'BUY' ? 'bg-red-950/20 text-red-500 border-red-500/30' : 'bg-green-950/20 text-green-500 border-green-500/30'}`}>
                              {metrics.label !== 'STANDARD' && metrics.label !== 'MINOR' ? metrics.label : (liq.side === 'BUY' ? 'SHORT_LIQ' : 'LONG_LIQ')}
                            </span>
                          </td>
                          <td className={`p-2 font-bold text-xs tabular-nums ${metrics.color}`}>
                            {parseFloat(liq.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                          </td>
                          <td className={`p-2 text-right pr-6 font-black tabular-nums text-sm group-hover:scale-105 transition-transform ${metrics.color} ${metrics.anim}`}>
                            ${liq.usdValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </td>
                       </tr>
                     );
                   })}
                 </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="flex-1 bg-black relative overflow-hidden group">
             {/* DUAL LAYER GRID DOTS */}
             <div className="absolute inset-0 opacity-[0.05]" 
                  style={{ 
                    backgroundImage: 'radial-gradient(#14532d 1px, transparent 1px)', 
                    backgroundSize: '30px 30px' 
                  }}>
             </div>
             
             {/* SCANNER LINE EFFECT */}
             <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="w-full h-[2px] bg-terminal-green/10 shadow-[0_0_20px_rgba(74,222,128,0.2)] absolute top-0 animate-scanner"></div>
             </div>
             
             <div className="absolute top-8 left-8 z-10 flex flex-col gap-2">
                <div className="text-[10px] text-terminal-green font-black uppercase tracking-[0.5em] flex items-center gap-2">
                  <Radiation size={12} className="animate-spin-slow" /> SPATIAL_INTENSITY_FIELD [CLUSTER_v3.1]
                </div>
                <div className="flex items-center gap-4 bg-black/60 backdrop-blur-md px-3 py-1.5 border border-terminal-darkGreen/50">
                   <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> <span className="text-[8px] font-black text-gray-400 tracking-tighter">LOW [20K]</span></div>
                   <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-500"></div> <span className="text-[8px] font-black text-gray-400 tracking-tighter">MID [100K]</span></div>
                   <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500"></div> <span className="text-[8px] font-black text-gray-400 tracking-tighter">HIGH [500K]</span></div>
                   <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-white animate-pulse"></div> <span className="text-[8px] font-black text-gray-400 tracking-tighter">CRITICAL [1M+]</span></div>
                </div>
             </div>

             <div className="relative w-full h-full p-20 flex items-center justify-center">
                {spatialData.map((asset, idx) => {
                  const intensity = getIntensityColor(asset.total);
                  const isCritical = asset.total > 1000000;
                  
                  // Bubble scaling logic
                  const size = Math.min(260, Math.max(50, Math.log10(asset.total) * 40));

                  // Position logic
                  const getPos = (str: string, seed: number) => {
                    let hash = 0;
                    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
                    return Math.abs(Math.sin(hash + seed) * 80 + 10);
                  };

                  const left = getPos(asset.symbol, 1);
                  const top = getPos(asset.symbol, 2);
                  const driftX = Math.sin(Date.now() / 3000 + idx) * 10;
                  const driftY = Math.cos(Date.now() / 3500 + idx) * 10;

                  return (
                    <div 
                      key={asset.symbol}
                      className={`absolute flex flex-col items-center justify-center transition-all duration-1000 rounded-full border-2 select-none cursor-pointer group/node backdrop-blur-[2px]`}
                      style={{ 
                        left: `${left}%`, 
                        top: `${top}%`, 
                        width: `${size}px`, 
                        height: `${size}px`,
                        transform: `translate(-50%, -50%) translate(${driftX}px, ${driftY}px)`,
                        color: intensity.text,
                        borderColor: intensity.border,
                        backgroundColor: isCritical ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0,0,0,0.4)',
                        boxShadow: `0 0 40px ${intensity.glow}, inset 0 0 20px ${intensity.glow}`,
                        zIndex: Math.floor(asset.total)
                      }}
                    >
                      <div className="flex flex-col items-center justify-center p-2 text-center pointer-events-none">
                        <span className={`font-black uppercase tracking-widest leading-none ${size > 100 ? 'text-xl' : 'text-[11px]'}`}>
                          {asset.symbol}
                        </span>
                        <div className="h-[1px] w-full bg-current opacity-20 my-1"></div>
                        <span className={`font-black tabular-nums ${size > 100 ? 'text-[12px]' : 'text-[9px]'} brightness-125`}>
                          ${asset.total >= 1000000 ? (asset.total / 1000000).toFixed(1) + 'M' : (asset.total / 1000).toFixed(0) + 'K'}
                        </span>
                        {isCritical && <Skull size={size > 100 ? 18 : 12} className="mt-2 text-white animate-pulse" />}
                      </div>
                      
                      {/* Pulse Ring */}
                      {asset.total > 100000 && (
                        <div className="absolute inset-0 rounded-full border border-current animate-ping opacity-20 pointer-events-none" style={{ animationDuration: asset.total > 500000 ? '1.5s' : '3s' }}></div>
                      )}
                    </div>
                  );
                })}
             </div>
             
             {/* SPATIAL OVERLAY TOOLTIP */}
             <div className="absolute bottom-8 right-8 bg-black/80 border border-terminal-darkGreen p-3 text-[9px] font-black uppercase tracking-widest text-gray-500 backdrop-blur-md pointer-events-none">
                <div className="flex items-center gap-2 mb-1"><Info size={12} /> SPATIAL_METRICS</div>
                <p>INTENSITY_MAPPING: GRADIENT_ACTIVE</p>
                <p>DRIFT_COORDINATES: DYNAMIC</p>
                <p>LAST_RECKONING: {new Date().toLocaleTimeString()}</p>
             </div>
          </div>
        )}

        <div className="h-48 bg-[#030303] flex flex-col shrink-0 z-10 border-t border-terminal-darkGreen">
          <div className="px-4 py-2 border-b border-terminal-darkGreen bg-black/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingDown size={14} className="text-red-500" />
              <h3 className="text-[10px] font-black text-gray-400 tracking-[0.3em] uppercase">ASSET_CARNAGE_RANKING</h3>
            </div>
          </div>
          
          <div className="flex-1 overflow-x-auto custom-scrollbar-horizontal p-3">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 h-full">
              {assetCarnage.map(([asset, val], i) => {
                const metrics = getIntensityMetrics(val);
                return (
                  <div key={asset} className={`bg-black/40 border border-terminal-darkGreen/10 p-3 flex flex-col justify-between group hover:border-terminal-green/40 transition-colors ${metrics.bg} ${metrics.glow}`}>
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col">
                        <span className="text-[8px] text-gray-600 font-black">0{i+1}_NODE</span>
                        <span className={`text-xs font-black transition-colors ${metrics.color !== 'text-terminal-dim' ? metrics.color : 'text-white'}`}>{asset}</span>
                      </div>
                      <span className={`text-[10px] font-black tabular-nums ${metrics.color}`}>-${((val as number) / 1000).toFixed(1)}K</span>
                    </div>
                    <div className="mt-2 h-1 bg-gray-900 w-full overflow-hidden border border-terminal-darkGreen/10">
                      <div 
                        className={`h-full transition-all duration-1000 ${metrics.color.includes('terminal-dim') ? 'bg-red-600' : metrics.color.replace('text-', 'bg-')} shadow-[0_0_8px_rgba(220,38,38,0.4)]`} 
                        style={{ width: `${((val as number) / maxAssetVal) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .animate-scanner { animation: scanner 8s linear infinite; }
        .animate-spin-slow { animation: spin 12s linear infinite; }
        @keyframes scanner { 0% { top: 0; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { top: 100%; opacity: 0; } }
      `}</style>
    </div>
  );
};