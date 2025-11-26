const express = require("express");
const { handleData } = require("../controllers/data-controller");

const router = express.Router();

router.get("/data", handleData);

module.exports = router;