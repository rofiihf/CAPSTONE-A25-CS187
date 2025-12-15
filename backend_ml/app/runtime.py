# app/runtime.py
import threading
from .embeddings_utils import load_kb, load_faiss, get_model
from .intent_model import IntentPipeline
import os

_runtime = {}
_lock = threading.Lock()

def load_runtime():
    global _runtime

    if _runtime:
        return _runtime

    with _lock:
        if _runtime:
            return _runtime

        print("⏳ Loading ML runtime...")

        _runtime["kb"] = load_kb()
        _runtime["index"] = load_faiss()
        _runtime["model"] = get_model(
            os.getenv("SBERT_MODEL_PATH", "sentence-transformers/all-MiniLM-L6-v2")
        )

        intent_path = os.path.join(
            os.path.dirname(__file__), "artifacts", "intent_pipe.joblib"
        )
        _runtime["intent"] = IntentPipeline(path=intent_path)

        print("✅ ML runtime ready")
        return _runtime
