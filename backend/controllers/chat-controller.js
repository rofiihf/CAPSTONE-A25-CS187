
// Fungsi Handle Bot Chat (KALO UDAH ADA LLM)
async function handleChat(req, res) {
  try {
    const { message } = req.body;

    if(!message || !message.trim()) {
      return res.status(400).json({ error: "Message cannot be empty" });
    }
    
    const botReply = `${message}`;
    return res.json({ reply: botReply });
  } catch (error) {
    console.error("Chat Handler Error: ", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

module.exports = { handleChat };