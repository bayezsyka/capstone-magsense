const pool = require('../db');

exports.getAllCvResults = async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT id, box_id, dominant_phase, confidence_score, detection_counts, source, timestamp FROM cv_results ORDER BY timestamp DESC LIMIT 100');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch cv_results' });
    }
};

exports.deleteCvResults = async (req, res) => {
    try {
        const { id } = req.params;
        const { rowCount } = await pool.query('DELETE FROM cv_results WHERE id = $1', [id]);
        if (rowCount === 0) return res.status(404).json({ error: 'Not found' });
        res.json({ message: 'Deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete' });
    }
};

exports.scanFrame = async (req, res) => {
    try {
        const { image, box_id } = req.body;
        if (!image) {
            return res.status(400).json({ error: 'Image base64 data is required' });
        }

        let targetBoxId = box_id;
        if (!targetBoxId) {
            const boxRes = await pool.query('SELECT id FROM boxes ORDER BY created_at ASC LIMIT 1');
            if (boxRes.rows.length > 0) {
                targetBoxId = boxRes.rows[0].id;
            }
        }

        let sensorData = {
            suhu_udara_c: 29.0,
            kelembapan_udara_pct: 70.0,
            kelembapan_media_pct: 65.0
        };

        if (targetBoxId) {
            try {
                const sensorRes = await pool.query(
                    'SELECT air_temp, air_humidity, media_humidity FROM sensor_data WHERE box_id = $1 ORDER BY timestamp DESC LIMIT 1',
                    [targetBoxId]
                );
                if (sensorRes.rows.length > 0) {
                    const s = sensorRes.rows[0];
                    sensorData = {
                        suhu_udara_c: s.air_temp ? parseFloat(s.air_temp) : 29.0,
                        kelembapan_udara_pct: s.air_humidity ? parseFloat(s.air_humidity) : 70.0,
                        kelembapan_media_pct: s.media_humidity ? parseFloat(s.media_humidity) : 65.0
                    };
                }
            } catch (sErr) {
                console.warn('Failed to query latest sensor data, using default:', sErr.message);
            }
        }

        const cvServiceUrl = process.env.CV_SERVICE_URL || 'http://172.18.0.1:5001/scan';
        const response = await fetch(cvServiceUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                image,
                box_id: targetBoxId,
                sensor_data: sensorData
            })
        });

        if (!response.ok) {
            const errBody = await response.text();
            throw new Error('Inference engine error: ' + response.status + ' ' + errBody);
        }

        const inferData = await response.json();

        let savedCvId = null;
        let savedPredId = null;

        if (targetBoxId) {
            try {
                const cvInsert = await pool.query(
                    'INSERT INTO cv_results (box_id, dominant_phase, confidence_score, detection_counts, proportions, source, timestamp) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP) RETURNING id',
                    [
                        targetBoxId,
                        inferData.dominant_phase,
                        inferData.confidence_score,
                        JSON.stringify(inferData.detection_counts),
                        JSON.stringify(inferData.proportions),
                        'camera_device'
                    ]
                );
                savedCvId = cvInsert.rows[0]?.id;

                if (inferData.harvest_prediction) {
                    const pred = inferData.harvest_prediction;
                    const predInsert = await pool.query(
                        'INSERT INTO harvest_predictions (box_id, estimated_days, urgency_level, confidence, source, timestamp) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP) RETURNING id',
                        [
                            targetBoxId,
                            pred.estimated_days,
                            pred.urgency_level,
                            pred.confidence,
                            'camera_device'
                        ]
                    );
                    savedPredId = predInsert.rows[0]?.id;
                }

                const io = req.app.get('io');
                if (io) {
                    io.emit('cv_update', {
                        box_id: targetBoxId,
                        dominant_phase: inferData.dominant_phase,
                        detection_counts: inferData.detection_counts,
                        harvest_prediction: inferData.harvest_prediction,
                        timestamp: inferData.timestamp
                    });
                }
            } catch (dbErr) {
                console.error('Failed to persist scan result to DB:', dbErr);
            }
        }

        return res.json({
            success: true,
            box_id: targetBoxId,
            cv_id: savedCvId,
            prediction_id: savedPredId,
            ...inferData
        });

    } catch (err) {
        console.error('scanFrame error:', err);
        return res.status(500).json({ error: err.message || 'Internal error in scanFrame' });
    }
};
