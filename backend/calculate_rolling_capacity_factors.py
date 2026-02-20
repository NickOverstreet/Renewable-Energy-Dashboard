import pymysql
from datetime import datetime, timezone
import logging
import time
from config import DB_HOST as servername, DB_USER as username, DB_PASSWORD as password, DB_NAME as dbname, LOG_FILE_CAPACITY


# Nameplate capacities (MW)
SOLAR_TOTAL_CAPACITY_MW = 10.24
SOLAR_FIXED_CAPACITY_MW = 10.24
SOLAR_DUAL_AXIS_CAPACITY_MW = 0.01
HYDRO_CAPACITY_MW = 30.0
WIND_CAPACITY_MW = 0.09

# Sampling interval (seconds)
SAMPLE_INTERVAL_SECONDS = 5.0

logging.basicConfig(
    filename=LOG_FILE_CAPACITY,
    level=logging.INFO,
    format="%(asctime)s:%(levelname)s:%(message)s",
)

def calculate_rolling_capacity_factors():
    """Calculate and store 7-day rolling capacity factors."""
    connection = None

    try:
        connection = pymysql.connect(
            host=servername,
            user=username,
            password=password,
            database=dbname,
            cursorclass=pymysql.cursors.DictCursor,
        )

        with connection.cursor() as cursor:

            # Solar total
            cursor.execute(
                """
                SELECT (SUM(GREATEST(solar_total_generation, 0)) * (%s / 3600.0) / (%s * 1000 * 24 * 7)) * 100 AS cf_7d
                FROM historical_data
                WHERE date_time >= UTC_TIMESTAMP() - INTERVAL 7 DAY
                AND solar_total_generation IS NOT NULL;
                """,
                (SAMPLE_INTERVAL_SECONDS, SOLAR_TOTAL_CAPACITY_MW),
            )
            solar_total_cf_7d = cursor.fetchone()["cf_7d"]

            # Solar fixed
            cursor.execute(
                """
                SELECT (SUM(GREATEST(solar_fixed_generation, 0)) * (%s / 3600.0) / (%s * 1000 * 24 * 7)) * 100 AS cf_7d
                FROM historical_data
                WHERE date_time >= UTC_TIMESTAMP() - INTERVAL 7 DAY
                AND solar_fixed_generation IS NOT NULL;
                """,
                (SAMPLE_INTERVAL_SECONDS, SOLAR_FIXED_CAPACITY_MW),
            )
            solar_fixed_cf_7d = cursor.fetchone()["cf_7d"]

            # Solar dual axis
            cursor.execute(
                """
                SELECT (SUM(GREATEST(solar_dual_generation, 0)) * (%s / 3600.0) / (%s * 1000 * 24 * 7)) * 100 AS cf_7d
                FROM historical_data
                WHERE date_time >= UTC_TIMESTAMP() - INTERVAL 7 DAY
                AND solar_dual_generation IS NOT NULL;
                """,
                (SAMPLE_INTERVAL_SECONDS, SOLAR_DUAL_AXIS_CAPACITY_MW),
            )
            solar_dual_cf_7d = cursor.fetchone()["cf_7d"]

            # Hydro
            cursor.execute(
                """
                SELECT (SUM(GREATEST(hydro_generation, 0)) * (%s / 3600.0)/ (%s * 1000 * 24 * 7)) * 100 AS cf_7d
                FROM historical_data
                WHERE date_time >= UTC_TIMESTAMP() - INTERVAL 7 DAY
                AND hydro_generation IS NOT NULL;
                """,
                (SAMPLE_INTERVAL_SECONDS, HYDRO_CAPACITY_MW),
            )
            hydro_cf_7d = cursor.fetchone()["cf_7d"]

            # Wind
            cursor.execute(
                """
                SELECT (SUM(GREATEST(wind_generation, 0)) * (%s / 3600.0) / (%s * 1000 * 24 * 7)) * 100 AS cf_7d
                FROM historical_data
                WHERE date_time >= UTC_TIMESTAMP() - INTERVAL 7 DAY
                AND wind_generation IS NOT NULL;
                """,
                (SAMPLE_INTERVAL_SECONDS, WIND_CAPACITY_MW),
            )
            wind_cf_7d = cursor.fetchone()["cf_7d"]

            utc_timestamp = datetime.now(timezone.utc)

            cursor.execute(
                """
                INSERT INTO capacity_factor_history (
                    date_time,
                    solar_total_capacity_factor_7d,
                    solar_fixed_capacity_factor_7d,
                    solar_dual_capacity_factor_7d,
                    hydro_capacity_factor_7d,
                    wind_capacity_factor_7d
                )
                VALUES (%s, %s, %s, %s, %s, %s);
                """,
                (
                    utc_timestamp,
                    solar_total_cf_7d,
                    solar_fixed_cf_7d,
                    solar_dual_cf_7d,
                    hydro_cf_7d,
                    wind_cf_7d,
                ),
            )

            connection.commit()

            logging.info(
                f"Inserted 7-day CFs | Solar Total: {solar_total_cf_7d:.3f}% | Solar Fixed: {solar_fixed_cf_7d:.3f}% | Solar Dual: {solar_dual_cf_7d:.3f}% | Hydro: {hydro_cf_7d:.3f}% | Wind: {wind_cf_7d:.3f}%"
                if solar_total_cf_7d is not None and hydro_cf_7d is not None
                else "Inserted CFs but one or more values are NULL"
            )

    except Exception as e:
        logging.error(f"Error calculating rolling capacity factors: {e}")

    finally:
        if connection:
            connection.close()


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
