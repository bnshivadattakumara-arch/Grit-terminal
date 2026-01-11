import { EnrichedTicker, FundingRateData, PriceSnapshot, Trade } from '../types';

const BYBIT_API = 'https://api.bybit.com';

const fetchWithProxy = async (endpoint: string) => {
  const targetUrl = `${BYBIT_API}${endpoint}`;
  try {
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
      const response = await fetch(proxyUrl);
      if (response.ok) {
          const json = await response.json();
          if (json.contents) {
              return JSON.parse(json.contents);
          }
      }
      throw new Error('Allorigins failed');
  } catch (e) {
      try {
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
        const response = await fetch(proxyUrl);
        if (response.ok) {
            const text = await response.text();
            return JSON.parse(text);
        }
        throw new Error('Corsproxy failed');
      } catch (e2) {
         const response = await fetch(targetUrl);
         if (response.ok) return await response.json();
         throw e2;
      }
  }
};

export const fetchBybitSpotTickers = async (): Promise<EnrichedTicker[]> => {
  try {
    const data = await fetchWithProxy('/v5/market/tickers?category=spot&limit=1000');
    if (data.retCode === 0 && data.result?.list) {
      return data.result.list.map((t: any) => {
        const last = parseFloat(t.lastPrice);
        const high = parseFloat(t.highPrice24h);
        const low = parseFloat(t.lowPrice24h);
        const volatility = low > 0 ? ((high - low) / low) * 100 : 0;
        
        let quote = 'USDT';
        let base = t.symbol;
        if (t.symbol.endsWith('USDT')) base = t.symbol.replace('USDT', '');
        else if (t.symbol.endsWith('USDC')) { quote = 'USDC'; base = t.symbol.replace('USDC', ''); }
        else if (t.symbol.endsWith('BTC')) { quote = 'BTC'; base = t.symbol.replace('BTC', ''); }
        else if (t.symbol.endsWith('ETH')) { quote = 'ETH'; base = t.symbol.replace('ETH', ''); }

        // Institutional Data Mocks (Stable Calculation)
        const charCodeSum = t.symbol.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
        const correlation = base === 'BTC' ? 1.0 : (0.4 + (charCodeSum % 60) / 100);
        const volProfile = Array.from({length: 8}, (_, i) => Math.abs(Math.sin(charCodeSum + i) * 100));

        return {
          symbol: t.symbol,
          lastPrice: t.lastPrice,
          priceChangePercent: (parseFloat(t.price24hPcnt) * 100).toFixed(2),
          quoteVolume: t.turnover24h, 
          volume: t.volume24h,
          highPrice: t.highPrice24h,
          lowPrice: t.lowPrice24h,
          baseAsset: base,
          quoteAsset: quote,
          volatility,
          spread: 0, 
          priceChange: t.prevPrice24h ? (parseFloat(t.lastPrice) - parseFloat(t.prevPrice24h)).toString() : '0',
          weightedAvgPrice: t.lastPrice,
          prevClosePrice: t.prevPrice24h,
          lastQty: '0',
          bidPrice: t.bid1Price || '0',
          bidQty: t.bid1Size || '0',
          askPrice: t.ask1Price || '0',
          askQty: t.ask1Size || '0',
          openPrice: t.prevPrice24h,
          openTime: 0,
          closeTime: 0,
          firstId: 0,
          lastId: 0,
          count: 0,
          correlation,
          volProfile
        } as EnrichedTicker;
      });
    }
    return [];
  } catch (error) {
    return [];
  }
};

export const fetchBybitFundingRates = async (): Promise<FundingRateData[]> => {
  try {
    const data = await fetchWithProxy('/v5/market/tickers?category=linear&limit=1000');
    if (data.retCode === 0 && data.result?.list) {
       return data.result.list
         .filter((t: any) => t.fundingRate && t.fundingRate !== '')
         .map((t: any) => ({
           symbol: t.symbol,
           markPrice: t.markPrice,
           indexPrice: t.indexPrice,
           lastFundingRate: t.fundingRate,
           nextFundingTime: parseInt(t.nextFundingTime),
           interestRate: '0',
           time: Date.now()
         }));
    }
    return [];
  } catch (error) {
    return [];
  }
};

export const fetchBybitPrices = async (): Promise<PriceSnapshot[]> => {
    try {
        const data = await fetchWithProxy('/v5/market/tickers?category=spot&limit=1000');
        if (data.retCode === 0 && data.result?.list) {
            return data.result.list.map((t: any) => ({
                symbol: t.symbol,
                price: t.lastPrice
            }));
        }
        return [];
    } catch (e) {
        return [];
    }
};

export const fetchBybitKlines = async (symbol: string): Promise<number[]> => {
    try {
        const data = await fetchWithProxy(`/v5/market/kline?category=spot&symbol=${symbol}&interval=60&limit=24`);
        if (data.retCode === 0 && data.result?.list) {
             return data.result.list.map((k: any) => parseFloat(k[4])).reverse();
        }
        return [];
    } catch (e) { return []; }
}

export const fetchBybitTrades = async (symbol: string): Promise<Trade[]> => {
    try {
        const data = await fetchWithProxy(`/v5/market/recent-trade?category=spot&symbol=${symbol}&limit=50`);
        if (data.retCode === 0 && data.result?.list) {
            return data.result.list.map((t: any) => ({
                id: parseInt(t.execId || Date.now().toString()),
                price: t.price,
                qty: t.size,
                quoteQty: (parseFloat(t.price) * parseFloat(t.size)).toString(),
                time: parseInt(t.time),
                isBuyerMaker: t.side === 'Sell',
                isBestMatch: true
            }));
        }
        return [];
    } catch (e) { return []; }
}

export const fetchBybitPerpTrades = async (symbol: string): Promise<Trade[]> => {
    try {
        const data = await fetchWithProxy(`/v5/market/recent-trade?category=linear&symbol=${symbol}&limit=50`);
        if (data.retCode === 0 && data.result?.list) {
            return data.result.list.map((t: any) => ({
                id: parseInt(t.execId || Date.now().toString()),
                price: t.price,
                qty: t.size,
                quoteQty: (parseFloat(t.price) * parseFloat(t.size)).toString(),
                time: parseInt(t.time),
                isBuyerMaker: t.side === 'Sell',
                isBestMatch: true
            }));
        }
        return [];
    } catch (e) { return []; }
}