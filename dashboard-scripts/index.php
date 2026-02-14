<!DOCTYPE html>
<html lang="en">

<!--define other scripts and links that will be used in the dashboard page-->
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes">
    <title>Renewable Integration Research Facility</title>
    <link rel="stylesheet" href="style.css">
    <link rel="icon" type="image/svg+xml" href="/assets/images/faviconv2.svg">
    <link rel="shortcut icon" href="/assets/images/faviconv2.svg">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css">
    <script src="https://cdn.jsdelivr.net/npm/flatpickr"></script>
    <script src="gauge.js" defer></script> <!-- defer to load by the order as appears-->
    <script src="updateGauges.js" defer></script>
    <script src="timeSeries.js" defer ></script>
    <script src="wind_API.php" defer ></script>
    <script src="Wind_API.js" defer ></script>
    <script src="rollingCapacityFactors.js" defer ></script>
    <script src="https://code.highcharts.com/stock/highstock.js"></script>
    <script src="https://code.highcharts.com/stock/modules/exporting.js"></script>
    <script src="https://code.highcharts.com/stock/modules/export-data.js"></script>
    <script src="https://code.highcharts.com/modules/boost.js"></script>

</head>


<body style="background-color: #FFFFFF">

        <!-- Page header -->
        <div class="header">
            <!-- Container to showcase last time the date was updated for JSON data -->
            <h1>Renewable Integration Research Facility<br />
            <!--<span style="font-size: 50px">PPL R&D</span>-->
            </h1>
            <div class="lastUpdatedContainer">
                <span class="lastUpdatedLabel" id="lastUpdatedLabel">Last updated (EST): </span>
                <span id="jsonLastUpdatedValue"><?php echo htmlspecialchars($jsonLastUpdatedDate ?? ''); ?></span>
            </div>
        </div>

   <!-- Time Series Plot AND Build Gauges Boxes container -->
        <div class="container">
            <div class="box">
                <svg id="solarGauge" width="200" height="200"></svg>
                <h2 >Solar</h2>
            </div>
            <div class="box">
                <svg id="windGauge" width="200" height="200"></svg>
                <h2>Wind</h2>
            </div>
            <div class="box">
                <svg id="hydroGauge" width="200" height="200"></svg>
                <h2>Hydro</h2>
            </div>
            <div class="box">
                <svg id="batteryGauge" width="200" height="200"></svg>
                <h2>Battery</h2>
            </div>
            <div id="chartContainer">
                <div class="dateRangeSelector">
                    <label for="datePicker" class="date-label">Select Date Range:</label>
                    <input type="text" id="datePicker" placeholder="Select date range" readonly>
                    <button id="updateChart">Update Chart</button>
                </div>
            </div>
        <div id="timeSeriesContainer"> </div>
        </div>

