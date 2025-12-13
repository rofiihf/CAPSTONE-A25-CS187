const { handleChat } = require("./chat-controller");

/**
 * Cek apakah user login (session-based)
 * Returns user info if authenticated
 */
function getWidgetStatus(req, res) {
  // Debug: log session info
  console.log('Widget status check:', {
    hasSession: !!req.session,
    userId: req.session?.userId,
    sessionID: req.sessionID
  });

  if (!req.session?.userId) {
    return res.status(401).json({
      ok: false,
      error: "NOT_AUTHENTICATED",
      message: "Please login to use the chat widget"
    });
  }

  // Return user info if authenticated
  return res.json({
    ok: true,
    userId: req.session.userId,
  });
}

/**
 * Widget chat = chat biasa, tapi dipaksa login
 */
async function handleWidgetChat(req, res) {
  // Check authentication
  if (!req.session?.userId) {
    return res.status(401).json({
      ok: false,
      reply: "Session expired. Please login again.",
      error: "NOT_AUTHENTICATED"
    });
  }

  console.log('Widget chat request from user:', req.session.userId);

  // Reuse existing chat logic
  return handleChat(req, res);
}

module.exports = {
  getWidgetStatus,
  handleWidgetChat
};