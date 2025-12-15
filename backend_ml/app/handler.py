# ============================================================
# handler.py — CLEAN MVP VERSION (SAFE, FUNCTIONAL, NO MAGIC)
# ============================================================

import time
import json
import re
import hashlib
import asyncio
from typing import Dict, Any
from datetime import datetime

from groq import Groq

from .runtime import load_runtime
from .logger import log_query
from .config import GROQ_API_KEY, DEFAULT_TOPK, BACKEND_URL, SECRET
from .detect_jobrole import detect_job_role, JOB_ROLE_KEYWORDS
from .roadmap_json_engine import generate_roadmap_response
from .adaptive_filter import filter_roadmap_for_user
from .skill_progress_engine import generate_skill_progress_for_roadmap
from .course_catalog import COURSE_CATALOG
from .micro_confirm import detect_confirmation_micro

# ============================================================
# GLOBALS (MVP SAFE)
# ============================================================

client = Groq(api_key=GROQ_API_KEY)

MAX_RESPONSE_TIME = 8.0
CACHE_LIMIT = 500
_response_cache: Dict[str, Dict[str, Any]] = {}

# ============================================================
# UTILITIES
# ============================================================

def _now_ms() -> int:
    return int(time.time() * 1000)


def _time_exceeded(start: float, limit: float = MAX_RESPONSE_TIME) -> bool:
    return (time.time() - start) > limit


def _cache_key(text: str, user_id: str, profile: Dict[str, Any]) -> str:
    role = (profile.get("roadmap_progress") or {}).get("job_role", "")
    active = ",".join((profile.get("platform_data") or {}).get("active_courses", []))
    raw = f"{text.lower().strip()}:{user_id}:{role}:{active}"
    return hashlib.md5(raw.encode()).hexdigest()


def _cache_get(key: str):
    return _response_cache.get(key)


def _cache_set(key: str, value: Dict[str, Any]):
    if len(_response_cache) >= CACHE_LIMIT:
        _response_cache.clear()
    _response_cache[key] = value


# ============================================================
# LLM
# ============================================================

def call_llama(system_prompt: str, user_prompt: str) -> str:
    resp = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[
            {"role": "system", "content": system_prompt[:1200]},
            {"role": "user", "content": user_prompt[:800]},
        ],
        max_tokens=128,
        temperature=0.3,
        timeout=3.0,
    )
    return resp.choices[0].message.content


# ============================================================
# PROFILE → TEXT (SAFE)
# ============================================================

def format_profile_for_llm(profile: Dict[str, Any]) -> str:
    if not isinstance(profile, dict):
        return "No profile available."

    plat = profile.get("platform_data") or {}
    lp = profile.get("learning_profile") or {}

    lines = []

    if plat.get("name"):
        lines.append(f"Name: {plat['name']}")

    if isinstance(plat.get("active_courses"), list) and plat["active_courses"]:
        lines.append("Active Courses: " + ", ".join(plat["active_courses"]))

    if isinstance(lp.get("goals"), list) and lp["goals"]:
        lines.append("Goals: " + ", ".join(lp["goals"]))

    if isinstance(lp.get("skills"), dict) and lp["skills"]:
        skills = ", ".join(f"{k}: {v}" for k, v in lp["skills"].items())
        lines.append(f"Skills: {skills}")

    return "\n".join(lines) if lines else "No relevant student data available."


# ============================================================
# SYSTEM PROMPT
# ============================================================

def build_system_prompt(profile_text: str) -> str:
    return f"""
You are Learning Buddy, an adaptive learning assistant for Indonesian students.

Rules:
- Answer clearly in Bahasa Indonesia unless user explicitly asks otherwise.
- Do NOT invent profile data.
- Backend always sends full profile each request.
- You MAY output <profile_update>JSON</profile_update> ONLY if user explicitly provides new information.
- Do NOT output unknown fields, null values, created_at, or updated_at.

Profile update schema (STRICT):
- platform_data (optional)
- learning_profile (goals, skills, focus)
- roadmap_progress (job_role, subskills, skills_status)

Adapt tone based on goals, skills, and focus if present.

STUDENT INFO:
{profile_text}

Now answer the user.

"""


# ============================================================
# MAIN HANDLER
# ============================================================

