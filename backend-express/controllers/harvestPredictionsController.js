const pool = require('../db');
const { resolveBoxId } = require('../utils/resolveIds');

const PREDICTION_COLUMNS = 'id, box_id, estimated_days, urgency_level, confidence, source, timestamp';

exports.getAllHarvestPredictions = async (req, res) => {
    try {
        const { rows } = await pool.query(`SELECT ${PREDICTION_COLUMNS} FROM harvest_predictions ORDER BY timestamp DESC LIMIT 100`);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch harvest_predictions' });
    }
};

exports.getLatestHarvestPrediction = async (req, res) => {
    try {
        const { box_id } = req.query;
        const params = [];
        let query = `SELECT ${PREDICTION_COLUMNS} FROM harvest_predictions`;

        if (box_id !== undefined && box_id !== '') {
            params.push(resolveBoxId(box_id));
            query += ' WHERE box_id = $1::uuid';
        }

        query += ' ORDER BY timestamp DESC LIMIT 1';
        const { rows } = await pool.query(query, params);
        res.json(rows[0] || null);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch latest harvest_prediction' });
    }
};

exports.createHarvestPrediction = async (req, res) => {
    try {
        const { box_id, estimated_days, predicted_days, urgency_level, confidence, source, timestamp } = req.body;
        const days = estimated_days !== undefined ? estimated_days : predicted_days;

        const { rows } = await pool.query(
            `INSERT INTO harvest_predictions (id, box_id, estimated_days, urgency_level, confidence, source, "timestamp")
             VALUES (gen_random_uuid(), $1::uuid, $2, $3, $4, $5, COALESCE($6::timestamp, CURRENT_TIMESTAMP))
             RETURNING ${PREDICTION_COLUMNS}`,
            [resolveBoxId(box_id), days ?? null, urgency_level || 'Medium', confidence ?? null, source || 'real', timestamp || null]
        );

        const io = req.app.get('io');
        if (io) io.emit('new_harvest_predictions', rows);

        res.status(201).json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create harvest_prediction' });
    }
};

exports.deleteHarvestPredictions = async (req, res) => {
    try {
        const { id } = req.params;
        const { rowCount } = await pool.query('DELETE FROM harvest_predictions WHERE id = $1', [id]);
        if (rowCount === 0) return res.status(404).json({ error: 'Not found' });
        res.json({ message: 'Deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete' });
    }
};
