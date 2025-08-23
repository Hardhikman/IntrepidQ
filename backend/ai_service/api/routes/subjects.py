"""
API routes for Subject management - with multi-provider model selection
"""
import logging
from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, Optional
import sys
sys.path.append('.')

from api.auth import get_current_user, get_optional_user
from api.models import (
    SubjectsResponse, UserProfileResponse, UserStatsResponse, ModeBreakdown
)
from core.supabase_client import supabase_service

logger = logging.getLogger(__name__)
router = APIRouter()

# INTERNAL HELPERS

def _send_feedback_email(user: Dict[str, Any], feedback_data: Dict[str, Any]) -> None:
    """Send feedback via SMTP (best-effort)."""
    try:
        import os
        import smtplib, ssl
        from email.message import EmailMessage

        smtp_host = os.getenv("SMTP_HOST")
        smtp_port = int(os.getenv("SMTP_PORT", "587"))
        smtp_user = os.getenv("SMTP_USERNAME")
        smtp_pass = os.getenv("SMTP_PASSWORD")
        to_addr = os.getenv("FEEDBACK_EMAIL_TO")

        if not (smtp_host and smtp_user and smtp_pass and to_addr):
            logger.info("SMTP not configured; skipping feedback email")
            return

        comment = (feedback_data.get('comment') or '').strip()
        if not comment:
            return

        rating = feedback_data.get('rating')
        question_id = feedback_data.get('question_id')
        generation_id = feedback_data.get('generation_id')

        msg = EmailMessage()
        msg['Subject'] = "New Feedback Comment"
        msg['From'] = smtp_user
        msg['To'] = to_addr
        body = (
            f"New feedback received:\n"
            f"User ID: {user.get('id')}\n"
            f"User Email: {user.get('email')}\n"
            f"Rating: {rating}\n"
            f"Generation ID: {generation_id}\n"
            f"Question ID: {question_id}\n"
            f"Comment:\n{comment}\n"
        )
        msg.set_content(body)

        context = ssl.create_default_context()
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls(context=context)
            server.login(smtp_user, smtp_pass)
            server.send_message(msg)

    except Exception as e:
        logger.warning(f"Failed to send feedback email: {e}")


def get_question_generator():
    """Get question generator - avoiding circular import"""
    try:
        import importlib
        main_module = importlib.import_module('api.main')
        app_state = getattr(main_module, 'app_state', {})
        question_generator = app_state.get("question_generator")
        if not question_generator:
            raise HTTPException(status_code=503, detail="AI service not initialized")
        return question_generator
    except ImportError:
        raise HTTPException(status_code=503, detail="AI service not available")


# ROUTES
@router.get("/subjects", response_model=SubjectsResponse)
async def get_subjects(user: Optional[Dict[str, Any]] = Depends(get_optional_user)):
    """Get all available subjects and topics"""
    try:
        question_generator = get_question_generator()
        subject_info = {
            "GS1": "General Studies Paper 1 - History, Culture, Geography",
            "GS2": "General Studies Paper 2 - Governance, Constitution, Polity",
            "GS3": "General Studies Paper 3 - Technology, Economy, Environment",
            "GS4": "General Studies Paper 4 - Ethics, Integrity, Aptitude"
        }

        subjects = {}
        for subject in subject_info.keys():
            topics = question_generator.get_topics_for_subject(subject)
            subjects[subject] = {"name": subject_info[subject], "topics": topics}

        return SubjectsResponse(subjects=subjects)

    except Exception as e:
        logger.error(f"Error fetching subjects: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch subjects")


@router.get("/user_profile", response_model=UserProfileResponse)
async def get_user_profile(user: Dict[str, Any] = Depends(get_current_user)):
    """Get user profile"""
    try:
        profile = supabase_service().get_user_profile(user['id'])
        if not profile:
            raise HTTPException(status_code=404, detail="User profile not found")
        return UserProfileResponse(profile=profile, user=user)

    except Exception as e:
        logger.error(f"Error fetching user profile: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch user profile")


