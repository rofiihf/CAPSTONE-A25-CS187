const { convertLevel } = require("../utils/mapping-utils");
const { fetchFromDicoding } = require("./api-services");

async function getRawData() {
  const [learningPaths, courses] = await Promise.all([
    fetchFromDicoding("/learning_paths"),
    fetchFromDicoding("/courses")
  ]);

  return { learningPaths, courses };
}

function normalizeLearningData({ learningPaths, courses }) {
  const normalized = learningPaths.map(lp => ({
    id: lp.learning_path_id,
    name: lp.learning_path_name,

    courses: courses
      .filter(course => course.learning_path_id === lp.learning_path_id)
      .map(course => ({
      id: course.course_id,
      title: course.course_name,
      level: convertLevel(course.course_level_str) || "Unknown",
      description: "No description added",
    }))
  }));

  return normalized;
}

async function getAggregatedData() {
  const raw = await getRawData();
  return normalizeLearningData(raw);
}

module.exports = { getAggregatedData };