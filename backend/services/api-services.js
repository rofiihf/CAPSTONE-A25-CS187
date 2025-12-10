const axios = require("axios");
require("dotenv").config();

const MODEL_URL = process.env.BOT_API_URL;
const TIMEOUT_MS = Number(process.env.MODEL_REQUEST_TIMEOUT_MS || 15000);

async function sendToModel(userId, message, mode, profile) {
  const payload = {
    user_id: String(userId),
    text: String(message)
  };

  if (mode) payload.mode = mode;
  if (profile && typeof profile === "object") payload.profile = profile;

  try {
    const url = `${MODEL_URL}/chat`; // FIXED HERE
    const resp = await axios.post(url, payload, {
      timeout: TIMEOUT_MS,
      headers: { "Content-Type": "application/json" }
    });

    return resp.data || {};
  } catch (err) {
    console.error("Error contacting backend model:", err.response?.data || err.stack || err.message);
    return {
      response: "Maaf, model sedang tidak tersedia saat ini.",
      profile_updates: null
    };
  }
}

module.exports = { sendToModel };
