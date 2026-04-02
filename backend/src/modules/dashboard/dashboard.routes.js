const express = require("express");

const controller = require("./dashboard.controller");
const authMiddleware = require("../../middlewares/auth.middleware");
const requireRole = require("../../middlewares/role.middleware");

const router = express.Router();

router.use(authMiddleware);

router.get("/summary", controller.summary);
router.get("/analytics", requireRole("analyst", "admin"), controller.analytics);

module.exports = router;
