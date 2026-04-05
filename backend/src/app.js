const express = require("express");

const authRoutes = require("./modules/auth/auth.routes");
const dashboardRoutes = require("./modules/dashboard/dashboard.routes");
const categoriesRoutes = require("./modules/categories/categories.routes");
const usersRoutes = require("./modules/users/users.routes");
const recordsRoutes = require("./modules/records/records.routes");
const rateLimit = require("./middlewares/rate-limit.middleware");
const errorHandler = require("./middlewares/error.middleware");

const app = express();

// middlewares
app.use(express.json());
app.use(rateLimit());

// health check
app.get("/", (req, res) => {
  res.send("API running...");
});

// routes
app.use("/auth", authRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/categories", categoriesRoutes);
app.use("/users", usersRoutes);
app.use("/records", recordsRoutes);

// error handler (must be last)
app.use(errorHandler);

module.exports = app;
