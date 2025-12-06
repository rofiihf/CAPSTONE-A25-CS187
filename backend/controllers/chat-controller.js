const { text } = require("express");
const fetch = require("node-fetch");
// Fungsi Handle Bot Chat (KALO UDAH ADA LLM)
async function handleChat(req, res) {
  try {
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({
        ok: false,
        reply: "Anda belum login",
      })
    }
    
    const { message } = req.body;

    if(!message || !message.trim()) {
      return res.status(400).json({ 
        ok: false,
        reply: "Pesan tidak boleh kosong",
      });
    }
    
    const BOT_URL = process.env.BOT_API_URL;
    
    if (!BOT_URL) {
      return res.status(400).json({
        ok: false,
        reply: "Model tidak dapat dijangkau."
      })
    }

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
        ok: false,
        reply: "ML backend error",
        detail: text
      });
    }

    const data = await fetchBotResponse.json();

    return res.json({
      ok: true,
      reply: data.response || "Bot tidak menanggapi.",
      intent: data.intent || null,
      sources: data.sources || [],
      meta: data.meta || null, 
    });

  } catch (error) {
    console.error("Chat Handler Error: ", error);
    console.log(error);
    return res.status(500).json({ 
      ok: false,
      reply: "Terjadi kesalahan pada server",
    });
  }
}

module.exports = { handleChat };