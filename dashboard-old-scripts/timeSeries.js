// Loading bar functions : Move Later
function showLoading() {
  document.getElementById("spinner").style.display = "block";
  document.getElementById("spinner_text").style.display = "block";
}

function hideLoading() {
  document.getElementById("spinner").style.display = "none";
  document.getElementById("spinner_text").style.display = "none";
}

// Global variable to store fetched data
let fetchedData = null;
let startDate = null;
let endDate = null;
let endDateChecker = null;
let startTime = null;
let gaugesInitialized = false;

// Global variable to store the latest real-time data fetched
let latestRealTimeData = {
  solar: null,
  wind: null,
  hydro: null,
  battery: null,
  solarFixed: null,
  solar360: null,
  timestamp: null,
};

// Request the data from the server through API
async function fetchData(startDate, endDate, startTime) {
  showLoading(); // Show loading circle
  console.log("Fetching Data...");
  try {
    const response = await fetch(
      `fetchData.php?startDate=${startDate}&endDate=${endDate}&startTime=${startTime}`,
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    fetchedData = await response.json();
    // const fetchedData = await response.json();
    if (fetchedData.error || !fetchedData) {
      console.error("Error from server:", fetchedData.error);
      return;
    }

    // Convert times to milliseconds if needed
    fetchedData.interval_times = fetchedData.interval_times.map((time) =>
      new Date(time).getTime(),
    );

    updateTimeSeriesChart(fetchedData);
  } catch (error) {
    console.error("Error fetching data:", error);
  } finally {
    hideLoading(); // Hide loading circle
    console.log("Data Fetch Complete");
  }
}

function updateTimeSeriesChart(fetchedData) {
  if (!fetchedData) {
    console.warn("Unable to fetch data!");
    return;
  }
  const chart = Highcharts.charts.find(
    (c) => c.renderTo.id === "timeSeriesContainer",
  );
  if (!chart) {
    console.warn("Chart is not yet initialized!");
    return;
  }
  if (chart) {
    // Convert interval_times to Unix timestamps in milliseconds
    const timestamps = fetchedData.interval_times.map((time) =>
      new Date(time).getTime(),
    );
    // Map data arrays to the format [timestamp, value]
    const solarData = fetchedData.solar.map((val, i) => [timestamps[i], val]);
    const windData = fetchedData.wind.map((val, i) => [timestamps[i], val]);
    const hydroData = fetchedData.hydro.map((val, i) => [timestamps[i], val]);
    const batteryData = fetchedData.battery.map((val, i) => [
      timestamps[i],
      val,
    ]);
    // NEW TIMESERIES CODE
    const solarFixedData = fetchedData.solarFixed.map((val, i) => [
      timestamps[i],
      val,
    ]);
    const solar360Data = fetchedData.solar360.map((val, i) => [
      timestamps[i],
      val,
    ]);
    // DEBUG:
    console.log(
      "interval sample:",
      fetchedData.interval_times
        .slice(0, 10)
        .map((t) => new Date(t).toISOString()),
    );
    console.log("solar sample:", fetchedData.solar.slice(0, 10));
    console.log(
      "interval delta (ms):",
      fetchedData.interval_times[1] - fetchedData.interval_times[0],
    );
    // DEBUG:

    chart.series[0].setData(solarData, false);
    chart.series[1].setData(windData, false);
    chart.series[2].setData(hydroData, false);
    chart.series[3].setData(batteryData, false);
    chart.series[4].setData(solarFixedData, false);
    chart.series[5].setData(solar360Data, false);

    if (chart.series.length < 6) {
      console.warn("Chart does not have all expected series");
    }

    /* chart.xAxis[0].setCategories(fetchedData.interval_times, false);*/
    chart.redraw();

    // Give gauges initial values
    if (!gaugesInitialized) {
      const lastIndex = fetchedData.solar.length - 1;
      const latestSolar = fetchedData.solar[lastIndex];
      const latestWind = fetchedData.wind[lastIndex];
      const latestHydro = fetchedData.hydro[lastIndex];
      const latestBattery = fetchedData.battery[lastIndex];

      createGaugeChart(latestSolar, "solarGauge");
      createGaugeChart(latestWind, "windGauge");
      createGaugeChart(latestHydro, "hydroGauge");
      createGaugeChart(latestBattery, "batteryGauge");

      // Wait for DOM to load before creating Dial Names
      document.addEventListener("DOMContentLoaded", () => {
        console.log("Loading Gauge Names");
        setGaugeLabel("solarGauge", "Solar");
        setGaugeLabel("windGauge", "Wind");
        setGaugeLabel("hydroGauge", "Hydro");
        setGaugeLabel("batteryGauge", "Battery");
      });

      gaugesInitialized = true; // Mark gauges as initialized
    }
  } else {
    console.warn("Issues Updating TimeSeries:");
  }
}

function checkIfTodaySelected(endDate) {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0]; // YYYY-MM-DD format
  console.log(todayStr);
  console.log(endDate === todayStr);
  return endDate === todayStr;
}