async def handle_query(
    user_id: str,
    text: str,
    profile: Dict[str, Any],
    topk: int = DEFAULT_TOPK,
) -> Dict[str, Any]:

    start_time = time.time()

    if not isinstance(text, str) or not text.strip():
        return {"response": "Pesan tidak boleh kosong."}

    if not isinstance(profile, dict):
        profile = {}

    # ================= CACHE =================
    cache_key = _cache_key(text, user_id, profile)
    cached = _cache_get(cache_key)
    if cached:
        return cached

    rt = load_runtime()

    # ========================================================
    # ROADMAP FLOW (NO LLM)
    # ========================================================
    job_role = detect_job_role(text)

    if job_role or "roadmap" in text.lower():
        stored_role = (profile.get("roadmap_progress") or {}).get("job_role")
        final_role = job_role or stored_role

        if not final_role:
            return {
                "response": "Sebutkan role yang kamu inginkan (contoh: Android Developer).",
                "intent": {"mode": "ask_job_role"},
                "profile_update": {},
            }

        roadmap = generate_roadmap_response(final_role)
        if not roadmap.get("ok"):
            return {"response": f"Roadmap untuk {final_role} tidak ditemukan."}

        skill_status = generate_skill_progress_for_roadmap(
            roadmap=roadmap,
            profile=profile,
            course_catalog=COURSE_CATALOG,
        )

        filtered = filter_roadmap_for_user(roadmap, skill_status)

        patch = {
            "roadmap_progress": {
                "job_role": final_role,
                "last_updated": _now_ms(),
                "subskills": filtered,
                "skills_status": skill_status,
            }
        }

        # push to backend web (best-effort)
        if BACKEND_URL and SECRET:
            try:
                import requests

                requests.post(
                    BACKEND_URL,
                    json={"user_id": user_id, "patch": patch},
                    headers={"x-admin-secret": SECRET},
                    timeout=5,
                )
            except Exception:
                pass

        result = {
            "ok": True,
            "reply": f"Roadmap untuk {final_role} siap digunakan.",
            "intent": {"mode": "roadmap"},
            "meta": {
                "type": "roadmap",
                "job_role": final_role,
                "subskills": filtered,
            },
            "profile_update": patch,
        }

        _cache_set(cache_key, result)
        return result

    # ========================================================
    # COURSE RECOMMENDATION (NO LLM)
    # ========================================================
    micro = detect_confirmation_micro(text)
    stored_role = (profile.get("roadmap_progress") or {}).get("job_role")

    if "rekomendasi" in text.lower() and "kelas" in text.lower():
        desired_role = detect_job_role(text) or stored_role

        if not desired_role:
            return {
                "response": "Pilih role terlebih dahulu sebelum rekomendasi kelas.",
                "intent": {"mode": "ask_job_role"},
            }

        recommended = []
        active = set((profile.get("platform_data") or {}).get("active_courses", []))

        for c in COURSE_CATALOG:
            name = c.get("course_name")
            if not name or name in active:
                continue
            recommended.append(
                {
                    "id": c.get("course_id"),
                    "title": name,
                    "hours": c.get("hours_to_study", 0),
                }
            )
            if len(recommended) >= 5:
                break

        result = {
            "ok": True,
            "response": f"Berikut rekomendasi kelas untuk {desired_role}:",
            "intent": {"mode": "course_recommendation"},
            "meta": {"courses": recommended},
            "profile_update": {},
        }

        _cache_set(cache_key, result)
        return result

    # ========================================================
    # LLM FALLBACK (TIMEOUT SAFE)
    # ========================================================
    profile_text = format_profile_for_llm(profile)
    system_prompt = build_system_prompt(profile_text)
    user_prompt = f"User: {text}"

    try:
        reply = await asyncio.wait_for(
            asyncio.to_thread(call_llama, system_prompt, user_prompt),
            timeout=7.0,
        )
    except Exception:
        return {
            "response": "Pertanyaan sedang diproses. Silakan coba lagi.",
            "intent": {"mode": "timeout"},
            "profile_update": {},
        }

    latency = int((time.time() - start_time) * 1000)

    log_query(
        user_id=user_id,
        query=text,
        intent={"mode": "default"},
        response=reply,
        sources=[],
        meta={"latency_ms": latency},
    )

    result = {
        "response": reply,
        "intent": {"mode": "default"},
        "meta": {"latency_ms": latency},
        "profile_update": {},
    }

    _cache_set(cache_key, result)
    return result

def handle_job_description_flow(
    user_id: str,
    text: str,
    profile: Dict[str, Any] | None = None,
) -> Dict[str, Any]:
    """
    Stub function to satisfy main.py import.
    Job role handling is managed inside handle_query for MVP.
    """
    return {
        "summary": "Job role flow handled via main chat.",
        "roadmap": None,
        "profile_update": {}
    }
