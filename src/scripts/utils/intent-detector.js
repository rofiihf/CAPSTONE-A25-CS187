// src/scripts/utils/intent-detector-advanced.js

// Advanced intent detector
// Exports: detectIntent(text, opts)
// - returns { intent: string|null, confidence: number (0..1), scores: { intentName: score }, details: { ... } }

// -----------------------------------------------------------------------------
// Utilities
// -----------------------------------------------------------------------------
function normalizeText(t) {
  return String(t || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ") // remove punctuation (unicode-aware)
    .replace(/\s+/g, " ")
    .trim();
}

// Simple rule-based stemmer for Indonesian + English (lightweight)
function stemToken(token) {
  // very small set of suffix rules (not a full stemmer); sufficient for intent detection
  const orig = token;
  // Indonesian common suffixes
  const idSuffixes = ["lah", "kah", "nya", "ku", "mu", "kan", "i", "an", "nya", "nya"];
  for (const suf of idSuffixes) {
    if (token.endsWith(suf) && token.length - suf.length >= 2) {
      token = token.slice(0, -suf.length);
      return token;
    }
  }

  // English suffixes
  const enSuffixes = ["ing", "ed", "es", "s"];
  for (const suf of enSuffixes) {
    if (token.endsWith(suf) && token.length - suf.length >= 2) {
      token = token.slice(0, -suf.length);
      return token;
    }
  }

  // fallback return original if no rule matched
  return orig;
}

function tokenize(text) {
  if (!text) return [];
  return normalizeText(text).split(" ").filter(Boolean).map(stemToken);
}

// Levenshtein distance (iterative DP). Returns integer distance.
function levenshtein(a, b) {
  a = String(a || "");
  b = String(b || "");
  if (a === b) return 0;
  const al = a.length, bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;
  const prev = new Array(bl + 1);
  for (let j = 0; j <= bl; j++) prev[j] = j;
  for (let i = 1; i <= al; i++) {
    let cur = [i];
    for (let j = 1; j <= bl; j++) {
      const insert = cur[j - 1] + 1;
      const del = prev[j] + 1;
      const subs = prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1);
      cur[j] = Math.min(insert, del, subs);
    }
    for (let j = 0; j <= bl; j++) prev[j] = cur[j];
  }
  return prev[bl];
}

// normalized similarity: 1.0 perfect match, 0.0 totally different
function normalizedSimilarity(a, b) {
  a = String(a || "");
  b = String(b || "");
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  const dist = levenshtein(a, b);
  return Math.max(0, 1 - dist / maxLen);
}

// -----------------------------------------------------------------------------
// Config: intents, phrase lists, regex patterns, synonyms
// -----------------------------------------------------------------------------

// Each intent config:
// {
//   id: 'skill_assessment',
//   phrases: [ 'aku mau quiz', ... ],
//   regex: [ /regex1/i, /regex2/i ],
//   weight: { exact:0.4, regex:0.35, token:0.15, fuzzy:0.1 }  // how to combine
// }

