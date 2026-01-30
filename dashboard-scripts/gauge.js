// Function to create the gauge chart
function createGaugeChart(value, svgId) {
    const svg = document.getElementById(svgId);
    svg.innerHTML = ''; // Clear the SVG

    //Function to redraw the chart when something changes
    function redraw() {
        svg.innerHTML = ''; // Clear the SVG
        const width = svg.clientWidth;
        const height = width; // Make the SVG square
        svg.setAttribute('width', width);
        svg.setAttribute('height', height);
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) / 2 - 20;
        const angleStep = 8 * Math.PI / 5 / 100;

    // Draw the white background circle
    const backgroundCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    backgroundCircle.setAttribute("cx", centerX);
    backgroundCircle.setAttribute("cy", centerY);
    backgroundCircle.setAttribute("r", radius - 2);
    backgroundCircle.setAttribute("fill", "white");
    svg.appendChild(backgroundCircle);

    // Draw the arc
    const startAngle = 7 * Math.PI / 10;
    const endAngle = startAngle + 8 * Math.PI / 5;
    const arcPath = describeArc(centerX, centerY, radius + 10, startAngle * 180 / Math.PI + 89.5 , endAngle * 180 / Math.PI + 90.5);
    const arc = document.createElementNS("http://www.w3.org/2000/svg", "path");
    arc.setAttribute("d", arcPath);
    arc.setAttribute("fill", "none");
    arc.setAttribute("stroke", "#298fc2");
    arc.setAttribute("stroke-width", "20");
    svg.appendChild(arc);

    // Draw ticks and labels
    for (let i = 0; i <= 100; i++) {
        const angle = startAngle + angleStep * i;
        const x1 = centerX + radius * Math.cos(angle);
        const y1 = centerY + radius * Math.sin(angle);
        const x2 = centerX + (radius - 10) * Math.cos(angle);
        const y2 = centerY + (radius - 10) * Math.sin(angle);

        const tick = document.createElementNS("http://www.w3.org/2000/svg", "line");
        tick.setAttribute("x1", x1);
        tick.setAttribute("y1", y1);
        tick.setAttribute("x2", x2);
        tick.setAttribute("y2", y2);
        tick.setAttribute("stroke", (i % 10 === 0) ? "black" : "gray");
        tick.setAttribute("stroke-width", (i % 10 === 0) ? 2 : 1);
        tick.setAttribute("stroke-shadow", "2px 2px 4px rgba(0, 0, 0, 0.3)"); // Add shadow to ticks
        svg.appendChild(tick);

        if (i % 10 === 0) {
            const labelX = centerX + (radius - 20) * Math.cos(angle);
            const labelY = centerY + (radius - 20) * Math.sin(angle);
            const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
            label.setAttribute("x", labelX);
            label.setAttribute("y", labelY);
            label.setAttribute("fill", "navy");
            label.setAttribute("font-size", "17");
            label.setAttribute("shadow", "12");
            label.setAttribute("text-anchor", "middle");
            label.setAttribute("alignment-baseline", "middle");
            label.textContent = i.toString();
            label.setAttribute("style","filter: drop-shadow(2px 2px 4px rgba(0, 0, 0, 0.3))") ; // Set text shadow using style attribute
            svg.appendChild(label);
        }
    }

    // Draw the needle
    const needleAngle = startAngle + (endAngle - startAngle) * (value / 100);
    drawNeedle(svg, centerX, centerY, needleAngle, radius);

    // Display the value inside the gauge
    const valueText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    valueText.setAttribute("x", centerX);
    valueText.setAttribute("y", centerY+ 2.5*radius/3);
    valueText.setAttribute("fill", "#298fc2");
    valueText.setAttribute("font-size", Math.round(radius/5));
    valueText.setAttribute("text-anchor", "middle");
    valueText.setAttribute("alignment-baseline", "middle");
    valueText.textContent = value + '%';
    svg.appendChild(valueText);
}
 // Initial drawing
    redraw();

    // Redraw on window resize
    window.addEventListener('resize', redraw);
}

// Function to draw the needle
function drawNeedle(svg, centerX, centerY, angle, radius) {
    const needleLength = radius * 0.7;
    const needleBaseLength = radius * 0.2;

    const needleTipX = centerX + needleLength * Math.cos(angle);
    const needleTipY = centerY + needleLength * Math.sin(angle);
    const baseX1 = centerX + needleBaseLength * Math.cos(angle + Math.PI / 20);
    const baseY1 = centerY + needleBaseLength * Math.sin(angle + Math.PI / 20);
    const baseX2 = centerX + needleBaseLength * Math.cos(angle - Math.PI / 20);
    const baseY2 = centerY + needleBaseLength * Math.sin(angle - Math.PI / 20);

    const needlePath = `
        M ${centerX},${centerY}
        L ${baseX1},${baseY1}
        L ${needleTipX},${needleTipY}
        L ${baseX2},${baseY2}
        Z
    `;
    const needle = document.createElementNS("http://www.w3.org/2000/svg", "path");
    needle.setAttribute("d", needlePath);
    needle.setAttribute("fill", "#10344B");
    needle.setAttribute("style", "filter: drop-shadow(0px 0px 1.5px grey);"); // Add shadow to the needle
    svg.appendChild(needle);
}

// Helper function to describe an arc path
function describeArc(x, y, radius, startAngle, endAngle) {
    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    const d = [
        "M", start.x, start.y,
        "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y
    ].join(" ");
    return d;
}

function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
        x: centerX + (radius * Math.cos(angleInRadians)),
        y: centerY + (radius * Math.sin(angleInRadians))
    };
}