const express = require("express");

const controller = require("./records.controller");
const authMiddleware = require("../../middlewares/auth.middleware");
const requireRole = require("../../middlewares/role.middleware");

const router = express.Router();

router.use(authMiddleware);

router.get("/search", requireRole("analyst", "admin"), controller.searchRecords);
router.get("/", requireRole("analyst", "admin"), controller.listRecords);
router.get("/:id", requireRole("analyst", "admin"), controller.getRecord);
router.post("/", requireRole("admin"), controller.createRecord);
router.patch("/:id", requireRole("admin"), controller.updateRecord);
router.delete("/:id", requireRole("admin"), controller.deleteRecord);

module.exports = router;