const INTENTS = [
  {
    id: "skill_assessment",
    // phrases: canonical triggers (lowercase, normalized)
    phrases: [
      "aku mau quiz",
      "aku mau tes skill",
      "cek levelku",
      "cek level saya",
      "tes skill",
      "tes kemampuan",
      "mau tes skill",
      "mulai quiz",
      "mulai tes",
      "assessment",
      "quiz me",
      "test my skill",
      "check my level",
      "cek skill",
      "evaluate my skill",
      "nilai skill saya",
      "tolong tes aku",
      "aku ingin tes",
      "aku mau diuji",
      "minta penilaian skill",
      "ukur skillku",
      "ukur kemampuan saya",
      "cek kemampuan ku",
      "cek kemampuan saya",
      // add more short canonical forms as needed
    ],
    // regex patterns catch broad phrasing
    regex: [
      /\b(cek|periksa|periksa|lihat)\b.*\b(level|skill|kemampuan|tingkat)\b/,
      /\b(tes|test|quiz|assessment)\b/,
      /\b(ukur|evaluasi|evaluasi|nilai)\b.*\b(skill|kemampuan|level)\b/,
      /\b(level).*(berapa|apa)\b/,
    ],
    weight: { exact: 0.45, regex: 0.35, token: 0.12, fuzzy: 0.08 },
  },

  {
    id: "roadmap_request",
    phrases: [
      "minta roadmap",
      "minta rekomendasi roadmap",
      "buatkan roadmap",
      "tampilkan roadmap",
      "bikin roadmap",
      "roadmap",
      "show roadmap",
      "tampilkan rencana belajar",
      "rekomendasi roadmap",
    ],
    regex: [
      /\b(roadmap|rencana belajar|rencana pembelajaran|rencana)\b/,
      /\b(bikin|buatkan|minta|tampilkan).*\b(roadmap|rencana|rencana belajar)\b/,
    ],
    weight: { exact: 0.4, regex: 0.4, token: 0.12, fuzzy: 0.08 },
  },

  {
    id: "progress_summary",
    phrases: [
      "lihat progres",
      "progress saya",
      "progres minggu ini",
      "progress minggu ini",
      "laporan progres",
      "tampilkan progres",
      "apa perkembangan saya",
      "apa saja yang berkembang minggu ini",
    ],
    regex: [
      /\b(progres|progress|perkembangan|kemajuan)\b/,
      /\b(laporan|summary|ringkasan).*\b(progres|progress)\b/,
    ],
    weight: { exact: 0.35, regex: 0.4, token: 0.15, fuzzy: 0.1 },
  },

  {
    id: "course_recommendation",
    phrases: [
      "rekomendasi kelas",
      "rekomendasi kursus",
      "saran kelas",
      "saran pembelajaran",
      "recommend course",
      "recommendation class",
    ],
    regex: [
      /\b(rekomendasi|saran|recommend|suggest).*\b(kelas|kursus|course|tutorial)\b/,
    ],
    weight: { exact: 0.4, regex: 0.4, token: 0.12, fuzzy: 0.08 },
  },

  {
    id: "smalltalk_greeting",
    phrases: [
      "halo",
      "hi",
      "hai",
      "selamat pagi",
      "selamat siang",
      "selamat sore",
      "selamat malam",
    ],
    regex: [
      /\b(hallo|halo|hi|hai|selamat pagi|selamat siang|selamat sore|selamat malam)\b/,
    ],
    weight: { exact: 0.6, regex: 0.25, token: 0.1, fuzzy: 0.05 },
  },

  // add other intents as needed...
];

// synonyms map: token -> canonical token
// we will expand tokens so that synonyms map to the same canonical form
const SYNONYMS = {
  tes: "test",
  test: "test",
  quiz: "test",
  cek: "check",
  periksa: "check",
  periksa: "check",
  nilai: "evaluate",
  evaluasi: "evaluate",
  ukur: "evaluate",
  skill: "skill",
  skillku: "skill",
  kemampuan: "skill",
  level: "level",
  progress: "progress",
  progres: "progress",
  roadmap: "roadmap",
  "rencana": "roadmap",
  rekomendasi: "recommend",
  saran: "recommend",
  kelas: "course",
  kursus: "course",
  course: "course",
  "mulai": "start",
  "mau": "want",
  "ingin": "want",
  "aku": "user",
  "saya": "user",
  "cek": "check",
  "dong": "", // filler
  "please": "", // filler
};

// utility: expand synonyms for a token
function canonicalizeToken(tok) {
  if (!tok) return tok;
  if (SYNONYMS[tok]) return SYNONYMS[tok];
  return tok;
}

// -----------------------------------------------------------------------------
// Scoring logic
// -----------------------------------------------------------------------------

