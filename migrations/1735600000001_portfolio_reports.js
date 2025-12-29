exports.up = (pgm) => {
  // Drop the old public_reports table if it exists from the initial schema
  pgm.dropTable('public_reports', { ifExists: true });
  
  // Create the new portfolio_reports table with the full schema
  pgm.createTable('portfolio_reports', {
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
      type: 'varchar(36)',
      notNull: true,
      unique: true,
    },
    snapshot_data: {
      type: 'jsonb',
      notNull: true,
    },
    title: {
      type: 'varchar(255)',
    },
    description: {
      type: 'text',
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
    created_by_user_id: {
      type: 'uuid',
      references: 'users',
      onDelete: 'SET NULL',
    },
    view_count: {
      type: 'integer',
      notNull: true,
      default: 0,
    },
    last_viewed_at: {
      type: 'timestamp',
    },
    is_public: {
      type: 'boolean',
      notNull: true,
      default: true,
    },
    expires_at: {
      type: 'timestamp',
    },
  });

  // Create indexes
  pgm.createIndex('portfolio_reports', 'report_uuid');
  pgm.createIndex('portfolio_reports', 'portfolio_id');
  pgm.createIndex('portfolio_reports', 'created_at');
  pgm.createIndex('portfolio_reports', 'expires_at');
  
  // Create trigger for updated_at
  pgm.createFunction(
    'update_updated_at_column',
    [],
    {
      returns: 'TRIGGER',
      language: 'plpgsql',
    },
    `
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    `
  );
  
  pgm.createTrigger('portfolio_reports', 'update_updated_at', {
    when: 'BEFORE',
    operation: 'UPDATE',
    function: 'update_updated_at_column',
    level: 'ROW',
  });
  
  // Add constraint for valid UUID format
  pgm.addConstraint('portfolio_reports', 'valid_report_uuid_format', {
    check: "report_uuid ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'"
  });
};

exports.down = (pgm) => {
  pgm.dropTrigger('portfolio_reports', 'update_updated_at', { ifExists: true });
  pgm.dropFunction('update_updated_at_column', [], { ifExists: true });
  pgm.dropTable('portfolio_reports', { ifExists: true });
};