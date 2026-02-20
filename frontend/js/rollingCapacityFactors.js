function updateRollingCapacityFactors() {
    // Make an HTTP request to get_rolling_capacity_factors.php
    fetch(`${API_BASE_URL}/capacity-factors`)
        // Read the response body and parse it as JSON
        .then(res => res.json())
        // Use the parsed JSON data
        .then(data => {
            if (data.solar_total_capacity_factor_7d !== null) {
                document.getElementById('solartotalCF7d').textContent =
                    data.solar_total_capacity_factor_7d.toFixed(2) + '%';
            }
            if (data.solar_fixed_capacity_factor_7d !== null) {
                document.getElementById('solarfixedCF7d').textContent =
                    data.solar_fixed_capacity_factor_7d.toFixed(2) + '%';
            }
            if (data.solar_dual_capacity_factor_7d !== null) {
                document.getElementById('solardualCF7d').textContent =
                    data.solar_dual_capacity_factor_7d.toFixed(2) + '%';
            }
            if (data.hydro_capacity_factor_7d !== null) {
                document.getElementById('hydroCF7d').textContent =
                    data.hydro_capacity_factor_7d.toFixed(2) + '%';
            }
            if (data.wind_capacity_factor_7d !== null) {
                document.getElementById('windCF7d').textContent =
                    data.wind_capacity_factor_7d.toFixed(2) + '%';
            }
        })
        .catch(err => console.error('CF fetch error:', err));
}
updateRollingCapacityFactors();
// Run every 5 minutes
setInterval(updateRollingCapacityFactors, 300000);