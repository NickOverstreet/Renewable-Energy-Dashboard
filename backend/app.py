import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from routers import energy, wind, solar

app = FastAPI(title="Renewable Energy Dashboard API")

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
