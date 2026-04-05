const pool = require("../db/pool");
const withTransaction = require("../db/transaction");

const mapCategoryRow = (row) => {
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    is_system: row.is_system,
    created_by: row.created_by,
    created_by_email: row.created_by_email,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
};

const listCategories = async ({ page, limit, search, is_system }) => {
  const where = [];
  const params = [];
  let idx = 1;

  if (search) {
    where.push(`c.name ILIKE $${idx}`);
    params.push(`%${search}%`);
    idx += 1;
  }

  if (is_system !== undefined) {
    where.push(`c.is_system = $${idx}`);
    params.push(is_system);
    idx += 1;
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const offset = (page - 1) * limit;

  const countResult = await pool.query(
    `
      SELECT COUNT(*)::int AS total
      FROM categories c
      ${whereClause}
    `,
    params
  );

  const result = await pool.query(
    `
      SELECT
        c.id,
        c.name,
        c.is_system,
        c.created_by,
        u.email AS created_by_email,
        c.created_at,
        c.updated_at
      FROM categories c
      JOIN users u ON c.created_by = u.id
      ${whereClause}
      ORDER BY c.is_system DESC, c.name ASC
      LIMIT $${idx} OFFSET $${idx + 1}
    `,
    [...params, limit, offset]
  );

  const total = countResult.rows[0]?.total || 0;

  return {
    data: result.rows.map(mapCategoryRow),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit) || 0,
    },
  };
};

const getCategoryById = async (id, db = pool) => {
  const result = await db.query(
    `
      SELECT
        c.id,
        c.name,
        c.is_system,
        c.created_by,
        u.email AS created_by_email,
        c.created_at,
        c.updated_at
      FROM categories c
      JOIN users u ON c.created_by = u.id
      WHERE c.id = $1
    `,
    [id]
  );

  return mapCategoryRow(result.rows[0]);
};

const createCategory = async ({ name, is_system, created_by }) => {
  return withTransaction(async (client) => {
    const existing = await client.query(
      `
        SELECT id
        FROM categories
        WHERE LOWER(name) = LOWER($1)
          AND created_by = $2
          AND is_system = $3
      `,
      [name, created_by, is_system]
    );

    if (existing.rows.length) {
      throw { status: 409, message: "Category already exists" };
    }

    const result = await client.query(
      `
        INSERT INTO categories (name, is_system, created_by)
        VALUES ($1, $2, $3)
        RETURNING id
      `,
      [name, is_system, created_by]
    );

    return getCategoryById(result.rows[0].id, client);
  });
};

const updateCategory = async (id, updates) => {
  return withTransaction(async (client) => {
    const current = await getCategoryById(id, client);

    if (!current) {
      throw { status: 404, message: "Category not found" };
    }

    const fields = [];
    const params = [];
    let idx = 1;

    if (updates.name !== undefined) {
      fields.push(`name = $${idx}`);
      params.push(updates.name);
      idx += 1;
    }

    if (updates.is_system !== undefined) {
      fields.push(`is_system = $${idx}`);
      params.push(updates.is_system);
      idx += 1;
    }

    fields.push("updated_at = NOW()");

    await client.query(
      `
        UPDATE categories
        SET ${fields.join(", ")}
        WHERE id = $${idx}
      `,
      [...params, id]
    );

    return getCategoryById(id, client);
  });
};

const deleteCategory = async (id) => {
  return withTransaction(async (client) => {
    let result;

    try {
      result = await client.query("DELETE FROM categories WHERE id = $1 RETURNING id", [id]);
    } catch (err) {
      if (err.code === "23503") {
        throw { status: 409, message: "Category cannot be deleted because it is referenced by records" };
      }

      throw err;
    }

    if (!result.rows.length) {
      throw { status: 404, message: "Category not found" };
    }

    return { deleted: true };
  });
};

module.exports = {
  listCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};
