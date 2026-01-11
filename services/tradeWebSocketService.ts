import { Trade } from '../types';

type TradeCallback = (trade: Trade) => void;

export class TradeWebSocketManager {
  private sockets: Map<string, WebSocket> = new Map();
  private callback: TradeCallback;
  private currentSymbol: string = '';
  private active = false;

  constructor(callback: TradeCallback) {
    this.callback = callback;
  }

  public setSymbol(symbol: string) {
    if (this.currentSymbol === symbol) return;
    this.currentSymbol = symbol;
    if (this.active) {
      this.reconnectAll();
    }
  }

  public start() {
    this.active = true;
    this.reconnectAll();
  }

  public stop() {
    this.active = false;
    this.closeAll();
  }

  private closeAll() {
    this.sockets.forEach(ws => {
      ws.onclose = null; // Prevent reconnect loops
      ws.onerror = null;
      ws.close();
    });
    this.sockets.clear();
  }

  private reconnectAll() {
    this.closeAll();
    if (!this.currentSymbol) return;

    this.connectBinance('BINANCE_SPOT', `wss://stream.binance.com:9443/ws/${this.currentSymbol.toLowerCase()}usdt@trade`);
    this.connectBinance('BINANCE_PERP', `wss://fstream.binance.com/ws/${this.currentSymbol.toLowerCase()}usdt@trade`);
    this.connectBybit('BYBIT_SPOT', 'wss://stream.bybit.com/v5/public/spot', `publicTrade.${this.currentSymbol.toUpperCase()}USDT`);
    this.connectBybit('BYBIT_PERP', 'wss://stream.bybit.com/v5/public/linear', `publicTrade.${this.currentSymbol.toUpperCase()}USDT`);
    this.connectOKX('OKX_SPOT', `${this.currentSymbol.toUpperCase()}-USDT`);
    this.connectOKX('OKX_PERP', `${this.currentSymbol.toUpperCase()}-USDT-SWAP`);
    this.connectHyperliquid(this.currentSymbol.toUpperCase());
    this.connectMEXC(this.currentSymbol.toUpperCase());
  }

