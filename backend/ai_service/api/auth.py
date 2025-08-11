"""
Authentication middleware for FastAPI
"""
import logging
from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, Dict, Any
import sys
sys.path.append('.')
from core.supabase_client import supabase_service

logger = logging.getLogger(__name__)
security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    """Dependency to get current authenticated user"""
    token = credentials.credentials
    user = supabase_service().verify_user(token)
    
    if not user:
        logger.warning("Invalid authentication token received")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user

async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))
) -> Optional[Dict[str, Any]]:
    """Optional authentication - for public endpoints that can work with/without auth"""
    if not credentials:
        return None
    
    try:
        return supabase_service().verify_user(credentials.credentials)
    except Exception as e:
        logger.warning(f"Optional auth failed: {e}")
        return None

def require_user(user: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """Helper to require user in optional auth endpoints"""
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required for this operation"
        )
    return user