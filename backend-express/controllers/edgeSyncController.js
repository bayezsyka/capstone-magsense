const pool = require('../db');

exports.syncData = async (req, res) => {
    const { sensor_data, cv_results, actuator_logs, harvest_predictions } = req.body;
    
    // Begin transaction for data consistency
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        let results = { synced: [] };

        // 1. Sync Sensor Data
        if (sensor_data && sensor_data.length > 0) {
            for (const data of sensor_data) {
                await client.query(
                    'INSERT INTO sensor_data (id, box_id, air_temp, air_humidity, media_humidity) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING',
                    [data.id, data.box_id, data.air_temp, data.air_humidity, data.media_humidity]
                );
            }
            results.synced.push('sensor_data');
        }

        // 2. Sync CV Results
        if (cv_results && cv_results.length > 0) {
            for (const cv of cv_results) {
                await client.query(
                    'INSERT INTO cv_results (id, box_id, image_url, dominant_phase, confidence_score, detection_counts) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING',
                    [cv.id, cv.box_id, cv.image_url, cv.dominant_phase, cv.confidence_score, cv.detection_counts]
                );
            }
            results.synced.push('cv_results');
        }

        // 3. Sync Actuator Logs
        if (actuator_logs && actuator_logs.length > 0) {
            for (const log of actuator_logs) {
                await client.query(
                    'INSERT INTO actuator_logs (id, box_id, type, status) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING',
                    [log.id, log.box_id, log.type, log.status]
                );
            }
            results.synced.push('actuator_logs');
        }

        // 4. Sync Harvest Predictions
        if (harvest_predictions && harvest_predictions.length > 0) {
            for (const hp of harvest_predictions) {
                await client.query(
                    'INSERT INTO harvest_predictions (id, box_id, estimated_days, urgency_level) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING',
                    [hp.id, hp.box_id, hp.estimated_days, hp.urgency_level]
                );
            }
            results.synced.push('harvest_predictions');
        }

        await client.query('COMMIT');
        res.status(200).json({ message: 'Edge data synchronized successfully', details: results });
        
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Edge Sync Error:', err);
        res.status(500).json({ error: 'Failed to synchronize data from Edge' });
    } finally {
        client.release();
    }
};
