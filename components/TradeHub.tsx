import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import * as d3 from 'd3';
import { 
  Cpu, Zap, RefreshCw, Activity, Landmark, Briefcase, 
  X, Crosshair, Wallet, ArrowUpDown, TrendingUp, TrendingDown, 
  Monitor, Database, ShieldCheck, ChevronRight, Target, 
  LineChart, Search, BrainCircuit, BarChart3, SlidersHorizontal, 
  Target as TargetCross, Clock, Globe, Settings2, Eye, EyeOff,
  PenTool, MousePointer2, MoveHorizontal, Square, Type as TypeIcon,
  Trash2, Layers, AlignLeft, BarChart, Trophy, ShieldAlert
} from 'lucide-react';
import { EnrichedTicker, KlineData, OrderBook } from '../types';
import { fetchKlines, fetchOrderBook } from '../services/binanceService';
import { TradeWebSocketManager } from '../services/tradeWebSocketService';
import { 
  fetchStockQuote, 
  fetchStockKlines, 
  CURRENCY_SYMBOLS, 
  GLOBAL_FOREX_PAIRS, 
  COMMODITY_TICKERS, 
  MACRO_TICKERS 
} from '../services/stockService';

interface TradeHubProps {
  cryptoTickers: EnrichedTicker[];
}

type TradeMode = 'SPOT' | 'PERPETUAL' | 'FUTURES';
type FooterTab = 'POSITIONS' | 'OPEN_NEW_POSITION' | 'ANALYZE';
type ChartViewType = 'CANDLE' | 'LINE' | 'OHLC';

interface Position {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL' | 'LONG' | 'SHORT' | 'BUY YES' | 'BUY NO';
  entryPrice: number;
  qty: number;
  timestamp: number;
  tp: number | null;
  sl: number | null;
  type: string; 
  mode: TradeMode;
  leverage?: number;
}

interface DrawingLevel {
  id: string;
  price: number;
  color: string;
  label?: string;
}

type AssetSector = 'CRYPTO' | 'STOCKS' | 'FOREX' | 'COMMODITIES' | 'BONDS' | 'PREDICTION_MARKET';

const FULL_SECTOR_ASSETS: Record<AssetSector, string[]> = {
  CRYPTO: ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'DOGE', 'ADA', 'AVAX', 'DOT', 'LINK', 'PEPE', 'SUI', 'APT', 'TIA'],
  STOCKS: [...MACRO_TICKERS.EQUITIES, 'AAPL', 'NVDA', 'TSLA', 'MSFT', 'AMZN', 'META', 'GOOGL'],
  FOREX: GLOBAL_FOREX_PAIRS.slice(0, 12),
  COMMODITIES: ['GLD', 'SLV', 'USO', 'UNG', 'NG=F', 'GC=F', 'CL=F'],
  BONDS: ['^TNX', '^TYX', '^IRX', 'TLT', 'IEF'],
  PREDICTION_MARKET: ['NVDA_2025_<$160', 'NVDA_2025_$160-165', 'NVDA_2025_$165-170', 'NVDA_2025_$170-175', 'BTC_100K_BY_EOY', 'ETH_ATH_2025', 'SOL_OVER_ETH_MCAP']
};

