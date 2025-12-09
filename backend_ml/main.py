from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from app import init_db
from app.handler import handle_query, handle_job_description_flow, load_my_courses, load_my_tutorials
from app.roadmap_engine import (
    auto_update_roadmap_from_progress,
    get_adaptive_recommendations,
    update_roadmap_skill_level
)
from app.scheduler import start_scheduler
from fastapi.middleware.cors import CORSMiddleware
import os
import traceback


engine = init_db()
start_scheduler()

app = FastAPI(title="Retrieval-Augmented Chat (Groq + SBERT + FAISS)")

# Allow cross-origin requests from the web frontend. Configure via ENV or allow all in dev.
allowed_origins = os.environ.get("MODEL_API_ALLOWED_ORIGINS", "*")
if allowed_origins == "*":
    origins = ["*"]
else:
    origins = [o.strip() for o in allowed_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatReq(BaseModel):
    user_id: str
    text: str
    # optional hint to force a specific flow, e.g. "job_role"
    mode: str = None


class SkillUpdateReq(BaseModel):
    user_id: str
    subskill_id: str
    level: str  # "Beginner", "Intermediate", or "Advanced"
    notes: str = ""


@app.get("/health")
async def health():
    return {"status": "ok", "message": "API is running"}


@app.post('/chat')
async def chat(req: ChatReq):
    try:
        # If caller requested a specific flow, handle it directly
        if req.mode == "job_role":
            try:
                out = handle_job_description_flow(req.user_id, req.text)
                return out
            except Exception as e:
                print("=== SERVER CRASH (job_role) ===")
                print(str(e))
                traceback.print_exc()
                return {"error": "server_crash", "detail": str(e)}

        try:
            result = await handle_query(user_id=req.user_id, text=req.text)
            return result
        except Exception as e:
            print("=== SERVER CRASH (handle_query) ===")
            print(str(e))
            traceback.print_exc()
            return {"error": "server_crash", "detail": str(e)}
    except Exception as e:
        print("=== OUTER SERVER CRASH ===")
        print(str(e))
        traceback.print_exc()
        return {"error": "server_crash", "detail": str(e)}


@app.post('/roadmap/auto-update')
async def auto_update_roadmap(req: ChatReq):
    """Automatically update roadmap skills based on current course progress."""
    try:
        course_rows = load_my_courses() or []
        result = auto_update_roadmap_from_progress(req.user_id, course_rows)
        return {"status": "ok", "roadmap_progress": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post('/roadmap/update-skill')
async def update_skill(req: SkillUpdateReq):
    """Manually update a specific skill's level in the roadmap."""
    try:
        result = update_roadmap_skill_level(req.user_id, req.subskill_id, req.level, req.notes)
        if not result:
            raise HTTPException(status_code=400, detail="Failed to update skill")
        return {"status": "ok", "roadmap_progress": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get('/roadmap/recommendations/{user_id}')
async def get_recommendations(user_id: str):
    """Get adaptive recommendations based on current roadmap progress."""
    try:
        course_rows = load_my_courses() or []
        result = get_adaptive_recommendations(user_id, course_rows)
        if "error" in result:
            raise HTTPException(status_code=404, detail=result["error"])
        return {"status": "ok", "recommendations": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))