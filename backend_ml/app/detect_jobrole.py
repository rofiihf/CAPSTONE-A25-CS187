import re

# JOB_ROLE_KEYWORDS (update)
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
        "react",
        "nextjs",
        "vue",
        "svelte"
        # removed ambiguous token 'javascript' from here
    ],
    "Back-End Developer Python": [
        "django",
        "flask",
        "fastapi",
        "backend python",
        "python backend"
    ],
    "Back-End Developer JavaScript": [
        "nodejs",
        "node",
        "express",
        "backend javascript",
        "backend",
        "javascript backend",
        "server side javascript"
        # explicitly include javascript-related backend tokens
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
        "analytics",
        "pandas",
        "numpy"
    ],
    "DevOps Engineer": [
        "devops",
        "docker",
        "kubernetes",
        "k8s",
        "ci cd"
    ]
}

# contains_word unchanged (kept word-boundary matching)
def contains_word(text: str, word: str):
    return re.search(rf"\b{re.escape(word)}\b", text)

# Revised detect_job_role to disambiguate javascript + backend/front-end
def detect_job_role(user_text: str, profile=None):
    if not user_text:
        user_text = ""
    text = user_text.lower()
    scores = {}

    # 1) count matches per role
    for role, keywords in JOB_ROLE_KEYWORDS.items():
        score = 0
        for kw in keywords:
            if contains_word(text, kw.lower()):
                score += 1
        scores[role] = score

    # 2) special-case disambiguation if text includes 'javascript' or 'node' etc.
    # If user mentioned 'javascript' but also 'backend' / 'node' / 'express' -> boost Back-End JS
    if contains_word(text, "javascript") or contains_word(text, "node") or contains_word(text, "nodejs"):
        if any(contains_word(text, w) for w in ["backend", "server", "express", "api", "rest"]):
            scores["Back-End Developer JavaScript"] += 2
        # If text mentions react/next/vue -> prefer frontend
        if any(contains_word(text, w) for w in ["react", "nextjs", "vue", "svelte"]):
            scores["Front-End Web Developer"] += 2

    # 3) choose highest score
    highest = max(scores.values())
    if highest > 0:
        candidates = [r for r, s in scores.items() if s == highest]
        if len(candidates) == 1:
            return candidates[0]

        # tie-break: if both front and backend tie, favor explicit keywords present
        if "Back-End Developer JavaScript" in candidates and "Front-End Web Developer" in candidates:
            # if explicit backend tokens present -> backend
            if any(contains_word(text, w) for w in ["backend", "node", "express", "server"]):
                return "Back-End Developer JavaScript"
            # if explicit frontend tokens present -> frontend
            if any(contains_word(text, w) for w in ["react", "nextjs", "html", "css", "frontend"]):
                return "Front-End Web Developer"

        # cloud priority as before
        cloud_priority = ["Google Cloud Professional", "DevOps Engineer"]
        for c in cloud_priority:
            if c in candidates:
                return c

        return candidates[0]

    # 4) fallback: check profile.current_focus.course
    if profile:
        cf = profile.get("learning_profile", {}).get("current_focus", {})
        course = (cf.get("course") or "").lower()
        for role, keywords in JOB_ROLE_KEYWORDS.items():
            for kw in keywords:
                if contains_word(course, kw.lower()):
                    return role

    return None
