import time
import numpy as np
import pandas as pd
from typing import Dict, Any, List
from groq import Groq
import json
import os
from .config import GROQ_API_KEY, SBERT_MODEL_PATH, DEFAULT_TOPK, ARTIFACTS_DIR
from .embeddings_utils import load_kb, load_faiss, get_model
from .intent_model import IntentPipeline
from .logger import log_query
import re

from .roadmap_engine import (
    build_personal_roadmap,
    generate_base_roadmap,
    load_canonical_roadmap,
    normalize_courses,
    normalize_tutorials,
    map_courses_to_subskill,
    assess_subskill_level,
    apply_assessment_to_roadmap,
    initialize_roadmap_progress,
    save_json,
    update_skill_progress_from_courses,
    auto_assess_skill_level_from_progress,
)

from .roadmap_kb_engine import kb_based_roadmap


# Init Groq client (LLama 3 API)
client = Groq(api_key=GROQ_API_KEY)

# Lazy-loaded artifacts
_kb = None
_index = None
_intent = None
_model = None

BASE_DIR = os.path.dirname(__file__)
ARTIFACTS_DIR = os.path.join(BASE_DIR, "artifacts")

# ============================================
# CONVERSATION MEMORY MANAGEMENT
# ============================================
conversation_history = {}
MAX_HISTORY_TURNS = 5

def add_to_history(user_id: str, role: str, content: str):
    """Add message to conversation history"""
    if user_id not in conversation_history:
        conversation_history[user_id] = []
    
    conversation_history[user_id].append({
        "role": role,
        "content": content,
        "timestamp": time.time()
    })
    
    if len(conversation_history[user_id]) > MAX_HISTORY_TURNS * 2:
        # Remove oldest messages, keeping the most recent
        conversation_history[user_id] = conversation_history[user_id][-MAX_HISTORY_TURNS * 2:]

def get_conversation_context(user_id: str) -> str:
    """Build conversation context from history"""
    if user_id not in conversation_history:
        return ""
    
    history = conversation_history[user_id]
    if not history:
        return ""
    
    context_lines = []
    for msg in history[-6:]:
        role_label = "User" if msg["role"] == "user" else "Assistant"
        context_lines.append(f"{role_label}: {msg['content']}")
    
    return "\n".join(context_lines)

# ============================================
# USER PROFILE MANAGEMENT - FIXED VERSION
# ============================================

# ===============================
# ETL LOADER PLACEHOLDERS
# ===============================
# Kamu ganti dengan loader CSV/Excel milikmu
def load_my_courses():
    """Load courses from Excel file with error handling."""
    path = os.path.join(BASE_DIR, "data", "courses.xlsx")
    if not os.path.exists(path):
        print(f"⚠️ WARNING: Courses file not found at {path}")
        return []
    
    try:
        df = pd.read_excel(path, sheet_name="Course")  # sesuaikan sheet_name
        records = df.to_dict(orient="records")

        return [
            {
                "course_id": str(r["course_id"]),
                "learning_path_id": str(r["learning_path_id"]),
                "course_name": r["course_name"],
                "course_level_str": str(r["course_level_str"]),
                "hours_to_study": int(r["hours_to_study"])
            }
            for r in records
        ]
    except Exception as e:
        print(f"❌ Error loading courses: {e}")
        return []

def load_my_tutorials():
    """Load tutorials from Excel file with error handling."""
    path = os.path.join(BASE_DIR, "data", "tutorials.xlsx")
    if not os.path.exists(path):
        print(f"⚠️ WARNING: Tutorials file not found at {path}")
        return []
    
    try:
        df = pd.read_excel(path, sheet_name="Tutorials")  # sesuaikan sheet_name
        records = df.to_dict(orient="records")

        return [
            {
                "tutorial_id": str(r["tutorial_id"]),
                "course_id": str(r["course_id"]),
                "tutorial_title": r["tutorial_title"]
            }
            for r in records
        ]
    except Exception as e:
        print(f"❌ Error loading tutorials: {e}")
        return []

def summarize_roadmap(roadmap: Dict[str, Any]) -> str:
    """
    Kembalikan ringkasan roadmap untuk dipakai LLM.
    Hanya 1-2 informasi penting per subskill agar tidak membebani prompt tokens.
    """
    lines = []
    for s in roadmap.get("subskills", []):
        sub_name = s.get("name", "")
        level = s.get("level", "Beginner")
        mapped = s.get("mapped_courses", [])
        top_course = mapped[0] if mapped else "-"
        lines.append(f"- {sub_name}: {level} → rekomendasi kursus {top_course}")
    return "\n".join(lines)

def load_user_profile(user_id: str):
    """Load user profile from JSON with error tracking."""
    user_dir = os.path.join(BASE_DIR, "user_profiles")
    if not os.path.exists(user_dir):
        print(f"⚠️ WARNING: User profiles directory not found at {user_dir}")
        return None
    path = os.path.join(user_dir, f"{user_id}.json")
    if not os.path.exists(path):
        print(f"⚠️ WARNING: No profile file for user {user_id}")
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            profile = json.load(f)
            if not isinstance(profile, dict):
                print(f"❌ ERROR: Profile for {user_id} is not a valid dict")
                return None
            return profile
    except json.JSONDecodeError as e:
        print(f"❌ ERROR: Corrupted JSON in profile {user_id}: {e}")
        return None
    except Exception as e:
        print(f"❌ ERROR: Failed to load user profile {user_id}: {e}")
        return None

