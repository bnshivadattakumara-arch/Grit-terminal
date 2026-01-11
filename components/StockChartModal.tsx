
import React, { useEffect, useState } from 'react';
import { X, Activity, TrendingUp, TrendingDown, Clock, Maximize2 } from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid 
} from 'recharts';
import { fetchStockHistory, StockHistoryPoint, CURRENCY_SYMBOLS } from '../services/stockService';

interface StockChartModalProps {
  symbol: string;
  name?: string;
  currentPrice: number;
  currency: string;
  changePercent: number;
  onClose: () => void;
}

export const StockChartModal: React.FC<StockChartModalProps> = ({ 
  symbol, name, currentPrice, currency, changePercent, onClose 
}) => {
  const [history, setHistory] = useState<StockHistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('1d');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const interval = range === '1d' ? '5m' : (range === '5d' ? '15m' : '1h');
      const data = await fetchStockHistory(symbol, range, interval);
      setHistory(data);
      setLoading(false);
    };
    load();
  }, [symbol, range]);

  const symbolPrefix = CURRENCY_SYMBOLS[currency] || '';
  const isPos = changePercent >= 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 font-mono">
      <div className="bg-[#050505] border-2 border-terminal-green w-full max-w-4xl h-[70vh] flex flex-col relative shadow-[0_0_50px_rgba(74,222,128,0.2)]">
        
        <div className="flex justify-between items-center p-4 border-b border-terminal-darkGreen bg-black">
          <div className="flex items-center gap-3">
            <Activity size={20} className="text-terminal-green animate-pulse" />
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-widest">{symbol} // {name || 'ASSET_SCAN'}</h2>
              <div className="text-[9px] text-terminal-green font-bold uppercase tracking-tighter opacity-60">QUANT_VISUAL_FEED_v5.0</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="flex bg-black border border-terminal-darkGreen p-1 gap-1">
                {['1d', '5d', '1mo'].map(r => (
                  <button 
                    key={r} 
                    onClick={() => setRange(r)}
                    className={`px-3 py-1 text-[9px] font-black uppercase transition-all ${range === r ? 'bg-terminal-green text-black' : 'text-gray-500 hover:text-white'}`}
                  >
                    {r}
                  </button>
                ))}
             </div>
             <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
               <X size={24} />
             </button>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0 bg-black/40 border-b border-terminal-darkGreen/20">
           <div className="space-y-1">
              <span className="text-[9px] text-gray-600 font-black uppercase">CURRENT_PX</span>
              <div className="text-3xl font-black text-white tabular-nums">{symbolPrefix}{currentPrice.toLocaleString()}</div>
           </div>
           <div className="space-y-1">
              <span className="text-[9px] text-gray-600 font-black uppercase">24H_DELTA</span>
              <div className={`text-2xl font-black tabular-nums flex items-center gap-2 ${isPos ? 'text-green-500' : 'text-red-500'}`}>
                {isPos ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                {isPos ? '+' : ''}{changePercent.toFixed(2)}%
              </div>
           </div>
           <div className="space-y-1">
              <span className="text-[9px] text-gray-600 font-black uppercase">SIGNAL_STRENGTH</span>
              <div className="h-6 w-full bg-gray-900 border border-terminal-darkGreen/20 overflow-hidden relative">
                 <div className="h-full bg-terminal-green/40 animate-pulse" style={{ width: `${Math.abs(changePercent) * 10}%` }}></div>
                 <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-white uppercase">ACTIVE_VOLATILITY</span>
              </div>
           </div>
        </div>

        <div className="flex-1 p-4 relative overflow-hidden bg-black/20">
           {loading ? (
             <div className="absolute inset-0 flex items-center justify-center text-terminal-green animate-pulse uppercase tracking-[0.5em] font-black text-xs">
               Accessing_Timeline_Data...
             </div>
           ) : (
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history}>
                  <defs>
                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4ade80" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#4ade80" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#14532d33" />
                  <XAxis 
                    dataKey="time" 
                    hide 
                  />
                  <YAxis 
                    domain={['auto', 'auto']} 
                    orientation="right" 
                    stroke="#14532d" 
                    tick={{fontSize: 10, fill: '#4ade80'}}
                    tickFormatter={(val) => `${symbolPrefix}${val}`}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#000', border: '1px solid #14532d', borderRadius: '0', fontSize: '10px' }}
                    labelFormatter={(label) => new Date(label).toLocaleString()}
                    formatter={(val: number) => [`${symbolPrefix}${val.toFixed(2)}`, 'PRICE']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="price" 
                    stroke="#4ade80" 
                    fillOpacity={1} 
                    fill="url(#colorPrice)" 
                    isAnimationActive={false}
                  />
                </AreaChart>
             </ResponsiveContainer>
           )}
        </div>

        <div className="p-3 bg-black border-t border-terminal-darkGreen text-[9px] flex justify-between text-gray-600 font-black uppercase tracking-widest px-6">
           <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5"><Clock size={12} /> RANGE: {range.toUpperCase()}</span>
              <span className="flex items-center gap-1.5"><Maximize2 size={12} /> AUTO_SCALE: ON</span>
           </div>
           <span>SYSTEM_TIME: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
};
