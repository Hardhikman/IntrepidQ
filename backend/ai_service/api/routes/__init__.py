"""
API routes initialization
"""
import sys
sys.path.append('.')

from api.routes.questions import router as questions_router
from api.routes.subjects import router as subjects_router
from api.routes.answer import router as answer_router

__all__ = ["questions_router", "subjects_router", "answer_router"]