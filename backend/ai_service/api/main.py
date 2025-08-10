"""
Main FastAPI application - CORS FIXED VERSION
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

# Load environment
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global state
app_state = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management"""
    # Startup
    try:
        logger.info("Initializing AI services...")
        
        # Load FAISS index
        persist_dir = os.getenv("FAISS_DIR", "data/faiss_db")
        vectorstore = load_index(persist_dir)
        app_state["vectorstore"] = vectorstore
        logger.info("FAISS vectorstore loaded successfully")
        
        # Initialize question generator
        groq_api_key = os.getenv("GROQ_API_KEY")
        if not groq_api_key:
            raise RuntimeError("GROQ_API_KEY not set")
        
        question_generator = create_question_generator(groq_api_key, vectorstore)
        app_state["question_generator"] = question_generator
        logger.info("Question generator initialized successfully")
        
        logger.info("🚀 AI services initialized successfully")
        
    except Exception as e:
        logger.error(f"❌ Failed to initialize AI services: {e}")
        raise
    
    yield
    
    # Shutdown
    app_state.clear()
    logger.info("🛑 AI services shut down")

# Create FastAPI app
app = FastAPI(
    title="UPSC Question Generator AI Service",
    version="1.0.0",
    description="AI service for generating UPSC Mains questions with Supabase integration",
    lifespan=lifespan
)

# 🔥 NUCLEAR CORS FIX - Manual middleware
@app.middleware("http")
async def cors_handler(request: Request, call_next):
    # Handle preflight requests
    if request.method == "OPTIONS":
        response = JSONResponse(content={})
        response.headers["Access-Control-Allow-Origin"] = "http://localhost:3000"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "*"
        response.headers["Access-Control-Allow-Credentials"] = "true"
        return response
    
    # Process normal requests
    response = await call_next(request)
    
    # Add CORS headers to all responses
    response.headers["Access-Control-Allow-Origin"] = "http://localhost:3000"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "*"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    
    return response

# Also add the standard CORS middleware as backup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all for now
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(questions_router, prefix="/api", tags=["questions"])
app.include_router(subjects_router, prefix="/api", tags=["subjects"])
app.include_router(answer_router, prefix="/api", tags=["answer"])

@app.get("/")
def root():
    """Root endpoint"""
    return {
        "message": "🎓 UPSC Question Generator AI Service", 
        "status": "active",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/health", response_model=HealthResponse)
def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        services={
            "vectorstore": app_state.get("vectorstore") is not None,
            "question_generator": app_state.get("question_generator") is not None,
            "supabase": bool(os.getenv("SUPABASE_URL"))
        },
        timestamp=datetime.utcnow()
    )

@app.get("/test-cors")
def test_cors():
    """Test CORS configuration"""
    return {"message": "CORS is working!", "status": "success", "origin": "allowed"}

# Exception handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    response = JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail, "status_code": exc.status_code}
    )
    # Add CORS headers to error responses too
    response.headers["Access-Control-Allow-Origin"] = "http://localhost:3000"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    return response

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {exc}")
    response = JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "status_code": 500}
    )
    # Add CORS headers to error responses too
    response.headers["Access-Control-Allow-Origin"] = "http://localhost:3000"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    return response

# Export for use by route handlers
__all__ = ["app"]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "api.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )