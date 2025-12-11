# prototype_detect_job_role.py

import re

JOB_ROLE_KEYWORDS = {
    "AI Engineer": [
        "ai", "machine learning", "deep learning", "neural", "model", "llm"
    ],
    "Android Developer": [
        "android", "kotlin", "mobile android", "apk"
    ],
    "Back-End Developer JavaScript": [
        "backend javascript", "back-end javascript", "nodejs", "node.js", "express"
    ],
    "Back-End Developer Python": [
        "backend python", "back-end python", "django", "flask", "fastapi"
    ],
    "Data Scientist": [
        "data science", "data scientist", "eda", "statistic", "analytics"
    ],
    "DevOps Engineer": [
        "devops", "ci/cd", "docker", "kubernetes", "k8s", "pipeline"
    ],
    "Front-End Web Developer": [
        "frontend", "front end", "web dev", "html", "css", "javascript"
    ],
    "Gen AI Engineer": [
        "gen ai", "generative ai", "llm", "prompt", "rag", "fine-tune"
    ],
    "Google Cloud Professional": [
        "gcp", "google cloud", "cloud engineer", "gke", "cloud architect"
    ],
    "iOS Developer": [
        "ios", "swift", "xcode", "apple developer"
    ],
    "MLOps Engineer": [
        "mlops", "model serving", "pipeline ml", "mlflow", "kubeflow"
    ],
    "Multi-Platform App Developer": [
        "flutter", "react native", "multi platform", "cross platform"
    ],
    "React Developer": [
        "react", "reactjs", "react.js", "jsx", "nextjs", "next.js"
    ]
}


def detect_job_role(user_text: str) -> str | None:
    user_text = user_text.lower()
    scores = {}

    for role, keywords in JOB_ROLE_KEYWORDS.items():
        scores[role] = 0
        for kw in keywords:
            if kw in user_text:
                scores[role] += 1

    best = max(scores, key=scores.get)
    return best if scores[best] > 0 else None
