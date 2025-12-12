const express = require("express");
const router = express.Router();
const courses = require("../data/course.json");

router.get("/courses-map", (req, res) => {
  const map = {};

  courses.forEach(c => {
    const courseId = String(c.course_id); // ← PENTING: Pastikan string
    
    map[courseId] = {
      id: courseId,
      name: c.course_name,
      title: c.course_name, // Duplicate untuk fallback
      level: convertLevel(c.course_level_str),
      hours: c.hours_to_study,
      learning_path_id: c.learning_path_id
    };
  });

  console.log(`✅ Course map generated: ${Object.keys(map).length} courses`);
  
  res.json({ ok: true, courses: map });
});

function convertLevel(n) {
  if (n <= 1) return "Beginner";
  if (n === 2) return "Intermediate";
  if (n === 3) return "Intermediate+";
  if (n === 4) return "Advanced";
  if (n >= 5) return "Expert";
  return "Unknown";
}

module.exports = router;