def build_strict_user_facts(profile: Dict) -> Dict[str, Any]:
    """
    Extract ONLY factual data from user profile.
    This is the SINGLE SOURCE OF TRUTH.
    """
    if not profile:
        return {}
    
    lp = profile.get("learning_profile", {})
    plat = profile.get("platform_data", {})
    
    # Extract EXACT data
    facts = {
        "user_id": profile.get("user_id", ""),
        "name": plat.get("name", ""),
        "email": plat.get("email", ""),
        
        # CRITICAL: Active courses - MUST be exact
        "active_courses": plat.get("active_courses", []),
        
        # Progress metrics
        "active_tutorials": plat.get("active_tutorials", 0),
        "completed_tutorials": plat.get("completed_tutorials", 0),
        "is_graduated": plat.get("is_graduated", 0),
        
        # Current focus
        "current_course": lp.get("current_focus", {}).get("course"),
        "current_module": lp.get("current_focus", {}).get("module", 0),
        
        # Learning profile
        "goals": lp.get("goals", []),
        "skills": lp.get("skills", {}),
        "weaknesses": lp.get("weaknesses", []),
        "strengths": lp.get("strengths", []),
        "learning_style": lp.get("learning_style"),
        "progress_score": lp.get("progress_score", {}),
    }
    
    return facts

def format_user_facts_for_llm(facts: Dict) -> str:
    """Format user facts in natural, conversational way"""
    if not facts:
        return "No user information available."
    
    lines = []
    
    # Name (if available)
    if facts.get("name"):
        lines.append(f"Student: {facts['name']}")
    
    # Current courses in natural language
    courses = facts.get("active_courses", [])
    if courses:
        if len(courses) == 1:
            lines.append(f"Currently enrolled in: {courses[0]}")
        else:
            lines.append(f"Currently enrolled in {len(courses)} courses:")
            for course in courses:
                lines.append(f"  - {course}")
    
    # Current focus
    current_course = facts.get("current_course")
    current_module = facts.get("current_module")
    if current_course:
        lines.append(f"\nFocusing on: {current_course} (Module {current_module})")
    
    # Progress highlights
    completed = facts.get("completed_tutorials", 0)
    active = facts.get("active_tutorials", 0)
    if completed > 0 or active > 0:
        lines.append(f"\nProgress: {completed} tutorials completed, {active} in progress")
    
    # Progress scores (only if meaningful)
    progress_scores = facts.get("progress_score", {})
    if progress_scores:
        lines.append("\nCourse progress:")
        for course, score in progress_scores.items():
            lines.append(f"  - {course}: {score}%")
    
    # Skills (casual mention)
    skills = facts.get("skills", {})
    if skills:
        skill_list = [f"{k} ({v})" for k, v in skills.items()]
        lines.append(f"\nSkills: {', '.join(skill_list)}")
    
    # Areas to improve (only if set)
    weaknesses = facts.get("weaknesses", [])
    if weaknesses:
        lines.append(f"Working on: {', '.join(weaknesses)}")
    
    return "\n".join(lines)

# ============================================
# KNOWLEDGE BASE
# ============================================
def _ensure_loaded():
    """Lazy-load all required artifacts with validation."""
    global _kb, _index, _intent, _model
    try:
        if _kb is None:
            _kb = load_kb()
            if _kb is None or _kb.empty:
                raise RuntimeError("Knowledge base failed to load or is empty")
        if _index is None:
            _index = load_faiss()
            if _index is None:
                raise RuntimeError("FAISS index failed to load")
        if _intent is None:
            intent_path = os.path.join(ARTIFACTS_DIR, "intent_pipe.joblib")
            if not os.path.exists(intent_path):
                raise FileNotFoundError(f"Intent model not found at {intent_path}")
            _intent = IntentPipeline(path=intent_path)
        if _model is None:
            _model = get_model(SBERT_MODEL_PATH)
            if _model is None:
                raise RuntimeError("Embedding model failed to load")
    except Exception as e:
        print(f"❌ CRITICAL: Artifact loading failed: {e}")
        raise

# ============================================
# SYSTEM PROMPT 
# ============================================
def build_system_prompt(user_facts_text: str, conversation_context: str, has_profile: bool = True) -> str:
    """Build system prompt for LLM with user context and communication style."""
    prompt = f"""You are Learning Buddy, a supportive tutor for Dicoding students.

    ## Communication Style
    - Casual Indonesian (like WhatsApp chat)
    - Start with 2-3 sentences, expand if asked
    - Vary your greetings (don't always say "Halo!")
    - Match user's mood: confused → step-by-step, excited → celebrate then guide

    ## Student Info
    {user_facts_text}

    ## Rules
    1. ONLY mention courses from student's active_courses list
    2. For off-topic questions: briefly acknowledge → redirect to learning
    3. If unsure: "Aku kurang yakin, tapi untuk [related topic] aku bisa bantu"
    4. DON'T say: "Berdasarkan profil Anda..." or "Maaf, saya tidak bisa..."

    ## Recent Chat
    {conversation_context if conversation_context else "(New conversation)"}
    """
    return prompt

