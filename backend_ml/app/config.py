from pathlib import Path
import os

BASE = Path(__file__).resolve().parent
ARTIFACTS_DIR = os.getenv("ARTIFACTS_DIR", str(BASE / "artifacts"))
GROQ_API_KEY = os.getenv("GROQ_API")
SBERT_MODEL_PATH = os.getenv("SBERT_MODEL_PATH", "sentence-transformers/all-MiniLM-L6-v2")
INTENT_PIPE_PATH = os.getenv("INTENT_PIPE_PATH", str(BASE / "artifacts" / "intent_pipe.joblib"))
KB_PARQUET = os.getenv("KB_PARQUET", str(BASE / "artifacts" / "kb.parquet"))
KB_EMBEDDINGS = os.getenv("KB_EMBEDDINGS", str(BASE / "artifacts" / "kb_embeddings.npy"))
KB_INDEX_FAISS = os.getenv("KB_INDEX_FAISS", str(BASE / "artifacts" / "kb_index.faiss"))
SEED = int(os.getenv("SEED", "42"))

# DB / Monitoring
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/capstone_shafira")

# Server settings
DEFAULT_TOPK = int(os.getenv("DEFAULT_TOPK", "5"))
SECRET= "secret-profile"
BACKEND_URL= "/api/profile/apply-patch"
