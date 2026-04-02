const request = require("supertest");
const bcrypt = require("bcrypt");

const app = require("../../src/app");
const pool = require("../../src/db/pool");
const { releaseDbSuite } = require("../helpers/db-test-state");

jest.setTimeout(20000);

const adminUser = {
  name: "Admin User",
  email: "admin.integration@example.com",
  password: "adminpass123",
};

const viewerUser = {
  name: "Viewer User",
  email: "viewer.integration@example.com",
  password: "viewerpass123",
};

const analystUser = {
  name: "Analyst User",
  email: "analyst.integration@example.com",
  password: "analystpass123",
};

const managedUser = {
  name: "Managed User",
  email: "managed.integration@example.com",
  password: "managedpass123",
};

let adminToken;
let viewerToken;
let analystToken;
let viewerRoleId;
let analystRoleId;
let adminRoleId;
let managedUserId;

const cleanupUsers = async () => {
  await pool.query(
    "DELETE FROM users WHERE email = ANY($1::text[])",
    [[adminUser.email, viewerUser.email, analystUser.email, managedUser.email]]
  );
};

const createUserByRole = async ({ name, email, password, roleId }) => {
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

  await cleanupUsers();

  await createUserByRole({
    ...adminUser,
    roleId: adminRoleId,
  });

  await createUserByRole({
    ...viewerUser,
    roleId: viewerRoleId,
  });

  await createUserByRole({
    ...analystUser,
    roleId: analystRoleId,
  });

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

  expect(analystToken).toBeDefined();
});

afterAll(async () => {
  try {
    await cleanupUsers();
  } finally {
    await releaseDbSuite();
  }
});

describe("Users Integration", () => {
  test("viewer cannot access users module", async () => {
    const res = await request(app)
      .get("/users")
      .set("Authorization", `Bearer ${viewerToken}`);

    expect(res.statusCode).toBe(403);
  });

  test("analyst cannot access users module", async () => {
    const res = await request(app)
      .get("/users")
      .set("Authorization", `Bearer ${analystToken}`);

    expect(res.statusCode).toBe(403);
  });

  test("admin can list users", async () => {
    const res = await request(app)
      .get("/users")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toBeDefined();
  });

  test("admin can create a user", async () => {
    const res = await request(app)
      .post("/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send(managedUser);

    expect(res.statusCode).toBe(201);
    expect(res.body.data.email).toBe(managedUser.email);
    expect(res.body.data.role).toBe("Viewer");
    expect(res.body.data.status).toBe("active");
    managedUserId = res.body.data.id;
  });

  test("admin can update a user's role and status", async () => {
    const res = await request(app)
      .patch(`/users/${managedUserId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        role: "analyst",
        status: "inactive",
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.role).toBe("Analyst");
    expect(res.body.data.status).toBe("inactive");
  });

  test("admin can fetch a user by id", async () => {
    const res = await request(app)
      .get(`/users/${managedUserId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.id).toBe(managedUserId);
  });

  test("admin can delete a user", async () => {
    const res = await request(app)
      .delete(`/users/${managedUserId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.deleted).toBe(true);
  });
});
