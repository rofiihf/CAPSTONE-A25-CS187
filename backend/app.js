require("dotenv").config();

const express = require("express");
const cors = require("cors");
const session = require("express-session");
const path = require("path");

// Controllers
const quizRoutes = require("./routes/quiz-routes");
const authRoutes = require("./controllers/auth-controller.js");
const profileRoutes = require("./controllers/profile-controller.js");
const { handleChat, handleChatJob } = require("./controllers/chat-controller.js");
const { 
  getRoadmapRecommendations, 
  updateSkillLevel, 
  autoUpdateRoadmap 
} = require("./controllers/roadmap-controller.js");
const courseRoutes = require("./routes/course-routes");
const widgetRoutes = require("./routes/widget-routes");

const app = express();

// =========================
//    ENVIRONMENT CONFIG
// =========================
const isDev = process.env.NODE_ENV !== "production";
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5000";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5500";

// =========================
//          CORS
// =========================
const allowedOrigins = isDev 
  ? [
      "http://localhost:5500",
      "http://127.0.0.1:5500",
      "http://localhost:3000",
      "http://localhost:5000",
    ]
  : [
      process.env.FRONTEND_URL,
      process.env.BACKEND_URL
    ].filter(Boolean);

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// =========================
//    SERVE WIDGET STATIC
// =========================
// Backend folder structure: backend/app.js
// Widget folder: src/widget (at root level, same as backend/)
const widgetPath = path.join(__dirname, "..", "src", "widget");
console.log("Serving widget from:", widgetPath);

// Inject environment variables into widget.js dynamically
app.get("/widget/widget.js", (req, res) => {
  const fs = require("fs");
  const widgetJsPath = path.join(widgetPath, "widget.js");
  
  fs.readFile(widgetJsPath, "utf8", (err, data) => {
    if (err) {
      console.error("Error reading widget.js:", err);
      console.error("Attempted path:", widgetJsPath);
      return res.status(500).send(`// Widget not found at: ${widgetJsPath}`);
    }
    
    // Inject config at the top of the script
    const injectedScript = `// Auto-injected configuration
window.__WIDGET_CONFIG__ = {
  BACKEND_URL: "${BACKEND_URL}",
  WIDGET_URL: "${BACKEND_URL}/widget/iframe.html"
};

${data}`;
    
    res.type("application/javascript");
    res.send(injectedScript);
  });
});

// Serve other widget files statically (CSS, iframe.html, etc)
app.use("/widget", express.static(widgetPath));

// =========================
//       JSON PARSER
// =========================
app.use(express.json());

// =========================
//      SESSION CONFIG
// =========================
app.use(session({
  name: "sid",
  secret: process.env.SESSION_SECRET || "super-secret-local-session",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,     
    secure: false,  // true in production (HTTPS)
    sameSite: "lax", // "none" for cross-origin in production
    maxAge: 1000 * 60 * 60 * 24, // 24 jam
    // IMPORTANT: Set path to root so cookie accessible by all routes
    path: '/'
  }
}));

// =========================
//          ROUTES
// =========================
// Serve SPA static files from public/ folder
const publicPath = path.join(__dirname, "..", "src", "public");
app.use(express.static(publicPath));

app.use("/api/widget", widgetRoutes);
app.post("/chat", handleChat);
app.post("/chat/job", handleChatJob);

// Roadmap features
app.get("/api/roadmap/recommendations", getRoadmapRecommendations);
app.post("/api/roadmap/update-skill", updateSkillLevel);
app.post("/api/roadmap/auto-update", autoUpdateRoadmap);

// Auth + Profile
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);

app.use("/api/quiz", quizRoutes);
app.use("/api", courseRoutes);

// Health check (before SPA fallback)
app.get("/api/health", (req, res) => {
  res.json({ 
    message: "API is running",
    environment: isDev ? "development" : "production",
    widgetUrl: `${BACKEND_URL}/widget/widget.js`
  });
});

// SPA fallback - semua route non-API redirect ke index.html
app.use((req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/widget/')) {
    return next();
  }
  res.sendFile(path.join(__dirname, '..', 'src', 'public', 'index.html'));
});
// =========================
//   GLOBAL ERROR HANDLER
// =========================
app.use((err, req, res, next) => {
  console.error("Server Error:", err);
  res.status(500).json({ error: "Something went wrong" });
});

// =========================
//       START SERVER
// =========================
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
  console.log(`📦 Environment: ${isDev ? "development" : "production"}`);
  console.log(`🔗 Widget URL: ${BACKEND_URL}/widget/widget.js`);
  console.log(`🌐 Frontend URL: ${FRONTEND_URL}`);
});