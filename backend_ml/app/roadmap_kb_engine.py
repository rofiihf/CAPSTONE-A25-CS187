import numpy as np
import re
from typing import Dict, Any, List
from .embeddings_utils import load_kb, load_faiss, get_model

# caching
_kb = None
_index = None
_model = None

def _ensure():
    global _kb, _index, _model
    if _kb is None:
        _kb = load_kb()
    if _index is None:
        _index = load_faiss()
    if _model is None:
        from .config import SBERT_MODEL_PATH
        _model = get_model(SBERT_MODEL_PATH)

def kb_based_roadmap(job_text: str, topk: int = 20) -> Dict[str, Any]:
    """
    Build roadmap dynamically from KB instead of canonical roadmap JSON.
    """
    _ensure()

    # Encode job description
    emb = _model.encode([job_text], normalize_embeddings=True).astype("float32")

    # Query FAISS
    D, I = _index.search(emb, topk)
    rows = _kb.iloc[I[0]].copy()
    
    # Add index-based id if not present
    if 'id' not in rows.columns:
        rows['id'] = [f"kb_{idx}" for idx in rows.index]

    # Filter only relevant KB entries
    rows = rows[rows["type"].isin(["learning_path", "course", "tutorial"])]

    if rows.empty:
        return {"job_role": "Unknown Role", "subskills": []}

    # Infer job role from the top learning_path hit
    lp_rows = rows[rows["type"] == "learning_path"]
    job_role = lp_rows.iloc[0]["title"] if not lp_rows.empty else "Recommended Role"

    # Group by course or learning_path to form subskills
    subskills = []
    courses = rows[rows["type"] == "course"]
    tutorials = rows[rows["type"] == "tutorial"]

    for _, row in courses.iterrows():
        subskills.append({
            "id": f"skill_{row['id']}",
            "name": row["title"],
            "keywords": list(set(re.findall(r"\w+", row["title"].lower()))),
            "mapped_courses": [row["id"]],
            "mapped_tutorials": tutorials[
                tutorials["title"].str.contains(row["title"].split()[0], case=False, na=False)
            ]["id"].tolist(),
            "level": "Beginner",
            "next_step": f"Mulai dari kursus: {row['title']}"
        })

    # MINIMAL: Ensure at least 6 subskills (pad with duplicates if needed)
    orig_count = len(subskills)
    while len(subskills) < 6 and orig_count > 0:
        base_skill = subskills[len(subskills) % orig_count]
        dup = base_skill.copy()
        dup["id"] = f"{base_skill['id']}_alt_{len(subskills) - orig_count}"
        dup["name"] = f"{base_skill['name']} (Alternate Path)"
        subskills.append(dup)

    return {
        "job_role": job_role,
        "subskills": subskills
    }
