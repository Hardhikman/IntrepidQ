"""
KeyDB caching service for IntrepidQ
Implements deterministic cache keys using MD5 hashing as per infrastructure requirements
KeyDB is a high-performance Redis alternative with multi-threading support
"""
import hashlib
import json
import logging
import os
from datetime import datetime
from typing import Any, Dict, Optional

import redis
from redis import Redis

# Add async redis support
from redis.asyncio import Redis as AsyncRedis

logger = logging.getLogger(__name__)

def _ensure_redis_protocol(url: str) -> str:
    """Ensure Redis URL has proper protocol prefix"""
    if not url:
        return url

    # If URL doesn't start with redis:// or rediss://, add redis://
    if not url.startswith(('redis://', 'rediss://')):
        return f"redis://{url}"

    return url

class CacheService:
    def __init__(self):
        # Railway Redis URL detection with fallback order
        redis_url = (
            os.getenv('REDISCLOUD_URL') or      # Railway Redis Cloud
            os.getenv('REDIS_PRIVATE_URL') or  # Railway Redis Private
            os.getenv('REDIS_URL') or          # Standard Redis URL
            'redis://localhost:6379'           # Local fallback
        )

        # Ensure proper protocol prefix for Railway compatibility
        redis_url = _ensure_redis_protocol(redis_url)

        # Log which URL we're trying to use (masked for security)
        masked_url = redis_url.split('@')[-1] if '@' in redis_url else redis_url
        logger.info(f"Cache service attempting Redis connection to: {masked_url}")

        try:
            # Create both sync and async clients
            self.redis_client: Optional[Redis] = redis.from_url(redis_url, decode_responses=True, socket_connect_timeout=5)
            self.async_redis_client: Optional[AsyncRedis] = AsyncRedis.from_url(redis_url, decode_responses=True, socket_connect_timeout=5)
            # Test connection
            self.redis_client.ping()
            logger.info(f"Redis connected successfully: {masked_url}")
        except Exception as e:
            logger.warning(f"Redis connection failed: {e}. Caching disabled.")
            logger.info("Cache service will operate without Redis - question generation will still work")
            self.redis_client = None
            self.async_redis_client = None

    def _generate_cache_key(self, **kwargs) -> str:
        """Generate deterministic cache key using MD5 hashing of request parameters"""
        # Sort keys for consistency
        key_data = json.dumps(kwargs, sort_keys=True, default=str)
        return hashlib.md5(key_data.encode()).hexdigest()

    async def get_cached_questions(self, topic: str, model: str, num: int, subject: str = "GS1", **kwargs) -> Optional[Dict[str, Any]]:
        """Get cached questions for given parameters"""
        if not self.async_redis_client:
            return None

        try:
            cache_key = f"questions:{self._generate_cache_key(topic=topic, model=model, num=num, subject=subject, **kwargs)}"
            cached_data = await self.async_redis_client.get(cache_key)

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
        if not self.async_redis_client:
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

            await self.async_redis_client.setex(cache_key, ttl, json.dumps(cache_data, default=str))
            logger.info(f"Questions cached successfully: {topic[:30]}... (TTL: {ttl}s)")

        except Exception as e:
            logger.error(f"Cache set error: {e}")

    async def get_cached_answers(self, question_id: str, model: str = "llama3-70b") -> Optional[Dict[str, Any]]:
        """Get cached answers for a specific question"""
        if not self.async_redis_client:
            return None

        try:
            cache_key = f"answers:{self._generate_cache_key(question_id=question_id, model=model)}"
            cached_data = await self.async_redis_client.get(cache_key)

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
        if not self.async_redis_client:
            return

        try:
            cache_key = f"answers:{self._generate_cache_key(question_id=question_id, model=model)}"

            cache_data = {
                "answers": answers,
                "cached_at": datetime.utcnow().isoformat(),
                "question_id": question_id,
                "model": model
            }

            await self.async_redis_client.setex(cache_key, ttl, json.dumps(cache_data, default=str))
            logger.info(f"Answers cached successfully: {question_id}")

        except Exception as e:
            logger.error(f"Answer cache set error: {e}")

    async def invalidate_cache(self, pattern: str = "*"):
        """Invalidate cache entries matching pattern"""
        if not self.async_redis_client:
            return

        try:
            keys = await self.async_redis_client.keys(pattern)
            if keys:
                await self.async_redis_client.delete(*keys)
                logger.info(f"Invalidated {len(keys)} cache entries")
        except Exception as e:
            logger.error(f"Cache invalidation error: {e}")

    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        if not self.redis_client:
            return {"status": "disabled"}

        try:
            info = self.redis_client.info()
            # Ensure info is treated as a dictionary
            info_dict: Dict[str, Any] = info if isinstance(info, dict) else {}
            return {
                "status": "active",
                "used_memory": info_dict.get('used_memory_human'),
                "connected_clients": info_dict.get('connected_clients'),
                "total_commands_processed": info_dict.get('total_commands_processed'),
                "keyspace_hits": info_dict.get('keyspace_hits', 0),
                "keyspace_misses": info_dict.get('keyspace_misses', 0),
                "hit_ratio": self._calculate_hit_ratio(info_dict)
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
