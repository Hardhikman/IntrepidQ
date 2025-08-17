from fastapi import APIRouter
from core.supabase_client import supabase_service

router = APIRouter()

@router.get("/model-performance")
def get_model_performance():
    """
    Returns stored model performance metrics from Supabase.
    """
    try:
        supabase = supabase_service().client
        resp = supabase.table("model_performance").select("*").execute()
        return {"status": "success", "data": resp.data}
    except Exception as e:
        return {"status": "error", "message": str(e)}