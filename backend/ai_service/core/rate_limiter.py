"""
Rate limiting middleware for FastAPI with KeyDB backend
Implements IP-based tracking with configurable limits and 429 responses
KeyDB provides better performance than Redis with multi-threading
"""
import time
import logging
from typing import Dict, Optional
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.responses import JSONResponse
import redis
import json
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(
        self, 
        app, 
        calls_per_minute: int = 60,
        redis_url: str = "redis://localhost:6379",
        enable_redis: bool = True
    ):
        super().__init__(app)
        self.calls_per_minute = calls_per_minute
        self.enable_redis = enable_redis
        
        # Fallback in-memory storage if Redis fails
        self.memory_storage: Dict[str, list] = {}
        
        # Initialize Redis connection
        self.redis_client = None
        if enable_redis:
            try:
                self.redis_client = redis.from_url(redis_url, decode_responses=True)
                self.redis_client.ping()
                logger.info("Rate limiter connected to KeyDB")
            except Exception as e:
                logger.warning(f"KeyDB connection failed for rate limiter: {e}. Using memory storage.")
                self.redis_client = None
    
    def get_client_ip(self, request: Request) -> str:
        """Extract client IP with proxy support"""
        # Check for proxy headers first
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            # Take the first IP in the chain
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip.strip()
        
        # Fallback to direct connection
        if hasattr(request, "client") and request.client:
            return request.client.host
        
        return "unknown"
    
    def is_exempt_endpoint(self, path: str) -> bool:
        """Check if endpoint should be exempt from rate limiting"""
        exempt_paths = [
            "/health",
            "/docs",
            "/openapi.json",
            "/favicon.ico"
        ]
        return any(path.startswith(exempt) for exempt in exempt_paths)
    
    async def check_rate_limit_redis(self, client_ip: str) -> tuple[bool, int, int]:
        """Check rate limit using KeyDB with sliding window"""
        try:
            current_time = int(time.time())
            window_start = current_time - 60  # 1 minute window
            
            key = f"rate_limit:{client_ip}"
            
            # Use KeyDB pipeline for atomic operations
            pipe = self.redis_client.pipeline()
            
            # Remove old entries outside the window
            pipe.zremrangebyscore(key, 0, window_start)
            
            # Count current requests in window
            pipe.zcard(key)
            
            # Add current request
            pipe.zadd(key, {str(current_time): current_time})
            
            # Set expiry
            pipe.expire(key, 120)  # 2 minutes to be safe
            
            results = pipe.execute()
            current_requests = results[1]  # Count from zcard
            
            # Check if limit exceeded
            allowed = current_requests < self.calls_per_minute
            remaining = max(0, self.calls_per_minute - current_requests - 1)
            
            return allowed, current_requests + 1, remaining
            
        except Exception as e:
            logger.error(f"KeyDB rate limit check failed: {e}")
            # Fallback to memory-based checking
            return self.check_rate_limit_memory(client_ip)
    
    def check_rate_limit_memory(self, client_ip: str) -> tuple[bool, int, int]:
        """Fallback memory-based rate limiting"""
        current_time = time.time()
        window_start = current_time - 60  # 1 minute window
        
        # Clean old entries
        if client_ip in self.memory_storage:
            self.memory_storage[client_ip] = [
                req_time for req_time in self.memory_storage[client_ip] 
                if req_time > window_start
            ]
        else:
            self.memory_storage[client_ip] = []
        
        # Add current request
        self.memory_storage[client_ip].append(current_time)
        
        current_requests = len(self.memory_storage[client_ip])
        allowed = current_requests <= self.calls_per_minute
        remaining = max(0, self.calls_per_minute - current_requests)
        
        return allowed, current_requests, remaining
    
    async def dispatch(self, request: Request, call_next):
        # Skip rate limiting for exempt endpoints
        if self.is_exempt_endpoint(request.url.path):
            return await call_next(request)
        
        client_ip = self.get_client_ip(request)
        
        # Check rate limit
        if self.redis_client:
            allowed, current_requests, remaining = await self.check_rate_limit_redis(client_ip)
        else:
            allowed, current_requests, remaining = self.check_rate_limit_memory(client_ip)
        
        if not allowed:
            logger.warning(f"Rate limit exceeded for IP {client_ip}: {current_requests} requests")
            
            # Calculate retry after (seconds until window resets)
            retry_after = 60
            
            response_data = {
                "error": "Rate limit exceeded",
                "message": f"Too many requests. Limit: {self.calls_per_minute} requests per minute",
                "retry_after": retry_after,
                "current_requests": current_requests,
                "limit": self.calls_per_minute
            }
            
            response = JSONResponse(
                status_code=429,
                content=response_data,
                headers={
                    "X-RateLimit-Limit": str(self.calls_per_minute),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(int(time.time()) + retry_after),
                    "Retry-After": str(retry_after)
                }
            )
            return response
        
        # Process the request
        response = await call_next(request)
        
        # Add rate limit headers to successful responses
        response.headers["X-RateLimit-Limit"] = str(self.calls_per_minute)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(int(time.time()) + 60)
        
        return response

def create_rate_limit_middleware(
    calls_per_minute: int = 60,
    redis_url: str = "redis://localhost:6379"
) -> RateLimitMiddleware:
    """Factory function to create rate limit middleware"""
    return lambda app: RateLimitMiddleware(
        app, 
        calls_per_minute=calls_per_minute,
        redis_url=redis_url
    )
