const request = require("supertest");
const bcrypt = require("bcrypt");

const app = require("../../src/app");
const pool = require("../../src/db/pool");
const { releaseDbSuite } = require("../helpers/db-test-state");

jest.setTimeout(20000);

const adminUser = {
  name: "RBAC Admin",
  email: "rbac.admin@example.com",
  password: "adminpass123",
};

const analystUser = {
  name: "RBAC Analyst",
  email: "rbac.analyst@example.com",
  password: "analystpass123",
};

const viewerUser = {
  name: "RBAC Viewer",
  email: "rbac.viewer@example.com",
  password: "viewerpass123",
};

let adminToken;
let analystToken;
let viewerToken;
let adminRoleId;
let analystRoleId;
let viewerRoleId;

const cleanup = async () => {
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

  await createUser({ ...adminUser, roleId: adminRoleId });
  await createUser({ ...analystUser, roleId: analystRoleId });
  await createUser({ ...viewerUser, roleId: viewerRoleId });

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
});

afterAll(async () => {
  try {
    await cleanup();
  } finally {
    await releaseDbSuite();
  }
});

describe("RBAC smoke tests", () => {
  test("viewer can access dashboard summary only", async () => {
    const summaryRes = await request(app)
      .get("/dashboard/summary")
      .set("Authorization", `Bearer ${viewerToken}`);

    const recordsRes = await request(app)
      .get("/records")
      .set("Authorization", `Bearer ${viewerToken}`);

    expect(summaryRes.statusCode).toBe(200);
    expect(recordsRes.statusCode).toBe(403);
  });

  test("analyst can read records and analytics but cannot manage records", async () => {
    const recordsRes = await request(app)
      .get("/records")
      .set("Authorization", `Bearer ${analystToken}`);

    const analyticsRes = await request(app)
      .get("/dashboard/analytics")
      .set("Authorization", `Bearer ${analystToken}`);

    const createRes = await request(app)
      .post("/records")
      .set("Authorization", `Bearer ${analystToken}`)
      .send({
        amount: 10,
        type: "income",
        category_id: "00000000-0000-0000-0000-000000000000",
        date: "2024-01-01",
        notes: "rbac smoke",
      });

    expect(recordsRes.statusCode).toBe(200);
    expect(Array.isArray(recordsRes.body.data)).toBe(true);
    expect(analyticsRes.statusCode).toBe(200);
    expect(createRes.statusCode).toBe(403);
  });

  test("admin can manage users and records", async () => {
    const usersRes = await request(app)
      .get("/users")
      .set("Authorization", `Bearer ${adminToken}`);

    const recordsRes = await request(app)
      .get("/records")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(usersRes.statusCode).toBe(200);
    expect(recordsRes.statusCode).toBe(200);
  });
});
