<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

$config = require __DIR__ . '/config/DB/dbConfig.php';

// Database connection details
$servername = $config['servername'];
$username = $config['username'];
$password = $config['password'];
$dbname = $config['dbname'];

// Set the default timezone to your local timezone
date_default_timezone_set('America/New_York');

try {
    // Create a new PDO instance with persistent connection
    // Set the PDO error mode to exception
    $pdo = new PDO("mysql:host=$servername;dbname=$dbname;charset=utf8mb4", $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_PERSISTENT => true
    ]);

    // Get the start and end dates from query parameters
    /*$startTime = '00:00:00';*/
    $startDate = $_GET['startDate'] . ' ' . $_GET['startTime']; // Append time to start date
    $endDate = $_GET['endDate'] . ' 23:59:59'; // Append time to end date
    // Convert the local times to UTC (assuming input is in 'America/New_York')
    $startDateTime = new DateTime($startDate, new DateTimeZone('America/New_York'));
    $endDateTime = new DateTime($endDate, new DateTimeZone('America/New_York'));

    // Convert to UTC
    $startDateTime->setTimezone(new DateTimeZone('UTC'));
    $endDateTime->setTimezone(new DateTimeZone('UTC'));

    // Format the dates for the SQL query
    $startDateUTC = $startDateTime->format('Y-m-d H:i:s');
    $endDateUTC = $endDateTime->format('Y-m-d H:i:s');

    // Calculate the interval based on the date range
    $startDateTime = new DateTime($startDate);
    $endDateTime = new DateTime($endDate);
    $interval = $startDateTime->diff($endDateTime);
    $groupInterval = 60;  //Data shown for all 60 sec of a minute
    /*// Check if the interval is exactly one day
    if ($interval->days >= 0 && $interval->days < 3) {
    // Use 1-minute intervals for a single day
    $groupInterval = '1 MINUTE';
    }elseif ($interval->days <= 7) {
        // Use 5-minute intervals for a week range
        $groupInterval = '1 MINUTE';
    } elseif ($interval->days <= 30) {
        // Use 10-minute intervals for a month range
        $groupInterval = '1 MINUTE';
        $groupInterval = '10 MINUTE';
    }*/

    //Change table name "renewable_data" after 'FROM' based on your table name
    $stmt = $pdo->prepare("
        SELECT
            DATE_FORMAT(DATE_SUB(date_time, INTERVAL FLOOR(SECOND(date_time) / :interval) * :interval SECOND), '%Y-%m-%d %H:%i:%s') AS interval_time,
            solar_percentage,
            wind_percentage,
            hydro_percentage,
            battery_percentage
        FROM historical_data
        WHERE date_time BETWEEN :startDate AND :endDate
        GROUP BY interval_time
        ORDER BY interval_time ASC
    ");

    $stmt->bindValue(':interval', $groupInterval, PDO::PARAM_INT);
    $stmt->bindParam(':startDate', $startDateUTC);
    $stmt->bindParam(':endDate', $endDateUTC);
    $stmt->execute();

    // Fetch results
    $data = [
        'solar' => [],
        'wind' => [],
        'hydro' => [],
        'battery' => [],
        'interval_times' => []
    ];

    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($results)) {
        echo json_encode(['error' => 'No data found for the given date range']);
        exit;
    }

    foreach ($results as $row) {
      // Adjust the datetime to the local time zone
        $dateTime = new DateTime($row['interval_time'], new DateTimeZone('UTC')); // Assuming the data is stored in UTC
        $dateTime->setTimezone(new DateTimeZone('America/New_York')); // Convert to local timezone
        $localDateTime = $dateTime->format('Y-m-d H:i:s'); // Format as needed

        $data['interval_times'][] = $localDateTime;
        $data['solar'][] = (float)$row['solar_percentage'];
        $data['wind'][] = (float)$row['wind_percentage'];
        $data['hydro'][] = (float)$row['hydro_percentage'];
        $data['battery'][] = (float)$row['battery_percentage'];
    }

    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
} catch (PDOException $e) {
    echo json_encode(['error' => "Connection failed: " . $e->getMessage()]);
}
?>