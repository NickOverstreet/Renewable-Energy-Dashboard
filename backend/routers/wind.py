from fastapi import APIRouter, HTTPException
import cache

router = APIRouter()


@router.get("/wind")
async def get_wind_data():
    if cache.store["wind"] is None:
        raise HTTPException(status_code=503, detail="Wind data not yet available")
    return cache.store["wind"]
