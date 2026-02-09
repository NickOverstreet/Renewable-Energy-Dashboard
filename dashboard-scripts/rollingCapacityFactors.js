function updateRollingCapacityFactors() {
    // Make an HTTP request to get_rolling_capacity_factors.php
    fetch("get_rolling_capacity_factors.php") 
        // Read the response body and parse it as JSON
        .then(res => res.json())
        // Use the parsed JSON data
        .then(data => {
            if (data.solar_capacity_factor_7d !== null) {
                document.getElementById('solarCF7d').textContent =
                    data.solar_capacity_factor_7d.toFixed(2) + '%';
            }
            if (data.hydro_capacity_factor_7d !== null) {
                document.getElementById('hydroCF7d').textContent =
                    data.hydro_capacity_factor_7d.toFixed(2) + '%';
            }
        })
        .catch(err => console.error('CF fetch error:', err));
}
updateRollingCapacityFactors();
// Run every 5 minutes
setInterval(updateRollingCapacityFactors, 300000);