# ============================================
# RESPONSE VALIDATION
# ============================================
def validate_response_against_profile(response: str, user_facts: Dict) -> str:
    """
    Validate LLM response to ensure it doesn't contradict user profile.
    This is a SAFETY NET to catch hallucinations.
    """
    if not user_facts or not user_facts.get("active_courses"):
        return response
    
    actual_courses = user_facts["active_courses"]
    
    # Find all potential course names mentioned in response
    # Pattern: "Belajar [words]" atau "Memulai [words]" - but NOT when combined with "dan"
    course_patterns = [
        r'Belajar[^,.\n!?dan]+(?=\s|,|\.|\n|$)',
        r'Memulai[^,.\n!?dan]+(?=\s|,|\.|\n|$)',
        r'Menjadi[^,.\n!?dan]+(?=\s|,|\.|\n|$)'
    ]
    
    mentioned_courses = set()
    for pattern in course_patterns:
        matches = re.findall(pattern, response)
        mentioned_courses.update(matches)
    
    # Clean up whitespace and trailing words
    mentioned_courses = {c.strip().rstrip(',') for c in mentioned_courses}
    actual_courses_set = {c.strip() for c in actual_courses}
    
    # Filter out partial matches (e.g., if full course name exists, remove partial)
    filtered_mentioned = set()
    for mentioned in mentioned_courses:
        # Check if this is actually a valid course or just part of a phrase
        is_valid_mention = any(
            mentioned in actual_course or actual_course in mentioned
            for actual_course in actual_courses_set
        )
        if is_valid_mention:
            filtered_mentioned.add(mentioned)
        else:
            # Check if it's genuinely a course name (has typical course structure)
            if len(mentioned.split()) >= 3:  # Course names usually have 3+ words
                filtered_mentioned.add(mentioned)
    
    # Check for hallucinated courses
    hallucinated = set()
    for mentioned in filtered_mentioned:
        # Check if this mentioned course is NOT in the actual courses
        is_valid = any(
            mentioned.strip() == actual.strip() or 
            mentioned.strip() in actual.strip() or
            actual.strip() in mentioned.strip()
            for actual in actual_courses_set
        )
        if not is_valid:
            hallucinated.add(mentioned)
    
    if hallucinated:
        print(f"⚠️ WARNING: Potential hallucinated courses detected: {hallucinated}")
        print(f"✓ Valid courses in profile: {actual_courses_set}")
        
        # Verify these are actually false positives by checking context
        real_hallucinations = set()
        for fake_course in hallucinated:
            # Skip if it's too short or generic
            if len(fake_course.split()) < 3:
                continue
            # Skip if it contains "dan" (likely a conjunction artifact)
            if " dan " in fake_course.lower():
                continue
            real_hallucinations.add(fake_course)
        
        if real_hallucinations:
            print(f"❌ CONFIRMED HALLUCINATIONS: {real_hallucinations}")
            
            # AGGRESSIVE REMOVAL: Replace entire sentence containing hallucination
            for fake_course in real_hallucinations:
                sentences = re.split(r'([.!?\n]+)', response)
                filtered_sentences = []
                
                for i in range(0, len(sentences), 2):
                    sentence = sentences[i] if i < len(sentences) else ""
                    delimiter = sentences[i+1] if i+1 < len(sentences) else ""
                    
                    if fake_course not in sentence:
                        filtered_sentences.append(sentence + delimiter)
                
                response = "".join(filtered_sentences).strip()
            
            # If response is now empty or too short, provide correct info
            if len(response.strip()) < 20 and actual_courses:
                course_list = ", ".join(actual_courses)
                response = f"Kamu saat ini sedang mengambil: {course_list}"
            elif len(response.strip()) < 20:
                response = "Aku kurang yakin dengan pertanyaan itu. Coba tanya yang lain ya!"
        else:
            print("✓ False alarm - no real hallucinations detected")
    
    return response


# --------------------------------------------
# Job-description -> job role / subskill inference
# --------------------------------------------
def _tokenize(text: str) -> set:
    return set(re.findall(r"\w+", (text or "").lower()))


def infer_job_role_from_text(job_text: str) -> Dict[str, Any]:
    """Infer best-matching canonical roadmap from a free-form job description.

    Returns dict with keys: filename, job_role, canonical (or None if not found)
    """
    rd_dir = os.path.join(BASE_DIR, "roadmap")
    if not os.path.isdir(rd_dir):
        return {"filename": None, "job_role": None, "canonical": None}

    job_tokens = _tokenize(job_text)
    best = {"score": 0, "filename": None, "job_role": None, "canonical": None}

    for fname in os.listdir(rd_dir):
        if not fname.endswith(".json"):
            continue
        path = os.path.join(rd_dir, fname)
        try:
            with open(path, "r", encoding="utf-8") as f:
                canonical = json.load(f)
        except Exception:
            continue

        # score by overlap with job_role name
        role_name = (canonical.get("job_role") or "").lower()
        score = len(job_tokens & _tokenize(role_name))

        # score by overlap with subskill names and keywords
        for s in canonical.get("subskills", []):
            score += len(job_tokens & _tokenize(s.get("name", "")))
            for kw in s.get("keywords", []):
                score += len(job_tokens & _tokenize(kw))

        if score > best["score"]:
            best.update({"score": score, "filename": fname, "job_role": canonical.get("job_role"), "canonical": canonical})

    # require at least 1 token match to be considered a match
    if best["score"] <= 0:
        return {"filename": None, "job_role": None, "canonical": None}
    return {"filename": best["filename"], "job_role": best["job_role"], "canonical": best["canonical"]}


def ensure_minimum_subskills(roadmap: Dict[str, Any], minimum: int = 6) -> Dict[str, Any]:
    """Ensure roadmap has at least `minimum` subskills by padding if necessary."""
    subs = roadmap.get("subskills", [])
    if len(subs) >= minimum:
        return roadmap

    # Pad by repeating existing subskills with suffix notes
    padded = list(subs)
    i = 0
    while len(padded) < minimum and subs:
        base = subs[i % len(subs)]
        new = base.copy()
        new_id = f"{base.get('id')}_extra_{i}"
        new["id"] = new_id
        new["name"] = f"{base.get('name')} (area tambahan {i+1})"
        padded.append(new)
        i += 1

    # If no subs at all, create generic placeholders
    if not padded:
        for j in range(minimum):
            padded.append({"id": f"gen_{j}", "name": f"Skill {j+1}", "keywords": [], "mapped_courses": [], "mapped_tutorials": []})

    roadmap["subskills"] = padded
    return roadmap


