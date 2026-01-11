import React, { useState, useEffect, useRef } from 'react';
import { 
  Terminal, Cpu, Globe, ArrowRight, Sparkles, HeartPulse, Search, BarChart3, TrendingUp, 
  Newspaper, Calculator, ShieldAlert, Scale, Zap, Info, Activity, Gauge, Droplets, 
  Flame, Hash, Repeat, Users, BarChart, Leaf, Coins, Zap as ZapIcon, Info as InfoIcon, 
  BookOpen, ShieldCheck as ShieldIcon, Landmark, LayoutGrid, Monitor
} from 'lucide-react';
import { EnrichedTicker } from '../types';
import { GoogleGenAI } from "@google/genai";
import { Exchange } from '../App';
import { fetchStockQuote, GLOBAL_INDEX_MAP, MACRO_TICKERS, CURRENCY_SYMBOLS, COMMODITY_TICKERS, FOREX_TICKERS, BOND_TICKERS } from '../services/stockService';

interface GlobalCommandHubProps {
  tickers: EnrichedTicker[];
  exchange: Exchange;
  onAssetSelect: (ticker: EnrichedTicker) => void;
}

let aiInstance: GoogleGenAI | null = null;
const getAI = () => {
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return aiInstance;
};

export const GlobalCommandHub: React.FC<GlobalCommandHubProps> = ({ tickers, exchange, onAssetSelect }) => {
  const [hubMode, setHubMode] = useState<'CLI' | 'MACRO_TERMINAL'>('CLI');
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<{ type: 'USER' | 'SYSTEM' | 'AI'; content: React.ReactNode; timestamp: number }[]>([
    { type: 'SYSTEM', content: 'GRIT_OS_v3.6_PRO_KERNEL :: FULL_STATION_LINK_ACTIVE', timestamp: Date.now() },
    { type: 'SYSTEM', content: 'STOCK_CONDUIT_INTERFACED: /stock, /indices, /macro ACTIVE', timestamp: Date.now() + 50 },
    { type: 'SYSTEM', content: 'TRADER_SENTINEL_LOADED: /traders AVAILABLE (CRYPTO + FOREX)', timestamp: Date.now() + 100 },
    { type: 'SYSTEM', content: 'ROOT_SHELL_INITIALIZED: READY FOR OVERRIDE', timestamp: Date.now() + 150 }
  ]);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMessage = (type: 'USER' | 'SYSTEM' | 'AI', content: React.ReactNode) => {
    setMessages(prev => [...prev, { type, content, timestamp: Date.now() }]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const nextIndex = historyIndex + 1;
      if (nextIndex < history.length) {
        setHistoryIndex(nextIndex);
        setInput(history[history.length - 1 - nextIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = historyIndex - 1;
      if (nextIndex >= 0) {
        setHistoryIndex(nextIndex);
        setInput(history[history.length - 1 - nextIndex]);
      } else {
        setHistoryIndex(-1);
        setInput('');
      }
    }
  };

  const processQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    const userQuery = input.trim();
    addMessage('USER', userQuery);
    setHistory(prev => [...prev, userQuery].slice(-50));
    setHistoryIndex(-1);
    setInput('');
    setIsProcessing(true);

    const args = userQuery.split(' ');
    const cmd = args[0].toLowerCase();

    try {
      if (cmd === '/help') {
        addMessage('SYSTEM', (
          <div className="space-y-8 py-4 border-y border-terminal-darkGreen/30 my-4 font-mono text-[10px] animate-in fade-in slide-in-from-bottom-4 duration-500 bg-terminal-black/20">
            <div className="text-terminal-dim font-black tracking-[0.4em] border-b border-terminal-darkGreen/40 pb-3 flex justify-between items-center px-4">
              <span className="flex items-center gap-2"><BookOpen size={14}/> [ SYSTEM_MANUAL_v3.6_STABLE ]</span>
              <span className="text-gray-500">AUTH: ROOT_SENTINEL</span>
            </div>

            <section className="px-4 py-3 border-l-2 border-terminal-dim">
              <div className="text-terminal-contrast font-black uppercase mb-2 flex items-center gap-2 tracking-widest underline decoration-terminal-dim/30">
                <Cpu size={12}/> CORE_SCHEMA // GLOBAL_PROTOCOLS
              </div>
              <div className="text-gray-600 leading-relaxed space-y-1">
                <p>{" > "} <span className="text-terminal-dim font-bold">MULTIVECTOR:</span> Real-time L2 data ingestion from Global Exchanges.</p>
                <p>{" > "} <span className="text-terminal-dim font-bold">NEURAL_SENTINEL:</span> Contextual sentiment via Gemini 3.1 Pro.</p>
              </div>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 px-4">
              <section className="space-y-3">
                <div className="text-terminal-contrast font-black border-l-2 border-terminal-dim pl-2 uppercase tracking-widest bg-terminal-dim/5">Market_Intel</div>
                <div className="space-y-2">
                  <div><span className="text-terminal-dim">/stock [SYM]</span> -equities</div>
                  <div><span className="text-terminal-dim">/indices</span> -world health</div>
                </div>
              </section>
              <section className="space-y-3">
                <div className="text-terminal-contrast font-black border-l-2 border-terminal-alert pl-2 uppercase tracking-widest bg-terminal-alert/5">System_Ops</div>
                <div className="space-y-2">
                  <div><span className="text-terminal-dim">/pulse</span> -AI market mood</div>
                  <div><span className="text-terminal-dim">/clear</span> -wipe buffer</div>
                </div>
              </section>
            </div>
          </div>
        ));
      } else if (cmd === '/clear') {
        setMessages([{ type: 'SYSTEM', content: 'ROOT_SHELL_BUFFER_PURGED', timestamp: Date.now() }]);
      } else {
        const ai = getAI();
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `SYSTEM: Grit Global Command Root. QUERY: "${userQuery}". INSTRUCTIONS: Direct, technical, no bolding. 30 words max.`,
        });
        addMessage('AI', response.text);
      }
    } catch (error) {
      addMessage('SYSTEM', 'CRITICAL_SHELL_ERROR: SEQUENCE_INTERRUPTED');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] min-h-[550px] bg-terminal-black border-2 border-terminal-darkGreen shadow-2xl overflow-hidden relative backdrop-blur-2xl">
      <div className="bg-terminal-black/80 border-b border-terminal-darkGreen p-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Terminal size={18} className="text-terminal-dim" />
          <h2 className="text-[10px] font-black text-terminal-contrast uppercase tracking-[0.4em]">GRIT_OS_ROOT_v3.6</h2>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative">
        <div className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar bg-terminal-black/5 font-mono text-sm">
            {messages.map((msg, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className={`text-[8px] mt-1 shrink-0 font-black px-1 border h-fit ${
                  msg.type === 'USER' ? 'text-terminal-contrast border-terminal-contrast/20 bg-terminal-contrast/5' : 
                  msg.type === 'AI' ? 'text-terminal-dim border-terminal-dim/30 bg-terminal-dim/5' : 
                  'text-gray-500 border-gray-500/20 bg-gray-500/5'
                }`}>
                  {msg.type}
                </span>
                <div className={`leading-relaxed break-words flex-1 ${msg.type === 'USER' ? 'text-gray-500 italic' : 'text-terminal-contrast font-medium'}`}>
                  {msg.content}
                </div>
              </div>
            ))}
            <div ref={scrollRef} />
          </div>

          <div className="p-3 bg-terminal-black/90 backdrop-blur-md border-t border-terminal-darkGreen">
            <form onSubmit={processQuery} className="relative group">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-terminal-dim font-black text-xs opacity-40">{" > "}</div>
              <input 
                type="text" 
                autoFocus
                placeholder="EXECUTE ROOT COMMAND... (TYPE /HELP)"
                className="w-full bg-terminal-black/40 border border-terminal-darkGreen/50 p-2.5 pl-8 pr-12 text-terminal-contrast outline-none focus:border-terminal-dim transition-all font-mono font-bold uppercase placeholder-gray-400 text-[11px]"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-terminal-dim hover:text-terminal-contrast transition-all">
                <ArrowRight size={18} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};