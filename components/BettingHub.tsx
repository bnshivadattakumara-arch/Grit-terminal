
import React from 'react';
import { Trophy, ExternalLink, Globe, ShieldCheck } from 'lucide-react';

export const BettingHub: React.FC = () => {
  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-black border border-terminal-darkGreen shadow-2xl overflow-hidden animate-in fade-in duration-500">
      {/* HEADER HUD */}
      <div className="bg-black border-b border-terminal-darkGreen p-4 flex justify-between items-center z-20 shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-2 border-2 border-terminal-green bg-terminal-darkGreen/10">
             <Trophy size={24} className="text-terminal-green animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-black text-white uppercase tracking-[0.4em]">PREDICTION_MARKET_AGGREGATOR_v2.0</h2>
            <div className="flex items-center gap-3 mt-1">
               <span className="text-[9px] text-terminal-dim font-black uppercase">STATUS: EXTERNAL_CONDUIT_ESTABLISHED</span>
               <div className="w-1 h-1 rounded-full bg-terminal-green"></div>
               <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Protocol: Polymarket // Augur // Drift</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <a 
            href="https://prediction-market-aggregator.vercel.app/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 border border-terminal-darkGreen text-[10px] font-black text-gray-500 hover:text-white hover:border-terminal-green transition-all uppercase"
          >
            <ExternalLink size={14} /> Open_External
          </a>
        </div>
      </div>

      {/* IFRAME CONTAINER */}
      <div className="flex-1 bg-black relative">
        <div className="absolute inset-0 bg-terminal-green/5 pointer-events-none z-10 opacity-20"></div>
        <iframe 
          src="https://prediction-market-aggregator.vercel.app/" 
          className="w-full h-full border-none"
          title="Prediction Market Aggregator"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          loading="lazy"
        />
      </div>

      {/* FOOTER STATS */}
      <div className="h-10 bg-black border-t border-terminal-darkGreen/40 px-6 flex items-center justify-between text-[8px] text-gray-700 font-black uppercase tracking-[0.4em] shrink-0">
         <div className="flex items-center gap-8">
            <span className="flex items-center gap-2"><Globe size={10} /> NETWORK: P2P_AGGREGATOR</span>
            <span className="flex items-center gap-2"><ShieldCheck size={10} /> AUTH: VERIFIED_BRIDGE</span>
         </div>
         <div className="flex items-center gap-2 text-terminal-dim">
            <span>GRIT_OS_EXT_v1.0</span>
         </div>
      </div>
    </div>
  );
};
