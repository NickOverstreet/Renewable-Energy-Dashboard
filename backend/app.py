import os
import asyncio
import json
import logging
import threading
from contextlib import asynccontextmanager
from datetime import datetime, timezone

import httpx
import pymysql
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config import (
    SOLAR_JSON_URL, WIND_API_URL, WIND_API_TOKEN,
    DB_HOST, DB_USER, DB_PASSWORD, DB_NAME,
    LOG_FILE_INGESTION,
)
from routers import energy, wind, solar
import cache


_stop = threading.Event() # Used to signal background threads to stop on shutdown

logging.basicConfig(
    filename=LOG_FILE_INGESTION,
    level=logging.INFO,
    format="%(asctime)s:%(levelname)s:%(message)s",
)

# Nameplate capacities (MW)
SOLAR_TOTAL_CAPACITY_MW = 10.24
SOLAR_FIXED_CAPACITY_MW = 10.24
SOLAR_DUAL_AXIS_CAPACITY_MW = 0.01
HYDRO_CAPACITY_MW = 30.0
WIND_CAPACITY_MW = 0.09
SAMPLE_INTERVAL_SECONDS = 5.0


def _clamp(value, lo, hi):
    return max(min(value, hi), lo)


def _fmt(value):
    return round(value, 2)


# ── Background task 1: fetch APIs → update in-memory cache every 5s ─────────

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


# ── Background task 2: cache → DB every 5s ───────────────────────────────────

def ingest_loop():
    connection = pymysql.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        cursorclass=pymysql.cursors.DictCursor,
    )
    try:
        while not _stop.wait(timeout=5):

            solar_raw = cache.store["solar"]
            wind_data = cache.store["wind"]
            if solar_raw is None or wind_data is None:
                continue

            try:
                s = json.loads(solar_raw)[0]
                w = wind_data[0]

                solar         = _fmt(_clamp(s.get("Solar Generation (%)", 0), 0, 100))
                wind          = _fmt(_clamp(s.get("Wind Generation (%)", 0), 0, 100))
                hydro         = _fmt(_clamp(s.get("Hydro Generation (%)", 0), 0, 100))
                battery       = _fmt(_clamp(s.get("Battery State of Charge (SOC %)", 0), 0, 100))
                sol_fixed     = _fmt(_clamp(s.get("Solar Fixed (%)", 0), 0, 100))
                sol_360       = _fmt(_clamp(s.get("Solar 360 Tracker (%)", 0), 0, 100))
                sol_total_gen = _fmt(s.get("Solar Generation (kW)", 0))
                sol_fixed_gen = _fmt(s.get("Solar Fixed (kW)", 0))
                sol_dual_gen  = _fmt(s.get("Solar 360 Trackers (kW)", 0))
                hydro_gen     = _fmt(s.get("Hydro Generation (kW)", 0))
                wind_gen      = _fmt(w.get("power", 0))

                with connection.cursor() as cursor:
                    cursor.execute(
                        """
                        INSERT INTO historical_data (
                            date_time,
                            solar_percentage, wind_percentage,
                            hydro_percentage, battery_percentage,
                            solar_fixed_percentage, solar_360_percentage,
                            solar_total_generation, hydro_generation,
                            solar_fixed_generation, solar_dual_generation,
                            wind_generation
                        ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                        """,
                        (
                            datetime.now(timezone.utc),
                            solar, wind, hydro, battery,
                            sol_fixed, sol_360,
                            sol_total_gen, hydro_gen,
                            sol_fixed_gen, sol_dual_gen,
                            wind_gen,
                        ),
                    )
                connection.commit()

            except Exception as e:
                logging.error(f"Ingest error: {e}")

    finally:
        connection.close()


# ── Background task 3: DB → DB capacity factors every 5 minutes ─────────────

def capacity_loop():
    while True:
        try:
            _run_capacity_factors()
        except Exception as e:
            logging.error(f"Capacity factor error: {e}")
        if _stop.wait(timeout=300):
            break