def handle_job_description_flow(user_id: str, job_text: str) -> Dict[str, Any]:
    """High-level flow: KB-first minimal approach for adaptive roadmap.
    
    Uses KB-based roadmap as PRIMARY source.
    Fully compatible with adaptive thresholds (70%/90%).
    """
    # Initialize inferred early to avoid UnboundLocalError
    inferred = {"canonical": None, "filename": None}
    
    course_rows = load_my_courses()
    tutorial_rows = load_my_tutorials()
    
    # KB-FIRST: Always try KB first (minimal approach)
    base = kb_based_roadmap(job_text)
    job_role = base.get("job_role", "Recommended Role")
    
    # If KB returns insufficient results, try canonical fallback
    if not base.get("subskills") or len(base.get("subskills", [])) < 3:
        inferred = infer_job_role_from_text(job_text)
        canonical = inferred.get("canonical")
        
        if canonical:
            base = generate_base_roadmap(canonical, course_rows, tutorial_rows)
            job_role = inferred.get("job_role") or job_role



    # Ensure at least 6 subskills
    base = ensure_minimum_subskills(base, minimum=6)

    # Build user progress mapping
    profile = load_user_profile(user_id) or {}
    user_progress = profile.get("platform_data", {}).get("course_progress", {}) or {}
    user_progress = {str(k): int(v) for k, v in user_progress.items()} if user_progress else {}

    # Cross-check declared skills in profile
    declared_skills = (profile.get("learning_profile", {}).get("skills") or {})

    # Assess each subskill
    courses_norm = normalize_courses(course_rows)
    course_id_to_name = {c["course_id"]: c["course_name"] for c in courses_norm}

    for s in base.get("subskills", []):
        mapped_course_ids = s.get("mapped_courses", [])
        # If user declared skill level for this subskill name, prefer that
        declared_level = None
        for dk in declared_skills.keys():
            if dk.lower() in s.get("name", "").lower() or s.get("name", "").lower() in dk.lower():
                declared_level = declared_skills.get(dk)
                break

        if declared_level:
            level = declared_level if declared_level in ["Beginner", "Intermediate", "Advanced"] else assess_subskill_level(user_progress, mapped_course_ids)
        else:
            level = assess_subskill_level(user_progress, mapped_course_ids)

        s["level"] = level
        # Map course ids to names for user-friendly output
        # For KB-based IDs (kb_xx), extract from original KB; otherwise use course_id_to_name mapping
        mapped_names = []
        for cid in mapped_course_ids:
            if str(cid).startswith('kb_'):
                # Extract KB index from kb_xx format
                try:
                    kb_idx = int(str(cid).replace('kb_', ''))
                    kb_title = _kb.iloc[kb_idx]['title'] if kb_idx < len(_kb) else str(cid)
                    mapped_names.append(kb_title)
                except:
                    mapped_names.append(str(cid))
            else:
                mapped_names.append(course_id_to_name.get(str(cid), str(cid)))
        
        s["mapped_course_names"] = mapped_names
        # Suggest next step
        if level == "Beginner":
            s["next_step"] = f"Mulai dari kursus: {s['mapped_course_names'][0] if s['mapped_course_names'] else 'Cari kursus dasar'}"
        elif level == "Intermediate":
            s["next_step"] = f"Lanjutkan ke kursus menengah: {', '.join(s['mapped_course_names']) if s['mapped_course_names'] else 'Cari kursus menengah'}"
        else:
            s["next_step"] = "Kerjakan project praktik dan kontribusi untuk memperkuat skill ini."

    # Persist roadmap progress into user profile (initialize if needed)
    profile_path = os.path.join(BASE_DIR, "user_profiles", f"{user_id}.json")
    try:
        if not profile:
            profile = {"user_id": user_id, "platform_data": {}, "learning_profile": {}}

        # Build roadmap_progress structure from base roadmap (KB or canonical)
        # IMPORTANT: Use base directly, don't call initialize_roadmap_progress()
        # because it tries to load from JSON files and may override KB-generated data
        roadmap_progress = {
            "job_role": base.get("job_role", job_role),
            "created_at": time.time(),
            "last_updated": time.time(),
            "skills_status": {s.get("id"): {
                "level": s.get("level"), 
                "status": "in_progress", 
                "assessed_at": time.time(),
                "progress_percent": 0
            } for s in base.get("subskills", [])}
        }

        profile["roadmap_progress"] = roadmap_progress
        
        # ADAPTIVE: Update progress_percent from course_progress and auto-assess levels
        update_skill_progress_from_courses(profile, base)
        auto_assess_skill_level_from_progress(profile)
        
        # Save profile back
        save_json(profile_path, profile)
    except Exception as e:
        print(f"⚠️ Warning: failed to persist roadmap into profile: {e}")

    # Build human-readable summary
    summary_lines = [f"Rekomendasi peran: {base.get('job_role', job_role)}"]
    for s in base.get("subskills", []):
        summary_lines.append(f"- {s.get('name')}: {s.get('level')} → {s.get('next_step')}")

    result = {
    "job_role": base.get("job_role", job_role),
    "subskills": base.get("subskills", []),
    "summary": "\n".join(summary_lines),
    "meta": {
        "generated_from_job_text": bool(inferred.get("canonical")) if inferred else False,
        "filename": inferred.get("filename") if inferred else None
        }
    }

    return result

# ============================================
# MAIN QUERY HANDLER - FIXED
# ============================================
def call_llama_chat(system: str, user: str, model: str = "llama-3.1-8b-instant") -> str:
    """Call Groq Llama 3 ChatCompletion API.
    
    Args:
        system: System prompt for model context
        user: User message/query
        model: Model ID to use (default: llama-3.1-8b-instant)
    
    Returns:
        LLM response text
    
    Raises:
        Exception: If API call fails
    """
    if not system or not user:
        raise ValueError("System and user prompts cannot be empty")
    
    try:
        resp = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            max_tokens=512,
            temperature=0.6,  
            top_p=0.9, 
        )
        return resp.choices[0].message.content

    except Exception as e:
        print(f"❌ LLM API Error: {str(e)[:100]}")
        raise

def get_available_job_roles() -> List[str]:
    """Dynamically load available job roles from canonical roadmap files."""
    rd_dir = os.path.join(BASE_DIR, "roadmap")
    roles = []
    try:
        if os.path.isdir(rd_dir):
            for fname in os.listdir(rd_dir):
                if fname.endswith(".json"):
                    path = os.path.join(rd_dir, fname)
                    try:
                        with open(path, "r", encoding="utf-8") as f:
                            data = json.load(f)
                            job_role = data.get("job_role")
                            if job_role and job_role not in roles:
                                roles.append(job_role)
                    except Exception:
                        pass
    except Exception:
        pass
    return roles


