import { EnrichedTicker, FundingRateData, PriceSnapshot, Trade } from '../types';

const HL_API = 'https://api.hyperliquid.xyz/info';

const postHL = async (type: string, payload: any = {}) => {
    const body = JSON.stringify(payload ? { type, ...payload } : { type });
    const headers = { 'Content-Type': 'application/json' };

    const strategies = [
        async () => {
            const res = await fetch(HL_API, { method: 'POST', headers, body });
            if (res.ok) return await res.json();
            throw new Error('DIRECT_FAILED');
        },
        async () => {
            const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(HL_API)}&cb=${Date.now()}`;
            const res = await fetch(proxyUrl);
            if (res.ok) {
              const data = await res.json();
              return JSON.parse(data.contents);
            }
            throw new Error('PROXY_FAILED');
        },
        async () => {
            const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(HL_API)}`;
            const res = await fetch(proxyUrl, { method: 'POST', headers, body });
            if (res.ok) return await res.json();
            throw new Error('CORS_PROXY_FAILED');
        }
    ];

    for (const strategy of strategies) {
        try {
            return await strategy();
        } catch (e) {}
    }
    return null;
};

export const fetchHyperliquidTickers = async (): Promise<EnrichedTicker[]> => {
    const [richPerps, spotData, allMids] = await Promise.all([
        postHL('metaAndAssetCtxs'),
        postHL('spotMetaAndAssetCtxs'),
        postHL('allMids')
    ]);

    const tickers: EnrichedTicker[] = [];

    // Process Perps
    if (richPerps && Array.isArray(richPerps) && richPerps.length >= 2) {
        const universe = richPerps[0]?.universe || [];
        const contexts = richPerps[1] || [];

        universe.forEach((asset: any, idx: number) => {
            const ctx = contexts[idx] || {};
            const name = asset.name;
            const last = parseFloat(ctx.markPx || allMids?.[name] || '0');
            const prev = parseFloat(ctx.prevDayPx || last.toString() || '0');
            const change = prev > 0 ? ((last - prev) / prev) * 100 : 0;
            const vol = parseFloat(ctx.dayNtlVlm || '0');

            // Institutional Data Mocks (Stable Calculation)
            const charCodeSum = name.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
            const correlation = name === 'BTC' ? 1.0 : (0.4 + (charCodeSum % 60) / 100);
            const volProfile = Array.from({length: 8}, (_, i) => Math.abs(Math.sin(charCodeSum + i) * 100));

            tickers.push({
                symbol: name,
                baseAsset: name,
                quoteAsset: 'USDC',
                lastPrice: last.toString(),
                priceChangePercent: change.toFixed(2),
                quoteVolume: vol.toString(),
                volume: last > 0 ? (vol / last).toString() : '0',
                highPrice: '0',
                lowPrice: '0',
                volatility: Math.abs(change),
                spread: 0,
                priceChange: (last - prev).toString(),
                weightedAvgPrice: last.toString(),
                prevClosePrice: prev.toString(),
                lastQty: '0',
                bidPrice: last.toString(),
                bidQty: '0',
                askPrice: last.toString(),
                askQty: '0',
                openPrice: prev.toString(),
                openTime: 0,
                closeTime: Date.now(),
                firstId: 0,
                lastId: 0,
                count: 0,
                fundingRate: ctx.funding,
                openInterest: ctx.openInterest,
                correlation,
                volProfile
            } as EnrichedTicker);
        });
    }

    // Process Spot
    if (spotData && Array.isArray(spotData) && spotData.length >= 2) {
        const universe = spotData[0]?.universe || [];
        const contexts = spotData[1] || [];

        universe.forEach((uAsset: any, idx: number) => {
            const ctx = contexts[idx] || {};
            const name = uAsset.name;
            const last = parseFloat(ctx.markPx || allMids?.[name] || '0');
            const prev = parseFloat(ctx.prevDayPx || last.toString() || '0');
            const change = prev > 0 ? ((last - prev) / prev) * 100 : 0;
            const vol = parseFloat(ctx.dayNtlVlm || '0');

            // Institutional Data Mocks (Stable Calculation)
            const charCodeSum = name.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
            const correlation = name === 'BTC' ? 1.0 : (0.4 + (charCodeSum % 60) / 100);
            const volProfile = Array.from({length: 8}, (_, i) => Math.abs(Math.sin(charCodeSum + i) * 100));

            tickers.push({
                symbol: name,
                baseAsset: name.split('/')[0] || name,
                quoteAsset: name.split('/')[1] || 'USDC',
                lastPrice: last.toString(),
                priceChangePercent: change.toFixed(2),
                quoteVolume: vol.toString(),
                volume: last > 0 ? (vol / last).toString() : '0',
                highPrice: '0',
                lowPrice: '0',
                volatility: Math.abs(change),
                spread: 0,
                priceChange: (last - prev).toString(),
                weightedAvgPrice: last.toString(),
                prevClosePrice: prev.toString(),
                lastQty: '0',
                bidPrice: last.toString(),
                bidQty: '0',
                askPrice: last.toString(),
                askQty: '0',
                openPrice: prev.toString(),
                openTime: 0,
                closeTime: Date.now(),
                firstId: 0,
                lastId: 0,
                count: 0,
                correlation,
                volProfile
            } as EnrichedTicker);
        });
    }

    return tickers.sort((a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume));
};

export const fetchHyperliquidFunding = async (): Promise<FundingRateData[]> => {
    const data = await postHL('metaAndAssetCtxs');
    if (Array.isArray(data) && data.length >= 2) {
        const universe = data[0]?.universe || [];
        const contexts = data[1] || [];
        return universe.map((u: any, idx: number) => ({
            symbol: u.name,
            markPrice: contexts[idx]?.markPx || '0',
            indexPrice: contexts[idx]?.oraclePx || contexts[idx]?.markPx || '0',
            lastFundingRate: contexts[idx]?.funding || '0',
            nextFundingTime: Date.now() + 3600000,
            interestRate: '0',
            time: Date.now()
        }));
    }
    return [];
};

export const fetchHyperliquidPrices = async (): Promise<PriceSnapshot[]> => {
    const res = await postHL('allMids');
    if (res) {
        return Object.entries(res).map(([symbol, price]) => ({ symbol, price: price as string }));
    }
    return [];
};

export const fetchHyperliquidKlines = async (symbol: string): Promise<number[]> => {
    const startTime = Date.now() - (24 * 3600000);
    const res = await postHL('candleSnapshot', { req: { coin: symbol, interval: '1h', startTime, endTime: Date.now() } });
    if (Array.isArray(res)) {
        return res.map(c => parseFloat(c.c));
    }
    return [];
};

export const fetchHyperliquidTrades = async (symbol: string): Promise<Trade[]> => [];