@router.post("/question_feedback")
async def submit_feedback(feedback_data: Dict[str, Any], user: Dict[str, Any] = Depends(get_current_user)):#tells FastAPI to automatically call the get_current_user function and pass its result as the user argument when this endpoint is called.
    """Submit feedback for a generated question or overall UX"""
    try:
        gen_id = feedback_data.get('generation_id')
        is_generation_level = gen_id in ('generation_feedback', 'website_feedback')

        if is_generation_level:
            success = supabase_service().save_question_feedback(
                user_id=user['id'],
                question_id=None,
                rating=feedback_data['rating'],
                comment=feedback_data.get('comment')
            )
        else:
            required_fields = ['generation_id', 'question_id', 'rating']
            for field in required_fields:
                if field not in feedback_data:
                    raise HTTPException(status_code=400, detail=f"Missing required field: {field}")

            success = supabase_service().save_question_feedback(
                user_id=user['id'],
                question_id=feedback_data['question_id'],
                rating=feedback_data['rating'],
                comment=feedback_data.get('comment')
            )

        if not success:
            raise HTTPException(status_code=500, detail="Failed to save feedback")

        if feedback_data.get('comment'):
            try:
                _send_feedback_email(user, feedback_data)
            except Exception as e:
                logger.warning(f"Email dispatch error: {e}")

        return {"success": True, "message": "Feedback submitted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error submitting feedback: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to submit feedback")


@router.get("/question_history")
async def get_question_history(limit: int = 20, user: Dict[str, Any] = Depends(get_current_user)):
    """Get user's question generation history"""
    try:
        history = supabase_service().get_user_question_history(user['id'], limit)
        return {"history": history}  # Will be [] if nothing
    except Exception as e:
        logger.error(f"Error fetching question history: {e}", exc_info=True)
        # Instead of failing hard, still return empty history
        return {"history": []}


