import logging
from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, Optional

from api.auth import get_current_user
from core.supabase_client import get_supabase_service
from api.models import FeedbackCreate, SuccessResponse

logger = logging.getLogger(__name__)
router = APIRouter()
supabase_service = get_supabase_service()

@router.post("/", response_model=SuccessResponse)
async def submit_feedback(
    feedback_data: FeedbackCreate,
    user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Submit feedback for a generated question.
    """
    try:
        user_id = user['id']

        success = supabase_service.save_question_feedback(
            user_id=user_id,
            question_id=feedback_data.question_id,
            rating=feedback_data.rating,
            comment=feedback_data.comment
        )

        if not success:
            raise HTTPException(status_code=500, detail="Failed to save feedback.")

        # Log analytics event
        supabase_service.log_analytics(
            user_id=user_id,
            action="submit_feedback",
            subject=None, # We might not have this context here, can be added later
            topic=None,
            success=True
        )

        return SuccessResponse(message="Feedback submitted successfully.")

    except Exception as e:
        logger.error(f"Error submitting feedback: {e}")
        # Log failure analytics
        supabase_service.log_analytics(
            user_id=user.get('id') if user else None,
            action="submit_feedback",
            success=False,
            error_message=str(e)
        )
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")
