// Global variable to store fetched data
let fetchedData = null;
let startDate = null;
let endDate = null;
let endDateChecker = null;
let startTime = null;
let gaugesInitialized = false;
console.log(endDate);
console.log(endDateChecker);

// Global variable to store the latest real-time data fetched
let latestRealTimeData = {
  solar: null,
  wind: null,
  hydro: null,
  battery: null,
  solarFixed: null, // Added Solar Fixed latest real-time
  solar360: null, // Added Solar Tracking latest real-time
  timestamp: null,
};

// Request the data from the server through API
async function fetchData(startDate, endDate, startTime) {
  try {
    const response = await fetch(
      `fetchData.php?startDate=${startDate}&endDate=${endDate}&startTime=${startTime}`,
    );
    const data = await response.text();
    const fetchedData = JSON.parse(data);

    if (fetchedData.error) {
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
  }
}
function updateTimeSeriesChart(fetchedData) {
  if (!fetchedData) return;

  const chart = Highcharts.charts.find(
    (c) => c.renderTo.id === "timeSeriesContainer",
  );
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
    const solarFixedData = fetchedData.solarFixed.map((val, i) => [
      timestamps[i],
      val,
    ]);
    const solar360Data = fetchedData.solar360.map((val, i) => [
      timestamps[i],
      val,
    ]);

    chart.series[0].setData(solarData, false);
    chart.series[1].setData(windData, false);
    chart.series[2].setData(hydroData, false);
    chart.series[3].setData(batteryData, false);
    chart.series[4].setData(solarFixedData, false);
    chart.series[5].setData(solar360Data, false);

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

      gaugesInitialized = true; // Mark gauges as initialized
    }
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
  createTimeSeriesChart();

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
  fetchData(startDate, endDate, startTime);
  updateGauges(checkIfTodaySelected(endDate));
});

function createTimeSeriesChart() {
  return Highcharts.chart("timeSeriesContainer", {
    chart: {
      type: "line",
      zoomType: "x",
      height: 700,
      marginTop: 100,
      marginLeft: 55,

      resetZoomButton: {
        position: {
          align: "left",
          verticalAlign: "top",
          x: 20,
          y: 10,
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
          font: "Times New Roman",
          fontWeight: "bold",
        },
      },

      labels: {
        format: "{value:%e %b<br>%k:%M}", // Adjust the label format as needed
        rotation: -45,
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
        x: -28,
        style: {
          color: "#298fc2",
          font: "Times New Roman",
          fontWeight: "bold",
        },
      },
      labels: {
        align: "left",
        x: -25,
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
        shadow: false,
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
        name: "Solar Fixed",
        data: [],
        color: "#17ada1",
      },
      {
        name: "Solar Tracking",
        data: [],
        color: "#d11717",
      },
    ],
  });
}
