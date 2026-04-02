
exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('categories', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    name: {
      type: 'varchar(255)',
      notNull: true,
    },
    is_system: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
    created_by: {
      type: 'uuid',
      notNull: true,
      references: 'users(id)',
      onDelete: 'restrict',
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

  pgm.createIndex('categories', 'created_by');
  pgm.createIndex('categories', 'is_system');

  pgm.sql(`
    CREATE UNIQUE INDEX idx_categories_name_per_user 
    ON categories(name, created_by) 
    WHERE is_system = false;
  `);
};

exports.down = (pgm) => {
  pgm.dropTable('categories');
};