def has_learning_profile_data(profile):
    """Check if profile has meaningful learning data (goals, focus, skills, roadmap, etc.)."""
    if not profile:
        return False
    
    lp = profile.get("learning_profile", {})
    rp = profile.get("roadmap_progress")
    
    # Return True if ANY of these exist:
    # 1. Has goals defined
    # 2. Has current focus (course/module)
    # 3. Has skills assessed
    # 4. Has roadmap generated
    return bool(
        lp.get("goals") or
        lp.get("current_focus") or
        lp.get("skills") or
        rp
    )


def has_been_profiled(profile):
    """Check if user has already gone through initial profiling (marker flag)."""
    lp = profile.get("learning_profile", {})
    return lp.get("_profiled", False)


async def handle_query(user_id: str, text: str, topk: int = DEFAULT_TOPK, faissK: int = 30) -> Dict[str, Any]:
    """Handle user query with profile context, intent detection, and KB search.
    
    Args:
        user_id: Unique user identifier
        text: User's query text
        topk: Number of KB results to include in context
        faissK: Number of FAISS results to retrieve before scoring
    
    Returns:
        Dict with response, intent, sources, and metadata
    """
    # Validate inputs
    if not user_id or not isinstance(user_id, str):
        raise ValueError("user_id must be a non-empty string")
    if not text or not isinstance(text, str):
        raise ValueError("text must be a non-empty string")
    
    # Sanitize text input
    text = text.strip()[:2000]  # Limit to 2000 chars
    
    _ensure_loaded()
    start = time.time()

    # ---------------------------
    # 1. Load user profile - STRICT MODE
    # ---------------------------
    
    profile = load_user_profile(user_id)

    profile = ensure_course_progress(profile)

    save_json(os.path.join(BASE_DIR, "user_profiles", f"{user_id}.json"), profile)

    save_progress_snapshot(user_id, profile)

    improved = get_most_improved_skill(profile)
    if improved:
        delta_map = {improved[0]: improved[1]}
        roadmap = profile.get("roadmap_progress", {})
        if roadmap:
            map_course_delta_to_subskills(delta_map, roadmap)
            save_json(os.path.join(BASE_DIR, "user_profiles", f"{user_id}.json"), profile)


    # CHECK: Does profile exist?
    if not profile:
        print(f"⚠️ WARNING: No profile found for user_id: {user_id}")
        return {
            "response": "Maaf, aku belum bisa mengakses data profil kamu. Pastikan kamu sudah login dengan benar ya! Atau coba hubungi support jika masalah berlanjut.",
            "intent": {"mode": "no_profile", "typePriority": None},
            "sources": [],
            "meta": {"latency_ms": int((time.time() - start) * 1000), "error": "no_profile"},
        }
    
    user_facts = build_strict_user_facts(profile)
    
    # CHECK: Does user have courses?
    if not user_facts.get("active_courses"):
        print(f"⚠️ WARNING: User {user_id} has empty active_courses")
    
    user_facts_text = format_user_facts_for_llm(user_facts)
    conversation_context = get_conversation_context(user_id)
    
    # Add current query to history
    add_to_history(user_id, "user", text)

    # ---------------------------
    # 2. Detect if query is about USER'S data vs GENERAL info
    # ---------------------------
    is_personal_query = any(keyword in text.lower() for keyword in [
        "saya", "aku", "ku", "kemajuan", "progress", "kursus saya", 
        "yang saya ambil", "sedang saya", "my"
    ])

    # Quick-check: progress-related questions (handle without LLM when possible)
    progress_keywords = ["developed the most", "most improved", "paling berkembang", "minggu ini", "this week", "improve", "improved", "kemajuan minggu", "skill have you developed", "skill developed"]
    if is_personal_query and any(pk in text.lower() for pk in progress_keywords):
        try:
            answer = answer_progress_question(user_id, text, profile)
            add_to_history(user_id, "assistant", answer)
            return {
                "response": answer,
                "intent": {"mode": "progress_query"},
                "sources": [],
                "meta": {"handled_by": "progress_helper"}
            }
        except Exception as e:
            print(f"Warning: progress helper failed: {e}")
    
    # ---------------------------
    # 3. Intent detection
    # ---------------------------
    intent: Dict[str, Any] = _intent.predict(text)
    if not isinstance(intent, dict):
        intent = {"mode": "default", "typePriority": None}
    else:
        intent.setdefault("mode", "default")
        intent.setdefault("typePriority", None)

    # ---------------------------
    # 4. CONDITIONAL SEARCH: Only search if NOT personal query
    # ---------------------------
    contexts = ""
    sources = []
    
    if not is_personal_query:
        # Encode query
        q_emb = _model.encode([text], normalize_embeddings=True).astype("float32")

        # FAISS search
        D, I = _index.search(q_emb, faissK)
        ids = I[0].tolist()
        dists = D[0].tolist()

        df = _kb.iloc[ids].copy()
        df["distance"] = dists
        df["baseScore"] = -df["distance"]

        # Type priority bonus
        typePriority = intent.get("typePriority")
        if typePriority:
            priorityMap = {t: len(typePriority) - i for i, t in enumerate(typePriority)}
            df["typeBonus"] = df["type"].map(priorityMap).fillna(0)
        else:
            df["typeBonus"] = 0

        # Title keyword overlap bonus
        qWords = set(re.findall(r"\w+", text.lower()))
        def titleBonus(title):
            titleWords = set(re.findall(r"\w+", str(title).lower()))
            return float(len(qWords & titleWords)) * 0.5
        df["titleBonus"] = df["title"].apply(titleBonus)

        # Duration bonus
        if intent.get("mode") == "duration":
            maskCourse = df["type"] == "course"
            if maskCourse.any():
                df = df[maskCourse].copy()
            df["durationBonus"] = df["text"].str.contains("Estimated hours", case=False, na=False).astype(float) * 1.0
        else:
            df["durationBonus"] = 0.0

        # Final scoring
        df["finalScore"] = df["baseScore"] + df["typeBonus"] + df["titleBonus"] + df["durationBonus"]
        df = df.sort_values("finalScore", ascending=False).head(topk)

        # Build context for LLM
        docs = [f"[Info] {r.get('title','')} - {str(r.get('text',''))[:600]}" for _, r in df.iterrows()]
        contexts = "\n\n".join(docs)

        # Build sources
        sources = [
            {
                "id": int(r.get("id", i)), 
                "title": r.get("title"), 
                "score": float(r.get("finalScore"))
            }
            for i, (_, r) in enumerate(df.iterrows())
        ]

    # ---------------------------
    # 10. Build prompts & Profiling Logic
    # ---------------------------
    # Check if user has learning profile data AND has been through profiling
    has_profile_data = has_learning_profile_data(profile)
    has_profiled = has_been_profiled(profile)
    
    # ONLY ask profiling question if:
    # 1. User has NO learning profile data AND
    # 2. User has NOT been profiled yet
    if not has_profile_data and not has_profiled:
        available_roles = get_available_job_roles()
        if available_roles:
            roles_text = " atau ".join(available_roles)
            question = f"Sebelum aku bisa bikin roadmap personal, boleh tahu dulu tujuan belajar kamu? Misalnya ingin jadi {roles_text}."
        else:
            question = "Sebelum aku bisa bikin roadmap personal, boleh tahu dulu tujuan belajar kamu? Coba sebutkan role atau skill yang ingin kamu kuasai."
        
        # Mark that profiling question has been asked
        try:
            profile["learning_profile"]["_profiled"] = True
            save_json(os.path.join(BASE_DIR, "user_profiles", f"{user_id}.json"), profile)
        except Exception as e:
            print(f"Warning: Failed to mark profile as profiled: {e}")
        
        add_to_history(user_id, "assistant", question)
        return {
            "response": question,
            "intent": {"mode": "profiling"},
            "sources": [],
            "meta": {"profiling": True, "profiling_stage": "initial"}
        }
    
    # If user has been profiled but still no profile data, they're in the "goal-setting" phase
    if has_profiled and not has_profile_data:
        goal_prompt = (
            f'User berkata: "{text}"\n\n'
            "User sedang mendefinisikan tujuan belajar mereka. "
            "Ekstrak intent: apakah mereka ingin jadi role tertentu? Atau ingin fokus pada skill spesifik?\n"
            "Bantu mereka memperjelas tujuan dan ekstrak tujuan yang bisa disimpan di profil."
        )
        system_prompt = build_system_prompt(user_facts_text, conversation_context, False)
        try:
            llm_resp = call_llama_chat(system_prompt, goal_prompt)
            
            # Try to extract goals and update profile
            goal_extraction_prompt = (
                f"Dari statement ini: '{text}'\n"
                "Ekstrak tujuan belajarnya dalam format JSON: "
                '{{"roles": ["Role1", "Role2"], "skills": ["Skill1", "Skill2"]}}\n'
                "Hanya return JSON, tidak ada teks lain."
            )
            try:
                goal_json_str = call_llama_chat("You are a JSON extractor.", goal_extraction_prompt)
                goal_data = json.loads(goal_json_str)
                profile["learning_profile"]["goals"] = goal_data.get("roles", [])
                profile["learning_profile"]["target_skills"] = goal_data.get("skills", [])
                profile["updated_at"] = time.time()
                save_json(os.path.join(BASE_DIR, "user_profiles", f"{user_id}.json"), profile)
            except Exception:
                pass  # If extraction fails, still provide response
            
            add_to_history(user_id, "assistant", llm_resp)
            return {
                "response": llm_resp,
                "intent": {"mode": "goal_definition"},
                "sources": [],
                "meta": {"profiling_stage": "goal_definition"}
            }
        except Exception as e:
            print(f"Error in goal definition: {e}")
    
    # If user HAS profile data, use it for context-aware responses
    if has_profile_data:
        lp = profile.get("learning_profile", {})
        current_focus = lp.get("current_focus", {})
        goals = lp.get("goals", [])
        skills = lp.get("skills", {})
        
        # Build rich context from existing profile data
        context_lines = []
        if goals:
            context_lines.append(f"Tujuan belajar: {', '.join(goals)}")
        if current_focus and current_focus.get("course"):
            context_lines.append(f"Sedang fokus pada: {current_focus.get('course')} (Module {current_focus.get('module', 0)})")
        if skills:
            skill_list = [f"{k}: {v}" for k, v in skills.items()]
            context_lines.append(f"Skills yang sudah dikuasai: {', '.join(skill_list)}")
        
        if context_lines:
            user_facts_text += "\n\n### Learning Profile Context:\n" + "\n".join(context_lines)
    
    has_profile = profile is not None and user_facts.get("active_courses")
    system_prompt = build_system_prompt(user_facts_text, conversation_context, has_profile)
    if is_personal_query:
        if not has_profile:
            user_prompt = (
                f'User berkata: "{text}"\n'
                "User bertanya tentang progress atau kursusnya, tetapi profil tidak tersedia. "
                "Jawablah dengan sopan dan ringan."
            )
        else:
            user_prompt = (
                f'User berkata: "{text}"\n\n'
                "Pertanyaan ini berkaitan dengan progress atau kursus user.\n"
                "- Gunakan hanya informasi kursus dari profil user.\n"
                "- Jangan gunakan hasil pencarian untuk menentukan apa yang sedang user pelajari.\n"
                "- Jawab singkat, hangat, dan tidak mengulang informasi profil secara berlebihan.\n"
            )

    else:
        # GENERAL / NON-PERSONAL QUERY
        user_prompt = (
            f'User berkata: "{text}"\n\n'
            "Ini adalah pertanyaan umum tentang materi atau konsep.\n"
            "Gunakan hasil pencarian (jika ada) untuk memperkaya penjelasan, "
            "tapi jangan mengaitkan materi ke progress user kecuali diminta.\n"
        )

    if intent.get("mode") == "roadmap":
        job_result = handle_job_description_flow(user_id, text)
        assistant_msg = job_result.get("summary")
        add_to_history(user_id, "assistant", assistant_msg)
        return {
            "response": assistant_msg,
            "intent": {"mode": "roadmap"},
            "sources": [],
            "meta": {"roadmap": job_result}
        }

    # ---------------------------
    # Job-description -> generate roadmap & assessments
    # ---------------------------
    job_keywords = ["job", "lowongan", "kualifikasi", "requirements", "job description", "role"]
    if intent.get("mode") == "job_role" or any(k in text.lower() for k in job_keywords):
        try:
            job_result = handle_job_description_flow(user_id, text)
            # Build short assistant message
            assistant_msg = job_result.get("summary")
            add_to_history(user_id, "assistant", assistant_msg)
            return {
                "response": assistant_msg,
                "intent": {"mode": "job_role"},
                "sources": [],
                "meta": {"roadmap": job_result}
            }
        except Exception as e:
            print(f"Error handling job description flow: {e}")
            # fallthrough to normal processing

    if contexts:
        user_prompt += f"\n=== REFERENSI ===\n{contexts}\n"
    
    # ---------------------------
    # 11. Get LLM response
    # ---------------------------
    try:
        llm_resp = call_llama_chat(system_prompt, user_prompt)
    except Exception as e:
        print(f"❌ LLM call failed: {e}")
        return {
            "response": "Maaf, ada gangguan teknis. Coba lagi dalam beberapa saat ya!",
            "intent": intent,
            "sources": [],
            "meta": {"latency_ms": int((time.time() - start) * 1000), "error": "llm_failed"},
        }

    # CRITICAL: Validate response against profile
    llm_resp = validate_response_against_profile(llm_resp, user_facts)

    # Extract and update skills from the response if user has profile data
    if has_profile_data:
        try:
            updated_skills = extract_and_update_skills(user_id, llm_resp, profile)
            if updated_skills:
                print(f"✓ Updated user skills: {updated_skills}")
        except Exception as e:
            print(f"Warning: Skill extraction failed: {e}")
        
        # Also update current focus based on user's message
        try:
            update_current_focus(user_id, text, profile)
        except Exception as e:
            print(f"Warning: Focus update failed: {e}")

    # profile_update = extract_profile_info(text)

    # if profile_update:
    #     return {``
    #         "response": llm_resp,
    #         "intent": {"mode": "update_profile"},
    #         "profile_update": profile_update,
    #     }
    # Add response to history
    add_to_history(user_id, "assistant", llm_resp)
    
    latency = int((time.time() - start) * 1000)

    # ---------------------------
    # 12. Result
    # ---------------------------
    result = {
        "response": llm_resp,
        "intent": intent,
        "sources": sources,
        "meta": {
            "latency_ms": latency,
            "query_type": "personal" if is_personal_query else "general",
            "used_search": not is_personal_query
        },
    }

    # ---------------------------
    # 13. Logging
    # ---------------------------
    log_query(
        user_id=user_id,
        query=text,
        intent=intent,
        response=llm_resp,
        sources=sources,
        meta=result["meta"],
    )

    return result


