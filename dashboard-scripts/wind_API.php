<?php

function fetchAPI()
{
//Fetch wind data from API
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
    if ($response === false) {
        return ['error' => curl_error($ch)];
    }
    
    // Decode the JSON response
    return json_decode($response, true);
}
$data = fetchAPI();
echo json_encode($data); // Output the data as JSON
?>