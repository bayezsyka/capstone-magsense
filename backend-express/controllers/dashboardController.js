const pool = require('../db');

exports.getDashboardSummary = async (req, res) => {
    try {
        // 1. Get latest sensor data for box 1
        const sensorRes = await pool.query(
            'SELECT air_temp, air_humidity, media_humidity, raw_soil_adc, source, timestamp FROM sensor_data ORDER BY timestamp DESC LIMIT 1'
        );
        const latestSensor = sensorRes.rows[0] || {};

        // 2. Get latest actuator logs
        const actRes = await pool.query(
            'SELECT type, status, timestamp FROM actuator_logs ORDER BY timestamp DESC LIMIT 10'
        );
        const actuators = {
            heater: 'OFF',
            kipas: 'OFF',
            pompa: 'OFF'
        };
        actRes.rows.forEach(r => {
            const type = (r.type || '').toLowerCase();
            if (type.includes('heater') || type.includes('pemanas')) actuators.heater = r.status || 'OFF';
            if (type.includes('fan') || type.includes('kipas')) actuators.kipas = r.status || 'OFF';
            if (type.includes('pump') || type.includes('pompa') || type.includes('solenoid')) actuators.pompa = r.status || 'OFF';
        });

        // 3. Get latest prediction
        const predRes = await pool.query(
            'SELECT estimated_days, urgency_level, confidence, source, timestamp FROM harvest_predictions ORDER BY timestamp DESC LIMIT 1'
        );
        const latestPred = predRes.rows[0] || {};

        // 4. Get latest CV result
        const cvRes = await pool.query(
            'SELECT dominant_phase, confidence_score, detection_counts, source, timestamp FROM cv_results ORDER BY timestamp DESC LIMIT 1'
        );
        const latestCv = cvRes.rows[0] || {};

        const summary = {
            boxes: [
                {
                    id: 1,
                    temp: latestSensor.air_temp ? parseFloat(latestSensor.air_temp).toFixed(1) : '30.5',
                    humidity: latestSensor.air_humidity ? parseFloat(latestSensor.air_humidity).toFixed(1) : '70.0'
                },
                { id: 2, temp: '29.5', humidity: '72.0' },
                { id: 3, temp: '31.2', humidity: '68.0' }
            ],
            currentBox: {
                id: 1,
                airTemp: latestSensor.air_temp ? parseFloat(latestSensor.air_temp).toFixed(1) : '30.5',
                airHumidity: latestSensor.air_humidity ? parseFloat(latestSensor.air_humidity).toFixed(1) : '70.0',
                mediaHumidity: latestSensor.media_humidity ? parseFloat(latestSensor.media_humidity).toFixed(1) : '55.0',
                rawSoilAdc: latestSensor.raw_soil_adc || 2400,
                actuators: actuators,
                source: latestSensor.source || 'mock'
            },
            harvestPrediction: {
                estimatedDays: latestPred.estimated_days ? parseFloat(latestPred.estimated_days).toFixed(1) : '12.0',
                urgencyLevel: latestPred.urgency_level || 'Low',
                confidence: latestPred.confidence ? parseFloat(latestPred.confidence).toFixed(2) : null,
                source: latestPred.source || 'modular_rule'
            },
            cvAnalysis: {
                dominantPhase: latestCv.dominant_phase || 'ADULT LARVA',
                confidenceScore: latestCv.confidence_score ? parseFloat(latestCv.confidence_score).toFixed(2) : '0.96',
                detectionCounts: latestCv.detection_counts || {},
                source: latestCv.source || 'mock'
            },
            status: 'online'
        };

        res.json(summary);
    } catch (err) {
        console.error('Error fetching dashboard summary:', err);
        res.status(500).json({ error: 'Failed to fetch dashboard summary' });
    }
};
