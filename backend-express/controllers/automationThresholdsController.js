const pool = require('../db');

exports.getAllThresholds = async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM automation_thresholds');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch automation thresholds' });
    }
};

exports.getThresholdById = async (req, res) => {
    try {
        const { id } = req.params;
        const { rows } = await pool.query('SELECT * FROM automation_thresholds WHERE id = $1', [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Threshold not found' });
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch threshold' });
    }
};

exports.createThreshold = async (req, res) => {
    try {
        const { id, tenant_id, floor_level, temp_min, temp_max, air_hum_min, air_hum_max, media_hum_min, media_hum_max } = req.body;
        const { rows } = await pool.query(
            'INSERT INTO automation_thresholds (id, tenant_id, floor_level, temp_min, temp_max, air_hum_min, air_hum_max, media_hum_min, media_hum_max) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
            [id, tenant_id, floor_level, temp_min, temp_max, air_hum_min, air_hum_max, media_hum_min, media_hum_max]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create threshold' });
    }
};

exports.updateThreshold = async (req, res) => {
    try {
        const { id } = req.params;
        const { tenant_id, floor_level, temp_min, temp_max, air_hum_min, air_hum_max, media_hum_min, media_hum_max } = req.body;
        const { rows } = await pool.query(
            'UPDATE automation_thresholds SET tenant_id = $1, floor_level = $2, temp_min = $3, temp_max = $4, air_hum_min = $5, air_hum_max = $6, media_hum_min = $7, media_hum_max = $8 WHERE id = $9 RETURNING *',
            [tenant_id, floor_level, temp_min, temp_max, air_hum_min, air_hum_max, media_hum_min, media_hum_max, id]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Threshold not found' });
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update threshold' });
    }
};

exports.deleteThreshold = async (req, res) => {
    try {
        const { id } = req.params;
        const { rowCount } = await pool.query('DELETE FROM automation_thresholds WHERE id = $1', [id]);
        if (rowCount === 0) return res.status(404).json({ error: 'Threshold not found' });
        res.json({ message: 'Threshold deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete threshold' });
    }
};
