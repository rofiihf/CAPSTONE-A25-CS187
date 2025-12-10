/**
 * User Profile Schema
 * 
 * Canonical JSON structure for user profile passed between:
 * - Frontend (src/)
 * - Backend Web (backend/)
 * - Backend ML (backend_ml/)
 * 
 * KEY RULE: Profile is stateless. Model only accepts and returns.
 * Persistence happens in backend web only.
 */

/**
 * Profile Object Shape (TypeScript-like doc for reference)
 * 
 * {
 *   user_id: string (UUID)
 *   platform_data: {
 *     name: string
 *     email: string
 *     active_courses: string[]
 *     active_tutorials: number
 *     completed_tutorials: number
 *     is_graduated: boolean (0 or 1)
 *     exam_score: string (optional)
 *     submission_rating: string (optional)
 *     course_progress: { [course_name]: number } (optional)
 *   }
 *   learning_profile: {
 *     goals: string[]
 *     skills: { [skill_name]: any }
 *     weaknesses: string[]
 *     strengths: string[]
 *     current_focus: {
 *       course: string (optional)
 *       module: number (optional)
 *     }
 *     learning_style: string | null
 *     progress_score: { [course_name]: number }
 *     history: any[]
 *   }
 *   roadmap_progress: {
 *     job_role: string | null
 *     created_at: timestamp
 *     last_updated: timestamp
 *     skills_status: { [skill_name]: any }
 *     subskills: any[]
 *   }
 *   created_at: ISO string
 *   updated_at: ISO string or timestamp
 *   progress_history: Array (optional)
 * }
 */

const ProfileSchema = {
  // Validator function
  validate: (profile) => {
    const errors = [];

    if (!profile.user_id || typeof profile.user_id !== "string") {
      errors.push("user_id is required and must be a string");
    }

    if (!profile.platform_data || typeof profile.platform_data !== "object") {
      errors.push("platform_data is required and must be an object");
    } else {
      const pd = profile.platform_data;
      if (!pd.name || typeof pd.name !== "string") {
        errors.push("platform_data.name is required");
      }
      if (!pd.email || typeof pd.email !== "string") {
        errors.push("platform_data.email is required");
      }
      if (!Array.isArray(pd.active_courses)) {
        errors.push("platform_data.active_courses must be an array");
      }
    }

    if (
      !profile.learning_profile ||
      typeof profile.learning_profile !== "object"
    ) {
      errors.push("learning_profile is required and must be an object");
    } else {
      const lp = profile.learning_profile;
      if (!Array.isArray(lp.goals)) {
        errors.push("learning_profile.goals must be an array");
      }
      if (!Array.isArray(lp.weaknesses)) {
        errors.push("learning_profile.weaknesses must be an array");
      }
      if (!Array.isArray(lp.strengths)) {
        errors.push("learning_profile.strengths must be an array");
      }
      if (lp.current_focus && typeof lp.current_focus !== "object") {
        errors.push("learning_profile.current_focus must be an object");
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },

  // Create minimal profile template
  create: (userId, name, email) => ({
    user_id: userId,
    platform_data: {
      name,
      email,
      active_courses: [],
      active_tutorials: 0,
      completed_tutorials: 0,
      is_graduated: 0,
      exam_score: "",
      submission_rating: "",
      course_progress: {},
    },
    learning_profile: {
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
      history: [],
    },
    roadmap_progress: {
      job_role: null,
      created_at: Date.now(),
      last_updated: Date.now(),
      skills_status: {},
      subskills: [],
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    progress_history: [],
  }),

  // Extract summary for LLM (read-only formatting)
  formatForLLM: (profile) => {
    if (!profile) return "No profile available.";

    const plat = profile.platform_data || {};
    const lp = profile.learning_profile || {};

    const lines = [];

    if (plat.name) lines.push(`Name: ${plat.name}`);
    if (plat.active_courses && plat.active_courses.length) {
      lines.push(`Active courses: ${plat.active_courses.join(", ")}`);
    }

    const cf = lp.current_focus || {};
    if (cf.course) {
      lines.push(
        `Current focus: ${cf.course} (module ${cf.module || 0})`
      );
    }

    if (lp.goals && lp.goals.length) {
      lines.push(`Goals: ${lp.goals.join(", ")}`);
    }

    return lines.join("\n");
  },
};

module.exports = ProfileSchema;
