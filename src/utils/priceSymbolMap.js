/**
 * Symbol mapping for price API calls
 * Maps internal symbols to external API-specific formats
 */

// Map display symbols to CoinGecko API format (coin IDs)
const coingeckoSymbolMap = {
  'BTC': 'bitcoin',
  'WBTC': 'bitcoin',
  'XBT': 'bitcoin',
  'ETH': 'ethereum',
  'SOL': 'solana',
  'ADA': 'cardano',
  'DOT': 'polkadot',
  'MATIC': 'matic-network',
  'LINK': 'chainlink',
  'AVAX': 'avalanche-2',
  'XRP': 'ripple',
  'LTC': 'litecoin',
  'DOGE': 'dogecoin',
  'BNB': 'binancecoin',
  'ATOM': 'cosmos',
  'UNI': 'uniswap',
  'AAVE': 'aave',
  'MKR': 'maker',
  'COMP': 'compound-ether',
  'SNX': 'havven',
  'YFI': 'yearn-finance',
  'SUSHI': 'sushi',
  'CRV': 'curve-dao-token',
  'BAL': 'balancer',
  'REN': 'ren',
  'KNC': 'kyber-network-crystal',
  'GRT': 'the-graph',
  'ANT': 'aragon',
  'LRC': 'loopring',
  'ZRX': '0x',
  'BAT': 'basic-attention-token',
  'ENJ': 'enjincoin',
  'MANA': 'decentraland',
  'SAND': 'the-sandbox',
  'AXS': 'axie-infinity',
  'FTM': 'fantom',
  'ALGO': 'algorand',
  'VET': 'vechain',
  'THETA': 'theta-network',
  'FIL': 'filecoin',
  'EOS': 'eos',
  'XTZ': 'tezos',
  'NEO': 'neo',
  'FLOW': 'flow',
  'NEAR': 'near',
  'AR': 'arweave',
  'CHZ': 'chiliz',
  'SXP': 'swipe',
  'TRX': 'tron',
  'BCH': 'bitcoin-cash',
  'BSV': 'bitcoin-cash-sv',
  'ETC': 'ethereum-classic',
  'XLM': 'stellar',
  'KSM': 'kusama',
  'DASH': 'dash',
  'ZEC': 'zcash',
  'XMR': 'monero',
  'RVN': 'ravencoin',
  'ONT': 'ontology',
  'IOTX': 'iotex',
  'IOST': 'iost',
  'CELO': 'celo',
  'QNT': 'quant-network',
  'FTT': 'ftx-token',
  'MASK': 'mask-network',
  'DYDX': 'dydx',
  'OP': 'optimism',
  'ARB': 'arbitrum',
  'INJ': 'injective-protocol',
  'LDO': 'lido-dao',
  'RNDR': 'render-token',
  'VIRTUAL': 'virtual-protocol',
  'PEPE': 'pepe',
  'SHIB': 'shiba-inu',
  'FLOKI': 'floki',
  'BONK': 'bonk',
  'WIF': 'dogwifhat',
  'JUP': 'jupiter-exchange-solana',
  'JTO': 'jito',
  'RAY': 'raydium',
  'ORCA': 'orca',
  'MNDE': 'marinade',
  'HNT': 'helium',
  'STX': 'stacks',
  'SUI': 'sui',
  'APT': 'aptos',
};

// Map display symbols to Bybit trading pair format
const bybitSymbolMap = {
  'BTC': 'BTC/USDT',
  'ETH': 'ETH/USDT',
  'SOL': 'SOL/USDT',
  'ADA': 'ADA/USDT',
  'DOT': 'DOT/USDT',
  'MATIC': 'MATIC/USDT',
  'LINK': 'LINK/USDT',
  'AVAX': 'AVAX/USDT',
  'XRP': 'XRP/USDT',
  'LTC': 'LTC/USDT',
  'DOGE': 'DOGE/USDT',
  'BNB': 'BNB/USDT',
  'ATOM': 'ATOM/USDT',
  'UNI': 'UNI/USDT',
  'AAVE': 'AAVE/USDT',
  'MKR': 'MKR/USDT',
  'COMP': 'COMP/USDT',
  'SNX': 'SNX/USDT',
  'YFI': 'YFI/USDT',
  'SUSHI': 'SUSHI/USDT',
  'CRV': 'CRV/USDT',
  'BAL': 'BAL/USDT',
  'REN': 'REN/USDT',
  'KNC': 'KNC/USDT',
  'GRT': 'GRT/USDT',
  'ANT': 'ANT/USDT',
  'LRC': 'LRC/USDT',
  'ZRX': 'ZRX/USDT',
  'BAT': 'BAT/USDT',
  'ENJ': 'ENJ/USDT',
  'MANA': 'MANA/USDT',
  'SAND': 'SAND/USDT',
  'AXS': 'AXS/USDT',
  'FTM': 'FTM/USDT',
  'ALGO': 'ALGO/USDT',
  'VET': 'VET/USDT',
  'THETA': 'THETA/USDT',
  'FIL': 'FIL/USDT',
  'EOS': 'EOS/USDT',
  'XTZ': 'XTZ/USDT',
  'NEO': 'NEO/USDT',
  'FLOW': 'FLOW/USDT',
  'NEAR': 'NEAR/USDT',
  'AR': 'AR/USDT',
  'CHZ': 'CHZ/USDT',
  'TRX': 'TRX/USDT',
  'BCH': 'BCH/USDT',
  'BSV': 'BSV/USDT',
  'ETC': 'ETC/USDT',
  'XLM': 'XLM/USDT',
  'KSM': 'KSM/USDT',
  'DASH': 'DASH/USDT',
  'ZEC': 'ZEC/USDT',
  'XMR': 'XMR/USDT',
};

// Stablecoins that map to USD
const stablecoinSymbols = new Set([
  'USDT',
  'USDC',
  'DAI',
  'BUSD',
  'TUSD',
  'USDD',
  'FRAX',
  'USDP',
  'GUSD',
  'LUSD',
]);

/**
 * Get CoinGecko coin ID for a symbol
 * @param {string} symbol - Display symbol (e.g., 'BTC')
 * @returns {string|null} CoinGecko coin ID or null if not found
 */
function getCoingeckoId(symbol) {
  if (!symbol || typeof symbol !== 'string') {
    return null;
  }
  const normalized = symbol.toUpperCase().trim();
  return coingeckoSymbolMap[normalized] || null;
}

/**
 * Get Bybit trading pair for a symbol
 * @param {string} symbol - Display symbol (e.g., 'BTC')
 * @returns {string|null} Bybit trading pair or null if not found
 */
function getBybitPair(symbol) {
  if (!symbol || typeof symbol !== 'string') {
    return null;
  }
  const normalized = symbol.toUpperCase().trim();
  return bybitSymbolMap[normalized] || null;
}

/**
 * Check if a symbol is a stablecoin
 * @param {string} symbol - Symbol to check
 * @returns {boolean} True if stablecoin
 */
function isStablecoin(symbol) {
  if (!symbol || typeof symbol !== 'string') {
    return false;
  }
  return stablecoinSymbols.has(symbol.toUpperCase().trim());
}

/**
 * Get all known symbols
 * @returns {string[]} Array of known symbols
 */
function getKnownSymbols() {
  return Object.keys(coingeckoSymbolMap);
}

module.exports = {
  getCoingeckoId,
  getBybitPair,
  isStablecoin,
  getKnownSymbols,
  coingeckoSymbolMap,
  bybitSymbolMap,
  stablecoinSymbols,
};
