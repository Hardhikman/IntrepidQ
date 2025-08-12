"""
Question generation API routes - FIXED VERSION
"""
import logging
from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, Optional
import sys
sys.path.append('.')

from api.auth import get_current_user, get_optional_user
from core.supabase_client import supabase_service

logger = logging.getLogger(__name__)
router = APIRouter()

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

@router.post("/generate_questions")
async def generate_questions(
    request: Dict[str, Any],
    user: Optional[Dict[str, Any]] = Depends(get_optional_user)
):
    """Generate UPSC questions for a topic"""
    if user:
        if not supabase_service().check_and_update_generation_limit(user['id'], daily_limit=5):
            raise HTTPException(status_code=429, detail="Daily generation limit reached.")

    try:
        question_generator = get_question_generator()
        
        # Extract request parameters
        topic = request.get('topic', '')
        num_questions = request.get('num', 5)
        use_ca = request.get('use_ca', False)
        months = request.get('months', 6)
        
        logger.info(f"Generating {num_questions} questions for topic: {topic}")
        
        # Use the existing method from your QuestionGenerator class
        if use_ca:
            # Use current affairs generation
            result = question_generator.generate_topic_questions(
                subject=question_generator.get_subject_from_topic(topic),
                topic=topic,
                num=num_questions,
                use_ca=True,
                months=months
            )
        else:
            # Use static generation
            result = question_generator.generate_topic_questions(
                subject=question_generator.get_subject_from_topic(topic),
                topic=topic,
                num=num_questions,
                use_ca=False,
                months=months
            )
        
        # Save to database if user is logged in
        if user:
            try:
                # Split questions and prepare for batch insert
                question_list = [q.strip() for q in result.split('\n\n') if q.strip()]

                records_to_insert = []
                for q_text in question_list:
                    records_to_insert.append({
                        'user_id': user['id'],
                        'subject': question_generator.get_subject_from_topic(topic),
                        'topic': topic,
                        'questions': q_text, # Save individual question
                        'mode': 'topic',
                        'use_current_affairs': use_ca,
                        'question_count': 1, # Each row is 1 question
                    })

                if records_to_insert:
                    response = supabase_service().client.table('generated_questions').insert(records_to_insert).execute()

                    if response.data:
                        # Log analytics
                        supabase_service().log_analytics(
                            user_id=user['id'],
                            action='generate_questions',
                            subject=question_generator.get_subject_from_topic(topic),
                            topic=topic,
                            success=True
                        )
                        # Return the newly created questions with their IDs
                        return {
                            'questions': response.data,
                            'topic': topic,
                            'question_count': len(response.data)
                        }

            except Exception as save_error:
                logger.error(f"Failed to save questions: {save_error}")
                # Don't fail the request if saving fails, return the raw text
        
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
    """Generate a whole UPSC paper"""
    if user:
        if not supabase_service().check_and_update_generation_limit(user['id'], daily_limit=5):
            raise HTTPException(status_code=429, detail="Daily generation limit reached.")

    try:
        question_generator = get_question_generator()
        
        # Extract request parameters
        subject = request.get('subject', 'GS1')
        use_ca = request.get('use_ca', False)
        months = request.get('months', 6)
        
        logger.info(f"Generating whole paper for subject: {subject}")
        
        # 🔧 FIX: Use the correct method with proper arguments
        result = question_generator.generate_whole_paper(
            subject=subject,
            use_ca=use_ca,
            months=months
        )
        
        # Save to database if user is logged in
        if user:
            try:
                # Split questions and prepare for batch insert
                question_list = [q.strip() for q in result.split('\n\n') if q.strip()]

                records_to_insert = []
                for q_text in question_list:
                    records_to_insert.append({
                        'user_id': user['id'],
                        'subject': subject,
                        'topic': None,
                        'questions': q_text, # Save individual question
                        'mode': 'paper',
                        'use_current_affairs': use_ca,
                        'question_count': 1, # Each row is 1 question
                    })

                if records_to_insert:
                    response = supabase_service().client.table('generated_questions').insert(records_to_insert).execute()

                    if response.data:
                        # Log analytics
                        supabase_service().log_analytics(
                            user_id=user['id'],
                            action='generate_whole_paper',
                            subject=subject,
                            topic=None,
                            success=True
                        )
                        # Return the newly created questions with their IDs
                        return {
                            'questions': response.data,
                            'subject': subject,
                            'question_count': len(response.data)
                        }

            except Exception as save_error:
                logger.error(f"Failed to save paper: {save_error}")
                # Don't fail the request if saving fails, return the raw text
        
        # Fallback for non-logged-in users or if save fails
        return {
            'questions': [{'id': None, 'questions': q.strip()} for q in result.split('\n\n') if q.strip()],
            'subject': subject,
            'question_count': 10
        }
        
    except Exception as e:
        logger.error(f"Error generating whole paper: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate whole paper: {str(e)}")
