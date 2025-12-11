// backend/utils/user-profile.js
const fs = require("fs");
const path = require("path");

// ---------------------------------------------------
// PATH DEFINITIONS
// ---------------------------------------------------
const ROOT = path.join(__dirname, "..");
const USERS_FILE = path.join(ROOT, "data", "users_hashed.json");
const PROFILES_FILE = path.join(ROOT, "data", "user_profiles.json");
const USER_PROFILE_DIR = path.join(ROOT, "data", "user_profile");

// ---------------------------------------------------
// UTIL HELPERS
// ---------------------------------------------------
function ensureDirs() {
  try {
    if (!fs.existsSync(USER_PROFILE_DIR)) {
    fs.mkdirSync(USER_PROFILE_DIR, { recursive: true });
  }
  } catch (err) {
    console.error("Error creating directories:", err);
    throw err;
  }
}

function loadJson(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, "utf8");
    if (!raw || raw.trim() === "") return null;
    return JSON.parse(raw);
  } catch (err) {
    console.error(`JSON parse error for ${filePath}:`, err.message);
    return null;
  }
}

function saveJson(filePath, obj) {
  try {
    const data = JSON.stringify(obj, null, 2);
    fs.writeFileSync(filePath, data, "utf8");
    return true;
  } catch (err) {
    console.error(`Error saving JSON to ${filePath}:`, err.message);
    return false;
  }
}

// ---------------------------------------------------
// DEEP MERGE for profile data
// ---------------------------------------------------
function deepMerge(target, source) {
  if (!source || typeof source !== "object") return target;

  for (const key of Object.keys(source)) {
    const srcVal = source[key];

    if (srcVal === null) {
      target[key] = null;
      continue;
    }

    if (Array.isArray(srcVal)) {
      target[key] = [...srcVal];
      continue;
    }

    if (typeof srcVal === "object") {
      if (!target[key] || typeof target[key] !== "object" || Array.isArray(target[key])) {
        target[key] = {};
      }
      target[key] = deepMerge(target[key], srcVal);
    } else {
      target[key] = srcVal;
    }
  }
  return target;
}

// ---------------------------------------------------
// DEFAULT STRUCTURE
// ---------------------------------------------------
function defaultLearningProfile() {
  return {
    goals: [],
    skills: {},
    weaknesses: [],
    strengths: [],
    current_focus: {
      course: null,
      module: 0,
    },
    learning_style: null,
    progress_score: {},
    history: []
  };
}

// ---------------------------------------------------
// PLATFORM LOADERS
// ---------------------------------------------------
function getAllUsersFromPlatform() {
  const data = loadJson(USERS_FILE);
  if (!data) return [];

  if (Array.isArray(data)) return data;
  if (typeof data === "object") return Object.values(data);

  return [];
}

// ---------------------------------------------------
// MASTER PROFILE STORE
// ---------------------------------------------------
function loadProfilesMaster() {
  return loadJson(PROFILES_FILE) || {};
}

function saveProfilesMaster(profiles) {
  const ok = saveJson(PROFILES_FILE, profiles);
  if (!ok) throw new Error("Failed to save profiles master file");
}

function saveUserProfile(userId, profile) {
  ensureDirs();
  const file = path.join(USER_PROFILE_DIR, `${userId}.json`);
  return saveJson(file, profile);
}


