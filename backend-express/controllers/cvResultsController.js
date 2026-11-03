const pool = require('../db');
const { resolveBoxId } = require('../utils/resolveIds');

const CV_COLUMNS = 'id, box_id, image_url, dominant_phase, confidence_score, detection_counts, proportions, source, timestamp';
const DETECTION_KEYS = ['baby_larva', 'adult_larva', 'prepupa', 'pupa'];

function toNumber(value) {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
}

function flattenCvRow(row) {
    if (!row) return row;
    const counts = row.detection_counts && typeof row.detection_counts === 'object' ? row.detection_counts : {};
    const flattened = {
        baby_larva: toNumber(counts.baby_larva ?? counts.babyLarva ?? row.baby_larva),
        adult_larva: toNumber(counts.adult_larva ?? counts.adultLarva ?? row.adult_larva),
        prepupa: toNumber(counts.prepupa ?? row.prepupa),
        pupa: toNumber(counts.pupa ?? row.pupa)
    };
    const total = counts.total_detected ?? counts.total ?? row.total_detected;
    flattened.total_detected = total !== undefined ? toNumber(total) : DETECTION_KEYS.reduce((sum, key) => sum + flattened[key], 0);

    return { ...row, ...flattened };
}

function buildDetectionCounts(body) {
    const counts = body.detection_counts && typeof body.detection_counts === 'object' ? { ...body.detection_counts } : {};
    DETECTION_KEYS.forEach(key => {
        if (body[key] !== undefined) counts[key] = toNumber(body[key]);
    });
    return counts;
}

exports.getAllCvResults = async (req, res) => {
    try {
        const { rows } = await pool.query(`SELECT ${CV_COLUMNS} FROM cv_results ORDER BY timestamp DESC LIMIT 100`);
        res.json(rows.map(flattenCvRow));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch cv_results' });
    }
};

exports.getLatestCvResult = async (req, res) => {
    try {
        const { box_id } = req.query;
        const params = [];
        let query = `SELECT ${CV_COLUMNS} FROM cv_results`;

        if (box_id !== undefined && box_id !== '') {
            params.push(resolveBoxId(box_id));
            query += ' WHERE box_id = $1::uuid';
        }

        query += ' ORDER BY timestamp DESC LIMIT 1';
        const { rows } = await pool.query(query, params);
        res.json(rows[0] ? flattenCvRow(rows[0]) : null);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch latest cv_result' });
    }
};

exports.createCvResult = async (req, res) => {
    try {
        const { box_id, image_url, dominant_phase, confidence_score, proportions, source, timestamp } = req.body;
        const detectionCounts = buildDetectionCounts(req.body);

        const { rows } = await pool.query(
            `INSERT INTO cv_results (id, box_id, image_url, dominant_phase, confidence_score, detection_counts, proportions, source, "timestamp")
             VALUES (gen_random_uuid(), $1::uuid, $2, $3, $4, $5::jsonb, $6::jsonb, $7, COALESCE($8::timestamp, CURRENT_TIMESTAMP))
             RETURNING ${CV_COLUMNS}`,
            [
                resolveBoxId(box_id),
                image_url || null,
                dominant_phase || null,
                confidence_score ?? null,
                JSON.stringify(detectionCounts),
                JSON.stringify(proportions || {}),
                source || 'real',
                timestamp || null
            ]
        );

        const flattened = flattenCvRow(rows[0]);
        const io = req.app.get('io');
        if (io) io.emit('new_cv_results', [flattened]);

        res.status(201).json(flattened);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create cv_result' });
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

exports.flattenCvRow = flattenCvRow;
