const express = require("express");

const controller = require("./categories.controller");
const authMiddleware = require("../../middlewares/auth.middleware");
const requireRole = require("../../middlewares/role.middleware");

const router = express.Router();

router.use(authMiddleware, requireRole("admin"));

router.get("/", controller.listCategories);
router.get("/:id", controller.getCategory);
router.post("/", controller.createCategory);
router.patch("/:id", controller.updateCategory);
router.delete("/:id", controller.deleteCategory);

module.exports = router;
