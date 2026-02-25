function updateGauges(check) {
  Promise.all([
    fetch(`${API_BASE_URL}/live/facility`).then(r => { if (!r.ok) throw new Error(r.statusText); return r.json(); }),
    fetch(`${API_BASE_URL}/live/wind`).then(r => { if (!r.ok) throw new Error(r.statusText); return r.json(); }),
  ])
    .then(([facilityData, windData]) => {
      const f = facilityData.facility[0];
      const w = windData.wind[0];

      const clamp = (v, min = 0, max = 100) =>
        Math.min(Math.max(Number(v) || 0, min), max);

      const SolarGen     = clamp(f["Solar Generation (%)"].toFixed(1));
      const WindGen      = clamp(f["Wind Generation (%)"].toFixed(1));
      const SOC          = clamp(f["Battery State of Charge (SOC %)"].toFixed(1));
      const HydroGen     = clamp(f["Hydro Generation (%)"].toFixed(1));
      const SolarFixedGen = clamp(f["Solar Fixed (%)"].toFixed(1));
      const Solar360Gen  = clamp(f?.["Solar 360 Tracker (%)"]);

      const GenerationSNegative = f["Solar Generation (kW)"];
      const GenerationW = Math.max(f["Wind Generation (kW)"], 0);
      const GenerationH = Math.max(f["Hydro Generation (kW)"], 0);
      const GenerationB = f["Battery Power (kW)"];

      // CO2 Reduction Calc
      let batteryPower = null;
      if (GenerationB > 0) {
        batteryPower = GenerationB * 1.81;
      } else if (GenerationB < 0) {
        batteryPower = GenerationB * 1.19;
      }
      const totalPower = batteryPower + GenerationSNegative + GenerationH + GenerationW;
      const COR = 1.738 * totalPower;

      createGaugeChart(SolarGen, "solarGauge");
      createGaugeChart(WindGen, "windGauge");
      createGaugeChart(HydroGen, "hydroGauge");
      createGaugeChart(SOC, "batteryGauge");

      // Timestamp
      const estTimestamp = new Date(
        new Date().toLocaleString("en-US", { timeZone: "America/New_York", hour12: false })
      ).getTime();

      document.getElementById("jsonLastUpdatedValue").textContent = f["Time"];

      // Facility grid items
      document.getElementById("gridItem1").innerHTML =
        `Wind Turbine Power: <span class="value"><br>${f["Wind Generation (kW)"].toFixed(2)} KW</span>`;
      document.getElementById("gridItem4").innerHTML =
        `Reduction in CO2: <span class="value"><br>${COR.toFixed(2)} lbs/Hr</span>`;
      document.getElementById("gridItem6").innerHTML =
        `Battery Container 1 Temp: <span class="value"><br>${f["Battery Container 1 Temp (C)"]}°C</span>`;
      document.getElementById("gridItem7").innerHTML =
        `Battery Container 2 Temp: <span class="value"><br>${f["Battery Container 2 Temp (C)"]}°C</span>`;
      document.getElementById("gridItem8").innerHTML =
        `Solar Irradiance: <span class="value"><br>${f["Solar Irradiance (GHI WM2)"].toFixed(2)} W/m²</span>`;
      document.getElementById("gridItem9").innerHTML =
        `Battery State of Health: <span class="value"><br>${f["Battery State of Health (SOH %)"]}%</span>`;
      document.getElementById("gridItem10").innerHTML =
        `Battery DC Voltage: <span class="value"><br>${f["Battery DC Voltage"]} V</span>`;
      document.getElementById("gridItem11").innerHTML =
        `Battery DC Current: <span class="value"><br>${f["Battery DC Current"]} A</span>`;
      document.getElementById("gridItem12").innerHTML =
        `Battery Average Cell Voltage: <span class="value"><br>${f["Battery Average Cell Voltage"]} V</span>`;
      document.getElementById("gridItem13").innerHTML =
        `Battery Max, Min Cell Voltage: <span class="value"><br>Max: ${f["Battery Maximum Cell Voltage"]} V&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                                                                                                                              Min: ${f["Battery Minimum Cell Voltage"]} V</span>`;
      document.getElementById("gridItem14").innerHTML =
        `Exterior Temperature: <span class="value"><br>${f["Exterior Temperature (C)"]}°C</span>`;
      document.getElementById("gridItem15").innerHTML =
        `Battery Power: <span class="value"><br>${f["Battery Power (kW)"]} kW</span>`;
      document.getElementById("gridItem16").innerHTML =
        `Battery Power Available: <span class="value"><br>${f["Battery Power Available (kW)"]} kW</span>`;
      document.getElementById("gridItem17").innerHTML =
        `Maximum Module Temperature: <span class="value"><br>${f["Battery Maximum Module Temp (C)"]}°C</span>`;
      document.getElementById("gridItem18").innerHTML =
        `Minimum Module Temperature: <span class="value"><br>${f["Battery Minimum Module Temp (C)"]}°C</span>`;
      document.getElementById("gridItem19").innerHTML =
        `Solar Power: <span class="value"><br>${f["Solar Generation (kW)"].toFixed(2)} KW</span>`;
      document.getElementById("gridItem20").innerHTML =
        `Hydro Power: <span class="value"><br>${f["Hydro Generation (kW)"].toFixed(2)} KW</span>`;
      document.getElementById("gridItem21").innerHTML =
        `Dix1 Power: <span class="value"><br>${f["Dix 1 Hydro Generation (MW)"].toFixed(2)} MW</span>`;
      document.getElementById("gridItem22").innerHTML =
        `Dix2 Power: <span class="value"><br>${f["Dix 2 Hydro Generation (MW)"].toFixed(2)} MW</span>`;
      document.getElementById("gridItem23").innerHTML =
        `Dix3 Power: <span class="value"><br>${f["Dix 3 Hydro Generation (MW)"].toFixed(2)} MW</span>`;
      document.getElementById("gridItem24").innerHTML =
        `Fixed Solar Power: <span class="value"><br>${f["Solar Fixed (kW)"].toFixed(2)} kW</span>`;
      document.getElementById("gridItem25").innerHTML =
        `360&deg; Tracking Solar Power: <span class="value"><br>${f["Solar 360 Trackers (kW)"].toFixed(2)} kW</span>`;

      // Wind turbine grid items
      const timeOnline = new Date(Date.UTC(2024, 1, 14, 13, 1, 0));
      const timeSince = (new Date(w["timestamp"]) - timeOnline) / 1000 / 3600;
      const lcf = (w["energy"] / (timeSince * 90)) * 100;

      document.getElementById("gridItem2").innerHTML =
        `Wind Speed: <span class="value"><br>${w["wind_speed"].toFixed(2)} m/s</span>`;
      document.getElementById("gridItem3").innerHTML =
        `Wind Generated Energy: <span class="value"><br>${(w["energy"] / 1000).toFixed(2)} MWh</span>`;
      document.getElementById("gridItem5").innerHTML =
        `Wind Lifetime Capacity Factor: <span class="value"><br>${lcf.toFixed(2)}%</span>`;

      // Store latest real-time data for chart
      latestRealTimeData = {
        solar: SolarGen,
        wind: WindGen,
        hydro: HydroGen,
        battery: SOC,
        solarFixed: SolarFixedGen,
        solar360: Solar360Gen,
        timestamp: estTimestamp,
      };

      if (check) {
        addRealTimeDataToChart();
      }
    })
    .catch((error) => console.error("Error fetching live data:", error));
}


// Update gauges every 5 seconds
setInterval(() => updateGauges(checkIfTodaySelected(endDate)), 5000);
