import time
import json
import re
import numpy as np
from typing import Dict, Any
from datetime import datetime

from .adaptive_filter import filter_roadmap_for_user
from .adaptive_roadmap_engine import generate_user_skill_status
from .embeddings_utils import load_kb, load_faiss, get_model
from .intent_model import IntentPipeline
from .logger import log_query
# from .roadmap_kb_engine import kb_based_roadmap
from .course_catalog import COURSE_CATALOG
from .skill_progress_engine import generate_skill_progress_for_roadmap
from .config import GROQ_API_KEY, SBERT_MODEL_PATH, DEFAULT_TOPK
from .detect_jobrole import detect_job_role, JOB_ROLE_KEYWORDS
from .roadmap_json_engine import generate_roadmap_response
from .config import BACKEND_URL, SECRET
from .micro_confirm import detect_confirmation_micro

from groq import Groq
import os


# ============================================================
# MODEL CLIENT
# ============================================================
def is_confirmation_for_course_rec(text: str, profile: Dict) -> bool:
    """Detect confirmation response for course recommendation"""
    if not text:
        return False
    
    text_lower = text.lower()
    
    confirmation_words = ["ya", "iya", "ok", "oke", "baik", "betul", "gunakan", "pakai", "lanjut"]
    has_confirmation = any(word in text_lower for word in confirmation_words)
    
    has_path_context = any(word in text_lower for word in ["path", "learning", "itu"])
    has_stored_role = bool(profile.get("roadmap_progress", {}).get("job_role"))
    
    # Short confirmation without context
    is_short_confirm = text_lower.strip() in ["ya", "iya", "ok", "oke", "baik"]
    
    return has_stored_role and (
        (has_confirmation and has_path_context) or 
        is_short_confirm
    )

CONFIRMATION_RE = re.compile(
    r'\b(ya|iya|ok|oke|baik|lanjut|setuju|mulai dari awal|aku mau|saya mau|betul)\b',
    re.IGNORECASE
)

LEARN_RE = re.compile(
    r'\bBelajar\s+([A-Za-z0-9\s\-\+]+)',
    re.IGNORECASE
)

PROFILE_UPDATE_TAG_RE = re.compile(
    r'<profile_update>(.*?)</profile_update>',
    re.DOTALL | re.IGNORECASE
)

def is_confirmation_text(text: str) -> bool:
    if not text:
        return False
    return bool(CONFIRMATION_RE.search(text))


def extract_goal_from_assistant_history(profile: Dict) -> list:
    """
    Menarik goal dari history asisten sebelumnya:
    1) Jika ada <profile_update> berisi goals → pakai itu.
    2) Jika respon asisten menyebut 'Belajar X' → ambil X.
    3) Jika menyebut Android/Kotlin/Java/Python → anggap goal itu.
    """
    try:
        if not profile or not isinstance(profile, dict):
            return []
            
        lp = profile.get("learning_profile")
        if not isinstance(lp, dict):
            return []
            
        hist = lp.get("history")
        if not isinstance(hist, list):
            return []

        for entry in reversed(hist):
            if not isinstance(entry, dict):
                continue
                
            resp = entry.get("response")
            if not resp:
                continue
                
            # Ensure string
            try:
                resp = str(resp)
            except:
                continue

            if not resp.strip():
                continue
                
            # 1. Cari JSON di <profile_update>
            m = PROFILE_UPDATE_TAG_RE.search(resp)
            if m:
                try:
                    j = json.loads(m.group(1).strip())
                    if not isinstance(j, dict):
                        continue
                    goals = j.get("learning_profile", {}).get("goals")
                    if isinstance(goals, list) and goals:
                        return [str(g).strip() for g in goals if g]
                except:
                    pass

            # 2. Cari pola "Belajar X"
            m2 = LEARN_RE.search(resp)
            if m2:
                goal = m2.group(1).strip()
                if goal:
                    return [goal]

            # 3. Kata kunci fallback
            keywords = ["Android", "Kotlin", "Java", "Python", "Frontend", "Backend", "Fullstack"]
            for kw in keywords:
                if re.search(rf'\b{re.escape(kw)}\b', resp, re.I):
                    return [kw]

    except Exception as e:
        print("ERROR in extract_goal_from_assistant_history:", e)
        import traceback
        traceback.print_exc()

    return []


client = Groq(api_key=GROQ_API_KEY)

_kb = None
_index = None
_model = None
_intent = None


