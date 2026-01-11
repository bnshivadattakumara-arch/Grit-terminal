import React, { useEffect, useState } from 'react';
import { EnrichedTicker, Trade } from '../types';
import { analyzeAssetWithAI } from '../services/geminiService';
import { fetchRecentTrades, fetchPriceHistory } from '../services/binanceService';
import { fetchBybitTrades, fetchBybitKlines } from '../services/bybitService';
import { fetchCoinbaseTrades, fetchCoinbaseKlines } from '../services/coinbaseService';
import { fetchHyperliquidTrades, fetchHyperliquidKlines } from '../services/hyperliquidService';
import { fetchMexcRecentTrades, fetchMexcPriceHistory } from '../services/mexcService';
import { fetchCoindcxTrades, fetchCoindcxKlines } from '../services/coindcxService';
import { fetchCoinswitchTrades, fetchCoinswitchKlines } from '../services/coinswitchService';
import { fetchOkxTrades, fetchOkxKlines } from '../services/okxService';
import { X, Cpu, TrendingUp, TrendingDown, TerminalSquare, RefreshCcw, Activity, Table, Hash, Info } from 'lucide-react';
import { Exchange } from '../App';

interface AssetDetailModalProps {
  ticker: EnrichedTicker | null;
  onClose: () => void;
  exchange: Exchange;
  onMonitor?: () => void;
}

