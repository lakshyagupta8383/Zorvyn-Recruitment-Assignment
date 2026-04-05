const pool = require("../../db/pool");
const withTransaction = require("../../db/transaction");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { ROLES } = require("../../constants/roles");
const { jwtSecret } = require("../../config/env");

const register = async ({ name, email, password }) => {
  return withTransaction(async (client) => {
    const existing = await client.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (existing.rows.length) {
      throw { status: 409, message: "Email already exists" };
    }

    const hashed = await bcrypt.hash(password, 10);

    const roleRes = await client.query(
      "SELECT id FROM roles WHERE LOWER(name) = $1",
      [ROLES.VIEWER]
    );

    const roleId = roleRes.rows[0]?.id;

    if (!roleId) {
      throw { status: 500, message: "Default role is missing" };
    }

    try {
      const result = await client.query(
        `INSERT INTO users (name, email, password_hash, role_id)
         VALUES ($1, $2, $3, $4)
         RETURNING id, email`,
        [name, email, hashed, roleId]
      );

      return result.rows[0];
    } catch (err) {
      if (err.code === "23505") {
        throw { status: 409, message: "Email already exists" };
      }

      throw err;
    }
  });
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
    jwtSecret,
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
