import re

# ------------------------------------------------------------
# DEFINISI KEYWORD (SIMPLE, TAPI AKURAT)
# ------------------------------------------------------------
JOB_ROLE_KEYWORDS = {
    "Google Cloud Professional": [
        "cloud",
        "aws",
        "gcp",
        "google cloud",
        "cloud engineer",
        "cloud architect",
        "gke"
    ],
    "Gen AI Engineer": [
        "gen ai",
        "generative ai",
        "prompt",
        "rag",
        "fine tune"
    ],
    "AI Engineer": [
        "machine learning",
        "deep learning",
        "neural network",
        "llm",
        "ml engineer"
    ],
    "Front-End Web Developer": [
        "frontend",
        "front end",
        "html",
        "css",
        "javascript",
        "react",
        "nextjs"
    ],
    "Back-End Developer Python": [
        "django",
        "flask",
        "fastapi",
        "backend python"
    ],
    "Back-End Developer JavaScript": [
        "nodejs",
        "express",
        "backend javascript"
    ],
    "Android Developer": [
        "android",
        "kotlin",
        "apk"
    ],
    "iOS Developer": [
        "ios",
        "swift",
        "xcode"
    ],
    "Data Scientist": [
        "data science",
        "statistik",
        "eda",
        "analytics"
    ],
    "DevOps Engineer": [
        "devops",
        "docker",
        "kubernetes",
        "k8s",
        "ci cd"
    ]
}


# ------------------------------------------------------------
# WORD BOUNDARY MATCH (NO MORE ai -> ml autodetect bullshit)
# ------------------------------------------------------------
def contains_word(text: str, word: str):
    """Cocokkan kata secara utuh, bukan substring."""
    return re.search(rf"\b{re.escape(word)}\b", text)


# ------------------------------------------------------------
# DETECTOR UTAMA
# ------------------------------------------------------------
def detect_job_role(user_text: str, profile=None):
    text = user_text.lower()
    scores = {}

    # --------------------------------------------------------
    # 1. Hitung skor berdasarkan kemunculan kata kunci
    # --------------------------------------------------------
    for role, keywords in JOB_ROLE_KEYWORDS.items():
        score = 0
        for kw in keywords:
            if contains_word(text, kw.lower()):
                score += 1
        scores[role] = score

    # --------------------------------------------------------
    # 2. Jika ada match → ambil skor tertinggi
    # --------------------------------------------------------
    highest = max(scores.values())
    if highest > 0:
        # Ambil semua role dengan skor tertinggi
        candidates = [r for r, s in scores.items() if s == highest]

        # Jika cuma satu → selesai
        if len(candidates) == 1:
            return candidates[0]

        # Kalau tie → pilih yang paling relevan dengan teks user
        # (Cloud selalu menang jika mengandung cloud/aws)
        cloud_priority = ["Google Cloud Professional", "DevOps Engineer"]
        for c in cloud_priority:
            if c in candidates:
                return c

        # Kalau tetap tie → ambil kandidat pertama
        return candidates[0]

    # --------------------------------------------------------
    # 3. Fallback: cek current_focus course
    # --------------------------------------------------------
    if profile:
        cf = profile.get("learning_profile", {}).get("current_focus", {})
        course = cf.get("course", "")
        course = course.lower()

        for role, keywords in JOB_ROLE_KEYWORDS.items():
            # HINDARI AI Engineer false match
            if "gen ai" in course and role == "AI Engineer":
                continue

            for kw in keywords:
                if contains_word(course, kw.lower()):
                    return role

    return None
