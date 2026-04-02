const express = require("express");

const controller = require("./users.controller");
const authMiddleware = require("../../middlewares/auth.middleware");
const requireRole = require("../../middlewares/role.middleware");

const router = express.Router();

router.use(authMiddleware, requireRole("admin"));

router.get("/", controller.listUsers);
router.get("/:id", controller.getUser);
router.post("/", controller.createUser);
router.patch("/:id", controller.updateUser);
router.patch("/:id/status", controller.updateStatus);
router.delete("/:id", controller.deleteUser);

module.exports = router;
