const fs = require("fs");
const path = require("path");

// lokasi file input & folder output
const INPUT_FILE = path.join(__dirname, "/users_hashed.json");
const OUTPUT_DIR = path.join(__dirname, "/user_profile");

// pastikan folder output tersedia
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// konversi raw user → profile structured
function transformUser(raw) {
  const name = raw.name || "";
  const email = raw.email || "";
  const courseName = raw.course_name || null;

  return {
    user_id: raw.id,
    platform_data: {
      name,
      email,
      active_courses: courseName ? [courseName] : [],
      active_tutorials: Number(raw.active_tutorials || 0),
      completed_tutorials: Number(raw.completed_tutorials || 0),
      is_graduated: Number(raw.is_graduated || 0),

      exam_score: raw.exam_score || "",
      submission_rating: raw.submission_rating || "",

      course_progress: courseName
        ? {
            [courseName]: 0
          }
        : {}
    },

    learning_profile: {
      goals: [],
      skills: {},        // user belum punya skill detected
      weaknesses: [],
      strengths: [],

      current_focus: courseName
        ? { course: courseName, module: 0 }
        : null,

      learning_style: null,
      progress_score: {},
      history: []
    },

    created_at: new Date().toISOString(),
    updated_at: Date.now(),

    progress_history: [],

    roadmap_progress: {
      job_role: null,
      created_at: Date.now(),
      last_updated: Date.now(),
      skills_status: {},   // <–– DI SINI TAMBAH FIELD BARU
      subskills: []        // <–– DI SINI TAMBAH FIELD BARU
    }
  };
}

// proses utama
function main() {
  console.log("Loading users_hashed.json...");

  const raw = JSON.parse(fs.readFileSync(INPUT_FILE, "utf-8"));

  if (!Array.isArray(raw)) {
    console.error("Input users_hashed.json harus berupa array user.");
    return;
  }

  console.log(`Found ${raw.length} users. Generating profiles...\n`);

  raw.forEach((user) => {
    const profile = transformUser(user);
    const outputPath = path.join(OUTPUT_DIR, `${user.id}.json`);

    fs.writeFileSync(outputPath, JSON.stringify(profile, null, 2), "utf-8");
    console.log(`Generated: ${outputPath}`);
  });

  console.log("\nAll profiles generated successfully.");
}

main();
