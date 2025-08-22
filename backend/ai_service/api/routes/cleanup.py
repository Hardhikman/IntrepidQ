"""
Guest cleanup management API routes
Provides endpoints for manual cleanup and status checking
"""

import logging
from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, Optional
from datetime import datetime, date, timedelta
import sys
sys.path.append('.')

from api.auth import get_current_user
from core.supabase_client import supabase_service

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/manual_guest_cleanup")
async def manual_guest_cleanup(
    user: Dict[str, Any] = Depends(get_current_user)
):
    """Manually trigger guest cleanup (admin only)"""
    try:
        # Check if user is admin
        if user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Call the cleanup function
        client = supabase_service()._ensure_client()
        response = client.rpc('manual_guest_cleanup').execute()
        
        if response.data:
            result = response.data if isinstance(response.data, dict) else response.data[0]
            return {
                "success": True,
                "cleanup_result": result,
                "triggered_by": user.get("email"),
                "timestamp": datetime.utcnow().isoformat()
            }
        else:
            raise HTTPException(status_code=500, detail="Cleanup function returned no data")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Manual guest cleanup failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Cleanup failed: {str(e)}")

@router.get("/guest_cleanup_status")
async def get_guest_cleanup_status(
    user: Dict[str, Any] = Depends(get_current_user)
):
    """Get guest cleanup status and statistics (admin only)"""
    try:
        # Check if user is admin
        if user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        client = supabase_service()._ensure_client()
        
        # Get guest generations statistics
        guest_stats_response = client.table("guest_generations").select(
            "count(*), min(last_generation_date), max(last_generation_date)"
        ).execute()
        
        # Get recent cleanup logs
        cleanup_logs_response = client.table("usage_analytics").select(
            "action, success, error_message, created_at"
        ).eq("action", "guest_cleanup").order("created_at", desc=True).limit(10).execute()
        
        # Calculate statistics
        total_records = 0
        oldest_record = None
        newest_record = None
        
        if guest_stats_response.data and len(guest_stats_response.data) > 0:
            stats = guest_stats_response.data[0]
            total_records = stats.get("count", 0)
            oldest_record = stats.get("min")
            newest_record = stats.get("max")
        
        # Get records older than 7 days (eligible for cleanup)
        cleanup_date = (date.today() - timedelta(days=7)).isoformat()
        old_records_response = client.table("guest_generations").select(
            "count(*)"
        ).lt("last_generation_date", cleanup_date).execute()
        
        eligible_for_cleanup = 0
        if old_records_response.data and len(old_records_response.data) > 0:
            eligible_for_cleanup = old_records_response.data[0].get("count", 0)
        
        return {
            "guest_generations": {
                "total_records": total_records,
                "oldest_record_date": oldest_record,
                "newest_record_date": newest_record,
                "eligible_for_cleanup": eligible_for_cleanup,
                "cleanup_threshold_days": 7
            },
            "cleanup_logs": cleanup_logs_response.data or [],
            "status": "healthy" if eligible_for_cleanup < 1000 else "needs_cleanup",
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get cleanup status: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get status: {str(e)}")

@router.get("/guest_analytics")
async def get_guest_analytics(
    days: int = 30,
    user: Dict[str, Any] = Depends(get_current_user)
):
    """Get guest usage analytics (admin only)"""
    try:
        # Check if user is admin
        if user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        client = supabase_service()._ensure_client()
        
        # Get guest generation trends over specified days
        start_date = (date.today() - timedelta(days=days)).isoformat()
        
        response = client.table("guest_generations").select(
            "last_generation_date, generation_count"
        ).gte("last_generation_date", start_date).execute()
        
        # Aggregate data by date
        daily_stats = {}
        total_guests = 0
        total_generations = 0
        
        for record in response.data or []:
            gen_date = record.get("last_generation_date")
            gen_count = record.get("generation_count", 0)
            
            if gen_date not in daily_stats:
                daily_stats[gen_date] = {
                    "unique_guests": 0,
                    "total_generations": 0
                }
            
            daily_stats[gen_date]["unique_guests"] += 1
            daily_stats[gen_date]["total_generations"] += gen_count
            total_guests += 1
            total_generations += gen_count
        
        return {
            "period_days": days,
            "summary": {
                "total_unique_guests": total_guests,
                "total_generations": total_generations,
                "average_generations_per_guest": round(total_generations / max(total_guests, 1), 2)
            },
            "daily_breakdown": daily_stats,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get guest analytics: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get analytics: {str(e)}")