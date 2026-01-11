import { EnrichedTicker, PriceSnapshot, Trade } from '../types';

const MEXC_API = 'https://api.mexc.com/api/v3';

const fetchWithProxy = async (endpoint: string) => {
  const targetUrl = endpoint.startsWith('http') ? endpoint : `${MEXC_API}${endpoint}`;
  
  const proxyStrategies = [
    // 1. YaCDN - Highly reliable for MEXC
    async (url: string) => {
      const res = await fetch(`https://yacdn.org/proxy/${encodeURIComponent(url)}?cb=${Date.now()}`, {
        cache: 'no-store'
      });
      if (!res.ok) throw new Error(`YACDN_${res.status}`);
      const text = await res.text();
      if (text.trim().startsWith('<')) throw new Error('YACDN_HTML');
      return JSON.parse(text);
    },
    // 2. AllOrigins Wrapped (GET) - Most stable for bypassing CORS preflight
    async (url: string) => {
      const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}&cb=${Date.now()}`);
      if (!res.ok) throw new Error(`ALLORIGINS_GET_${res.status}`);
      const json = await res.json();
      if (!json.contents) throw new Error('ALLORIGINS_EMPTY');
      if (json.contents.trim().startsWith('<')) throw new Error('ALLORIGINS_HTML');
      return JSON.parse(json.contents);
    },
    // 3. Corsproxy.io
    async (url: string) => {
      const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`);
      if (!res.ok) throw new Error(`CORSPROXY_${res.status}`);
      const text = await res.text();
      if (text.trim().startsWith('<')) throw new Error('CORSPROXY_HTML');
      return JSON.parse(text);
    },
    // 4. CodeTabs
    async (url: string) => {
      const res = await fetch(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`);
      if (!res.ok) throw new Error(`CODETABS_${res.status}`);
      const text = await res.text();
      if (text.trim().startsWith('<')) throw new Error('CODETABS_HTML');
      return JSON.parse(text);
    },
    // 5. AllOrigins RAW
    async (url: string) => {
      const res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}&cb=${Date.now()}`);
      if (!res.ok) throw new Error(`ALLORIGINS_RAW_${res.status}`);
      const text = await res.text();
      if (text.trim().startsWith('<')) throw new Error('RAW_HTML');
      return JSON.parse(text);
    }
  ];

  let errors: string[] = [];

  for (const strategy of proxyStrategies) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const data = await strategy(targetUrl).finally(() => clearTimeout(timeoutId));
      if (data) return data;
    } catch (e: any) {
      errors.push(e.message || "FAILED");
      continue;
    }
  }

  throw new Error(`MEXC_FETCH_FAILED: ${errors[errors.length - 1] || 'ALL_PROXIES_OFFLINE'}`);
};

const processMexcTickers = (data: any[]): EnrichedTicker[] => {
  if (!Array.isArray(data)) return [];
  
  return data.map(ticker => {
    let quoteAsset = 'USDT';
    let baseAsset = ticker.symbol;
    
    // Sort quotes by length descending for specificity
    const quotes = ['USDT', 'USDC', 'BTC', 'ETH', 'BNB'];
    for (const quote of quotes) {
      if (ticker.symbol.endsWith(quote)) {
        quoteAsset = quote;
        baseAsset = ticker.symbol.slice(0, -quote.length);
        break;
      }
    }

    const high = parseFloat(ticker.highPrice || '0');
    const low = parseFloat(ticker.lowPrice || '0');
    const ask = parseFloat(ticker.askPrice || '0');
    const bid = parseFloat(ticker.bidPrice || '0');
    
    const volatility = low > 0 ? ((high - low) / low) * 100 : 0;
    const spread = ask > 0 ? ((ask - bid) / ask) * 100 : 0;

    // Institutional Data Mocks (Stable Calculation)
    const charCodeSum = ticker.symbol.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
    const correlation = baseAsset === 'BTC' ? 1.0 : (0.4 + (charCodeSum % 60) / 100);
    const volProfile = Array.from({length: 8}, (_, i) => Math.abs(Math.sin(charCodeSum + i) * 100));

    return {
      ...ticker,
      baseAsset,
      quoteAsset,
      volatility,
      spread,
      priceChangePercent: ticker.priceChangePercent || '0',
      quoteVolume: ticker.quoteVolume || '0',
      correlation,
      volProfile
    };
  }).filter(t => parseFloat(t.lastPrice) > 0);
};

export const fetchMexc24hTicker = async (): Promise<EnrichedTicker[]> => {
  try {
    const data = await fetchWithProxy('/ticker/24hr');
    return processMexcTickers(Array.isArray(data) ? data : [data]);
  } catch (error) {
    console.error("MEXC 24h Ticker Error", error);
    return [];
  }
};

export const fetchMexcAllPrices = async (): Promise<PriceSnapshot[]> => {
  try {
    const data = await fetchWithProxy('/ticker/price');
    return Array.isArray(data) ? data : [];
  } catch (error) {
    return [];
  }
};

export const fetchMexcRecentTrades = async (symbol: string, limit: number = 50): Promise<Trade[]> => {
  try {
    const data = await fetchWithProxy(`/trades?symbol=${symbol}&limit=${limit}`);
    return Array.isArray(data) ? data.map((t: any) => ({
      id: t.id,
      price: t.price,
      qty: t.qty,
      quoteQty: (parseFloat(t.price) * parseFloat(t.qty)).toString(),
      time: t.time,
      isBuyerMaker: t.isBuyerMaker,
      isBestMatch: true
    })) : [];
  } catch (error) {
    return [];
  }
};

export const fetchMexcPriceHistory = async (symbol: string): Promise<number[]> => {
  try {
    const data = await fetchWithProxy(`/klines?symbol=${symbol}&interval=1h&limit=24`);
    return Array.isArray(data) ? data.map((d: any) => parseFloat(d[4])) : [];
  } catch (error) {
    return [];
  }
};