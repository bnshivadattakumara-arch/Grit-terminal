import { EnrichedTicker, FundingRateData, PriceSnapshot, Trade } from '../types';

const OKX_API = 'https://www.okx.com/api/v5';

const fetchWithProxy = async (endpoint: string) => {
  const targetUrl = `${OKX_API}${endpoint}`;
  const strategies = [
    async (u: string) => {
      const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(u)}&cb=${Date.now()}`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      return JSON.parse(json.contents);
    },
    async (u: string) => {
      const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(u)}`);
      if (!res.ok) throw new Error();
      return await res.json();
    }
  ];

  for (const strategy of strategies) {
    try {
      const data = await strategy(targetUrl);
      if (data && data.code === "0") return data;
    } catch (e) {
      continue;
    }
  }
  throw new Error(`OKX_FETCH_FAILED: ${endpoint}`);
};

export const fetchOkxSpotTickers = async (): Promise<EnrichedTicker[]> => {
  try {
    const [spotRes, swapRes] = await Promise.allSettled([
      fetchWithProxy('/market/tickers?instType=SPOT'),
      fetchWithProxy('/market/tickers?instType=SWAP')
    ]);

    const spotData = spotRes.status === 'fulfilled' ? spotRes.value.data : [];
    const swapData = swapRes.status === 'fulfilled' ? swapRes.value.data : [];
    
    // Create map for swap symbols (usually BASE-QUOTE-SWAP)
    const swapMap = new Map();
    swapData.forEach((s: any) => {
      const base = s.instId.split('-')[0];
      swapMap.set(base, s);
    });

    if (Array.isArray(spotData)) {
      return spotData.map((t: any) => {
        const last = parseFloat(t.last) || 0;
        const high = parseFloat(t.high24h) || 0;
        const low = parseFloat(t.low24h) || 0;
        const open = parseFloat(t.sodUtc0 || t.open24h) || last;
        const volatility = low > 0 ? ((high - low) / low) * 100 : 0;
        const change = open > 0 ? ((last - open) / open) * 100 : 0;
        
        const [base, quote] = t.instId.split('-');
        const swapInfo = swapMap.get(base);

        // Institutional Data Mocks (Stable Calculation)
        const charCodeSum = t.instId.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
        const correlation = base === 'BTC' ? 1.0 : (0.4 + (charCodeSum % 60) / 100);
        const volProfile = Array.from({length: 8}, (_, i) => Math.abs(Math.sin(charCodeSum + i) * 100));

        return {
          symbol: t.instId,
          baseAsset: base,
          quoteAsset: quote,
          lastPrice: t.last || '0',
          priceChangePercent: change.toFixed(2),
          quoteVolume: t.volValue24h || '0',
          volume: t.vol24h || '0',
          highPrice: t.high24h || '0',
          lowPrice: t.low24h || '0',
          volatility,
          spread: 0,
          priceChange: (last - open).toString(),
          weightedAvgPrice: t.last || '0',
          prevClosePrice: t.open24h || '0',
          lastQty: '0',
          bidPrice: t.bidPx || '0',
          bidQty: t.bidSz || '0',
          askPrice: t.askPx || '0',
          askQty: t.askSz || '0',
          openPrice: t.open24h || '0',
          openTime: 0,
          closeTime: parseInt(t.ts) || Date.now(),
          firstId: 0,
          lastId: 0,
          count: 0,
          fundingRate: swapInfo?.lastFundingRate, 
          openInterest: swapInfo?.volValue24h,
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

export const fetchOkxFundingRates = async (): Promise<FundingRateData[]> => {
  try {
    const tickers = await fetchWithProxy('/market/tickers?instType=SWAP');
    if (tickers.code === "0" && Array.isArray(tickers.data)) {
      const topSwaps = tickers.data
        .sort((a: any, b: any) => (parseFloat(b.volValue24h) || 0) - (parseFloat(a.volValue24h) || 0))
        .slice(0, 40);

      const fundingResults = await Promise.allSettled(
        topSwaps.map((s: any) => fetchWithProxy(`/public/funding-rate?instId=${s.instId}`))
      );

      return fundingResults
        .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && r.value.data?.[0])
        .map(r => {
          const f = r.value.data[0];
          const ticker = topSwaps.find(t => t.instId === f.instId);
          return {
            symbol: f.instId,
            markPrice: ticker?.last || '0',
            indexPrice: ticker?.last || '0',
            lastFundingRate: f.fundingRate || '0',
            nextFundingTime: parseInt(f.nextFundingTime) || Date.now(),
            interestRate: '0',
            time: Date.now()
          };
        });
    }
    return [];
  } catch (error) {
    return [];
  }
};

export const fetchOkxPrices = async (): Promise<PriceSnapshot[]> => {
  try {
    const data = await fetchWithProxy('/market/tickers?instType=SPOT');
    if (data.code === "0" && Array.isArray(data.data)) {
      return data.data.map((t: any) => ({
        symbol: t.instId,
        price: t.last || '0'
      }));
    }
    return [];
  } catch (error) {
    return [];
  }
};

export const fetchOkxKlines = async (symbol: string): Promise<number[]> => {
  try {
    const data = await fetchWithProxy(`/market/candles?instId=${symbol}&bar=1H&limit=24`);
    if (data.code === "0" && Array.isArray(data.data)) {
      return data.data.map((c: any) => parseFloat(c[4]) || 0).reverse();
    }
    return [];
  } catch (e) {
    return [];
  }
};

export const fetchOkxTrades = async (symbol: string): Promise<Trade[]> => {
  try {
    const data = await fetchWithProxy(`/market/trades?instId=${symbol}&limit=50`);
    if (data.code === "0" && Array.isArray(data.data)) {
      return data.data.map((t: any) => {
        const px = parseFloat(t.px) || 0;
        const sz = parseFloat(t.sz) || 0;
        return {
          id: parseInt(t.tradeId) || Date.now(),
          price: t.px || '0',
          qty: t.sz || '0',
          quoteQty: (px * sz).toString(),
          time: parseInt(t.ts) || Date.now(),
          isBuyerMaker: t.side === 'sell',
          isBestMatch: true
        };
      });
    }
    return [];
  } catch (e) {
    return [];
  }
};

export const fetchOkxPerpTrades = async (symbol: string): Promise<Trade[]> => {
  const perpSymbol = symbol.includes('-SWAP') ? symbol : `${symbol}-SWAP`;
  return fetchOkxTrades(perpSymbol);
};