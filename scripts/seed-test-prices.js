/**
 * Seed test price data for BTC and ETH
 * This creates synthetic price data for testing DCA simulator and preset portfolios
 */

const db = require('../src/db');

async function seedTestPrices() {
  console.log('Seeding test price data...');
  
  // BTC starting at $42,000 on Jan 1, 2024
  // ETH starting at $2,300 on Jan 1, 2024
  const startDate = new Date('2024-01-01T00:00:00Z');
  const endDate = new Date('2024-12-31T00:00:00Z');
  
  const btcStartPrice = 42000;
  const ethStartPrice = 2300;
  
  const prices = [];
  
  // Generate daily prices with some volatility
  let currentDate = new Date(startDate);
  let btcPrice = btcStartPrice;
  let ethPrice = ethStartPrice;
  
  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split('T')[0];
    
    // Add some random volatility (±3% per day)
    const btcChange = 1 + (Math.random() - 0.5) * 0.06;
    const ethChange = 1 + (Math.random() - 0.5) * 0.06;
    
    btcPrice = btcPrice * btcChange;
    ethPrice = ethPrice * ethChange;
    
    // Add BTC price
    prices.push({
      symbol: 'BTC',
      timestamp: dateStr,
      open: btcPrice * 0.99,
      high: btcPrice * 1.02,
      low: btcPrice * 0.98,
      close: btcPrice,
      volume: Math.random() * 1000000000,
    });
    
    // Add ETH price
    prices.push({
      symbol: 'ETH',
      timestamp: dateStr,
      open: ethPrice * 0.99,
      high: ethPrice * 1.02,
      low: ethPrice * 0.98,
      close: ethPrice,
      volume: Math.random() * 500000000,
    });
    
    // Move to next day
    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
  }
  
  console.log(`Generated ${prices.length} price records`);
  
  // Insert in batches
  const batchSize = 100;
  for (let i = 0; i < prices.length; i += batchSize) {
    const batch = prices.slice(i, i + batchSize);
    
    for (const price of batch) {
      await db.query(
        `INSERT INTO prices (symbol, timestamp, open, high, low, close, volume)
         VALUES ($1, $2::timestamp, $3, $4, $5, $6, $7)
         ON CONFLICT (symbol, timestamp) DO UPDATE
         SET open = EXCLUDED.open, high = EXCLUDED.high, low = EXCLUDED.low,
             close = EXCLUDED.close, volume = EXCLUDED.volume`,
        [
          price.symbol,
          price.timestamp,
          price.open,
          price.high,
          price.low,
          price.close,
          price.volume,
        ]
      );
    }
    
    console.log(`Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(prices.length / batchSize)}`);
  }
  
  console.log('✅ Test price data seeded successfully');
  
  // Verify
  const result = await db.query(
    'SELECT symbol, COUNT(*) as count, MIN(timestamp) as earliest, MAX(timestamp) as latest FROM prices GROUP BY symbol'
  );
  
  console.log('\nPrice data summary:');
  for (const row of result.rows) {
    console.log(`  ${row.symbol}: ${row.count} records from ${row.earliest.toISOString().split('T')[0]} to ${row.latest.toISOString().split('T')[0]}`);
  }
}

seedTestPrices()
  .then(() => {
    console.log('\n✅ Done');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
