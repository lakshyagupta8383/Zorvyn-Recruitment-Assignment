const pool = require("../db/pool");

const readAllRoles = new Set(["admin", "analyst"]);
const normalizeRole = (role) => String(role || "").toLowerCase();
const canReadAll = (user) => readAllRoles.has(normalizeRole(user.role));

const buildScope = (user, alias = "r") => {
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

const addRangeFilters = (clauses, params, nextIdx, from, to, alias = "r") => {
  let idx = nextIdx;

  if (from) {
    clauses.push(`${alias}.date >= $${idx}`);
    params.push(from);
    idx += 1;
  }

  if (to) {
    clauses.push(`${alias}.date <= $${idx}`);
    params.push(to);
    idx += 1;
  }

  return idx;
};

const getSummary = async (user, { from, to } = {}) => {
  const scope = buildScope(user);
  const clauses = [...scope.clauses];
  const params = [...scope.params];
  addRangeFilters(clauses, params, scope.nextIdx, from, to);

  const result = await pool.query(
    `
      SELECT
        COALESCE(SUM(CASE WHEN r.type = 'income' THEN r.amount ELSE 0 END), 0)::numeric(15, 2) AS total_income,
        COALESCE(SUM(CASE WHEN r.type = 'expense' THEN r.amount ELSE 0 END), 0)::numeric(15, 2) AS total_expenses,
        COALESCE(
          SUM(
            CASE
              WHEN r.type = 'income' THEN r.amount
              ELSE -r.amount
            END
          ),
          0
        )::numeric(15, 2) AS net_balance,
        COUNT(*)::int AS total_records,
        COUNT(DISTINCT r.category_id)::int AS categories_used
      FROM records r
      WHERE ${clauses.join(" AND ")}
    `,
    params
  );

  const row = result.rows[0] || {};

  return {
    total_income: row.total_income || "0.00",
    total_expenses: row.total_expenses || "0.00",
    net_balance: row.net_balance || "0.00",
    total_records: row.total_records || 0,
    categories_used: row.categories_used || 0,
  };
};

const getAdvancedAnalytics = async (user, { from, to } = {}) => {
  const scope = buildScope(user);
  const clauses = [...scope.clauses];
  const params = [...scope.params];
  addRangeFilters(clauses, params, scope.nextIdx, from, to);

  const [categoryBreakdown, monthlyTrends, weeklyTrends, recentActivity, topSpendingCategories] =
    await Promise.all([
      pool.query(
        `
          SELECT
            c.id,
            c.name,
            COALESCE(SUM(CASE WHEN r.type = 'income' THEN r.amount ELSE 0 END), 0)::numeric(15, 2) AS income,
            COALESCE(SUM(CASE WHEN r.type = 'expense' THEN r.amount ELSE 0 END), 0)::numeric(15, 2) AS expenses,
            COALESCE(
              SUM(
                CASE
                  WHEN r.type = 'income' THEN r.amount
                  ELSE -r.amount
                END
              ),
              0
            )::numeric(15, 2) AS net_balance
          FROM records r
          JOIN categories c ON r.category_id = c.id
          WHERE ${clauses.join(" AND ")}
          GROUP BY c.id, c.name
          ORDER BY c.name ASC
        `,
        params
      ),
      pool.query(
        `
          SELECT
            TO_CHAR(DATE_TRUNC('month', r.date), 'YYYY-MM') AS period,
            COALESCE(SUM(CASE WHEN r.type = 'income' THEN r.amount ELSE 0 END), 0)::numeric(15, 2) AS income,
            COALESCE(SUM(CASE WHEN r.type = 'expense' THEN r.amount ELSE 0 END), 0)::numeric(15, 2) AS expenses,
            COALESCE(
              SUM(
                CASE
                  WHEN r.type = 'income' THEN r.amount
                  ELSE -r.amount
                END
              ),
              0
            )::numeric(15, 2) AS net_balance
          FROM records r
          WHERE ${clauses.join(" AND ")}
          GROUP BY DATE_TRUNC('month', r.date)
          ORDER BY period ASC
        `,
        params
      ),
      pool.query(
        `
          SELECT
            TO_CHAR(DATE_TRUNC('week', r.date), 'YYYY-MM-DD') AS period_start,
            COALESCE(SUM(CASE WHEN r.type = 'income' THEN r.amount ELSE 0 END), 0)::numeric(15, 2) AS income,
            COALESCE(SUM(CASE WHEN r.type = 'expense' THEN r.amount ELSE 0 END), 0)::numeric(15, 2) AS expenses,
            COALESCE(
              SUM(
                CASE
                  WHEN r.type = 'income' THEN r.amount
                  ELSE -r.amount
                END
              ),
              0
            )::numeric(15, 2) AS net_balance
          FROM records r
          WHERE ${clauses.join(" AND ")}
          GROUP BY DATE_TRUNC('week', r.date)
          ORDER BY period_start ASC
        `,
        params
      ),
      pool.query(
        `
          SELECT
            r.id,
            r.amount,
            r.type,
            r.date,
            r.notes,
            c.name AS category_name,
            u.email AS created_by_email,
            r.created_at
          FROM records r
          JOIN categories c ON r.category_id = c.id
          JOIN users u ON r.created_by = u.id
          WHERE ${clauses.join(" AND ")}
          ORDER BY r.created_at DESC
          LIMIT 10 OFFSET 0
        `,
        params
      ),
      pool.query(
        `
          SELECT
            c.id,
            c.name,
            COALESCE(SUM(r.amount), 0)::numeric(15, 2) AS total_spent
          FROM records r
          JOIN categories c ON r.category_id = c.id
          WHERE ${clauses.join(" AND ")}
            AND r.type = 'expense'
          GROUP BY c.id, c.name
          ORDER BY total_spent DESC, c.name ASC
          LIMIT 5 OFFSET 0
        `,
        params
      ),
    ]);

  return {
    category_breakdown: categoryBreakdown.rows,
    monthly_trends: monthlyTrends.rows,
    weekly_trends: weeklyTrends.rows,
    recent_activity: recentActivity.rows,
    top_spending_categories: topSpendingCategories.rows,
    range: {
      from: from || null,
      to: to || null,
    },
  };
};

module.exports = {
  getSummary,
  getAdvancedAnalytics,
};
