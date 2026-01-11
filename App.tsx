import React, { useEffect, useState, useMemo, useRef } from 'react';
import { fetch24hTicker, fetchFundingRates, fetchAllPrices } from './services/binanceService.ts';
import { fetchBybitSpotTickers, fetchBybitFundingRates, fetchBybitPrices } from './services/bybitService.ts';
import { fetchCoinbaseSpotTickers, fetchCoinbaseFundingRates, fetchCoinbasePrices } from './services/coinbaseService.ts';
import { fetchHyperliquidTickers, fetchHyperliquidFunding, fetchHyperliquidPrices } from './services/hyperliquidService.ts';
import { fetchMexc24hTicker, fetchMexcAllPrices } from './services/mexcService.ts';
import { fetchCoindcxTickers, fetchCoindcxPrices } from './services/coindcxService.ts';
import { fetchCoinswitchTickers, fetchCoinswitchPrices } from './services/coinswitchService.ts';
import { fetchOkxSpotTickers, fetchOkxFundingRates, fetchOkxPrices } from './services/okxService.ts';
import { liquidationAggregator } from './services/liquidationService.ts';
import { EnrichedTicker, SortField, SortDirection, FundingRateData, Liquidation, SmartPreset, PriceSnapshot } from './types.ts';
import { AssetDetailModal } from './components/AssetDetailModal.tsx';
import { LiveTerminal, LogEntry } from './components/LiveTerminal.tsx';
import { MarketHeatmap } from './components/MarketHeatmap.tsx';
import { FundingHeatmap } from './components/FundingHeatmap.tsx';
import { LiveTradeFeed } from './components/LiveTradeFeed.tsx';
import { CarnageDashboard } from './components/CarnageDashboard.tsx';
import { TransactionVisualizer } from './components/TransactionVisualizer.tsx';
import { GlobalCommandHub } from './components/GlobalCommandHub.tsx';
import { WorldMapTerminal } from './components/WorldMapTerminal.tsx';
import { CountryDetailView } from './components/CountryDetailView.tsx';
import { CommoditiesHub } from './components/CommoditiesHub.tsx';
import { ForexHub } from './components/ForexHub.tsx';
import { BondsHub } from './components/BondsHub.tsx';
import { MacroHub } from './components/MacroHub.tsx';
import { TradeHub } from './components/TradeHub.tsx';
import { BettingHub } from './components/BettingHub.tsx';
import { ThemeScrollWheel } from './components/ThemeScrollWheel.tsx';
import { DerivativesIntelligence } from './components/DerivativesIntelligence.tsx';
import { NarrativePulse } from './components/NarrativePulse.tsx';
import { useTheme } from './contexts/ThemeContext.tsx';
import { 
  RefreshCw, BarChart2, Activity, Terminal, 
  Zap, Timer, LayoutGrid, Globe, 
  ArrowRightLeft, Cpu, Skull, Box,
  Home, Briefcase, Search, Building2, ChevronDown, TrendingUp,
  Droplets, Banknote, Landmark, LineChart, Wallet2, Trophy,
  BrainCircuit, ShieldAlert, TrendingDown, Info, Layout,
  ChevronRight, Filter, AlertTriangle, Scale, Database, BarChart3,
  Waves, Target, Sparkles, FilterX, Radar, BarChart
} from 'lucide-react';

export type ViewMode = 'MARKET' | 'FUNDING' | 'MOMENTUM' | 'HEATMAP';
export type MainHub = 'HUB' | 'CRYPTO' | 'STOCKS' | 'COMMODITIES' | 'FOREX' | 'BONDS' | 'MACRO' | 'TRADE' | 'BETTING';
export type CryptoSubTab = 'TERMINAL' | 'DERIVATIVES' | 'PULSE' | 'CONDUIT' | 'CARNAGE' | 'VISUALIZER';
export type Exchange = 'BINANCE' | 'BYBIT' | 'OKX' | 'HYPERLIQUID' | 'COINBASE' | 'MEXC' | 'COINDCX' | 'COINSWITCH';

