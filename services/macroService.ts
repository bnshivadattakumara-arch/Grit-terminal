import { GoogleGenAI } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

const getAI = () => {
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return aiInstance;
};

export interface MacroDataPoint {
  date: number;
  value: number;
}

export interface MacroSeries {
  id: string;
  title: string;
  unit: string;
  source: 'FRED' | 'RBI';
  data: MacroDataPoint[];
  description: string;
  latestValue?: string;
  intel?: string;
}

const YAHOO_MACRO_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';

const fetchWithProxy = async (url: string) => {
  const strategies = [
    async (u: string) => {
      const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(u)}&cb=${Date.now()}`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      return JSON.parse(json.contents);
    },
    async (u: string) => {
      const res = await fetch(`https://yacdn.org/proxy/${encodeURIComponent(u)}`);
      if (!res.ok) throw new Error();
      const text = await res.text();
      return JSON.parse(text);
    }
  ];

  for (const strategy of strategies) {
    try {
      const data = await strategy(url);
      if (data && data.chart) return data;
    } catch (e) { continue; }
  }
  return null;
};

const MACRO_TICKER_MAP: Record<string, string> = {
  'US_GDP': '^GSPC', 
  'US_CPI': 'TIP',  
  'US_UNRATE': '^IRX', 
  'US_10Y': '^TNX',
  'US_30Y': '^TYX',
  'US_FED_FUNDS': '^IRX',
  'US_M2': 'TLT',
  'US_IP': 'XLI', 
  'US_HOU': 'ITB', 
  'IN_REPO': '^NSEI', 
  'IN_INR': 'USDINR=X',
  'IN_10Y': '^IN10YT',
  'IN_GDP': 'EPI',
  'IN_CPI': 'USDINR=X',
  'IN_FX_RES': 'INR=X',
  'DXY': 'DX-Y.NYB',
  'GOLD': 'GC=F',
  'OIL': 'CL=F',
  'COPPER': 'HG=F'
};

export const fetchMacroSeriesData = async (symbol: string, range: string = '1y'): Promise<MacroDataPoint[]> => {
  const interval = range === '1d' ? '5m' : (range === '1mo' ? '1h' : '1d');
  try {
    const data = await fetchWithProxy(`${YAHOO_MACRO_BASE}/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`);
    const result = data?.chart?.result?.[0];
    if (!result || !result.timestamp) return [];

    const prices = result.indicators.quote[0].close;
    return result.timestamp.map((t: number, i: number) => ({
      date: t * 1000,
      value: symbol.startsWith('^') && !symbol.includes('NSEI') ? (prices[i] / 10) : prices[i]
    })).filter((p: any) => p.value !== null && p.value !== undefined);
  } catch (e) {
    return [];
  }
};

export const resolveMacroPrompt = async (query: string): Promise<MacroSeries | null> => {
  try {
    const ai = getAI();
    const prompt = `
      You are the GRIT_TERMINAL Global Macro Intelligence Engine. 
      The user is querying the "Entire FRED and RBI DBIE Database".
      
      USER_QUERY: "${query}"
      
      INSTRUCTIONS:
      1. Use Google Search to find the latest specific data for this indicator from official FRED (St. Louis Fed) or RBI (India) sources.
      2. Identify the closest matching internal proxy from this list: [US_GDP, US_CPI, US_UNRATE, US_10Y, US_FED_FUNDS, IN_REPO, IN_INR, IN_10Y, DXY, GOLD, OIL].
      3. Provide a data-heavy analysis of the current state.
      
      RETURN_JSON_ONLY:
      {
        "id": "TICKER_ID_FROM_LIST",
        "title": "Exact Official Name",
        "unit": "%, USD, Index Points, etc.",
        "source": "FRED or RBI",
        "latestValue": "The actual latest number you found online (e.g. 3.4%)",
        "description": "Short expert summary of the trend.",
        "intel": "In-depth technical analysis for a trader (50 words)."
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { 
        responseMimeType: 'application/json',
        tools: [{ googleSearch: {} }] as any
      }
    });

    const resolution = JSON.parse(response.text || '{}');
    const ticker = MACRO_TICKER_MAP[resolution.id] || resolution.id || '^GSPC';
    
    const historicalData = await fetchMacroSeriesData(ticker, '1y');

    return {
      id: ticker,
      title: resolution.title || 'Global Macro Vector',
      unit: resolution.unit || 'Units',
      source: resolution.source || 'FRED',
      description: resolution.description || 'Data cross-referenced with live macro nodes.',
      latestValue: resolution.latestValue,
      intel: resolution.intel,
      data: historicalData
    };
  } catch (e) {
    console.error("Macro resolution failed", e);
    return null;
  }
};

export interface MacroIndicator {
  id: string;
  name: string;
  value: number;
  unit: string;
  date: string;
  change: number;
  trend: 'up' | 'down' | 'neutral';
}

export const fetchMacroData = async (country: 'USA' | 'IND'): Promise<MacroIndicator[]> => {
  const indicators: MacroIndicator[] = [];
  const keys = country === 'USA' ? [
    { id: 'FED_FUNDS', symbol: '^IRX', name: 'Fed Funds Rate', unit: '%' },
    { id: 'T10Y', symbol: '^TNX', name: '10Y Treasury', unit: '%' },
    { id: 'DXY', symbol: 'DX-Y.NYB', name: 'US Dollar Index', unit: 'Pts' }
  ] : [
    { id: 'REPO_RATE', symbol: '^NSEI', name: 'RBI Repo Signal', unit: '%' },
    { id: 'INR_STRENGTH', symbol: 'USDINR=X', name: 'Rupee Stability', unit: '₹/$' },
    { id: 'IN_10Y', symbol: '^IN10YT', name: 'IN 10Y Yield', unit: '%' }
  ];

  for (const k of keys) {
    try {
      const data = await fetchWithProxy(`${YAHOO_MACRO_BASE}/${k.symbol}?interval=1d&range=1d`);
      const result = data?.chart?.result?.[0];
      if (result) {
        const last = result.meta.regularMarketPrice;
        const prev = result.meta.chartPreviousClose;
        const val = k.symbol.startsWith('^') && !k.symbol.includes('NSEI') ? last / 10 : last;
        const change = val - (k.symbol.startsWith('^') && !k.symbol.includes('NSEI') ? prev / 10 : prev);
        
        indicators.push({
          id: k.id,
          name: k.name,
          value: val,
          unit: k.unit,
          date: new Date().toISOString().split('T')[0],
          change: (change / (val || 1)) * 100,
          trend: change > 0 ? 'up' : 'down'
        });
      }
    } catch (e) {}
  }
  return indicators;
};