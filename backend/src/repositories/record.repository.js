const pool = require("../db/pool");
const withTransaction = require("../db/transaction");

const readAllRoles = new Set(["admin", "analyst"]);
const manageAllRoles = new Set(["admin"]);

const normalizeRole = (role) => String(role || "").toLowerCase();
const canReadAll = (user) => readAllRoles.has(normalizeRole(user.role));
const canManageAll = (user) => manageAllRoles.has(normalizeRole(user.role));

const serializeRecord = (row) => {
  if (!row) return null;

  return {
    id: row.id,
    amount: row.amount,
    type: row.type,
    category_id: row.category_id,
    category_name: row.category_name,
    date: row.date,
    notes: row.notes,
    created_by: row.created_by,
    created_by_email: row.created_by_email,
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at,
  };
};

const buildAccessScope = (user, alias = "r") => {
  const clauses = [`${alias}.deleted_at IS NULL`];
  const params = [];
  let idx = 1;

  if (!canReadAll(user)) {
    clauses.push(`${alias}.created_by = $${idx}`);
    params.push(user.id);
    idx += 1;
  }

  return { clauses, params, nextIdx: idx };
};

const getCategoryForUser = async (categoryId, user, db = pool) => {
  const result = await db.query(
    `
      SELECT id, created_by, is_system
      FROM categories
      WHERE id = $1
    `,
    [categoryId]
  );

  const category = result.rows[0];

  if (!category) {
    throw { status: 404, message: "Category not found" };
  }

  if (!canManageAll(user) && category.created_by !== user.id && !category.is_system) {
    throw { status: 403, message: "Forbidden" };
  }

  return category;
};

const getRecordById = async (id, user, { includeDeleted = false } = {}, db = pool) => {
  const scope = buildAccessScope(user);
  const clauses = [...scope.clauses];
  const params = [...scope.params];
  let idx = scope.nextIdx;

  if (includeDeleted) {
    clauses[0] = "1=1";
  }

  clauses.push(`r.id = $${idx}`);
  params.push(id);

  const result = await db.query(
    `
      SELECT
        r.id,
        r.amount,
        r.type,
        r.category_id,
        c.name AS category_name,
        r.date,
        r.notes,
        r.created_by,
        u.email AS created_by_email,
        r.created_at,
        r.updated_at,
        r.deleted_at
      FROM records r
      JOIN categories c ON r.category_id = c.id
      JOIN users u ON r.created_by = u.id
      WHERE ${clauses.join(" AND ")}
    `,
    params
  );

  return serializeRecord(result.rows[0]);
};

const listRecords = async ({ user, page, limit, type, category_id, from, to }) => {
  const scope = buildAccessScope(user);
  const clauses = [...scope.clauses];
  const params = [...scope.params];
  let idx = scope.nextIdx;

  if (type) {
    clauses.push(`r.type = $${idx}`);
    params.push(type);
    idx += 1;
  }

  if (category_id) {
    clauses.push(`r.category_id = $${idx}`);
    params.push(category_id);
    idx += 1;
  }

  if (from) {
    clauses.push(`r.date >= $${idx}`);
    params.push(from);
    idx += 1;
  }

  if (to) {
    clauses.push(`r.date <= $${idx}`);
    params.push(to);
    idx += 1;
  }

  const offset = (page - 1) * limit;

  const countResult = await pool.query(
    `
      SELECT COUNT(*)::int AS total
      FROM records r
      WHERE ${clauses.join(" AND ")}
    `,
    params
  );

  const result = await pool.query(
    `
      SELECT
        r.id,
        r.amount,
        r.type,
        r.category_id,
        c.name AS category_name,
        r.date,
        r.notes,
        r.created_by,
        u.email AS created_by_email,
        r.created_at,
        r.updated_at,
        r.deleted_at
      FROM records r
      JOIN categories c ON r.category_id = c.id
      JOIN users u ON r.created_by = u.id
      WHERE ${clauses.join(" AND ")}
      ORDER BY r.date DESC, r.created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `,
    [...params, limit, offset]
  );

  const total = countResult.rows[0]?.total || 0;

  return {
    data: result.rows.map(serializeRecord),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit) || 0,
    },
  };
};