const SaturnLogo = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-terminal-green">
    <path d="M2.5 12C2.5 10.3431 6.7533 9 12 9C17.2467 9 21.5 10.3431 21.5 12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" transform="rotate(-15 12 12)"/>
    <circle cx="12" cy="12" r="5" fill="currentColor" fillOpacity="0.9" />
    <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="0.5" />
    <path d="M10 9.5C10 9.5 11 8.5 12.5 8.5" stroke="white" strokeWidth="0.5" strokeOpacity="0.4" />
    <path d="M2.5 12C2.5 13.6569 6.7533 15 12 15C17.2467 15 21.5 13.6569 21.5 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" transform="rotate(-15 12 12)"/>
  </svg>
);

const MiniSparkline = ({ data, isPositive }: { data: number[], isPositive: boolean }) => {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((d, i) => `${(i / (data.length - 1)) * 100},${100 - ((d - min) / range) * 100}`).join(' ');
  return (
    <svg viewBox="0 0 100 100" className="w-12 h-6 overflow-visible">
      <polyline points={points} fill="none" stroke={isPositive ? '#4ade80' : '#ef4444'} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

function App() {
  const [activeHub, setActiveHub] = useState<MainHub>('HUB');
  const [cryptoTab, setCryptoTab] = useState<CryptoSubTab>('TERMINAL');
  const [exchange, setExchange] = useState<Exchange>('BINANCE');
  const [viewMode, setViewMode] = useState<ViewMode>('MARKET');
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [smartPreset, setSmartPreset] = useState<SmartPreset>('NONE');
  
  const [tickers, setTickers] = useState<EnrichedTicker[]>([]);
  const [comparisonPrices, setComparisonPrices] = useState<PriceSnapshot[]>([]);
  const [fundingRates, setFundingRates] = useState<FundingRateData[]>([]);
  const [liquidations, setLiquidations] = useState<Liquidation[]>([]);
  const [sessionStats, setSessionStats] = useState({ totalUsd: 0, count: 0 });
  const [terminalLogs, setTerminalLogs] = useState<LogEntry[]>([]);
  
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>(SortField.VOLUME);
  const [sortDirection, setSortDirection] = useState<SortDirection>(SortDirection.DESC);
  const [selectedAsset, setSelectedAsset] = useState<EnrichedTicker | null>(null);
  const [quoteFilter, setQuoteFilter] = useState<string>('USDT');
  const [visibleCount, setVisibleCount] = useState<number>(100);

  const { theme } = useTheme();

  const addLog = (log: LogEntry) => {
    setTerminalLogs(prev => [...prev.slice(-49), log]);
  };

  const clearLogs = () => {
    setTerminalLogs([{ id: 'init', timestamp: Date.now(), type: 'INFO', message: 'LOCAL_BUFFER_PURGED: RE-ESTABLISHING_LINK...' }]);
  };

  useEffect(() => {
    liquidationAggregator.start((liq) => {
      setLiquidations(prev => [liq, ...prev].slice(0, 500));
      setSessionStats(prev => ({
        totalUsd: prev.totalUsd + liq.usdValue,
        count: prev.count + 1
      }));
    });
    return () => liquidationAggregator.stop();
  }, []);

  const refreshBaseData = async () => {
    setLoading(true);
    try {
      let data: EnrichedTicker[] = [];
      let compPrices: PriceSnapshot[] = [];

      // Fetch primary node
      if (exchange === 'BINANCE') data = await fetch24hTicker();
      else if (exchange === 'BYBIT') data = await fetchBybitSpotTickers();
      else if (exchange === 'OKX') data = await fetchOkxSpotTickers();
      else if (exchange === 'HYPERLIQUID') data = await fetchHyperliquidTickers();
      else if (exchange === 'COINBASE') data = await fetchCoinbaseSpotTickers();
      else if (exchange === 'MEXC') data = await fetchMexc24hTicker();
      else if (exchange === 'COINDCX') data = await fetchCoindcxTickers();
      else if (exchange === 'COINSWITCH') data = await fetchCoinswitchTickers();
        
      // Fetch comparison node for ARB
      if (exchange !== 'BYBIT') compPrices = await fetchBybitPrices();
      else compPrices = await fetchOkxPrices();

      if (data && data.length > 0) {
        // Compute ARB spreads
        const compMap = new Map(compPrices.map(p => [p.symbol, parseFloat(p.price)]));
        const enriched = data.map(t => {
          const compPx = compMap.get(t.symbol);
          const currentPx = parseFloat(t.lastPrice);
          const arbSpread = compPx ? Math.abs((currentPx - compPx) / currentPx) * 100 : 0;
          return { ...t, arbSpread };
        });

        setTickers(enriched);
        setComparisonPrices(compPrices);
        addLog({ id: Date.now().toString(), timestamp: Date.now(), type: 'INFO', message: `SYNC_SUCCESS: Node ${exchange} established with ${data.length} active market vectors.` });
      }
    } catch (err: any) {
      addLog({ id: Date.now().toString(), timestamp: Date.now(), type: 'ERROR', message: `SYNC_FAILED: Exchange node ${exchange} unreachable.` });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeHub === 'CRYPTO' && cryptoTab === 'TERMINAL') refreshBaseData();
  }, [exchange, activeHub, cryptoTab]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === SortDirection.ASC ? SortDirection.DESC : SortDirection.ASC);
    } else {
      setSortField(field);
      setSortDirection(SortDirection.DESC);
    }
  };

  const filteredTickers = useMemo(() => {
    return tickers
      .filter(t => t.symbol.toLowerCase().includes(search.toLowerCase()))
      .filter(t => quoteFilter === 'ALL' || t.quoteAsset === quoteFilter)
      .filter(t => {
        if (smartPreset === 'NONE') return true;
        if (smartPreset === 'WHALE_WATCH') return parseFloat(t.quoteVolume) > 100000000;
        if (smartPreset === 'ARB_ALERT') return (t.arbSpread || 0) > 0.15;
        if (smartPreset === 'DECOUPLED') return t.correlation < 0.5;
        if (smartPreset === 'VOLA_SPIKE') return t.volatility > 8;
        if (smartPreset === 'HIGH_FUNDING') return Math.abs(parseFloat(t.fundingRate || '0')) > 0.0003;
        return true;
      })
      .sort((a, b) => {
        let valA: any, valB: any;
        switch (sortField) {
          case SortField.SYMBOL: valA = a.symbol; valB = b.symbol; break;
          case SortField.PRICE: valA = parseFloat(a.lastPrice); valB = parseFloat(b.lastPrice); break;
          case SortField.CHANGE: valA = parseFloat(a.priceChangePercent); valB = parseFloat(b.priceChangePercent); break;
          case SortField.VOLUME: valA = parseFloat(a.quoteVolume); valB = parseFloat(b.quoteVolume); break;
          case SortField.VOLATILITY: valA = a.volatility; valB = b.volatility; break;
          case SortField.SPREAD: valA = a.spread; valB = b.spread; break;
          case SortField.FUNDING_RATE: valA = parseFloat(a.fundingRate || '0'); valB = parseFloat(b.fundingRate || '0'); break;
          case SortField.OPEN_INTEREST: valA = parseFloat(a.openInterest || '0'); valB = parseFloat(b.openInterest || '0'); break;
          case SortField.CORRELATION: valA = a.correlation; valB = b.correlation; break;
          case SortField.ARB: valA = a.arbSpread || 0; valB = b.arbSpread || 0; break;
          default: valA = parseFloat(a.quoteVolume); valB = parseFloat(b.quoteVolume);
        }
        return sortDirection === SortDirection.ASC ? (valA < valB ? -1 : 1) : (valA > valB ? -1 : 1);
      });
  }, [tickers, search, sortField, sortDirection, quoteFilter, smartPreset]);

  return (
    <div className={`min-h-screen pb-10 bg-terminal-black font-mono text-terminal-green transition-all duration-500`}>
      <header className="sticky top-0 z-[60] border-b border-terminal-darkGreen px-6 py-4 flex flex-col md:flex-row gap-4 items-center justify-between backdrop-blur-3xl bg-terminal-black/70">
        <div className="flex items-center gap-4">
          <SaturnLogo />
          <div>
            <h1 className="text-xl font-black tracking-tighter text-terminal-contrast uppercase leading-none">GRIT_TERMINAL_PRO</h1>
            <p className="text-[8px] text-terminal-dim uppercase tracking-[0.2em] font-black mt-1">v4.5.1 // NETWORK_STABLE</p>
          </div>
        </div>

        <div className="flex bg-terminal-black/40 border border-terminal-darkGreen p-0.5 gap-0.5 overflow-x-auto no-scrollbar">
          {[
            { id: 'HUB', icon: <Terminal size={12} />, label: 'ROOT' },
            { id: 'CRYPTO', icon: <Cpu size={12} />, label: 'CRYPTO' },
            { id: 'STOCKS', icon: <Briefcase size={12} />, label: 'STOCK' },
            { id: 'COMMODITIES', icon: <Droplets size={12} />, label: 'CMDTY' },
            { id: 'BETTING', icon: <Trophy size={12} />, label: 'BET' },
            { id: 'FOREX', icon: <Banknote size={12} />, label: 'FOREX' },
            { id: 'BONDS', icon: <Landmark size={12} />, label: 'BOND' },
            { id: 'MACRO', icon: <LineChart size={12} />, label: 'MACRO' },
            { id: 'TRADE', icon: <Layout size={12} />, label: 'TRADE' }
          ].map(hub => (
            <button key={hub.id} onClick={() => { setActiveHub(hub.id as MainHub); setSelectedCountry(null); }} className={`px-4 py-2 text-[9px] font-black uppercase transition-all flex items-center gap-2 border border-transparent whitespace-nowrap ${activeHub === hub.id ? 'bg-terminal-dim text-terminal-contrast border-terminal-dim shadow-lg' : 'text-gray-500 hover:text-terminal-contrast'}`}>
              {hub.icon} {hub.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <ThemeScrollWheel />
          <button onClick={refreshBaseData} className="p-2.5 border border-terminal-darkGreen hover:bg-terminal-green hover:text-terminal-black transition-all text-terminal-green bg-terminal-black/20">
            <RefreshCw size={16} className={loading && activeHub === 'CRYPTO' ? "animate-spin" : ""} />
          </button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-screen-2xl">
        {activeHub === 'CRYPTO' && (
          <>
            <div className="flex bg-terminal-black/40 border border-terminal-darkGreen p-0.5 mb-6 overflow-x-auto no-scrollbar max-w-full">
               {[
                 { id: 'TERMINAL', label: 'TERMINAL', icon: <Terminal size={12}/> },
                 { id: 'DERIVATIVES', label: 'DERIVATIVES', icon: <TrendingUp size={12}/> },
                 { id: 'PULSE', label: 'NARRATIVE_PULSE', icon: <Zap size={12}/> },
                 { id: 'CONDUIT', label: 'LIVE_FEED', icon: <Activity size={12}/> },
                 { id: 'CARNAGE', label: 'LIQUIDATIONS', icon: <Skull size={12}/> },
                 { id: 'VISUALIZER', label: 'BLOCK_VIS', icon: <Box size={12}/> }
               ].map((tab) => (
                 <button key={tab.id} onClick={() => setCryptoTab(tab.id as CryptoSubTab)} className={`px-5 py-2 text-[9px] font-black uppercase transition-all flex items-center gap-2 border whitespace-nowrap ${cryptoTab === tab.id ? 'bg-terminal-dim text-terminal-contrast border-terminal-dim shadow-[0_0_15px_rgba(var(--terminal-dim),0.3)]' : 'text-gray-500 border-transparent hover:text-terminal-contrast'}`}>
                   {tab.icon} {tab.label}
                 </button>
               ))}
            </div>

            {cryptoTab === 'TERMINAL' && (
              <div className="space-y-8">
                <LiveTerminal 
                  logs={terminalLogs} 
                  tickers={tickers} 
                  exchange={exchange} 
                  isLoading={loading} 
                  onAddLog={addLog} 
                  onClearLogs={clearLogs} 
                />

                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-1 bg-terminal-black/40 border border-terminal-darkGreen p-1 overflow-x-auto no-scrollbar">
                    {['BINANCE', 'BYBIT', 'OKX', 'HYPERLIQUID', 'COINBASE', 'MEXC', 'COINDCX', 'COINSWITCH'].map((ex) => (
                      <button key={ex} onClick={() => setExchange(ex as Exchange)} className={`px-4 py-2 text-[9px] font-black uppercase transition-all border ${exchange === ex ? 'bg-terminal-dim text-terminal-contrast border-terminal-dim' : 'text-gray-500 border-transparent hover:text-terminal-contrast'}`}>{ex}</button>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-72">
                       <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-terminal-darkGreen" />
                       <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="SEARCH_NODE_IDENTITY..." className="w-full bg-terminal-black/60 border border-terminal-darkGreen p-3 pl-12 text-xs font-black text-terminal-green uppercase outline-none focus:border-terminal-dim transition-all" />
                    </div>
                    <select value={quoteFilter} onChange={(e) => setQuoteFilter(e.target.value)} className="bg-terminal-black border border-terminal-darkGreen p-3 text-xs font-black text-terminal-green uppercase outline-none cursor-pointer">
                      <option value="USDT">USDT</option><option value="USDC">USDC</option><option value="BTC">BTC</option><option value="ETH">ETH</option><option value="INR">INR</option><option value="ALL">ALL_QUOTES</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
                   <div className="flex items-center gap-2 px-3 py-2 bg-terminal-black/60 border border-terminal-darkGreen/40 mr-4">
                      <Sparkles size={14} className="text-terminal-dim" />
                      <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">SMART_PRESETS:</span>
                   </div>
                   {[
                     { id: 'NONE', label: 'RESET', icon: <FilterX size={12} /> },
                     { id: 'WHALE_WATCH', label: 'WHALE_WATCH', icon: <Waves size={12} /> },
                     { id: 'ARB_ALERT', label: 'ARB_ALERT', icon: <AlertTriangle size={12} /> },
                     { id: 'DECOUPLED', label: 'DECOUPLED', icon: <Cpu size={12} /> },
                     { id: 'VOLA_SPIKE', label: 'VOLA_SPIKE', icon: <Zap size={12} /> },
                     { id: 'HIGH_FUNDING', label: 'HIGH_FUNDING', icon: <Target size={12} /> },
                   ].map(preset => (
                     <button 
                       key={preset.id} 
                       onClick={() => setSmartPreset(preset.id as SmartPreset)}
                       className={`px-4 py-2 text-[9px] font-black uppercase transition-all flex items-center gap-2 border ${smartPreset === preset.id ? 'bg-terminal-dim text-white border-terminal-dim' : 'text-gray-500 border-terminal-darkGreen/40 hover:text-terminal-contrast hover:border-terminal-dim'}`}
                     >
                        {preset.icon} {preset.label}
                     </button>
                   ))}
                </div>

                <div className="flex border-b border-terminal-darkGreen/20 gap-2">
                   {['MARKET', 'FUNDING', 'HEATMAP'].map(mode => (
                     <button key={mode} onClick={() => setViewMode(mode as ViewMode)} className={`px-8 py-3 text-[9px] font-black uppercase transition-all border-b-2 ${viewMode === mode ? 'border-terminal-dim text-terminal-dim bg-terminal-dim/5' : 'border-transparent text-gray-500 hover:text-terminal-contrast'}`}>{mode}_VIEW</button>
                   ))}
                </div>

                <div className="border border-terminal-darkGreen shadow-2xl bg-terminal-black/30 backdrop-blur-xl overflow-x-auto custom-scrollbar">
                  {viewMode === 'HEATMAP' ? (
                     <MarketHeatmap tickers={filteredTickers.slice(0, 500)} onAssetClick={setSelectedAsset} />
                  ) : viewMode === 'FUNDING' ? (
                     <FundingHeatmap fundingRates={fundingRates} />
                  ) : (
                    <div className="min-w-[1400px]">
                        <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-black/60 text-gray-500 text-[8px] font-black uppercase tracking-[0.2em] border-b border-terminal-darkGreen/20 sticky top-0 z-10 tabular-nums">
                                <th className="p-4 cursor-pointer hover:text-terminal-dim" onClick={() => handleSort(SortField.SYMBOL)}>NODE_ID</th>
                                <th className="p-4 text-right cursor-pointer hover:text-terminal-dim" onClick={() => handleSort(SortField.PRICE)}>PX_INDEX</th>
                                <th className="p-4 text-right cursor-pointer hover:text-terminal-dim" onClick={() => handleSort(SortField.CHANGE)}>D_24H</th>
                                <th className="p-4 text-center">TREND_24H</th>
                                <th className="p-4 text-right cursor-pointer hover:text-terminal-dim" onClick={() => handleSort(SortField.VOLUME)}>VOLUME_USD_PROFILE</th>
                                <th className="p-4 text-right cursor-pointer hover:text-terminal-dim" onClick={() => handleSort(SortField.CORRELATION)}>CORR_BTC</th>
                                <th className="p-4 text-right cursor-pointer hover:text-terminal-dim" onClick={() => handleSort(SortField.VOLATILITY)}>VOLA</th>
                                <th className="p-4 text-right cursor-pointer hover:text-terminal-dim" onClick={() => handleSort(SortField.SPREAD)}>SPREAD</th>
                                <th className="p-4 text-right cursor-pointer hover:text-terminal-dim" onClick={() => handleSort(SortField.ARB)}>ARB%</th>
                                <th className="p-4 text-right cursor-pointer hover:text-terminal-dim" onClick={() => handleSort(SortField.FUNDING_RATE)}>FUNDING</th>
                                <th className="p-4 text-center">ANALYTICS</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-terminal-darkGreen/5 font-mono text-[11px] font-bold">
                            {loading ? (
                              <tr><td colSpan={11} className="p-32 text-center text-terminal-dim animate-pulse tracking-[0.8em] font-black uppercase">SYNCHRONIZING_MARKET_LAYER...</td></tr>
                            ) : filteredTickers.slice(0, visibleCount).map((ticker) => {
                              const changeVal = parseFloat(ticker.priceChangePercent);
                              const isPositive = changeVal >= 0;
                              const isHighChange = Math.abs(changeVal) >= 5;
                              const isHighVola = ticker.volatility > 10;
                              const fundingNum = parseFloat(ticker.fundingRate || '0');
                              const isArbSwell = (ticker.arbSpread || 0) > 0.15;
                              
                              const bgHighlight = isHighChange 
                                ? (isPositive ? 'bg-green-500/5' : 'bg-red-500/5') 
                                : isArbSwell ? 'bg-orange-500/5' : '';

                              return (
                              <tr key={ticker.symbol} className={`hover:bg-terminal-dim/10 transition-all cursor-pointer border-l-2 border-transparent hover:border-terminal-dim ${bgHighlight}`} onClick={() => setSelectedAsset(ticker)}>
                                <td className="p-3">
                                  <div className="flex flex-col">
                                    <span className="font-black text-terminal-contrast text-sm">{ticker.baseAsset}</span>
                                    <span className="text-[7px] text-gray-500 font-bold tracking-widest">{ticker.quoteAsset}</span>
                                  </div>
                                </td>
                                <td className="p-3 text-right text-terminal-contrast/80 font-black tabular-nums">${parseFloat(ticker.lastPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</td>
                                <td className={`p-3 text-right font-black tabular-nums ${isPositive ? 'text-terminal-dim' : 'text-terminal-alert'}`}>
                                  <div className="flex items-center justify-end gap-1.5">
                                    {isHighChange && (isPositive ? <TrendingUp size={12} className="animate-pulse" /> : <TrendingDown size={12} className="animate-pulse" />)}
                                    {isPositive ? '+' : ''}{ticker.priceChangePercent}%
                                  </div>
                                </td>
                                <td className="p-3 text-center">
                                   <div className="flex justify-center items-center">
                                      <MiniSparkline data={ticker.sparkline} isPositive={isPositive} />
                                   </div>
                                </td>
                                <td className="p-3 text-right">
                                   <div className="flex flex-col items-end gap-1">
                                      <span className="text-gray-500 tabular-nums">${(parseFloat(ticker.quoteVolume) / 1000000).toFixed(1)}M</span>
                                      <div className="flex gap-0.5 h-3 items-end w-24 bg-terminal-darkGreen/5">
                                         {ticker.volProfile?.map((v, idx) => (
                                           <div key={idx} className="flex-1 bg-terminal-dim/40" style={{ height: `${Math.max(10, (v/100)*100)}%` }}></div>
                                         ))}
                                      </div>
                                   </div>
                                </td>
                                <td className={`p-3 text-right tabular-nums ${ticker.correlation < 0.5 ? 'text-purple-400' : 'text-gray-500'}`}>
                                   <div className="flex items-center justify-end gap-2">
                                      {ticker.correlation.toFixed(2)}
                                      <div className="w-10 h-1 bg-gray-900 overflow-hidden">
                                         <div className="h-full bg-current" style={{ width: `${Math.abs(ticker.correlation) * 100}%` }}></div>
                                      </div>
                                   </div>
                                </td>
                                <td className={`p-3 text-right tabular-nums ${isHighVola ? 'text-orange-400 font-black' : 'text-orange-400/80'}`}>
                                   <div className="flex items-center justify-end gap-1.5">
                                      {isHighVola && <Zap size={10} className="fill-orange-400" />}
                                      {ticker.volatility.toFixed(2)}%
                                   </div>
                                </td>
                                <td className="p-3 text-right text-blue-400/70 tabular-nums">{ticker.spread.toFixed(4)}%</td>
                                <td className={`p-3 text-right tabular-nums ${isArbSwell ? 'text-orange-500 animate-pulse' : 'text-gray-600'}`}>
                                  {ticker.arbSpread ? ticker.arbSpread.toFixed(3) + '%' : '---'}
                                </td>
                                <td className={`p-3 text-right tabular-nums ${fundingNum < 0 ? 'text-green-400' : fundingNum > 0.0001 ? 'text-red-400' : 'text-gray-600'}`}>
                                  {ticker.fundingRate ? (fundingNum * 100).toFixed(4) + '%' : '---'}
                                </td>
                                <td className="p-3 text-center">
                                   <button className="text-gray-700 p-2 border border-terminal-darkGreen hover:text-terminal-dim hover:border-terminal-dim transition-all shadow-sm bg-terminal-black/20"><Target size={14} /></button>
                                </td>
                              </tr>
                            )})}
                        </tbody>
                        </table>
                    </div>
                  )}
                  {!loading && visibleCount < filteredTickers.length && (
                    <button onClick={() => setVisibleCount(v => v + 100)} className="w-full py-6 text-center text-[10px] text-gray-600 hover:text-terminal-dim border-t border-terminal-darkGreen/10 uppercase tracking-[0.6em] font-black transition-all bg-terminal-black/10">
                      [ ACCESS_NEXT_ASSET_BATCH ]
                    </button>
                  )}
                </div>
              </div>
            )}

            {cryptoTab === 'DERIVATIVES' && <div className="h-[750px] border border-terminal-darkGreen shadow-2xl bg-terminal-black/40 backdrop-blur-xl"><DerivativesIntelligence tickers={tickers} /></div>}
            {cryptoTab === 'PULSE' && <div className="h-[750px] border border-terminal-darkGreen shadow-2xl bg-terminal-black/40 backdrop-blur-xl"><NarrativePulse tickers={tickers} /></div>}
            {cryptoTab === 'CONDUIT' && <div className="h-[750px] border border-terminal-darkGreen shadow-2xl bg-terminal-black/40 backdrop-blur-xl"><LiveTradeFeed initialAsset="BTC" /></div>}
            {cryptoTab === 'CARNAGE' && <div className="h-[750px] border border-terminal-darkGreen shadow-2xl bg-terminal-black/40 backdrop-blur-xl"><CarnageDashboard liquidations={liquidations} sessionTotalUsd={sessionStats.totalUsd} sessionCount={sessionStats.count} /></div>}
            {cryptoTab === 'VISUALIZER' && <div className="h-[750px] border border-terminal-darkGreen shadow-2xl bg-terminal-black/40 backdrop-blur-xl"><TransactionVisualizer /></div>}
          </>
        )}

        {activeHub === 'HUB' && (
          <GlobalCommandHub tickers={tickers} exchange={exchange} onAssetSelect={(t) => setSelectedAsset(t)} />
        )}

        {activeHub === 'TRADE' && (
          <div className="h-[calc(100vh-180px)]"><TradeHub cryptoTickers={tickers} /></div>
        )}

        {activeHub === 'BETTING' && (
          <div className="h-[calc(100vh-180px)]"><BettingHub /></div>
        )}

        {activeHub === 'STOCKS' && (
          <div className="h-[calc(100vh-180px)] border-2 border-terminal-darkGreen shadow-2xl bg-terminal-black/40 backdrop-blur-xl">
            {selectedCountry ? (
              <CountryDetailView countryId={selectedCountry} onBack={() => setSelectedCountry(null)} />
            ) : (
              <WorldMapTerminal onCountryClick={setSelectedCountry} />
            )}
          </div>
        )}

        {activeHub === 'COMMODITIES' && (
          <div className="h-[calc(100vh-180px)] border-2 border-terminal-darkGreen shadow-2xl bg-terminal-black/40 backdrop-blur-xl"><CommoditiesHub /></div>
        )}

        {activeHub === 'FOREX' && (
          <div className="h-[calc(100vh-180px)] border-2 border-terminal-darkGreen shadow-2xl bg-terminal-black/40 backdrop-blur-xl"><ForexHub /></div>
        )}

        {activeHub === 'BONDS' && (
          <div className="h-[calc(100vh-180px)] border-2 border-terminal-darkGreen shadow-2xl bg-terminal-black/40 backdrop-blur-xl"><BondsHub /></div>
        )}

        {activeHub === 'MACRO' && (
          <div className="h-[calc(100vh-180px)] border-2 border-terminal-darkGreen shadow-2xl bg-terminal-black/40 backdrop-blur-xl"><MacroHub /></div>
        )}
      </main>
      
      {selectedAsset && (
        <AssetDetailModal ticker={selectedAsset} exchange={exchange} onClose={() => setSelectedAsset(null)} />
      )}
    </div>
  );
}

export default App;