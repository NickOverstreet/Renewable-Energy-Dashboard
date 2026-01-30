/*This script to fetch wind data from API, process the data, and add it to the informative boxes*/
function callPhpScript() {
    fetch('wind_API.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' // Set the content type to JSON
        }
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
              return response.json(); // Parse JSON
        })
        .then(windata => {
            const Energy = windata[0]['energy'];
            const dateTimeString = windata[0]['timestamp'];
            // Parse date and time from timestamp
            const time = new Date(dateTimeString);
            const timeOnline = new Date(Date.UTC(2024, 1, 14, 13, 1, 0));// a reference for when it was pushed online
            // Calculate time since `timeOnline` in hours
            const timeSince = (time - timeOnline) / 1000 / 3600;

            // Calculate the load capacity factor (LCF)
            const lcf = (Energy / (timeSince * 90)) * 100;

            /*document.getElementById('gridItem1').innerHTML = `Wind Turbine Power: <span class="value"><br>${windata[0]['power'].toFixed(2)} KW</span>`;*/
            document.getElementById('gridItem2').innerHTML = `Wind Speed: <span class="value"><br>${windata[0]['wind_speed'].toFixed(2)} m/s</span>`;
            document.getElementById('gridItem3').innerHTML = `Wind Generated Energy: <span class="value"><br>${(windata[0]['energy']/ 1000).toFixed(2)} MWh</span>`;
            /*document.getElementById('gridItem4').innerHTML = `Yaw Error: <span class="value"><br>${windata[0]['yaw_delta'].toFixed(2)}°/s</span>`;*/
            /*document.getElementById('gridItem5').innerHTML = `Yaw Position: <span class="value"><br>${windata[0]['yaw_position']}°</span>`;*/
            document.getElementById('gridItem5').innerHTML = `Wind Lifetime Capacity Factor: <span class="value"><br>${lcf.toFixed(2)}%</span>`;
        }).catch(error => console.error('Error fetching gauge data:', error));
}

// Run fetchData every 15 seconds
setInterval(callPhpScript, 15000);
// Initial call to fetch data immediately
callPhpScript();

