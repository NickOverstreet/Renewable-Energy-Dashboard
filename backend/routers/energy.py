from fastapi import APIRouter, Query
from datetime import datetime
import pytz
from database import get_connection

router = APIRouter()


@router.get("/data")
def get_data(
    startDate: str = Query(...),
    startTime: str = Query(...),
    endDate: str = Query(...),
):
    eastern = pytz.timezone("America/New_York")
    utc = pytz.utc

    start_local = eastern.localize(
        datetime.strptime(f"{startDate} {startTime}", "%Y-%m-%d %H:%M:%S")
    )
    end_local = eastern.localize(
        datetime.strptime(f"{endDate} 23:59:59", "%Y-%m-%d %H:%M:%S")
    )

    start_utc = start_local.astimezone(utc).strftime("%Y-%m-%d %H:%M:%S")
    end_utc = end_local.astimezone(utc).strftime("%Y-%m-%d %H:%M:%S")

    group_interval = 300

    sql = """
    SELECT
        interval_time,
        ROUND(AVG(solar_percentage), 2)       AS solar_percentage,
        ROUND(AVG(wind_percentage), 2)        AS wind_percentage,
        ROUND(AVG(hydro_percentage), 2)       AS hydro_percentage,
        ROUND(AVG(battery_percentage), 2)     AS battery_percentage,
        ROUND(AVG(solar_fixed_percentage), 2) AS solar_fixed_percentage,
        ROUND(AVG(solar_360_percentage), 2)   AS solar_360_percentage
    FROM (
        SELECT
            date_time,
            solar_percentage, wind_percentage, hydro_percentage,
            battery_percentage, solar_fixed_percentage, solar_360_percentage,
            FROM_UNIXTIME(FLOOR(UNIX_TIMESTAMP(date_time) / %s) * %s) AS interval_time
        FROM historical_data
        WHERE date_time >= %s AND date_time <= %s
    ) t
    GROUP BY interval_time
    ORDER BY interval_time ASC
    """

    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(sql, (group_interval, group_interval, start_utc, end_utc))
            results = cursor.fetchall()
    finally:
        connection.close()

    if not results:
        return {"error": "No data found for the given date range"}

    data = {
        "solar": [], "wind": [], "hydro": [], "battery": [],
        "solarFixed": [], "solar360": [], "interval_times": [],
    }

    for row in results:
        dt_utc = row["interval_time"]
        if isinstance(dt_utc, str):
            dt_utc = datetime.strptime(dt_utc, "%Y-%m-%d %H:%M:%S")
        dt_local = utc.localize(dt_utc).astimezone(eastern).strftime("%Y-%m-%d %H:%M:%S")

        data["interval_times"].append(dt_local)
        data["solar"].append(float(row["solar_percentage"] or 0))
        data["wind"].append(float(row["wind_percentage"] or 0))
        data["hydro"].append(float(row["hydro_percentage"] or 0))
        data["battery"].append(float(row["battery_percentage"] or 0))
        data["solarFixed"].append(float(row["solar_fixed_percentage"] or 0))
        data["solar360"].append(float(row["solar_360_percentage"] or 0))

    return data


@router.get("/capacity-factors")
def get_capacity_factors():
    sql = """
    SELECT
        solar_total_capacity_factor_7d,
        solar_fixed_capacity_factor_7d,
        solar_dual_capacity_factor_7d,
        hydro_capacity_factor_7d,
        wind_capacity_factor_7d
    FROM capacity_factor_history
    ORDER BY date_time DESC
    LIMIT 1
    """

    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(sql)
            row = cursor.fetchone()
    finally:
        connection.close()

    return row or {}