def _ensure_loaded():
    """Lazy load artifacts once."""
    global _kb, _index, _model, _intent

    if _kb is None:
        _kb = load_kb()

    if _index is None:
        _index = load_faiss()

    if _model is None:
        _model = get_model(SBERT_MODEL_PATH)

    if _intent is None:
        intent_path = os.path.join(
            os.path.dirname(__file__), "artifacts", "intent_pipe.joblib"
        )
        _intent = IntentPipeline(path=intent_path)
    
    if _skill_embeddings is None:
        init_skill_library()


# ============================================================
# SKILL MATCHING (via KB)
# ============================================================
_skill_titles = []
_skill_embeddings = None

def init_skill_library():
    global _skill_titles, _skill_embeddings

    try:
        # Ambil semua KB title sebagai kandidat skill
        titles = []
        for _, row in _kb.iterrows():
            t = row.get("title")
            if t and isinstance(t, str):
                titles.append(t.strip())

        _skill_titles = titles
        if titles:
            _skill_embeddings = _model.encode(
                titles, normalize_embeddings=True
            ).astype("float32")
            print(f"[SKILL LIB] Loaded {len(titles)} skill candidates")
        else:
            print("[SKILL LIB] No skills loaded")

    except Exception as e:
        print("ERROR init_skill_library:", e)
        

def infer_skill_from_kb(text: str):
    """Return closest skill from KB if similarity > 0.60"""
    if not text or _skill_embeddings is None:
        return None

    try:
        emb = _model.encode([text], normalize_embeddings=True).astype("float32")
        scores = np.dot(_skill_embeddings, emb.T).squeeze()

        top_idx = int(np.argmax(scores))
        top_score = float(scores[top_idx])

        if top_score < 0.60:  # threshold
            return None

        return _skill_titles[top_idx]

    except Exception as e:
        print("ERROR infer_skill_from_kb:", e)
        return None


def infer_skill_level(text: str):
    t = text.lower()

    if any(x in t for x in ["baru", "pemula", "masih belajar", "newbie"]):
        return "Beginner"
    if any(x in t for x in ["lumayan", "mulai paham", "cukup ngerti"]):
        return "Intermediate"
    if any(x in t for x in ["mahir", "jago", "advanced"]):
        return "Advanced"

    return None

# ============================================================
# LLM CALL
# ============================================================

def call_llama(system_prompt: str, user_prompt: str) -> str:
    """Simple wrapper for Groq Llama model."""
    try:
        resp = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            max_tokens=512,
            temperature=0.6,
        )
        return resp.choices[0].message.content
    except Exception as e:
        print("ERROR calling LLM:", e)
        raise


# ============================================================
# SYSTEM PROMPT
# ============================================================

def build_system_prompt(profile_text: str, conversation_text: str) -> str:
    return f"""
You are Learning Buddy, an adaptive learning assistant for Indonesian students.

Your behavior MUST follow these rules:

1. You DO NOT store memory permanently. Backend will always send full profile each request.
2. You MAY generate a profile update, but ONLY using this exact format:

   <profile_update>
   {{ ...valid JSON patch... }}
   </profile_update>

3. JSON patch is OPTIONAL. Only output it if the user's message implies new information.
4. JSON patch MUST follow this schema:

   {{
     "platform_data": {{
         "name": string (optional),
         "email": string (optional),
         "active_courses": string[] (optional),
         "active_tutorials": number (optional),
         "completed_tutorials": number (optional),
         "is_graduated": 0 | 1 (optional),
         "course_progress": {{ course: percent }} (optional)
     }},
     "learning_profile": {{
         "goals": string[] (optional),
         "weaknesses": string[] (optional),
         "strengths": string[] (optional),
         "skills": {{
            skill_name: "Beginner" | "Intermediate" | "Advanced"
         }} (optional),
         "current_focus": {{
            "course": string (optional),
            "module": number >= 0 (optional)
         }},
         "history": [
            {{
              "query": string,
              "response": string,
              "timestamp": string (ISO),
              "intent": any
            }}
         ]
     }},
     "roadmap_progress": {{
        "job_role": string (optional),
        "last_updated": number (timestamp) (optional),
        "subskills": any[] (optional),
        "skills_status": object (optional)
     }}
   }}

5. You MUST NOT output:
   - unknown fields
   - null unless intentionally clearing a field
   - created_at or updated_at

6. Your primary task is to answer the user's message clearly. Use STUDENT INFO for personalisation.

7. Adapt your tone using these rules:
   - If the student has Goals → orient explanations toward helping them reach the goal.
   - If Weaknesses exist → explain more slowly, step-by-step.
   - If Strengths exist → explanations may be slightly more technical.
   - If Skills exist → adjust complexity based on Beginner/Intermediate/Advanced.
   - If Current Focus exists → relate your answer to their current course/module when relevant.

8. Never invent or modify profile data. Only add updates the user explicitly implies.

9. Your output always consists of:
   - A helpful human-friendly answer
   - OPTIONAL <profile_update> JSON patch (only if needed)

10. Jika user menyatakan LEVEL kemampuan mereka (misalnya: saya pemula di Kotlin, saya sudah intermediate Android, atau saya advanced Java, atau saya mengetahui sesuatu), Anda BOLEH mengirim <profile_update> yang mengisi learning_profile.skills.

11. Jika user hanya BERTANYA tentang skill, progres, atau kemampuan mereka 
    tanpa menyatakan LEVEL BARU atau BUKTI PERUBAHAN, 
    Anda TIDAK BOLEH mengirim <profile_update> untuk skills.

-----------------------------------------------------

STUDENT INFO:
{profile_text}

RECENT CHAT:
{conversation_text or '(new conversation)'}

Now generate your answer:
"""

