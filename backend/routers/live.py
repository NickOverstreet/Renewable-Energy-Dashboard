import json
from fastapi import APIRouter, HTTPException
import cache

router = APIRouter(prefix="/live")


@router.get("/facility")
async def get_facility_data():
    """Returns facility data (solar, hydro, battery). Fails independently of wind."""
    if cache.store["solar"] is None:
        raise HTTPException(status_code=503, detail="Facility data not yet available")
    try:
        facility = json.loads(cache.store["solar"])
    except Exception:
        raise HTTPException(status_code=503, detail="Facility data temporarily unavailable")
    return {"facility": facility}


@router.get("/wind")
async def get_wind_data():
    """Returns wind turbine data. Fails independently of facility data."""
    if cache.store["wind"] is None:
        raise HTTPException(status_code=503, detail="Wind data not yet available")
    return {"wind": cache.store["wind"]}
