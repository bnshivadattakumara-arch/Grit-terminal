import { EnrichedTicker, PriceSnapshot, Trade } from '../types';

/**
 * CoinSwitch Pro REST API Implementation
 * Enhanced with ultra-resilient proxy rotation and HTML-response protection
 */
const COINSWITCH_BASE_URLS = [
  'https://api-trading.coinswitch.co/pro/v1',
  'https://api.coinswitch.co/pro/v1'
];

const fetchWithProxy = async (endpoint: string) => {
  const targetUrl = `${COINSWITCH_BASE_URLS[0]}${endpoint}`;
  
  const strategies = [
    // Strategy 1: AllOrigins Wrapped (Usually most consistent with JSON)
    async (url: string) => {
      const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}&cb=${Date.now()}`);
      if (!res.ok) throw new Error(`ALLORIGINS_${res.status}`);
      const json = await res.json();
      if (!json.contents) throw new Error('EMPTY_CONTENTS');
      if (json.contents.trim().startsWith('<')) throw new Error('RETURNED_HTML');
      return JSON.parse(json.contents);
    },
    // Strategy 2: YaCDN
    async (url: string) => {
      const res = await fetch(`https://yacdn.org/proxy/${encodeURIComponent(url)}?cb=${Date.now()}`);
      if (!res.ok) throw new Error(`YACDN_${res.status}`);
      const text = await res.text();
      if (text.trim().startsWith('<')) throw new Error('RETURNED_HTML');
      return JSON.parse(text);
    },
    // Strategy 3: Corsproxy.io
    async (url: string) => {
      const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`);
      if (!res.ok) throw new Error(`CORSPROXY_${res.status}`);
      const text = await res.text();
      if (text.trim().startsWith('<')) throw new Error('RETURNED_HTML');
      return JSON.parse(text);
    }
  ];

  let errors: string[] = [];

  for (const strategy of strategies) {
    try {
      const data = await strategy(targetUrl);
      if (data && (data.status === 'success' || data.data || Array.isArray(data))) {
        return data;
      }
    } catch (e: any) {
      errors.push(e.message || 'FETCH_FAILED');
      continue;
    }
  }

  throw new Error(`COINSWITCH_NODE_OFFLINE: ${errors[errors.length - 1]}`);
};

export const fetchCoinswitchActiveCoins = async () => {
  try {
    const response = await fetchWithProxy('/active-coins');
    return response.data || [];
  } catch (e) {
    return [];
  }
};

export const fetchCoinswitchTickers = async (): Promise<EnrichedTicker[]> => {
  try {
    const tickerResponse = await fetchWithProxy('/ticker/24hr');
    const rawTickers = tickerResponse.data || (Array.isArray(tickerResponse) ? tickerResponse : []);

    if (!Array.isArray(rawTickers) || rawTickers.length === 0) {
      throw new Error("EMPTY_DATA_SET");
    }

    return rawTickers
      .map((t: any) => {
        const symbol = (t.symbol || t.market_name || '').toUpperCase();
        if (!symbol) return null;

        const parts = symbol.split('_');
        const baseAsset = parts[0] || symbol;
        const quoteAsset = parts[1] || 'INR';

        const last = parseFloat(t.last_price || '0');
        const high = parseFloat(t.high_price || t.high || '0');
        const low = parseFloat(t.low_price || t.low || '0');
        const volume = parseFloat(t.volume || t.volume_24h || '0');
        
        const volatility = low > 0 ? ((high - low) / low) * 100 : 0;

        // Institutional Data Mocks (Stable Calculation)
        const charCodeSum = symbol.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
        const correlation = baseAsset === 'BTC' ? 1.0 : (0.4 + (charCodeSum % 60) / 100);
        const volProfile = Array.from({length: 8}, (_, i) => Math.abs(Math.sin(charCodeSum + i) * 100));

        return {
          symbol,
          baseAsset,
          quoteAsset,
          lastPrice: t.last_price || '0',
          priceChangePercent: (t.price_change_percentage_24h || "0").toString(), 
          quoteVolume: (volume * last).toString(),
          volume: volume.toString(),
          highPrice: high.toString(),
          lowPrice: low.toString(),
          volatility,
          spread: 0,
          priceChange: "0",
          weightedAvgPrice: t.last_price || '0',
          prevClosePrice: t.last_price || '0',
          lastQty: '0',
          bidPrice: t.bid_price || '0',
          bidQty: t.bid_price || '0',
          askPrice: t.ask_price || '0',
          askQty: t.ask_price || '0',
          openPrice: t.last_price || '0',
          openTime: 0,
          closeTime: Date.now(),
          firstId: 0,
          lastId: 0,
          count: 0,
          correlation,
          volProfile
        } as EnrichedTicker;
      })
      .filter((t): t is EnrichedTicker => t !== null && parseFloat(t.lastPrice) > 0);
  } catch (error: any) {
    return []; 
  }
};

export const fetchCoinswitchPrices = async (): Promise<PriceSnapshot[]> => {
  try {
    const tickers = await fetchCoinswitchTickers();
    return tickers.map(t => ({
      symbol: t.symbol,
      price: t.lastPrice
    }));
  } catch (error) {
    return [];
  }
};

export const fetchCoinswitchKlines = async (symbol: string): Promise<number[]> => {
  try {
    const response = await fetchWithProxy(`/klines?symbol=${symbol.toLowerCase()}&interval=60&limit=24`);
    const data = response.data || (Array.isArray(response) ? response : []);
    if (Array.isArray(data)) {
      return data.map((c: any) => parseFloat(c[4])); 
    }
    return [];
  } catch (e) {
    return [];
  }
};

export const fetchCoinswitchTrades = async (symbol: string): Promise<Trade[]> => {
  try {
    const response = await fetchWithProxy(`/trades?symbol=${symbol.toLowerCase()}&limit=50`);
    const data = response.data || (Array.isArray(response) ? response : []);
    if (Array.isArray(data)) {
      return data.map((t: any, idx: number) => ({
        id: idx,
        price: t.price,
        qty: t.quantity || '0',
        quoteQty: (parseFloat(t.price) * parseFloat(t.quantity || '0')).toString(),
        time: t.timestamp || Date.now(),
        isBuyerMaker: t.side?.toLowerCase() === 'sell',
        isBestMatch: true
      }));
    }
    return [];
  } catch (e) {
    return [];
  }
};