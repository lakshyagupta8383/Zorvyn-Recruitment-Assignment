const request = require("supertest");
const bcrypt = require("bcrypt");

const app = require("../../src/app");
const pool = require("../../src/db/pool");

jest.setTimeout(20000);

const adminUser = {
  name: "Records Admin",
  email: "records.admin@example.com",
  password: "adminpass123",
};

const viewerUser = {
  name: "Records Viewer",
  email: "records.viewer@example.com",
  password: "viewerpass123",
};

const analystUser = {
  name: "Records Analyst",
  email: "records.analyst@example.com",
  password: "analystpass123",
};

let adminToken;
let viewerToken;
let analystToken;
let adminRoleId;
let viewerRoleId;
let analystRoleId;
let categoryId;
let adminRecordId;
let viewerRecordId;

const cleanup = async () => {
  await pool.query(
    "DELETE FROM records WHERE notes LIKE $1 OR notes LIKE $2",
    ["%records integration%", "%viewer record%"]
  );
  await pool.query(
    "DELETE FROM categories WHERE name = ANY($1::text[])",
    [["Records Integration Category", "Viewer Category", "Analyst Category"]]
  );
  await pool.query(
    "DELETE FROM users WHERE email = ANY($1::text[])",
    [[adminUser.email, viewerUser.email, analystUser.email]]
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

  const adminId = await createUser({
    ...adminUser,
    roleId: adminRoleId,
  });

  const viewerId = await createUser({
    ...viewerUser,
    roleId: viewerRoleId,
  });

  const analystId = await createUser({
    ...analystUser,
    roleId: analystRoleId,
  });

  const categoryResult = await pool.query(
    `
      INSERT INTO categories (name, is_system, created_by)
      VALUES ($1, true, $2)
      RETURNING id
    `,
    ["Records Integration Category", adminId]
  );
  categoryId = categoryResult.rows[0].id;

  await pool.query(
    `
      INSERT INTO categories (name, is_system, created_by)
      VALUES ($1, false, $2)
      ON CONFLICT DO NOTHING
    `,
    ["Analyst Category", analystId]
  );

  const adminLogin = await request(app)
    .post("/auth/login")
    .send({ email: adminUser.email, password: adminUser.password });
  adminToken = adminLogin.body?.data?.token;

  const viewerLogin = await request(app)
    .post("/auth/login")
    .send({ email: viewerUser.email, password: viewerUser.password });
  viewerToken = viewerLogin.body?.data?.token;

  const analystLogin = await request(app)
    .post("/auth/login")
    .send({ email: analystUser.email, password: analystUser.password });
  analystToken = analystLogin.body?.data?.token;

  expect(adminToken).toBeDefined();
  expect(viewerToken).toBeDefined();
  expect(analystToken).toBeDefined();
});

afterAll(async () => {
  await cleanup();
  await pool.end();
  await new Promise((resolve) => setImmediate(resolve));
});

describe("Records Integration", () => {
  test("viewer can create their own record", async () => {
    const res = await request(app)
      .post("/records")
      .set("Authorization", `Bearer ${viewerToken}`)
      .send({
        amount: 125.5,
        type: "expense",
        category_id: categoryId,
        date: "2024-01-10",
        notes: "viewer record for records integration",
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.amount).toBe("125.50");
    expect(res.body.data.type).toBe("expense");
    viewerRecordId = res.body.data.id;
  });

  test("admin can create a record", async () => {
    const res = await request(app)
      .post("/records")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        amount: 250,
        type: "income",
        category_id: categoryId,
        date: "2024-01-11",
        notes: "admin record for records integration",
      });

    expect(res.statusCode).toBe(201);
    adminRecordId = res.body.data.id;
  });

  test("viewer only sees own records in list", async () => {
    const res = await request(app)
      .get("/records")
      .set("Authorization", `Bearer ${viewerToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].id).toBe(viewerRecordId);
  });

  test("admin sees both records in list", async () => {
    const res = await request(app)
      .get("/records")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
  });

  test("analyst can list records", async () => {
    const res = await request(app)
      .get("/records")
      .set("Authorization", `Bearer ${analystToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test("search returns matching record", async () => {
    const res = await request(app)
      .get("/records/search")
      .query({ q: "integration" })
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.some((record) => record.id === adminRecordId)).toBe(true);
  });

  test("analyst can search records", async () => {
    const res = await request(app)
      .get("/records/search")
      .query({ q: "integration" })
      .set("Authorization", `Bearer ${analystToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test("viewer can update own record", async () => {
    const res = await request(app)
      .patch(`/records/${viewerRecordId}`)
      .set("Authorization", `Bearer ${viewerToken}`)
      .send({
        notes: "viewer record updated for records integration",
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.notes).toContain("updated");
  });

  test("viewer can soft delete own record", async () => {
    const res = await request(app)
      .delete(`/records/${viewerRecordId}`)
      .set("Authorization", `Bearer ${viewerToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.deleted).toBe(true);
  });
});
