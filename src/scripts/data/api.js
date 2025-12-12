
// import { BACKEND_URL } from "../config.js";

// const ENDPOINTS = {
//   SEND_MESSAGE: `/chat`,
// }

export async function sendMessage(message) {
  try {
    const fetchResponse = await fetch("/chat", {
      method: "POST",
      credentials: "include",
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message })
    });

    const json = await fetchResponse.json();

    return {
      ...json,
      ok: fetchResponse.ok,
    }
  } catch (error) {
    console.error(`Error: Backend not reachable: ${error}`);

    return {
      ok: false,
      reply: "Tidak dapat dijangkau.",
    }
  }
}


/* ============================================================
  QUIZ API
   ============================================================ */

// GET /api/quiz/topics
export async function getQuizTopics() {
  try {
    const res = await fetch("/api/quiz/topics", {
      method: "GET",
      credentials: "include"
    });

    const json = await res.json();
    return { ...json, ok: res.ok };
  } catch (err) {
    console.error("Error fetching quiz topics:", err);
    return { ok: false, topics: [] };
  }
}

// GET /api/quiz/questions?topic=XXX&count=Y
export async function getQuizQuestions(topic, count = 5) {
  try {
    const url = `/api/quiz/questions?topic=${encodeURIComponent(topic)}&count=${count}`;

    const res = await fetch(url, {
      method: "GET",
      credentials: "include"
    });

    const json = await res.json();
    return { ...json, ok: res.ok };
  } catch (err) {
    console.error("Error fetching quiz questions:", err);
    return { ok: false, questions: [] };
  }
}

// POST /api/quiz/score
export async function submitQuizScore(topic, answers) {
  try {
    const res = await fetch("/api/quiz/score", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, answers })
    });

    const json = await res.json();
    return { ...json, ok: res.ok };
  } catch (err) {
    console.error("Error submitting quiz score:", err);
    return { ok: false };
  }
}

export async function loadCourseMap() {
  try {
    const res = await fetch("/api/courses-map");
    const data = await res.json();
    window.COURSE_MAP = data.courses || {};
  } catch (err) {
    console.error("Failed to load course map", err);
    window.COURSE_MAP = {};
  }
}
