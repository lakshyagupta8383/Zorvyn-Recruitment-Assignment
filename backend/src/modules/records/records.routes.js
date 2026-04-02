const express = require("express");

const controller = require("./records.controller");
const authMiddleware = require("../../middlewares/auth.middleware");
const requireRole = require("../../middlewares/role.middleware");

const router = express.Router();

router.use(authMiddleware);

router.get("/search", controller.searchRecords);
router.get("/", controller.listRecords);
router.get("/:id", controller.getRecord);
router.post("/", requireRole("admin"), controller.createRecord);
router.patch("/:id", requireRole("admin"), controller.updateRecord);
router.delete("/:id", requireRole("admin"), controller.deleteRecord);

module.exports = router;
