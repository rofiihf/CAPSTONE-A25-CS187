# app/roadmap_engine.py
import os
import json
import time
import re
from typing import List, Dict, Any, Optional
from app.kb_utils import query_kb_for_subskill

BASE_DIR = os.path.dirname(__file__)
ROADMAP_DIR = os.path.join(BASE_DIR, "roadmap")
USER_PROFILES_DIR = os.path.join(BASE_DIR, "user_profiles")

# -------------------------
# Utilities
# -------------------------
def load_json(path: str) -> Any:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def save_json(path: str, data: Any) -> None:
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    os.replace(tmp, path)

def tokenize(text: str) -> set:
    return set(re.findall(r"\w+", (text or "").lower()))

# -------------------------
# Roadmap loader
# -------------------------
def load_canonical_roadmap(filename: str = "front_end_v1.json") -> Dict[str, Any]:
    path = os.path.join(ROADMAP_DIR, filename)
    if not os.path.exists(path):
        raise FileNotFoundError(f"Roadmap file not found: {path}")
    return load_json(path)

# -------------------------
# Normalizers for courses & tutorials
# Expect course_rows: list[dict] with keys: course_id, learning_path_id, course_name, course_level_str, hours_to_study
# Expect tutorial_rows: list[dict] with keys: tutorial_id, course_id, tutorial_title
# -------------------------
def normalize_courses(course_rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    out = []
    for r in course_rows:
        out.append({
            "course_id": str(r.get("course_id")),
            "learning_path_id": str(r.get("learning_path_id", "")),
            "course_name": (r.get("course_name") or "").strip(),
            "course_level_str": str(r.get("course_level_str") or ""),
            "hours_to_study": int(r.get("hours_to_study") or 0),
            "text": " ".join([
                str(r.get("course_name") or ""),
                str(r.get("course_level_str") or "")
            ]).lower()
        })
    return out

def normalize_tutorials(tutorial_rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    out = []
    for r in tutorial_rows:
        out.append({
            "tutorial_id": str(r.get("tutorial_id")),
            "course_id": str(r.get("course_id")),
            "tutorial_title": (r.get("tutorial_title") or "").strip(),
            "text": (r.get("tutorial_title") or "").lower()
        })
    return out

# -------------------------
# Simple keyword scoring
# -------------------------
def keyword_score(text: str, keywords: List[str]) -> int:
    toks = tokenize(text)
    score = 0
    for kw in keywords:
        # split keyword phrase into tokens and check overlap
        for tok in re.findall(r"\w+", kw.lower()):
            if tok in toks:
                score += 1
    return score

# -------------------------
# Mapping functions
# -------------------------
def map_courses_to_subskill(subskill: Dict[str, Any], courses: List[Dict[str, Any]], top_n: int = 3) -> List[str]:
    scored = []
    for c in courses:
        s = keyword_score(c["text"], subskill.get("keywords", []))
        if s > 0:
            scored.append((c["course_id"], s))
    scored.sort(key=lambda x: x[1], reverse=True)
    return [cid for cid, _ in scored[:top_n]]

def map_tutorials_to_subskill(subskill: Dict[str, Any], tutorials: List[Dict[str, Any]], mapped_course_ids: List[str]) -> List[str]:
    mapped = []
    for t in tutorials:
        if t["course_id"] in mapped_course_ids:
            s = keyword_score(t["text"], subskill.get("keywords", []))
            if s > 0:
                mapped.append(t["tutorial_id"])
    return mapped

# -------------------------
# Assessment rules (simple, rule-based)
# user_progress: dict course_id->percent_complete (0-100)
# -------------------------
def assess_subskill_level(user_progress: Dict[str, int], mapped_course_ids: List[str]) -> str:
    if not mapped_course_ids:
        return "Beginner"
    scores = [int(user_progress.get(cid, 0)) for cid in mapped_course_ids]
    if not scores:
        return "Beginner"
    max_score = max(scores)
    avg_score = sum(scores) / len(scores)
    if max_score >= 80 or avg_score >= 70:
        return "Advanced"
    if max_score >= 40 or avg_score >= 30:
        return "Intermediate"
    return "Beginner"

# -------------------------
# Roadmap generation
# -------------------------
def generate_base_roadmap(canonical_roadmap: Dict[str, Any],
                          course_rows: List[Dict[str, Any]],
                          tutorial_rows: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Generate roadmap where subskills are mapped using KB similarity (FAISS)
    instead of rule-based keyword matching.
    """
    base = {
        "job_role": canonical_roadmap.get("job_role"),
        "version": canonical_roadmap.get("version"),
        "subskills": []
    }

    for sub in canonical_roadmap.get("subskills", []):
        sub_name = sub.get("name", "")
        sub_keywords = sub.get("keywords", [])

        # --------------------------
        # 1. Query KB by subskill name
        # --------------------------
        kb_hits = query_kb_for_subskill(sub_name, topk=10)

        # Filter course/tutorial by type
        mapped_courses = [h["title"] for h in kb_hits if h["type"] == "course"][:3]
        mapped_tutorials = [h["title"] for h in kb_hits if h["type"] == "tutorials"][:5]

        # Fallback: if no KB hits, keep empty
        mapped_courses = mapped_courses or []
        mapped_tutorials = mapped_tutorials or []

        base["subskills"].append({
            "id": sub.get("id"),
            "name": sub_name,
            "keywords": sub_keywords,
            "mapped_courses": mapped_courses,
            "mapped_tutorials": mapped_tutorials,
            "description": "",
            "notes": "",
            "kb_hits": kb_hits  # optional for debugging
        })

    return base

def apply_assessment_to_roadmap(base_roadmap: Dict[str, Any], user_progress: Dict[str, int]) -> Dict[str, Any]:
    for s in base_roadmap.get("subskills", []):
        s["level"] = assess_subskill_level(user_progress, s.get("mapped_courses", []))
        # next_step suggestion (simple rule-based)
        if s["level"] == "Beginner":
            s["next_step"] = f"Mulai dari kursus: {s.get('mapped_courses')[0] if s.get('mapped_courses') else 'Cari kursus dasar'} dan selesaikan modul pengantar."
        elif s["level"] == "Intermediate":
            s["next_step"] = f"Lanjutkan ke kursus menengah dari daftar: {', '.join(s.get('mapped_courses', []))}."
        else:
            s["next_step"] = "Kerjakan project kecil untuk menguatkan konsep, lalu lanjutkan ke proyek tingkat mahir."
    return base_roadmap

# ===================================
# JOB ROLE INFERENCE
# ===================================

def infer_job_role_from_courses(active_courses: List[str]) -> Optional[str]:
    """
    Auto-detect job role based on courses user is taking.
    Returns job role string or None if no clear match.
    """
    if not active_courses:
        return None
    
    # Keywords untuk tiap job role
    role_keywords = {
        "Front-End Web Developer": [
            "web", "front-end", "frontend", "javascript", "js", 
            "react", "html", "css", "pemrograman web"
        ],
        "Backend Developer": [
            "backend", "back-end", "api", "server", "database", 
            "node", "express", "python", "django"
        ],
        "Mobile Developer": [
            "android", "mobile", "kotlin", "flutter", "ios", "swift"
        ],
        "AI Engineer": [
            "ai", "artificial intelligence", "machine learning", 
            "ml", "deep learning", "data science"
        ]
    }
    
    # Hitung score untuk setiap role
    scores = {role: 0 for role in role_keywords.keys()}
    
    for course in active_courses:
        course_lower = course.lower()
        for role, keywords in role_keywords.items():
            for keyword in keywords:
                if keyword in course_lower:
                    scores[role] += 1
    
    # Cari role dengan score tertinggi
    max_score = max(scores.values())
    
    # Jika semua score 0, return None
    if max_score == 0:
        return None
    
    # Return role dengan score tertinggi
    best_role = max(scores, key=scores.get)
    return best_role


# ===================================
# ROADMAP INITIALIZATION
# ===================================

def initialize_roadmap_progress(user_id: str, job_role: str) -> Dict[str, Any]:
    """
    Create empty roadmap progress structure for a user.
    This initializes all subskills with null levels.
    Tries multiple filename variants derived from job_role before failing.
    """
    def candidate_filenames(role: str):
        base = role.lower().replace(" ", "_").replace("-", "_")
        yield f"{base}_v1_enhanced.json"
        yield f"{base}_v1.json"
        yield f"{base}.json"

    # try candidate filenames
    canonical = None
    tried = []
    for fname in candidate_filenames(job_role):
        tried.append(fname)
        try:
            canonical = load_canonical_roadmap(fname)
            break
        except FileNotFoundError:
            continue

    if canonical is None:
        # optional: try a neutral default if you have one, otherwise raise
        neutral_defaults = ["front_end_v1.json", "ai_engineer_v1.json"]
        for nd in neutral_defaults:
            try:
                canonical = load_canonical_roadmap(nd)
                break
            except FileNotFoundError:
                continue

    if canonical is None:
        # Clear error so caller can handle it; include attempted filenames for debugging
        raise FileNotFoundError(f"No canonical roadmap found. Tried: {tried + neutral_defaults}")

    # Use job_role from canonical if it exists (keeps consistent naming)
    canonical_job_role = canonical.get("job_role") or job_role

    # Initialize empty skills_status
    skills_status = {}
    for subskill in canonical.get("subskills", []):
        skills_status[subskill["id"]] = {
            "level": None,  # Beginner/Intermediate/Advanced
            "status": "not_started",  # not_started/in_progress/completed
            "assessed_at": None,
            "progress_percent": 0  # 0-100, for adaptive thresholds
        }

    return {
        "job_role": canonical_job_role,
        "created_at": time.time(),
        "last_updated": time.time(),
        "skills_status": skills_status
    }
# / NEW AFTER THIS
def update_skill_progress_from_courses(profile: Dict[str, Any], canonical_roadmap: Dict[str, Any]) -> Dict[str, Any]:
    """
    Update progress_percent for each skill based on mapped course progress.
    
    For each skill, find its mapped_courses and get progress from course_progress.
    Use the highest progress value among mapped courses as the skill's progress.
    
    Args:
        profile: User profile dict with platform_data.course_progress
        canonical_roadmap: Roadmap dict with subskills and mapped_courses
    
    Returns:
        Updated roadmap_progress dict
    """
    course_progress = profile.get("platform_data", {}).get("course_progress", {})
    roadmap = profile.get("roadmap_progress", {})
    
    if not roadmap or not roadmap.get("skills_status"):
        return roadmap
    
    # For each skill, calculate progress from its mapped courses
    for subskill in canonical_roadmap.get("subskills", []):
        skill_id = subskill.get("id")
        mapped_courses = subskill.get("mapped_courses", [])
        
        if not skill_id or skill_id not in roadmap["skills_status"]:
            continue
        
        # Get progress values for all mapped courses
        progress_values = []
        for course in mapped_courses:
            # Try to find course in course_progress (by ID or name)
            course_prog = course_progress.get(str(course), 0)
            if course_prog is None:
                course_prog = 0
            progress_values.append(int(course_prog))
        
        # Use highest progress among mapped courses (user can pick fastest)
        skill_progress = max(progress_values) if progress_values else 0
        
        # Update skill with new progress
        roadmap["skills_status"][skill_id]["progress_percent"] = skill_progress
    
    roadmap["last_updated"] = time.time()
    return roadmap

# END
# ===================================
# SKILL ASSESSMENT
# ===================================

def update_skill_assessment(user_id: str, subskill_id: str, level: str) -> Dict[str, Any]:
    """
    Update user's self-assessed skill level.
    
    Args:
        user_id: User identifier
        subskill_id: e.g., "html_css_fundamentals"
        level: "Beginner", "Intermediate", or "Advanced"
    
    Returns:
        Updated roadmap_progress dict
    """
    valid_levels = ["Beginner", "Intermediate", "Advanced"]
    if level not in valid_levels:
        raise ValueError(f"Invalid level. Must be one of: {valid_levels}")
    
    # Load user profile
    profile_path = os.path.join(USER_PROFILES_DIR, f"{user_id}.json")
    
    if not os.path.exists(profile_path):
        raise FileNotFoundError(f"User profile not found: {user_id}")
    
    profile = load_json(profile_path)
    
    # Check if roadmap_progress exists
    if "roadmap_progress" not in profile:
        raise ValueError(
            "No roadmap initialized for this user. "
            "Call initialize_roadmap_progress first."
        )
    
    # Validate subskill_id
    if subskill_id not in profile["roadmap_progress"]["skills_status"]:
        available = list(profile["roadmap_progress"]["skills_status"].keys())
        raise ValueError(
            f"Invalid subskill_id: {subskill_id}. "
            f"Available: {available}"
        )
    
    # Update skill level
    profile["roadmap_progress"]["skills_status"][subskill_id] = {
        "level": level,
        "status": "in_progress",
        "assessed_at": time.time()
    }
    
    profile["roadmap_progress"]["last_updated"] = time.time()
    
    # Save profile
    save_json(profile_path, profile)
    
    return profile["roadmap_progress"]
#  NEW AFTER THIS

def auto_assess_skill_level_from_progress(profile: Dict[str, Any]) -> Dict[str, Any]:
    """
    ADAPTIVE: Auto-assess skill level based on progress_percent using simple thresholds.
    
    Rules:
    - 90%+ progress → Advanced
    - 70%+ progress → Intermediate  
    - <70% progress → Beginner
    
    This is the core of the adaptive roadmap.
    """
    roadmap = profile.get("roadmap_progress", {})
    
    if not roadmap or not roadmap.get("skills_status"):
        return roadmap
    
    # Apply thresholds to each skill
    for skill_id, skill_data in roadmap["skills_status"].items():
        progress = skill_data.get("progress_percent", 0)
        
        # Auto-determine level based on progress
        if progress >= 90:
            new_level = "Advanced"
        elif progress >= 70:
            new_level = "Intermediate"
        else:
            new_level = "Beginner"
        
        # Update level and status
        skill_data["level"] = new_level
        skill_data["assessed_at"] = time.time()
        
        # Update status based on progress
        if progress == 0:
            skill_data["status"] = "not_started"
        elif progress >= 100:
            skill_data["status"] = "completed"
        else:
            skill_data["status"] = "in_progress"
    
    roadmap["last_updated"] = time.time()
    return roadmap

# END
def mark_skill_completed(user_id: str, subskill_id: str) -> Dict[str, Any]:
    """Mark a skill as completed"""
    profile_path = os.path.join(USER_PROFILES_DIR, f"{user_id}.json")
    profile = load_json(profile_path)
    
    if "roadmap_progress" not in profile:
        raise ValueError("No roadmap initialized")
    
    if subskill_id not in profile["roadmap_progress"]["skills_status"]:
        raise ValueError(f"Invalid subskill_id: {subskill_id}")
    
    # Update status to completed
    profile["roadmap_progress"]["skills_status"][subskill_id]["status"] = "completed"
    profile["roadmap_progress"]["last_updated"] = time.time()
    
    save_json(profile_path, profile)
    return profile["roadmap_progress"]


def get_assessment_status(user_id: str) -> Dict[str, Any]:
    """
    Check assessment completion status.
    Returns how many skills have been assessed.
    """
    profile_path = os.path.join(USER_PROFILES_DIR, f"{user_id}.json")
    
    if not os.path.exists(profile_path):
        return {
            "assessed": 0,
            "total": 0,
            "percentage": 0,
            "complete": False,
            "error": "User profile not found"
        }
    
    profile = load_json(profile_path)
    
    if "roadmap_progress" not in profile:
        return {
            "assessed": 0,
            "total": 0,
            "percentage": 0,
            "complete": False,
            "error": "No roadmap initialized"
        }
    
    skills = profile["roadmap_progress"]["skills_status"]
    
    assessed = sum(1 for s in skills.values() if s["level"] is not None)
    total = len(skills)
    
    return {
        "assessed": assessed,
        "total": total,
        "percentage": int(assessed / total * 100) if total > 0 else 0,
        "complete": assessed == total,
        "job_role": profile["roadmap_progress"]["job_role"]
    }


def get_next_recommended_skill(user_id: str) -> Optional[str]:
    """
    Return the next skill user should focus on based on:
    1. Skills in progress (finish what you started)
    2. Skills not started yet (in priority order)
    """
    profile_path = os.path.join(USER_PROFILES_DIR, f"{user_id}.json")
    profile = load_json(profile_path)
    
    if "roadmap_progress" not in profile:
        return None
    
    skills = profile["roadmap_progress"]["skills_status"]
    
    # First: Check if there's any in_progress skill
    in_progress = [
        skill_id for skill_id, data in skills.items()
        if data["status"] == "in_progress"
    ]
    
    if in_progress:
        return in_progress[0]  # Return first in-progress skill
    
    # Second: Return first not_started skill
    not_started = [
        skill_id for skill_id, data in skills.items()
        if data["status"] == "not_started"
    ]
    
    if not_started:
        return not_started[0]
    
    # All skills completed!
    return None

# -------------------------
# Public function: build_personal_roadmap(user_id, course_rows, tutorial_rows)
# course_rows/tutorial_rows can come from your ETL of the excel -> list[dict]
# -------------------------
def build_personal_roadmap(user_id: str,
      course_rows: List[Dict[str, Any]],
      tutorial_rows: List[Dict[str, Any]],
      roadmap_filename: str = "ai_engineer_v1.json") -> Dict[str, Any]:
    """
    Build a personal roadmap for a user_id using:
      - canonical roadmap JSON (job role)
      - course_rows: list of course dicts (from excel)
      - tutorial_rows: list of tutorial dicts (from excel)
    The function will read user profile from app/user_profiles/{user_id}.json if exists to infer progress.
    """
    canonical = load_canonical_roadmap(roadmap_filename)
    base = generate_base_roadmap(canonical, course_rows, tutorial_rows)

    # load user profile progress if available
    user_profile_path = os.path.join(USER_PROFILES_DIR, f"{user_id}.json")
    user_progress = {}
    if os.path.exists(user_profile_path):
        try:
            user_profile = load_json(user_profile_path)
            # expect course_progress: dict course_id -> percent (0-100)
            user_progress = user_profile.get("platform_data", {}).get("course_progress", {})
            # ensure keys are strings for matching
            user_progress = {str(k): int(v) for k, v in user_progress.items()}
        except Exception:
            user_progress = {}
    else:
        # no profile: assume zero progress
        user_progress = {}

    personal = apply_assessment_to_roadmap(base, user_progress)
    personal["meta"] = {
        "user_id": user_id,
        "inferred_from_profile": bool(user_progress),
        "note": "Levels are inferred from course progress if available; otherwise default Beginner."
    }
    return personal

# -------------------------
# Small helper for quick testing (if run directly)
# -------------------------
if __name__ == "__main__":
    # simple demo using the sample courses/tutorials you provided
    sample_courses = [
        {"course_id": 1, "learning_path_id": 1, "course_name": "Belajar Dasar AI", "course_level_str": "1", "hours_to_study": 10},
        {"course_id": 2, "learning_path_id": 1, "course_name": "Belajar Fundamental Deep Learning", "course_level_str": "3", "hours_to_study": 110},
        {"course_id": 3, "learning_path_id": 1, "course_name": "Belajar Machine Learning untuk Pemula", "course_level_str": "2", "hours_to_study": 90},
        {"course_id": 4, "learning_path_id": 1, "course_name": "Machine Learning Terapan", "course_level_str": "4", "hours_to_study": 80},
        {"course_id": 5, "learning_path_id": 1, "course_name": "Membangun Proyek Deep Learning Tingkat Mahir", "course_level_str": "4", "hours_to_study": 90}
    ]
    sample_tutorials = [
        {"tutorial_id": 1, "course_id": 1, "tutorial_title": "Taksonomi AI"},
        {"tutorial_id": 2, "course_id": 1, "tutorial_title": "[Story] Machine Learning: Harapan menjadi kenyataan"},
        {"tutorial_id": 3, "course_id": 1, "tutorial_title": "Rangkuman Kelas"},
        {"tutorial_id": 4, "course_id": 1, "tutorial_title": "Tipe-Tipe Machine Learning"},
        {"tutorial_id": 5, "course_id": 1, "tutorial_title": "Forum Diskusi"}
    ]
    print(json.dumps(build_personal_roadmap("b64852a0-24a2-4731-830b-9314db2b13ca", sample_courses, sample_tutorials), indent=2, ensure_ascii=False))


# ===================================
# ADAPTIVE ROADMAP UPDATES & PERSISTENCE
# ===================================

def get_current_roadmap_progress(user_id: str) -> Dict[str, Any]:
    """Retrieve current roadmap progress for a user from their profile."""
    profile_path = os.path.join(USER_PROFILES_DIR, f"{user_id}.json")
    if not os.path.exists(profile_path):
        return {}
    try:
        profile = load_json(profile_path)
        return profile.get("roadmap_progress", {})
    except Exception as e:
        print(f"Error retrieving roadmap progress: {e}")
        return {}


def auto_assess_skills_from_progress(user_id: str, course_rows: List[Dict[str, Any]]) -> Dict[str, str]:
    """Automatically assess each skill/subskill based on current course progress.

    Returns mapping subskill_id -> assessed_level (Beginner/Intermediate/Advanced).
    Uses user's course_progress in profile to infer skill levels.
    """
    profile_path = os.path.join(USER_PROFILES_DIR, f"{user_id}.json")
    if not os.path.exists(profile_path):
        return {}

    try:
        profile = load_json(profile_path)
    except Exception:
        return {}

    user_progress = profile.get("platform_data", {}).get("course_progress", {}) or {}
    user_progress = {str(k): int(v) for k, v in user_progress.items()}

    # Get roadmap structure
    roadmap_progress = profile.get("roadmap_progress", {})
    if not roadmap_progress:
        return {}

    canonical_filename = roadmap_progress.get("meta", {}).get("filename") or "front_end_v1.json"
    try:
        canonical = load_canonical_roadmap(canonical_filename)
    except Exception:
        canonical = None

    assessments = {}
    if canonical:
        for subskill in canonical.get("subskills", []):
            sid = subskill.get("id")
            # Get mapped courses for this subskill (simplified: take from canonical keywords)
            level = assess_subskill_level(user_progress, subskill.get("mapped_courses", []))
            assessments[sid] = level

    return assessments


def generate_adaptive_next_step(subskill: Dict[str, Any], level: str, course_names: List[str]) -> str:
    """Generate a context-aware next step recommendation based on current level.

    Args:
        subskill: subskill dict with id, name, etc.
        level: current assessed level (Beginner/Intermediate/Advanced)
        course_names: list of mapped course names for this subskill
    
    Returns:
        Natural-language next step recommendation
    """
    name = subskill.get("name", "this skill")

    if level == "Beginner":
        if course_names:
            return f"Mulai dengan kursus '{course_names[0]}' dan fokus pada konsep dasar {name.lower()}."
        return f"Cari kursus level pemula untuk membangun fondasi {name.lower()}."

    elif level == "Intermediate":
        if len(course_names) > 1:
            next_course = course_names[1] if len(course_names) > 1 else course_names[0]
            return f"Lanjutkan dengan '{next_course}' untuk memperdalam {name.lower()} ke level mahir."
        return f"Ambil project praktis untuk memperkuat pemahaman {name.lower()} di level menengah."

    else:  # Advanced
        return f"Buat project real-world menggunakan {name.lower()} dan pertimbangkan untuk berkontribusi di komunitas atau mentoring others."


def update_roadmap_skill_level(user_id: str, subskill_id: str, new_level: str, notes: str = "") -> Dict[str, Any]:
    """Update a specific subskill's level and status in the roadmap.

    Args:
        user_id: user identifier
        subskill_id: id of the subskill to update
        new_level: Beginner/Intermediate/Advanced
        notes: optional notes about the assessment

    Returns:
        Updated roadmap_progress dict, or empty dict on error
    """
    valid_levels = ["Beginner", "Intermediate", "Advanced"]
    if new_level not in valid_levels:
        print(f"Invalid level: {new_level}. Must be one of {valid_levels}")
        return {}

    profile_path = os.path.join(USER_PROFILES_DIR, f"{user_id}.json")
    if not os.path.exists(profile_path):
        print(f"User profile not found: {user_id}")
        return {}

    try:
        profile = load_json(profile_path)
    except Exception as e:
        print(f"Error loading profile: {e}")
        return {}

    roadmap_progress = profile.get("roadmap_progress", {})
    if not roadmap_progress:
        print(f"No roadmap initialized for user {user_id}")
        return {}

    skills_status = roadmap_progress.get("skills_status", {})
    if subskill_id not in skills_status:
        print(f"Subskill not found in roadmap: {subskill_id}")
        return {}

    # Update the skill
    skills_status[subskill_id] = {
        "level": new_level,
        "status": "in_progress" if new_level != "Advanced" else "completed",
        "assessed_at": time.time(),
        "notes": notes
    }

    roadmap_progress["last_updated"] = time.time()
    profile["roadmap_progress"] = roadmap_progress

    try:
        save_json(profile_path, profile)
        print(f"✓ Updated skill {subskill_id} to {new_level}")
        return roadmap_progress
    except Exception as e:
        print(f"Error saving profile: {e}")
        return {}


def auto_update_roadmap_from_progress(user_id: str, course_rows: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Automatically update all skills in roadmap based on current course progress.

    This is called periodically or after course updates to reflect new skill levels.
    Returns updated roadmap_progress.
    """
    profile_path = os.path.join(USER_PROFILES_DIR, f"{user_id}.json")
    if not os.path.exists(profile_path):
        return {}

    try:
        profile = load_json(profile_path)
    except Exception as e:
        print(f"Error loading profile: {e}")
        return {}

    roadmap_progress = profile.get("roadmap_progress", {})
    if not roadmap_progress:
        print(f"No roadmap for user {user_id}")
        return {}

    # Get current course progress
    user_progress = profile.get("platform_data", {}).get("course_progress", {}) or {}
    user_progress = {str(k): int(v) for k, v in user_progress.items()}

    # Get canonical roadmap
    canonical_filename = roadmap_progress.get("meta", {}).get("filename") or "front_end_v1.json"
    try:
        canonical = load_canonical_roadmap(canonical_filename)
    except Exception:
        print(f"Could not load canonical roadmap: {canonical_filename}")
        return roadmap_progress

    # For each subskill, auto-assess and update
    skills_status = roadmap_progress.get("skills_status", {})
    update_count = 0

    for subskill in canonical.get("subskills", []):
        sid = subskill.get("id")
        if sid not in skills_status:
            continue

        # Assess level based on mapped courses
        mapped_course_ids = subskill.get("mapped_courses", [])
        new_level = assess_subskill_level(user_progress, mapped_course_ids)

        # Only update if level changed
        old_level = skills_status[sid].get("level")
        if new_level != old_level:
            skills_status[sid]["level"] = new_level
            skills_status[sid]["status"] = "in_progress" if new_level != "Advanced" else "completed"
            skills_status[sid]["assessed_at"] = time.time()
            update_count += 1
            print(f"✓ Auto-updated {sid}: {old_level} → {new_level}")

    roadmap_progress["last_updated"] = time.time()
    profile["roadmap_progress"] = roadmap_progress

    try:
        save_json(profile_path, profile)
        print(f"✓ Roadmap updated for user {user_id} ({update_count} changes)")
        return roadmap_progress
    except Exception as e:
        print(f"Error saving profile: {e}")
        return roadmap_progress


def get_adaptive_recommendations(user_id: str, course_rows: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Generate adaptive recommendations based on current roadmap progress.

    Returns:
        Dict with recommended_next_skill, in_progress_skills, completed_skills, summary
    """
    profile_path = os.path.join(USER_PROFILES_DIR, f"{user_id}.json")
    if not os.path.exists(profile_path):
        return {"error": "Profile not found"}

    try:
        profile = load_json(profile_path)
    except Exception:
        return {"error": "Could not load profile"}

    roadmap_progress = profile.get("roadmap_progress", {})
    if not roadmap_progress:
        return {"error": "No roadmap initialized"}

    # Load canonical roadmap for course names
    canonical_filename = roadmap_progress.get("meta", {}).get("filename") or "front_end_v1.json"
    try:
        canonical = load_canonical_roadmap(canonical_filename)
    except Exception:
        canonical = {}

    # Build mapping of skill id -> name and courses
    skill_map = {}
    for s in canonical.get("subskills", []):
        skill_map[s.get("id")] = {
            "name": s.get("name"),
            "keywords": s.get("keywords", []),
            "mapped_courses": s.get("mapped_courses", [])
        }

    # Categorize skills
    skills_status = roadmap_progress.get("skills_status", {})
    completed = []
    in_progress = []
    not_started = []

    for sid, data in skills_status.items():
        status = data.get("status", "not_started")
        level = data.get("level")
        skill_info = skill_map.get(sid, {"name": sid})

        if status == "completed" or level == "Advanced":
            completed.append({"id": sid, "name": skill_info["name"], "level": level})
        elif status == "in_progress":
            in_progress.append({"id": sid, "name": skill_info["name"], "level": level})
        else:
            not_started.append({"id": sid, "name": skill_info["name"], "level": level})

    # Recommend next skill
    recommended_next = None
    if in_progress:
        recommended_next = in_progress[0]  # Continue with first in-progress
    elif not_started:
        recommended_next = not_started[0]  # Or start with first not-started

    return {
        "completed_skills": completed,
        "in_progress_skills": in_progress,
        "not_started_skills": not_started,
        "recommended_next_skill": recommended_next,
        "total_progress_percent": int(len(completed) / len(skills_status) * 100) if skills_status else 0,
        "job_role": roadmap_progress.get("job_role", "")
    }
