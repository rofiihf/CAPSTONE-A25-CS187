require("dotenv").config();

const express = require("express");
const cors = require("cors");
const session = require("express-session");
const path = require("path");

// Controllers & Routes
const quizRoutes = require("./routes/quiz-routes");
const authRoutes = require("./controllers/auth-controller");
const profileRoutes = require("./controllers/profile-controller");
const { handleChat, handleChatJob } = require("./controllers/chat-controller");
const {
  getRoadmapRecommendations,
  updateSkillLevel,
  autoUpdateRoadmap
} = require("./controllers/roadmap-controller");
const courseRoutes = require("./routes/course-routes");
const widgetRoutes = require("./routes/widget-routes");

const app = express();

// =====================================================
// CONSTANTS — PRODUCTION ONLY
// =====================================================
const FRONTEND_ORIGIN = process.env.FRONTEND_URL;
const BACKEND_URL = process.env.BACKEND_URL;

// =====================================================
// CORS — STRICT & PREDICTABLE
// =====================================================
app.use(cors({
  origin: FRONTEND_ORIGIN,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// =====================================================
// BODY PARSER
// =====================================================
app.use(express.json());

// =====================================================
// SESSION — PRODUCTION SAFE
// =====================================================
app.use(session({
  name: "sid",
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  proxy: true, // IMPORTANT for Railway / reverse proxy
  cookie: {
    httpOnly: true,
    secure: true,        // HTTPS only
    sameSite: "none",    // REQUIRED for Netlify → Railway
    maxAge: 1000 * 60 * 60 * 24
  }
}));

// =====================================================
// WIDGET STATIC
// =====================================================
const widgetPath = path.join(__dirname, "..", "src", "widget");

app.get("/widget/widget.js", (req, res) => {
  const fs = require("fs");
  const widgetJsPath = path.join(widgetPath, "widget.js");

  fs.readFile(widgetJsPath, "utf8", (err, data) => {
    if (err) {
      console.error("Widget load error:", err);
      return res.status(500).send("// Widget not found");
    }

    res.type("application/javascript");
    res.send(`
      window.__WIDGET_CONFIG__ = {
        BACKEND_URL: "${BACKEND_URL}",
        WIDGET_URL: "${BACKEND_URL}/widget/iframe.html"
      };
      ${data}
    `);
  });
});

app.use("/widget", express.static(widgetPath));

// =====================================================
// ROUTES
// =====================================================
app.use("/api/widget", widgetRoutes);
app.post("/chat", handleChat);
app.post("/chat/job", handleChatJob);

app.get("/api/roadmap/recommendations", getRoadmapRecommendations);
app.post("/api/roadmap/update-skill", updateSkillLevel);
app.post("/api/roadmap/auto-update", autoUpdateRoadmap);

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/quiz", quizRoutes);
app.use("/api", courseRoutes);

// =====================================================
// HEALTH CHECK
// =====================================================
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    environment: "production",
    frontend: FRONTEND_ORIGIN,
    backend: BACKEND_URL
  });
});

// =====================================================
// SPA FALLBACK
// =====================================================
const publicPath = path.join(__dirname, "..", "src", "public");
app.use(express.static(publicPath));

app.use((req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

// =====================================================
// ERROR HANDLER
// =====================================================
app.use((err, req, res, next) => {
  console.error("SERVER ERROR:", err);
  res.status(500).json({
    ok: false,
    message: "Internal Server Error"
  });
});

// =====================================================
// START SERVER
// =====================================================
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log("🚀 Production server running");
  console.log("Frontend:", FRONTEND_ORIGIN);
  console.log("Backend :", BACKEND_URL);
});