<!-- initial fetching !-->
<?php
    $config = require __DIR__ . '/config/API/ConfigAPI.php';

    // Fetch the JSON data from the external URL
    $jsonUrl = 'https://m.lkeportal.com/publicsolarbatch/ESS.json';
    $jsonData = file_get_contents($jsonUrl);

    // Decode the JSON data
    $decodedData = json_decode($jsonData, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        //die("Error: Failed to Decode JSON...");
    }

   //Fetch wind data from API
    $url = $config['url'];
    $token = $config['token'];

    // Initialize a cURL session
    $ch = curl_init($url);

    // Set cURL options
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "Authorization: $token"
    ]);

    // Execute the request
    $response = curl_exec($ch);

    // Check for errors
    if ($response === false) {
        echo 'Curl error: ' . curl_error($ch);
        exit;
    }

    // Decode the JSON response and get the needed data to use it later
    $data = json_decode($response, true);
    $jsonLastUpdatedDate = isset($decodedData[0]['Time']) ? $decodedData[0]['Time'] : '';
    $SOH = isset($decodedData[0]['Battery State of Health (SOH %)']) ? $decodedData[0]['Battery State of Health (SOH %)'] : 'N/A';
    $batterVolt = isset($decodedData[0]['Battery DC Voltage']) ? $decodedData[0]['Battery DC Voltage'] : 'N/A';
    $batteryCurr = isset($decodedData[0]['Battery DC Current']) ? $decodedData[0]['Battery DC Current'] : 'N/A';
    $aveCellVolt = isset($decodedData[0]['Battery Average Cell Voltage']) ? $decodedData[0]['Battery Average Cell Voltage'] : 'N/A';
    $ambTemp = isset($decodedData[0]['Exterior Temperature (C)']) ? $decodedData[0]['Exterior Temperature (C)'] : 'N/A';
    $batteryPowAva = isset($decodedData[0]['Battery Power Available (kW)']) ? $decodedData[0]['Battery Power Available (kW)'] : 'N/A';
    $batteryPow = isset($decodedData[0]['Battery Power (kW)']) ? $decodedData[0]['Battery Power (kW)'] : 'N/A';
    $maxModuleTemp = isset($decodedData[0]['Battery Maximum Module Temp (C)']) ? $decodedData[0]['Battery Maximum Module Temp (C)'] : 'N/A';
    $minModuleTemp = isset($decodedData[0]['Battery Minimum Module Temp (C)']) ? $decodedData[0]['Battery Minimum Module Temp (C)'] : 'N/A';
    $maxCellVolt = isset($decodedData[0]['Battery Maximum Cell Voltage']) ? $decodedData[0]['Battery Maximum Cell Voltage'] : 'N/A';
    $minCellVolt = isset($decodedData[0]['Battery Minimum Cell Voltage']) ? $decodedData[0]['Battery Minimum Cell Voltage'] : 'N/A';
    $BatteryContainerTemp1 = isset($decodedData[0]['Battery Container 1 Temp (C)']) ? $decodedData[0]['Battery Container 1 Temp (C)'] : 'N/A';
    $BatteryContainerTemp2 = isset($decodedData[0]['Battery Container 2 Temp (C)']) ? $decodedData[0]['Battery Container 2 Temp (C)'] : 'N/A';
    $solarIrradiance = isset($decodedData[0]['Solar Irradiance (GHI WM2)']) ? $decodedData[0]['Solar Irradiance (GHI WM2)'] : 'N/A';
    $dix1 = isset($decodedData[0]['Dix 1 Hydro Generation (MW)']) ? $decodedData[0]['Dix 1 Hydro Generation (MW)'] : 'N/A';
    $dix2 = isset($decodedData[0]['Dix 2 Hydro Generation (MW)']) ? $decodedData[0]['Dix 2 Hydro Generation (MW)'] : 'N/A';
    $dix3 = isset($decodedData[0]['Dix 3 Hydro Generation (MW)']) ? $decodedData[0]['Dix 3 Hydro Generation (MW)'] : 'N/A';

    //Generation and battery powers
     $solarGen = max(isset($decodedData[0]['Solar Generation (kW)']) ? $decodedData[0]['Solar Generation (kW)'] : 'N/A',0);
     $solarGenNegative = isset($decodedData[0]['Solar Generation (kW)']) ? $decodedData[0]['Solar Generation (kW)'] : 'N/A';
     $hydroGen = max(isset($decodedData[0]['Hydro Generation (kW)']) ? $decodedData[0]['Hydro Generation (kW)'] : 'N/A',0);
     $windGen = max(isset($decodedData[0]['Wind Generation (kW)']) ? $decodedData[0]['Wind Generation (kW)'] : 'N/A',0);
     $batteryPower =isset($decodedData[0]['Battery Power (kW)']) ? $decodedData[0]['Battery Power (kW)'] : 'N/A';
     $multiAxisSolarGen = max(isset($decodedData[0]['Solar 360 Trackers (kW)']) ? $decodedData[0]['Solar 360 Trackers (kW)'] : 'N/A',0);
     $fixedSolarGen = max(isset($decodedData[0]['Solar Fixed (kW)']) ? $decodedData[0]['Solar Fixed (kW)'] : 'N/A',0);
     
    //CO2 Reduction Calc
    $batteryP = null;
    $totalPower = null;
    $COR = null;
    if ($batteryPower > 0){
        $batteryP = $batteryPower * 1.81; //81% efficiency when discharging
    } elseif ($batteryPow < 0){
        $batteryP = $batteryPower * 1.19; //19% losses when charging
    }
    $totalPower = $solarGenNegative + $windGen + $hydroGen + $batteryP;
    $COR = $totalPower * 1.738;


    // Access the required values from API
    $power = isset($data[0]['power']) ? $data[0]['power'] : 'N/A';
    $energy = isset($data[0]['energy']) ? $data[0]['energy'] : 'N/A';
    $wind = isset($data[0]['wind_speed']) ? $data[0]['wind_speed'] : 'N/A';
    /*$yaw_delta = isset($data[0]['yaw_delta']) ? $data[0]['yaw_delta'] : 'N/A';*/
    /*$yaw_position = isset($data[0]['yaw_position']) ? $data[0]['yaw_position'] : 'N/A';*/

    // Extracting date and time components
    $dateTimeString = $data[0]['timestamp'];
    $year = (int)substr($dateTimeString, 0, 4);
    $month = (int)substr($dateTimeString, 5, 2);
    $day = (int)substr($dateTimeString, 8, 2);
    $hour = (int)substr($dateTimeString, 11, 2);
    $minute = (int)substr($dateTimeString, 14, 2);

    // Create a DateTime object
    $time = new DateTime("{$year}-{$month}-{$day} {$hour}:{$minute}:00", new DateTimeZone("UTC"));
    $timeOnline = new DateTime("2024-02-14 13:01:00", new DateTimeZone("UTC"));

    // Calculate time since
    $timeSince = ($time->getTimestamp() - $timeOnline->getTimestamp()) / 3600; // Convert seconds to hours

    // Calculate lcf
    $lcf = $energy / ($timeSince * 90) * 100; //Life Time Capacity Factor

    // // Label to showcase last time the date was updated for JSON data
    // echo '<div class="lastUpdatedContainer">';
    // echo '<span class="lastUpdatedLabel" id="lastUpdatedLabel">Last updated (EST): </span>';
    // echo '<span id="jsonLastUpdatedValue">' . htmlspecialchars($jsonLastUpdatedDate ?? '-') . '</span>';
    // echo '</div>';

    // Informative boxes
    echo '<div class="container grid-auto">';
    // Output the NPS data
    echo '<div id="gridItem4" class="grid-item">Reduction in CO2: <br><span class="value">' . htmlspecialchars(round($COR,2)) . ' lbs/Hr</span></div>';

   // Output the JSON data
    echo '<div id="gridItem1" class="grid-item">Wind Turbine Power: <br><span class="value">' . htmlspecialchars(round($windGen,2)) . ' kW</span></div>';
    echo '<div id="gridItem19" class="grid-item">Total Solar Power: <br><span class="value">' . htmlspecialchars(round($solarGen,2)) . ' kW</span></div>';
    echo '<div id="gridItem24" class="grid-item">Fixed Solar Power: <br><span class="value">' . htmlspecialchars(round($fixedSolarGen,2)) . ' kW</span></div>';
    echo '<div id="gridItem25" class="grid-item">360&deg; Tracking Solar Power: <br><span class="value">' . htmlspecialchars(round($multiAxisSolarGen,2)) . ' kW</span></div>';
    echo '<div id="gridItem20" class="grid-item">Hydro Power: <br><span class="value">' . htmlspecialchars(round($hydroGen,2)) . ' kW</span></div>';
    echo '<div id="gridItem21" class="grid-item">Dix1 Power: <br><span class="value">' . htmlspecialchars(round($dix1,2)) . ' MW</span></div>';
    echo '<div id="gridItem22" class="grid-item">Dix2 Power: <br><span class="value">' . htmlspecialchars(round($dix2,2)) . ' MW</span></div>';
    echo '<div id="gridItem23" class="grid-item">Dix3 Power: <br><span class="value">' . htmlspecialchars(round($dix3,2)) . ' MW</span></div>';
    echo '<div id="gridItem15" class="grid-item">Battery Power: <br><span class= "value">' . htmlspecialchars($batteryPow) . ' KW</span></div>';
    echo '<div id="gridItem16" class="grid-item">Battery Power Available: <br><span class= "value">' . htmlspecialchars($batteryPowAva) . ' KW</span></div>';

    // Output the NPS data
    echo '<div id="gridItem2" class="grid-item">Wind Speed: <br><span class="value">' . htmlspecialchars(round($wind,2)) . ' m/s</span></div>';
    echo '<div id="gridItem3" class="grid-item">Wind Generated Energy: <br><span class="value">' . htmlspecialchars(round($energy/1000,2)) . ' MWh</span></div>';
    /*echo '<div id="gridItem4" class="grid-item">Yaw Error: <br><span class="value">' . htmlspecialchars(round($yaw_delta,2)) . ' °/s</span></div>';*/
    /*echo '<div id="gridItem5" class="grid-item">Yaw Position: <br><span class="value">' . htmlspecialchars($yaw_position) . ' °</span></div>';*/
    echo '<div id="gridItem5" class="grid-item">Wind Lifetime Capacity Factor: <br><span class="value">' . htmlspecialchars(round($lcf, 2)) . ' %</span></div>';
   // Table for additional information from JSON
    echo '<div id="gridItem6" class="grid-item">Battery Container 1 Temp: <br><span class="value">' . htmlspecialchars($BatteryContainerTemp1) . '°C</span></div>';
    echo '<div id="gridItem7" class="grid-item">Battery Container 2 Temp: <br><span class="value">' . htmlspecialchars($BatteryContainerTemp2) . '°C</span></div>';
    echo '<div id="gridItem8" class="grid-item">Solar Irradiance: <br><span class="value">' . htmlspecialchars(round($solarIrradiance,2)) . ' W/m²</span></div>';
    echo '<div id="gridItem9" class="grid-item">Battery State of Health: <br> <span class= "value">' . htmlspecialchars($SOH) . '%</span></div>';
    echo '<div id="gridItem10" class="grid-item">Battery DC Voltage: <br><span class= "value">' . htmlspecialchars($batterVolt) . ' V</span></div>';
    echo '<div id="gridItem11" class="grid-item">Battery DC Current: <br><span class= "value">' . htmlspecialchars($batteryCurr) . ' A</span></div>';
    echo '<div id="gridItem12" class="grid-item">Battery Average Cell Voltage: <br><span class= "value">' . htmlspecialchars($aveCellVolt) . ' V</span></div>';
    echo '<div id="gridItem13" class="grid-item">Battery Max, Min Cell Voltage: <br>Max: <span class= "value">'. htmlspecialchars($maxCellVolt) . ' V&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Min: '. htmlspecialchars($minCellVolt) . ' V</span></div>';
    echo '<div id="gridItem14" class="grid-item">Exterior Temperature: <br><span class= "value">' . htmlspecialchars($ambTemp) . '°C</span></div>';
    echo '<div id="gridItem17" class="grid-item">Maximum Module Temperature: <br><span class= "value">' . htmlspecialchars($maxModuleTemp) . '°C</span></div>';
    echo '<div id="gridItem18" class="grid-item">Minimum Module Temperature: <br><span class= "value">' . htmlspecialchars($minModuleTemp) . '°C</span></div>';
    
    // 7-Day Rolling Capacity Factors
    echo '<div id="gridItem26" class="grid-item">Solar 7-Day Capacity Factor: <br><span id="solarCF7d" class="value">--%</span></div>';
    echo '<div id="gridItem27" class="grid-item">Hydro 7-Day Capacity Factor: <br><span id="hydroCF7d" class="value">--%</span></div>';


     echo '</div>';
?>

<!--Add text below boxes -->
    <div class="boxT">
        <h3>
        PPL R&D's Renewable Integration Research Facility combines actual 30 megawatts hydroelectric, 10.2 megawatts of solar
        (fixed, multi-axis tracking, and single-axis tracking), lithium-ion batteries, and wind generation data to show how
        the complementarity of multiple types of renewable energy, including solar, wind, and hydro, can be combined with energy
        storage to provide 100% renewable, more-reliable, and cost-effective renewable electricity to customers.
        Data are not simulated. Raw data are being collected from sensors at the site and automatically live-streamed to the
        public every few seconds without review or modification.
        </h3>
    </div>

    <div class="boxT">
        <h3>
            &copy;<?php echo date('Y')?> PPL Corporation. All rights reserved.
            Data provided for informational purposes only and is subject to delay, suspension, update or change,
            without notice. Not for formal or operational use. PPL corporation, PPL R&D, or PPL subsidiaries,
            are not liable for any errors or delays in content or for any actions taken in reliance on any data.
        </h3>
    </div>
</body>
</html>