const _gaugeInstances = {};

function createGaugeChart(value, containerId, name) {
    let chart = _gaugeInstances[containerId];
    if (!chart) {
        chart = echarts.init(document.getElementById(containerId));
        _gaugeInstances[containerId] = chart;
    }

    chart.setOption({
        series: [{
            type: 'gauge',
            startAngle: 225,
            endAngle: -45,
            min: 0,
            max: 100,
            radius: '85%',
            progress: {
                show: true,
                width: 14,
                itemStyle: { color: '#298fc2' }
            },
            axisLine: {
                lineStyle: {
                    width: 14,
                    color: [[1, '#b8b8b8']]
                }
            },
            axisTick:  { show: true },
            splitLine: { show: true },
            axisLabel: { show: true, color: '#555' },
            title: {
                show: true,
                offsetCenter: [0, '95%'],
                color: '#007ab8',
                fontSize: 14,
                fontWeight: 'bold'
            },
            pointer: {
                length: '55%',
                width: 4,
                itemStyle: { color: '#10344B' }
            },
            anchor: {
                show: true,
                showAbove: true,
                size: 10,
                itemStyle: {
                    color: '#10344B',
                    shadowBlur: 3,
                    shadowColor: 'rgba(0,0,0,0.3)'
                }
            },
            detail: {
                valueAnimation: true,
                formatter: '{value}%',
                color: '#298fc2',
                fontSize: 18,
                fontWeight: 'bold',
                offsetCenter: [0, '70%']
            },
            data: [{ value: value, name: name }]
        }]
    });
}

window.addEventListener('resize', () => {
    Object.values(_gaugeInstances).forEach(c => c.resize());
});
