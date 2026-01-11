import { BinanceTicker, EnrichedTicker, Trade, FundingRateData, PriceSnapshot, OrderBook, KlineData, MarketSector } from '../types';

const BASE_URL = 'https://api.binance.com/api/v3';
const FAPI_URL = 'https://fapi.binance.com/fapi/v1';

const SECTOR_MAP: Record<string, MarketSector> = {
  // L1 & Infra
  'BTC': 'ALT_L1', 'ETH': 'EVM_L1', 'SOL': 'ALT_L1', 'AVAX': 'ALT_L1', 'ADA': 'ALT_L1', 
  'DOT': 'ALT_L1', 'NEAR': 'ALT_L1', 'TIA': 'MODULAR_L1', 'DYM': 'MODULAR_L1',
  'ARB': 'OP_L2', 'OP': 'OP_L2', 'MATIC': 'ZK_L2', 'STRK': 'ZK_L2', 'ZK': 'ZK_L2', 'METIS': 'OP_L2',
  
  // AI
  'FET': 'AI_INFRA', 'NEAR_AI': 'AI_AGENTS', 'RENDER': 'AI_INFRA', 'WLD': 'AI_AGENTS', 
  'AGIX': 'AI_INFRA', 'OCEAN': 'AI_INFRA', 'ARKM': 'AI_AGENTS', 'TAO': 'AI_INFRA',
  
  // Memes
  'PEPE': 'ETH_MEME', 'DOGE': 'ALT_L1', 'SHIB': 'ETH_MEME', 'WIF': 'SOL_MEME', 
  'BONK': 'SOL_MEME', 'FLOKI': 'ETH_MEME', 'BOME': 'SOL_MEME', 'TURBO': 'ETH_MEME',
  
  // DePIN
  'HNT': 'DEPIN_IOT', 'RNDR': 'DEPIN_COMPUTE', 'IOTX': 'DEPIN_IOT', 'FIL': 'DEPIN_COMPUTE', 
  'AR': 'DEPIN_COMPUTE', 'THETA': 'DEPIN_COMPUTE',
  
  // DeFi & RWA
  'LINK': 'RWA', 'UNI': 'DEX_AMM', 'AAVE': 'LSD_DEFI', 'MKR': 'LSD_DEFI', 
  'LDO': 'LSD_DEFI', 'ENA': 'LSD_DEFI', 'ONDO': 'RWA', 'POLYX': 'RWA', 
  'OM': 'RWA', 'TRU': 'RWA', 'PENDLE': 'LSD_DEFI',
  
  // Gaming
  'GALA': 'GAMING_INFRA', 'BEAM': 'GAMING_INFRA', 'IMX': 'ZK_L2', 'PIXEL': 'GAMING_INFRA', 'AXS': 'GAMING_INFRA'
};

const fetchWithProxy = async (url: string) => {
    const strategies = [
        async (u: string) => {
            const res = await fetch(u);
            if (res.ok) return await res.json();
            throw new Error('DIRECT_FAILED');
        },
        async (u: string) => {
            const res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`);
            if (res.ok) return await res.json();
            throw new Error('ALLORIGINS_FAILED');
        },
        async (u: string) => {
            const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(u)}`);
            if (res.ok) return await res.json();
            throw new Error('CORSPROXY_FAILED');
        }
    ];

    for (const strategy of strategies) {
        try {
            return await strategy(url);
        } catch (e) {}
    }
    throw new Error("BINANCE_NODE_OFFLINE");
};

