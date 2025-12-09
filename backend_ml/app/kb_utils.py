# app/kb_utils.py
import os
import re
import json
import difflib
from pathlib import Path
from typing import List, Dict, Any
from .embeddings_utils import get_model, load_faiss, load_kb  # used optionally

BASE_DIR = os.path.dirname(__file__)
ARTIFACTS = os.path.join(BASE_DIR, "artifacts")
ROLE_MAP_DIR = Path(os.path.join(ARTIFACTS, "role_mappings"))
ROLE_MAP_DIR.mkdir(parents=True, exist_ok=True)

_kb = None
_index = None
_model = None

def normalize_text(s: str) -> str:
    if not s: return ""
    s = str(s).lower()
    s = re.sub(r'[^a-z0-9\s]', ' ', s)
    s = re.sub(r'\s+', ' ', s).strip()
    return s

def fuzzy_match_name(name: str, candidates: List[str], cutoff: float = 0.66):
    if not candidates: return None
    nm = normalize_text(name)
    cand_n = [normalize_text(c) for c in candidates]
    matches = difflib.get_close_matches(nm, cand_n, n=1, cutoff=cutoff)
    if matches:
        return candidates[cand_n.index(matches[0])]
    return None

def init_kb_refs(kb_obj=None, index_obj=None, model_obj=None):
    global _kb, _index, _model
    if kb_obj is not None:
        _kb = kb_obj
    if index_obj is not None:
        _index = index_obj
    if model_obj is not None:
        _model = model_obj

def init_from_embeddings():
    """Optional convenience init that uses embeddings_utils to load artifacts."""
    global _kb, _index, _model
    if _kb is None:
        try:
            _kb = load_kb()
        except Exception:
            _kb = None
    if _index is None:
        try:
            _index = load_faiss()
        except Exception:
            _index = None
    if _model is None:
        try:
            _model = get_model()
        except Exception:
            _model = None

def role_mapping_cache_path(role_name: str):
    fn = normalize_text(role_name).replace(" ", "_") + ".json"
    return ROLE_MAP_DIR / fn

def load_role_mapping_from_cache(role_name: str):
    p = role_mapping_cache_path(role_name)
    if p.exists():
        try:
            return json.loads(p.read_text(encoding="utf-8"))
        except:
            return None
    return None

def save_role_mapping_to_cache(role_name: str, mapping: Dict):
    p = role_mapping_cache_path(role_name)
    p.write_text(json.dumps(mapping, ensure_ascii=False, indent=2), encoding="utf-8")

def query_kb_for_subskill(subskill_name: str, topk: int = 8, score_threshold: float = 0.18):
    """Return list of hits: [{'id','title','type','score'}]"""
    if _kb is None or _index is None or _model is None:
        # try auto-init once
        init_from_embeddings()
    if _kb is None or _index is None or _model is None:
        raise RuntimeError("KB/index/model not initialized. Call init_kb_refs(...) or ensure embeddings artifacts exist.")

    q_emb = _model.encode([subskill_name], normalize_embeddings=True).astype("float32")
    # FAISS might expect k>0
    k = max(1, int(topk))
    D, I = _index.search(q_emb, k)
    ids = I[0].tolist(); dists = D[0].tolist()
    results = []
    name_words = set(re.findall(r"\w+", subskill_name.lower()))
    for idx, dist in zip(ids, dists):
        if int(idx) < 0:
            continue
        try:
            row = _kb.iloc[int(idx)]
        except Exception:
            continue
        base_score = -float(dist)
        title = str(row.get("title") or "")
        typ = str(row.get("type") or "unknown")
        title_words = set(re.findall(r"\w+", title.lower()))
        title_bonus = len(name_words & title_words) * 0.15
        type_bonus = 0.3 if typ.lower() == "course" else 0.0
        # structured boosts if enrichment columns exist
        kw_bonus = 0.0
        try:
            kws = row.get("keywords") or []
            if isinstance(kws, str):
                kws = json.loads(kws) if kws.startswith("[") else [kws]
            if any(normalize_text(w) in normalize_text(subskill_name) or normalize_text(subskill_name) in normalize_text(w) for w in kws):
                kw_bonus = 0.25
        except Exception:
            kw_bonus = 0.0

        final_score = float(base_score + title_bonus + type_bonus + kw_bonus)
        if final_score >= score_threshold:
            rid = row.get("id", None)
            if rid is None:
                rid = int(idx)
            results.append({"id": rid, "title": title, "type": typ, "score": final_score})
    results = sorted(results, key=lambda r: r["score"], reverse=True)
    return results

# Parsers (kept same, but ensure return types stable)
def extract_level_hours_modules(text: str) -> Dict[str, Any]:
    out = {"level": None, "estimated_hours": None, "modules": []}
    if not text:
        return out
    m = re.search(r'Level[:\s]*([0-9]+)', text, re.IGNORECASE)
    if m:
        out["level"] = int(m.group(1))
    else:
        mm = re.search(r'\b(Beginner|Intermediate|Advanced)\b', text, re.IGNORECASE)
        if mm:
            out["level"] = mm.group(1).title()
    h = re.search(r'Estimated\s+hours[:\s]*([0-9]+)', text, re.IGNORECASE)
    if h:
        out["estimated_hours"] = int(h.group(1))
    mmod = re.search(r'Modules?:\s*(.+)', text, re.IGNORECASE | re.DOTALL)
    if mmod:
        tail = mmod.group(1)
        tail = re.split(r'\n(?:Prasyarat|Estimated|Level|Submission|Type|type)[:\s]', tail)[0]
        parts = re.split(r'[;\n•\-–]', tail)
        modules = [p.strip() for p in parts if len(p.strip())>2]
        out["modules"] = modules
    return out

def extract_learning_path_items(text: str) -> Dict[str, Any]:
    out = {"courses": [], "summary": None}
    if not text:
        return out
    parts = re.split(r'[;\n•\-–]', text)
    candidates = [p.strip() for p in parts if len(p.strip())>3]
    courses = [c for c in candidates if re.search(r'\b(Belajar|Menjadi|Introduction|Intro|Advanced|React|AI)\b', c, re.IGNORECASE)]
    out["courses"] = courses
    out["summary"] = candidates[0] if candidates else None
    return out

def extract_keywords(text: str, top_n: int = 10):
    words = re.findall(r'\b[a-zA-Z0-9\-]+\b', (text or "").lower())
    stop = set(["the","and","with","for","dan","di","ke","pada","yang","untuk","dengan"])
    freqs = {}
    for w in words:
        if w in stop or len(w) < 3: continue
        freqs[w] = freqs.get(w,0) + 1
    kws = sorted(freqs.items(), key=lambda x: x[1], reverse=True)[:top_n]
    return [k for k,_ in kws]
