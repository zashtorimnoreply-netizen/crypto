exports.up = (pgm) => {
  pgm.createExtension('uuid-ossp', { ifNotExists: true });

  pgm.createTable('users', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('uuid_generate_v4()'),
    },
    email: {
      type: 'varchar(255)',
      notNull: true,
      unique: true,
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

  pgm.createTable('portfolios', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('uuid_generate_v4()'),
    },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users',
      onDelete: 'CASCADE',
    },
    name: {
      type: 'varchar(255)',
      notNull: true,
      default: 'My Portfolio',
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

  pgm.createIndex('portfolios', 'user_id');

  pgm.createTable('trades', {
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
    timestamp: {
      type: 'timestamp',
      notNull: true,
    },
    symbol: {
      type: 'varchar(10)',
      notNull: true,
    },
    side: {
      type: 'varchar(4)',
      notNull: true,
    },
    quantity: {
      type: 'decimal(18,8)',
      notNull: true,
    },
    price: {
      type: 'decimal(18,8)',
      notNull: true,
    },
    fee: {
      type: 'decimal(18,8)',
      notNull: true,
      default: 0,
    },
    exchange: {
      type: 'varchar(50)',
      notNull: true,
    },
    source_id: {
      type: 'varchar(255)',
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('NOW()'),
    },
  });

  pgm.createIndex('trades', ['portfolio_id', 'timestamp']);
  pgm.createIndex('trades', ['symbol', 'timestamp']);
  pgm.createIndex('trades', ['exchange', 'source_id']);

  pgm.createTable('prices', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('uuid_generate_v4()'),
    },
    symbol: {
      type: 'varchar(10)',
      notNull: true,
    },
    timestamp: {
      type: 'timestamp',
      notNull: true,
    },
    close: {
      type: 'decimal(18,8)',
      notNull: true,
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('NOW()'),
    },
  });

  pgm.createConstraint('prices', 'prices_symbol_timestamp_unique', {
    unique: ['symbol', 'timestamp'],
  });
  pgm.createIndex('prices', ['symbol', { name: 'timestamp', sort: 'DESC' }]);

  pgm.createTable('public_reports', {
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
    report_uuid: {
      type: 'uuid',
      notNull: true,
      unique: true,
      default: pgm.func('uuid_generate_v4()'),
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('NOW()'),
    },
    expires_at: {
      type: 'timestamp',
    },
    metadata: {
      type: 'jsonb',
    },
  });

  pgm.createIndex('public_reports', 'report_uuid');
  pgm.createIndex('public_reports', 'portfolio_id');
};

exports.down = (pgm) => {
  pgm.dropTable('public_reports', { ifExists: true, cascade: true });
  pgm.dropTable('prices', { ifExists: true, cascade: true });
  pgm.dropTable('trades', { ifExists: true, cascade: true });
  pgm.dropTable('portfolios', { ifExists: true, cascade: true });
  pgm.dropTable('users', { ifExists: true, cascade: true });
  pgm.dropExtension('uuid-ossp', { ifExists: true });
};
