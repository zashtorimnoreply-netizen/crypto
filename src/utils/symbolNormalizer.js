const symbolMap = {
  // Bitcoin variations
  'bitcoin': 'BTC',
  'btc': 'BTC',
  'xbt': 'BTC',
  
  // Ethereum variations
  'ethereum': 'ETH',
  'eth': 'ETH',
  'ether': 'ETH',
  
  // Solana variations
  'solana': 'SOL',
  'sol': 'SOL',
  
  // Cardano variations
  'cardano': 'ADA',
  'ada': 'ADA',
  
  // Polkadot variations
  'polkadot': 'DOT',
  'dot': 'DOT',
  
  // Polygon variations
  'polygon': 'MATIC',
  'matic': 'MATIC',
  
  // Chainlink variations
  'chainlink': 'LINK',
  'link': 'LINK',
  
  // Avalanche variations
  'avalanche': 'AVAX',
  'avax': 'AVAX',
  
  // Ripple variations
  'ripple': 'XRP',
  'xrp': 'XRP',
  
  // Litecoin variations
  'litecoin': 'LTC',
  'ltc': 'LTC',
  
  // Dogecoin variations
  'dogecoin': 'DOGE',
  'doge': 'DOGE',
  
  // Binance Coin variations
  'binance coin': 'BNB',
  'bnb': 'BNB',
  
  // Stablecoins - aggregate to USD
  'usdt': 'USD',
  'tether': 'USD',
  'usdc': 'USD',
  'usd coin': 'USD',
  'dai': 'USD',
  'busd': 'USD',
  'tusd': 'USD',
  'usdd': 'USD',
  'frax': 'USD',
};

function normalizeSymbol(symbol) {
  if (!symbol || typeof symbol !== 'string') {
    return symbol;
  }
  
  let normalized = symbol.trim();
  
  // Handle exchange pairs: BTC/USDT -> BTC, ETH/USDC -> ETH
  if (normalized.includes('/')) {
    normalized = normalized.split('/')[0].trim();
  }
  
  // Handle exchange pairs with dash: BTC-USDT -> BTC
  if (normalized.includes('-')) {
    normalized = normalized.split('-')[0].trim();
  }
  
  // Convert to lowercase for lookup
  const lower = normalized.toLowerCase();
  
  // Check if we have a mapping
  if (symbolMap[lower]) {
    return symbolMap[lower];
  }
  
  // Otherwise return uppercase version
  return normalized.toUpperCase();
}

module.exports = {
  normalizeSymbol,
  symbolMap,
};