const searchRecords = async ({ user, q, page, limit }) => {
  const scope = buildAccessScope(user);
  const clauses = [...scope.clauses];
  const params = [...scope.params];
  let idx = scope.nextIdx;

  clauses.push(`(r.notes ILIKE $${idx} OR c.name ILIKE $${idx} OR CAST(r.amount AS TEXT) ILIKE $${idx})`);
  params.push(`%${q}%`);
  idx += 1;

  const offset = (page - 1) * limit;

  const countResult = await pool.query(
    `
      SELECT COUNT(*)::int AS total
      FROM records r
      JOIN categories c ON r.category_id = c.id
      WHERE ${clauses.join(" AND ")}
    `,
    params
  );

  const result = await pool.query(
    `
      SELECT
        r.id,
        r.amount,
        r.type,
        r.category_id,
        c.name AS category_name,
        r.date,
        r.notes,
        r.created_by,
        u.email AS created_by_email,
        r.created_at,
        r.updated_at,
        r.deleted_at
      FROM records r
      JOIN categories c ON r.category_id = c.id
      JOIN users u ON r.created_by = u.id
      WHERE ${clauses.join(" AND ")}
      ORDER BY r.date DESC, r.created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `,
    [...params, limit, offset]
  );

  const total = countResult.rows[0]?.total || 0;

  return {
    data: result.rows.map(serializeRecord),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit) || 0,
    },
  };
};

const createRecord = async (data, user) => {
  return withTransaction(async (client) => {
    await getCategoryForUser(data.category_id, user, client);

    const result = await client.query(
      `
        INSERT INTO records (amount, type, category_id, date, notes, created_by)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `,
      [data.amount, data.type, data.category_id, data.date, data.notes || null, user.id]
    );

    return getRecordById(result.rows[0].id, user, { includeDeleted: true }, client);
  });
};

const updateRecord = async (id, updates, user) => {
  return withTransaction(async (client) => {
    const current = await getRecordById(id, user, { includeDeleted: true }, client);

    if (!current || current.deleted_at) {
      throw { status: 404, message: "Record not found" };
    }

    if (updates.category_id) {
      await getCategoryForUser(updates.category_id, user, client);
    }

    const fields = [];
    const params = [];
    let idx = 1;

    if (updates.amount !== undefined) {
      fields.push(`amount = $${idx}`);
      params.push(updates.amount);
      idx += 1;
    }

    if (updates.type !== undefined) {
      fields.push(`type = $${idx}`);
      params.push(updates.type);
      idx += 1;
    }

    if (updates.category_id !== undefined) {
      fields.push(`category_id = $${idx}`);
      params.push(updates.category_id);
      idx += 1;
    }

    if (updates.date !== undefined) {
      fields.push(`date = $${idx}`);
      params.push(updates.date);
      idx += 1;
    }

    if (updates.notes !== undefined) {
      fields.push(`notes = $${idx}`);
      params.push(updates.notes);
      idx += 1;
    }

    fields.push("updated_at = NOW()");

    await client.query(
      `
        UPDATE records
        SET ${fields.join(", ")}
        WHERE id = $${idx}
      `,
      [...params, id]
    );

    return getRecordById(id, user, { includeDeleted: true }, client);
  });
};

const deleteRecord = async (id, user) => {
  return withTransaction(async (client) => {
    const current = await getRecordById(id, user, { includeDeleted: true }, client);

    if (!current || current.deleted_at) {
      throw { status: 404, message: "Record not found" };
    }

    const result = await client.query(
      `
        UPDATE records
        SET deleted_at = NOW(), updated_at = NOW()
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING id
      `,
      [id]
    );

    if (!result.rows.length) {
      throw { status: 404, message: "Record not found" };
    }

    return { deleted: true };
  });
};

module.exports = {
  listRecords,
  searchRecords,
  getRecordById,
  getCategoryForUser,
  createRecord,
  updateRecord,
  deleteRecord,
};
