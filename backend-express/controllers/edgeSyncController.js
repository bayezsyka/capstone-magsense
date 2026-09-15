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
                // Avoid inserting duplicate using box_id and timestamp
                await client.query(
                    `INSERT INTO sensor_data (id, box_id, air_temp, air_humidity, media_humidity, "timestamp") 
                     SELECT gen_random_uuid(), $1, $2, $3, $4, $5
                     WHERE NOT EXISTS (
                        SELECT 1 FROM sensor_data WHERE box_id = $1 AND "timestamp" = $5
                     )`,
                    [data.box_id, data.air_temp, data.air_humidity, data.media_humidity, data.timestamp]
                );
            }
            results.synced.push('sensor_data');
        }

        // 2. Sync CV Results
        if (cv_results && cv_results.length > 0) {
            for (const cv of cv_results) {
                // cloud_sync.py sends baby_larva, adult_larva, prepupa, pupa as json for detection_counts
                const detectionCounts = JSON.stringify({
                    baby_larva: cv.baby_larva,
                    adult_larva: cv.adult_larva,
                    prepupa: cv.prepupa,
                    pupa: cv.pupa
                });
                await client.query(
                    `INSERT INTO cv_results (id, box_id, dominant_phase, detection_counts, created_at) 
                     SELECT gen_random_uuid(), $1, $2, $3, $4
                     WHERE NOT EXISTS (
                        SELECT 1 FROM cv_results WHERE box_id = $1 AND created_at = $4
                     )`,
                    [cv.box_id, cv.dominant_phase, detectionCounts, cv.timestamp]
                );
            }
            results.synced.push('cv_results');
        }

        // 3. Sync Actuator Logs
        if (actuator_logs && actuator_logs.length > 0) {
            for (const log of actuator_logs) {
                await client.query(
                    `INSERT INTO actuator_logs (id, box_id, actuator_type, status, "timestamp") 
                     SELECT gen_random_uuid(), $1, $2, $3, $4
                     WHERE NOT EXISTS (
                        SELECT 1 FROM actuator_logs WHERE box_id = $1 AND actuator_type = $2 AND "timestamp" = $4
                     )`,
                    [log.box_id, log.type, log.status, log.timestamp]
                );
            }
            results.synced.push('actuator_logs');
        }

        // 4. Sync Harvest Predictions
        if (harvest_predictions && harvest_predictions.length > 0) {
            for (const hp of harvest_predictions) {
                let urgency = 'Low';
                if (hp.predicted_days <= 3) urgency = 'High';
                else if (hp.predicted_days <= 7) urgency = 'Medium';
                
                await client.query(
                    `INSERT INTO harvest_predictions (id, box_id, estimated_days, urgency_level, created_at) 
                     SELECT gen_random_uuid(), $1, $2, $3, $4
                     WHERE NOT EXISTS (
                        SELECT 1 FROM harvest_predictions WHERE box_id = $1 AND created_at = $4
                     )`,
                    [hp.box_id, hp.predicted_days, urgency, hp.timestamp]
                );
            }
            results.synced.push('harvest_predictions');
        }

        await client.query('COMMIT');
        
        // Emit WebSocket event for new sensor data
        if (sensor_data && sensor_data.length > 0) {
            const io = req.app.get('io');
            if (io) {
                // Emit the latest record or the entire batch
                io.emit('new_sensor_data', sensor_data);
            }
        }

        res.status(200).json({ message: 'Edge data synchronized successfully', details: results });
        
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Edge Sync Error:', err);
        res.status(500).json({ error: 'Failed to synchronize data from Edge' });
    } finally {
        client.release();
    }
};
