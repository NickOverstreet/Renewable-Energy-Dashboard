from fastapi import APIRouter, HTTPException
import httpx
from config import WIND_API_URL, WIND_API_TOKEN

router = APIRouter()


@router.get("/wind")
async def get_wind_data():
    async with httpx.AsyncClient() as client:
        response = await client.get(
            WIND_API_URL,
            headers={"Authorization": WIND_API_TOKEN},
            timeout=10.0,
        )
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail="Wind API error")
    return response.json()
