
exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('roles', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    name: {
      type: 'varchar(255)',
      notNull: true,
      unique: true,
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  });

  pgm.sql(`
    INSERT INTO roles (name) VALUES 
      ('Viewer'),
      ('Analyst'),
      ('Admin')
    ON CONFLICT (name) DO NOTHING;
  `);
};

exports.down = (pgm) => {
  pgm.dropTable('roles');
};
