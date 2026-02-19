<?php

$config = require("config/DB/dbConfig.php");

$dbh = new PDO(
    "mysql:host={$config['servername']};dbname={$config['dbname']}",
    $config["username"],
    $config["password"]
);

// Prepare a query to fetch the most recent rolling capacity factors
$statement = $dbh->prepare(
    "SELECT solar_total_capacity_factor_7d, 
                   solar_fixed_capacity_factor_7d, 
                   solar_dual_capacity_factor_7d, 
                   hydro_capacity_factor_7d, 
                   wind_capacity_factor_7d
     FROM capacity_factor_history
     ORDER BY date_time DESC
     LIMIT 1"
);

$statement->execute();
$data = $statement->fetch(PDO::FETCH_ASSOC);

// Return data as JSON for frontend
echo json_encode($data);