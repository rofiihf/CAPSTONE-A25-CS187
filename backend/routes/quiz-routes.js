const express = require("express");
const { 
  getTopics,
  getQuestions,
  submitScore 
} = require("../controllers/quiz-controller");

const router = express.Router();

// GET daftar topik
router.get("/topics", getTopics);

// GET pertanyaan berdasarkan topik
router.get("/questions", getQuestions);

// POST submit score
router.post("/score", submitScore);

module.exports = router;
