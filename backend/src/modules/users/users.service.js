const bcrypt = require("bcrypt");
const pool = require("../../db/pool");

const mapUserRow = (row) => {
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
};

const resolveRoleId = async (role) => {
  const roleRes = await pool.query(
    "SELECT id FROM roles WHERE LOWER(name) = $1",
    [role.toLowerCase()]
  );

  const roleRow = roleRes.rows[0];

  if (!roleRow) {
    throw { status: 400, message: "Invalid role" };
  }

  return roleRow.id;
};

const listUsers = async ({ page, limit, search, role, status }) => {
  const where = [];
  const params = [];
  let idx = 1;

  if (search) {
    where.push(`(u.name ILIKE $${idx} OR u.email ILIKE $${idx})`);
    params.push(`%${search}%`);
    idx += 1;
  }

  if (role) {
    where.push(`LOWER(r.name) = $${idx}`);
    params.push(role.toLowerCase());
    idx += 1;
  }

  if (status) {
    where.push(`u.status = $${idx}`);
    params.push(status);
    idx += 1;
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const offset = (page - 1) * limit;

  const countResult = await pool.query(
    `
      SELECT COUNT(*)::int AS total
      FROM users u
      JOIN roles r ON u.role_id = r.id
      ${whereClause}
    `,
    params
  );

  const result = await pool.query(
    `
      SELECT
        u.id,
        u.name,
        u.email,
        u.status,
        r.name AS role,
        u.created_at,
        u.updated_at
      FROM users u
      JOIN roles r ON u.role_id = r.id
      ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `,
    [...params, limit, offset]
  );

  const total = countResult.rows[0]?.total || 0;

  return {
    data: result.rows.map(mapUserRow),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit) || 0,
    },
  };
};

const getUserById = async (id) => {
  const result = await pool.query(
    `
      SELECT
        u.id,
        u.name,
        u.email,
        u.status,
        r.name AS role,
        u.created_at,
        u.updated_at
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = $1
    `,
    [id]
  );

  return mapUserRow(result.rows[0]);
};

const createUser = async ({ name, email, password, role, status }) => {
  const existing = await pool.query(
    "SELECT id FROM users WHERE LOWER(email) = LOWER($1)",
    [email]
  );

  if (existing.rows.length) {
    throw { status: 409, message: "Email already exists" };
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const roleId = await resolveRoleId(role);

  const result = await pool.query(
    `
      INSERT INTO users (name, email, password_hash, role_id, status)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `,
    [name, email, hashedPassword, roleId, status]
  );

  return getUserById(result.rows[0].id);
};

const updateUser = async (id, updates) => {
  const current = await getUserById(id);

  if (!current) {
    throw { status: 404, message: "User not found" };
  }

  const fields = [];
  const params = [];
  let idx = 1;

  if (updates.name !== undefined) {
    fields.push(`name = $${idx}`);
    params.push(updates.name);
    idx += 1;
  }

  if (updates.email !== undefined) {
    const existing = await pool.query(
      "SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND id <> $2",
      [updates.email, id]
    );

    if (existing.rows.length) {
      throw { status: 409, message: "Email already exists" };
    }

    fields.push(`email = $${idx}`);
    params.push(updates.email);
    idx += 1;
  }

  if (updates.password !== undefined) {
    const hashedPassword = await bcrypt.hash(updates.password, 10);
    fields.push(`password_hash = $${idx}`);
    params.push(hashedPassword);
    idx += 1;
  }

  if (updates.role !== undefined) {
    const roleId = await resolveRoleId(updates.role);
    fields.push(`role_id = $${idx}`);
    params.push(roleId);
    idx += 1;
  }

  if (updates.status !== undefined) {
    fields.push(`status = $${idx}`);
    params.push(updates.status);
    idx += 1;
  }

  fields.push(`updated_at = NOW()`);

  await pool.query(
    `
      UPDATE users
      SET ${fields.join(", ")}
      WHERE id = $${idx}
    `,
    [...params, id]
  );

  return getUserById(id);
};

const setUserStatus = async (id, status) => {
  return updateUser(id, { status });
};

const deleteUser = async (id) => {
  let result;

  try {
    result = await pool.query("DELETE FROM users WHERE id = $1 RETURNING id", [id]);
  } catch (err) {
    if (err.code === "23503") {
      throw { status: 409, message: "User cannot be deleted because it is referenced elsewhere" };
    }

    throw err;
  }

  if (!result.rows.length) {
    throw { status: 404, message: "User not found" };
  }

  return { deleted: true };
};

module.exports = {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  setUserStatus,
  deleteUser,
};
