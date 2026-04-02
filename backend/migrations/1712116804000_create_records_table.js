
exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('records', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    amount: {
      type: 'numeric(15, 2)',
      notNull: true,
      check: 'amount > 0',
    },
    type: {
      type: 'varchar(50)',
      notNull: true,
      check: "type IN ('income', 'expense')",
    },
    category_id: {
      type: 'uuid',
      notNull: true,
      references: 'categories(id)',
      onDelete: 'restrict',
    },
    date: {
      type: 'date',
      notNull: true,
    },
    notes: {
      type: 'text',
    },
    created_by: {
      type: 'uuid',
      notNull: true,
      references: 'users(id)',
      onDelete: 'restrict',
    },
    deleted_at: {
      type: 'timestamp',
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
    updated_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  });

  pgm.createIndex('records', 'category_id');
  pgm.createIndex('records', 'created_by');
  pgm.createIndex('records', 'date');
  pgm.createIndex('records', 'type');
  pgm.createIndex('records', 'deleted_at');

  pgm.sql(`
    CREATE INDEX idx_records_active_by_date 
    ON records(created_by, date) 
    WHERE deleted_at IS NULL;
  `);
};

exports.down = (pgm) => {
  pgm.dropTable('records');
};