// ---------------------------------------------------
// PROFILE CREATION
// ---------------------------------------------------
function createProfileFromPlatform(userObj) {
  const courseName = userObj.course_name || "";
  const activeCourses = courseName ? [courseName] : [];

  const lp = defaultLearningProfile();
  lp.current_focus.course = activeCourses[0] || null;

  return {
    user_id: userObj.id || userObj.email || `user_${Date.now()}`,
    platform_data: {
      name: userObj.name || "",
      email: userObj.email || "",
      active_courses: activeCourses,
      active_tutorials: Number(userObj.active_tutorials || 0),
      completed_tutorials: Number(userObj.completed_tutorials || 0),
      is_graduated: Number(userObj.is_graduated || 0),
      exam_score: userObj.exam_score || "",
      submission_rating: userObj.submission_rating || ""
    },
    learning_profile: lp,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

// ---------------------------------------------------
// GET PROFILE
// ---------------------------------------------------
function getProfile(userId) {
  try {
    ensureDirs();
    const file = path.join(USER_PROFILE_DIR, `${userId}.json`);
    const profile = loadJson(file);
    return profile || null;
  } catch (err) {
    console.error(`Error getting profile for ${userId}:`, err.message);
    return null;
  }
}

// ---------------------------------------------------
// UPDATE PROFILE (NO ML WRITE ANYMORE)
// ---------------------------------------------------
function updateProfile(userId, patch) {
  try {
    ensureDirs();

    const existing = getProfile(userId) || ensureProfileExists(userId);

    // ======================================================
    // IF JOB ROLE CHANGED → RESET ROADMAP (REPLACE, NOT MERGE)
    // ======================================================
    if (
      patch.roadmap_progress &&
      typeof patch.roadmap_progress === "object" &&
      patch.roadmap_progress.job_role &&
      existing.roadmap_progress &&
      existing.roadmap_progress.job_role !== patch.roadmap_progress.job_role
    ) {
      console.log("[RESET] Roadmap progress replaced due to job role switch");

      const updated = {
        ...existing,
        platform_data: deepMerge(
          JSON.parse(JSON.stringify(existing.platform_data)),
          patch.platform_data || {}
        ),
        learning_profile: deepMerge(
          JSON.parse(JSON.stringify(existing.learning_profile)),
          patch.learning_profile || {}
        ),
        roadmap_progress: {
          ...patch.roadmap_progress  // REPLACE TOTAL
        },
        updated_at: new Date().toISOString(),
      };

      saveUserProfile(userId, updated);
      return updated;
    }

    // ======================================================
    // DEFAULT PATH (MERGE NORMAL)
    // ======================================================
    const updated = {
      ...existing,
      platform_data: deepMerge(
        JSON.parse(JSON.stringify(existing.platform_data)),
        patch.platform_data || {}
      ),
      learning_profile: deepMerge(
        JSON.parse(JSON.stringify(existing.learning_profile)),
        patch.learning_profile || {}
      ),
      roadmap_progress: deepMerge(
        JSON.parse(JSON.stringify(existing.roadmap_progress || {
          job_role: null,
          subskills: [],
          skills_status: {},
          created_at: Date.now(),
          last_updated: Date.now()
        })),
        patch.roadmap_progress || {}
      ),
      updated_at: new Date().toISOString(),
    };

    saveUserProfile(userId, updated);
    return updated;

  } catch (err) {
    console.error("Error updating profile:", err.message);
    throw err;
  }
}



// ---------------------------------------------------
// ENSURE PROFILE EXISTS
// ---------------------------------------------------
function ensureProfileExists(userId) {
  ensureDirs();
  const existing = getProfile(userId);
  if (existing) return existing;

  // Load from platform
  const allUsers = getAllUsersFromPlatform();
  const userObj = allUsers.find(u => u.id === userId || u.email === userId);

  const newProfile = userObj
    ? createProfileFromPlatform(userObj)
    : createProfileFromPlatform({ id: userId });

  saveUserProfile(userId, newProfile);

  return newProfile;
}

// -----------------------------
// VALIDATOR & SANITIZER
// -----------------------------
/**
 * validateProfilePatch
 * - Menolak perubahan pada field yg tidak diizinkan
 * - Memastikan tipe data dasar
 * - Sanitasi sederhana untuk learning_profile.current_focus.module dan skill levels
 *
 * Returns: { ok: boolean, patch: sanitizedPatch, errors: [] }
 */
function validateProfilePatch(patch, existing) {
  const errors = [];
  if (!patch || typeof patch !== "object") {
    errors.push("Patch harus berupa object");
    return { ok: false, patch: null, errors };
  }

  const allowedTopKeys = new Set(["platform_data", "learning_profile", "updated_at", "meta", "roadmap_progress"]);
  const sanitized = {};

  // Top-level keys filter
  Object.keys(patch).forEach(k => {
    if (!allowedTopKeys.has(k)) {
      errors.push(`Top-level key tidak diizinkan: ${k}`);
    }
  });

  // platform_data validation
  if (patch.platform_data && typeof patch.platform_data === "object") {
    sanitized.platform_data = {};
    const pd = patch.platform_data;

    if (pd.name != null) sanitized.platform_data.name = String(pd.name);
    if (pd.email != null) sanitized.platform_data.email = String(pd.email);

    if (pd.active_courses != null) {
      if (!Array.isArray(pd.active_courses)) {
        errors.push("platform_data.active_courses harus array");
      } else {
        sanitized.platform_data.active_courses = pd.active_courses.map(c => String(c));
      }
    }

    if (pd.active_tutorials != null) sanitized.platform_data.active_tutorials = Number(pd.active_tutorials) || 0;
    if (pd.completed_tutorials != null) sanitized.platform_data.completed_tutorials = Number(pd.completed_tutorials) || 0;
    if (pd.is_graduated != null) sanitized.platform_data.is_graduated = Number(pd.is_graduated) ? 1 : 0;

    // Allow course_progress as object of course->percent
    if (pd.course_progress != null) {
      if (typeof pd.course_progress !== "object" || Array.isArray(pd.course_progress)) {
        errors.push("platform_data.course_progress harus object mapping");
      } else {
        sanitized.platform_data.course_progress = {};
        Object.entries(pd.course_progress).forEach(([course, val]) => {
          const pct = Number(val);
          sanitized.platform_data.course_progress[String(course)] = Math.max(0, Math.min(100, isNaN(pct) ? 0 : Math.round(pct)));
        });
      }
    }
  } else if (patch.platform_data != null) {
    errors.push("platform_data harus object");
  }

  // learning_profile validation
  if (patch.learning_profile && typeof patch.learning_profile === "object") {
    sanitized.learning_profile = {};
    const lp = patch.learning_profile;

    if (lp.goals != null) {
      if (!Array.isArray(lp.goals)) {
        errors.push("learning_profile.goals harus array");
      } else {
        sanitized.learning_profile.goals = lp.goals.map(g => String(g));
      }
    }

    if (lp.weaknesses != null) {
      if (!Array.isArray(lp.weaknesses)) {
        errors.push("learning_profile.weaknesses harus array");
      } else {
        sanitized.learning_profile.weaknesses = lp.weaknesses.map(w => String(w));
      }
    }

    if (lp.skills != null) {
      if (typeof lp.skills !== "object" || Array.isArray(lp.skills)) {
        errors.push("learning_profile.skills harus object mapping");
      } else {
        sanitized.learning_profile.skills = {};
        const allowedLevels = new Set(["Beginner", "Intermediate", "Advanced", "beginner", "intermediate", "advanced"]);
        Object.entries(lp.skills).forEach(([k, v]) => {
          const level = (v || "").toString();
          if (allowedLevels.has(level)) {
            // Normalize capitalization
            sanitized.learning_profile.skills[String(k)] = level.charAt(0).toUpperCase() + level.slice(1).toLowerCase();
          } else {
            errors.push(`Level skill tidak valid untuk '${k}': ${v}`);
          }
        });
      }
    }

    if (lp.current_focus && typeof lp.current_focus === "object") {
      sanitized.learning_profile.current_focus = {};
      if (lp.current_focus.course != null) sanitized.learning_profile.current_focus.course = String(lp.current_focus.course);
      if (lp.current_focus.module != null) {
        const mod = Number(lp.current_focus.module);
        if (!Number.isFinite(mod) || mod < 0) {
          errors.push("learning_profile.current_focus.module harus angka >= 0");
        } else {
          sanitized.learning_profile.current_focus.module = Math.floor(mod);
        }
      }
    } else if (lp.current_focus != null) {
      errors.push("learning_profile.current_focus harus object");
    }

    // allow appending history entries returned by the model
    if (lp.history != null) {
      if (!Array.isArray(lp.history)) {
        errors.push("learning_profile.history harus array");
      } else {
        // sanitize history entries (ensure objects with minimal keys)
        const existingHistory = (existing && existing.learning_profile && Array.isArray(existing.learning_profile.history)) ? existing.learning_profile.history : [];
        const newEntries = lp.history.map(h => {
          if (!h || typeof h !== 'object') return null;
          return {
            query: h.query != null ? String(h.query) : "",
            response: h.response != null ? String(h.response) : "",
            timestamp: h.timestamp != null ? String(h.timestamp) : new Date().toISOString(),
            intent: h.intent != null ? h.intent : null
          };
        }).filter(Boolean);

        sanitized.learning_profile.history = [...existingHistory, ...newEntries];
      }
    }
  } else if (patch.learning_profile != null) {
    errors.push("learning_profile harus object");
  }

  // roadmap_progress top-level update (allow basic structure)
  if (patch.roadmap_progress && typeof patch.roadmap_progress === "object") {
    sanitized.roadmap_progress = {};
    const rp = patch.roadmap_progress;
    if (rp.job_role != null) sanitized.roadmap_progress.job_role = String(rp.job_role);
    if (rp.last_updated != null) sanitized.roadmap_progress.last_updated = Number(rp.last_updated) || Date.now();
    if (rp.created_at != null) sanitized.roadmap_progress.created_at = Number(rp.created_at) || Date.now();
    if (rp.subskills != null) {
      if (!Array.isArray(rp.subskills)) {
        errors.push("roadmap_progress.subskills harus array");
      } else {
        sanitized.roadmap_progress.subskills = rp.subskills.map(s => s);
      }
    }
    if (rp.skills_status != null && typeof rp.skills_status === 'object') {
      sanitized.roadmap_progress.skills_status = rp.skills_status;
    }
  }

  // If no errors, ok
  const ok = errors.length === 0;
  return { ok, patch: ok ? sanitized : null, errors };
}

// ---------------------------------------------------
// EXPORTS
// ---------------------------------------------------
module.exports = {
  getProfile,
  updateProfile,
  ensureProfileExists,
  validateProfilePatch
};
