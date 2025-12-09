# scripts/enrich_kb.py
import os
import sys
import pandas as pd

# Add parent directory to path so we can import app modules
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PARENT_DIR = os.path.dirname(os.path.dirname(SCRIPT_DIR))
sys.path.insert(0, PARENT_DIR)

from app.kb_utils import extract_level_hours_modules, extract_learning_path_items, extract_keywords
from app.embeddings_utils import load_kb  # load_kb should return DataFrame
BASE_DIR = os.path.dirname(os.path.dirname(__file__))

OUT_PATH = os.path.join(BASE_DIR, "artifacts", "kb_enriched.parquet")

def save_kb_parquet(df: pd.DataFrame, path: str):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    df.to_parquet(path, index=False)

def main():
    kb = load_kb()  # returns DataFrame with columns title,text,type,id
    if kb is None or kb.empty:
        print("⚠️ KB kosong atau tidak ditemukan.")
        return

    df = kb.copy()
    df["normalized_title"] = df["title"].astype(str).str.strip()
    df["kind"] = df["type"].fillna("unknown").astype(str).str.lower()

    # new columns
    df["level"] = None
    df["estimated_hours"] = None
    df["modules"] = None
    df["module_count"] = 0
    df["lp_courses"] = None
    df["keywords"] = None

    for i, row in df.iterrows():
        t = str(row.get("text") or "")
        typ = str(row.get("type") or "unknown").lower()
        if typ == "course":
            meta = extract_level_hours_modules(t)
            df.at[i, "level"] = meta.get("level")
            df.at[i, "estimated_hours"] = meta.get("estimated_hours")
            df.at[i, "modules"] = meta.get("modules")
            df.at[i, "module_count"] = len(meta.get("modules") or [])
        elif typ in ("learning_path", "learningpath"):
            lp = extract_learning_path_items(t)
            df.at[i, "lp_courses"] = lp.get("courses")
        elif typ in ("tutorials", "tutorial"):
            df.at[i, "modules"] = extract_level_hours_modules(t).get("modules")
        df.at[i, "keywords"] = extract_keywords(t)

    save_kb_parquet(df, OUT_PATH)
    print(f"✅ KB enriched saved to {OUT_PATH}")

if __name__ == "__main__":
    main()
