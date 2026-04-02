const express = require("express");

const controller = require("./records.controller");
const authMiddleware = require("../../middlewares/auth.middleware");

const router = express.Router();

router.use(authMiddleware);

router.get("/search", controller.searchRecords);
router.get("/", controller.listRecords);
router.get("/:id", controller.getRecord);
router.post("/", controller.createRecord);
router.patch("/:id", controller.updateRecord);
router.delete("/:id", controller.deleteRecord);

module.exports = router;