export const TradeHub: React.FC<TradeHubProps> = ({ cryptoTickers }) => {
  const [tradeMode, setTradeMode] = useState<TradeMode>('SPOT');
  const [footerTab, setFooterTab] = useState<FooterTab>('POSITIONS');
  const [activeSector, setActiveSector] = useState<AssetSector>('CRYPTO');
  const [currentAsset, setCurrentAsset] = useState('BTC');
  const [chartView, setChartView] = useState<ChartViewType>('CANDLE');
  const [indicators, setIndicators] = useState({ sma20: false, ema50: false });
  const [currentMarketPrice, setCurrentMarketPrice] = useState(0);
  const [klines, setKlines] = useState<KlineData[]>([]);
  const [orderAmount, setOrderAmount] = useState('0.1');
  const [leverage, setLeverage] = useState(10);
  const [positions, setPositions] = useState<Position[]>([]);
  const [balance, setBalance] = useState(100000); 
  const [isLoading, setIsLoading] = useState(false);
  const [drawingLevels, setDrawingLevels] = useState<DrawingLevel[]>([]);
  const [orderBook, setOrderBook] = useState<OrderBook | null>(null);
  
  const chartRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoomTransform, setZoomTransform] = useState<d3.ZoomTransform>(d3.zoomIdentity);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const apiSymbol = useMemo(() => activeSector === 'CRYPTO' ? `${currentAsset}USDT` : currentAsset, [currentAsset, activeSector]);
  const assetPositions = useMemo(() => positions.filter(p => p.symbol === currentAsset), [positions, currentAsset]);

  // Track container size
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setDimensions({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const loadAssetData = useCallback(async (symbol: string, sector: AssetSector) => {
    setIsLoading(true);
    setKlines([]);
    setCurrentMarketPrice(0);

    try {
      if (sector === 'CRYPTO') {
        const [history, book] = await Promise.all([
          fetchKlines(symbol, '1m', 150),
          fetchOrderBook(symbol, 20)
        ]);
        if (history && history.length > 0) {
          setKlines(history);
          setCurrentMarketPrice(history[history.length - 1].close);
        }
        setOrderBook(book);
      } else if (sector === 'PREDICTION_MARKET') {
        const source = symbol.includes('NVDA') ? 'NVDA' : 'AAPL';
        const history = await fetchStockKlines(source, '1d', '5m');
        if (history && history.length > 0) {
          const scaled = history.map(h => ({
            ...h,
            open: (h.open % 100),
            high: (h.high % 100),
            low: (h.low % 100),
            close: (h.close % 100)
          }));
          setKlines(scaled);
          setCurrentMarketPrice(scaled[scaled.length - 1].close);
        }
        setOrderBook(null);
      } else {
        const history = await fetchStockKlines(symbol, '1d', '5m');
        if (history && history.length > 0) {
          setKlines(history);
          setCurrentMarketPrice(history[history.length - 1].close);
        }
        setOrderBook(null);
      }
    } catch (e) {
      console.error("DATA_FAULT", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadAssetData(apiSymbol, activeSector); }, [apiSymbol, activeSector, loadAssetData]);

  useEffect(() => {
    if (activeSector !== 'CRYPTO') return;
    const ws = new TradeWebSocketManager((trade) => {
      const price = parseFloat(trade.price);
      setCurrentMarketPrice(price);
      setKlines(prev => {
        if (prev.length === 0) return prev;
        const last = { ...prev[prev.length - 1] };
        if (Date.now() - last.time > 60000) return [...prev.slice(-149), { time: Math.floor(Date.now()/60000)*60000, open: price, high: price, low: price, close: price, volume: parseFloat(trade.qty) }];
        last.close = price; last.high = Math.max(last.high, price); last.low = Math.min(last.low, price);
        return [...prev.slice(0, -1), last];
      });
    });
    ws.setSymbol(currentAsset);
    ws.start();
    return () => ws.stop();
  }, [currentAsset, activeSector]);

  const sma20Data = useMemo(() => {
    if (!indicators.sma20 || klines.length < 20) return [];
    return klines.map((d, i, arr) => {
      if (i < 19) return null;
      const avg = arr.slice(i - 19, i + 1).reduce((acc, curr) => acc + curr.close, 0) / 20;
      return { time: d.time, val: avg };
    }).filter(d => d !== null) as { time: number; val: number }[];
  }, [klines, indicators.sma20]);

  useEffect(() => {
    if (!chartRef.current || dimensions.width === 0) return;
    
    const svg = d3.select(chartRef.current);
    svg.selectAll("*").remove(); 
    
    const margin = { top: 20, right: 80, bottom: 30, left: 10 };
    const width = dimensions.width - margin.left - margin.right;
    const height = dimensions.height - margin.top - margin.bottom;

    if (width <= 0 || height <= 0) return;

    const g = svg.append("g").attr("transform", `translate(${margin.left}, ${margin.top})`);
    const gViewport = g.append("g").attr("class", "viewport");

    const dataStart = klines.length > 0 ? klines[0].time : Date.now() - 3600000;
    const dataEnd = klines.length > 0 ? klines[klines.length - 1].time : Date.now();
    const xScale = d3.scaleTime().domain([dataStart, dataEnd + (dataEnd - dataStart) * 0.1]).range([0, width]);
    const rescaledX = zoomTransform.rescaleX(xScale);

    let yMin = klines.length > 0 ? d3.min(klines, d => d.low) || 0 : 0;
    let yMax = klines.length > 0 ? d3.max(klines, d => d.high) || 0 : 100;
    
    assetPositions.forEach(p => { 
      if (isFinite(p.entryPrice)) { yMax = Math.max(yMax, p.entryPrice); yMin = Math.min(yMin, p.entryPrice); }
      if (p.tp && isFinite(p.tp)) yMax = Math.max(yMax, p.tp);
      if (p.sl && isFinite(p.sl)) yMin = Math.min(yMin, p.sl);
    });

    if (activeSector === 'PREDICTION_MARKET') {
      yMin = 0; yMax = 100;
    }

    if (!isFinite(yMin) || yMin === 0) yMin = currentMarketPrice * 0.95 || 1;
    if (!isFinite(yMax) || yMax === 0) yMax = currentMarketPrice * 1.05 || 100;
    if (yMin === yMax) { yMin -= 1; yMax += 1; }

    const yScale = d3.scaleLinear().domain([yMin * 0.999, yMax * 1.001]).range([height, 0]);

    g.append("g").attr("class", "grid-x").attr("transform", `translate(0, ${height})`)
      .call(d3.axisBottom(rescaledX).ticks(8).tickSize(-height)).attr("color", "#ffffff05").selectAll("text").attr("fill", "#444");
    g.append("g").attr("class", "grid-y").attr("transform", `translate(${width}, 0)`)
      .call(d3.axisRight(yScale).ticks(10).tickSize(-width)).attr("color", "#ffffff05").selectAll("text").attr("fill", "#4ade80").attr("font-size", "9px");

    if (klines.length > 0) {
      const candleWidth = Math.max(1, (width / klines.length) * zoomTransform.k * 0.7);
      if (chartView === 'LINE') {
        const line = d3.line<KlineData>().x(d => rescaledX(d.time)).y(d => yScale(d.close));
        gViewport.append("path").datum(klines).attr("fill", "none").attr("stroke", "#4ade80").attr("stroke-width", 2).attr("d", line);
      } else {
        const candles = gViewport.selectAll(".candle").data(klines).enter().append("g");
        candles.append("line").attr("stroke", d => d.close >= d.open ? "#4ade80" : "#ef4444")
          .attr("x1", d => rescaledX(d.time)).attr("x2", d => rescaledX(d.time))
          .attr("y1", d => yScale(d.high)).attr("y2", d => yScale(d.low));
        candles.append("rect").attr("fill", d => d.close >= d.open ? "#4ade80" : "#ef4444")
          .attr("x", d => rescaledX(d.time) - candleWidth/2).attr("y", d => yScale(Math.max(d.open, d.close)))
          .attr("width", candleWidth).attr("height", d => Math.max(1, Math.abs(yScale(d.open) - yScale(d.close))));
      }
    }

    const gUI = g.append("g").attr("class", "ui-layer");
    assetPositions.forEach(p => {
      const entryY = yScale(p.entryPrice);
      const entryX = rescaledX(p.timestamp);
      
      if (entryX > 0 && entryX < width) {
        const marker = gUI.append("g").attr("transform", `translate(${entryX}, ${entryY})`);
        marker.append("circle").attr("r", 4).attr("fill", p.side.includes('YES') || p.side.includes('BUY') || p.side.includes('LONG') ? '#4ade80' : '#ef4444').attr("stroke", "#000").attr("stroke-width", 1);
        marker.append("text").attr("y", -8).attr("text-anchor", "middle").attr("fill", "#fff").attr("font-size", "8px").attr("font-weight", "black").text(p.side);
      }

      gUI.append("line").attr("x1", 0).attr("x2", width).attr("y1", entryY).attr("y2", entryY).attr("stroke", "#ffffff20").attr("stroke-dasharray", "4,4");

      if (p.tp) {
        const tpY = yScale(p.tp);
        const tpG = gUI.append("g").attr("class", "cursor-ns-resize group/tp");
        tpG.append("line").attr("x1", 0).attr("x2", width).attr("y1", tpY).attr("y2", tpY).attr("stroke", "#4ade80").attr("stroke-width", 2).attr("stroke-dasharray", "5,2");
        tpG.append("rect").attr("x", width - 60).attr("y", tpY - 10).attr("width", 60).attr("height", 20).attr("fill", "#4ade80");
        tpG.append("text").attr("x", width - 55).attr("y", tpY + 4).attr("fill", "#000").attr("font-size", "10px").attr("font-weight", "black").text("TP");
        tpG.call(d3.drag<SVGGElement, any>().on("drag", (event) => {
          const newPrice = yScale.invert(event.y);
          setPositions(prev => prev.map(pos => pos.id === p.id ? { ...pos, tp: newPrice } : pos));
        }));
      }

      if (p.sl) {
        const slY = yScale(p.sl);
        const slG = gUI.append("g").attr("class", "cursor-ns-resize group/sl");
        slG.append("line").attr("x1", 0).attr("x2", width).attr("y1", slY).attr("y2", slY).attr("stroke", "#ef4444").attr("stroke-width", 2).attr("stroke-dasharray", "5,2");
        slG.append("rect").attr("x", width - 60).attr("y", slY - 10).attr("width", 60).attr("height", 20).attr("fill", "#ef4444");
        slG.append("text").attr("x", width - 55).attr("y", slY + 4).attr("fill", "#000").attr("font-size", "10px").attr("font-weight", "black").text("SL");
        slG.call(d3.drag<SVGGElement, any>().on("drag", (event) => {
          const newPrice = yScale.invert(event.y);
          setPositions(prev => prev.map(pos => pos.id === p.id ? { ...pos, sl: newPrice } : pos));
        }));
      }
    });

    if (currentMarketPrice > 0) {
      const cy = yScale(currentMarketPrice);
      const cG = g.append("g").attr("transform", `translate(${width}, ${cy - 10})`);
      cG.append("rect").attr("width", 80).attr("height", 20).attr("fill", "#4ade80");
      cG.append("text").attr("x", 5).attr("y", 14).attr("fill", "#000").attr("font-size", "11px").attr("font-weight", "black").text(activeSector === 'PREDICTION_MARKET' ? `${currentMarketPrice.toFixed(1)}%` : currentMarketPrice.toLocaleString());
      g.append("line").attr("x1", 0).attr("x2", width).attr("y1", cy).attr("y2", cy).attr("stroke", "#4ade80").attr("stroke-width", 0.5).attr("stroke-dasharray", "2,2");
    }

    svg.call(d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.1, 100]).on('zoom', (e) => setZoomTransform(e.transform)));

  }, [klines, zoomTransform, positions, currentMarketPrice, currentAsset, activeSector, assetPositions, chartView, dimensions, indicators, drawingLevels, orderBook]);

  const executeTrade = (side: Position['side']) => {
    const qty = parseFloat(orderAmount);
    if (isNaN(qty) || qty <= 0 || currentMarketPrice <= 0) return;
    const cost = qty * currentMarketPrice;
    const margin = tradeMode === 'SPOT' ? cost : cost / leverage;
    if (margin > balance) { alert("INSUFFICIENT_FUNDS"); return; }
    const isBuy = side.includes('BUY') || side.includes('LONG') || side.includes('YES');
    
    const newPos: Position = {
      id: Math.random().toString(36).substr(2, 6).toUpperCase(), 
      symbol: currentAsset, 
      side, 
      entryPrice: currentMarketPrice, 
      qty, 
      timestamp: Date.now(),
      type: activeSector, 
      mode: tradeMode, 
      leverage: tradeMode === 'SPOT' ? 1 : leverage,
      tp: isBuy ? currentMarketPrice * 1.1 : currentMarketPrice * 0.9, 
      sl: isBuy ? currentMarketPrice * 0.9 : currentMarketPrice * 1.1
    };
    
    setPositions(prev => [newPos, ...prev]);
    setBalance(prev => prev - (activeSector === 'PREDICTION_MARKET' ? qty * (currentMarketPrice/100) : margin));
    setFooterTab('POSITIONS');
  };

  const closePosition = (pos: Position) => {
    const isBuySide = pos.side.includes('BUY') || pos.side.includes('LONG') || pos.side.includes('YES');
    const pnl = (isBuySide ? (currentMarketPrice - pos.entryPrice) : (pos.entryPrice - currentMarketPrice)) * pos.qty;
    setBalance(prev => prev + (pos.qty * pos.entryPrice / (pos.leverage || 1)) + pnl);
    setPositions(prev => prev.filter(p => p.id !== pos.id));
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-black font-mono text-terminal-green border border-terminal-darkGreen overflow-hidden select-none">
      {/* MODE SELECTOR */}
      <div className="flex bg-[#0a0a0a] border-b border-terminal-darkGreen/60 p-1 gap-1 shrink-0">
         {(['SPOT', 'PERPETUAL', 'FUTURES'] as TradeMode[]).map(m => (
           <button 
             key={m} 
             onClick={() => setTradeMode(m)} 
             className={`px-6 py-1.5 text-[10px] font-black border transition-all ${tradeMode === m ? 'bg-terminal-green text-black border-terminal-green' : 'text-gray-500 border-transparent hover:text-white'}`}
           >
             {m}
           </button>
         ))}
      </div>

      {/* SECTOR SELECTOR */}
      <div className="flex border-b border-terminal-darkGreen bg-black/90 p-1 gap-2 shrink-0">
         {(Object.keys(FULL_SECTOR_ASSETS) as AssetSector[]).map(s => (
           <button key={s} onClick={() => { setActiveSector(s); setCurrentAsset(FULL_SECTOR_ASSETS[s][0]); }} className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest border transition-all ${activeSector === s ? 'bg-terminal-darkGreen/30 text-terminal-green border-terminal-green/40' : 'text-gray-600 border-transparent hover:text-white'}`}>{s.replace('_', ' ')}</button>
         ))}
      </div>

      {/* ASSET & TOOLBAR */}
      <div className="flex bg-black/40 border-b border-terminal-darkGreen/20 p-1 items-center shrink-0 overflow-x-auto no-scrollbar">
         <div className="flex-1 overflow-x-auto no-scrollbar flex gap-1">
          {FULL_SECTOR_ASSETS[activeSector].map(asset => (
            <button key={asset} onClick={() => setCurrentAsset(asset)} className={`px-3 py-1 text-[9px] font-black border transition-all whitespace-nowrap ${currentAsset === asset ? 'bg-terminal-green/20 text-terminal-green border-terminal-green/40' : 'text-gray-700 border-transparent hover:text-gray-400'}`}>{asset}</button>
          ))}
         </div>
         <div className="flex items-center gap-1 bg-black/60 border-l border-terminal-darkGreen/20 px-2 h-full">
            <button onClick={() => setChartView('CANDLE')} className={`p-1.5 transition-colors ${chartView === 'CANDLE' ? 'text-terminal-green' : 'text-gray-600'}`} title="Candles"><BarChart3 size={14}/></button>
            <button onClick={() => setChartView('LINE')} className={`p-1.5 transition-colors ${chartView === 'LINE' ? 'text-terminal-green' : 'text-gray-600'}`} title="Line"><LineChart size={14}/></button>
            <div className="w-[1px] h-4 bg-terminal-darkGreen/40 mx-1"></div>
            <button onClick={() => setIndicators(p => ({...p, sma20: !p.sma20}))} className={`px-2 py-0.5 text-[8px] font-black uppercase border transition-all ${indicators.sma20 ? 'bg-purple-600 text-white border-purple-400' : 'text-gray-600 border-transparent hover:text-white'}`}>SMA_20</button>
         </div>
      </div>

      {/* CHART AREA */}
      <div className="flex-1 flex flex-col bg-[#010101] relative overflow-hidden group">
         <div className="absolute top-4 left-6 z-20 flex flex-col pointer-events-none">
            <span className="text-xl font-black text-white tracking-tighter uppercase">{currentAsset.replace('_', ' ')} // {activeSector === 'PREDICTION_MARKET' ? 'BINARY' : tradeMode}</span>
            <div className="text-2xl font-black text-terminal-green tabular-nums">
              {isLoading ? 'SYNCING...' : currentMarketPrice > 0 ? (activeSector === 'PREDICTION_MARKET' ? `${currentMarketPrice.toFixed(1)}%` : `$${currentMarketPrice.toLocaleString()}`) : 'AWAITING_DATA'}
            </div>
            {activeSector === 'PREDICTION_MARKET' && (
              <div className="mt-1 flex items-center gap-4">
                 <div className="text-[10px] font-black text-gray-500 uppercase flex items-center gap-1">
                    <Activity size={10} /> Vol: $4.2M
                 </div>
                 <div className="text-[10px] font-black text-gray-500 uppercase flex items-center gap-1">
                    <Clock size={10} /> Exp: Dec 31, 2025
                 </div>
              </div>
            )}
            <div className="mt-2 flex gap-4 text-[8px] font-black text-gray-600 uppercase">
               <span>DRAG TP/SL LINES TO MODIFY</span>
               <span>D-CLICK: PLACE_LEVEL</span>
            </div>
         </div>
         
         <div ref={containerRef} className="w-full h-full relative">
            <svg ref={chartRef} className="w-full h-full cursor-crosshair"></svg>
         </div>
      </div>

      {/* FOOTER INTERFACE */}
      <div className="h-56 border-t-2 border-terminal-darkGreen bg-black flex flex-col shrink-0 z-50">
         <div className="bg-[#0a0a0a] border-b border-terminal-darkGreen/40 flex shrink-0">
            {[
              { id: 'POSITIONS', icon: <Wallet size={12} />, label: 'HOLDINGS' },
              { id: 'OPEN_NEW_POSITION', icon: <TargetCross size={12} />, label: 'EXECUTION' }
            ].map(tab => (
              <button key={tab.id} onClick={() => setFooterTab(tab.id as FooterTab)} className={`px-6 py-2 text-[9px] font-black uppercase transition-all flex items-center gap-2 border-r border-terminal-darkGreen/20 ${footerTab === tab.id ? 'bg-terminal-green text-black' : 'text-gray-500 hover:text-white'}`}>{tab.icon} {tab.label}</button>
            ))}
            <div className="ml-auto flex items-center px-6 gap-6">
               <div className="text-[9px] font-black uppercase tracking-tighter"><span className="text-gray-600">VAULT_BAL:</span> <span className="text-terminal-green">${balance.toLocaleString()}</span></div>
            </div>
         </div>
         
         <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#010101]">
            {footerTab === 'POSITIONS' && (
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-[#050505] text-[7px] text-gray-500 font-black uppercase border-b border-terminal-darkGreen/20">
                    <tr><th className="p-3 pl-6">MARKET</th><th className="p-3">ASSET</th><th className="p-3">SIDE</th><th className="p-3">SIZE</th><th className="p-3">ENTRY_PX</th><th className="p-3 text-right pr-6">CMD</th></tr>
                </thead>
                <tbody className="divide-y divide-terminal-darkGreen/10">
                    {assetPositions.map(p => (
                      <tr key={p.id} className="text-[10px] hover:bg-white/5 group">
                        <td className="p-2 pl-6 text-gray-500 uppercase">{p.type} // {p.mode}</td>
                        <td className="p-2 font-black text-white uppercase">{p.symbol}</td>
                        <td className={`p-2 font-black ${p.side.includes('YES') || p.side.includes('BUY') || p.side.includes('LONG') ? 'text-green-500' : 'text-red-500'}`}>{p.side}</td>
                        <td className="p-2 text-gray-400 font-bold">{p.qty}</td>
                        <td className="p-2 text-gray-400">{activeSector === 'PREDICTION_MARKET' ? `${p.entryPrice.toFixed(1)}%` : `$${p.entryPrice.toLocaleString()}`}</td>
                        <td className="p-2 text-right pr-6"><button onClick={() => closePosition(p)} className="p-1 border border-red-900/40 text-red-900 hover:bg-red-600 hover:text-white transition-all"><X size={12} /></button></td>
                      </tr>
                    ))}
                    {assetPositions.length === 0 && (<tr><td colSpan={6} className="p-10 text-center text-gray-800 uppercase italic font-black animate-pulse">Awaiting_Trade_Execution...</td></tr>)}
                </tbody>
              </table>
            )}

            {footerTab === 'OPEN_NEW_POSITION' && (
               <div className="p-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">
                  <div className="space-y-4">
                     <div className="space-y-2">
                        <div className="flex justify-between items-center text-[8px] font-black"><span className="text-white uppercase">ORDER_QUANTITY ({activeSector === 'PREDICTION_MARKET' ? 'SHARES' : currentAsset}):</span><span className="text-terminal-green">${(parseFloat(orderAmount) * (activeSector === 'PREDICTION_MARKET' ? currentMarketPrice/100 : currentMarketPrice)).toLocaleString()}</span></div>
                        <input type="range" min="0.001" max="1000" step="0.001" value={orderAmount} onChange={e => setOrderAmount(e.target.value)} className="w-full h-1.5 bg-gray-900 appearance-none cursor-pointer accent-terminal-green" />
                        <input type="text" value={orderAmount} onChange={e => setOrderAmount(e.target.value)} className="w-full bg-black border border-terminal-darkGreen/40 p-2 text-white font-black text-sm outline-none focus:border-terminal-green" />
                     </div>
                     {tradeMode !== 'SPOT' && activeSector !== 'PREDICTION_MARKET' && (
                       <div className="space-y-2"><div className="flex justify-between items-center text-[8px] font-black"><span className="text-white">MARGIN_LEVERAGE: {leverage}X</span></div><input type="range" min="1" max="125" step="1" value={leverage} onChange={e => setLeverage(Number(e.target.value))} className="w-full h-1.5 bg-gray-900 appearance-none cursor-pointer accent-red-600" /></div>
                     )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="grid grid-cols-2 gap-4 w-full">
                      {activeSector === 'PREDICTION_MARKET' ? (
                        <>
                          <button onClick={() => executeTrade('BUY YES')} className="py-6 bg-terminal-green text-black font-black uppercase tracking-[0.3em] hover:bg-white transition-all flex flex-col items-center justify-center gap-1 shadow-[0_0_15px_rgba(74,222,128,0.2)]">
                            <TrendingUp size={20} />
                            <span>BUY YES {(currentMarketPrice).toFixed(1)}¢</span>
                          </button>
                          <button onClick={() => executeTrade('BUY NO')} className="py-6 bg-red-600 text-white font-black uppercase tracking-[0.3em] hover:bg-red-500 transition-all flex flex-col items-center justify-center gap-1 shadow-[0_0_20px_rgba(220,38,38,0.2)]">
                            <TrendingDown size={20} />
                            <span>BUY NO {(100 - currentMarketPrice).toFixed(1)}¢</span>
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => executeTrade(tradeMode === 'SPOT' ? 'BUY' : 'LONG')} className="py-6 bg-terminal-green text-black font-black uppercase tracking-[0.3em] hover:bg-white transition-all flex flex-col items-center justify-center gap-1 shadow-[0_0_15px_rgba(74,222,128,0.2)]">
                            <TrendingUp size={20} />
                            <span>{tradeMode === 'SPOT' ? 'BUY' : 'LONG'}</span>
                          </button>
                          <button onClick={() => executeTrade(tradeMode === 'SPOT' ? 'SELL' : 'SHORT')} className="py-6 bg-red-600 text-white font-black uppercase tracking-[0.3em] hover:bg-red-500 transition-all flex flex-col items-center justify-center gap-1 shadow-[0_0_20px_rgba(220,38,38,0.2)]">
                            <TrendingDown size={20} />
                            <span>{tradeMode === 'SPOT' ? 'SELL' : 'SHORT'}</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
               </div>
            )}
         </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #000; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #14532d; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #4ade80; }
        input[type='range']::-webkit-slider-thumb { -webkit-appearance: none; height: 14px; width: 14px; background: #4ade80; cursor: pointer; border: 1px solid white; }
        .cursor-ns-resize:hover line { stroke-width: 3px; }
        .viewport { pointer-events: none; }
        .cursor-ns-resize { cursor: ns-resize; }
      `}</style>
    </div>
  );
};