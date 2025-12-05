const { text } = require("express");
const fetch = require("node-fetch");
// Fungsi Handle Bot Chat (KALO UDAH ADA LLM)
async function handleChat(req, res) {
  try {
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({
        error: "Please login first."
      })
    }
    
    const { message } = req.body;

    if(!message || !message.trim()) {
      return res.status(400).json({ error: "Message cannot be empty" });
    }
    
    const BOT_URL = process.env.BOT_API_URL;

    const fetchBotResponse = await fetch(BOT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: String(userId),
        text: message
      })
    });

    if (!fetchBotResponse.ok) {
      const text = await fetchBotResponse.text();

      return res.status(502).json({
        error: "ML backend error",
        detail: text
      });
    }

    const data = await fetchBotResponse.json();

    return res.json({
      ok: true,
      ...data
    })
  } catch (error) {
    console.error("Chat Handler Error: ", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

module.exports = { handleChat };