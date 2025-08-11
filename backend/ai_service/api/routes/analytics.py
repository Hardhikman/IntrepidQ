import logging
from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, List

from api.auth import get_current_user
from core.supabase_client import get_supabase_service

logger = logging.getLogger(__name__)
router = APIRouter()
supabase_service = get_supabase_service()

@router.get("/summary")
async def get_summary(user: Dict[str, Any] = Depends(get_current_user)):
    """
    Get a summary of analytics for the dashboard.
    """
    try:
        user_id = user['id']
        summary = supabase_service.get_analytics_summary(user_id)

        # Log analytics event for dashboard view
        supabase_service.log_analytics(
            user_id=user_id,
            action="view_dashboard",
            success=True
        )

        return summary
    except Exception as e:
        logger.error(f"Error getting analytics summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/feedback/recent")
async def get_recent_feedback(user: Dict[str, Any] = Depends(get_current_user)):
    """
    Get a list of recent feedback for the dashboard.
    """
    try:
        feedback = supabase_service.get_recent_feedback()
        return {"feedback": feedback}
    except Exception as e:
        logger.error(f"Error getting recent feedback: {e}")
        raise HTTPException(status_code=500, detail=str(e))