# ============================================
# UTILITY FUNCTIONS
# ============================================
def clear_user_history(user_id: str):
    """Clear conversation history for a user"""
    if user_id in conversation_history:
        conversation_history[user_id] = []

def get_user_history(user_id: str) -> List[Dict]:
    """Get full conversation history for a user"""
    return conversation_history.get(user_id, [])


# ---------------------------------
# Progress / assessment helpers
# ---------------------------------
def _compute_progress_delta(prev: Dict[str, int], latest: Dict[str, int]) -> Dict[str, int]:
    """Compute percent-point delta between two course_progress snapshots.

    Both dicts expected as course_id/name -> percent (0-100).
    Returns mapping course -> delta (latest - prev).
    """
    deltas = {}
    keys = set(prev.keys()) | set(latest.keys())
    for k in keys:
        p = int(prev.get(k, 0))
        l = int(latest.get(k, 0))
        deltas[k] = l - p
    return deltas


def update_current_focus(user_id: str, text: str, profile: Dict[str, Any]) -> None:
    """Update user's current focus (course/module) based on their message."""
    if not profile:
        return
    
    lp = profile.get("learning_profile", {})
    
    # Extract module number if user mentions it (e.g., "Module 3", "Modul 2")
    module_match = re.search(r'[Mm]od(?:ul|ule)?\s*(\d+)', text)
    if module_match:
        module_num = int(module_match.group(1))
        if "current_focus" not in lp:
            lp["current_focus"] = {}
        lp["current_focus"]["module"] = module_num
    
    # Update active course if user mentions specific course from their active_courses
    platform_data = profile.get("platform_data", {})
    active_courses = platform_data.get("active_courses", [])
    
    for course in active_courses:
        if course.lower() in text.lower():
            if "current_focus" not in lp:
                lp["current_focus"] = {}
            lp["current_focus"]["course"] = course
            break
    
    # Persist if changes were made
    if lp.get("current_focus"):
        profile["learning_profile"] = lp
        profile["updated_at"] = time.time()
        try:
            save_json(os.path.join(BASE_DIR, "user_profiles", f"{user_id}.json"), profile)
        except Exception as e:
            print(f"Warning: Failed to update current focus: {e}")


