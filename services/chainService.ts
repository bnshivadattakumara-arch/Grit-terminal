
export interface ChainTransaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  valueUsd: number;
  timestamp: number;
  blockNumber: string;
  chain: string;
  label?: string;
}

export interface ChainMetadata {
  id: string;
  name: string;
  symbol: string;
  explorer: string;
  rpc?: string;
  type: 'EVM' | 'BTC' | 'SOL' | 'XRP' | 'TRON' | 'OTHER';
  color: string;
}

export const CHAINS: ChainMetadata[] = [
  { id: 'eth', name: 'Ethereum', symbol: 'ETH', explorer: 'https://etherscan.io', rpc: 'https://eth.llamarpc.com', type: 'EVM', color: '#627EEA' },
  { id: 'btc', name: 'Bitcoin', symbol: 'BTC', explorer: 'https://mempool.space', type: 'BTC', color: '#F7931A' },
  { id: 'sol', name: 'Solana', symbol: 'SOL', explorer: 'https://solscan.io', rpc: 'https://api.mainnet-beta.solana.com', type: 'SOL', color: '#14F195' },
  { id: 'bsc', name: 'BNB Smart Chain', symbol: 'BNB', explorer: 'https://bscscan.com', rpc: 'https://bsc-rpc.publicnode.com', type: 'EVM', color: '#F3BA2F' },
  { id: 'pol', name: 'Polygon', symbol: 'POL', explorer: 'https://polygonscan.com', rpc: 'https://polygon-rpc.com', type: 'EVM', color: '#8247E5' },
  { id: 'arb', name: 'Arbitrum', symbol: 'ARB', explorer: 'https://arbiscan.io', rpc: 'https://arb1.arbitrum.io/rpc', type: 'EVM', color: '#28A0F0' },
  { id: 'base', name: 'Base', symbol: 'BASE', explorer: 'https://basescan.org', rpc: 'https://mainnet.base.org', type: 'EVM', color: '#0052FF' },
  { id: 'trx', name: 'TRON', symbol: 'TRX', explorer: 'https://tronscan.org', rpc: 'https://api.trongrid.io', type: 'TRON', color: '#FF0013' },
  { id: 'avax', name: 'Avalanche', symbol: 'AVAX', explorer: 'https://snowtrace.io', rpc: 'https://api.avax.network/ext/bc/C/rpc', type: 'EVM', color: '#E84142' },
  { id: 'xrp', name: 'Ripple', symbol: 'XRP', explorer: 'https://xrpscan.com', rpc: 'https://xrplcluster.com', type: 'XRP', color: '#23292F' }
];

const KNOWN_ENTITIES: Record<string, string> = {
  '0x0000000000000000000000000000000000000000': 'Null Address (Burn)',
  '0x7be8076f4ea4a4ad08075c2508e481d6c946d12b': 'OpenSea: Seaport',
  '0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad': 'Uniswap: Router',
  '0x28c6c06290d54a1012a690e0c030999086118318': 'Binance: Hot Wallet',
  '0xdfd5293d8e347dfe59e90efd55b2956a1343963d': 'Binance: Wallet 14',
  '0x5a16552f5340608051e44f80877a5996655c6e8e': 'Coinbase: Hot Wallet',
  '0xf977814e90da44bfa03b6295a0616a897441acec': 'Binance: Wallet 8'
};

export const getKnownEntity = (address: string): string | null => {
  return KNOWN_ENTITIES[address.toLowerCase()] || null;
};

