"""
Google Authentication API for Supabase
Focused on email verification enforcement
"""
import logging
import sys
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, status

sys.path.append('.')

from api.models import SignInRequest
from api.auth import get_current_user, get_optional_user

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/signup-google")
async def signup_with_google(google_token: str):
    """Handle user signup with Google OAuth"""
    try:
        from core.supabase_client import supabase_service
        
        supabase_svc = supabase_service()
        client = supabase_svc._ensure_client()
        
        # Verify Google OAuth token with Supabase
        auth_response = client.auth.verify_otp({
            "token": google_token,
            "type": "google"
        })
        
        if auth_response.user and auth_response.session:
            # Check if user already exists in user_profiles
            existing_profile = supabase_svc.get_user_profile(auth_response.user.id)
            if not existing_profile:
                # Create user profile for Google user
                supabase_svc.client.table("user_profiles").insert({
                    "id": auth_response.user.id,
                    "username": auth_response.user.email.split("@")[0] if auth_response.user.email else None,
                    "full_name": auth_response.user.user_metadata.get("full_name", auth_response.user.user_metadata.get("name", "")),
                    "role": "user"
                }).execute()
            
            return {
                "success": True,
                "message": "User signed up with Google successfully.",
                "user": auth_response.user,
                "access_token": auth_response.session.access_token,
                "email_verified": auth_response.user.email_confirmed_at is not None
            }
        else:
            return {
                "success": False,
                "message": "Google authentication failed. Please try again."
            }
            
    except Exception as e:
        logger.error(f"Google signup failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Google signup failed: {str(e)}"
        )


@router.post("/signin-google")
async def signin_with_google(google_token: str):
    """Handle user sign in with Google OAuth"""
    try:
        from core.supabase_client import supabase_service
        
        supabase_svc = supabase_service()
        client = supabase_svc._ensure_client()
        
        # Verify Google OAuth token with Supabase
        auth_response = client.auth.verify_otp({
            "token": google_token,
            "type": "google"
        })
        
        if auth_response.user and auth_response.session:
            # Check if user has confirmed their email
            if not auth_response.user.email_confirmed_at:
                return {
                    "success": False,
                    "message": "Please verify your email before signing in.",
                    "email_verified": False
                }
            
            # Check if user exists in user_profiles, create if not
            existing_profile = supabase_svc.get_user_profile(auth_response.user.id)
            if not existing_profile:
                supabase_svc.client.table("user_profiles").insert({
                    "id": auth_response.user.id,
                    "username": auth_response.user.email.split("@")[0] if auth_response.user.email else None,
                    "full_name": auth_response.user.user_metadata.get("full_name", auth_response.user.user_metadata.get("name", "")),
                    "role": "user"
                }).execute()
            
            # User is successfully logged in
            return {
                "success": True,
                "message": "Signed in with Google successfully.",
                "user": auth_response.user,
                "access_token": auth_response.session.access_token,
                "email_verified": True
            }
        else:
            return {
                "success": False,
                "message": "Google authentication failed. Please try again."
            }
            
    except Exception as e:
        logger.error(f"Google signin failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Google signin failed: {str(e)}"
        )


@router.get("/google-login-url")
async def get_google_login_url():
    """Get Google OAuth login URL for frontend integration"""
    try:
        from core.supabase_client import supabase_service
        
        supabase_svc = supabase_service()
        client = supabase_svc._ensure_client()
        
        # Get Google OAuth URL from Supabase
        # Note: This is a simplified implementation. In a real application,
        # you would use the Google OAuth client ID from environment variables
        # and construct the proper Google OAuth URL
        import os
        google_client_id = os.getenv("GOOGLE_CLIENT_ID")
        redirect_uri = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/auth/google-callback")
        
        # Construct Google OAuth URL
        scope = "openid email profile"
        response_type = "code"
        state = "random_string_for_csrf_protection"
        
        google_url = f"https://accounts.google.com/o/oauth2/v2/auth?client_id={google_client_id}&redirect_uri={redirect_uri}&response_type={response_type}&scope={scope}&state={state}&access_type=offline&prompt=consent"
        
        return {
            "success": True,
            "google_login_url": google_url,
            "provider": "google"
        }
        
    except Exception as e:
        logger.error(f"Failed to get Google login URL: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get Google login URL: {str(e)}"
        )


@router.post("/google-callback")
async def google_auth_callback(authorization_code: str):
    """Handle Google OAuth callback from frontend"""
    try:
        from core.supabase_client import supabase_service
        
        supabase_svc = supabase_service()
        client = supabase_svc._ensure_client()
        
        # Exchange authorization code for Google OAuth token
        # This is a simplified implementation. In practice, you would:
        # 1. Exchange code for access token with Google
        # 2. Get user info from Google
        # 3. Create/update user in Supabase
        
        # For this implementation, we'll simulate the OAuth flow
        # In a real application, this would involve:
        # - Making a request to Google's token endpoint
        # - Exchanging authorization code for access token
        # - Getting user profile from Google
        # - Creating/updating user in Supabase
        
        return {
            "success": False,
            "message": "Google OAuth callback not implemented in this version.",
            "note": "Please use the direct /api/auth/signin-google endpoint with your Google OAuth token."
        }
        
    except Exception as e:
        logger.error(f"Google OAuth callback failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Google OAuth callback failed: {str(e)}"
        )