  private connectBinance(id: string, url: string) {
    const ws = new WebSocket(url);
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        this.callback({
          id: data.t,
          price: data.p,
          qty: data.q,
          quoteQty: (parseFloat(data.p) * parseFloat(data.q)).toString(),
          time: data.E,
          isBuyerMaker: data.m,
          isBestMatch: true,
          source: id
        } as any);
      } catch (err) {}
    };
    this.setupRetries(ws, id);
    this.sockets.set(id, ws);
  }

  private connectBybit(id: string, url: string, topic: string) {
    const ws = new WebSocket(url);
    ws.onopen = () => ws.send(JSON.stringify({ op: 'subscribe', args: [topic] }));
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.topic === topic && Array.isArray(msg.data)) {
          msg.data.forEach((t: any) => {
            this.callback({
              id: parseInt(t.execId) || Date.now(),
              price: t.price,
              qty: t.size,
              quoteQty: (parseFloat(t.price) * parseFloat(t.size)).toString(),
              time: parseInt(t.ts),
              isBuyerMaker: t.side === 'Sell',
              isBestMatch: true,
              source: id
            } as any);
          });
        }
      } catch (err) {}
    };
    this.setupRetries(ws, id);
    this.sockets.set(id, ws);
  }

  private connectOKX(id: string, instId: string) {
    const ws = new WebSocket('wss://ws.okx.com:8443/ws/v5/public');
    ws.onopen = () => ws.send(JSON.stringify({ op: 'subscribe', args: [{ channel: 'trades', instId }] }));
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.arg?.channel === 'trades' && Array.isArray(msg.data)) {
          msg.data.forEach((t: any) => {
            this.callback({
              id: parseInt(t.tradeId) || Date.now(),
              price: t.px,
              qty: t.sz,
              quoteQty: (parseFloat(t.px) * parseFloat(t.sz)).toString(),
              time: parseInt(t.ts),
              isBuyerMaker: t.side === 'sell',
              isBestMatch: true,
              source: id
            } as any);
          });
        }
      } catch (err) {}
    };
    this.setupRetries(ws, id);
    this.sockets.set(id, ws);
  }

  private connectHyperliquid(coin: string) {
    const id = 'HYPERLIQUID';
    const ws = new WebSocket('wss://api.hyperliquid.xyz/ws');
    ws.onopen = () => ws.send(JSON.stringify({ method: 'subscribe', subscription: { type: 'trades', coin } }));
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.channel === 'trades' && Array.isArray(msg.data)) {
          msg.data.forEach((t: any) => {
            this.callback({
              id: t.tid || Date.now(),
              price: t.px,
              qty: t.sz,
              quoteQty: (parseFloat(t.px) * parseFloat(t.sz)).toString(),
              time: t.time,
              isBuyerMaker: t.side === 'S',
              isBestMatch: true,
              source: id
            } as any);
          });
        }
      } catch (err) {}
    };
    this.setupRetries(ws, id);
    this.sockets.set(id, ws);
  }

  private connectMEXC(symbol: string) {
    const id = 'MEXC_SPOT';
    const ws = new WebSocket('wss://wbs.mexc.com/ws');
    ws.onopen = () => ws.send(JSON.stringify({ op: 'sub.deal', symbol: `${symbol}USDT` }));
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.c === 'spot@public.deals.v3.api' && msg.d?.deals) {
          msg.d.deals.forEach((t: any) => {
            this.callback({
              id: t.t || Date.now(),
              price: t.p,
              qty: t.v,
              quoteQty: (parseFloat(t.p) * parseFloat(t.v)).toString(),
              time: t.T,
              isBuyerMaker: t.S === 2, 
              isBestMatch: true,
              source: id
            } as any);
          });
        }
      } catch (err) {}
    };
    this.setupRetries(ws, id);
    this.sockets.set(id, ws);
  }

  private setupRetries(ws: WebSocket, id: string) {
    ws.onclose = () => {
      if (this.active) {
        setTimeout(() => this.reconnectSpecific(id), 5000);
      }
    };
    ws.onerror = (e) => {
      // Improved error logging to extract useful info from the event
      const errorMessage = (e as any).message || 'Connection Interrupted';
      console.warn(`WebSocket [${id}] Failure: ${errorMessage}`);
      ws.close();
    };
  }

  private reconnectSpecific(id: string) {
    if (!this.active || !this.currentSymbol) return;
    if (id === 'BINANCE_SPOT') this.connectBinance(id, `wss://stream.binance.com:9443/ws/${this.currentSymbol.toLowerCase()}usdt@trade`);
    else if (id === 'BINANCE_PERP') this.connectBinance(id, `wss://fstream.binance.com/ws/${this.currentSymbol.toLowerCase()}usdt@trade`);
    else if (id === 'BYBIT_SPOT') this.connectBybit(id, 'wss://stream.bybit.com/v5/public/spot', `publicTrade.${this.currentSymbol.toUpperCase()}USDT`);
    else if (id === 'BYBIT_PERP') this.connectBybit(id, 'wss://stream.bybit.com/v5/public/linear', `publicTrade.${this.currentSymbol.toUpperCase()}USDT`);
    else if (id === 'OKX_SPOT') this.connectOKX(id, `${this.currentSymbol.toUpperCase()}-USDT`);
    else if (id === 'OKX_PERP') this.connectOKX(id, `${this.currentSymbol.toUpperCase()}-USDT-SWAP`);
    else if (id === 'HYPERLIQUID') this.connectHyperliquid(this.currentSymbol.toUpperCase());
    else if (id === 'MEXC_SPOT') this.connectMEXC(this.currentSymbol.toUpperCase());
  }
}