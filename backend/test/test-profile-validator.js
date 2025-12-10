// ----------------------------------------------
// TEST: validateProfilePatch()
// ----------------------------------------------
const path = require("path");

// PATH perlu disesuaikan sesuai struktur Anda
const { validateProfilePatch } = require("../utils/user-profile");

// Contoh existing profile minimal (untuk referensi tipe)
const existingProfile = {
  user_id: "user123",
  platform_data: {
    name: "Budi",
    email: "budi@example.com",
    active_courses: ["Course A"],
    course_progress: { "Course A": 40 }
  },
  learning_profile: {
    goals: ["Menjadi Backend Developer"],
    skills: { Python: "Beginner" },
    weaknesses: ["algorithm"],
    strengths: [],
    current_focus: { course: "Course A", module: 1 }
  }
};

// ----------------------------------------------
// TEST CASES
// ----------------------------------------------

const tests = [
  {
    name: "VALID: Update module number",
    patch: {
      learning_profile: { current_focus: { module: 3 } }
    }
  },

  {
    name: "VALID: Update skills",
    patch: {
      learning_profile: { skills: { Python: "Intermediate", JavaScript: "Beginner" } }
    }
  },

  {
    name: "VALID: Update course_progress",
    patch: {
      platform_data: { course_progress: { "Course A": 85, "Course B": 40 } }
    }
  },

  {
    name: "INVALID: goals should be array but got string",
    patch: {
      learning_profile: { goals: "frontend dulu ya" }
    }
  },

  {
    name: "INVALID: malicious top-level field",
    patch: {
      __proto__: { hacked: true }
    }
  },

  {
    name: "INVALID: skill level not allowed",
    patch: {
      learning_profile: { skills: { Python: "God Mode" } }
    }
  },

  {
    name: "INVALID: course_progress wrong type",
    patch: {
      platform_data: { course_progress: "ninety percent" }
    }
  }
];

// ----------------------------------------------
// RUN TESTS
// ----------------------------------------------
console.log("=== Running validateProfilePatch() Tests ===\n");

tests.forEach((t, i) => {
  console.log(`TEST ${i + 1}: ${t.name}`);
  const result = validateProfilePatch(t.patch, existingProfile);

  console.log("ok:", result.ok);
  if (!result.ok) console.log("errors:", result.errors);
  console.log("sanitized patch:", result.patch);
  console.log("--------------------------------------------\n");
});
