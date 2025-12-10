require("dotenv").config();

const express = require("express");
const cors = require("cors");
const session = require("express-session");

// Controllers
const authRoutes = require("./controllers/auth-controller.js");
const profileRoutes = require("./controllers/profile-controller.js");
const { handleChat, handleChatJob } = require("./controllers/chat-controller.js");
const { 
  getRoadmapRecommendations, 
  updateSkillLevel, 
  autoUpdateRoadmap 
} = require("./controllers/roadmap-controller.js");

const app = express();

// =========================
//          CORS
// =========================
// WAJIB: pakai credentials karena session cookie
app.use(cors({
  origin: [
    "http://localhost:5500",
    "http://127.0.0.1:5500"
  ],
  credentials: true
}));

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
    secure: false,      
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 24 // 24 jam
  }
}));

// =========================
//          ROUTES
// =========================

// Chat → ML backend
app.post("/chat", handleChat);
// Chat khusus job-role → ML backend
app.post("/chat/job", handleChatJob);

// Roadmap features
app.get("/api/roadmap/recommendations", getRoadmapRecommendations);
app.post("/api/roadmap/update-skill", updateSkillLevel);
app.post("/api/roadmap/auto-update", autoUpdateRoadmap);

// Auth + Profile
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);

// Health check
app.get("/", (req, res) => {
  res.json({ message: "API is running" });
});

// =========================
//   GLOBAL ERROR HANDLER
// =========================
app.use((err, req, res, next) => {
  console.error("Server Error:", err);
  res.status(500).json({ error: "Something went error" });
});

// =========================
//       START SERVER
// =========================
const port = process.env.PORT || 5000;
app.listen(port, () =>
  console.log(`🚀 Server running on port ${port}`)
);
