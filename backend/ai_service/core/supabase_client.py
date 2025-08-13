"""
Supabase client for database operations
"""
import os
import logging
from typing import Optional, Dict, Any, List
from supabase import create_client, Client

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
    handlers=[
        logging.FileHandler("supabase_client.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class SupabaseService:
    def __init__(self):
        self.url = os.getenv("SUPABASE_URL")
        self.key = os.getenv("SUPABASE_ANON_KEY")
        self.service_key = os.getenv("SUPABASE_SERVICE_KEY")
        self.client: Optional[Client] = None

    def _ensure_client(self):
        if self.client is None:
            if not self.url or not self.key:
                raise ValueError("SUPABASE_URL and SUPABASE_ANON_KEY must be set")
            self.client = create_client(self.url, self.service_key or self.key)
        return self.client

    def _empty_stats(self):
        return {
            'total_generations': 0,
            'total_questions': 0,
            'subject_breakdown': {},
            'mode_breakdown': {'topic': 0, 'paper': 0},
            'current_affairs_usage': 0,
            'feedback_count': 0,
            'individual_feedback_count': 0,
            'generation_feedback_count': 0,
            'individual_average_rating': 0.0,
            'generation_average_rating': 0.0,
            'overall_average_rating': 0.0
        }

    # ----------------- Auth -----------------
    def verify_user(self, token: str) -> Optional[Dict[str, Any]]:
        try:
            client = self._ensure_client()
            response = client.auth.get_user(token)
            return response.user.model_dump() if response.user else None
        except Exception as e:
            logger.error(f"Token verification failed: {e}")
            return None

    # ----------------- Profile -----------------
    def get_user_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        try:
            client = self._ensure_client()
            response = client.table("user_profiles").select("*").eq("id", user_id).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Failed to get user profile: {e}")
            return None

    def check_and_update_generation_limit(self, user_id: str, daily_limit: int = 5) -> bool:
        """Check and update daily generation limit for a user. Auto-create profile if missing."""
        try:
            profile_resp = self.client.table("user_profiles").select(
                "generation_count_today, last_generation_date"
            ).eq("id", user_id).execute()

            today = datetime.utcnow().date()

            # ✅ Auto-create profile if missing
            if not profile_resp.data:
                logger.info(f"[Supabase] Creating new profile for user {user_id}")
                self.client.table("user_profiles").insert({
                    "id": user_id,
                    "generation_count_today": 1,
                    "last_generation_date": str(today)
                }).execute()
                return True

            profile = profile_resp.data[0]
            gen_count = profile.get("generation_count_today", 0)
            last_date = profile.get("last_generation_date")

            # Reset counter if new day
            if last_date != str(today):
                gen_count = 0

            if gen_count >= daily_limit:
                logger.info(f"[Supabase] Daily limit reached for user {user_id}")
                return False  # Limit reached

            # Increment counter
            self.client.table("user_profiles").update({
                "generation_count_today": gen_count + 1,
                "last_generation_date": str(today)
            }).eq("id", user_id).execute()

            logger.info(f"[Supabase] Updated generation count to {gen_count + 1} for user {user_id}")
            return True

        except Exception as e:
            logger.error(f"[Supabase] Limit check failed for user {user_id}: {e}")
            return False


    # ----------------- User Stats -----------------
    def get_user_stats(self, user_id: str, admin_mode: bool = False,
                       target_user_id: Optional[str] = None) -> Dict[str, Any]:
        target_id = target_user_id if (admin_mode and target_user_id) else user_id
        try:
            client = self._ensure_client()
            response = client.rpc('get_user_stats_rpc', {"uid": target_id}).execute()
            if not response.data:
                return self._empty_stats()

            stats = response.data if isinstance(response.data, dict) else response.data[0]
            stats.setdefault("mode_breakdown", {"topic": 0, "paper": 0})
            return stats
        except Exception as e:
            logger.error(f"Failed to get user stats via RPC: {e}", exc_info=True)
            return self._empty_stats()

    def get_user_dashboard_data(self, user_id: str, admin_mode: bool = False,
                                target_user_id: Optional[str] = None) -> Dict[str, Any]:
        target_id = target_user_id if (admin_mode and target_user_id) else user_id
        try:
            client = self._ensure_client()
            response = client.rpc('get_user_dashboard_data', {"uid": target_id}).execute()
            if not response.data:
                return {"profile": {}, "stats": self._empty_stats()}
            data = response.data if isinstance(response.data, dict) else response.data[0]
            if "stats" in data:
                data["stats"].setdefault("mode_breakdown", {"topic": 0, "paper": 0})
            return data
        except Exception as e:
            logger.error(f"Failed to get dashboard data: {e}", exc_info=True)
            return {"profile": {}, "stats": self._empty_stats()}

    # ----------------- Generated Questions -----------------
    def save_generated_questions(self, user_id: str, subject: str, topic: Optional[str],
                                  mode: str, questions: str, use_ca: bool,
                                  months: Optional[int], question_count: int) -> bool:
        try:
            client = self._ensure_client()
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
            response = client.table('generated_questions').insert(data).execute()
            return bool(response.data)
        except Exception as e:
            logger.error(f"Failed to save questions: {e}")
            return False

    def delete_question(self, user_id: str, question_id: str) -> bool:
        try:
            client = self._ensure_client()
            response = client.table('generated_questions') \
                .delete() \
                .eq('id', question_id) \
                .eq('user_id', user_id) \
                .execute()
            return bool(response.data)
        except Exception as e:
            logger.error(f"Failed to delete question: {e}")
            return False


    # ----------------- Feedback -----------------
    def save_question_feedback(self, user_id: str, question_id: Optional[str],
                                rating: Optional[int], comment: Optional[str] = None) -> bool:
        try:
            client = self._ensure_client()
            data = {'user_id': user_id, 'rating': rating, 'comment': comment}
            if question_id is not None:
                data['question_id'] = question_id
            response = client.table('question_feedback').insert(data).execute()
            return bool(response.data)
        except Exception as e:
            logger.error(f"Failed to save feedback: {e}")
            return False

    # ----------------- History -----------------
    def get_user_question_history(self, user_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        try:
            client = self._ensure_client()
            response = client.table('generated_questions') \
                .select('*') \
                .eq('user_id', user_id) \
                .order('created_at', desc=True) \
                .limit(limit) \
                .execute()
            return response.data or []
        except Exception as e:
            logger.error(f"Failed to get question history: {e}", exc_info=True)
            return []
            


# Global accessor
_supabase_service = None
def get_supabase_service() -> SupabaseService:
    global _supabase_service
    if _supabase_service is None:
        _supabase_service = SupabaseService()
    return _supabase_service

def supabase_service():
    return get_supabase_service()
