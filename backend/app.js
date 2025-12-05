require("dotenv").config();

const express = require("express");
const cors = require("cors");
const session = require("express-session");
const authRoutes = require("./controllers/auth-controller.js").default;
const { handleChat } = require("./controllers/chat-controller.js")

const app = express();


// =========================
//       CORS
// =========================
// WAJIB: harus pakai { credentials: true } karena kita pakai session cookie
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
    httpOnly: true,     // tidak bisa diakses JS → aman
    secure: false,      // true jika HTTPS
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 24 // 24 jam
  }
}));


// =========================
//       ROUTES
// =========================

// Chat ke ML
app.post("/chat", handleChat);

// Health check
app.get("/", (req, res) => {
  res.json({ message: "API is running" });
});

app.use("/api/auth", authRoutes);


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
