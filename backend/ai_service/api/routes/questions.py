"""
API routes for question generation - with multi-provider model selection, fixed daily limit logic, 
and QuestionGenerator stats passthrough.
"""

import logging
import sys
from datetime import date
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Request

sys.path.append('.')

from api.auth import get_optional_user
from core.supabase_client import supabase_service

logger = logging.getLogger(__name__)
router = APIRouter()

DAILY_LIMIT = 5  # Matches trigger limit
GUEST_DAILY_LIMIT = 2  # Daily limit for guest users


def get_client_ip(request: Request) -> str:
    """Extract client IP address from request, handling proxies"""
    # Check for forwarded headers first (for proxy/load balancer setups)
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        # Take the first IP in the chain
        return forwarded_for.split(",")[0].strip()

    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()

    # Fallback to direct client IP
    return request.client.host if request.client else "unknown"


def get_question_generator():
    """Get question generator instance from app state"""
    try:
        import importlib
        main_module = importlib.import_module('api.main')
        app_state = getattr(main_module, 'app_state', {})
        qg = app_state.get("question_generator")
        if not qg:
            raise HTTPException(status_code=503, detail="AI service not initialized")
        return qg
    except ImportError:
        raise HTTPException(status_code=503, detail="AI service not available")


def get_upstash_client():
    """Get Upstash search client instance from app state"""
    try:
        import importlib
        main_module = importlib.import_module('api.main')
        upstash_client = getattr(main_module, 'upstash_client', None)
        if not upstash_client:
            raise HTTPException(status_code=503, detail="Upstash search service not initialized")
        return upstash_client
    except ImportError:
        raise HTTPException(status_code=503, detail="Upstash search service not available")


def serialize_date_fields(data):
    """Recursively convert any date objects to ISO strings"""
    if isinstance(data, list):
        return [serialize_date_fields(item) for item in data]
    elif isinstance(data, dict):
        return {k: serialize_date_fields(v) for k, v in data.items()}
    elif isinstance(data, date):
        return data.isoformat()
    return data


def get_user_stats(user_id: str):
    """Get user stats including daily limit and streak"""
    try:
        supabase_svc = supabase_service()
        if not supabase_svc or not hasattr(supabase_svc, 'client') or not supabase_svc.client:
            logger.error("Supabase service not properly initialized")
            return {
                "generation_count_today": 0,
                "remaining_today": DAILY_LIMIT,
                "streak": 0,
                "last_generation_date": None
            }

        rpc_resp = supabase_svc.client.rpc("get_user_dashboard_data", {"uid": user_id}).execute()
        if rpc_resp.data:
            profile = rpc_resp.data.get("profile", {})
            generation_count_today = profile.get("generation_count_today", 0)
            remaining_today = max(DAILY_LIMIT - generation_count_today, 0)
            return {
                "generation_count_today": generation_count_today,
                "remaining_today": remaining_today,
                "last_generation_date": profile.get("last_generation_date")
            }
    except Exception as e:
        logger.error(f"Error fetching user stats: {e}", exc_info=True)
    return {
        "generation_count_today": 0,
        "remaining_today": DAILY_LIMIT,
        "streak": 0,
        "last_generation_date": None
    }


