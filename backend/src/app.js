const express = require("express");

const authRoutes = require("./modules/auth/auth.routes");
const errorHandler = require("./middlewares/error.middleware");

const app = express();

// middlewares
app.use(express.json());

// health check
app.get("/", (req, res) => {
  res.send("API running...");
});

// routes
app.use("/auth", authRoutes);

// error handler (must be last)
app.use(errorHandler);

module.exports = app;