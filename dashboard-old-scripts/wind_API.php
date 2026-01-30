<?php

function fetchAPI()
{
    $config = require __DIR__ . '/config/API/ConfigAPI.php';
    
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
    if (curl_errno($ch)) {
        echo json_encode(['error' => curl_error($ch)]);
        curl_close($ch);
        exit;
    }

    // Close the cURL session
    curl_close($ch);

    // Decode the JSON response

    return json_decode($response, true);
}
header('Content-Type: application/json');
// $data = fetchAPI();
echo json_encode(fetchAPI()); // Output the data as JSON
