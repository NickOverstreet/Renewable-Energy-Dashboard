//Function to update gauges and timeseries plot when today is
function updateGauges(check) {
  //Get data from JSON
  fetch("proxy.php?url=https://m.lkeportal.com/publicsolarbatch/ESS.json", {
    mode: "no-cors",
    method: "POST",
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok " + response.statusText);
      }
      return response.json();
    })
    .then((data) => {
      const clamp = (v, min = 0, max = 100) =>
        Math.min(Math.max(Number(v) || 0, min), max); // Utility function to safely convert a value to a number and clamp it between a minimum and maximum range

      const SolarGen = Math.min(
        Math.max(data[0]["Solar Generation (%)"].toFixed(1), 0),
        100,
      );
      const WindGen = Math.max(data[0]["Wind Generation (%)"].toFixed(1), 0);
      const SOC = Math.max(
        data[0]["Battery State of Charge (SOC %)"].toFixed(1),
        0,
      );
      const HydroGen = Math.max(data[0]["Hydro Generation (%)"].toFixed(1), 0);
      const SolarFixedGen = Math.max(data[0]["Solar Fixed (%)"].toFixed(1), 0);

      // Safely read the "Solar 360 Tracking (%)" value from the API
      // Optional chaining (?.) prevents errors if the field is missing
      // If the value is undefined or invalid, it will default to 0
      const Solar360Gen = clamp(data[0]?.["Solar 360 Tracking (%)"]);

      const GenerationS = Math.max(data[0]["Solar Generation (kW)"], 0); //solar
      const GenerationSNegative = data[0]["Solar Generation (kW)"]; //solar
      const GenerationW = Math.max(data[0]["Wind Generation (kW)"], 0); //wind
      const GenerationH = Math.max(data[0]["Hydro Generation (kW)"], 0); //hydro
      const GenerationB = data[0]["Battery Power (kW)"]; //battery

      // CO2 Reduction Calc
      let batteryPower = null;
      let totalPower = null;
      let COR = null;
      if (GenerationB > 0) {
        batteryPower = GenerationB * 1.81;
      } else if (GenerationB < 0) {
        batteryPower = GenerationB * 1.19;
      }
      totalPower =
        batteryPower + GenerationSNegative + GenerationH + GenerationW;
      COR = 1.738 * totalPower;

      createGaugeChart(SolarGen, "solarGauge");
      createGaugeChart(WindGen, "windGauge");
      createGaugeChart(HydroGen, "hydroGauge");
      createGaugeChart(SOC, "batteryGauge");

      // Capture current UTC time in milliseconds
      const utcTimestamp = Date.now();

      // Convert UTC timestamp to EST, keeping millisecond precision
      const estDate = new Date(utcTimestamp).toLocaleString("en-US", {
        timeZone: "America/New_York",
        hour12: false,
      });

      // Parse the converted EST date string back into a timestamp
      const estTimestamp = new Date(estDate).getTime();

      // // keep track of when JSON data was last updated
      document.getElementById("jsonLastUpdatedValue").textContent =
        data[0]["Time"];

      // Update the 5x3 grid items with the JSON data
      document.getElementById("gridItem1").innerHTML =
        `Wind Turbine Power: <span class="value"><br>${data[0]["Wind Generation (kW)"].toFixed(2)} KW</span>`;
      document.getElementById("gridItem4").innerHTML =
        `Reduction in CO2: <span class="value"><br>${COR.toFixed(2)} lbs/Hr</span>`;
      document.getElementById("gridItem6").innerHTML =
        `Battery Container 1 Temp: <span class="value"><br>${data[0]["Battery Container 1 Temp (C)"]}°C</span>`;
      document.getElementById("gridItem7").innerHTML =
        `Battery Container 2 Temp: <span class="value"><br>${data[0]["Battery Container 2 Temp (C)"]}°C</span>`;
      document.getElementById("gridItem8").innerHTML =
        `Solar Irradiance: <span class="value"><br>${data[0]["Solar Irradiance (GHI WM2)"].toFixed(2)} W/m²</span>`;

      document.getElementById("gridItem9").innerHTML =
        `Battery State of Health: <span class="value"><br>${data[0]["Battery State of Health (SOH %)"]}%</span>`;
      document.getElementById("gridItem10").innerHTML =
        `Battery DC Voltage: <span class="value"><br>${data[0]["Battery DC Voltage"]} V</span>`;
      document.getElementById("gridItem11").innerHTML =
        `Battery DC Current: <span class="value"><br>${data[0]["Battery DC Current"]} A</span>`;
      document.getElementById("gridItem12").innerHTML =
        `Battery Average Cell Voltage: <span class="value"><br>${data[0]["Battery Average Cell Voltage"]} V</span>`;
      document.getElementById("gridItem13").innerHTML =
        `Battery Max, Min Cell Voltage: <span class="value"><br>Max: ${data[0]["Battery Maximum Cell Voltage"]} V&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 
                                                                                                                              Min: ${data[0]["Battery Minimum Cell Voltage"]} V</span>`;
      document.getElementById("gridItem14").innerHTML =
        `Exterior Temperature: <span class="value"><br>${data[0]["Exterior Temperature (C)"]}°C</span>`;
      document.getElementById("gridItem15").innerHTML =
        `Battery Power: <span class="value"><br>${data[0]["Battery Power (kW)"]} kW</span>`;
      document.getElementById("gridItem16").innerHTML =
        `Battery Power Available: <span class="value"><br>${data[0]["Battery Power Available (kW)"]} kW</span>`;
      document.getElementById("gridItem17").innerHTML =
        `Maximum Module Temperature: <span class="value"><br>${data[0]["Battery Maximum Module Temp (C)"]}°C</span>`;
      document.getElementById("gridItem18").innerHTML =
        `Minimum Module Temperature: <span class="value"><br>${data[0]["Battery Minimum Module Temp (C)"]}°C</span>`;

      document.getElementById("gridItem19").innerHTML =
        `Solar Power: <span class="value"><br>${data[0]["Solar Generation (kW)"].toFixed(2)} KW</span>`;
      document.getElementById("gridItem20").innerHTML =
        `Hydro Power: <span class="value"><br>${data[0]["Hydro Generation (kW)"].toFixed(2)} KW</span>`;
      document.getElementById("gridItem21").innerHTML =
        `Dix1 Power: <span class="value"><br>${data[0]["Dix 1 Hydro Generation (MW)"].toFixed(2)} MW</span>`;
      document.getElementById("gridItem22").innerHTML =
        `Dix2 Power: <span class="value"><br>${data[0]["Dix 2 Hydro Generation (MW)"].toFixed(2)} MW</span>`;
      document.getElementById("gridItem23").innerHTML =
        `Dix3 Power: <span class="value"><br>${data[0]["Dix 3 Hydro Generation (MW)"].toFixed(2)} MW</span>`;
      document.getElementById("gridItem24").innerHTML =
        `Fixed Solar Power: <span class="value"><br>${data[0]["Solar Fixed (kW)"].toFixed(2)} kW</span>`;
      document.getElementById("gridItem25").innerHTML =
        `360&deg; Tracking Solar Power: <span class="value"><br>${data[0]["Solar 360 Trackers (kW)"].toFixed(2)} kW</span>`;

      // Store the real-time data with the current timestamp
      latestRealTimeData = {
        solar: SolarGen,
        wind: WindGen,
        hydro: HydroGen,
        battery: SOC,
        solarFixed: SolarFixedGen,
        solar360: Solar360Gen,
        timestamp: estTimestamp,
      };
      // If today's date is selected, add the new data point to the chart
      if (check) {
        addRealTimeDataToChart();
      }
    })
    .catch((error) => console.error("Error fetching gauge data:", error));
}
// Set up interval to update gauges every 60 seconds
setInterval(() => updateGauges(checkIfTodaySelected(endDate)), 1000);
