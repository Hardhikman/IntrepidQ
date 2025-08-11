"""
Subject management API routes
"""
import logging
from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, Optional, List
import sys
sys.path.append('.')

from api.auth import get_current_user, get_optional_user
from api.models import SubjectsResponse, UserProfileResponse
from core.supabase_client import supabase_service

logger = logging.getLogger(__name__)
router = APIRouter()

# Define the function locally to avoid circular import (same pattern as questions.py)
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

@router.get("/subjects", response_model=SubjectsResponse)
async def get_subjects(user: Optional[Dict[str, Any]] = Depends(get_optional_user)):
    """Get all available subjects and topics"""
    try:
        question_generator = get_question_generator()
        
        subjects = {}
        subject_info = {
            "GS1": "General Studies Paper 1 - History, Culture, Geography",
            "GS2": "General Studies Paper 2 - Governance, Constitution, Polity", 
            "GS3": "General Studies Paper 3 - Technology, Economy, Environment",
            "GS4": "General Studies Paper 4 - Ethics, Integrity, Aptitude"
        }
        
        for subject in ["GS1", "GS2", "GS3", "GS4"]:
            topics = question_generator.get_topics_for_subject(subject)
            subjects[subject] = {
                "name": subject_info[subject],
                "topics": topics
            }
        
        return SubjectsResponse(subjects=subjects)
        
    except Exception as e:
        logger.error(f"Error fetching subjects: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch subjects")

@router.get("/user_profile", response_model=UserProfileResponse)
async def get_user_profile(
    user: Dict[str, Any] = Depends(get_current_user)
):
    """Get user profile and stats"""
    try:
        stats = supabase_service().get_user_stats(user['id'])
        return UserProfileResponse(profile=stats['profile'], user=user)
    except Exception as e:
        logger.error(f"Error fetching user profile: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch user profile")

# ✅ ADDED: Missing question history route
@router.get("/question_history")
async def get_question_history(
    limit: int = 20,
    user: Dict[str, Any] = Depends(get_current_user)
):
    """Get user's question generation history"""
    try:
        response = (supabase_service().client.table('generated_questions')
                   .select('*')
                   .eq('user_id', user['id'])
                   .order('created_at', desc=True)
                   .limit(limit)
                   .execute())
        
        return {"history": response.data or []}
        
    except Exception as e:
        logger.error(f"Error fetching question history: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch question history")

# ✅ ADDED: Delete question route
@router.delete("/question_history/{question_id}")
async def delete_question(
    question_id: str,
    user: Dict[str, Any] = Depends(get_current_user)
):
    """Delete a question from history"""
    try:
        response = (supabase_service().client.table('generated_questions')
                   .delete()
                   .eq('id', question_id)
                   .eq('user_id', user['id'])  # Ensure user can only delete their own questions
                   .execute())
        
        if response.data:
            return {"success": True, "message": "Question deleted successfully"}
        else:
            raise HTTPException(status_code=404, detail="Question not found")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting question: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete question")

@router.put("/user_profile")
async def update_user_profile(
    profile_data: Dict[str, Any],
    user: Dict[str, Any] = Depends(get_current_user)
):
    """Update user profile"""
    try:
        # Allowed fields to update
        allowed_fields = ['username', 'full_name', 'preferred_subjects']
        update_data = {k: v for k, v in profile_data.items() if k in allowed_fields}
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No valid fields to update")
        
        response = (supabase_service().client.table('user_profiles')
                   .update(update_data)
                   .eq('id', user['id'])
                   .execute())
        
        if response.data:
            return {"success": True, "message": "Profile updated successfully"}
        else:
            raise HTTPException(status_code=400, detail="Failed to update profile")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user profile: {e}")
        raise HTTPException(status_code=500, detail="Failed to update profile")

@router.get("/user_stats")
async def get_user_stats(
    user: Dict[str, Any] = Depends(get_current_user)
):
    """Get detailed user statistics"""
    try:
        # Get profile stats
        profile = supabase_service().get_user_profile(user['id'])
        
        # Get subject-wise breakdown
        response = (supabase_service().client.table('generated_questions')
                   .select('subject, mode, created_at')
                   .eq('user_id', user['id'])
                   .execute())
        
        # Process statistics
        subject_stats = {}
        mode_stats = {'topic': 0, 'paper': 0}
        
        for item in response.data or []:
            subject = item['subject']
            mode = item['mode']
            
            if subject not in subject_stats:
                subject_stats[subject] = {'topic': 0, 'paper': 0}
            
            subject_stats[subject][mode] += 1
            mode_stats[mode] += 1
        
        return {
            'profile': profile,
            'subject_breakdown': subject_stats,
            'mode_breakdown': mode_stats,
            'total_generations': sum(mode_stats.values())
        }
        
    except Exception as e:
        logger.error(f"Error fetching user stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch user statistics")