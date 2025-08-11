"""
Supabase client for database operations
"""
import os
import logging
from typing import Optional, Dict, Any, List
from supabase import create_client, Client

logger = logging.getLogger(__name__)

class SupabaseService:
    def __init__(self):
        self.url = os.getenv("SUPABASE_URL")
        self.key = os.getenv("SUPABASE_ANON_KEY")
        self.service_key = os.getenv("SUPABASE_SERVICE_KEY")
        self.client: Optional[Client] = None
        
    def _ensure_client(self):
        """Lazy initialization of Supabase client"""
        if self.client is None:
            if not self.url or not self.key:
                raise ValueError("SUPABASE_URL and SUPABASE_ANON_KEY must be set")
            self.client = create_client(self.url, self.service_key or self.key)
        return self.client

    def verify_user(self, token: str) -> Optional[Dict[str, Any]]:
        """Verify user token and return user data"""
        try:
            client = self._ensure_client()
            response = client.auth.get_user(token)
            return response.user.model_dump() if response.user else None
        except Exception as e:
            logger.error(f"Token verification failed: {e}")
            return None

    def get_user_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user profile data"""
        try:
            client = self._ensure_client()
            response = client.table('user_profiles').select('*').eq('id', user_id).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Failed to get user profile: {e}")
            return None

    def save_generated_questions(self, user_id: str, subject: str, topic: Optional[str], 
                               mode: str, questions: str, use_ca: bool, 
                               months: Optional[int], question_count: int) -> bool:
        """Save generated questions to database"""
        try:
            data = {
                'user_id': user_id,
                'subject': subject,
                'topic': topic,
                'mode': mode,
                'questions': questions,
                'use_current_affairs': use_ca,
                'months': months,
                'question_count': question_count
            }
            
            response = self.client.table('generated_questions').insert(data).execute()
            logger.info(f"Questions saved for user {user_id}")
            return len(response.data) > 0
        except Exception as e:
            logger.error(f"Failed to save questions: {e}")
            return False

    def save_question_feedback(self, user_id: str, question_id: str, rating: int, comment: Optional[str] = None) -> bool:
        """Save user feedback for a question."""
        try:
            data = {
                'user_id': user_id,
                'question_id': question_id,
                'rating': rating,
                'comment': comment
            }
            
            client = self._ensure_client()
            response = client.table('question_feedback').insert(data).execute()
            logger.info(f"Feedback saved for question {question_id} by user {user_id}")
            return len(response.data) > 0
        except Exception as e:
            logger.error(f"Failed to save feedback: {e}")
            return False

    def get_user_question_history(self, user_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Get user's question generation history"""
        try:
            response = (self.client.table('generated_questions')
                       .select('*')
                       .eq('user_id', user_id)
                       .order('created_at', desc=True)
                       .limit(limit)
                       .execute())
            return response.data or []
        except Exception as e:
            logger.error(f"Failed to get question history: {e}")
            return []

    def update_user_stats(self, user_id: str, questions_generated: int = 0, papers_generated: int = 0):
        """Update user statistics"""
        try:
            current_profile = self.get_user_profile(user_id)
            if current_profile:
                new_questions = current_profile.get('total_questions_generated', 0) + questions_generated
                new_papers = current_profile.get('total_papers_generated', 0) + papers_generated
                
                self._ensure_client().table('user_profiles').update({
                    'total_questions_generated': new_questions,
                    'total_papers_generated': new_papers
                }).eq('id', user_id).execute()
                
                logger.info(f"Updated stats for user {user_id}")
        except Exception as e:
            logger.error(f"Failed to update user stats: {e}")

    def log_analytics(self, user_id: Optional[str], action: str, subject: Optional[str] = None, 
                     topic: Optional[str] = None, success: bool = True, error_message: Optional[str] = None):
        """Log usage analytics"""
        try:
            data = {
                'user_id': user_id,
                'action': action,
                'subject': subject,
                'topic': topic,
                'success': success,
                'error_message': error_message
            }
            self._ensure_client().table('usage_analytics').insert(data).execute()
        except Exception as e:
            logger.error(f"Failed to log analytics: {e}")

    def delete_question(self, user_id: str, question_id: str) -> bool:
        """Delete a generated question"""
        try:
            response = (self.client.table('generated_questions')
                       .delete()
                       .eq('id', question_id)
                       .eq('user_id', user_id)
                       .execute())
            return len(response.data) > 0
        except Exception as e:
            logger.error(f"Failed to delete question: {e}")
            return False

    def get_user_stats(self, user_id: str) -> Dict[str, Any]:
        """Get comprehensive user statistics"""
        try:
            profile = self.get_user_profile(user_id)
            
            # Get recent activity
            recent_questions = (self.client.table('generated_questions')
                              .select('created_at, subject, mode')
                              .eq('user_id', user_id)
                              .order('created_at', desc=True)
                              .limit(10)
                              .execute())
            
            return {
                'profile': profile,
                'recent_activity': recent_questions.data or []
            }
        except Exception as e:
            logger.error(f"Failed to get user stats: {e}")
            return {'profile': None, 'recent_activity': []}

    def check_and_update_generation_limit(self, user_id: str, daily_limit: int = 5) -> bool:
        """Check and update the user's daily generation limit.
        Returns True if the user can proceed and increments the counter; False if limit reached.
        """
        from datetime import date

        profile = self.get_user_profile(user_id)
        if not profile:
            logger.warning(f"No profile found for user {user_id} when checking generation limit.")
            return False

        today = str(date.today())
        last_generation_date = profile.get('last_generation_date')
        generation_count = profile.get('generation_count_today', 0)

        if last_generation_date != today:
            generation_count = 0

        if generation_count >= daily_limit:
            return False

        # Update the profile and also upsert to be robust if row was missing
        try:
            self._ensure_client().table('user_profiles').upsert({
                'id': user_id,
                'generation_count_today': generation_count + 1,
                'last_generation_date': today
            }).execute()
            return True
        except Exception as e:
            logger.error(f"Failed to update generation limit for user {user_id}: {e}")
            return False

    def get_analytics_summary(self, user_id: str) -> Dict[str, Any]:
        """Get analytics summary for the dashboard."""
        try:
            client = self._ensure_client()
            
            questions_res = client.table('generated_questions').select('id', count='exact').eq('user_id', user_id).execute()
            total_questions = questions_res.count or 0
            
            feedback_res = client.table('question_feedback').select('rating').execute()
            
            good_ratings = 0
            bad_ratings = 0
            
            if feedback_res.data:
                for item in feedback_res.data:
                    if item['rating'] >= 4:
                        good_ratings += 1
                    elif item['rating'] <= 2:
                        bad_ratings += 1

            return {
                'total_questions': total_questions,
                'feedback_summary': {
                    'good': good_ratings,
                    'bad': bad_ratings,
                },
            }
        except Exception as e:
            logger.error(f"Failed to get analytics summary: {e}")
            return {}

    def get_recent_feedback(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get recent feedback from all users."""
        try:
            client = self._ensure_client()
            response = client.table('question_feedback').select(
                '''
                *,
                generated_questions ( questions ),
                user_profiles ( full_name, email )
                '''
            ).order('created_at', desc=True).limit(limit).execute()
            return response.data or []
        except Exception as e:
            logger.error(f"Failed to get recent feedback: {e}")
            return []

# Global instance - lazy initialization
_supabase_service = None

def get_supabase_service() -> SupabaseService:
    """Get or create the global Supabase service instance"""
    global _supabase_service
    if _supabase_service is None:
        _supabase_service = SupabaseService()
    return _supabase_service

# For backward compatibility
def supabase_service():
    return get_supabase_service()
