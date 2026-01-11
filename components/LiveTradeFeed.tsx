import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Trade, OrderBook, OrderBookLevel } from '../types';
import { fetchAllPrices, fetchOrderBook } from '../services/binanceService';
import { fetchBybitPrices } from '../services/bybitService';
import { fetchOkxPrices } from '../services/okxService';
import { fetchHyperliquidPrices } from '../services/hyperliquidService';
import { fetchMexcAllPrices } from '../services/mexcService';
import { TradeWebSocketManager } from '../services/tradeWebSocketService';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine 
} from 'recharts';
import { 
  Zap, Activity, Filter, DollarSign, Database, Trash2, LayoutGrid, 
  ListFilter, Globe, ShieldAlert, Cpu, BarChart, MoveUp, ArrowRight, 
  Layers, Table, ArrowUpDown, ChevronUp, ChevronDown, TrendingUp,
  History, MousePointer2, AlertTriangle, Scale, Search
} from 'lucide-react';

interface TradeTerminalProps {
  title: string;
  trades: Trade[];
  minSizeUsd: number;
  isUnified?: boolean;
}

const VENUE_METADATA: { [key: string]: { color: string, label: string, bg: string } } = {
  'BINANCE_SPOT': { color: 'text-[#F3BA2F]', label: 'BINANCE SPOT', bg: 'bg-[#F3BA2F]/10' },
  'BINANCE_PERP': { color: 'text-[#F3BA2F]', label: 'BINANCE PERP', bg: 'bg-[#F3BA2F]/20' },
  'BYBIT_SPOT': { color: 'text-[#FFB11A]', label: 'BYBIT SPOT', bg: 'bg-[#FFB11A]/10' },
  'BYBIT_PERP': { color: 'text-[#FFB11A]', label: 'BYBIT PERP', bg: 'bg-[#FFB11A]/20' },
  'OKX_SPOT': { color: 'text-white', label: 'OKX SPOT', bg: 'bg-white/10' },
  'OKX_PERP': { color: 'text-white', label: 'OKX PERP', bg: 'bg-white/20' },
  'HYPERLIQUID': { color: 'text-[#00FFFF]', label: 'HYPERLIQUID', bg: 'bg-[#00FFFF]/10' },
  'MEXC_SPOT': { color: 'text-[#1E88E5]', label: 'MEXC SPOT', bg: 'bg-[#1E88E5]/10' }
};

