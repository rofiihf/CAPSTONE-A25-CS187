import time
import json
import re
import numpy as np
from typing import Dict, Any
from datetime import datetime

from .embeddings_utils import load_kb, load_faiss, get_model
from .intent_model import IntentPipeline
from .logger import log_query
from .roadmap_kb_engine import kb_based_roadmap
from .config import GROQ_API_KEY, SBERT_MODEL_PATH, DEFAULT_TOPK

from groq import Groq
import os


# ============================================================
# MODEL CLIENT
# ============================================================
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
        hist = (profile or {}).get("learning_profile", {}).get("history", []) or []

        for entry in reversed(hist):
            resp = entry.get("response")
            if not resp:
                continue

            # 1. Cari JSON di <profile_update>
            m = PROFILE_UPDATE_TAG_RE.search(resp)
            if m:
                try:
                    j = json.loads(m.group(1).strip())
                    goals = j.get("learning_profile", {}).get("goals")
                    if goals and isinstance(goals, list):
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

    except Exception:
        pass

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
        plat = profile.get("platform_data", {}) or {}
        lp = profile.get("learning_profile", {}) or {}

        lines = []

        # Identity
        name = plat.get("name")
        email = plat.get("email")
        if name:
            lines.append(f"Name: {name}")

        if email:
            lines.append(f"Email: {email}")

        # Active courses
        active = plat.get("active_courses") or []
        if isinstance(active, list) and active:
            lines.append("Active Courses: " + ", ".join(active))

        # Current focus
        cf = lp.get("current_focus") or {}
        if isinstance(cf, dict) and cf.get("course"):
            module = cf.get("module", 0)
            lines.append(f"Current Focus: {cf['course']} (module {module})")

        # Goals
        goals = lp.get("goals") or []
        if isinstance(goals, list) and goals:
            lines.append("Goals: " + ", ".join(goals))

        # Weaknesses
        weaknesses = lp.get("weaknesses") or []
        if isinstance(weaknesses, list) and weaknesses:
            lines.append("Weaknesses: " + ", ".join(weaknesses))

        # Strengths
        strengths = lp.get("strengths") or []
        if isinstance(strengths, list) and strengths:
            lines.append("Strengths: " + ", ".join(strengths))

        # Skills
        skills = lp.get("skills") or {}
        if isinstance(skills, dict) and skills:
            skill_pairs = [f"{k}: {v}" for k, v in skills.items()]
            lines.append("Skills: " + ", ".join(skill_pairs))

        # If empty → avoid sending blank block
        if not lines:
            return "No relevant student data available."

        return "\n".join(lines)

    except Exception as e:
        print("ERROR in format_profile_for_llm:", e)
        return "Profile formatting error."

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

        raw = m.group(1).strip()
        return json.loads(raw)
    except Exception as e:
        print("ERROR in extract_profile_update:", e)
        return {}
    
# ============================================================
# MAIN CHAT HANDLER (STATELESS)
# ============================================================

async def handle_query(
    user_id: str,
    text: str,
    profile: Dict[str, Any],
    topk: int = DEFAULT_TOPK
) -> Dict[str, Any]:


    history_patch = {}
    extracted_update = {}
    try:
        if not text.strip():
            return {"response": "Pesan tidak boleh kosong."}

        _ensure_loaded()
        start = time.time()

        # Profile to string
        profile_text = format_profile_for_llm(profile)

        system = build_system_prompt(profile_text, conversation_text="")
        print("=== PROFILE TEXT SENT TO LLM ===")
        print(profile_text)
        print("================================")

        print("=== RAW INPUT FROM BACKEND WEB ===")
        print(json.dumps({
            "user_id": user_id,
            "text": text,
            "profile": profile
        }, indent=2))
        print("=================================")
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

        kb_context = ""
        sources = []

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
    """Minimal job-role → roadmap generator (stateless)."""
    try:
        roadmap = kb_based_roadmap(text)

        summary = f"Recommended role: {roadmap['job_role']}\n"
        for s in roadmap["subskills"]:
            summary += f"- {s['name']}: {s['next_step']}\n"

        # Profile update: set job role and subskills
        profile_update = {
            "roadmap_progress": {
                "job_role": roadmap.get("job_role"),
                "last_updated": int(datetime.utcnow().timestamp() * 1000),
                "subskills": roadmap.get("subskills", []),
            }
        }

        return {
            "summary": summary,
            "job_role": roadmap["job_role"],
            "subskills": roadmap["subskills"],
            "roadmap": roadmap,
            "profile_update": profile_update
        }

    except Exception as e:
        print("ERROR job role:", e)
        return {
            "summary": "Gagal menghasilkan roadmap.",
            "error": str(e)
        }

