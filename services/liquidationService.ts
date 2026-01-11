import { Liquidation } from '../types';

type LiquidationCallback = (liq: Liquidation) => void;

class LiquidationAggregator {
  private binanceWs: WebSocket | null = null;
  private bybitWs: WebSocket | null = null;
  private okxWs: WebSocket | null = null;
  private callback: LiquidationCallback | null = null;
  private active = false;

  constructor() {}

  public start(callback: LiquidationCallback) {
    if (this.active) return;
    this.callback = callback;
    this.active = true;
    this.connectBinance();
    this.connectBybit();
    this.connectOkx();
  }

  public stop() {
    this.active = false;
    this.binanceWs?.close();
    this.bybitWs?.close();
    this.okxWs?.close();
  }

  private connectBinance() {
    // Aggregated stream for all symbols (Futures)
    this.binanceWs = new WebSocket('wss://fstream.binance.com/ws/!forceOrder@arr');
    
    this.binanceWs.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const o = data.o;
        if (!o) return;

        const liq: Liquidation = {
          symbol: o.s.replace('USDT', ''),
          side: o.S === 'BUY' ? 'BUY' : 'SELL', // BUY means Short Liq (Buy to close), SELL means Long Liq (Sell to close)
          price: o.p,
          qty: o.q,
          usdValue: (parseFloat(o.p) || 0) * (parseFloat(o.q) || 0),
          time: data.E || Date.now(),
          exchange: 'BINANCE_PERP'
        };
        this.callback?.(liq);
      } catch (e) {
        console.error('Binance Liq Parse Error', e);
      }
    };

    this.binanceWs.onclose = () => {
      if (this.active) setTimeout(() => this.connectBinance(), 5000);
    };
  }

  private connectBybit() {
    this.bybitWs = new WebSocket('wss://stream.bybit.com/v5/public/linear');
    
    this.bybitWs.onopen = () => {
      // Subscribe to an expanded list of high-volume assets for Bybit
      const assets = [
        'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'DOGEUSDT', 'ADAUSDT', 
        'AVAXUSDT', 'LINKUSDT', 'PEPEUSDT', 'WIFUSDT', 'SUIUSDT', 'APTUSDT',
        'NEARUSDT', 'FETUSDT', 'RENDERUSDT', 'SHIBUSDT', 'DOTUSDT', 'LTCUSDT'
      ];
      const args = assets.map(a => `liquidation.${a}`);
      this.bybitWs?.send(JSON.stringify({ op: 'subscribe', args }));
    };

    this.bybitWs.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.topic?.startsWith('liquidation')) {
          const d = msg.data;
          const liq: Liquidation = {
            symbol: d.symbol.replace('USDT', ''),
            side: d.side === 'Buy' ? 'BUY' : 'SELL',
            price: d.price,
            qty: d.size,
            usdValue: (parseFloat(d.price) || 0) * (parseFloat(d.size) || 0),
            time: msg.ts || Date.now(),
            exchange: 'BYBIT_PERP'
          };
          this.callback?.(liq);
        }
      } catch (e) {}
    };

    this.bybitWs.onclose = () => {
      if (this.active) setTimeout(() => this.connectBybit(), 5000);
    };
  }

  private connectOkx() {
    this.okxWs = new WebSocket('wss://ws.okx.com:8443/ws/v5/public');
    
    this.okxWs.onopen = () => {
      // Subscribe to ALL SWAP and FUTURES liquidations via instType
      const args = [
        { channel: 'liquidation-orders', instType: 'SWAP' },
        { channel: 'liquidation-orders', instType: 'FUTURES' }
      ];
      this.okxWs?.send(JSON.stringify({ op: 'subscribe', args }));
    };

    this.okxWs.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.data && msg.arg?.channel === 'liquidation-orders') {
          msg.data.forEach((instData: any) => {
            const baseSymbol = instData.instId.split('-')[0];
            // OKX Liquidation messages contain a 'details' array with the actual orders
            if (Array.isArray(instData.details)) {
              instData.details.forEach((d: any) => {
                const px = parseFloat(d.bkPx) || 0;
                const sz = parseFloat(d.sz) || 0;
                const ts = parseInt(d.ts) || Date.now();
                
                if (px > 0 && sz > 0) {
                  const liq: Liquidation = {
                    symbol: baseSymbol,
                    side: d.side === 'buy' ? 'BUY' : 'SELL',
                    price: d.bkPx,
                    qty: d.sz,
                    usdValue: px * sz,
                    time: ts,
                    exchange: 'OKX_PERP'
                  };
                  this.callback?.(liq);
                }
              });
            }
          });
        }
      } catch (e) {
        console.error('OKX Liq Parse Error', e);
      }
    };

    this.okxWs.onclose = () => {
      if (this.active) setTimeout(() => this.connectOkx(), 5000);
    };
  }
}

export const liquidationAggregator = new LiquidationAggregator();