# ============================================================
# PROFILE → TEXT FOR LLM
# ============================================================
def format_profile_for_llm(profile: Dict[str, Any]) -> str:
    """
    Convert user profile to a compact text block for LLM.
    Simple version (A) — includes only essential fields:
    - identity
    - active courses
    - current focus
    - goals
    - weaknesses
    - strengths
    - skills (if any)
    """
    print("=== RAW PROFILE INPUT TO format_profile_for_llm ===")
    try:
        print(json.dumps(profile, indent=2))
    except:
        print(profile)
    print("===================================================")

    if not profile:
        return "No profile available."

    try:
        # Safely get nested dicts
        plat = profile.get("platform_data") or {}
        if not isinstance(plat, dict):
            plat = {}
            
        lp = profile.get("learning_profile") or {}
        if not isinstance(lp, dict):
            lp = {}

        lines = []

        # Identity - with safe string conversion
        name = plat.get("name")
        if name:
            lines.append(f"Name: {str(name)}")

        email = plat.get("email")
        if email:
            lines.append(f"Email: {str(email)}")

        # Active courses - ensure it's a list
        active = plat.get("active_courses")
        if isinstance(active, list) and active:
            safe_courses = [str(c) for c in active if c]
            if safe_courses:
                lines.append("Active Courses: " + ", ".join(safe_courses))

        # Current focus - safely handle dict
        cf = lp.get("current_focus")
        if isinstance(cf, dict) and cf.get("course"):
            module = cf.get("module", 0)
            try:
                module = int(module)
            except:
                module = 0
            lines.append(f"Current Focus: {str(cf['course'])} (module {module})")

        # Goals - ensure list and strings
        goals = lp.get("goals")
        if isinstance(goals, list) and goals:
            safe_goals = [str(g) for g in goals if g]
            if safe_goals:
                lines.append("Goals: " + ", ".join(safe_goals))

        # Weaknesses
        weaknesses = lp.get("weaknesses")
        if isinstance(weaknesses, list) and weaknesses:
            safe_weak = [str(w) for w in weaknesses if w]
            if safe_weak:
                lines.append("Weaknesses: " + ", ".join(safe_weak))

        # Strengths
        strengths = lp.get("strengths")
        if isinstance(strengths, list) and strengths:
            safe_str = [str(s) for s in strengths if s]
            if safe_str:
                lines.append("Strengths: " + ", ".join(safe_str))

        # Skills - ensure dict
        skills = lp.get("skills")
        if isinstance(skills, dict) and skills:
            skill_pairs = [f"{str(k)}: {str(v)}" for k, v in skills.items() if k and v]
            if skill_pairs:
                lines.append("Skills: " + ", ".join(skill_pairs))

        # If empty
        if not lines:
            return "No relevant student data available."

        return "\n".join(lines)

    except Exception as e:
        print("ERROR in format_profile_for_llm:", e)
        import traceback
        traceback.print_exc()
        return "Profile formatting error."

