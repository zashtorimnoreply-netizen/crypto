exports.up = (pgm) => {
  // Add index on prices(symbol) for fast symbol lookups
  pgm.createIndex('prices', 'symbol');
  
  // Add index on prices(timestamp DESC) for efficient time-range queries
  // This complements the existing composite index
  pgm.createIndex({ name: 'prices_timestamp_idx', schema: 'public', table: 'prices' }, ['symbol', 'timestamp DESC']);
};

exports.down = (pgm) => {
  pgm.dropIndex('prices', 'symbol');
  pgm.dropIndex({ name: 'prices_timestamp_idx', schema: 'public', table: 'prices' }, ['symbol', 'timestamp DESC']);
};
