import os
import asyncio
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config import SOLAR_JSON_URL, WIND_API_URL, WIND_API_TOKEN
from routers import energy, wind, solar
import cache


async def refresh_cache():
    async with httpx.AsyncClient() as client:
        while True:
            try:
                r = await client.get(SOLAR_JSON_URL, timeout=5.0)
                if r.status_code == 200:
                    cache.store["solar"] = r.content
            except Exception:
                pass

            try:
                r = await client.get(
                    WIND_API_URL,
                    headers={"Authorization": WIND_API_TOKEN},
                    timeout=5.0,
                )
                if r.status_code == 200:
                    cache.store["wind"] = r.json()
            except Exception:
                pass

            await asyncio.sleep(5)


@asynccontextmanager
async def lifespan(app):
    asyncio.create_task(refresh_cache())
    yield


app = FastAPI(title="Renewable Energy Dashboard API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routes — must be registered before the static file mount so they take priority
app.include_router(energy.router)
app.include_router(wind.router)
app.include_router(solar.router)

# Serve the frontend from /  (html=True makes index.html the default for /)
frontend_dir = os.path.join(os.path.dirname(__file__), "..", "frontend")
app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")
