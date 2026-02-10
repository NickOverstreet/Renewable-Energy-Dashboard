import pymysql
from datetime import datetime, timezone
import logging
import time
from config import db_host, db_name, db_password, db_user

# Nameplate capacities
SOLAR_CAPACITY_MW = 10.2
HYDRO_CAPACITY_MW = 30.0

# Sensor sampling interval
SAMPLE_INTERVAL_SECONDS = 5.0

# Log to server file
""" logging.basicConfig(
    filename="/home/ec2-user/logs/capacity_factors.log",
    level=logging.INFO,
    format="%(asctime)s:%(levelname)s:%(message)s",
) """

def calculate_rolling_capacity_factors():
    """Calculate 7-day rolling capacity factors for solar and hydro."""
    try:
        connection = pymysql.connect(
            host=db_host,
            user=db_user,
            password=db_password,
            database=db_name,
            cursorclass=pymysql.cursors.DictCursor,
        )

        with connection.cursor() as cursor:

            # Solar daily capacity factors
            cursor.execute("""
                SELECT 
                    DATE(date_time) AS date,
                    (SUM(solar_generation) * (%s / 3600.0) / 1000.0)
                    / (%s * 24) * 100 AS daily_cf
                FROM historical_data
                WHERE date_time >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 7 DAY)
                  AND solar_generation IS NOT NULL
                GROUP BY DATE(date_time)
            """, (SAMPLE_INTERVAL_SECONDS, SOLAR_CAPACITY_MW))

            solar_days = cursor.fetchall()
            solar_cf_7d = (
                sum(row["daily_cf"] for row in solar_days) / len(solar_days)
                if solar_days else None
            )

            # Hydro daily capacity factors
            cursor.execute("""
                SELECT 
                    DATE(date_time) AS date,
                    (SUM(hydro_generation) * (%s / 3600.0) / 1000.0)
                    / (%s * 24) * 100 AS daily_cf
                FROM historical_data
                WHERE date_time >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 7 DAY)
                  AND hydro_generation IS NOT NULL
                GROUP BY DATE(date_time)
            """, (SAMPLE_INTERVAL_SECONDS, HYDRO_CAPACITY_MW))

            hydro_days = cursor.fetchall()
            hydro_cf_7d = (
                sum(row["daily_cf"] for row in hydro_days) / len(hydro_days)
                if hydro_days else None
            )

            utc_timestamp = datetime.now(timezone.utc)

            # Insert latest rolling values
            cursor.execute("""
                INSERT INTO capacity_factor_history
                (date_time, solar_capacity_factor_7d, hydro_capacity_factor_7d)
                VALUES (%s, %s, %s)
            """, (utc_timestamp, solar_cf_7d, hydro_cf_7d))

            connection.commit()
            logging.info(
                f"Inserted 7-day CFs | Solar: {solar_cf_7d}, Hydro: {hydro_cf_7d}"
            )

        connection.close()

    except Exception as e:
        logging.error(f"Error calculating rolling capacity factors: {e}")

if __name__ == "__main__":
    # Run every 5 minutes
    while True:
        try:
            calculate_rolling_capacity_factors()
            time.sleep(300)
        except KeyboardInterrupt:
            logging.info("Service stopped by user")
            break
        except Exception as e:
            logging.error(f"Unexpected error in main loop: {e}")
            time.sleep(300)