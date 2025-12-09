# app/maintenance.py

import os
import joblib
from app.embeddings_utils import rebuild_kb
from app.intent_classifier import IntentClassifier

ARTIFACTS_DIR = "app/artifacts"
INTENT_JOBLIB = os.path.join(ARTIFACTS_DIR, "intent_pipe.joblib")

def rebuild_intent():
    clf = IntentClassifier()
    joblib.dump(clf, INTENT_JOBLIB)
    return INTENT_JOBLIB

def rebuild_all():
    # 1. Rebuild KB
    embs, index = rebuild_kb()

    # 2. Rebuild Intent Pipeline
    intent_path = rebuild_intent()

    print("Rebuild completed:")
    print("- KB embeddings & FAISS rebuilt")
    print(f"- Intent pipeline saved to: {intent_path}")

    return True
