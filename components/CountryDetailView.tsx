import React, { useEffect, useState } from 'react';
import { 
  ArrowLeft, TrendingUp, Activity, RefreshCw, Layers, Landmark, Home, Briefcase
} from 'lucide-react';
import { fetchStockQuote, LiveStockData, MACRO_TICKERS, CURRENCY_SYMBOLS } from '../services/stockService';
import { StockChartModal } from './StockChartModal';

interface CountryDetailViewProps {
  countryId: string | null;
  onBack: () => void;
}

type Category = 'EQUITIES' | 'ETFS' | 'BONDS' | 'REIT';

const REGIONAL_TICKERS: Record<string, Record<Category, string[]>> = {
  'USA': {
    EQUITIES: ['AAPL', 'NVDA', 'TSLA', 'MSFT', 'GOOGL', 'AMZN', 'META', 'AMD', 'BRK-B', 'JPM'],
    ETFS: ['SPY', 'QQQ', 'VOO', 'IWM', 'EEM', 'VTI', 'DIA'],
    BONDS: ['TLT', 'IEF', 'SHY', 'BND', 'AGG', 'LQD'],
    REIT: ['VNQ', 'O', 'AMT', 'PLD', 'CCI', 'WY', 'EQIX']
  },
  'IND': {
    EQUITIES: ['RELIANCE.NS', 'HDFCBANK.NS', 'TCS.NS', 'INFY.NS', 'ICICIBANK.NS', 'HINDUNILVR.NS', 'ITC.NS', 'SBIN.NS', 'BHARTIARTL.NS'],
    ETFS: ['NIFTYBEES.NS', 'JUNIORBEES.NS', 'BANKBEES.NS', 'GOLD_BEES.NS', 'CPSEETF.NS'],
    BONDS: ['^NSEI'],
    REIT: ['DLF.NS', 'GODREJPROP.NS', 'PRESTIGE.NS', 'EMBASSY.NS']
  },
  'VEN': {
    EQUITIES: ['MVZ-A.CR', 'FVI-B.CR', 'PGR.CR', 'TDV-D.CR', 'ABC.CR', 'CRM.CR'],
    ETFS: ['^IBVC'],
    BONDS: ['^IBVC'],
    REIT: ['FVI-A.CR']
  },
  'JPN': {
    EQUITIES: ['7203.T', '6758.T', '9984.T', '8306.T', '6861.T'],
    ETFS: ['1306.T', '1321.T'],
    BONDS: ['^N225'],
    REIT: ['8951.T', '8952.T']
  },
  'DEU': {
    EQUITIES: ['SAP.DE', 'SIE.DE', 'VOW3.DE', 'ALV.DE', 'DTE.DE'],
    ETFS: ['EXS1.DE', 'DAX.DE'],
    BONDS: ['^GDAXI'],
    REIT: ['VNA.DE', 'LEG.DE']
  },
  'GBR': {
    EQUITIES: ['HSBA.L', 'BP.L', 'VOD.L', 'AZN.L', 'GSK.L'],
    ETFS: ['ISF.L', 'VUSA.L'],
    BONDS: ['^FTSE'],
    REIT: ['BLND.L', 'SGRO.L']
  },
  'CHN': {
    EQUITIES: ['9988.HK', '0700.HK', '1211.HK', '3690.HK', '2318.HK'],
    ETFS: ['2800.HK', '3188.HK'],
    BONDS: ['000001.SS'],
    REIT: ['0823.HK']
  },
  'BRA': {
    EQUITIES: ['VALE3.SA', 'PETR4.SA', 'ITUB4.SA', 'BBDC4.SA', 'ABEV3.SA'],
    ETFS: ['BOVA11.SA', 'IVVB11.SA'],
    BONDS: ['^BVSP'],
    REIT: ['HGLG11.SA', 'KNRI11.SA']
  },
  'CAN': {
    EQUITIES: ['RY.TO', 'TD.TO', 'SHOP.TO', 'CNR.TO', 'ENB.TO'],
    ETFS: ['XIU.TO', 'ZEB.TO'],
    BONDS: ['^GSPTSE'],
    REIT: ['REI-UN.TO', 'CAR-UN.TO']
  },
  'FRA': {
    EQUITIES: ['MC.PA', 'OR.PA', 'TTE.PA', 'AIR.PA', 'RMS.PA'],
    ETFS: ['CAC.PA'],
    BONDS: ['^FCHI'],
    REIT: ['URW.PA', 'LI.PA']
  },
  'AUS': {
    EQUITIES: ['CBA.AX', 'BHP.AX', 'CSL.AX', 'NAB.AX', 'WBC.AX'],
    ETFS: ['STW.AX', 'VAS.AX'],
    BONDS: ['^AXJO'],
    REIT: ['GMG.AX', 'SCG.AX']
  },
  'ITA': {
    EQUITIES: ['ENI.MI', 'ISP.MI', 'UCG.MI', 'ENEL.MI', 'STLAM.MI'],
    ETFS: ['ETFMIB.MI'],
    BONDS: ['FTSEMIB.MI'],
    REIT: ['IGD.MI']
  },
  'ESP': {
    EQUITIES: ['SAN.MC', 'IBE.MC', 'ITX.MC', 'BBVA.MC', 'TEF.MC'],
    ETFS: ['IBEX.MC'],
    BONDS: ['^IBEX'],
    REIT: ['COL.MC', 'MERL.MC']
  },
  'KOR': {
    EQUITIES: ['005930.KS', '000660.KS', '035420.KS', '005380.KS'],
    ETFS: ['069500.KS'],
    BONDS: ['^KS11'],
    REIT: ['330590.KS']
  },
  'HKG': {
    EQUITIES: ['0700.HK', '1299.HK', '0005.HK', '3690.HK', '9988.HK'],
    ETFS: ['2800.HK'],
    BONDS: ['^HSI'],
    REIT: ['0823.HK']
  },
  'RUS': {
    EQUITIES: ['GAZP.ME', 'SBER.ME', 'LKOH.ME', 'GMKN.ME', 'NVTK.ME', 'YNDX.ME'],
    ETFS: ['IMOEX.ME'],
    BONDS: ['IMOEX.ME'],
    REIT: ['PIKK.ME']
  },
  'MEX': {
    EQUITIES: ['AMXL.MX', 'WALMEX.MX', 'FEMSAUBD.MX', 'GFNORTEO.MX'],
    ETFS: ['IVV.MX'],
    BONDS: ['^MXX'],
    REIT: ['FUNO11.MX']
  },
  'IDN': {
    EQUITIES: ['BBCA.JK', 'BBRI.JK', 'TLKM.JK', 'BMRI.JK', 'ASII.JK'],
    ETFS: ['XISC.JK'],
    BONDS: ['^JKSE'],
    REIT: ['LPCK.JK']
  },
  'TUR': {
    EQUITIES: ['THYAO.IS', 'ASELS.IS', 'EREGL.IS', 'KCHOL.IS', 'AKBNK.IS'],
    ETFS: ['ZGOLD.IS'],
    BONDS: ['XU100.IS'],
    REIT: ['EKGYO.IS']
  },
  'ISR': {
    EQUITIES: ['TEVA.TA', 'ICL.TA', 'NICE.TA', 'LEUMI.TA', 'POLI.TA', 'TASE.TA', 'ELTR.TA'],
    ETFS: ['TA125.TA', 'TA35.TA'],
    BONDS: ['^TA125.TA'],
    REIT: ['AZRG.TA', 'MLSR.TA']
  }
};

