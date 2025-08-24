"""
Supabase client for database operations
"""
import os
import logging
from typing import Optional, Dict, Any, List
from supabase import create_client, Client
from datetime import datetime
from fastapi.encoders import jsonable_encoder

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
            # Use the service key for all backend operations for elevated privileges
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

    #Analytics
    def log_analytics(self, user_id: str, action: str, **kwargs):
        try:
            client = self._ensure_client()
            log_data = {
                'user_id': user_id,
                'action': action,
                'subject': kwargs.get('subject'),
                'topic': kwargs.get('topic'),
                'success': kwargs.get('success', True),
                'error_message': kwargs.get('error_message')
            }
            response = client.table('usage_analytics').insert(log_data).execute()
            if response.data:
                logger.info(f"Analytics event '{action}' logged for user {user_id}")
            else:
                logger.warning(f"Failed to log analytics event: {getattr(response, 'error', str(response))}")
        except Exception as e:
            # Handle case where usage_analytics table doesn't exist yet or other database issues
            logger.warning(f"Could not log analytics event for user {user_id}: {e}")
            # Don't re-raise the exception to avoid breaking the main application flow

    # Auth
    def verify_user(self, token: str) -> Optional[Dict[str, Any]]:
        try:
            client = self._ensure_client()
            response = client.auth.get_user(token)
            return response.user.model_dump() if response.user else None
        except Exception as e:
            logger.error(f"Token verification failed: {e}")
            return None

    #Profile
    def get_user_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        try:
            client = self._ensure_client()
            response = client.table("user_profiles").select("*").eq("id", user_id).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Failed to get user profile: {e}")
            return None

    def check_generation_limit(self, user_id: str, daily_limit: int = 5) -> bool:
        """Only checks if user is under daily limit — no increment."""
        try:
            client = self._ensure_client()
            profile_resp = client.table("user_profiles").select(
                "generation_count_today, last_generation_date"
            ).eq("id", user_id).execute()

            today = datetime.utcnow().date()
            if not profile_resp.data:
                return True

            profile = profile_resp.data[0]
            gen_count = profile.get("generation_count_today", 0)
            last_date_str = profile.get("last_generation_date")
            last_date = None
            if last_date_str:
                try:
                    last_date = datetime.fromisoformat(last_date_str).date()
                except ValueError:
                    logger.warning(f"Could not parse date: {last_date_str}")

            if last_date != today:
                gen_count = 0

            return gen_count < daily_limit
        except Exception as e:
            logger.error(f"[Supabase] Limit check failed for user {user_id}: {e}")
            return False

    def increment_generation_count(self, user_id: str):
        """Increments generation_count_today AFTER successful generation."""
        try:
            client = self._ensure_client()
            today = datetime.utcnow().date()
            profile_resp = client.table("user_profiles").select(
                "generation_count_today, last_generation_date"
            ).eq("id", user_id).execute()

            if not profile_resp.data:
                client.table("user_profiles").insert({
                    "id": user_id,
                    "generation_count_today": 1,
                    "last_generation_date": str(today)
                }).execute()
                return

            profile = profile_resp.data[0]
            gen_count = profile.get("generation_count_today", 0)
            last_date_str = profile.get("last_generation_date")

            last_date = None
            if last_date_str:
                try:
                    last_date = datetime.fromisoformat(last_date_str).date()
                except ValueError:
                    logger.warning(f"Could not parse date: {last_date_str}")

            if last_date != today:
                gen_count = 0

            client.table("user_profiles").update({
                "generation_count_today": gen_count + 1,
                "last_generation_date": str(today)
            }).eq("id", user_id).execute()
        except Exception as e:
            logger.error(f"[Supabase] Increment generation count failed for user {user_id}: {e}")

    def update_study_streak(self, user_id: str):
        """Update study streak based on consecutive daily activity."""
        try:
            client = self._ensure_client()
            today = datetime.utcnow().date()
            
            # Get current profile data
            profile_resp = client.table("user_profiles").select(
                "study_streak, last_generation_date"
            ).eq("id", user_id).execute()

            if not profile_resp.data:
                logger.warning(f"No profile found for user {user_id} when updating study streak")
                return

            profile = profile_resp.data[0]
            current_streak = profile.get("study_streak", 0)
            last_date_str = profile.get("last_generation_date")
            
            last_date = None
            if last_date_str:
                try:
                    last_date = datetime.fromisoformat(last_date_str).date()
                except ValueError:
                    logger.warning(f"Could not parse date: {last_date_str}")

            # Calculate new streak
            new_streak = current_streak
            if last_date is None:
                # First time user
                new_streak = 1
            elif last_date == today:
                # Already updated today, no change
                pass
            elif (today - last_date).days == 1:
                # Consecutive day, increment streak
                new_streak = current_streak + 1
            elif last_date != today:
                # Gap in activity, reset streak
                new_streak = 1

            # Update the study streak if it changed
            if new_streak != current_streak:
                client.table("user_profiles").update({
                    "study_streak": new_streak
                }).eq("id", user_id).execute()
                logger.info(f"Updated study streak for user {user_id}: {current_streak} -> {new_streak}")
                
        except Exception as e:
            logger.error(f"[Supabase] Update study streak failed for user {user_id}: {e}")

    # Guest rate limiting methods
    def check_guest_generation_limit(self, ip_address: str, daily_limit: int = 2) -> bool:
        """Check if guest user (by IP) is under daily generation limit."""
        try:
            client = self._ensure_client()
            today = datetime.utcnow().date()
            
            # Get guest generation record for this IP
            response = client.table("guest_generations").select(
                "generation_count, last_generation_date"
            ).eq("ip_address", ip_address).execute()

            if not response.data:
                # No record found, allow generation
                return True

            record = response.data[0]
            generation_count = record.get("generation_count", 0)
            last_date_str = record.get("last_generation_date")
            
            last_date = None
            if last_date_str:
                try:
                    last_date = datetime.fromisoformat(last_date_str).date()
                except ValueError:
                    logger.warning(f"Could not parse guest date: {last_date_str}")

            # Reset count if it's a new day
            if last_date != today:
                generation_count = 0

            return generation_count < daily_limit
        except Exception as e:
            logger.error(f"[Supabase] Guest limit check failed for IP {ip_address}: {e}")
            return False

    def increment_guest_generation_count(self, ip_address: str):
        """Increment generation count for a guest user by IP."""
        try:
            client = self._ensure_client()
            today = datetime.utcnow().date()
            
            # Check if record exists
            response = client.table("guest_generations").select(
                "id, generation_count, last_generation_date"
            ).eq("ip_address", ip_address).execute()

            if not response.data:
                # Create new record
                client.table("guest_generations").insert({
                    "ip_address": ip_address,
                    "generation_count": 1,
                    "last_generation_date": str(today)
                }).execute()
                return

            # Update existing record
            record = response.data[0]
            generation_count = record.get("generation_count", 0)
            last_date_str = record.get("last_generation_date")
            
            last_date = None
            if last_date_str:
                try:
                    last_date = datetime.fromisoformat(last_date_str).date()
                except ValueError:
                    logger.warning(f"Could not parse guest date: {last_date_str}")

            # Reset count if it's a new day
            if last_date != today:
                generation_count = 0

            client.table("guest_generations").update({
                "generation_count": generation_count + 1,
                "last_generation_date": str(today),
                "updated_at": datetime.utcnow().isoformat()
            }).eq("id", record["id"]).execute()
            
        except Exception as e:
            logger.error(f"[Supabase] Increment guest generation count failed for IP {ip_address}: {e}")

    #User Stats 
    def get_user_stats(self, user_id: str, admin_mode: bool = False,
                       target_user_id: Optional[str] = None) -> Dict[str, Any]:
        target_id = target_user_id if (admin_mode and target_user_id) else user_id
        try:
            client = self._ensure_client()
            response = client.rpc('get_user_stats_rpc', {"uid": target_id}).execute()
            if not response.data:
                return self._empty_stats()
            stats = response.data if isinstance(response.data, dict) else response.data[0]
            stats = jsonable_encoder(stats)
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

    #Generated Questions
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

    #Question History 
    def get_user_question_history(self, user_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Fetch the latest generated questions for the given user."""
        try:
            client = self._ensure_client()
            response = (
                client.table('generated_questions')
                .select('*')
                .eq('user_id', user_id)
                .order('created_at', desc=True)
                .limit(limit)
                .execute()
            )
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
