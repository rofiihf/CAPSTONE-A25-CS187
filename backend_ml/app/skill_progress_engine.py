"""
Skill Progress Estimation Engine (MVP)

Fungsi utama:
- build_course_lookup(course_list)
- compute_subskill_progress(subskill, course_progress_map, course_catalog, thresholds)
- generate_skill_progress_for_roadmap(roadmap, profile, course_catalog, thresholds)

Input expected:
- roadmap: { "job_role":..., "subskills": [ { subskill }, ... ] }
  each subskill must include "mapped_courses": { "beginner": [ids], "intermediate": [...], "advanced": [...] }
- profile: full profile from backend (platform_data.course_progress are mapped by course name → percent 0-100)
- course_catalog: list of course objects (the array you provided) or dict course_id->course_name

Output:
- skills_status: dict keyed by subskill.id with values:
  {
    "name": <str>,
    "level": "not_started"|"Beginner"|"Intermediate"|"Advanced",
    "overall_percent": <0-100 float>,
    "per_level_percent": {"beginner":float,"intermediate":float,"advanced":float},
    "source_course_ids": [ids]
  }
"""

from typing import List, Dict, Any, Optional
import math

def build_course_lookup(course_list: List[Dict[str, Any]]) -> Dict[int, Dict[str, Any]]:
    """
    Build catalog: course_id -> {course_name, learning_path_id, hours_to_study, course_level_str}
    Accepts list (the JSON you provided).
    """
    catalog = {}
    for c in course_list:
        try:
            cid = int(c.get("course_id"))
        except Exception:
            continue
        catalog[cid] = {
            "course_name": c.get("course_name"),
            "learning_path_id": c.get("learning_path_id"),
            "hours_to_study": c.get("hours_to_study"),
            "course_level_str": c.get("course_level_str")
        }
    return catalog


def _safe_get_course_progress_by_id(course_id: int, course_progress_map_by_name: Dict[str, float], catalog: Dict[int, Dict[str, Any]]) -> Optional[float]:
    """
    Backend stores progress keyed by course_name. Try to find by id via catalog.
    Returns percent (0-100) or None if not present.
    """
    info = catalog.get(int(course_id))
    if not info:
        return None
    name = info.get("course_name")
    if not name:
        return None
    # normalize and try direct lookup
    if name in course_progress_map_by_name:
        try:
            val = float(course_progress_map_by_name[name])
            # clamp
            if val < 0:
                val = 0.0
            if val > 100:
                val = 100.0
            return val
        except:
            return None
    # fallback: try case-insensitive match
    for k, v in course_progress_map_by_name.items():
        try:
            if k.strip().lower() == name.strip().lower():
                return float(v)
        except:
            continue
    return None


