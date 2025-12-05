import express from "express";
import bcrypt from "bcrypt";
import { findUserByEmail, findUserById } from "../utils/read-users.js";

const router = express.Router();

// LOGIN
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = findUserByEmail(email);
  if (!user) {
    return res.status(401).json({ message: "invalid credentials" });
  }

  const match = await bcrypt.compare(String(password), user.password);
  if (!match) {
    return res.status(401).json({ message: "invalid credentials" });
  }

  req.session.userId = user.id;
  req.session.user = { id: user.id, email: user.email, name: user.name };

  return res.json({
    message: "ok",
    user: req.session.user,
  });
});

// LOGOUT
router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: "Logout failed" });
    }
    res.clearCookie("sid");
    return res.json({ message: "logged out" });
  });
});

// ME
router.get("/me", (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const user = findUserById(req.session.userId);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const safe = {
    id: user.id,
    email: user.email,
    name: user.name,
    course_name: user.course_name,
  };

  return res.json({ user: safe });
});

export default router;
