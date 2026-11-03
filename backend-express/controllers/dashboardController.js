const pool = require('../db');
const { resolveBoxId } = require('../utils/resolveIds');

const PRIMARY_BOX_ID = resolveBoxId(1);

function formatSensorValue(value, fallback) {
    if (value === null || value === undefined || value === '') return fallback;
    const num = parseFloat(value);
    return Number.isFinite(num) ? num.toFixed(1) : fallback;
}

async function getLatestSensor(boxId) {
    const { rows } = await pool.query(
        `SELECT air_temp, air_humidity, media_humidity, raw_soil_adc, source, timestamp
         FROM sensor_data WHERE box_id = $1::uuid
         ORDER BY timestamp DESC LIMIT 1`,
        [boxId]
    );
    if (rows.length > 0) return rows[0];

    const fallback = await pool.query(
        `SELECT air_temp, air_humidity, media_humidity, raw_soil_adc, source, timestamp
         FROM sensor_data ORDER BY timestamp DESC LIMIT 1`
    );
    return fallback.rows[0] || {};
}

exports.getDashboardSummary = async (req, res) => {
    try {
        // 1. Latest sensor reading for every registered box
        const boxesRes = await pool.query(
            `SELECT b.id, b.box_number, b.name, s.air_temp, s.air_humidity, s.media_humidity,
                    s.raw_soil_adc, s.source, s.timestamp
             FROM boxes b
             LEFT JOIN LATERAL (
                SELECT air_temp, air_humidity, media_humidity, raw_soil_adc, source, "timestamp"
                FROM sensor_data
                WHERE box_id = b.id
                ORDER BY "timestamp" DESC
                LIMIT 1
             ) s ON true
             WHERE b.is_active IS NOT FALSE
             ORDER BY b.box_number NULLS LAST, b.name`
        );

        const boxes = boxesRes.rows.map((row, index) => ({
            id: row.box_number || index + 1,
            name: row.name,
            temp: formatSensorValue(row.air_temp, '--'),
            humidity: formatSensorValue(row.air_humidity, '--'),
            source: row.source || null,
            timestamp: row.timestamp || null
        }));

        const primaryBox = boxesRes.rows.find(row => row.box_number === 1) || boxesRes.rows[0] || null;
        const latestSensor = primaryBox ? await getLatestSensor(primaryBox.id) : await getLatestSensor(PRIMARY_BOX_ID);

        // 2. Latest actuator logs for the primary box
        let actRes = await pool.query(
            `SELECT type, status, timestamp FROM actuator_logs
             WHERE box_id = $1::uuid
             ORDER BY timestamp DESC LIMIT 20`,
            [PRIMARY_BOX_ID]
        );
        if (actRes.rows.length === 0) {
            actRes = await pool.query('SELECT type, status, timestamp FROM actuator_logs ORDER BY timestamp DESC LIMIT 20');
        }

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

        // 3. Latest prediction for the primary box
        let predRes = await pool.query(
            `SELECT estimated_days, urgency_level, confidence, source, timestamp
             FROM harvest_predictions WHERE box_id = $1::uuid
             ORDER BY timestamp DESC LIMIT 1`,
            [PRIMARY_BOX_ID]
        );
        if (predRes.rows.length === 0) {
            predRes = await pool.query('SELECT estimated_days, urgency_level, confidence, source, timestamp FROM harvest_predictions ORDER BY timestamp DESC LIMIT 1');
        }
        const latestPred = predRes.rows[0] || {};

        // 4. Latest CV result for the primary box
        let cvRes = await pool.query(
            `SELECT dominant_phase, confidence_score, detection_counts, source, timestamp
             FROM cv_results WHERE box_id = $1::uuid
             ORDER BY timestamp DESC LIMIT 1`,
            [PRIMARY_BOX_ID]
        );
        if (cvRes.rows.length === 0) {
            cvRes = await pool.query('SELECT dominant_phase, confidence_score, detection_counts, source, timestamp FROM cv_results ORDER BY timestamp DESC LIMIT 1');
        }
        const latestCv = cvRes.rows[0] || {};

        const summary = {
            boxes,
            currentBox: {
                id: primaryBox && primaryBox.box_number ? primaryBox.box_number : 1,
                airTemp: formatSensorValue(latestSensor.air_temp, '30.5'),
                airHumidity: formatSensorValue(latestSensor.air_humidity, '70.0'),
                mediaHumidity: formatSensorValue(latestSensor.media_humidity, '55.0'),
                rawSoilAdc: latestSensor.raw_soil_adc || 2400,
                actuators,
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
