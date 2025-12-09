// backend/utils/user-profile.js
const fs = require("fs");
const path = require("path");

// ---------------------------------------------------
// PATH DEFINITIONS
// ---------------------------------------------------
const ROOT = path.join(__dirname, "..");
const USERS_FILE = path.join(ROOT, "data", "users_hashed.json");
const PROFILES_FILE = path.join(ROOT, "data", "user_profiles.json");
const BACKEND_ML_USER_DIR = path.join(
  __dirname,
  "..",
  "..",
  "backend_ml",
  "app",
  "user_profiles"
);

// ---------------------------------------------------
// UTIL HELPERS
// ---------------------------------------------------
function ensureDirs() {
  try {
    const dirs = [path.dirname(PROFILES_FILE), BACKEND_ML_USER_DIR];
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
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
// IMPROVED DEEP MERGE (handles arrays and nulls properly)
// ---------------------------------------------------
function deepMerge(target, source) {
  if (!source || typeof source !== "object") {
    return target;
  }

  for (const key of Object.keys(source)) {
    const srcVal = source[key];
    const tgtVal = target[key];

    // Handle null explicitly
    if (srcVal === null) {
      target[key] = null;
      continue;
    }

    // Handle arrays - replace instead of merge
    if (Array.isArray(srcVal)) {
      target[key] = [...srcVal];
      continue;
    }

    // Recursively merge nested objects
    if (typeof srcVal === "object") {
      if (!tgtVal || typeof tgtVal !== "object" || Array.isArray(tgtVal)) {
        target[key] = {};
      }
      target[key] = deepMerge(target[key], srcVal);
    } else {
      // Primitives overwrite directly
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
    skills: {},              // { skillName: level }
    weaknesses: [],
    strengths: [],
    current_focus: {
      course: null,
      module: 0,
    },
    learning_style: null,    // e.g., "visual", "kinesthetic", etc.
    progress_score: {},      // per course progress percentage
    history: []              // log of timestamps <-> actions
  };
}

// ---------------------------------------------------
// LOADING HELPERS
// ---------------------------------------------------
function getAllUsersFromPlatform() {
  const data = loadJson(USERS_FILE);
  if (!data) return [];
  
  // Handle both array and object formats
  if (Array.isArray(data)) {
    return data;
  }
  
  // If it's an object, convert to array
  if (typeof data === "object") {
    return Object.values(data);
  }
  
  return [];
}

function loadProfilesMaster() {
  return loadJson(PROFILES_FILE) || {};
}

function saveProfilesMaster(profiles) {
  const success = saveJson(PROFILES_FILE, profiles);
  if (!success) {
    throw new Error("Failed to save profiles master file");
  }
}

// ---------------------------------------------------
// MAIN PROFILE CREATION LOGIC
// ---------------------------------------------------
function createProfileFromPlatform(userObj) {
  if (!userObj || typeof userObj !== "object") {
    throw new Error("Invalid user object provided");
  }

  const courseName = userObj.course_name || "";  
  const activeCourses = courseName ? [courseName] : [];

  // Prepare learning profile
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
// WRITE TO ML BACKEND
// ---------------------------------------------------
function writeProfileToMl(profile) {
  try {
    ensureDirs();
    if (!profile || !profile.user_id) {
      console.error("Invalid profile: missing user_id");
      return false;
    }
    
    const userFile = path.join(BACKEND_ML_USER_DIR, `${profile.user_id}.json`);
    return saveJson(userFile, profile);
  } catch (err) {
    console.error("Error writing profile to ML backend:", err.message);
    return false;
  }
}

// ---------------------------------------------------
// GET PROFILE
// ---------------------------------------------------
function getProfile(userId) {
  try {
    if (!userId) {
      throw new Error("User ID is required");
    }
    
    ensureDirs();
    const profiles = loadProfilesMaster();
    return profiles[userId] || null;
  } catch (err) {
    console.error(`Error getting profile for ${userId}:`, err.message);
    return null;
  }
}

// ---------------------------------------------------
// UPDATE PROFILE WITH PATCH
// ---------------------------------------------------
function updateProfile(userId, patch) {
  try {
    if (!userId) {
      throw new Error("User ID is required");
    }
    
    if (!patch || typeof patch !== "object") {
      throw new Error("Invalid patch object");
    }
    
    ensureDirs();
    const profiles = loadProfilesMaster();

    const existing = profiles[userId] || {
      user_id: userId,
      platform_data: {},
      learning_profile: defaultLearningProfile(),
      created_at: new Date().toISOString(),
    };

    // Create deep copies to avoid mutation
    const existingPlatformData = JSON.parse(JSON.stringify(existing.platform_data || {}));
    const existingLearningProfile = JSON.parse(JSON.stringify(existing.learning_profile || defaultLearningProfile()));
    
    const merged = {
      ...existing,
      platform_data: deepMerge(existingPlatformData, patch.platform_data || {}),
      learning_profile: deepMerge(existingLearningProfile, patch.learning_profile || {}),
      updated_at: new Date().toISOString(),
    };

    // Allow top-level overwrites if needed
    Object.keys(patch).forEach(k => {
      if (k !== "platform_data" && k !== "learning_profile" && k !== "created_at") {
        merged[k] = patch[k];
      }
    });

    profiles[userId] = merged;
    saveProfilesMaster(profiles);
    writeProfileToMl(merged);

    return merged;
  } catch (err) {
    console.error(`Error updating profile for ${userId}:`, err.message);
    throw err;
  }
}

// ---------------------------------------------------
// ENSURE PROFILE EXISTS
// ---------------------------------------------------
function ensureProfileExists(userId) {
  try {
    if (!userId) {
      throw new Error("User ID is required");
    }
    
    ensureDirs();
    const profiles = loadProfilesMaster();

    // If profile already exists, sync to ML and return
    if (profiles[userId]) {
      writeProfileToMl(profiles[userId]);
      return profiles[userId];
    }

    // Try to find user in platform data
    const allUsers = getAllUsersFromPlatform();
    const userObj = allUsers.find(u => 
      u.id === userId || u.email === userId
    );

    // Create profile from platform data or with minimal info
    const profile = userObj 
      ? createProfileFromPlatform(userObj)
      : createProfileFromPlatform({ id: userId, email: "" });
    
    profiles[userId] = profile;

    saveProfilesMaster(profiles);
    writeProfileToMl(profile);

    return profile;
  } catch (err) {
    console.error(`Error ensuring profile exists for ${userId}:`, err.message);
    throw err;
  }
}

// ---------------------------------------------------
// ONE-TIME SYSTEM BOOTSTRAP
// ---------------------------------------------------
function bootstrapAllProfiles() {
  try {
    ensureDirs();
    const allUsers = getAllUsersFromPlatform();
    const profiles = loadProfilesMaster();

    if (!allUsers || allUsers.length === 0) {
      console.log("No users found to bootstrap");
      return { success: true, count: 0 };
    }

    let createdCount = 0;
    
    allUsers.forEach(user => {
      if (!user || !user.id) {
        console.warn("Skipping invalid user object:", user);
        return;
      }
      
      if (!profiles[user.id]) {
        try {
          const profile = createProfileFromPlatform(user);
          profiles[user.id] = profile;
          writeProfileToMl(profile);
          createdCount++;
        } catch (err) {
          console.error(`Error creating profile for user ${user.id}:`, err.message);
        }
      }
    });

    saveProfilesMaster(profiles);
    
    console.log(`Bootstrap completed: ${createdCount} profiles created`);
    return { success: true, count: createdCount };
  } catch (err) {
    console.error("Error during bootstrap:", err.message);
    throw err;
  }
}

// ---------------------------------------------------
// EXPORTS
// ---------------------------------------------------
module.exports = {
  ensureDirs,
  getProfile,
  updateProfile,
  ensureProfileExists,
  bootstrapAllProfiles
};