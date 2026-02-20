# Renewable Energy Dashboard

A live-streaming renewable energy dashboard for PPL R&D's Renewable Integration Research Facility. Displays real-time and historical data from solar, wind, hydro, and battery systems using a Python/FastAPI backend and a vanilla JS frontend.

---

## Project Structure

```
Renewable-Energy-Dashboard/
├── backend/
│   ├── app.py                              # FastAPI app + all three background tasks
│   ├── cache.py                            # Shared in-memory cache (solar + wind)
│   ├── database.py                         # MySQL connection helper
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
└── .venv/                                  # Virtual environment — local dev only, gitignored
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

### 4. Install dependencies

**Local development (optional venv):**

```bash
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate

pip install -r backend/requirements.txt
```

**On the server (no venv — install system-wide for the ec2-user):**

```bash
pip3 install fastapi uvicorn pymysql python-dotenv
```

Packages install to `/home/ec2-user/.local/lib/python3.9/site-packages`. Run `which uvicorn` after installing to confirm the path for the service file.

---

## Running

All three background tasks (cache refresh, data ingestion, capacity factor calculation) start automatically with the FastAPI server. One command runs everything:

```bash
uvicorn app:app --app-dir backend --reload   # --reload is for local dev only, omit on server
```

Wait a few seconds for the first data cycle, then open the dashboard:

```
http://localhost:8000
```

---

## Deploying to the Server

### 1. Clone the repo

SSH into the server and clone into the home directory:

```bash
cd /home/ec2-user
git clone https://github.com/NickOverstreet/Renewable-Energy-Dashboard
```

### 2. Copy `config.py` to the server

`config.py` is gitignored and must be transferred manually. From your local machine:

```bash
scp -i dashboard.pem backend/config.py ec2-user@<server-ip>:/home/ec2-user/Renewable-Energy-Dashboard/backend/config.py
```

### 3. Install dependencies on the server

```bash
pip3 install fastapi uvicorn pymysql python-dotenv
```

### 4. Pull updates (after code changes)

```bash
cd /home/ec2-user/Renewable-Energy-Dashboard
git pull
sudo systemctl restart dashboard
```

---

## Server Setup (systemd)

One service file runs the entire application. All three background tasks (cache refresh, data ingestion, capacity factors) start automatically inside the uvicorn process.

---

### 1. Create the service file

**`/etc/systemd/system/dashboard.service`**:

```ini
[Unit]
Description=Renewable Energy Dashboard
After=network.target

[Service]
User=ec2-user
WorkingDirectory=/home/ec2-user/Renewable-Energy-Dashboard
ExecStart=/home/ec2-user/.local/bin/uvicorn app:app --app-dir backend --host 0.0.0.0 --port 8000
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

> **Note:** Confirm the uvicorn path with `which uvicorn` after installing dependencies.

---

### 2. Enable and start the service

```bash
sudo systemctl daemon-reload
sudo systemctl enable dashboard
sudo systemctl start dashboard
```

---

### Useful commands

| Action | Command |
|---|---|
| Check status | `sudo systemctl status dashboard` |
| Restart | `sudo systemctl restart dashboard` |
| Stop | `sudo systemctl stop dashboard` |
| View live logs | `journalctl -u dashboard -f` |

---

### Notes

- `Restart=always` — the service restarts automatically on crash and starts on boot.
- `RestartSec=3` — adds a 3-second delay before restarting, preventing rapid restart loops on persistent errors.
- After editing the service file, always run `sudo systemctl daemon-reload` before restarting.
