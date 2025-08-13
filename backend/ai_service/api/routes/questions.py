"""
Question generation API routes - FULLY FIXED VERSION
"""
import logging
from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, Optional
from datetime import date
from fastapi.encoders import jsonable_encoder
import sys
sys.path.append('.')

from api.auth import get_current_user, get_optional_user
from core.supabase_client import supabase_service

logger = logging.getLogger(__name__)
router = APIRouter()

DAILY_LIMIT = 5  # Matches your trigger limit

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


def serialize_date_fields(data):
    """Recursively convert any date objects in dict/list to ISO strings"""
    if isinstance(data, list):
        return [serialize_date_fields(item) for item in data]
    elif isinstance(data, dict):
        return {k: serialize_date_fields(v) for k, v in data.items()}
    elif isinstance(data, date):
        return data.isoformat()
    else:
        return data


def get_user_stats(user_id: str):
    """Fetch user stats including daily generation count, streak, and serialize dates"""
    rpc_resp = supabase_service().client.rpc("get_user_dashboard_data", {"uid": user_id}).execute()
    if rpc_resp.data:
        profile = rpc_resp.data[0].get("profile", {})

        last_gen_date = profile.get("last_generation_date")
        if last_gen_date:
            last_gen_date = last_gen_date.isoformat()

        generation_count_today = profile.get("generation_count_today", 0)
        remaining_today = max(DAILY_LIMIT - generation_count_today, 0)
        streak = profile.get("study_streak", 0)

        return {
            "generation_count_today": generation_count_today,
            "remaining_today": remaining_today,
            "streak": streak,
            "last_generation_date": last_gen_date
        }

    return {"generation_count_today": 0, "remaining_today": DAILY_LIMIT, "streak": 0, "last_generation_date": None}


@router.post("/generate_questions")
async def generate_questions(
    request: Dict[str, Any],
    user: Optional[Dict[str, Any]] = Depends(get_optional_user)
):
    """Generate UPSC questions for a topic with stats"""
    try:
        question_generator = get_question_generator()
        topic = request.get('topic', '')
        num_questions = request.get('num', 5)
        use_ca = request.get('use_ca', False)
        months = request.get('months', 6)

        # Enforce trigger-based daily limit
        if user:
            try:
                supabase_service().client.table("user_profiles").update(
                    {"updated_at": date.today()}
                ).eq("id", user['id']).execute()
            except Exception as e:
                if "Daily generation limit" in str(e):
                    stats = get_user_stats(user['id'])
                    raise HTTPException(status_code=429, detail={
                        "error": str(e),
                        "stats": stats
                    })
                raise

        # Generate questions
        result = question_generator.generate_topic_questions(
            subject=question_generator.get_subject_from_topic(topic),
            topic=topic,
            num=num_questions,
            use_ca=use_ca,
            months=months
        )

        # Save to database if user is logged in
        if user:
            question_list = [q.strip() for q in result.split('\n\n') if q.strip()]
            records_to_insert = [{
                'user_id': user['id'],
                'subject': question_generator.get_subject_from_topic(topic),
                'topic': topic,
                'questions': q_text,
                'mode': 'topic',
                'use_current_affairs': use_ca,
                'question_count': 1
            } for q_text in question_list]

            resp = None
            if records_to_insert:
                resp = supabase_service().client.table('generated_questions').insert(records_to_insert).execute()
                supabase_service().log_analytics(
                    user_id=user['id'],
                    action='generate_questions',
                    subject=question_generator.get_subject_from_topic(topic),
                    topic=topic,
                    success=True
                )

            stats = get_user_stats(user['id'])

            questions_serializable = serialize_date_fields(resp.data) if resp else []
            return {
                'questions': questions_serializable,
                'topic': topic,
                'question_count': len(questions_serializable),
                'stats': stats
            }

        # Fallback for non-logged-in users or if save fails
        return {
            'questions': [{'id': None, 'questions': q.strip()} for q in result.split('\n\n') if q.strip()],
            'topic': topic,
            'question_count': num_questions
        }

    except Exception as e:
        logger.error(f"Error generating questions: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate questions: {str(e)}")


@router.post("/generate_whole_paper")
async def generate_whole_paper(
    request: Dict[str, Any],
    user: Optional[Dict[str, Any]] = Depends(get_optional_user)
):
    """Generate a whole UPSC paper with stats"""
    try:
        question_generator = get_question_generator()
        subject = request.get('subject', 'GS1')
        use_ca = request.get('use_ca', False)
        months = request.get('months', 6)

        # Enforce trigger-based daily limit
        if user:
            try:
                supabase_service().client.table("user_profiles").update(
                    {"updated_at": date.today()}
                ).eq("id", user['id']).execute()
            except Exception as e:
                if "Daily generation limit" in str(e):
                    stats = get_user_stats(user['id'])
                    raise HTTPException(status_code=429, detail={
                        "error": str(e),
                        "stats": stats
                    })
                raise

        # Generate the paper
        result = question_generator.generate_whole_paper(
            subject=subject,
            use_ca=use_ca,
            months=months
        )

        if user:
            question_list = [q.strip() for q in result.split('\n\n') if q.strip()]
            records_to_insert = [{
                'user_id': user['id'],
                'subject': subject,
                'topic': None,
                'questions': q_text,
                'mode': 'paper',
                'use_current_affairs': use_ca,
                'question_count': 1
            } for q_text in question_list]

            resp = None
            if records_to_insert:
                resp = supabase_service().client.table('generated_questions').insert(records_to_insert).execute()
                supabase_service().log_analytics(
                    user_id=user['id'],
                    action='generate_whole_paper',
                    subject=subject,
                    topic=None,
                    success=True
                )

            stats = get_user_stats(user['id'])
            questions_serializable = serialize_date_fields(resp.data) if resp else []
            return {
                'questions': questions_serializable,
                'subject': subject,
                'question_count': len(questions_serializable),
                'stats': stats
            }

        # Fallback for non-logged-in users or if save fails
        return {
            'questions': [{'id': None, 'questions': q.strip()} for q in result.split('\n\n') if q.strip()],
            'subject': subject,
            'question_count': 10
        }

    except Exception as e:
        logger.error(f"Error generating whole paper: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate whole paper: {str(e)}")