def compute_subskill_progress(
    subskill: Dict[str, Any],
    course_progress_map_by_name: Dict[str, float],
    catalog: Dict[int, Dict[str, Any]],
    thresholds: Optional[Dict[str, int]] = None
) -> Dict[str, Any]:
    """
    Compute progress metrics for a single subskill.

    thresholds default:
      {"advanced": 80, "intermediate": 40, "beginner": 1}
    Interpretation:
      - If per-level average for 'advanced' >= advanced threshold => Advanced
      - else if per-level average for 'intermediate' >= intermediate threshold => Intermediate
      - else if any mapped course has progress >= beginner threshold => Beginner
      - else -> not_started

    Returns dict with:
      - name
      - per_level_percent: dict
      - overall_percent (avg across all mapped courses)
      - level: final decided level
      - source_course_ids: list
    """
    if thresholds is None:
        thresholds = {"advanced": 80, "intermediate": 40, "beginner": 1}

    mapped = subskill.get("mapped_courses", {}) or {}
    per_level_percent = {"beginner": None, "intermediate": None, "advanced": None}
    source_ids = []
    # compute per-level averages
    for lvl in ("beginner", "intermediate", "advanced"):
        arr = mapped.get(lvl) or []
        vals = []
        for cid in arr:
            try:
                cid_int = int(cid)
            except:
                continue
            source_ids.append(cid_int)
            p = _safe_get_course_progress_by_id(cid_int, course_progress_map_by_name, catalog)
            if p is not None:
                vals.append(float(p))
        if vals:
            per_level_percent[lvl] = sum(vals) / len(vals)
        else:
            per_level_percent[lvl] = None

    # overall percent: average of existing percents (ignore None)
    all_vals = []
    for lvl_vals in per_level_percent.values():
        if lvl_vals is not None:
            all_vals.append(lvl_vals)
    overall_percent = float(sum(all_vals) / len(all_vals)) if all_vals else 0.0

    # decide level using descending priority
    level = "not_started"
    try:
        if per_level_percent.get("advanced") is not None and per_level_percent["advanced"] >= thresholds["advanced"]:
            level = "Advanced"
        elif per_level_percent.get("intermediate") is not None and per_level_percent["intermediate"] >= thresholds["intermediate"]:
            level = "Intermediate"
        else:
            # If any course progress in any level >= beginner threshold => Beginner
            any_begin = False
            for lvlp in per_level_percent.values():
                if lvlp is not None and lvlp >= thresholds["beginner"]:
                    any_begin = True
                    break
            if any_begin:
                level = "Beginner"
    except Exception:
        # fallback safe
        if overall_percent >= thresholds.get("intermediate", 40):
            level = "Intermediate"
        elif overall_percent > 0:
            level = "Beginner"

    return {
        "name": subskill.get("name"),
        "level": level,
        "overall_percent": round(overall_percent, 2),
        "per_level_percent": {
            "beginner": (None if per_level_percent["beginner"] is None else round(per_level_percent["beginner"], 2)),
            "intermediate": (None if per_level_percent["intermediate"] is None else round(per_level_percent["intermediate"], 2)),
            "advanced": (None if per_level_percent["advanced"] is None else round(per_level_percent["advanced"], 2)),
        },
        "source_course_ids": sorted(list(set([int(x) for x in source_ids if x is not None]))),
    }


def generate_skill_progress_for_roadmap(
    roadmap: Dict[str, Any],
    profile: Dict[str, Any],
    course_catalog: List[Dict[str, Any]],
    thresholds: Optional[Dict[str, int]] = None
) -> Dict[str, Any]:
    """
    For a given roadmap (with subskills) and user profile, compute skills_status.

    Returns dict { subskill_id: {name, level, overall_percent, per_level_percent, source_course_ids } }
    """
    catalog = build_course_lookup(course_catalog)

    # normalize course progress map taken from profile.platform_data.course_progress
    cp = {}
    plat = profile.get("platform_data", {}) if isinstance(profile, dict) else {}
    raw_cp = plat.get("course_progress") or {}
    # try: raw_cp may have keys as course names with numeric values (0-100)
    for k, v in raw_cp.items():
        try:
            cp[str(k).strip()] = float(v)
        except:
            # ignore non-numeric
            try:
                cp[str(k).strip()] = float(str(v).strip())
            except:
                continue

    skills_status = {}
    subs = roadmap.get("subskills", []) if isinstance(roadmap, dict) else []
    for s in subs:
        sid = s.get("id")
        if not sid:
            continue
        result = compute_subskill_progress(s, cp, catalog, thresholds)
        skills_status[sid] = result

    return skills_status


# Minimal test / example usage
if __name__ == "__main__":
    # quick demo when run standalone
    import json, sys
    print("Skill Progress Engine - quick demo")
    # expects: python skill_progress_engine.py catalog.json roadmap.json profile.json
    if len(sys.argv) >= 4:
        catalog = json.load(open(sys.argv[1], "r", encoding="utf-8"))
        roadmap = json.load(open(sys.argv[2], "r", encoding="utf-8"))
        profile = json.load(open(sys.argv[3], "r", encoding="utf-8"))
        out = generate_skill_progress_for_roadmap(roadmap, profile, catalog)
        print(json.dumps(out, indent=2, ensure_ascii=False))
    else:
        print("No demo files provided. Import functions in your code and call generate_skill_progress_for_roadmap().")
