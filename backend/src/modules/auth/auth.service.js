const pool = require("../../db/pool");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const register = async ({ name, email, password }) => {
  const existing = await pool.query(
    "SELECT id FROM users WHERE email = $1",
    [email]
  );

  if (existing.rows.length) {
    throw { status: 409, message: "Email already exists" };
  }

  const hashed = await bcrypt.hash(password, 10);

  const roleRes = await pool.query(
    "SELECT id FROM roles WHERE LOWER(name) = 'viewer'"
  );

  const roleId = roleRes.rows[0].id;

  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash, role_id)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email`,
    [name, email, hashed, roleId]
  );

  return result.rows[0];
};

const login = async ({ email, password }) => {
  const result = await pool.query(
    `SELECT u.id, u.password_hash, u.status, r.name as role
     FROM users u
     JOIN roles r ON u.role_id = r.id
     WHERE u.email = $1`,
    [email]
  );

  const user = result.rows[0];

  if (!user) {
    throw { status: 401, message: "Invalid credentials" };
  }

  const match = await bcrypt.compare(password, user.password_hash);

  if (!match) {
    throw { status: 401, message: "Invalid credentials" };
  }

  if (user.status !== "active") {
    throw { status: 403, message: "User inactive" };
  }

  const token = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

  return { token };
};

const getMe = async (userId) => {
  const result = await pool.query(
    `SELECT u.id, u.email, r.name as role
     FROM users u
     JOIN roles r ON u.role_id = r.id
     WHERE u.id = $1`,
    [userId]
  );

  return result.rows[0];
};

const logout = async (token, userId) => {
  await pool.query(
    `INSERT INTO sessions (user_id, token, is_valid, expires_at)
     VALUES ($1, $2, false, NOW() + INTERVAL '1 day')`, 
    [userId, token]
  );
};

module.exports = { register, login, getMe, logout };