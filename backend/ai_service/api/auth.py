"""
Authentication middleware for FastAPI with Supabase
Includes role support for admin checks
"""
import logging
import sys
from typing import Any, Dict, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

sys.path.append('.')

from core.supabase_client import supabase_service

logger = logging.getLogger(__name__)
security = HTTPBearer()

from api.models import SignUpRequest, SignInRequest, AuthResponse


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    """
    Dependency to get the current authenticated user.
    Verifies the JWT with Supabase, checks email verification,
    and enriches it with the 'role' from either Supabase Auth metadata or user_profiles.
    """
    token = credentials.credentials
    user = supabase_service().verify_user(token)

    if not user:
        logger.warning("Invalid authentication token received")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # NEW: Check if user's email is verified
    if not user.get("email_verified", False):
        logger.warning(f"Authentication attempt from unverified user: {user.get('email', 'unknown')}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email verification required. Please verify your email address before accessing this resource.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # NEW: Enhanced Google authentication support
    auth_provider = user.get("auth_provider")
    if auth_provider == "google":
        # For Google-authenticated users, additional validation
        if not user.get("email"):
            logger.warning(f"Google authentication missing email for user: {user.get('id', 'unknown')}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Google authentication incomplete. Please verify your Google account details.",
                headers={"WWW-Authenticate": "Bearer"},
            )

    # Try to get the role from Supabase Auth metadata first
    role = (
        user.get("user_metadata", {}).get("role")
        if isinstance(user.get("user_metadata"), dict)
        else None
    )

    # If no role in Auth metadata, check user_profiles table
    if not role:
        profile = supabase_service().get_user_profile(user["id"])
        if profile and "role" in profile:
            role = profile["role"]

    # Default to "user" if not found
    user["role"] = role if role else "user"

    return user


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))
) -> Optional[Dict[str, Any]]:
    """
    Optional authentication - for public endpoints that can work with or without auth.
    Returns None if no valid auth token is present.
    """
    if not credentials:
        return None

    try:
        user = supabase_service().verify_user(credentials.credentials)
        if not user:
            return None

        # NEW: Check if user's email is verified for optional auth
        if not user.get("email_verified", False):
            logger.warning(f"Optional auth attempt from unverified user: {user.get('email', 'unknown')}")
            return None

        # NEW: Enhanced Google authentication support for optional auth
        auth_provider = user.get("auth_provider")
        if auth_provider == "google":
            # For Google-authenticated users, perform additional validation
            if not user.get("email"):
                logger.warning(f"Google authentication missing email for user: {user.get('id', 'unknown')}")
                return None

        # Include role (same logic as get_current_user)
        role = (
            user.get("user_metadata", {}).get("role")
            if isinstance(user.get("user_metadata"), dict)
            else None
        )
        if not role:
            profile = supabase_service().get_user_profile(user["id"])
            if profile and "role" in profile:
                role = profile["role"]
        user["role"] = role if role else "user"

        return user

    except Exception as e:
        logger.warning(f"Optional auth failed: {e}")
        return None


def require_user(user: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Helper to require authentication in optional-auth routes.
    Will throw 401 if no user is passed.
    """
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required for this operation"
        )
    return user
