exports.up = (pgm) => {
  // Create portfolio_snapshots table for caching pre-calculated daily values
  pgm.createTable('portfolio_snapshots', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('uuid_generate_v4()'),
    },
    portfolio_id: {
      type: 'uuid',
      notNull: true,
      references: 'portfolios',
      onDelete: 'CASCADE',
    },
    date: {
      type: 'date',
      notNull: true,
    },
    total_value: {
      type: 'decimal(18,8)',
    },
    breakdown: {
      type: 'jsonb',
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('NOW()'),
    },
    updated_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('NOW()'),
    },
  });

  // Create unique constraint to prevent duplicate snapshots
  pgm.createConstraint('portfolio_snapshots', 'portfolio_snapshots_portfolio_date_unique', {
    unique: ['portfolio_id', 'date'],
  });

  // Create indexes for fast lookups
  pgm.createIndex('portfolio_snapshots', 'portfolio_id');
  pgm.createIndex('portfolio_snapshots', 'date');
  pgm.createIndex('portfolio_snapshots', ['portfolio_id', 'date']);
};

exports.down = (pgm) => {
  pgm.dropTable('portfolio_snapshots', { ifExists: true, cascade: true });
};
