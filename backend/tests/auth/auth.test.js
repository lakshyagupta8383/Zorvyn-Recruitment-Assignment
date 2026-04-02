const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/db/pool');

let token;
jest.setTimeout(15000);
const testUser = {
  name: "Test User",
  email: "test@example.com",
  password: "password123"
};

beforeAll(async () => {
  await pool.query("DELETE FROM users WHERE email = $1", [testUser.email]);
});

afterAll(async () => {
  await pool.end();
  await new Promise(resolve => setImmediate(resolve));
});

describe("Auth Integration", () => {

  test("Register", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send(testUser);

    expect(res.statusCode).toBe(201);
  });

  test("Login", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({
        email: testUser.email,
        password: testUser.password
      });

    token = res.body.data.token;
    expect(token).toBeDefined();
  });

  test("Protected route (/me)", async () => {
    const res = await request(app)
      .get("/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
  });

});