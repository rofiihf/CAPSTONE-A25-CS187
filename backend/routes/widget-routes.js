const express = require("express");
const router = express.Router();
const { getWidgetStatus, handleWidgetChat } = require("../controllers/widget-controller");

router.get("/status", getWidgetStatus);
router.post("/chat", handleWidgetChat);

module.exports = router;
