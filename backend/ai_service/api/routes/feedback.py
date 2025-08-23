"""
API routes for website feedback - bug reports and feature requests
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from api.auth import get_current_user
from core.supabase_client import supabase_service

logger = logging.getLogger(__name__)
router = APIRouter()

class WebsiteFeedbackRequest(BaseModel):
    type: str  # "bug" or "feature"
    comment: str

@router.post("/website_feedback")
async def submit_website_feedback(
    request: WebsiteFeedbackRequest,
    user: dict = Depends(get_current_user)
):
    """Submit website feedback (bug report or feature request)"""
    try:
        # Insert feedback into the question_feedback table
        # For website feedback, question_id should be NULL
        feedback_data = {
            "user_id": user["id"],
            "rating": 5 if request.type == "feature" else 1,  # Using rating to distinguish types
            "comment": request.comment,
            "feedback_type": request.type,  # New column for feedback type
            "question_id": None  # Website feedback doesn't relate to a specific question
        }
        
        client = supabase_service().client
        if client is None:
            raise HTTPException(status_code=500, detail="Supabase client not initialized")
            
        response = client.table("question_feedback").insert(feedback_data).execute()
        
        # Also log to usage analytics
        analytics_data = {
            "user_id": user["id"],
            "action": f"website_feedback_{request.type}",
            "success": True,
            "comment": request.comment[:100]  # First 100 chars for analytics
        }
        client.table("usage_analytics").insert(analytics_data).execute()
        
        return {"message": "Feedback submitted successfully"}
        
    except Exception as e:
        logger.error(f"Error submitting website feedback: {e}")
        raise HTTPException(status_code=500, detail="Failed to submit feedback")
