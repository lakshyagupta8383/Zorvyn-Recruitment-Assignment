
exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('users', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    name: {
      type: 'varchar(255)',
      notNull: true,
    },
    email: {
      type: 'varchar(255)',
      notNull: true,
      unique: true,
    },
    password_hash: {
      type: 'text',
      notNull: true,
    },
    role_id: {
      type: 'uuid',
      notNull: true,
      references: 'roles(id)',
      onDelete: 'restrict',
    },
    status: {
      type: 'varchar(50)',
      notNull: true,
      default: 'active',
      check: "status IN ('active', 'inactive')",
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

  pgm.createIndex('users', 'email');
  pgm.createIndex('users', 'role_id');
  pgm.createIndex('users', 'status');
};

exports.down = (pgm) => {
  pgm.dropTable('users');
};
