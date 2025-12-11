const fs = require("fs");
const path = require("path");

// ==============================
// LOAD QUIZ JSON (cached)
// ==============================
let QUIZ_DATA = [];

function loadQuizData() {
  if (QUIZ_DATA.length) return QUIZ_DATA;

  try {
    const filePath = path.join(__dirname, "..", "data", "quiz.json");
    const raw = fs.readFileSync(filePath, "utf8");
    QUIZ_DATA = JSON.parse(raw);

    console.log(`Quiz loaded: ${QUIZ_DATA.length} questions`);
  } catch (err) {
    console.error("Failed to load quiz.json:", err);
    QUIZ_DATA = [];
  }

  return QUIZ_DATA;
}

// ==============================
// GET QUIZ TOPICS
// ==============================
function getQuizTopics() {
  const data = loadQuizData();

  // Ambil unique category
  const topics = [...new Set(data.map(q => q.tech_category))];

  return topics;
}

// ==============================
// GET QUESTIONS BY TOPIC
// ==============================
function getQuizQuestions(topic, count = 5) {
  const data = loadQuizData();

  const filtered = data.filter(q => 
    q.tech_category.toLowerCase() === topic.toLowerCase()
  );

  if (!filtered.length) return [];

  // Optional: shuffle (agar soal tidak selalu sama)
  const shuffled = filtered.sort(() => Math.random() - 0.5);

  return shuffled.slice(0, count);
}

// ==============================
// SCORE CALCULATION
// answers = [
//   { question: "Apa itu Activity?", answer: "Komponen ..." },
//   { question: "...", answer: "..." }
// ]
// ==============================
function computeScore(topic, answers) {
  if (!Array.isArray(answers)) return 0;

  const data = loadQuizData();
  const topicQuestions = data.filter(
    q => q.tech_category.toLowerCase() === topic.toLowerCase()
  );

  let score = 0;

  for (const ans of answers) {
    const found = topicQuestions.find(
      q => q.question.trim() === ans.question.trim()
    );

    if (found && found.correct_answer.trim() === ans.answer.trim()) {
      score++;
    }
  }

  return score;
}

module.exports = {
  getQuizTopics,
  getQuizQuestions,
  computeScore
};