def _run_capacity_factors():
    connection = pymysql.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        cursorclass=pymysql.cursors.DictCursor,
    )
    try:
        with connection.cursor() as cursor:

            # Solar total
            cursor.execute(
                """
                SELECT (SUM(GREATEST(solar_total_generation, 0)) * (%s / 3600.0)
                       / (%s * 1000 * 24 * 7)) * 100 AS cf_7d
                FROM historical_data
                WHERE date_time >= UTC_TIMESTAMP() - INTERVAL 7 DAY
                AND solar_total_generation IS NOT NULL
                """,
                (SAMPLE_INTERVAL_SECONDS, SOLAR_TOTAL_CAPACITY_MW),
            )
            solar_total_cf = cursor.fetchone()["cf_7d"]

            # Solar fixed
            cursor.execute(
                """
                SELECT (SUM(GREATEST(solar_fixed_generation, 0)) * (%s / 3600.0)
                       / (%s * 1000 * 24 * 7)) * 100 AS cf_7d
                FROM historical_data
                WHERE date_time >= UTC_TIMESTAMP() - INTERVAL 7 DAY
                AND solar_fixed_generation IS NOT NULL
                """,
                (SAMPLE_INTERVAL_SECONDS, SOLAR_FIXED_CAPACITY_MW),
            )
            solar_fixed_cf = cursor.fetchone()["cf_7d"]

            # Solar dual axis
            cursor.execute(
                """
                SELECT (SUM(GREATEST(solar_dual_generation, 0)) * (%s / 3600.0)
                       / (%s * 1000 * 24 * 7)) * 100 AS cf_7d
                FROM historical_data
                WHERE date_time >= UTC_TIMESTAMP() - INTERVAL 7 DAY
                AND solar_dual_generation IS NOT NULL
                """,
                (SAMPLE_INTERVAL_SECONDS, SOLAR_DUAL_AXIS_CAPACITY_MW),
            )
            solar_dual_cf = cursor.fetchone()["cf_7d"]

            # Hydro
            cursor.execute(
                """
                SELECT (SUM(GREATEST(hydro_generation, 0)) * (%s / 3600.0)
                       / (%s * 1000 * 24 * 7)) * 100 AS cf_7d
                FROM historical_data
                WHERE date_time >= UTC_TIMESTAMP() - INTERVAL 7 DAY
                AND hydro_generation IS NOT NULL
                """,
                (SAMPLE_INTERVAL_SECONDS, HYDRO_CAPACITY_MW),
            )
            hydro_cf = cursor.fetchone()["cf_7d"]

            # Wind
            cursor.execute(
                """
                SELECT (SUM(GREATEST(wind_generation, 0)) * (%s / 3600.0)
                       / (%s * 1000 * 24 * 7)) * 100 AS cf_7d
                FROM historical_data
                WHERE date_time >= UTC_TIMESTAMP() - INTERVAL 7 DAY
                AND wind_generation IS NOT NULL
                """,
                (SAMPLE_INTERVAL_SECONDS, WIND_CAPACITY_MW),
            )
            wind_cf = cursor.fetchone()["cf_7d"]

            cursor.execute(
                """
                INSERT INTO capacity_factor_history (
                    date_time,
                    solar_total_capacity_factor_7d,
                    solar_fixed_capacity_factor_7d,
                    solar_dual_capacity_factor_7d,
                    hydro_capacity_factor_7d,
                    wind_capacity_factor_7d
                ) VALUES (%s,%s,%s,%s,%s,%s)
                """,
                (
                    datetime.now(timezone.utc),
                    solar_total_cf, solar_fixed_cf, solar_dual_cf,
                    hydro_cf, wind_cf,
                ),
            )
            connection.commit()

            logging.info(
                f"Capacity factors | Solar: {solar_total_cf:.3f}% | Fixed: {solar_fixed_cf:.3f}%"
                f" | Dual: {solar_dual_cf:.3f}% | Hydro: {hydro_cf:.3f}% | Wind: {wind_cf:.3f}%"
                if solar_total_cf is not None
                else "Capacity factors inserted (one or more values are NULL)"
            )

    finally:
        connection.close()


# ── Lifespan: start all three background tasks on startup ────────────────────

@asynccontextmanager
async def lifespan(app):
    asyncio.create_task(refresh_cache())
    asyncio.create_task(asyncio.to_thread(ingest_loop))
    asyncio.create_task(asyncio.to_thread(capacity_loop))
    yield
    _stop.set()


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