def detect_course_recommendation(text: str) -> bool:
    """
    Multi-stage detection:
    1. Exact keyword match (fastest)
    2. Regex pattern match (medium)
    3. Semantic similarity (slowest, but most accurate)
    """
    if not text:
        return False
    
    text_lower = text.lower()
    
    # Stage 1: Exact keyword match
    exact_keywords = [
        "rekomendasi kelas",
        "rekomendasikan kelas",
        "rekomendasiin kelas",
        "kasih rekomendasi",
        "minta rekomendasi",
        "saran kelas",
        "ada kelas apa"
    ]
    
    if any(kw in text_lower for kw in exact_keywords):
        print("[COURSE REC] Detected via exact keyword")
        return True
    
    # Stage 2: Regex patterns
    patterns = [
        r'\b(rekomend?asi(kan|in)?)\s*(kelas|course)',
        r'\b(kasih|minta|butuh|cari)\s+(rekomend?asi|saran|kelas|course)',
        r'\b(ada|punya)\s+(kelas|course)',
        r'\b(kelas|course)\s+(apa|yang)',
        r'\btolong.*(kelas|course)',
    ]
    
    for pattern in patterns:
        if re.search(pattern, text_lower):
            print(f"[COURSE REC] Detected via regex: {pattern}")
            return True
    
    # Stage 3: Semantic similarity (optional, if model loaded)
    if _model is not None:
        try:
            ref_queries = [
                "rekomendasikan kelas untuk saya",
                "ada kelas apa yang cocok",
                "saya butuh saran course"
            ]
            
            query_emb = _model.encode([text], normalize_embeddings=True).astype("float32")
            ref_embs = _model.encode(ref_queries, normalize_embeddings=True).astype("float32")
            
            scores = np.dot(ref_embs, query_emb.T).squeeze()
            max_score = float(np.max(scores))
            
            if max_score >= 0.60:
                print(f"[COURSE REC] Detected via semantic similarity: {max_score:.3f}")
                return True
        except Exception as e:
            print("Semantic detection error:", e)
    
    return False


def detect_course_from_text(text: str, catalog):
    """Try to detect a course name mentioned in `text` by scanning `catalog`.
    Returns course_name (str) or None.
    """
    if not text or not catalog:
        return None

    txt = text.lower()

    # Normalize catalog if wrapped
    if isinstance(catalog, list) and catalog and isinstance(catalog[0], list):
        catalog = catalog[0]

    # First pass: exact substring match of full course name
    for c in catalog:
        try:
            name = (c.get("course_name") or "").strip().lower()
            if not name:
                continue
            if name in txt:
                return c.get("course_name")
        except Exception:
            continue

    # Second pass: word-level token match (look for distinctive words)
    words = [w for w in re.findall(r"\w+", txt) if len(w) > 3]
    if not words:
        return None

    for c in catalog:
        try:
            name = (c.get("course_name") or "").strip().lower()
            if not name:
                continue
            score = 0
            for w in words:
                if re.search(rf"\b{re.escape(w)}\b", name):
                    score += 1
            if score >= 2:
                return c.get("course_name")
        except Exception:
            continue

    return None

def convert_level(level_num):
    """Convert numeric level to string"""
    if level_num <= 1:
        return "Beginner"
    elif level_num == 2:
        return "Intermediate"
    elif level_num == 3:
        return "Intermediate+"
    elif level_num >= 4:
        return "Advanced"
    return "Unknown"

def extract_profile_update(text: str):
    """
    Extract <profile_update>{...JSON...}</profile_update> from LLM output.
    Returns {} if nothing found or JSON invalid.
    """
    if not text:
        return {}

    try:
        pattern = r"<profile_update>(.*?)</profile_update>"
        m = re.search(pattern, text, re.DOTALL)
        if not m:
            return {}

        raw = m.group(1)

        # Jika bukan string → convert dulu
        if not isinstance(raw, str):
            try:
                raw = json.dumps(raw)
            except:
                return {}

        raw = raw.strip()

        try:
            return json.loads(raw)
        except:
            return {}

    except Exception as e:
        print("ERROR in extract_profile_update:", e)
        return {}
    
# ============================================================
# MAIN CHAT HANDLER (STATELESS)
# ============================================================
ROLE_LEARNING_PATH = {
    "Front-End Web Developer": 7,
    "Back-End Developer JavaScript": 3,
    "Back-End Developer Python": 4,
    "Google Cloud Professional": 9,
    "Android Developer": 2,
    "iOS Developer": 10,
    "Data Scientist": 5,
    "AI Engineer": 1,
    "Gen AI Engineer": 9,
    "DevOps Engineer": 6
}

def is_confirmation_for_course_rec(text: str, profile: Dict) -> bool:
    """
    Detect if user is confirming to use stored role for course recommendation
    """
    if not text:
        return False
    
    text_lower = text.lower()
    
    # Confirmation keywords
    confirmation_words = [
        "ya", "iya", "ok", "oke", "baik", "betul", "benar",
        "gunakan", "pakai", "lanjut", "setuju"
    ]
    
    has_confirmation = any(word in text_lower for word in confirmation_words)
    
    # Context: mentions "learning path" or "path"
    has_path_context = any(word in text_lower for word in ["path", "learning path", "itu"])
    
    # User has stored role
    has_stored_role = bool(profile.get("roadmap_progress", {}).get("job_role"))
    
    return has_confirmation and (has_path_context or text_lower in ["ya", "iya", "ok", "oke"]) and has_stored_role
