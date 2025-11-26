const { COURSE_LEVEL_MAP, LEARNING_PATH_MAP } = require("../config/mapping.js");

// Mapping level course
function convertLevel(num) {
  return COURSE_LEVEL_MAP[num] || "Unknown";
}

// MApping learning path
function mapLearningPath(num) {
  return LEARNING_PATH_MAP[num] || "Unknown";
}

module.exports = { convertLevel, mapLearningPath };