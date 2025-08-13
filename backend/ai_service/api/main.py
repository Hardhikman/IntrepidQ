"""
Main FastAPI application - Production Ready with CORS Fix & FAISS fallback
"""

import os
import logging
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

import sys
sys.path.append('.')

from core.vector_indexer import load_index
from core.question_generator import create_question_generator

from api.models import HealthResponse
from api.routes.questions import router as questions_router
from api.routes.subjects import router as subjects_router
from api.routes.answer import router as answer_router

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Global state
app_state = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management with FAISS fallback"""
    try:
        logger.info("Initializing AI services...")

        # Load FAISS — allow startup even if missing
        persist_dir = os.getenv("FAISS_DIR", "data/faiss_db")
        try:
            if not os.path.exists(persist_dir):
                logger.warning(f"FAISS directory {persist_dir} not found. Starting without it.")
                vectorstore = None
            else:
                vectorstore = load_index(persist_dir)
                logger.info("FAISS vectorstore loaded successfully")
        except Exception as e:
            logger.error(f"FAISS load failed: {e}")
            vectorstore = None

        app_state["vectorstore"] = vectorstore

        # Init Question Generator
        groq_api_key = os.getenv("GROQ_API_KEY")
        if not groq_api_key:
            raise RuntimeError("GROQ_API_KEY not set")
        together_key = os.getenv("TOGETHER_API_KEY")
        qg = create_question_generator(groq_api_key, together_key, vectorstore)
        app_state["question_generator"] = qg
        logger.info("Question generator initialized")

        logger.info("AI services ready")
    except Exception as e:
        logger.error(f"Startup failed: {e}")
        app_state.update({"vectorstore": None, "question_generator": None})

    yield

    # Shutdown
    app_state.clear()
    logger.info("AI services shut down")


# --------------------------
# CORS CONFIGURATION
# --------------------------

# Parse FRONTEND_URL env (comma-separated allowed origins)
frontend_urls = os.getenv("FRONTEND_URL", "").strip()
if frontend_urls:
    allowed_from_env = [url.strip() for url in frontend_urls.split(",") if url.strip()]
else:
    allowed_from_env = []

# Default origins (local dev always allowed)
ALLOWED_ORIGINS = ["http://localhost:3000"] + allowed_from_env

# For extra safety: allow all in development if no env provided
if os.getenv("DEBUG", "false").lower() == "true" and not allowed_from_env:
    ALLOWED_ORIGINS = ["*"]

logger.info(f"[CORS] Allowed origins: {ALLOWED_ORIGINS}")


# --------------------------
# FASTAPI APP
# --------------------------

app = FastAPI(
    title="UPSC Question Generator AI Service",
    version="1.0.0",
    description="AI service for generating UPSC Mains questions with Supabase integration",
    lifespan=lifespan
)

# Attach CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Routers
app.include_router(questions_router, prefix="/api", tags=["questions"])
app.include_router(subjects_router, prefix="/api", tags=["subjects"])
app.include_router(answer_router, prefix="/api", tags=["answer"])


@app.get("/")
def root():
    return {
        "message": "🎓 UPSC Question Generator AI Service",
        "status": "active",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health", response_model=HealthResponse)
def health_check():
    return HealthResponse(
        status="healthy",
        services={
            "vectorstore": bool(app_state.get("vectorstore")),
            "question_generator": bool(app_state.get("question_generator")),
            "supabase": bool(os.getenv("SUPABASE_URL"))
        },
        timestamp=datetime.utcnow()
    )


@app.get("/test-cors")
def test_cors(request: Request):
    origin = request.headers.get("origin")
    return {
        "message": "CORS is working!",
        "status": "success",
        "your_origin": origin
    }


# --------------------------
# ERROR HANDLERS
# (No need to manually set CORS headers — CORSMiddleware does it)
# --------------------------

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(status_code=exc.status_code, content={"error": exc.detail})


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(status_code=500, content={"error": "Internal server error"})


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "api.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
