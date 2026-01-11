import { EnrichedTicker, PriceSnapshot, Trade } from '../types';

const COINDCX_API = 'https://api.coindcx.com/exchange/ticker';
const COINDCX_PUBLIC = 'https://public.coindcx.com';

/**
 * Helper to map CoinDCX ticker symbols (e.g. BTCINR) 
 * to Public API pair formats (e.g. B-BTC_INR)
 */
const mapToPublicPair = (symbol: string): string => {
  if (!symbol) return '';
  
  let base = '';
  let quote = '';

  if (symbol.endsWith('USDT')) {
    quote = 'USDT';
    base = symbol.slice(0, -4);
  } else if (symbol.endsWith('INR')) {
    quote = 'INR';
    base = symbol.slice(0, -3);
  } else if (symbol.endsWith('USDC')) {
    quote = 'USDC';
    base = symbol.slice(0, -4);
  } else {
    return symbol; 
  }

  // CoinDCX uses B- prefix for Binance linked liquidity which is most pairs
  return `B-${base}_${quote}`;
};

const fetchWithProxy = async (url: string) => {
  const proxyStrategies = [
    // 1. Direct Fetch (Primary attempt)
    async (u: string) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(u, { signal: controller.signal });
      clearTimeout(id);
      if (!res.ok) throw new Error(`DIRECT_${res.status}`);
      return await res.json();
    },
    // 2. YaCDN
    async (u: string) => {
      const res = await fetch(`https://yacdn.org/proxy/${encodeURIComponent(u)}?cb=${Date.now()}`);
      if (!res.ok) throw new Error(`YACDN_${res.status}`);
      const text = await res.text();
      return JSON.parse(text);
    },
    // 3. AllOrigins Wrapped (GET)
    async (u: string) => {
      const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(u)}&cb=${Date.now()}`);
      if (!res.ok) throw new Error(`ALLORIGINS_${res.status}`);
      const json = await res.json();
      if (!json.contents) throw new Error('EMPTY_CONTENTS');
      return JSON.parse(json.contents);
    },
    // 4. Corsproxy.io
    async (u: string) => {
      const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(u)}`);
      if (!res.ok) throw new Error(`CORSPROXY_${res.status}`);
      return await res.json();
    },
    // 5. CodeTabs
    async (u: string) => {
      const res = await fetch(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`);
      if (!res.ok) throw new Error(`CODETABS_${res.status}`);
      return await res.json();
    }
  ];

  let errors: string[] = [];
  for (const strategy of proxyStrategies) {
    try {
      const data = await strategy(url);
      if (data) return data;
    } catch (e: any) {
      errors.push(e.message || "FAILED");
      continue;
    }
  }
  throw new Error(`COINDCX_FETCH_FAILED: ${errors.join(' | ')}`);
};

export const fetchCoindcxTickers = async (): Promise<EnrichedTicker[]> => {
  try {
    const data = await fetchWithProxy(COINDCX_API);
    const rawData = Array.isArray(data) ? data : (data?.data && Array.isArray(data.data) ? data.data : []);
    
    if (rawData.length === 0) {
      console.warn("CoinDCX response was not an array or was empty", data);
      return [];
    }

    return rawData
      .map((t: any) => {
        const symbol = (t.market || t.symbol || t.market_name || '').toUpperCase();
        if (!symbol) return null;

        let quoteAsset = 'INR';
        let baseAsset = symbol;

        // Categorize by quote asset for filtering
        if (symbol.endsWith('USDT')) {
          quoteAsset = 'USDT';
          baseAsset = symbol.slice(0, -4);
        } else if (symbol.endsWith('INR')) {
          quoteAsset = 'INR';
          baseAsset = symbol.slice(0, -3);
        } else if (symbol.endsWith('USDC')) {
          quoteAsset = 'USDC';
          baseAsset = symbol.slice(0, -4);
        } else if (symbol.endsWith('BTC')) {
          quoteAsset = 'BTC';
          baseAsset = symbol.slice(0, -3);
        }

        const last = parseFloat(t.last_price || '0');
        const high = parseFloat(t.high || '0');
        const low = parseFloat(t.low || '0');
        const change = parseFloat(t.change_24_hour || '0');
        
        const volatility = low > 0 ? ((high - low) / low) * 100 : 0;
        const ask = parseFloat(t.ask || '0');
        const bid = parseFloat(t.bid || '0');
        const spread = ask > 0 ? ((ask - bid) / ask) * 100 : 0;

        // Institutional Data Mocks (Stable Calculation)
        const charCodeSum = symbol.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
        const correlation = baseAsset === 'BTC' ? 1.0 : (0.4 + (charCodeSum % 60) / 100);
        const volProfile = Array.from({length: 8}, (_, i) => Math.abs(Math.sin(charCodeSum + i) * 100));

        return {
          symbol,
          baseAsset,
          quoteAsset,
          lastPrice: t.last_price || '0',
          priceChangePercent: change.toFixed(2), 
          quoteVolume: (parseFloat(t.volume || '0') * last).toString(),
          volume: t.volume || '0',
          highPrice: t.high || '0',
          lowPrice: t.low || '0',
          volatility,
          spread,
          priceChange: "0",
          weightedAvgPrice: t.last_price || '0',
          prevClosePrice: t.last_price || '0',
          lastQty: '0',
          bidPrice: t.bid || '0',
          bidQty: t.bid || '0',
          askPrice: t.ask || '0',
          askQty: t.ask || '0',
          openPrice: t.last_price || '0',
          openTime: 0,
          closeTime: (t.timestamp || Date.now() / 1000) * 1000,
          firstId: 0,
          lastId: 0,
          count: 0,
          correlation,
          volProfile
        } as EnrichedTicker;
      })
      .filter((t): t is EnrichedTicker => t !== null && parseFloat(t.lastPrice) > 0);
  } catch (error: any) {
    console.error("CoinDCX Ticker System Error", error);
    throw error;
  }
};

export const fetchCoindcxPrices = async (): Promise<PriceSnapshot[]> => {
  try {
    const data = await fetchWithProxy(COINDCX_API);
    const rawData = Array.isArray(data) ? data : (data?.data && Array.isArray(data.data) ? data.data : []);
    return rawData
      .map((t: any) => ({
        symbol: (t.market || t.symbol || '').toUpperCase(),
        price: t.last_price || '0'
      }))
      .filter(t => t.symbol !== '');
  } catch (error) {
    return [];
  }
};

export const fetchCoindcxKlines = async (symbol: string): Promise<number[]> => {
  try {
    const pair = mapToPublicPair(symbol);
    const response = await fetchWithProxy(`${COINDCX_PUBLIC}/market_data/candles?pair=${pair}&interval=1h&limit=24`);
    if (Array.isArray(response)) {
      return response.map((c: any) => parseFloat(c.close)).reverse();
    }
    return [];
  } catch (e) {
    return [];
  }
};

export const fetchCoindcxTrades = async (symbol: string): Promise<Trade[]> => {
  try {
    const pair = mapToPublicPair(symbol);
    const data = await fetchWithProxy(`${COINDCX_PUBLIC}/market_data/trade_history?pair=${pair}&limit=50`);
    if (Array.isArray(data)) {
      return data.map((t: any, idx: number) => ({
        id: idx,
        price: t.p,
        qty: t.q,
        quoteQty: (parseFloat(t.p) * parseFloat(t.q)).toString(),
        time: t.T,
        isBuyerMaker: t.m,
        isBestMatch: true
      }));
    }
    return [];
  } catch (e) {
    return [];
  }
};