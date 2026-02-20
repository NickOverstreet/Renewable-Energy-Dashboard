from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
import cache

router = APIRouter()


@router.get("/solar")
async def get_solar_data():
    if cache.store["solar"] is None:
        raise HTTPException(status_code=503, detail="Solar data not yet available")
    # Pass raw bytes through — the upstream server returns concatenated JSON
    # objects that Python's strict parser rejects but browsers handle fine.
    return Response(content=cache.store["solar"], media_type="application/json")