async def handle_query(
    user_id: str,
    text: str,
    profile: Dict[str, Any],
    topk: int = DEFAULT_TOPK
) -> Dict[str, Any]:
    try:

        # Handle text input
        if text is None:
            text = ""
        elif isinstance(text, dict):
            text = text.get("message", text.get("text", text.get("query", "")))
            if not isinstance(text, str):
                text = json.dumps(text)
        
        text = str(text).strip()
        
        # Validate profile structure
        if not isinstance(profile, dict):
            print("WARNING: profile is not a dict, resetting to empty")
            profile = {}
            
    except Exception as e:
        print("ERROR in input handling:", e)
        import traceback
        traceback.print_exc()
        return {"response": "Error processing input data."}
    
    history_patch = {}
    extracted_update = {}
    
    try:
        if not text:  # Now safe to check
            return {"response": "Pesan tidak boleh kosong."}

        print("DEBUG detect_job_role →", detect_job_role(text))

        job_role = detect_job_role(text)
        if not job_role and "roadmap" in text.lower():
            stored_role = (profile.get("roadmap_progress") or {}).get("job_role")

            # kalau profile kosong DAN user belum nyebut role → baru tanya
            if not stored_role:
                return {
                    "response": (
                        "Saya belum tahu learning path kamu. "
                        "Sebutkan role yang kamu inginkan "
                        "(contoh: Front-End Web Developer, Android Developer)."
                    ),
                    "intent": {"mode": "ask_job_role"},
                    "profile_update": {}
                }
            
            job_role = stored_role

            course = (profile.get("platform_data") or {}).get("active_courses", [])

            if isinstance(course, list) and course:
                course_name = course[0].lower()

                for role, keywords in JOB_ROLE_KEYWORDS.items():
                    for kw in keywords:
                        if kw.lower() in course_name:
                            job_role = role
                            print(f"[FALLBACK SUCCESS] Matched from course → {job_role}")
                            break
                    if job_role:
                        break
            # Jika tetap tidak ketemu → minta user pilih job_role
            if not job_role:
                time.sleep(0.5)
                return {
                    "response": "Saya tidak dapat menentukan learning path anda Anda berdasarkan pesan yang anda berikan dan course aktif. Anda ingin roadmap untuk learning path apa? (Contoh: Front-End Web Developer, Back-End Developer, Android Developer)",
                    "intent": {"mode": "ask_job_role"},
                    "sources": [],
                    "meta": {"used_kb": False},
                    "profile_update": {}
                }
        if job_role:
            # Load roadmap dari JSON
            roadmap = generate_roadmap_response(job_role)

            # Jika tidak ditemukan
            if not roadmap.get("ok"):
                return {
                    "response": f"Roadmap untuk {job_role} tidak ditemukan.",
                    "intent": {"mode": "roadmap"},
                    "sources": [],
                    "meta": {"used_kb": False, "latency_ms": 0},
                    "profile_update": {}
                }

            # Hitung skill_status user
            skill_status = generate_skill_progress_for_roadmap(
                roadmap=roadmap,
                profile=profile,
                course_catalog=COURSE_CATALOG  # list course_id / course_name / hours_to_study
            )

            # -------------------------------------------------------------
            # 2) Adaptive filtering berdasarkan level hasil skill_status
            # -------------------------------------------------------------
            filtered_subskills = filter_roadmap_for_user(roadmap, skill_status)

            # Tambahkan hasil adaptif ke roadmap
            roadmap["subskills"] = filtered_subskills

            
            prev_role = (
                profile.get("roadmap_progress", {}).get("job_role")
                if isinstance(profile, dict) else None
            )
            prev_skill_status = (profile.get("roadmap_progress") or {}).get("skills_status")
            # Jika user berpindah job role → roadmap lama harus DIHAPUS total
            if prev_role and prev_role != job_role:
                print(f"[ROADMAP RESET] User switching from {prev_role} → {job_role}")
                profile_update = {
                    "roadmap_progress": {
                        "job_role": job_role,
                        "created_at": int(datetime.utcnow().timestamp() * 1000),
                        "last_updated": int(datetime.utcnow().timestamp() * 1000),
                        "subskills": filtered_subskills,
                        "skills_status": skill_status
                    }
                }
            else:
                profile_update = {
                    "roadmap_progress": {
                        "job_role": job_role,
                        "last_updated": int(datetime.utcnow().timestamp() * 1000),
                        "subskills": filtered_subskills,
                        "skills_status": prev_skill_status or skill_status
                    }
                }


            # Kembalikan response tanpa LLM
            time.sleep(2)
            # ============================================================
            # SEND PATCH TO BACKEND WEB (server-to-server)
            # ============================================================
            try:
                import requests
                # BACKEND_URL = os.getenv("BACKEND_PROFILE_PATCH_URL")
                # SECRET = os.getenv("PROFILE_PATCH_SECRET")

                if BACKEND_URL and SECRET:
                    requests.post(
                        BACKEND_URL,
                        json={
                            "user_id": user_id,
                            "patch": profile_update
                        },
                        headers={"x-admin-secret": SECRET},
                        timeout=5
                    )
                else:
                    print("[WARN] BACKEND_URL or SECRET not configured")

            except Exception as e:
                print("[ERROR] Failed to push roadmap patch to backend web:", e)

            return {
                "ok": True,
                "reply": f"Roadmap untuk {job_role} telah dibuat!",
                "intent": {"mode": "roadmap"},
                "sources": [],
                "meta": {  # ← INI YANG PENTING!
                    "type": "roadmap",
                    "roadmap": {
                        "job_role": job_role,
                        "subskills": filtered_subskills,
                        "skills_status": skill_status
                    },
                    "used_kb": False,
                    "latency_ms": 0
                },
                "profile_update": profile_update
            }
        # ============================================================
        # 2. COURSE RECOMMENDATION DETECTION (INSERT HERE - AFTER ROADMAP, BEFORE _ensure_loaded)
        
        # 1) DETEKSI MICRO CONFIRM (YES / NO)
        stored_role = (profile.get("roadmap_progress") or {}).get("job_role")
        micro = detect_confirmation_micro(text)

        confirmed_yes = (micro == "confirm_yes")
        confirmed_no = (micro == "confirm_no")

        # Jika user TIDAK MAU pakai role lama → tanya role baru
        if confirmed_no and stored_role:
            return {
                "response": "Baik! Silakan pilih role baru untuk rekomendasi kelas.",
                "intent": {"mode": "ask_job_role"},
                "meta": {"used_kb": False},
                "profile_update": {}
            }

        # 2) DETEKSI apakah user memang meminta rekomendasi kelas
        is_course_request = detect_course_recommendation(text)

        # 3) Jika user TIDAK minta rekomendasi kelas → lanjut ke LLM
        if not is_course_request and not confirmed_yes:
            # tidak melakukan course recommendation di sini
            # LLM flow lanjut di bawah
            pass
        else:
            # User masuk flow course recommendation
            print("[COURSE REC] Entering course recommendation flow")

            # 4) Tentukan desired_role
            role_from_text = detect_job_role(text, profile)
            desired_role = None

            # CASE A: user menyebut role eksplisit
            if role_from_text:
                desired_role = role_from_text

            # CASE B: user konfirmasi YES untuk stored_role
            elif confirmed_yes and stored_role:
                desired_role = stored_role

            # CASE C: user minta rekomendasi tapi punya stored_role → MINTA KONFIRMASI
            elif stored_role and not confirmed_yes and not detect_job_role(text):
                return {
                    "response": (
                        f"Saya melihat learning path kamu sebelumnya adalah {stored_role}. "
                        "Apakah ingin saya gunakan sebagai acuan?"
                    ),
                    "intent": {"mode": "confirm_role"},
                    "profile_update": {}
                }

            # CASE D: tidak ada role sama sekali → minta user pilih role
            else:
                return {
                    "response": (
                        "Sebelum saya rekomendasikan kelas, kamu perlu memilih role terlebih dahulu. "
                        "Contoh: Front-End Developer, Back-End Developer, Android Developer."
                    ),
                    "intent": {"mode": "ask_job_role"},
                    "meta": {"used_kb": False},
                    "profile_update": {}
                }

            # SAFETY CHECK — kalau masih None, jangan lanjut
            if not desired_role:
                return {
                    "response": "Saya tidak dapat menentukan role kamu. Pilih role dulu sebelum lanjut.",
                    "intent": {"mode": "ask_job_role"},
                    "meta": {"used_kb": False},
                    "profile_update": {}
                }

            print("[COURSE REC] FINAL desired_role =", desired_role)

            # ============================================================
            # START RECOMMENDATION LOGIC
            # ============================================================
            catalog = COURSE_CATALOG
            if isinstance(catalog, list) and catalog and isinstance(catalog[0], list):
                catalog = catalog[0]

            active_courses = (profile.get("platform_data") or {}).get("active_courses") or []
            roadmap_progress = profile.get("roadmap_progress") or {}

            exclude_course_ids = set()
            exclude_course_names = set(c.lower().strip() for c in active_courses)

           # normalize preferred LP and add debug
            preferred_lp = ROLE_LEARNING_PATH.get(desired_role)
            print("[COURSE REC DEBUG] desired_role ->", desired_role, "| preferred_lp (raw) ->", preferred_lp)

            recommended = []

            # convert preferred_lp to string for robust comparison (catalog might store IDs as str)
            pref_lp_str = str(preferred_lp) if preferred_lp is not None else None

            # PRIORITAS 1 — Learning Path sesuai ROLE (robust comparison)
            if pref_lp_str:
                for idx, course in enumerate(catalog):
                    # normalize course learning_path_id (may be int or str or None)
                    lp_id = course.get("learning_path_id")
                    lp_id_str = str(lp_id) if lp_id is not None else None

                    # debug sample first few entries
                    if idx < 3:
                        print(f"[COURSE REC DEBUG] catalog[{idx}] id={course.get('course_id')} name={course.get('course_name')} lp_id_raw={lp_id} lp_id_str={lp_id_str}")

                    if lp_id_str == pref_lp_str:
                        cid = course.get("course_id")
                        cname = (course.get("course_name") or "").lower()

                        if cid in exclude_course_ids or cname in exclude_course_names:
                            continue

                        recommended.append({
                            "id": cid,
                            "title": course.get("course_name"),
                            "level": convert_level(course.get("course_level_str", 1)),
                            "hours": course.get("hours_to_study", 0),
                            "path": f"Learning Path {preferred_lp}",
                            "description": f"Durasi: {course.get('hours_to_study', 0)} jam"
                        })

                        if len(recommended) >= 5:
                            break

                        cid = course.get("course_id")
                        cname = (course.get("course_name") or "").lower()

                        if cid in exclude_course_ids or cname in exclude_course_names:
                            continue

                        # recommended.append({
                        #     "id": cid,
                        #     "title": course.get("course_name"),
                        #     "level": convert_level(course.get("course_level_str", 1)),
                        #     "hours": course.get("hours_to_study", 0),
                        #     "path": f"Learning Path {preferred_lp}",
                        #     "description": f"Durasi: {course.get('hours_to_study', 0)} jam"
                        # })

                        if len(recommended) >= 5:
                            break

            # PRIORITAS 2 — fallback: LP dari active course
            if len(recommended) < 5 and active_courses:
                first_active = active_courses[0].lower()
                active_lp_id = None
                for c in catalog:
                    if (c.get("course_name") or "").lower() == first_active:
                        active_lp_id = c.get("learning_path_id")
                        break

                if active_lp_id:
                    for course in catalog:
                        if course.get("learning_path_id") == active_lp_id:
                            cid = course.get("course_id")
                            cname = (course.get("course_name") or "").lower()

                            if cid in exclude_course_ids or cname in exclude_course_names:
                                continue

                            recommended.append({
                                "id": cid,
                                "title": course.get("course_name"),
                                "level": convert_level(course.get("course_level_str", 1)),
                                "hours": course.get("hours_to_study", 0),
                                "path": f"Learning Path {active_lp_id}",
                                "description": f"Durasi: {course.get('hours_to_study', 0)} jam"
                            })

                            if len(recommended) >= 5:
                                break

            # PRIORITAS 3 — fill random
            if len(recommended) < 5:
                for course in catalog:
                    cid = course.get("course_id")
                    cname = (course.get("course_name") or "").lower()

                    if cid in exclude_course_ids or cname in exclude_course_names:
                        continue

                    recommended.append({
                        "id": cid,
                        "title": course.get("course_name"),
                        "level": convert_level(course.get("course_level_str", 1)),
                        "hours": course.get("hours_to_study", 0),
                        "path": f"Learning Path {course.get('learning_path_id')}",
                        "description": f"Durasi: {course.get('hours_to_study', 0)} jam"
                    })

                    if len(recommended) >= 5:
                        break

            # RETURN COURSE RECOMMENDATION
            return {
                "ok": True,
                "reply": f"Berikut rekomendasi kelas untuk {desired_role}:",
                "intent": {"mode": "course_recommendation"},
                "sources": [],
                "meta": {
                    "type": "course-recommendation",
                    "role": desired_role,
                    "courses": recommended[:5]
                },
                "profile_update": {}
            }

            # if roadmap.get("ok"):
            #     time.sleep(2)
            #     # Tidak perlu melewati LLM. Return roadmap langsung.
            #     return {
            #         "response": f"Roadmap untuk {job_role}:\n\n{json.dumps(roadmap, indent=2, ensure_ascii=False)}",
            #         "intent": {"mode": "roadmap"},
            #         "sources": [],
            #         "meta": {"used_kb": False, "latency_ms": 0},
            #         "profile_update": {
            #             "roadmap_progress": {
            #                 "job_role": job_role,
            #                 "last_updated": int(datetime.utcnow().timestamp() * 1000),
            #                 "subskills": roadmap["subskills"]
            #             }
            #         }
            #     }
        _ensure_loaded()
        start = time.time()

        # Profile to string
        profile_text = format_profile_for_llm(profile)

        system = build_system_prompt(profile_text, conversation_text="")
        # print("=== PROFILE TEXT SENT TO LLM ===")
        # print(profile_text)
        # print("================================")

        # print("=== RAW INPUT FROM BACKEND WEB ===")
        # print(json.dumps({
        #     "user_id": user_id,
        #     "text": text,
        #     "profile": profile
        # }, indent=2))
        # print("=================================")
        # Intent detection (read only)
        try:
            intent = _intent.predict(text)
        except Exception:
            intent = {"mode": "default"}

        # Detect personal question
        personal = any(
            x in text.lower()
            for x in ["saya", "progress", "modul", "kursus saya", "aku"]
        )

        if detect_job_role(text):
            personal = True
        kb_context = ""
        sources = []
        print("DEBUG detect_job_role →", detect_job_role(text))

        # Only use KB for general queries
        if not personal:
            try:
                q_emb = _model.encode([text], normalize_embeddings=True).astype("float32")
                D, I = _index.search(q_emb, topk)
                rows = _kb.iloc[I[0]]

                kb_context = "\n\n".join(
                    f"[Info] {r['title']} - {r['text'][:300]}"
                    for _, r in rows.iterrows()
                )
                sources = [{"title": r["title"]} for _, r in rows.iterrows()]
            except Exception as e:
                print("KB SEARCH ERROR:", e)

        # Build user prompt
        user_prompt = f'User: "{text}"'
        if kb_context:
            user_prompt += f"\n\nReferences:\n{kb_context}"

        # LLM call
        reply = call_llama(system, user_prompt)

        latency = int((time.time() - start) * 1000)

        # Logging only (stateless)
        log_query(
            user_id=user_id,
            query=text,
            intent=intent,
            response=reply,
            sources=sources,
            meta={"latency_ms": latency}
        )

        
        extracted_update = extract_profile_update(reply) or {}
        # If model did not provide a profile_update → try generate one
        if not extracted_update or not isinstance(extracted_update, dict) or not extracted_update:
            try:
                # User confirms intention
                if is_confirmation_text(text):
                    auto_goals = extract_goal_from_assistant_history(profile or {})
                    if auto_goals:
                        extracted_update = {
                            "learning_profile": {
                                "goals": auto_goals
                            }
                        }
                        print(f"[AUTO-GOAL] Generated profile_update: {extracted_update}")
            except Exception as e:
                print("ERROR inside auto-confirmation heuristic:", e)

        profile_update = deep_merge(extracted_update, history_patch)

        return {
            "response": reply,
            "intent": intent,
            "sources": sources,
            "meta": {
                "latency_ms": latency,
                "personal_query": personal,
                "used_kb": not personal
            },
            "profile_update": profile_update
        }

    except Exception as e:
        print("FATAL ERROR handle_query:", e)
        return {"response": "Terjadi kesalahan internal pada server model."}


