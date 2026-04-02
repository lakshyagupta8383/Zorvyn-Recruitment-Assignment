require("dotenv").config({
  path: require("path").resolve(__dirname, "../.env"),
});

const bcrypt = require("bcrypt");
const pool = require("../src/db/pool");
const withTransaction = require("../src/db/transaction");

const seedUsers = [
  {
    name: "Seed Admin",
    email: "admin@zorvyn.com",
    password: "admin123",
    role: "admin",
    status: "active",
  },
  {
    name: "Seed Analyst",
    email: "analyst@zorvyn.com",
    password: "analyst123",
    role: "analyst",
    status: "active",
  },
  {
    name: "Seed Viewer",
    email: "viewer@zorvyn.com",
    password: "viewer123",
    role: "viewer",
    status: "active",
  },
];

const seedCategories = [
  { name: "Salary", is_system: true },
  { name: "Expenses", is_system: true },
  { name: "Investments", is_system: true },
];

const seedRecords = [
  {
    amount: 5000,
    type: "income",
    category: "Salary",
    date: "2024-01-01",
    notes: "January salary",
    user: "admin@zorvyn.com",
  },
  {
    amount: 1200,
    type: "expense",
    category: "Expenses",
    date: "2024-01-03",
    notes: "Office rent",
    user: "viewer@zorvyn.com",
  },
  {
    amount: 800,
    type: "expense",
    category: "Investments",
    date: "2024-01-05",
    notes: "Index fund contribution",
    user: "analyst@zorvyn.com",
  },
  {
    amount: 2500,
    type: "income",
    category: "Salary",
    date: "2024-02-01",
    notes: "February salary",
    user: "admin@zorvyn.com",
  },
];

const run = async () => {
  const roles = await pool.query(
    "SELECT id, LOWER(name) AS name FROM roles WHERE LOWER(name) IN ('viewer', 'analyst', 'admin')"
  );
  const roleMap = Object.fromEntries(roles.rows.map((row) => [row.name, row.id]));

  if (!roleMap.viewer || !roleMap.analyst || !roleMap.admin) {
    throw new Error("Required roles are missing. Run migrations first.");
  }

  await withTransaction(async (client) => {
    await client.query("TRUNCATE TABLE records, categories, sessions, users RESTART IDENTITY CASCADE");

    const userIdMap = {};

    for (const user of seedUsers) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      const result = await client.query(
        `
          INSERT INTO users (name, email, password_hash, role_id, status)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id
        `,
        [user.name, user.email, hashedPassword, roleMap[user.role], user.status]
      );

      userIdMap[user.email] = result.rows[0].id;
    }

    const categoryIdMap = {};

    for (const category of seedCategories) {
      const result = await client.query(
        `
          INSERT INTO categories (name, is_system, created_by)
          VALUES ($1, $2, $3)
          RETURNING id
        `,
        [category.name, category.is_system, userIdMap["admin@zorvyn.com"]]
      );

      categoryIdMap[category.name] = result.rows[0].id;
    }

    for (const record of seedRecords) {
      await client.query(
        `
          INSERT INTO records (amount, type, category_id, date, notes, created_by)
          VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          record.amount,
          record.type,
          categoryIdMap[record.category],
          record.date,
          record.notes,
          userIdMap[record.user],
        ]
      );
    }
  });

  console.log("Seed completed.");
  console.log("Login credentials:");
  console.log("  admin@zorvyn.com / admin123");
  console.log("  analyst@zorvyn.com / analyst123");
  console.log("  viewer@zorvyn.com / viewer123");
};

run()
  .catch((err) => {
    console.error("Seed failed:", err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
