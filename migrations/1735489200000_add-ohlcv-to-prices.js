exports.up = (pgm) => {
  // Add OHLCV columns to prices table
  pgm.addColumn('prices', {
    open: {
      type: 'decimal(18,8)',
    },
    high: {
      type: 'decimal(18,8)',
    },
    low: {
      type: 'decimal(18,8)',
    },
    volume: {
      type: 'decimal(24,8)',
      default: 0,
    },
  });

  // Update existing close prices to also populate open/high/low for single-price records
  pgm.sql(`
    UPDATE prices 
    SET open = close, high = close, low = close, volume = 0
    WHERE open IS NULL
  `);
};

exports.down = (pgm) => {
  // Remove the added columns
  pgm.dropColumn('prices', 'volume');
  pgm.dropColumn('prices', 'low');
  pgm.dropColumn('prices', 'high');
  pgm.dropColumn('prices', 'open');
};
