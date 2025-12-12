const { 
  getProfile, 
  updateProfile, 
  ensureProfileExists,
  validateProfilePatch 
} = require("../utils/user-profile");
const { sendToModel } = require("../services/api-services");
const ProfileSchema = require("../schemas/profile-schema");

function stripProfileUpdateTags(text) {
  if (!text) return text;
  return text.replace(/<profile_update>[\s\S]*?<\/profile_update>/g, "").trim();
}

/**
 * applySimpleUpdates - fallback heuristik bila model tidak kirim profile_updates
 */
function applySimpleUpdates(reply, profile) {
  if (!profile || !reply) return profile;
  const text = reply.toLowerCase();

  if (!profile.learning_profile) {
    profile.learning_profile = {
      goals: [],
      weaknesses: [],
      strengths: [],
      current_focus: { course: null, module: 0 }
    };
  }

  if (
    text.includes("lanjut modul") ||
    text.includes("modul berikutnya") ||
    text.match(/modul\s*\d+\s*(selesai|berhasil)/)
  ) {
    profile.learning_profile.current_focus.module += 1;
  }

  if (
    text.includes("tujuan belajar") ||
    text.includes("goal baru") ||
    text.includes("ingin menjadi")
  ) {
    profile.learning_profile.goals.push("Goal baru berdasarkan percakapan");
  }

  if (text.includes("kesulitan") || text.includes("bingung") || text.includes("sulit")) {
    profile.learning_profile.weaknesses.push("Kesulitan baru yang disampaikan user");
  }

  return profile;
}

/**
 * handleChat - Main chat entrypoint
 */
async function handleChat(req, res) {
  try {
    // console.log("BODY:", req.body);
    const sessionUserId = req.session?.userId;
    const userId = String(sessionUserId || req.body.user_id || "").trim();
    
    if (!userId) {
      return res.status(401).json({
        ok: false,
        reply: "Anda belum login"
      });
    }

    const { message, mode } = req.body;
    
    if (!message || !message.trim()) {
      return res.status(400).json({
        ok: false,
        reply: "Pesan tidak boleh kosong"
      });
    }

    // Load or create profile
    let profile = getProfile(userId);
    if (!profile) {
      profile = ensureProfileExists(userId);
    }

    // Validate profile
    const v = ProfileSchema.validate(profile);
    if (!v.valid) {
      console.warn("Profile failed validation, recreating minimal profile:", v.errors);
      profile = ensureProfileExists(userId);
    }

    // ============================================================
    // SEND TO MODEL BACKEND
    // ============================================================
    const modelResp = await sendToModel(userId, message, mode, profile);

    console.log("🟢 MODEL RESPONSE:", JSON.stringify(modelResp, null, 2));
    console.log("=== MODEL RESPONSE DEBUG ===");
    console.log("Full response:", JSON.stringify(modelResp, null, 2));
    console.log("Has meta?", !!modelResp?.meta);
    console.log("meta.type:", modelResp?.meta?.type);
    console.log("meta.roadmap:", modelResp?.meta?.roadmap);
    console.log("============================");
    // Extract response text
    const reply = modelResp?.response || modelResp?.reply || "Bot tidak menanggapi.";
    const cleanReply = stripProfileUpdateTags(reply);

    // ============================================================
    // EXTRACT META (ROADMAP, COURSE RECOMMENDATION, ETC)
    // ============================================================
    const meta = modelResp?.meta || {};
    const sources = modelResp?.sources || [];
    const intent = modelResp?.intent || {};

    // Model profile updates
    const profileUpdates = 
      modelResp?.profile_updates || 
      modelResp?.profileUpdate || 
      modelResp?.profile_update || 
      null;

    let mergedProfile = profile;

    if (profileUpdates && typeof profileUpdates === "object") {
      const validation = validateProfilePatch(profileUpdates, profile);
      
      if (validation.ok) {
        try {
          mergedProfile = updateProfile(userId, validation.patch);
          console.log("✅ Profile updated successfully");
        } catch (err) {
          console.error("❌ Failed updating profile:", err.message);
        }
      } else {
        console.warn("⚠️ Rejected profile update from model:", validation.errors);
      }
    }

    // ============================================================
    // RETURN COMPLETE RESPONSE WITH META
    // ============================================================
    return res.json({
      ok: true,
      reply: cleanReply,
      meta: meta,              // ← CRITICAL: Include meta field
      sources: sources,        // ← Include sources
      intent: intent,          // ← Include intent
      profile_updated: !!profileUpdates,
      profile: mergedProfile
    });

  } catch (err) {
    console.error("❌ Chat Handler Error:", err);
    return res.status(500).json({
      ok: false,
      reply: "Terjadi kesalahan pada server"
    });
  }
}

async function handleChatJob(req, res) {
  req.body = req.body || {};
  req.body.mode = "job_role";
  return handleChat(req, res);
}

module.exports = { handleChat, handleChatJob };