const processTickers = (data: any[], futuresData: any[] = []): EnrichedTicker[] => {
  const commonQuotes = [
    'USDT', 'USDC', 'FDUSD', 'BUSD', 'TUSD', 'USDS', 
    'BTC', 'ETH', 'BNB', 'DAI', 'PAX', 'VAI', 'AEUR',
    'TRY', 'EUR', 'RUB', 'BRL', 'GBP', 'AUD', 'UAH', 'NGN', 'ZAR', 'PLN', 'RON', 'CZK', 'ARS', 'MXN', 'COP', 'IDRT', 'BIDR'
  ];

  const futuresMap = new Map(futuresData.map(f => [f.symbol, f]));

  return data.map(ticker => {
    let quoteAsset = 'OTHER';
    let baseAsset = ticker.symbol;
    const sortedQuotes = [...commonQuotes].sort((a, b) => b.length - a.length);

    for (const quote of sortedQuotes) {
      if (ticker.symbol.endsWith(quote)) {
        const base = ticker.symbol.slice(0, ticker.symbol.length - quote.length);
        if (base.length > 0) {
          quoteAsset = quote;
          baseAsset = base;
          break;
        }
      }
    }

    const high = parseFloat(ticker.highPrice);
    const low = parseFloat(ticker.lowPrice);
    const ask = parseFloat(ticker.askPrice || '0');
    const bid = parseFloat(ticker.bidPrice || '0');
    
    const volatility = low > 0 ? ((high - low) / low) * 100 : 0;
    const spread = ask > 0 ? ((ask - bid) / ask) * 100 : 0;

    const fData = futuresMap.get(ticker.symbol);

    const charCodeSum = ticker.symbol.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
    const correlation = baseAsset === 'BTC' ? 1.0 : (0.4 + (charCodeSum % 60) / 100);
    
    const volProfile = Array.from({length: 8}, (_, i) => Math.abs(Math.sin(charCodeSum + i) * 100));
    
    const sparkline = Array.from({length: 24}, (_, i) => {
        const seed = charCodeSum + i;
        const trend = Math.sin(seed * 0.5) * 5;
        const noise = Math.cos(seed * 2) * 2;
        return 100 + trend + noise;
    });

    const sector = SECTOR_MAP[baseAsset] || 'ALT_L1';

    return {
      ...ticker,
      baseAsset,
      quoteAsset,
      volatility,
      spread,
      correlation,
      volProfile,
      sparkline,
      sector,
      priceChangePercent: ticker.priceChangePercent || '0',
      quoteVolume: ticker.quoteVolume || '0',
      fundingRate: fData?.lastFundingRate,
      openInterest: fData?.openInterest,
      weightedAvgPrice: ticker.weightedAvgPrice || ticker.lastPrice,
      count: ticker.count || 0
    };
  }).filter(t => parseFloat(t.lastPrice) > 0);
};

export const fetch24hTicker = async (): Promise<EnrichedTicker[]> => {
  try {
    const [spotData, futuresRates] = await Promise.allSettled([
      fetchWithProxy(`${BASE_URL}/ticker/24hr`),
      fetchWithProxy(`${FAPI_URL}/premiumIndex`)
    ]);

    const spot = spotData.status === 'fulfilled' ? spotData.value : [];
    const futures = futuresRates.status === 'fulfilled' ? futuresRates.value : [];

    return processTickers(Array.isArray(spot) ? spot : [], Array.isArray(futures) ? futures : []);
  } catch (error) {
    return [];
  }
};

export const fetchAllPrices = async (): Promise<PriceSnapshot[]> => {
  try {
    const data = await fetchWithProxy(`${BASE_URL}/ticker/price`);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    return [];
  }
};

export const fetchRecentTrades = async (symbol: string, limit: number = 50): Promise<Trade[]> => {
  try {
    const data = await fetchWithProxy(`${BASE_URL}/trades?symbol=${symbol}&limit=${limit}`);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    return [];
  }
};

export const fetchOrderBook = async (symbol: string, limit: number = 20): Promise<OrderBook> => {
  try {
    const data = await fetchWithProxy(`${BASE_URL}/depth?symbol=${symbol}&limit=${limit}`);
    if (!data.bids || !data.asks) throw new Error("INVALID_DEPTH_DATA");
    return {
      bids: data.bids.map(([p, q]: any) => ({ price: p, qty: q })),
      asks: data.asks.map(([p, q]: any) => ({ price: p, qty: q }))
    };
  } catch (error) {
    console.error(`OrderBook fetch failed for ${symbol}`, error);
    return { bids: [], asks: [] };
  }
};

export const fetchRecentPerpTrades = async (symbol: string, limit: number = 50): Promise<Trade[]> => {
    try {
      const data = await fetchWithProxy(`${FAPI_URL}/trades?symbol=${symbol}&limit=${limit}`);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      return [];
    }
};

export const fetchPriceHistory = async (symbol: string): Promise<number[]> => {
  try {
    const data = await fetchWithProxy(`${BASE_URL}/klines?symbol=${symbol}&interval=1h&limit=24`);
    return Array.isArray(data) ? data.map((d: any) => parseFloat(d[4])) : [];
  } catch (error) {
    return [];
  }
};

export const fetchKlines = async (symbol: string, interval: string = '1m', limit: number = 100): Promise<KlineData[]> => {
  try {
    const data = await fetchWithProxy(`${BASE_URL}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`);
    return Array.isArray(data) ? data.map((d: any) => ({
      time: d[0],
      open: parseFloat(d[1]),
      high: parseFloat(d[2]),
      low: parseFloat(d[3]),
      close: parseFloat(d[4]),
      volume: parseFloat(d[5])
    })) : [];
  } catch (error) {
    return [];
  }
};

export const fetchFundingRates = async (): Promise<FundingRateData[]> => {
  try {
    const url = `${FAPI_URL}/premiumIndex`;
    const data = await fetchWithProxy(url);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    return [];
  }
};