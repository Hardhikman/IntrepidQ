"""
Main FastAPI application - UPDATED for multi-provider model selection
"""
import os
import logging
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

import sys
sys.path.append('.')

from core.supabase_client import get_supabase_service
from core.vector_indexer import load_index
from core.question_generator import create_question_generator

from api.models import HealthResponse
from api.routes.questions import router as questions_router
from api.routes.subjects import router as subjects_router
from api.routes.answer import router as answer_router
from api.routes.model_performance import router as performance_router

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
    """Application lifespan management with Supabase vector store"""
    try:
        logger.info("Initializing AI services...")

        # Get the Supabase client instance first
        supabase_service = get_supabase_service()
        supabase_client = supabase_service._ensure_client()

        # Load Supabase vector store
        try:
            vectorstore = load_index()
            logger.info("Supabase vectorstore loaded successfully")
        except Exception as e:
            logger.error(f"Supabase vectorstore load failed: {e}")
            vectorstore = None

        app_state["vectorstore"] = vectorstore

        # Init Question Generator with all required API keys
        groq_api_key = os.getenv("GROQ_API_KEY")
        if not groq_api_key:
            raise RuntimeError("GROQ_API_KEY not set")
        
        # MODIFIED: Get Google and Together keys for multi-provider support
        google_api_key = os.getenv("GOOGLE_API_KEY")
        #together_key = os.getenv("TOGETHER_API_KEY")

        # MODIFIED: Pass all keys to the factory function
        qg = create_question_generator(
            groq_api_key=groq_api_key,
            google_api_key=google_api_key,
            #together_api_key=together_key,
            vectorstore=vectorstore,
            supabase_client=supabase_client
        )
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

# ==========================================
# CORS Setup — supports prod, preview, local
# ==========================================

ALLOWED_ORIGINS = [
    o.strip() for o in os.getenv("FRONTEND_URL", "").split(",") if o.strip()
]

if "http://localhost:3000" not in ALLOWED_ORIGINS:
    ALLOWED_ORIGINS.append("http://localhost:3000")

logger.info(f"CORS allowed origins: {ALLOWED_ORIGINS}")

# FastAPI app
app = FastAPI(
    title="UPSC Question Generator AI Service",
    version="1.0.0",
    description="AI service for generating UPSC Mains questions with Supabase integration",
    lifespan=lifespan
)

# Standard CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS if ALLOWED_ORIGINS else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(questions_router, prefix="/api", tags=["questions"])
app.include_router(subjects_router, prefix="/api", tags=["subjects"])
app.include_router(answer_router, prefix="/api", tags=["answer"])
app.include_router(performance_router, prefix="/api", tags=["performance"])


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
def test_cors():
    return {"message": "CORS is working!", "status": "success"}

# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    response = JSONResponse(status_code=exc.status_code, content={"error": exc.detail})
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    return response

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {exc}")
    response = JSONResponse(status_code=500, content={"error": "Internal server error"})
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    return response

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api.main:app", host="0.0.0.0", port=8000, reload=True, log_level="info")
