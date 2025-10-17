from fastapi import APIRouter, HTTPException

from core.supabase_client import supabase_service

router = APIRouter()

@router.get("/model-performance")
def get_model_performance():
    """
    Returns stored model performance metrics from Supabase.
    """
    try:
        supabase_service_instance = supabase_service()
        # Ensure the client is properly initialized
        client = supabase_service_instance._ensure_client()

        if client is None:
            raise HTTPException(status_code=500, detail="Failed to initialize Supabase client")

        resp = client.table("model_performance").select("*").execute()
        return {"status": "success", "data": resp.data}
    except ValueError as e:
        # This will catch the error when SUPABASE_URL or SUPABASE_ANON_KEY is not set
        raise HTTPException(status_code=500, detail=f"Supabase configuration error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch model performance data: {str(e)}")