export const AssetDetailModal: React.FC<AssetDetailModalProps> = ({ ticker, onClose, exchange, onMonitor }) => {
  const [analysis, setAnalysis] = useState<string>('');
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loadingAI, setLoadingAI] = useState<boolean>(false);
  const [loadingTrades, setLoadingTrades] = useState<boolean>(false);

  useEffect(() => {
    if (ticker) {
      setLoadingAI(true);
      setAnalysis('');
      
      let fetchHistory;
      if (exchange === 'BINANCE') fetchHistory = fetchPriceHistory(ticker.symbol);
      else if (exchange === 'BYBIT') fetchHistory = fetchBybitKlines(ticker.symbol);
      else if (exchange === 'OKX') fetchHistory = fetchOkxKlines(ticker.symbol);
      else if (exchange === 'HYPERLIQUID') fetchHistory = fetchHyperliquidKlines(ticker.symbol);
      else if (exchange === 'COINBASE') fetchHistory = fetchCoinbaseKlines(ticker.symbol);
      else if (exchange === 'COINDCX') fetchHistory = fetchCoindcxKlines(ticker.symbol);
      else if (exchange === 'COINSWITCH') fetchHistory = fetchCoinswitchKlines(ticker.symbol);
      else fetchHistory = fetchMexcPriceHistory(ticker.symbol);

      fetchHistory.then(history => {
        analyzeAssetWithAI(ticker, history)
        .then(text => setAnalysis(text))
        .catch(() => setAnalysis("ERR: ANALYSIS_FETCH_FAILED"))
        .finally(() => setLoadingAI(false));
      });

      setLoadingTrades(true);
      let fetchTrades;
      if (exchange === 'BINANCE') fetchTrades = fetchRecentTrades(ticker.symbol);
      else if (exchange === 'BYBIT') fetchTrades = fetchBybitTrades(ticker.symbol);
      else if (exchange === 'OKX') fetchTrades = fetchOkxTrades(ticker.symbol);
      else if (exchange === 'HYPERLIQUID') fetchTrades = fetchHyperliquidTrades(ticker.symbol);
      else if (exchange === 'COINBASE') fetchTrades = fetchRecentTrades(ticker.symbol);
      else if (exchange === 'COINDCX') fetchTrades = fetchCoindcxTrades(ticker.symbol);
      else if (exchange === 'COINSWITCH') fetchTrades = fetchCoinswitchTrades(ticker.symbol);
      else fetchTrades = fetchMexcRecentTrades(ticker.symbol);

      fetchTrades.then(data => {
        setTrades(data); 
      }).finally(() => setLoadingTrades(false));
    }
  }, [ticker, exchange]);

  if (!ticker) return null;

  const isPositive = parseFloat(ticker.priceChangePercent) >= 0;
  
  const getSymbol = () => {
    if (ticker.quoteAsset === 'INR') return '₹';
    if (['USDT', 'USDC', 'USD', 'FDUSD', 'BUSD', 'TUSD', 'DAI'].includes(ticker.quoteAsset)) return '$';
    return '';
  };

  const TechStat = ({ label, value, unit }: { label: string, value: string | number, unit?: string }) => (
    <div className="flex flex-col p-3 border border-terminal-darkGreen bg-terminal-black/30 backdrop-blur-md">
      <span className="text-[8px] text-gray-500 font-black uppercase tracking-widest mb-1">{label}</span>
      <div className="text-xs font-bold text-terminal-contrast tabular-nums">
        {value} <span className="text-[8px] opacity-40 uppercase">{unit}</span>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-terminal-black/60 backdrop-blur-2xl p-4 font-mono">
      <div className="bg-terminal-black border-2 border-terminal-darkGreen w-full max-w-6xl h-[90vh] shadow-[0_0_80px_rgba(0,0,0,0.1)] flex flex-col relative overflow-hidden">
        
        <div className="flex justify-between items-center p-3 border-b border-terminal-darkGreen bg-terminal-black/80 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <TerminalSquare size={20} className="text-terminal-dim" />
            <h2 className="text-lg font-bold text-terminal-contrast uppercase tracking-tighter">
              {exchange}_NODE :: {ticker.symbol}
            </h2>
            <div className="flex items-center gap-2 ml-4 px-2 py-0.5 bg-terminal-dim/10 border border-terminal-dim/30 text-[9px] font-black text-terminal-dim uppercase">
               <Activity size={12} /> ENCRYPTED_TUNNEL
            </div>
          </div>
          <div className="flex items-center gap-4">
            {onMonitor && (
              <button 
                onClick={onMonitor}
                className="bg-terminal-dim text-terminal-contrast text-[10px] font-black px-4 py-1.5 uppercase hover:bg-terminal-contrast hover:text-terminal-black transition-colors flex items-center gap-2 shadow-lg"
              >
                <Activity size={14} /> LIVE_CONDUIT
              </button>
            )}
            <button onClick={onClose} className="text-gray-500 hover:text-terminal-alert transition-colors hover:bg-terminal-alert/10 p-1">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
          <div className="flex-1 overflow-y-auto p-6 space-y-6 border-r border-terminal-darkGreen scrollbar-thin bg-terminal-black/10 backdrop-blur-sm">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="border border-terminal-darkGreen p-3 bg-terminal-black/40 col-span-2 shadow-inner">
                <div className="text-gray-500 text-[8px] mb-1 uppercase tracking-widest font-black">L1_Index_Price</div>
                <div className="text-3xl font-black text-terminal-contrast tracking-widest tabular-nums">
                  {getSymbol()}{parseFloat(ticker.lastPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                </div>
              </div>
              <div className="border border-terminal-darkGreen p-3 bg-terminal-black/40 shadow-inner">
                <div className="text-gray-500 text-[8px] mb-1 uppercase tracking-widest font-black">24h_Delta</div>
                <div className={`text-xl font-black flex items-center gap-2 tabular-nums ${isPositive ? 'text-terminal-dim' : 'text-terminal-alert'}`}>
                  {isPositive ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                  {ticker.priceChangePercent}%
                </div>
              </div>
              <div className="border border-terminal-darkGreen p-3 bg-terminal-black/40">
                <div className="text-gray-500 text-[8px] mb-1 uppercase tracking-widest font-black">24h_Vol_M</div>
                <div className="text-xl font-black text-terminal-contrast tabular-nums">${(parseFloat(ticker.quoteVolume)/1000000).toFixed(2)}M</div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[10px] text-terminal-contrast font-black uppercase tracking-[0.2em] border-b border-terminal-darkGreen/20 pb-2">
                <Table size={14} className="text-terminal-dim" /> TECHNICAL_MANIFEST
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                 <TechStat label="W_Avg_Price" value={parseFloat(ticker.weightedAvgPrice).toFixed(4)} unit={ticker.quoteAsset} />
                 <TechStat label="Spread_Delta" value={ticker.spread.toFixed(5)} unit="%" />
                 <TechStat label="Trade_Count" value={ticker.count.toLocaleString()} unit="OPS" />
                 <TechStat label="Last_Qty" value={parseFloat(ticker.lastQty).toFixed(4)} unit={ticker.baseAsset} />
                 <TechStat label="Best_Bid" value={parseFloat(ticker.bidPrice).toFixed(4)} unit={ticker.quoteAsset} />
                 <TechStat label="Bid_Depth" value={parseFloat(ticker.bidQty).toFixed(2)} unit={ticker.baseAsset} />
                 <TechStat label="Best_Ask" value={parseFloat(ticker.askPrice).toFixed(4)} unit={ticker.quoteAsset} />
                 <TechStat label="Ask_Depth" value={parseFloat(ticker.askQty).toFixed(2)} unit={ticker.baseAsset} />
              </div>
            </div>

            <div className="border border-terminal-darkGreen p-5 relative bg-terminal-black/60 shadow-xl backdrop-blur-xl">
              <div className="absolute top-0 left-0 bg-terminal-dim text-terminal-black text-[9px] font-black px-2 py-0.5 tracking-widest uppercase">
                NEURAL_SENTINEL_ANALYTICS
              </div>
              <div className="mt-4 font-mono text-sm leading-6 text-terminal-contrast">
                {loadingAI ? (
                  <div className="animate-pulse flex flex-col gap-2">
                    <div className="h-1 bg-terminal-dim w-full mb-2"></div>
                    <span className="text-[10px] uppercase font-black tracking-widest text-terminal-dim">Processing Neural Vectors...</span>
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap font-medium text-[13px] italic">{analysis}</div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 border border-terminal-darkGreen/40 bg-terminal-black/30">
                <div className="text-[8px] text-gray-500 font-black uppercase mb-1">Volat_Index</div>
                <div className="text-lg text-terminal-dim font-black tabular-nums">{ticker.volatility.toFixed(3)}%</div>
              </div>
              <div className="p-3 border border-terminal-darkGreen/40 bg-terminal-black/30">
                <div className="text-[8px] text-gray-500 font-black uppercase mb-1">Open_Px</div>
                <div className="text-lg text-terminal-contrast font-black tabular-nums">{parseFloat(ticker.openPrice).toFixed(2)}</div>
              </div>
              <div className="p-3 border border-terminal-darkGreen/40 bg-terminal-black/30">
                <div className="text-[8px] text-gray-500 font-black uppercase mb-1">Prev_Close</div>
                <div className="text-lg text-terminal-contrast font-black tabular-nums">{parseFloat(ticker.prevClosePrice).toFixed(2)}</div>
              </div>
            </div>
          </div>

          <div className="w-full lg:w-96 bg-terminal-black/40 backdrop-blur-md flex flex-col border-t lg:border-t-0 lg:border-l border-terminal-darkGreen">
            <div className="p-3 border-b border-terminal-darkGreen flex justify-between items-center bg-terminal-black/80">
              <div className="flex items-center gap-2">
                <Activity size={14} className="text-terminal-dim" />
                <span className="text-[10px] font-black text-terminal-contrast uppercase tracking-widest">Real_Time_Deals</span>
              </div>
              <RefreshCcw size={12} className={`text-gray-500 ${loadingTrades ? 'animate-spin' : ''}`} />
            </div>
            <div className="flex-1 overflow-y-auto p-0 font-mono text-xs custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-terminal-black text-[8px] text-gray-500 font-black uppercase border-b border-terminal-darkGreen/40 z-10">
                  <tr>
                    <th className="p-3">PRICE_IDX</th>
                    <th className="p-3 text-right">SIZE</th>
                    <th className="p-3 text-right pr-4">UTC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-terminal-darkGreen/10">
                  {trades.map((trade, idx) => (
                    <tr key={`${trade.id}-${idx}`} className="hover:bg-terminal-dim/10 transition-colors group">
                      <td className={`p-3 font-black tabular-nums ${trade.isBuyerMaker ? 'text-terminal-alert' : 'text-terminal-dim'}`}>
                        {parseFloat(trade.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                      </td>
                      <td className="p-3 text-right text-gray-600 font-bold tabular-nums">
                        {parseFloat(trade.qty).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                      </td>
                      <td className="p-3 text-right pr-4 text-gray-400 tabular-nums text-[10px]">
                        {new Date(trade.time).toLocaleTimeString([], {hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit'})}
                      </td>
                    </tr>
                  ))}
                  {trades.length === 0 && !loadingTrades && (
                     <tr><td colSpan={3} className="p-20 text-center text-gray-400 uppercase italic font-black animate-pulse tracking-widest">Awaiting_Data_Stream...</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="h-10 border-t border-terminal-darkGreen bg-terminal-black/90 backdrop-blur-md px-4 flex items-center justify-between text-[8px] text-gray-500 font-black uppercase tracking-[0.4em] shrink-0">
           <div className="flex items-center gap-6">
              <span className="flex items-center gap-1.5"><Info size={12} /> APPLE_GLASS_v2.5</span>
              <span className="text-gray-700">ASSET_ID: {ticker.firstId}</span>
           </div>
           <div className="flex items-center gap-2 text-terminal-dim">
              <div className="w-1.5 h-1.5 rounded-full bg-terminal-dim animate-ping"></div>
              <span>KERNEL_SYNC: STABLE</span>
           </div>
        </div>
      </div>
    </div>
  );
};