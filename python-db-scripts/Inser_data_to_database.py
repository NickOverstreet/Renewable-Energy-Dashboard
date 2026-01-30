import pymysql
import csv
from config import insert_data_db_host, insert_data_db_name, insert_data_db_password, insert_data_db_user

# CSV file path (adjust this path based on your actual file location)
csv_file_path = 'filtered_years.csv'

# Connect to the RDS database
connection = pymysql.connect(
    host=insert_data_db_host,
    user=insert_data_db_user,
    password=insert_data_db_password,
    database=insert_data_db_name,
    cursorclass=pymysql.cursors.DictCursor
)

# Function to insert data into the partitioned table
def insert_data(cursor, date_time, solar_percentage, wind_percentage, hydro_percentage, battery_percentage):
    """Insert a row of data into the test_me table."""
    sql = """
    INSERT INTO done_ready (date_time, solar_percentage, wind_percentage, hydro_percentage, battery_percentage)
    VALUES (%s, %s, %s, %s, %s)
    """
    cursor.execute(sql, (date_time, solar_percentage, wind_percentage, hydro_percentage, battery_percentage))

try:
    with connection.cursor() as cursor:
        # Open the CSV file and read it row by row
        with open(csv_file_path, mode='r') as csvfile:
            csvreader = csv.reader(csvfile)
            next(csvreader)  # Skip the header row

            for row in csvreader:
                # Extract columns from the row
                date_time_str, solar_percentage, wind_percentage, hydro_percentage, battery_percentage = row

                # Ensure date_time is in the correct format
                date_time = date_time_str  # Since you already formatted in Excel as yyyy-mm-dd hh:mm:ss

                # Handle missing data (empty fields) by replacing with None (NULL in MySQL)
                solar_percentage = float(solar_percentage) if solar_percentage else None
                wind_percentage = float(wind_percentage) if wind_percentage else None
                hydro_percentage = float(hydro_percentage) if hydro_percentage else None
                battery_percentage = float(battery_percentage) if battery_percentage else None

                # Insert data into the test_me table
                insert_data(cursor, date_time, solar_percentage, wind_percentage, hydro_percentage, battery_percentage)
                print(f"Inserted row for date_time {date_time}")

        # Commit the transaction after all rows are processed
        connection.commit()
        print("Data successfully uploaded to the partitioned table.")

except pymysql.MySQLError as e:
    print(f"Error: {e}")
finally:
    connection.close()