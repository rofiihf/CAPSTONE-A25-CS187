class IntentClassifier:
    def __call__(self, query: str):
        q = query.lower()
        intent = {
            "intent": "default",
            "mode": "default",
            "typePriority": ["course", "learning_path", "roadmap", "tutorials"]
        }

        if any(kw in q for kw in ["berapa lama", "durasi", "butuh waktu", "jam belajar"]):
            intent.update({"intent": "duration", "mode": "duration", "typePriority": ["course"]})
        elif "learning path" in q or "lp " in q:
            intent.update({"intent": "learning_path", "typePriority": ["learning_path", "roadmap", "course"]})
        elif "modul" in q:
            intent.update({"intent": "tutorials", "typePriority": ["tutorials", "course"]})
        elif any(kw in q for kw in ["course", "kelas", "belajar", "materi"]):
            intent.update({"intent": "course", "typePriority": ["course", "roadmap", "learning_path"]})

        return intent
