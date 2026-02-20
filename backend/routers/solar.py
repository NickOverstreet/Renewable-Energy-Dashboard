from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
import httpx
from config import SOLAR_JSON_URL

router = APIRouter()


@router.get("/solar")
async def get_solar_data():
    async with httpx.AsyncClient() as client:
        response = await client.get(SOLAR_JSON_URL, timeout=10.0)
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail="Solar API error")
    # Pass raw bytes through — the upstream server returns concatenated JSON
    # objects that Python's strict parser rejects but browsers handle fine.
    return Response(content=response.content, media_type="application/json")
