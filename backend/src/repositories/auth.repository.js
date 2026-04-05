const pool = require("../db/pool");

const findRoleIdByName = async (role, db = pool) => {
  const result = await db.query(
    "SELECT id FROM roles WHERE LOWER(name) = LOWER($1)",
    [role]
  );

  return result.rows[0]?.id || null;
};

const findUserForLogin = async (email, db = pool) => {
  const result = await db.query(
    `SELECT u.id, u.password_hash, u.status, r.name as role
     FROM users u
     JOIN roles r ON u.role_id = r.id
     WHERE u.email = $1`,
    [email]
  );

  return result.rows[0] || null;
};

const findUserProfileById = async (id, db = pool) => {
  const result = await db.query(
    `SELECT u.id, u.email, u.status, r.name as role
     FROM users u
     JOIN roles r ON u.role_id = r.id
     WHERE u.id = $1`,
    [id]
  );

  return result.rows[0] || null;
};

const findSessionByToken = async (token, db = pool) => {
  const result = await db.query(
    "SELECT is_valid FROM sessions WHERE token = $1",
    [token]
  );

  return result.rows[0] || null;
};

const insertSession = async (userId, token, db = pool) => {
  await db.query(
    `INSERT INTO sessions (user_id, token, is_valid, expires_at)
     VALUES ($1, $2, false, NOW() + INTERVAL '1 day')`,
    [userId, token]
  );
};

module.exports = {
  findRoleIdByName,
  findUserForLogin,
  findUserProfileById,
  findSessionByToken,
  insertSession,
};
