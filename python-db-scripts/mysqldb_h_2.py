import requests
import pymysql
import time
from datetime import datetime, timezone, timedelta
import logging
import pytz
import signal
import sys
from config import servername, username, password, dbname, url, token

# JSON URL (solar)
json_url = "https://m.lkeportal.com/publicsolarbatch/ESS.json"

logging.basicConfig(
    filename="/home/ec2-user/logs/renewable_data_3.log",
    level=logging.INFO,
    format="%(asctime)s:%(levelname)s:%(message)s",
)

def signal_handler(sig, frame):
    logging.info("Script terminated by user")
    if connection:
        connection.close()
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)


def fetch_solar_data():
    try:
        response = requests.get(json_url)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        logging.error(f"Error fetching solar data: {e}")
        return None


def fetch_wind_data():
    try:
        headers = {"Authorization": token}
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        logging.error(f"Error fetching wind data: {e}")
        return None


def clamp(value, min_value, max_value):
    return max(min(value, max_value), min_value)


def format_value(value):
    return round(value, 2)


def save_to_db(connection, solar, wind, hydro, battery, solar_fixed, solar_360,
               solar_total_generation, hydro_generation,
               solar_fixed_generation, solar_dual_generation,
               wind_generation):

    try:
        with connection.cursor() as cursor:
            utc_timestamp = datetime.now(timezone.utc)

            sql = """
            INSERT INTO historical_data (
                date_time,
                solar_percentage,
                wind_percentage,
                hydro_percentage,
                battery_percentage,
                solar_fixed_percentage,
                solar_360_percentage,
                solar_total_generation,
                hydro_generation,
                solar_fixed_generation,
                solar_dual_generation,
                wind_generation
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """

            cursor.execute(
                sql,
                (
                    utc_timestamp,
                    solar,
                    wind,
                    hydro,
                    battery,
                    solar_fixed,
                    solar_360,
                    solar_total_generation,
                    hydro_generation,
                    solar_fixed_generation,
                    solar_dual_generation,
                    wind_generation,
                ),
            )

            connection.commit()

    except pymysql.MySQLError as e:
        logging.error(f"Error saving data to database: {e}")


def main():
    global connection
    connection = pymysql.connect(
        host=servername,
        user=username,
        password=password,
        database=dbname,
        cursorclass=pymysql.cursors.DictCursor,
    )

    try:
        while True:
            solar_data = fetch_solar_data()
            wind_data = fetch_wind_data()

            if solar_data and wind_data:
                s = solar_data[0]
                w = wind_data[0]

                solar = format_value(clamp(s.get("Solar Generation (%)", 0), 0, 100))
                wind = format_value(clamp(s.get("Wind Generation (%)", 0), 0, 100))
                hydro = format_value(clamp(s.get("Hydro Generation (%)", 0), 0, 100))
                battery = format_value(clamp(s.get("Battery State of Charge (SOC %)", 0), 0, 100))

                solarFixed = format_value(clamp(s.get("Solar Fixed (%)", 0), 0, 100))
                solar360 = format_value(clamp(s.get("Solar 360 Tracker (%)", 0), 0, 100))

                solar_total_generation = format_value(s.get("Solar Generation (kW)", 0))
                solar_fixed_generation = format_value(s.get("Solar Fixed (kW)", 0))
                solar_dual_generation = format_value(s.get("Solar 360 Trackers (kW)", 0))
                hydro_generation = format_value(s.get("Hydro Generation (kW)", 0))

                # wind power (kW)
                wind_generation = format_value(w.get("power", 0))

                save_to_db(
                    connection,
                    solar,
                    wind,
                    hydro,
                    battery,
                    solarFixed,
                    solar360,
                    solar_total_generation,
                    hydro_generation,
                    solar_fixed_generation,
                    solar_dual_generation,
                    wind_generation,
                )

            time.sleep(5)

    finally:
        connection.close()


if __name__ == "__main__":
    main()
