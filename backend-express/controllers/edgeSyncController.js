const pool = require('../db');

const BOX_UUID_MAP = {
    1: '00000000-0000-0000-0000-000000000001',
    2: '00000000-0000-0000-0000-000000000002',
    3: '00000000-0000-0000-0000-000000000003'
};

function resolveBoxId(input) {
    if (!input) return BOX_UUID_MAP[1];
    if (typeof input === 'number' && BOX_UUID_MAP[input]) {
        return BOX_UUID_MAP[input];
    }
    const str = String(input);
    if (/^[0-9a-fA-F-]{36}$/.test(str)) {
        return str;
    }
    const num = parseInt(str, 10);
    if (!isNaN(num) && BOX_UUID_MAP[num]) {
        return BOX_UUID_MAP[num];
    }
    return BOX_UUID_MAP[1];
}

exports.syncData = async (req, res) => {
    const { sensor_data, cv_results, actuator_logs, harvest_predictions } = req.body;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        let summary = { sensor_data: 0, cv_results: 0, actuator_logs: 0, harvest_predictions: 0 };

        // 1. Sync Sensor Data
        if (Array.isArray(sensor_data) && sensor_data.length > 0) {
            for (const s of sensor_data) {
                const boxUuid = resolveBoxId(s.box_id);
                await client.query(
                    `INSERT INTO sensor_data (id, box_id, air_temp, air_humidity, media_humidity, raw_soil_adc, source, "timestamp")
                     SELECT gen_random_uuid(), $1::uuid, $2::numeric, $3::numeric, $4::numeric, $5::integer, $6::varchar, $7::timestamp
                     WHERE NOT EXISTS (
                        SELECT 1 FROM sensor_data WHERE box_id = $1::uuid AND "timestamp" = $7::timestamp
                     )`,
                    [boxUuid, s.air_temp, s.air_humidity, s.media_humidity, s.raw_soil_adc || null, s.source || 'real', s.timestamp]
                );
            }
            summary.sensor_data = sensor_data.length;
        }

        // 2. Sync CV Results
        if (Array.isArray(cv_results) && cv_results.length > 0) {
            for (const cv of cv_results) {
                const boxUuid = resolveBoxId(cv.box_id);
                const detectionCountsJson = JSON.stringify(cv.detection_counts || {});
                const proportionsJson = JSON.stringify(cv.proportions || {});
                await client.query(
                    `INSERT INTO cv_results (id, box_id, dominant_phase, confidence_score, detection_counts, proportions, source, "timestamp")
                     SELECT gen_random_uuid(), $1::uuid, $2::varchar, $3::numeric, $4::jsonb, $5::jsonb, $6::varchar, $7::timestamp
                     WHERE NOT EXISTS (
                        SELECT 1 FROM cv_results WHERE box_id = $1::uuid AND "timestamp" = $7::timestamp
                     )`,
                    [boxUuid, cv.dominant_phase, cv.confidence_score || 0.0, detectionCountsJson, proportionsJson, cv.source || 'real', cv.timestamp]
                );
            }
            summary.cv_results = cv_results.length;
        }

        // 3. Sync Actuator Logs
        if (Array.isArray(actuator_logs) && actuator_logs.length > 0) {
            for (const act of actuator_logs) {
                const boxUuid = resolveBoxId(act.box_id);
                await client.query(
                    `INSERT INTO actuator_logs (id, box_id, type, status, source, "timestamp")
                     SELECT gen_random_uuid(), $1::uuid, $2::varchar, $3::varchar, $4::varchar, $5::timestamp
                     WHERE NOT EXISTS (
                        SELECT 1 FROM actuator_logs WHERE box_id = $1::uuid AND type = $2::varchar AND "timestamp" = $5::timestamp
                     )`,
                    [boxUuid, act.type, act.status, act.source || 'real', act.timestamp]
                );
            }
            summary.actuator_logs = actuator_logs.length;
        }

        // 4. Sync Harvest Predictions
        if (Array.isArray(harvest_predictions) && harvest_predictions.length > 0) {
            for (const hp of harvest_predictions) {
                const boxUuid = resolveBoxId(hp.box_id);
                await client.query(
                    `INSERT INTO harvest_predictions (id, box_id, estimated_days, urgency_level, confidence, source, "timestamp")
                     SELECT gen_random_uuid(), $1::uuid, $2::numeric, $3::varchar, $4::numeric, $5::varchar, $6::timestamp
                     WHERE NOT EXISTS (
                        SELECT 1 FROM harvest_predictions WHERE box_id = $1::uuid AND "timestamp" = $6::timestamp
                     )`,
                    [boxUuid, hp.predicted_days, hp.urgency_level || 'Medium', hp.confidence !== undefined ? hp.confidence : null, hp.source || 'real', hp.timestamp]
                );
            }
            summary.harvest_predictions = harvest_predictions.length;
        }

        await client.query('COMMIT');

        // Emit real-time WebSocket events to dashboard
        const io = req.app.get('io');
        if (io) {
            if (summary.sensor_data > 0) {
                io.emit('new_sensor_data', sensor_data);
            }
            if (summary.cv_results > 0) {
                io.emit('new_cv_results', cv_results);
            }
            if (summary.harvest_predictions > 0) {
                io.emit('new_harvest_predictions', harvest_predictions);
            }
        }

        res.status(200).json({ message: 'Edge sync completed successfully', summary });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[EDGE SYNC ERROR]', err);
        res.status(500).json({ error: 'Failed to process edge sync batch', details: err.message });
    } finally {
        client.release();
    }
};
