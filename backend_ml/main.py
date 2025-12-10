# ============================
# FINAL CLEAN main.py (MVP VERSION)
# ============================

from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from app.handler import handle_query, handle_job_description_flow
import traceback
import os


app = FastAPI(title="Learning Buddy ML Backend (MVP)")


# ============================
# CORS
# ============================

allowed_origins = os.environ.get("MODEL_API_ALLOWED_ORIGINS", "*")
origins = ["*"] if allowed_origins == "*" else [
    o.strip() for o in allowed_origins.split(",") if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================
# REQUEST MODELS
# ============================

class ChatReq(BaseModel):
    user_id: str
    text: str
    mode: str | None = None
    profile: dict | None = None


# ============================
# HEALTH
# ============================

@app.get("/health")
async def health():
    return {"status": "ok", "message": "ML backend running (MVP mode)"}


# ============================
# CHAT ROUTE
# ============================

@app.post("/chat")
async def chat(req: ChatReq):
    """
    Unified chat handler.
    If mode=job_role → run job-role pipeline.
    Otherwise → normal chat LLM pipeline.
    """
    try:
        # SPECIAL CASE: job role (roadmap generation)
        if req.mode == "job_role":
            try:
                result = handle_job_description_flow(
                    req.user_id,
                    req.text,
                    req.profile
                )
                return {
                    "ok": True,
                    "type": "job_role",
                    "response": result.get("summary"),
                    "roadmap": result.get("roadmap"),
                    "profile_update": result.get("profile_update")
                }
            except Exception as e:
                print("=== Job-role flow crash ===")
                traceback.print_exc()
                return {"ok": False, "error": "job_role_failed", "detail": str(e)}

        # NORMAL CHAT MODE
        try:
            result = await handle_query(
                user_id=req.user_id,
                text=req.text,
                profile=req.profile
            )
            return {
                "ok": True,
                "type": "chat",
                "response": result.get("response"),
                "intent": result.get("intent"),
                "sources": result.get("sources", []),
                "meta": result.get("meta", {}),
                "profile_update": result.get("profile_update")
            }
        except Exception as e:
            print("=== handle_query crash ===")
            traceback.print_exc()
            return {"ok": False, "error": "chat_failed", "detail": str(e)}

    except Exception as e:
        print("=== outer handler crash ===")
        traceback.print_exc()
        return {"ok": False, "error": "server_crash", "detail": str(e)}
