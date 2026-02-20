# Renewable-Energy-Dashboard

Enhanced an existing renewable-generation dashboard for our CS Capstone Project.

## Configuration Setup (Required)

This repository does not commit files containing sensitive data (API tokens, database credentials).

1\. Copy each `.example.php/py` config file and remove `.example` from the name.

2\. Fill in the required values using credentials provided by the client or your own local DB (explained below).

## Run dashboard locally

### Prereqs

- PHP 8+ with curl enabled

- Python 3

---

## Steps

1\. **Create API config**

   Copy example config files and add your DB credentials or API URL + token:

   - From `dashboard-scripts/config/API/ConfigAPIExample.php`

   - Create `dashboard-scripts/config/API/ConfigAPI.php`

---

2\. **Install MySQL**  

   Download MySQL 8.0:  

   https://dev.mysql.com/downloads/mysql/8.0.html

   - The installer will prompt you for passwords.

   - When asked to enter a password for the database **"root"** user:

     - This is the MySQL root password you will use in later steps.

     - This is **not** your computer's system password.

---

3\. **Install MySQL Workbench**  

   Download MySQL Workbench:  

   https://dev.mysql.com/downloads/workbench/

   - Make sure MySQL is running on your machine.

   - Open MySQL Workbench.

   - Select **Local Instance 3306** and enter the root password.

   - Open a new SQL query tab (click the "+" icon or _File → New Query Tab_).

Run the following SQL commands:

```sql

   CREATE DATABASE renewables;

   USE renewables;

   CREATE TABLE historical_data (

       id INT NOT NULL AUTO_INCREMENT,

       date_time DATETIME NOT NULL,

       solar_percentage FLOAT,

       wind_percentage FLOAT,

       hydro_percentage FLOAT,

       battery_percentage FLOAT,

       solar_fixed_percentage FLOAT,

       solar_360_percentage FLOAT,

       solar_generation FLOAT,

       hydro_generation FLOAT,

       PRIMARY KEY (id, date_time),

       INDEX (date_time)

   )

   PARTITION BY RANGE (YEAR(date_time)) (

       PARTITION p2016 VALUES LESS THAN (2017),

       PARTITION p2017 VALUES LESS THAN (2018),

       PARTITION p2018 VALUES LESS THAN (2019),

       PARTITION p2019 VALUES LESS THAN (2020),

       PARTITION p2020 VALUES LESS THAN (2021),

       PARTITION p2021 VALUES LESS THAN (2022),

       PARTITION p2022 VALUES LESS THAN (2023),

       PARTITION p2023 VALUES LESS THAN (2024),

       PARTITION p2024 VALUES LESS THAN (2025),

       PARTITION p2025 VALUES LESS THAN (2026),

       PARTITION p2026 VALUES LESS THAN (2027),

       PARTITION p2027 VALUES LESS THAN (2028),

       PARTITION p2028 VALUES LESS THAN (2029),

       PARTITION p2029 VALUES LESS THAN (2030),

       PARTITION p2030 VALUES LESS THAN (2031)

   );
```

   - Open another SQL query tab.

Run the following SQL commands:

```sql

   CREATE TABLE capacity_factor_history (

       PARTITION p2016 VALUES LESS THAN (2017),

       id INT NOT NULL AUTO_INCREMENT,

       date_time DATETIME NOT NULL,

       solar_capacity_factor_7d FLOAT DEFAULT NULL,

       hydro_capacity_factor_7d FLOAT DEFAULT NULL,

       PRIMARY KEY (id, date_time),

       INDEX (date_time)

  ) ENGINE=InnoDB;

```

4\. **Edit dbConfig.php (PHP config)**

Located under dashboard-scripts.

- Set servername to "localhost"

- Set username to "root"

- Set password to your MySQL root password

- Set dbname to "renewables"

5\. **Edit config.py** (Python config)\*\*

Located under python-db-scripts.

- Set servername to "localhost"

- Set username to "root"

- Set password to your MySQL root password

- Set dbname to "renewables"

6\. **Edit mysqldb_h_2.py and calculate_rolling_capacity_factors.py (Python scripts)**

Located under python-db-scripts.

Make sure to comment out the logging configuration section for both files:

```bash
logging.basicConfig(

    filename="text",

    level=logging.INFO,

    format="%(asctime)s:%(levelname)s:%(message)s",

)
```

7\. **Start the PHP server**

- Open one terminal and run:

```bash
php -S localhost:8000 -t dashboard-scripts
```

- Open another terminal and run:

```bash
python3 mysqldb_h_2.py
```

- Open another terminal and run:

```bash
python3 calculate_rolling_capacity_factors.py
```

- Let the project run for a few seconds so it can gather data.

- In MySQL Workbench, open a new SQL query tab and run:

```sql
SELECT * FROM historical_data LIMIT 5;
```

- This confirms the database is working and data has been inserted.

8\. **Open the dashboard**

```bash
http://localhost:8000/index.php
```