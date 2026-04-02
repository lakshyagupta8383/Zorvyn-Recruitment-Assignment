const express = require("express");
const router = express.Router();

const controller = require("./auth.controller");
const authMiddleware = require("../../middlewares/auth.middleware");

// public
router.post("/register", controller.register);
router.post("/login", controller.login);

// protected
router.get("/me", authMiddleware, controller.me);
router.post("/logout", authMiddleware, controller.logout);

module.exports = router;