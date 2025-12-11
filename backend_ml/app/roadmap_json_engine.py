# roadmap_json_engine.py
import json
import os

BASE_DIR = os.path.dirname(__file__)  
ROADMAP_PATH = os.path.join(BASE_DIR, "roadmap", "roadmaps.json")
# Load once
with open(ROADMAP_PATH, "r", encoding="utf-8") as f:
    ROADMAP_DATA = json.load(f)


def get_roadmap_for_role(job_role: str):
    for item in ROADMAP_DATA:
        if item["job_role"].lower() == job_role.lower():
            return item
    return None


def generate_roadmap_response(job_role: str):
    data = get_roadmap_for_role(job_role)
    if not data:
        return {
            "ok": False,
            "reply": f"Roadmap untuk {job_role} tidak ditemukan."
        }

    # For prototype, return full roadmap directly
    return {
        "ok": True,
        "job_role": job_role,
        "version": data["version"],
        "description": data["description"],
        "subskills": data["subskills"]
    }
