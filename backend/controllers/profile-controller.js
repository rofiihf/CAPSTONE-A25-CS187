// backend/controllers/profile-controller.js
const express = require("express");
const router = express.Router();
const { getProfile, updateProfile, ensureProfileExists } = require("../utils/user-profile");

const fs = require("fs");
const path = require("path");

router.get("/", (req, res) => {
  const userId = req.session?.userId;
  if (!userId) return res.status(401).json({ ok: false, message: "Not logged in" });
  const profile = getProfile(userId) || ensureProfileExists(userId);
  return res.json({ ok: true, profile });
});

router.post("/update", express.json(), (req, res) => {
  const userId = req.session?.userId;
  if (!userId) return res.status(401).json({ ok: false, message: "Not logged in" });
  const patch = req.body || {};
  const profile = updateProfile(userId, patch);
  return res.json({ ok: true, profile });
});

exports.applyProfilePatch = async (req, res) => {
    const { user_id, patch } = req.body;

    const profile = await userServices.getUserProfile(user_id);

    profile.learning_profile = {
        ...profile.learning_profile,
        ...patch
    };

    await userServices.saveUserProfile(user_id, profile);

    return res.json({ message: "updated", learning_profile: profile.learning_profile });
};

module.exports = router;
