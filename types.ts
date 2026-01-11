export interface BinanceTicker {
  symbol: string;
  priceChange: string;
  priceChangePercent: string;
  weightedAvgPrice: string;
  prevClosePrice: string;
  lastPrice: string;
  lastQty: string;
  bidPrice: string;
  bidQty: string;
  askPrice: string;
  askQty: string;
  openPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
  openTime: number;
  closeTime: number;
  firstId: number;
  lastId: number;
  count: number;
}

export interface EnrichedTicker extends BinanceTicker {
  baseAsset: string;
  quoteAsset: string;
  spread: number;
  volatility: number; 
  fundingRate?: string;
  openInterest?: string; 
  correlation: number; // Correlation to BTC (-1 to 1)
  arbSpread?: number;  // % spread vs other exchanges
  volProfile: number[]; // Array of volume segments for inline histogram
  sparkline: number[]; // 24h price points for table trend
  sector?: MarketSector;
}

export type MarketSector = 
  | 'AI_AGENTS' | 'AI_INFRA' 
  | 'DEPIN_COMPUTE' | 'DEPIN_IOT'
  | 'EVM_L1' | 'ALT_L1' | 'MODULAR_L1'
  | 'ZK_L2' | 'OP_L2' | 'INTEROP_L2'
  | 'ETH_MEME' | 'SOL_MEME' 
  | 'RWA' | 'LSD_DEFI' | 'DEX_AMM' | 'GAMING_INFRA';

export interface Trade {
  id: number;
  price: string;
  qty: string;
  quoteQty: string;
  time: number;
  isBuyerMaker: boolean;
  isBestMatch: boolean;
  source?: string;
}

export interface OrderBookLevel {
  price: string;
  qty: string;
  total?: number;
}

export interface OrderBook {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
}

export interface Liquidation {
  symbol: string;
  side: 'BUY' | 'SELL';
  price: string;
  qty: string;
  usdValue: number;
  time: number;
  exchange: string;
}

export interface MarketSummary {
  totalVolume: number;
  topGainer: BinanceTicker | null;
  topLoser: BinanceTicker | null;
  btcDominance?: number;
}

export interface FundingRateData {
  symbol: string;
  markPrice: string;
  indexPrice: string;
  lastFundingRate: string;
  nextFundingTime: number;
  interestRate: string;
  time: number;
}

export interface PriceSnapshot {
  symbol: string;
  price: string;
}

export interface KlineData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export enum SortField {
  SYMBOL = 'symbol',
  PRICE = 'lastPrice',
  CHANGE = 'priceChangePercent',
  VOLUME = 'quoteVolume',
  VOLATILITY = 'volatility',
  SPREAD = 'spread',
  FUNDING_RATE = 'fundingRate',
  OPEN_INTEREST = 'openInterest',
  CORRELATION = 'correlation',
  ARB = 'arbSpread',
  LIQUIDATION = 'liquidation',
  TRADES = 'count'
}

export enum SortDirection {
  ASC = 'asc',
  DESC = 'desc'
}

export type SmartPreset = 'NONE' | 'WHALE_WATCH' | 'ARB_ALERT' | 'DECOUPLED' | 'VOLA_SPIKE' | 'HIGH_FUNDING';

export type TimeWindow = '1m' | '3m' | '5m' | '15m';