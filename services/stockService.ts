import { KlineData } from '../types';

export interface LiveStockData {
  symbol: string;
  name?: string;
  price: number;
  currency: string;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  volume: string;
  type?: 'EQUITY' | 'ETF' | 'BOND' | 'REIT' | 'COMMODITY' | 'FOREX';
}

export interface StockHistoryPoint {
  time: number;
  price: number;
}

const YAHOO_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';

const stockCache: Record<string, { data: LiveStockData, timestamp: number }> = {};
const CACHE_TTL = 120000;

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const safeJsonParse = (text: string) => {
  try {
    const trimmed = text.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      return JSON.parse(trimmed);
    }
    return null;
  } catch (e) {
    return null;
  }
};

const fetchWithProxy = async (url: string) => {
  const strategies = [
    // Primary: AllOrigins
    async (u: string) => {
      const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(u)}&cb=${Date.now()}`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      return safeJsonParse(json.contents);
    },
    // Secondary: YaCDN
    async (u: string) => {
      const res = await fetch(`https://yacdn.org/proxy/${encodeURIComponent(u)}`);
      if (!res.ok) throw new Error();
      const text = await res.text();
      return safeJsonParse(text);
    },
    // Tertiary: CorsProxy
    async (u: string) => {
       const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(u)}`);
       if (!res.ok) throw new Error();
       return await res.json();
    }
  ];

  for (let i = 0; i < strategies.length; i++) {
    try {
      const data = await strategies[i](url);
      if (data && data.chart) return data;
      throw new Error("EMPTY_OR_INVALID_DATA");
    } catch (e: any) {
      if (i < strategies.length - 1) {
        await wait(300); 
        continue;
      }
    }
  }
  return null;
};

export const fetchStockQuote = async (symbol: string, force = false): Promise<LiveStockData | null> => {
  const cached = stockCache[symbol];
  if (!force && cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    return cached.data;
  }

  try {
    const data = await fetchWithProxy(`${YAHOO_BASE}/${encodeURIComponent(symbol)}?interval=1d&range=1d`);
    const result = data?.chart?.result?.[0];
    if (!result) return null;

    const meta = result.meta;
    const indicators = result.indicators?.quote?.[0] || {};
    
    const price = meta.regularMarketPrice ?? meta.price ?? (indicators.close ? indicators.close[indicators.close.length - 1] : 0);
    const prevClose = meta.regularMarketPreviousClose ?? meta.chartPreviousClose ?? price;
    const change = price - prevClose;
    const changePercent = prevClose !== 0 ? (change / prevClose) * 100 : 0;

    const stockData: LiveStockData = {
      symbol: meta.symbol,
      price: price,
      currency: meta.currency || 'USD',
      change: change,
      changePercent: changePercent,
      high: indicators.high?.[indicators.high.length - 1] || price,
      low: indicators.low?.[indicators.low.length - 1] || price,
      volume: meta.regularMarketVolume?.toString() || '0'
    };

    stockCache[symbol] = { data: stockData, timestamp: Date.now() };
    return stockData;
  } catch (error) {
    return null;
  }
};

/**
 * Fetches high-resolution candlestick data for non-crypto assets
 */
export const fetchStockKlines = async (symbol: string, range = '1d', interval = '5m'): Promise<KlineData[]> => {
  try {
    const data = await fetchWithProxy(`${YAHOO_BASE}/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`);
    const result = data?.chart?.result?.[0];
    if (!result || !result.timestamp) return [];

    const quotes = result.indicators.quote[0];
    return result.timestamp.map((t: number, i: number) => ({
      time: t * 1000,
      open: quotes.open[i] || quotes.close[i-1] || 0,
      high: quotes.high[i] || quotes.close[i-1] || 0,
      low: quotes.low[i] || quotes.close[i-1] || 0,
      close: quotes.close[i] || quotes.close[i-1] || 0,
      volume: quotes.volume[i] || 0
    })).filter((p: KlineData) => p.close > 0);
  } catch (error) {
    return [];
  }
};

export const fetchStockHistory = async (symbol: string, range = '1d', interval = '5m'): Promise<StockHistoryPoint[]> => {
  try {
    const data = await fetchWithProxy(`${YAHOO_BASE}/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`);
    const result = data?.chart?.result?.[0];
    if (!result || !result.timestamp) return [];

    const prices = result.indicators.quote[0].close;
    return result.timestamp.map((t: number, i: number) => ({
      time: t * 1000,
      price: prices[i] || prices[i-1] || 0
    })).filter((p: any) => p.price > 0);
  } catch (error) {
    return [];
  }
};

export const GLOBAL_INDEX_MAP: Record<string, string> = {
  'USA': '^GSPC', 'IND': '^NSEI', 'JPN': '^N225', 'GBR': '^FTSE', 'DEU': '^GDAXI',
  'CHN': '000001.SS', 'BRA': '^BVSP', 'CAN': '^GSPTSE', 'FRA': '^FCHI', 'AUS': '^AXJO',
  'KOR': '^KS11', 'HKG': '^HSI', 'ITA': 'FTSEMIB.MI', 'ESP': '^IBEX', 'RUS': 'IMOEX.ME',
  'MEX': '^MXX', 'IDN': '^JKSE', 'TUR': 'XU100.IS', 'ISR': '^TA125.TA', 'VEN': '^IBVC'
};

export const CURRENCY_SYMBOLS: Record<string, string> = {
  'USD': '$', 'EUR': '€', 'GBP': '£', 'JPY': '¥', 'INR': '₹', 
  'CNY': '¥', 'BRL': 'R$', 'CAD': 'C$', 'AUD': 'A$', 'KRW': '₩', 'HKD': 'HK$', 
  'RUB': '₽', 'MXN': '$', 'IDR': 'Rp', 'TRY': '₺', 'ILS': '₪', 'VES': 'Bs.', 'VEF': 'Bs.'
};

export const MACRO_TICKERS = {
  EQUITIES: ['AAPL', 'NVDA', 'TSLA', 'MSFT', 'RELIANCE.NS', 'TCS.NS', 'SAP.DE', 'ASML.AS', '7203.T'],
  ETFS: ['SPY', 'QQQ', 'VOO', 'IWM', 'EEM', 'VTI', 'ARKK', 'SMH'],
  BONDS: ['TLT', 'IEF', 'SHY', 'BND', 'AGG', 'LQD', 'HYG'],
  REAL_ESTATE: ['VNQ', 'O', 'AMT', 'PLD', 'CCI', 'WY', 'EQIX'],
  COMMODITIES: ['GLD', 'SLV', 'USO', 'UNG', 'DBA', 'WOOD']
};

export const BOND_MARKET_TICKERS = {
  SOVEREIGN_CURVES: [
    { country: 'USA', name: 'US Treasury', maturities: { '2Y': '^IRX', '5Y': '^FVX', '10Y': '^TNX', '30Y': '^TYX' } },
    { country: 'DEU', name: 'Germany Bund', maturities: { '2Y': '^GDBR2', '10Y': '^GDBR10' } },
    { country: 'GBR', name: 'UK Gilt', maturities: { '2Y': '^GILT2Y', '10Y': '^GILT10Y' } },
    { country: 'JPN', name: 'Japan JGB', maturities: { '10Y': '^GJGB10' } },
    { country: 'IND', name: 'India G-Sec', maturities: { '10Y': '^IN10YT' } }
  ],
  CORPORATE_GLOBAL: [
    { symbol: 'LQD', name: 'iShares Inv Grade Corp', rating: 'A/BBB', region: 'USA' },
    { symbol: 'HYG', name: 'iShares High Yield Corp', rating: 'BB/B', region: 'USA' },
    { symbol: 'JNK', name: 'SPDR Bloomberg High Yield', rating: 'B/CCC', region: 'USA' },
    { symbol: 'IEAC.L', name: 'iShares Core Euro Corp', rating: 'A/AA', region: 'Europe' },
    { symbol: 'VCSH', name: 'Vanguard Short-Term Corp', rating: 'A/BBB', region: 'USA' },
    { symbol: 'IHYG.L', name: 'iShares Euro High Yield', rating: 'BB/B', region: 'Europe' }
  ],
  INTERNATIONAL_DEBT: [
    { symbol: 'EMB', name: 'iShares JP Morgan EM Bond', region: 'Emerging Markets' },
    { symbol: 'VWOB', name: 'Vanguard EM Govt Bond', region: 'Emerging Markets' },
    { symbol: 'BNDX', name: 'Vanguard Total Intl Bond', region: 'Global Ex-US' }
  ]
};

export const BOND_TICKERS = {
  CORPORATE: BOND_MARKET_TICKERS.CORPORATE_GLOBAL,
  INTERNATIONAL: BOND_MARKET_TICKERS.INTERNATIONAL_DEBT
};

export const COMMODITY_TICKERS = {
  ENERGY: [{ symbol: 'NG=F', name: 'Natural Gas' }, { symbol: 'HO=F', name: 'Heating Oil' }, { symbol: 'RB=F', name: 'RBOB Gasoline' }],
  METALS: [{ symbol: 'GC=F', name: 'Gold' }, { symbol: 'SI=F', name: 'Silver' }, { symbol: 'HG=F', name: 'Copper' }, { symbol: 'PL=F', name: 'Platinum' }, { symbol: 'PA=F', name: 'Palladium' }],
  OIL: [{ symbol: 'CL=F', name: 'Crude Oil (WTI)' }, { symbol: 'BZ=F', name: 'Brent Crude Oil' }],
  CROPS: [{ symbol: 'ZC=F', name: 'Corn' }, { symbol: 'ZW=F', name: 'Wheat' }, { symbol: 'ZS=F', name: 'Soybeans' }, { symbol: 'SB=F', name: 'Sugar' }, { symbol: 'KC=F', name: 'Coffee' }, { symbol: 'CT=F', name: 'Cotton' }]
};

export const FOREX_TICKERS = {
  MAJORS: [
    { symbol: 'EURUSD=X', name: 'EUR/USD' }, { symbol: 'GBPUSD=X', name: 'GBP/USD' },
    { symbol: 'USDJPY=X', name: 'USD/JPY' }, { symbol: 'AUDUSD=X', name: 'AUD/USD' },
    { symbol: 'USDCAD=X', name: 'USD/CAD' }, { symbol: 'USDCHF=X', name: 'USD/CHF' },
    { symbol: 'NZDUSD=X', name: 'NZD/USD' }
  ],
  CROSSES: [
    { symbol: 'EURGBP=X', name: 'EUR/GBP' }, { symbol: 'EURJPY=X', name: 'EUR/JPY' },
    { symbol: 'GBPJPY=X', name: 'GBP/JPY' }, { symbol: 'AUDJPY=X', name: 'AUD/JPY' },
    { symbol: 'EURAUD=X', name: 'EUR/AUD' }
  ],
  EMERGING: [
    { symbol: 'USDINR=X', name: 'USD/INR' }, { symbol: 'USDILS=X', name: 'USD/ILS' },
    { symbol: 'USDBRL=X', name: 'USD/BRL' }, { symbol: 'USDMXN=X', name: 'USD/MXN' },
    { symbol: 'USDTRY=X', name: 'USD/TRY' }, { symbol: 'USDHKD=X', name: 'USD/HKD' },
    { symbol: 'USDSGD=X', name: 'USD/SGD' }
  ]
};

export const GLOBAL_FOREX_PAIRS = [
  'EURUSD=X', 'GBPUSD=X', 'USDJPY=X', 'AUDUSD=X', 'USDCAD=X', 'USDCHF=X', 'NZDUSD=X',
  'EURGBP=X', 'EURJPY=X', 'EURCHF=X', 'EURAUD=X', 'EURCAD=X', 'EURNZD=X',
  'GBPJPY=X', 'GBPCHF=X', 'GBPAUD=X', 'GBPCAD=X', 'GBPNZD=X',
  'CHFJPY=X', 'AUDJPY=X', 'CADJPY=X', 'NZDJPY=X',
  'USDINR=X', 'USDCNY=X', 'USDBRL=X', 'USDMXN=X', 'USDIDR=X', 'USDRUB=X', 'USDTRY=X',
  'USDZAR=X', 'USDILS=X', 'USDTHB=X', 'USDMYR=X', 'USDSGD=X', 'USDPHP=X',
  'USDSEK=X', 'USDNOK=X', 'USDDKK=X', 'USDCZK=X', 'USDHUF=X', 'USDPLN=X'
];

export const FOREX_MATRIX_PAIRS = [
  'EURUSD=X', 'GBPUSD=X', 'USDJPY=X', 'AUDUSD=X', 'USDCAD=X', 'USDCHF=X', 'NZDUSD=X',
  'EURGBP=X', 'EURJPY=X', 'EURCHF=X', 'EURAUD=X', 'EURCAD=X', 'EURNZD=X',
  'GBPJPY=X', 'GBPCHF=X', 'GBPAUD=X', 'GBPCAD=X', 'GBPNZD=X',
  'CHFJPY=X', 'AUDJPY=X', 'CADJPY=X', 'NZDJPY=X',
  'AUDCAD=X', 'AUDNZD=X', 'AUDCHF=X',
  'CADCHF=X', 'NZDCAD=X', 'NZDCHF=X'
];