@router.get("/check_guest_limit")
async def check_guest_limit(request: Request):
    """Check current guest generation limit status"""
    try:
        client_ip = get_client_ip(request)

        # Check current guest generation count
        used_count = 0
        limit_reached = False

        try:
            from datetime import datetime
            today = datetime.utcnow().date()

            # Fix: Add proper null check for supabase client
            supabase_svc = supabase_service()
            if not supabase_svc or not hasattr(supabase_svc, 'client') or not supabase_svc.client:
                logger.error("Supabase service or client not properly initialized")
                return {
                    "generations_used": 0,
                    "daily_limit": GUEST_DAILY_LIMIT,
                    "remaining": GUEST_DAILY_LIMIT,
                    "limit_reached": False
                }

            response = supabase_svc.client.table("guest_generations").select(
                "generation_count, last_generation_date"
            ).eq("ip_address", client_ip).execute()

            if response.data:
                record = response.data[0]
                generation_count = record.get("generation_count", 0)
                last_date_str = record.get("last_generation_date")

                if last_date_str:
                    try:
                        last_date = datetime.fromisoformat(last_date_str).date()
                        if last_date == today:
                            used_count = generation_count
                            limit_reached = used_count >= GUEST_DAILY_LIMIT
                    except ValueError:
                        pass
        except Exception as e:
            logger.error(f"Error checking guest limit: {e}")

        return {
            "generations_used": used_count,
            "daily_limit": GUEST_DAILY_LIMIT,
            "remaining": max(GUEST_DAILY_LIMIT - used_count, 0),
            "limit_reached": limit_reached
        }

    except Exception as e:
        logger.error(f"Error in check_guest_limit: {e}", exc_info=True)
        return {
            "generations_used": 0,
            "daily_limit": GUEST_DAILY_LIMIT,
            "remaining": GUEST_DAILY_LIMIT,
            "limit_reached": False
        }


