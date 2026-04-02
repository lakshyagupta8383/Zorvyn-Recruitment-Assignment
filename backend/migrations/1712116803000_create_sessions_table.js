
exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('sessions', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users(id)',
      onDelete: 'cascade',
    },
    token: {
      type: 'text',
      notNull: true,
      unique: true,
    },
    is_valid: {
      type: 'boolean',
      notNull: true,
      default: true,
    },
    expires_at: {
      type: 'timestamp',
      notNull: true,
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  });

  pgm.createIndex('sessions', 'user_id');
  pgm.createIndex('sessions', 'token');
  pgm.createIndex('sessions', 'expires_at');

 pgm.createIndex('sessions', ['user_id', 'is_valid'], {
  where: 'is_valid = true',
});
};

exports.down = (pgm) => {
  pgm.dropTable('sessions');
};