// Optimized Row Component
const TradeRow = React.memo(({ t, idx, isUnified }: { t: Trade, idx: number, isUnified: boolean }) => {
  const usdVal = parseFloat(t.quoteQty);
  const isWhale = usdVal >= 100000;
  const sourceKey = (t as any).source || 'UNKNOWN';
  const meta = VENUE_METADATA[sourceKey] || { color: 'text-gray-500', label: 'UNKNOWN', bg: 'bg-gray-500/10' };

  return (
    <div className={`flex items-center h-[30px] border-b border-terminal-darkGreen/5 hover:bg-terminal-green/10 transition-colors group animate-in fade-in slide-in-from-right-1 duration-200 ${isWhale ? 'bg-terminal-green/5' : ''}`}>
      {isUnified && (
        <div className="w-[120px] shrink-0 px-3 border-r border-terminal-darkGreen/10 overflow-hidden">
          <div className={`inline-flex items-center px-2 py-0.5 rounded-none border border-current font-black text-[8px] tracking-tighter whitespace-nowrap ${meta.color} ${meta.bg}`}>
            {meta.label}
          </div>
        </div>
      )}
      <div className={`flex-1 px-3 font-black tabular-nums transition-colors ${t.isBuyerMaker ? 'text-red-500' : 'text-green-500'}`}>
        {parseFloat(t.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
      </div>
      <div className="w-[100px] shrink-0 px-3 text-right text-gray-400 font-bold tabular-nums">
        {parseFloat(t.qty).toLocaleString(undefined, { maximumFractionDigits: 4 })}
      </div>
      <div className={`w-[110px] shrink-0 px-3 text-right font-black tabular-nums ${isWhale ? 'text-terminal-green' : 'text-terminal-dim/80'}`}>
        ${usdVal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
      </div>
      <div className="w-[80px] shrink-0 px-3 text-right text-gray-700 hidden sm:block tabular-nums font-medium">
        {new Date(t.time).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </div>
    </div>
  );
});

const MarketDepthChart: React.FC<{ book: OrderBook }> = ({ book }) => {
  const chartData = useMemo(() => {
    if (book.bids.length === 0 && book.asks.length === 0) return [];
    
    let bidTotal = 0;
    const bids = [...book.bids].map(b => {
      bidTotal += parseFloat(b.qty);
      return { price: parseFloat(b.price), bids: bidTotal, asks: null };
    }).reverse();

    let askTotal = 0;
    const asks = [...book.asks].map(a => {
      askTotal += parseFloat(a.qty);
      return { price: parseFloat(a.price), bids: null, asks: askTotal };
    });

    return [...bids, ...asks];
  }, [book]);

  const leftEdge = chartData[0]?.price || 0;
  const rightEdge = chartData[chartData.length - 1]?.price || 0;

  if (chartData.length === 0) {
    return <div className="h-48 w-full bg-black/40 border-b border-terminal-darkGreen/30 flex items-center justify-center text-[10px] uppercase font-black text-gray-700">Awaiting Depth Vectors...</div>;
  }

  return (
    <div className="h-48 w-full bg-black/40 relative border-b border-terminal-darkGreen/30 overflow-hidden">
      <div className="absolute top-2 left-4 z-10 flex items-center gap-2">
        <span className="text-[9px] font-black text-white/50 border-b border-white/20 pb-0.5 tracking-widest uppercase">Depth Chart</span>
        <ChevronDown size={10} className="text-white/30" />
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 40, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorBids" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4ade80" stopOpacity={0.6}/>
              <stop offset="95%" stopColor="#4ade80" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorAsks" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.6}/>
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <XAxis dataKey="price" hide domain={['dataMin', 'dataMax']} type="number" />
          <YAxis hide />
          <Area type="stepAfter" dataKey="bids" stroke="#4ade80" fillOpacity={1} fill="url(#colorBids)" isAnimationActive={false}/>
          <Area type="stepAfter" dataKey="asks" stroke="#ef4444" fillOpacity={1} fill="url(#colorAsks)" isAnimationActive={false}/>
        </AreaChart>
      </ResponsiveContainer>
      <div className="absolute bottom-1 w-full flex justify-between px-4 pointer-events-none">
        <span className="text-[11px] font-black text-white/90 tabular-nums bg-black/40 px-1">{leftEdge.toLocaleString(undefined, { minimumFractionDigits: 1 })}</span>
        <span className="text-[11px] font-black text-white/90 tabular-nums bg-black/40 px-1">{rightEdge.toLocaleString(undefined, { minimumFractionDigits: 1 })}</span>
      </div>
    </div>
  );
};

const OrderBookView: React.FC<{ book: OrderBook, symbol: string }> = ({ book, symbol }) => {
  const processedAsks = useMemo(() => {
    let total = 0;
    const askPrices = book.asks.map(a => parseFloat(a.qty));
    const avg = askPrices.length > 0 ? askPrices.reduce((a, b) => a + b, 0) / askPrices.length : 0;
    const std = askPrices.length > 0 ? Math.sqrt(askPrices.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / askPrices.length) : 0;

    return [...book.asks].map(ask => {
      const qty = parseFloat(ask.qty);
      total += qty;
      return { ...ask, cumulative: total, isWall: qty > (avg + std * 2.5) };
    }).reverse();
  }, [book.asks]);

  const processedBids = useMemo(() => {
    let total = 0;
    const bidPrices = book.bids.map(b => parseFloat(b.qty));
    const avg = bidPrices.length > 0 ? bidPrices.reduce((a, b) => a + b, 0) / bidPrices.length : 0;
    const std = bidPrices.length > 0 ? Math.sqrt(bidPrices.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / bidPrices.length) : 0;

    return [...book.bids].map(bid => {
      const qty = parseFloat(bid.qty);
      total += qty;
      return { ...bid, cumulative: total, isWall: qty > (avg + std * 2.5) };
    });
  }, [book.bids]);

  const stats = useMemo(() => {
    const totalBidQty = book.bids.reduce((a, b) => a + parseFloat(b.qty), 0);
    const totalAskQty = book.asks.reduce((a, b) => a + parseFloat(a.qty), 0);
    const imbalance = totalBidQty / (totalBidQty + totalAskQty || 1);
    
    const bidValue = book.bids.reduce((a, b) => a + (parseFloat(b.price) * parseFloat(b.qty)), 0);
    const askValue = book.asks.reduce((a, b) => a + (parseFloat(a.price) * parseFloat(a.qty)), 0);

    return { imbalance, bidValue, askValue, totalBidQty, totalAskQty };
  }, [book]);

  const maxTotal = useMemo(() => {
    const askTotal = processedAsks.length > 0 ? processedAsks[0].cumulative : 0;
    const bidTotal = processedBids.length > 0 ? processedBids[processedBids.length - 1].cumulative : 0;
    return Math.max(askTotal, bidTotal, 0.0001);
  }, [processedAsks, processedBids]);

  const bestBid = parseFloat(book.bids[0]?.price || '0');
  const bestAsk = parseFloat(book.asks[0]?.price || '0');
  const midPrice = (bestBid + bestAsk) / 2;
  const spread = bestAsk - bestBid;
  const spreadPct = midPrice > 0 ? (spread / midPrice) * 100 : 0;

  const isEmpty = book.bids.length === 0 && book.asks.length === 0;

  return (
    <div className="flex flex-col h-full bg-[#020202] border border-terminal-darkGreen font-mono select-none overflow-hidden shadow-2xl relative">
      {isEmpty && (
        <div className="absolute inset-0 bg-black/80 z-[100] flex flex-col items-center justify-center gap-4">
          <Activity size={32} className="text-terminal-green animate-pulse" />
          <div className="text-center">
            <div className="text-xs font-black text-terminal-green tracking-[0.4em] uppercase">Synchronizing_L2_Data</div>
            <div className="text-[9px] text-gray-500 font-bold uppercase mt-1">Establishing SECURE_DATA_LINK for {symbol}</div>
          </div>
        </div>
      )}
      
      <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-terminal-darkGreen/30">
        <div className="flex-1">
          <MarketDepthChart book={book} />
        </div>
        <div className="w-full lg:w-72 bg-black/40 p-4 flex flex-col gap-3 shrink-0">
          <div className="flex items-center gap-2 text-terminal-green text-[10px] font-black uppercase tracking-widest">
            <Scale size={14} /> DEPTH_ANALYSIS_ENGINE
          </div>
          
          <div className="space-y-4 mt-2">
            <div>
              <div className="flex justify-between text-[9px] font-black mb-1">
                <span className="text-gray-500 uppercase">VOLUME_IMBALANCE</span>
                <span className={stats.imbalance > 0.5 ? 'text-terminal-green' : 'text-red-500'}>
                  {(stats.imbalance * 100).toFixed(1)}% BIDS
                </span>
              </div>
              <div className="h-2 bg-gray-900 overflow-hidden flex border border-terminal-darkGreen/20">
                <div className="h-full bg-terminal-green transition-all duration-700" style={{ width: `${stats.imbalance * 100}%` }}></div>
                <div className="h-full bg-red-600 transition-all duration-700" style={{ width: `${(1 - stats.imbalance) * 100}%` }}></div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 border border-terminal-darkGreen/20 bg-black/20">
                <div className="text-[8px] text-gray-600 font-bold uppercase">TOTAL_BID_VAL</div>
                <div className="text-[11px] text-terminal-green font-black">${(stats.bidValue/1000).toFixed(1)}K</div>
              </div>
              <div className="p-2 border border-terminal-darkGreen/20 bg-black/20">
                <div className="text-[8px] text-gray-600 font-bold uppercase">TOTAL_ASK_VAL</div>
                <div className="text-[11px] text-red-500 font-black">${(stats.askValue/1000).toFixed(1)}K</div>
              </div>
            </div>

            <div className="p-2 border border-terminal-alert/20 bg-red-950/5">
              <div className="flex items-center gap-2 text-[8px] text-terminal-alert font-bold uppercase mb-1">
                <AlertTriangle size={10} /> DETECTED_WALLS
              </div>
              <div className="text-[10px] text-gray-400 font-medium">
                {processedAsks.filter(a => a.isWall).length + processedBids.filter(b => b.isWall).length} LARGE_LIQUIDITY_BARRIERS_DETECTED
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex bg-black/95 text-[8px] text-gray-500 font-black uppercase tracking-widest border-y border-terminal-darkGreen/20 py-2">
          <div className="flex-1 px-4">PRICE_INDEX</div>
          <div className="w-32 px-4 text-right">SIZE_{symbol}</div>
          <div className="w-32 px-4 text-right">CUMULATIVE</div>
          <div className="w-32 px-4 text-right hidden sm:block">TOTAL_USD</div>
        </div>

        {/* Asks (Sells) */}
        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col justify-end bg-red-950/5 min-h-[100px]">
          {processedAsks.map((level, i) => {
            const width = (level.cumulative / maxTotal) * 100;
            return (
              <div key={`ask-${level.price}-${i}`} className={`flex items-center h-6 relative group hover:bg-red-500/10 transition-colors border-b border-red-900/5 ${level.isWall ? 'bg-red-500/10' : ''}`}>
                <div className="absolute inset-y-0 right-0 bg-red-600/10 transition-all duration-500" style={{ width: `${width}%` }}></div>
                <div className={`flex-1 px-4 font-black tabular-nums z-10 ${level.isWall ? 'text-white' : 'text-red-500'}`}>
                  {parseFloat(level.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  {level.isWall && <span className="ml-2 text-[8px] bg-red-600 text-white px-1">WALL</span>}
                </div>
                <div className="w-32 px-4 text-right text-gray-400 font-bold tabular-nums z-10">{parseFloat(level.qty).toLocaleString(undefined, { maximumFractionDigits: 4 })}</div>
                <div className="w-32 px-4 text-right text-gray-500 tabular-nums z-10">{level.cumulative.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                <div className="w-32 px-4 text-right text-red-200/40 font-black tabular-nums z-10 hidden sm:block">
                  ${(parseFloat(level.price) * level.cumulative).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Mid Price Separator */}
        <div className="bg-black border-y-2 border-terminal-darkGreen/40 py-3 px-6 flex justify-between items-center shrink-0 z-20 shadow-[0_0_30px_rgba(0,0,0,1)] relative overflow-hidden">
           <div className="absolute inset-0 bg-terminal-green/5 animate-pulse pointer-events-none"></div>
           <div className="flex flex-col">
              <span className="text-white text-2xl font-black tracking-widest tabular-nums terminal-glow">
                {midPrice > 0 ? midPrice.toLocaleString(undefined, { minimumFractionDigits: 2 }) : 'AWAITING_PX'}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-gray-500 font-bold uppercase tracking-tighter">MARKET_MID_PX</span>
                <span className="text-[8px] bg-terminal-darkGreen/30 px-1 text-terminal-green font-black">SPREAD: {spreadPct.toFixed(4)}%</span>
              </div>
           </div>
           <div className="text-right">
              <div className="text-terminal-dim font-black text-sm tabular-nums flex items-center justify-end gap-1">
                <ArrowUpDown size={12} /> {spread.toFixed(2)}
              </div>
              <div className="text-[8px] text-gray-600 font-bold uppercase">SPREAD_DELTA_USD</div>
           </div>
        </div>

        {/* Bids (Buys) */}
        <div className="flex-1 overflow-y-auto bg-green-950/5 custom-scrollbar min-h-[100px]">
          {processedBids.map((level, i) => {
            const width = (level.cumulative / maxTotal) * 100;
            return (
              <div key={`bid-${level.price}-${i}`} className={`flex items-center h-6 relative group hover:bg-terminal-green/10 transition-colors border-b border-terminal-darkGreen/5 ${level.isWall ? 'bg-terminal-green/10' : ''}`}>
                <div className="absolute inset-y-0 right-0 bg-terminal-green/10 transition-all duration-500" style={{ width: `${width}%` }}></div>
                <div className={`flex-1 px-4 font-black tabular-nums z-10 ${level.isWall ? 'text-white' : 'text-terminal-green'}`}>
                  {parseFloat(level.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  {level.isWall && <span className="ml-2 text-[8px] bg-red-600 text-white px-1">WALL</span>}
                </div>
                <div className="w-32 px-4 text-right text-gray-400 font-bold tabular-nums z-10">{parseFloat(level.qty).toLocaleString(undefined, { maximumFractionDigits: 4 })}</div>
                <div className="w-32 px-4 text-right text-gray-500 tabular-nums z-10">{level.cumulative.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                <div className="w-32 px-4 text-right text-terminal-dim/40 font-black tabular-nums z-10 hidden sm:block">
                   ${(parseFloat(level.price) * level.cumulative).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// VIRTUALIZED INFINITY SCROLL LIST
const TradeTerminal: React.FC<TradeTerminalProps> = ({ title, trades, minSizeUsd, isUnified }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const [lastViewedId, setLastViewedId] = useState<number | null>(null);

  const filtered = useMemo(() => {
    return trades.filter(t => parseFloat(t.quoteQty) >= minSizeUsd);
  }, [trades, minSizeUsd]);

  const missedCount = useMemo(() => {
    if (isAutoScroll || filtered.length === 0 || !lastViewedId) return 0;
    const index = filtered.findIndex(t => t.id === lastViewedId);
    return index === -1 ? filtered.length : index;
  }, [filtered, isAutoScroll, lastViewedId]);

  // Handle auto-scroll to top when new trades arrive
  useEffect(() => {
    if (isAutoScroll && containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [filtered, isAutoScroll]);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const { scrollTop } = containerRef.current;
    setScrollTop(scrollTop);
    
    // Auto-scroll threshold: if within 5px of top, resume auto-scroll
    const nearTop = scrollTop < 5;
    if (nearTop !== isAutoScroll) {
      setIsAutoScroll(nearTop);
      if (nearTop) {
        setLastViewedId(null);
      } else {
        setLastViewedId(filtered[0]?.id || null);
      }
    }
  }, [isAutoScroll, filtered]);

  // Virtualization calculations
  const rowHeight = 30;
  const visibleCount = containerRef.current ? Math.ceil(containerRef.current.clientHeight / rowHeight) + 5 : 40;
  const startIndex = Math.floor(scrollTop / rowHeight);
  const visibleItems = filtered.slice(startIndex, startIndex + visibleCount);
  const totalHeight = filtered.length * rowHeight;
  const offsetY = startIndex * rowHeight;

  return (
    <div className={`flex flex-col h-full bg-[#050505] border border-terminal-darkGreen overflow-hidden shadow-2xl relative group ${isUnified ? 'border-terminal-green/30' : ''}`}>
      <div className={`p-2 border-b border-terminal-darkGreen flex justify-between items-center z-30 bg-black/90`}>
        <span className="text-[10px] font-black text-terminal-green tracking-[0.4em] uppercase flex items-center gap-2">
           {isUnified ? <ShieldAlert size={12} className="animate-pulse text-yellow-500" /> : <Database size={12} />} {title}
        </span>
        <div className="flex items-center gap-2">
           <History size={10} className="text-gray-600" />
           <span className="text-[8px] text-gray-600 font-bold uppercase tracking-widest">{filtered.length} PKTS_BUFF</span>
        </div>
      </div>
      
      {/* Scroll Header */}
      <div className="flex bg-black/95 text-gray-700 uppercase font-black text-[8px] tracking-[0.3em] border-b border-terminal-darkGreen/40 z-20">
         {isUnified && <div className="w-[120px] shrink-0 p-2 pl-3 border-r border-terminal-darkGreen/10">EXCHANGE</div>}
         <div className="flex-1 p-2 px-3">PRICE</div>
         <div className="w-[100px] shrink-0 p-2 px-3 text-right">SIZE</div>
         <div className="w-[110px] shrink-0 p-2 px-3 text-right">USD_VAL</div>
         <div className="w-[80px] shrink-0 p-2 px-3 text-right hidden sm:block">TIME</div>
      </div>

      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto custom-scrollbar bg-black relative"
      >
        <div style={{ height: `${totalHeight}px`, width: '100%' }} className="relative">
          <div 
            className="absolute top-0 left-0 w-full"
            style={{ transform: `translate3d(0, ${offsetY}px, 0)` }}
          >
            {visibleItems.map((t, idx) => (
              <TradeRow key={`${t.id}-${startIndex + idx}`} t={t} idx={startIndex + idx} isUnified={!!isUnified} />
            ))}
          </div>
        </div>
        
        {filtered.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center p-32 text-center text-gray-800 uppercase italic tracking-[0.6em] font-black animate-pulse">LOCKING_DATA_CONDUIT...</div>
        )}
      </div>

      {/* Floating HUD for paused scroll */}
      {!isAutoScroll && missedCount > 0 && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 animate-in fade-in slide-in-from-top-4">
           <button 
             onClick={() => {
                if (containerRef.current) containerRef.current.scrollTop = 0;
                setIsAutoScroll(true);
             }}
             className="bg-terminal-green text-black px-4 py-2 text-[10px] font-black flex items-center gap-3 shadow-[0_0_20px_rgba(74,222,128,0.4)] border border-white/20 hover:bg-white transition-all"
           >
             <MousePointer2 size={12} className="animate-bounce" />
             LIVE_TRACKING_PAUSED :: {missedCount} NEW_PACKETS_MISSED :: JUMP_TO_TIP
           </button>
        </div>
      )}
    </div>
  );
};

export const LiveTradeFeed: React.FC<{ initialAsset?: string }> = ({ initialAsset = 'BTC' }) => {
  const [asset, setAsset] = useState(initialAsset);
  const [minSize, setMinSize] = useState(1000);
  const [displayMode, setDisplayMode] = useState<'SPLIT' | 'UNIFIED' | 'ORDERBOOK'>('UNIFIED');
  const [prices, setPrices] = useState<{ [key: string]: string }>({});
  const [orderBook, setOrderBook] = useState<OrderBook>({ bids: [], asks: [] });
  const [tradesPerSec, setTradesPerSec] = useState(0);
  const [streams, setStreams] = useState<{ [key: string]: Trade[] }>({
    'BINANCE_SPOT': [], 'BINANCE_PERP': [], 'BYBIT_SPOT': [], 'BYBIT_PERP': [],
    'OKX_SPOT': [], 'OKX_PERP': [], 'HYPERLIQUID': [], 'MEXC_SPOT': []
  });

  const lastUpdateRef = useRef<number>(Date.now());
  const tradeCounterRef = useRef<number>(0);
  const wsManagerRef = useRef<TradeWebSocketManager | null>(null);

  useEffect(() => {
    if (!wsManagerRef.current) {
      wsManagerRef.current = new TradeWebSocketManager((trade) => {
        tradeCounterRef.current++;
        setStreams(prev => {
          const source = trade.source || 'UNKNOWN';
          const existing = prev[source] || [];
          return {
            ...prev,
            [source]: [trade, ...existing].slice(0, 2000)
          };
        });
      });
    }

    wsManagerRef.current.setSymbol(asset);
    wsManagerRef.current.start();

    const tpsInterval = setInterval(() => {
      const now = Date.now();
      const elapsed = (now - lastUpdateRef.current) / 1000;
      setTradesPerSec(Math.floor(tradeCounterRef.current / (elapsed || 1)));
      tradeCounterRef.current = 0;
      lastUpdateRef.current = now;
    }, 1000);

    return () => {
      clearInterval(tpsInterval);
      wsManagerRef.current?.stop();
    };
  }, [asset]);

  const pollPrices = async () => {
    const symbols: { [key: string]: string } = {
        'BINANCE': `${asset.toUpperCase()}USDT`, 
        'BYBIT': `${asset.toUpperCase()}USDT`, 
        'OKX': `${asset.toUpperCase()}-USDT`, 
        'HL': asset.toUpperCase(), 
        'MEXC': `${asset.toUpperCase()}USDT`
    };
    const priceResults = await Promise.allSettled([
        fetchAllPrices(), fetchBybitPrices(), fetchOkxPrices(), fetchHyperliquidPrices(), fetchMexcAllPrices()
    ]);
    const newPrices: { [key: string]: string } = {};
    const exNames = ['BINANCE', 'BYBIT', 'OKX', 'HL', 'MEXC'];
    priceResults.forEach((res, idx) => {
        if (res.status === 'fulfilled') {
            const list = res.value as any[];
            const match = list.find(p => p.symbol === symbols[exNames[idx]]);
            if (match) newPrices[exNames[idx]] = match.price;
        }
    });
    setPrices(newPrices);
  };

  const pollBook = useCallback(async () => {
    if (displayMode !== 'ORDERBOOK') return;
    const bSymbol = `${asset.toUpperCase()}USDT`;
    try {
      const book = await fetchOrderBook(bSymbol, 100);
      if (book.bids.length > 0 || book.asks.length > 0) {
        setOrderBook(book);
      }
    } catch (e) {
      console.error("DOM Poll failed", e);
    }
  }, [asset, displayMode]);

  useEffect(() => {
    setAsset(initialAsset);
    setStreams({
      'BINANCE_SPOT': [], 'BINANCE_PERP': [], 'BYBIT_SPOT': [], 'BYBIT_PERP': [],
      'OKX_SPOT': [], 'OKX_PERP': [], 'HYPERLIQUID': [], 'MEXC_SPOT': []
    });
    setPrices({});
    
    pollPrices();
    if (displayMode === 'ORDERBOOK') pollBook();
    
    const pInt = setInterval(pollPrices, 4000);
    const bInt = setInterval(pollBook, 1500);
    
    return () => { 
      clearInterval(pInt); 
      clearInterval(bInt); 
    };
  }, [asset, initialAsset, displayMode, pollBook]);

  const unifiedTrades = useMemo(() => {
    const allTrades = Object.values(streams).flat() as Trade[];
    return allTrades
      .sort((a, b) => b.time - a.time)
      .slice(0, 2000);
  }, [streams]);

  const volumeWeight = useMemo(() => {
    let buy = 0, sell = 0;
    unifiedTrades.slice(0, 50).forEach(t => {
      const v = parseFloat(t.quoteQty);
      if (t.isBuyerMaker) sell += v; else buy += v;
    });
    return buy / (buy + sell || 1);
  }, [unifiedTrades]);

  return (
    <div className="flex flex-col h-full bg-black border border-terminal-darkGreen font-mono overflow-hidden">
      <div className="bg-black border-b-2 border-terminal-darkGreen flex items-center overflow-hidden h-12 relative">
        <div className="flex items-center gap-6 animate-scroll-normal whitespace-nowrap min-w-full">
           {Object.entries(prices).map(([ex, pr]) => (
             <div key={ex} className="flex items-center gap-3 px-6 border-r border-terminal-darkGreen/40">
                <span className={`text-[10px] font-black uppercase tracking-tighter ${VENUE_METADATA[ex + '_SPOT']?.color || 'text-gray-500'}`}>{ex}</span>
                <span className="text-sm text-white font-black tabular-nums group-hover:scale-105 transition-transform">${parseFloat(pr as string).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
             </div>
           ))}
        </div>
      </div>

      <div className="bg-black/90 border-b border-terminal-darkGreen grid grid-cols-1 md:grid-cols-4 divide-x divide-terminal-darkGreen">
        <div className="p-4 flex items-center gap-4 bg-terminal-darkGreen/5">
          <Globe size={24} className="text-terminal-green animate-spin-fast" />
          <div className="flex-1">
            <h2 className="text-xs font-black text-white uppercase tracking-[0.3em]">{asset}_CONDUIT</h2>
            <div className="text-[8px] text-terminal-green font-bold uppercase">WS_LIVE_V2 // {displayMode}</div>
          </div>
        </div>

        {/* Trade Size Filter HUD */}
        <div className="p-4 bg-black border-r border-terminal-darkGreen flex flex-col justify-center">
          <div className="flex justify-between items-center mb-1.5">
            <div className="flex items-center gap-2">
              <Filter size={12} className="text-terminal-green" />
              <span className="text-[9px] text-gray-500 font-black uppercase">SIZE_FILTER</span>
            </div>
            <span className="text-[10px] font-black text-terminal-green tabular-nums">${minSize.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2">
             <input 
               type="range" 
               min="0" 
               max="100000" 
               step="500" 
               value={minSize} 
               onChange={(e) => setMinSize(parseInt(e.target.value))}
               className="flex-1 h-1 bg-gray-900 appearance-none cursor-pointer accent-terminal-green hover:accent-white transition-all"
             />
             <div className="flex gap-1">
               {[0, 1000, 10000, 100000].map(v => (
                 <button 
                   key={v} 
                   onClick={() => setMinSize(v)}
                   className={`text-[8px] font-black w-6 h-4 border border-terminal-darkGreen flex items-center justify-center transition-colors ${minSize === v ? 'bg-terminal-green text-black border-terminal-green' : 'text-gray-600 hover:text-white'}`}
                 >
                   {v === 100000 ? '100K' : v === 10000 ? '10K' : v === 1000 ? '1K' : 'ALL'}
                 </button>
               ))}
             </div>
          </div>
        </div>

        <div className="p-4 flex items-center justify-between bg-terminal-darkGreen/5 px-6">
           <div className="flex flex-col">
              <span className="text-[9px] text-gray-500 font-black uppercase">LIVE_TPS</span>
              <span className="text-base text-white font-black tabular-nums">{tradesPerSec} OPS/S</span>
           </div>
           <div className="flex flex-col items-end">
             <span className="text-[9px] text-gray-500 font-black uppercase">BIAS</span>
             <span className={`text-sm font-black ${volumeWeight > 0.5 ? 'text-green-400' : 'text-red-500'}`}>{(volumeWeight * 100).toFixed(0)}%</span>
           </div>
           <Activity size={20} className="text-terminal-green animate-pulse" />
        </div>

        <div className="p-2 flex items-center gap-1.5 bg-black">
          <button onClick={() => setDisplayMode('SPLIT')} className={`flex-1 h-full text-[9px] font-black border transition-all flex items-center justify-center gap-1.5 ${displayMode === 'SPLIT' ? 'bg-terminal-green text-black border-terminal-green shadow-[0_0_10px_rgba(74,222,128,0.4)]' : 'text-gray-500 border-terminal-darkGreen hover:text-white'}`}><LayoutGrid size={12}/> MATRIX</button>
          <button onClick={() => setDisplayMode('UNIFIED')} className={`flex-1 h-full text-[9px] font-black border transition-all flex items-center justify-center gap-1.5 ${displayMode === 'UNIFIED' ? 'bg-terminal-green text-black border-terminal-green shadow-[0_0_10px_rgba(74,222,128,0.4)]' : 'text-gray-500 border-terminal-darkGreen hover:text-white'}`}><Table size={12}/> FEED</button>
          <button onClick={() => setDisplayMode('ORDERBOOK')} className={`flex-1 h-full text-[9px] font-black border transition-all flex items-center justify-center gap-1.5 ${displayMode === 'ORDERBOOK' ? 'bg-terminal-green text-black border-terminal-green shadow-[0_0_10px_rgba(74,222,128,0.4)]' : 'text-gray-500 border-terminal-darkGreen hover:text-white'}`}><Layers size={12}/> DOM</button>
        </div>
      </div>

      <div className="flex-1 p-2 bg-[#020202] overflow-hidden relative">
        {displayMode === 'SPLIT' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 h-full p-1 overflow-hidden">
            {Object.keys(streams).map(id => (
              <TradeTerminal key={id} title={id.replace('_', ' ')} trades={streams[id]} minSizeUsd={minSize} />
            ))}
          </div>
        ) : displayMode === 'ORDERBOOK' ? (
          <div className="h-full"><OrderBookView book={orderBook} symbol={asset} /></div>
        ) : (
          <div className="h-full"><TradeTerminal title="AGGREGATED_ORDERFLOW" trades={unifiedTrades} minSizeUsd={minSize} isUnified={true} /></div>
        )}
      </div>

      <style>{`
        @keyframes scroll-normal { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .animate-scroll-normal { animation: scroll-normal 35s linear infinite; }
        .animate-spin-fast { animation: spin 3s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        input[type='range']::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 12px;
          width: 12px;
          background: #4ade80;
          cursor: pointer;
          border: 1px solid white;
        }
      `}</style>
    </div>
  );
};