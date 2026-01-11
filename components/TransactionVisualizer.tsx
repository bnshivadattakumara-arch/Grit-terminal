import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  CHAINS, 
  ChainMetadata, 
  ChainTransaction, 
  fetchRecentEVMTransactions, 
  fetchRecentBTCTransactions,
  fetchRecentSolTransactions,
  fetchRecentXrpTransactions,
  fetchRecentTronTransactions
} from '../services/chainService';
import { 
  Box, Search, Globe, Activity, ExternalLink, 
  Clock, Database, ArrowRight, Zap, ShieldCheck,
  Cpu, Layout, RefreshCw, AlertCircle, Filter, Info, TrendingUp, ChevronRight,
  TrendingDown, Waves, Landmark, Users
} from 'lucide-react';

export const TransactionVisualizer: React.FC = () => {
  const [selectedChainId, setSelectedChainId] = useState<string>(CHAINS[0].id);
  const [transactions, setTransactions] = useState<ChainTransaction[]>([]);
  const [isLive, setIsLive] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [minMagnitude, setMinMagnitude] = useState(0);
  const [pollProgress, setPollProgress] = useState(0);
  const [networkStats, setNetworkStats] = useState({ tps: '0.0', latency: '0ms', block: '---', vol: 0, whaleCount: 0 });

  const selectedChain = useMemo(() => 
    CHAINS.find(c => c.id === selectedChainId) || CHAINS[0]
  , [selectedChainId]);

  const fetchTxs = async () => {
    setIsLoading(true);
    let newTxs: ChainTransaction[] = [];
    const startTime = Date.now();

    try {
      if (selectedChain.type === 'EVM') {
        newTxs = await fetchRecentEVMTransactions(selectedChain);
      } else if (selectedChain.type === 'BTC') {
        newTxs = await fetchRecentBTCTransactions();
      } else if (selectedChain.type === 'SOL') {
        newTxs = await fetchRecentSolTransactions(selectedChain);
      } else if (selectedChain.type === 'XRP') {
        newTxs = await fetchRecentXrpTransactions(selectedChain);
      } else if (selectedChain.type === 'TRON') {
        newTxs = await fetchRecentTronTransactions(selectedChain);
      }
      
      const latency = Date.now() - startTime;

      if (newTxs.length > 0) {
        setTransactions(prev => {
          const combined = [...newTxs, ...prev];
          const unique = combined.filter((v, i, a) => a.findIndex(t => t.hash === v.hash) === i);
          return unique.slice(0, 100);
        });
        
        const totalVol = newTxs.reduce((acc, t) => acc + (t.valueUsd || 0), 0);
        const whaleTxs = newTxs.filter(t => (t.valueUsd || 0) >= 50000).length;

        setNetworkStats({
          tps: (newTxs.length / 8).toFixed(1),
          latency: `${latency}ms`,
          block: newTxs[0].blockNumber,
          vol: totalVol,
          whaleCount: whaleTxs
        });
        setError(null);
      } else if (transactions.length === 0) {
        setError("NODE_TIMEOUT: NO_RESPONSE_FROM_RPC");
      }
    } catch (e) {
      setError("RPC_FETCH_FAILURE: CONNECTION_REFUSED");
    } finally {
      setIsLoading(false);
      setPollProgress(0);
    }
  };

  useEffect(() => {
    setTransactions([]);
    setError(null);
    fetchTxs();
  }, [selectedChainId]);

  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(fetchTxs, 8000);
    
    const progressInterval = setInterval(() => {
      setPollProgress(p => Math.min(100, p + 1.25));
    }, 100);

    return () => {
      clearInterval(interval);
      clearInterval(progressInterval);
    };
  }, [isLive, selectedChainId]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => (tx.valueUsd || 0) >= minMagnitude);
  }, [transactions, minMagnitude]);

  const getExplorerLink = (type: 'tx' | 'address', val: string) => {
    if (selectedChain.id === 'btc') return `${selectedChain.explorer}/${type}/${val}`;
    if (selectedChain.id === 'sol') return `${selectedChain.explorer}/${type === 'tx' ? 'tx' : 'account'}/${val}`;
    if (selectedChain.id === 'xrp') return `${selectedChain.explorer}/${type === 'tx' ? 'transactions' : 'accounts'}/${val}`;
    return `${selectedChain.explorer}/${type}/${val}`;
  };

  const getIntensityStyle = (val: number) => {
    if (val >= 100000) return 'border-l-4 border-red-600 bg-red-600/10 shadow-[inset_15px_0_20px_rgba(220,38,38,0.15)] ring-1 ring-red-500/20';
    if (val >= 10000) return 'border-l-4 border-orange-500 bg-orange-500/5';
    if (val >= 1000) return 'border-l-4 border-yellow-400 bg-yellow-400/5';
    return 'border-l-4 border-terminal-darkGreen';
  };

  return (
    <div className="flex flex-col h-full bg-[#050505] border border-terminal-darkGreen font-mono overflow-hidden shadow-2xl relative">
      {/* CRT SCANLINES */}
      <div className="absolute inset-0 pointer-events-none z-50 opacity-[0.03] bg-[linear-gradient(to_bottom,transparent_50%,black_50%)] bg-[length:100%_4px]"></div>

      {/* TOP HEADER */}
      <div className="bg-black/95 border-b border-terminal-darkGreen p-4 flex flex-col md:flex-row justify-between items-center gap-4 z-40 relative">
        <div className="flex items-center gap-4">
          <div 
            className="p-3 border border-terminal-green/40 shadow-[0_0_15px_rgba(74,222,128,0.2)] relative overflow-hidden"
            style={{ backgroundColor: `${selectedChain.color}15` }}
          >
            <Cpu size={24} className="text-terminal-green animate-pulse z-10 relative" />
            <div className={`absolute inset-0 bg-terminal-green/20 animate-ping opacity-20`} style={{ animationDuration: '3s' }}></div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black text-white uppercase tracking-[0.4em]">NET_CONDUIT_{selectedChain.id.toUpperCase()}</h2>
              <span className="flex items-center gap-1.5 text-[9px] bg-blue-900/30 text-blue-400 px-2 py-0.5 font-black border border-blue-500/30">
                <ShieldCheck size={10} /> ENCRYPTED_STREAM
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1.5">
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-terminal-green animate-ping' : 'bg-gray-700'}`}></div>
                <span className={`text-[9px] font-black tracking-tighter ${isLive ? 'text-terminal-green' : 'text-gray-600'}`}>
                  {isLive ? 'ESTABLISHED' : 'IDLE'}
                </span>
              </div>
              <div className="h-4 w-[1px] bg-terminal-darkGreen"></div>
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                RPC_V2: <span className="text-white">{selectedChain.name}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-[#0a0a0a] p-1 border border-terminal-darkGreen">
          <div className="flex items-center gap-2 px-3 border-r border-terminal-darkGreen/50">
             <Filter size={14} className="text-gray-600" />
             <select 
               className="bg-transparent border-none outline-none text-[10px] font-black uppercase text-terminal-green cursor-pointer"
               value={minMagnitude}
               onChange={(e) => setMinMagnitude(Number(e.target.value))}
             >
                <option value="0">ALL_TRAFFIC</option>
                <option value="1000">{" > $1,000"}</option>
                <option value="10000">{" > $10,000"}</option>
                <option value="50000">{" > $50,000"}</option>
                <option value="100000">{" > $100,000 (WHALE)"}</option>
             </select>
          </div>
          <button 
            onClick={() => setIsLive(!isLive)}
            className={`px-5 py-2 text-[10px] font-black uppercase transition-all flex items-center gap-2 border ${isLive ? 'bg-terminal-green text-black border-terminal-green' : 'text-gray-500 border-transparent hover:text-white'}`}
          >
            {isLive ? <Zap size={14} fill="currentColor" /> : <Clock size={14} />} {isLive ? 'CUT_FEED' : 'INIT_FEED'}
          </button>
        </div>
      </div>

      <div className="h-[2px] bg-terminal-darkGreen/20 w-full overflow-hidden shrink-0">
        <div 
          className="h-full bg-terminal-green transition-all duration-300 ease-linear shadow-[0_0_10px_#4ade80]" 
          style={{ width: `${pollProgress}%` }}
        ></div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <div className="w-full md:w-64 border-r border-terminal-darkGreen bg-black/40 overflow-y-auto no-scrollbar flex flex-col">
          <div className="p-3 border-b border-terminal-darkGreen bg-black/60 sticky top-0 z-10 flex justify-between items-center">
             <div className="text-[10px] text-gray-600 font-black uppercase tracking-[0.3em] flex items-center gap-2">
               <Globe size={12} /> RPC_NODES
             </div>
             <span className="text-[8px] text-terminal-darkGreen font-black">v2.5.8_LIVE</span>
          </div>
          <div className="flex-1 p-2 space-y-1">
            {CHAINS.map(chain => (
              <button
                key={chain.id}
                onClick={() => setSelectedChainId(chain.id)}
                className={`w-full text-left p-3 flex items-center justify-between group transition-all border-l-2 ${selectedChainId === chain.id ? 'bg-terminal-green/10 border-terminal-green text-terminal-green shadow-[inset_0_0_15px_rgba(74,222,128,0.05)]' : 'border-transparent text-gray-500 hover:text-white hover:bg-white/5'}`}
              >
                <div className="flex flex-col">
                  <span className="text-[11px] font-black uppercase tracking-tighter">{chain.name}</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[8px] opacity-60 font-bold px-1 border border-current">{chain.symbol}</span>
                    <div className="w-1 h-1 rounded-full bg-current opacity-30"></div>
                  </div>
                </div>
                <div className={`p-1.5 rounded-full transition-all ${selectedChainId === chain.id ? 'bg-terminal-green text-black scale-110' : 'bg-gray-900 text-gray-700'}`}>
                  <ChevronRight size={12} />
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden bg-[#020202]">
          {/* ANALYTICS HUD */}
          <div className="grid grid-cols-2 lg:grid-cols-5 divide-x divide-terminal-darkGreen/30 border-b border-terminal-darkGreen/30 bg-black/80">
            <div className="p-4 flex flex-col items-center group relative overflow-hidden">
              <span className="text-[8px] text-gray-600 font-black uppercase mb-1 tracking-widest z-10">THROUGHPUT</span>
              <div className="flex items-center gap-2 z-10">
                <TrendingUp size={12} className="text-terminal-green" />
                <span className="text-xl font-black text-terminal-green tabular-nums">{networkStats.tps} <span className="text-[9px] opacity-50 font-bold uppercase">TPS</span></span>
              </div>
              <div className="absolute bottom-0 left-0 h-1 bg-terminal-green/10 w-full animate-pulse"></div>
            </div>
            <div className="p-4 flex flex-col items-center group">
              <span className="text-[8px] text-gray-600 font-black uppercase mb-1 tracking-widest">LATENCY</span>
              <span className="text-xl font-black text-white tabular-nums">{networkStats.latency}</span>
            </div>
            <div className="p-4 flex flex-col items-center group hidden lg:flex">
              <span className="text-[8px] text-gray-600 font-black uppercase mb-1 tracking-widest">WHALES_DETECTED</span>
              <div className="flex items-center gap-2">
                <Waves size={12} className="text-red-500" />
                <span className="text-xl font-black text-red-500 tabular-nums">{networkStats.whaleCount}</span>
              </div>
            </div>
            <div className="p-4 flex flex-col items-center group hidden lg:flex">
              <span className="text-[8px] text-gray-600 font-black uppercase mb-1 tracking-widest">ACTIVE_BLOCK</span>
              <span className="text-xl font-black text-terminal-dim tabular-nums">#{networkStats.block.slice(-6)}</span>
            </div>
            <div className="p-4 flex flex-col items-center group">
              <span className="text-[8px] text-gray-600 font-black uppercase mb-1 tracking-widest">SESSION_MAGNITUDE</span>
              <span className="text-xl font-black text-yellow-500 tabular-nums">${(networkStats.vol / 1000).toFixed(1)}K</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar relative">
            {error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 p-10 text-center z-50">
                <AlertCircle size={48} className="text-red-600 mb-4 animate-bounce" />
                <div className="text-lg font-black text-red-500 uppercase tracking-[0.4em] mb-2">{error}</div>
                <button onClick={fetchTxs} className="mt-6 px-8 py-3 bg-red-600/20 border border-red-500 text-red-500 text-xs font-black uppercase hover:bg-red-500 hover:text-black transition-all">REBOOT_CORE</button>
              </div>
            )}

            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-black/95 text-[9px] text-gray-500 font-black uppercase tracking-[0.4em] border-b border-terminal-darkGreen/40 z-30 shadow-xl">
                <tr>
                  <th className="p-4 pl-8">PACKET_ID</th>
                  <th className="p-4">SOURCE</th>
                  <th className="p-4">DESTINATION</th>
                  <th className="p-4 text-right">VALUE_{selectedChain.symbol}</th>
                  <th className="p-4 text-right pr-8">AGE_S</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-terminal-darkGreen/10">
                {filteredTransactions.map((tx, idx) => {
                  const isWhale = (tx.valueUsd || 0) >= 50000;
                  return (
                    <tr 
                      key={`${tx.hash}-${idx}`} 
                      className={`transition-all duration-150 group animate-in fade-in slide-in-from-right-2 ${getIntensityStyle(tx.valueUsd || 0)}`}
                    >
                      <td className="p-4 pl-8">
                        <div className="flex items-center gap-3">
                          {isWhale ? <Waves size={14} className="text-red-500 animate-pulse" /> : <Box size={14} className="text-terminal-darkGreen group-hover:text-terminal-green" />}
                          <a 
                            href={getExplorerLink('tx', tx.hash)} 
                            target="_blank" 
                            rel="noreferrer" 
                            className={`font-mono text-[11px] group-hover:text-terminal-green hover:underline flex items-center gap-1.5 ${isWhale ? 'text-white font-black' : 'text-gray-400'}`}
                          >
                            {tx.hash.slice(0, 14)}... <ExternalLink size={10} className="opacity-0 group-hover:opacity-100" />
                          </a>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <a 
                            href={getExplorerLink('address', tx.from)} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="font-mono text-[10px] text-terminal-dim/70 hover:text-white hover:underline truncate max-w-[120px]"
                          >
                            {tx.from}
                          </a>
                          {tx.label && <span className="text-[8px] text-yellow-500 font-black uppercase mt-0.5 tracking-tighter flex items-center gap-1"><Landmark size={8} /> {tx.label}</span>}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <a 
                            href={getExplorerLink('address', tx.to)} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="font-mono text-[10px] text-terminal-dim/70 hover:text-white hover:underline truncate max-w-[120px]"
                          >
                            {tx.to}
                          </a>
                          {!tx.label && tx.to === 'Contract Interaction' && <span className="text-[8px] text-blue-500 font-black uppercase mt-0.5 tracking-tighter">PROTO_CALL</span>}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex flex-col items-end">
                          <span className={`text-[12px] font-black tabular-nums ${isWhale ? 'text-red-500 text-lg' : 'text-white'}`}>
                            {tx.value} <span className="text-[8px] opacity-40">{selectedChain.symbol}</span>
                          </span>
                          {tx.valueUsd > 0 && <span className="text-[9px] text-terminal-dim/60 font-black tabular-nums tracking-widest">${(tx.valueUsd).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>}
                        </div>
                      </td>
                      <td className="p-4 text-right pr-8">
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] text-gray-600 font-black tabular-nums">
                            {Math.max(0, Math.floor((Date.now() - tx.timestamp) / 1000))}
                          </span>
                          <div className="w-12 h-[1px] bg-terminal-darkGreen/20 mt-1">
                            <div className={`h-full ${isWhale ? 'bg-red-500' : 'bg-terminal-green/50'}`} style={{ width: `${Math.min(100, (Date.now() - tx.timestamp) / 1000)}%` }}></div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* FOOTER STATS */}
      <div className="bg-black border-t border-terminal-darkGreen p-2.5 flex justify-between items-center text-[9px] font-black uppercase tracking-[0.3em] text-gray-600 px-8 z-40 relative">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-terminal-green shadow-[0_0_5px_#4ade80]"></div>
             <span>PROTOCOL: ACTIVE</span>
          </div>
          <span className="hidden sm:inline flex items-center gap-1.5"><Users size={12} /> {selectedChain.name.toUpperCase()}_INDEXERS</span>
          <span className="hidden lg:inline text-terminal-darkGreen">KERNEL: v2.5.5-STABLE-RELEASE</span>
        </div>
        <div className="flex items-center gap-4">
           <span>PACKETS_RECEIVED: {transactions.length}</span>
           <div className="w-24 h-1.5 bg-gray-900 border border-terminal-darkGreen/30 overflow-hidden rounded-none">
              <div className="h-full bg-terminal-green shadow-[0_0_5px_#4ade80]" style={{ width: `${Math.min(100, (transactions.length / 100) * 100)}%` }}></div>
           </div>
        </div>
      </div>
    </div>
  );
};