function addRealTimeDataToChart() {
  const chart = Highcharts.charts.find(
    (c) => c.renderTo.id === "timeSeriesContainer",
  );
  if (chart) {
    const { timestamp, solar, wind, hydro, battery, solarFixed, solar360 } =
      latestRealTimeData;
    chart.series[0].addPoint([timestamp, solar], true, false);
    chart.series[1].addPoint([timestamp, wind], true, false);
    chart.series[2].addPoint([timestamp, hydro], true, false);
    chart.series[3].addPoint([timestamp, battery], true, false);
    chart.series[4].addPoint([timestamp, solarFixed], true, false);
    chart.series[5].addPoint([timestamp, solar360], true, false);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // Create Chart
  createTimeSeriesChart();
  initializeDatePicker();

  document.getElementById("updateChart").addEventListener("click", async () => {
    const updateChartButton = document.getElementById("updateChart");

    // Disable the button to prevent multiple clicks
    updateChartButton.disabled = true;

    try {
      if (startDate && endDate) {
        await fetchData(startDate, endDate, "00:00:00"); // Fetch and update chart with the selected date range
        // updateGauges(checkIfTodaySelected(endDate));
      } else {
        alert("Please select a valid date range.");
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      // Re-enable the button after the fetch and update are complete
      updateChartButton.disabled = false;
    }
  });

  // Get today's date
  const today = new Date();
  const todayFormatted = today.toISOString().split("T")[0];
  // Get 36hrs-Ago date
  const oneDayNH = new Date();
  oneDayNH.setHours(oneDayNH.getHours() - 36);

  // Set startDate&startTime to one and a half, endDate to the current day
  startDate = oneDayNH.toISOString().split("T")[0];
  startTime = oneDayNH.toISOString().split("T")[1];
  endDate = todayFormatted;

  // Initial data fetch for the current day
  setTimeout(() => {
    fetchData(startDate, endDate, startTime);
    updateGauges(checkIfTodaySelected(endDate));
  }, 100);
});

function createTimeSeriesChart() {
  //scaleFactor = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
  scaleFactor = 0;
  switch (true) {
    case window.innerWidth >= 3810:
      scaleFactor = 2.5;
      break;
    case window.innerWidth >= 2560:
      scaleFactor = 1.0;
      break;
    case window.innerWidth >= 1920:
      scaleFactor = 1.2;
      break;
    case window.innerWidth >= 768:
      scaleFactor = 1.0;
      break;
    default:
      scaleFactor = 1.0;
      break;
  }
  console.log(scaleFactor);
  return Highcharts.chart("timeSeriesContainer", {
    chart: {
      type: "line",
      zoomType: "x",
      height: 825 * scaleFactor,
      marginTop: 100 * scaleFactor,
      // marginLeft: 55,

      resetZoomButton: {
        position: {
          align: "left",
          verticalAlign: "top",
          x: 20 * scaleFactor,
          y: 10 * scaleFactor,
        },
        relativeTo: "chart",
      },
      zooming: {
        mouseWheel: false,
      },
    },
    credits: {
      enabled: false,
    },
    title: {
      text: null,
      style: {
        color: "#298fc2",
      },
    },
    xAxis: {
      type: "datetime",
      title: {
        text: "Date and Time (EST)",
        align: "middle",
        style: {
          color: "#298fc2",
          fontFamily: "Roboto",
          fontSize: `${24 * scaleFactor}px`,
          fontWeight: "bold",
        },
      },
      minTickInterval: 1000, // at least 1 second
      labels: {
        format: "{value:%e %b<br>%k:%M}", // Adjust the label format as needed
        rotation: -45,
        align: "right",
        style: {
          fontFamily: "Roboto",
          fontSize: `${14 * scaleFactor}px`,
          fontWeight: "bold",
        },
        /*  step: 1,*/
      },
    },
    time: {
      // Timezone matches EST time
      timezone: "America/New_York", // Automatically adjusts for EST/EDT
      useUTC: false, // Ensure times aren't handled in UTC and converted to EST/EDT for display
    },
    yAxis: {
      min: 0,
      max: 100,
      tickInterval: 5,
      title: {
        text: "Percentage (%)",
        align: "middle",
        x: -15,
        style: {
          color: "#298fc2",
          fontFamily: "Roboto",
          fontWeight: "bold",
          fontSize: `${16 * scaleFactor}px`,
        },
        margin: 20,
      },
      labels: {
        align: "left",
        x: -25,
        style: {
          fontFamily: "Roboto",
          fontSize: `${16 * scaleFactor}px`,
        },
      },
    },
    tooltip: {
      shared: true,
      xDateFormat: "%Y-%m-%d %H:%M:%S",
    },
    plotOptions: {
      series: {
        animation: false,
        enableMouseTracking: true,
        connectNulls: true,
        shadow: false,
        turboThreshold: 1000000,
      },
    },
    exporting: {
      buttons: {
        contextButton: {
          menuItems: [
            "viewFullscreen",
            "printChart",
            "separator",
            "downloadCSV",
            "downloadXLS",
            "separator",
            "downloadPNG",
            "downloadJPEG",
            "downloadPDF",
            "downloadSVG",
          ],
        },
      },
    },
    series: [
      {
        name: "Solar",
        data: [],
        color: "#fe6a35",
      },
      {
        name: "Wind",
        data: [],
        color: "#2caffe",
      },
      {
        name: "Hydro",
        data: [],
        color: "navy",
      },
      {
        name: "Battery",
        data: [],
        color: "#24d63b",
      },
      {
        // New series
        name: "Solar Fixed",
        data: [],
        color: "#ffbd31",
        visible: false,
      },
      {
        name: "Solar 360 Degree",
        data: [],
        color: "red",
        visible: false,
      },
    ],
  });
}

function initializeDatePicker() {
  // Initialize flatpickr with range mode for date selection
  const datePicker = flatpickr("#datePicker", {
    mode: "range",
    dateFormat: "Y-m-d",
    maxDate: "today", // Set initial max date to today
    onChange: (selectedDates) => {
      if (selectedDates.length === 1) {
        startDate = selectedDates[0];

        // Calculate the maximum end date (one month after the start date)
        const maxEndDate = new Date(startDate);
        maxEndDate.setMonth(maxEndDate.getMonth() + 1);

        // Ensure the maximum end date does not exceed today's date
        if (maxEndDate > new Date()) {
          maxEndDate.setTime(new Date().getTime()); // Set to today's date
        }

        // Set the maxDate dynamically
        datePicker.set("maxDate", maxEndDate);
      } else if (selectedDates.length === 2) {
        endDate = selectedDates[1].toISOString().split("T")[0];
        startDate = selectedDates[0].toISOString().split("T")[0];
      }
    },
    onOpen: () => {
      // Reset the maxDate to today whenever the date picker opens
      datePicker.set("maxDate", "today");
    },
    onClose: (selectedDates) => {
      if (selectedDates.length === 2) {
        // Validate that the selected range does not exceed one month
        const start = new Date(selectedDates[0]);
        const end = new Date(selectedDates[1]);
        const oneMonthLater = new Date(start);
        oneMonthLater.setMonth(start.getMonth() + 1);

        if (end > oneMonthLater) {
          alert("The selected range cannot exceed one month.");
          // Optionally clear the selected dates or reset the picker
          datePicker.clear();
        }
      } else if (selectedDates.length !== 2) {
        alert("Please select a complete date range.");
      }
    },
  });
  return datePicker;
}
