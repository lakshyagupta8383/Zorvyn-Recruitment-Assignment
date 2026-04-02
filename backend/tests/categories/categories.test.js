const request = require("supertest");
const bcrypt = require("bcrypt");

const app = require("../../src/app");
const pool = require("../../src/db/pool");
const { releaseDbSuite } = require("../helpers/db-test-state");

jest.setTimeout(20000);

const adminUser = {
  name: "Categories Admin",
  email: "categories.admin@example.com",
  password: "adminpass123",
};

const viewerUser = {
  name: "Categories Viewer",
  email: "categories.viewer@example.com",
  password: "viewerpass123",
};

const analystUser = {
  name: "Categories Analyst",
  email: "categories.analyst@example.com",
  password: "analystpass123",
};

let adminToken;
let viewerToken;
let analystToken;
let adminRoleId;
let categoryId;
let lockedCategoryId;

const cleanup = async () => {
  await pool.query(
    "DELETE FROM records WHERE notes LIKE $1",
    ["%categories integration%"]
  );
  await pool.query(
    `
      DELETE FROM categories c
      USING users u
      WHERE c.created_by = u.id
        AND u.email = ANY($1::text[])
    `,
    [[adminUser.email, viewerUser.email, analystUser.email]]
  );
  await pool.query(
    "DELETE FROM users WHERE email = ANY($1::text[])",
    [[adminUser.email, viewerUser.email, analystUser.email]]
  );
};

const createAdmin = async ({ name, email, password, roleId }) => {
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
  adminRoleId = roleMap.admin;
  const viewerRoleId = roleMap.viewer;
  const analystRoleId = roleMap.analyst;

  if (!adminRoleId || !viewerRoleId || !analystRoleId) {
    throw new Error("Required roles are missing");
  }

  await cleanup();

  await createAdmin({
    ...adminUser,
    roleId: adminRoleId,
  });

  await createAdmin({
    ...viewerUser,
    roleId: viewerRoleId,
  });

  await createAdmin({
    ...analystUser,
    roleId: analystRoleId,
  });

  const adminLogin = await request(app)
    .post("/auth/login")
    .send({ email: adminUser.email, password: adminUser.password });

  adminToken = adminLogin.body?.data?.token;
  expect(adminToken).toBeDefined();

  const viewerLogin = await request(app)
    .post("/auth/login")
    .send({ email: viewerUser.email, password: viewerUser.password });
  viewerToken = viewerLogin.body?.data?.token;

  const analystLogin = await request(app)
    .post("/auth/login")
    .send({ email: analystUser.email, password: analystUser.password });
  analystToken = analystLogin.body?.data?.token;

  expect(viewerToken).toBeDefined();
  expect(analystToken).toBeDefined();
});

afterAll(async () => {
  await cleanup();
  await releaseDbSuite();
});

describe("Categories Integration", () => {
  test("viewer cannot access categories module", async () => {
    const res = await request(app)
      .get("/categories")
      .set("Authorization", `Bearer ${viewerToken}`);

    expect(res.statusCode).toBe(403);
  });

  test("analyst cannot access categories module", async () => {
    const res = await request(app)
      .get("/categories")
      .set("Authorization", `Bearer ${analystToken}`);

    expect(res.statusCode).toBe(403);
  });

  test("admin can create a category", async () => {
    const res = await request(app)
      .post("/categories")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Categories Integration Category",
        is_system: false,
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.name).toBe("Categories Integration Category");
    categoryId = res.body.data.id;
  });

  test("admin can list categories", async () => {
    const res = await request(app)
      .get("/categories")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test("admin can fetch a category by id", async () => {
    const res = await request(app)
      .get(`/categories/${categoryId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.id).toBe(categoryId);
  });

  test("admin can update a category", async () => {
    const res = await request(app)
      .patch(`/categories/${categoryId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Categories Integration Category Updated",
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.name).toBe("Categories Integration Category Updated");
  });

  test("admin can delete an unused category", async () => {
    const createRes = await request(app)
      .post("/categories")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Locked Category",
        is_system: false,
      });

    lockedCategoryId = createRes.body.data.id;

    const deleteRes = await request(app)
      .delete(`/categories/${lockedCategoryId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(deleteRes.statusCode).toBe(200);
    expect(deleteRes.body.data.deleted).toBe(true);
  });
});