// Evaluate one intent against the message
function scoreIntentForMessage(intentCfg, rawText, tokens) {
  // raw normalized text and tokens already stemmed
  const text = normalizeText(rawText);
  const toks = tokens.slice(); // array of stemmed tokens

  // components
  let scoreExact = 0;
  let scoreRegex = 0;
  let scoreToken = 0;
  let scoreFuzzy = 0;

  // 1) Exact phrase matches (normalized)
  for (const phr of intentCfg.phrases || []) {
    const np = normalizeText(phr);
    if (!np) continue;
    if (text.includes(np)) {
      scoreExact = Math.max(scoreExact, 1); // binary: found
      break;
    }
  }

  // 2) Regex patterns
  for (const r of intentCfg.regex || []) {
    try {
      if (r.test(text)) {
        scoreRegex = Math.max(scoreRegex, 1);
        break;
      }
    } catch (e) {
      // ignore bad regexes
      console.warn("Invalid regex in intent config:", e);
    }
  }

  // 3) Token/synonym overlap
  // Build canonical tokens for both message and phrase lists
  const msgCanonical = new Set(toks.map(canonicalizeToken).filter(Boolean));

  // create canonical tokens for phrases
  const phraseTokens = [];
  for (const phr of intentCfg.phrases || []) {
    const pToks = normalizeText(phr).split(" ").filter(Boolean).map(stemToken).map(canonicalizeToken);
    for (const t of pToks) if (t) phraseTokens.push(t);
  }
  const phraseSet = new Set(phraseTokens);

  if (phraseSet.size > 0) {
    // overlap ratio
    let overlap = 0;
    for (const t of msgCanonical) {
      if (phraseSet.has(t)) overlap++;
    }
    // token score scaled by coverage: overlap / phraseSet.size (capped)
    scoreToken = Math.min(1, overlap / Math.max(1, phraseSet.size));
  }

  // 4) Fuzzy: check normalized similarity between message and each phrase,
  // take the best normalized similarity
  let bestFuzzy = 0;
  for (const phr of intentCfg.phrases || []) {
    const np = normalizeText(phr);
    const sim = normalizedSimilarity(text, np);
    if (sim > bestFuzzy) bestFuzzy = sim;
  }
  // also check per-token fuzzy (if tokens are short)
  // combine bestFuzzy with per-token fuzzy best
  let bestTokenFuzzy = 0;
  for (const p of phraseTokens) {
    for (const m of toks) {
      const sim = normalizedSimilarity(m, p);
      if (sim > bestTokenFuzzy) bestTokenFuzzy = sim;
    }
  }
  scoreFuzzy = Math.max(bestFuzzy, bestTokenFuzzy);

  // Combine components using configured weights
  const w = intentCfg.weight || { exact: 0.45, regex: 0.35, token: 0.12, fuzzy: 0.08 };
  const rawScore = ( (scoreExact ? 1 : 0) * w.exact ) +
                   ( (scoreRegex ? 1 : 0) * w.regex ) +
                   (scoreToken * (w.token || 0)) +
                   (scoreFuzzy * (w.fuzzy || 0));

  // Normalize rawScore by max possible (which is sum of weights). Here weights sum to ~1.
  const weightSum = (w.exact || 0) + (w.regex || 0) + (w.token || 0) + (w.fuzzy || 0);
  const normalized = weightSum > 0 ? Math.min(1, rawScore / weightSum) : 0;

  return {
    rawScore,
    normalized,
    breakdown: { exact: scoreExact, regex: scoreRegex, token: scoreToken, fuzzy: scoreFuzzy }
  };
}

// -----------------------------------------------------------------------------
// Public API: detectIntent
// -----------------------------------------------------------------------------
export function detectIntentAdvanced(text, options = {}) {
  const raw = String(text || "");
  const normalized = normalizeText(raw);
  const toks = tokenize(normalized);

  const scores = {};
  const details = {};

  // Score each intent
  let best = { id: null, score: 0 };
  for (const intentCfg of INTENTS) {
    const s = scoreIntentForMessage(intentCfg, raw, toks);
    scores[intentCfg.id] = s.normalized;
    details[intentCfg.id] = s.breakdown;
    if (s.normalized > best.score) {
      best = { id: intentCfg.id, score: s.normalized };
    }
  }

  // Optionally: if top-2 are close, we can reduce confidence or ask clarification
  // Compute second best
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const top = sorted[0] ?? [null, 0];
  const second = sorted[1] ?? [null, 0];

  let confidence = top[1] || 0;

  // Adjust confidence: if top and second are close (within 0.12), reduce
  if (second[1] && (top[1] - second[1]) < 0.12) {
    confidence = confidence * 0.75; // lower confidence due ambiguity
  }

  // clamp 0..1
  confidence = Math.max(0, Math.min(1, confidence));

  return {
    intent: top[0],
    confidence,
    scores,
    details,
    input: raw
  };
}

// Convenience default export name
export const detectIntent = detectIntentAdvanced;

// -----------------------------------------------------------------------------
// Optional helper: add new intent at runtime
// -----------------------------------------------------------------------------
export function addIntent(intentCfg) {
  if (!intentCfg || !intentCfg.id) throw new Error("intentCfg must have id");
  INTENTS.push(intentCfg);
}

export function listIntents() {
  return INTENTS.map(i => i.id);
}
