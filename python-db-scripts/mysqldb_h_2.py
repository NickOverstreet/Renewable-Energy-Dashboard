import requests
import pymysql
import time
from datetime import datetime, timezone, timedelta
import logging
import pytz
import signal
import sys
from config import db_host, db_name, db_password, db_user

# JSON URL
json_url = "https://m.lkeportal.com/publicsolarbatch/ESS.json"

# Set up logging to the server
<<<<<<< HEAD
""" logging.basicConfig(
    filename="/home/ec2-user/logs/renewable_data_3.log",
    level=logging.INFO,
    format="%(asctime)s:%(levelname)s:%(message)s",
) """
=======
# logging.basicConfig(
#     filename="/home/ec2-user/logs/renewable_data_3.log",
#     level=logging.INFO,
#     format="%(asctime)s:%(levelname)s:%(message)s",
# )
>>>>>>> 252991a (comment out server logging)

# Time precision enhancement
"""

def sleep_until_next_second():
    now = datetime.now(datetime.timezone.utc)
    next_second = (now + timedelta(seconds=1)).replace(microsecond=0)
    time_to_sleep = (next_second - datetime.utcnow()).total_seconds()

             utc_timestamp = datetime.now(datetime.timezone.utc) 
    if time_to_sleep > 0:
        time.sleep(time_to_sleep)

"""

# Signal handler to handle termination
def signal_handler(sig, frame):
    logging.info("Script terminated by user")
    if connection:
        connection.close()
    sys.exit(0)


signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)


def fetch_data():
    """Fetch data from the JSON URL."""
    try:
        response = requests.get(json_url)
        """ print("URL:", response.url)
        print("STATUS:", response.status_code)
        print("CONTENT-TYPE:", response.headers.get("Content-Type"))
        print("BODY (first 300):", response.text[:300]) """ # Debugging output
        response.raise_for_status()  # HTTPError for bad responses
        data = response.json()
        return data
    except requests.exceptions.RequestException as e:
        logging.error(f"Error fetching data: {e}")
        return None


def clamp(value, min_value, max_value):
    """Clamp the value between min_value and max_value."""
    return max(min(value, max_value), min_value)


def format_value(value):
    """Format the value to two decimal places."""
    return round(value, 2)


def save_to_db(connection, solar, wind, hydro, battery, solar_fixed, solar_360, solar_generation, hydro_generation):
    """Save the data to the database."""
    try:
        with connection.cursor() as cursor:
            # utc_timestamp = datetime.utcnow()  # Get current UTC time DEPRECATED
            utc_timestamp = datetime.now(timezone.utc)

            # Insert UTC timestamp into the date_time column
            sql = "INSERT INTO historical_data (date_time, solar_percentage, wind_percentage, hydro_percentage, battery_percentage, solar_fixed_percentage, solar_360_percentage, solar_generation, hydro_generation) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)"
            cursor.execute(
                sql,
                (utc_timestamp, solar, wind, hydro, battery, solar_fixed, solar_360, solar_generation, hydro_generation),
            )
            connection.commit()
            logging.info(
                f"Data saved: DateTime={utc_timestamp}, Solar={solar}, Wind={wind}, Hydro={hydro}, Battery={battery}, Solar_Fixed={solar_fixed}, Solar_360={solar_360}, Solar_Gen={solar_generation}, Hydro_Gen={hydro_generation}"
            )
    except pymysql.MySQLError as e:
        logging.error(f"Error saving data to database: {e}")


def main():
    """Main function to fetch data and save it to the database."""
    global connection
    connection = pymysql.connect(
        host=db_host,
        user=db_user,
        password=db_password,
        database=db_name,
        cursorclass=pymysql.cursors.DictCursor,
    )

    try:
        while True:
            data = fetch_data()
            if data:
                solar = format_value(
                    clamp(data[0].get("Solar Generation (%)", 0), 0, 100)
                )
                wind = format_value(
                    clamp(data[0].get("Wind Generation (%)", 0), 0, 100)
                )
                hydro = format_value(
                    clamp(data[0].get("Hydro Generation (%)", 0), 0, 100)
                )
                battery = format_value(
                    clamp(data[0].get("Battery State of Charge (SOC %)", 0), 0, 100)
                )
                # New Data points
                solarFixed = format_value(
                    clamp(data[0].get("Solar Fixed (%)", 0), 0, 100)
                )
                solar360 = format_value(
                    clamp(data[0].get("Solar 360 Tracker (%)", 0), 0, 100)
                )
                solar_generation = format_value(data[0].get("Solar Generation (kW)"))
                hydro_generation = format_value(data[0].get("Hydro Generation (kW)"))
                logging.info(
                    f"Fetched data at {datetime.now(timezone.utc)}: Solar={solar:.2f}, Wind={wind:.2f}, Hydro={hydro:.2f}, Battery={battery:.2f}, Solar_Fixed={solarFixed:.2f}, Solar_360={solar360:.2f}, Solar_Gen{solar_generation:.2f}, Hydro_Gen{hydro_generation:.2f}"
                )
                save_to_db(
                    connection, solar, wind, hydro, battery, solarFixed, solar360, solar_generation, hydro_generation
                )
            # time.sleep(12)  # Wait for 1 minute before fetching data again (This is where to define the period of permanent run)
            time.sleep(5) # 10 second fetching
            #time.sleep(0.9)
            # time.sleep(600)  # Wait for 10 minutes before fetching data again
    finally:
        connection.close()


if __name__ == "__main__":
    main()