def deep_merge(a, b):
    if not isinstance(a, dict) or not isinstance(b, dict):
        return b
    out = dict(a)
    for k, v in b.items():
        if k in out and isinstance(out[k], dict) and isinstance(v, dict):
            out[k] = deep_merge(out[k], v)
        else:
            out[k] = v
    return out

# ============================================================
# JOB ROLE FLOW (STATELESS — MVP)
# ============================================================

def handle_job_description_flow(user_id: str, text: str, profile: Dict[str, Any] = None) -> Dict[str, Any]:
    """Deprecated: KB-based roadmap disabled. Use roadmap_json_engine instead."""
    job_role = detect_job_role(text)
    current_role = (profile.get("roadmap_progress") or {}).get("job_role")

    role_override = detect_job_role(text)
    if role_override:
        if not current_role or role_override != current_role:
            print(f"[ROLE SWITCH] User wants to switch from {current_role} → {role_override}")
            job_role = role_override
            
    if not job_role:
        return {
            "summary": "Tidak menemukan job role yang cocok dari permintaan Anda.",
            "error": None
        }

    roadmap = generate_roadmap_response(job_role)

    return {
        "summary": f"Roadmap untuk {job_role} telah dihasilkan.",
        "job_role": job_role,
        "subskills": roadmap.get("subskills", []),
        "roadmap": roadmap,
        "profile_update": {
            "roadmap_progress": {
                "job_role": job_role,
                "last_updated": int(datetime.utcnow().timestamp() * 1000),
                "subskills": roadmap.get("subskills", [])
            }
        }
    }


