import joblib
import os

class IntentPipeline:
    def __init__(self, path: str = None):
        base_dir = os.path.dirname(__file__)
        model_path = os.path.join(base_dir, "artifacts", "intent_pipe.joblib")

        print("Loading intent model:", model_path)

        try:
            self.pipe = joblib.load(model_path)
            print("Intent model loaded OK:", type(self.pipe))
        except Exception as e:
            print("Failed to load intent model:", e)
            self.pipe = None

    def predict(self, text: str):
        if self.pipe is None:
            return {"intent": "unknown", "typePriority": None, "mode": None}
        
        text_lower = text.lower()

        if any(x in text_lower for x in [
            "roadmap",
            "skill saya",
            "skill ku",
            "perkembangan skill",
            "aku sudah sampai mana",
            "apa langkah selanjutnya",
            "next step belajar",
            "rekomendasi belajar pribadi",
            "lanjut belajar apa",
            "subskill"
        ]):
            return {
                "mode": "roadmap",
                "typePriority": None,
                "intent": "roadmap"
            }

        try:
            return self.pipe(text)
        except Exception as e:
            print("Prediction error:", e)
            return {"intent": "unknown", "typePriority": None, "mode": None}
