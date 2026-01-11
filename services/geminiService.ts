import { GoogleGenAI } from "@google/genai";
import { EnrichedTicker } from '../types';

let aiInstance: GoogleGenAI | null = null;

const getAI = () => {
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return aiInstance;
};

export const analyzeAssetWithAI = async (ticker: EnrichedTicker, priceHistory: number[]): Promise<string> => {
  try {
    const ai = getAI();
    const historyStr = priceHistory.length > 0 
      ? priceHistory.map(p => p.toFixed(2)).join(', ') 
      : "Not available";

    const prompt = `
      SYSTEM_MODE: FINANCIAL_TERMINAL_ANALYSIS
      TARGET_ASSET: ${ticker.symbol}
      
      MARKET_DATA:
      - Price: ${ticker.lastPrice}
      - 24h_Chg: ${ticker.priceChangePercent}%
      - 24h_Vol: ${parseFloat(ticker.quoteVolume).toLocaleString()}
      - Spread: ${ticker.spread.toFixed(4)}%
      - Volatility: ${ticker.volatility.toFixed(2)}%
      - 24h_Trend_Close_Prices: [${historyStr}]
      
      INSTRUCTIONS:
      You are the backend AI for a financial trading terminal. 
      Generate a concise, data-driven status report (max 100 words).
      
      OUTPUT_FORMAT:
      > SENTIMENT: [BULLISH/BEARISH/NEUTRAL]
      > TREND_STRENGTH: [0-100]
      > ANALYSIS: [Brief technical observation mentioning trend direction and volume]
      
      Keep tone robotic, precise, and professional. No markdown bolding. Use ">" for bullet points.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "Analysis currently unavailable.";
  } catch (error) {
    console.error("Gemini analysis failed", error);
    return "ERR_AI_CONNECTION_FAILED: Check API Configuration.";
  }
};

export const askAI = async (query: string): Promise<string> => {
    try {
        const ai = getAI();
        const prompt = `
          SYSTEM: You are "Terminal_v2.1_Core", a helpful, robotic crypto trading assistant embedded in a CLI.
          QUERY: "${query}"
          
          INSTRUCTIONS:
          - Answer concisely (max 2 sentences).
          - Be technical and factual.
          - Do not give financial advice.
          - Format: Pure text, no markdown.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
        });

        return response.text || "NO_RESPONSE_RECEIVED";
    } catch (error) {
        return "ERR_AI_OFFLINE";
    }
};