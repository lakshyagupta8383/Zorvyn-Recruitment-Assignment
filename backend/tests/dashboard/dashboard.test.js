const request = require("supertest");
const bcrypt = require("bcrypt");

const app = require("../../src/app");
const pool = require("../../src/db/pool");
const { releaseDbSuite } = require("../helpers/db-test-state");

jest.setTimeout(20000);

const adminUser = {
  name: "Dashboard Admin",
  email: "dashboard.admin@example.com",
  password: "adminpass123",
};

const analystUser = {
  name: "Dashboard Analyst",
  email: "dashboard.analyst@example.com",
  password: "analystpass123",
};

const viewerUser = {
  name: "Dashboard Viewer",
  email: "dashboard.viewer@example.com",
  password: "viewerpass123",
};

let adminToken;
let analystToken;
let viewerToken;
let adminRoleId;
let analystRoleId;
let viewerRoleId;
let incomeCategoryId;
let expenseCategoryId;

const cleanup = async () => {
  await pool.query(
    `
      DELETE FROM records
      WHERE created_by IN (
        SELECT id FROM users WHERE email = ANY($1::text[])
      )
      OR category_id IN (
        SELECT id FROM categories WHERE name = ANY($2::text[])
      )
    `,
    [
      [adminUser.email, analystUser.email, viewerUser.email],
      ["Dashboard Income", "Dashboard Expense"],
    ]
  );

  await pool.query(
    "DELETE FROM categories WHERE name = ANY($1::text[])",
    [["Dashboard Income", "Dashboard Expense"]]
  );

  await pool.query(
    "DELETE FROM users WHERE email = ANY($1::text[])",
    [[adminUser.email, analystUser.email, viewerUser.email]]
  );
};

const createUser = async ({ name, email, password, roleId }) => {
  const hashed = await bcrypt.hash(password, 10);
  const result = await pool.query(
    `
      INSERT INTO users (name, email, password_hash, role_id, status)
      VALUES ($1, $2, $3, $4, 'active')
      RETURNING id
    `,
    [name, email, hashed, roleId]
  );

  return result.rows[0].id;
};

beforeAll(async () => {
  const roles = await pool.query(
    "SELECT id, LOWER(name) AS name FROM roles WHERE LOWER(name) IN ('viewer', 'analyst', 'admin')"
  );
  const roleMap = Object.fromEntries(roles.rows.map((row) => [row.name, row.id]));

  viewerRoleId = roleMap.viewer;
  analystRoleId = roleMap.analyst;
  adminRoleId = roleMap.admin;

  if (!viewerRoleId || !analystRoleId || !adminRoleId) {
    throw new Error("Required roles are missing");
  }

  await cleanup();

  const adminId = await createUser({ ...adminUser, roleId: adminRoleId });
  await createUser({ ...analystUser, roleId: analystRoleId });
  await createUser({ ...viewerUser, roleId: viewerRoleId });

  const incomeCategory = await pool.query(
    `
      INSERT INTO categories (name, is_system, created_by)
      VALUES ($1, true, $2)
      RETURNING id
    `,
    ["Dashboard Income", adminId]
  );
  incomeCategoryId = incomeCategory.rows[0].id;

  const expenseCategory = await pool.query(
    `
      INSERT INTO categories (name, is_system, created_by)
      VALUES ($1, true, $2)
      RETURNING id
    `,
    ["Dashboard Expense", adminId]
  );
  expenseCategoryId = expenseCategory.rows[0].id;

  const adminLogin = await request(app)
    .post("/auth/login")
    .send({ email: adminUser.email, password: adminUser.password });
  adminToken = adminLogin.body?.data?.token;

  const analystLogin = await request(app)
    .post("/auth/login")
    .send({ email: analystUser.email, password: analystUser.password });
  analystToken = analystLogin.body?.data?.token;

  const viewerLogin = await request(app)
    .post("/auth/login")
    .send({ email: viewerUser.email, password: viewerUser.password });
  viewerToken = viewerLogin.body?.data?.token;

  expect(adminToken).toBeDefined();
  expect(analystToken).toBeDefined();
  expect(viewerToken).toBeDefined();

  await request(app)
    .post("/records")
    .set("Authorization", `Bearer ${viewerToken}`)
    .send({
      amount: 100,
      type: "income",
      category_id: incomeCategoryId,
      date: "2024-02-01",
      notes: "dashboard viewer income",
    });

  await request(app)
    .post("/records")
    .set("Authorization", `Bearer ${viewerToken}`)
    .send({
      amount: 20,
      type: "expense",
      category_id: expenseCategoryId,
      date: "2024-02-02",
      notes: "dashboard viewer expense",
    });

  await request(app)
    .post("/records")
    .set("Authorization", `Bearer ${analystToken}`)
    .send({
      amount: 50,
      type: "expense",
      category_id: expenseCategoryId,
      date: "2024-02-03",
      notes: "dashboard analyst expense",
    });

  await request(app)
    .post("/records")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      amount: 40,
      type: "income",
      category_id: incomeCategoryId,
      date: "2024-02-04",
      notes: "dashboard admin income",
    });
});

afterAll(async () => {
  try {
    await cleanup();
  } finally {
    await releaseDbSuite();
  }
});

describe("Dashboard Integration", () => {
  test("viewer can read own summary only", async () => {
    const res = await request(app)
      .get("/dashboard/summary")
      .set("Authorization", `Bearer ${viewerToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.total_income).toBe("100.00");
    expect(res.body.data.total_expenses).toBe("20.00");
    expect(res.body.data.net_balance).toBe("80.00");
  });

  test("analyst can read full summary", async () => {
    const res = await request(app)
      .get("/dashboard/summary")
      .set("Authorization", `Bearer ${analystToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.total_income).toBe("140.00");
    expect(res.body.data.total_expenses).toBe("70.00");
    expect(res.body.data.net_balance).toBe("70.00");
  });

  test("viewer cannot access analytics", async () => {
    const res = await request(app)
      .get("/dashboard/analytics")
      .set("Authorization", `Bearer ${viewerToken}`);

    expect(res.statusCode).toBe(403);
  });

  test("analyst can access analytics", async () => {
    const res = await request(app)
      .get("/dashboard/analytics")
      .set("Authorization", `Bearer ${analystToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data.category_breakdown)).toBe(true);
    expect(Array.isArray(res.body.data.monthly_trends)).toBe(true);
    expect(Array.isArray(res.body.data.weekly_trends)).toBe(true);
    expect(Array.isArray(res.body.data.recent_activity)).toBe(true);
    expect(Array.isArray(res.body.data.top_spending_categories)).toBe(true);
  });
});