@router.delete("/question_history/{question_id}")
async def delete_question(question_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    """Delete a question from history"""
    try:
        deleted = supabase_service().delete_question(user['id'], question_id)
        if deleted:
            return {"success": True, "message": "Question deleted successfully"}
        else:
            raise HTTPException(status_code=404, detail="Question not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting question: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to delete question")


@router.put("/user_profile")
async def update_user_profile(profile_data: Dict[str, Any], user: Dict[str, Any] = Depends(get_current_user)):
    try:
        allowed_fields = ['username', 'full_name', 'preferred_subjects']
        update_data = {k: v for k, v in profile_data.items() if k in allowed_fields}

        if not update_data:
            raise HTTPException(status_code=400, detail="No valid fields to update")

        response = supabase_service().client.table('user_profiles').update(update_data).eq('id', user['id']).execute()

        if response.data:
            return {"success": True, "message": "Profile updated successfully"}
        else:
            raise HTTPException(status_code=400, detail="Failed to update profile")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user profile: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to update profile")


# User Stats Routes

@router.get("/user_stats", response_model=UserStatsResponse)
async def get_user_stats(user: Dict[str, Any] = Depends(get_current_user)):
    """detailed user statistics- with safe no NoneType errors)"""
    try:
        stats = supabase_service().get_user_stats(user['id'])
        # Python-side safety net
        mb = stats.get("mode_breakdown", {}) or {}
        stats["mode_breakdown"] = {
            "topic": mb.get("topic") or 0,
            "paper": mb.get("paper") or 0
        }

        return UserStatsResponse(**stats)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching user stats for {user['id']}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch user statistics")


@router.get("/admin/user_stats/{target_user_id}", response_model=UserStatsResponse)
async def admin_get_user_stats(target_user_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    """Admin: Fetch detailed stats for any user -requires admin role"""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Forbidden: Admin access required")
    try:
        stats = supabase_service().get_user_stats(user_id=user['id'], admin_mode=True, target_user_id=target_user_id)
        stats["mode_breakdown"] = ModeBreakdown(**stats.get("mode_breakdown", {"topic": 0, "paper": 0}))
        return UserStatsResponse(**stats)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching admin stats for target user {target_user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch target user statistics")
    

@router.get("/dashboard_data")
async def get_dashboard_data(user: Dict[str, Any] = Depends(get_current_user)):
    """
    Returns both user profile and stats in one API call.
    """
    return supabase_service().get_user_dashboard_data(user['id'])


@router.get("/cache_stats")
async def get_cache_stats(user: Optional[Dict[str, Any]] = Depends(get_optional_user)):
    """
    Get cache statistics including Supabase cache storage
    """
    try:
        question_generator = get_question_generator()
        cache_stats = question_generator.get_cache_stats()
        
        return {
            "success": True,
            "cache_stats": cache_stats,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error fetching cache stats: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch cache statistics")


@router.delete("/cache")
async def clear_cache(
    subject: Optional[str] = None,
    topic: Optional[str] = None,
    user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Clear cache - requires authentication
    """
    try:
        question_generator = get_question_generator()
        question_generator.clear_cache(subject=subject, topic=topic)
        
        cache_scope = "all cache" if not subject else f"{subject}" if not topic else f"{subject}-{topic}"
        
        return {
            "success": True,
            "message": f"Successfully cleared {cache_scope}",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error clearing cache: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to clear cache")


@router.post("/cache/cleanup")
async def manual_cache_cleanup(user: Dict[str, Any] = Depends(get_current_user)):
    """
    Manually trigger cache cleanup (expired entries)
    """
    try:
        # Call the Supabase cleanup function
        from core.supabase_client import supabase_service
        
        result = supabase_service().client.rpc('cleanup_expired_cache').execute()
        
        return {
            "success": True,
            "message": result.data if result.data else "Cache cleanup completed",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error during manual cache cleanup: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to cleanup cache")


@router.get("/cleanup/status")
async def get_cleanup_status(user: Optional[Dict[str, Any]] = Depends(get_optional_user)):
    """
    Get automatic cleanup status and schedule information
    """
    try:
        from core.supabase_client import supabase_service
        
        # Check if pg_cron extension is available
        try:
            cron_check = supabase_service().client.rpc('pg_extension_exists', {'ext_name': 'pg_cron'}).execute()
            pg_cron_available = bool(cron_check.data)
        except:
            pg_cron_available = False
        
        cleanup_status = {
            "pg_cron_available": pg_cron_available,
            "scheduled_jobs": [],
            "recent_executions": [],
            "cleanup_functions_available": True
        }
        
        if pg_cron_available:
            try:
                # Get scheduled jobs
                jobs_resp = supabase_service().client.table('cron.job').select('jobname, schedule, active, created_at').execute()
                cleanup_status["scheduled_jobs"] = jobs_resp.data or []
                
                # Get recent executions
                executions_resp = supabase_service().client.table('cron.job_run_details').select(
                    'start_time, end_time, return_message, status'
                ).order('start_time', desc=True).limit(5).execute()
                cleanup_status["recent_executions"] = executions_resp.data or []
                
            except Exception as e:
                logger.warning(f"Could not fetch cron job details: {e}")
        
        # Check what would be cleaned up
        try:
            # Count old guest records
            guest_count_resp = supabase_service().client.rpc(
                'count_old_guest_records', 
                {'days_old': 7}
            ).execute()
            
            # Count expired cache entries
            cache_count_resp = supabase_service().client.table('questions_cache').select(
                'id', count='exact'
            ).lt('expires_at', datetime.now().isoformat()).execute()
            
            topic_count_resp = supabase_service().client.table('topic_questions_index').select(
                'id', count='exact'
            ).lt('expires_at', datetime.now().isoformat()).execute()
            
            cleanup_status["pending_cleanup"] = {
                "old_guest_records": guest_count_resp.data if guest_count_resp.data else 0,
                "expired_cache_entries": cache_count_resp.count or 0,
                "expired_topic_entries": topic_count_resp.count or 0
            }
            
        except Exception as e:
            logger.warning(f"Could not get cleanup counts: {e}")
            cleanup_status["pending_cleanup"] = {
                "old_guest_records": "unknown",
                "expired_cache_entries": "unknown", 
                "expired_topic_entries": "unknown"
            }
        
        return {
            "success": True,
            "cleanup_status": cleanup_status,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting cleanup status: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to get cleanup status")