<?php
// Start output buffering
ob_start();
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

date_default_timezone_set('America/New_York');

// Get URL from the request
$url = $_GET['url'];

// Validate the URL
if (!filter_var($url, FILTER_VALIDATE_URL)) {
    echo json_encode(['error' => 'Invalid URL']);
    ob_end_flush();
    exit;
}

// Fetch the remote data with better error handling
$response = @file_get_contents($url);

// Check if the request failed
if ($response === FALSE) {
    echo json_encode(['error' => 'Failed to fetch data']);
    ob_end_flush();
    exit;
}

// Output the response
echo $response;

// Flush the output buffer
ob_flush();
flush();
ob_end_clean();
?>