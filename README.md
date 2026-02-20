# Renewable Energy Dashboard

A live-streaming renewable energy dashboard for PPL R&D's Renewable Integration Research Facility. Displays real-time and historical data from solar, wind, hydro, and battery systems using a Python/FastAPI backend and a vanilla JS frontend.

---

## Project Structure

```
Renewable-Energy-Dashboard/
├── backend/
│   ├── app.py                              # FastAPI app, startup cache refresh task
│   ├── cache.py                            # Shared in-memory cache (solar + wind)
│   ├── database.py                         # MySQL connection helper
│   ├── mysqldb_h_2.py                      # Data ingestion script (APIs → DB, every 5s)
│   ├── calculate_rolling_capacity_factors.py  # Capacity factor script (DB → DB, every 5min)
│   ├── config.py                           # Credentials — gitignored, do not commit
│   ├── configExample.py                    # Template for config.py
│   ├── requirements.txt
│   └── routers/
│       ├── energy.py                       # GET /data, GET /capacity-factors
│       ├── solar.py                        # GET /solar
│       └── wind.py                         # GET /wind
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── js/
│       ├── config.js                       # API base URL
│       ├── gauge.js                        # Gauge chart rendering
│       ├── updateGauges.js                 # Real-time gauge polling (every 5s)
│       ├── timeSeries.js                   # Historical time series chart
│       ├── rollingCapacityFactors.js       # 7-day capacity factor display
│       └── Wind_API.js                     # Wind data display
└── .venv/                                  # Virtual environment (gitignored)
```

---

## Setup

### 1. Create `backend/config.py`

Copy the example and fill in your credentials:

```
backend/configExample.py  →  backend/config.py
```

**Database credentials** — set to `localhost` for local development, or your RDS endpoint for production. To switch between them, comment/uncomment the relevant block in `config.py`:

```python
# Production (RDS)
# DB_HOST = 'your_rds_endpoint'
# DB_USER = 'your_db_user'
# DB_PASSWORD = 'your_db_password'
# DB_NAME = 'renewables'

# Local
DB_HOST = 'localhost'
DB_USER = 'root'
DB_PASSWORD = 'your_mysql_root_password'
DB_NAME = 'renewables'
```

**API credentials** — provided by the client:

```python
WIND_API_URL   = 'your_wind_api_url'
WIND_API_TOKEN = 'Token your_wind_api_token'  # include the "Token " prefix

SOLAR_JSON_URL = 'your_solar_json_url'
```

---

### 2. Install MySQL

Download MySQL 8.0: https://dev.mysql.com/downloads/mysql/8.0.html

- When prompted, set a password for the `root` user — this is your `DB_PASSWORD`.

Download MySQL Workbench: https://dev.mysql.com/downloads/workbench/

- Open Workbench → connect to **Local Instance 3306** → enter your root password.

---

### 3. Create the database tables

Open a query tab in MySQL Workbench and run:

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
    solar_total_generation FLOAT,
    solar_fixed_generation FLOAT,
    solar_dual_generation FLOAT,
    wind_generation FLOAT,
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

CREATE TABLE capacity_factor_history (
    id INT NOT NULL AUTO_INCREMENT,
    date_time DATETIME NOT NULL,
    solar_total_capacity_factor_7d FLOAT DEFAULT NULL,
    solar_fixed_capacity_factor_7d FLOAT DEFAULT NULL,
    solar_dual_capacity_factor_7d FLOAT DEFAULT NULL,
    hydro_capacity_factor_7d FLOAT DEFAULT NULL,
    wind_capacity_factor_7d FLOAT DEFAULT NULL,
    PRIMARY KEY (id, date_time),
    INDEX (date_time)
) ENGINE=InnoDB;
```

Verify data is flowing after starting the ingestion script:

```sql
SELECT * FROM historical_data LIMIT 5;
```

---

### 4. Create the virtual environment

From the project root:

```bash
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate

pip install -r backend/requirements.txt
```

---

## Running

Open a separate terminal for each process (activate the venv in each).

**Terminal 1 — FastAPI server + frontend:**

```bash
uvicorn app:app --app-dir backend --reload
```

**Terminal 2 — Data ingestion** (fetches solar + wind APIs → writes to DB every 5 seconds):

```bash
python backend/mysqldb_h_2.py
```

**Terminal 3 — Capacity factor calculator** (calculates 7-day rolling capacity factors → writes to DB every 5 minutes):

```bash
python backend/calculate_rolling_capacity_factors.py
```

Let the ingestion script run for a few seconds, then open the dashboard:

```
http://localhost:8000
```
