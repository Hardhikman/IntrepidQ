"""
KeyDB caching service for IntrepidQ2
Implements deterministic cache keys using MD5 hashing as per infrastructure requirements
KeyDB is a high-performance Redis alternative with multi-threading support
"""
import os
import redis
import json
import hashlib
import logging
from typing import Optional, Dict, Any
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class CacheService:
    def __init__(self):
        redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379')
        try:
            self.redis_client = redis.from_url(redis_url, decode_responses=True)
            # Test connection
            self.redis_client.ping()
            logger.info(f"KeyDB connected successfully: {redis_url}")
        except Exception as e:
            logger.warning(f"KeyDB connection failed: {e}. Caching disabled.")
            self.redis_client = None
    
    def _generate_cache_key(self, **kwargs) -> str:
        """Generate deterministic cache key using MD5 hashing of request parameters"""
        # Sort keys for consistency
        key_data = json.dumps(kwargs, sort_keys=True, default=str)
        return hashlib.md5(key_data.encode()).hexdigest()
    
    async def get_cached_questions(self, topic: str, model: str, num: int, subject: str = "GS1", **kwargs) -> Optional[Dict[str, Any]]:
        """Get cached questions for given parameters"""
        if not self.redis_client:
            return None
            
        try:
            cache_key = f"questions:{self._generate_cache_key(topic=topic, model=model, num=num, subject=subject, **kwargs)}"
            cached_data = self.redis_client.get(cache_key)
            
            if cached_data:
                result = json.loads(cached_data)
                logger.info(f"Cache HIT for questions: {topic[:30]}...")
                return result
            
            logger.info(f"Cache MISS for questions: {topic[:30]}...")
            return None
            
        except Exception as e:
            logger.error(f"Cache get error: {e}")
            return None
    
    async def cache_questions(self, questions: Dict[str, Any], topic: str, model: str, num: int, subject: str = "GS1", ttl: int = 3600, **kwargs):
        """Cache questions with TTL"""
        if not self.redis_client:
            return
            
        try:
            cache_key = f"questions:{self._generate_cache_key(topic=topic, model=model, num=num, subject=subject, **kwargs)}"
            
            # Add metadata
            cache_data = {
                "questions": questions,
                "cached_at": datetime.utcnow().isoformat(),
                "cache_key": cache_key,
                "parameters": {
                    "topic": topic,
                    "model": model,
                    "num": num,
                    "subject": subject,
                    **kwargs
                }
            }
            
            self.redis_client.setex(cache_key, ttl, json.dumps(cache_data, default=str))
            logger.info(f"Questions cached successfully: {topic[:30]}... (TTL: {ttl}s)")
            
        except Exception as e:
            logger.error(f"Cache set error: {e}")
    
    async def get_cached_answers(self, question_id: str, model: str = "llama3-70b") -> Optional[Dict[str, Any]]:
        """Get cached answers for a specific question"""
        if not self.redis_client:
            return None
            
        try:
            cache_key = f"answers:{self._generate_cache_key(question_id=question_id, model=model)}"
            cached_data = self.redis_client.get(cache_key)
            
            if cached_data:
                result = json.loads(cached_data)
                logger.info(f"Cache HIT for answer: {question_id}")
                return result
            
            return None
            
        except Exception as e:
            logger.error(f"Answer cache get error: {e}")
            return None
    
    async def cache_answers(self, answers: Dict[str, Any], question_id: str, model: str = "llama3-70b", ttl: int = 7200):
        """Cache answers with longer TTL"""
        if not self.redis_client:
            return
            
        try:
            cache_key = f"answers:{self._generate_cache_key(question_id=question_id, model=model)}"
            
            cache_data = {
                "answers": answers,
                "cached_at": datetime.utcnow().isoformat(),
                "question_id": question_id,
                "model": model
            }
            
            self.redis_client.setex(cache_key, ttl, json.dumps(cache_data, default=str))
            logger.info(f"Answers cached successfully: {question_id}")
            
        except Exception as e:
            logger.error(f"Answer cache set error: {e}")
    
    async def invalidate_cache(self, pattern: str = "*"):
        """Invalidate cache entries matching pattern"""
        if not self.redis_client:
            return
            
        try:
            keys = self.redis_client.keys(pattern)
            if keys:
                self.redis_client.delete(*keys)
                logger.info(f"Invalidated {len(keys)} cache entries")
        except Exception as e:
            logger.error(f"Cache invalidation error: {e}")
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        if not self.redis_client:
            return {"status": "disabled"}
            
        try:
            info = self.redis_client.info()
            return {
                "status": "active",
                "used_memory": info.get('used_memory_human'),
                "connected_clients": info.get('connected_clients'),
                "total_commands_processed": info.get('total_commands_processed'),
                "keyspace_hits": info.get('keyspace_hits', 0),
                "keyspace_misses": info.get('keyspace_misses', 0),
                "hit_ratio": self._calculate_hit_ratio(info)
            }
        except Exception as e:
            logger.error(f"Cache stats error: {e}")
            return {"status": "error", "error": str(e)}
    
    def _calculate_hit_ratio(self, info: Dict) -> float:
        """Calculate cache hit ratio"""
        hits = info.get('keyspace_hits', 0)
        misses = info.get('keyspace_misses', 0)
        total = hits + misses
        return (hits / total * 100) if total > 0 else 0.0

# Global cache service instance
cache_service = CacheService()

def get_cache_service() -> CacheService:
    """Get cache service instance"""
    return cache_service