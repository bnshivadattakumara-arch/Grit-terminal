import React, { useEffect, useRef, useState } from 'react';
import { Terminal, Activity, Command, ChevronRight, RefreshCw, Cpu, BrainCircuit, BarChart3, ShieldCheck, Zap, Info, Search } from 'lucide-react';
import { EnrichedTicker } from '../types';
import { analyzeAssetWithAI, askAI } from '../services/geminiService';
import { fetchPriceHistory } from '../services/binanceService';
import { Exchange } from '../App';

export interface LogEntry {
  id: string;
  timestamp: number;
  type: 'SPIKE' | 'DUMP' | 'FUNDING' | 'INFO' | 'CMD' | 'AI' | 'ERROR' | 'SUCCESS';
  message: string | React.ReactNode;
}

interface LiveTerminalProps {
  logs: LogEntry[];
  tickers: EnrichedTicker[];
  exchange: Exchange;
  isLoading: boolean;
  onAddLog: (log: LogEntry) => void;
  onClearLogs?: () => void;
}

export const LiveTerminal: React.FC<LiveTerminalProps> = ({ logs, tickers, exchange, isLoading, onAddLog, onClearLogs }) => {
  const endRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const addSysLog = (msg: string | React.ReactNode, type: LogEntry['type'] = 'INFO') => {
    onAddLog({ id: Math.random().toString(), timestamp: Date.now(), type, message: msg });
  };

  const handleCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = input.trim();
    if (!raw || isProcessing) return;

    onAddLog({ id: Date.now().toString(), timestamp: Date.now(), type: 'CMD', message: raw });
    setInput('');
    setIsProcessing(true);

    const args = raw.split(' ');
    const cmd = args[0].toLowerCase();

    try {
      if (cmd === '/help') {
        addSysLog(
          <div className="space-y-1 py-2 border-y border-terminal-darkGreen/20 my-2">
            <div className="text-gray-500 font-black uppercase text-[10px] tracking-widest">Protocol Directory:</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
              <div><span className="text-terminal-dim font-bold">/price [SYM]</span> - Get live index quote</div>
              <div><span className="text-terminal-dim font-bold">/analyze [SYM]</span> - Run Neural Analysis</div>
              <div><span className="text-terminal-dim font-bold">/clear</span> - Purge log buffer</div>
              <div><span className="text-terminal-dim font-bold">[QUERY]</span> - Ask AI Market Assistant</div>
            </div>
          </div>
        );
      } else if (cmd === '/clear') {
        if (onClearLogs) onClearLogs();
        else addSysLog("PURGE_FAILED: ACCESS_DENIED", "ERROR");
      } else if (cmd === '/price') {
        const symbol = args[1]?.toUpperCase();
        const ticker = tickers.find(t => t.symbol.includes(symbol || ''));
        if (ticker) {
          addSysLog(
            <div className="flex items-center gap-4 py-1">
              <span className="font-black text-terminal-contrast">{ticker.symbol}</span>
              <span className="text-gray-500 font-bold tabular-nums">${parseFloat(ticker.lastPrice).toLocaleString()}</span>
              <span className={`text-[10px] font-black ${parseFloat(ticker.priceChangePercent) >= 0 ? 'text-terminal-dim' : 'text-terminal-alert'}`}>
                {ticker.priceChangePercent}%
              </span>
            </div>
          );
        } else {
          addSysLog(`ASSET_NOT_FOUND: ${symbol}`, "ERROR");
        }
      } else if (cmd === '/analyze') {
        const symbol = args[1]?.toUpperCase();
        const ticker = tickers.find(t => t.symbol.includes(symbol || ''));
        if (ticker) {
          addSysLog(`INIT_NEURAL_SENTINEL_SCAN [${ticker.symbol}]...`);
          const history = await fetchPriceHistory(ticker.symbol);
          const analysis = await analyzeAssetWithAI(ticker, history);
          addSysLog(analysis, "AI");
        } else {
          addSysLog(`ERR: CANNOT_ANALYZE_UNKNOWN_NODE_${symbol}`, "ERROR");
        }
      } else {
        const response = await askAI(raw);
        addSysLog(response, "AI");
      }
    } catch (err) {
      addSysLog("PROCESSOR_FAULT: Check API link.", "ERROR");
    } finally {
      setIsProcessing(false);
    }
  };

  const totalVol = (tickers.reduce((acc, t) => acc + parseFloat(t.quoteVolume), 0) / 1e9).toFixed(2);

  return (
    <div className="w-full bg-terminal-black border-2 border-terminal-darkGreen shadow-2xl flex flex-col h-[500px] transition-all overflow-hidden backdrop-blur-2xl">
      {/* INTEGRATED STATUS HEADER */}
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-terminal-darkGreen/40 border-b border-terminal-darkGreen bg-terminal-black/60">
        <div className="p-4 flex items-center justify-between">
           <div className="flex flex-col">
              <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1">SYSTEM_KERNEL</span>
              <div className="flex items-center gap-3">
                 <Terminal size={20} className="text-terminal-dim" />
                 <span className="text-base font-black text-terminal-contrast tracking-tighter uppercase">PRO_CONSOLE_v4.5</span>
              </div>
           </div>
           <div className={`h-2.5 w-2.5 rounded-none ${isLoading ? 'bg-gray-400 animate-pulse' : 'bg-terminal-dim'} shadow-[0_0_8px_currentColor]`}></div>
        </div>
        
        <div className="p-4 flex items-center justify-between bg-terminal-black/20">
           <div className="flex flex-col">
              <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1">EXCHANGE_NODE</span>
              <div className="flex items-center gap-2">
                 <Cpu size={14} className="text-terminal-dim" />
                 <span className="text-sm font-black text-terminal-contrast uppercase">{exchange}</span>
              </div>
           </div>
           <div className="text-right">
              <div className="text-[8px] text-gray-600 font-black uppercase">SYNC_STATUS</div>
              <div className={`text-[10px] font-black ${isLoading ? 'text-gray-400' : 'text-terminal-dim'}`}>
                {isLoading ? 'SYNCHRONIZING...' : 'STABLE_LINK'}
              </div>
           </div>
        </div>

        <div className="p-4 flex items-center justify-between">
           <div className="flex flex-col">
              <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1">ACTIVE_ALPHAS</span>
              <div className="flex items-center gap-2">
                 <BarChart3 size={14} className="text-terminal-dim" />
                 <span className="text-sm font-black text-terminal-contrast tabular-nums">${totalVol}B <span className="text-[8px] opacity-40">24H</span></span>
              </div>
           </div>
           <div className="text-right">
              <div className="text-[8px] text-gray-600 font-black uppercase">NODES_SYNCED</div>
              <div className="text-[10px] font-black text-terminal-dim">{tickers.length} VECTORS</div>
           </div>
        </div>
      </div>

      {/* TERMINAL LOGS WINDOW */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar bg-terminal-black/10">
        {logs.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 uppercase italic font-black tracking-widest text-center">
            <ShieldCheck size={48} className="mb-4 opacity-10" />
            [ WAITING_FOR_QUERY_v4.5 ]
            <div className="text-[9px] mt-2 not-italic text-gray-500">Enter /help to see authorized protocols</div>
          </div>
        )}
        {logs.map((log) => (
          <div key={log.id} className="flex items-start gap-3 animate-in fade-in slide-in-from-left-2 duration-200">
            <span className="text-[8px] mt-1 shrink-0 font-black px-1 border border-terminal-darkGreen/10 text-gray-500">
              {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour:'2-digit', minute:'2-digit', second:'2-digit' })}
            </span>
            <div className="flex-1 min-w-0">
               {log.type === 'CMD' && <span className="text-gray-400 font-black mr-2 tracking-tighter">{" > "}</span>}
               {log.type === 'AI' && <span className="inline-flex items-center gap-1.5 text-terminal-dim font-black uppercase text-[9px] mr-2"><BrainCircuit size={12}/> NEURAL_INTEL:</span>}
               <span className={`leading-relaxed break-words whitespace-pre-wrap text-[13px] ${
                 log.type === 'CMD' ? 'text-terminal-contrast font-black' : 
                 log.type === 'AI' ? 'text-terminal-contrast italic font-medium' : 
                 log.type === 'ERROR' ? 'text-terminal-alert font-bold' : 
                 'text-terminal-contrast font-medium'
               }`}>
                 {log.message}
               </span>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* COMMAND INPUT BAR */}
      <div className="border-t border-terminal-darkGreen bg-terminal-black/80 p-4 relative">
         <form onSubmit={handleCommand} className="flex items-center gap-4">
            <div className={`p-2 border ${isProcessing ? 'border-gray-300' : 'border-terminal-darkGreen'} transition-colors bg-terminal-black/20`}>
              {isProcessing ? <RefreshCw size={14} className="animate-spin text-gray-400" /> : <Command size={14} className="text-terminal-dim" />}
            </div>
            <input 
              type="text" 
              value={input}
              disabled={isProcessing}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-terminal-contrast font-mono font-black uppercase placeholder-gray-400 text-sm tracking-tight disabled:opacity-50"
              placeholder={isProcessing ? "PROCESSING_VECTORS..." : "Enter protocol command or AI query..."}
            />
            {!isProcessing && input && (
               <button type="submit" className="text-terminal-dim hover:text-terminal-contrast transition-all flex items-center gap-2 px-3 border border-terminal-dim/40 py-1 bg-terminal-dim/5">
                  <Zap size={12} fill="currentColor" /> <span className="text-[10px] font-black">EXEC</span>
               </button>
            )}
         </form>
         
         <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar opacity-60 hover:opacity-100 transition-opacity">
            {['/help', '/price SOL', '/analyze ETH', '/clear'].map(c => (
              <button 
                key={c}
                onClick={() => setInput(c)}
                className="whitespace-nowrap px-3 py-1 bg-terminal-black/40 border border-terminal-darkGreen/40 text-[8px] font-black text-gray-500 hover:text-terminal-dim hover:border-terminal-dim transition-all uppercase"
              >
                {c}
              </button>
            ))}
         </div>
      </div>
    </div>
  );
};