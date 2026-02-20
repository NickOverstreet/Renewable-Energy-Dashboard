/* global echarts */
// Global variable to store fetched data
let fetchedData = null;
let startDate = null;
let endDate = null;
let endDateChecker = null;
let startTime = null;
let gaugesInitialized = false;
// API_BASE_URL is defined in js/config.js (loaded before this script)
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

// ECharts instance and per-series data arrays (kept in sync for real-time appends)
let timeSeriesChart = null;
let chartData = {
  solar: [], wind: [], hydro: [], battery: [], solarFixed: [], solar360: [],
};

// Request the data from the server through API
async function fetchData(startDate, endDate, startTime) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/data?startDate=${startDate}&endDate=${endDate}&startTime=${startTime}`,
    );
    const data = await response.text();
    const parsedData = JSON.parse(data);

    if (parsedData.error) {
      console.error("Error from server:", parsedData.error);
      return;
    }
    // Convert times to milliseconds
    parsedData.interval_times = parsedData.interval_times.map((time) =>
      new Date(time).getTime(),
    );
    updateTimeSeriesChart(parsedData);
  } catch (error) {
    console.error("Error fetching data:", error);
  }
}

function updateTimeSeriesChart(data) {
  if (!data || !timeSeriesChart) return;

  const timestamps = data.interval_times;

  chartData.solar      = data.solar.map((val, i) => [timestamps[i], val]);
  chartData.wind       = data.wind.map((val, i) => [timestamps[i], val]);
  chartData.hydro      = data.hydro.map((val, i) => [timestamps[i], val]);
  chartData.battery    = data.battery.map((val, i) => [timestamps[i], val]);
  chartData.solarFixed = data.solarFixed.map((val, i) => [timestamps[i], val]);
  chartData.solar360   = data.solar360.map((val, i) => [timestamps[i], val]);

  timeSeriesChart.setOption({
    series: [
      { data: chartData.solar },
      { data: chartData.wind },
      { data: chartData.hydro },
      { data: chartData.battery },
      { data: chartData.solarFixed },
      { data: chartData.solar360 },
    ],
  });

  // Give gauges initial values
  if (!gaugesInitialized) {
    const lastIndex = data.solar.length - 1;
    createGaugeChart(data.solar[lastIndex], "solarGauge");
    createGaugeChart(data.wind[lastIndex], "windGauge");
    createGaugeChart(data.hydro[lastIndex], "hydroGauge");
    createGaugeChart(data.battery[lastIndex], "batteryGauge");
    gaugesInitialized = true;
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
  if (!timeSeriesChart) return;
  const { timestamp, solar, wind, hydro, battery, solarFixed, solar360 } =
    latestRealTimeData;

  chartData.solar.push([timestamp, solar]);
  chartData.wind.push([timestamp, wind]);
  chartData.hydro.push([timestamp, hydro]);
  chartData.battery.push([timestamp, battery]);
  chartData.solarFixed.push([timestamp, solarFixed]);
  chartData.solar360.push([timestamp, solar360]);

  timeSeriesChart.setOption({
    series: [
      { data: chartData.solar },
      { data: chartData.wind },
      { data: chartData.hydro },
      { data: chartData.battery },
      { data: chartData.solarFixed },
      { data: chartData.solar360 },
    ],
  });
}

document.addEventListener("DOMContentLoaded", () => {
  timeSeriesChart = createTimeSeriesChart();

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

  function resetToDefault() {
    const today = new Date();
    const todayFormatted = today.toISOString().split("T")[0];
    const oneDayNH = new Date();
    oneDayNH.setHours(oneDayNH.getHours() - 36);

    startDate = oneDayNH.toISOString().split("T")[0];
    startTime = oneDayNH.toISOString().split("T")[1].slice(0, 8);
    endDate = todayFormatted;

    datePicker.clear();
    datePicker.set("maxDate", "today");
    fetchData(startDate, endDate, startTime);
  }

  document.getElementById("resetChart").addEventListener("click", resetToDefault);

  // Get today's date
  const today = new Date();
  const todayFormatted = today.toISOString().split("T")[0];
  // Get 36hrs-Ago date
  const oneDayNH = new Date();
  oneDayNH.setHours(oneDayNH.getHours() - 36);

  // Set startDate&startTime to one and a half, endDate to the current day
  startDate = oneDayNH.toISOString().split("T")[0];
  startTime = oneDayNH.toISOString().split("T")[1].slice(0, 8);
  endDate = todayFormatted;

  // Initial data fetch for the current day
  fetchData(startDate, endDate, startTime);
  updateGauges(checkIfTodaySelected(endDate));

  // Auto-refresh chart aligned to 5-minute clock intervals (e.g. 11:20, 11:25, 11:30)
  function msUntilNextFiveMinutes() {
    const now = new Date();
    const ms = now.getMinutes() * 60 * 1000 + now.getSeconds() * 1000 + now.getMilliseconds();
    const interval = 5 * 60 * 1000;
    return interval - (ms % interval);
  }

  setTimeout(() => {
    fetchData(startDate, endDate, startTime);
    setInterval(() => {
      fetchData(startDate, endDate, startTime);
    }, 5 * 60 * 1000);
  }, msUntilNextFiveMinutes());
});

function createTimeSeriesChart() {
  const container = document.getElementById("timeSeriesContainer");
  container.style.height = "520px";

  const chart = echarts.init(container);

  chart.setOption({
    animation: false,
    grid: {
      left: 60,
      top: 55,
      right: 60,
      bottom: 110,
    },
    legend: {
      bottom: 8,
      data: ["Solar", "Wind", "Hydro", "Battery", "Fixed Solar", "Dual Axis Solar"],
    },
    xAxis: {
      type: "time",
      name: "Date and Time (EST)",
      nameLocation: "middle",
      nameGap: 50,
      nameTextStyle: {
        color: "#298fc2",
        fontFamily: "Times New Roman",
        fontWeight: "bold",
        fontSize: 14,
      },
      axisLabel: {
        formatter: function (value) {
          const d = new Date(value);
          const month = d.toLocaleString("en-US", { timeZone: "America/New_York", month: "short" });
          const day   = d.toLocaleString("en-US", { timeZone: "America/New_York", day: "numeric" });
          const time  = d.toLocaleString("en-US", { timeZone: "America/New_York", hour: "2-digit", minute: "2-digit", hour12: false });
          return `${month} ${day}\n${time}`;
        },
      },
    },
    yAxis: {
      type: "value",
      name: "Percentage (%)",
      nameLocation: "middle",
      nameGap: 40,
      nameTextStyle: {
        color: "#298fc2",
        fontFamily: "Times New Roman",
        fontWeight: "bold",
        fontSize: 14,
      },
      min: 0,
      max: 100,
      interval: 5,
    },
    tooltip: {
      trigger: "axis",
      formatter: function (params) {
        const time = new Date(params[0].value[0]).toLocaleString("en-US", {
          timeZone: "America/New_York",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        });
        let html = time + "<br>";
        params.forEach((p) => {
          html +=
            `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;` +
            `background:${p.color};margin-right:5px;"></span>` +
            `${p.seriesName}: <b>${p.value[1]}%</b><br>`;
        });
        return html;
      },
    },
    dataZoom: [
      { type: "inside", xAxisIndex: 0 }, // scroll wheel / pinch zoom
    ],
    toolbox: {
      right: 10,
      top: 5,
      feature: {
        saveAsImage: { title: "Download PNG" },
      },
    },
    series: [
      { name: "Solar",          type: "line", data: [], color: "#fe6a35", symbol: "circle", symbolSize: 4, lineStyle: { width: 2 } },
      { name: "Wind",           type: "line", data: [], color: "#2caffe", symbol: "circle", symbolSize: 4, lineStyle: { width: 2 } },
      { name: "Hydro",          type: "line", data: [], color: "navy",    symbol: "circle", symbolSize: 4, lineStyle: { width: 2 } },
      { name: "Battery",        type: "line", data: [], color: "#24d63b", symbol: "circle", symbolSize: 4, lineStyle: { width: 2 } },
      { name: "Fixed Solar",    type: "line", data: [], color: "#ffc247", symbol: "circle", symbolSize: 4, lineStyle: { width: 2 } },
      { name: "Dual Axis Solar",type: "line", data: [], color: "#d11717", symbol: "circle", symbolSize: 4, lineStyle: { width: 2 } },
    ],
  });

  window.addEventListener("resize", () => chart.resize());
  return chart;
}
