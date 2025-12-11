const { 
  getQuizTopics, 
  getQuizQuestions,
  computeScore 
} = require("../services/quiz-services");

const { updateProfile, getProfile } = require("../utils/user-profile");

/**
 * GET /api/quiz/topics
 * Mengambil daftar topik quiz
 */
async function getTopics(req, res) {
  try {
    const topics = getQuizTopics();
    return res.json({ ok: true, topics });
  } catch (err) {
    console.error("Error getTopics:", err);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
}

/**
 * GET /api/quiz/questions?topic=Android&count=5
 * Mengambil N soal berdasarkan topic
 */
async function getQuestions(req, res) {
  try {
    const { topic, count } = req.query;

    if (!topic) {
      return res.status(400).json({ ok: false, message: "Topic is required" });
    }

    const questions = getQuizQuestions(topic, Number(count) || 5);

    return res.json({ 
      ok: true, 
      topic, 
      count: questions.length, 
      questions 
    });

  } catch (err) {
    console.error("Error getQuestions:", err);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
}

/**
 * POST /api/quiz/score
 * Body: { topic, answers: [ { id, answer } ] }
 * Menyimpan score dan menentukan level skill
 */
async function submitScore(req, res) {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ ok: false, message: "Unauthorized" });
    }

    const { topic, answers } = req.body;

    if (!topic || !answers) {
      return res.status(400).json({ 
        ok: false, 
        message: "Missing topic or answers" 
      });
    }

    // Hitung score
    const score = computeScore(topic, answers);

    // Tentukan level berdasarkan score
    let level = "Beginner";
    if (score >= 8) level = "Advance";
    else if (score >= 4) level = "Intermediate";

    // Ambil profil user
    const profile = getProfile(userId);

    // Update skills pada profile
    const patch = {
      learning_profile: {
        skills: {
          [topic]: level
        }
      }
    };

    updateProfile(userId, patch);

    return res.json({
      ok: true,
      topic,
      total_questions: answers.length,
      score,
      level
    });

  } catch (err) {
    console.error("Error submitScore:", err);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
}

module.exports = {
  getTopics,
  getQuestions,
  submitScore
};