const fetchWithProxy = async (url: string, options: RequestInit = {}) => {
  const strategies = [
    async () => {
      const res = await fetch(url, options);
      if (!res.ok) throw new Error();
      return await res.json();
    },
    async () => {
      const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`, options);
      if (!res.ok) throw new Error();
      return await res.json();
    }
  ];

  for (const strategy of strategies) {
    try { return await strategy(); } catch (e) {}
  }
  throw new Error("RPC_OFFLINE");
};

export const fetchRecentEVMTransactions = async (chain: ChainMetadata): Promise<ChainTransaction[]> => {
  if (!chain.rpc) return [];
  try {
    const data = await fetchWithProxy(chain.rpc, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_getBlockByNumber', params: ['latest', true], id: Date.now() })
    });

    if (data?.result?.transactions) {
      const blockTime = parseInt(data.result.timestamp, 16) * 1000;
      // Note: Real USD calculation would require a price feed. Using a rough ETH estimate for demo.
      const ethPrice = 2500; 
      return data.result.transactions.slice(0, 30).map((tx: any) => {
        const val = parseInt(tx.value || '0', 16) / 1e18;
        return {
          hash: tx.hash,
          from: tx.from,
          to: tx.to || 'Contract Interaction',
          value: val.toFixed(4),
          valueUsd: val * ethPrice,
          timestamp: blockTime,
          blockNumber: parseInt(data.result.number, 16).toString(),
          chain: chain.id,
          label: getKnownEntity(tx.from) || getKnownEntity(tx.to)
        };
      });
    }
  } catch (e) {
    console.error(`EVM fetch error: ${chain.id}`, e);
  }
  return [];
};

export const fetchRecentBTCTransactions = async (): Promise<ChainTransaction[]> => {
  try {
    const res = await fetch('https://mempool.space/api/mempool/recent');
    const data = await res.json();
    if (Array.isArray(data)) {
      const btcPrice = 65000;
      return data.slice(0, 20).map((tx: any) => {
        const val = tx.value / 1e8;
        return {
          hash: tx.txid,
          from: 'Mempool',
          to: 'Network',
          value: val.toFixed(4),
          valueUsd: val * btcPrice,
          timestamp: Date.now(),
          blockNumber: 'Mempool',
          chain: 'btc'
        };
      });
    }
  } catch (e) {}
  return [];
};

export const fetchRecentSolTransactions = async (chain: ChainMetadata): Promise<ChainTransaction[]> => {
  if (!chain.rpc) return [];
  try {
    const data = await fetchWithProxy(chain.rpc, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1, method: 'getSignaturesForAddress',
        params: ['11111111111111111111111111111111', { limit: 20 }]
      })
    });
    if (data?.result) {
      return data.result.map((tx: any) => ({
        hash: tx.signature,
        from: 'Solana_System',
        to: 'Network',
        value: '---',
        valueUsd: 0,
        timestamp: (tx.blockTime || Date.now() / 1000) * 1000,
        blockNumber: tx.slot.toString(),
        chain: 'sol'
      }));
    }
  } catch (e) {}
  return [];
};

export const fetchRecentXrpTransactions = async (chain: ChainMetadata): Promise<ChainTransaction[]> => {
  if (!chain.rpc) return [];
  try {
    const data = await fetchWithProxy(chain.rpc, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method: 'ledger', params: [{ ledger_index: 'validated', transactions: true, expand: true }] })
    });
    const txs = data?.result?.ledger?.transactions;
    if (Array.isArray(txs)) {
      return txs.slice(0, 20).map((tx: any) => {
        const val = tx.Amount ? parseFloat(tx.Amount) / 1000000 : 0;
        return {
          hash: tx.hash,
          from: tx.Account,
          to: tx.Destination || 'Internal',
          value: val.toFixed(2),
          valueUsd: val * 0.6, // Rough XRP price
          timestamp: Date.now(),
          blockNumber: data.result.ledger_index.toString(),
          chain: 'xrp'
        };
      });
    }
  } catch (e) {}
  return [];
};

export const fetchRecentTronTransactions = async (chain: ChainMetadata): Promise<ChainTransaction[]> => {
  if (!chain.rpc) return [];
  try {
    const data = await fetchWithProxy(`${chain.rpc}/v1/transactions`, {
      method: 'GET',
      headers: { 'accept': 'application/json' }
    });
    if (data?.data) {
      return data.data.slice(0, 20).map((tx: any) => {
        const val = tx.raw_data?.contract?.[0]?.parameter?.value?.amount ? tx.raw_data.contract[0].parameter.value.amount / 1e6 : 0;
        return {
          hash: tx.txID,
          from: tx.raw_data?.contract?.[0]?.parameter?.value?.owner_address || '---',
          to: tx.raw_data?.contract?.[0]?.parameter?.value?.to_address || '---',
          value: val.toFixed(4),
          valueUsd: val * 0.15, // Rough TRX price
          timestamp: tx.raw_data?.timestamp || Date.now(),
          blockNumber: 'Live',
          chain: 'trx'
        };
      });
    }
  } catch (e) {}
  return [];
};