const SectorCard = ({ title, icon, children }: any) => (
  <div className="bg-[#050505] border border-terminal-darkGreen/40 overflow-hidden flex flex-col h-full">
    <div className="bg-black/80 p-2.5 border-b border-terminal-darkGreen/40 flex items-center gap-2">
      {icon}
      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-terminal-green">{title}</span>
    </div>
    <div className="flex-1 overflow-y-auto custom-scrollbar">
      {children}
    </div>
  </div>
);

export const CountryDetailView: React.FC<CountryDetailViewProps> = ({ countryId, onBack }) => {
  const [data, setData] = useState<Record<Category, LiveStockData[]>>({
    EQUITIES: [], ETFS: [], BONDS: [], REIT: []
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Category>('EQUITIES');
  const [selectedAsset, setSelectedAsset] = useState<LiveStockData | null>(null);

  const fetchRegionalData = async () => {
    setLoading(true);
    const region = REGIONAL_TICKERS[countryId || 'USA'] || REGIONAL_TICKERS['USA'];
    const results: any = {};

    const categories = ['EQUITIES', 'ETFS', 'BONDS', 'REIT'] as const;
    
    const categoryPromises = categories.map(async (cat) => {
      const symbols = region[cat] || [];
      const quotes = await Promise.all(symbols.map(s => fetchStockQuote(s)));
      results[cat] = quotes.filter((q): q is LiveStockData => q !== null);
    });

    await Promise.all(categoryPromises);
    setData(results);
    setLoading(false);
  };

  useEffect(() => {
    fetchRegionalData();
  }, [countryId]);

  return (
    <div className="flex flex-col h-full bg-black font-mono text-terminal-green animate-in fade-in slide-in-from-bottom-2 duration-300 overflow-hidden">
      {selectedAsset && (
        <StockChartModal 
          symbol={selectedAsset.symbol}
          currentPrice={selectedAsset.price}
          currency={selectedAsset.currency}
          changePercent={selectedAsset.changePercent}
          onClose={() => setSelectedAsset(null)}
        />
      )}

      <div className="h-20 border-b-2 border-terminal-darkGreen flex items-center px-6 bg-[#050505] gap-8 shrink-0 relative">
        <button onClick={onBack} className="bg-terminal-green text-black p-2 hover:bg-white transition-all shadow-[0_0_15px_rgba(74,222,128,0.3)]">
          <ArrowLeft size={24} />
        </button>
        
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className={`text-2xl font-black text-white tracking-tighter uppercase ${['IND', 'ISR', 'VEN'].includes(countryId || '') ? 'terminal-glow' : ''}`}>
              {countryId}_ASSET_CONDUIT
            </h2>
            <div className="bg-terminal-darkGreen/30 px-2 py-0.5 border border-terminal-green/20 text-[8px] font-black text-terminal-green tracking-[0.2em] uppercase">REGION_SPECIFIC_PRICING_ACTIVE</div>
          </div>
        </div>

        <div className="flex items-center gap-4 pr-4">
           {loading ? <RefreshCw size={20} className="animate-spin text-terminal-dim" /> : <div className="text-[9px] font-black text-terminal-green border border-terminal-green/20 px-2 py-1">SYNC_SUCCESS</div>}
        </div>
      </div>

      <div className="h-12 bg-black/90 border-b border-terminal-darkGreen/30 flex px-6 shrink-0 z-20">
        {[
          { id: 'EQUITIES', icon: <Briefcase size={14}/> },
          { id: 'ETFS', icon: <Layers size={14}/> },
          { id: 'BONDS', icon: <Landmark size={14}/> },
          { id: 'REIT', icon: <Home size={14}/> }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as Category)}
            className={`px-6 py-1 text-[10px] font-black flex items-center gap-3 border-b-2 transition-all ${activeTab === tab.id ? 'border-terminal-green text-terminal-green bg-terminal-green/5' : 'border-transparent text-gray-600 hover:text-white'}`}
          >
            {tab.icon} {tab.id}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden p-6 bg-[#010101] flex flex-col md:flex-row gap-6">
        <div className="flex-1 flex flex-col">
          <SectorCard title={`${activeTab}_LIVE_STREAM`} icon={<TrendingUp size={16} />}>
            <table className="w-full text-left">
              <thead className="bg-[#020202] text-[8px] text-gray-600 font-black uppercase border-b border-terminal-darkGreen/10 sticky top-0 z-10">
                <tr>
                  <th className="p-4 pl-6">ASSET_IDENTITY</th>
                  <th className="p-4">INDEX_PX</th>
                  <th className="p-4 text-right pr-6">DELTA_24H</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-terminal-darkGreen/10 font-mono text-[11px]">
                {loading ? (
                  <tr><td colSpan={3} className="p-20 text-center animate-pulse tracking-[0.4em] uppercase font-black text-terminal-dim">Accessing_Regional_Nodes...</td></tr>
                ) : data[activeTab].length === 0 ? (
                  <tr><td colSpan={3} className="p-20 text-center text-gray-700 uppercase font-black">NO_DATA_AVAILABLE_FOR_TAB</td></tr>
                ) : data[activeTab].map((s, i) => (
                  <tr 
                    key={i} 
                    className="hover:bg-terminal-green/5 transition-all group cursor-pointer"
                    onClick={() => setSelectedAsset(s)}
                  >
                    <td className="p-4 pl-6">
                      <div className="flex items-center gap-3">
                        <span className={`font-black group-hover:text-terminal-green transition-colors ${['IND', 'ISR', 'VEN'].includes(countryId || '') ? 'text-terminal-green' : 'text-white'}`}>{s.symbol}</span>
                        <Activity size={12} className="text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </td>
                    <td className="p-4 text-terminal-dim font-bold tabular-nums">
                      {CURRENCY_SYMBOLS[s.currency] || s.currency}{s.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className={`p-4 text-right pr-6 font-black tabular-nums ${s.changePercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {s.changePercent >= 0 ? '+' : ''}{s.changePercent.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SectorCard>
        </div>

        <div className="w-full md:w-80 flex flex-col gap-6">
          <SectorCard title="REGIONAL_MACRO_INTEL" icon={<Activity size={16} />}>
             <div className="p-6 space-y-5">
                <div className="flex justify-between items-center border-b border-terminal-darkGreen/10 pb-2">
                   <span className="text-[9px] text-gray-600 font-bold uppercase">Pricing_Mode</span>
                   <span className="text-[10px] font-black text-terminal-green">REGIONAL_LOCAL</span>
                </div>
                <div className="flex justify-between items-center border-b border-terminal-darkGreen/10 pb-2">
                   <span className="text-[9px] text-gray-600 font-bold uppercase">Geo_Latency</span>
                   <span className="text-[10px] font-black text-white">45MS</span>
                </div>
                
                <div className="pt-4 space-y-2">
                  <div className="text-[8px] text-gray-700 font-black uppercase">Recent_Activity</div>
                  <div className="text-[9px] text-terminal-dim leading-relaxed p-3 bg-black/40 border border-terminal-darkGreen/20">
                    Showing local prices for {countryId}. Click any ticker to initialize visual price timeline.
                  </div>
                </div>
             </div>
          </SectorCard>

          <div className="bg-terminal-green/5 border border-terminal-green/20 p-4 flex flex-col gap-2">
             <div className="text-[9px] text-terminal-green font-black uppercase tracking-widest">Macro_Pulse</div>
             <div className="flex items-center gap-4">
                <div className="flex-1 h-2 bg-black border border-terminal-darkGreen/20">
                   <div className="h-full bg-terminal-green animate-pulse" style={{ width: '65%' }}></div>
                </div>
                <span className="text-[10px] font-black">65%_BULL</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};