def extract_and_update_skills(user_id: str, response_text: str, profile: Dict[str, Any]) -> Dict[str, Any]:
    """Extract skill assessments from LLM response and update ONLY IF the skill already exists in the user's data.
    
    New or unknown skills will be ignored to avoid false updates.
    """
    if not profile:
        return {}

    lp = profile.get("learning_profile", {})
    existing_skills = lp.get("skills", {})

    # Load roadmap to know allowed skill names
    roadmap = profile.get("roadmap_progress", {})
    allowed_skill_ids = set()
    allowed_skill_names = set()

    try:
        if roadmap and "skills_status" in roadmap:
            for sid, info in roadmap["skills_status"].items():
                allowed_skill_ids.add(sid.lower())
    except:
        pass
    
    # Convert roadmap skill IDs into readable names if possible
    # (You may have a mapping function; if not, skip)
    # For safety, allow existing skill names only
    for name in existing_skills.keys():
        allowed_skill_names.add(name.lower())

    # LLM extraction
    extraction_prompt = (
        f"From this bot response:\n"
        f"{response_text}\n\n"
        "Extract ONLY skill names and their level in JSON:\n"
        '{"skills": [{"name": "Skill Name", "level": "Beginner|Intermediate|Advanced"}]}'
    )

    try:
        skill_json_str = call_llama_chat("You extract skills only.", extraction_prompt)
        skill_data = json.loads(skill_json_str)
    except:
        return existing_skills  # If extraction fails, do nothing

    # Filter and update only allowed skills
    updated = False
    for skill_item in skill_data.get("skills", []):
        skill_name = skill_item.get("name", "").strip()
        skill_level = skill_item.get("level", "Beginner")

        if not skill_name:
            continue

        # REQUIREMENT: SKILL MUST BE KNOWN AND EXISTING
        if skill_name.lower() not in allowed_skill_names:
            continue  # skip completely

        # Now safe to update
        if skill_level in ["Beginner", "Intermediate", "Advanced"]:
            existing_skills[skill_name] = skill_level
            updated = True

    # Save only if something changed
    if updated:
        lp["skills"] = existing_skills
        profile["learning_profile"] = lp
        profile["updated_at"] = time.time()
        save_json(os.path.join(BASE_DIR, "user_profiles", f"{user_id}.json"), profile)

    return existing_skills



