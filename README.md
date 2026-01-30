# Renewable-Energy-Dashboard

Enhanced an existing renewable-generation dashboard for our CS Capstone Project.

## Configuration Setup (Required)

This repository does not commit files containing sensitive data (API tokens, database credentials).

1. Copy each `.example.php/py` config file and remove `.example` from the name.
2. Fill in the required values using credentials provided by the client.
3. Run the project normally.

## Run dashboard locally

### Live‑only mode (fastest)

This shows gauges and info boxes with live data, but the time‑series chart will not work as intended.

### Prereqs

- PHP 8+ with curl enabled

## Steps

1. **Create API config**  
   Copy example config files and add your DB credentials or API URL + token:
   - From `dashboard-scripts/config/API/ConfigAPIExample.php`
   - Create `dashboard-scripts/config/API/ConfigAPI.php`

2. **Start the PHP server**  
   From the repo root:

   ```bash
   php -S localhost:8000 -t dashboard-scripts

   ```

3. **Open the dashboard**
   ```bash
   http://localhost:8000/index.php
   ```