@router.post("/generate_questions")
async def generate_questions(
    request: Dict[str, Any],
    http_request: Request,
    user: Optional[Dict[str, Any]] = Depends(get_optional_user)
):
    """Generate UPSC questions for a topic with stats from QuestionGenerator"""
    try:
        qg = get_question_generator()
        topic = request.get('topic', '')
        num_questions = request.get('num', 3)
        use_ca = request.get('use_ca', False)
        months = request.get('months', 6)
        model = request.get('model', 'moonshot-k2')
        news_source = request.get('news_source', 'all')  # Add news_source parameter
        keyword_context = request.get('keyword_context', None)  # Get keyword context if provided

        # Rate limiting logic
        if user:
            # Authenticated user - check user limit
            if not supabase_service().check_generation_limit(user['id'], DAILY_LIMIT):
                raise HTTPException(
                    status_code=429,
                    detail={"error": f"Daily generation limit of {DAILY_LIMIT} reached.", "stats": get_user_stats(user['id'])}
                )
        else:
            # Guest user - check IP-based limit
            client_ip = get_client_ip(http_request)
            if not supabase_service().check_guest_generation_limit(client_ip, GUEST_DAILY_LIMIT):
                raise HTTPException(
                    status_code=429,
                    detail={
                        "error": f"Daily question generation limit of {GUEST_DAILY_LIMIT} reached for guest users. Sign in to get {DAILY_LIMIT} question generations per day. You can still generate unlimited answers!",
                        "guest_limit_reached": True,
                        "guest_daily_limit": GUEST_DAILY_LIMIT,
                        "user_daily_limit": DAILY_LIMIT
                    }
                )

        # ✅ New: Now returns dict with questions + meta
        result = qg.generate_topic_questions(
            subject=qg.get_subject_from_topic(topic),
            topic=topic,
            num=num_questions,
            use_ca=use_ca,
            months=months,
            requested_model=model,
            news_source=news_source,  # Pass news_source parameter
            keyword_context=keyword_context  # Pass keyword context if provided
        )

        if user:
            # Save questions to DB
            records_to_insert = [{
                'user_id': user['id'],
                'subject': qg.get_subject_from_topic(topic),
                'topic': topic,
                'questions': (q_text["question"] if isinstance(q_text, dict) else q_text),
                'mode': 'topic',
                'use_current_affairs': use_ca,
                'question_count': 1,
                'model': model
            } for q_text in result["questions"]]

            # Fix #1: Move study streak update outside database logic
            if user:
                # ✅ Always update study streak for authenticated users (regardless of DB success)
                supabase_svc = supabase_service()
                if supabase_svc and hasattr(supabase_svc, 'client') and supabase_svc.client:
                    supabase_svc.increment_generation_count(user['id'])

                    # Database operations (separate from streak tracking)
                    if records_to_insert:
                        try:
                            resp = supabase_svc.client.table('generated_questions').insert(records_to_insert).execute()
                        except Exception as e:
                            logger.error(f"Failed to save questions to DB: {e}")
                            # Study streak still updated even if DB fails

            return {
                "questions": result["questions"],
                "meta": result["meta"],
                "topic": topic,
                "question_count": len(result["questions"]),
                "stats": get_user_stats(user['id'])
            }
        else:
            # Guest user - increment IP-based counter
            client_ip = get_client_ip(http_request)
            supabase_svc = supabase_service()
            if supabase_svc and hasattr(supabase_svc, 'client') and supabase_svc.client:
                supabase_svc.increment_guest_generation_count(client_ip)

        # Guest fallback
        return {
            "questions": result["questions"],
            "meta": result["meta"],
            "topic": topic,
            "question_count": len(result["questions"])
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating questions: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to generate questions: {str(e)}")


@router.post("/generate_whole_paper")
async def generate_whole_paper(
    request: Dict[str, Any],
    http_request: Request,
    user: Optional[Dict[str, Any]] = Depends(get_optional_user)
):
    """Generate a whole UPSC paper with stats from QuestionGenerator"""
    try:
        qg = get_question_generator()
        subject = request.get('subject', 'GS1')
        use_ca = request.get('use_ca', False)
        months = request.get('months', 6)
        model = request.get('model', 'moonshot-k2')
        news_source = request.get('news_source', 'all')  # Add news_source parameter

        # Rate limiting logic
        if user:
            # Authenticated user - check user limit
            if not supabase_service().check_generation_limit(user['id'], DAILY_LIMIT):
                raise HTTPException(
                    status_code=429,
                    detail={"error": f"Daily generation limit of {DAILY_LIMIT} reached.", "stats": get_user_stats(user['id'])}
                )
        else:
            # Guest user - check IP-based limit
            client_ip = get_client_ip(http_request)
            if not supabase_service().check_guest_generation_limit(client_ip, GUEST_DAILY_LIMIT):
                raise HTTPException(
                    status_code=429,
                    detail={
                        "error": f"Daily question generation limit of {GUEST_DAILY_LIMIT} reached for guest users. Sign in to get {DAILY_LIMIT} question generations per day. You can still generate unlimited answers!",
                        "guest_limit_reached": True,
                        "guest_daily_limit": GUEST_DAILY_LIMIT,
                        "user_daily_limit": DAILY_LIMIT
                    }
                )

        result = qg.generate_whole_paper(
            subject=subject,
            use_ca=use_ca,
            months=months,
            requested_model=model,
            news_source=news_source  # Pass news_source parameter
        )

        if user:
            records_to_insert = [{
                'user_id': user['id'],
                'subject': subject,
                'topic': None,
                'questions': (q_text["question"] if isinstance(q_text, dict) else q_text),
                'mode': 'paper',
                'use_current_affairs': use_ca,
                'question_count': 1,
                'model': model
            } for q_text in result["questions"]]

            # Fix #1: Move study streak update outside database logic
            if user:
                # ✅ Always update study streak for authenticated users (regardless of DB success)
                supabase_svc = supabase_service()
                if supabase_svc and hasattr(supabase_svc, 'client') and supabase_svc.client:
                    supabase_svc.increment_generation_count(user['id'])

                    # Database operations (separate from streak tracking)
                    if records_to_insert:
                        try:
                            resp = supabase_svc.client.table('generated_questions').insert(records_to_insert).execute()
                        except Exception as e:
                            logger.error(f"Failed to save questions to DB: {e}")
                            # Study streak still updated even if DB fails

            return {
                "questions": result["questions"],
                "meta": result["meta"],
                "subject": subject,
                "question_count": len(result["questions"]),
                "stats": get_user_stats(user['id'])
            }
        else:
            # Guest user - increment IP-based counter
            client_ip = get_client_ip(http_request)
            supabase_service().increment_guest_generation_count(client_ip)

        return {
            "questions": result["questions"],
            "meta": result["meta"],
            "subject": subject,
            "question_count": len(result["questions"])
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating whole paper: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to generate whole paper: {str(e)}")


@router.post("/generate_questions_from_keywords")
async def generate_questions_from_keywords(
    request: Dict[str, Any],
    http_request: Request,
    user: Optional[Dict[str, Any]] = Depends(get_optional_user)
):
    """Generate UPSC questions based on keywords with stats from QuestionGenerator"""
    try:
        qg = get_question_generator()
        keywords = request.get('keywords', [])
        num_questions = request.get('num', 3)
        use_ca = request.get('use_ca', False)
        months = request.get('months', 6)
        model = request.get('model', 'moonshot-k2')
        subject = request.get('subject', 'GS1')  # Get subject from request, default to GS1
        #news_source = request.get('news_source', 'all')  # Add news_source parameter

        # Rate limiting logic
        if user:
            # Authenticated user - check user limit
            if not supabase_service().check_generation_limit(user['id'], DAILY_LIMIT):
                raise HTTPException(
                    status_code=429,
                    detail={"error": f"Daily generation limit of {DAILY_LIMIT} reached.", "stats": get_user_stats(user['id'])}
                )
        else:
            # Guest user - check IP-based limit
            client_ip = get_client_ip(http_request)
            if not supabase_service().check_guest_generation_limit(client_ip, GUEST_DAILY_LIMIT):
                raise HTTPException(
                    status_code=429,
                    detail={
                        "error": f"Daily question generation limit of {GUEST_DAILY_LIMIT} reached for guest users. Sign in to get {DAILY_LIMIT} question generations per day. You can still generate unlimited answers!",
                        "guest_limit_reached": True,
                        "guest_daily_limit": GUEST_DAILY_LIMIT,
                        "user_daily_limit": DAILY_LIMIT
                    }
                )

        # Generate questions from keywords
        result = qg.generate_questions_from_keywords(
            keywords=keywords,
            num=num_questions,
            use_ca=use_ca,
            months=months,
            requested_model=model,
            subject=subject,  # Pass subject to the method
            #news_source=news_source  # Pass news_source parameter
        )

        if user:
            # Save questions to DB
            records_to_insert = [{
                'user_id': user['id'],
                'subject': subject,  # Use the provided subject instead of hardcoded GS1
                'topic': ', '.join(keywords),  # Store keywords as topic
                'questions': (q_text["question"] if isinstance(q_text, dict) else q_text),
                'mode': 'keyword',
                'use_current_affairs': use_ca,
                'question_count': 1,
                'model': model
            } for q_text in result["questions"]]

            # Fix #1: Move study streak update outside database logic
            if user:
                # ✅ Always update study streak for authenticated users (regardless of DB success)
                supabase_svc = supabase_service()
                if supabase_svc and hasattr(supabase_svc, 'client') and supabase_svc.client:
                    supabase_svc.increment_generation_count(user['id'])

                    # Database operations (separate from streak tracking)
                    if records_to_insert:
                        try:
                            resp = supabase_svc.client.table('generated_questions').insert(records_to_insert).execute()
                        except Exception as e:
                            logger.error(f"Failed to save questions to DB: {e}")
                            # Study streak still updated even if DB fails

            return {
                "questions": result["questions"],
                "meta": result["meta"],
                "keywords": keywords,
                "question_count": len(result["questions"]),
                "stats": get_user_stats(user['id'])
            }
        else:
            # Guest user - increment IP-based counter
            client_ip = get_client_ip(http_request)
            supabase_service().increment_guest_generation_count(client_ip)

        # Guest fallback
        return {
            "questions": result["questions"],
            "meta": result["meta"],
            "keywords": keywords,
            "question_count": len(result["questions"])
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating questions from keywords: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to generate questions from keywords: {str(e)}")


@router.post("/get_keywords_for_topic")
async def get_keywords_for_topic(
    request: Dict[str, Any],
    user: Optional[Dict[str, Any]] = Depends(get_optional_user)
):
    """Get keywords associated with a specific topic from Upstash"""
    try:
        # Get Upstash client
        upstash_client = get_upstash_client()

        # Get topic from request
        topic = request.get('topic', '')

        if not topic:
            raise HTTPException(status_code=400, detail="Topic is required")

        # Search for keywords
        keywords = upstash_client.search_keywords_by_topic(topic)

        return {
            "topic": topic,
            "keywords": keywords,
            "count": len(keywords)
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching keywords for topic: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch keywords for topic: {str(e)}")