def answer_progress_question(user_id: str, text: str, profile: Dict[str, Any]) -> str:

    """Attempt to answer simple progress questions without calling LLM.

    Supported: "most improved", "what skill developed the most this week", etc.
    Uses profile['progress_history'] snapshots if available, otherwise uses course_progress.
    """
    # Try to use explicit progress history snapshots
    ph = profile.get("progress_history") or profile.get("platform_data", {}).get("progress_history")
    course_progress = profile.get("platform_data", {}).get("course_progress") or {}

    # If we have at least two snapshots, compute deltas
    if ph and isinstance(ph, list) and len(ph) >= 2:
        try:
            prev = ph[-2].get("course_progress", {})
            latest = ph[-1].get("course_progress", {})
            deltas = _compute_progress_delta(prev, latest)
            # find max positive delta
            best = max(deltas.items(), key=lambda x: x[1])
            if best[1] <= 0:
                return "Sepertinya tidak ada perkembangan signifikan baru-baru ini. Coba lakukan beberapa latihan atau assessment untuk mengukur progres." 
            course, delta = best
            return f"Skill/kelas yang paling berkembang baru-baru ini adalah '{course}' dengan peningkatan {delta} poin persentase." 
        except Exception as e:
            print(f"Warning: failed to compute deltas: {e}")

    # Fallback: use current course_progress to report highest progress
    if course_progress:
        try:
            # course_progress may have course_id -> percent
            best = max(course_progress.items(), key=lambda x: int(x[1]))
            course, pct = best
            return f"Saat ini kamu paling maju di '{course}' dengan {int(pct)}% penyelesaian." 
        except Exception:
            pass


    # Fallback: if roadmap_progress exists, report skill with highest progress_percent
    rp = profile.get("roadmap_progress", {})
    if rp:
        try:
            skills = rp.get("skills_status", {})
            # Find skill with highest progress_percent
            best_skill_id = None
            best_skill_name = None
            best_pct = -1
            best_level = None
            for sid, data in skills.items():
                pct = data.get("progress_percent", 0)
                if pct > best_pct:
                    best_pct = pct
                    best_skill_id = sid
                    best_skill_name = data.get("name", sid)
                    best_level = data.get("level")
            if best_skill_id and best_pct > 0:
                return f"Menurut roadmap, kemampuan yang paling berkembang adalah '{best_skill_name}' (level: {best_level}, progress: {best_pct}%)."
            # If all progress_percent are 0, fallback to highest level
            level_score = {"Beginner": 0, "Intermediate": 1, "Advanced": 2, None: 0}
            best_skill_id = None
            best_skill_name = None
            best_val = -1
            best_level = None
            for sid, data in skills.items():
                val = level_score.get(data.get("level"), 0)
                if val > best_val:
                    best_val = val
                    best_skill_id = sid
                    best_skill_name = data.get("name", sid)
                    best_level = data.get("level")
            if best_skill_id:
                return f"Menurut roadmap, kemampuan yang paling berkembang adalah '{best_skill_name}' (level: {best_level})."
        except Exception as e:
            print(f"Warning: failed to read roadmap_progress: {e}")

    return "Maaf, aku belum punya data yang cukup untuk menentukan skill yang paling berkembang. Coba jalankan assessment atau pastikan data progress tersedia di profilmu."

def save_progress_snapshot(user_id, profile):
    progress = profile.get("platform_data", {}).get("course_progress")
    if not progress:
        return
    history = profile.setdefault("progress_history", [])
    snapshot = {
    "timestamp": int(time.time()),
    "course_progress": progress.copy()
    }
    if not history or history[-1]["course_progress"] != snapshot["course_progress"]:
        history.append(snapshot)
        save_json(os.path.join(BASE_DIR, "user_profiles", f"{user_id}.json"), profile)

def get_most_improved_skill(profile):
    history = profile.get("progress_history", [])
    if len(history) < 2:
        return None
    prev = history[-2]["course_progress"]
    latest = history[-1]["course_progress"]
    deltas = {k: latest.get(k,0) - prev.get(k,0) for k in set(prev) | set(latest)}
    best = max(deltas.items(), key=lambda x: x[1])
    return best if best[1] > 0 else None

def map_course_delta_to_subskills(delta_map, roadmap):
    for sub in roadmap.get("subskills", []):
        course_list = sub.get("mapped_course_names", [])
        sub["delta"] = sum(delta_map.get(c, 0) for c in course_list)

def ensure_course_progress(profile):
    plat = profile.setdefault("platform_data", {})
    cp = plat.get("course_progress")
    if cp is None:
        # inisialisasi semua active_courses dengan 0
        active = plat.get("active_courses", [])
        plat["course_progress"] = {c: 0 for c in active}
    return profile