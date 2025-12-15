from fastapi import FastAPI, Response
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.handler import handle_query, handle_job_description_flow
import traceback
import os
import threading
import asyncio

# ============================
# GLOBAL READINESS STATE
# ============================
_is_ready = False
_warmup_lock = threading.Lock()

# ============================
# LIFESPAN EVENT HANDLER
# ============================
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle startup and shutdown events"""
    # STARTUP
    print("[STARTUP] 🚀 FastAPI application starting...")
    print("[STARTUP] 🔥 Launching background model warmup...")
    
    thread = threading.Thread(
        target=background_warmup,
        daemon=True,
        name="ModelWarmupThread"
    )
    thread.start()
    
    print("[STARTUP] ✅ Background warmup thread started")
    
    yield
    
    # SHUTDOWN
    print("[SHUTDOWN] 👋 Application shutting down...")

# ============================
# FASTAPI APP WITH LIFESPAN
# ============================
app = FastAPI(
    title="Learning Buddy ML Backend",
    lifespan=lifespan
)

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
# HEALTH CHECKS
# ============================
@app.get("/health")
async def health():
    """Lightweight health check - always returns OK"""
    return {"status": "ok", "message": "Service is alive"}

@app.get("/ready")
async def ready():
    """Readiness check - returns 503 until models loaded"""
    global _is_ready
    
    if _is_ready:
        return {"status": "ready", "models_loaded": True}
    
    return Response(
        content='{"status":"warming_up","models_loaded":false}',
        status_code=503,
        media_type="application/json"
    )

# ============================
# CHAT ROUTE
# ============================
@app.post("/chat")
async def chat(req: ChatReq):
    """Unified chat handler"""
    global _is_ready
    
    # Wait for models if not ready
    if not _is_ready:
        max_wait = 60  # 60 seconds max wait
        waited = 0
        while not _is_ready and waited < max_wait:
            await asyncio.sleep(1)
            waited += 1
        
        if not _is_ready:
            return {
                "ok": False,
                "error": "service_not_ready",
                "detail": "Models are still loading, please try again in a moment"
            }
    
    try:
        # JOB ROLE MODE
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
                return {
                    "ok": False,
                    "error": "job_role_failed",
                    "detail": str(e)
                }
        
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
            return {
                "ok": False,
                "error": "chat_failed",
                "detail": str(e)
            }
    
    except Exception as e:
        print("=== outer handler crash ===")
        traceback.print_exc()
        return {
            "ok": False,
            "error": "server_crash",
            "detail": str(e)
        }

# ============================
# BACKGROUND WARMUP
# ============================
def background_warmup():
    global _is_ready
    
    with _warmup_lock:
        try:
            print("=" * 50)
            print("[WARMUP] 🔄 Starting ML model warmup...")
            print("=" * 50)
            
            from app.runtime import load_runtime
            load_runtime()
            
            _is_ready = True
            
            print("=" * 50)
            print("[WARMUP] ✅ ML models loaded successfully!")
            print("[WARMUP] ✅ Service is now READY")
            print("=" * 50)
            
        except Exception as e:
            _is_ready = False
            print("=" * 50)
            print("[WARMUP] ❌ Model loading FAILED!")
            print(f"[WARMUP] Error: {e}")
            print("=" * 50)
            traceback.print_exc()

# ============================
# ENTRYPOINT
# ============================
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    print(f"🚀 Starting server on port {port}")
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        log_level="info",
    )
